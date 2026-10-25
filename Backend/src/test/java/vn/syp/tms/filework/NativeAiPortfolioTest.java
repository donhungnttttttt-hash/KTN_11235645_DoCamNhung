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

/** Explicit owned schema: preserves V29 data on upgrade, then validates fresh V30 and HTTP isolation. */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="portfolio-(migration|integration)")
class NativeAiPortfolioTest {
    @DynamicPropertySource static void setup(DynamicPropertyRegistry r) throws Exception {
        String mode=System.getenv("TMS_TEST_FQ_MODE");NativeFqDatabase.requireMode(mode);
        try(var c=NativeFqDatabase.connect()) {
            if("portfolio-integration".equals(mode)){NativeFqDatabase.flyway("30").validate();}
            else {
            assertThat(NativeFqFixture.scalar(c,"SELECT GET_LOCK(CONCAT('native-fq-',DATABASE()),0)")).isEqualTo(1);
            try {
                NativeFqDatabase.flyway("29").validate();
                var before=new LinkedHashMap<String,NativeFileWorkQaMigrationTest.Snapshot>();
                for(var table:NativeFileWorkQaMigrationTest.tables(c))
                    if(!table.equals("flyway_schema_history"))before.put(table,NativeFileWorkQaMigrationTest.snapshot(c,table,null));
                assertThat(NativeFqDatabase.flyway("30").migrate().migrationsExecuted).isEqualTo(1);
                for(var entry:before.entrySet())assertThat(NativeFileWorkQaMigrationTest.snapshot(c,entry.getKey(),null)).as(entry.getKey()).isEqualTo(entry.getValue());
                assertThat(NativeFqDatabase.flyway("30").migrate().migrationsExecuted).isZero();
                NativeFqDatabase.flyway("30").validate();
                NativeFqDatabase.cleanOwned(c,NativeFileWorkQaMigrationTest.tables(c));
                var fresh=NativeFqDatabase.flyway("30");int available=fresh.info().pending().length;
                assertThat(fresh.migrate().migrationsExecuted).isEqualTo(available);
                NativeFqDatabase.flyway("30").validate();
            } finally {NativeFqFixture.scalar(c,"SELECT RELEASE_LOCK(CONCAT('native-fq-',DATABASE()))");}
            }
        }
        r.add("spring.datasource.url",NativeFqDatabase::url);r.add("spring.datasource.username",NativeFqDatabase::user);r.add("spring.datasource.password",NativeFqDatabase::password);
        r.add("TMS_DB_URL",NativeFqDatabase::url);r.add("TMS_DB_USER",NativeFqDatabase::user);r.add("TMS_DB_PASSWORD",NativeFqDatabase::password);
        r.add("TMS_MIGRATION_USER",NativeFqDatabase::user);r.add("TMS_MIGRATION_PASSWORD",NativeFqDatabase::password);
        r.add("spring.flyway.enabled",()->"false");r.add("spring.sql.init.mode",()->"never");r.add("spring.jpa.hibernate.ddl-auto",()->"validate");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("TMS_AI_DRAFT_CLEANUP_CRON",()->"-");r.add("TMS_AI_CHAT_CLEANUP_CRON",()->"-");
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");r.add("TMS_OPENAI_ENABLED",()->"true");
        r.add("TMS_CHATGPT_LOCAL_ENABLED",()->"false");r.add("TMS_OLLAMA_ENABLED",()->"false");r.add("TMS_OPENAI_MODEL",()->"gpt-4.1-mini");
        r.add("OPENAI_API_KEY",()->"test-only-never-live");r.add("TMS_AI_CHAT_USER_DAILY_LIMIT",()->"20");
    }
    @Autowired DataSource dataSource;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired MockMvc mvc;
    @Autowired org.springframework.session.SessionRepository<? extends org.springframework.session.Session> sessions;
    @MockitoBean OpenAiResponsesClient provider;
    NativeFqFixture f;
    @BeforeEach void fixture() throws Exception {
        try(var c=dataSource.getConnection()){f=NativeFqFixture.seed(c,false);}
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call->{
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return output();
        });
    }
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    OpenAiResponsesClient.Output output(){return new OpenAiResponsesClient.Output(json.createObjectNode().put("text","Synthetic portfolio answer"),"resp_portfolio","gpt-4.1-mini",10,5);}
    @org.springframework.lang.NonNull RequestPostProcessor actor(String id) {
        var context=SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(id,0),null,List.of(new SimpleGrantedAuthority("ROLE_PM"))));
        String sessionId=NativeAiSessions.create(sessions,context);
        return request->{var captured=new org.springframework.mock.web.MockHttpSession(null,sessionId);captured.setAttribute("SPRING_SECURITY_CONTEXT",context);request.setSession(captured);
            request.setCookies(new jakarta.servlet.http.Cookie("TMS_SESSION",sessionId));return authentication(context.getAuthentication()).postProcessRequest(request);};
    }
    long create(String user) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/ai/chats").with(actor(user)).with(Objects.requireNonNull(csrf())).contentType("application/json")
            .content("{\"provider\":\"OPENAI_API\",\"model\":\"gpt-4.1-mini\",\"purpose\":\"MY_PROJECTS\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.sourceReference").value(Objects.requireNonNull(org.hamcrest.Matchers.startsWith("portfolio-v1:"))))
            .andReturn().getResponse().getContentAsByteArray()).path("id").asLong();
    }
    ResultActions send(String user,long id,String key) throws Exception {
        return mvc.perform(post("/api/v1/ai/chats/"+id+"/messages").with(actor(user)).with(Objects.requireNonNull(csrf())).contentType("application/json")
            .content("{\"text\":\"Tổng hợp dự án của tôi\",\"requestKey\":\""+key+"\"}"));
    }
    long createProject(String user,long project) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/ai/chats").with(actor(user)).with(Objects.requireNonNull(csrf())).contentType("application/json")
            .content("{\"provider\":\"OPENAI_API\",\"model\":\"gpt-4.1-mini\",\"purpose\":\"PROJECT_CHAT\",\"projectId\":"+project+"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.sourceReference").value(Objects.requireNonNull(org.hamcrest.Matchers.startsWith("project-chat-v1:"))))
            .andReturn().getResponse().getContentAsByteArray()).path("id").asLong();
    }
    @Test void selectedProjectNeedsNoTargetAndNeverIncludesAnotherAuthorizedProject() throws Exception {
        NativeFqFixture second;try(var c=dataSource.getConnection()){second=NativeFqFixture.seed(c,false);}
        jdbc.update("INSERT INTO project_memberships(project_id,user_id,project_role,created_at,updated_at) VALUES(?,?,'TESTER',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",second.project,f.tester);
        jdbc.update("INSERT INTO import_batches(project_id,file_name,file_checksum,status,staged_expires_at,imported_by,created_at) VALUES(?,'Private preview marker.xlsx',REPEAT('d',64),'PREVIEW',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6))",second.project,second.pm);
        long id=createProject(f.tester,second.project);send(f.tester,id,"selected-project-one").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("READY"));
        var capture=org.mockito.ArgumentCaptor.forClass(JsonNode.class);verify(provider).generate(anyString(),capture.capture(),anyString(),any());
        var data=capture.getValue();assertThat(data.path("scope").asText()).isEqualTo("PROJECT_CHAT");assertThat(data.path("snapshot").path("sources")).hasSize(1);
        var facts=data.path("snapshot").path("sources").get(0).path("facts");assertThat(facts.path("projectId").asLong()).isEqualTo(second.project);assertThat(facts.has("testCycles")).isTrue();assertThat(facts.has("sourceFiles")).isTrue();
        assertThat(facts.path("sourceFiles").toString()).contains("original.xlsx").doesNotContain("Private preview marker");
        jdbc.update("UPDATE project_memberships SET lock_version=lock_version+1 WHERE id=?",f.testerMember);
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(f.tester))).andExpect(status().isOk());
        send(f.tester,id,"selected-project-one").andExpect(status().isOk());verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(second.tester))).andExpect(status().isNotFound());
    }
    @Test void selectedProjectRevocationHidesListHistoryAndReplay() throws Exception {
        long id=createProject(f.tester,f.project);send(f.tester,id,"selected-before-revoke").andExpect(status().isOk());
        jdbc.update("UPDATE project_memberships SET active=FALSE,lock_version=lock_version+1 WHERE id=?",f.testerMember);
        mvc.perform(get("/api/v1/ai/chats").with(actor(f.tester))).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(f.tester))).andExpect(status().isNotFound());send(f.tester,id,"selected-before-revoke").andExpect(status().isNotFound());
    }
    @Test void selectedProjectChangeDuringInferenceDiscardsOutput() throws Exception {
        long id=createProject(f.tester,f.project);
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call->{jdbc.update("UPDATE project_memberships SET lock_version=lock_version+1 WHERE id=?",f.testerMember);return output();});
        send(f.tester,id,"selected-during-inference").andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT content_json FROM ai_chat_turns WHERE thread_id=?",String.class,id)).isNull();assertThat(jdbc.queryForObject("SELECT state FROM ai_chat_turns WHERE thread_id=?",String.class,id)).isEqualTo("FAILED");
    }
    @Test void selectedProjectValidatesForeignScopeTargetAndArchiveButAllowsAdmin() throws Exception {
        NativeFqFixture foreign;try(var c=dataSource.getConnection()){foreign=NativeFqFixture.seed(c,false);}
        mvc.perform(post("/api/v1/ai/chats").with(actor(f.tester)).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"purpose\":\"PROJECT_CHAT\",\"projectId\":"+foreign.project+"}")).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/ai/chats").with(actor(f.tester)).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"purpose\":\"PROJECT_CHAT\"}")).andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/v1/ai/chats").with(actor(f.tester)).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"purpose\":\"PROJECT_CHAT\",\"projectId\":"+f.project+",\"targetId\":1}")).andExpect(status().isUnprocessableEntity());
        long id=createProject(f.tester,f.project);jdbc.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",f.project);
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(f.tester))).andExpect(status().isOk());send(f.tester,id,"selected-after-archive").andExpect(status().isConflict());
        verifyNoInteractions(provider);jdbc.update("UPDATE identity_users SET role_code='ADMIN' WHERE id=?",f.pm);
        long adminId=createProject(f.pm,foreign.project);send(f.pm,adminId,"selected-admin-foreign").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("READY"));
        var capture=org.mockito.ArgumentCaptor.forClass(JsonNode.class);verify(provider).generate(anyString(),capture.capture(),anyString(),any());
        var facts=capture.getValue().path("snapshot").path("sources").get(0).path("facts");assertThat(facts.path("accessRole").asText()).isEqualTo("ADMIN");assertThat(facts.path("myRole").isNull()).isTrue();
    }
    @Test void membershipSelectsTwoProjectsAndNeverTheForeignProject() throws Exception {
        NativeFqFixture second,foreign;
        try(var c=dataSource.getConnection()){second=NativeFqFixture.seed(c,false);foreign=NativeFqFixture.seed(c,false);}
        jdbc.update("INSERT INTO project_memberships(project_id,user_id,project_role,created_at,updated_at) VALUES(?,?,'TESTER',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",second.project,f.tester);
        long id=create(f.tester);send(f.tester,id,"portfolio-two-projects").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("READY"));
        var capture=org.mockito.ArgumentCaptor.forClass(JsonNode.class);verify(provider).generate(anyString(),capture.capture(),anyString(),any());
        assertThat(capture.getValue().path("scope").asText()).isEqualTo("MY_PROJECTS");
        assertThat(capture.getValue().path("snapshot").path("totalProjects").asInt()).isEqualTo(2);
        var ids=new ArrayList<Long>();capture.getValue().path("snapshot").path("sources").forEach(s->ids.add(s.path("facts").path("projectId").asLong()));
        assertThat(ids).containsExactlyInAnyOrder(f.project,second.project).doesNotContain(foreign.project);
        send(f.tester,id,"portfolio-two-projects").andExpect(status().isOk());verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(f.dev))).andExpect(status().isNotFound());
    }
    @Test void adminScopeDoesNotRequireProjectMembership() throws Exception {
        jdbc.update("UPDATE identity_users SET role_code='ADMIN' WHERE id=?",f.pm);
        long total=Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM projects",Long.class));
        long id=create(f.pm);send(f.pm,id,"portfolio-admin-all").andExpect(status().isOk());
        var capture=org.mockito.ArgumentCaptor.forClass(JsonNode.class);verify(provider).generate(anyString(),capture.capture(),anyString(),any());
        assertThat(capture.getValue().path("snapshot").path("totalProjects").asLong()).isEqualTo(total);
        var own=new ArrayList<JsonNode>();capture.getValue().path("snapshot").path("sources").forEach(s->{if(s.path("facts").path("projectId").asLong()==f.project)own.add(s.path("facts"));});
        // Owned schemas retain other fixtures; this project's ID may fall beyond the30-project cap.
        if(own.isEmpty())assertThat(capture.getValue().path("snapshot").path("truncated").asBoolean()||capture.getValue().path("truncated").asBoolean()).isTrue();
        else {assertThat(own).hasSize(1);assertThat(own.getFirst().path("accessRole").asText()).isEqualTo("ADMIN");assertThat(own.getFirst().path("myRole").asText()).isEqualTo("PM");}
    }
    @Test void removingMembershipHidesDetailListReplayAndNewMessages() throws Exception {
        long id=create(f.tester);send(f.tester,id,"portfolio-before-remove").andExpect(status().isOk());
        jdbc.update("UPDATE project_memberships SET active=FALSE,lock_version=lock_version+1 WHERE id=?",f.testerMember);
        mvc.perform(get("/api/v1/ai/chats/"+id).with(actor(f.tester))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/ai/chats").with(actor(f.tester))).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        send(f.tester,id,"portfolio-before-remove").andExpect(status().isNotFound());send(f.tester,id,"portfolio-after-remove").andExpect(status().isNotFound());
        verify(provider,times(1)).generate(anyString(),any(),anyString(),any());
    }
    @Test void permissionChangeDuringInferenceDiscardsOutputBeforeSaving() throws Exception {
        long id=create(f.tester);
        when(provider.generate(anyString(),any(),anyString(),any())).thenAnswer(call->{
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            jdbc.update("UPDATE project_memberships SET project_role='MEMBER',lock_version=lock_version+1 WHERE id=?",f.testerMember);
            return output();
        });
        send(f.tester,id,"portfolio-inference-fence").andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT state FROM ai_chat_turns WHERE thread_id=?",String.class,id)).isEqualTo("FAILED");
        assertThat(jdbc.queryForObject("SELECT content_json FROM ai_chat_turns WHERE thread_id=?",String.class,id)).isNull();
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"TESTER","DEV","PM"})
    void ownSamplesDoNotContainAnotherMembersWork(String role) throws Exception {
        String user="DEV".equals(role)?f.dev:"PM".equals(role)?f.pm:f.tester;
        long member="DEV".equals(role)?f.devMember:"PM".equals(role)?f.pmMember:f.testerMember;
        long own,other;try(var c=dataSource.getConnection()){own=f.work(c,"BUG",1);other=f.work(c,"BUG",2);}
        jdbc.update("UPDATE work_items SET title='Own marker',assignee_membership_id=? WHERE id=?",member,own);
        jdbc.update("UPDATE work_items SET title='Other private marker',assignee_membership_id=? WHERE id=?",f.dev2Member,other);
        long id=create(user);send(user,id,"portfolio-own-samples").andExpect(status().isOk());
        var capture=org.mockito.ArgumentCaptor.forClass(JsonNode.class);verify(provider).generate(anyString(),capture.capture(),anyString(),any());
        assertThat(capture.getValue().toString()).contains("Own marker").doesNotContain("Other private marker");
    }
    @Test void forgedProjectTargetAndAnonymousOrCsrfLessCallsAreRejected() throws Exception {
        mvc.perform(post("/api/v1/ai/chats").with(actor(f.tester)).with(Objects.requireNonNull(csrf())).contentType("application/json")
            .content("{\"purpose\":\"MY_PROJECTS\",\"projectId\":"+f.project+"}"))
            .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/v1/ai/chats").with(actor(f.tester)).contentType("application/json").content("{\"purpose\":\"MY_PROJECTS\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/ai/chats")).andExpect(status().isUnauthorized());verifyNoInteractions(provider);
    }
    @Test void pendingCaseSampleUsesOnlyTheRequestingAssigneeAndActiveCycle() throws Exception {
        try(var c=dataSource.getConnection()) {
            long ownRun=f.run(c),attempt=f.attempt(c,ownRun);
            NativeFqFixture.update(c,"UPDATE run_items SET latest_attempt_id=? WHERE id=?",attempt,ownRun);
            long otherCase=NativeFqFixture.insert(c,"INSERT INTO test_cases(project_id,case_no,suite_id,created_at,updated_at) VALUES(?,'OTHER_CASE',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project,f.suite);
            long otherRevision=NativeFqFixture.insert(c,"INSERT INTO test_case_revisions(project_id,test_case_id,revision_no,title_vi,steps_vi,expected_vi,approved_at,approved_by,created_at,created_by) VALUES(?,?,1,'Other case title','Steps','Expected',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)",f.project,otherCase,f.pmMember,f.pmMember);
            NativeFqFixture.insert(c,"INSERT INTO run_items(project_id,cycle_id,configuration_id,test_case_id,revision_id,assignee_membership_id,created_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",f.project,f.cycle,f.configuration,otherCase,otherRevision,f.dev2Member);
        }
        jdbc.update("UPDATE test_cycles SET status_code='ACTIVE',activated_at=UTC_TIMESTAMP(6),activated_by=? WHERE id=?",f.pmMember,f.cycle);
        long id=create(f.tester);send(f.tester,id,"portfolio-own-cases").andExpect(status().isOk());
        var capture=org.mockito.ArgumentCaptor.forClass(JsonNode.class);verify(provider).generate(anyString(),capture.capture(),anyString(),any());
        var facts=capture.getValue().path("snapshot").path("sources").get(0).path("facts");
        assertThat(facts.path("myPendingCaseSample")).hasSize(1);
        assertThat(facts.path("myPendingCaseSample").get(0).path("caseNo").asText()).isEqualTo("TC1");
        assertThat(facts.path("myPendingCaseSample").toString()).doesNotContain("OTHER_CASE");
        assertThat(facts.path("execution").path("total").asInt()).isEqualTo(2);
        assertThat(facts.path("myActiveExecution").path("total").asInt()).isEqualTo(1);
    }
}
