package vn.syp.tms.reporting;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.ai.FeatureFacts;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.workitem.WorkItemStore;

@Service
public class GuestDashboardService {
 private final WorkItemStore db; private final ProjectService projects;
 public GuestDashboardService(WorkItemStore db,ProjectService projects){this.db=db;this.projects=projects;}
 private static final String ACTIVE=" FROM import_rows r JOIN import_batches b ON b.project_id=r.project_id AND b.id=r.batch_id JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id WHERE r.project_id=? AND r.target_case_id IS NOT NULL AND b.status='COMMITTED' AND b.archived_at IS NULL AND f.archived_at IS NULL";
 @Transactional(readOnly=true)
 public Map<String,Object> get(long p,String actor){projects.requireReportingAccess(p,actor);return snapshot(p);}
 /** Internal worker only; controller must call get to establish project membership. */
 Map<String,Object> snapshot(long p){
  var project=db.row("SELECT id,code,name,timezone FROM projects WHERE id=?",p);
  var metrics=new FeatureFacts(db).metrics(p,null);
  var people=db.rows("SELECT m.id AS membershipId,u.display_name AS name,CASE WHEN u.role_code IN ('ADMIN','PM') THEN 'MANAGER' ELSE 'USER' END AS responsibility,"+
   "(SELECT COUNT(*) FROM test_document_owners o JOIN import_batches b ON b.project_id=o.project_id AND b.id=o.document_id JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id WHERE o.project_id=m.project_id AND o.membership_id=m.id AND b.archived_at IS NULL AND f.archived_at IS NULL) AS ownedFiles,"+
   "(SELECT COUNT(*) FROM test_document_assignments a JOIN import_rows r ON r.project_id=a.project_id AND r.id=a.row_id JOIN import_batches b ON b.project_id=r.project_id AND b.id=r.batch_id JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id WHERE a.project_id=m.project_id AND a.first_tester_user_id=u.id AND r.target_case_id IS NOT NULL AND b.status='COMMITTED' AND b.archived_at IS NULL AND f.archived_at IS NULL) AS initialCases "+
   "FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.active=TRUE AND u.enabled=TRUE AND u.role_code IN ('ADMIN','PM','USER') ORDER BY u.display_name,m.id",p);
  long managers=people.stream().filter(x->"MANAGER".equals(x.get("responsibility"))).count(),users=people.size()-managers;
  var features=db.rows("SELECT f.id,f.name,COUNT(r.id) AS total,COALESCE(SUM(r.result_status<>'UNEXECUTED'),0) AS tested,COALESCE(SUM(r.result_status='OK'),0) AS ok FROM testing_features f LEFT JOIN import_batches b ON b.project_id=f.project_id AND b.feature_id=f.id AND b.status='COMMITTED' AND b.archived_at IS NULL LEFT JOIN import_rows r ON r.project_id=b.project_id AND r.batch_id=b.id AND r.target_case_id IS NOT NULL WHERE f.project_id=? AND f.archived_at IS NULL GROUP BY f.id,f.name ORDER BY f.id",p);
  var tickets=db.row("SELECT COUNT(*) AS total,COALESCE(SUM(NOT t.finalized),0) AS open,COALESCE(SUM(t.awaiting_verification),0) AS awaitingVerification,COALESCE(SUM(NOT t.finalized AND (x.deleted_at IS NOT NULL OR f.archived_at IS NOT NULL OR b.archived_at IS NOT NULL)),0) AS hiddenOpen FROM ticket_workflow_metrics t JOIN work_items w ON w.project_id=t.project_id AND w.id=t.work_item_id JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id JOIN testing_features f ON f.project_id=x.project_id AND f.id=x.feature_id LEFT JOIN import_batches b ON b.project_id=x.project_id AND b.id=x.document_id WHERE w.project_id=? AND w.item_type IN ('BUG','QA')",p);
  String scopeKey=scopeKey(p);
  var history=db.rows("SELECT observed_on AS day,users_count AS users,managers_count AS managers,total_cases AS total,tested_cases AS tested,ok_cases AS ok,ng_cases AS ng,planned_cases AS planned,baseline_tested_cases AS baselineTested,scope_key AS scopeKey,modeled_cost AS cost,captured_at AS capturedAt FROM project_dashboard_days WHERE project_id=? ORDER BY observed_on DESC LIMIT 90",p);
  Collections.reverse(history);
  long cost=db.count("SELECT COALESCE(SUM(modeled_cost),0) FROM project_dashboard_days WHERE project_id=?",p);
  long planned=history.isEmpty()?0:n(history.getLast(),"planned");
  LocalDate today=LocalDate.now(ZoneId.of(project.get("timezone").toString()));
  // Today's target is an end-of-day target. Assess delay against the last completed observed day.
  var completed=history.stream().filter(x->{LocalDate day=LocalDate.parse(x.get("day").toString());return day.isBefore(today)&&GuestDashboardMath.workingDay(day);}).toList();
  long due=completed.isEmpty()?0:n(completed.getLast(),"planned");
  boolean comparable=!completed.isEmpty()&&GuestDashboardMath.previousWorkingDay(today).toString().equals(completed.getLast().get("day").toString())&&scopeKey.equals(completed.getLast().get("scopeKey"))&&users>0;
  String progress=comparable?GuestDashboardMath.progressRisk(n(metrics,"total"),n(metrics,"tested"),due,n(completed.getLast(),"total"),users):"INSUFFICIENT_DATA";
  var risks=new ArrayList<Map<String,Object>>();
  risks.add(Map.of("key","PROGRESS","severity",progress,"message",!comparable||due==0?"Chưa có mốc ngày làm việc gần nhất cùng phạm vi và đủ nhân lực để đánh giá chậm tiến độ.":"Đã test "+n(metrics,"tested")+" / mục tiêu mô phỏng đến ngày đã kết thúc "+due+" case.","section","progress"));
  risks.add(Map.of("key","QUALITY","severity",n(metrics,"ng")>0||n(tickets,"open")>0?"WATCH":n(metrics,"tested")==0?"INSUFFICIENT_DATA":"ON_TRACK","message",n(metrics,"ng")+" case NG; "+n(tickets,"open")+" Ticket còn nghĩa vụ xử lý. Tỷ lệ đã test không phải tỷ lệ nghiệm thu.","section","quality"));
  risks.add(Map.of("key","COST","severity",progress,"message",!comparable||due==0?"Chưa đủ dữ liệu so sánh hiệu quả chi phí mô phỏng.":"Hiệu quả mô phỏng đối chiếu cùng mục tiêu "+due+" case; không phản ánh chi phí thực trả.","section","cost"));
  var advice=db.rows("SELECT risk_key AS riskKey,severity,evidence,facts_key AS factsKey,ai_text AS text,ai_state AS state,ai_at AS generatedAt,updated_at AS evidenceAt FROM project_dashboard_risks WHERE project_id=?",p);
  for(var item:advice){var texts=HealthAdviceLanguages.read(item.get("text"));item.put("texts",texts);item.put("text",texts.get("vi"));if(texts.isEmpty()&&"READY".equals(item.get("state")))item.put("state","PENDING");}
  var simulation=new LinkedHashMap<String,Object>();simulation.put("baseRate",500);simulation.put("managerWeight",5);simulation.put("casesPerUserDay",50);simulation.put("users",users);simulation.put("managers",managers);simulation.put("dailyCost",GuestDashboardMath.dailyCost(users,managers,true));simulation.put("cumulativeCost",cost);simulation.put("plannedCases",planned);simulation.put("dueCases",due);simulation.put("unit","đơn vị mô phỏng");simulation.put("workingToday",GuestDashboardMath.workingDay(today));
  long capacity=GuestDashboardMath.dailyTarget(users,true),remaining=n(metrics,"notRun");
  simulation.put("estimatedRemainingDays",capacity==0?null:(remaining+capacity-1)/capacity);
  simulation.put("estimatedRemainingCost",capacity==0?null:((remaining+capacity-1)/capacity)*GuestDashboardMath.dailyCost(users,managers,true));
  simulation.put("costBeforeWindow",cost-history.stream().mapToLong(x->n(x,"cost")).sum());
  simulation.put("comparableBaseline",comparable);
  simulation.put("assumptions",List.of("Mô phỏng: User ×1, quản lý ×5, Khách không tính nhân lực.","500 đơn vị/người quy đổi/ngày; 50 case/User/ngày; quản lý không nhân năng suất ×5.","Giả định làm toàn thời gian, thứ Hai–thứ Sáu; chưa tính ngày lễ, nghỉ phép hay độ phức tạp case.","Chỉ cộng các ngày đã ghi nhận. Không suy đoán nhân sự hoặc chi phí những ngày thiếu dữ liệu.","Mục tiêu mô phỏng không phải hạn cam kết; chi phí không phải lương, giá hợp đồng hoặc khoản thực chi."));
  risks.replaceAll(risk->{var copy=new LinkedHashMap<String,Object>(risk);var facts=new LinkedHashMap<String,Object>();facts.put("metrics",metrics);facts.put("tickets",tickets);facts.put("simulation",simulation);facts.put("key",risk.get("key"));facts.put("severity",risk.get("severity"));facts.put("scopeKey",scopeKey);copy.put("factsKey",db.checksum(facts));return copy;});
  for(var item:advice){var current=risks.stream().filter(r->r.get("key").equals(item.get("riskKey"))).findFirst();if(current.isEmpty()||!current.get().get("factsKey").equals(item.get("factsKey"))){item.put("text",null);item.put("texts",Map.of());item.put("state","STALE");}}
  var result=new LinkedHashMap<String,Object>();result.put("project",project);result.put("metrics",metrics);result.put("features",features);result.put("people",people);result.put("tickets",tickets);result.put("history",history);result.put("simulation",simulation);result.put("health",risks);result.put("advice",advice);result.put("asOf",Instant.now());result.put("timeZone",project.get("timezone"));return result;
 }
 @Transactional
 public void capture(long p){
  var project=db.row("SELECT id,timezone FROM projects WHERE id=? AND archived_at IS NULL FOR UPDATE",p);
  LocalDate day=LocalDate.now(ZoneId.of(project.get("timezone").toString()));
  var counts=db.row("SELECT COALESCE(SUM(u.role_code='USER'),0) AS users,COALESCE(SUM(u.role_code IN ('PM','ADMIN')),0) AS managers FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.active=TRUE AND u.enabled=TRUE",p);
  var metrics=new FeatureFacts(db).metrics(p,null);long users=n(counts,"users"),managers=n(counts,"managers");
  var previous=db.rows("SELECT planned_cases AS planned FROM project_dashboard_days WHERE project_id=? AND observed_on<? ORDER BY observed_on DESC LIMIT 1",p,day);
  long base=previous.isEmpty()?n(metrics,"tested"):n(previous.getFirst(),"planned");boolean working=GuestDashboardMath.workingDay(day);
  db.update("INSERT INTO project_dashboard_days(project_id,observed_on,users_count,managers_count,total_cases,tested_cases,ok_cases,ng_cases,planned_cases,baseline_tested_cases,scope_key,modeled_cost,captured_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE total_cases=VALUES(total_cases),tested_cases=VALUES(tested_cases),ok_cases=VALUES(ok_cases),ng_cases=VALUES(ng_cases),captured_at=VALUES(captured_at)",p,day,users,managers,n(metrics,"total"),n(metrics,"tested"),n(metrics,"ok"),n(metrics,"ng"),Math.min(n(metrics,"total"),base+GuestDashboardMath.dailyTarget(users,working)),n(metrics,"tested"),scopeKey(p),GuestDashboardMath.dailyCost(users,managers,working));
 }
 private String scopeKey(long p){return db.checksum(db.rows("SELECT r.id"+ACTIVE+" ORDER BY r.id",p));}
 static long n(Map<String,Object> row,String key){return ((Number)row.get(key)).longValue();}
}
