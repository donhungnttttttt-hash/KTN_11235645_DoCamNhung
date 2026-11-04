package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import com.fasterxml.jackson.databind.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
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

@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="integration")
class FeatureIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){vn.syp.tms.support.CurrentWorkflowDatabaseGuard.configure(r);}
    @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired JdbcTemplate db;@Autowired IdentityUserRepository users;@Autowired ProjectService projects;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    IdentityUser admin,pm,a,b,dev,outside;long p,am,bm;
    List<Map<String,Object>> registeredAdmins;
    @BeforeEach void setup(){String tag=UUID.randomUUID().toString().substring(0,8);registeredAdmins=db.queryForList("SELECT slot,user_id FROM system_admin_registry ORDER BY slot");assertThat(registeredAdmins).hasSize(2);admin=users.findById(String.valueOf(registeredAdmins.getFirst().get("user_id"))).orElseThrow();pm=user("pm"+tag,"PM");a=user("a"+tag,"USER");b=user("b"+tag,"USER");dev=user("dev"+tag,"USER");outside=user("outside"+tag,"PM");
        var creator=users.findById(String.valueOf(registeredAdmins.getLast().get("user_id"))).orElseThrow();p=projects.create(creator.getId(),new ProjectDtos.CreateProject("FR"+tag,"Feature thử","","Asia/Ho_Chi_Minh")).id();
        for(var entry:Map.of(pm,"PM",a,"USER",b,"USER",dev,"USER").entrySet())projects.addOrUpdateMember(p,admin.getId(),entry.getKey().getId(),new ProjectDtos.SetMember(entry.getValue()));
        am=member(a);bm=member(b);
    }
    @AfterEach void registryWasPreserved(){assertThat(db.queryForList("SELECT slot,user_id FROM system_admin_registry ORDER BY slot")).isEqualTo(registeredAdmins);}
    IdentityUser user(String name,String role){return users.saveAndFlush(new IdentityUser("fr."+name,name,"not-login",role));}
    long member(IdentityUser user){return Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,user.getId()));}
    @NonNull RequestPostProcessor actor(IdentityUser user){return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),user.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+user.getRole())))));}
    @NonNull String path(String tail){return "/api/v1/projects/"+p+tail;}
    @NonNull String encode(Object value)throws Exception{return Objects.requireNonNull(json.writeValueAsString(value));}
    JsonNode body(MvcResult result)throws Exception{return json.readTree(result.getResponse().getContentAsByteArray());}
    JsonNode read(long d)throws Exception{return body(mvc.perform(get(path("/test-documents/"+d)).with(actor(a))).andExpect(status().isOk()).andReturn());}
    long feature(String name)throws Exception{return body(mvc.perform(post(path("/features")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(Map.of("name",name,"environment","server nhập tự do / URL","description","Mô tả","requestKey",UUID.randomUUID())))).andExpect(status().isCreated()).andReturn()).get("id").asLong();}
    byte[] internal()throws Exception{try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()){var sheet=book.createSheet("TestCases");var header=sheet.createRow(0);for(int c=0;c<11;c++)header.createCell(c).setCellValue(TestCaseWorkbook.HEADERS.get(c));for(int n=1;n<=5;n++){var row=sheet.createRow(n);var cells=List.of("TC"+n,"UNREGISTERED-SUITE","Title"+n,"","Steps"+n,"Expected"+n,"","","","","reference");for(int c=0;c<11;c++)row.createCell(c).setCellValue(cells.get(c));}book.write(out);return out.toByteArray();}}
    long imported(long f,byte[] bytes)throws Exception{long id=body(mvc.perform(multipart(path("/features/"+f+"/import-previews")).file(new MockMultipartFile("file","cases.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes)).with(actor(pm)).with(csrf())).andExpect(status().isOk()).andReturn()).get("id").asLong();mvc.perform(post(path("/features/"+f+"/import-previews/"+id+"/commit")).with(actor(pm)).with(csrf())).andExpect(status().isOk());return id;}
    MvcResult assign(long d,IdentityUser user,long version,List<Map<String,Object>> changes)throws Exception{return mvc.perform(put(path("/test-documents/"+d+"/assignments")).with(actor(user)).with(csrf()).contentType("application/json").content(encode(Map.of("expectedVersion",version,"requestKey",UUID.randomUUID(),"changes",changes)))).andReturn();}
    Map<String,Object> scope(long member,List<Long> rows){return Map.of("assigneeMembershipId",member,"rowIds",rows);}
    void result(long d,long row,IdentityUser user,String value,long version,int expected)throws Exception{mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(user)).with(csrf()).contentType("application/json").content(encode(Map.of("status",value,"expectedVersion",version,"requestKey",UUID.randomUUID())))).andExpect(status().is(expected));}

    @Test void onlyProjectPmAndGlobalAdminManageFeaturesAndImports()throws Exception{
        for(var user:List.of(a,b,dev))mvc.perform(post(path("/features")).with(actor(user)).with(csrf()).contentType("application/json").content(encode(Map.of("name","Denied","environment","","description","","requestKey",UUID.randomUUID())))).andExpect(status().isForbidden());
        mvc.perform(get(path("/features")).with(actor(outside))).andExpect(status().isNotFound());long f=feature("Allowed");
        mvc.perform(multipart(path("/features/"+f+"/import-previews")).file(new MockMultipartFile("file","cases.xlsx","application/octet-stream",internal())).with(actor(a)).with(csrf())).andExpect(status().isForbidden());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,admin.getId())).isZero();
    }
    @Test void identicalInternalAndCustomerWorkbooksHaveIndependentMutableCases()throws Exception{
        for(byte[] bytes:List.of(internal(),CustomerWorkbookFixture.reorderedBytes())){
            long fa=feature("A"),fb=feature("B"),da=imported(fa,bytes),dbb=imported(fb,bytes);var ar=read(da).at("/rows/0");var br=read(dbb).at("/rows/0");assertThat(ar.get("caseId").asLong()).isNotEqualTo(br.get("caseId").asLong());
            int column=read(da).at("/columns/titleVi").isMissingNode()?2:read(da).at("/columns/titleVi").asInt();
            mvc.perform(put(path("/test-documents/"+da+"/rows/"+ar.get("rowId").asLong()+"/cells/"+column)).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(Map.of("value","Edited A only","expectedVersion",0,"expectedRevisionId",ar.get("revisionId").asLong())))).andExpect(status().isOk());
            assertThat(db.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,admin.getId())).as("Actual identity authorship does not invent an ADMIN project member").isZero();
            assertThat(read(dbb).at("/rows/0/cells/"+column).asText()).isEqualTo(br.at("/cells/"+column).asText());
            if(read(da).get("headers").size()>11){
                var afterCanonical=read(da).at("/rows/0");int extra=read(da).get("headers").size()-1;
                mvc.perform(put(path("/test-documents/"+da+"/rows/"+ar.get("rowId").asLong()+"/cells/"+extra)).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("value","Noncanonical A only","expectedVersion",0,"expectedRevisionId",afterCanonical.get("revisionId").asLong())))).andExpect(status().isOk());
                assertThat(read(da).at("/rows/0/cells/"+extra).asText()).isEqualTo("Noncanonical A only");assertThat(read(dbb).at("/rows/0/cells/"+extra).asText()).isEqualTo(br.at("/cells/"+extra).asText());
            }
            byte[] original=mvc.perform(get(path("/test-documents/"+da+"/export?original=true")).with(actor(a))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();assertThat(original).isEqualTo(bytes);
            assertThat(assign(da,a,0,List.of(scope(am,List.of(ar.get("rowId").asLong())))).getResponse().getStatus()).isEqualTo(200);result(da,ar.get("rowId").asLong(),a,"OK",0,200);assertThat(read(dbb).at("/rows/0/resultStatus").asText()).isEqualTo("UNEXECUTED");
        }
    }
    @Test void statusProgressAssignmentHistoryAndReassignmentNeedNoLegacyGates()throws Exception{
        long f=feature("Progress"),d=imported(f,internal());var rows=read(d).get("rows");var ids=new ArrayList<Long>();rows.forEach(r->ids.add(r.get("rowId").asLong()));
        assertThat(assign(d,a,0,List.of(scope(am,ids))).getResponse().getStatus()).isEqualTo(200);
        result(d,ids.get(2),a,"OK",0,200);result(d,ids.get(3),a,"P",0,200);result(d,ids.get(4),a,"NA",0,200);
        var detail=read(d);assertThat(detail.at("/document/testedCaseCount").asInt()).isEqualTo(3);assertThat(detail.at("/document/caseCount").asInt()).isEqualTo(5);assertThat(detail.at("/document/progressPercent").asDouble()).isEqualTo(60);
        assertThat(assign(d,pm,1,List.of(scope(am,ids.subList(0,2)),scope(bm,ids.subList(2,5)))).getResponse().getStatus()).isEqualTo(200);
        var reassigned=read(d).at("/rows/2");assertThat(reassigned.get("resultStatus").asText()).isEqualTo("OK");assertThat(reassigned.get("firstTesterName").asText()).isEqualTo(a.getDisplayName());assertThat(reassigned.get("latestTesterName").asText()).isEqualTo(b.getDisplayName());assertThat(reassigned.get("resultUpdatedBy").asText()).isEqualTo(a.getDisplayName());
        result(d,ids.get(2),a,"NG",1,403);result(d,ids.get(2),dev,"NG",1,403);result(d,ids.get(2),b,"NG",0,409);
        mvc.perform(get(path("/test-documents/"+d+"/assignment-history")).with(actor(a))).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(8));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM run_items WHERE project_id=?",Long.class,p)).isZero();assertThat(db.queryForObject("SELECT COUNT(*) FROM device_allocations WHERE project_id=?",Long.class,p)).isZero();
    }
    @Test void overlapAndConcurrentClaimsCannotOverwriteAnotherPersonsScope()throws Exception{
        long d=imported(feature("Concurrency"),internal()),row=read(d).at("/rows/0/rowId").asLong();
        try(var executor=Executors.newFixedThreadPool(2)){var ready=new CountDownLatch(2);var start=new CountDownLatch(1);var outcomes=new ArrayList<Future<Integer>>();for(var user:List.of(a,b))outcomes.add(executor.submit(()->{ready.countDown();start.await();return assign(d,user,0,List.of(scope(user==a?am:bm,List.of(row)))).getResponse().getStatus();}));assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();start.countDown();var codes=new ArrayList<Integer>();for(var task:outcomes)codes.add(task.get(10,TimeUnit.SECONDS));assertThat(codes).containsExactlyInAnyOrder(200,409);}
        var current=read(d).at("/rows/0/assigneeMembershipId").asLong();IdentityUser other=current==am?b:a;assertThat(assign(d,other,1,List.of(scope(current==am?bm:am,List.of(row)))).getResponse().getStatus()).isEqualTo(409);
    }
    @Test void competingSelfClaimsHaveOneWinner()throws Exception{
        long d=imported(feature("Two real connections"),internal()),row=read(d).at("/rows/0/rowId").asLong();
        var connections=ConcurrentHashMap.<Long>newKeySet();var ready=new CountDownLatch(2);var start=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)){
            var outcomes=new ArrayList<Future<Integer>>();
            for(var user:List.of(a,b))outcomes.add(executor.submit(()->new org.springframework.transaction.support.TransactionTemplate(transactions).execute(tx->{
                connections.add(db.queryForObject("SELECT CONNECTION_ID()",Long.class));ready.countDown();
                try{assertThat(start.await(5,TimeUnit.SECONDS)).isTrue();int code=assign(d,user,0,List.of(scope(user==a?am:bm,List.of(row)))).getResponse().getStatus();if(code>=400)tx.setRollbackOnly();return code;}
                catch(Exception error){throw new IllegalStateException(error);}
            })));
            assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();assertThat(connections).hasSize(2);start.countDown();
            var codes=new ArrayList<Integer>();for(var task:outcomes)codes.add(task.get(15,TimeUnit.SECONDS));
            assertThat(codes).containsExactlyInAnyOrder(200,409);
            java.nio.file.Files.write(java.nio.file.Path.of(System.getenv("TMS_CURRENT_WORKFLOW_EVIDENCE_DIR"),"ar02-concurrency.json"),json.writerWithDefaultPrettyPrinter().writeValueAsBytes(Map.of("projectId",p,"documentId",d,"rowId",row,"connectionIds",connections,"httpStatuses",codes)));
        }
        assertThat(db.queryForObject("SELECT COUNT(*) FROM test_document_assignment_changes WHERE project_id=? AND document_id=?",Long.class,p,d)).isEqualTo(1);
        assertThat(read(d).at("/document/version").asLong()).isEqualTo(1);
    }
    @Test void failedAssignmentBatchWritesNothing()throws Exception{
        long d=imported(feature("Atomic assignment batch"),internal());var before=read(d);long row=before.at("/rows/0/rowId").asLong();
        assertThat(assign(d,pm,0,List.of(scope(am,List.of(row)),scope(bm,List.of(Long.MAX_VALUE))))).extracting(r->r.getResponse().getStatus()).isEqualTo(422);
        assertThat(read(d)).isEqualTo(before);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM test_document_assignment_changes WHERE project_id=? AND document_id=?",Long.class,p,d)).isZero();
    }
    @Test void assignmentReplayDoesNotDuplicateHistoryOrReplaceOtherScopes()throws Exception{
        long d=imported(feature("Assignment replay"),internal());var rows=read(d).get("rows");long first=rows.get(0).path("rowId").asLong(),second=rows.get(1).path("rowId").asLong();
        assertThat(assign(d,b,0,List.of(scope(bm,List.of(second)))).getResponse().getStatus()).isEqualTo(200);
        String request=encode(Map.of("expectedVersion",1,"requestKey",UUID.randomUUID(),"changes",List.of(scope(am,List.of(first)))));
        for(int retry=0;retry<2;retry++)mvc.perform(put(path("/test-documents/"+d+"/assignments")).with(actor(a)).with(csrf()).contentType("application/json").content(request)).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));
        var after=read(d);assertThat(after.at("/rows/0/assigneeMembershipId").asLong()).isEqualTo(am);assertThat(after.at("/rows/1/assigneeMembershipId").asLong()).isEqualTo(bm);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM test_document_assignment_changes WHERE project_id=? AND document_id=?",Long.class,p,d)).isEqualTo(2);
        assertThat(db.queryForObject("SELECT actor_id FROM test_document_assignment_changes WHERE project_id=? AND document_id=? AND row_id=?",String.class,p,d,first)).isEqualTo(a.getId());
    }
    @Test void statusReplayKeepsActualActorAndVersion()throws Exception{
        long f=feature("Replay actual actor"),d=imported(f,internal());long row=read(d).at("/rows/0/rowId").asLong();
        assertThat(assign(d,a,0,List.of(scope(am,List.of(row)))).getResponse().getStatus()).isEqualTo(200);
        long version=body(mvc.perform(post(path("/features/"+f+"/test-versions")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("name","Arena version","requestKey",UUID.randomUUID())))).andExpect(status().isCreated()).andReturn()).path("id").asLong();
        String request=encode(Map.of("status","NG","expectedVersion",0,"requestKey",UUID.randomUUID(),"testVersionId",version,"executedOn","2026-11-03"));
        JsonNode saved=null;
        for(int retry=0;retry<2;retry++){
            var current=body(mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(a)).with(csrf()).contentType("application/json").content(request)).andExpect(status().isOk()).andReturn());
            if(saved==null)saved=current;else assertThat(current).isEqualTo(saved);
        }
        assertThat(Objects.requireNonNull(saved).path("updatedBy").asText()).isEqualTo(a.getDisplayName());assertThat(saved.path("version").asLong()).isEqualTo(1);
        mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(pm)).with(csrf()).contentType("application/json").content(request)).andExpect(status().isConflict());
        var history=body(mvc.perform(get(path("/test-documents/"+d+"/rows/"+row+"/result-history")).with(actor(a))).andExpect(status().isOk()).andReturn());
        assertThat(history.size()).isEqualTo(1);assertThat(history.at("/0/actor").asText()).isEqualTo(a.getDisplayName());
        assertThat(history.at("/0/testVersionName").asText()).isEqualTo("Arena version");assertThat(history.at("/0/executedOn").asText()).isEqualTo("2026-11-03");
        assertThat(read(d).at("/rows/0/resultVersion").asLong()).isEqualTo(1);
    }
    @Test void previewErrorsNeverCommitAndCommitRetryCreatesNoDuplicateRowsOrHistory()throws Exception{
        long f=feature("Import retry"),d=imported(f,internal());
        var before=read(d);long cases=db.queryForObject("SELECT COUNT(*) FROM test_cases WHERE project_id=?",Long.class,p);
        long audit=db.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=?",Long.class,p);
        for(int retry=0;retry<2;retry++)mvc.perform(post(path("/features/"+f+"/import-previews/"+d+"/commit")).with(actor(pm)).with(csrf())).andExpect(status().isOk());
        assertThat(read(d)).isEqualTo(before);assertThat(db.queryForObject("SELECT COUNT(*) FROM test_cases WHERE project_id=?",Long.class,p)).isEqualTo(cases);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=?",Long.class,p)).isEqualTo(audit);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM import_batches WHERE project_id=? AND feature_id=?",Long.class,p,f)).isEqualTo(1);
        byte[] invalid;try(var book=new XSSFWorkbook(new ByteArrayInputStream(internal()));var out=new ByteArrayOutputStream()){book.getSheetAt(0).getRow(1).getCell(5).setCellValue("");book.write(out);invalid=out.toByteArray();}
        mvc.perform(multipart(path("/features/"+f+"/import-previews")).file(new MockMultipartFile("file","invalid.xlsx","",invalid)).with(actor(pm)).with(csrf())).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("IMPORT_HAS_ERRORS"));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM import_batches WHERE project_id=? AND feature_id=?",Long.class,p,f)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM test_cases WHERE project_id=?",Long.class,p)).isEqualTo(cases);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM import_batches WHERE project_id=? AND feature_id=? AND status='COMMITTED'",Long.class,p,f)).isEqualTo(1);
    }
    @Test void independentCopiesAndAllRowsExport()throws Exception{
        byte[] source;try(var input=getClass().getResourceAsStream("/workbooks/arena-inline-strings.xlsx")){source=Objects.requireNonNull(input).readAllBytes();}
        long projectA=p,fa=feature("Arena handoff A"),da=imported(fa,source);var beforeA=read(da);var rowsA=beforeA.get("rows");
        long projectB=projects.create(admin.getId(),new ProjectDtos.CreateProject("AR02"+UUID.randomUUID().toString().substring(0,8),"Arena handoff B","","Asia/Ho_Chi_Minh")).id();
        for(var entry:Map.of(pm,"PM",a,"USER",b,"USER").entrySet())projects.addOrUpdateMember(projectB,admin.getId(),entry.getKey().getId(),new ProjectDtos.SetMember(entry.getValue()));
        p=projectB;long fb=feature("Arena handoff B"),dB=imported(fb,source);var beforeB=read(dB);p=projectA;
        long row=rowsA.get(0).path("rowId").asLong();assertThat(assign(da,a,0,List.of(scope(am,List.of(row)))).getResponse().getStatus()).isEqualTo(200);result(da,row,a,"NG",0,200);
        byte[] exported=mvc.perform(get(path("/test-documents/"+da+"/export")).param("page","1").param("size","1").param("keyword","no match").with(actor(a))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(exported))){var sheet=book.getSheetAt(0);assertThat(sheet.getLastRowNum()).isEqualTo(rowsA.size());
            for(int i=0;i<rowsA.size();i++)assertThat(sheet.getRow(i+1).getCell(0).getStringCellValue()).isEqualTo(rowsA.get(i).at("/cells/0").asText());
            assertThat(sheet.getRow(1).getCell(9).getStringCellValue()).isEqualTo("NG");assertThat(sheet.getRow(1).getCell(15).getStringCellValue()).isEqualTo("Giữ nguyên cột riêng 1");}
        byte[] original=mvc.perform(get(path("/test-documents/"+da+"/export")).param("original","true").with(actor(a))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(original).isEqualTo(source);
        mvc.perform(get(path("/test-documents/"+dB)).with(actor(a))).andExpect(status().isNotFound());
        p=projectB;assertThat(read(dB)).isEqualTo(beforeB);p=projectA;
        assertThat(rowsA.get(0).path("caseId").asLong()).isNotEqualTo(beforeB.at("/rows/0/caseId").asLong());
        var fixture=new LinkedHashMap<String,Object>();fixture.put("projectA",projectA);fixture.put("projectB",projectB);fixture.put("featureA",fa);fixture.put("featureB",fb);fixture.put("documentA",da);fixture.put("documentB",dB);fixture.put("rowsA",read(da).get("rows"));fixture.put("rowsB",beforeB.get("rows"));fixture.put("testerUserIds",List.of(a.getId(),b.getId()));fixture.put("testerMembershipsA",List.of(am,bm));p=projectB;fixture.put("testerMembershipsB",List.of(member(a),member(b)));p=projectA;fixture.put("pmUserId",pm.getId());fixture.put("originalSha256",HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(source)));fixture.put("expectedStatusCounts",Map.of("A",Map.of("NG",1,"UNEXECUTED",23),"B",Map.of("UNEXECUTED",24)));
        var evidence=java.nio.file.Path.of(System.getenv("TMS_CURRENT_WORKFLOW_EVIDENCE_DIR"));java.nio.file.Files.write(evidence.resolve("ar02-owned-fixtures.json"),json.writerWithDefaultPrettyPrinter().writeValueAsBytes(fixture));java.nio.file.Files.write(evidence.resolve("ar02-current.xlsx"),exported);java.nio.file.Files.write(evidence.resolve("ar02-original.xlsx"),original);
    }
    @Test void archiveRestoreAndHidePreserveWorkbookAndRows()throws Exception{
        byte[] bytes=internal();long f=feature("Archive"),d=imported(f,bytes);long row=read(d).at("/rows/0/rowId").asLong();
        String issueKey="FR-ARCHIVE-"+UUID.randomUUID();
        db.update("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,1,?,'BUG','Linked issue','Archive fixture',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,REPEAT('f',64))",p,issueKey,member(pm),member(pm),UUID.randomUUID().toString());
        long issue=Objects.requireNonNull(db.queryForObject("SELECT id FROM work_items WHERE item_key=?",Long.class,issueKey));
        db.update("INSERT INTO work_item_feature_context(project_id,work_item_id,feature_id,document_id,row_id,monkey,created_by_user_id) VALUES(?,?,?,?,?,FALSE,?)",p,issue,f,d,row,pm.getId());
        mvc.perform(post(path("/features/"+f+"/archive")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());result(d,row,admin,"OK",0,409);
        mvc.perform(post(path("/features/"+f+"/restore")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(Map.of("expectedVersion",1,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        String hide=encode(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID()));
        for(int retry=0;retry<2;retry++)mvc.perform(post(path("/features/"+f+"/documents/"+d+"/archive")).with(actor(pm)).with(csrf()).contentType("application/json").content(hide)).andExpect(status().isOk());
        mvc.perform(get(path("/features/"+f+"/documents")).with(actor(a))).andExpect(jsonPath("$.totalItems").value(0));assertThat(read(d).get("rows").size()).isEqualTo(5);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_item_feature_context WHERE project_id=? AND work_item_id=? AND feature_id=? AND document_id=? AND row_id=? AND deleted_at IS NULL",Long.class,p,issue,f,d,row)).isEqualTo(1);
        assertThat(mvc.perform(get(path("/test-documents/"+d+"/export?original=true")).with(actor(a))).andReturn().getResponse().getContentAsByteArray()).isEqualTo(bytes);
    }
    @Test void legacyRevisionEndpointCannotBypassArchivedFeature()throws Exception{
        long f=feature("Archive revision guard"),d=imported(f,internal());var row=read(d).at("/rows/0");
        mvc.perform(post(path("/features/"+f+"/archive")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        mvc.perform(post(path("/test-cases/"+row.get("caseId").asLong()+"/revisions")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("titleVi","Must stay blocked","stepsVi","Steps","expectedVi","Expected","expectedCurrentRevisionId",row.get("revisionId").asLong())))).andExpect(status().isConflict());
    }
    @Test void archivedProjectHasNoDocumentEditingAssignmentResultOrIssueCapabilities()throws Exception{
        long f=feature("Archived project capabilities"),d=imported(f,internal());
        db.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",p);
        var detail=body(mvc.perform(get(path("/test-documents/"+d)).with(actor(admin))).andExpect(status().isOk()).andReturn());
        assertThat(detail.path("canManage").asBoolean()).isFalse();assertThat(detail.path("canAssign").asBoolean()).isFalse();
        assertThat(detail.path("canCreateIssue").asBoolean()).isFalse();assertThat(detail.at("/rows/0/canUpdateResult").asBoolean()).isFalse();
    }
    @Test void userWithInconsistentPmMembershipCannotEnterWorkspace()throws Exception{
        long f=feature("Mismatched membership"),d=imported(f,internal());
        db.update("UPDATE project_memberships SET project_role='PM' WHERE project_id=? AND user_id=?",p,dev.getId());
        mvc.perform(get(path("/test-documents/"+d)).with(actor(dev))).andExpect(status().isNotFound());
    }
    @Test void activeTesterCanCreateIssueWithoutBeingAssignedTheCase()throws Exception{
        long d=imported(feature("Issue capability"),internal());
        assertThat(read(d).path("canCreateIssue").asBoolean()).isTrue();
    }
    @Test void featureCreationDatesUseInclusiveVietnamDaysBeforeCountingAndPaging()throws Exception {
        datedFeature("Đăng nhập before","2026-10-17 16:59:59.999999");
        long first=datedFeature("Đăng nhập first","2026-10-17 17:00:00.000000");
        long last=datedFeature("Đăng nhập last","2026-10-19 16:59:59.999999");
        datedFeature("Đăng nhập after","2026-10-19 17:00:00.000000");
        datedFeature("Unrelated","2026-10-18 12:00:00.000000");
        long archived=datedFeature("Đăng nhập archived","2026-10-18 12:00:00.000000");
        db.update("UPDATE testing_features SET archived_at=UTC_TIMESTAMP(6) WHERE id=? AND project_id=?",archived,p);
        long otherProject=projects.create(admin.getId(),new ProjectDtos.CreateProject("DATES"+UUID.randomUUID().toString().substring(0,8),"Other date project","","Asia/Ho_Chi_Minh")).id();
        db.update("INSERT INTO testing_features(project_id,name,environment,description,created_by,updated_by,created_at,updated_at) VALUES(?,'Đăng nhập outside','','',?,?,'2026-10-18 12:00:00','2026-10-18 12:00:00')",otherProject,admin.getId(),admin.getId());
        for(int page=0;page<2;page++) {
            var response=body(mvc.perform(get(path("/features")).with(actor(a)).param("createdFrom","2026-10-18").param("createdTo","2026-10-19").param("keyword","NHAP dang").param("size","1").param("page",""+page)).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(2)).andExpect(jsonPath("$.items.length()").value(1)).andReturn());
            assertThat(response.at("/items/0/id").asLong()).isEqualTo(page==0?last:first);
            if(page==1)assertThat(java.time.LocalDateTime.parse(response.at("/items/0/createdAt").asText()).toInstant(java.time.ZoneOffset.UTC)).isEqualTo(java.time.Instant.parse("2026-10-17T17:00:00Z"));
        }
        mvc.perform(get(path("/features")).with(actor(a)).param("createdFrom","2026-10-18").param("createdTo","2026-10-19").param("keyword","NHAP dang").param("archived","true")).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(archived));
        mvc.perform(get(path("/features")).with(actor(outside)).param("createdFrom","2026-10-18").param("createdTo","2026-10-19")).andExpect(status().isNotFound());
    }
    @Test void featureCreationDateBoundsCanBeUsedIndependentlyAndCleared()throws Exception {
        long old=datedFeature("Old","2026-10-17 16:59:59.999999");
        long current=datedFeature("Current","2026-10-17 17:00:00.000000");
        mvc.perform(get(path("/features")).with(actor(a)).param("createdFrom","2026-10-18")).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(current));
        mvc.perform(get(path("/features")).with(actor(a)).param("createdTo","2026-10-17")).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(old));
        mvc.perform(get(path("/features")).with(actor(a)).param("createdFrom","2026-10-18").param("createdTo","2026-10-18")).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(current));
        mvc.perform(get(path("/features")).with(actor(a)).param("createdFrom","").param("createdTo","")).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(2));
        mvc.perform(get(path("/features")).with(actor(a)).param("createdFrom","1000-01-01").param("createdTo","9999-12-31")).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(2));
        mvc.perform(get(path("/features")).with(actor(a)).param("createdFrom","2026-11-01")).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
    }
    @Test void featureSortUsesCreationDateAndStableTiesInsteadOfAssumingIdChronology()throws Exception {
        long newest=datedFeature("Zulu","2026-10-19 10:00:00.000000");
        long older=datedFeature("Alpha","2026-10-18 10:00:00.000000");
        long sameTime=datedFeature("Alpha","2026-10-19 10:00:00.000000");
        for(String sort:List.of("","created-desc","created-asc","name-asc")) {
            List<Long> expected=switch(sort){case "created-asc" -> List.of(older,newest,sameTime);case "name-asc" -> List.of(older,sameTime,newest);default -> List.of(sameTime,newest,older);};
            for(int page=0;page<3;page++)mvc.perform(get(path("/features")).with(actor(a)).param("sort",sort).param("size","1").param("page",""+page)).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(3)).andExpect(jsonPath("$.items[0].id").value(expected.get(page)));
        }
    }
    @Test void invalidFeatureFiltersReturnClearClientErrorsWithoutQueryingArbitrarySorts()throws Exception {
        for(String field:List.of("createdFrom","createdTo"))for(String value:List.of("2026-02-30","2026-13-01","2026-2-01","2026/10/19","0999-12-31","10000-01-01","2026-10-19T00:00:00Z","' OR 1=1 --"))
            mvc.perform(get(path("/features")).with(actor(a)).param(Objects.requireNonNull(field),value)).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_FILTER"));
        mvc.perform(get(path("/features")).with(actor(a)).param("createdFrom","2026-10-20").param("createdTo","2026-10-19")).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_FILTER"));
        for(String sort:List.of("updated-desc","created_at desc; DROP TABLE testing_features","CREATED-DESC"))mvc.perform(get(path("/features")).with(actor(a)).param("sort",sort)).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_FILTER"));
    }
    long datedFeature(String name,String utcCreatedAt)throws Exception {
        long id=feature(name);
        db.update("UPDATE testing_features SET created_at=? WHERE project_id=? AND id=?",utcCreatedAt,p,id);
        return id;
    }
    void invalidSourceIds(String first,String second)throws Exception{
        long f=feature("Invalid source identities");byte[] bytes;
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(internal()));var out=new ByteArrayOutputStream()){
            book.getSheetAt(0).getRow(1).getCell(0).setCellValue(first);book.getSheetAt(0).getRow(2).getCell(0).setCellValue(second);book.write(out);bytes=out.toByteArray();
        }
        mvc.perform(multipart(path("/features/"+f+"/import-previews")).file(new MockMultipartFile("file","cases.xlsx","application/octet-stream",bytes)).with(actor(pm)).with(csrf())).andExpect(status().isUnprocessableEntity());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM import_batches WHERE project_id=?",Long.class,p)).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM test_cases WHERE project_id=?",Long.class,p)).isZero();
    }
    @Test void blankInternalSourceIdIsRejectedBeforeCreatingAPreview()throws Exception{invalidSourceIds("","TC2");}
    @Test void overlongInternalSourceIdsCannotCollapseIntoTheSameTruncatedKey()throws Exception{invalidSourceIds("S".repeat(64)+"A","S".repeat(64)+"B");}
}
