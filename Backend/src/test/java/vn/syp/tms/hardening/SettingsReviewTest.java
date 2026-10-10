package vn.syp.tms.hardening;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.*;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
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

/** Real HTTP/session/CSRF + MySQL; anonymous identities and legacy/archive fixtures are set up directly. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="debug=false")
@Testcontainers
class SettingsReviewTest {
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
        // Each scenario gets fresh login rate-limit state in this disposable test database.
        // Production throttling is unchanged and covered by IdentityIntegrationTest.
        db.update("DELETE FROM identity_login_buckets");
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

    @Test void catalogValidationConcurrencyAuditAndArchivePreserveHistory() throws Exception {
        String path=base+"/catalogs/environments";
        pm.write("POST",path,Map.of("code","x".repeat(33),"name","Too long"),422);
        var row=pm.write("POST",path,Map.of("code","QA","name","Original"),200);
        String item=path+"/"+row.path("id").asLong();
        pm.write("PATCH",item,Map.of("name","Changed","expectedVersion",0),200);
        pm.write("PATCH",item,Map.of("name","Lost update","expectedVersion",0),409);
        pm.write("DELETE",item+"?expectedVersion=0",null,409);
        tester.write("PATCH",item,Map.of("name","Forbidden","expectedVersion",1),403);
        outside.get(path,404);
        pm.write("DELETE",item+"?expectedVersion=1",null,204);
        assertThat(pm.get(path,200).get(0).path("active").asBoolean()).isFalse();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND entity_type='ENVIRONMENT'",Long.class,p)).isEqualTo(3);
    }
    @Test void membershipUpdatesNeedVersionAndCannotRemoveLastPmOrCreateAccounts() throws Exception {
        var members=pm.get(base+"/members",200);
        JsonNode worker=members.findValues("userId").stream().filter(x-> !x.asText().equals(db.queryForObject("SELECT created_by FROM projects WHERE id=?",String.class,p))).findFirst().orElseThrow();
        String path=base+"/members/"+worker.asText();
        pm.write("PUT",path,Map.of("projectRole","MEMBER","expectedVersion",0),200);
        pm.write("PUT",path,Map.of("projectRole","PM","expectedVersion",0),409);
        pm.write("DELETE",path+"?expectedVersion=0",null,409);
        String owner=db.queryForObject("SELECT created_by FROM projects WHERE id=?",String.class,p);
        pm.write("DELETE",base+"/members/"+owner+"?expectedVersion=0",null,409);
        tester.get(base+"/member-candidate?username=pm."+tag,403);
        pm.write("DELETE",path+"?expectedVersion=1",null,204);
        tester.get(base,404);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM identity_users WHERE username LIKE ?",Long.class,"%."+tag)).isEqualTo(3);
    }
    @Test void handbookIsInternalPlainTextWithImmutableHistoryAndStaleWriteRejection() throws Exception {
        String path=base+"/handbook";
        pm.write("POST",path,Map.of("code","BAD","name","Bad","resourceType","GUIDE","contentHtml","text","visibility","PUBLIC"),422);
        var item=pm.write("POST",path,Map.of("code","GUIDE","name","Hướng dẫn","resourceType","GUIDE","contentHtml","<script>alert(1)</script>","visibility","INTERNAL"),200);
        String detail=path+"/"+item.path("id").asLong();
        long revision=item.path("currentRevision").path("id").asLong();
        var edit=Map.of("contentHtml","Phiên bản mới","visibility","INTERNAL","expectedCurrentRevisionId",revision);
        tester.write("POST",detail+"/revisions",edit,403);
        pm.write("POST",detail+"/revisions",edit,200);
        pm.write("POST",detail+"/revisions",edit,409);
        var result=tester.get(detail,200);
        assertThat(result.path("history").size()).isEqualTo(2);
        assertThat(result.path("history").findValuesAsText("contentHtml")).contains("<script>alert(1)</script>");
        outside.get(detail,404);
    }
    @Test void rulesRejectUnsafeJsonAndPublishVersionWithoutChangingOldContent() throws Exception {
        String path=base+"/bug-rule-versions";
        var rule=pm.write("POST",path,Map.of("code","INTERNAL_DEMO","name","Quy tắc nội bộ thử nghiệm"),200);
        String versions=path+"/"+rule.path("id").asLong()+"/versions";
        pm.write("POST",versions,Map.of("contentJson","{bad"),422);
        pm.write("POST",versions,Map.of("contentJson","{\"script\":\"alert(1)\"}"),422);
        String content=json.writeValueAsString(Map.of("schemaVersion",1,"scope","INTERNAL_DEMO","sourceReference","ADR-006","titlePrefix","[QA] ","requiredFields",List.of("title","steps","expectedResult","actualResult","buildId","environmentId","deviceId")));
        var version=pm.write("POST",versions,Map.of("contentJson",content),200);
        String publish=versions+"/"+version.path("id").asLong()+"/publish";
        tester.write("POST",publish,Map.of("expectedActiveVersionId",0),403);
        pm.write("POST",publish,Map.of("expectedActiveVersionId",0),200);
        var next=pm.write("POST",versions,Map.of("contentJson",content),200);
        pm.write("POST",versions+"/"+next.path("id").asLong()+"/publish",Map.of("expectedActiveVersionId",0),409);
        assertThat(tester.get(versions,200).size()).isEqualTo(2);
        assertThat(db.queryForObject("SELECT content_json FROM rule_versions WHERE id=?",String.class,version.path("id").asLong())).contains("ADR-006");
        outside.get(path,404);
    }
    @Test void aPublishedInternalRuleAppliesOnlyToNewBugsAndPreservesTheirRuleVersion() throws Exception {
        long env=pm.write("POST",base+"/catalogs/environments",Map.of("code","QA","name","QA"),200).path("id").asLong();
        long device=pm.write("POST",base+"/catalogs/devices",Map.of("code","WEB","name","Web"),200).path("id").asLong();
        long build=pm.write("POST",base+"/catalogs/builds",Map.of("versionLabel","1.0","platform","WEB"),200).path("id").asLong();
        var bug=new LinkedHashMap<String,Object>(Map.of("type","BUG","title","Original","steps","Steps","expectedResult","Expected","actualResult","Actual","buildId",build,"environmentId",env,"deviceId",device,"standaloneReason","PM chưa có case","requestKey",UUID.randomUUID().toString()));
        long original=pm.write("POST",base+"/work-items",bug,201).path("id").asLong();
        long rule=pm.write("POST",base+"/bug-rule-versions",Map.of("code","INTERNAL_DEMO","name","Internal"),200).path("id").asLong();
        String versions=base+"/bug-rule-versions/"+rule+"/versions";
        String content=json.writeValueAsString(Map.of("schemaVersion",1,"scope","INTERNAL_DEMO","sourceReference","ADR-006","titlePrefix","[QA]","requiredFields",List.of("title","steps","expectedResult","actualResult","buildId","environmentId","deviceId")));
        long version=pm.write("POST",versions,Map.of("contentJson",content),200).path("id").asLong();
        pm.write("POST",versions+"/"+version+"/publish",Map.of("expectedActiveVersionId",0),200);
        bug.put("requestKey",UUID.randomUUID().toString());pm.write("POST",base+"/work-items",bug,422);
        bug.put("title","[QA] Nội dung mới");long created=pm.write("POST",base+"/work-items",bug,201).path("id").asLong();
        assertThat(pm.get(base+"/work-items/"+created,200).path("ruleVersionId").asLong()).isEqualTo(version);
        assertThat(pm.get(base+"/work-items/"+original,200).path("ruleVersionId").isNull()).isTrue();
    }
    @Test void allCatalogKindsValidateUpdateAndArchiveWithAudit() throws Exception {
        var examples=Map.of(
            "environments",Map.of("code","QA","name","Quality","description","Initial"),
            "builds",Map.of("platform","WEB","versionLabel","1.0","buildNumber","1","notes","Initial","releasedAt","2026-09-30"),
            "devices",Map.of("code","PC","name","Desktop","model","PC","osName","Windows","osVersion","11"),
            "categories",Map.of("code","AUTH","name","Login"),
            "milestones",Map.of("code","R1","name","Release","startsOn","2026-09-01","dueOn","2026-09-30"));
        for(var example:examples.entrySet()) {
            String path=base+"/catalogs/"+example.getKey();
            var row=pm.write("POST",path,example.getValue(),200);String item=path+"/"+row.path("id").asLong();
            pm.write("POST",path,example.getValue(),409);
            var change=new LinkedHashMap<String,Object>(example.getValue());change.remove("code");change.put("expectedVersion",0);
            change.put(example.getKey().equals("builds")?"notes":"name","Updated");
            assertThat(pm.write("PATCH",item,change,200).path("version").asInt()).isEqualTo(1);
            pm.write("PATCH",item,change,409);tester.write("DELETE",item+"?expectedVersion=1",null,403);
            outside.write("PATCH",item,change,404);
            pm.write("DELETE",item+"?expectedVersion=1",null,204);
            change.put("expectedVersion",1);pm.write("PATCH",item,change,409);
        }
        pm.write("POST",base+"/catalogs/milestones",Map.of("code","BAD","name","Wrong dates","startsOn","2026-09-30","dueOn","2026-09-01"),422);
        pm.write("POST",base+"/catalogs/builds",Map.of("platform","WEB","versionLabel","NullBuild"),200);
        pm.write("POST",base+"/catalogs/builds",Map.of("platform","WEB","versionLabel","NullBuild","buildNumber",""),409);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND action='ARCHIVE'",Long.class,p)).isEqualTo(5);
    }
    @Test void projectMembershipLookupReactivationAndSystemAccountPermissionsStaySeparate() throws Exception {
        var candidate=pm.get(base+"/member-candidate?username=tester."+tag,200);
        String path=base+"/members/"+candidate.path("userId").asText();
        assertThat(candidate.path("membershipVersion").asInt()).isZero();
        pm.write("PUT",path,Map.of("projectRole","PM"),422);
        pm.write("PUT",path,Map.of("projectRole","PM","expectedVersion",0),200);
        tester.write("POST","/users",Map.of("username","forbidden."+tag,"displayName","Must not create","role","TESTER","password","Fixture-only-LongPassword!"),403);
        pm.write("DELETE",path+"?expectedVersion=1",null,204);tester.get(base+"/handbook",404);
        var removed=pm.get(base+"/member-candidate?username=tester."+tag,200);
        pm.write("PUT",path,Map.of("projectRole","TESTER","expectedVersion",removed.path("membershipVersion").asLong()),200);tester.get(base+"/handbook",200);
        pm.get(base+"/member-candidate?username=missing.user",404);pm.get(base+"/member-candidate?username=x",422);
        pm.write("PUT",base+"/members/nonexistent",Map.of("projectRole","TESTER"),422);
        assertThat(db.queryForObject("SELECT role_code FROM identity_users WHERE id=?",String.class,candidate.path("userId").asText())).isEqualTo("TESTER");
    }
    @Test void concurrentRoleUpdatesProduceOneWinnerAndOneConflict() throws Exception {
        String target=pm.get(base+"/member-candidate?username=tester."+tag,200).path("userId").asText();
        byte[] body=json.writeValueAsBytes(Map.of("projectRole","MEMBER","expectedVersion",0));
        var csrf=pm.get("/auth/csrf",200);var start=new java.util.concurrent.CountDownLatch(1);
        try(var executor=java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            java.util.concurrent.Callable<Integer> request=()->{start.await();return pm.raw("PUT",base+"/members/"+target,body,csrf,Map.of()).statusCode();};
            var first=executor.submit(request);var second=executor.submit(request);start.countDown();
            assertThat(List.of(first.get(),second.get())).containsExactlyInAnyOrder(200,409);
        }
    }
    @Test void dateClearingIsExplicitAndInvalidRangesRollbackWithoutChangingVersion() throws Exception {
        String path=base+"/catalogs/milestones";
        long id=pm.write("POST",path,Map.of("code","R1","name","Release","startsOn","2026-09-01","dueOn","2026-09-30"),200).path("id").asLong();
        pm.write("PATCH",path+"/"+id,Map.of("startsOn","2026-10-01","expectedVersion",0),422);
        var cleared=pm.write("PATCH",path+"/"+id,Map.of("clearDates",List.of("dueOn"),"expectedVersion",0),200);
        assertThat(cleared.path("dueOn").isNull()).isTrue();assertThat(cleared.path("startsOn").asText()).isEqualTo("2026-09-01");
        pm.write("PATCH",path+"/"+id,Map.of("clearDates",List.of("unexpected"),"expectedVersion",1),422);
        String builds=base+"/catalogs/builds";
        long build=pm.write("POST",builds,Map.of("platform","WEB","versionLabel","1.0","releasedAt","2026-09-30"),200).path("id").asLong();
        assertThat(pm.write("PATCH",builds+"/"+build,Map.of("clearDates",List.of("releasedAt"),"expectedVersion",0),200).path("releasedAt").isNull()).isTrue();
    }
    @Test void projectListsAndPartialEditsRespectMembershipAndArchive() throws Exception {
        assertThat(tester.get("/projects",200).findValuesAsText("projectRole")).contains("TESTER");
        assertThat(outside.get("/projects",200)).isEmpty();
        tester.write("POST","/projects",Map.of("code","DENIED","name","Forbidden"),403);
        pm.write("POST","/projects",Map.of("code","UAT-"+tag,"name","Duplicate","timezone","UTC"),400);
        var updated=pm.write("PATCH",base,Map.of("description","Partial edit","expectedVersion",0),200);
        assertThat(updated.path("name").asText()).isEqualTo("Regression nội bộ");
        assertThat(pm.get(base,200).path("description").asText()).isEqualTo("Partial edit");
        var candidate=pm.get(base+"/member-candidate?username=other."+tag,200);
        assertThat(candidate.path("membershipVersion").isNull()).isTrue();
        String target=base+"/members/"+candidate.path("userId").asText();
        pm.write("PUT",target,Map.of("projectRole","TESTER","expectedVersion",0),409);
        pm.write("DELETE",target+"?expectedVersion=0",null,204);
        db.update("UPDATE projects SET archived_at=CURRENT_TIMESTAMP WHERE id=?",p);
        assertThat(pm.get("/projects",200).get(0).path("archived").asBoolean()).isTrue();
        assertThat(pm.get(base,200).path("archived").asBoolean()).isTrue();
        pm.write("PATCH",base,Map.of("name","Must not change","expectedVersion",1),409);
    }
    @Test void catalogPartialEditsKeepOtherFieldsAndArchivedBuildRejectsCurrentVersion() throws Exception {
        for(String kind:List.of("environments","devices","categories")) {
            String path=base+"/catalogs/"+kind;
            long id=pm.write("POST",path,Map.of("code","QA","name","Preserved"),200).path("id").asLong();
            var result=pm.write("PATCH",path+"/"+id,Map.of("active",false,"expectedVersion",0),200);
            assertThat(result.path("name").asText()).isEqualTo("Preserved");
            assertThat(result.path("active").asBoolean()).isFalse();
            assertThat(tester.get(path,200).size()).isEqualTo(1);
            pm.write("DELETE",path+"/"+id+"?expectedVersion=-1",null,422);
        }
        String milestone=base+"/catalogs/milestones";
        long id=pm.write("POST",milestone,Map.of("code","R","name","Release"),200).path("id").asLong();
        assertThat(tester.get(milestone,200).get(0).path("archived").asBoolean()).isFalse();
        var changed=pm.write("PATCH",milestone+"/"+id,Map.of("archived",true,"expectedVersion",0),200);
        long version=changed.path("version").asLong();
        changed=pm.write("PATCH",milestone+"/"+id,Map.of("archived",true,"expectedVersion",version),200);
        assertThat(changed.path("archived").asBoolean()).isTrue();
        assertThat(tester.get(milestone,200).get(0).path("archived").asBoolean()).isTrue();
        pm.write("PATCH",milestone+"/"+id,Map.of("archived",false,"clearDates",List.of("startsOn"),"dueOn","2026-10-01","expectedVersion",changed.path("version").asLong()),200);
        String builds=base+"/catalogs/builds";
        long build=pm.write("POST",builds,Map.of("platform","WEB","versionLabel","1.0"),200).path("id").asLong();
        pm.write("DELETE",builds+"/"+build+"?expectedVersion=0",null,204);
        pm.write("PATCH",builds+"/"+build,Map.of("notes","Blocked","expectedVersion",1),409);
        pm.write("DELETE",builds+"/"+build+"?expectedVersion=1",null,204);
        assertThat(pm.get(builds,200)).isEmpty();
        pm.get(base+"/catalogs/unknown",404);
        pm.write("POST",base+"/catalogs/unknown",Map.of(),404);
        pm.write("PATCH",base+"/catalogs/unknown/1",Map.of(),404);
        pm.write("DELETE",base+"/catalogs/unknown/1?expectedVersion=0",null,404);
    }
    @Test void handbookReadbackDefaultsAndArchivedLegacyResourcesRemainSafe() throws Exception {
        String path=base+"/handbook";
        var input=Map.of("code","GUIDE","name","Guide","resourceType","GUIDE","contentHtml","Original");
        var doc=pm.write("POST",path,input,200);
        assertThat(doc.path("currentRevision").path("visibility").asText()).isEqualTo("INTERNAL");
        pm.write("POST",path,input,409);
        String detail=path+"/"+doc.path("id").asLong();
        doc=pm.write("POST",detail+"/revisions",Map.of("contentHtml","Updated","expectedCurrentRevisionId",doc.path("currentRevision").path("id").asLong()),200);
        assertThat(doc.path("currentRevision").path("visibility").asText()).isEqualTo("INTERNAL");
        assertThat(tester.get(path,200).get(0).path("currentRevision").path("contentHtml").asText()).isEqualTo("Updated");
        db.update("UPDATE project_resources SET archived_at=CURRENT_TIMESTAMP WHERE id=?",doc.path("id").asLong());
        assertThat(tester.get(detail,200).path("archived").asBoolean()).isTrue();
        pm.write("POST",detail+"/revisions",Map.of("contentHtml","Must not append","expectedCurrentRevisionId",doc.path("currentRevision").path("id").asLong()),409);
        // Legacy schema permits a resource with no current revision; reads must stay safe.
        db.update("INSERT INTO project_resources(project_id,code,resource_type,name,created_at,updated_at) VALUES (?,'LEGACY','GUIDE','Legacy',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",p);
        long legacy=java.util.Objects.requireNonNull(db.queryForObject("SELECT id FROM project_resources WHERE project_id=? AND code='LEGACY'",Long.class,p));
        assertThat(tester.get(path,200).size()).isEqualTo(2);
        var empty=tester.get(path+"/"+legacy,200);
        assertThat(empty.path("currentRevision").isNull()).isTrue();assertThat(empty.path("history")).isEmpty();
    }
    @Test void rulesListMetadataAndPublishGuardsPreserveTheCurrentPolicy() throws Exception {
        String path=base+"/bug-rule-versions";
        pm.write("POST",path,Map.of("code","CUSTOMER_UNKNOWN","name","Unapproved"),422);
        var rule=pm.write("POST",path,Map.of("code","INTERNAL_DEMO","name","Internal"),200);
        pm.write("POST",path,Map.of("code","INTERNAL_DEMO","name","Duplicate"),409);
        assertThat(tester.get(path,200).get(0).path("activeVersion").isNull()).isTrue();
        assertThat(tester.get(base+"/work-items/metadata",200).path("titlePrefix").asText()).isEmpty();
        String versions=path+"/"+rule.path("id").asLong()+"/versions";
        String content=json.writeValueAsString(Map.of("schemaVersion",1,"scope","INTERNAL_DEMO","sourceReference","ADR-006","titlePrefix","[QA]","requiredFields",List.of("title","steps","expectedResult","actualResult","buildId","environmentId","deviceId")));
        long version=pm.write("POST",versions,Map.of("contentJson",content),200).path("id").asLong();
        String publish=versions+"/"+version+"/publish";
        pm.write("POST",publish,Map.of("expectedActiveVersionId",0),200);
        pm.write("POST",publish,Map.of("expectedActiveVersionId",version),400);
        assertThat(tester.get(path,200).get(0).path("activeVersion").path("id").asLong()).isEqualTo(version);
        assertThat(tester.get(base+"/work-items/metadata",200).path("titlePrefix").asText()).isEqualTo("[QA]");
        outside.get(versions,404);
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
