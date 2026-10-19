package vn.syp.tms.admin;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
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

 @Test void historicalNarrativeAndAuthorArePreservedWhileEveryViewIsReadOnly() {
  var db=mock(WorkItemStore.class);var identity=mock(IdentityService.class);
  var admin=new IdentityUser("legacy.admin","Admin","not-login","ADMIN");when(identity.current(admin.getId())).thenReturn(admin);
  when(db.row(Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(Map.of("id",1L));
  var stored=Map.<String,Object>of("id",9L,"summary","Original report","delayReason","Original reason","authorName","Original PM");
  when(db.rows(Objects.requireNonNull(contains("FROM project_status_reports")),any(Object[].class))).thenReturn(List.of(stored));
  when(db.count(Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(1L);
  var actors=mock(ProjectActorService.class);var audit=mock(ProjectAudit.class);
  var service=new ProjectStatusReportService(db,identity,audit,mock(ProjectDeadlines.class),actors);
  for(boolean central:List.of(false,true)) {var result=service.history(admin.getId(),1,central,0,20);assertThat(result.canPost()).isFalse();assertThat(result.reports().items()).containsExactly(stored);assertThat(result.reports().totalElements()).isEqualTo(1);}
  verifyNoInteractions(actors,audit);verify(db,never()).insert(Objects.requireNonNull(anyString()),any(Object[].class));verify(db,never()).update(Objects.requireNonNull(anyString()),any(Object[].class));
 }
}
