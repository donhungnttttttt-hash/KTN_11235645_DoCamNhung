package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import com.fasterxml.jackson.databind.*;
import java.io.*;
import java.sql.DriverManager;
import java.util.*;
import java.util.concurrent.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
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
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;

@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="integration")
class FeatureIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r)throws Exception {
        String url=System.getenv("TMS_TEST_DB_URL");
        if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):3307/tms_docstest_2060e04c986c\\?.+"))throw new IllegalStateException("Authorized integration schema required");
        try(var c=DriverManager.getConnection(url,System.getenv("TMS_TEST_DB_USER"),System.getenv("TMS_TEST_DB_PASSWORD"));var s=c.createStatement();var rows=s.executeQuery("SELECT DATABASE()")){assertThat(rows.next()).isTrue();assertThat(rows.getString(1)).isEqualTo("tms_docstest_2060e04c986c");}
        r.add("TMS_DB_URL",()->url);r.add("TMS_DB_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_DB_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_MIGRATION_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_MIGRATION_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");
        r.add("TMS_CHATGPT_LOCAL_ENABLED",()->"false");r.add("TMS_OLLAMA_ENABLED",()->"false");r.add("TMS_OPENAI_ENABLED",()->"false");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("TMS_AI_DRAFT_CLEANUP_CRON",()->"-");r.add("TMS_AI_CHAT_CLEANUP_CRON",()->"-");
    }
    @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired JdbcTemplate db;@Autowired IdentityUserRepository users;@Autowired ProjectService projects;
    IdentityUser admin,pm,a,b,dev,outside;long p,am,bm;
    @BeforeEach void setup(){String tag=UUID.randomUUID().toString().substring(0,8);admin=user("admin"+tag,"ADMIN");pm=user("pm"+tag,"PM");a=user("a"+tag,"TESTER");b=user("b"+tag,"TESTER");dev=user("dev"+tag,"DEV");outside=user("outside"+tag,"PM");
        var creator=user("creator"+tag,"ADMIN");p=projects.create(creator.getId(),new ProjectDtos.CreateProject("FR"+tag,"Feature thử","","Asia/Ho_Chi_Minh")).id();
        for(var entry:Map.of(pm,"PM",a,"TESTER",b,"TESTER",dev,"DEV").entrySet())projects.addOrUpdateMember(p,admin.getId(),entry.getKey().getId(),new ProjectDtos.SetMember(entry.getValue()));
        am=member(a);bm=member(b);
    }
    IdentityUser user(String name,String role){return users.saveAndFlush(new IdentityUser("fr."+name,name,"not-login",role));}
    long member(IdentityUser user){return Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,user.getId()));}
    RequestPostProcessor actor(IdentityUser user){return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),user.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+user.getRole()))));}
    String path(String tail){return "/api/v1/projects/"+p+tail;}
    String encode(Object value)throws Exception{return json.writeValueAsString(value);}
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
    @Test void systemDevWithHistoricalPmMembershipHasNoWriteCapabilities()throws Exception{
        long f=feature("DEV historical role"),d=imported(f,internal());
        db.update("UPDATE project_memberships SET project_role='PM' WHERE project_id=? AND user_id=?",p,dev.getId());
        var detail=body(mvc.perform(get(path("/test-documents/"+d)).with(actor(dev))).andExpect(status().isOk()).andReturn());
        assertThat(detail.path("canManage").asBoolean()).isFalse();assertThat(detail.path("canAssign").asBoolean()).isFalse();assertThat(detail.path("canCreateIssue").asBoolean()).isFalse();
        assertThat(detail.at("/rows/0/canUpdateResult").asBoolean()).isFalse();
    }
    @Test void activeTesterCanCreateIssueWithoutBeingAssignedTheCase()throws Exception{
        long d=imported(feature("Issue capability"),internal());
        assertThat(read(d).path("canCreateIssue").asBoolean()).isTrue();
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
