package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import java.util.*;
import java.io.ByteArrayOutputStream;
import com.fasterxml.jackson.databind.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.lang.NonNull;
import org.springframework.test.context.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.syp.tms.feature.*;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.testcase.*;

@SpringBootTest @AutoConfigureMockMvc @Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_USERS_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+")
class TestVersionsNativeTest {
 @DynamicPropertySource static void database(DynamicPropertyRegistry r) {FeatureIssueContextNativeTest.database(r);}
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired IdentityUserRepository users;
 @Autowired ProjectService projects; @Autowired FeatureService features; @Autowired TestDocumentService documents;
 IdentityUser admin; long p,f,d,row;
 @BeforeEach void fixture() throws Exception {
  String tag=UUID.randomUUID().toString().substring(0,8);admin=users.saveAndFlush(new IdentityUser("versions."+tag,"Versions admin","not-login","ADMIN"));
  p=projects.create(admin.getId(),new ProjectDtos.CreateProject("VER"+tag,"Version test","","UTC")).id();
  f=((Number)features.create(p,admin.getId(),new FeatureDtos.Create("Feature","server","",UUID.randomUUID())).get("id")).longValue();
  byte[] bytes;try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()) {
   var sheet=book.createSheet("TestCases");var header=sheet.createRow(0);
   for(int c=0;c<11;c++)header.createCell(c).setCellValue(TestCaseWorkbook.HEADERS.get(c));
   for(int n=1;n<=2;n++){var record=sheet.createRow(n);var values=List.of("TC"+n,"UNREGISTERED-SUITE","Case title","","Case steps","Case expected","","","","","reference");for(int c=0;c<values.size();c++)record.createCell(c).setCellValue(values.get(c));}
   book.write(out);bytes=out.toByteArray();
  }
  d=((Number)features.preview(p,admin.getId(),f,new MockMultipartFile("file","cases.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes)).get("id")).longValue();
  features.commit(p,admin.getId(),f,d);row=Objects.requireNonNull(documents.get(p,admin.getId(),d).rows().getFirst().rowId());
 }
 @NonNull RequestPostProcessor actor(IdentityUser user){return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),user.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+user.getRole())))));}
 @NonNull String path(String suffix){return "/api/v1/projects/"+p+suffix;}
 @NonNull String encode(Object value)throws Exception{return Objects.requireNonNull(json.writeValueAsString(value));}
 long version(String name)throws Exception {
  var result=mvc.perform(post(path("/features/"+f+"/test-versions")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(Map.of("name",name,"requestKey",UUID.randomUUID())))).andExpect(status().isCreated()).andReturn();
  return json.readTree(result.getResponse().getContentAsByteArray()).path("id").asLong();
 }
 @Test void deleteHidesVersionButPreservesResultsHistoryReplayAndExport()throws Exception {
  long v=version("Keep history");
  var input=new TestDocumentDtos.UpdateResult("NG",0L,UUID.randomUUID().toString(),v,java.time.LocalDate.of(2026,10,25));
  features.updateResult(p,admin.getId(),d,row,input);
  for(int attempt=0;attempt<2;attempt++)mvc.perform(delete(path("/features/"+f+"/test-versions/"+v)).with(actor(admin)).with(csrf())).andExpect(status().isNoContent());
  assertThat(features.testVersions(p,admin.getId(),f)).isEmpty();
  assertThat(features.updateResult(p,admin.getId(),d,row,input).testVersionName()).isEqualTo("Keep history");
  mvc.perform(get(path("/test-documents/"+d)).with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.rows[0].testVersionName").value("Keep history"));
  assertThat(documents.resultHistory(p,admin.getId(),d,row,0).getFirst().testVersionName()).isEqualTo("Keep history");
  mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(Map.of("status","OK","expectedVersion",1,"requestKey",UUID.randomUUID(),"testVersionId",v,"executedOn","2026-10-25")))).andExpect(status().isUnprocessableEntity());
  try(var book=new XSSFWorkbook(new java.io.ByteArrayInputStream(documents.export(p,admin.getId(),d,false).bytes()))) {
   var sheet=book.getSheetAt(0);var headers=new ArrayList<String>();sheet.getRow(0).forEach(cell->headers.add(cell.getStringCellValue()));
   assertThat(sheet.getRow(1).getCell(headers.indexOf("Version test")).getStringCellValue()).isEqualTo("Keep history");
  }
  assertThat(version("Keep history")).isNotEqualTo(v);
 }
 @Test void deleteEnforcesManagerScopeCsrfAndFeatureLifecycle()throws Exception {
  long v=version("Protected");
  var tester=users.saveAndFlush(new IdentityUser("delete.tester."+UUID.randomUUID().toString().substring(0,8),"Tester","not-login","TESTER"));
  projects.addOrUpdateMember(p,admin.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"));
  mvc.perform(delete(path("/features/"+f+"/test-versions/"+v)).with(actor(tester)).with(csrf())).andExpect(status().isForbidden());
  mvc.perform(delete(path("/features/"+f+"/test-versions/"+v)).with(actor(admin))).andExpect(status().isForbidden());
  long other=((Number)features.create(p,admin.getId(),new FeatureDtos.Create("Other","","",UUID.randomUUID())).get("id")).longValue();
  mvc.perform(delete(path("/features/"+other+"/test-versions/"+v)).with(actor(admin)).with(csrf())).andExpect(status().isNotFound());
  features.archive(p,admin.getId(),f,new FeatureDtos.Version(0L,UUID.randomUUID()),true);
  mvc.perform(delete(path("/features/"+f+"/test-versions/"+v)).with(actor(admin)).with(csrf())).andExpect(status().isConflict());
  assertThat(features.testVersions(p,admin.getId(),f)).hasSize(1);
 }
 @Test void versionsStampOnlyWrittenCaseAndKeepHistoryReplayAndExport()throws Exception {
  long first=version("iPad 1.0 (133)"),second=version("iPad 1.1 (134)");
  var command=new LinkedHashMap<String,Object>(Map.of("status","NG","expectedVersion",0,"requestKey",UUID.randomUUID(),"testVersionId",first,"executedOn","2026-10-24"));
  for(int attempt=0;attempt<2;attempt++)mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(command))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.testVersionName").value("iPad 1.0 (133)"));
  command.put("testVersionId",second);
  mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(command))).andExpect(status().isConflict());
  command.put("expectedVersion",1);command.put("requestKey",UUID.randomUUID());command.put("status","OK");command.put("executedOn","2026-10-25");
  mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(command))).andExpect(status().isOk()).andExpect(jsonPath("$.testVersionName").value("iPad 1.1 (134)"));
  mvc.perform(get(path("/test-documents/"+d)).with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.rows[0].testVersionName").value("iPad 1.1 (134)")).andExpect(jsonPath("$.rows[1].testVersionName").doesNotExist());
  mvc.perform(get(path("/test-documents/"+d+"/rows/"+row+"/result-history")).with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[1].testVersionName").value("iPad 1.0 (133)")).andExpect(jsonPath("$[1].executedOn").value("2026-10-24"));
  try(var book=new XSSFWorkbook(new java.io.ByteArrayInputStream(documents.export(p,admin.getId(),d,false).bytes()))) {
   var sheet=book.getSheetAt(0);var headers=new ArrayList<String>();sheet.getRow(0).forEach(cell->headers.add(cell.getStringCellValue()));
   assertThat(headers).contains("Version test","Ngày thực hiện");
   assertThat(sheet.getRow(1).getCell(headers.indexOf("Version test")).getStringCellValue()).isEqualTo("iPad 1.1 (134)");
  }
 }
 @Test void onlyManagersCreateAndVersionCannotCrossFeature()throws Exception {
  var tester=users.saveAndFlush(new IdentityUser("version.tester."+UUID.randomUUID().toString().substring(0,8),"Tester","not-login","TESTER"));
  projects.addOrUpdateMember(p,admin.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"));
  mvc.perform(post(path("/features/"+f+"/test-versions")).with(actor(tester)).with(csrf()).contentType("application/json").content(encode(Map.of("name","Forbidden","requestKey",UUID.randomUUID())))).andExpect(status().isForbidden());
  long original=f;f=((Number)features.create(p,admin.getId(),new FeatureDtos.Create("Other","","",UUID.randomUUID())).get("id")).longValue();long foreign=version("Other version");f=original;
  mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(Map.of("status","NG","expectedVersion",0,"requestKey",UUID.randomUUID(),"testVersionId",foreign,"executedOn","2026-10-25")))).andExpect(status().isUnprocessableEntity());
 }
 @Test void correctingVersionKeepsStatusAndDateAndRejectsStaleWrites()throws Exception {
  long first=version("First"),second=version("Second");
  var input=new TestDocumentDtos.UpdateResult("NG",0L,UUID.randomUUID().toString(),first,java.time.LocalDate.of(2026,10,24));
  features.updateResult(p,admin.getId(),d,row,input);
  var correction=new TestDocumentDtos.UpdateResult("NG",1L,UUID.randomUUID().toString(),second,input.executedOn());
  var saved=features.updateResult(p,admin.getId(),d,row,correction);
  assertThat(saved.status()).isEqualTo("NG");assertThat(saved.executedOn()).isEqualTo(input.executedOn());assertThat(saved.testVersionId()).isEqualTo(second);
  assertThat(documents.get(p,admin.getId(),d).rows().get(1).resultStatus()).isEqualTo("UNEXECUTED");
  var history=documents.resultHistory(p,admin.getId(),d,row,0);
  assertThat(history).hasSize(2);assertThat(history.getFirst().before()).isEqualTo("NG");assertThat(history.getFirst().after()).isEqualTo("NG");
  assertThat(history.getFirst().testVersionName()).isEqualTo("Second");assertThat(history.getLast().testVersionName()).isEqualTo("First");
  mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(new TestDocumentDtos.UpdateResult("NG",1L,UUID.randomUUID().toString(),first,input.executedOn())))).andExpect(status().isConflict());
 }
 @Test void createVersionIsIdempotentAndConfiguredFeatureRequiresExecutionContext()throws Exception {
  var body=Map.of("name","Unique version","requestKey",UUID.randomUUID());
  long id=0;
  for(int n=0;n<2;n++){
   var response=mvc.perform(post(path("/features/"+f+"/test-versions")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(body))).andExpect(status().isCreated()).andReturn();
   long actual=json.readTree(response.getResponse().getContentAsByteArray()).path("id").asLong();if(n==0)id=actual;else assertThat(actual).isEqualTo(id);
  }
  assertThat(features.testVersions(p,admin.getId(),f)).hasSize(1);
  mvc.perform(put(path("/test-documents/"+d+"/rows/"+row+"/result")).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(new TestDocumentDtos.UpdateResult("NG",0L,UUID.randomUUID().toString())))).andExpect(status().isUnprocessableEntity());
 }
}
