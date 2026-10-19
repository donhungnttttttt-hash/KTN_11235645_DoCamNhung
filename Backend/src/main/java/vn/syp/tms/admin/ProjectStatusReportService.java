package vn.syp.tms.admin;

import java.time.*;
import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.project.ProjectActorService;
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
 private final ProjectDeadlines deadlines;
  public ProjectStatusReportService(WorkItemStore db,IdentityService identity,ProjectAudit audit,ProjectDeadlines deadlines,ProjectActorService actors) {
   this.db=db;this.identity=identity;this.deadlines=deadlines;
 }
 private static final String SELECT="SELECT r.id,r.project_id AS projectId,r.summary,r.delay_reason AS delayReason,r.recovery_plan AS recoveryPlan,r.expected_finish_on AS expectedFinishOn,r.created_at AS createdAt,r.created_by AS authorId,u.display_name AS authorName FROM project_status_reports r JOIN identity_users u ON u.id=r.created_by";
 private void authorize(String actor,long projectId,boolean centralAdmin) {
  String role=identity.current(actor).getRole();
  if(centralAdmin&&!"ADMIN".equals(role))fail(403,"FORBIDDEN","Chỉ ADMIN được đọc quản trị.");
  db.row("SELECT id FROM projects WHERE id=?",projectId);
  if("ADMIN".equals(role))return;
  var members=db.rows("SELECT id,project_role AS role FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE",projectId,actor);
  if(members.isEmpty())fail(404,"NOT_FOUND","Dự án không tồn tại hoặc bạn không có quyền truy cập.");
  if(!"PM".equals(members.getFirst().get("role"))||"DEV".equals(role))fail(403,"PROJECT_PM_REQUIRED","Báo cáo quản lý dành cho PM của dự án và ADMIN.");
 }
 public Map<String,Object> create(String actor,long projectId,Input ignored) {
  authorize(actor,projectId,false);
  fail(410,"USE_FEATURE_REPORTS","Dùng Tổng hợp & Phân tích để tạo báo cáo theo Feature. Báo cáo cũ chỉ giữ lịch sử.");
  return Map.of();
 }
 @Transactional(readOnly=true)
 public History history(String actor,long projectId,boolean admin,int page,int size) {
  authorize(actor,projectId,admin);
  if(page<0||size<1||size>100)fail(422,"INVALID_FILTER","Phân trang không hợp lệ.");
  long total=db.count("SELECT COUNT(*) FROM project_status_reports WHERE project_id=?",projectId);
  var rows=db.rows(SELECT+" WHERE r.project_id=? ORDER BY r.id DESC LIMIT ? OFFSET ?",projectId,size,(long)page*size);
  return new History(new AdminDtos.Page<>(rows,page,size,total),deadlines.milestones(projectId,Instant.now()),false);
 }
}
