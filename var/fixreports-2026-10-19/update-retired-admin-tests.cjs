const fs=require('node:fs');
let p='Backend/src/test/java/vn/syp/tms/admin/ProjectStatusReportTest.java',s=fs.readFileSync(p,'utf8');
const calendar=s.slice(s.indexOf(' @Test void deadlinesUseProjectDay'),s.indexOf(' @Test void reportRequiresCurrentPm'));
fs.writeFileSync(p,`package vn.syp.tms.admin;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.workitem.WorkItemStore;
class ProjectStatusReportTest {
${calendar}
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
`);
p='Backend/src/test/java/vn/syp/tms/admin/ProjectStatusReportSecurityTest.java';s=fs.readFileSync(p,'utf8');
s=s.replace('@Autowired MockMvc mvc;', '@MockitoBean vn.syp.tms.feature.LegacyTestingWrites legacyTestingWrites;\n @Autowired MockMvc mvc;');
let begin=s.indexOf(' @Test void blankNarrative');s=s.slice(0,begin)+` @Test void retiredEndpointDefersToServiceAuthorizationBeforeInterpretingOldPayload()throws Exception {
  when(reports.create(anyString(),eq(1L),isNull())).thenThrow(new vn.syp.tms.shared.web.BusinessException(410,"USE_FEATURE_REPORTS","Use Feature reports"));
  mvc.perform(post("/api/v1/projects/1/status-reports").with(actor("PM")).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{}")).andExpect(status().isGone());
  verify(reports).create(anyString(),eq(1L),isNull());
 }
}
`;fs.writeFileSync(p,s);
p='Backend/src/test/java/vn/syp/tms/admin/AdminNativeIntegrationTest.java';s=fs.readFileSync(p,'utf8');
s=s.replace('jsonPath("$.metrics.executionPercent").doesNotExist()', 'jsonPath("$.metrics.executionPercent").value(0.0)').replace('containsEntry("executionPercent",null)','containsEntry("executionPercent",0.0)');
s=s.replace('userSearchAcceptsVietnameseDisplayNamesAndPreservesLiteralCaseSensitiveUsernames','userSearchAcceptsVietnameseDisplayNamesAndCaseInsensitiveLiteralUsernames').replace('"100%_",tester.getUsername()))','"100%_",tester.getUsername(),tester.getUsername().toUpperCase(Locale.ROOT)))').replace('List.of("không tồn tại",tester.getUsername().toUpperCase(Locale.ROOT))','List.of("không tồn tại")');
begin=s.indexOf('    @Test void reportReplayHistory');let end=s.indexOf('    @Test void allocationLifecycle',begin);
s=s.slice(0,begin)+`    @Test void historicalReportRemainsReadableOnlyByPmAdminAndLegacyCycleDoesNotCreateActiveWarning() throws Exception {
        jdbc.update("INSERT INTO milestones(project_id,code,name,due_on,created_at,updated_at) VALUES(?,'LATE','Late milestone','2000-01-01',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",first);
        long milestone=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM milestones WHERE project_id=? AND code='LATE'",Long.class,first));
        long member=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,first,owner.getId()));
        jdbc.update("INSERT INTO test_cycles(project_id,code,name,milestone_id,created_at,created_by) VALUES(?,'PLAN','Legacy planned cycle',?,UTC_TIMESTAMP(6),?)",first,milestone,member);
        jdbc.update("INSERT INTO project_status_reports(project_id,author_membership_id,summary,delay_reason,recovery_plan,request_key,payload_hash,created_at,created_by) VALUES(?,?, 'Original history','Original reason','Original plan','native-history',REPEAT('a',64),UTC_TIMESTAMP(6),?)",first,member,owner.getId());
        var pm=users.saveAndFlush(new IdentityUser("history.pm."+UUID.randomUUID(),"History PM","not-login","PM"));
        projects.addOrUpdateMember(first,owner.getId(),pm.getId(),new ProjectDtos.SetMember("PM"));
        for(var reader:List.of(admin,pm)){
            mvc.perform(get("/api/v1/projects/"+first+"/status-reports").with(actor(reader))).andExpect(status().isOk()).andExpect(jsonPath("$.canPost").value(false)).andExpect(jsonPath("$.reports.items[0].summary").value("Original history"));
            mvc.perform(post("/api/v1/projects/"+first+"/status-reports").with(actor(reader)).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{}")).andExpect(status().isGone()).andExpect(jsonPath("$.code").value("USE_FEATURE_REPORTS"));
        }
        mvc.perform(get("/api/v1/projects/"+first+"/status-reports").with(actor(tester))).andExpect(status().isForbidden());
        assertThat(service.overview(admin.getId(),first).attention().get("overdueMilestoneCount")).isEqualTo(0);
        assertThat(statusReports.history(admin.getId(),first,true,0,20).milestones()).singleElement().satisfies(m->assertThat(m).containsEntry("scopeCount",0L).containsEntry("deadlineStatus","INSUFFICIENT_DATA"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_status_reports WHERE project_id=?",Long.class,first)).isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=?",Long.class,admin.getId())).isZero();
    }
`+s.slice(end);fs.writeFileSync(p,s);
