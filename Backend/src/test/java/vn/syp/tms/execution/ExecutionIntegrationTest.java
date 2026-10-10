package vn.syp.tms.execution;

import static vn.syp.tms.support.MockMvcContracts.jsonBytes;

import org.springframework.lang.NonNull;

import static vn.syp.tms.support.MockMvcContracts.csrf;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.*;
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
import vn.syp.tms.shared.web.BusinessException;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
class ExecutionIntegrationTest {
    @Container static final MySQLContainer<?> mysql=new MySQLContainer<>("mysql:8.4.8");
    // JUnit @Container owns and closes this instance.
    static { mysql.withDatabaseName("tms_execution_test").withUsername("test").withPassword("ephemeral-test-only"); }
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        r.add("TMS_DB_URL",mysql::getJdbcUrl); r.add("TMS_DB_USER",mysql::getUsername); r.add("TMS_DB_PASSWORD",mysql::getPassword);
        r.add("TMS_MIGRATION_USER",mysql::getUsername); r.add("TMS_MIGRATION_PASSWORD",mysql::getPassword);
    }
    @Autowired ExecutionService execution;
    @Autowired ProjectService projects;
    @Autowired TestCaseService library;
    @Autowired CatalogService catalogs;
    @Autowired IdentityUserRepository users;
    @Autowired JdbcTemplate db;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    IdentityUser pm,tester,other;
    long p,suite,caseId,revision,env,device,build,cycle,config,member;
    @BeforeEach void fixture() {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        pm=users.saveAndFlush(new IdentityUser("owner."+suffix,"PM thử","unused-hash","ADMIN"));
        tester=users.saveAndFlush(new IdentityUser("tester."+suffix,"Tester thử","unused-hash","TESTER"));
        other=users.saveAndFlush(new IdentityUser("other."+suffix,"Ngoài dự án","unused-hash","ADMIN"));
        p=projects.create(pm.getId(),new ProjectDtos.CreateProject("E"+suffix,"Dự án execution","","UTC")).id();
        member=projects.addOrUpdateMember(p,pm.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER")).membershipId();
        suite=library.createSuite(p,pm.getId(),new TestCaseDtos.CreateSuite("AUTH","Đăng nhập","",null,0)).id();
        var c=createCase("TC-1");caseId=c.id();revision=c.currentRevisionId();
        library.approveRevision(p,pm.getId(),caseId,revision);
        env=catalogs.createEnvironment(p,pm.getId(),new CatalogDtos.CreateEnvironment("QA","QA thử","")).id();
        device=catalogs.createDevice(p,pm.getId(),new CatalogDtos.CreateDevice("WEB","Máy thử","PC","Windows","11")).id();
        build=catalogs.createBuild(p,pm.getId(),new CatalogDtos.CreateBuild("1.0","1","WEB","",null)).id();
        cycle=id(execution.create(p,pm.getId(),new ExecutionDtos.CreateCycle("C1","Hồi quy",null)));
        execution.configure(p,pm.getId(),cycle,new ExecutionDtos.Configuration(env,device,build,0L));
        config=id(execution.configurations(p,pm.getId(),cycle).getFirst());
    }
    TestCaseDtos.CaseDetail createCase(String code) { return library.createCase(p,pm.getId(),new TestCaseDtos.CreateCase(code,suite,"Đăng nhập","Có tài khoản","Nhập thông tin","Vào trang chủ","原文",null,"手順","結果","source.xlsx")); }
    long id(Map<String,Object> m) { return ((Number)m.get("id")).longValue(); }
    long number(Map<String,Object> m,String key) { return ((Number)m.get(key)).longValue(); }
    long prepare() {
        execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(revision),member,1L));
        execution.activate(p,pm.getId(),cycle,new ExecutionDtos.Version(2L));
        return id(execution.runs(p,tester.getId(),cycle,0,20,false,false).items().getFirst());
    }
    ExecutionDtos.Attempt attempt(String key,String result,long version) { return new ExecutionDtos.Attempt(result,build,"Không mở được trang chủ","Lần chạy xác nhận","video-login.mp4",key,version); }
    void error(int code,org.assertj.core.api.ThrowableAssert.ThrowingCallable call) { assertThatThrownBy(call).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(code)); }
    @NonNull RequestPostProcessor actor(IdentityUser u) { return java.util.Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(u.getId(),u.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole()))))); }
    @NonNull String path(String tail) { return "/api/v1/projects/"+p+tail; }

    @Test void archivedCasesAndSuitesCannotEnterScopeEvenWithApprovedRevisions() {
        db.update("UPDATE test_cases SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",caseId);
        error(422,()->execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(revision),member,1L)));
        db.update("UPDATE test_cases SET archived_at=NULL WHERE id=?",caseId);
        db.update("UPDATE test_suites SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",suite);
        error(422,()->execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(revision),member,1L)));
        assertThat(execution.runs(p,pm.getId(),cycle,0,20,false,false).totalItems()).isZero();
        assertThat(number(execution.cycle(p,pm.getId(),cycle),"version")).isEqualTo(1);
    }

    @Test void idempotencyKeysCannotBeReusedByAnotherActorOrForAnotherRun() {
        long run=prepare();
        execution.record(p,tester.getId(),run,attempt("request-boundary","NG",0));
        long pmMember=projects.listMembers(p,pm.getId()).stream().filter(m->m.userId().equals(pm.getId())).findFirst().orElseThrow().membershipId();
        execution.assign(p,pm.getId(),run,new ExecutionDtos.Assignment(pmMember,"PM kiểm tra lại",1L));
        error(409,()->execution.record(p,pm.getId(),run,attempt("request-boundary","NG",0)));
        long secondCycle=id(execution.create(p,pm.getId(),new ExecutionDtos.CreateCycle("C2","Đợt độc lập",null)));
        execution.configure(p,pm.getId(),secondCycle,new ExecutionDtos.Configuration(env,device,build,0L));
        long secondConfig=id(execution.configurations(p,pm.getId(),secondCycle).getFirst());
        execution.addScope(p,pm.getId(),secondCycle,new ExecutionDtos.AddScope(secondConfig,List.of(revision),member,1L));
        execution.activate(p,pm.getId(),secondCycle,new ExecutionDtos.Version(2L));
        long secondRun=id(execution.runs(p,tester.getId(),secondCycle,0,20,false,false).items().getFirst());
        error(409,()->execution.record(p,tester.getId(),secondRun,attempt("request-boundary","NG",0)));
        assertThat(execution.attempts(p,tester.getId(),run,0,20).totalItems()).isEqualTo(1);
        assertThat(execution.attempts(p,tester.getId(),secondRun,0,20).totalItems()).isZero();
    }

    @Test void freezesApprovedRevisionAndActivationIsIdempotent() {
        long run=prepare();
        var activated=execution.activate(p,pm.getId(),cycle,new ExecutionDtos.Version(0L));
        assertThat(number(activated,"version")).isEqualTo(3);
        var newer=library.addRevision(p,pm.getId(),caseId,new TestCaseDtos.CreateRevision("Nội dung mới","","Bước mới","Kỳ vọng mới",null,null,null,null,null,revision));
        assertThat(newer.id()).isNotEqualTo(revision);
        assertThat(number(execution.run(p,tester.getId(),run),"revisionId")).isEqualTo(revision);
        error(409,()->execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(newer.id()),member,3L)));
    }

    @Test void rejectedScopeIsAtomicAndRequiresApprovedSameProjectCase() {
        var draft=createCase("TC-DRAFT");
        error(422,()->execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(revision,draft.currentRevisionId()),member,1L)));
        assertThat(execution.runs(p,pm.getId(),cycle,0,20,false,false).totalItems()).isZero();
        error(409,()->execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(revision,revision),member,1L)));
        assertThat(execution.runs(p,pm.getId(),cycle,0,20,false,false).totalItems()).isZero();
        error(404,()->execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(Long.MAX_VALUE),member,1L)));
        error(422,()->execution.activate(p,pm.getId(),cycle,new ExecutionDtos.Version(1L)));
    }

    @Test void attemptHistorySnapshotsIdempotencyAndPendingBugProjection() throws Exception {
        long run=prepare();var first=execution.record(p,tester.getId(),run,attempt("request-0001","NG",0));
        assertThat(execution.record(p,tester.getId(),run,attempt("request-0001","NG",0)).get("id")).isEqualTo(first.get("id"));
        error(409,()->execution.record(p,tester.getId(),run,attempt("request-0001","OK",0)));
        assertThat(execution.runs(p,tester.getId(),cycle,0,20,true,true).totalItems()).isEqualTo(1);
        catalogs.updateDevice(p,pm.getId(),device,new CatalogDtos.UpdateDevice("Máy đã đổi tên",null,null,null,true,0L));
        var second=execution.record(p,tester.getId(),run,attempt("request-0002","OK",1));
        assertThat(number(second,"attemptNo")).isEqualTo(2);
        var history=execution.attempts(p,tester.getId(),run,0,20);
        assertThat(history.totalItems()).isEqualTo(2);
        assertThat(history.items().get(1).get("resultCode")).isEqualTo("NG");
        assertThat(json.readTree(history.items().get(1).get("contextSnapshot").toString()).path("device").path("name").asText()).isEqualTo("Máy thử");
        assertThat(execution.runs(p,tester.getId(),cycle,0,20,true,true).totalItems()).isZero();
        assertThat(number(execution.run(p,tester.getId(),run),"latestAttemptId")).isEqualTo(id(second));
    }

    @Test void assignmentHistoryDoesNotRewriteExecutorAndRejectsStaleWrites() {
        long run=prepare();execution.record(p,tester.getId(),run,attempt("request-assign","NG",0));
        long pmMember=projects.listMembers(p,pm.getId()).stream().filter(m->m.userId().equals(pm.getId())).findFirst().orElseThrow().membershipId();
        error(409,()->execution.assign(p,pm.getId(),run,new ExecutionDtos.Assignment(pmMember,"Chuyển người",0L)));
        execution.assign(p,pm.getId(),run,new ExecutionDtos.Assignment(pmMember,"Chuyển người",1L));
        assertThat(execution.assignments(p,pm.getId(),run)).hasSize(2);
        assertThat(number(execution.attempts(p,pm.getId(),run,0,20).items().getFirst(),"executorMembershipId")).isEqualTo(member);
        error(403,()->execution.record(p,tester.getId(),run,attempt("request-new-assignee","OK",2)));
        assertThat(execution.record(p,tester.getId(),run,attempt("request-assign","NG",0)).get("resultCode")).isEqualTo("NG");
        execution.record(p,pm.getId(),run,attempt("request-pm-run","OK",2));
    }

    @Test void authorizationCsrfResultValidationAndNoClientActorOverride() throws Exception {
        long run=prepare();
        mvc.perform(get(path("/test-cycles")).with(actor(other))).andExpect(status().isNotFound());
        mvc.perform(post(path("/test-cycles")).with(actor(tester)).with(csrf()).contentType("application/json").content("{\"code\":\"DENIED\",\"name\":\"Không được\"}")).andExpect(status().isForbidden());
        String endpoint=path("/run-items/"+run+"/attempts");
        mvc.perform(post(endpoint).with(actor(tester)).contentType("application/json").content(jsonBytes(json,attempt("request-no-csrf","NG",0)))).andExpect(status().isForbidden());
        for(String invalid:List.of("Fix","NA","NOT_RUN")) mvc.perform(post(endpoint).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,attempt("request-invalid",""+invalid,0)))).andExpect(status().isUnprocessableEntity());
        var input=json.valueToTree(attempt("request-spoof-actor","NG",0));((com.fasterxml.jackson.databind.node.ObjectNode)input).put("executorMembershipId",9999).put("executedAt","2000-01-01");
        mvc.perform(post(endpoint).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,input))).andExpect(status().isOk()).andExpect(jsonPath("$.executorMembershipId").value(member));
        projects.removeMember(p,pm.getId(),tester.getId(),0L);
        mvc.perform(get(endpoint).with(actor(tester))).andExpect(status().isNotFound());
    }

    @Test void contextAndResultRulesRejectMissingOrArchivedValues() {
        long run=prepare();
        error(422,()->execution.record(p,tester.getId(),run,new ExecutionDtos.Attempt("NG",build," ","","","request-no-actual",0L)));
        error(422,()->execution.record(p,tester.getId(),run,new ExecutionDtos.Attempt("P",build,""," ","","request-no-reason",0L)));
        long foreign=projects.create(other.getId(),new ProjectDtos.CreateProject("OTHER"+p,"Dự án khác","","UTC")).id();
        long foreignBuild=catalogs.createBuild(foreign,other.getId(),new CatalogDtos.CreateBuild("2.0","1","WEB","",null)).id();
        error(404,()->execution.record(p,tester.getId(),run,new ExecutionDtos.Attempt("OK",foreignBuild,"","","","request-foreign",0L)));
        catalogs.archiveBuild(p,pm.getId(),build,0L);
        error(404,()->execution.record(p,tester.getId(),run,attempt("request-archived","OK",0)));
        assertThat(execution.attempts(p,tester.getId(),run,0,20).totalItems()).isZero();
    }

    @Test void concurrentAttemptsOnlyOneWinsAndRetriesDoNotDuplicate() throws Exception {
        long run=prepare();
        try(var pool=Executors.newFixedThreadPool(2)) {
            var barrier=new CyclicBarrier(2);
            var futures=List.of(pool.submit(()->writeConcurrent(barrier,run,"request-race-1")),pool.submit(()->writeConcurrent(barrier,run,"request-race-2")));
            assertThat(futures.stream().map(f->{try{return f.get(20,TimeUnit.SECONDS);}catch(Exception e){throw new RuntimeException(e);}}).toList()).containsExactlyInAnyOrder(200,409);
        }
        assertThat(execution.attempts(p,tester.getId(),run,0,20).totalItems()).isEqualTo(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var input=attempt("request-concurrent-retry","P",1);
            var a=pool.submit(()->execution.record(p,tester.getId(),run,input));var b=pool.submit(()->execution.record(p,tester.getId(),run,input));
            assertThat(id(a.get(20,TimeUnit.SECONDS))).isEqualTo(id(b.get(20,TimeUnit.SECONDS)));
        }
        assertThat(execution.attempts(p,tester.getId(),run,0,20).totalItems()).isEqualTo(2);
    }
    int writeConcurrent(CyclicBarrier barrier,long run,String key) throws Exception { barrier.await();try {execution.record(p,tester.getId(),run,attempt(key,"NG",0));return 200;}catch(BusinessException e){return e.status();} }

    @Test void databaseForeignKeysRejectWrongRevisionLatestPointerAndScope() {
        long run=prepare(); var c=createCase("TC-2");library.approveRevision(p,pm.getId(),c.id(),c.currentRevisionId());
        assertThatThrownBy(()->db.update("UPDATE run_items SET revision_id=? WHERE id=?",c.currentRevisionId(),run)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        long otherCycle=id(execution.create(p,pm.getId(),new ExecutionDtos.CreateCycle("C2","Đợt khác",null)));
        execution.configure(p,pm.getId(),otherCycle,new ExecutionDtos.Configuration(env,device,build,0L));
        long otherConfig=id(execution.configurations(p,pm.getId(),otherCycle).getFirst());
        assertThatThrownBy(()->db.update("UPDATE run_items SET configuration_id=? WHERE id=?",otherConfig,run)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        execution.addScope(p,pm.getId(),otherCycle,new ExecutionDtos.AddScope(otherConfig,List.of(revision),member,1L));execution.activate(p,pm.getId(),otherCycle,new ExecutionDtos.Version(2L));
        long otherRun=id(execution.runs(p,pm.getId(),otherCycle,0,20,false,false).items().getFirst());
        long otherAttempt=id(execution.record(p,tester.getId(),otherRun,attempt("request-other-run","OK",0)));
        assertThatThrownBy(()->db.update("UPDATE run_items SET latest_attempt_id=? WHERE id=?",otherAttempt,run)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test void paginationValidationAndDraftCannotBeExecuted() {
        execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(revision),member,1L));
        long run=id(execution.runs(p,pm.getId(),cycle,0,1,false,false).items().getFirst());
        error(409,()->execution.record(p,tester.getId(),run,attempt("request-draft","OK",0)));
        error(422,()->execution.runs(p,tester.getId(),cycle,-1,20,false,false));
        error(422,()->execution.attempts(p,tester.getId(),run,0,101));
        assertThat(execution.runs(p,pm.getId(),cycle,1,1,false,false).items()).isEmpty();
        assertThat(execution.runs(p,pm.getId(),cycle,0,20,true,false).totalItems()).isZero();
    }

    @Test void executionDatesHaveAnExplicitUtcOffsetAcrossApiProjections() throws Exception {
        long run=prepare();
        execution.record(p,tester.getId(),run,attempt("request-utc-time","OK",0));
        String stored="2026-09-29 02:33:14.123456";
        String expected="2026-09-29T02:33:14.123456Z";
        db.update("UPDATE execution_attempts SET executed_at=? WHERE project_id=? AND run_item_id=?",stored,p,run);
        db.update("UPDATE run_item_assignments SET assigned_at=? WHERE project_id=? AND run_item_id=?",stored,p,run);
        db.update("UPDATE test_cycles SET activated_at=? WHERE project_id=? AND id=?",stored,p,cycle);
        mvc.perform(get(path("/run-items/"+run+"/attempts")).with(actor(tester)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].executedAt").value(expected));
        mvc.perform(get(path("/run-items/"+run)).with(actor(tester)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.executedAt").value(expected));
        mvc.perform(get(path("/run-items/"+run+"/assignments")).with(actor(tester)))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].assignedAt").value(expected));
        mvc.perform(get(path("/test-cycles/"+cycle)).with(actor(tester)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.activatedAt").value(expected));
    }

    @Test void managersUseHttpCycleConfigurationScopeActivationAndAssignmentContracts() throws Exception {
        String created=mvc.perform(post(path("/test-cycles")).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(jsonBytes(json,new ExecutionDtos.CreateCycle("HTTP","Đợt qua API",null))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long id=json.readTree(created).path("id").asLong();
        mvc.perform(post(path("/test-cycles/"+id+"/configurations")).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(jsonBytes(json,new ExecutionDtos.Configuration(env,device,build,0L))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        String configs=mvc.perform(get(path("/test-cycles/"+id+"/configurations")).with(actor(tester)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long configuration=json.readTree(configs).get(0).path("id").asLong();
        mvc.perform(post(path("/test-cycles/"+id+"/scope")).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(jsonBytes(json,new ExecutionDtos.AddScope(configuration,List.of(revision),member,1L))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.runCount").value(1));
        mvc.perform(post(path("/test-cycles/"+id+"/activate")).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(jsonBytes(json,new ExecutionDtos.Version(2L))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.statusCode").value("ACTIVE"));
        String runs=mvc.perform(get(path("/test-cycles/"+id+"/run-items?mine=true")).with(actor(tester)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andReturn().getResponse().getContentAsString();
        long run=json.readTree(runs).path("items").get(0).path("id").asLong();
        mvc.perform(put(path("/run-items/"+run+"/assignment")).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(jsonBytes(json,new ExecutionDtos.Assignment(member,"Giữ người hiện tại",0L))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(0));
        assertThat(execution.assignments(p,pm.getId(),run)).hasSize(1);
        mvc.perform(get(path("/test-cycles?page=0&size=1")).with(actor(tester))).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalItems").value(2)).andExpect(jsonPath("$.items[0].id").value(id));
    }

    @Test void duplicateConfigurationInvalidPaginationAndInactiveContextsAreRejected() {
        error(409,()->execution.create(p,pm.getId(),new ExecutionDtos.CreateCycle("C1","Trùng mã",null)));
        error(404,()->execution.create(p,pm.getId(),new ExecutionDtos.CreateCycle("BAD-MILESTONE","Sai mốc",Long.MAX_VALUE)));
        error(409,()->execution.configure(p,pm.getId(),cycle,new ExecutionDtos.Configuration(env,device,build,1L)));
        for(int size:List.of(0,101)) error(422,()->execution.cycles(p,pm.getId(),0,size));
        error(422,()->execution.cycles(p,pm.getId(),-1,20));
        long run=prepare();
        error(409,()->execution.configure(p,pm.getId(),cycle,new ExecutionDtos.Configuration(env,device,build,3L)));
        error(422,()->execution.record(p,tester.getId(),run,new ExecutionDtos.Attempt("NG",build,null,null,null,"missing-actual",0L)));
        error(422,()->execution.record(p,tester.getId(),run,new ExecutionDtos.Attempt("P",build,null,null,null,"missing-reason",0L)));
        error(422,()->execution.record(p,tester.getId(),run,attempt("invalid-verdict","Fix",0)));
        var saved=execution.record(p,tester.getId(),run,new ExecutionDtos.Attempt("OK",build,null,null,null,"nullable-text",0L));
        assertThat(saved.get("actualResult")).isEqualTo("");
        db.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",p);
        error(409,()->execution.record(p,tester.getId(),run,attempt("archived-project","OK",1)));
    }
}
