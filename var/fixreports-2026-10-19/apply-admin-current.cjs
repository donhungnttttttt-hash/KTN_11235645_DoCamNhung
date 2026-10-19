const fs=require('node:fs');
const base='Backend/src/main/java/vn/syp/tms/admin/';
let p=base+'ProjectStatusReportService.java',s=fs.readFileSync(p,'utf8');
const start=s.indexOf(' private Map<String,Object> membership');
s=s.slice(0,start)+` private void authorize(String actor,long projectId,boolean centralAdmin) {
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
`;
s=s.replace(' private final ProjectAudit audit;\r\n','').replace('  private final ProjectActorService actors;\r\n','').replace('this.db=db;this.identity=identity;this.audit=audit;this.deadlines=deadlines;this.actors=actors;','this.db=db;this.identity=identity;this.deadlines=deadlines;');fs.writeFileSync(p,s);
p=base+'ProjectStatusReportController.java';s=fs.readFileSync(p,'utf8').replace('import jakarta.validation.Valid;\r\n','').replace('@Valid @RequestBody ProjectStatusReportService.Input input','').replace('@PathVariable long id,)','@PathVariable long id)').replace('service.create(actor(auth),id,input)','service.create(actor(auth),id,null)');fs.writeFileSync(p,s);
