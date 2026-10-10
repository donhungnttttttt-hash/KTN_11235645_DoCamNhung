package vn.syp.tms.retest;

import static vn.syp.tms.support.MockMvcContracts.jsonBytes;

import org.springframework.lang.NonNull;

import static vn.syp.tms.support.MockMvcContracts.csrf;
import vn.syp.tms.workitem.*;

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
class RetestIntegrationTest {
    @org.junit.jupiter.api.io.TempDir static java.nio.file.Path evidenceRoot;
    @Container static final MySQLContainer<?> mysql=new MySQLContainer<>("mysql:8.4.8");
    // JUnit @Container owns and closes this instance.
    static { mysql.withDatabaseName("tms_retest_test").withUsername("test").withPassword("ephemeral-test-only"); }
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

    JsonNode postJson(String endpoint,IdentityUser who,Object body,int expected) throws Exception {
        var response=mvc.perform(post(java.util.Objects.requireNonNull(endpoint)).with(actor(who)).with(csrf()).contentType("application/json").content(jsonBytes(json,body))).andExpect(status().is(expected)).andReturn().getResponse();
        return response.getContentAsString().isBlank()?json.nullNode():json.readTree(response.getContentAsString());
    }
    long resolvedBug() throws Exception {
        long bug=create(tester,bug()).path("id").asLong();
        postJson(path("/"+bug+"/transitions"),pm,Map.of("status","resolved","fixedBuildId",build,"reason","Dev báo đã sửa","expectedVersion",0),200);return bug;
    }
    @Test void naInvalidatesOpenCoverageAndKeepsNgHistoryAndFixedBuild() throws Exception {
        long bug=resolvedBug();var c=coverage(bug,List.of(run));
        var q=request(bug,c,List.of(c.path("items").get(0).path("id").asLong()),"BUG_ONLY",member);
        postJson("/api/v1/projects/"+p+"/run-items/"+run+"/scope-decisions",pm,Map.of("excluded",true,"reason","PM loại cấu hình","expectedVersion",1),200);
        mvc.perform(get("/api/v1/projects/"+p+"/retest-candidates").with(actor(pm)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        mvc.perform(get(path("/"+bug+"/retest")).with(actor(pm))).andExpect(status().isOk()).andExpect(jsonPath("$.coverage").isEmpty()).andExpect(jsonPath("$.canClose").value(false));
        mvc.perform(get(requestPath(q)).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED")).andExpect(jsonPath("$.canSubmit").value(false));
        assertThat(execution.run(p,tester.getId(),run).get("resultCode")).isEqualTo("NG");
        assertThat(workItems.get(p,pm.getId(),bug).get("fixedBuildId")).isEqualTo(build);
        postJson(path("/"+bug+"/retest-coverage"),pm,Map.of("runItemIds",List.of(run),"reason","Không nhận NA","expectedVersion",version(bug)),409);
    }

    @Test void cycleClosureNeedsAcknowledgementAndPausesRetestUntilPmReopens() throws Exception {
        long bug=resolvedBug();var c=coverage(bug,List.of(run));
        var q=request(bug,c,List.of(c.path("items").get(0).path("id").asLong()),"BUG_ONLY",member);
        long cycle=((Number)execution.run(p,pm.getId(),run).get("cycleId")).longValue();
        String endpoint="/api/v1/projects/"+p+"/test-cycles/"+cycle+"/decisions";
        postJson(endpoint,pm,Map.of("action","CLOSE","reason","Chốt có tồn đọng","expectedVersion",3),422);
        postJson(endpoint,pm,Map.of("action","CLOSE","reason","Chốt có tồn đọng","outstandingReason","Bug đã sửa, sẽ retest sau khi mở đợt","expectedVersion",3),200);
        mvc.perform(get(requestPath(q)).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.canSubmit").value(false));
        postJson(requestPath(q)+"/results",tester,submission(bug,q,"PASS"),409);
        postJson(endpoint,pm,Map.of("action","REOPEN","reason","Tiếp tục xác minh","expectedVersion",4),200);
        mvc.perform(get(requestPath(q)).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.canSubmit").value(true));
        postJson(requestPath(q)+"/results",tester,submission(bug,q,"PASS"),200);
    }

    @Test void onlyPmPlansCoverageAndBugOnlyPassNeverChangesTheNgAttempt() throws Exception {
        long bug=resolvedBug();var scope=Map.of("runItemIds",List.of(run),"reason","Đủ phạm vi","expectedVersion",1);
        postJson(path("/"+bug+"/retest-coverage"),tester,scope,403);
        var result=postJson(path("/"+bug+"/retest-coverage"),pm,scope,201);
        long coverage=result.path("coverage").path("id").asLong(),item=result.path("items").get(0).path("id").asLong();
        var request=postJson(path("/"+bug+"/retest-requests"),pm,Map.of("coverageRevisionId",coverage,"coverageItemIds",List.of(item),"verificationScope","BUG_ONLY","assigneeMembershipId",member,"reason","Kiểm tra bản sửa","expectedVersion",2,"requestKey","request-one"),201);
        long requestId=request.path("id").asLong();
        postJson("/api/v1/projects/"+p+"/retest-requests/"+requestId+"/results",tester,Map.of("results",List.of(Map.of("coverageItemId",item,"verdict","PASS","actualResult","Đã vào trang chủ","expectedRunVersion",1)),"expectedVersion",0,"expectedBugVersion",3,"requestKey","submit-one"),200);
        assertThat(execution.run(p,tester.getId(),run).get("resultCode")).isEqualTo("NG");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,p)).isEqualTo(1);
        mvc.perform(get(path("/"+bug+"/retest")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.passedCount").value(1)).andExpect(jsonPath("$.canClose").value(true));
    }

    @Test void cycleClosureAcknowledgesBugFromPmCoverageEvenWithoutExecutionLink() throws Exception {
        long bug=resolvedBug(),second=secondRun(member);
        coverage(bug,List.of(run,second));
        execution.record(p,tester.getId(),second,new ExecutionDtos.Attempt("OK",build,"Đạt toàn case","","","covered-only-ok",0L));
        long cycle=((Number)execution.run(p,pm.getId(),second).get("cycleId")).longValue();
        String endpoint="/api/v1/projects/"+p+"/test-cycles/"+cycle+"/decisions";
        postJson(endpoint,pm,Map.of("action","CLOSE","reason","Chốt khi case đạt nhưng bug còn mở","expectedVersion",3),422);
        assertThat(execution.cycle(p,pm.getId(),cycle).get("statusCode")).isEqualTo("ACTIVE");
        postJson(endpoint,pm,Map.of("action","CLOSE","reason","Chốt khi case đạt nhưng bug còn mở","outstandingReason","Bug thuộc phạm vi PM đã xác nhận vẫn chờ xác minh","expectedVersion",3),200);
        var history=json.readTree(mvc.perform(get(endpoint).with(actor(tester))).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString());
        assertThat(json.readTree(history.path("items").get(0).path("scopeSnapshot").asText()).path("openBugs").asInt()).isEqualTo(1);
    }

    long version(long bug) { return ((Number)workItems.get(p,pm.getId(),bug).get("version")).longValue(); }
    JsonNode coverage(long bug,List<Long> runs) throws Exception { return postJson(path("/"+bug+"/retest-coverage"),pm,Map.of("runItemIds",runs,"reason","PM xác nhận toàn phạm vi","expectedVersion",version(bug)),201); }
    JsonNode request(long bug,JsonNode coverage,List<Long> items,String scope,long assignee) throws Exception {
        return postJson(path("/"+bug+"/retest-requests"),pm,Map.of("coverageRevisionId",coverage.path("coverage").path("id").asLong(),"coverageItemIds",items,"verificationScope",scope,"assigneeMembershipId",assignee,"reason","Xác minh bản sửa","expectedVersion",version(bug),"requestKey",UUID.randomUUID().toString()),201);
    }
    @NonNull String requestPath(JsonNode request) { return "/api/v1/projects/"+p+"/retest-requests/"+request.path("id").asLong(); }
    Map<String,Object> submission(long bug,JsonNode request,String verdict) {
        List<Map<String,Object>> results=new ArrayList<>();
        request.path("items").forEach(item->results.add(Map.of("coverageItemId",item.path("id").asLong(),"verdict",verdict,"actualResult","Kết quả thực tế đã đối chiếu","expectedRunVersion",item.path("runVersion").asLong())));
        return new LinkedHashMap<>(Map.of("results",results,"expectedVersion",request.path("version").asLong(),"expectedBugVersion",version(bug),"requestKey",UUID.randomUUID().toString()));
    }
    long secondRun(long assigned) {
        long cycle=id(execution.create(p,pm.getId(),new ExecutionDtos.CreateCycle("C2","Bổ sung phạm vi",null)));
        execution.configure(p,pm.getId(),cycle,new ExecutionDtos.Configuration(env,device,build,0L));
        long config=id(execution.configurations(p,pm.getId(),cycle).getFirst());
        execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(revision),assigned,1L));
        execution.activate(p,pm.getId(),cycle,new ExecutionDtos.Version(2L));
        return id(execution.runs(p,pm.getId(),cycle,0,20,false,false).items().getFirst());
    }
    @Test void coverageAccumulatesAcrossRequestsAndOnlyPmCanCloseOrReopen() throws Exception {
        long bug=resolvedBug(),second=secondRun(member);var c=coverage(bug,List.of(run,second));
        var one=request(bug,c,List.of(c.path("items").get(0).path("id").asLong()),"BUG_ONLY",member);
        postJson(requestPath(one)+"/results",tester,submission(bug,one,"PASS"),200);
        postJson(path("/"+bug+"/closure"),pm,Map.of("kind","FIXED","reason","Đủ phạm vi","expectedVersion",version(bug)),422);
        var two=request(bug,c,List.of(c.path("items").get(1).path("id").asLong()),"FULL_CASE",member);
        var payload=submission(bug,two,"PASS");
        postJson(requestPath(two)+"/results",tester,payload,200);
        postJson(requestPath(two)+"/results",tester,payload,200);
        assertThat(execution.run(p,tester.getId(),second).get("resultCode")).isEqualTo("OK");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=? AND run_item_id=?",Long.class,p,second)).isEqualTo(1);
        postJson(path("/"+bug+"/closure"),tester,Map.of("kind","FIXED","reason","Đủ phạm vi","expectedVersion",version(bug)),403);
        postJson(path("/"+bug+"/closure"),pm,Map.of("kind","FIXED","reason","Đủ phạm vi","expectedVersion",version(bug)),200);
        assertThat(workItems.get(p,pm.getId(),bug).get("status")).isEqualTo("closed");
        postJson(path("/"+bug+"/transitions"),pm,Map.of("status","progress","reason","Đi vòng","expectedVersion",version(bug)),422);
        postJson(path("/"+bug+"/reopen"),tester,Map.of("reason","Tái phát","expectedVersion",version(bug)),403);
        postJson(path("/"+bug+"/reopen"),pm,Map.of("reason","Tái phát trên thiết bị khác","expectedVersion",version(bug)),200);
        assertThat(workItems.get(p,pm.getId(),bug).get("fixedBuildId")).isNull();
        postJson(path("/"+bug+"/closure"),pm,Map.of("kind","FIXED","reason","Dùng kết quả cũ","expectedVersion",version(bug)),422);
    }
    @Test void failedRetestReturnsToProgressCancelsOtherRequestsAndNewBuildCannotUseOldPass() throws Exception {
        long bug=resolvedBug();var c=coverage(bug,List.of(run));long item=c.path("items").get(0).path("id").asLong();
        var pass=request(bug,c,List.of(item),"BUG_ONLY",member);postJson(requestPath(pass)+"/results",tester,submission(bug,pass,"PASS"),200);
        var fail=request(bug,c,List.of(item),"FULL_CASE",member);var pending=request(bug,c,List.of(item),"BUG_ONLY",member);
        postJson(requestPath(fail)+"/results",tester,submission(bug,fail,"FAIL"),200);
        assertThat(workItems.get(p,pm.getId(),bug).get("status")).isEqualTo("progress");
        mvc.perform(get(requestPath(pending)).with(actor(tester))).andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(execution.run(p,tester.getId(),run).get("resultCode")).isEqualTo("NG");
        long newBuild=catalogs.createBuild(p,pm.getId(),new CatalogDtos.CreateBuild("1.1","2","WEB","",null)).id();
        assertThat(execution.run(p,tester.getId(),run).get("pendingBugLink")).isEqualTo(false);
        postJson(path("/"+bug+"/transitions"),pm,Map.of("status","resolved","fixedBuildId",newBuild,"reason","Sửa lại","expectedVersion",version(bug)),200);
        mvc.perform(get(path("/"+bug+"/retest")).with(actor(tester))).andExpect(jsonPath("$.canClose").value(false)).andExpect(jsonPath("$.passedCount").value(0));
        postJson(requestPath(pending)+"/results",tester,submission(bug,pending,"PASS"),409);
    }
    @Test void submissionAndFullExecutionRollbackTogetherWhenClosureCoverageIsIncomplete() throws Exception {
        long owner=java.util.Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,pm.getId()));
        execution.assign(p,pm.getId(),run,new ExecutionDtos.Assignment(owner,"PM kiểm tra",1L));
        long bug=resolvedBug(),second=secondRun(owner);var c=coverage(bug,List.of(run,second));
        var q=request(bug,c,List.of(c.path("items").get(0).path("id").asLong()),"FULL_CASE",owner);
        var body=submission(bug,q,"PASS");body.put("closeBug",true);body.put("closureReason","Đề nghị đóng");
        long before=version(bug);postJson(requestPath(q)+"/results",pm,body,422);
        assertThat(version(bug)).isEqualTo(before);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM bug_verification_attempts WHERE project_id=?",Long.class,p)).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,p)).isEqualTo(1);
        assertThat(execution.run(p,pm.getId(),run).get("resultCode")).isEqualTo("NG");
        mvc.perform(get(requestPath(q)).with(actor(pm))).andExpect(jsonPath("$.status").value("OPEN"));
    }
    @Test void replacedCoverageStaleVersionsAndWrongActorsAreRejectedWithoutWrites() throws Exception {
        long bug=resolvedBug();var c=coverage(bug,List.of(run));var q=request(bug,c,List.of(c.path("items").get(0).path("id").asLong()),"BUG_ONLY",member);
        postJson(requestPath(q)+"/results",pm,submission(bug,q,"PASS"),403);
        mvc.perform(get(requestPath(q)).with(actor(other))).andExpect(status().isNotFound());
        var stale=submission(bug,q,"PASS");stale.put("expectedBugVersion",0);postJson(requestPath(q)+"/results",tester,stale,409);
        var incomplete=submission(bug,q,"PASS");incomplete.put("results",List.of(Map.of("coverageItemId",99999,"verdict","PASS","actualResult","Không thuộc phạm vi","expectedRunVersion",0)));postJson(requestPath(q)+"/results",tester,incomplete,422);
        coverage(bug,List.of(run));postJson(requestPath(q)+"/results",tester,submission(bug,q,"PASS"),409);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM bug_verification_attempts WHERE project_id=?",Long.class,p)).isZero();
    }
    @Test void exceptionClosureRequiresOwnedEvidenceAndProtectsItFromDeletion() throws Exception {
        long bug=resolvedBug();
        postJson(path("/"+bug+"/closure"),pm,Map.of("kind","WONTFIX","reason","Theo xác nhận","sourceReference","Biên bản PM","expectedVersion",version(bug)),422);
        String evidenceId=UUID.randomUUID().toString();long owner=java.util.Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,pm.getId()));
        db.update("INSERT INTO work_item_attachments(id,project_id,work_item_id,original_name,media_type,byte_size,sha256,uploaded_by,uploaded_at) VALUES(?,?,?,'evidence.pdf','application/pdf',10,?,?,UTC_TIMESTAMP(6))",evidenceId,p,bug,"a".repeat(64),owner);
        postJson(path("/"+bug+"/closure"),pm,Map.of("kind","WONTFIX","reason","Ngoài phạm vi sản phẩm","evidenceAttachmentId",evidenceId,"sourceReference","Biên bản PM 29/09","expectedVersion",version(bug)),200);
        mvc.perform(delete(path("/"+bug+"/attachments/"+evidenceId)).with(actor(pm)).with(csrf())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EVIDENCE_IN_USE"));
        assertThat(workItems.get(p,pm.getId(),bug).get("status")).isEqualTo("wontfix");
    }
    @Test void assignedPmMaySubmitAndCloseAtomicallyAndRetryDoesNotDuplicate() throws Exception {
        long owner=java.util.Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,pm.getId()));
        execution.assign(p,pm.getId(),run,new ExecutionDtos.Assignment(owner,"PM thực hiện",1L));
        long bug=resolvedBug();var c=coverage(bug,List.of(run));var q=request(bug,c,List.of(c.path("items").get(0).path("id").asLong()),"FULL_CASE",owner);
        var body=submission(bug,q,"PASS");body.put("closeBug",true);body.put("closureReason","Đủ case và cấu hình đã chốt");
        postJson(requestPath(q)+"/results",pm,body,200);postJson(requestPath(q)+"/results",pm,body,200);
        assertThat(workItems.get(p,pm.getId(),bug).get("status")).isEqualTo("closed");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM bug_closure_decisions WHERE project_id=?",Long.class,p)).isEqualTo(1);
        body.put("requestKey","different-key");postJson(requestPath(q)+"/results",pm,body,409);
    }
    @Test void queueCandidatesValidationAndProjectBoundariesAreEnforced() throws Exception {
        long bug=resolvedBug();
        mvc.perform(get("/api/v1/projects/"+p+"/retest-candidates").param("keyword","TC-1").with(actor(pm))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/projects/"+p+"/retest-candidates").param("keyword","%'").with(actor(pm))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        postJson(path("/"+bug+"/retest-coverage"),pm,Map.of("runItemIds",List.of(run,run),"reason","Trùng","expectedVersion",version(bug)),422);
        postJson(path("/"+bug+"/retest-coverage"),pm,Map.of("runItemIds",List.of(999999),"reason","Sai dự án","expectedVersion",version(bug)),404);
        var c=coverage(bug,List.of(run));long item=c.path("items").get(0).path("id").asLong();
        var input=new LinkedHashMap<String,Object>(Map.of("coverageRevisionId",c.path("coverage").path("id").asLong(),"coverageItemIds",List.of(item),"verificationScope","BUG_ONLY","assigneeMembershipId",member,"reason","Thử lại","expectedVersion",version(bug),"requestKey","creation-key"));
        var q=postJson(path("/"+bug+"/retest-requests"),pm,input,201);var duplicate=postJson(path("/"+bug+"/retest-requests"),pm,input,201);assertThat(duplicate.path("id")).isEqualTo(q.path("id"));
        input.put("reason","Nội dung khác");postJson(path("/"+bug+"/retest-requests"),pm,input,409);
        mvc.perform(get("/api/v1/projects/"+p+"/retest-requests").with(actor(tester))).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/projects/"+p+"/retest-requests").with(actor(pm))).andExpect(jsonPath("$.totalItems").value(0));
        mvc.perform(get("/api/v1/projects/"+p+"/retest-requests").param("mine","false").param("status","OPEN").with(actor(pm))).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/projects/"+p+"/retest-requests").param("status","FAKE").with(actor(pm))).andExpect(status().isUnprocessableEntity());
        mvc.perform(get(path("/"+bug+"/retest"))).andExpect(status().isUnauthorized());
        mvc.perform(post(requestPath(q)+"/results").with(actor(tester)).contentType("application/json").content(jsonBytes(json,submission(bug,q,"PASS")))).andExpect(status().isForbidden());
        var invalid=submission(bug,q,"PASS");invalid.put("results",Collections.singletonList(null));postJson(requestPath(q)+"/results",tester,invalid,422);
    }
    @Test void changedAssignmentInactiveCycleAndArchivedProjectCannotAcceptRetest() throws Exception {
        long bug=resolvedBug();var c=coverage(bug,List.of(run));var q=request(bug,c,List.of(c.path("items").get(0).path("id").asLong()),"BUG_ONLY",member);
        long owner=java.util.Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,pm.getId()));
        execution.assign(p,pm.getId(),run,new ExecutionDtos.Assignment(owner,"Phân công lại",1L));
        var body=submission(bug,q,"PASS");
        postJson(requestPath(q)+"/results",tester,body,409);
        var updatedResults=List.of(Map.of("coverageItemId",c.path("items").get(0).path("id").asLong(),"verdict","PASS","actualResult","Thử sau đổi người","expectedRunVersion",2));body.put("results",updatedResults);
        postJson(requestPath(q)+"/results",tester,body,409);
        mvc.perform(get(requestPath(q)).with(actor(tester))).andExpect(jsonPath("$.canSubmit").value(false));
        execution.assign(p,pm.getId(),run,new ExecutionDtos.Assignment(member,"Trả lại",2L));
        db.update("UPDATE test_cycles SET status_code='DRAFT',activated_at=NULL,activated_by=NULL WHERE project_id=?",p);
        postJson(requestPath(q)+"/results",tester,body,409);
        db.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",p);
        postJson(path("/"+bug+"/closure"),pm,Map.of("kind","FIXED","reason","Đã lưu trữ","expectedVersion",version(bug)),409);
        mvc.perform(get(requestPath(q)).with(actor(tester))).andExpect(status().isOk());
    }
    @Test void concurrentDuplicateSubmissionsSerializeIntoOneVerification() throws Exception {
        long bug=resolvedBug();var c=coverage(bug,List.of(run));var q=request(bug,c,List.of(c.path("items").get(0).path("id").asLong()),"FULL_CASE",member);var body=submission(bug,q,"PASS");
        var start=new java.util.concurrent.CountDownLatch(1);
        try(var workers=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Integer> send=()->{start.await();return mvc.perform(post(requestPath(q)+"/results").with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,body))).andReturn().getResponse().getStatus();};
            var first=workers.submit(send);var second=workers.submit(send);start.countDown();
            assertThat(first.get(30,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(200);assertThat(second.get(30,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(200);
        }
        assertThat(db.queryForObject("SELECT COUNT(*) FROM bug_verification_attempts WHERE project_id=?",Long.class,p)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,p)).isEqualTo(2);
    }
    @Test void eachRequestMustUseOneConfigurationAndItsActualAssignee() throws Exception {
        long bug=resolvedBug();long originalDevice=device;
        device=catalogs.createDevice(p,pm.getId(),new CatalogDtos.CreateDevice("PHONE","Điện thoại","Phone","Android","14")).id();
        long phone=secondRun(member);device=originalDevice;
        var c=coverage(bug,List.of(run,phone));var ids=new ArrayList<Long>();c.path("items").forEach(i->ids.add(i.path("id").asLong()));
        long owner=java.util.Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,pm.getId()));
        var body=new LinkedHashMap<String,Object>(Map.of("coverageRevisionId",c.path("coverage").path("id").asLong(),"coverageItemIds",ids,"verificationScope","BUG_ONLY","assigneeMembershipId",member,"reason","Không gộp thiết bị","expectedVersion",version(bug),"requestKey","config-test"));
        postJson(path("/"+bug+"/retest-requests"),pm,body,422);
        body.put("coverageItemIds",List.of(ids.getFirst()));body.put("assigneeMembershipId",owner);postJson(path("/"+bug+"/retest-requests"),pm,body,422);
        body.put("assigneeMembershipId",member);body.put("coverageRevisionId",99999);postJson(path("/"+bug+"/retest-requests"),pm,body,409);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM retest_requests WHERE project_id=?",Long.class,p)).isZero();
    }
    @Test void evidenceFromAnotherBugIsRejectedAndAcceptedVerificationEvidenceIsRetained() throws Exception {
        long bug=resolvedBug(),otherBug=create(tester,bug()).path("id").asLong();var c=coverage(bug,List.of(run));var q=request(bug,c,List.of(c.path("items").get(0).path("id").asLong()),"BUG_ONLY",member);
        String evidenceId=UUID.randomUUID().toString();
        db.update("INSERT INTO work_item_attachments(id,project_id,work_item_id,original_name,media_type,byte_size,sha256,uploaded_by,uploaded_at) VALUES(?,?,?,'evidence.pdf','application/pdf',10,?,?,UTC_TIMESTAMP(6))",evidenceId,p,otherBug,"a".repeat(64),member);
        var body=submission(bug,q,"PASS");body.put("results",List.of(Map.of("coverageItemId",c.path("items").get(0).path("id").asLong(),"verdict","PASS","actualResult","Đã đối chiếu","evidenceAttachmentId",evidenceId,"expectedRunVersion",1)));
        postJson(requestPath(q)+"/results",tester,body,404);
        db.update("UPDATE work_item_attachments SET work_item_id=? WHERE id=?",bug,evidenceId);
        postJson(requestPath(q)+"/results",tester,body,200);
        mvc.perform(delete(path("/"+bug+"/attachments/"+evidenceId)).with(actor(tester)).with(csrf())).andExpect(status().isConflict());
        postJson(path("/"+otherBug+"/closure"),pm,Map.of("kind","UNREPRODUCIBLE","reason","Không tái hiện","evidenceAttachmentId",evidenceId,"sourceReference","PM xác nhận","expectedVersion",version(otherBug)),404);
        postJson(path("/"+bug+"/closure"),pm,Map.of("kind","UNREPRODUCIBLE","reason","Không tái hiện","evidenceAttachmentId",evidenceId,"expectedVersion",version(bug)),422);
        postJson(path("/"+bug+"/closure"),pm,Map.of("kind","UNREPRODUCIBLE","reason","Không tái hiện","evidenceAttachmentId",evidenceId,"sourceReference","PM xác nhận","expectedVersion",version(bug)),200);
        assertThat(workItems.get(p,pm.getId(),bug).get("status")).isEqualTo("unreproducible");
    }
    @Test void requestCannotOmitAnySelectedCaseAndRequiresEligibleApprovedContent() throws Exception {
        long bug=resolvedBug(),second=secondRun(member);var c=coverage(bug,List.of(run,second));var ids=new ArrayList<Long>();c.path("items").forEach(i->ids.add(i.path("id").asLong()));
        var q=request(bug,c,ids,"BUG_ONLY",member);var body=submission(bug,q,"PASS");
        body.put("results",List.of(Map.of("coverageItemId",ids.getFirst(),"verdict","PASS","actualResult","Chỉ một case","expectedRunVersion",1)));
        postJson(requestPath(q)+"/results",tester,body,422);
        db.update("UPDATE test_cases SET archived_at=UTC_TIMESTAMP(6) WHERE project_id=?",p);
        postJson(requestPath(q)+"/results",tester,submission(bug,q,"PASS"),409);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM bug_verification_attempts WHERE project_id=?",Long.class,p)).isZero();
    }
    @Test void retestDoesNotApplyToOrdinaryTasksOrUnresolvedBugsAndCannotReopenAnOpenBug() throws Exception {
        long task=create(tester,Map.of("type","TASK","title","Công việc thường","requestKey",UUID.randomUUID().toString())).path("id").asLong();
        mvc.perform(get(path("/"+task+"/retest")).with(actor(tester))).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("BUG_REQUIRED"));
        long bug=create(tester,bug()).path("id").asLong();
        postJson(path("/"+bug+"/retest-coverage"),pm,Map.of("runItemIds",List.of(run),"reason","Chưa sửa","expectedVersion",version(bug)),409);
        postJson(path("/"+bug+"/reopen"),pm,Map.of("reason","Chưa từng kết thúc","expectedVersion",version(bug)),422);
    }
    @Test void standaloneBugCoverageShowsOtherOpenBugsOnTheSelectedRuns() throws Exception {
        long existing=create(tester,bug()).path("id").asLong();
        var standalone=bug();standalone.remove("attemptId");standalone.remove("revisionId");standalone.put("standaloneReason","PM bổ sung case sau");
        long bug=create(pm,standalone).path("id").asLong();
        postJson(path("/"+bug+"/transitions"),pm,Map.of("status","resolved","reason","Bản sửa đã có","fixedBuildId",build,"expectedVersion",0),200);
        coverage(bug,List.of(run));
        mvc.perform(get(path("/"+bug+"/retest")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.otherOpenBugs[0].id").value(existing));
    }
}
