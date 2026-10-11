package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import com.fasterxml.jackson.databind.*;
import java.io.*;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.NonNull;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;

/** Native MySQL only; caller must provision an isolated test schema, never tms. */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_DB_URL", matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+")
class TestDocumentIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        String url = System.getenv("TMS_TEST_DB_URL");
        if (url == null || !url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+"))
            throw new IllegalStateException("Dedicated native test schema required");
        r.add("TMS_DB_URL", () -> url);
        r.add("TMS_DB_USER", () -> System.getenv("TMS_TEST_DB_USER")); r.add("TMS_DB_PASSWORD", () -> System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_MIGRATION_USER", () -> System.getenv("TMS_TEST_DB_USER")); r.add("TMS_MIGRATION_PASSWORD", () -> System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_BOOTSTRAP_ENABLED", () -> "false"); r.add("TMS_REDMINE_ENABLED", () -> "false");
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired IdentityUserRepository users;
    @Autowired ProjectService projects;
    @Autowired TestCaseService cases;
    @Autowired vn.syp.tms.execution.ExecutionService execution;
    IdentityUser owner, pm, tester, outsider;
    Long project;
    @BeforeEach void setup() {
        String tag = UUID.randomUUID().toString().substring(0,8);
        owner = users.saveAndFlush(new IdentityUser("doc.admin."+tag,"Admin thử","unused-hash","ADMIN"));
        pm = users.saveAndFlush(new IdentityUser("doc.pm."+tag,"PM thử","unused-hash","PM"));
        tester = users.saveAndFlush(new IdentityUser("doc.tester."+tag,"Tester thử","unused-hash","TESTER"));
        outsider = users.saveAndFlush(new IdentityUser("doc.out."+tag,"Ngoài dự án","unused-hash","ADMIN"));
        project = projects.create(owner.getId(),new ProjectDtos.CreateProject("DOC"+tag,"Tài liệu thử","","Asia/Ho_Chi_Minh")).id();
        projects.addOrUpdateMember(project,owner.getId(),pm.getId(),new ProjectDtos.SetMember("PM"));
        projects.addOrUpdateMember(project,owner.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"));
    }
    @NonNull RequestPostProcessor actor(IdentityUser u) {
        return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(u.getId(),u.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole())))));
    }
    @NonNull String path(String tail) { return "/api/v1/projects/"+project+tail; }
    JsonNode body(MvcResult result) throws Exception { return json.readTree(result.getResponse().getContentAsByteArray()); }
    @NonNull MockMultipartFile file(byte[] bytes) { return new MockMultipartFile("file","仕様書_VI.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes); }
    long imported() throws Exception {
        var preview = body(mvc.perform(multipart(path("/import-previews")).file(file(CustomerWorkbookFixture.bytes())).with(actor(pm)).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.errorRows").value(0)).andReturn());
        long id=preview.get("id").asLong();
        mvc.perform(post(path("/import-previews/"+id+"/commit")).with(actor(pm)).with(csrf())).andExpect(status().isOk());
        return id;
    }
    @Test void globalAdminCyclesNewDocumentResultsAndReloadsWithAudit() throws Exception {
        long id=imported();
        var first=body(mvc.perform(get(path("/test-documents/"+id)).with(actor(outsider))).andReturn());
        assertThat(first.at("/rows/0/resultStatus").asText()).isEqualTo("UNEXECUTED");
        long row=first.at("/rows/0/rowId").asLong();
        long version=0;
        for(String result:List.of("OK","NG","P","NA","UNEXECUTED")) {
            var input=Map.of("status",result,"expectedVersion",version,"requestKey",UUID.randomUUID().toString());
            mvc.perform(put(path("/test-documents/"+id+"/rows/"+row+"/result")).with(actor(outsider)).with(csrf())
                .contentType("application/json").content(Objects.requireNonNull(json.writeValueAsString(input)))).andExpect(status().isOk());
            mvc.perform(get(path("/test-documents/"+id)).with(actor(outsider)))
                .andExpect(jsonPath("$.rows[0].resultStatus").value(result));
            version++;
        }
        mvc.perform(get(path("/test-documents/"+id+"/rows/"+row+"/result-history")).with(actor(outsider)))
            .andExpect(jsonPath("$.length()").value(5));
    }
    @Test void pmEditsCellsWithConflictProtectionAndOriginalPreservation() throws Exception {
        long id=imported();
        byte[] original=mvc.perform(get(path("/test-documents/"+id+"/export?original=true")).with(actor(pm))).andReturn().getResponse().getContentAsByteArray();
        var row=body(mvc.perform(get(path("/test-documents/"+id)).with(actor(pm))).andReturn()).at("/rows/0");
        String endpoint=path("/test-documents/"+id+"/rows/"+row.get("rowId").asLong()+"/cells/4");
        String payload=Objects.requireNonNull(json.writeValueAsString(Map.of("value","Quan điểm đã sửa","expectedVersion",0,"expectedRevisionId",row.get("revisionId").asLong())));
        mvc.perform(put(endpoint).with(actor(tester)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isForbidden());
        mvc.perform(put(endpoint).with(actor(outsider)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isOk());
        mvc.perform(put(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isConflict());
        mvc.perform(get(path("/test-documents/"+id)).with(actor(tester))).andExpect(jsonPath("$.rows[0].cells[4]").value("Quan điểm đã sửa"));
        mvc.perform(get(endpoint+"/history").with(actor(pm))).andExpect(status().isOk()).andExpect(jsonPath("$[0].afterValue").value("Quan điểm đã sửa"));
        String titleEndpoint=endpoint.substring(0,endpoint.length()-1)+"1";
        mvc.perform(put(titleEndpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(Objects.requireNonNull(payload.replace("Quan điểm đã sửa","Tiêu đề mới")))).andExpect(status().isOk());
        mvc.perform(get(path("/test-documents/"+id)).with(actor(pm))).andExpect(jsonPath("$.rows[0].cells[1]").value("Tiêu đề mới"));
        var bytes=mvc.perform(get(path("/test-documents/"+id+"/export?original=true")).with(actor(pm))).andReturn().getResponse().getContentAsByteArray();
        assertThat(bytes).isEqualTo(original);
    }
    @Test void adminCreatesApprovesAssignsAndExecutesSecondTestForAnotherTester() throws Exception {
        long id=imported();
        var row=body(mvc.perform(get(path("/test-documents/"+id)).with(actor(pm))).andReturn()).at("/rows/0");
        long revision=row.get("revisionId").asLong(),caseId=row.get("caseId").asLong();
        jdbc.update("INSERT INTO environments(project_id,code,name,created_at,updated_at) VALUES(?,'QA','QA',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",project);
        jdbc.update("INSERT INTO devices(project_id,code,name,created_at,updated_at) VALUES(?,'WEB','Browser',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",project);
        jdbc.update("INSERT INTO builds(project_id,version_label,platform,created_at,updated_at) VALUES(?,'2','WEB',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",project);
        long env=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM environments WHERE project_id=?",Long.class,project));
        long device=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM devices WHERE project_id=?",Long.class,project));
        long build=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM builds WHERE project_id=?",Long.class,project));
        long member=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,project,tester.getId()));
        var cycle=execution.create(project,outsider.getId(),new vn.syp.tms.execution.ExecutionDtos.CreateCycle("SECOND","Test lần 2",null));
        long cycleId=((Number)cycle.get("id")).longValue();
        cycle=execution.configure(project,outsider.getId(),cycleId,new vn.syp.tms.execution.ExecutionDtos.Configuration(env,device,build,0L));
        long config=((Number)execution.configurations(project,pm.getId(),cycleId).getFirst().get("id")).longValue();
        var input=new LinkedHashMap<String,Object>(Map.of("cycleId",cycleId,"configurationId",config,"assigneeMembershipId",member,"note","Kiểm tra sau sửa","expectedVersion",0,"expectedCycleVersion",cycle.get("version"),"expectedRevisionId",revision));
        String endpoint=path("/test-documents/"+id+"/rows/"+row.get("rowId").asLong()+"/second-test");
        String payload=Objects.requireNonNull(json.writeValueAsString(input));
        mvc.perform(put(endpoint).with(actor(tester)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isForbidden());
        mvc.perform(put(endpoint).with(actor(outsider)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isUnprocessableEntity());
        mvc.perform(put(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isUnprocessableEntity());
        cases.approveRevision(project,outsider.getId(),caseId,revision);
        mvc.perform(put(endpoint).with(actor(outsider)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isOk());
        mvc.perform(put(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isConflict());
        var assignment=body(mvc.perform(get(path("/test-documents/"+id)).with(actor(tester))).andReturn()).at("/secondTests/0");
        long run=assignment.get("runItemId").asLong();
        assertThat(assignment.get("assigneeMembershipId").asLong()).isEqualTo(member);
        assertThat(execution.runs(project,tester.getId(),cycleId,0,20,true,false).items()).hasSize(1);
        cycle=execution.cycle(project,pm.getId(),cycleId);
        execution.activate(project,outsider.getId(),cycleId,new vn.syp.tms.execution.ExecutionDtos.Version(((Number)cycle.get("version")).longValue()));
        var attempt=execution.record(project,outsider.getId(),run,new vn.syp.tms.execution.ExecutionDtos.Attempt("OK",build,"Đã kiểm tra","","",UUID.randomUUID().toString(),0L));
        assertThat(attempt.get("executorName")).isEqualTo(outsider.getDisplayName());
        assertThat(execution.run(project,outsider.getId(),run).get("assigneeMembershipId")).isEqualTo(member);
        mvc.perform(get(path("/test-documents/"+id)).with(actor(pm))).andExpect(jsonPath("$.secondTests[0].resultCode").value("OK"))
                .andExpect(jsonPath("$.rows[0].resultStatus").value("OK"));
        String resultEndpoint=path("/test-documents/"+id+"/rows/"+row.get("rowId").asLong()+"/result");
        mvc.perform(put(resultEndpoint).with(actor(outsider)).with(csrf()).contentType("application/json")
                .content("{\"status\":\"NG\",\"expectedVersion\":1,\"requestKey\":\""+UUID.randomUUID()+"\"}"))
                .andExpect(status().isOk());
        mvc.perform(get(path("/test-documents/"+id)).with(actor(pm))).andExpect(jsonPath("$.secondTests[0].resultCode").value("OK"))
                .andExpect(jsonPath("$.rows[0].resultStatus").value("NG"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,project)).isEqualTo(1);
        assertThat(execution.run(project,outsider.getId(),run).get("resultCode")).isEqualTo("OK");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM run_items WHERE project_id=?",Long.class,project)).isEqualTo(1);
        input.put("expectedVersion",1);input.put("expectedRunVersion",1);
        input.put("note","Đối chiếu xong");
        mvc.perform(put(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(Objects.requireNonNull(json.writeValueAsString(input)))).andExpect(status().isOk());
        input.put("expectedVersion",2);input.put("assigneeMembershipId",jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,project,pm.getId()));
        mvc.perform(put(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(Objects.requireNonNull(json.writeValueAsString(input)))).andExpect(status().isUnprocessableEntity());
        byte[] exported=mvc.perform(get(path("/test-documents/"+id+"/export")).with(actor(pm))).andReturn().getResponse().getContentAsByteArray();
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(exported))) {
            assertThat(book.getSheetAt(0).getRow(0).getCell(14).getStringCellValue()).isEqualTo("Người test lần 2");
            assertThat(book.getSheetAt(0).getRow(1).getCell(15).getStringCellValue()).isEqualTo("Đối chiếu xong");
        }
    }
    @Test void globalAdminImportsWithoutMembershipAndKeepsRealAuthor() throws Exception {
        mvc.perform(get(path("/import-previews/template")).with(actor(outsider))).andExpect(status().isOk());
        var preview = body(mvc.perform(multipart(path("/import-previews")).file(file(CustomerWorkbookFixture.bytes())).with(actor(outsider)).with(csrf()))
                .andExpect(status().isOk()).andReturn());
        long id = preview.get("id").asLong();
        mvc.perform(post(path("/import-previews/"+id+"/commit")).with(actor(outsider)).with(csrf())).andExpect(status().isOk());
        mvc.perform(post(path("/import-previews/"+id+"/commit")).with(actor(outsider)).with(csrf())).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,project,outsider.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM test_case_revisions WHERE project_id=? AND created_by IS NULL AND created_by_user_id=?",Long.class,project,outsider.getId())).isEqualTo(preview.get("validRows").asLong());
        mvc.perform(get(path("/test-documents")).with(actor(pm))).andExpect(jsonPath("$.items[0].updatedBy").value(outsider.getDisplayName()));
        var detail=body(mvc.perform(get(path("/test-documents/"+id)).with(actor(outsider))).andExpect(status().isOk()).andReturn());
        long caseId=detail.at("/rows/0/caseId").asLong(), revisionId=detail.at("/rows/0/revisionId").asLong();
        mvc.perform(get(path("/test-cases/"+caseId)).with(actor(outsider))).andExpect(status().isOk())
                .andExpect(jsonPath("$.currentRevision.createdBy").isEmpty()).andExpect(jsonPath("$.currentRevision.createdByUserId").value(outsider.getId()));
        mvc.perform(post(path("/test-suites")).with(actor(outsider)).with(csrf()).contentType("application/json").content("{\"code\":\"MANUAL\",\"name\":\"Manual suite\"}")).andExpect(status().isOk());
        mvc.perform(post(path("/test-cases/"+caseId+"/revisions/"+revisionId+"/approve")).with(actor(outsider)).with(csrf())).andExpect(status().isOk());
    }
    @Test void importStillEnforcesRolesOwnershipAndArchivedProjects() throws Exception {
        var dev=users.saveAndFlush(new IdentityUser("doc.dev."+UUID.randomUUID().toString().substring(0,8),"Dev thử","unused-hash","DEV"));
        projects.addOrUpdateMember(project,owner.getId(),dev.getId(),new ProjectDtos.SetMember("DEV"));
        for(var denied:List.of(tester,dev)) mvc.perform(multipart(path("/import-previews")).file(file(CustomerWorkbookFixture.bytes())).with(actor(denied)).with(csrf())).andExpect(status().isForbidden());
        var preview=cases.createImportPreview(project,pm.getId(),file(CustomerWorkbookFixture.bytes()));
        mvc.perform(post(path("/import-previews/"+preview.id()+"/commit")).with(actor(outsider)).with(csrf())).andExpect(status().isNotFound());
        jdbc.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",project);
        mvc.perform(multipart(path("/import-previews")).file(file(CustomerWorkbookFixture.bytes())).with(actor(outsider)).with(csrf())).andExpect(status().isConflict());
    }
    @Test void documentResultPersistsExportsAndAuditsWithoutChangingOriginalOrExecution() throws Exception {
        long id=imported();
        var first=body(mvc.perform(get(path("/test-documents/"+id)).with(actor(tester))).andExpect(status().isOk()).andReturn());
        long rowId=first.at("/rows/0/rowId").asLong();String endpoint=path("/test-documents/"+id+"/rows/"+rowId+"/result");
        assertThat(first.at("/rows/0/resultStatus").asText()).isEqualTo("UNEXECUTED");
        String payload=Objects.requireNonNull(json.writeValueAsString(Map.of("status","NG","expectedVersion",0,"requestKey",UUID.randomUUID().toString())));
        for(int attempt=0;attempt<2;attempt++) mvc.perform(put(endpoint).with(actor(tester)).with(csrf()).contentType("application/json").content(payload))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NG")).andExpect(jsonPath("$.version").value(1));
        mvc.perform(put(endpoint).with(actor(outsider)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isConflict());
        mvc.perform(put(endpoint).with(actor(tester)).with(csrf()).contentType("application/json").content(Objects.requireNonNull(payload.replace("NG","OK")))).andExpect(status().isConflict());
        mvc.perform(get(path("/test-documents/"+id)).with(actor(tester))).andExpect(jsonPath("$.rows[0].cells[8]").value("NG"))
                .andExpect(jsonPath("$.document.resultCounts.NG").value(1));
        mvc.perform(get(path("/test-documents/"+id+"/rows/"+rowId+"/result-history")).with(actor(tester)))
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].before").value("UNEXECUTED")).andExpect(jsonPath("$[0].after").value("NG"));
        byte[] export=mvc.perform(get(path("/test-documents/"+id+"/export")).with(actor(tester))).andReturn().getResponse().getContentAsByteArray();
        byte[] original=mvc.perform(get(path("/test-documents/"+id+"/export?original=true")).with(actor(tester))).andReturn().getResponse().getContentAsByteArray();
        try(var current=new XSSFWorkbook(new ByteArrayInputStream(export));var source=new XSSFWorkbook(new ByteArrayInputStream(original))) {
            assertThat(current.getSheetAt(0).getRow(1).getCell(8).getStringCellValue()).isEqualTo("NG");
            assertThat(source.getSheetAt(0).getRow(1).getCell(8).getStringCellValue()).isEqualTo("Fixed");
            assertThat(current.getSheetAt(0).getRow(1).getCell(12).getStringCellValue()).isEqualTo("NG");
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,project)).isZero();
    }
    @Test void memberOpensNamedFileAndExportKeepsExtraColumnsAndOriginalBytes() throws Exception {
        byte[] bytes=CustomerWorkbookFixture.bytes();
        var preview=cases.createImportPreview(project,pm.getId(),file(bytes));
        assertThat(preview.errorRows()).isZero(); cases.commitImportPreview(project,pm.getId(),preview.id());
        mvc.perform(get(path("/test-documents")).with(actor(tester))).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].fileName").value("仕様書_VI.xlsx"));
        var detail=body(mvc.perform(get(path("/test-documents/"+preview.id())).with(actor(tester))).andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].sourceId").value("1")).andExpect(jsonPath("$.rows[0].cells[12]").value("NG"))
                .andExpect(jsonPath("$.document.sourceCounts.Fixed").value(1)).andReturn());
        assertThat(detail.get("rows").get(0).get("caseNo").asText()).startsWith("XLSX-");
        byte[] original=mvc.perform(get(path("/test-documents/"+preview.id()+"/export")).param("original","true").with(actor(tester)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(original).isEqualTo(bytes);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,project)).isZero();
    }
    @Test void repeatCommitAndImportByAnotherPmDoesNotDuplicateAndDifferentFileCanReuseSourceId() throws Exception {
        byte[] bytes=CustomerWorkbookFixture.bytes(); var preview=cases.createImportPreview(project,pm.getId(),file(bytes));
        cases.commitImportPreview(project,pm.getId(),preview.id()); cases.commitImportPreview(project,pm.getId(),preview.id());
        assertThat(cases.createImportPreview(project,owner.getId(),file(bytes)).id()).isEqualTo(preview.id());
        byte[] other;
        try(var b=new XSSFWorkbook(new ByteArrayInputStream(bytes));var out=new ByteArrayOutputStream()) {
            b.getSheetAt(0).getRow(1).getCell(1).setCellValue("Nội dung file khác"); b.write(out); other=out.toByteArray();
        }
        var second=cases.createImportPreview(project,pm.getId(),file(other)); cases.commitImportPreview(project,pm.getId(),second.id());
        assertThat(jdbc.queryForObject("SELECT COUNT(DISTINCT case_no) FROM test_cases WHERE project_id=?",Long.class,project)).isEqualTo(2);
    }
    @Test void documentsExcludePrivatePreviewsAndEnforceProjectScopeOnEveryDownload() throws Exception {
        var pending=cases.createImportPreview(project,pm.getId(),file(CustomerWorkbookFixture.bytes()));
        mvc.perform(get(path("/test-documents/"+pending.id())).with(actor(tester))).andExpect(status().isNotFound());
        mvc.perform(get(path("/import-previews/"+pending.id())).with(actor(owner))).andExpect(status().isNotFound());
        mvc.perform(multipart(path("/import-previews")).file(file(CustomerWorkbookFixture.bytes())).with(actor(tester)).with(csrf())).andExpect(status().isForbidden());
        cases.commitImportPreview(project,pm.getId(),pending.id());
        var unrelated=users.saveAndFlush(new IdentityUser("doc.unrelated."+UUID.randomUUID().toString().substring(0,8),"Unrelated","unused-hash","TESTER"));
        for(String tail:List.of("/test-documents","/test-documents/"+pending.id(),"/test-documents/"+pending.id()+"/export")) {
            mvc.perform(get(path(tail)).with(actor(outsider))).andExpect(status().isOk());
            mvc.perform(get(path(tail)).with(actor(unrelated))).andExpect(status().isNotFound());
        }
        mvc.perform(get(path("/test-documents")).param("size","1000").with(actor(tester))).andExpect(status().isUnprocessableEntity());
        mvc.perform(get(path("/test-documents")).param("keyword","%").with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
    }
    @Test void twoPendingPreviewsCommitToOneDocumentAndInvalidRowsNeverPartiallyImport() throws Exception {
        byte[] bytes=CustomerWorkbookFixture.bytes();
        var first=cases.createImportPreview(project,pm.getId(),file(bytes));
        var second=cases.createImportPreview(project,owner.getId(),file(bytes));
        cases.commitImportPreview(project,pm.getId(),first.id());
        assertThat(cases.commitImportPreview(project,owner.getId(),second.id()).id()).isEqualTo(first.id());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM test_cases WHERE project_id=?",Long.class,project)).isEqualTo(1);
        byte[] invalid;
        try(var b=new XSSFWorkbook(new ByteArrayInputStream(bytes));var out=new ByteArrayOutputStream()) {
            b.getSheetAt(0).getRow(1).getCell(6).setCellValue("");b.write(out);invalid=out.toByteArray();
        }
        var bad=cases.createImportPreview(project,pm.getId(),file(invalid));assertThat(bad.errorRows()).isEqualTo(1);
        assertThatThrownBy(()->cases.commitImportPreview(project,pm.getId(),bad.id())).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM test_cases WHERE project_id=?",Long.class,project)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM test_suites WHERE project_id=?",Long.class,project)).isEqualTo(1);
    }
    @Test void revisedCaseChangesGridAndExportWhileSourceRemainsUntouched() throws Exception {
        long id=imported(); var detail=body(mvc.perform(get(path("/test-documents/"+id)).with(actor(tester))).andExpect(status().isOk()).andReturn());
        var row=detail.get("rows").get(0); long caseId=row.get("caseId").asLong(); long revisionId=row.get("revisionId").asLong();
        cases.addRevision(project,pm.getId(),caseId,new TestCaseDtos.CreateRevision("Tiêu đề mới","Điều kiện","Bước mới","Kết quả mới","","","","","https://example.org/issues/1",revisionId));
        mvc.perform(get(path("/test-documents/"+id)).with(actor(tester))).andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].cells[1]").value("Tiêu đề mới")).andExpect(jsonPath("$.rows[0].sourceCells[1]").value("Đăng nhập"))
                .andExpect(jsonPath("$.document.updatedBy").value("PM thử"));
        byte[] exported=mvc.perform(get(path("/test-documents/"+id+"/export")).with(actor(tester))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(exported))) {
            assertThat(book.getSheetAt(0).getRow(1).getCell(1).getStringCellValue()).isEqualTo("Tiêu đề mới");
            assertThat(book.getSheetAt(0).getRow(1).getCell(12).getStringCellValue()).isEqualTo("NG");
        }
    }
    @Test void legacyInternalImportRemainsAvailableWithoutStoredBinary() throws Exception {
        cases.createSuite(project,pm.getId(),new TestCaseDtos.CreateSuite("AUTH","Nhóm","",null,0));
        var preview=cases.createImportPreview(project,pm.getId(),file(new TestCaseWorkbook().template("AUTH")));
        cases.commitImportPreview(project,pm.getId(),preview.id());
        jdbc.update("UPDATE import_batches SET source_workbook=NULL,sheet_name=NULL,mapping_version='1.0' WHERE id=?",preview.id());
        jdbc.update("UPDATE import_rows SET raw_data_json=JSON_REMOVE(raw_data_json,'$.sourceCells') WHERE batch_id=?",preview.id());
        mvc.perform(get(path("/test-documents/"+preview.id())).with(actor(tester))).andExpect(status().isOk())
                .andExpect(jsonPath("$.document.hasSourceFile").value(false));
        byte[] bytes=mvc.perform(get(path("/test-documents/"+preview.id()+"/export")).with(actor(tester))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(new TestCaseWorkbook().parse(file(bytes)).rows().getFirst().caseNo()).isEqualTo("TC-DEMO-001");
        mvc.perform(get(path("/test-documents/"+preview.id()+"/export")).param("original","true").with(actor(tester))).andExpect(status().isNotFound());
    }
}
