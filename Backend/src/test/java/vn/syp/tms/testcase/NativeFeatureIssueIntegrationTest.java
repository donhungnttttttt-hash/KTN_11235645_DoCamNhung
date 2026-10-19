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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;

/** UUID-owned fixtures only in root-authorized integration schema; no main DB or service provisioning. */
@SpringBootTest @AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="integration")
class NativeFeatureIssueIntegrationTest {
 @DynamicPropertySource static void database(DynamicPropertyRegistry r){
  String url=System.getenv("TMS_TEST_DB_URL");if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):3307/tms_docstest_2060e04c986c\\?.+"))throw new IllegalStateException("Authorized issue integration schema required");
  r.add("TMS_DB_URL",()->url);r.add("TMS_DB_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_DB_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));r.add("TMS_MIGRATION_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_MIGRATION_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
  r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");r.add("TMS_CHATGPT_LOCAL_ENABLED",()->"false");r.add("TMS_OLLAMA_ENABLED",()->"false");r.add("TMS_OPENAI_ENABLED",()->"false");r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("TMS_AI_DRAFT_CLEANUP_CRON",()->"-");r.add("TMS_AI_CHAT_CLEANUP_CRON",()->"-");
 }
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired JdbcTemplate db;@Autowired IdentityUserRepository users;@Autowired ProjectService projects;
 IdentityUser admin,pm,tester,other,dev,outside;long p;
 @BeforeEach void fixture(){String tag=UUID.randomUUID().toString().substring(0,8);admin=user("admin"+tag,"ADMIN");pm=user("pm"+tag,"PM");tester=user("tester"+tag,"TESTER");other=user("other"+tag,"TESTER");dev=user("dev"+tag,"DEV");outside=user("outside"+tag,"PM");var creator=user("creator"+tag,"ADMIN");p=projects.create(creator.getId(),new ProjectDtos.CreateProject("FI"+tag,"Issue project "+tag,"","Asia/Ho_Chi_Minh")).id();for(var entry:Map.of(pm,"PM",tester,"TESTER",other,"TESTER",dev,"DEV").entrySet())projects.addOrUpdateMember(p,admin.getId(),entry.getKey().getId(),new ProjectDtos.SetMember(entry.getValue()));}
 IdentityUser user(String name,String role){return users.saveAndFlush(new IdentityUser("fi."+name,name,"not-login",role));}
 RequestPostProcessor actor(IdentityUser u){return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(u.getId(),u.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole()))));}
 String path(String tail){return "/api/v1/projects/"+p+tail;}
 String encode(Object value)throws Exception{return json.writeValueAsString(value);}
 JsonNode body(MvcResult result)throws Exception{return json.readTree(result.getResponse().getContentAsByteArray());}
 long feature(String name)throws Exception{return body(mvc.perform(post(path("/features")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("name",name,"environment","test server","description","","requestKey",UUID.randomUUID())))).andExpect(status().isCreated()).andReturn()).get("id").asLong();}
 Map<String,Object> issue(long f,String type,boolean monkey){var input=new LinkedHashMap<String,Object>();input.put("featureId",f);input.put("type",type);input.put("monkey",monkey);input.put("title","Đỗ Cẩm Nhung issue");input.put("description","Question or description");input.put("steps","Steps");input.put("expectedResult","Expected");input.put("actualResult","Actual");input.put("requestKey",UUID.randomUUID());return input;}
 JsonNode create(IdentityUser who,Map<String,Object> input)throws Exception{return body(mvc.perform(post(path("/issues")).with(actor(who)).with(csrf()).contentType("application/json").content(encode(input))).andExpect(status().isCreated()).andReturn());}
 Map<String,Object> edit(JsonNode item,long version){var input=new LinkedHashMap<String,Object>();for(String key:List.of("title","description","steps","expectedResult","actualResult","priority"))input.put(key,item.path(key).asText());input.put("expectedVersion",version);return input;}
 long document(long f)throws Exception{byte[] bytes;try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()){var sheet=book.createSheet("TestCases");var header=sheet.createRow(0);for(int c=0;c<11;c++)header.createCell(c).setCellValue(TestCaseWorkbook.HEADERS.get(c));var row=sheet.createRow(1);var values=List.of("TC1","UNREGISTERED-SUITE","Original title","","Current steps","Current expected","","","","","reference");for(int c=0;c<11;c++)row.createCell(c).setCellValue(values.get(c));book.write(out);bytes=out.toByteArray();}
  long d=body(mvc.perform(multipart(path("/features/"+f+"/import-previews")).file(new MockMultipartFile("file","cases.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes)).with(actor(pm)).with(csrf())).andExpect(status().isOk()).andReturn()).get("id").asLong();mvc.perform(post(path("/features/"+f+"/import-previews/"+d+"/commit")).with(actor(pm)).with(csrf())).andExpect(status().isOk());return d;}

 @Test void contextUsesCurrentRevisionAndCaseBadgeIncludesClosedIssuesOnlyForItsExactCopy()throws Exception{
  long f=feature("Case feature"),second=feature("Second feature"),d=document(f),copy=document(second);var row=body(mvc.perform(get(path("/test-documents/"+d)).with(actor(tester))).andExpect(status().isOk()).andReturn()).at("/rows/0");long rowId=row.get("rowId").asLong();
  mvc.perform(put(path("/test-documents/"+d+"/rows/"+rowId+"/cells/2")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("value","Latest edited title","expectedVersion",0,"expectedRevisionId",row.get("revisionId").asLong())))).andExpect(status().isOk());
  mvc.perform(get(path("/issues/context")).param("featureId",""+f).param("documentId",""+d).param("rowId",""+rowId).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Latest edited title")).andExpect(jsonPath("$.steps").value("Current steps")).andExpect(jsonPath("$.expectedResult").value("Current expected")).andExpect(jsonPath("$.caseNo").value("TC1"));
  mvc.perform(get(path("/issues/context")).param("featureId",""+second).param("documentId",""+d).param("rowId",""+rowId).with(actor(tester))).andExpect(status().isNotFound());
  var command=issue(f,"BUG",false);command.put("documentId",d);command.put("rowId",rowId);long id=create(tester,command).get("id").asLong();assertThat(create(tester,command).get("id").asLong()).isEqualTo(id);
  mvc.perform(put(path("/issues/"+id+"/status")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("status","closed","reason","Đã xác minh bên ngoài","expectedVersion",0)))).andExpect(status().isOk());
  mvc.perform(get(path("/issues")).param("rowId",""+rowId).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].status").value("closed"));
  mvc.perform(get(path("/issues")).param("documentId",""+copy).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
  mvc.perform(get(path("/test-documents/"+d)).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.rows[0].resultStatus").value("UNEXECUTED"));
  assertThat(db.queryForObject("SELECT COUNT(*) FROM run_items WHERE project_id=?",Long.class,p)).isZero();assertThat(db.queryForObject("SELECT COUNT(*) FROM device_allocations WHERE project_id=?",Long.class,p)).isZero();
 }
 @Test void monkeyOwnershipSoftDeletionAndAdminIdentityDoNotRequirePersonalAllocation()throws Exception{
  long f=feature("Monkey");var created=create(tester,issue(f,"BUG",true));assertThat(created.get("canAssign").asBoolean()).isFalse();long id=created.get("id").asLong();var update=edit(created,0);update.put("title","Edited own monkey");
  mvc.perform(put(path("/issues/"+id)).with(actor(other)).with(csrf()).contentType("application/json").content(encode(update))).andExpect(status().isForbidden());
  mvc.perform(put(path("/issues/"+id)).with(actor(tester)).with(csrf()).contentType("application/json").content(encode(update))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
  mvc.perform(delete(path("/issues/"+id)).param("expectedVersion","0").with(actor(tester)).with(csrf())).andExpect(status().isConflict());
  mvc.perform(delete(path("/issues/"+id)).param("expectedVersion","1").with(actor(tester)).with(csrf())).andExpect(status().isNoContent());
  mvc.perform(get(path("/issues/"+id)).with(actor(tester))).andExpect(status().isNotFound());mvc.perform(get(path("/issues/"+id+"/history")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$[2].eventType").value("DELETE"));
  var adminIssue=create(admin,issue(f,"BUG",true));assertThat(adminIssue.get("createdByUserId").asText()).isEqualTo(admin.getId());assertThat(db.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,admin.getId())).isZero();
  mvc.perform(post(path("/issues")).with(actor(dev)).with(csrf()).contentType("application/json").content(encode(issue(f,"BUG",true)))).andExpect(status().isForbidden());
  mvc.perform(post(path("/issues")).with(actor(outside)).with(csrf()).contentType("application/json").content(encode(issue(f,"BUG",true)))).andExpect(status().isNotFound());
 }
 @Test void qaManualStatusAndVersionedCommentsHaveNoLegacyAnswerGate()throws Exception{
  long f=feature("QA");var created=create(tester,issue(f,"QA",false));long id=created.get("id").asLong();var update=edit(created,0);update.put("assigneeMembershipId",db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,dev.getId()));
  mvc.perform(post(path("/issues/"+id+"/comments")).with(actor(dev)).with(csrf()).contentType("application/json").content(encode(Map.of("body","Not assigned","expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isForbidden());
  mvc.perform(put(path("/issues/"+id)).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(update))).andExpect(status().isOk());
  var note=Map.of("body","Đã xác minh lại bên ngoài","expectedVersion",1,"requestKey",UUID.randomUUID());var first=createComment(tester,id,note);assertThat(createComment(tester,id,note).get("id").asLong()).isEqualTo(first.get("id").asLong());
  var conflict=new LinkedHashMap<String,Object>(note);conflict.put("body","Different note");mvc.perform(post(path("/issues/"+id+"/comments")).with(actor(tester)).with(csrf()).contentType("application/json").content(encode(conflict))).andExpect(status().isConflict());
  mvc.perform(get(path("/issues/"+id+"/comments")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$[0].body").value("Đã xác minh lại bên ngoài")).andExpect(jsonPath("$.length()").value(1));
  mvc.perform(put(path("/issues/"+id+"/status")).with(actor(dev)).with(csrf()).contentType("application/json").content(encode(Map.of("status","closed","reason","Not my authority","expectedVersion",2)))).andExpect(status().isForbidden());
  mvc.perform(put(path("/issues/"+id+"/status")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("status","closed","reason","Xác minh ngoài phần mềm","expectedVersion",2)))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("closed"));
 }
 JsonNode createComment(IdentityUser who,long id,Object command)throws Exception{return body(mvc.perform(post(path("/issues/"+id+"/comments")).with(actor(who)).with(csrf()).contentType("application/json").content(encode(command))).andExpect(status().isCreated()).andReturn());}
 @Test void searchCountsAllMatchingIssuesAcrossPagesAndOldWritesCannotBypassTheNewContract()throws Exception{
  long f=feature("Search");create(tester,issue(f,"BUG",true));create(other,issue(f,"BUG",true));
  for(int page=0;page<2;page++)mvc.perform(get(path("/issues")).param("featureId",""+f).param("keyword","NHUNG cam").param("type","BUG").param("size","1").param("page",""+page).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(2)).andExpect(jsonPath("$.items.length()").value(1));
  for(String old:List.of("/work-items","/qa"))mvc.perform(post(path(old)).with(actor(tester)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isGone());
  var invalid=issue(f,"TASK",false);mvc.perform(post(path("/issues")).with(actor(tester)).with(csrf()).contentType("application/json").content(encode(invalid))).andExpect(status().isUnprocessableEntity());
 }
 @Test void concurrentSameKeyCreateProducesOneIssueAndOneHistoryEntry()throws Exception{
  long f=feature("Replay");var command=issue(f,"BUG",true);String payload=encode(command);var start=new CountDownLatch(1);var ready=new CountDownLatch(2);
  try(var executor=Executors.newFixedThreadPool(2)){var futures=new ArrayList<Future<MvcResult>>();for(int n=0;n<2;n++)futures.add(executor.submit(()->{ready.countDown();start.await();return mvc.perform(post(path("/issues")).with(actor(tester)).with(csrf()).contentType("application/json").content(payload)).andReturn();}));assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();start.countDown();long id=0;for(var future:futures){var response=future.get(30,TimeUnit.SECONDS);assertThat(response.getResponse().getStatus()).isEqualTo(201);long current=body(response).get("id").asLong();if(id==0)id=current;else assertThat(current).isEqualTo(id);}mvc.perform(get(path("/issues/"+id+"/history")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));}
 }
 @Test void caseIssuesCannotBeDeletedAndArchivedFeatureHasReadOnlyCapabilities()throws Exception{
  long f=feature("Read only context"),d=document(f);
  long row=body(mvc.perform(get(path("/test-documents/"+d)).with(actor(tester))).andExpect(status().isOk()).andReturn()).at("/rows/0/rowId").asLong();
  var command=issue(f,"BUG",false);command.put("documentId",d);command.put("rowId",row);long id=create(tester,command).get("id").asLong();
  mvc.perform(delete(path("/issues/"+id)).param("expectedVersion","0").with(actor(pm)).with(csrf())).andExpect(status().isForbidden());
  mvc.perform(get(path("/issues/"+id)).with(actor(pm))).andExpect(status().isOk()).andExpect(jsonPath("$.canDelete").value(false)).andExpect(jsonPath("$.canAssign").value(true));
  db.update("UPDATE testing_features SET archived_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",p,f);
  mvc.perform(get(path("/issues/"+id)).with(actor(pm))).andExpect(status().isOk()).andExpect(jsonPath("$.canEdit").value(false)).andExpect(jsonPath("$.canDelete").value(false)).andExpect(jsonPath("$.canTransition").value(false)).andExpect(jsonPath("$.canComment").value(false)).andExpect(jsonPath("$.canAssign").value(false)).andExpect(jsonPath("$.allowedStatuses.length()").value(0));
 }
}
