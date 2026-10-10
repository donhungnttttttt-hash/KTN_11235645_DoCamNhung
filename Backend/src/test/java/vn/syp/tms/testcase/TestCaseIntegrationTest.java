package vn.syp.tms.testcase;

import org.springframework.lang.NonNull;

import static vn.syp.tms.support.MockMvcContracts.csrf;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.catalog.*;
import vn.syp.tms.shared.web.BusinessException;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class TestCaseIntegrationTest {
    @Container static final MySQLContainer<?> mysql=new MySQLContainer<>("mysql:8.4.8");
    // JUnit @Container owns and closes this instance.
    static { mysql.withDatabaseName("tms_library_test").withUsername("test").withPassword("ephemeral-test-only"); }
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        r.add("TMS_DB_URL",mysql::getJdbcUrl); r.add("TMS_DB_USER",mysql::getUsername); r.add("TMS_DB_PASSWORD",mysql::getPassword);
        r.add("TMS_MIGRATION_USER",mysql::getUsername); r.add("TMS_MIGRATION_PASSWORD",mysql::getPassword);
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired IdentityUserRepository users;
    @Autowired ProjectService projects;
    @Autowired TestCaseService service;
    @Autowired CatalogService catalogs;
    @Autowired TestCaseWorkbook workbook;
    IdentityUser owner,pm,tester,outsider;
    Long project,suite;

    @BeforeEach void fixtures() {
        String tag=UUID.randomUUID().toString().substring(0,8);
        owner=users.saveAndFlush(new IdentityUser("admin."+tag,"Admin thử","unused-hash","ADMIN"));
        pm=users.saveAndFlush(new IdentityUser("pm."+tag,"PM thử","unused-hash","PM"));
        tester=users.saveAndFlush(new IdentityUser("tester."+tag,"Tester thử","unused-hash","TESTER"));
        outsider=users.saveAndFlush(new IdentityUser("outside."+tag,"Admin ngoài","unused-hash","ADMIN"));
        project=projects.create(owner.getId(),new ProjectDtos.CreateProject("P"+tag,"Dự án thử","","Asia/Ho_Chi_Minh")).id();
        projects.addOrUpdateMember(project,owner.getId(),pm.getId(),new ProjectDtos.SetMember("PM"));
        projects.addOrUpdateMember(project,owner.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"));
        projects.addOrUpdateMember(project,owner.getId(),owner.getId(),new ProjectDtos.SetMember("TESTER",0L));
        suite=service.createSuite(project,pm.getId(),new TestCaseDtos.CreateSuite("AUTH","Đăng nhập","",null,0)).id();
    }
    @NonNull RequestPostProcessor actor(IdentityUser u) {
        return java.util.Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(u.getId(),u.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole())))));
    }
    @NonNull String path(String tail) { return "/api/v1/projects/"+project+tail; }
    JsonNode response(MvcResult result) throws Exception { return json.readTree(result.getResponse().getContentAsByteArray()); }
    @NonNull MockMultipartFile file(byte[] bytes) { return new MockMultipartFile("file","test.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes); }
    byte[] sample(String code) throws Exception {
        try(var b=new XSSFWorkbook(new ByteArrayInputStream(workbook.template("AUTH")));var out=new ByteArrayOutputStream()) {
            b.getSheetAt(0).getRow(1).getCell(0).setCellValue(code); b.write(out); return out.toByteArray();
        }
    }
    TestCaseDtos.CaseDetail create(String code) {
        return service.createCase(project,pm.getId(),new TestCaseDtos.CreateCase(code,suite,"Tiêu đề","Điều kiện","Bước 1\nBước 2","Kết quả","原文","条件","手順","結果","source.xlsx"));
    }
    TestCaseDtos.CreateRevision revision(Long expected,String title) {
        return new TestCaseDtos.CreateRevision(title,"Điều kiện","Bước mới","Mong đợi mới","原文","条件","手順","結果","source.xlsx",expected);
    }
    long count(String table) { return java.util.Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE project_id=?",Long.class,project)); }

    @Test void removedMembershipAndUnrelatedAdminCannotReadOrWriteProject() throws Exception {
        projects.removeMember(project,pm.getId(),tester.getId(),0L);
        for(var user:List.of(tester,outsider)) {
            for(String resource:List.of("","/test-cases","/test-suites","/catalogs/builds"))
                mvc.perform(get(path(resource)).with(actor(user))).andExpect(status().isNotFound());
            mvc.perform(post(path("/test-suites")).with(actor(user)).with(csrf()).contentType("application/json")
                    .content("{\"code\":\"OTHER\",\"name\":\"Nhóm\"}")).andExpect(status().isNotFound());
        }
    }

    @Test void onlyProjectPmApprovesAndHistoryRemainsImmutable() throws Exception {
        var c=create("TC-1"); Long rev=c.currentRevisionId(); String approve=path("/test-cases/"+c.id()+"/revisions/"+rev+"/approve");
        for(var user:List.of(owner,tester)) mvc.perform(post(approve).with(actor(user)).with(csrf())).andExpect(status().isForbidden());
        var first=response(mvc.perform(post(approve).with(actor(pm)).with(csrf())).andExpect(status().isOk()).andReturn());
        var again=response(mvc.perform(post(approve).with(actor(pm)).with(csrf())).andExpect(status().isOk()).andReturn());
        assertThat(again.get("approvedAt")).isEqualTo(first.get("approvedAt"));
        var newer=service.addRevision(project,pm.getId(),c.id(),revision(rev,"Bản dịch mới"));
        assertThat(newer.approved()).isFalse();
        mvc.perform(get(path("/test-cases/"+c.id()+"/revisions/"+rev)).with(actor(tester)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.titleVi").value("Tiêu đề")).andExpect(jsonPath("$.titleJp").value("原文")).andExpect(jsonPath("$.approved").value(true));
        assertThatThrownBy(()->service.addRevision(project,pm.getId(),c.id(),revision(rev,"Ghi đè cũ"))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(409));
        assertThat(count("test_case_revisions")).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND action='APPROVE'",Long.class,project)).isEqualTo(1);
    }

    @Test void actualXlsxRoundTripPreservesUnicodeAndRepeatedCommitIsIdempotent() throws Exception {
        byte[] bytes=sample("TC-XLSX");
        mvc.perform(get(path("/import-previews/template")).with(actor(pm))).andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition","attachment; filename=test-cases-template.xlsx"));
        var preview=response(mvc.perform(multipart(path("/import-previews")).file(file(bytes)).with(actor(pm)).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.errorRows").value(0)).andReturn());
        long id=preview.get("id").asLong();
        assertThat(count("test_cases")).isZero();
        service.commitImportPreview(project,pm.getId(),id);
        service.commitImportPreview(project,pm.getId(),id);
        assertThat(service.createImportPreview(project,pm.getId(),file(bytes)).id()).isEqualTo(id);
        assertThat(count("test_cases")).isEqualTo(1); assertThat(count("test_case_revisions")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT steps_vi FROM test_case_revisions WHERE project_id=?",String.class,project)).contains("\n");
        assertThat(jdbc.queryForObject("SELECT title_jp FROM test_case_revisions WHERE project_id=?",String.class,project)).isEqualTo("ログイン確認");
    }

    @Test void invalidMixedWorkbookBlocksAllRows() throws Exception {
        byte[] bytes;
        try(var b=new XSSFWorkbook(new ByteArrayInputStream(sample("TC-OK")));var out=new ByteArrayOutputStream()) {
            var row=b.getSheetAt(0).createRow(3); // Keep actual Excel row number despite blank row.
            for(int i=0;i<11;i++) row.createCell(i).setCellValue(i==0?"TC-BAD":i==1?"AUTH":"");
            b.write(out); bytes=out.toByteArray();
        }
        var preview=service.createImportPreview(project,pm.getId(),file(bytes));
        assertThat(preview.errorRows()).isEqualTo(1); assertThat(preview.rows().get(1).rowNumber()).isEqualTo(4);
        mvc.perform(post(path("/import-previews/"+preview.id()+"/commit")).with(actor(pm)).with(csrf())).andExpect(status().isUnprocessableEntity());
        assertThat(count("test_cases")).isZero();
    }

    @Test void conflictAfterPreviewRollsBackEarlierRows() throws Exception {
        byte[] bytes;
        try(var b=new XSSFWorkbook(new ByteArrayInputStream(sample("TC-FIRST")));var out=new ByteArrayOutputStream()) {
            var sheet=b.getSheetAt(0); var row=sheet.createRow(2);
            for(int i=0;i<11;i++) row.createCell(i).setCellValue(sheet.getRow(1).getCell(i).getStringCellValue());
            row.getCell(0).setCellValue("TC-RACE"); b.write(out); bytes=out.toByteArray();
        }
        var preview=service.createImportPreview(project,pm.getId(),file(bytes)); create("TC-RACE");
        assertThatThrownBy(()->service.commitImportPreview(project,pm.getId(),preview.id())).isInstanceOf(BusinessException.class);
        assertThat(count("test_cases")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM test_cases WHERE project_id=? AND case_no='TC-FIRST'",Long.class,project)).isZero();
        assertThat(service.getImportPreview(project,pm.getId(),preview.id()).status()).isEqualTo("PREVIEW");
    }

    @Test void previewIsOwnerScopedExpiresAndRequiresCsrfAndWritePermission() throws Exception {
        byte[] bytes=sample("TC-EXP");
        mvc.perform(multipart(path("/import-previews")).file(file(bytes)).with(actor(pm))).andExpect(status().isForbidden());
        mvc.perform(multipart(path("/import-previews")).file(file(bytes)).with(actor(tester)).with(csrf())).andExpect(status().isForbidden());
        var preview=service.createImportPreview(project,pm.getId(),file(bytes));
        mvc.perform(get(path("/import-previews/"+preview.id())).with(actor(owner))).andExpect(status().isNotFound());
        jdbc.update("UPDATE import_batches SET staged_expires_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE id=?",preview.id());
        mvc.perform(post(path("/import-previews/"+preview.id()+"/commit")).with(actor(pm)).with(csrf())).andExpect(status().isGone());
        assertThat(count("test_cases")).isZero();
    }

    @Test void suiteRejectsForeignParentCycleAndArchivingNonemptyGroup() {
        var other=projects.create(outsider.getId(),new ProjectDtos.CreateProject("O"+project,"Khác","","UTC"));
        var foreign=service.createSuite(other.id(),outsider.getId(),new TestCaseDtos.CreateSuite("FOREIGN","Khác","",null,0));
        assertThatThrownBy(()->service.createCase(project,pm.getId(),new TestCaseDtos.CreateCase("FOREIGN",foreign.id(),"T","","S","E","","","","",""))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->service.updateSuite(project,pm.getId(),suite,new TestCaseDtos.UpdateSuite(null,null,foreign.id(),null))).isInstanceOf(BusinessException.class);
        var child=service.createSuite(project,pm.getId(),new TestCaseDtos.CreateSuite("CHILD","Con","",suite,0));
        assertThatThrownBy(()->service.updateSuite(project,pm.getId(),suite,new TestCaseDtos.UpdateSuite(null,null,child.id(),null))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->service.archiveSuite(project,pm.getId(),suite)).isInstanceOf(BusinessException.class);
        create("TC-GROUP"); assertThatThrownBy(()->service.archiveSuite(project,pm.getId(),suite)).isInstanceOf(BusinessException.class);
    }

    @Test void foreignBuildCannotBeArchivedAndLocalArchivePreservesRow() {
        var other=projects.create(outsider.getId(),new ProjectDtos.CreateProject("B"+project,"Khác","","UTC"));
        var build=catalogs.createBuild(other.id(),outsider.getId(),new CatalogDtos.CreateBuild("1.0","1","WEB","",null));
        assertThatThrownBy(()->catalogs.archiveBuild(project,pm.getId(),build.id(),0L)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(404));
        assertThat(catalogs.listBuilds(other.id(),outsider.getId())).hasSize(1);
        catalogs.archiveBuild(other.id(),outsider.getId(),build.id(),0L);
        assertThat(catalogs.listBuilds(other.id(),outsider.getId())).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM builds WHERE id=? AND archived_at IS NOT NULL",Long.class,build.id())).isEqualTo(1);
    }

    @Test void concurrentRevisionsRejectStaleWriteAndConcurrentCommitCreatesOnce() throws Exception {
        var c=create("TC-CONCURRENT"); var preview=service.createImportPreview(project,pm.getId(),file(sample("TC-CONCURRENT-IMPORT")));
        try(var pool=Executors.newFixedThreadPool(2)) {
            var gate=new CountDownLatch(1);
            Callable<String> update=()-> { gate.await(); try { service.addRevision(project,pm.getId(),c.id(),revision(c.currentRevisionId(),"Mới")); return "ok"; } catch(BusinessException e) { return e.code(); } };
            var a=pool.submit(update); var b=pool.submit(update); gate.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder("ok","CONFLICT");
            var commits=pool.invokeAll(List.<Callable<TestCaseDtos.ImportBatchSummary>>of(()->service.commitImportPreview(project,pm.getId(),preview.id()),()->service.commitImportPreview(project,pm.getId(),preview.id())));
            assertThat(commits.get(0).get().status()).isEqualTo("COMMITTED"); assertThat(commits.get(1).get().status()).isEqualTo("COMMITTED");
        }
        assertThat(count("test_cases")).isEqualTo(2); assertThat(count("test_case_revisions")).isEqualTo(3);
    }

    @Test void listUsesServerPagingSearchAndProjectScope() throws Exception {
        create("TC-PAGE-A"); create("TC-PAGE-B");
        mvc.perform(get(path("/test-cases")).param("size","1").with(actor(tester)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].caseNo").value("TC-PAGE-B"));
        mvc.perform(get(path("/test-cases")).param("keyword","PAGE-A").with(actor(tester)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get(path("/test-cases")).param("keyword","%").with(actor(tester)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        mvc.perform(get(path("/test-cases")).param("suiteId","999999").with(actor(tester))).andExpect(status().isNotFound());
        mvc.perform(get(path("/test-cases")).param("size","1001").with(actor(tester))).andExpect(status().isUnprocessableEntity());
    }

    @Test void projectReturnsNewVersionAndLastPmCannotBeRemoved() {
        var detail=projects.get(project,pm.getId());
        var changed=projects.update(project,pm.getId(),new ProjectDtos.UpdateProject("Tên mới",null,null,detail.version()));
        assertThat(changed.version()).isGreaterThan(detail.version());
        assertThatThrownBy(()->projects.update(project,pm.getId(),new ProjectDtos.UpdateProject("Tên cũ",null,null,detail.version())))
                .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(409));
        assertThatThrownBy(()->projects.removeMember(project,owner.getId(),pm.getId(),0L)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("LAST_PM"));
        assertThatThrownBy(()->projects.addOrUpdateMember(project,owner.getId(),tester.getId(),new ProjectDtos.SetMember("SUPERUSER"))).isInstanceOf(BusinessException.class);
    }
}
