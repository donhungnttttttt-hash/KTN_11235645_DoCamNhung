package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class ProjectStatusReportTest {
 @Test void deadlinesUseProjectDayAndRequireScopeAndUnfinishedWork() {
  Instant now=Instant.parse("2026-10-05T12:00:00Z");
  assertThat(ProjectDeadlines.status(LocalDate.parse("2026-10-05"),1,true,"Pacific/Kiritimati",now)).isEqualTo("OVERDUE");
  assertThat(ProjectDeadlines.status(LocalDate.parse("2026-10-05"),1,true,"America/Los_Angeles",now)).isEqualTo("NO_OVERDUE_WARNING");
  assertThat(ProjectDeadlines.status(null,1,true,"UTC",now)).isEqualTo("INSUFFICIENT_DATA");
  assertThat(ProjectDeadlines.status(LocalDate.MIN,0,true,"UTC",now)).isEqualTo("INSUFFICIENT_DATA");
  assertThat(ProjectDeadlines.status(LocalDate.MIN,1,false,"UTC",now)).isEqualTo("NO_OVERDUE_WARNING");
 }
 @Test void reportRequiresCurrentPmAndRejectsGlobalDevEvenWithPmMembership() {
  var db=mock(WorkItemStore.class);var service=new ProjectStatusReportService(db,mock(IdentityService.class),mock(ProjectAudit.class),mock(ProjectDeadlines.class));
  when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(new HashMap<>());
  when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(List.of(Map.of("role","DEV"))).thenReturn(List.of(Map.of("id",1L,"role","PM")));
  assertThatThrownBy(()->service.create("actor",1,new ProjectStatusReportService.Input("key","Update","","",null))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
  verify(db,never()).insert(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
 }
 @Test void replayIsBoundToActorAndNormalizedPayloadAndDoesNotRecheckOldDeadline() {
  var db=mock(WorkItemStore.class);var deadlines=mock(ProjectDeadlines.class);var audit=mock(ProjectAudit.class);
  var service=new ProjectStatusReportService(db,mock(IdentityService.class),audit,deadlines);
  when(db.checksum(any())).thenReturn("hash");
  when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(new HashMap<>(Map.of("id",9L)));
  when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(c->{String sql=c.getArgument(0);
   if(sql.contains("identity_users"))return List.of(Map.of("role","PM"));
   if(sql.contains("project_memberships"))return List.of(Map.of("id",3L,"role","PM"));
   return List.of(Map.of("id",9L,"actor","actor","hash","hash"));});
  var input=new ProjectStatusReportService.Input("same"," Update ","","",null);
  assertThat(service.create("actor",1,input)).containsEntry("id",9L);
  verifyNoInteractions(deadlines,audit);
  when(db.checksum(any())).thenReturn("different");
  assertThatThrownBy(()->service.create("actor",1,input)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(409));
  assertThatThrownBy(()->service.create("other",1,input)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(409));
  verify(db,never()).insert(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
 }
 @Test void overdueRequiresBothReasonAndRecoveryAndSuccessfulReportDoesNotChangeMetrics() {
  var db=mock(WorkItemStore.class);var deadlines=mock(ProjectDeadlines.class);var audit=mock(ProjectAudit.class);
  var service=new ProjectStatusReportService(db,mock(IdentityService.class),audit,deadlines);
  when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(new HashMap<>());
  when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(c->{String sql=c.getArgument(0);if(sql.contains("identity_users"))return List.of(Map.of("role","PM"));if(sql.contains("project_memberships"))return List.of(Map.of("id",3L,"role","PM"));return List.of();});
  when(deadlines.milestones(eq(1L),any())).thenReturn(List.of(Map.of("deadlineStatus","OVERDUE")));
  when(db.checksum(any())).thenReturn("hash");
  for(var input:List.of(new ProjectStatusReportService.Input("k","Update","","Plan",null),new ProjectStatusReportService.Input("k","Update","Reason","",null)))
   assertThatThrownBy(()->service.create("actor",1,input)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(422));
  service.create("actor",1,new ProjectStatusReportService.Input("k","Update","Reason","Plan",null));
  verify(db,times(1)).insert(java.util.Objects.requireNonNull(startsWith("INSERT INTO project_status_reports")),any(Object[].class));
  verify(db,never()).update(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
  var order=inOrder(db,deadlines);order.verify(db).rows(java.util.Objects.requireNonNull(contains("identity_users")),eq("actor"));order.verify(db).row(java.util.Objects.requireNonNull(contains("FOR UPDATE")),eq(1L));
 }
 @Test void testerAdminWithoutPmAndProjectDevCannotPost() {
  for(String role:List.of("TESTER","DEV","MEMBER")) {
   var db=mock(WorkItemStore.class);var service=new ProjectStatusReportService(db,mock(IdentityService.class),mock(ProjectAudit.class),mock(ProjectDeadlines.class));
   when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(new HashMap<>());
   when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(List.of(Map.of("role","ADMIN"))).thenReturn(List.of(Map.of("id",1L,"role",role)));
   assertThatThrownBy(()->service.create("actor",1,new ProjectStatusReportService.Input("key","Update","","",null))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
  }
 }
 @Test void outsiderPmAndDisabledAccountCannotWrite() {
  var db=mock(WorkItemStore.class);var service=new ProjectStatusReportService(db,mock(IdentityService.class),mock(ProjectAudit.class),mock(ProjectDeadlines.class));
  var input=new ProjectStatusReportService.Input("key","Update","","",null);
  when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(List.of(Map.of("role","PM"))).thenReturn(List.of());
  assertThatThrownBy(()->service.create("outsider",1,input)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(404));
  assertThatThrownBy(()->service.create("disabled",1,input)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
  verify(db,never()).insert(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
 }
}
