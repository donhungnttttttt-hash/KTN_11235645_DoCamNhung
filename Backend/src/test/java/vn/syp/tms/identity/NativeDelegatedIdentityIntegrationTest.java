package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
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
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import vn.syp.tms.project.*;

/** UUID-owned fixtures only. Existing Admin occupants are read and never changed. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="integration")
class NativeDelegatedIdentityIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){vn.syp.tms.support.CurrentWorkflowDatabaseGuard.configure(r);}
    @Autowired JdbcTemplate jdbc; @Autowired ObjectMapper json; @Autowired MockMvc mvc;
    @Autowired IdentityUserRepository users; @Autowired IdentityService identity; @Autowired PasswordEncoder passwords;
    @Autowired ProjectService projects; @Autowired MembershipRepository memberships;
    @LocalServerPort int port;
    static final String PASSWORD="AR01-synthetic-only-2026!",NEW_PASSWORD="AR01-updated-only-2026!";
    String admin,admin2,tag,hash;List<Map<String,Object>> registryBefore;
    @BeforeEach void fixture(){
        tag="ar01."+UUID.randomUUID().toString().substring(0,8);hash=passwords.encode(PASSWORD);
        assertThat(jdbc.queryForList("SELECT user_id FROM system_admin_registry WHERE slot=1",String.class)).hasSize(1);
        // Only fill the authorized empty second slot. Never replace an existing occupant.
        if(jdbc.queryForList("SELECT user_id FROM system_admin_registry WHERE slot=2",String.class).isEmpty()){
            var owned=account("admin2","ADMIN");jdbc.update("INSERT INTO system_admin_registry(slot,user_id) VALUES(2,?)",owned.getId());
        }
        registryBefore=jdbc.queryForList("SELECT * FROM system_admin_registry ORDER BY slot");
        assertThat(registryBefore).as("prepared target must already contain two registered Admins").hasSize(2);
        admin=registryBefore.get(0).get("user_id").toString();admin2=registryBefore.get(1).get("user_id").toString();
        System.out.println("AR01_REGISTRY preserved="+registryBefore);
    }
    @AfterEach void registryPreserved(){if(registryBefore!=null)assertThat(jdbc.queryForList("SELECT * FROM system_admin_registry ORDER BY slot")).isEqualTo(registryBefore);}
    IdentityUser account(String suffix,String role){return users.saveAndFlush(new IdentityUser(tag+"."+suffix,suffix,hash,role));}
    JsonNode adminWrite(String method,String path,Object data,int expected)throws Exception{
        var a=identity.current(admin);var auth=new UsernamePasswordAuthenticationToken(new SessionPrincipal(admin,a.getVersion()),null,identity.authorities(a));
        var result=mvc.perform(request(org.springframework.http.HttpMethod.valueOf(method),"/api/v1"+path).with(authentication(auth)).with(csrf()).contentType("application/json").content(json.writeValueAsBytes(data))).andReturn().getResponse();
        assertThat(result.getStatus()).as(method+" "+path).isEqualTo(expected);return json.readTree(result.getContentAsString());
    }
    JsonNode adminGet(String path,int expected)throws Exception{
        var a=identity.current(admin);var auth=new UsernamePasswordAuthenticationToken(new SessionPrincipal(admin,a.getVersion()),null,identity.authorities(a));
        var result=mvc.perform(get("/api/v1"+path).with(authentication(auth))).andReturn().getResponse();
        assertThat(result.getStatus()).isEqualTo(expected);return json.readTree(result.getContentAsString());
    }
    Map<String,Object> input(String username){return new LinkedHashMap<>(Map.of("username",username,"displayName","AR01 owned account","password",PASSWORD,"isProjectAdmin",false,"isGuest",false));}
    long audit(String id,String event){return jdbc.queryForObject("SELECT COUNT(*) FROM identity_audit WHERE subject_id=? AND event_code=?",Long.class,id,event);}
    long project(String suffix){return projects.create(admin,new ProjectDtos.CreateProject("A"+UUID.randomUUID().toString().substring(0,8),tag+suffix,"","UTC")).id();}

    @Test void committedGrantCreateRevokeTimelineNormalizesAndRejectsWithoutExtraAudit()throws Exception{
        var pm=account("pm","PM");var old=loggedIn(pm);var grant=adminWrite("PATCH","/users/"+pm.getId(),Map.of("canCreateUsers",true,"expectedVersion",0),200);
        assertThat(old.get("/me").statusCode()).isEqualTo(401);
        var caller=loggedIn(pm);String name=tag+".CREATED";long before=users.count();long beforeCreatedAudit=jdbc.queryForObject("SELECT COUNT(*) FROM identity_audit WHERE event_code='USER_CREATED'",Long.class);
        for(String flag:List.of("isProjectAdmin","isGuest")){var denied=input(tag+flag);denied.put(flag,true);assertThat(caller.write("POST","/users",denied).statusCode()).isEqualTo(403);}
        for(String legacy:List.of("ADMIN","PM","DEV","TESTER","USER")){var denied=input(tag+legacy);denied.put("role",legacy);assertThat(caller.write("POST","/users",denied).statusCode()).isEqualTo(422);}
        assertThat(caller.send("POST","/users",input(name),null).statusCode()).isEqualTo(403);
        var created=caller.write("POST","/users",input(name));assertThat(created.statusCode()).isEqualTo(201);String id=body(created).path("id").asText();
        assertThat(body(created).path("username").asText()).isEqualTo(name.toLowerCase(Locale.ROOT));assertThat(body(created).path("role").asText()).isEqualTo("USER");
        assertThat(caller.write("POST","/users",input(name.toLowerCase(Locale.ROOT))).statusCode()).isEqualTo(409);
        assertThat(users.count()).isEqualTo(before+1);assertThat(audit(id,"USER_CREATED")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM identity_audit WHERE event_code='USER_CREATED'",Long.class)).isEqualTo(beforeCreatedAudit+1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=?",Long.class,id)).isZero();
        // PATCH returns only after its transaction commits; the create request starts after this read-back.
        adminWrite("PATCH","/users/"+pm.getId(),Map.of("canCreateUsers",false,"expectedVersion",grant.path("version").asLong()),200);
        assertThat(users.findById(pm.getId()).orElseThrow().isCanCreateUsers()).isFalse();
        assertThat(caller.write("POST","/users",input(tag+".old-cookie")).statusCode()).isEqualTo(401);
        var denied=loggedIn(pm);assertThat(body(denied.get("/me")).path("permissions").toString()).doesNotContain("users:create");
        assertThat(denied.write("POST","/users",input(tag+".after-revoke")).statusCode()).isEqualTo(403);
        assertThat(users.count()).isEqualTo(before+1);assertThat(audit(id,"USER_CREATED")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM identity_audit WHERE event_code='USER_CREATED'",Long.class)).isEqualTo(beforeCreatedAudit+1);
        assertThat(audit(pm.getId(),"CREATE_USERS_GRANTED")).isEqualTo(1);assertThat(audit(pm.getId(),"CREATE_USERS_REVOKED")).isEqualTo(1);
        System.out.println("AR01_TIMELINE grant-committed -> relogin -> USER-created -> revoke-committed/read-back -> old-cookie401 -> relogin403; pm="+pm.getId()+" user="+id);
    }

    @Test void pmAddsExistingUserWithoutAccountCreationGrantAndGuestCannotMutate()throws Exception{
        long p=project("members");var pm=account("pm","PM");var user=account("user","USER");var guest=account("guest","GUEST");
        projects.addOrUpdateMember(p,admin,pm.getId(),new ProjectDtos.SetMember("PM"));
        var manager=loggedIn(pm);assertThat(manager.write("PUT","/projects/"+p+"/members/"+user.getId(),Map.of("projectRole","USER")).statusCode()).isEqualTo(200);
        assertThat(manager.write("PUT","/projects/"+p+"/members/"+guest.getId(),Map.of("projectRole","GUEST")).statusCode()).isEqualTo(403);
        assertThat(manager.write("POST","/users",input(tag+".denied")).statusCode()).isEqualTo(403);
        projects.addOrUpdateMember(p,admin,guest.getId(),new ProjectDtos.SetMember("GUEST"));var visitor=loggedIn(guest);
        assertThat(visitor.write("PUT","/projects/"+p+"/members/"+user.getId(),Map.of("projectRole","USER","expectedVersion",0)).statusCode()).isEqualTo(403);
        projects.addOrUpdateMember(p,admin,admin2,new ProjectDtos.SetMember("PM"));assertThat(identity.current(admin2).getRole()).isEqualTo("ADMIN");
    }

    @Test void candidatesExcludeCurrentActiveMembersBeforeCountButKeepOtherProjectAndInactiveDefault()throws Exception{
        long p=project("current"),other=project("other");var pm=account("pm","PM");projects.addOrUpdateMember(p,admin,pm.getId(),new ProjectDtos.SetMember("PM"));
        var active=account("active","USER");var elsewhere=account("elsewhere","USER");var inactive=account("inactive","USER");
        projects.addOrUpdateMember(p,admin,active.getId(),new ProjectDtos.SetMember("USER"));projects.addOrUpdateMember(other,admin,elsewhere.getId(),new ProjectDtos.SetMember("USER"));
        var old=memberships.saveAndFlush(new ProjectMembership(p,inactive.getId(),"USER"));jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",old.getId());
        var caller=loggedIn(pm);var actual=new HashSet<String>();
        for(int page=0;page<2;page++){var response=caller.get("/projects/"+p+"/member-candidates?keyword="+tag+"&size=1&page="+page);assertThat(response.statusCode()).isEqualTo(200);var data=body(response);assertThat(data.path("totalElements").asInt()).isEqualTo(2);data.path("items").forEach(i->actual.add(i.path("id").asText()));}
        assertThat(actual).containsExactlyInAnyOrder(elsewhere.getId(),inactive.getId());
        assertThat(adminGet("/admin/users?keyword="+tag+"&enabled=true&excludeProjectId="+p+"&size=1",200).path("totalElements").asInt()).isEqualTo(2);
        assertThat(caller.write("PUT","/projects/"+p+"/members/"+inactive.getId(),Map.of("projectRole","USER","expectedVersion",0)).statusCode()).isEqualTo(200);
    }

    @Test void concurrentMembershipReplayCreatesOneRowAndOneAudit()throws Exception{
        long p=project("concurrent");var pm=account("pm","PM");var target=account("target","USER");projects.addOrUpdateMember(p,admin,pm.getId(),new ProjectDtos.SetMember("PM"));
        var a=loggedIn(pm);var b=loggedIn(pm);var csrfA=a.csrf();var csrfB=b.csrf();String path="/projects/"+p+"/members/"+target.getId();
        long before=jdbc.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=?",Long.class,p);
        try(var executor=Executors.newFixedThreadPool(2)){var gate=new CountDownLatch(1);var fa=executor.submit(()->{gate.await();return a.send("PUT",path,Map.of("projectRole","USER"),csrfA);});var fb=executor.submit(()->{gate.await();return b.send("PUT",path,Map.of("projectRole","USER"),csrfB);});gate.countDown();assertThat(List.of(fa.get(30,TimeUnit.SECONDS).statusCode(),fb.get(30,TimeUnit.SECONDS).statusCode())).containsExactlyInAnyOrder(200,422);}
        assertThat(a.write("PUT",path,Map.of("projectRole","USER","expectedVersion",0)).statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,target.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=?",Long.class,p)).isEqualTo(before+1);
    }

    @Test void adminProfileAndPasswordChangesPreserveOwnedMembershipAndExpireSessions()throws Exception{
        long p=project("profile");var target=account("profile","USER");projects.addOrUpdateMember(p,admin,target.getId(),new ProjectDtos.SetMember("USER"));
        jdbc.update("INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(?,?,'MEMBERSHIP',?,'AR01_OWNED_HISTORY',UTC_TIMESTAMP(6))",p,target.getId(),memberships.findByProjectIdAndUserId(p,target.getId()).getId());
        var history=jdbc.queryForList("SELECT * FROM project_audit WHERE project_id=?",p);
        var membership=jdbc.queryForList("SELECT * FROM project_memberships WHERE user_id=?",target.getId());var first=loggedIn(target);var second=loggedIn(target);String renamed=tag+".RENAMED";
        var result=adminWrite("PATCH","/users/"+target.getId(),Map.of("username",renamed,"displayName","  Updated owned profile  ","expectedVersion",0),200);
        assertThat(result.path("id").asText()).isEqualTo(target.getId());assertThat(result.path("username").asText()).isEqualTo(renamed.toLowerCase(Locale.ROOT));assertThat(result.path("displayName").asText()).isEqualTo("Updated owned profile");
        assertThat(first.get("/me").statusCode()).isEqualTo(401);assertThat(second.get("/me").statusCode()).isEqualTo(401);
        var fresh=new Client();assertThat(fresh.login(renamed,PASSWORD).statusCode()).isEqualTo(200);
        adminWrite("PUT","/users/"+target.getId()+"/password",Map.of("newPassword",NEW_PASSWORD,"expectedVersion",result.path("version").asLong()),200);
        assertThat(fresh.get("/me").statusCode()).isEqualTo(401);assertThat(new Client().login(renamed,PASSWORD).statusCode()).isEqualTo(401);assertThat(new Client().login(renamed,NEW_PASSWORD).statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForList("SELECT * FROM project_memberships WHERE user_id=?",target.getId())).isEqualTo(membership);
        assertThat(jdbc.queryForList("SELECT * FROM project_audit WHERE project_id=?",p)).isEqualTo(history);
        assertThat(audit(target.getId(),"USER_PROFILE_UPDATED")).isEqualTo(1);assertThat(audit(target.getId(),"USER_PASSWORD_RESET")).isEqualTo(1);
        assertThat(jdbc.queryForList("SELECT * FROM identity_audit WHERE subject_id=?",target.getId()).toString()).doesNotContain(PASSWORD,NEW_PASSWORD);
    }

    @Test void incompatibleInactiveLegacyMembershipIsNotOfferedOrRestored()throws Exception{
        long p=project("legacy");var pm=account("pm","PM");var legacy=account("legacy","USER");projects.addOrUpdateMember(p,admin,pm.getId(),new ProjectDtos.SetMember("PM"));
        var m=memberships.saveAndFlush(new ProjectMembership(p,legacy.getId(),"MEMBER"));jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",m.getId());
        var manager=loggedIn(pm);var page=manager.get("/projects/"+p+"/member-candidates?keyword="+legacy.getUsername());assertThat(page.statusCode()).isEqualTo(200);assertThat(body(page).path("totalElements").asInt()).isZero();
        assertThat(adminGet("/admin/users?enabled=true&excludeProjectId="+p+"&keyword="+legacy.getUsername(),200).path("totalElements").asInt()).isZero();
        var lookup=manager.get("/projects/"+p+"/member-candidate?username="+legacy.getUsername());assertThat(lookup.statusCode()).isEqualTo(422);assertThat(body(lookup).path("code").asText()).isEqualTo("INCOMPATIBLE_MEMBERSHIP");
        assertThat(adminGet("/projects/"+p+"/member-candidate?username="+legacy.getUsername(),422).path("code").asText()).isEqualTo("INCOMPATIBLE_MEMBERSHIP");
        assertThat(manager.write("PUT","/projects/"+p+"/members/"+legacy.getId(),Map.of("projectRole","USER","expectedVersion",0)).statusCode()).isEqualTo(422);
        assertThat(jdbc.queryForObject("SELECT project_role FROM project_memberships WHERE id=?",String.class,m.getId())).isEqualTo("MEMBER");
        assertThat(jdbc.queryForObject("SELECT active FROM project_memberships WHERE id=?",Boolean.class,m.getId())).isFalse();
    }
    JsonNode body(HttpResponse<String> response)throws Exception{return json.readTree(response.body());}
    Client loggedIn(IdentityUser user)throws Exception{var c=new Client();assertThat(c.login(user.getUsername(),PASSWORD).statusCode()).isEqualTo(200);return c;}
    class Client {
        final HttpClient http=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).connectTimeout(Duration.ofSeconds(10)).build();
        JsonNode csrf()throws Exception{return body(get("/auth/csrf"));}
        HttpResponse<String> get(String path)throws Exception{return send("GET",path,null,null);}
        HttpResponse<String> login(String username,String password)throws Exception{return write("POST","/auth/login",Map.of("username",username,"password",password));}
        HttpResponse<String> write(String method,String path,Object data)throws Exception{return send(method,path,data,csrf());}
        HttpResponse<String> send(String method,String path,Object data,JsonNode csrf)throws Exception{
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1"+path)).timeout(Duration.ofSeconds(30)).header("Content-Type","application/json");
            if(csrf!=null)request.header(csrf.path("headerName").asText(),csrf.path("token").asText());
            request.method(method,data==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(data)));return http.send(request.build(),HttpResponse.BodyHandlers.ofString());
        }
    }
}
