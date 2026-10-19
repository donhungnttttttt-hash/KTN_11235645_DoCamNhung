package vn.syp.tms.admin;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.workitem.WorkItemStore;
import vn.syp.tms.shared.search.MultiWordSearch;
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
 private static final ZoneId VIETNAM=ZoneId.of("Asia/Ho_Chi_Minh");
 private static final String JOINS=" LEFT JOIN identity_users u ON u.id=e.actorId LEFT JOIN projects p ON p.id=e.projectId";
 /** Compatibility for internal callers; request-selected timezones never change the Vietnam date window. */
 public AdminDtos.Page<Map<String,Object>> list(String actor,Long projectId,String keyword,LocalDate from,LocalDate through,String ignoredTimezone,int page,int size) {
  return list(actor,projectId,keyword,from,through,page,size);
 }
 public AdminDtos.Page<Map<String,Object>> list(String actor,Long projectId,String keyword,LocalDate from,LocalDate through,int page,int size) {
  if(!"ADMIN".equals(identity.current(actor).getRole()))fail(403,"FORBIDDEN","Chỉ ADMIN được đọc nhật ký quản trị.");
  if(page<0||size<1||size>100||text(keyword).length()>100||from!=null&&through!=null&&from.isAfter(through)
      ||from!=null&&(from.getYear()<1000||from.getYear()>9999)
      ||through!=null&&(through.getYear()<1000||!through.isBefore(LocalDate.of(9999,12,31))))fail(422,"INVALID_FILTER","Bộ lọc nhật ký không hợp lệ.");
  var args=new ArrayList<Object>();String where=" WHERE 1=1";
  if(projectId!=null){where+=" AND e.projectId=?";args.add(projectId);}
  var search=MultiWordSearch.sql(keyword,"COALESCE(u.display_name,_utf8mb4'Hệ thống')","u.username","e.actorId","CASE WHEN e.projectId IS NULL THEN _utf8mb4'Toàn hệ thống' ELSE p.name END","p.code","CAST(e.projectId AS CHAR)","e.entityType","e.entityId","e.action",AdminAuditLabels.expression("e.entityType"),AdminAuditLabels.expression("e.action"));
  where+=search.sql();args.addAll(search.args());
  if(from!=null){where+=" AND e.occurredAt>=?";args.add(LocalDateTime.ofInstant(from.atStartOfDay(VIETNAM).toInstant(),ZoneOffset.UTC));}
  if(through!=null){where+=" AND e.occurredAt<?";args.add(LocalDateTime.ofInstant(through.plusDays(1).atStartOfDay(VIETNAM).toInstant(),ZoneOffset.UTC));}
  long total=db.count("SELECT COUNT(*) FROM "+EVENTS+JOINS+where,args.toArray());
  args.add(size);args.add((long)page*size);
  var rows=db.rows("SELECT e.id,e.projectId,p.name AS projectName,e.actorId,u.display_name AS actorName,e.entityType,e.entityId,e.action,e.occurredAt FROM "+EVENTS+JOINS+where+" ORDER BY e.occurredAt DESC,e.id DESC LIMIT ? OFFSET ?",args.toArray());
  for(var row:rows){row.put("entityLabel",AdminAuditLabels.label(row.get("entityType")));row.put("actionLabel",AdminAuditLabels.label(row.get("action")));}
  return new AdminDtos.Page<>(rows,page,size,total);
 }
}
