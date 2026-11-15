package vn.syp.tms.reporting;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.Objects;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.UUID;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import vn.syp.tms.support.UnifiedTestingFixtures;
import vn.syp.tms.ai.OpenAiResponsesClient;

class GuestDashboardNativeTest extends UnifiedTestingFixtures {
 @Autowired GuestDashboardService dashboard;
 @Autowired ProjectHealthMonitor monitor;
 @Autowired ProjectHealthNotifications notifications;
 @MockitoBean OpenAiResponsesClient ai;
 @BeforeEach void setup()throws Exception{testingFixture();}
 @Test void notificationHttpRoutesEnforceRecipientAndGuestBoundaries()throws Exception{
  when(ai.generateText(anyString(),any())).thenThrow(new OpenAiResponsesClient.Failure("AI_UNAVAILABLE"));
  jdbc.update("UPDATE import_rows SET result_status='NG' WHERE project_id=? AND id=?",p,row);monitor.refresh(p);
  var manager=loggedIn(admin);String path="/me/project-health-notifications";
  var response=manager.get(path);assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
  long id=body(response).path("items").get(0).path("id").asLong();
  assertThat(loggedIn(worker).write("PUT",path+"/"+id+"/read",Map.of()).statusCode()).isEqualTo(404);
  assertThat(manager.write("PUT",path+"/"+id+"/read",Map.of()).statusCode()).isEqualTo(200);
  var guest=loggedIn(account("GUEST"));
  assertThat(guest.get(path).statusCode()).isEqualTo(403);
  assertThat(guest.write("PUT",path+"/"+id+"/read",Map.of()).statusCode()).isEqualTo(403);
 }
 @Test void dailyStaffingIsImmutableAndDuplicateCaptureDoesNotInflateCosts(){
  dashboard.capture(p);long count=Objects.requireNonNull(jdbc.queryForObject("SELECT users_count FROM project_dashboard_days WHERE project_id=?",Long.class,p));
  jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",member);dashboard.capture(p);
  assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_dashboard_days WHERE project_id=?",Long.class,p)).isEqualTo(1);
  assertThat(jdbc.queryForObject("SELECT users_count FROM project_dashboard_days WHERE project_id=?",Long.class,p)).isEqualTo(count);
 }
 @Test void riskNotificationsAreDeduplicatedAndAiOutageDoesNotBecomeAdvice(){
  when(ai.generateText(anyString(),any())).thenThrow(new OpenAiResponsesClient.Failure("AI_UNAVAILABLE"));
  jdbc.update("UPDATE import_rows SET result_status='NG' WHERE project_id=? AND id=?",p,row);
  monitor.refresh(p);monitor.refresh(p);
  long count=Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM project_health_notifications WHERE project_id=? AND risk_key='QUALITY'",Long.class,p));
  assertThat(count).isEqualTo(1);
  assertThat(jdbc.queryForObject("SELECT ai_state FROM project_dashboard_risks WHERE project_id=? AND risk_key='QUALITY'",String.class,p)).isEqualTo("UNAVAILABLE");
  jdbc.update("UPDATE import_rows SET result_status='OK' WHERE project_id=? AND id=?",p,row);monitor.refresh(p);
  jdbc.update("UPDATE import_rows SET result_status='NG' WHERE project_id=? AND id=?",p,row);monitor.refresh(p);
  assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_health_notifications WHERE project_id=? AND risk_key='QUALITY'",Long.class,p)).isEqualTo(2);
 }
 @Test void successfulAdviceAndNoticesStayInTheProjectAndRevocationHidesThem(){
  when(ai.generateText(anyString(),any())).thenReturn(new OpenAiResponsesClient.Output(json.getNodeFactory().textNode("{\"ja\":\"NGケースを優先して確認してください。\",\"vi\":\"Ưu tiên xác minh case NG.\"}"),"r","test",1,1));
  jdbc.update("UPDATE import_rows SET result_status='NG' WHERE project_id=? AND id=?",p,row);monitor.refresh(p);
  assertThat(jdbc.queryForObject("SELECT ai_state FROM project_dashboard_risks WHERE project_id=? AND risk_key='QUALITY'",String.class,p)).isEqualTo("READY");
  assertThat(((Number)notifications.list(admin.getId()).get("unreadCount")).longValue()).isGreaterThan(0);
  assertThat(((Number)notifications.list(worker.getId()).get("unreadCount")).longValue()).isZero();
  jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",member);
  @SuppressWarnings("unchecked") var advice=(List<Map<String,Object>>)dashboard.get(p,admin.getId()).get("advice");
  assertThat(advice.stream().filter(x->"QUALITY".equals(x.get("riskKey"))).findFirst().orElseThrow().get("text")).isNull();
  jdbc.update("UPDATE project_memberships SET active=FALSE WHERE project_id=? AND user_id=?",p,admin.getId());
  assertThat(((Number)notifications.list(admin.getId()).get("unreadCount")).longValue()).isZero();
 }
 @Test void legacyAdviceIsUpgradedOnceAndLanguagePairMatchesEvidence(){
  jdbc.update("UPDATE import_rows SET result_status='NG' WHERE project_id=? AND id=?",p,row);
  when(ai.generateText(anyString(),any())).thenReturn(new OpenAiResponsesClient.Output(json.getNodeFactory().textNode("{\"ja\":\"NGケースを確認してください。\",\"vi\":\"Xác minh case NG.\"}"),"r","test",1,1));
  monitor.refresh(p);
  jdbc.update("UPDATE project_dashboard_risks SET ai_text='Legacy Vietnamese',ai_state='READY' WHERE project_id=? AND risk_key='QUALITY'",p);
  clearInvocations(ai);monitor.refresh(p);monitor.refresh(p);
  verify(ai,times(1)).generateText(contains("Japanese"),any());
  @SuppressWarnings("unchecked") var advice=(List<Map<String,Object>>)dashboard.get(p,admin.getId()).get("advice");
  var current=advice.stream().filter(x->"QUALITY".equals(x.get("riskKey"))).findFirst().orElseThrow();
  assertThat(current.get("texts")).isEqualTo(Map.of("ja","NGケースを確認してください。","vi","Xác minh case NG."));
  assertThat(current.get("state")).isEqualTo("READY");
 }
 @Test void partialLanguagePairCannotBePublished(){
  jdbc.update("UPDATE import_rows SET result_status='NG' WHERE project_id=? AND id=?",p,row);
  when(ai.generateText(anyString(),any())).thenReturn(new OpenAiResponsesClient.Output(json.getNodeFactory().textNode("{\"vi\":\"Xác minh case NG.\"}"),"r","test",1,1));
  monitor.refresh(p);monitor.refresh(p);
  assertThat(jdbc.queryForObject("SELECT ai_state FROM project_dashboard_risks WHERE project_id=? AND risk_key='QUALITY'",String.class,p)).isEqualTo("UNAVAILABLE");
  verify(ai,times(1)).generateText(anyString(),any());
 }
 @Test void scopeChangesAndGapsInvalidateProgressBaseline(){
  dashboard.capture(p);LocalDate previous=GuestDashboardMath.previousWorkingDay(LocalDate.now(ZoneOffset.UTC));
  jdbc.update("UPDATE project_dashboard_days SET observed_on=?,planned_cases=1 WHERE project_id=?",previous,p);
  @SuppressWarnings("unchecked") var before=(List<Map<String,Object>>)dashboard.get(p,admin.getId()).get("health");
  assertThat(before.getFirst().get("severity")).isEqualTo("HIGH");
  jdbc.update("UPDATE import_rows SET target_case_id=NULL WHERE project_id=? AND id=?",p,row);
  @SuppressWarnings("unchecked") var changed=(List<Map<String,Object>>)dashboard.get(p,admin.getId()).get("health");
  assertThat(changed.getFirst().get("severity")).isEqualTo("INSUFFICIENT_DATA");
  jdbc.update("UPDATE project_dashboard_days SET observed_on=? WHERE project_id=?",previous.minusWeeks(2),p);
  @SuppressWarnings("unchecked") var gap=(List<Map<String,Object>>)dashboard.get(p,admin.getId()).get("health");
  assertThat(gap.getFirst().get("severity")).isEqualTo("INSUFFICIENT_DATA");
 }
 @Test void hiddenTicketsRetainObligationsButAreExplicitlyCounted()throws Exception{
  var input=new LinkedHashMap<String,Object>();input.put("type","BUG");input.put("featureId",f);input.put("documentId",d);input.put("rowId",row);input.put("title","Pending bug");input.put("description","Evidence");input.put("steps","Steps");input.put("expectedResult","Expected");input.put("actualResult","Actual");input.put("frequency","1/1");input.put("environment","Test");input.put("device","Tablet");input.put("requestKey",UUID.randomUUID());
  input.put("assigneeMembershipId",Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,admin.getId())));
  var response=loggedIn(worker).write("POST","/projects/"+p+"/issues",input);assertThat(response.statusCode()).as(response.body()).isEqualTo(201);
  jdbc.update("UPDATE work_item_feature_context SET deleted_at=UTC_TIMESTAMP(6) WHERE project_id=? AND work_item_id=?",p,body(response).path("id").asLong());
  @SuppressWarnings("unchecked") var tickets=(Map<String,Object>)dashboard.get(p,admin.getId()).get("tickets");
  assertThat(((Number)tickets.get("open")).longValue()).isEqualTo(1);
  assertThat(((Number)tickets.get("hiddenOpen")).longValue()).isEqualTo(1);
 }
}
