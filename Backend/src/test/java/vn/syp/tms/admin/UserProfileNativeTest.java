package vn.syp.tms.admin;

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

/** Real HTTP/cookie checks, restricted to a separately provisioned disposable schema. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named="TMS_TEST_USERS_URL", matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+")
class UserProfileNativeTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        String url=System.getenv("TMS_TEST_USERS_URL");
        if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+"))throw new IllegalStateException("Dedicated user-profile test schema required");
        r.add("TMS_DB_URL",()->url);
        r.add("TMS_DB_USER",()->System.getenv("TMS_TEST_USERS_USER"));
        r.add("TMS_DB_PASSWORD",()->System.getenv("TMS_TEST_USERS_PASSWORD"));
        r.add("TMS_MIGRATION_USER",()->System.getenv("TMS_TEST_USERS_USER"));
        r.add("TMS_MIGRATION_PASSWORD",()->System.getenv("TMS_TEST_USERS_PASSWORD"));
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");
        r.add("TMS_CHATGPT_LOCAL_ENABLED",()->"false");r.add("TMS_OLLAMA_ENABLED",()->"false");r.add("TMS_OPENAI_ENABLED",()->"false");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("TMS_AI_DRAFT_CLEANUP_CRON",()->"-");r.add("TMS_AI_CHAT_CLEANUP_CRON",()->"-");
    }
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired IdentityUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired JdbcTemplate jdbc;
    @Autowired ProjectService projects;
    IdentityUser admin,target;
    static final String PASSWORD="Profile-fixture-only-2026!";
    static final String NEW_PASSWORD="Updated-fixture-only-2026!";

    @BeforeEach void fixture() {
        // Isolate the shared HTTP test client's rate bucket in this guarded test schema only.
        jdbc.update("DELETE FROM identity_login_buckets WHERE bucket_key=SHA2('ip|127.0.0.1',256)");
        String suffix=UUID.randomUUID().toString().substring(0,8);
        String hash=passwords.encode(PASSWORD);
        admin=users.saveAndFlush(new IdentityUser("profile.admin."+suffix,"Admin profile",hash,"ADMIN"));
        target=users.saveAndFlush(new IdentityUser("profile.tester."+suffix,"Tester original",hash,"TESTER"));
    }
    @Test void profileUpdatePreservesIdentityAndAssignmentsAndRevokesAllOldSessions() throws Exception {
        long project=projects.create(admin.getId(),new ProjectDtos.CreateProject("UP"+UUID.randomUUID().toString().substring(0,8),"Profile test","","UTC")).id();
        projects.addOrUpdateMember(project,admin.getId(),target.getId(),new ProjectDtos.SetMember("TESTER"));
        var memberships=jdbc.queryForList("SELECT * FROM project_memberships WHERE user_id=?",target.getId());
        String oldHash=target.getPasswordHash();
        var owner=loggedIn(admin);var first=loggedIn(target);var second=loggedIn(target);
        String username="RENAMED."+UUID.randomUUID().toString().substring(0,8);
        var response=owner.write("PATCH",path(target),Map.of("username",username,"displayName","  Tên đã sửa  ","expectedVersion",0));
        assertThat(response.statusCode()).isEqualTo(200);
        var body=body(response);
        assertThat(body.path("id").asText()).isEqualTo(target.getId());
        assertThat(body.path("username").asText()).isEqualTo(username.toLowerCase(Locale.ROOT));
        assertThat(body.path("displayName").asText()).isEqualTo("Tên đã sửa");
        assertThat(body.path("role").asText()).isEqualTo("TESTER");
        assertThat(jdbc.queryForList("SELECT * FROM project_memberships WHERE user_id=?",target.getId())).isEqualTo(memberships);
        assertThat(saved(target).getPasswordHash()).isEqualTo(oldHash);
        assertThat(first.get("/me").statusCode()).isEqualTo(401);
        assertThat(second.get("/me").statusCode()).isEqualTo(401);
        assertThat(new Client().login(target.getUsername(),PASSWORD).statusCode()).isEqualTo(401);
        assertThat(new Client().login(username,PASSWORD).statusCode()).isEqualTo(200);
        assertThat(audits(target,"USER_PROFILE_UPDATED")).isEqualTo(1);
        assertThat(response.body()).doesNotContain(oldHash,"passwordHash",PASSWORD);
    }
    @Test void memberCandidatesExcludeOnlyCurrentActiveMembershipBeforePagination() throws Exception {
        String tag="candidate."+UUID.randomUUID().toString().substring(0,8);
        long current=projects.create(admin.getId(),new ProjectDtos.CreateProject("CA"+tag.substring(10),"Current project","","UTC")).id();
        long other=projects.create(admin.getId(),new ProjectDtos.CreateProject("CB"+tag.substring(10),"Other project","","UTC")).id();
        var accounts=new ArrayList<IdentityUser>();
        for(String name:List.of("current","other","removed","free","disabled")) {
            var account=new IdentityUser(tag+"."+name,name,target.getPasswordHash(),"TESTER");
            if(name.equals("disabled"))account.setEnabled(false);
            accounts.add(users.saveAndFlush(account));
        }
        projects.addOrUpdateMember(current,admin.getId(),accounts.get(0).getId(),new ProjectDtos.SetMember("TESTER"));
        projects.addOrUpdateMember(other,admin.getId(),accounts.get(0).getId(),new ProjectDtos.SetMember("TESTER"));
        projects.addOrUpdateMember(other,admin.getId(),accounts.get(1).getId(),new ProjectDtos.SetMember("TESTER"));
        projects.addOrUpdateMember(current,admin.getId(),accounts.get(2).getId(),new ProjectDtos.SetMember("TESTER"));
        jdbc.update("UPDATE project_memberships SET active=FALSE WHERE project_id=? AND user_id=?",current,accounts.get(2).getId());
        var owner=loggedIn(admin);
        String query="/admin/users?keyword="+tag+"&enabled=true&excludeProjectId="+current;
        var ids=new HashSet<String>();
        for(int page=0;page<3;page++) {
            var response=owner.get(query+"&size=1&page="+page);
            assertThat(response.statusCode()).isEqualTo(200);
            var data=body(response);
            assertThat(data.path("totalElements").asInt()).isEqualTo(3);
            assertThat(data.path("items").size()).isEqualTo(1);
            ids.add(data.path("items").get(0).path("id").asText());
        }
        assertThat(ids).containsExactlyInAnyOrder(accounts.get(1).getId(),accounts.get(2).getId(),accounts.get(3).getId());
        assertThat(body(owner.get(query+"&hasProject=true")).path("totalElements").asInt()).isEqualTo(1);
        assertThat(body(owner.get(query+"&hasProject=false")).path("totalElements").asInt()).isEqualTo(2);
        assertThat(body(owner.get("/admin/users?keyword="+tag+"&enabled=true")).path("totalElements").asInt()).isEqualTo(4);
        assertThat(owner.get("/admin/users?excludeProjectId=-1").statusCode()).isEqualTo(422);
        assertThat(owner.get("/admin/users?excludeProjectId=9223372036854775807").statusCode()).isEqualTo(404);
        assertThat(loggedIn(target).get(query).statusCode()).isEqualTo(403);
    }
    @Test void nameOnlySelfEditExpiresOwnSessionAndNewLoginShowsSavedName() throws Exception {
        var owner=loggedIn(admin);
        assertThat(owner.write("PATCH",path(admin),Map.of("displayName","Admin renamed","expectedVersion",0)).statusCode()).isEqualTo(200);
        assertThat(owner.get("/me").statusCode()).isEqualTo(401);
        var login=new Client().login(admin.getUsername(),PASSWORD);
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(body(login).path("displayName").asText()).isEqualTo("Admin renamed");
    }
    @Test void memberEndpointsCannotAssignOrChangeAccountRoles() throws Exception {
        long project=projects.create(admin.getId(),new ProjectDtos.CreateProject("FX"+UUID.randomUUID().toString().substring(0,8),"Fixed roles","","UTC")).id();
        var owner=loggedIn(admin);
        String path="/admin/projects/"+project+"/members/"+target.getId();
        assertThat(owner.write("PUT",path,Map.of("projectRole","PM")).statusCode()).isEqualTo(422);
        var candidate=owner.get("/projects/"+project+"/member-candidate?username="+target.getUsername());
        assertThat(candidate.statusCode()).isEqualTo(200);
        assertThat(body(candidate).path("projectRole").asText()).isEqualTo("TESTER");
        assertThat(owner.write("PUT",path,Map.of("projectRole","TESTER")).statusCode()).isEqualTo(200);
        var before=jdbc.queryForList("SELECT * FROM project_memberships WHERE project_id=? AND user_id=?",project,target.getId());
        assertThat(owner.write("PUT",path,Map.of("projectRole","PM","expectedVersion",0)).statusCode()).isEqualTo(422);
        assertThat(owner.write("PUT","/projects/"+project+"/members/"+target.getId(),Map.of("projectRole","MEMBER","expectedVersion",0)).statusCode()).isEqualTo(422);
        assertThat(jdbc.queryForList("SELECT * FROM project_memberships WHERE project_id=? AND user_id=?",project,target.getId())).isEqualTo(before);
    }
    @Test void pmCanAddOnlyDevAndTesterToOwnProjectWhileAdminCanAddAdminAsPm() throws Exception {
        String tag=UUID.randomUUID().toString().substring(0,8);
        long project=projects.create(admin.getId(),new ProjectDtos.CreateProject("PM"+tag,"PM members","","UTC")).id();
        long other=projects.create(admin.getId(),new ProjectDtos.CreateProject("OT"+tag,"Other","","UTC")).id();
        var pm=users.saveAndFlush(new IdentityUser("manager."+tag,"Manager",target.getPasswordHash(),"PM"));
        var dev=users.saveAndFlush(new IdentityUser("worker."+tag,"Developer",target.getPasswordHash(),"DEV"));
        var secondPm=users.saveAndFlush(new IdentityUser("second."+tag,"Second PM",target.getPasswordHash(),"PM"));
        var secondAdmin=users.saveAndFlush(new IdentityUser("root."+tag,"Second admin",target.getPasswordHash(),"ADMIN"));
        projects.addOrUpdateMember(project,admin.getId(),pm.getId(),new ProjectDtos.SetMember("PM"));
        projects.addOrUpdateMember(other,admin.getId(),dev.getId(),new ProjectDtos.SetMember("DEV"));
        var manager=loggedIn(pm);
        var candidates=manager.get("/projects/"+project+"/member-candidates?keyword="+tag);
        assertThat(candidates.statusCode()).isEqualTo(200);
        assertThat(body(candidates).path("totalElements").asInt()).isEqualTo(1);
        assertThat(body(candidates).path("items").get(0).path("id").asText()).isEqualTo(dev.getId());
        assertThat(body(candidates).path("items").get(0).has("memberships")).isFalse();
        assertThat(body(candidates).path("items").get(0).path("hasProject").asBoolean()).isTrue();
        assertThat(manager.write("PUT","/projects/"+project+"/members/"+dev.getId(),Map.of("projectRole","DEV")).statusCode()).isEqualTo(200);
        assertThat(manager.write("PUT","/projects/"+project+"/members/"+target.getId(),Map.of("projectRole","TESTER")).statusCode()).isEqualTo(200);
        assertThat(manager.write("PUT","/projects/"+project+"/members/"+secondPm.getId(),Map.of("projectRole","PM")).statusCode()).isEqualTo(403);
        assertThat(manager.write("PUT","/projects/"+project+"/members/"+secondAdmin.getId(),Map.of("projectRole","PM")).statusCode()).isEqualTo(403);
        assertThat(manager.get("/projects/"+project+"/member-candidate?username="+secondAdmin.getUsername()).statusCode()).isEqualTo(403);
        assertThat(manager.get("/projects/"+other+"/member-candidates").statusCode()).isIn(403,404);
        assertThat(manager.write("PUT","/projects/"+other+"/members/"+dev.getId(),Map.of("projectRole","DEV")).statusCode()).isIn(403,404);
        assertThat(manager.get("/admin/users").statusCode()).isEqualTo(403);
        assertThat(loggedIn(dev).get("/projects/"+project+"/member-candidates").statusCode()).isEqualTo(403);
        assertThat(body(manager.get("/projects/"+project+"/member-candidates?keyword="+tag)).path("totalElements").asInt()).isZero();
        assertThat(loggedIn(admin).write("PUT","/admin/projects/"+project+"/members/"+secondAdmin.getId(),Map.of("projectRole","PM")).statusCode()).isEqualTo(200);
        assertThat(saved(secondAdmin).getRole()).isEqualTo("ADMIN");
        assertThat(loggedIn(secondAdmin).get("/admin/users?size=1").statusCode()).isEqualTo(200);
    }
    @Test void resetPasswordChangesOnlyHashAndVersionAndRevokesEverySession() throws Exception {
        var owner=loggedIn(admin);var first=loggedIn(target);var second=loggedIn(target);
        var response=owner.write("PUT",path(target)+"/password",Map.of("newPassword",NEW_PASSWORD,"expectedVersion",0));
        assertThat(response.statusCode()).isEqualTo(200);
        IdentityUser saved=saved(target);
        assertThat(saved.getUsername()).isEqualTo(target.getUsername());
        assertThat(saved.getDisplayName()).isEqualTo(target.getDisplayName());
        assertThat(saved.getRole()).isEqualTo("TESTER");
        assertThat(saved.isCanCreateUsers()).isFalse();
        assertThat(passwords.matches(NEW_PASSWORD,saved.getPasswordHash())).isTrue();
        assertThat(passwords.matches(PASSWORD,saved.getPasswordHash())).isFalse();
        assertThat(response.body()).doesNotContain(NEW_PASSWORD,PASSWORD,"passwordHash",saved.getPasswordHash());
        assertThat(first.get("/me").statusCode()).isEqualTo(401);
        assertThat(second.get("/me").statusCode()).isEqualTo(401);
        assertThat(new Client().login(target.getUsername(),PASSWORD).statusCode()).isEqualTo(401);
        assertThat(new Client().login(target.getUsername(),NEW_PASSWORD).statusCode()).isEqualTo(200);
        assertThat(audits(target,"USER_PASSWORD_RESET")).isEqualTo(1);
        assertThat(jdbc.queryForList("SELECT * FROM identity_audit WHERE subject_id=?",target.getId()).toString()).doesNotContain(PASSWORD,NEW_PASSWORD);
    }
    @Test void selfPasswordResetCannotKeepAnAuthenticatedOldCookie() throws Exception {
        var owner=loggedIn(admin);
        assertThat(owner.write("PUT",path(admin)+"/password",Map.of("newPassword",NEW_PASSWORD,"expectedVersion",0)).statusCode()).isEqualTo(200);
        assertThat(owner.get("/me").statusCode()).isEqualTo(401);
        assertThat(new Client().login(admin.getUsername(),PASSWORD).statusCode()).isEqualTo(401);
        assertThat(new Client().login(admin.getUsername(),NEW_PASSWORD).statusCode()).isEqualTo(200);
    }
    @Test void normalizedNoOpKeepsSessionsButStaleRequestDoesNotOverwrite() throws Exception {
        var owner=loggedIn(admin);var tester=loggedIn(target);
        var noop=owner.write("PATCH",path(target),Map.of("username",target.getUsername().toUpperCase(Locale.ROOT),"displayName","  "+target.getDisplayName()+"  ","expectedVersion",0));
        assertThat(noop.statusCode()).isEqualTo(200);
        assertThat(body(noop).path("version").asLong()).isZero();
        assertThat(tester.get("/me").statusCode()).isEqualTo(200);
        assertThat(audits(target,"USER_PROFILE_UPDATED")).isZero();
        assertThat(owner.write("PATCH",path(target),Map.of("displayName","Latest","expectedVersion",0)).statusCode()).isEqualTo(200);
        assertThat(owner.write("PUT",path(target)+"/password",Map.of("newPassword",NEW_PASSWORD,"expectedVersion",0)).statusCode()).isEqualTo(409);
        assertThat(owner.write("PATCH",path(target),Map.of("displayName","Stale","expectedVersion",0)).statusCode()).isEqualTo(409);
        assertThat(saved(target).getDisplayName()).isEqualTo("Latest");
        assertThat(passwords.matches(PASSWORD,saved(target).getPasswordHash())).isTrue();
    }
    @Test void rejectsDuplicatesInvalidInputAndPrivilegeFieldsWithoutPartialChanges() throws Exception {
        var owner=loggedIn(admin);var tester=loggedIn(target);
        var duplicate=owner.write("PATCH",path(target),Map.of("username",admin.getUsername().toUpperCase(Locale.ROOT),"displayName","Do not save","expectedVersion",0));
        assertThat(duplicate.statusCode()).isEqualTo(409);
        assertThat(body(duplicate).path("code").asText()).isEqualTo("USERNAME_EXISTS");
        for(var fields:List.of(Map.of("username","bad space"),Map.of("displayName","   "),Map.of("displayName","a".repeat(101)))) {
            var input=new HashMap<String,Object>(fields);input.put("expectedVersion",0);
            assertThat(owner.write("PATCH",path(target),input).statusCode()).isEqualTo(422);
        }
        String secret="short";
        var invalid=owner.write("PUT",path(target)+"/password",Map.of("newPassword",secret,"expectedVersion",0));
        assertThat(invalid.statusCode()).isEqualTo(422);
        assertThat(invalid.body()).doesNotContain(secret);
        assertThat(saved(target).getVersion()).isZero();
        assertThat(saved(target).getDisplayName()).isEqualTo(target.getDisplayName());
        assertThat(tester.get("/me").statusCode()).isEqualTo(200);
        assertThat(audits(target,"USER_PROFILE_UPDATED")).isZero();
        assertThat(audits(target,"USER_PASSWORD_RESET")).isZero();
        var injected=owner.write("PUT",path(target)+"/password",Map.of("newPassword",NEW_PASSWORD,"expectedVersion",0,"role","ADMIN","canCreateUsers",true));
        assertThat(injected.statusCode()).isIn(200,400,422);
        assertThat(saved(target).getRole()).isEqualTo("TESTER");
        assertThat(saved(target).isCanCreateUsers()).isFalse();
    }
    @Test void requiresAdminAndCsrfForBothMutations() throws Exception {
        var owner=loggedIn(admin);
        assertThat(owner.send("PATCH",path(target),Map.of("displayName","Denied","expectedVersion",0),null).statusCode()).isEqualTo(403);
        assertThat(owner.send("PUT",path(target)+"/password",Map.of("newPassword",NEW_PASSWORD,"expectedVersion",0),null).statusCode()).isEqualTo(403);
        for(String role:List.of("PM","TESTER","DEV")) {
            var account=users.saveAndFlush(new IdentityUser("denied."+UUID.randomUUID().toString().substring(0,8),role,target.getPasswordHash(),role));
            if(role.equals("PM")){account.setCanCreateUsers(true);account=users.saveAndFlush(account);}
            var caller=loggedIn(account);
            assertThat(caller.write("PATCH",path(target),Map.of("displayName","Denied","expectedVersion",0)).statusCode()).isEqualTo(403);
            assertThat(caller.write("PUT",path(target)+"/password",Map.of("newPassword",NEW_PASSWORD,"expectedVersion",0)).statusCode()).isEqualTo(403);
        }
        assertThat(new Client().write("PUT",path(target)+"/password",Map.of("newPassword",NEW_PASSWORD,"expectedVersion",0)).statusCode()).isEqualTo(401);
        assertThat(saved(target).getVersion()).isZero();
    }
    @Test void concurrentDuplicateUsernameRollsBackTheLosingUpdateAndAudit() throws Exception {
        var other=users.saveAndFlush(new IdentityUser("other."+UUID.randomUUID().toString().substring(0,8),"Other original",target.getPasswordHash(),"TESTER"));
        var a=loggedIn(admin);var b=loggedIn(admin);var sessionA=loggedIn(target);var sessionB=loggedIn(other);
        JsonNode csrfA=a.csrf(),csrfB=b.csrf();
        String username="shared."+UUID.randomUUID().toString().substring(0,8);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var gate=new CountDownLatch(1);
            var fa=executor.submit(()->{gate.await();return a.send("PATCH",path(target),Map.of("username",username,"displayName","Winner A","expectedVersion",0),csrfA);});
            var fb=executor.submit(()->{gate.await();return b.send("PATCH",path(other),Map.of("username",username,"displayName","Winner B","expectedVersion",0),csrfB);});
            gate.countDown();
            var ra=fa.get(30,TimeUnit.SECONDS);var rb=fb.get(30,TimeUnit.SECONDS);
            assertThat(List.of(ra.statusCode(),rb.statusCode())).containsExactlyInAnyOrder(200,409);
            boolean aWon=ra.statusCode()==200;
            var loser=aWon?other:target;
            assertThat(saved(loser).getUsername()).isEqualTo(loser.getUsername());
            assertThat(saved(loser).getDisplayName()).isEqualTo(loser.getDisplayName());
            assertThat(saved(loser).getVersion()).isZero();
            assertThat(audits(loser,"USER_PROFILE_UPDATED")).isZero();
            assertThat((aWon?sessionB:sessionA).get("/me").statusCode()).isEqualTo(200);
            assertThat(body(aWon?rb:ra).path("code").asText()).isEqualTo("USERNAME_EXISTS");
        }
    }
    IdentityUser saved(IdentityUser user){return users.findById(Objects.requireNonNull(user.getId())).orElseThrow();}
    long audits(IdentityUser user,String event){return Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM identity_audit WHERE subject_id=? AND event_code=?",Long.class,user.getId(),event));}
    String path(IdentityUser user){return "/users/"+user.getId();}
    Client loggedIn(IdentityUser user) throws Exception {var client=new Client();assertThat(client.login(user.getUsername(),PASSWORD).statusCode()).isEqualTo(200);return client;}
    JsonNode body(HttpResponse<String> response)throws Exception{return json.readTree(response.body());}
    class Client {
        final HttpClient http=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).connectTimeout(Duration.ofSeconds(10)).build();
        JsonNode csrf()throws Exception{return body(get("/auth/csrf"));}
        HttpResponse<String> get(String path)throws Exception{return send("GET",path,null,null);}
        HttpResponse<String> login(String username,String password)throws Exception{return write("POST","/auth/login",Map.of("username",username,"password",password));}
        HttpResponse<String> write(String method,String path,Object input)throws Exception{return send(method,path,input,csrf());}
        HttpResponse<String> send(String method,String path,Object input,JsonNode csrf)throws Exception{
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1"+path)).timeout(Duration.ofSeconds(30)).header("Content-Type","application/json");
            if(csrf!=null)request.header(csrf.path("headerName").asText(),csrf.path("token").asText());
            request.method(method,input==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input)));
            return http.send(request.build(),HttpResponse.BodyHandlers.ofString());
        }
    }
}
