package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import com.fasterxml.jackson.databind.*;
import java.sql.DriverManager;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.ai.AiDraftStore;
import vn.syp.tms.ai.AiDraftService;

@SpringBootTest @AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="integration")
class ManagementReportIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r)throws Exception {
        String url=System.getenv("TMS_TEST_DB_URL");
        if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):3307/tms_docstest_2060e04c986c\\?.+"))throw new IllegalStateException("Authorized report integration schema required");
        try(var c=DriverManager.getConnection(url,System.getenv("TMS_TEST_DB_USER"),System.getenv("TMS_TEST_DB_PASSWORD"));var s=c.createStatement();var rs=s.executeQuery("SELECT DATABASE()")){assertThat(rs.next()).isTrue();assertThat(rs.getString(1)).isEqualTo("tms_docstest_2060e04c986c");}
        r.add("TMS_DB_URL",()->url);r.add("TMS_DB_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_DB_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));r.add("TMS_MIGRATION_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_MIGRATION_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
        for(String key:List.of("TMS_BOOTSTRAP_ENABLED","TMS_REDMINE_ENABLED","TMS_CHATGPT_LOCAL_ENABLED","TMS_OLLAMA_ENABLED","TMS_OPENAI_ENABLED"))r.add(Objects.requireNonNull(key),()->"false");
        r.add("spring.task.scheduling.enabled",()->"false");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("TMS_AI_DRAFT_CLEANUP_CRON",()->"-");r.add("TMS_AI_CHAT_CLEANUP_CRON",()->"-");
    }
    @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired IdentityUserRepository users;@Autowired ProjectService projects;@Autowired AiDraftStore drafts;@Autowired JdbcTemplate db;
    IdentityUser admin,pm,tester,dev,outside;long p,f;
    @BeforeEach void setup()throws Exception {
        String tag=UUID.randomUUID().toString().substring(0,8);var creator=user("creator"+tag,"ADMIN");admin=user("admin"+tag,"ADMIN");pm=user("pm"+tag,"PM");tester=user("tester"+tag,"TESTER");dev=user("dev"+tag,"DEV");outside=user("outside"+tag,"PM");
        p=projects.create(creator.getId(),new ProjectDtos.CreateProject("MR"+tag,"Report test","Actual project description","Asia/Ho_Chi_Minh")).id();
        for(var entry:Map.of(pm,"PM",tester,"TESTER",dev,"DEV").entrySet())projects.addOrUpdateMember(p,creator.getId(),entry.getKey().getId(),new ProjectDtos.SetMember(entry.getValue()));
        f=body(mvc.perform(post(path("/features")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("name","Report Feature","environment","free URL","description","","requestKey",UUID.randomUUID())))).andExpect(status().isCreated()).andReturn()).get("id").asLong();
    }
    IdentityUser user(String name,String role){return users.saveAndFlush(new IdentityUser("report."+name,name,"not-login",role));}
    @NonNull RequestPostProcessor actor(IdentityUser user){return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),user.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+user.getRole())))));}
    @NonNull String path(String tail){return "/api/v1/projects/"+p+tail;}
    @NonNull String encode(Object value)throws Exception{return Objects.requireNonNull(json.writeValueAsString(value));}
    JsonNode body(MvcResult result)throws Exception{return json.readTree(result.getResponse().getContentAsByteArray());}
    @Test void generatedMarkdownPreviewCanBeEditedAndSavedAsAnOrdinaryReportWithoutProviderTraffic()throws Exception {
        String generated="# Báo cáo AI\n\nChưa có case được kiểm thử.\n\n## Nhận xét\n\nChưa đủ dữ liệu để đánh giá.\n";
        String key=UUID.randomUUID().toString();
        var task=new AiDraftService.Task("PM_PROGRESS_REPORT","project:"+p,"feature-report-text-v3",key,
            "Fixture-only completed report",json.createObjectNode(),json.createObjectNode(),List.of()).withMarkdownReport();
        var reservation=drafts.reserve(p,pm.getId(),task);
        var content=json.createObjectNode().put("markdown",generated);content.putArray("sources");
        drafts.complete(p,pm.getId(),reservation.id(),new vn.syp.tms.ai.OpenAiResponsesClient.Output(content,"resp_fixture","fixture-model",10,10));
        // Providers are disabled in this isolated suite: replay must use the owned READY draft.
        var preview=body(mvc.perform(post(path("/management-reports/preview")).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(encode(Map.of("requestKey",key)))).andExpect(status().isOk()).andReturn());
        assertThat(preview.path("state").asText()).isEqualTo("READY");assertThat(preview.path("markdown").asText()).isEqualTo(generated);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_management_reports WHERE project_id=?",Long.class,p)).isZero();
        String edited=preview.path("markdown").asText()+"\nGhi chú đã được người dùng chỉnh sửa.\n";
        long reportId=body(mvc.perform(post(path("/management-reports")).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(encode(Map.of("title","Báo cáo đã duyệt","markdown",edited)))).andExpect(status().isCreated()).andReturn()).path("id").asLong();
        mvc.perform(get(path("/management-reports/"+reportId)).with(actor(pm))).andExpect(status().isOk()).andExpect(jsonPath("$.markdown").value(edited));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM import_rows WHERE project_id=?",Long.class,p)).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_items WHERE project_id=?",Long.class,p)).isZero();
    }
    @Test void editedReportPersistsExactlyWhileTenIssuesAndCaseStatusRemainUnchangedAfterDraftCleanup()throws Exception {
        for(int n=0;n<10;n++)mvc.perform(post(path("/issues")).with(actor(tester)).with(csrf()).contentType("application/json").content(encode(Map.of("type","BUG","featureId",f,"monkey",true,"title","Monkey "+n,"description","Details","steps","Open","expectedResult","Works","actualResult","Fails","requestKey",UUID.randomUUID())))).andExpect(status().isCreated());
        var upload=new MockMultipartFile("file","report.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",new FeatureIntegrationTest().internal());
        long d=body(mvc.perform(multipart(path("/features/"+f+"/import-previews")).file(upload).with(actor(pm)).with(csrf())).andExpect(status().isOk()).andReturn()).get("id").asLong();
        mvc.perform(post(path("/features/"+f+"/import-previews/"+d+"/commit")).with(actor(pm)).with(csrf())).andExpect(status().isOk());
        long row=body(mvc.perform(get(path("/test-documents/"+d)).with(actor(tester))).andExpect(status().isOk()).andReturn()).at("/rows/0/rowId").asLong();
        mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(Map.of("status","OK","expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        var created=body(mvc.perform(post(path("/management-reports")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("featureId",f,"title","Báo cáo","markdown","# Báo cáo\n\n10 lỗi\n")))).andExpect(status().isCreated()).andReturn());
        long id=created.get("id").asLong();String edited="# Báo cáo\n\n8 lỗi\n\n<script>window.evil=true</script>\n";
        mvc.perform(put(path("/management-reports/"+id)).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Báo cáo đã sửa","markdown",edited,"expectedVersion",created.get("version").asLong())))).andExpect(status().isOk());
        // Reserve fixture-owned drafts without invoking any disabled provider. Exercise a
        // real expiry deletion, rather than a no-op cleanup with no expiring row present.
        var task=new AiDraftService.Task("PM_PROGRESS_REPORT","project:"+p,"cleanup-v1",UUID.randomUUID().toString(),
            "Fixture-only retention check",json.createObjectNode(),json.createObjectNode(),List.of());
        var expired=drafts.reserve(p,pm.getId(),task);
        var active=drafts.reserve(p,pm.getId(),new AiDraftService.Task(task.purpose(),task.sourceReference(),task.promptVersion(),UUID.randomUUID().toString(),task.instructions(),task.data(),task.schema(),task.sources()));
        assertThat(expired.created()).isTrue();assertThat(active.created()).isTrue();
        assertThat(db.update("UPDATE ai_generated_drafts SET created_at=UTC_TIMESTAMP(6)-INTERVAL 8 DAY,expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 DAY WHERE project_id=? AND created_by=? AND id=?",p,pm.getId(),expired.id())).isEqualTo(1);
        assertThat(drafts.purgeExpired()).isGreaterThanOrEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM ai_generated_drafts WHERE project_id=? AND created_by=? AND id=?",Long.class,p,pm.getId(),expired.id())).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM ai_generated_drafts WHERE project_id=? AND created_by=? AND id=? AND expires_at>UTC_TIMESTAMP(6)",Long.class,p,pm.getId(),active.id())).isEqualTo(1);
        mvc.perform(get(path("/management-reports/"+id)).with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.markdown").value(edited));
        assertThat(mvc.perform(get(path("/management-reports/"+id+"/download")).with(actor(pm))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(Objects.requireNonNull(StandardCharsets.UTF_8))).isEqualTo(edited);
        mvc.perform(get(path("/issues")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(10));
        mvc.perform(get(path("/test-documents/"+d)).with(actor(tester))).andExpect(jsonPath("$.rows[0].resultStatus").value("OK"));
        mvc.perform(put(path("/management-reports/"+id)).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Stale","markdown","Lost update","expectedVersion",0)))).andExpect(status().isConflict());
    }
    @Test void managementReadCreateAndDownloadDenyWorkersAndOutsidePmButAllowGlobalAdmin()throws Exception {
        for(var worker:List.of(tester,dev)) {
            mvc.perform(get(path("/management-reports/summary")).with(actor(worker))).andExpect(status().isForbidden());
            mvc.perform(get(path("/management-reports/1/download")).with(actor(worker))).andExpect(status().isForbidden());
            mvc.perform(post(path("/management-reports")).with(actor(worker)).with(csrf()).contentType("application/json").content(encode(Map.of("title","No","markdown","No")))).andExpect(status().isForbidden());
            mvc.perform(post(path("/management-reports/preview")).with(actor(worker)).with(csrf()).contentType("application/json").content(encode(Map.of("featureId",f,"requestKey",UUID.randomUUID().toString())))).andExpect(status().isForbidden());
        }
        mvc.perform(get(path("/management-reports/summary")).with(actor(outside))).andExpect(status().isNotFound());
        mvc.perform(get(path("/management-reports/summary?featureId="+f)).with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.metrics.executionPercent").value(0));
    }
    @Test void evenGlobalAdminCannotDownloadAReportThroughAnotherProjectScope()throws Exception {
        long id=body(mvc.perform(post(path("/management-reports")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Scoped report","markdown","Private to this project scope")))).andExpect(status().isCreated()).andReturn()).get("id").asLong();
        long other=projects.create(admin.getId(),new ProjectDtos.CreateProject("RC"+UUID.randomUUID().toString().substring(0,8),"Other report project","","Asia/Ho_Chi_Minh")).id();
        mvc.perform(get("/api/v1/projects/"+other+"/management-reports/"+id+"/download").with(actor(admin))).andExpect(status().isNotFound());
        mvc.perform(get(path("/management-reports/"+id+"/download")).with(actor(admin))).andExpect(status().isOk()).andExpect(content().string("Private to this project scope"));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,admin.getId())).isZero();
    }
}
