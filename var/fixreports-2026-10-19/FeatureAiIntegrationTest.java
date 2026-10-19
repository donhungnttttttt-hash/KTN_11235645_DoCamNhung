package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.syp.tms.ai.*;
import vn.syp.tms.identity.*;

/** Exact isolated-target guard and real HTTP fixtures inherited from core integration. No provider calls. */
class FeatureAiIntegrationTest extends FeatureIntegrationTest {
    @Autowired AiPortfolioContext portfolio;
    @Autowired AiContextService typed;
    void login(IdentityUser user){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),user.getVersion()),null,List.of()));}
    @AfterEach void logout(){SecurityContextHolder.clearContext();}
    com.fasterxml.jackson.databind.JsonNode facts(AiDraftService.Task task){for(var source:task.data().path("sources"))if(source.path("facts").path("projectId").asLong()==p)return source.path("facts");throw new AssertionError("Project facts missing");}
    @Test void memberCanReadRelevantCasesOwnedByAnotherTesterWithoutManagementTotals()throws Exception{
        long f=feature("Authorized case"),d=imported(f,internal());var row=read(d).at("/rows/0");
        assertThat(assign(d,pm,0,List.of(scope(bm,List.of(row.path("rowId").asLong())))).getResponse().getStatus()).isEqualTo(200);
        String issueKey="AI-"+UUID.randomUUID();
        db.update("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,1,?,'BUG','Authorized other owner issue','Relevant detail',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,REPEAT('a',64))",p,issueKey,bm,bm,UUID.randomUUID().toString());
        long issue=Objects.requireNonNull(db.queryForObject("SELECT id FROM work_items WHERE project_id=? AND item_key=?",Long.class,p,issueKey));
        db.update("INSERT INTO work_item_feature_context(project_id,work_item_id,feature_id,document_id,row_id,monkey,created_by_user_id) VALUES(?,?,?,?,?,FALSE,?)",p,issue,f,d,row.path("rowId").asLong(),b.getId());
        for(var reader:List.of(a,dev)){
            login(reader);var scope=portfolio.currentProject(reader.getId(),p,f);
            var data=facts(portfolio.prepareProject(reader.getId(),p,f,scope.reference(),UUID.randomUUID().toString(),"Xem case TC1"));
            assertThat(data.path("caseSample").toString()).contains("Title1","Steps1","Expected1");
            assertThat(data.path("issueSample").toString()).contains("Authorized other owner issue","Relevant detail");
            assertThat(data.has("execution")).isFalse();assertThat(data.has("workload")).isFalse();
            assertThat(data.path("sourceFiles").get(0).has("total")).isFalse();
        }
    }
    @Test void experienceCountsRecordedActualActorsIncludingPreviousActorsAndResets()throws Exception{
        long f=feature("Actual actors"),d=imported(f,internal()),row=read(d).at("/rows/0/rowId").asLong();
        result(d,row,admin,"OK",0,200);result(d,row,pm,"NG",1,200);result(d,row,pm,"UNEXECUTED",2,200);
        login(admin);var scope=portfolio.currentProject(admin.getId(),p,f);var data=facts(portfolio.prepareProject(admin.getId(),p,f,scope.reference(),UUID.randomUUID().toString(),"Kinh nghiệm"));
        assertThat(data.path("experience").size()).isEqualTo(2);
        assertThat(data.path("experience").findValuesAsText("actor")).containsExactlyInAnyOrder(admin.getDisplayName(),pm.getDisplayName());
        long changes=0;for(var actor:data.path("experience"))changes+=actor.path("recordedChanges").asLong();assertThat(changes).isEqualTo(3);
        assertThat(data.path("execution").path("tested").asInt()).isZero();
    }
    @Test void selectedFeatureKeepsAuthorizedProjectBackgroundAndCurrentMetric()throws Exception{
        long f=feature("Selected"),d=imported(f,internal());long other=feature("Background"),otherDoc=imported(other,internal());
        var rows=read(d).path("rows");result(d,rows.get(0).path("rowId").asLong(),admin,"OK",0,200);result(d,rows.get(1).path("rowId").asLong(),admin,"P",0,200);result(d,rows.get(2).path("rowId").asLong(),admin,"NA",0,200);
        login(outside);var scope=portfolio.currentProject(outside.getId(),p,f);var data=facts(portfolio.prepareProject(outside.getId(),p,f,scope.reference(),UUID.randomUUID().toString(),"Tiến độ"));
        assertThat(data.path("execution").path("executionPercent").asDouble()).isEqualTo(60);
        assertThat(data.path("sourceFiles").toString()).doesNotContain("\"documentId\":"+otherDoc+",");
        assertThat(data.path("projectBackground").path("sourceFiles").toString()).contains("Background");
        mvc.perform(get("/api/v1/ai/projects/"+p+"/features").with(actor(outside))).andExpect(status().isOk());
        mvc.perform(post(path("/features")).with(actor(outside)).with(vn.syp.tms.support.MockMvcContracts.csrf()).contentType("application/json").content(encode(Map.of("name","No CRUD","environment","","description","","requestKey",UUID.randomUUID())))).andExpect(status().isNotFound());
    }
    @Test void typedAssignmentTargetsFeatureDocumentsWithoutDeviceOrRunSetup()throws Exception{
        long f=feature("Typed"),d=imported(f,internal());login(pm);
        assertThat(typed.targets(p,pm.getId(),AiPurpose.PM_ASSIGNMENT_SUGGESTION,"").items()).extracting(AiContextService.Target::id).contains(d);
        var task=typed.prepare(p,pm.getId(),AiPurpose.PM_ASSIGNMENT_SUGGESTION,d,UUID.randomUUID().toString());
        assertThat(task.sourceReference()).isEqualTo("document:"+d);
        assertThat(task.data().toString()).contains("Typed").doesNotContain("allocatedDevices","cycleStatus","doingFiles");
    }
    @Test void readScopeApiAndOutsideExperienceNeverExposeAnotherProjectsIdentity()throws Exception{
        long other=projects.create(admin.getId(),new vn.syp.tms.project.ProjectDtos.CreateProject("AI"+UUID.randomUUID().toString().substring(0,8),"Private outside project","","Asia/Ho_Chi_Minh")).id();
        var listed=body(mvc.perform(get("/api/v1/ai/projects").with(actor(a))).andExpect(status().isOk()).andReturn());
        assertThat(listed.toString()).doesNotContain("Private outside project","membershipId","membershipVersion");
        mvc.perform(get("/api/v1/ai/projects/"+other+"/features").with(actor(a))).andExpect(status().isNotFound());
        login(a);var scope=portfolio.current(a.getId());var task=portfolio.prepare(a.getId(),scope.reference(),UUID.randomUUID().toString(),"Kinh nghiệm ngoài dự án");
        assertThat(task.data().toString()).doesNotContain("Private outside project");
        task.data().path("safeExperience").fieldNames().forEachRemaining(key->assertThat(Set.of("available","patterns","limitation")).contains(key));
    }
    @Test void archivedFeatureRetainsPrivateScopeReadButRejectsNewInference()throws Exception{
        long f=feature("History feature");login(admin);String before=portfolio.currentProject(admin.getId(),p,f).reference();
        mvc.perform(post(path("/features/"+f+"/archive")).with(actor(pm)).with(vn.syp.tms.support.MockMvcContracts.csrf()).contentType("application/json").content(encode(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        login(admin);
        assertThatCode(()->portfolio.assertProjectCurrent(admin.getId(),p,f,before,false)).doesNotThrowAnyException();
        assertThatThrownBy(()->portfolio.prepareProject(admin.getId(),p,f,before,UUID.randomUUID().toString(),"Current progress")).isInstanceOfSatisfying(vn.syp.tms.shared.web.BusinessException.class,error->assertThat(error.code()).isEqualTo("ARCHIVED"));
    }
    @Test void repeatedCurrentCustomerExportReusesAssignmentHeadersAndNeverImportsTesterExperience()throws Exception{
        for(byte[] original:List.of(CustomerWorkbookFixture.reorderedBytes(),internal())){
        long f1=feature("Roundtrip source"),d1=imported(f1,original),r1=read(d1).at("/rows/0/rowId").asLong();
        assertThat(assign(d1,pm,0,List.of(scope(am,List.of(r1)))).getResponse().getStatus()).isEqualTo(200);result(d1,r1,a,"OK",0,200);
        assertThat(assign(d1,pm,1,List.of(scope(am,List.of()),scope(bm,List.of(r1)))).getResponse().getStatus()).isEqualTo(200);
        byte[] first=mvc.perform(get(path("/test-documents/"+d1+"/export")).with(actor(pm))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        long f2=feature("Roundtrip independent"),d2=imported(f2,first),r2=read(d2).at("/rows/0/rowId").asLong();
        assertThat(read(d2).at("/rows/0/resultStatus").asText()).isEqualTo("UNEXECUTED");
        assertThat(assign(d2,pm,0,List.of(scope(bm,List.of(r2)))).getResponse().getStatus()).isEqualTo(200);
        assertThat(assign(d2,pm,1,List.of(scope(bm,List.of()),scope(am,List.of(r2)))).getResponse().getStatus()).isEqualTo(200);
        byte[] second=mvc.perform(get(path("/test-documents/"+d2+"/export")).with(actor(pm))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        var parsed=new TestCaseWorkbook().parse(new org.springframework.mock.web.MockMultipartFile("file","roundtrip.xlsx","application/octet-stream",second));
        var row=parsed.rows().getFirst();
        if(TestCaseWorkbook.CUSTOMER.equals(parsed.format())){
            assertThat(row.sourceColumns()).containsKeys("result","tester","latestTester");
            assertThat(row.sourceCells().get(row.sourceColumns().get("tester"))).isEqualTo(b.getDisplayName());assertThat(row.sourceCells().get(row.sourceColumns().get("latestTester"))).isEqualTo(a.getDisplayName());
        }else try(var book=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(second))){
            assertThat(book.getSheetAt(0).getRow(0).getLastCellNum()).isEqualTo((short)14);
            assertThat(book.getSheetAt(0).getRow(1).getCell(12).getStringCellValue()).isEqualTo(b.getDisplayName());assertThat(book.getSheetAt(0).getRow(1).getCell(13).getStringCellValue()).isEqualTo(a.getDisplayName());
        }
        login(admin);var scope=portfolio.currentProject(admin.getId(),p,f2);var facts=facts(portfolio.prepareProject(admin.getId(),p,f2,scope.reference(),UUID.randomUUID().toString(),"Kinh nghiệm"));
        assertThat(facts.path("experience").size()).isZero();
        assertThat(mvc.perform(get(path("/test-documents/"+d2+"/export?original=true")).with(actor(pm))).andReturn().getResponse().getContentAsByteArray()).isEqualTo(first);
        }
    }

    @Test void workersReceiveSelectedFilePersonalProgressAndActualCaseHistoryBeyondSamples()throws Exception{
        byte[] twelve;
        try(var book=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(internal()));var out=new java.io.ByteArrayOutputStream()){
            for(int n=6;n<=12;n++){var row=book.getSheetAt(0).createRow(n);var cells=List.of("TC"+n,"SUITE","Title"+n,"","Steps"+n,"Expected"+n,"","","","","");for(int col=0;col<cells.size();col++)row.createCell(col).setCellValue(cells.get(col));}book.write(out);twelve=out.toByteArray();
        }
        long f=feature("Worker facts"),d=imported(f,twelve);db.update("UPDATE import_batches SET file_name='Long file.xlsx' WHERE project_id=? AND id=?",p,d);
        var ids=new ArrayList<Long>();read(d).path("rows").forEach(row->ids.add(row.path("rowId").asLong()));assertThat(ids).hasSize(12);
        assertThat(assign(d,pm,0,List.of(scope(bm,ids))).getResponse().getStatus()).isEqualTo(200);result(d,ids.get(11),b,"NG",0,200);
        assertThat(assign(d,pm,1,List.of(scope(bm,List.of()),scope(am,ids))).getResponse().getStatus()).isEqualTo(200);result(d,ids.get(11),pm,"OK",1,200);
        for(int n=0;n<6;n++)result(d,ids.get(n),a,n==0?"NA":n==1?"P":"OK",0,200);
        long other=imported(feature("Other feature"),internal());var otherRows=new ArrayList<Long>();read(other).path("rows").forEach(row->otherRows.add(row.path("rowId").asLong()));assertThat(assign(other,pm,0,List.of(scope(am,otherRows))).getResponse().getStatus()).isEqualTo(200);
        for(int n=0;n<11;n++)imported(f,internal()); // Requested readable file is older than the ten-file sample.
        long allowed=p;
        try{p=projects.create(pm.getId(),new vn.syp.tms.project.ProjectDtos.CreateProject("WH"+UUID.randomUUID().toString().substring(0,8),"FOREIGN_WORKER_FACTS","","Asia/Ho_Chi_Minh")).id();long hidden=imported(feature("Hidden worker feature"),twelve);db.update("UPDATE import_batches SET file_name='Long file.xlsx' WHERE project_id=? AND id=?",p,hidden);db.update("UPDATE test_case_revisions SET title_vi='FOREIGN_CASE_HISTORY' WHERE project_id=?",p);}finally{p=allowed;}
        var checked=new org.assertj.core.api.SoftAssertions();
        for(var reader:List.of(a,dev)){
            login(reader);var scope=portfolio.currentProject(reader.getId(),p,f);var task=portfolio.prepareProject(reader.getId(),p,f,scope.reference(),UUID.randomUUID().toString(),"Tiến độ Long file.xlsx và phần việc của tôi, ai đã từng ghi Status TC12?");var value=facts(task);
            checked.assertThat(value.has("personal")).isTrue();checked.assertThat(value.path("personal").path("assignment").path("assignedCases").asInt()).isEqualTo(reader==a?12:0);checked.assertThat(value.path("personal").path("assignment").path("testedCases").asInt()).isEqualTo(reader==a?7:0);
            var progress=value.path("selectedFileProgress");checked.assertThat(progress.size()).isEqualTo(1);if(!progress.isEmpty()){checked.assertThat(progress.get(0).path("documentId").asLong()).isEqualTo(d);checked.assertThat(progress.get(0).path("total").asInt()).isEqualTo(12);checked.assertThat(progress.get(0).path("tested").asInt()).isEqualTo(7);checked.assertThat(progress.get(0).path("executionPercent").asDouble()).isEqualTo(58.33);}
            var selected=value.path("caseSample").get(0);checked.assertThat(selected.path("sourceId").asText()).isEqualTo("TC12");checked.assertThat(selected.path("resultHistory").findValuesAsText("actor")).containsExactlyInAnyOrder(b.getDisplayName(),pm.getDisplayName());
            assertThat(value.has("execution")).isFalse();assertThat(value.has("workByStatus")).isFalse();assertThat(value.has("workload")).isFalse();assertThat(task.data().toString()).doesNotContain("FOREIGN_WORKER_FACTS","FOREIGN_CASE_HISTORY");
            var named=facts(portfolio.prepareProject(reader.getId(),p,f,scope.reference(),UUID.randomUUID().toString(),"Ai đã ghi Status cho case Title12 trong Long file.xlsx?"));
            checked.assertThat(named.path("caseSample").get(0).path("sourceId").asText()).isEqualTo("TC12");
            checked.assertThat(named.path("sourceFiles").toString()).contains("Long file.xlsx");
        }
        checked.assertAll();
    }

    @Test void archivedDocumentIssuesAreExcludedConsistentlyFromManagementAndWorkerFacts()throws Exception{
        long f=feature("Issue active scope"),active=imported(f,internal()),hidden=imported(f,internal());
        for(int n=0;n<3;n++){
            String title=n==0?"Active readable issue":n==1?"ARCHIVED_DOCUMENT_ISSUE":"Monkey without document";String key="AF-"+UUID.randomUUID();
            db.update("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,assignee_membership_id,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,?,?,'BUG',?,'Fixture',?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,REPEAT('b',64))",p,n+1,key,title,am,member(pm),member(pm),UUID.randomUUID().toString());
            long issue=java.util.Objects.requireNonNull(db.queryForObject("SELECT id FROM work_items WHERE project_id=? AND item_key=?",Long.class,p,key));
            db.update("INSERT INTO work_item_feature_context(project_id,work_item_id,feature_id,document_id,monkey,created_by_user_id) VALUES(?,?,?,?,?,?)",p,issue,f,n==2?null:n==0?active:hidden,n==2,pm.getId());
        }
        mvc.perform(post(path("/features/"+f+"/documents/"+hidden+"/archive")).with(actor(pm)).with(vn.syp.tms.support.MockMvcContracts.csrf()).contentType("application/json").content(encode(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        var official=body(mvc.perform(get(path("/issues?featureId="+f)).with(actor(a))).andExpect(status().isOk()).andReturn());assertThat(official.path("totalItems").asInt()).isEqualTo(2);
        var checked=new org.assertj.core.api.SoftAssertions();
        for(var reader:List.of(pm,a,dev)){
            login(reader);var scope=portfolio.currentProject(reader.getId(),p,f);var value=facts(portfolio.prepareProject(reader.getId(),p,f,scope.reference(),UUID.randomUUID().toString(),"Issue hiện hành"));
            checked.assertThat(value.path("issueSample").toString()).contains("Active readable issue","Monkey without document").doesNotContain("ARCHIVED_DOCUMENT_ISSUE");
            checked.assertThat(value.path("myWorkSample").toString()).doesNotContain("ARCHIVED_DOCUMENT_ISSUE");
            if(reader==pm){long total=0;for(var group:value.path("workByStatus"))total+=group.path("total").asLong();checked.assertThat(total).isEqualTo(2);}
        }
        checked.assertAll();
    }
}
