package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.syp.tms.ai.*;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.shared.web.BusinessException;

/** Empty isolated schema only. No real provider calls, database mutations never target tms. */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE", matches="fresh-migration")
class NativeAiDraftTest {
    static org.flywaydb.core.Flyway flyway(String version) {
        return org.flywaydb.core.Flyway.configure().dataSource(NativeFqDatabase.url(),NativeFqDatabase.user(),NativeFqDatabase.password())
                .locations("classpath:db/migration","classpath:db/demo").target(version).cleanDisabled(true).load();
    }
    @DynamicPropertySource static void setup(DynamicPropertyRegistry r) throws Exception {
        NativeFqDatabase.requireMode("fresh-migration");
        try (var c = NativeFqDatabase.connect()) {
            assertThat(NativeFqFixture.scalar(c,"SELECT GET_LOCK(CONCAT('native-fq-',DATABASE()),0)")).isEqualTo(1);
            try {
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")).isZero();
                flyway("22").migrate();
                var fixture = NativeFqFixture.seed(c,true);
                var before = new LinkedHashMap<String,NativeFileWorkQaMigrationTest.Snapshot>();
                for (String table : List.of("projects","identity_users","project_memberships","import_batches","import_rows","execution_attempts","work_items","device_allocations"))
                    before.put(table, NativeFileWorkQaMigrationTest.snapshot(c,table,null));
                assertThat(flyway("23").migrate().migrationsExecuted).isEqualTo(1);
                for (var entry : before.entrySet())
                    assertThat(NativeFileWorkQaMigrationTest.snapshot(c,entry.getKey(),null)).as(entry.getKey()).isEqualTo(entry.getValue());
                assertThat(NativeFqFixture.bytes(c,"SELECT source_workbook FROM import_batches WHERE id=?",fixture.document)).isEqualTo(fixture.source);
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM ai_generated_drafts")).isZero();
                assertThat(flyway("23").migrate().migrationsExecuted).isZero();
                NativeFqDatabase.cleanOwned(c,NativeFileWorkQaMigrationTest.tables(c));
                assertThat(flyway("23").migrate().migrationsExecuted).isEqualTo(23);
                flyway("23").validate();
            } finally { NativeFqFixture.scalar(c,"SELECT RELEASE_LOCK(CONCAT('native-fq-',DATABASE()))"); }
        }
        r.add("spring.datasource.url",NativeFqDatabase::url);r.add("spring.datasource.username",NativeFqDatabase::user);r.add("spring.datasource.password",NativeFqDatabase::password);
        r.add("TMS_DB_URL",NativeFqDatabase::url);r.add("TMS_DB_USER",NativeFqDatabase::user);r.add("TMS_DB_PASSWORD",NativeFqDatabase::password);
        r.add("TMS_MIGRATION_USER",NativeFqDatabase::user);r.add("TMS_MIGRATION_PASSWORD",NativeFqDatabase::password);
        r.add("spring.flyway.enabled",()->"false");r.add("spring.sql.init.mode",()->"never");r.add("spring.jpa.hibernate.ddl-auto",()->"validate");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("TMS_AI_DRAFT_CLEANUP_CRON",()->"-");
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");r.add("TMS_OPENAI_ENABLED",()->"true");
        r.add("OPENAI_API_KEY",()->"test-only-never-live");
        r.add("TMS_AI_PROJECT_DAILY_LIMIT",()->"2");
    }
    @Autowired DataSource dataSource;
    @Autowired JdbcTemplate jdbc;
    @Autowired AiDraftService service;
    @Autowired AiDraftStore store;
    @Autowired AiContextService contexts;
    @Autowired ObjectMapper json;
    @Autowired MockMvc mvc;
    @MockitoBean OpenAiResponsesClient provider;
    NativeFqFixture f;

