package vn.syp.tms.workitem;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.project.ProjectAudit;
import static vn.syp.tms.workitem.WorkItemStore.*;

@Service @Transactional
public class TicketResponsibilities {
    private final WorkItemStore db; private final IdentityService identity; private final ProjectAudit audit;
    public TicketResponsibilities(WorkItemStore db,IdentityService identity,ProjectAudit audit){this.db=db;this.identity=identity;this.audit=audit;}
    public record Access(String user,Long membership,boolean manager,boolean worker,boolean archived) {}
    public Access authorize(long project,String user,boolean write){
        String role=write?identity.lockCurrent(user).getRole():identity.current(user).getRole();
        if(!Set.of("ADMIN","PM","USER").contains(role))fail(403,"FORBIDDEN","Không có quyền mở nội dung Ticket.");
        var p=db.row("SELECT id,archived_at AS archivedAt FROM projects WHERE id=?"+(write?" FOR UPDATE":""),project);
        boolean archived=p.get("archivedAt")!=null;if(write&&archived)fail(409,"ARCHIVED","Dự án đã lưu trữ.");
        if("ADMIN".equals(role))return new Access(user,null,true,false,archived);
        var m=db.row("SELECT id,project_role AS projectRole FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE"+(write?" FOR UPDATE":""),project,user);
        if(!role.equals(m.get("projectRole")))fail(403,"FORBIDDEN","Membership không cấp quyền Ticket.");
        return new Access(user,number(m,"id"),"PM".equals(role),"USER".equals(role),archived);
    }
    private static final String MEMBERS="""
        SELECT m.id AS membershipId,m.user_id AS userId,u.display_name AS displayName,u.username,
        m.project_role AS projectRole,u.role_code AS systemRole,COALESCE(t.lock_version,0) AS version,
        COALESCE(t.spec_reviewer,FALSE) AS specReviewer,COALESCE(t.bug_coordinator,FALSE) AS bugCoordinator
        FROM project_memberships m JOIN identity_users u ON u.id=m.user_id
        LEFT JOIN ticket_responsibilities t ON t.project_id=m.project_id AND t.membership_id=m.id
        WHERE m.project_id=? AND m.active=TRUE AND u.enabled=TRUE
        AND ((m.project_role='USER' AND u.role_code='USER') OR (m.project_role='PM' AND u.role_code IN ('PM','ADMIN')))
        """;
    private static boolean flag(Object value){return Boolean.TRUE.equals(value)||value instanceof Number n&&n.intValue()!=0;}
    private Map<String,Object> expose(Map<String,Object> row){
        var duties=new ArrayList<String>();if(flag(row.remove("specReviewer")))duties.add("SPEC_REVIEWER");if(flag(row.remove("bugCoordinator")))duties.add("BUG_COORDINATOR");row.put("duties",duties);return row;
    }
    @Transactional(readOnly=true) public Map<String,Object> list(long p,String user){var actor=authorize(p,user,false);return Map.of("canManage",actor.manager()&&!actor.archived(),"members",db.rows(MEMBERS+" ORDER BY u.display_name,m.id",p).stream().map(this::expose).toList());}
    public Map<String,Object> update(long p,String user,long member,FeatureIssueDtos.Responsibilities input){
        var actor=authorize(p,user,true);if(!actor.manager())fail(403,"FORBIDDEN","Chỉ quản lý dự án được phân trách nhiệm.");
        if(input.duties()==null||!Set.of("SPEC_REVIEWER","BUG_COORDINATOR").containsAll(input.duties())||new HashSet<>(input.duties()).size()!=input.duties().size())fail(422,"INVALID_RESPONSIBILITY","Trách nhiệm không hợp lệ.");
        // Project UPDATE serializes duty versions. Keep recipient identity SHARE compatible
        // with a concurrent actor's identity check while that actor waits for this project.
        var target=db.row(MEMBERS+" AND m.id=? FOR SHARE",p,member);version(target,input.expectedVersion());
        db.update("INSERT INTO ticket_responsibilities(project_id,membership_id,spec_reviewer,bug_coordinator,lock_version) VALUES(?,?,?,?,1) ON DUPLICATE KEY UPDATE spec_reviewer=VALUES(spec_reviewer),bug_coordinator=VALUES(bug_coordinator),lock_version=lock_version+1",p,member,input.duties().contains("SPEC_REVIEWER"),input.duties().contains("BUG_COORDINATOR"));
        audit.record(p,user,"PROJECT_MEMBER",member,"TICKET_RESPONSIBILITIES");return expose(db.row(MEMBERS+" AND m.id=?",p,member));
    }
    public boolean hasDuty(long p,Long membership,String duty){
        if(membership==null)return false;
        return db.rows(MEMBERS+" AND m.id=?",p,membership).stream().anyMatch(m->"PM".equals(m.get("projectRole"))||flag(m.get("SPEC_REVIEWER".equals(duty)?"specReviewer":"bugCoordinator")));
    }
    /** duty=null selects an active worker; a duty selects project PM or designated USER. */
    public Map<String,Object> assignee(long p,Long member,String duty,boolean lock){
        if(member==null)fail(422,"INVALID_ASSIGNEE","Chọn người nhận đang hoạt động trong dự án.");
        var rows=db.rows(MEMBERS+" AND m.id=?"+(lock?" FOR SHARE":""),p,member);
        if(rows.isEmpty())fail(422,"INVALID_ASSIGNEE","Người nhận không còn hoạt động trong dự án.");
        var result=rows.getFirst();
        if(duty!=null&&!"PM".equals(result.get("projectRole"))&&!flag(result.get("SPEC_REVIEWER".equals(duty)?"specReviewer":"bugCoordinator")))fail(422,"INVALID_ASSIGNEE","Người nhận không còn trách nhiệm phù hợp.");
        return result;
    }
    public String verifier(long p,String user){
        if(user==null||db.rows(MEMBERS+" AND m.user_id=? FOR SHARE",p,user).isEmpty())fail(422,"INVALID_VERIFIER","Người xác nhận phải đang hoạt động trong dự án.");return user;
    }
    @Transactional(readOnly=true) public Map<String,Object> options(long p,String user,String type){return options(p,user,type,null);}
    @Transactional(readOnly=true) public Map<String,Object> options(long p,String user,String type,Long assigneeMembershipId){
        var actor=authorize(p,user,false);if(!Set.of("BUG","QA").contains(type))fail(422,"INVALID_ISSUE_TYPE","Chỉ có Bug và QA.");
        String duty="QA".equals(type)?"specReviewer":"bugCoordinator";
        var members=db.rows(MEMBERS+" ORDER BY u.display_name,m.id",p).stream().filter(m->"PM".equals(m.get("projectRole"))||flag(m.get(duty))).map(m->{var out=new LinkedHashMap<String,Object>();for(String key:List.of("membershipId","userId","displayName","username"))out.put(key,m.get(key));return out;}).toList();
        boolean eligible=assigneeMembershipId!=null&&members.stream().anyMatch(m->Objects.equals(m.get("membershipId"),assigneeMembershipId));
        var initial=assigneeMembershipId==null?TicketWorkflow.initialChoices(type,false,false):eligible?TicketWorkflow.initialChoices(type,actor.manager(),Objects.equals(actor.membership(),assigneeMembershipId)):List.<TicketWorkflow.Transition>of();
        return Map.of("assignees",members,"canManageResponsibilities",actor.manager()&&!actor.archived(),"initialTransitions",initial);
    }
}
