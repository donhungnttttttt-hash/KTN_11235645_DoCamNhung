package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import com.fasterxml.jackson.databind.*;
import java.io.*;
import java.nio.file.*;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.workitem.WorkItemStore;
import vn.syp.tms.workitem.TicketWorkflow;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** UUID-owned fixtures only in root-authorized integration schema; no main DB or service provisioning. */
@SpringBootTest @AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="integration")
class NativeFeatureIssueIntegrationTest {
 @DynamicPropertySource static void database(DynamicPropertyRegistry r){
  vn.syp.tms.support.CurrentWorkflowDatabaseGuard.configure(r);
 }
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired JdbcTemplate db;@Autowired IdentityUserRepository users;@Autowired ProjectService projects;
 IdentityUser admin,pm,tester,other,dev,outside;long p;
 @MockitoSpyBean WorkItemStore store;
 List<Map<String,Object>> registeredAdmins;
 @BeforeEach void fixture(){String tag=UUID.randomUUID().toString().substring(0,8);registeredAdmins=db.queryForList("SELECT slot,user_id FROM system_admin_registry ORDER BY slot");assertThat(registeredAdmins).hasSize(2);admin=users.findById(String.valueOf(registeredAdmins.getFirst().get("user_id"))).orElseThrow();pm=user("pm"+tag,"PM");tester=user("tester"+tag,"USER");other=user("other"+tag,"USER");dev=user("dev"+tag,"USER");outside=user("outside"+tag,"PM");var creator=users.findById(String.valueOf(registeredAdmins.getLast().get("user_id"))).orElseThrow();p=projects.create(creator.getId(),new ProjectDtos.CreateProject("FI"+tag,"Issue project "+tag,"","Asia/Ho_Chi_Minh")).id();for(var entry:Map.of(pm,"PM",tester,"USER",other,"USER",dev,"USER").entrySet())projects.addOrUpdateMember(p,admin.getId(),entry.getKey().getId(),new ProjectDtos.SetMember(entry.getValue()));}
 @AfterEach void registryWasPreserved(){assertThat(db.queryForList("SELECT slot,user_id FROM system_admin_registry ORDER BY slot")).isEqualTo(registeredAdmins);}
 @AfterEach void recordOwnedFixtures(TestInfo test)throws Exception{String evidence=System.getenv("TMS_CURRENT_WORKFLOW_EVIDENCE_DIR");if(evidence==null)return;var record=new LinkedHashMap<String,Object>();record.put("test",test.getDisplayName());record.put("projectId",p);record.put("actors",Map.of("pm",pm.getId(),"creator",tester.getId(),"worker",dev.getId(),"member",other.getId()));record.put("memberships",db.queryForList("SELECT id,user_id,project_role FROM project_memberships WHERE project_id=? ORDER BY id",p));record.put("documents",db.queryForList("SELECT id,feature_id FROM import_batches WHERE project_id=? ORDER BY id",p));record.put("rows",db.queryForList("SELECT id AS rowId,batch_id AS documentId FROM import_rows WHERE project_id=? ORDER BY id",p));record.put("tickets",db.queryForList("SELECT w.id,w.item_key,x.feature_id,x.document_id,x.row_id,x.ticket_state,x.closure_reason,x.deleted_at,(SELECT COUNT(*) FROM work_item_feature_history h WHERE h.project_id=w.project_id AND h.work_item_id=w.id) AS historyCount FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id WHERE w.project_id=? ORDER BY w.id",p));Files.writeString(Path.of(evidence,"ar03-owned-fixtures.jsonl"),json.writeValueAsString(record)+System.lineSeparator(),StandardOpenOption.CREATE,StandardOpenOption.APPEND);}
 IdentityUser user(String name,String role){return users.saveAndFlush(new IdentityUser("fi."+name,name,"not-login",role));}
 @NonNull RequestPostProcessor actor(IdentityUser u){return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(u.getId(),u.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole())))));}
 @NonNull String path(String tail){return "/api/v1/projects/"+p+tail;}
 @NonNull String encode(Object value)throws Exception{return Objects.requireNonNull(json.writeValueAsString(value));}
 JsonNode body(MvcResult result)throws Exception{return json.readTree(result.getResponse().getContentAsByteArray());}
 long feature(String name)throws Exception{return body(mvc.perform(post(path("/features")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("name",name,"environment","test server","description","","requestKey",UUID.randomUUID())))).andExpect(status().isCreated()).andReturn()).get("id").asLong();}
 long member(IdentityUser who){return Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,who.getId()));}
 Map<String,Object> issue(long f,String type,boolean monkey){var input=new LinkedHashMap<String,Object>();input.put("featureId",f);input.put("type",type);input.put("monkey",monkey);input.put("title","Đỗ Cẩm Nhung issue");input.put("description","Question or description");input.put("steps","Steps");input.put("expectedResult","Expected");input.put("actualResult","Actual");input.put("frequency","3/5");input.put("environment","Staging");input.put("device","Desktop");input.put("assigneeMembershipId",member(pm));input.put("requestKey",UUID.randomUUID());return input;}
 JsonNode create(IdentityUser who,Map<String,Object> input)throws Exception{return body(mvc.perform(post(path("/issues")).with(actor(who)).with(csrf()).contentType("application/json").content(encode(input))).andExpect(status().isCreated()).andReturn());}
 Map<String,Object> edit(JsonNode item,long version){var input=new LinkedHashMap<String,Object>();for(String key:List.of("title","description","steps","expectedResult","actualResult","priority"))input.put(key,item.path(key).asText());input.put("expectedVersion",version);return input;}
 long document(long f)throws Exception{byte[] bytes;try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()){var sheet=book.createSheet("TestCases");var header=sheet.createRow(0);for(int c=0;c<11;c++)header.createCell(c).setCellValue(TestCaseWorkbook.HEADERS.get(c));var row=sheet.createRow(1);var values=List.of("TC1","UNREGISTERED-SUITE","Original title","","Current steps","Current expected","","","","","reference");for(int c=0;c<11;c++)row.createCell(c).setCellValue(values.get(c));book.write(out);bytes=out.toByteArray();}
  long d=body(mvc.perform(multipart(path("/features/"+f+"/import-previews")).file(new MockMultipartFile("file","cases.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes)).with(actor(pm)).with(csrf())).andExpect(status().isOk()).andReturn()).get("id").asLong();mvc.perform(post(path("/features/"+f+"/import-previews/"+d+"/commit")).with(actor(pm)).with(csrf())).andExpect(status().isOk());return d;}

 @Test void recoveryDeletedMonkeyRetainsObligationIdentityAndExactlyOnceHistory()throws Exception{
  long f=feature("Recovery Monkey");var bug=create(tester,issue(f,"BUG",true));bug=action(tester,bug,Map.of("body","Preserved comment"));long id=bug.path("id").asLong();
  var original=read(tester,"/issues/"+id);var history=read(tester,"/issues/"+id+"/history");
  mvc.perform(delete(path("/issues/"+id+"?expectedVersion="+bug.path("version").asLong())).with(actor(tester)).with(csrf())).andExpect(status().isNoContent());
  assertThat(read(tester,"/issues").path("totalItems").asInt()).isZero();var deleted=read(tester,"/issues?deleted=true&size=1");assertThat(deleted.path("totalItems").asInt()).isEqualTo(1);assertThat(deleted.at("/items/0/canRestore").asBoolean()).isTrue();assertThat(deleted.at("/items/0/canComment").asBoolean()).isFalse();
  assertOpenObligation();var input=Map.<String,Object>of("expectedVersion",bug.path("version").asLong()+1,"requestKey",UUID.randomUUID());
  var results=concurrent(tester,tester,"/issues/"+id+"/restore",encode(input));assertThat(results.stream().map(r->r.getResponse().getStatus()).toList()).containsExactly(200,200);
  var restored=read(tester,"/issues/"+id);for(String field:List.of("id","key","featureId","title","description","steps","expectedResult","actualResult","status","ticketState","closureReason","assigneeMembershipId","verifierUserId"))assertThat(restored.path(field)).as(field).isEqualTo(original.path(field));
  var after=read(tester,"/issues/"+id+"/history");for(int i=0;i<history.size();i++)assertThat(after.get(i)).isEqualTo(history.get(i));assertThat(db.queryForObject("SELECT COUNT(*) FROM work_item_feature_history WHERE project_id=? AND work_item_id=? AND event_type='RESTORE'",Long.class,p,id)).isEqualTo(1);
  assertThat(db.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND entity_type='WORK_ITEM' AND entity_id=? AND action='RESTORE'",Long.class,p,id)).isEqualTo(1);assertThat(read(tester,"/issues/"+id+"/comments").size()).isEqualTo(1);
  var changed=new LinkedHashMap<>(input);changed.put("expectedVersion",999);write(tester,"POST","/issues/"+id+"/restore",changed,409);
  restored=action(tester,restored,Map.of("body","Workflow usable"));mvc.perform(delete(path("/issues/"+id+"?expectedVersion="+restored.path("version").asLong())).with(actor(tester)).with(csrf())).andExpect(status().isNoContent());
  write(tester,"POST","/issues/"+id+"/restore",input,200);assertThat(read(tester,"/issues?deleted=true").path("totalItems").asInt()).isEqualTo(1);assertThat(read(tester,"/issues").path("totalItems").asInt()).isZero();assertOpenObligation();
 }
 void assertOpenObligation()throws Exception{
  assertThat(db.queryForObject("SELECT COUNT(*) FROM ticket_workflow_metrics WHERE project_id=? AND finalized=FALSE",Long.class,p)).isEqualTo(1);
  var readiness=body(mvc.perform(get("/api/v1/admin/projects/"+p+"/archive-readiness").with(actor(admin))).andExpect(status().isOk()).andReturn());assertThat(readiness.path("canArchive").asBoolean()).isFalse();assertThat(readiness.path("blockers").findValuesAsText("code")).contains("OPEN_WORK_ITEMS");assertThat(readiness.path("canArchiveWithLegacyException").asBoolean()).isFalse();
 }
 @Test void recoveryMonkeyEnforcesRemovalAuthorityParentsScopeAndVersion()throws Exception{
  long f=feature("Recovery permissions");var bug=create(tester,issue(f,"BUG",true));long id=bug.path("id").asLong();write(tester,"POST","/issues/"+id+"/restore",Map.of("expectedVersion",0,"requestKey",UUID.randomUUID()),409);var ordinary=create(tester,issue(f,"BUG",false));write(pm,"POST","/issues/"+ordinary.path("id").asLong()+"/restore",Map.of("expectedVersion",0,"requestKey",UUID.randomUUID()),403);mvc.perform(delete(path("/issues/"+id+"?expectedVersion=0")).with(actor(pm)).with(csrf())).andExpect(status().isNoContent());
  var input=Map.<String,Object>of("expectedVersion",1,"requestKey",UUID.randomUUID());write(other,"POST","/issues/"+id+"/restore",input,403);write(outside,"POST","/issues/"+id+"/restore",input,404);var guest=user("guest"+UUID.randomUUID(),"GUEST");write(guest,"POST","/issues/"+id+"/restore",input,403);
  write(tester,"POST","/issues/"+id+"/restore",Map.of("expectedVersion",0,"requestKey",UUID.randomUUID()),409);write(pm,"POST","/issues/"+Long.MAX_VALUE+"/restore",input,404);
  write(pm,"POST","/features/"+f+"/archive",Map.of("expectedVersion",0,"requestKey",UUID.randomUUID()),200);assertThat(read(tester,"/issues?deleted=true").at("/items/0/canRestore").asBoolean()).isFalse();assertThat(read(tester,"/issues?deleted=true").at("/items/0/restoreBlockedReason").asText()).contains("Feature");write(admin,"POST","/issues/"+id+"/restore",input,409);
  write(pm,"POST","/features/"+f+"/restore",Map.of("expectedVersion",1,"requestKey",UUID.randomUUID()),200);db.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",p);write(admin,"POST","/issues/"+id+"/restore",input,409);db.update("UPDATE projects SET archived_at=NULL WHERE id=?",p);
  db.update("UPDATE project_memberships SET active=FALSE WHERE project_id=? AND user_id=?",p,tester.getId());write(tester,"POST","/issues/"+id+"/restore",input,404);write(admin,"POST","/issues/"+id+"/restore",input,200);
  mvc.perform(delete(path("/issues/"+id+"?expectedVersion=2")).with(actor(pm)).with(csrf())).andExpect(status().isNoContent());write(pm,"POST","/issues/"+id+"/restore",Map.of("expectedVersion",3,"requestKey",UUID.randomUUID()),200);
 }
 @Test void recoveryFailedHistoryWriteRollsBackRestoreVersionCommandAndAudit()throws Exception{
  var bug=create(tester,issue(feature("Atomic restore"),"BUG",true));long id=bug.path("id").asLong();mvc.perform(delete(path("/issues/"+id+"?expectedVersion=0")).with(actor(tester)).with(csrf())).andExpect(status().isNoContent());var before=writes();
  doThrow(new org.springframework.dao.DataAccessResourceFailureException("Owned recovery history failure")).when(store).insert(org.mockito.ArgumentMatchers.argThat(sql->sql!=null&&sql.startsWith("INSERT INTO work_item_feature_history")),any(Object[].class));
  try{write(tester,"POST","/issues/"+id+"/restore",Map.of("expectedVersion",1,"requestKey",UUID.randomUUID()),503);assertThat(writes()).isEqualTo(before);assertThat(read(tester,"/issues?deleted=true").at("/items/0/version").asLong()).isEqualTo(1);assertThat(read(tester,"/issues").path("totalItems").asInt()).isZero();}finally{reset(store);}
 }
 @Test void recoveryHiddenDocumentPreservesWorkbookResultsAssignmentsAndTicket()throws Exception{
  long f=feature("Recovery file"),d=document(f);var detail=read(tester,"/test-documents/"+d);long row=detail.at("/rows/0/rowId").asLong();
  write(pm,"PUT","/test-documents/"+d+"/assignments",Map.of("expectedVersion",0,"requestKey",UUID.randomUUID(),"changes",List.of(Map.of("assigneeMembershipId",member(tester),"rowIds",List.of(row)))),200);
  long testVersion=write(pm,"POST","/features/"+f+"/test-versions",Map.of("name","Recovery version","requestKey",UUID.randomUUID()),201).path("id").asLong();write(tester,"PUT","/test-documents/"+d+"/rows/"+row+"/result",Map.of("status","NG","expectedVersion",0,"testVersionId",testVersion,"executedOn","2026-11-03","requestKey",UUID.randomUUID()),200);
  var context=read(tester,"/issues/context?featureId="+f+"&documentId="+d+"&rowId="+row);var create=issue(f,"BUG",false);create.put("documentId",d);create.put("rowId",row);create.put("sourceRevisionId",context.path("revisionId").asLong());create.put("sourceResultVersion",context.path("resultVersion").asLong());var bug=create(tester,create);
  var original=read(tester,"/test-documents/"+d);var bytes=db.queryForObject("SELECT source_workbook FROM import_batches WHERE project_id=? AND id=?",byte[].class,p,d);var assignment=db.queryForList("SELECT * FROM test_document_assignments WHERE project_id=? AND document_id=?",p,d);var executions=db.queryForList("SELECT * FROM test_document_result_executions WHERE project_id=? AND document_id=?",p,d);
  long v=original.at("/document/version").asLong();write(pm,"POST","/features/"+f+"/documents/"+d+"/archive",Map.of("expectedVersion",v,"requestKey",UUID.randomUUID()),200);
  assertThat(read(tester,"/features/"+f+"/documents").path("totalItems").asInt()).isZero();assertThat(read(tester,"/features/"+f).path("documentCount").asInt()).isZero();assertOpenObligation();
  var hidden=read(tester,"/features/"+f+"/documents?archived=true&keyword=cases&size=1");assertThat(hidden.path("totalItems").asInt()).isEqualTo(1);assertThat(hidden.at("/items/0/id").asLong()).isEqualTo(d);assertThat(hidden.at("/items/0/canRestore").asBoolean()).isFalse();assertThat(read(pm,"/features/"+f+"/documents?archived=true").at("/items/0/canRestore").asBoolean()).isTrue();
  assertThat(hidden.at("/items/0/documentCount").asInt()).isEqualTo(1);
  assertThat(hidden.at("/items/0/caseCount").asInt()).isEqualTo(1);
  assertThat(hidden.at("/items/0/testedCaseCount").asInt()).isEqualTo(1);
  assertThat(hidden.at("/items/0/progressPercent").asDouble()).isEqualTo(100);
  var hiddenDetail=read(tester,"/test-documents/"+d);
  assertThat(hiddenDetail.at("/document/caseCount").asInt()).isEqualTo(1);
  assertThat(hiddenDetail.at("/document/testedCaseCount").asInt()).isEqualTo(1);
  var hiddenRows=hiddenDetail.path("rows").deepCopy();var originalRows=original.path("rows").deepCopy();
  for(int n=0;n<hiddenRows.size();n++){
   assertThat(hiddenRows.get(n).path("canUpdateResult").asBoolean()).isFalse();
   ((com.fasterxml.jackson.databind.node.ObjectNode)hiddenRows.get(n)).remove("canUpdateResult");
   ((com.fasterxml.jackson.databind.node.ObjectNode)originalRows.get(n)).remove("canUpdateResult");
  }
  assertThat(hiddenRows).isEqualTo(originalRows);
  assertThat(read(tester,"/features/"+f).path("caseCount").asInt()).isZero();
  assertThat(read(tester,"/features/"+f).path("testedCaseCount").asInt()).isZero();
  assertThat(read(pm,"/management-reports/summary").at("/metrics/total").asInt()).isZero();
  assertThat(read(pm,"/management-reports/summary").at("/metrics/tested").asInt()).isZero();
  var input=Map.<String,Object>of("expectedVersion",v+1,"requestKey",UUID.randomUUID());write(pm,"POST","/features/"+f+"/documents/"+d+"/restore",input,200);write(pm,"POST","/features/"+f+"/documents/"+d+"/restore",input,200);
  assertThat(read(tester,"/test-documents/"+d).path("rows")).isEqualTo(original.path("rows"));assertThat(db.queryForObject("SELECT source_workbook FROM import_batches WHERE project_id=? AND id=?",byte[].class,p,d)).isEqualTo(bytes);assertThat(db.queryForList("SELECT * FROM test_document_assignments WHERE project_id=? AND document_id=?",p,d)).isEqualTo(assignment);assertThat(db.queryForList("SELECT * FROM test_document_result_executions WHERE project_id=? AND document_id=?",p,d)).isEqualTo(executions);
  assertThat(read(tester,"/features/"+f).path("documentCount").asInt()).isEqualTo(1);assertThat(read(tester,"/issues/board").path("totalItems").asInt()).isEqualTo(1);assertThat(read(tester,"/issues/"+bug.path("id").asLong()).path("documentId").asLong()).isEqualTo(d);action(tester,bug,Map.of("body","File recovered"));
  var changed=new LinkedHashMap<>(input);changed.put("expectedVersion",999);write(pm,"POST","/features/"+f+"/documents/"+d+"/restore",changed,409);write(pm,"POST","/features/"+f+"/documents/"+d+"/archive",Map.of("expectedVersion",v+2,"requestKey",UUID.randomUUID()),200);var replay=write(pm,"POST","/features/"+f+"/documents/"+d+"/restore",input,200);assertThat(replay.path("archived").asBoolean()).isTrue();assertThat(replay.path("version").asLong()).isEqualTo(v+3);assertThat(read(tester,"/features/"+f+"/documents").path("totalItems").asInt()).isZero();
  assertThat(db.queryForObject("SELECT COUNT(*) FROM testing_commands WHERE project_id=? AND document_id=? AND action='DOCUMENT_RESTORE'",Long.class,p,d)).isEqualTo(1);
  assertThat(db.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND entity_type='TEST_DOCUMENT' AND entity_id=? AND action='RESTORE'",Long.class,p,d)).isEqualTo(1);
 }
 @Test void recoveryFileChecksScopeParentsPermissionsAndStaleVersions()throws Exception{
  long f=feature("Recovery file permissions"),otherFeature=feature("Other Feature"),d=document(f);write(pm,"POST","/features/"+f+"/documents/"+d+"/archive",Map.of("expectedVersion",0,"requestKey",UUID.randomUUID()),200);var input=Map.<String,Object>of("expectedVersion",1,"requestKey",UUID.randomUUID());
  write(tester,"POST","/features/"+f+"/documents/"+d+"/restore",input,403);write(outside,"POST","/features/"+f+"/documents/"+d+"/restore",input,404);var guest=user("guest"+UUID.randomUUID().toString().substring(0,8),"GUEST");write(guest,"POST","/features/"+f+"/documents/"+d+"/restore",input,403);write(pm,"POST","/features/"+otherFeature+"/documents/"+d+"/restore",input,404);write(pm,"POST","/features/"+f+"/documents/"+d+"/restore",Map.of("expectedVersion",0,"requestKey",UUID.randomUUID()),409);
  write(pm,"POST","/features/"+f+"/archive",Map.of("expectedVersion",0,"requestKey",UUID.randomUUID()),200);assertThat(read(pm,"/features/"+f+"/documents?archived=true").at("/items/0/restoreBlockedReason").asText()).contains("Feature");write(admin,"POST","/features/"+f+"/documents/"+d+"/restore",input,409);write(pm,"POST","/features/"+f+"/restore",Map.of("expectedVersion",1,"requestKey",UUID.randomUUID()),200);write(admin,"POST","/features/"+f+"/documents/"+d+"/restore",input,200);
 }
 @Test void contextUsesCurrentRevisionAndCaseBadgeIncludesClosedIssuesOnlyForItsExactCopy()throws Exception{
  long f=feature("Case feature"),second=feature("Second feature"),d=document(f),copy=document(second);var row=body(mvc.perform(get(path("/test-documents/"+d)).with(actor(tester))).andExpect(status().isOk()).andReturn()).at("/rows/0");long rowId=row.get("rowId").asLong();
  mvc.perform(put(path("/test-documents/"+d+"/rows/"+rowId+"/cells/2")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("value","Latest edited title","expectedVersion",0,"expectedRevisionId",row.get("revisionId").asLong())))).andExpect(status().isOk());
  mvc.perform(get(path("/issues/context")).param("featureId",""+f).param("documentId",""+d).param("rowId",""+rowId).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Latest edited title")).andExpect(jsonPath("$.steps").value("Current steps")).andExpect(jsonPath("$.expectedResult").value("Current expected")).andExpect(jsonPath("$.caseNo").value("TC1"));
  mvc.perform(get(path("/issues/context")).param("featureId",""+second).param("documentId",""+d).param("rowId",""+rowId).with(actor(tester))).andExpect(status().isNotFound());
  var command=issue(f,"BUG",false);command.put("documentId",d);command.put("rowId",rowId);long id=create(tester,command).get("id").asLong();assertThat(create(tester,command).get("id").asLong()).isEqualTo(id);
  action(pm,read(tester,"/issues/"+id),Map.of("state","CLOSED","closureReason","FIXED","body","Verified externally"));
  mvc.perform(get(path("/issues")).param("rowId",""+rowId).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].ticketState").value("CLOSED")).andExpect(jsonPath("$.items[0].closureReason").value("FIXED"));
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
  assertThat(create(dev,issue(f,"BUG",true)).path("createdByUserId").asText()).isEqualTo(dev.getId());
  mvc.perform(post(path("/issues")).with(actor(outside)).with(csrf()).contentType("application/json").content(encode(issue(f,"BUG",true)))).andExpect(status().isNotFound());
 }
 @Test void qaReviewerCapabilitiesAndVersionedCommentsHaveNoRetiredAnswerGate()throws Exception{
  long f=feature("QA");var created=create(tester,issue(f,"QA",false));long id=created.get("id").asLong();assertThat(created.path("ticketState").asText()).isEqualTo("SPEC_CONFIRM");assertThat(created.path("allowedTransitions")).isEmpty();assertThat(created.path("canComment").asBoolean()).isTrue();
  write(tester,"POST","/issues/"+id+"/actions",command(created,Map.of("state","CLOSED","closureReason","UNSUPPORTED","body","Creator is not reviewer")),403);
  created=action(dev,created,Map.of("body","Active unassigned USER may comment"));
  write(pm,"PUT","/ticket-responsibilities/"+member(dev),Map.of("duties",List.of("SPEC_REVIEWER"),"expectedVersion",0),200);
  write(dev,"PUT","/ticket-responsibilities/"+member(other),Map.of("duties",List.of("SPEC_REVIEWER"),"expectedVersion",0),403);
  created=action(pm,created,Map.of("assigneeMembershipId",member(dev),"body","Review spec"));
  var note=Map.of("body","Đã xác minh lại bên ngoài","expectedVersion",created.path("version").asLong(),"requestKey",UUID.randomUUID());var first=createComment(tester,id,note);assertThat(createComment(tester,id,note).get("id").asLong()).isEqualTo(first.get("id").asLong());
  var conflict=new LinkedHashMap<String,Object>(note);conflict.put("body","Different note");mvc.perform(post(path("/issues/"+id+"/comments")).with(actor(tester)).with(csrf()).contentType("application/json").content(encode(conflict))).andExpect(status().isConflict());
  assertThat(read(tester,"/issues/"+id+"/comments").size()).isEqualTo(3);var assigned=read(dev,"/issues/"+id);assertThat(assigned.path("allowedTransitions").get(0).path("columnId").asText()).isEqualTo("unsupported");
  var closed=action(dev,assigned,Map.of("state","CLOSED","closureReason","UNSUPPORTED","body","Spec unsupported"));assertThat(closed.path("finalized").asBoolean()).isTrue();assertThat(count("qa_answers")).isZero();
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
  mvc.perform(get(path("/issues/"+id)).with(actor(pm))).andExpect(status().isOk()).andExpect(jsonPath("$.canEdit").value(false)).andExpect(jsonPath("$.canDelete").value(false)).andExpect(jsonPath("$.canTransition").value(false)).andExpect(jsonPath("$.canComment").value(false)).andExpect(jsonPath("$.canAssign").value(false)).andExpect(jsonPath("$.canConvertToBug").value(false)).andExpect(jsonPath("$.allowedTransitions.length()").value(0));
  var before=writes();write(pm,"POST","/issues/"+id+"/actions",command(read(pm,"/issues/"+id),Map.of("body","Cannot change archived Feature")),409);assertThat(writes()).isEqualTo(before);
 }
 JsonNode read(IdentityUser who,String tail)throws Exception{return body(mvc.perform(get(path(tail)).with(actor(who))).andExpect(status().isOk()).andReturn());}
 JsonNode write(IdentityUser who,String method,String tail,Object input,int expected)throws Exception{return body(mvc.perform(request(org.springframework.http.HttpMethod.valueOf(method),path(tail)).with(actor(who)).with(csrf()).contentType("application/json").content(encode(input))).andExpect(status().is(expected)).andReturn());}
 Map<String,Object> command(JsonNode item,Map<String,Object> changes){var input=new LinkedHashMap<String,Object>(changes);input.put("expectedVersion",item.path("version").asLong());input.putIfAbsent("requestKey",UUID.randomUUID());return input;}
 JsonNode action(IdentityUser who,JsonNode item,Map<String,Object> changes)throws Exception{return write(who,"POST","/issues/"+item.path("id").asLong()+"/actions",command(item,changes),200);}
 long count(String table){return Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE project_id=?",Long.class,p));}
 Map<String,Long> writes(){var counts=new LinkedHashMap<String,Long>();for(String table:List.of("work_items","work_item_feature_history","ticket_commands","ticket_notifications","project_audit","qa_answers","run_items","device_allocations","test_cycles","import_batches"))counts.put(table,count(table));return counts;}

 @Test void assignedUserProcessesAndVerifierReopensAndFinalizesWithoutChangingCase()throws Exception{
  long f=feature("Bug workflow"),d=document(f);var before=read(tester,"/test-documents/"+d).at("/rows/0");var input=issue(f,"BUG",false);input.put("documentId",d);input.put("rowId",before.path("rowId").asLong());var bug=create(tester,input);long id=bug.path("id").asLong();
  write(other,"POST","/issues/"+id+"/actions",command(bug,Map.of("state","IN_PROGRESS")),403);
  bug=action(pm,bug,Map.of("assigneeMembershipId",member(dev),"body","Investigate"));bug=action(dev,bug,Map.of("state","IN_PROGRESS"));bug=action(dev,bug,Map.of("state","CLOSED","closureReason","PROCESSED","body","Implemented"));
  assertThat(bug.path("boardColumn").asText()).isEqualTo("processed");assertThat(bug.path("finalized").asBoolean()).isFalse();assertThat(bug.path("awaitingVerification").asBoolean()).isTrue();assertThat(read(dev,"/issues/"+id).path("allowedTransitions")).isEmpty();write(dev,"POST","/issues/"+id+"/actions",command(bug,Map.of("state","CLOSED","closureReason","FIXED")),403);
  bug=action(tester,bug,Map.of("state","NEW","body","Still reproducible"));assertThat(bug.path("closureReason").isNull()).isTrue();assertThat(bug.path("assigneeMembershipId").asLong()).isEqualTo(member(pm));
  bug=action(pm,bug,Map.of("assigneeMembershipId",member(dev),"body","Retry"));bug=action(dev,bug,Map.of("state","IN_PROGRESS"));bug=action(dev,bug,Map.of("state","WAITING_CONFIRM"));bug=action(tester,bug,Map.of("state","CLOSED","closureReason","CANNOT_REPRODUCE","body","Confirmed"));assertThat(bug.path("finalized").asBoolean()).isTrue();assertThat(read(tester,"/test-documents/"+d).at("/rows/0")).isEqualTo(before);
 }
 @Test void qaConversionPreservesIdentityDiscussionAndHistoricalAnswersWithoutInventedEvidence()throws Exception{
  var input=issue(feature("QA conversion"),"QA",false);for(String key:List.of("steps","expectedResult","actualResult","frequency","environment","device"))input.put(key,"");var qa=create(tester,input);long id=qa.path("id").asLong();qa=action(other,qa,Map.of("body","Original discussion"));
  db.update("INSERT INTO qa_answers(project_id,work_item_id,generation,answer_version,body,basis_reference,author_membership_id,answered_at) VALUES(?,?,0,1,'Historical answer','Spec',?,UTC_TIMESTAMP(6))",p,id,member(pm));var before=db.queryForMap("SELECT question,context_snapshot FROM qa_details WHERE project_id=? AND work_item_id=?",p,id);
  assertThat(read(pm,"/qa/"+id+"/answers").path("items").size()).isEqualTo(1);mvc.perform(get(path("/qa/"+id+"/answers")).with(actor(outside))).andExpect(status().isNotFound());mvc.perform(get(path("/qa/"+Long.MAX_VALUE+"/answers")).with(actor(pm))).andExpect(status().isNotFound());read(pm,"/work-items/"+id+"/history");mvc.perform(get(path("/work-items/"+id+"/history")).with(actor(outside))).andExpect(status().isNotFound());
  var bug=action(pm,qa,Map.of("convertToBug",true,"assigneeMembershipId",member(pm),"body","Confirmed Bug"));assertThat(bug.path("id")).isEqualTo(qa.path("id"));assertThat(bug.path("key")).isEqualTo(qa.path("key"));assertThat(bug.path("type").asText()).isEqualTo("BUG");assertThat(bug.path("ticketState").asText()).isEqualTo("NEW");assertThat(bug.path("actualResult").asText()).isEmpty();assertThat(read(tester,"/issues/"+id+"/comments").size()).isEqualTo(2);assertThat(count("qa_answers")).isEqualTo(1);assertThat(db.queryForMap("SELECT question,context_snapshot FROM qa_details WHERE project_id=? AND work_item_id=?",p,id)).isEqualTo(before);
  var update=edit(bug,bug.path("version").asLong());update.put("title","Add evidence gradually");write(tester,"PUT","/issues/"+id,update,200);
 }
 @Test void replayStaleAndInvalidAssignmentDoNotDuplicateCommentsHistoryCommandsOrNotifications()throws Exception{
  var bug=create(tester,issue(feature("Action replay"),"BUG",true));long id=bug.path("id").asLong();String url="/issues/"+id+"/actions";var input=command(bug,Map.of("body","Please investigate","assigneeMembershipId",member(dev)));bug=write(pm,"POST",url,input,200);var before=writes();write(pm,"POST",url,input,200);assertThat(writes()).isEqualTo(before);
  write(other,"POST",url,input,409);var changed=new LinkedHashMap<String,Object>(input);changed.put("body","Changed payload");write(pm,"POST",url,changed,409);changed.put("requestKey",UUID.randomUUID());write(pm,"POST",url,changed,409);assertThat(writes()).isEqualTo(before);
  var notices=body(mvc.perform(get("/api/v1/me/ticket-notifications").with(actor(dev))).andExpect(status().isOk()).andReturn());assertThat(notices.path("totalItems").asLong()).isEqualTo(1);long notice=notices.at("/items/0/id").asLong();assertThat(notices.at("/items/0/ticketId").asLong()).isEqualTo(id);assertThat(notices.at("/items/0/projectId").asLong()).isEqualTo(p);
  mvc.perform(put("/api/v1/me/ticket-notifications/"+notice+"/read").with(actor(tester)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isNotFound());mvc.perform(put("/api/v1/me/ticket-notifications/"+notice+"/read").with(actor(dev)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isOk());
  bug=action(other,bug,Map.of("body","Extra evidence"));assertThat(bug.path("assigneeMembershipId").asLong()).isEqualTo(member(dev));assertThat(count("ticket_notifications")).isEqualTo(before.get("ticket_notifications"));assertThat(read(tester,"/issues/"+id+"/comments").size()).isEqualTo(2);
  before=writes();write(pm,"POST",url,command(bug,Map.of("body","Must rollback","assigneeMembershipId",Long.MAX_VALUE)),422);assertThat(writes()).isEqualTo(before);db.update("UPDATE project_memberships SET active=FALSE WHERE project_id=? AND user_id=?",p,dev.getId());mvc.perform(get("/api/v1/me/ticket-notifications").with(actor(dev))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));mvc.perform(get(path("/issues/"+id)).with(actor(dev))).andExpect(status().isNotFound());
 }
 @Test void notificationFailureRollsBackCommentAssignmentVersionCommandAndAuditWithoutDdl()throws Exception{
  var bug=create(tester,issue(feature("Atomic failure"),"BUG",true));long id=bug.path("id").asLong();var before=writes();doThrow(new org.springframework.dao.DataAccessResourceFailureException("Owned fixture notification failure")).when(store).update(Objects.requireNonNull(contains("INSERT INTO ticket_notifications")),any(Object[].class));
  try{write(pm,"POST","/issues/"+id+"/actions",command(bug,Map.of("body","Atomic action","assigneeMembershipId",member(dev))),503);assertThat(writes()).isEqualTo(before);assertThat(read(tester,"/issues/"+id).path("version").asLong()).isZero();assertThat(read(tester,"/issues/"+id).path("assigneeMembershipId").asLong()).isEqualTo(member(pm));}finally{reset(store);}
 }
 @Test void concurrentSameActionKeyAndDifferentActorsProduceOneAcceptedVersion()throws Exception{
  var bug=create(tester,issue(feature("Concurrent action"),"BUG",true));long id=bug.path("id").asLong();var before=writes();var input=command(bug,Map.of("body","Only once","assigneeMembershipId",member(dev)));var results=concurrent(pm,pm,"/issues/"+id+"/actions",encode(input));assertThat(results.stream().map(r->r.getResponse().getStatus()).toList()).containsExactly(200,200);assertThat(count("work_item_feature_history")).isEqualTo(2);assertThat(count("ticket_commands")).isEqualTo(1);assertThat(count("ticket_notifications")).isEqualTo(before.get("ticket_notifications")+1);assertThat(read(tester,"/issues/"+id+"/comments").size()).isEqualTo(1);
  bug=read(tester,"/issues/"+id);input=command(bug,Map.of("body","Only one version wins"));results=concurrent(tester,other,"/issues/"+id+"/actions",encode(input));assertThat(results.stream().map(r->r.getResponse().getStatus()).toList()).containsExactlyInAnyOrder(200,409);assertThat(read(tester,"/issues/"+id+"/comments").size()).isEqualTo(2);
 }
 List<MvcResult> concurrent(IdentityUser first,IdentityUser second,String url,String payload)throws Exception{var ready=new CountDownLatch(2);var start=new CountDownLatch(1);try(var executor=Executors.newFixedThreadPool(2)){var futures=new ArrayList<Future<MvcResult>>();for(var who:List.of(first,second))futures.add(executor.submit(()->{ready.countDown();start.await();return mvc.perform(post(path(url)).with(actor(who)).with(csrf()).contentType("application/json").content(payload)).andReturn();}));assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();start.countDown();var result=new ArrayList<MvcResult>();for(var future:futures)result.add(future.get(30,TimeUnit.SECONDS));return result;}}
 @Test void nineColumnCountsMatchEveryColumnPredicateAcrossPagesAndLegacy()throws Exception{
  long f=feature("Nine columns");for(var column:TicketWorkflow.COLUMNS){var input=issue(f,Set.of("spec","unsupported").contains(column.columnId())?"QA":"BUG",false);input.put("ticketState",column.state());if(column.closureReason()!=null)input.put("closureReason",column.closureReason());create(pm,input);}var legacy=create(tester,issue(f,"BUG",true));db.update("UPDATE work_item_feature_context SET ticket_state=NULL,closure_reason=NULL WHERE project_id=? AND work_item_id=?",p,legacy.path("id").asLong());
  var board=read(tester,"/issues/board");assertThat(board.path("columns").size()).isEqualTo(9);assertThat(board.path("totalItems").asLong()).isEqualTo(10);assertThat(board.path("legacyCount").asLong()).isEqualTo(1);long total=1;for(var column:board.path("columns")){assertThat(column.path("count").asLong()).isEqualTo(1);total+=column.path("count").asLong();var listing=read(tester,"/issues?size=1&column="+column.path("id").asText());assertThat(listing.path("totalItems").asLong()).isEqualTo(1);assertThat(listing.at("/items/0/boardColumn").asText()).isEqualTo(column.path("id").asText());}assertThat(total).isEqualTo(10);assertThat(read(tester,"/issues?column=legacy").path("totalItems").asLong()).isEqualTo(1);
  var guest=user("guest"+UUID.randomUUID().toString().substring(0,8),"GUEST");mvc.perform(get(path("/issues")).with(actor(guest))).andExpect(status().isForbidden());mvc.perform(get(path("/issues")).with(actor(outside))).andExpect(status().isNotFound());
 }
 @Test void initialChoicesAndRevokedDutyAreRecheckedBeforeAnyWrites()throws Exception{
  long f=feature("Initial choices"),recipient=member(dev);write(pm,"PUT","/ticket-responsibilities/"+recipient,Map.of("duties",List.of("BUG_COORDINATOR"),"expectedVersion",0),200);assertThat(read(dev,"/issues/options?type=BUG&assigneeMembershipId="+recipient).path("initialTransitions").findValuesAsText("columnId")).containsExactly("new","progress","wont_fix");
  var input=issue(f,"BUG",true);input.put("assigneeMembershipId",recipient);input.put("ticketState","IN_PROGRESS");create(dev,input);write(pm,"PUT","/ticket-responsibilities/"+recipient,Map.of("duties",List.of(),"expectedVersion",1),200);var before=writes();assertThat(read(dev,"/issues/options?type=BUG&assigneeMembershipId="+recipient).path("initialTransitions")).isEmpty();input.put("requestKey",UUID.randomUUID());write(dev,"POST","/issues",input,422);assertThat(writes()).isEqualTo(before);
  input=issue(f,"BUG",true);input.remove("frequency");write(tester,"POST","/issues",input,422);input=issue(f,"BUG",true);input.put("ticketState","CLOSED");input.put("closureReason","WONT_FIX");write(tester,"POST","/issues",input,403);input.remove("closureReason");write(pm,"POST","/issues",input,422);assertThat(writes()).isEqualTo(before);
 }
 @Test void syntheticAr02WorkbookDiscoverySnapshotAndHiddenFileAreIndependentOfCurrentFeature()throws Exception{
  long f=feature("Synthetic AR03 source");byte[] bytes;try(var stream=getClass().getResourceAsStream("/workbooks/arena-inline-strings.xlsx")){bytes=Objects.requireNonNull(stream).readAllBytes();}long d=body(mvc.perform(multipart(path("/features/"+f+"/import-previews")).file(new MockMultipartFile("file","arena.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes)).with(actor(pm)).with(csrf())).andExpect(status().isOk()).andReturn()).path("id").asLong();write(pm,"POST","/features/"+f+"/import-previews/"+d+"/commit",Map.of(),200);var document=read(tester,"/test-documents/"+d);assertThat(document.path("rows").size()).isEqualTo(24);long row=document.at("/rows/0/rowId").asLong();
  long version=write(pm,"POST","/features/"+f+"/test-versions",Map.of("name","Discovery","requestKey",UUID.randomUUID()),201).path("id").asLong();write(pm,"PUT","/test-documents/"+d+"/rows/"+row+"/result",Map.of("status","NG","expectedVersion",0,"testVersionId",version,"executedOn","2026-11-01","requestKey",UUID.randomUUID()),200);var context=read(tester,"/issues/context?featureId="+f+"&documentId="+d+"&rowId="+row);var input=issue(f,"BUG",false);input.put("documentId",d);input.put("rowId",row);input.put("sourceRevisionId",context.path("revisionId").asLong());input.put("sourceResultVersion",context.path("resultVersion").asLong());input.put("testVersionId",999999);var bug=create(tester,input);long id=bug.path("id").asLong();var snapshot=db.queryForMap("SELECT context_snapshot FROM bug_details WHERE project_id=? AND work_item_id=?",p,id);
  write(pm,"PUT","/features/"+f,Map.of("name","Current renamed Feature","environment","New environment","description","Current description","expectedVersion",0),200);write(pm,"PUT","/test-documents/"+d+"/rows/"+row+"/result",Map.of("status","OK","expectedVersion",1,"testVersionId",version,"executedOn","2026-11-02","requestKey",UUID.randomUUID()),200);var saved=read(tester,"/issues/"+id);assertThat(saved.path("testVersionName").asText()).isEqualTo("Discovery");assertThat(saved.path("executedOn").asText()).isEqualTo("2026-11-01");assertThat(saved.path("featureName").asText()).isEqualTo("Current renamed Feature");assertThat(db.queryForMap("SELECT context_snapshot FROM bug_details WHERE project_id=? AND work_item_id=?",p,id)).isEqualTo(snapshot);input.put("requestKey",UUID.randomUUID());var before=writes();write(tester,"POST","/issues",input,409);assertThat(writes()).isEqualTo(before);
  db.update("UPDATE import_batches SET archived_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",p,d);var archived=read(pm,"/issues/"+id);for(String capability:List.of("canEdit","canDelete","canTransition","canComment","canAssign","canConvertToBug"))assertThat(archived.path(capability).asBoolean()).as(capability).isFalse();assertThat(archived.path("allowedTransitions")).isEmpty();write(pm,"POST","/issues/"+id+"/actions",command(bug,Map.of("body","Cannot mutate hidden file")),409);assertThat(writes()).isEqualTo(before);
 }
}
