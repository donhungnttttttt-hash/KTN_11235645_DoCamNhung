package vn.syp.tms.admin;

import java.time.*;
import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.workitem.WorkItemStore;
import static vn.syp.tms.workitem.WorkItemStore.*;

@Service
@Transactional
public class ProjectStatusReportService {
 public record Input(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{1,64}") String requestKey,
  @NotBlank @Size(max=4000) String summary,@Size(max=4000) String delayReason,
  @Size(max=4000) String recoveryPlan,LocalDate expectedFinishOn) {}
 public record History(AdminDtos.Page<Map<String,Object>> reports,List<Map<String,Object>> milestones,boolean canPost) {}
 private final WorkItemStore db;
 private final IdentityService identity;
 private final ProjectAudit audit;
 private final ProjectDeadlines deadlines;
 public ProjectStatusReportService(WorkItemStore db,IdentityService identity,ProjectAudit audit,ProjectDeadlines deadlines) {
  this.db=db;this.identity=identity;this.audit=audit;this.deadlines=deadlines;
 }
 private static final String SELECT="SELECT r.id,r.project_id AS projectId,r.summary,r.delay_reason AS delayReason,r.recovery_plan AS recoveryPlan,r.expected_finish_on AS expectedFinishOn,r.created_at AS createdAt,r.created_by AS authorId,u.display_name AS authorName FROM project_status_reports r JOIN identity_users u ON u.id=r.created_by";
 private Map<String,Object> membership(String actor,long projectId,boolean lock) {
  var members=db.rows("SELECT id,project_role AS role FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE"+(lock?" FOR UPDATE":""),projectId,actor);
  if(members.isEmpty())fail(404,"NOT_FOUND","Dự án không tồn tại hoặc bạn không có quyền truy cập.");
  return members.getFirst();
 }
 public Map<String,Object> create(String actor,long projectId,Input input) {
  // Current identity lock precedes project lock; no ordinary read establishes a stale RR snapshot.
  var users=db.rows("SELECT role_code AS role FROM identity_users WHERE id=? AND enabled=TRUE FOR SHARE",actor);
  if(users.isEmpty())fail(403,"FORBIDDEN","Tài khoản không còn hoạt động.");
  var project=db.row("SELECT id,archived_at AS archivedAt FROM projects WHERE id=? FOR UPDATE",projectId);
  var member=membership(actor,projectId,true);
  if(!"PM".equals(member.get("role"))||"DEV".equals(users.getFirst().get("role")))fail(403,"PROJECT_PM_REQUIRED","Chỉ PM của dự án được gửi báo cáo.");
  required(input.summary(),"nội dung cập nhật");
  var payload=Arrays.asList(text(input.summary()),text(input.delayReason()),text(input.recoveryPlan()),input.expectedFinishOn());
  String hash=db.checksum(payload);
  var existing=db.rows("SELECT id,created_by AS actor,payload_hash AS hash FROM project_status_reports WHERE project_id=? AND request_key=? FOR UPDATE",projectId,input.requestKey());
  if(!existing.isEmpty()) {
   var old=existing.getFirst();
   if(!actor.equals(old.get("actor"))||!hash.equals(old.get("hash")))fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã được dùng với người gửi hoặc nội dung khác.");
   return db.row(SELECT+" WHERE r.id=?",number(old,"id"));
  }
  if(project.get("archivedAt")!=null)fail(409,"ARCHIVED","Dự án đã được lưu trữ.");
  // First consistent data read occurs after the project lock shared with milestone/work/cycle writers.
  boolean overdue=deadlines.milestones(projectId,Instant.now()).stream().anyMatch(m->"OVERDUE".equals(m.get("deadlineStatus")));
  if(overdue) {required(input.delayReason(),"nguyên nhân chậm");required(input.recoveryPlan(),"kế hoạch xử lý");}
  long id=db.insert("INSERT INTO project_status_reports(project_id,author_membership_id,summary,delay_reason,recovery_plan,expected_finish_on,request_key,payload_hash,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),?)",
   projectId,number(member,"id"),text(input.summary()),text(input.delayReason()),text(input.recoveryPlan()),input.expectedFinishOn(),input.requestKey(),hash,actor);
  audit.record(projectId,actor,"STATUS_REPORT",id,"CREATE");
  return db.row(SELECT+" WHERE r.id=?",id);
 }
 @Transactional(readOnly=true)
 public History history(String actor,long projectId,boolean admin,int page,int size) {
  String role=identity.current(actor).getRole();
  boolean pm=false;
  if(admin) {if(!"ADMIN".equals(role))fail(403,"FORBIDDEN","Chỉ ADMIN được đọc quản trị.");}
  else pm="PM".equals(membership(actor,projectId,false).get("role"))&&!"DEV".equals(role);
  var project=db.row("SELECT id,archived_at AS archivedAt FROM projects WHERE id=?",projectId);
  if(page<0||size<1||size>100)fail(422,"INVALID_FILTER","Phân trang không hợp lệ.");
  long total=db.count("SELECT COUNT(*) FROM project_status_reports WHERE project_id=?",projectId);
  var rows=db.rows(SELECT+" WHERE r.project_id=? ORDER BY r.id DESC LIMIT ? OFFSET ?",projectId,size,(long)page*size);
  return new History(new AdminDtos.Page<>(rows,page,size,total),deadlines.milestones(projectId,Instant.now()),pm&&project.get("archivedAt")==null);
 }
}
