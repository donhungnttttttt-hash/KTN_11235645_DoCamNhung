package vn.syp.tms.admin;

import jakarta.validation.Valid;
import vn.syp.tms.admin.DeviceInventoryDtos.Initial;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.project.*;
import vn.syp.tms.workitem.WorkItemStore;
import static vn.syp.tms.workitem.WorkItemStore.*;

@Service @Transactional
public class AdminProjectService {
    private final WorkItemStore db;
    private final IdentityService identity;
    private final ProjectService projects;
    private final ProjectAudit audit;
    private final DeviceInventoryService inventory;
    public AdminProjectService(WorkItemStore db,IdentityService identity,ProjectService projects,ProjectAudit audit,DeviceInventoryService inventory) {
        this.db=db;this.identity=identity;this.projects=projects;this.audit=audit;this.inventory=inventory;
    }
    public record InitialMember(@NotBlank String userId,@NotBlank @Pattern(regexp="PM|TESTER|DEV") String projectRole) {}
    public record Create(@Valid @NotNull ProjectDtos.CreateProject project,@NotEmpty @Size(max=1000) List<@NotNull @Valid InitialMember> members,@Size(max=1000) List<@NotNull @Valid Initial> devices) {
        public Create(ProjectDtos.CreateProject project,List<InitialMember> members){this(project,members,List.of());}
    }
    private void admin(String actor) {if(!"ADMIN".equals(identity.current(actor).getRole()))fail(403,"FORBIDDEN","Chỉ ADMIN được quản trị dự án.");}
    public Map<String,Object> create(String actor,Create input) {
        projects.requireAdmin(actor); ProjectTimezone.validate(input.project().timezone());
        if(input.members().stream().noneMatch(m->"PM".equals(m.projectRole())))fail(422,"PM_REQUIRED","Chọn ít nhất một PM cho dự án.");
        var seen=new HashSet<String>();
        for(var m:input.members()) {
            if(!seen.add(m.userId()))fail(422,"DUPLICATE_MEMBER","Không chọn trùng thành viên.");
        }
        for(String user:seen.stream().sorted().toList())projects.lockMemberAccount(user);
        var p=input.project();
        if(db.count("SELECT COUNT(*) FROM projects WHERE code=?",p.code())>0)fail(409,"DUPLICATE_CODE","Mã dự án đã tồn tại.");
        long id=db.insert("INSERT INTO projects(code,name,description,timezone,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)",p.code(),p.name(),p.description(),p.timezone()==null?"Asia/Ho_Chi_Minh":p.timezone(),actor,actor);
        audit.record(id,actor,"PROJECT",id,"CREATE");
        for(var m:input.members()) projects.addOrUpdateMember(id,actor,m.userId(),new ProjectDtos.SetMember(m.projectRole()));
        inventory.allocateInitial(actor,id,input.devices(),seen);
        return Map.of("id",id,"code",p.code(),"name",p.name());
    }
    public Map<String,Object> update(String actor,long id,ProjectDtos.UpdateProject input) {
        projects.lockAdminProject(id,actor);
        var p=db.row("SELECT id,name,description,timezone,lock_version AS version FROM projects WHERE id=? FOR UPDATE",id);
        if(number(p,"version")!=input.expectedVersion())fail(409,"VERSION_CONFLICT","Dự án đã thay đổi. Tải phiên bản hiện hành rồi kiểm tra bản nháp.");
        if(input.timezone()!=null)ProjectTimezone.validate(input.timezone());
        int changed=db.update("UPDATE projects SET name=?,description=?,timezone=?,updated_by=?,updated_at=UTC_TIMESTAMP(6),lock_version=lock_version+1 WHERE id=? AND lock_version=?",
            input.name()==null?p.get("name"):input.name(),input.description()==null?p.get("description"):input.description(),input.timezone()==null?p.get("timezone"):input.timezone(),actor,id,input.expectedVersion());
        if(changed!=1)fail(409,"VERSION_CONFLICT","Dự án đã thay đổi.");
        audit.record(id,actor,"PROJECT",id,"UPDATE");return db.row("SELECT id,name,description,timezone,lock_version AS version FROM projects WHERE id=?",id);
    }
    @Transactional(readOnly=true)
    public List<ProjectDtos.MemberInfo> members(String actor,long id){admin(actor);db.row("SELECT id FROM projects WHERE id=?",id);return projects.listMembers(id,actor);}
    public ProjectDtos.MemberInfo setMember(String actor,long id,String user,ProjectDtos.SetMember input){return projects.addOrUpdateMember(id,actor,user,input);}
    public void removeMember(String actor,long id,String user,long version){projects.removeMember(id,actor,user,version);}

    @Transactional(readOnly=true)
    public AdminDtos.Page<Map<String,Object>> users(String actor,Long projectId,String keyword,String role,Boolean enabled,int page,int size) {
        admin(actor);
        if(page<0 || size<1 || size>100 || text(keyword).length()>100 || role!=null && !List.of("ADMIN","PM","TESTER","DEV").contains(role))fail(422,"INVALID_FILTER","Bộ lọc không hợp lệ.");
        var args=new ArrayList<Object>();String where=" WHERE 1=1";
        if(projectId!=null){db.row("SELECT id FROM projects WHERE id=?",projectId);where+=" AND EXISTS(SELECT 1 FROM project_memberships m WHERE m.user_id=u.id AND m.project_id=? AND m.active=TRUE)";args.add(projectId);}
        if(!text(keyword).isEmpty()){where+=" AND (LOCATE(?,u.username)>0 OR LOCATE(?,u.display_name)>0)";args.add(text(keyword));args.add(text(keyword));}
        if(role!=null){where+=" AND u.role_code=?";args.add(role);}
        if(enabled!=null){where+=" AND u.enabled=?";args.add(enabled);}
        long count=db.count("SELECT COUNT(*) FROM identity_users u"+where,args.toArray());args.add(size);args.add((long)page*size);
        var items=db.rows("SELECT u.id,u.username,u.display_name AS displayName,u.role_code AS role,u.enabled,u.can_create_users AS canCreateUsers,u.lock_version AS version,u.created_at AS createdAt FROM identity_users u"+where+" ORDER BY u.created_at,u.id LIMIT ? OFFSET ?",args.toArray());
        for(var user:items)user.put("memberships",db.rows("SELECT p.id AS projectId,p.code,p.name,m.project_role AS projectRole,m.lock_version AS version FROM project_memberships m JOIN projects p ON p.id=m.project_id WHERE m.user_id=? AND m.active=TRUE ORDER BY p.id",user.get("id")));
        return new AdminDtos.Page<>(items,page,size,count);
    }
}
