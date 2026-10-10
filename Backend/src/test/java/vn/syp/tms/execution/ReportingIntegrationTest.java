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
class ReportingIntegrationTest {
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


    @Test void aggregateTotalsStayStableAcrossDatabasePagesAndMultipleAssignees() throws Exception {
        var revisions=new ArrayList<Long>();revisions.add(revision);
        for(int i=2;i<=60;i++){var c=createCase("TC-"+i);library.approveRevision(p,pm.getId(),c.id(),c.currentRevisionId());revisions.add(c.currentRevisionId());}
        execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,revisions,member,1L));
        execution.activate(p,pm.getId(),cycle,new ExecutionDtos.Version(2L));
        var runs=execution.runs(p,tester.getId(),cycle,0,100,false,false).items();
        execution.record(p,tester.getId(),id(runs.get(0)),attempt("page-ng-000","NG",0));
        execution.record(p,tester.getId(),id(runs.get(1)),attempt("page-ok-000","OK",0));
        long owner=java.util.Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,pm.getId()));
        execution.assign(p,pm.getId(),id(runs.get(59)),new ExecutionDtos.Assignment(owner,"PM tự thực hiện",0L));
        execution.record(p,pm.getId(),id(runs.get(59)),attempt("page-owner-000","OK",1));
        mvc.perform(post(path("/run-items/"+id(runs.get(2))+"/scope-decisions")).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(jsonBytes(json,Map.of("excluded",true,"reason","Không áp dụng","expectedVersion",0)))).andExpect(status().isOk());
        var first=json.readTree(mvc.perform(get(path("/reports/summary")).with(actor(tester))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
        var second=json.readTree(mvc.perform(get(path("/reports/summary?page=1")).with(actor(tester))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
        assertThat(first.path("metrics")).isEqualTo(second.path("metrics"));
        assertThat(first.path("metrics").path("total").asLong()).isEqualTo(60);
        assertThat(first.path("metrics").path("applicable").asLong()).isEqualTo(59);
        assertThat(first.path("metrics").path("ok").asLong()).isEqualTo(2);
        assertThat(first.path("metrics").path("ng").asLong()).isEqualTo(1);
        assertThat(first.path("metrics").path("notRun").asLong()).isEqualTo(56);
        assertThat(first.path("source").path("items").size()).isEqualTo(50);assertThat(second.path("source").path("items").size()).isEqualTo(10);
        assertThat(second.path("source").path("totalItems").asLong()).isEqualTo(60);
        var ids=new HashSet<Long>();first.path("source").path("items").forEach(row->ids.add(row.path("id").asLong()));
        second.path("source").path("items").forEach(row->assertThat(ids.add(row.path("id").asLong())).isTrue());
        assertThat(first.path("byAssignee").size()).isEqualTo(2);
        long grouped=0;for(var group:first.path("byAssignee"))grouped+=group.path("total").asLong();assertThat(grouped).isEqualTo(60);
        mvc.perform(get(path("/reports/summary?page=2147483647")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.source.items").isEmpty()).andExpect(jsonPath("$.source.totalItems").value(60));
    }

    @Test void countsLatestRunsNotAttemptsAndUsesNullForEmptyDenominator() throws Exception {
        String endpoint=path("/reports/summary");
        mvc.perform(get(endpoint).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.metrics.total").value(0)).andExpect(jsonPath("$.metrics.executionPercent").isEmpty());
        var revisions=new ArrayList<Long>();revisions.add(revision);
        for(int i=2;i<=6;i++){var c=createCase("TC-"+i);library.approveRevision(p,pm.getId(),c.id(),c.currentRevisionId());revisions.add(c.currentRevisionId());}
        execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,revisions,member,1L));
        execution.activate(p,pm.getId(),cycle,new ExecutionDtos.Version(2L));
        var runs=execution.runs(p,tester.getId(),cycle,0,20,false,false).items();
        execution.record(p,tester.getId(),id(runs.get(0)),attempt("old-ng-first","NG",0));
        execution.record(p,tester.getId(),id(runs.get(0)),attempt("new-ok-first","OK",1));
        execution.record(p,tester.getId(),id(runs.get(1)),attempt("ok-second-run","OK",0));
        execution.record(p,tester.getId(),id(runs.get(2)),attempt("ng-third-run","NG",0));
        execution.record(p,tester.getId(),id(runs.get(3)),attempt("pending-fourth","P",0));
        mvc.perform(post(path("/run-items/"+id(runs.get(5))+"/scope-decisions")).with(actor(pm)).with(csrf()).contentType("application/json").content("{\"excluded\":true,\"reason\":\"Không áp dụng\",\"expectedVersion\":0}")).andExpect(status().isOk());
        mvc.perform(get(endpoint).with(actor(tester))).andExpect(status().isOk())
            .andExpect(jsonPath("$.metricDefinitionVersion").value("internal-v1"))
            .andExpect(jsonPath("$.metrics.total").value(6)).andExpect(jsonPath("$.metrics.na").value(1))
            .andExpect(jsonPath("$.metrics.applicable").value(5)).andExpect(jsonPath("$.metrics.ok").value(2))
            .andExpect(jsonPath("$.metrics.ng").value(1)).andExpect(jsonPath("$.metrics.pending").value(1))
            .andExpect(jsonPath("$.metrics.notRun").value(1)).andExpect(jsonPath("$.metrics.executionPercent").value(60.0))
            .andExpect(jsonPath("$.metrics.passPercent").value(40.0));
        long secondBuild=catalogs.createBuild(p,pm.getId(),new CatalogDtos.CreateBuild("2.0","2","WEB","",null)).id();
        mvc.perform(get(endpoint+"?cycleId="+cycle+"&buildId="+secondBuild).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.metrics.notRun").value(5)).andExpect(jsonPath("$.metrics.executionPercent").value(0.0));
        execution.record(p,tester.getId(),id(runs.get(0)),new ExecutionDtos.Attempt("NG",secondBuild,"Lỗi trên build 2","","","second-build-only",2L));
        mvc.perform(get(endpoint+"?buildId="+build).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.metrics.ok").value(2));
        mvc.perform(get(endpoint).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.metrics.ok").value(1)).andExpect(jsonPath("$.metrics.ng").value(2));
    }

    @Test void allNaHasNoRateAndDailyBucketsUseProjectTimezone() throws Exception {
        long run=prepare();long first=id(execution.record(p,tester.getId(),run,attempt("yesterday-ng","NG",0)));
        long second=id(execution.record(p,tester.getId(),run,attempt("today-ok","OK",1)));
        var zone=java.time.ZoneId.of("Asia/Ho_Chi_Minh");var today=java.time.LocalDate.now(zone);var boundary=today.atStartOfDay(zone).toInstant();
        db.update("UPDATE projects SET timezone=? WHERE id=?",zone.getId(),p);
        db.update("UPDATE execution_attempts SET executed_at=? WHERE id=?",java.sql.Timestamp.from(boundary.minusSeconds(1)),first);
        db.update("UPDATE execution_attempts SET executed_at=? WHERE id=?",java.sql.Timestamp.from(boundary),second);
        var response=mvc.perform(get(path("/reports/summary?cycleId="+cycle+"&buildId="+build)).with(actor(tester))).andExpect(status().isOk()).andReturn().getResponse();
        var report=json.readTree(response.getContentAsString());
        assertThat(report.path("daily").get(0).path("date").asText()).isEqualTo(today.toString());
        assertThat(report.path("daily").get(0).path("ok").asInt()).isEqualTo(1);
        assertThat(report.path("daily").get(1).path("date").asText()).isEqualTo(today.minusDays(1).toString());
        mvc.perform(post(path("/run-items/"+run+"/scope-decisions")).with(actor(pm)).with(csrf()).contentType("application/json").content("{\"excluded\":true,\"reason\":\"Ngoài phạm vi\",\"expectedVersion\":2}")).andExpect(status().isOk());
        mvc.perform(get(path("/reports/summary")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.metrics.na").value(1)).andExpect(jsonPath("$.metrics.ok").value(0)).andExpect(jsonPath("$.metrics.passPercent").isEmpty()).andExpect(jsonPath("$.source.items[0].resultCode").value("OK"));
    }

    @Test void oneBugLinkedToMultipleRunsIsCountedOnceAndRetestSignalDoesNotConvertNg() throws Exception {
        var c=createCase("TC-2");library.approveRevision(p,pm.getId(),c.id(),c.currentRevisionId());
        execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(revision,c.currentRevisionId()),member,1L));execution.activate(p,pm.getId(),cycle,new ExecutionDtos.Version(2L));
        var runs=execution.runs(p,tester.getId(),cycle,0,20,false,false).items();
        long one=id(execution.record(p,tester.getId(),id(runs.get(0)),attempt("first-linked-ng","NG",0)));
        long two=id(execution.record(p,tester.getId(),id(runs.get(1)),attempt("second-linked-ng","NG",0)));
        var bug=new LinkedHashMap<String,Object>();bug.put("type","BUG");bug.put("title","Lỗi chung hai case");bug.put("steps","Thực hiện");bug.put("expectedResult","Vào trang chủ");bug.put("actualResult","Trang trắng");bug.put("buildId",build);bug.put("environmentId",env);bug.put("deviceId",device);bug.put("attemptId",one);bug.put("revisionId",revision);bug.put("requestKey","shared-report-bug");
        long bugId=json.readTree(mvc.perform(post(path("/work-items")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,bug))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("id").asLong();
        mvc.perform(post(path("/work-items/"+bugId+"/execution-links")).with(actor(tester)).with(csrf()).contentType("application/json").content(jsonBytes(json,Map.of("attemptId",two,"expectedVersion",0)))).andExpect(status().isOk());
        mvc.perform(post(path("/work-items/"+bugId+"/transitions")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,Map.of("status","resolved","fixedBuildId",build,"reason","Dev báo sửa","expectedVersion",1)))).andExpect(status().isOk());
        mvc.perform(get(path("/reports/summary?cycleId="+cycle)).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.metrics.bugs").value(1)).andExpect(jsonPath("$.metrics.awaitingVerification").value(1)).andExpect(jsonPath("$.metrics.ng").value(2)).andExpect(jsonPath("$.metrics.passPercent").value(0.0));
    }

    @Test void reportsRequireMembershipAndSameProjectFilters() throws Exception {
        prepare();String endpoint=path("/reports/summary");
        long foreign=projects.create(other.getId(),new ProjectDtos.CreateProject("OUT"+p,"Dự án khác","","UTC")).id();
        long foreignBuild=catalogs.createBuild(foreign,other.getId(),new CatalogDtos.CreateBuild("9.9","1","WEB","",null)).id();
        long foreignCycle=id(execution.create(foreign,other.getId(),new ExecutionDtos.CreateCycle("OUT","Đợt khác",null)));
        mvc.perform(get(endpoint+"?buildId="+foreignBuild).with(actor(tester))).andExpect(status().isNotFound());
        mvc.perform(get(endpoint+"?cycleId="+foreignCycle).with(actor(tester))).andExpect(status().isNotFound());
        mvc.perform(get(endpoint).with(actor(other))).andExpect(status().isNotFound());
        mvc.perform(get(endpoint)).andExpect(status().isUnauthorized());
        mvc.perform(get(endpoint+"?cycleId=999999").with(actor(tester))).andExpect(status().isNotFound());
        mvc.perform(get(endpoint+"?buildId=999999").with(actor(tester))).andExpect(status().isNotFound());
        mvc.perform(get(endpoint+"?cycleId=-1").with(actor(tester))).andExpect(status().isUnprocessableEntity());
        mvc.perform(get(endpoint+"?page=-1").with(actor(tester))).andExpect(status().isUnprocessableEntity());
    }

    @Test void workbookMatchesSummaryAndPreservesUnicodeWithoutFormulas() throws Exception {
        long run=prepare();execution.record(p,tester.getId(),run,attempt("export-one-ok","OK",0));
        db.update("UPDATE test_case_revisions SET title_vi=? WHERE id=?","=HYPERLINK(\"https://example.invalid\",\"Việt Nam\")",revision);
        var api=json.readTree(mvc.perform(get(path("/reports/summary?cycleId="+cycle)).with(actor(tester)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        byte[] bytes=mvc.perform(get(path("/reports/export.xlsx?cycleId="+cycle)).with(actor(tester))).andExpect(status().isOk()).andExpect(header().string("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).andReturn().getResponse().getContentAsByteArray();
        try(var book=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(bytes))) {
            assertThat(book.getSheet("Tổng hợp")).isNotNull();
            var labels=Map.of("Tổng lượt","total","Phạm vi áp dụng","applicable","OK · Đạt","ok",
                "NG · Không đạt","ng","Tiến độ thực thi (%)","executionPercent","Tỷ lệ đạt (%)","passPercent");
            int matched=0;
            for(var row:book.getSheet("Tổng hợp")) {
                String key=labels.get(row.getCell(0).getStringCellValue());
                if(key!=null) { assertThat(row.getCell(1).getNumericCellValue()).isEqualTo(api.path("metrics").path(key).asDouble());matched++; }
            }
            assertThat(matched).isEqualTo(labels.size());
            var source=book.getSheet("Nguồn thực thi");assertThat(source.getLastRowNum()).isEqualTo(1);
            boolean found=false;
            for(var sheet:book) for(var row:sheet) for(var cell:row) {
                assertThat(cell.getCellType()).isNotEqualTo(org.apache.poi.ss.usermodel.CellType.FORMULA);
                if(cell.getCellType()==org.apache.poi.ss.usermodel.CellType.STRING && cell.getStringCellValue().contains("Việt Nam")) found=true;
            }
            assertThat(found).isTrue();
        }
        mvc.perform(get(path("/reports/export.xlsx")).with(actor(other))).andExpect(status().isNotFound());
    }
}
