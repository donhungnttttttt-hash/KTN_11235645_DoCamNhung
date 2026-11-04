package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

@SpringBootTest @AutoConfigureMockMvc @Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="integration")
class NativeCurrentProjectLifecycleIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){vn.syp.tms.support.CurrentWorkflowDatabaseGuard.configure(r);}
    @Autowired MockMvc mvc;@Autowired JdbcTemplate jdbc;@Autowired DataSource source;@Autowired WorkItemStore db;@Autowired ProjectLifecycleService lifecycle;@Autowired ObjectMapper json;
    CurrentLifecycleFixture f;String admin,admin2;
    @BeforeEach void fixture()throws Exception {
        var c=DataSourceUtils.getConnection(source);try{f=CurrentLifecycleFixture.seed(c,false);}finally{DataSourceUtils.releaseConnection(c,source);}
        admin=registered(1);admin2=registered(2);
        jdbc.update("UPDATE device_allocations SET returned_at=UTC_TIMESTAMP(6),returned_by=?,returned_condition='AVAILABLE' WHERE id=?",admin,f.allocation);
    }
    String registered(int slot){var found=jdbc.queryForList("SELECT user_id FROM system_admin_registry WHERE slot=?",String.class,slot);if(!found.isEmpty())return found.getFirst();String id=UUID.randomUUID().toString();jdbc.update("INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES(?,?,'AR06 Admin','not-login','ADMIN',UTC_TIMESTAMP(6))",id,"ar06."+id);jdbc.update("INSERT INTO system_admin_registry(slot,user_id) VALUES(?,?)",slot,id);return id;}
    RequestPostProcessor actor(String id,String role){return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(id,0L),null,List.of(new SimpleGrantedAuthority("ROLE_"+role))));}
    String endpoint(){return "/api/v1/admin/projects/"+f.project;}
    ProjectLifecycleService.Command command(long version,String key){return new ProjectLifecycleService.Command(version," Accepted delivery ",key);}
    ProjectLifecycleService.Command exception(long version,String key){return new ProjectLifecycleService.Command(version,"Accepted legacy history",key,new ProjectLifecycleService.LegacyException(true,(String)lifecycle.readiness(admin,f.project).get("legacyExceptionFingerprint")));}
    void activeCycle(){jdbc.update("UPDATE test_cycles SET status_code='ACTIVE',activated_at=UTC_TIMESTAMP(6),activated_by=? WHERE id=?",f.pmMember,f.cycle);}
    void error(Runnable action,String code){assertThatThrownBy(action::run).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo(code));}
    long count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE project_id=?",Long.class,f.project);}
    @Test void archivesOnlyAcknowledgedLegacyBlockersWithoutChangingChildren()throws Exception {
        activeCycle();long retest=retest();var before=children();var ready=lifecycle.readiness(admin,f.project);
        assertThat(ready).containsEntry("canArchive",false).containsEntry("canArchiveWithLegacyException",true);
        error(()->lifecycle.decide(admin,f.project,command(0,"ordinary-blocked"),true),"ARCHIVE_BLOCKED");
        long audit=count("project_audit");var accepted=exception(0,"legacy-accepted");var result=lifecycle.decide(admin,f.project,accepted,true);
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(accepted))).andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(true)).andExpect(jsonPath("$.latestDecision.legacyException.policyVersion").value(1));
        assertThat(result).containsEntry("archived",true);assertThat(children()).isEqualTo(before);assertThat(count("project_audit")).isEqualTo(audit+1);assertThat(count("project_lifecycle_decisions")).isEqualTo(1);
        var history=lifecycle.history(admin,f.project,0,20).items().getFirst();assertThat(history).containsEntry("reason","Accepted legacy history");assertThat(history.get("legacyException")).isInstanceOf(Map.class);assertThat(history).doesNotContainKeys("requestKey","payload_hash");
        mvc.perform(get(endpoint()+"/lifecycle-decisions").with(actor(admin,"ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].legacyException.fingerprint").value(accepted.legacyException().snapshotFingerprint()));
        mvc.perform(get(endpoint()+"/archive-readiness").with(actor(admin,"ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.canArchiveWithLegacyException").value(false));
        assertThat(jdbc.queryForObject("SELECT status FROM retest_requests WHERE id=?",String.class,retest)).isEqualTo("OPEN");
    }
    Map<String,Object> children(){return Map.of("cycles",jdbc.queryForList("SELECT * FROM test_cycles WHERE project_id=?",f.project),"runs",jdbc.queryForList("SELECT * FROM run_items WHERE project_id=?",f.project),"retests",jdbc.queryForList("SELECT * FROM retest_requests WHERE project_id=?",f.project),"source",HexFormat.of().formatHex(jdbc.queryForObject("SELECT source_workbook FROM import_batches WHERE id=?",byte[].class,f.document)));}
    @Test void archivedProjectRetainsUserExportsAndRejectsAdminPatch()throws Exception {
        String originalName=jdbc.queryForObject("SELECT name FROM projects WHERE id=?",String.class,f.project);
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(command(0,"archive-export-boundary"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(true)).andExpect(jsonPath("$.version").value(1));
        String export="/api/v1/projects/"+f.project+"/test-documents/"+f.document+"/export";
        mvc.perform(get(export).with(actor(f.tester,"USER"))).andExpect(status().isOk());
        mvc.perform(get(export).param("original","true").with(actor(f.tester,"USER"))).andExpect(status().isOk()).andExpect(content().bytes(f.source));
        mvc.perform(patch(endpoint()).with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content("{\"name\":\"Changed\",\"expectedVersion\":1}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ARCHIVED"));
        assertThat(jdbc.queryForObject("SELECT name FROM projects WHERE id=?",String.class,f.project)).isEqualTo(originalName);
        assertThat(jdbc.queryForObject("SELECT lock_version FROM projects WHERE id=?",Long.class,f.project)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT source_workbook FROM import_batches WHERE id=?",byte[].class,f.document)).isEqualTo(f.source);
    }
    @Test void exceptionReplayAfterReopenDoesNotArchiveAgain() {
        activeCycle();var command=exception(0,"exception-replay");lifecycle.decide(admin,f.project,command,true);lifecycle.decide(admin,f.project,command(1,"reopen-legacy"),false);
        var before=children();long audit=count("project_audit");assertThat(lifecycle.decide(admin,f.project,command,true)).containsEntry("archived",false).containsEntry("version",2L);
        assertThat(count("project_lifecycle_decisions")).isEqualTo(2);assertThat(count("project_audit")).isEqualTo(audit);assertThat(children()).isEqualTo(before);
    }
    @Test void oldCommandReplaySurvivesMigration() {
        String hash=db.checksum(List.of("ARCHIVE",0L,"Accepted delivery"));
        db.insert("INSERT INTO project_lifecycle_decisions(project_id,action,reason,expected_version,result_version,request_key,payload_hash,actor_id,decided_at) VALUES(?,'ARCHIVE','Accepted delivery',0,1,'old-command-key',?,?,UTC_TIMESTAMP(6))",f.project,hash,admin);
        jdbc.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6),lock_version=1 WHERE id=?",f.project);
        assertThat(lifecycle.decide(admin,f.project,command(0,"old-command-key"),true)).containsEntry("archived",true);
        lifecycle.decide(admin,f.project,command(1,"ordinary-reopen"),false);
        assertThat(lifecycle.decide(admin,f.project,command(0,"old-command-key"),true)).containsEntry("archived",false);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_lifecycle_decisions WHERE project_id=? AND legacy_exception_snapshot IS NOT NULL",Long.class,f.project)).isZero();
    }
    @Test void rejectsChangedActorOrPayloadForSameKey() {
        activeCycle();var command=exception(0,"same-payload-key");lifecycle.decide(admin,f.project,command,true);
        error(()->lifecycle.decide(admin2,f.project,command,true),"IDEMPOTENCY_CONFLICT");
        error(()->lifecycle.decide(admin,f.project,new ProjectLifecycleService.Command(0L,"Other reason",command.requestKey(),command.legacyException()),true),"IDEMPOTENCY_CONFLICT");
        error(()->lifecycle.decide(admin,f.project,new ProjectLifecycleService.Command(0L,command.reason(),command.requestKey()),true),"IDEMPOTENCY_CONFLICT");
        error(()->lifecycle.decide(admin,f.project,new ProjectLifecycleService.Command(0L,command.reason(),command.requestKey(),new ProjectLifecycleService.LegacyException(true,"a".repeat(64))),true),"IDEMPOTENCY_CONFLICT");
    }
    @Test void ordinaryLifecycleValidatesRoleCsrfVersionAndReason()throws Exception {
        mvc.perform(get(endpoint()+"/archive-readiness")).andExpect(status().isUnauthorized());
        for(String id:List.of(f.pm,f.tester))mvc.perform(get(endpoint()+"/archive-readiness").with(actor(id,id.equals(f.pm)?"PM":"USER"))).andExpect(status().isForbidden());
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).contentType("application/json").content(json.writeValueAsString(command(0,"csrf-missing")))).andExpect(status().isForbidden());
        error(()->lifecycle.decide(admin,f.project,command(1,"version-stale"),true),"VERSION_CONFLICT");
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(new ProjectLifecycleService.Command(0L," ","reason-blank")))).andExpect(status().isUnprocessableEntity());
        assertThat(lifecycle.decide(admin,f.project,command(0,"ordinary-archive"),true)).containsEntry("archived",true);
        mvc.perform(post(endpoint()+"/reopen").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(command(1,"ordinary-reopen")))).andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(false)).andExpect(jsonPath("$.latestDecision.legacyException").doesNotExist());
    }
    @Test void everyHardBlockerStillBlocksEvenWithValidFingerprint()throws Exception {
        activeCycle();long work;var c=DataSourceUtils.getConnection(source);try{work=f.work(c,"TASK",77);}finally{DataSourceUtils.releaseConnection(c,source);}
        var command=exception(0,"hard-blocker-key");error(()->lifecycle.decide(admin,f.project,command,true),"ARCHIVE_BLOCKED");
        jdbc.update("UPDATE work_items SET status_code='closed' WHERE id=?",work);
        jdbc.update("UPDATE device_allocations SET returned_at=NULL,returned_by=NULL,returned_condition=NULL WHERE id=?",f.allocation);
        error(()->lifecycle.decide(admin,f.project,command,true),"ARCHIVE_BLOCKED");
        jdbc.update("UPDATE device_allocations SET returned_at=UTC_TIMESTAMP(6),returned_by=?,returned_condition='AVAILABLE' WHERE id=?",admin,f.allocation);
        assertThat(lifecycle.decide(admin,f.project,command,true)).containsEntry("archived",true);
    }
    @Test void legacyMutationEndpointsRemainRetired()throws Exception {
        mvc.perform(post("/api/v1/projects/"+f.project+"/test-cycles").with(actor(f.pm,"PM")).with(csrf()).contentType("application/json").content("{\"code\":\"NEW\",\"name\":\"New\"}")).andExpect(status().isGone());
    }
    @Test void controllerRejectsInvalidExceptionAndReopenException()throws Exception {
        activeCycle();var input=exception(0,"invalid-exception");
        for(var value:List.of(Map.of("acknowledged",false,"snapshotFingerprint","a".repeat(64)),Map.of("acknowledged",true),Map.of("acknowledged",true,"snapshotFingerprint","A".repeat(64))))
            mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("expectedVersion",0,"reason","Accepted","requestKey","invalid-exception","legacyException",value)))).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_COMMAND"));
        mvc.perform(post(endpoint()+"/reopen").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_COMMAND"));
    }
    @Test void allBlockerTypesAreCountedAndRemovalRecomputesEligibility()throws Exception {
        long retest=retest(),bug=jdbc.queryForObject("SELECT work_item_id FROM retest_requests WHERE id=?",Long.class,retest);
        long session,work;var c=DataSourceUtils.getConnection(source);try{long run=f.run(c);long group=f.group(c,run);session=f.session(c,group,"PAUSED");work=f.work(c,"TASK",88);}finally{DataSourceUtils.releaseConnection(c,source);}
        jdbc.update("UPDATE device_allocations SET returned_at=NULL,returned_by=NULL,returned_condition=NULL WHERE id=?",f.allocation);
        long binding=db.insert("INSERT INTO redmine_bindings(project_id,work_item_id,correlation_marker,instance_hash,configuration_json,created_by,created_at) VALUES(?,?,?,REPEAT('b',64),'{}',?,UTC_TIMESTAMP(6))",f.project,bug,UUID.randomUUID().toString(),f.pmMember);
        long outbox=db.insert("INSERT INTO redmine_outbox(project_id,work_item_id,binding_id,operation,status,source_version,payload_json,payload_checksum,request_key,request_checksum,reason,created_by,dispatch_by,created_at,updated_at,next_attempt_at) VALUES(?,?,?,'PUBLISH','RUNNING',0,'{}',REPEAT('b',64),'ar06-publication',REPEAT('b',64),'Publish',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project,bug,binding,f.pmMember,f.pmMember);
        assertThat((List<?>)lifecycle.readiness(admin,f.project).get("blockers")).hasSize(6);var command=exception(0,"all-blockers");
        error(()->lifecycle.decide(admin,f.project,command,true),"ARCHIVE_BLOCKED");
        jdbc.update("UPDATE device_allocations SET returned_at=UTC_TIMESTAMP(6),returned_by=?,returned_condition='AVAILABLE' WHERE id=?",admin,f.allocation);
        jdbc.update("UPDATE work_items SET status_code='closed' WHERE id=?",work);jdbc.update("UPDATE redmine_outbox SET status='FAILED' WHERE id=?",outbox);
        error(()->lifecycle.decide(admin,f.project,command,true),"ARCHIVE_BLOCKED");
        jdbc.update("UPDATE file_work_sessions SET state='CANCELLED',ended_at=UTC_TIMESTAMP(6) WHERE id=?",session);
        assertThat(lifecycle.readiness(admin,f.project)).containsEntry("canArchiveWithLegacyException",true);
        jdbc.update("UPDATE redmine_outbox SET status='RUNNING' WHERE id=?",outbox);error(()->lifecycle.decide(admin,f.project,command,true),"ARCHIVE_BLOCKED");
        jdbc.update("UPDATE redmine_outbox SET status='FAILED' WHERE id=?",outbox);var ready=lifecycle.decide(admin,f.project,command,true);assertThat((List<?>)ready.get("warnings")).hasSize(1);
    }
    long feature(){return db.insert("INSERT INTO testing_features(project_id,name,created_by,updated_by,created_at,updated_at) VALUES(?,'U26 Feature',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project,admin,admin);}
    long ticket(long feature,boolean document)throws Exception {
        long id;var c=DataSourceUtils.getConnection(source);try{id=f.work(c,"BUG",101);}finally{DataSourceUtils.releaseConnection(c,source);}
        if(document)jdbc.update("UPDATE import_batches SET feature_id=? WHERE id=?",feature,f.document);
        db.update("INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,standalone_reason,context_snapshot) VALUES(?,?,'INTERNAL_V1','Steps','Expected','Actual','U26','{}')",f.project,id);
        jdbc.update("INSERT INTO work_item_feature_context(project_id,work_item_id,feature_id,document_id,monkey,created_by_user_id,ticket_state,verifier_user_id) VALUES(?,?,?,?,?,?, 'NEW',?)",f.project,id,feature,document?f.document:null,!document,admin,admin);
        return id;
    }
    String issue(long id){return "/api/v1/projects/"+f.project+"/issues/"+id;}
    void stillHardBlocked(){assertThat(lifecycle.readiness(admin,f.project)).containsEntry("canArchive",false).containsEntry("canArchiveWithLegacyException",false);error(()->lifecycle.decide(admin,f.project,command(0,"u26-still-blocked"),true),"ARCHIVE_BLOCKED");}
    @Test void softDeletedOpenMonkeyRemainsHardBlockerAndHasNoMutationRecovery()throws Exception {
        long feature=feature(),id=ticket(feature,false);
        mvc.perform(delete(issue(id)).param("expectedVersion","0").with(actor(admin,"ADMIN")).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get(issue(id)).with(actor(admin,"ADMIN"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/projects/"+f.project+"/issues").with(actor(admin,"ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        mvc.perform(post(issue(id)+"/actions").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("state","CLOSED","closureReason","FIXED","body","Resolve hidden ticket","expectedVersion",1,"requestKey",UUID.randomUUID())))).andExpect(status().isNotFound());
        mvc.perform(get(issue(id)+"/history").with(actor(admin,"ADMIN"))).andExpect(status().isOk());stillHardBlocked();
        System.out.println("AR06_U26 soft-deleted project="+f.project+" ticket="+id+" feature="+feature+" board=0 detail/action=404 history=200 blocker=OPEN_WORK_ITEMS; fixture rollback");
    }
    @Test void archivedFeatureCanRestoreButHiddenFileHasNoRestoreEndpoint()throws Exception {
        long feature=feature(),id=ticket(feature,true);String featurePath="/api/v1/projects/"+f.project+"/features/"+feature;
        mvc.perform(post(featurePath+"/archive").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        blockedTicketAction(id);stillHardBlocked();
        mvc.perform(post(featurePath+"/restore").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("expectedVersion",1,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/projects/"+f.project+"/issues").with(actor(admin,"ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(post(featurePath+"/documents/"+f.document+"/archive").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/projects/"+f.project+"/issues").with(actor(admin,"ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        blockedTicketAction(id);stillHardBlocked();
        System.out.println("AR06_U26 archived feature restored successfully; hidden-file project="+f.project+" ticket="+id+" feature="+feature+" document="+f.document+" board=0 action=409 ARCHIVED blocker=OPEN_WORK_ITEMS; fixture rollback");
    }
    void blockedTicketAction(long id)throws Exception {
        mvc.perform(post(issue(id)+"/actions").with(actor(admin,"ADMIN")).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("state","CLOSED","closureReason","FIXED","body","Resolve hidden ticket","expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ARCHIVED"));
    }
    @Test void processedTicketAwaitingVerificationRemainsHardBlocker()throws Exception {
        long id=ticket(feature(),false);jdbc.update("UPDATE work_items SET status_code='resolved' WHERE id=?",id);jdbc.update("UPDATE work_item_feature_context SET ticket_state='CLOSED',closure_reason='PROCESSED' WHERE work_item_id=?",id);stillHardBlocked();
        jdbc.update("UPDATE work_item_feature_context SET closure_reason='FIXED' WHERE work_item_id=?",id);jdbc.update("UPDATE work_items SET status_code='closed' WHERE id=?",id);assertThat(lifecycle.readiness(admin,f.project)).containsEntry("canArchive",true);
    }
    long retest()throws Exception {
        long bug;var c=DataSourceUtils.getConnection(source);try{bug=f.work(c,"BUG",91);}finally{DataSourceUtils.releaseConnection(c,source);}
        jdbc.update("UPDATE work_items SET status_code='closed' WHERE id=?",bug);
        db.update("INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,build_id,environment_id,device_id,standalone_reason,context_snapshot) VALUES(?,?,'INTERNAL_V1','Steps','Expected','Actual',?,?,?,'Fixture','{}')",f.project,bug,f.build,f.environment,f.device);
        long coverage=db.insert("INSERT INTO bug_coverage_revisions(project_id,work_item_id,revision_no,round_no,build_id,reason,created_by,created_at) VALUES(?,?,1,1,?,'Verify',?,UTC_TIMESTAMP(6))",f.project,bug,f.build,f.pmMember);
        return db.insert("INSERT INTO retest_requests(project_id,work_item_id,coverage_revision_id,round_no,build_id,environment_id,device_id,verification_scope,assignee_membership_id,reason,created_by,created_at,request_key,context_snapshot,request_checksum) VALUES(?,?,?,1,?,?,?,'BUG_ONLY',?,'Verify',?,UTC_TIMESTAMP(6),'ar06-retest','{}',REPEAT('a',64))",f.project,bug,coverage,f.build,f.environment,f.device,f.testerMember,f.pmMember);
    }
}
