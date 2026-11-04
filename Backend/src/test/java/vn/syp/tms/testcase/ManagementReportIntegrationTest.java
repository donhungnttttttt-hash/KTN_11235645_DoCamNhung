package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import com.fasterxml.jackson.databind.*;
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
        vn.syp.tms.support.CurrentWorkflowDatabaseGuard.configure(r);
    }
    @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired IdentityUserRepository users;@Autowired ProjectService projects;@Autowired AiDraftStore drafts;@Autowired JdbcTemplate db;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    IdentityUser admin,pm,tester,dev,outside;long p,f;
    List<Map<String,Object>> registeredAdmins;
    List<Map<String,Object>> retainedDrafts;
    @BeforeEach void setup()throws Exception {
        registeredAdmins=db.queryForList("SELECT slot,user_id FROM system_admin_registry ORDER BY slot");assertThat(registeredAdmins).hasSize(2);
        admin=users.findById(String.valueOf(registeredAdmins.getFirst().get("user_id"))).orElseThrow();
        var creator=users.findById(String.valueOf(registeredAdmins.getLast().get("user_id"))).orElseThrow();
        String tag=UUID.randomUUID().toString().substring(0,8);pm=user("pm"+tag,"PM");tester=user("tester"+tag,"USER");dev=user("dev"+tag,"USER");outside=user("outside"+tag,"PM");
        p=projects.create(creator.getId(),new ProjectDtos.CreateProject("MR"+tag,"Report test","Actual project description","Asia/Ho_Chi_Minh")).id();
        for(var entry:Map.of(pm,"PM",tester,"USER",dev,"USER").entrySet())projects.addOrUpdateMember(p,creator.getId(),entry.getKey().getId(),new ProjectDtos.SetMember(entry.getValue()));
        f=body(mvc.perform(post(path("/features")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("name","Report Feature","environment","free URL","description","","requestKey",UUID.randomUUID())))).andExpect(status().isCreated()).andReturn()).get("id").asLong();
        retainedDrafts=otherDrafts();
    }
    @AfterEach void registryWasPreserved(){assertThat(db.queryForList("SELECT slot,user_id FROM system_admin_registry ORDER BY slot")).isEqualTo(registeredAdmins);}
    List<Map<String,Object>> otherDrafts(){return db.queryForList("SELECT id,project_id,state,created_at,expires_at FROM ai_generated_drafts WHERE project_id<>? ORDER BY id",p);}
    @AfterEach void retainedDraftsWerePreserved(){assertThat(otherDrafts()).isEqualTo(retainedDrafts);}
    @AfterEach void recordOwnedFixtures(TestInfo test)throws Exception {
        String evidence=System.getenv("TMS_CURRENT_WORKFLOW_EVIDENCE_DIR");if(evidence==null||p==0)return;
        var record=new LinkedHashMap<String,Object>();record.put("test",test.getDisplayName());record.put("projectId",p);record.put("featureId",f);record.put("pm",pm.getId());
        record.put("features",db.queryForList("SELECT id,name FROM testing_features WHERE project_id=? ORDER BY id",p));
        record.put("documents",db.queryForList("SELECT id,feature_id FROM import_batches WHERE project_id=? ORDER BY id",p));
        record.put("rows",db.queryForList("SELECT id,batch_id,result_status FROM import_rows WHERE project_id=? ORDER BY id",p));
        record.put("tickets",db.queryForList("SELECT w.id,x.ticket_state,x.closure_reason FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id WHERE w.project_id=? ORDER BY w.id",p));
        record.put("reports",db.queryForList("SELECT id,lock_version FROM project_management_reports WHERE project_id=? ORDER BY id",p));
        java.nio.file.Files.writeString(java.nio.file.Path.of(evidence,"ar04-owned-fixtures.jsonl"),json.writeValueAsString(record)+System.lineSeparator(),java.nio.file.StandardOpenOption.CREATE,java.nio.file.StandardOpenOption.APPEND);
    }
    IdentityUser user(String name,String role){return users.saveAndFlush(new IdentityUser("report."+name,name,"not-login",role));}
    @NonNull RequestPostProcessor actor(IdentityUser user){return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),user.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+user.getRole())))));}
    @NonNull String path(String tail){return "/api/v1/projects/"+p+tail;}
    @NonNull String encode(Object value)throws Exception{return Objects.requireNonNull(json.writeValueAsString(value));}
    JsonNode body(MvcResult result)throws Exception{return json.readTree(result.getResponse().getContentAsByteArray());}
    long member(IdentityUser who){return Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,who.getId()));}
    JsonNode issue(long feature,String type)throws Exception {
        var input=new LinkedHashMap<String,Object>();input.put("type",type);input.put("featureId",feature);input.put("monkey","BUG".equals(type));input.put("title","Report fixture");input.put("description","Synthetic details");input.put("steps","Open");input.put("expectedResult","Works");input.put("actualResult","Fails");input.put("frequency","1/1");input.put("environment","Synthetic");input.put("device","Desktop");input.put("assigneeMembershipId",member(pm));input.put("requestKey",UUID.randomUUID());
        return body(mvc.perform(post(path("/issues")).with(actor(tester)).with(csrf()).contentType("application/json").content(encode(input))).andExpect(status().isCreated()).andReturn());
    }
    long document(long feature)throws Exception {
        var upload=new MockMultipartFile("file","report.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",new FeatureIntegrationTest().internal());
        long d=body(mvc.perform(multipart(path("/features/"+feature+"/import-previews")).file(upload).with(actor(pm)).with(csrf())).andExpect(status().isOk()).andReturn()).path("id").asLong();
        mvc.perform(post(path("/features/"+feature+"/import-previews/"+d+"/commit")).with(actor(pm)).with(csrf())).andExpect(status().isOk());return d;
    }
    @Test void featureFilterKeepsFullSelectorCatalogAndCanonicalTicketTotals()throws Exception {
        long second=body(mvc.perform(post(path("/features")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("name","Feature B","environment","synthetic","description","","requestKey",UUID.randomUUID())))).andExpect(status().isCreated()).andReturn()).path("id").asLong();
        long d=document(f);document(second);
        var rows=body(mvc.perform(get(path("/test-documents/"+d)).with(actor(pm))).andExpect(status().isOk()).andReturn()).path("rows");
        for(int i=0;i<3;i++)mvc.perform(put(path("/test-documents/"+d+"/rows/"+rows.get(i).path("rowId").asLong()+"/result")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(Map.of("status",List.of("OK","P","NA").get(i),"expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        for(int i=0;i<10;i++){
            var ticket=issue(i<8?f:second,"BUG");
            if(i<6)mvc.perform(post(path("/issues/"+ticket.path("id").asLong()+"/actions")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("state","CLOSED","closureReason",i<3?"FIXED":"PROCESSED","body","Synthetic verification","expectedVersion",ticket.path("version").asLong(),"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        }
        var filtered=body(mvc.perform(get(path("/management-reports/summary")).param("featureId",""+f).with(actor(pm))).andExpect(status().isOk()).andReturn());
        assertThat(filtered.at("/metrics/total").asInt()).isEqualTo(5);assertThat(filtered.at("/metrics/tested").asInt()).isEqualTo(3);assertThat(filtered.at("/metrics/executionPercent").asDouble()).isEqualTo(60);
        assertThat(filtered.path("features").findValuesAsText("name")).containsExactlyInAnyOrder("Report Feature","Feature B");
        long scoped=0,fixed=0,processed=0;for(var group:filtered.path("issues")){long count=group.path("total").asLong();scoped+=count;if("FIXED".equals(group.path("closureReason").asText()))fixed+=count;if("PROCESSED".equals(group.path("closureReason").asText()))processed+=count;}
        assertThat(scoped).isEqualTo(8);assertThat(fixed).isEqualTo(3);assertThat(processed).isEqualTo(3);
        var all=body(mvc.perform(get(path("/management-reports/summary")).with(actor(pm))).andExpect(status().isOk()).andReturn());assertThat(all.at("/metrics/total").asInt()).isEqualTo(10);assertThat(all.at("/metrics/executionPercent").asDouble()).isEqualTo(30);
        long count=0;for(var group:all.path("issues"))count+=group.path("total").asLong();assertThat(count).isEqualTo(10);
        // Current unified identity policy requires PM membership for AI too;
        // ordinary USER AI read still cannot grant management report CRUD.
        mvc.perform(get("/api/v1/ai/projects/"+p+"/features").with(actor(outside))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/ai/projects/"+p+"/features").with(actor(tester))).andExpect(status().isOk());
        mvc.perform(get(path("/management-reports/summary")).with(actor(tester))).andExpect(status().isForbidden());
        mvc.perform(get(path("/management-reports/summary")).with(actor(outside))).andExpect(status().isNotFound());
        mvc.perform(post(path("/management-reports")).with(actor(outside)).with(csrf()).contentType("application/json").content(encode(Map.of("title","No access","markdown","No access")))).andExpect(status().isNotFound());
    }
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
        mvc.perform(get(path("/management-reports")).param("page","0").param("size","1").with(actor(pm))).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.totalPages").value(1))
            .andExpect(jsonPath("$.items[0].id").value(reportId)).andExpect(jsonPath("$.items[0].title").value("Báo cáo đã duyệt"))
            .andExpect(jsonPath("$.items[0].markdown").doesNotExist());
        mvc.perform(get(path("/management-reports")).param("page","0").param("size","101").with(actor(pm))).andExpect(status().isUnprocessableEntity());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM import_rows WHERE project_id=?",Long.class,p)).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_items WHERE project_id=?",Long.class,p)).isZero();
    }
    @Test void editedReportPersistsExactlyWhileTenIssuesAndCaseStatusRemainUnchangedAfterDraftCleanup()throws Exception {
        for(int n=0;n<10;n++)issue(f,"BUG");
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
        // Exercise the real global TTL job only inside a rollback transaction: retained
        // fixtures from other suites must never be physically purged by this test.
        new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(transaction->{
            transaction.setRollbackOnly();
            assertThat(db.update("UPDATE ai_generated_drafts SET created_at=UTC_TIMESTAMP(6)-INTERVAL 8 DAY,expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 DAY WHERE project_id=? AND created_by=? AND id=?",p,pm.getId(),expired.id())).isEqualTo(1);
            assertThat(drafts.purgeExpired()).isGreaterThanOrEqualTo(1);
            assertThat(db.queryForObject("SELECT COUNT(*) FROM ai_generated_drafts WHERE project_id=? AND created_by=? AND id=?",Long.class,p,pm.getId(),expired.id())).isZero();
            assertThat(db.queryForObject("SELECT COUNT(*) FROM ai_generated_drafts WHERE project_id=? AND created_by=? AND id=? AND expires_at>UTC_TIMESTAMP(6)",Long.class,p,pm.getId(),active.id())).isEqualTo(1);
            assertThat(db.queryForObject("SELECT markdown FROM project_management_reports WHERE project_id=? AND id=?",String.class,p,id)).isEqualTo(edited);
        });
        assertThat(db.queryForObject("SELECT COUNT(*) FROM ai_generated_drafts WHERE project_id=? AND created_by=? AND id=?",Long.class,p,pm.getId(),expired.id())).isEqualTo(1);
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
