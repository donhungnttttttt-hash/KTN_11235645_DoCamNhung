package vn.syp.tms.reporting;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.workitem.WorkItemStore;

@Service
public class ProjectHealthStore {
 private final WorkItemStore db;
 public ProjectHealthStore(WorkItemStore db){this.db=db;}
 public record Request(long project,String key,long revision,String evidence,String severity,String factsKey){}
 @Transactional
 public Optional<Request> record(long project,Map<String,Object> risk){
  db.row("SELECT id FROM projects WHERE id=? AND archived_at IS NULL FOR UPDATE",project);
  String key=risk.get("key").toString(),severity=risk.get("severity").toString(),evidence=risk.get("message").toString(),factsKey=risk.get("factsKey").toString();
  var rows=db.rows("SELECT * FROM project_dashboard_risks WHERE project_id=? AND risk_key=? FOR UPDATE",project,key);
  long revision=1;String previous="INSUFFICIENT_DATA";Object lastAi=null;boolean upgradeLegacy=false;
  if(!rows.isEmpty()){
   var row=rows.getFirst();previous=row.get("severity").toString();revision=GuestDashboardService.n(row,"revision");lastAi=row.get("ai_at");
   upgradeLegacy="READY".equals(row.get("ai_state"))&&HealthAdviceLanguages.read(row.get("ai_text")).isEmpty();
   boolean changed=!factsKey.equals(row.get("facts_key"))||!evidence.equals(row.get("evidence"))||!severity.equals(previous);
   if(!severity.equals(previous))revision++;
   if(changed)db.update("UPDATE project_dashboard_risks SET severity=?,evidence=?,facts_key=?,revision=?,ai_text=NULL,ai_state='PENDING',updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND risk_key=?",severity,evidence,factsKey,revision,project,key);
  }else db.update("INSERT INTO project_dashboard_risks(project_id,risk_key,severity,evidence,facts_key,revision,updated_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",project,key,severity,evidence,factsKey,revision);
  boolean warning=warning(severity);
  if(warning&&(!warning(previous)||"HIGH".equals(severity)&&!"HIGH".equals(previous))){
   db.update("INSERT IGNORE INTO project_health_notifications(project_id,recipient_user_id,risk_key,risk_revision,message,created_at) SELECT m.project_id,m.user_id,?,?,?,UTC_TIMESTAMP(6) FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.active=TRUE AND u.enabled=TRUE AND u.role_code IN ('PM','ADMIN') AND m.project_role='PM'",key,revision,evidence,project);
  }
  if(!warning)return Optional.empty();
  // At most one paid attempt per risk/hour; evidence changes invalidate old advice immediately.
  Instant last=lastAi instanceof Instant i?i:lastAi instanceof java.sql.Timestamp t?t.toInstant():null;
  if(!upgradeLegacy&&last!=null&&last.isAfter(Instant.now().minusSeconds(3600)))return Optional.empty();
  db.update("UPDATE project_dashboard_risks SET ai_state='GENERATING',ai_at=UTC_TIMESTAMP(6) WHERE project_id=? AND risk_key=?",project,key);
  return Optional.of(new Request(project,key,revision,evidence,severity,factsKey));
 }
 @Transactional
 public void complete(Request request,String text){
  db.update("UPDATE project_dashboard_risks SET ai_text=?,ai_state=?,ai_at=UTC_TIMESTAMP(6) WHERE project_id=? AND risk_key=? AND revision=? AND evidence=? AND facts_key=? AND EXISTS(SELECT 1 FROM projects p WHERE p.id=project_id AND p.archived_at IS NULL)",text,text==null?"UNAVAILABLE":"READY",request.project(),request.key(),request.revision(),request.evidence(),request.factsKey());
 }
 static boolean warning(String severity){return "HIGH".equals(severity)||"WATCH".equals(severity);}
}
