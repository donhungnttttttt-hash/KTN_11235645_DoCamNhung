package vn.syp.tms.hardening;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.*;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;
import vn.syp.tms.identity.*;

/** Real HTTP/session/CSRF + MySQL. Only anonymous identity fixtures bypass the API. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="debug=false")
@Testcontainers
class SystemJourneyTest {
    @Container static final MySQLContainer<?> mysql=new MySQLContainer<>("mysql:8.4.8");
    // JUnit @Container owns and closes this instance.
    static { mysql.withDatabaseName("tms_system_test").withUsername("test").withPassword("ephemeral-test-only"); }
    @org.junit.jupiter.api.io.TempDir static java.nio.file.Path evidenceRoot;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("TMS_DB_URL",mysql::getJdbcUrl);r.add("TMS_DB_USER",mysql::getUsername);r.add("TMS_DB_PASSWORD",mysql::getPassword);
        r.add("TMS_MIGRATION_USER",mysql::getUsername);r.add("TMS_MIGRATION_PASSWORD",mysql::getPassword);
        r.add("TMS_ATTACHMENT_ROOT",()->evidenceRoot.toString());r.add("TMS_REDMINE_ENABLED",()->false);
    }
    @LocalServerPort int port;
    @Autowired ObjectMapper json; @Autowired IdentityUserRepository users; @Autowired PasswordEncoder passwords; @Autowired JdbcTemplate db;
    Client pm,tester,outside;long p,member;String base,tag;
    @BeforeEach void identities() throws Exception {
        tag=UUID.randomUUID().toString().substring(0,8);
        String password=UUID.randomUUID()+"-Fixture!",hash=passwords.encode(password);
        var owner=users.saveAndFlush(new IdentityUser("pm."+tag,"PM ẩn danh",hash,"ADMIN"));
        var worker=users.saveAndFlush(new IdentityUser("tester."+tag,"Tester ẩn danh",hash,"TESTER"));
        var stranger=users.saveAndFlush(new IdentityUser("other."+tag,"Admin ngoài dự án",hash,"ADMIN"));
        pm=new Client();pm.login(owner.getUsername(),password);tester=new Client();tester.login(worker.getUsername(),password);
        outside=new Client();outside.login(stranger.getUsername(),password);
        p=pm.write("POST","/projects",Map.of("code","UAT-"+tag,"name","Regression nội bộ","timezone","Asia/Ho_Chi_Minh"),200).path("id").asLong();
        base="/projects/"+p;
        member=pm.write("PUT",base+"/members/"+worker.getId(),Map.of("projectRole","TESTER"),200).path("membershipId").asLong();
    }
    @Test void rejectsInvalidTimezoneBeforeItCanBreakReports() throws Exception {
        for(String zone:List.of("", "Invalid/Timezone", "x".repeat(65))) {
            pm.write("POST","/projects",Map.of("code","BAD-"+UUID.randomUUID().toString().substring(0,8),"name","Sai múi giờ","timezone",zone),422);
            pm.write("PATCH",base,Map.of("timezone",zone,"expectedVersion",0),422);
        }
        assertThat(pm.get(base,200).path("timezone").asText()).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(tester.get(base+"/reports/summary",200).path("metrics").path("total").asInt()).isZero();
    }
    @Test void rejectsCrossProjectReadsCsrfAndCrossOriginRequests() throws Exception {
        for(String tail:List.of("","/members","/catalogs/builds","/test-cases","/test-suites","/test-cycles","/work-items","/reports/summary","/reports/export.xlsx","/retest-requests","/integrations/redmine","/handbook")) {
            assertThat(outside.raw("GET",base+tail,null,null,Map.of()).statusCode()).as(tail).isEqualTo(404);
        }
        assertThat(new Client().raw("GET",base+"/work-items",null,null,Map.of()).statusCode()).isEqualTo(401);
        assertThat(pm.raw("PATCH",base,json.writeValueAsBytes(Map.of("name","forged","expectedVersion",0)),null,Map.of()).statusCode()).isEqualTo(403);
        var cors=pm.raw("OPTIONS",base,null,null,Map.of("Origin","https://untrusted.invalid","Access-Control-Request-Method","PATCH"));
        assertThat(cors.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
        assertThat(pm.get(base,200).path("name").asText()).isEqualTo("Regression nội bộ");
    }
    @Test void catalogDtoConstraintsApplyAfterDynamicMapping() throws Exception {
        for(String kind:List.of("environments","devices","categories","milestones")) {
            pm.write("POST",base+"/catalogs/"+kind,Map.of("code","","name","Không hợp lệ"),422);
            assertThat(pm.get(base+"/catalogs/"+kind,200).size()).isZero();
        }
        pm.write("POST",base+"/catalogs/builds",Map.of("versionLabel","","platform",""),422);
    }
    @Test void xlsxToAssignedNgBugFullRetestClosureAndReportUsesRealSessions(@org.junit.jupiter.api.io.TempDir java.nio.file.Path recoveryTemp) throws Exception {
        pm.write("POST",base+"/test-suites",Map.of("code","AUTH","name","Đăng nhập","sortOrder",0),200);
        byte[] template=pm.raw("GET",base+"/import-previews/template?suiteCode=AUTH",null,null,Map.of()).body();
        byte[] workbook;
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(template));var out=new ByteArrayOutputStream()) {
            book.getSheetAt(0).getRow(1).getCell(0).setCellValue("TC-SYSTEM");book.write(out);workbook=out.toByteArray();
        }
        JsonNode preview=pm.upload(base+"/import-previews","cases.xlsx",workbook,200);
        assertThat(preview.path("errorRows").asInt()).isZero();
        pm.write("POST",base+"/import-previews/"+preview.path("id").asLong()+"/commit",null,200);
        pm.write("POST",base+"/import-previews/"+preview.path("id").asLong()+"/commit",null,200);
        var cases=tester.get(base+"/test-cases",200);
        assertThat(cases.path("items").size()).isEqualTo(1);
        var caseRow=cases.path("items").get(0);long caseId=caseRow.path("id").asLong();
        long revision=tester.get(base+"/test-cases/"+caseId,200).path("currentRevisionId").asLong();
        String approval=base+"/test-cases/"+caseId+"/revisions/"+revision+"/approve";
        tester.write("POST",approval,null,403);pm.write("POST",approval,null,200);
        long env=pm.write("POST",base+"/catalogs/environments",Map.of("code","QA","name","QA nội bộ"),200).path("id").asLong();
        long device=pm.write("POST",base+"/catalogs/devices",Map.of("code","WEB","name","Chrome","deviceType","PC","osName","Windows","osVersion","11"),200).path("id").asLong();
        long build=pm.write("POST",base+"/catalogs/builds",Map.of("versionLabel","1.0","buildNumber","1","platform","WEB"),200).path("id").asLong();
        long cycle=pm.write("POST",base+"/test-cycles",Map.of("code","REG","name","Hồi quy"),200).path("id").asLong();
        String cyclePath=base+"/test-cycles/"+cycle;
        pm.write("POST",cyclePath+"/configurations",Map.of("environmentId",env,"deviceId",device,"buildId",build,"expectedVersion",0),200);
        long config=pm.get(cyclePath+"/configurations",200).get(0).path("id").asLong();
        pm.write("POST",cyclePath+"/scope",Map.of("configurationId",config,"revisionIds",List.of(revision),"assigneeMembershipId",member,"expectedVersion",1),200);
        pm.write("POST",cyclePath+"/activate",Map.of("expectedVersion",2),200);
        long run=tester.get(cyclePath+"/run-items?mine=true",200).path("items").get(0).path("id").asLong();
        String runPath=base+"/run-items/"+run;
        var ng=Map.of("resultCode","NG","buildId",build,"actualResult","Màn hình trắng","requestKey","system-ng-"+tag,"expectedVersion",0);
        pm.write("POST",runPath+"/attempts",ng,403);
        long attempt=tester.write("POST",runPath+"/attempts",ng,200).path("id").asLong();
        assertThat(tester.write("POST",runPath+"/attempts",ng,200).path("id").asLong()).isEqualTo(attempt);
        tester.write("POST",runPath+"/attempts",Map.of("resultCode","OK","buildId",build,"requestKey","system-stale-"+tag,"expectedVersion",0),409);
        var bugInput=new LinkedHashMap<String,Object>();
        bugInput.putAll(Map.of("type","BUG","title","Lỗi màn hình trắng","steps","Đăng nhập","expectedResult","Vào trang chủ","actualResult","Màn hình trắng","buildId",build,"environmentId",env,"deviceId",device,"revisionId",revision,"attemptId",attempt));
        bugInput.put("requestKey","system-bug-"+tag);
        long bug=tester.write("POST",base+"/work-items",bugInput,201).path("id").asLong();String bugPath=base+"/work-items/"+bug;
        assertThat(tester.write("POST",base+"/work-items",bugInput,201).path("id").asLong()).isEqualTo(bug);
        byte[] proof="%PDF-1.7\n1 0 obj <<>> endobj\n%%EOF".getBytes(StandardCharsets.US_ASCII);
        String attachment=tester.upload(bugPath+"/attachments","proof.pdf",proof,201).path("id").asText();
        var download=tester.raw("GET",bugPath+"/attachments/"+attachment+"/content",null,null,Map.of());
        assertThat(download.statusCode()).isEqualTo(200);assertThat(download.body()).isEqualTo(proof);
        assertThat(download.headers().firstValue("Content-Disposition").orElseThrow()).startsWith("attachment;");
        assertThat(download.headers().firstValue("X-Content-Type-Options")).contains("nosniff");
        outside.get(bugPath+"/attachments/"+attachment+"/content",404);
        var fix=Map.of("status","resolved","fixedBuildId",build,"reason","Dev đã sửa","expectedVersion",0);
        tester.write("POST",bugPath+"/transitions",fix,403);pm.write("POST",bugPath+"/transitions",fix,200);
        assertThat(tester.get(runPath,200).path("resultCode").asText()).isEqualTo("NG");
        var coverage=pm.write("POST",bugPath+"/retest-coverage",Map.of("runItemIds",List.of(run),"reason","Toàn phạm vi","expectedVersion",1),201);
        long coverageItem=coverage.path("items").get(0).path("id").asLong();
        var request=pm.write("POST",bugPath+"/retest-requests",Map.of("coverageRevisionId",coverage.path("coverage").path("id").asLong(),"coverageItemIds",List.of(coverageItem),"verificationScope","FULL_CASE","assigneeMembershipId",member,"reason","Chạy đầy đủ case","expectedVersion",2,"requestKey","system-retest-"+tag),201);
        String retestPath=base+"/retest-requests/"+request.path("id").asLong();
        var result=Map.of("results",List.of(Map.of("coverageItemId",coverageItem,"verdict","PASS","actualResult","Đạt toàn bộ bước","expectedRunVersion",1)),"expectedVersion",0,"expectedBugVersion",3,"requestKey","system-pass-"+tag);
        tester.write("POST",retestPath+"/results",result,200);tester.write("POST",retestPath+"/results",result,200);
        long version=pm.get(bugPath,200).path("version").asLong();
        tester.write("POST",bugPath+"/closure",Map.of("kind","FIXED","reason","Đạt","expectedVersion",version),403);
        pm.write("POST",bugPath+"/closure",Map.of("kind","FIXED","reason","Đủ phạm vi đã duyệt","expectedVersion",version),200);
        pm.write("POST",cyclePath+"/decisions",Map.of("action","CLOSE","reason","Đã hoàn tất","expectedVersion",3),200);
        var report=tester.get(base+"/reports/summary?cycleId="+cycle,200);
        assertThat(report.path("metrics").path("passPercent").asDouble()).isEqualTo(100);
        assertThat(report.path("metrics").path("openBugs").asInt()).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,p)).isEqualTo(2);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=? AND result_code='NG'",Long.class,p)).isEqualTo(1);
        var exported=tester.raw("GET",base+"/reports/export.xlsx?cycleId="+cycle,null,null,Map.of());assertThat(exported.statusCode()).isEqualTo(200);
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(exported.body()))) {
            assertThat(book.getNumberOfSheets()).isEqualTo(5);
            for(var sheet:book)for(var row:sheet)for(var cell:row)assertThat(cell.getCellType()).isNotEqualTo(org.apache.poi.ss.usermodel.CellType.FORMULA);
        }
        RecoveryDrill.verify(mysql,db,evidenceRoot,recoveryTemp,json);
    }
    class Client {
        final HttpClient http=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).connectTimeout(Duration.ofSeconds(5)).build();
        void login(String username,String password) throws Exception {write("POST","/auth/login",Map.of("username",username,"password",password),200);}
        JsonNode get(String path,int expected) throws Exception {return result(raw("GET",path,null,null,Map.of()),expected);}
        JsonNode write(String method,String path,Object body,int expected) throws Exception {
            return result(raw(method,path,body==null?null:json.writeValueAsBytes(body),get("/auth/csrf",200),Map.of()),expected);
        }
        JsonNode upload(String path,String filename,byte[] bytes,int expected) throws Exception {
            String boundary="TmsBoundary"+UUID.randomUUID();var out=new ByteArrayOutputStream();
            out.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\""+filename+"\"\r\nContent-Type: application/octet-stream\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
            out.write(bytes);out.write(("\r\n--"+boundary+"--\r\n").getBytes(StandardCharsets.US_ASCII));
            return result(raw("POST",path,out.toByteArray(),get("/auth/csrf",200),Map.of("Content-Type","multipart/form-data; boundary="+boundary)),expected);
        }
        HttpResponse<byte[]> raw(String method,String path,byte[] body,JsonNode csrf,Map<String,String> headers) throws Exception {
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1"+path)).timeout(Duration.ofSeconds(30));
            request.header("Content-Type",headers.getOrDefault("Content-Type","application/json"));
            headers.forEach((k,v)->{if(!k.equals("Content-Type"))request.header(k,v);});
            if(csrf!=null) request.header(csrf.path("headerName").asText(),csrf.path("token").asText());
            return http.send(request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofByteArray(body)).build(),HttpResponse.BodyHandlers.ofByteArray());
        }
        JsonNode result(HttpResponse<byte[]> response,int expected) throws Exception {
            assertThat(response.statusCode()).as("%s %s",response.request().method(),response.request().uri()).isEqualTo(expected);
            return response.body().length==0?json.nullNode():json.readTree(response.body());
        }
    }
}