    @BeforeEach void fixture() throws Exception {
        try(var c=dataSource.getConnection()) { f=NativeFqFixture.seed(c,false); }
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).as("No DB transaction during provider call").isFalse();
            return output("Dữ liệu thử AI");
        });
    }

    AiDraftService.Task task(String key) {
        return new AiDraftService.Task("PM_ASSIGNMENT_SUGGESTION","file:"+f.document,"v1",key,
                "Only use provided facts.",json.createObjectNode().put("cases",1),json.createObjectNode().put("type","object"),List.of());
    }
    @Test void savesContentBeforeReturningAndRefreshDoesNotCallAgain() throws Exception {
        var result=service.generate(f.project,f.pm,task("native-ai-000001"));
        assertThat(result.state()).isEqualTo("READY");
        assertThat(result.content().path("answer").path("summary").asText()).isEqualTo("Dữ liệu thử AI");
        assertThat(java.time.Duration.between(result.createdAt(),result.expiresAt())).isEqualTo(java.time.Duration.ofDays(7));
        assertThat(store.get(f.project,f.pm,result.id()).content()).isEqualTo(result.content());
        assertThat(service.generate(f.project,f.pm,task("native-ai-000001")).id()).isEqualTo(result.id());
        verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
        mvc.perform(get("/api/v1/projects/"+f.project+"/ai-drafts/"+result.id()).with(actor(f.pm,"PM")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.answer.summary").value("Dữ liệu thử AI"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,f.project)).isZero();
    }
    @Test void projectAndCurrentRoleAreCheckedOnEveryRead() throws Exception {
        var result=service.generate(f.project,f.pm,task("native-ai-000002"));
        mvc.perform(get("/api/v1/projects/"+f.project+"/ai-drafts/"+result.id()).with(actor(f.tester,"TESTER"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/projects/"+f.project+"/ai-drafts").with(actor(f.dev,"DEV"))).andExpect(status().isOk()).andExpect(content().json("[]"));
        assertThatThrownBy(()->store.get(f.project+999999,f.pm,result.id())).isInstanceOf(BusinessException.class);
        jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",f.pmMember);
        assertThatThrownBy(()->store.get(f.project,f.pm,result.id())).isInstanceOf(BusinessException.class);
    }
    @Test void rejectedProviderCallIsSavedWithoutContentOrRawError() {
        when(provider.generate(anyString(),any(),anyString(),any())).thenThrow(new OpenAiResponsesClient.Failure("AI_QUOTA_EXHAUSTED"));
        var result=service.generate(f.project,f.pm,task("native-ai-000003"));
        assertThat(result.state()).isEqualTo("FAILED");assertThat(result.content()).isNull();
        assertThat(result.failureCode()).isEqualTo("AI_QUOTA_EXHAUSTED");
        assertThat(service.generate(f.project,f.pm,task("native-ai-000003")).id()).isEqualTo(result.id());
        verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
    }
    @Test void expiryIsEnforcedBeforeCleanupAndCleanupPreservesLiveDraft() {
        var expired=service.generate(f.project,f.pm,task("native-ai-000004"));
        var active=service.generate(f.project,f.pm,task("native-ai-000005"));
        jdbc.update("UPDATE ai_generated_drafts SET created_at=UTC_TIMESTAMP(6)-INTERVAL 8 DAY,expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 DAY WHERE id=?",expired.id());
        assertThatThrownBy(()->store.get(f.project,f.pm,expired.id())).isInstanceOf(BusinessException.class);
        assertThat(store.list(f.project,f.pm,0)).extracting(value->Objects.requireNonNull(value).id()).containsExactly(active.id());
        assertThat(store.purgeExpired()).isGreaterThanOrEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_generated_drafts WHERE id=?",Long.class,expired.id())).isZero();
        assertThat(store.get(f.project,f.pm,active.id()).state()).isEqualTo("READY");
    }
    @Test void databaseQuotaAndIdempotencyRejectAdditionalCalls() {
        service.generate(f.project,f.pm,task("native-ai-000006"));
        service.generate(f.project,f.pm,task("native-ai-000007"));
        assertThatThrownBy(()->service.generate(f.project,f.pm,task("native-ai-000008")))
                .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("AI_DAILY_LIMIT"));
        var original=task("native-ai-000006");
        var changed=new AiDraftService.Task(original.purpose(),"file:999999",original.promptVersion(),original.requestKey(),
                original.instructions(),json.createObjectNode().put("cases",2),original.schema(),original.sources());
        assertThatThrownBy(()->service.generate(f.project,f.pm,changed))
                .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("AI_REQUEST_CONFLICT"));
        verify(provider,times(2)).generate(anyString(),any(),anyString(),any());
    }
    @Test void permissionRevokedDuringGenerationPreventsContentPersistence() {
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call->{
            jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",f.pmMember);
            return output("Must not be stored");
        });
        assertThatThrownBy(()->service.generate(f.project,f.pm,task("native-ai-000009"))).isInstanceOf(BusinessException.class);
        assertThat(jdbc.queryForObject("SELECT state FROM ai_generated_drafts WHERE project_id=?",String.class,f.project)).isEqualTo("FAILED");
        assertThat(jdbc.queryForObject("SELECT content_json FROM ai_generated_drafts WHERE project_id=?",String.class,f.project)).isNull();
    }
    @org.springframework.lang.NonNull RequestPostProcessor actor(String id,String role) {
        return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(id,0),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)))));
    }
    OpenAiResponsesClient.Output output(String summary) {
        var answer=json.createObjectNode().put("title","Bản nháp").put("summary",summary);
        answer.putArray("observations");answer.putArray("suggestedActions");answer.putArray("missingInformation");
        return new OpenAiResponsesClient.Output(answer,"resp_test","gpt-4.1-mini",15,6);
    }

    @Test void eachRoleGetsOnlyItsTasksAndServerScopedFacts() throws Exception {
        long group,bug,qa;
        try(var c=dataSource.getConnection()) {
            group=f.group(c,f.run(c)); bug=f.work(c,"BUG",1); qa=f.work(c,"QA",2);
        }
        jdbc.update("UPDATE work_items SET created_by=?,assignee_membership_id=? WHERE id=?",f.testerMember,f.devMember,bug);
        jdbc.update("UPDATE work_items SET assignee_membership_id=? WHERE id=?",f.dev2Member,qa);
        var pm=contexts.prepare(f.project,f.pm,AiPurpose.PM_ASSIGNMENT_SUGGESTION,group,"native-context-01");
        assertThat(pm.data().toString()).contains("member:"+f.testerMember).doesNotContain(f.pm,f.dev,"password_hash");
        assertThat(pm.sources()).extracting(value->Objects.requireNonNull(value).ref()).contains("file:"+group,"member:"+f.testerMember);
        assertThat(contexts.prepare(f.project,f.tester,AiPurpose.TESTER_WORK_REPORT,null,"native-context-02").purpose()).isEqualTo("TESTER_WORK_REPORT");
        assertThat(contexts.prepare(f.project,f.tester,AiPurpose.TESTER_BUG_DRAFT,bug,"native-context-03").data().toString()).contains("Native BUG");
        assertThat(contexts.prepare(f.project,f.dev,AiPurpose.DEV_TICKET_REVIEW,bug,"native-context-04").data().toString()).contains("Native BUG");
        assertThatThrownBy(()->contexts.prepare(f.project,f.dev,AiPurpose.DEV_TICKET_REVIEW,qa,"native-context-05")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->contexts.prepare(f.project,f.tester,AiPurpose.PM_PROGRESS_REPORT,null,"native-context-06")).isInstanceOf(BusinessException.class);
        mvc.perform(get(base()+"/metadata").with(actor(f.dev,"DEV"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.purposes.length()").value(1)).andExpect(jsonPath("$.purposes[0].code").value("DEV_TICKET_REVIEW"));
        mvc.perform(get(base()+"/targets").param("purpose","DEV_TICKET_REVIEW").with(actor(f.dev,"DEV")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].id").value(bug));
    }
    @Test void httpDraftCanBeRefreshedAfterSourceChangeAndEditedWithVersionCheck() throws Exception {
        String body="{\"purpose\":\"PM_PROGRESS_REPORT\",\"requestKey\":\"native-http-report\"}";
        mvc.perform(post(base()).with(actor(f.pm,"PM")).contentType("application/json").content(Objects.requireNonNull(body))).andExpect(status().isForbidden());
        var response=mvc.perform(post(base()).with(actor(f.pm,"PM")).with(Objects.requireNonNull(csrf())).contentType("application/json").content(Objects.requireNonNull(body)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("READY")).andReturn();
        long id=json.readTree(response.getResponse().getContentAsString()).path("id").asLong();
        jdbc.update("UPDATE projects SET name='Changed source' WHERE id=?",f.project);
        mvc.perform(post(base()).with(actor(f.pm,"PM")).with(Objects.requireNonNull(csrf())).contentType("application/json").content(Objects.requireNonNull(body)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
        verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
        mvc.perform(put(base()+"/"+id+"/text").with(actor(f.pm,"PM")).with(Objects.requireNonNull(csrf())).contentType("application/json")
                .content("{\"text\":\"Đã kiểm tra lại\",\"expectedVersion\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.editedText").value("Đã kiểm tra lại"))
                .andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.content.answer.summary").value("Dữ liệu thử AI"));
        mvc.perform(put(base()+"/"+id+"/text").with(actor(f.pm,"PM")).with(Objects.requireNonNull(csrf())).contentType("application/json")
                .content("{\"text\":\"Ghi đè\",\"expectedVersion\":0}"))
                .andExpect(status().isConflict());
        mvc.perform(get(base()+"/"+id).with(actor(f.tester,"TESTER"))).andExpect(status().isNotFound());
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({"ADMIN,ADMIN_PROJECT_REVIEW","PM,PM_PROGRESS_REPORT","PM,PM_ASSIGNMENT_SUGGESTION",
            "TESTER,TESTER_WORK_REPORT","TESTER,TESTER_BUG_DRAFT","DEV,DEV_TICKET_REVIEW"})
    void allSixPurposesGenerateFromRealScopedContext(String role,String purpose) throws Exception {
        Long target=null;
        try(var c=dataSource.getConnection()) {
            if(purpose.endsWith("ASSIGNMENT_SUGGESTION"))target=f.group(c,f.run(c));
            if(purpose.endsWith("BUG_DRAFT")||purpose.endsWith("TICKET_REVIEW")) {
                target=f.work(c,"BUG",1);
                jdbc.update("UPDATE work_items SET created_by=?,assignee_membership_id=? WHERE id=?",f.testerMember,f.devMember,target);
            }
        }
        String user=switch(role){case "TESTER"->f.tester;case "DEV"->f.dev;default->f.pm;};
        if(role.equals("ADMIN"))jdbc.update("UPDATE identity_users SET role_code='ADMIN' WHERE id=?",user);
        var body=json.createObjectNode().put("purpose",purpose).put("requestKey","http-role-"+role);
        if(target!=null)body.put("targetId",target);
        mvc.perform(post(base()).with(actor(user,role)).with(Objects.requireNonNull(csrf())).contentType("application/json").content(Objects.requireNonNull(body.toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("READY"))
                .andExpect(jsonPath("$.content.sources[0].ref").isNotEmpty());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,f.project)).isZero();
    }
    @Test void reassignmentDuringGenerationDiscardsContentAndCurrentAccessControlsCache() throws Exception {
        long bug;try(var c=dataSource.getConnection()){bug=f.work(c,"BUG",1);}
        jdbc.update("UPDATE work_items SET assignee_membership_id=? WHERE id=?",f.devMember,bug);
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call->{
            jdbc.update("UPDATE work_items SET assignee_membership_id=? WHERE id=?",f.dev2Member,bug);
            return output("Content revoked");
        });
        mvc.perform(post(base()).with(actor(f.dev,"DEV")).with(Objects.requireNonNull(csrf())).contentType("application/json")
                .content(Objects.requireNonNull(json.createObjectNode().put("purpose","DEV_TICKET_REVIEW").put("targetId",bug).put("requestKey","changed-assignee").toString())))
                .andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT content_json FROM ai_generated_drafts WHERE project_id=?",String.class,f.project)).isNull();
    }
    @Test void concurrentDuplicateOnlyCallsProviderOnce() throws Exception {
        var entered=new java.util.concurrent.CountDownLatch(1);var release=new java.util.concurrent.CountDownLatch(1);
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call->{entered.countDown();assertThat(release.await(8,java.util.concurrent.TimeUnit.SECONDS)).isTrue();return output("Concurrent");});
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var first=pool.submit(()->service.generate(f.project,f.pm,task("concurrent-key-01")));
            try {
                assertThat(entered.await(8,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
                var second=pool.submit(()->service.generate(f.project,f.pm,task("concurrent-key-01"))).get(8,java.util.concurrent.TimeUnit.SECONDS);
                assertThat(second.state()).isEqualTo("GENERATING");
            } finally { release.countDown(); }
            assertThat(first.get(8,java.util.concurrent.TimeUnit.SECONDS).state()).isEqualTo("READY");
        }
        verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
    }
    @Test void archivedProjectCannotEditAndAbandonedRequestsBecomeFailed() throws Exception {
        var result=service.generate(f.project,f.pm,task("archive-draft-01"));
        jdbc.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",f.project);
        mvc.perform(put(base()+"/"+result.id()+"/text").with(actor(f.pm,"PM")).with(Objects.requireNonNull(csrf())).contentType("application/json")
                .content("{\"text\":\"Should reject\",\"expectedVersion\":0}")).andExpect(status().isConflict());
        jdbc.update("UPDATE projects SET archived_at=NULL WHERE id=?",f.project);
        var pending=store.reserve(f.project,f.pm,task("orphan-draft-01"));
        jdbc.update("UPDATE ai_generated_drafts SET created_at=UTC_TIMESTAMP(6)-INTERVAL 3 MINUTE WHERE id=?",pending.id());
        assertThat(store.get(f.project,f.pm,pending.id()).failureCode()).isEqualTo("AI_INTERRUPTED");
    }
    @Test void inaccessibleNewerRowsDoNotHideOlderAuthorizedDrafts() {
        var visible=service.generate(f.project,f.pm,task("visible-old-draft"));
        for(int n=0;n<51;n++)jdbc.update("""
            INSERT INTO ai_generated_drafts(project_id,created_by,purpose,source_reference,prompt_version,request_key,request_hash,
            state,model,response_id,content_json,input_tokens,output_tokens,created_at,completed_at,expires_at)
            SELECT project_id,created_by,'TESTER_WORK_REPORT',source_reference,prompt_version,?,request_hash,
            state,model,response_id,content_json,input_tokens,output_tokens,created_at,completed_at,expires_at
            FROM ai_generated_drafts WHERE id=?
            ""","hidden-role-"+n,visible.id());
        assertThat(store.list(f.project,f.pm,0)).extracting(value->Objects.requireNonNull(value).id()).containsExactly(visible.id());
    }
    @org.springframework.lang.NonNull String base() { return "/api/v1/projects/"+f.project+"/ai-drafts"; }
}
