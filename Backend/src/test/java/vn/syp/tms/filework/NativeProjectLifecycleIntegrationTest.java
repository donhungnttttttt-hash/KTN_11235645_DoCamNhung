package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
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
import vn.syp.tms.project.*;

/** V21 isolated native schema only; every fixture and business mutation rolls back. */
@SpringBootTest @AutoConfigureMockMvc @Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="lifecycle-integration")
class NativeProjectLifecycleIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r)throws Exception {
        NativeFqDatabase.requireMode("lifecycle-integration");
        try(var c=NativeFqDatabase.connect()) {assertThat(NativeFqFixture.scalar(c,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")).isEqualTo(21);}
        NativeProjectLifecycleMigrationTest.flyway("21").validate();
        r.add("spring.datasource.url",NativeFqDatabase::url);r.add("spring.datasource.username",NativeFqDatabase::user);r.add("spring.datasource.password",NativeFqDatabase::password);
        r.add("TMS_DB_URL",NativeFqDatabase::url);r.add("TMS_DB_USER",NativeFqDatabase::user);r.add("TMS_DB_PASSWORD",NativeFqDatabase::password);
        r.add("spring.flyway.enabled",()->"false");r.add("spring.sql.init.mode",()->"never");r.add("spring.jpa.hibernate.ddl-auto",()->"validate");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("tms.bootstrap.enabled",()->"false");r.add("tms.redmine.enabled",()->"false");
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");
    }
    @Autowired DataSource dataSource;@Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;@Autowired ProjectService projects;
    @Autowired vn.syp.tms.workitem.WorkItemStore db;
    NativeFqFixture f;String admin;
    @BeforeEach void seed()throws Exception {
        var c=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try {
            f=NativeFqFixture.seed(c,false);admin=UUID.randomUUID().toString();
            NativeFqFixture.update(c,"INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES(?,?,'Lifecycle Admin','not-a-login','ADMIN',UTC_TIMESTAMP(6))",admin,"lifecycle."+admin);
        } finally {DataSourceUtils.releaseConnection(c,dataSource);}
    }
    private @org.springframework.lang.NonNull String endpoint(){return "/api/v1/admin/projects/"+f.project;}
    private @org.springframework.lang.NonNull RequestPostProcessor actor(String id,String role){return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(id,0L),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)))));}
    private @org.springframework.lang.NonNull RequestPostProcessor csrfToken(){return Objects.requireNonNull(csrf());}
    private @org.springframework.lang.NonNull String command(long version,String key){return "{\"expectedVersion\":"+version+",\"reason\":\"Completed and accepted\",\"requestKey\":\""+key+"\"}";}
    private void returned(){jdbc.update("UPDATE device_allocations SET returned_at=UTC_TIMESTAMP(6),returned_by=?,returned_condition='AVAILABLE',return_note='Returned' WHERE id=?",admin,f.allocation);}
    @Test void adminReadinessShowsBlockersAndCannotArchiveAllocatedMachines()throws Exception {
        mvc.perform(get(endpoint()+"/archive-readiness").with(actor(admin,"ADMIN"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.canArchive").value(false)).andExpect(jsonPath("$.version").value(0))
            .andExpect(jsonPath("$.blockers[0].code").value("ALLOCATED_DEVICES")).andExpect(jsonPath("$.blockers[0].count").value(1));
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(command(0,"archive-blocked")))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ARCHIVE_BLOCKED"));
        assertThat(jdbc.queryForObject("SELECT archived_at FROM projects WHERE id=?",Object.class,f.project)).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_lifecycle_decisions WHERE project_id=?",Long.class,f.project)).isZero();
    }
    @Test void archiveReplayReopenKeepHistorySourceAndReadAccess()throws Exception {
        returned();
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(command(0,"archive-success")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(true)).andExpect(jsonPath("$.version").value(1))
            .andExpect(jsonPath("$.latestDecision.reason").value("Completed and accepted"));
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(command(0,"archive-success"))).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND action='ARCHIVE'",Long.class,f.project)).isEqualTo(1);
        mvc.perform(get("/api/v1/projects/"+f.project+"/test-documents/"+f.document+"/export").with(actor(f.tester,"TESTER"))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/projects/"+f.project+"/test-documents/"+f.document+"/export").param("original","true").with(actor(f.tester,"TESTER"))).andExpect(status().isOk())
            .andExpect(content().bytes(Objects.requireNonNull(f.source)));
        mvc.perform(patch(endpoint()).with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content("{\"name\":\"Changed\",\"expectedVersion\":1}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ARCHIVED"));
        mvc.perform(post(endpoint()+"/reopen").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(command(1,"reopen-success")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(false)).andExpect(jsonPath("$.version").value(2));
        // A delayed old successful request must not rearchive after another command.
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(command(0,"archive-success")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(false)).andExpect(jsonPath("$.version").value(2));
        mvc.perform(get(endpoint()+"/lifecycle-decisions").with(actor(admin,"ADMIN"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.items[0].action").value("REOPEN"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM device_allocations WHERE project_id=? AND returned_at IS NULL",Long.class,f.project)).isZero();
        assertThat(jdbc.queryForObject("SELECT status_code FROM test_cycles WHERE id=?",String.class,f.cycle)).isEqualTo("DRAFT");
    }
    @Test void lifecycleValidatesCurrentRoleCsrfVersionReasonAndReplay()throws Exception {
        returned();
        mvc.perform(get(endpoint()+"/archive-readiness")).andExpect(status().isUnauthorized());
        for(var role:Map.of(f.pm,"PM",f.tester,"TESTER",f.dev,"DEV").entrySet())mvc.perform(get(endpoint()+"/archive-readiness").with(actor(role.getKey(),role.getValue()))).andExpect(status().isForbidden());
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).contentType("application/json").content(command(0,"missing-csrf"))).andExpect(status().isForbidden());
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(command(1,"stale-command"))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(Objects.requireNonNull(command(0,"blank-reason").replace("Completed and accepted"," ")))).andExpect(status().isUnprocessableEntity());
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(command(0,"successful-key"))).andExpect(status().isOk());
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(Objects.requireNonNull(command(0,"successful-key").replace("Completed and accepted","Different reason"))))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
        jdbc.update("UPDATE identity_users SET role_code='PM' WHERE id=?",admin);
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(command(0,"successful-key"))).andExpect(status().isForbidden());
        jdbc.update("UPDATE identity_users SET enabled=FALSE WHERE id=?",admin);
        mvc.perform(get(endpoint()+"/archive-readiness").with(actor(admin,"ADMIN"))).andExpect(status().isUnauthorized());
    }
    @Test void devProjectRoleRequiresDevAccountInBothDirections() {
        assertThatThrownBy(()->projects.addOrUpdateMember(f.project,admin,f.tester,new ProjectDtos.SetMember("DEV",0L)))
            .isInstanceOfSatisfying(vn.syp.tms.shared.web.BusinessException.class,e->assertThat(e.code()).isEqualTo("INVALID_ROLE"));
        assertThatThrownBy(()->projects.addOrUpdateMember(f.project,admin,f.dev,new ProjectDtos.SetMember("TESTER",0L)))
            .isInstanceOfSatisfying(vn.syp.tms.shared.web.BusinessException.class,e->assertThat(e.code()).isEqualTo("INVALID_ROLE"));
    }
    @Test void readinessFindsEveryBlockerIncludingLegacyTerminalBugWithOpenRetest()throws Exception {
        var c=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        long run,group,session,bug;
        try {
            run=f.run(c);group=f.group(c,run);session=f.session(c,group,"PAUSED");
            f.work(c,"QA",2);bug=f.work(c,"BUG",3);
        } finally {DataSourceUtils.releaseConnection(c,dataSource);}
        jdbc.update("INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,build_id,environment_id,device_id,standalone_reason,context_snapshot) VALUES(?,?,'INTERNAL_V1','Steps','Expected','Actual',?,?,?,'Fixture','{}')",f.project,bug,f.build,f.environment,f.device);
        long coverage=db.insert("INSERT INTO bug_coverage_revisions(project_id,work_item_id,revision_no,round_no,build_id,reason,created_by,created_at) VALUES(?,?,1,1,?,'Verify',?,UTC_TIMESTAMP(6))",f.project,bug,f.build,f.pmMember);
        db.insert("INSERT INTO retest_requests(project_id,work_item_id,coverage_revision_id,round_no,build_id,environment_id,device_id,verification_scope,assignee_membership_id,reason,created_by,created_at,request_key,context_snapshot,request_checksum) VALUES(?,?,?,1,?,?,?,'BUG_ONLY',?,'Verify',?,UTC_TIMESTAMP(6),'lifecycle-retest','{}',REPEAT('a',64))",f.project,bug,coverage,f.build,f.environment,f.device,f.testerMember,f.pmMember);
        long binding=db.insert("INSERT INTO redmine_bindings(project_id,work_item_id,correlation_marker,instance_hash,configuration_json,created_by,created_at) VALUES(?,?,?,REPEAT('b',64),'{}',?,UTC_TIMESTAMP(6))",f.project,bug,UUID.randomUUID().toString(),f.pmMember);
        db.insert("INSERT INTO redmine_outbox(project_id,work_item_id,binding_id,operation,status,source_version,payload_json,payload_checksum,request_key,request_checksum,reason,created_by,dispatch_by,created_at,updated_at,next_attempt_at) VALUES(?,?,?,'PUBLISH','RUNNING',0,'{}',REPEAT('b',64),'lifecycle-publish',REPEAT('b',64),'Publish',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project,bug,binding,f.pmMember,f.pmMember);
        jdbc.update("UPDATE work_items SET status_code='closed' WHERE id=?",bug);
        mvc.perform(get(endpoint()+"/archive-readiness").with(actor(admin,"ADMIN"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.blockers.length()").value(6)).andExpect(jsonPath("$.blockers[0].code").value("ACTIVE_SESSIONS"))
            .andExpect(jsonPath("$.blockers[2].count").value(1)).andExpect(jsonPath("$.blockers[4].code").value("OPEN_RETESTS"))
            .andExpect(jsonPath("$.blockers[5].code").value("PENDING_PUBLICATIONS"));
        returned();jdbc.update("UPDATE file_work_sessions SET state='CANCELLED',ended_at=UTC_TIMESTAMP(6) WHERE id=?",session);
        jdbc.update("UPDATE test_cycles SET status_code='CLOSED',activated_at=UTC_TIMESTAMP(6),activated_by=? WHERE id=?",f.pmMember,f.cycle);
        jdbc.update("UPDATE work_items SET status_code='closed' WHERE project_id=?",f.project);
        mvc.perform(post(endpoint()+"/archive").with(actor(admin,"ADMIN")).with(csrfToken()).contentType("application/json").content(command(0,"legacy-retest-block")))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ARCHIVE_BLOCKED"));
        jdbc.update("UPDATE retest_requests SET status='CANCELLED' WHERE project_id=?",f.project);
        jdbc.update("UPDATE redmine_outbox SET status='FAILED' WHERE project_id=?",f.project);
        mvc.perform(get(endpoint()+"/archive-readiness").with(actor(admin,"ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.canArchive").value(true))
            .andExpect(jsonPath("$.warnings[0].code").value("PUBLICATION_REVIEW")).andExpect(jsonPath("$.warnings[0].count").value(1));
        jdbc.update("UPDATE redmine_outbox SET status='DELIVERED' WHERE project_id=?",f.project);
        mvc.perform(get(endpoint()+"/archive-readiness").with(actor(admin,"ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.canArchive").value(true)).andExpect(jsonPath("$.warnings.length()").value(0));
    }
    @Test void evenEmptyActiveCycleBlocksButEmptyDraftDoesNot()throws Exception {
        returned();
        mvc.perform(get(endpoint()+"/archive-readiness").with(actor(admin,"ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.canArchive").value(true));
        jdbc.update("UPDATE test_cycles SET status_code='ACTIVE',activated_at=UTC_TIMESTAMP(6),activated_by=? WHERE id=?",f.pmMember,f.cycle);
        mvc.perform(get(endpoint()+"/archive-readiness").with(actor(admin,"ADMIN"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.canArchive").value(false)).andExpect(jsonPath("$.blockers[0].code").value("UNFINISHED_CYCLES"));
    }
    @Test void pmCanExplicitlyCloseAndReopenOrdinaryWorkWithoutBypassingBugOrQa()throws Exception {
        returned();
        var c=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        long task,bug,qa;
        try {task=f.work(c,"TASK",1);bug=f.work(c,"BUG",2);qa=f.work(c,"QA",3);}
        finally {DataSourceUtils.releaseConnection(c,dataSource);}
        String taskEndpoint="/api/v1/projects/"+f.project+"/work-items/"+task;
        String close="{\"status\":\"closed\",\"reason\":\"PM accepted work\",\"expectedVersion\":0}";
        mvc.perform(post(taskEndpoint+"/transitions").with(actor(f.tester,"TESTER")).with(csrfToken()).contentType("application/json").content(close)).andExpect(status().isForbidden());
        mvc.perform(post(taskEndpoint+"/transitions").with(actor(f.dev,"DEV")).with(csrfToken()).contentType("application/json").content(close)).andExpect(status().isForbidden());
        mvc.perform(post(taskEndpoint+"/transitions").with(actor(f.pm,"PM")).with(csrfToken()).contentType("application/json").content(Objects.requireNonNull(close.replace("PM accepted work"," ")))).andExpect(status().isUnprocessableEntity());
        mvc.perform(post(taskEndpoint+"/transitions").with(actor(f.pm,"PM")).with(csrfToken()).contentType("application/json").content(close))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("closed")).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get(taskEndpoint+"/history").with(actor(f.tester,"TESTER"))).andExpect(status().isOk()).andExpect(jsonPath("$[0].reason").value("PM accepted work"));
        mvc.perform(post(taskEndpoint+"/transitions").with(actor(f.pm,"PM")).with(csrfToken()).contentType("application/json").content("{\"status\":\"open\",\"reason\":\"Follow-up needed\",\"expectedVersion\":1}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("open")).andExpect(jsonPath("$.version").value(2));
        mvc.perform(post("/api/v1/projects/"+f.project+"/work-items/"+bug+"/transitions").with(actor(f.pm,"PM")).with(csrfToken()).contentType("application/json").content(close))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("CLOSURE_NOT_ENABLED"));
        mvc.perform(post("/api/v1/projects/"+f.project+"/work-items/"+qa+"/transitions").with(actor(f.pm,"PM")).with(csrfToken()).contentType("application/json").content(close))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("QA_COMMAND_REQUIRED"));
    }
}
