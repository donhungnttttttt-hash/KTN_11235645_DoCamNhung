package vn.syp.tms.ai;

import static vn.syp.tms.workitem.WorkItemStore.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.workitem.WorkItemStore;

/** Called in a short transaction before context reads, draft writes and every cached read. */
@Component
public class AiAccess {
    public record Context(Long membershipId, String role, boolean archived) {}
    private final WorkItemStore db;
    private final IdentityService identity;
    public AiAccess(WorkItemStore db,IdentityService identity) { this.db=db;this.identity=identity; }

    public Context authorize(long projectId,String actor,boolean write) {
        var account=identity.lockCurrent(actor);
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth!=null && auth.getPrincipal() instanceof SessionPrincipal principal) {
            var current=db.row("SELECT lock_version AS version FROM identity_users WHERE id=? AND enabled=TRUE FOR SHARE",actor);
            if(!principal.id().equals(actor)||principal.version()!=number(current,"version"))
                fail(401,"UNAUTHENTICATED","Phiên đăng nhập đã thay đổi.");
        }
        var project=db.row("SELECT archived_at AS archivedAt FROM projects WHERE id=? FOR UPDATE",projectId);
        var members=db.rows("SELECT id,project_role AS role FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE FOR UPDATE",projectId,actor);
        boolean admin="ADMIN".equals(account.getRole());
        boolean pm="PM".equals(account.getRole());
        if(!admin && !pm && members.isEmpty())fail(404,"NOT_FOUND","Bạn không có quyền truy cập dự án này.");
        Long memberId=members.isEmpty()?null:number(members.getFirst(),"id");
        String role=admin?"ADMIN":pm?"PM":(String)members.getFirst().get("role");
        if("DEV".equals(account.getRole()) && !"DEV".equals(role))role="NONE";
        boolean archived=project.get("archivedAt")!=null;
        if(write && archived)fail(409,"ARCHIVED","Dự án đã được lưu trữ.");
        return new Context(memberId,role,archived);
    }

    public void require(Context context,AiPurpose purpose) {
        if(!"ADMIN".equals(context.role())&&!purpose.role().equals(context.role()))fail(403,"FORBIDDEN","Tác vụ AI không thuộc vai trò hiện hành của bạn trong dự án.");
    }

    public void requireSource(long p,Context caller,AiPurpose purpose,String source) {
        requireSource(p,caller,purpose,source,false);
    }
    public void requireSource(long p,Context caller,AiPurpose purpose,String source,boolean write) {
        require(caller,purpose);
        if(purpose==AiPurpose.PM_ASSIGNMENT_SUGGESTION){
            if(source!=null&&source.startsWith("file:")){
                if(write)fail(410,"AI_LEGACY_SCOPE","Nguồn file cũ chỉ đọc lịch sử. Chọn file thuộc Feature cho yêu cầu mới.");
                return;
            }
            if(source==null||!source.matches("document:[1-9][0-9]{0,17}"))fail(422,"AI_INVALID_TARGET","Chọn file thuộc Feature.");
            var document=db.row("SELECT b.id,b.archived_at AS documentArchivedAt,f.archived_at AS featureArchivedAt FROM import_batches b JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id WHERE b.project_id=? AND b.id=? AND b.status='COMMITTED'",p,Long.parseLong(source.substring(9)));
            if(write&&(document.get("documentArchivedAt")!=null||document.get("featureArchivedAt")!=null))fail(409,"ARCHIVED","File/Feature đã lưu trữ; chỉ đọc lịch sử.");
            return;
        }
        if("ADMIN".equals(caller.role()))return;
        if(purpose!=AiPurpose.DEV_TICKET_REVIEW&&purpose!=AiPurpose.TESTER_BUG_DRAFT)return;
        if(source==null||!source.matches("ticket:[1-9][0-9]{0,17}"))throw new vn.syp.tms.shared.web.BusinessException(422,"AI_INVALID_TARGET","Ticket không hợp lệ.");
        long id=Long.parseLong(source.substring(7));
        String scope=purpose==AiPurpose.DEV_TICKET_REVIEW?
                "item_type IN ('BUG','QA') AND assignee_membership_id=?":
                "item_type='BUG' AND (created_by=? OR assignee_membership_id=?)";
        Object[] args=purpose==AiPurpose.DEV_TICKET_REVIEW?new Object[]{p,id,caller.membershipId()}:
                new Object[]{p,id,caller.membershipId(),caller.membershipId()};
        if(db.count("SELECT COUNT(*) FROM work_items WHERE project_id=? AND id=? AND "+scope,args)!=1)
            fail(404,"NOT_FOUND","Ticket không thuộc phạm vi được hỗ trợ của bạn.");
    }
}
