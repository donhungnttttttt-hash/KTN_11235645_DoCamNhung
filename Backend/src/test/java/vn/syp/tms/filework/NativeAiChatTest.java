package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import com.fasterxml.jackson.databind.*;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.syp.tms.ai.*;
import vn.syp.tms.identity.SessionPrincipal;

/** Empty owned native schema only; migration fresh/upgrade and actual HTTP/DB races. */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="fresh-migration")
class NativeAiChatTest {
    @DynamicPropertySource static void setup(DynamicPropertyRegistry r) throws Exception {
        NativeFqDatabase.requireMode("fresh-migration");
        try(var c=NativeFqDatabase.connect()) {
            assertThat(NativeFqFixture.scalar(c,"SELECT GET_LOCK(CONCAT('native-fq-',DATABASE()),0)")).isEqualTo(1);
            try {
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")).isZero();
                NativeAiDraftTest.flyway("24").migrate();
                NativeFqFixture.seed(c,true);
                var before=new LinkedHashMap<String,NativeFileWorkQaMigrationTest.Snapshot>();
                for(var table:NativeFileWorkQaMigrationTest.tables(c))
                    if(!table.equals("flyway_schema_history"))before.put(table,NativeFileWorkQaMigrationTest.snapshot(c,table,null));
                assertThat(NativeAiDraftTest.flyway("25").migrate().migrationsExecuted).isEqualTo(1);
                for(var entry:before.entrySet())assertThat(NativeFileWorkQaMigrationTest.snapshot(c,entry.getKey(),null)).as(entry.getKey()).isEqualTo(entry.getValue());
                assertThat(NativeAiDraftTest.flyway("25").migrate().migrationsExecuted).isZero();
                NativeAiDraftTest.flyway("25").validate();
                NativeFqDatabase.cleanOwned(c,NativeFileWorkQaMigrationTest.tables(c));
                assertThat(NativeAiDraftTest.flyway("25").migrate().migrationsExecuted).isEqualTo(25);
                NativeAiDraftTest.flyway("25").validate();
            } finally {NativeFqFixture.scalar(c,"SELECT RELEASE_LOCK(CONCAT('native-fq-',DATABASE()))");}
        }
        r.add("spring.datasource.url",NativeFqDatabase::url);r.add("spring.datasource.username",NativeFqDatabase::user);r.add("spring.datasource.password",NativeFqDatabase::password);
        r.add("TMS_DB_URL",NativeFqDatabase::url);r.add("TMS_DB_USER",NativeFqDatabase::user);r.add("TMS_DB_PASSWORD",NativeFqDatabase::password);
        r.add("TMS_MIGRATION_USER",NativeFqDatabase::user);r.add("TMS_MIGRATION_PASSWORD",NativeFqDatabase::password);
        r.add("spring.flyway.enabled",()->"false");r.add("spring.sql.init.mode",()->"never");r.add("spring.jpa.hibernate.ddl-auto",()->"validate");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("TMS_AI_DRAFT_CLEANUP_CRON",()->"-");r.add("TMS_AI_CHAT_CLEANUP_CRON",()->"-");
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");r.add("TMS_OPENAI_ENABLED",()->"true");
        r.add("OPENAI_API_KEY",()->"test-only-never-live");r.add("TMS_AI_CHAT_USER_DAILY_LIMIT",()->"20");
    }
    @Autowired DataSource dataSource;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired MockMvc mvc;
    @Autowired AiChatStore store;
    @MockitoBean OpenAiResponsesClient provider;
    NativeFqFixture f;
    @BeforeEach void fixture() throws Exception {
        try(var c=dataSource.getConnection()){f=NativeFqFixture.seed(c,false);}
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call->{
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return output("Answer <script>plain text</script>");
        });
    }
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    @org.springframework.lang.NonNull RequestPostProcessor actor(String id) {
        return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(id,0),null,List.of(new SimpleGrantedAuthority("ROLE_PM")))));
    }
    void directActor(String id) {SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(id,0),null,List.of()));}
    OpenAiResponsesClient.Output output(String text){return new OpenAiResponsesClient.Output(json.createObjectNode().put("text",text),"resp_test","gpt-4.1-mini",10,5);}
    long create(String actor,Long project,String purpose,Long target) throws Exception {
        var body=json.createObjectNode().put("provider","OPENAI_API").put("model","gpt-4.1-mini");
        if(project!=null)body.put("projectId",project);if(purpose!=null)body.put("purpose",purpose);if(target!=null)body.put("targetId",target);
        return read(mvc.perform(post("/api/v1/ai/chats").with(actor(actor)).with(Objects.requireNonNull(csrf())).contentType("application/json").content(Objects.requireNonNull(body.toString())))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }
    ResultActions send(String actor,long thread,String text,String key) throws Exception {
        return mvc.perform(post("/api/v1/ai/chats/"+thread+"/messages").with(actor(actor)).with(Objects.requireNonNull(csrf())).contentType("application/json")
                .content(Objects.requireNonNull(json.createObjectNode().put("text",text).put("requestKey",key).toString())));
    }
    JsonNode read(MvcResult result) throws Exception {return json.readTree(result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));}
    @Test void privateGeneralChatPersistsOriginalTextAndDeduplicates() throws Exception {
        long id=create(f.pm,null,null,null);
        var first=read(send(f.pm,id," Hello\n","private-general-001").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("READY")).andReturn());
        assertThat(first.path("text").asText()).isEqualTo(" Hello\n");
        assertThat(first.path("content").path("sources")).isEmpty();
        assertThat(java.time.Duration.between(java.time.Instant.parse(first.path("createdAt").asText()),java.time.Instant.parse(first.path("expiresAt").asText())).toDays()).isEqualTo(6);
        send(f.pm,id," Hello\n","private-general-001").andExpect(status().isOk()).andExpect(jsonPath("$.id").value(first.path("id").asLong()));
        send(f.pm,id,"changed","private-general-001").andExpect(status().isConflict());
        long other=create(f.pm,null,null,null);send(f.pm,other," Hello\n","private-general-001").andExpect(status().isConflict());
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(f.tester))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/ai/chats").with(actor(f.tester))).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(f.pm))).andExpect(status().isOk()).andExpect(jsonPath("$.turns[0].text").value(" Hello\n"));
        verify(provider,times(1)).generate(anyString(),argThat(data->data.path("snapshot").isEmpty()&&data.path("scope").asText().equals("GENERAL")),anyString(),any());
    }
    @Test void reassignedTicketDeniesThreadListMessagesAndOldHistory() throws Exception {
        long bug;try(var c=dataSource.getConnection()){bug=f.work(c,"BUG",1);}
        jdbc.update("UPDATE work_items SET assignee_membership_id=? WHERE id=?",f.devMember,bug);
        long id=create(f.dev,f.project,"DEV_TICKET_REVIEW",bug);
        send(f.dev,id,"Review","ticket-private-001").andExpect(status().isOk());
        jdbc.update("UPDATE work_items SET assignee_membership_id=? WHERE id=?",f.dev2Member,bug);
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(f.dev))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/ai/chats").with(actor(f.dev))).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        send(f.dev,id,"Review","ticket-private-001").andExpect(status().isNotFound());
        verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
    }
    @Test void expiredThreadCannotBeReadAndCleanupCascadesOnlyExpiredChat() throws Exception {
        long id=create(f.pm,null,null,null);long active=create(f.pm,null,null,null);
        send(f.pm,id,"Hello","expiry-private-001").andExpect(status().isOk());
        jdbc.update("UPDATE ai_chat_threads SET created_at=UTC_TIMESTAMP(6)-INTERVAL 8 DAY,expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 DAY WHERE id=?",id);
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(f.pm))).andExpect(status().isNotFound());
        send(f.pm,id,"Hello","expiry-private-001").andExpect(status().isNotFound());
        assertThat(store.purgeExpired()).isGreaterThanOrEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_chat_turns WHERE thread_id=?",Long.class,id)).isZero();
        mvc.perform(get("/api/v1/ai/chats/"+active).with(actor(f.pm))).andExpect(status().isOk());
    }
    @Test void archivedProjectKeepsHistoryReadonlyButRejectsNewGeneration() throws Exception {
        long id=create(f.pm,f.project,"PM_PROGRESS_REPORT",null);
        send(f.pm,id,"Hello","archive-private-001").andExpect(status().isOk());
        jdbc.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",f.project);
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(f.pm))).andExpect(status().isOk()).andExpect(jsonPath("$.turns[0].state").value("READY"));
        mvc.perform(get("/api/v1/ai/chats").with(actor(f.pm))).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(id));
        send(f.pm,id,"New","archive-private-002").andExpect(status().isConflict());
        send(f.pm,id,"Hello","archive-private-001").andExpect(status().isOk());
        verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
    }
    @Test void failedTurnKeepsQuestionButNeverBecomesHistory() throws Exception {
        long id=create(f.pm,null,null,null);
        when(provider.generate(anyString(),any(),anyString(),any())).thenThrow(new OpenAiResponsesClient.Failure("AI_INTERRUPTED"));
        send(f.pm,id,"Failed question","failed-private-001").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("FAILED"))
                .andExpect(jsonPath("$.content").isEmpty()).andExpect(jsonPath("$.text").value("Failed question"));
        doAnswer(call->{assertThat(((JsonNode)call.getArgument(1)).path("history")).isEmpty();return output("Success");}).when(provider).generate(anyString(),any(),anyString(),any());
        send(f.pm,id,"Retry explicitly","failed-private-002").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("READY"));
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"SESSION","DISABLED","ARCHIVED","MEMBERSHIP","TICKET"})
    void changesDuringInferenceCannotPersistAnswer(String change) throws Exception {
        Long bug=null;
        if(change.equals("TICKET")) {try(var c=dataSource.getConnection()){bug=f.work(c,"BUG",1);}jdbc.update("UPDATE work_items SET assignee_membership_id=? WHERE id=?",f.devMember,bug);}
        String actor=bug==null?f.pm:f.dev;Long ticket=bug;
        boolean general=change.equals("SESSION")||change.equals("DISABLED");
        long id=create(actor,general?null:f.project,general?null:bug==null?"PM_PROGRESS_REPORT":"DEV_TICKET_REVIEW",bug);
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call->{
            switch(change) {
                case "SESSION" -> jdbc.update("UPDATE identity_users SET lock_version=lock_version+1 WHERE id=?",actor);
                case "DISABLED" -> jdbc.update("UPDATE identity_users SET enabled=FALSE WHERE id=?",actor);
                case "ARCHIVED" -> jdbc.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",f.project);
                case "MEMBERSHIP" -> jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",f.pmMember);
                case "TICKET" -> jdbc.update("UPDATE work_items SET assignee_membership_id=? WHERE id=?",f.dev2Member,ticket);
                default -> throw new AssertionError();
            }return output("Must not persist");
        });
        send(actor,id,"Question","revoked-private-001").andExpect(status().is4xxClientError());
        assertThat(jdbc.queryForObject("SELECT state FROM ai_chat_turns WHERE thread_id=?",String.class,id)).isEqualTo("FAILED");
        assertThat(jdbc.queryForObject("SELECT content_json FROM ai_chat_turns WHERE thread_id=?",String.class,id)).isNull();
    }
    @Test void duplicateAndNewKeyRaceUsesOnePendingSlotWithoutLongTransaction() throws Exception {
        long id=create(f.pm,null,null,null);long second=create(f.pm,null,null,null);
        var entered=new java.util.concurrent.CountDownLatch(1);var release=new java.util.concurrent.CountDownLatch(1);
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call->{
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            entered.countDown();assertThat(release.await(12,java.util.concurrent.TimeUnit.SECONDS)).isTrue();return output("Only once");
        });
        try(var pool=java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var first=pool.submit(()->send(f.pm,id,"Question","race-private-001").andExpect(status().isOk()).andReturn());
            try {
                assertThat(entered.await(10,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
                send(f.pm,id,"Question","race-private-001").andExpect(status().isAccepted()).andExpect(jsonPath("$.state").value("GENERATING"));
                send(f.pm,second,"Other","race-private-002").andExpect(status().isTooManyRequests());
            } finally {release.countDown();}
            assertThat(read(first.get(15,java.util.concurrent.TimeUnit.SECONDS)).path("state").asText()).isEqualTo("READY");
        }
        verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
    }
    @Test void simultaneousDuplicatesHaveOneWinnerAndNoUniqueConstraintErrors() throws Exception {
        long id=create(f.pm,null,null,null);
        var start=new java.util.concurrent.CountDownLatch(1);var duplicates=new java.util.concurrent.CountDownLatch(5);
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call->{
            assertThat(duplicates.await(12,java.util.concurrent.TimeUnit.SECONDS)).isTrue();return output("Single winner");
        });
        try(var pool=java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var pending=new ArrayList<java.util.concurrent.Future<Integer>>();
            for(int i=0;i<6;i++)pending.add(pool.submit(()->{
                assertThat(start.await(5,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
                int status=send(f.pm,id,"Same input","simultaneous-private-001").andReturn().getResponse().getStatus();
                if(status==202)duplicates.countDown();return status;
            }));
            start.countDown();var statuses=new ArrayList<Integer>();
            for(var result:pending)statuses.add(result.get(18,java.util.concurrent.TimeUnit.SECONDS));
            assertThat(statuses).containsOnly(200,202);assertThat(Collections.frequency(statuses,200)).isEqualTo(1);
        }
        verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_chat_turns WHERE thread_id=?",Long.class,id)).isEqualTo(1);
    }
    @Test void abandonedTurnFailsAndCannotCompleteLate() throws Exception {
        long id=create(f.pm,null,null,null);directActor(f.pm);
        var selection=new AiProviderGateway.ResolvedSelection("OPENAI_API","gpt-4.1-mini",null,0);
        var reservation=store.reserve(f.pm,id,"Old question","abandoned-private-001",selection,List.of(),false);
        jdbc.update("UPDATE ai_chat_turns SET created_at=UTC_TIMESTAMP(6)-INTERVAL 3 MINUTE WHERE id=?",reservation.id());
        assertThat(store.get(f.pm,id,0).turns().getFirst().failureCode()).isEqualTo("AI_INTERRUPTED");
        assertThatThrownBy(()->store.complete(f.pm,reservation.id(),output("Too late"))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        assertThat(store.history(f.pm,id)).isEmpty();
    }
    @Test void databaseGlobalCapacityAndForeignOwnerConstraintsAreEnforced() throws Exception {
        long a=create(f.pm,null,null,null),b=create(f.tester,null,null,null),c=create(f.dev,null,null,null);
        var selection=new AiProviderGateway.ResolvedSelection("OPENAI_API","gpt-4.1-mini",null,0);
        directActor(f.pm);var first=store.reserve(f.pm,a,"A","global-private-001",selection,List.of(),false);
        directActor(f.tester);var second=store.reserve(f.tester,b,"B","global-private-002",selection,List.of(),false);
        directActor(f.dev);
        assertThatThrownBy(()->store.reserve(f.dev,c,"C","global-private-003",selection,List.of(),false)).isInstanceOfSatisfying(vn.syp.tms.shared.web.BusinessException.class,e->assertThat(e.code()).isEqualTo("AI_BUSY"));
        assertThatThrownBy(()->jdbc.update("UPDATE ai_chat_turns SET created_by=? WHERE id=?",f.dev,first.id())).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        store.markFailed(f.pm,first.id(),"AI_RAW_SECRET_DIAGNOSTIC");
        assertThat(jdbc.queryForObject("SELECT failure_code FROM ai_chat_turns WHERE id=?",String.class,first.id())).isEqualTo("AI_UNAVAILABLE");
        store.markFailed(f.tester,second.id(),"AI_INTERRUPTED");
    }
    @Test void dailyCapCountsFailuresAndDuplicateDoesNotConsumeAnotherSlot() throws Exception {
        long id=create(f.pm,null,null,null);
        when(provider.generate(anyString(),any(),anyString(),any())).thenThrow(new OpenAiResponsesClient.Failure("AI_QUOTA_EXHAUSTED"));
        for(int i=0;i<20;i++)send(f.pm,id,"Question","daily-private-"+i).andExpect(status().isOk());
        send(f.pm,id,"Question","daily-private-0").andExpect(status().isOk());
        send(f.pm,id,"Question","daily-private-20").andExpect(status().isTooManyRequests());
        verify(provider,times(20)).generate(anyString(),any(),anyString(),any());
    }
    @Test void validatesScopeLengthAndCsrf() throws Exception {
        mvc.perform(post("/api/v1/ai/chats").with(actor(f.pm)).contentType("application/json").content("{}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/ai/chats").with(actor(f.pm)).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"purpose\":\"PM_PROGRESS_REPORT\"}")).andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/v1/ai/chats").with(actor(f.pm)).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"provider\":\"arbitrary-url\"}"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("AI_INVALID_PROVIDER"));
        long id=create(f.pm,null,null,null);
        send(f.pm,id,"x".repeat(2001),"input-private-001").andExpect(status().isUnprocessableEntity());
        verifyNoInteractions(provider);
    }
    @Test void providerRoutesAreAuthenticatedCsrfProtectedAndLocallyOwnerRestricted() throws Exception {
        mvc.perform(get("/api/v1/ai/providers")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/ai/chats")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/ai/providers").with(actor(f.pm))).andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultProvider").value("OPENAI_API"));
        mvc.perform(get("/api/v1/ai/providers/OPENAI_API/models").with(actor(f.pm))).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value("gpt-4.1-mini"));
        mvc.perform(post("/api/v1/ai/providers/CHATGPT/authorizations").with(actor(f.tester))).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        mvc.perform(post("/api/v1/ai/providers/CHATGPT/authorizations").with(actor(f.tester)).with(Objects.requireNonNull(csrf())))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("AI_LOCAL_ONLY"));
        mvc.perform(get("/api/v1/ai/providers/CHATGPT/models").param("connectionId","someone-elses-connection").with(actor(f.tester)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("AI_LOCAL_ONLY"));
        mvc.perform(get("/api/v1/ai/future-unapproved").with(actor(f.pm))).andExpect(status().isForbidden());
        jdbc.update("UPDATE identity_users SET lock_version=1 WHERE id=?",f.pm);
        mvc.perform(get("/api/v1/ai/providers").with(actor(f.pm))).andExpect(status().isUnauthorized());
        verifyNoInteractions(provider);
    }
}
