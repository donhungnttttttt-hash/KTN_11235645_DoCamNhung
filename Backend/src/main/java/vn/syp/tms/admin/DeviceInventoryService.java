package vn.syp.tms.admin;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.project.*;
import vn.syp.tms.workitem.WorkItemStore;
import static vn.syp.tms.workitem.WorkItemStore.*;
import static vn.syp.tms.admin.DeviceInventoryDtos.*;

@Service @Transactional
public class DeviceInventoryService {
 private final WorkItemStore db; private final IdentityService identity; private final ProjectService projects; private final ProjectAudit audit;
 public DeviceInventoryService(WorkItemStore db,IdentityService identity,ProjectService projects,ProjectAudit audit){this.db=db;this.identity=identity;this.projects=projects;this.audit=audit;}
 private void admin(String actor){if(!"ADMIN".equals(identity.current(actor).getRole()))fail(403,"FORBIDDEN","Chỉ ADMIN được quản lý kho máy.");}
 private static final String ASSET="SELECT a.id,a.asset_code AS assetCode,a.type,a.model,a.serial,a.os_name AS osName,a.os_version AS osVersion,a.condition_code AS conditionCode,a.notes,a.lock_version AS version,a.created_at AS createdAt,a.updated_at AS updatedAt,l.id AS allocationId,l.project_id AS projectId,p.name AS projectName,p.code AS projectCode,CASE WHEN l.id IS NOT NULL THEN 'ALLOCATED' ELSE a.condition_code END AS status FROM device_assets a LEFT JOIN device_allocations l ON l.active_asset_id=a.id LEFT JOIN projects p ON p.id=l.project_id";
 private static final String ALLOCATION="SELECT l.id,l.asset_id AS assetId,a.asset_code AS assetCode,a.model,l.project_id AS projectId,p.name AS projectName,p.code AS projectCode,u.display_name AS recipientName,u.username AS recipientUsername,l.assigned_at AS assignedAt,actor.display_name AS assignedByName,l.expected_return_on AS expectedReturnOn,l.handover_note AS handoverNote,l.returned_at AS returnedAt,back.display_name AS returnedByName,l.returned_condition AS returnedCondition,l.return_note AS returnNote,l.lock_version AS version FROM device_allocations l JOIN device_assets a ON a.id=l.asset_id JOIN projects p ON p.id=l.project_id JOIN project_memberships m ON m.id=l.recipient_membership_id JOIN identity_users u ON u.id=m.user_id JOIN identity_users actor ON actor.id=l.assigned_by LEFT JOIN identity_users back ON back.id=l.returned_by";
 private void page(int page,int size){if(page<0||size<1||size>100)fail(422,"INVALID_FILTER","Phân trang không hợp lệ.");}
 @Transactional(readOnly=true)
 public AdminDtos.Page<Map<String,Object>> assets(String actor,Long projectId,String keyword,String status,int page,int size){
  admin(actor);page(page,size);if(text(keyword).length()>100)fail(422,"INVALID_FILTER","Từ khóa quá dài.");
  var args=new ArrayList<Object>();String where=" WHERE 1=1";
  if(projectId!=null){where+=" AND l.project_id=?";args.add(projectId);}
  if(!text(keyword).isEmpty()){where+=" AND (LOCATE(?,a.asset_code)>0 OR LOCATE(?,a.model)>0 OR LOCATE(?,a.serial)>0)";for(int i=0;i<3;i++)args.add(text(keyword));}
  if(!text(status).isEmpty()){if(!List.of("AVAILABLE","ALLOCATED","MAINTENANCE","RETIRED").contains(status))fail(422,"INVALID_FILTER","Tình trạng không hợp lệ.");where+=" AND (CASE WHEN l.id IS NOT NULL THEN 'ALLOCATED' ELSE a.condition_code END)=?";args.add(status);}
  long total=db.count("SELECT COUNT(*) FROM device_assets a LEFT JOIN device_allocations l ON l.active_asset_id=a.id"+where,args.toArray());args.add(size);args.add((long)page*size);
  return new AdminDtos.Page<>(db.rows(ASSET+where+" ORDER BY a.asset_code,a.id LIMIT ? OFFSET ?",args.toArray()),page,size,total);
 }
 @Transactional(readOnly=true) public Map<String,Object> asset(String actor,long id){admin(actor);return db.row(ASSET+" WHERE a.id=?",id);}
 public Map<String,Object> create(String actor,Asset input){admin(actor);long id=db.insert("INSERT INTO device_assets(asset_code,type,model,serial,os_name,os_version,condition_code,notes,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)",text(input.assetCode()),input.type(),text(input.model()),nullable(input.serial()),text(input.osName()),text(input.osVersion()),input.conditionCode(),text(input.notes()),actor,actor);audit.record(null,actor,"DEVICE_ASSET",id,"CREATE");return asset(actor,id);}
 private String nullable(String value){return text(value).isEmpty()?null:text(value);}
 public Map<String,Object> update(String actor,long id,Asset input){
  admin(actor);var a=lockAsset(id);version(a,input.expectedVersion());
  if(!"AVAILABLE".equals(input.conditionCode())&&!db.rows("SELECT id FROM device_allocations WHERE active_asset_id=? FOR UPDATE",id).isEmpty())fail(409,"ASSET_ALLOCATED","Thu hồi máy trước khi thay đổi tình trạng.");
  db.update("UPDATE device_assets SET asset_code=?,type=?,model=?,serial=?,os_name=?,os_version=?,condition_code=?,notes=?,updated_at=UTC_TIMESTAMP(6),updated_by=?,lock_version=lock_version+1 WHERE id=?",text(input.assetCode()),input.type(),text(input.model()),nullable(input.serial()),text(input.osName()),text(input.osVersion()),input.conditionCode(),text(input.notes()),actor,id);
  audit.record(null,actor,"DEVICE_ASSET",id,"UPDATE");return asset(actor,id);
 }
 private Map<String,Object> lockAsset(long id){return db.row("SELECT id,condition_code AS conditionCode,lock_version AS version FROM device_assets WHERE id=? FOR UPDATE",id);}
 private Map<String,Object> lockProject(long id){return db.row("SELECT id,timezone,archived_at AS archivedAt FROM projects WHERE id=? FOR UPDATE",id);}
 public static void validateDate(LocalDate date,String zone,Instant now){if(date!=null&&date.isBefore(now.atZone(ZoneId.of(zone)).toLocalDate()))fail(422,"INVALID_RETURN_DATE","Ngày dự kiến trả không được trước ngày bàn giao tại dự án.");}
 public Map<String,Object> assign(String actor,Assign input){
  admin(actor);lockRecipient(input.recipientUserId());var project=lockProject(input.projectId());var asset=lockAsset(input.assetId());return assignLocked(actor,input,project,asset);
 }
 private void lockRecipient(String user){if(db.rows("SELECT id FROM identity_users WHERE id=? AND enabled=TRUE FOR SHARE",user).isEmpty())fail(422,"INVALID_RECIPIENT","Người nhận phải là tài khoản đang hoạt động.");}
 private Map<String,Object> assignLocked(String actor,Assign input,Map<String,Object> project,Map<String,Object> asset){
  if(project.get("archivedAt")!=null)fail(409,"ARCHIVED","Dự án lưu trữ không thể nhận máy.");version(asset,input.expectedVersion());
  if(!"AVAILABLE".equals(asset.get("conditionCode"))||!db.rows("SELECT id FROM device_allocations WHERE active_asset_id=? FOR UPDATE",input.assetId()).isEmpty())fail(409,"ASSET_UNAVAILABLE","Máy không còn sẵn sàng để bàn giao.");
  var members=db.rows("SELECT id FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE FOR UPDATE",input.projectId(),input.recipientUserId());
  if(members.isEmpty())fail(422,"INVALID_RECIPIENT","Người nhận phải là thành viên đang hoạt động của dự án.");
  validateDate(input.expectedReturnOn(),(String)project.get("timezone"),Instant.now());
  long id=db.insert("INSERT INTO device_allocations(asset_id,project_id,recipient_membership_id,assigned_at,assigned_by,expected_return_on,handover_note) VALUES(?,?,?,UTC_TIMESTAMP(6),?,?,?)",input.assetId(),input.projectId(),number(members.getFirst(),"id"),actor,input.expectedReturnOn(),text(input.handoverNote()));
  touch(input.assetId(),actor);audit.record(input.projectId(),actor,"DEVICE_ALLOCATION",id,"ASSIGN");return db.row(ALLOCATION+" WHERE l.id=?",id);
 }
 /** Shared identity locks -> project -> sorted assets -> memberships. FK identity locks use the same shared mode. */
 public void allocateInitial(String actor,long projectId,List<Initial> selections,Set<String> selectedUsers){
  admin(actor);if(selections==null||selections.isEmpty())return;
  var unique=new HashSet<Long>();for(var s:selections){if(!unique.add(s.assetId()))fail(422,"DUPLICATE_ASSET","Không chọn trùng máy.");if(!selectedUsers.contains(s.recipientUserId()))fail(422,"INVALID_RECIPIENT","Người nhận phải thuộc danh sách nhân sự ban đầu.");}
  selections.stream().map(s->s.recipientUserId()).distinct().sorted().forEach(user->lockRecipient(user));
  var project=lockProject(projectId);var sorted=selections.stream().sorted(Comparator.comparingLong(s->s.assetId())).toList();var locked=new HashMap<Long,Map<String,Object>>();
  for(var s:sorted)locked.put(s.assetId(),lockAsset(s.assetId()));
  for(var s:sorted)assignLocked(actor,new Assign(s.assetId(),projectId,s.recipientUserId(),s.expectedReturnOn(),s.handoverNote(),s.expectedVersion()),project,locked.get(s.assetId()));
 }
 public Map<String,Object> receive(String actor,long id,Return input){
  admin(actor);var ref=db.row("SELECT project_id AS projectId,asset_id AS assetId FROM device_allocations WHERE id=?",id);
  lockProject(number(ref,"projectId"));lockAsset(number(ref,"assetId"));var allocation=db.row("SELECT project_id AS projectId,asset_id AS assetId,returned_at AS returnedAt,lock_version AS version FROM device_allocations WHERE id=? FOR UPDATE",id);
  version(allocation,input.expectedVersion());if(allocation.get("returnedAt")!=null)fail(409,"ALREADY_RETURNED","Lượt bàn giao đã được thu hồi.");
  db.update("UPDATE device_allocations SET returned_at=UTC_TIMESTAMP(6),returned_by=?,returned_condition=?,return_note=?,lock_version=lock_version+1 WHERE id=?",actor,input.conditionCode(),text(input.returnNote()),id);
  db.update("UPDATE device_assets SET condition_code=?,updated_at=UTC_TIMESTAMP(6),updated_by=?,lock_version=lock_version+1 WHERE id=?",input.conditionCode(),actor,number(allocation,"assetId"));
  audit.record(number(allocation,"projectId"),actor,"DEVICE_ALLOCATION",id,"RETURN");return db.row(ALLOCATION+" WHERE l.id=?",id);
 }
 private void touch(long id,String actor){db.update("UPDATE device_assets SET updated_at=UTC_TIMESTAMP(6),updated_by=?,lock_version=lock_version+1 WHERE id=?",actor,id);}
 @Transactional(readOnly=true) public AdminDtos.Page<Map<String,Object>> allocations(String actor,Long projectId,Long assetId,boolean history,int page,int size){admin(actor);return allocationPage(projectId,assetId,history,page,size);}
 @Transactional(readOnly=true) public AdminDtos.Page<Map<String,Object>> projectAllocations(String actor,long projectId,int page,int size){identity.current(actor);projects.requireMembership(projectId,actor);return allocationPage(projectId,null,false,page,size);}
 private AdminDtos.Page<Map<String,Object>> allocationPage(Long projectId,Long assetId,boolean history,int page,int size){
  page(page,size);var args=new ArrayList<Object>();String where=history?" WHERE 1=1":" WHERE l.returned_at IS NULL";
  if(projectId!=null){where+=" AND l.project_id=?";args.add(projectId);}if(assetId!=null){where+=" AND l.asset_id=?";args.add(assetId);}
  long total=db.count("SELECT COUNT(*) FROM device_allocations l"+where,args.toArray());args.add(size);args.add((long)page*size);
  return new AdminDtos.Page<>(db.rows(ALLOCATION+where+" ORDER BY l.id DESC LIMIT ? OFFSET ?",args.toArray()),page,size,total);
 }
}
