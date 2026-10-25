package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static vn.syp.tms.support.MockMvcContracts.csrf;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.NonNull;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.syp.tms.identity.*;

/** Explicit opt-in fixture only. No cleanup, adoption of existing rows, main DB or live providers. */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_FR_BROWSER_FIXTURE",matches="true")
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="integration")
class FixReportsBrowserFixtureTest {
    // Synthetic test password, ONLY for the exact isolated schema below. Never placed in the manifest/log.
    static final String FIXTURE_PASSWORD="FR12-Browser-Only!2026";
    static final String SCHEMA="tms_docstest_2060e04c986c";
    private final Path manifestPath=Path.of("..","var","fixreports-2026-10-19","browser-fixture.json").toAbsolutePath().normalize();
    private final Map<String,Object> manifest=new LinkedHashMap<>();
    private final Map<String,IdentityUser> people=new LinkedHashMap<>();
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @Autowired IdentityUserRepository users;
    @Autowired PasswordEncoder passwords;

    @DynamicPropertySource static void database(DynamicPropertyRegistry registry)throws Exception {
        FeatureIntegrationTest.database(registry);
    }

    @Test void seedBrowserOnlyFixtureAndReserveItsManifestBeforeAnyWrite()throws Exception {
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo(SCHEMA);
        assertThat(db.queryForObject("SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1",String.class)).isEqualTo("33");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM projects WHERE code='SPIDER-PLUS'",Long.class))
                .as("Do not adopt, overwrite or reseed an existing SPIDER-PLUS project").isZero();
        Files.createDirectories(manifestPath.getParent());
        manifest.put("state","IN_PROGRESS");manifest.put("schema",SCHEMA);manifest.put("flywayVersion","33");
        manifest.put("runId",UUID.randomUUID().toString());manifest.put("startedAt",Instant.now().toString());
        manifest.put("nextAction","If interrupted, reconcile only these fixture-owned rows before any further seed attempt.");
        Files.writeString(manifestPath,json.writerWithDefaultPrettyPrinter().writeValueAsString(manifest)+"\n",StandardOpenOption.CREATE_NEW,StandardOpenOption.WRITE);
        try {
            String tag=UUID.randomUUID().toString().substring(0,8);
            manifest.put("usernameTag",tag);checkpoint("before-identities");
            person(tag,"admin","FR12 Admin","ADMIN");person(tag,"pm","FR12 PM","PM");
            person(tag,"testerA","FR12 Đỗ Cẩm Nhung","TESTER");person(tag,"testerB","FR12 Tester B","TESTER");
            person(tag,"dev","FR12 DEV được giao","DEV");person(tag,"otherPm","FR12 PM dự án khác","PM");
            person(tag,"unassignedTester","FR12 Tester chưa thuộc dự án","TESTER");
            var accounts=new LinkedHashMap<String,Object>();
            people.forEach((key,user)->accounts.put(key,Map.of("id",user.getId(),"username",user.getUsername(),"displayName",user.getDisplayName(),"role",user.getRole())));
            manifest.put("accounts",accounts);checkpoint("identities");

            long p=project("SPIDER-PLUS","SPIDER PLUS · FR12 cô lập",List.of("pm","testerA","testerB","dev"));
            long other=project("FR12-OTHER-"+tag,"FR12 · Dự án ngoài phạm vi",List.of("otherPm"));
            manifest.put("projects",Map.of("spiderPlus",p,"other",other));
            var availableAssets=new ArrayList<Long>();
            for(int ordinal=1;ordinal<=2;ordinal++)availableAssets.add(write("admin","POST","/api/v1/admin/device-assets",Map.of("assetCode","FR12-"+tag+"-"+ordinal,"type","IPAD","model","FR12 iPad "+ordinal,"osName","iOS","osVersion","18","conditionCode","AVAILABLE","notes","Máy giả lập fixture FR12, chưa bàn giao"),201).get("id").asLong());
            manifest.put("availableAssetIds",availableAssets);
            assertThat(db.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,people.get("admin").getId())).isZero();
            checkpoint("projects");

            long a=feature(p,"pm","Feature A · Phân công 1–40 / 41–60");
            long b=feature(p,"pm","Feature B · Bản Excel độc lập");
            long c=feature(p,"pm","Feature C · Tiến độ 3/5 = 60%");
            long outside=feature(other,"otherPm","Feature ngoài phạm vi thành viên");
            manifest.put("features",Map.of("a",a,"b",b,"progress",c,"other",outside));
            byte[] internal=workbook(false,60),customer=workbook(true,60);
            var documents=new LinkedHashMap<String,Object>();
            documents.put("internalA",imported(p,a,internal,"FR12-internal-60.xlsx"));
            documents.put("customerA",imported(p,a,customer,"FR12-customer-60.xlsx"));
            documents.put("internalB",imported(p,b,internal,"FR12-internal-60.xlsx"));
            documents.put("customerB",imported(p,b,customer,"FR12-customer-60.xlsx"));
            documents.put("progress",imported(p,c,workbook(false,5),"FR12-progress-5.xlsx"));
            manifest.put("documents",documents);checkpoint("documents");

            long progress=number(documents,"progress");var progressRows=read(p,progress).get("rows");
            long tester=membership(p,"testerA");var progressIds=new ArrayList<Long>();progressRows.forEach(row->progressIds.add(row.get("rowId").asLong()));
            write("pm","PUT",base(p)+"/test-documents/"+progress+"/assignments",Map.of("expectedVersion",0,"requestKey",UUID.randomUUID(),"changes",List.of(Map.of("assigneeMembershipId",tester,"rowIds",progressIds))),200);
            for(int index=2;index<5;index++)write("testerA","PUT",base(p)+"/test-documents/"+progress+"/rows/"+progressIds.get(index)+"/result",Map.of("status",List.of("OK","P","NA").get(index-2),"expectedVersion",0,"requestKey",UUID.randomUUID()),200);
            assertThat(read(p,progress).at("/document/progressPercent").asDouble()).isEqualTo(60d);
            checkpoint("progress");

            long d=number(documents,"internalA");var rows=read(p,d).get("rows");
            var linked=issue(p,a,d,rows.get(0).get("rowId").asLong(),false,"BUG","FR12 · Case Issue đã đóng");
            write("pm","PUT",base(p)+"/issues/"+linked.get("id").asLong()+"/status",Map.of("status","closed","reason","Fixture: xác minh bên ngoài, không đổi Status case","expectedVersion",0),200);
            var qa=issue(p,a,d,rows.get(1).get("rowId").asLong(),false,"QA","FR12 · Câu hỏi từ case");
            var monkey=issue(p,a,null,null,true,"BUG","FR12 · Monkey của Tester A");
            var assigned=issue(p,b,null,null,true,"BUG","FR12 · Monkey giao DEV");
            var update=new LinkedHashMap<String,Object>();
            for(String field:List.of("title","description","steps","expectedResult","actualResult"))update.put(field,assigned.path(field).asText());
            update.put("assigneeMembershipId",membership(p,"dev"));update.put("priority","HIGH");update.put("expectedVersion",0);
            write("pm","PUT",base(p)+"/issues/"+assigned.get("id").asLong(),update,200);
            manifest.put("issues",Map.of("closedCaseBug",linked.get("id").asLong(),"caseQa",qa.get("id").asLong(),"ownMonkey",monkey.get("id").asLong(),"assignedDevMonkey",assigned.get("id").asLong()));
            var note=write("pm","POST",base(p)+"/notes",Map.of("title","FR12 · Ghi chú dự án","body","Nội dung kiểm thử riêng.\nKhông có dữ liệu hay thông tin đăng nhập thật."),201);
            var report=write("pm","POST",base(p)+"/management-reports",Map.of("featureId",c,"title","FR12 · Báo cáo đã lưu","markdown","# Báo cáo kiểm thử cô lập\n\nFeature C có 3/5 case đã test (60%).\n\nCó thể sửa nội dung văn bản mà không ghi ngược Status hay Issue."),201);
            manifest.put("noteId",note.get("id").asLong());manifest.put("reportId",report.get("id").asLong());

            var rowManifest=new LinkedHashMap<String,Object>();
            for(var document:documents.entrySet()){
                var detail=read(p,((Number)document.getValue()).longValue());var values=new ArrayList<Map<String,Object>>();int ordinal=0;
                for(var row:detail.get("rows"))values.add(Map.of("ordinal",++ordinal,"rowId",row.get("rowId").asLong(),"caseId",row.get("caseId").asLong(),"revisionId",row.get("revisionId").asLong(),"sourceId",row.path("sourceId").asText()));
                rowManifest.put(document.getKey(),values);
                if(!document.getKey().equals("progress"))assertThat(detail.at("/document/testedCaseCount").asLong()).isZero();
            }
            manifest.put("rows",rowManifest);manifest.put("memberships",Map.of("testerA",tester,"testerB",membership(p,"testerB"),"pm",membership(p,"pm"),"dev",membership(p,"dev")));
            manifest.put("state","READY");manifest.put("completedAt",Instant.now().toString());manifest.put("frontendOrigin","http://127.0.0.1:5174");
            checkpoint("complete");
        }catch(Exception|AssertionError failure){
            manifest.put("state","FAILED_NEEDS_RECONCILIATION");manifest.put("failureClass",failure.getClass().getSimpleName());checkpoint("failed");throw failure;
        }
    }

    private void checkpoint(String stage)throws Exception {
        manifest.put("stage",stage);Files.writeString(manifestPath,json.writerWithDefaultPrettyPrinter().writeValueAsString(manifest)+"\n",StandardOpenOption.TRUNCATE_EXISTING,StandardOpenOption.WRITE);
    }
    private void person(String tag,String key,String display,String role){
        people.put(key,users.saveAndFlush(new IdentityUser("fr12."+tag+"."+key.toLowerCase(Locale.ROOT),display,passwords.encode(FIXTURE_PASSWORD),role)));
    }
    private @NonNull RequestPostProcessor actor(String who){var user=people.get(who);return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),user.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+user.getRole())))));}
    private String base(long p){return "/api/v1/projects/"+p;}
    private JsonNode body(MvcResult result)throws Exception{return json.readTree(result.getResponse().getContentAsByteArray());}
    private JsonNode write(String who,String method,@NonNull String path,Object input,int expected)throws Exception {
        var request=switch(method){case "POST"->post(path);case "PUT"->put(path);default->throw new IllegalArgumentException("Fixture command method");};
        return body(mvc.perform(request.with(actor(who)).with(csrf()).contentType("application/json").content(Objects.requireNonNull(json.writeValueAsString(input)))).andExpect(status().is(expected)).andReturn());
    }
    private long project(String code,String name,List<String> members)throws Exception {
        var roster=members.stream().map(key->Map.of("userId",people.get(key).getId(),"projectRole",people.get(key).getRole())).toList();
        return write("admin","POST","/api/v1/admin/projects",Map.of("project",Map.of("code",code,"name",name,"description","Chỉ phục vụ FR12 trên schema kiểm thử cô lập.","timezone","Asia/Ho_Chi_Minh"),"members",roster,"devices",List.of()),201).get("id").asLong();
    }
    private long feature(long p,String who,String name)throws Exception{return write(who,"POST",base(p)+"/features",Map.of("name",name,"environment","FR12 · localhost / server nhập tự do","description","Fixture tổng hợp browser, không dữ liệu thật.","requestKey",UUID.randomUUID()),201).get("id").asLong();}
    private long imported(long p,long f,byte[] bytes,String name)throws Exception {
        long d=body(mvc.perform(multipart(base(p)+"/features/"+f+"/import-previews").file(new MockMultipartFile("file",name,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes)).with(actor("pm")).with(csrf())).andExpect(status().isOk()).andReturn()).get("id").asLong();
        mvc.perform(post(base(p)+"/features/"+f+"/import-previews/"+d+"/commit").with(actor("pm")).with(csrf())).andExpect(status().isOk());return d;
    }
    private JsonNode read(long p,long d)throws Exception{return body(mvc.perform(get(base(p)+"/test-documents/"+d).with(actor("admin"))).andExpect(status().isOk()).andReturn());}
    private long membership(long p,String who){return Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,people.get(who).getId()));}
    private static long number(Map<String,Object> values,String key){return ((Number)values.get(key)).longValue();}
    private JsonNode issue(long p,long f,Long document,Long row,boolean monkey,String type,String title)throws Exception {
        var input=new LinkedHashMap<String,Object>();input.put("type",type);input.put("featureId",f);input.put("documentId",document);input.put("rowId",row);input.put("monkey",monkey);input.put("title",title);input.put("description","FR12 · Mô tả / câu hỏi từ kiểm thử cô lập");input.put("steps","1. Mở màn kiểm thử\n2. Thực hiện tình huống");input.put("expectedResult","Hiển thị đúng nội dung");input.put("actualResult","Kết quả cần xác minh");input.put("requestKey",UUID.randomUUID());return write("testerA","POST",base(p)+"/issues",input,201);
    }
    private byte[] workbook(boolean customer,int count)throws Exception {
        try(var book=new XSSFWorkbook();var output=new ByteArrayOutputStream()){
            var sheet=book.createSheet(customer?"FR12 customer":"TestCases");var headers=customer?CustomerWorkbook.HEADERS:TestCaseWorkbook.HEADERS;
            var header=sheet.createRow(0);for(int column=0;column<headers.size();column++)header.createCell(column).setCellValue(headers.get(column));
            for(int ordinal=1;ordinal<=count;ordinal++){
                var row=sheet.createRow(ordinal);String id=String.valueOf(ordinal);
                var cells=customer?List.of(id,"FR12 · Đỗ Cẩm Nhung · Case "+id,"Dữ liệu thử","Các bước "+id,"Giao diện","Mục xác nhận "+id,"Kết quả mong đợi "+id,"Ghi chú thiết kế","","","","","",""):
                        List.of(id,"FR12-SUITE","FR12 · Đỗ Cẩm Nhung · Case "+id,"Dữ liệu thử","Các bước "+id,"Kết quả mong đợi "+id,"","","","","FR12 reference "+id);
                for(int column=0;column<cells.size();column++)row.createCell(column).setCellValue(cells.get(column));
            }
            book.write(output);return output.toByteArray();
        }
    }
}
