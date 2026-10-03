package vn.syp.tms.execution;

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
class CycleDecisionIntegrationTest {
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


    @Test void concurrentNewNgAndCycleClosureCannotBothSucceed() throws Exception {
        long run=prepare();execution.record(p,tester.getId(),run,attempt("before-concurrent-close","OK",0));
        try(var pool=Executors.newFixedThreadPool(2)) {
            var barrier=new CyclicBarrier(2);
            var close=pool.submit(()->{barrier.await();return mvc.perform(post(path("/test-cycles/"+cycle+"/decisions")).with(actor(pm)).with(csrf()).contentType("application/json").content("{\"action\":\"CLOSE\",\"reason\":\"Chốt khi OK\",\"expectedVersion\":3}")).andReturn().getResponse().getStatus();});
            var record=pool.submit(()->{barrier.await();try{execution.record(p,tester.getId(),run,attempt("concurrent-new-ng","NG",1));return 200;}catch(BusinessException e){return e.status();}});
            assertThat(List.of(close.get(20,TimeUnit.SECONDS),record.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        if("CLOSED".equals(execution.cycle(p,pm.getId(),cycle).get("statusCode")))assertThat(execution.run(p,tester.getId(),run).get("resultCode")).isEqualTo("OK");
    }

    @Test void scopeValidationAndProjectRoleAreEnforcedAndAllNaCanClose() throws Exception {
        long run=prepare();String endpoint=path("/run-items/"+run+"/scope-decisions");
        String body="{\"excluded\":true,\"reason\":\"Không áp dụng\",\"expectedVersion\":0}";
        mvc.perform(post(endpoint).with(actor(pm)).contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post(endpoint).with(actor(other)).with(csrf()).contentType("application/json").content(body)).andExpect(status().isNotFound());
        projects.addOrUpdateMember(p,pm.getId(),other.getId(),new ProjectDtos.SetMember("TESTER"));
        mvc.perform(post(endpoint).with(actor(other)).with(csrf()).contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(java.util.Objects.requireNonNull(body.replace("Không áp dụng"," ")))).andExpect(status().isUnprocessableEntity());
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(java.util.Objects.requireNonNull(body.replace("true","null")))).andExpect(status().isUnprocessableEntity());
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(body)).andExpect(status().isOk());
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(java.util.Objects.requireNonNull(body.replace(":0",":1")))).andExpect(status().isConflict());
        String close=path("/test-cycles/"+cycle+"/decisions");
        mvc.perform(post(close).with(actor(pm)).with(csrf()).contentType("application/json").content("{\"action\":\"CLOSE\",\"reason\":\"Chốt phạm vi NA\",\"expectedVersion\":4}")).andExpect(status().isOk());
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content("{\"excluded\":false,\"reason\":\"Chưa mở lại\",\"expectedVersion\":1}")).andExpect(status().isConflict());
        mvc.perform(get(close+"?page=-1").with(actor(tester))).andExpect(status().isUnprocessableEntity());
        mvc.perform(get(close+"?page=1").with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        assertThat(db.queryForObject("SELECT JSON_EXTRACT(scope_snapshot,'$.na') FROM cycle_decisions WHERE project_id=?",String.class,p)).isEqualTo("1");
    }

    @Test void pmCanExcludeWithoutRewritingAttemptsAndRestoreScope() throws Exception {
        long run=prepare();execution.record(p,tester.getId(),run,attempt("scope-original-ng","NG",0));
        String endpoint=path("/run-items/"+run+"/scope-decisions");
        String body="{\"excluded\":true,\"reason\":\"Thiết bị ngoài phạm vi\",\"expectedVersion\":1}";
        mvc.perform(post(endpoint).with(actor(tester)).with(csrf()).contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.excluded").value(true));
        assertThat(execution.run(p,tester.getId(),run).get("resultCode")).isEqualTo("NG");
        assertThat(execution.attempts(p,tester.getId(),run,0,20).totalItems()).isEqualTo(1);
        assertThat(execution.runs(p,tester.getId(),cycle,0,20,false,true).totalItems()).isZero();
        error(409,()->execution.record(p,tester.getId(),run,attempt("excluded-no-write","OK",2)));
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(body)).andExpect(status().isConflict());
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content("{\"excluded\":false,\"reason\":\"Đưa thiết bị trở lại\",\"expectedVersion\":2}")).andExpect(status().isOk()).andExpect(jsonPath("$.excluded").value(false));
        execution.record(p,tester.getId(),run,attempt("restored-can-write","OK",3));
        mvc.perform(get(endpoint).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(2));
    }

    @Test void closeGuardsAndReopenDoNotBypassHistoryOrPmRights() throws Exception {
        long run=prepare();String endpoint=path("/test-cycles/"+cycle+"/decisions");
        String close="{\"action\":\"CLOSE\",\"reason\":\"Chốt đợt nội bộ\",\"expectedVersion\":3}";
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(close)).andExpect(status().isConflict());
        execution.record(p,tester.getId(),run,attempt("cycle-pending","P",0));
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(close)).andExpect(status().isConflict());
        execution.record(p,tester.getId(),run,attempt("cycle-unlinked-ng","NG",1));
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(close)).andExpect(status().isConflict());
        execution.record(p,tester.getId(),run,attempt("cycle-passed","OK",2));
        mvc.perform(post(endpoint).with(actor(tester)).with(csrf()).contentType("application/json").content(close)).andExpect(status().isForbidden());
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(close)).andExpect(status().isOk()).andExpect(jsonPath("$.statusCode").value("CLOSED"));
        error(409,()->execution.activate(p,pm.getId(),cycle,new ExecutionDtos.Version(4L)));
        error(409,()->execution.record(p,tester.getId(),run,attempt("cycle-closed","OK",3)));
        error(409,()->execution.assign(p,pm.getId(),run,new ExecutionDtos.Assignment(member,"Không sửa khi đóng",3L)));
        mvc.perform(post(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content("{\"action\":\"REOPEN\",\"reason\":\"Kiểm thử bản mới\",\"expectedVersion\":4}")).andExpect(status().isOk()).andExpect(jsonPath("$.statusCode").value("ACTIVE"));
        execution.record(p,tester.getId(),run,attempt("cycle-after-reopen","OK",3));
        mvc.perform(get(endpoint).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(2));
    }
}
