package vn.syp.tms.handbook;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;

/** Native transactions/HTTP, UUID-owned fixtures; existing registered Admins are read only. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="integration")
class NativeHandbookRevisionIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){vn.syp.tms.support.CurrentWorkflowDatabaseGuard.configure(r);}
    @Autowired JdbcTemplate jdbc; @Autowired ObjectMapper json;
    @Autowired IdentityUserRepository users; @Autowired HandbookService handbook;
    @Autowired PasswordEncoder passwords; @Autowired ProjectService projects;
    @LocalServerPort int port;
    static final String PASSWORD="AR05-synthetic-only-2026!";
    List<Map<String,Object>> registryBefore;
    String admin,tag; long project; IdentityUser pm,secondPm,worker;
    @BeforeEach void fixture(){
        tag="ar05."+UUID.randomUUID();
        registryBefore=jdbc.queryForList("SELECT * FROM system_admin_registry ORDER BY slot");
        assertThat(registryBefore).as("prepared target must contain two registered Admins").hasSize(2);
        admin=registryBefore.get(0).get("user_id").toString();
        pm=account("pm","PM");secondPm=account("pm2","PM");worker=account("worker","USER");
        project=projects.create(admin,new ProjectDtos.CreateProject("H"+UUID.randomUUID().toString().substring(0,12),tag,"AR05 owned fixture","UTC")).id();
        for(var member:List.of(pm,secondPm,worker))projects.addOrUpdateMember(project,admin,member.getId(),new ProjectDtos.SetMember(member.getRole()));
    }
    @AfterEach void registryPreserved(){if(registryBefore!=null)assertThat(jdbc.queryForList("SELECT * FROM system_admin_registry ORDER BY slot")).isEqualTo(registryBefore);}
    IdentityUser account(String suffix,String role){return users.saveAndFlush(new IdentityUser(tag+"."+suffix,suffix,passwords.encode(PASSWORD),role));}
    String base(){return "/projects/"+project+"/handbook";}
    JsonNode body(HttpResponse<String> r)throws Exception{return json.readTree(r.body());}
    JsonNode create(Client caller,String text)throws Exception{
        var response=caller.write(base(),Map.of("code","GUIDE","name","AR05 Guide","resourceType","GUIDE","contentHtml",text,"visibility","INTERNAL"));
        assertThat(response.statusCode()).isEqualTo(200);return body(response);
    }
    Map<String,Object> revision(long expected,String text){return Map.of("contentHtml",text,"visibility","INTERNAL","expectedCurrentRevisionId",expected);}
    int revisionCount(long id){return jdbc.queryForObject("SELECT COUNT(*) FROM resource_revisions WHERE project_id=? AND resource_id=?",Integer.class,project,id);}
    Client login(IdentityUser user)throws Exception{var c=new Client();assertThat(c.write("/auth/login",Map.of("username",user.getUsername(),"password",PASSWORD)).statusCode()).isEqualTo(200);return c;}

    @Test void twoEditorsPreserveWinningRevisionAndLosingDraft()throws Exception{
        var a=login(pm);var b=login(secondPm);var doc=create(a,"Original text");long id=doc.path("id").asLong();String detail=base()+"/"+id;
        long first=body(a.get(detail)).path("currentRevision").path("id").asLong();
        assertThat(body(b.get(detail)).path("currentRevision").path("id").asLong()).isEqualTo(first);
        String revision2Text="<script>winning literal text</script>\n  exact whitespace  ",losingDraft="B draft kept for comparison";
        var won=a.write(detail+"/revisions",revision(first,revision2Text));assertThat(won.statusCode()).isEqualTo(200);
        assertThat(b.write(detail+"/revisions",revision(first,losingDraft)).statusCode()).isEqualTo(409);
        int revisionCountAfterConflict=revisionCount(id);assertThat(revisionCountAfterConflict).isEqualTo(2);
        var current=body(a.get(detail));String currentText=current.path("currentRevision").path("contentHtml").asText();assertThat(currentText).isEqualTo(revision2Text);
        assertThat(current.path("history")).hasSize(2);assertThat(current.path("history").get(1).path("contentHtml").asText()).isEqualTo("Original text");
        long second=body(b.get(detail)).path("currentRevision").path("id").asLong();assertThat(second).isNotEqualTo(first);
        assertThat(revisionCount(id)).isEqualTo(2); // Deliberate read itself never appends.
        var saved=b.write(detail+"/revisions",revision(second,losingDraft));assertThat(saved.statusCode()).isEqualTo(200);
        assertThat(body(saved).path("currentRevision").path("revisionNo").asInt()).isEqualTo(3);
        assertThat(body(a.get(detail)).path("currentRevision").path("contentHtml").asText()).isEqualTo(losingDraft);
        assertThat(revisionCount(id)).isEqualTo(3);
        System.out.println("AR05_EDITORS project="+project+" resource="+id+" revision1="+first+" revision2="+second+" revision3="+body(saved).path("currentRevision").path("id")+" afterConflictCount="+revisionCountAfterConflict);
    }

    @Test void simultaneousTransactionsHaveOneWinnerAndOneConflict()throws Exception{
        var a=login(pm);var b=login(secondPm);var doc=create(a,"v1");long id=doc.path("id").asLong(),first=doc.path("currentRevision").path("id").asLong();
        String path=base()+"/"+id+"/revisions";var csrfA=a.csrf();var csrfB=b.csrf();
        try(var executor=Executors.newFixedThreadPool(2)){
            var gate=new CountDownLatch(1);
            var fa=executor.submit(()->{gate.await();return a.send("POST",path,revision(first,"A simultaneous"),csrfA);});
            var fb=executor.submit(()->{gate.await();return b.send("POST",path,revision(first,"B simultaneous"),csrfB);});gate.countDown();
            var ra=fa.get(30,TimeUnit.SECONDS);var rb=fb.get(30,TimeUnit.SECONDS);
            assertThat(List.of(ra.statusCode(),rb.statusCode())).containsExactlyInAnyOrder(200,409);
            var read=body(a.get(base()+"/"+id));assertThat(read.path("currentRevision").path("contentHtml").asText()).isEqualTo(ra.statusCode()==200?"A simultaneous":"B simultaneous");
            assertThat(read.path("history")).hasSize(2);assertThat(revisionCount(id)).isEqualTo(2);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND entity_type='RESOURCE_REVISION'",Integer.class,project)).isEqualTo(2);
            System.out.println("AR05_RACE project="+project+" resource="+id+" statuses="+ra.statusCode()+","+rb.statusCode()+" currentRevision="+read.path("currentRevision").path("id")+" count=2");
        }
    }

    @Test void userReadsPlainTextButCannotCreateOrAppendAndRevokedPmCannotSaveOpenRevision()throws Exception{
        var manager=login(pm);var caller=login(worker);var doc=create(manager,"<script>alert('text')</script>");long id=doc.path("id").asLong(),first=doc.path("currentRevision").path("id").asLong();String detail=base()+"/"+id;
        assertThat(caller.get(detail).statusCode()).isEqualTo(200);assertThat(body(caller.get(detail)).path("currentRevision").path("contentHtml").asText()).isEqualTo("<script>alert('text')</script>");
        assertThat(caller.write(base(),Map.of("code","DENIED","name","Denied","resourceType","GUIDE","contentHtml","Denied")).statusCode()).isEqualTo(403);
        assertThat(caller.write(detail+"/revisions",revision(first,"Denied")).statusCode()).isEqualTo(403);
        assertThat(manager.get(detail).statusCode()).isEqualTo(200);
        long version=jdbc.queryForObject("SELECT lock_version FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,project,pm.getId());
        projects.removeMember(project,admin,pm.getId(),version);
        assertThat(manager.write(detail+"/revisions",revision(first,"Revoked draft")).statusCode()).isEqualTo(404);
        assertThat(manager.get(detail).statusCode()).isEqualTo(404);assertThat(revisionCount(id)).isEqualTo(1);
        assertThat(body(caller.get(detail)).path("currentRevision").path("id").asLong()).isEqualTo(first);
        System.out.println("AR05_RIGHTS project="+project+" resource="+id+" USER read200/create403/append403 revokedPM read404/append404 count=1");
    }

    @Test void archivedProjectKeepsHistoryAndRejectsPmAndRegisteredAdminAppends()throws Exception{
        var manager=login(pm);var reader=login(worker);var doc=create(manager,"Archive retained text");long id=doc.path("id").asLong(),first=doc.path("currentRevision").path("id").asLong();String detail=base()+"/"+id;
        var history=jdbc.queryForList("SELECT * FROM resource_revisions WHERE project_id=? AND resource_id=? ORDER BY id",project,id);
        // Only the UUID-owned project's archive flag changes; no lifecycle policy is bypassed in product code.
        assertThat(jdbc.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",project)).isEqualTo(1);
        assertThat(reader.get(detail).statusCode()).isEqualTo(200);assertThat(body(reader.get(detail)).path("history")).hasSize(1);
        assertThat(manager.write(detail+"/revisions",revision(first,"Denied")).statusCode()).isEqualTo(409);
        // Invoke the real transactional service with a registered Admin, without changing that Admin's login credentials.
        var blocked=Assertions.assertThrows(vn.syp.tms.shared.web.BusinessException.class,()->handbook.addRevision(project,admin,id,new HandbookDtos.CreateRevision("Admin denied","INTERNAL",first)));
        assertThat(blocked.status()).isEqualTo(409);assertThat(blocked.code()).isEqualTo("ARCHIVED");
        assertThat(jdbc.queryForList("SELECT * FROM resource_revisions WHERE project_id=? AND resource_id=? ORDER BY id",project,id)).isEqualTo(history);
        System.out.println("AR05_ARCHIVED_PROJECT project="+project+" resource="+id+" historyPreserved=1 PM409 registeredAdminBlocked=true");
    }

    @Test void archivedResourceKeepsOldHistoryWithoutAppending()throws Exception{
        var manager=login(pm);var doc=create(manager,"Resource archive text");long id=doc.path("id").asLong(),first=doc.path("currentRevision").path("id").asLong();String detail=base()+"/"+id;
        assertThat(jdbc.update("UPDATE project_resources SET archived_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",project,id)).isEqualTo(1);
        assertThat(manager.write(detail+"/revisions",revision(first,"Denied")).statusCode()).isEqualTo(409);
        var read=body(manager.get(detail));assertThat(read.path("archived").asBoolean()).isTrue();assertThat(read.path("history")).hasSize(1);assertThat(revisionCount(id)).isEqualTo(1);
        assertThat(read.path("currentRevision").path("contentHtml").asText()).isEqualTo("Resource archive text");
    }

    class Client {
        final HttpClient http=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).connectTimeout(Duration.ofSeconds(10)).build();
        JsonNode csrf()throws Exception{return body(get("/auth/csrf"));}
        HttpResponse<String> get(String path)throws Exception{return send("GET",path,null,null);}
        HttpResponse<String> write(String path,Object data)throws Exception{return send("POST",path,data,csrf());}
        HttpResponse<String> send(String method,String path,Object data,JsonNode csrf)throws Exception{
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1"+path)).timeout(Duration.ofSeconds(30)).header("Content-Type","application/json");
            if(csrf!=null)request.header(csrf.path("headerName").asText(),csrf.path("token").asText());
            request.method(method,data==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(data)));return http.send(request.build(),HttpResponse.BodyHandlers.ofString());
        }
    }
}
