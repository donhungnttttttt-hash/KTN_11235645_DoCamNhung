package vn.syp.tms.admin;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.workitem.WorkItemStore;
import static vn.syp.tms.workitem.WorkItemStore.*;

@Service
@Transactional(readOnly=true)
public class AdminAuditService {
 private final WorkItemStore db;
 private final IdentityService identity;
 public AdminAuditService(WorkItemStore db,IdentityService identity) {this.db=db;this.identity=identity;}
 // Deliberate allowlist: no request IDs, credentials, session IDs, metadata or raw payloads.
 private static final String EVENTS="""
  (SELECT CONCAT('project:',a.id) AS id,a.project_id AS projectId,a.actor_id AS actorId,
   a.entity_type AS entityType,CAST(a.entity_id AS CHAR) AS entityId,a.action AS action,a.occurred_at AS occurredAt
   FROM project_audit a
   UNION ALL
   SELECT CONCAT('identity:',a.id),a.project_id,a.actor_id,'IDENTITY',a.subject_id,a.event_code,a.occurred_at
   FROM identity_audit a) e
  """;
 public AdminDtos.Page<Map<String,Object>> list(String actor,Long projectId,String type,LocalDate from,LocalDate through,String timezone,int page,int size) {
  if(!"ADMIN".equals(identity.current(actor).getRole()))fail(403,"FORBIDDEN","Chỉ ADMIN được đọc nhật ký quản trị.");
  if(page<0||size<1||size>100||text(type).length()>40||from!=null&&through!=null&&from.isAfter(through))fail(422,"INVALID_FILTER","Bộ lọc nhật ký không hợp lệ.");
  ZoneId zone;
  try {zone=ZoneId.of(timezone);}catch(DateTimeException|NullPointerException ex){fail(422,"INVALID_TIMEZONE","Múi giờ không hợp lệ.");return null;}
  var args=new ArrayList<Object>();String where=" WHERE 1=1";
  if(projectId!=null){where+=" AND e.projectId=?";args.add(projectId);}
  if(!text(type).isEmpty()){where+=" AND e.entityType=?";args.add(type);}
  if(from!=null){where+=" AND e.occurredAt>=?";args.add(LocalDateTime.ofInstant(from.atStartOfDay(zone).toInstant(),ZoneOffset.UTC));}
  if(through!=null){where+=" AND e.occurredAt<?";args.add(LocalDateTime.ofInstant(through.plusDays(1).atStartOfDay(zone).toInstant(),ZoneOffset.UTC));}
  long total=db.count("SELECT COUNT(*) FROM "+EVENTS+where,args.toArray());
  args.add(size);args.add((long)page*size);
  var rows=db.rows("SELECT e.id,e.projectId,p.name AS projectName,e.actorId,u.display_name AS actorName,e.entityType,e.entityId,e.action,e.occurredAt FROM "+EVENTS+" LEFT JOIN identity_users u ON u.id=e.actorId LEFT JOIN projects p ON p.id=e.projectId"+where+" ORDER BY e.occurredAt DESC,e.id DESC LIMIT ? OFFSET ?",args.toArray());
  return new AdminDtos.Page<>(rows,page,size,total);
 }
}
