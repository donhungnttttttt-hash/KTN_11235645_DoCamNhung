package vn.syp.tms.workitem;

import static vn.syp.tms.support.MockMvcContracts.jsonBytes;

import org.springframework.lang.NonNull;

import static vn.syp.tms.support.MockMvcContracts.csrf;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.catalog.*;
import vn.syp.tms.testcase.*;
import vn.syp.tms.execution.*;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
class WorkItemIntegrationTest {
    @org.junit.jupiter.api.io.TempDir static java.nio.file.Path evidenceRoot;
    @Container static final MySQLContainer<?> mysql=new MySQLContainer<>("mysql:8.4.8");
    // JUnit @Container owns and closes this instance.
    static { mysql.withDatabaseName("tms_workitem_test").withUsername("test").withPassword("ephemeral-test-only"); }
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        r.add("TMS_DB_URL",mysql::getJdbcUrl); r.add("TMS_DB_USER",mysql::getUsername); r.add("TMS_DB_PASSWORD",mysql::getPassword);
        r.add("TMS_MIGRATION_USER",mysql::getUsername); r.add("TMS_MIGRATION_PASSWORD",mysql::getPassword);
        r.add("TMS_ATTACHMENT_ROOT",()->evidenceRoot.toString());
    }
    @Autowired ProjectService projects; @Autowired TestCaseService library; @Autowired CatalogService catalogs; @Autowired WorkItemService workItems;
    @Autowired ExecutionService execution; @Autowired IdentityUserRepository users; @Autowired JdbcTemplate db;
    @Autowired MockMvc mvc; @Autowired ObjectMapper json;
    @Autowired vn.syp.tms.attachment.EvidenceService evidence;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean ProjectAudit audit;
    IdentityUser pm,tester,other; long p,member,revision,env,device,build,attempt,run;
    @BeforeEach void fixture() {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        pm=users.saveAndFlush(new IdentityUser("owner."+suffix,"PM thử","unused-hash","ADMIN"));
        tester=users.saveAndFlush(new IdentityUser("tester."+suffix,"Tester thử","unused-hash","TESTER"));
        other=users.saveAndFlush(new IdentityUser("other."+suffix,"Ngoài dự án","unused-hash","ADMIN"));
        p=projects.create(pm.getId(),new ProjectDtos.CreateProject("W"+suffix,"Dự án bug","","UTC")).id();
        member=projects.addOrUpdateMember(p,pm.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER")).membershipId();
        long suite=library.createSuite(p,pm.getId(),new TestCaseDtos.CreateSuite("AUTH","Đăng nhập","",null,0)).id();
        var c=library.createCase(p,pm.getId(),new TestCaseDtos.CreateCase("TC-1",suite,"Đăng nhập","Có tài khoản","Nhập thông tin","Vào trang chủ",null,null,null,null,null));
        revision=c.currentRevisionId(); library.approveRevision(p,pm.getId(),c.id(),revision);
        env=catalogs.createEnvironment(p,pm.getId(),new CatalogDtos.CreateEnvironment("QA","QA thử","")).id();
        device=catalogs.createDevice(p,pm.getId(),new CatalogDtos.CreateDevice("WEB","Máy thử","PC","Windows","11")).id();
        build=catalogs.createBuild(p,pm.getId(),new CatalogDtos.CreateBuild("1.0","1","WEB","",null)).id();
        long cycle=id(execution.create(p,pm.getId(),new ExecutionDtos.CreateCycle("C1","Hồi quy",null)));
        execution.configure(p,pm.getId(),cycle,new ExecutionDtos.Configuration(env,device,build,0L));
        long config=id(execution.configurations(p,pm.getId(),cycle).getFirst());
        execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(revision),member,1L));
        execution.activate(p,pm.getId(),cycle,new ExecutionDtos.Version(2L));
        run=id(execution.runs(p,tester.getId(),cycle,0,20,false,false).items().getFirst());
        attempt=id(execution.record(p,tester.getId(),run,new ExecutionDtos.Attempt("NG",build,"Màn hình trắng","","","attempt-fixture",0L)));
    }
    long id(Map<String,Object> row) { return ((Number)row.get("id")).longValue(); }
    @NonNull RequestPostProcessor actor(IdentityUser u) { return java.util.Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(u.getId(),u.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole()))))); }
    @NonNull String path(String tail) { return "/api/v1/projects/"+p+"/work-items"+tail; }
    Map<String,Object> bug() {
        var data=new LinkedHashMap<String,Object>();
        data.put("type","BUG"); data.put("title","Không vào được trang chủ"); data.put("description","Mô tả nội bộ");
        data.put("steps","1. Đăng nhập"); data.put("expectedResult","Hiển thị tổng quan"); data.put("actualResult","Màn hình trắng");
        data.put("buildId",build); data.put("environmentId",env); data.put("deviceId",device); data.put("revisionId",revision);
        data.put("attemptId",attempt); data.put("requestKey",UUID.randomUUID().toString()); return data;
    }
    JsonNode create(IdentityUser actor,Map<String,Object> input) throws Exception {
        return json.readTree(mvc.perform(post(path("")).with(actor(actor)).with(csrf()).contentType("application/json").content(jsonBytes(json,input)))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }
    @Test void canonicalBugIsIdempotentLinkedToNgAndVisibleThroughTheSameReadApi() throws Exception {
        var input=bug(); var first=create(tester,input); var retry=create(tester,input);
        assertThat(first.path("id").asLong()).isEqualTo(retry.path("id").asLong());
        assertThat(first.path("key").asText()).startsWith("W").endsWith("-1");
        assertThat(first.path("status").asText()).isEqualTo("open");
        assertThat(first.path("policyVersion").asText()).isEqualTo("INTERNAL_V1");
        mvc.perform(get(path("?type=BUG")).with(actor(pm))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get(path("/"+first.path("id").asLong())).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.links[0].attemptId").value(attempt));
        mvc.perform(get("/api/v1/projects/"+p+"/run-items/"+run).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.pendingBugLink").value(false));
        input.put("title","Nội dung khác");
        mvc.perform(post(path("")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isConflict());
    }
    @Test void apiRejectsMissingFieldsCsrfCrossProjectAndTesterStandaloneBug() throws Exception {
        var input=bug(); input.put("steps"," ");
        mvc.perform(post(path("")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isUnprocessableEntity());
        mvc.perform(post(path("")).with(actor(tester)).contentType("application/json").content(jsonBytes(json,bug()))).andExpect(status().isForbidden());
        mvc.perform(get(path("")).with(actor(other))).andExpect(status().isNotFound());
        input=bug(); input.remove("revisionId"); input.remove("attemptId"); input.put("standaloneReason","Phát hiện ngoài test case");
        mvc.perform(post(path("")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isForbidden());
        assertThat(create(pm,input).path("standaloneReason").asText()).isEqualTo("Phát hiện ngoài test case");
    }
    Map<String,Object> transition(String status,long version) { return Map.of("status",status,"expectedVersion",version,"reason","Phân loại nội bộ"); }
    void move(IdentityUser user,long id,Object body,int expected) throws Exception {
        mvc.perform(post(path("/"+id+"/transitions")).with(actor(user)).with(csrf()).contentType("application/json").content(jsonBytes(json,body))).andExpect(status().is(expected));
    }
    @Test void onlyProjectPmCanTriageAndFixedBuildNeverChangesNgVerdict() throws Exception {
        long id=create(tester,bug()).path("id").asLong();
        move(tester,id,transition("progress",0),403);
        projects.addOrUpdateMember(p,pm.getId(),other.getId(),new ProjectDtos.SetMember("MEMBER"));
        move(other,id,transition("progress",0),403); // Global ADMIN is not a project PM.
        move(pm,id,transition("progress",0),200);
        move(pm,id,transition("ready",0),409);
        for(String terminal:List.of("closed","wontfix","unreproducible")) move(pm,id,transition(terminal,1),422);
        move(pm,id,transition("resolved",1),422);
        var fixed=new LinkedHashMap<>(transition("resolved",1)); fixed.put("fixedBuildId",build); move(pm,id,fixed,200);
        assertThat(execution.run(p,tester.getId(),run).get("resultCode")).isEqualTo("NG");
        mvc.perform(get(path("/"+id+"/history")).with(actor(tester))).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].fromStatus").value("progress")).andExpect(jsonPath("$[0].toStatus").value("resolved"));
    }
    @Test void batchFailureRollsBackEveryItemAndItsHistory() throws Exception {
        long first=create(tester,bug()).path("id").asLong(), second=create(tester,bug()).path("id").asLong();
        var items=List.of(Map.of("id",first,"expectedVersion",0),Map.of("id",second,"expectedVersion",8));
        mvc.perform(post(path("/batch-transitions")).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(jsonBytes(json,Map.of("items",items,"status","ready","reason","Sẵn sàng")))).andExpect(status().isConflict());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_items WHERE project_id=? AND status_code='open'",Long.class,p)).isEqualTo(2);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_item_history WHERE project_id=? AND event_type='TRANSITION'",Long.class,p)).isZero();
        items=List.of(Map.of("id",first,"expectedVersion",0),Map.of("id",second,"expectedVersion",0));
        mvc.perform(post(path("/batch-transitions")).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(jsonBytes(json,Map.of("items",items,"status","ready","reason","Sẵn sàng")))).andExpect(status().isOk());
    }
    @Test void invalidAndCrossProjectSourcesLeaveNoBugOrCounterGap() throws Exception {
        var input=bug(); input.remove("attemptId"); input.put("environmentId",Long.MAX_VALUE);
        mvc.perform(post(path("")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isNotFound());
        input=bug(); input.put("buildId",null);
        mvc.perform(post(path("")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isUnprocessableEntity());
        input=bug(); input.put("revisionId",Long.MAX_VALUE);
        mvc.perform(post(path("")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isUnprocessableEntity());
        long ok=id(execution.record(p,tester.getId(),run,new ExecutionDtos.Attempt("OK",build,"","","","attempt-ok",1L)));
        input=bug(); input.put("attemptId",ok);
        mvc.perform(post(path("")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isUnprocessableEntity());
        assertThat(create(tester,bug()).path("key").asText()).endsWith("-1");
    }
    @Test void existingBugLinksAreIdempotentAndRejectWrongAttemptProjectOrVerdict() throws Exception {
        var input=bug();input.remove("attemptId"); long id=create(tester,input).path("id").asLong();
        for(int i=0;i<2;i++) mvc.perform(post(path("/"+id+"/execution-links")).with(actor(tester)).with(csrf()).contentType("application/json")
            .content(jsonBytes(json,Map.of("attemptId",attempt,"expectedVersion",0)))).andExpect(status().isOk());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_item_execution_links WHERE project_id=?",Long.class,p)).isEqualTo(1);
        mvc.perform(post(path("/"+id+"/execution-links")).with(actor(tester)).with(csrf()).contentType("application/json")
            .content(jsonBytes(json,Map.of("attemptId",Long.MAX_VALUE,"expectedVersion",1)))).andExpect(status().isNotFound());
        assertThatThrownBy(()->db.update("UPDATE work_item_execution_links SET run_item_id=? WHERE project_id=?",Long.MAX_VALUE,p)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
    @Test void commentsAreInternalIdempotentAndExternalReferencesAreAlwaysUnreconciled() throws Exception {
        long id=create(tester,bug()).path("id").asLong();
        var comment=new LinkedHashMap<String,Object>(Map.of("body","<script>alert('demo')</script>","visibility","INTERNAL","requestKey","comment-key"));
        for(int i=0;i<2;i++) mvc.perform(post(path("/"+id+"/comments")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,comment))).andExpect(status().isCreated());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_item_comments WHERE project_id=?",Long.class,p)).isEqualTo(1);
        comment.put("visibility","CUSTOMER");
        mvc.perform(post(path("/"+id+"/comments")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,comment))).andExpect(status().isUnprocessableEntity());
        var external=new LinkedHashMap<String,Object>(Map.of("provider","REDMINE","externalId","123","url","javascript:alert(1)","expectedVersion",0));
        mvc.perform(put(path("/"+id+"/external-reference")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,external))).andExpect(status().isUnprocessableEntity());
        external.put("url","https://tracker.example/issues/123");
        mvc.perform(put(path("/"+id+"/external-reference")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,external)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.externalReferences[0].reconciliationStatus").value("UNRECONCILED"));
        mvc.perform(get(path("/"+id+"/comments")).with(actor(other))).andExpect(status().isNotFound());
    }
    @Test void metadataFiltersPagingAndArchivedProjectAreEnforced() throws Exception {
        create(tester,bug()); create(tester,Map.of("type","TASK","title","Công việc thông thường","requestKey","task-no-bug"));
        mvc.perform(get(path("/metadata")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.statuses.length()").value(10)).andExpect(jsonPath("$.canTriage").value(false));
        mvc.perform(get(path("?type=TASK&keyword=thông&size=1")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get(path("?size=101")).with(actor(tester))).andExpect(status().isUnprocessableEntity());
        db.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",p);
        mvc.perform(post(path("")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,bug()))).andExpect(status().isConflict());
    }
    @Test void evidenceIsDurableScopedAndDownloadedAsAnAttachment() throws Exception {
        long id=create(tester,bug()).path("id").asLong();
        var bytes=new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",bytes);
        var file=new org.springframework.mock.web.MockMultipartFile("file","../../proof.png","image/png",bytes.toByteArray());
        String payload=mvc.perform(multipart(path("/"+id+"/attachments")).file(file).with(actor(tester)).with(csrf()))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("proof.png")).andReturn().getResponse().getContentAsString();
        String attachment=json.readTree(payload).path("id").asText();
        mvc.perform(multipart(path("/"+id+"/attachments")).file(file).with(actor(tester)).with(csrf())).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(attachment));
        mvc.perform(get(path("/"+id+"/attachments/"+attachment+"/content")).with(actor(tester)))
            .andExpect(status().isOk()).andExpect(header().string("X-Content-Type-Options","nosniff"))
            .andExpect(content().bytes(java.util.Objects.requireNonNull(bytes.toByteArray())));
        mvc.perform(get(path("/"+id+"/attachments/"+attachment+"/content")).with(actor(other))).andExpect(status().isNotFound());
        var evil=new org.springframework.mock.web.MockMultipartFile("file","proof.png","image/png","<html><script>alert(1)</script></html>".getBytes());
        mvc.perform(multipart(path("/"+id+"/attachments")).file(evil).with(actor(tester)).with(csrf())).andExpect(status().isUnprocessableEntity());
        mvc.perform(get(path("/"+id+"/attachments")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(delete(path("/"+id+"/attachments/"+attachment)).with(actor(tester)).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get(path("/"+id+"/attachments/"+attachment+"/content")).with(actor(tester))).andExpect(status().isNotFound());
        try(var files=java.nio.file.Files.list(evidenceRoot)) { assertThat(files.toList()).isEmpty(); }
    }
    @Test void ngBugKeepsTheAttemptSnapshotWhenCatalogNamesChange() throws Exception {
        catalogs.updateDevice(p,pm.getId(),device,new CatalogDtos.UpdateDevice("Tên thiết bị mới",null,null,null,true,0L));
        var created=create(tester,bug());
        assertThat(json.readTree(created.path("contextSnapshot").asText()).path("device").path("name").asText()).isEqualTo("Máy thử");
        mvc.perform(get(path("/sources/"+attempt)).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.actualResult").value("Màn hình trắng"));
    }
    @Test void pmEditAndClarificationPreserveHistoryAndCannotBypassStatusPolicy() throws Exception {
        long id=create(tester,bug()).path("id").asLong();
        var edit=new LinkedHashMap<String,Object>(Map.of("title","Tiêu đề đã sửa","description","Nội dung","priority","HIGH","assigneeMembershipId",member,"steps","Tái hiện","expectedResult","Đạt","actualResult","Không đạt","reason","Phân tích lại","expectedVersion",0));
        edit.put("status","closed");
        mvc.perform(put(path("/"+id)).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,edit))).andExpect(status().isForbidden());
        mvc.perform(put(path("/"+id)).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,edit)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("open")).andExpect(jsonPath("$.assignee").value("Tester thử"));
        var confirmation=Map.of("sourceKind","BRSE","sourceReference","Biên bản họp nội bộ 29/09","confirmedBy","Người xác nhận demo","confirmedAt","2026-09-20T01:00:00Z","conclusion","Đã xác nhận bước tái hiện","expectedVersion",1);
        mvc.perform(post(path("/"+id+"/clarifications")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,confirmation)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.clarifications[0].sourceKind").value("BRSE"));
        mvc.perform(get(path("/overview")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.statuses[0].count").value(1));
    }
    @Test void classificationIsPmOnlyAndFiltersMatchPersistedReferences() throws Exception {
        long category=catalogs.createCategory(p,pm.getId(),new CatalogDtos.CreateCategory("AUTH","Đăng nhập")).id();
        long milestone=catalogs.createMilestone(p,pm.getId(),new CatalogDtos.CreateMilestone("M1","Phát hành",null,null)).id();
        var input=bug();input.put("categoryId",category);input.put("milestoneId",milestone);input.put("assigneeMembershipId",member);input.put("priority","HIGH");
        mvc.perform(post(path("")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isForbidden());
        var created=create(pm,input);
        mvc.perform(get(path("?status=open&assignee="+member+"&category="+category+"&milestone="+milestone)).with(actor(tester)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(created.path("id").asLong()));
        for(String query:List.of("?page=-1","?size=0","?keyword="+"x".repeat(201))) mvc.perform(get(path(query)).with(actor(tester))).andExpect(status().isUnprocessableEntity());
        for(String field:List.of("categoryId","milestoneId","assigneeMembershipId")) {
            var invalid=bug();invalid.put(field,Long.MAX_VALUE);
            mvc.perform(post(path("")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,invalid))).andExpect(status().isNotFound());
        }
    }
    @Test void sourceContextCannotBeAlteredAndStandaloneStillNeedsEveryContextField() throws Exception {
        for(String field:List.of("revisionId","buildId","environmentId","deviceId")) {
            var input=bug();input.put(field,Long.MAX_VALUE);
            mvc.perform(post(path("")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isUnprocessableEntity());
        }
        for(String field:List.of("buildId","environmentId","deviceId")) {
            var input=bug();input.remove("attemptId");input.remove(field);
            mvc.perform(post(path("")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isUnprocessableEntity());
        }
        var standalone=bug();standalone.remove("attemptId");standalone.remove("revisionId");
        mvc.perform(post(path("")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,standalone))).andExpect(status().isUnprocessableEntity());
    }
    @Test void tasksCannotAcquireBugLinksAndNoopOrDuplicateBatchDoesNotWriteHistory() throws Exception {
        var invalid=bug();invalid.put("type","TASK");
        mvc.perform(post(path("")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,invalid))).andExpect(status().isUnprocessableEntity());
        invalid.remove("attemptId");
        mvc.perform(post(path("")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,invalid))).andExpect(status().isUnprocessableEntity());
        long task=create(tester,Map.of("type","TASK","title","Công việc","requestKey","task-fixture")).path("id").asLong();
        mvc.perform(post(path("/"+task+"/execution-links")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,Map.of("attemptId",attempt,"expectedVersion",0)))).andExpect(status().isUnprocessableEntity());
        move(pm,task,transition("open",0),200);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_item_history WHERE project_id=?",Long.class,p)).isEqualTo(1);
        var edit=Map.of("title","Công việc đã sửa","description","Mô tả","priority","LOW","reason","Điều chỉnh","expectedVersion",0);
        mvc.perform(put(path("/"+task)).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,edit))).andExpect(status().isOk());
        move(pm,task,transition("resolved",1),200);
        mvc.perform(post(path("/batch-transitions")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,Map.of("items",List.of(Map.of("id",task,"expectedVersion",2),Map.of("id",task,"expectedVersion",3)),"status","ready","reason","Thử yêu cầu trùng")))).andExpect(status().isUnprocessableEntity());
        assertThat(db.queryForObject("SELECT status_code FROM work_items WHERE id=?",String.class,task)).isEqualTo("resolved");
    }
    @Test void idempotencyKeysCannotBeReusedByAnotherActorOrChangedComment() throws Exception {
        var input=bug();long item=create(tester,input).path("id").asLong();
        mvc.perform(post(path("")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isConflict());
        var note=new LinkedHashMap<String,Object>(Map.of("body","Bình luận","visibility","INTERNAL","requestKey","same-key"));
        mvc.perform(post(path("/"+item+"/comments")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,note))).andExpect(status().isCreated());
        mvc.perform(post(path("/"+item+"/comments")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,note))).andExpect(status().isConflict());
        note.put("body","Bình luận khác");
        mvc.perform(post(path("/"+item+"/comments")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,note))).andExpect(status().isConflict());
        mvc.perform(get(path("/"+item+"/comments?before=1")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void trackerOwnershipAndUrlSafetyApplyToUpdatesToo() throws Exception {
        long first=create(tester,bug()).path("id").asLong(),second=create(tester,bug()).path("id").asLong();
        var external=new LinkedHashMap<String,Object>(Map.of("provider","REDMINE","externalId","123","url","https://tracker.example/123","expectedVersion",0));
        mvc.perform(put(path("/"+first+"/external-reference")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,external))).andExpect(status().isOk());
        mvc.perform(put(path("/"+second+"/external-reference")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,external))).andExpect(status().isConflict());
        external.put("expectedVersion",1);external.put("url","https://tracker.example/issues/123");
        mvc.perform(put(path("/"+first+"/external-reference")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,external))).andExpect(status().isOk());
        external.put("expectedVersion",2);
        for(String url:List.of("https:///missing-host","https://user:password@tracker.example/123")) {
            external.put("url",url);mvc.perform(put(path("/"+first+"/external-reference")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,external))).andExpect(status().isUnprocessableEntity());
        }
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_item_external_references WHERE project_id=?",Long.class,p)).isEqualTo(1);
    }
    @Test void evidenceRemovalNeedsOwnershipOrPmAndMissingStorageHasARecoverableError() throws Exception {
        long item=create(tester,bug()).path("id").asLong();projects.addOrUpdateMember(p,pm.getId(),other.getId(),new ProjectDtos.SetMember("MEMBER"));
        var proof=new org.springframework.mock.web.MockMultipartFile("file","proof.pdf","text/plain","%PDF-1.7\n%%EOF".getBytes());
        var attachment=evidence.upload(p,tester.getId(),item,proof);String attachmentId=attachment.get("id").toString();
        mvc.perform(delete(path("/"+item+"/attachments/"+attachmentId)).with(actor(other)).with(csrf())).andExpect(status().isForbidden());
        java.nio.file.Files.delete(evidenceRoot.resolve(attachmentId));
        mvc.perform(get(path("/"+item+"/attachments/"+attachmentId+"/content")).with(actor(tester))).andExpect(status().isServiceUnavailable());
        mvc.perform(delete(path("/"+item+"/attachments/"+attachmentId)).with(actor(pm)).with(csrf())).andExpect(status().isNoContent());
        var tooLarge=new org.springframework.mock.web.MockMultipartFile("file","proof.pdf","application/pdf",new byte[vn.syp.tms.attachment.EvidenceContent.MAX_BYTES+1]);
        mvc.perform(multipart(path("/"+item+"/attachments")).file(tooLarge).with(actor(tester)).with(csrf())).andExpect(status().isPayloadTooLarge());
    }
    @Test void simultaneousCreatesAllocateDistinctProjectNumbersAndRetryReturnsOriginal() throws Exception {
        var first=json.convertValue(bug(),WorkItemDtos.Create.class);var second=json.convertValue(bug(),WorkItemDtos.Create.class);
        var start=new java.util.concurrent.CountDownLatch(1);
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{start.await();return workItems.create(p,tester.getId(),first);});
            var b=pool.submit(()->{start.await();return workItems.create(p,tester.getId(),second);});start.countDown();
            var one=a.get(15,java.util.concurrent.TimeUnit.SECONDS);var two=b.get(15,java.util.concurrent.TimeUnit.SECONDS);
            assertThat(one.get("id")).isNotEqualTo(two.get("id"));assertThat(one.get("key")).isNotEqualTo(two.get("key"));
            assertThat(workItems.create(p,tester.getId(),first).get("id")).isEqualTo(one.get("id"));
        }
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_items WHERE project_id=?",Long.class,p)).isEqualTo(2);
        assertThat(db.queryForObject("SELECT next_value FROM project_counters WHERE project_id=? AND counter_code='WORK_ITEM'",Long.class,p)).isEqualTo(3);
    }
    @Test void failedAttachmentTransactionRemovesItsBlobAndReconciliationLeavesRecentFilesAlone() throws Exception {
        long id=create(tester,bug()).path("id").asLong();
        ProjectAudit auditTarget=org.springframework.test.util.AopTestUtils.getUltimateTargetObject(java.util.Objects.requireNonNull(audit));
        org.mockito.Mockito.doThrow(new IllegalStateException("test rollback")).when(auditTarget).record(p,tester.getId(),"WORK_ITEM",id,"ATTACH_EVIDENCE");
        var file=new org.springframework.mock.web.MockMultipartFile("file","proof.pdf","application/pdf","%PDF-1.7\n1 0 obj <<>> endobj\n%%EOF".getBytes());
        mvc.perform(multipart(path("/"+id+"/attachments")).file(file).with(actor(tester)).with(csrf())).andExpect(status().isInternalServerError());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_item_attachments WHERE project_id=?",Long.class,p)).isZero();
        try(var files=java.nio.file.Files.list(evidenceRoot)) { assertThat(files.toList()).isEmpty(); }
        var old=evidenceRoot.resolve(UUID.randomUUID().toString());var recent=evidenceRoot.resolve(UUID.randomUUID().toString());
        java.nio.file.Files.writeString(old,"orphan");java.nio.file.Files.writeString(recent,"upload still in flight");
        java.nio.file.Files.setLastModifiedTime(old,java.nio.file.attribute.FileTime.from(java.time.Instant.now().minusSeconds(172800)));
        assertThat(evidence.reconcileOrphans()).isEqualTo(1);
        assertThat(java.nio.file.Files.exists(old)).isFalse();assertThat(java.nio.file.Files.exists(recent)).isTrue();java.nio.file.Files.delete(recent);
    }
}
