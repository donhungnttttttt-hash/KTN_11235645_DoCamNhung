package vn.syp.tms.support;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named="TMS_TEST_USERS_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+")
public abstract class UnifiedAccessFixtures {
    @DynamicPropertySource public static void database(DynamicPropertyRegistry r){
        String url=System.getenv("TMS_TEST_USERS_URL");
        if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+"))throw new IllegalStateException("Dedicated test schema required");
        r.add("TMS_DB_URL",()->url);r.add("TMS_DB_USER",()->System.getenv("TMS_TEST_USERS_USER"));r.add("TMS_DB_PASSWORD",()->System.getenv("TMS_TEST_USERS_PASSWORD"));
        r.add("TMS_MIGRATION_USER",()->System.getenv("TMS_TEST_USERS_USER"));r.add("TMS_MIGRATION_PASSWORD",()->System.getenv("TMS_TEST_USERS_PASSWORD"));
        for(String key:List.of("TMS_BOOTSTRAP_ENABLED","TMS_REDMINE_ENABLED","TMS_CHATGPT_LOCAL_ENABLED","TMS_OLLAMA_ENABLED","TMS_OPENAI_ENABLED"))r.add(Objects.requireNonNull(key),()->"false");
        for(String key:List.of("spring.session.jdbc.cleanup-cron","TMS_AI_DRAFT_CLEANUP_CRON","TMS_AI_CHAT_CLEANUP_CRON"))r.add(Objects.requireNonNull(key),()->"-");
    }
    @LocalServerPort protected int port;
    @Autowired protected ObjectMapper json;
    @Autowired protected IdentityUserRepository users;
    @Autowired protected PasswordEncoder passwords;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected ProjectService projects;
    @Autowired protected SystemAdminRegistry registry;
    protected IdentityUser admin;
    protected String hash;
    protected static final String PASSWORD="Unified-fixture-only-2026!";
    @BeforeEach void identityFixture(){
        jdbc.update("DELETE FROM identity_login_buckets");
        jdbc.update("DELETE FROM system_admin_registry");
        hash=passwords.encode(PASSWORD);admin=account("ADMIN");registry.register(1,admin.getId());
    }
    protected IdentityUser account(String role){return users.saveAndFlush(new IdentityUser("ua."+UUID.randomUUID().toString().substring(0,12),role+" fixture",hash,role));}
    protected Client loggedIn(IdentityUser user)throws Exception{var client=new Client();assertThat(client.login(user.getUsername(),PASSWORD).statusCode()).isEqualTo(200);return client;}
    protected JsonNode body(HttpResponse<String> response)throws Exception{return json.readTree(response.body());}
    protected class Client {
        public Client() {}
        private final HttpClient http=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).connectTimeout(Duration.ofSeconds(10)).build();
        public HttpResponse<String> get(String path)throws Exception{return send("GET",path,null,null);}
        public HttpResponse<String> login(String id,String password)throws Exception{return write("POST","/auth/login",Map.of("username",id,"password",password));}
        public HttpResponse<String> write(String method,String path,Object input)throws Exception{return send(method,path,input,body(get("/auth/csrf")));}
        public HttpResponse<String> upload(String path,byte[] bytes,String contentType)throws Exception{
            var csrf=body(get("/auth/csrf"));String boundary="TmsProfileBoundary";
            var data=new java.io.ByteArrayOutputStream();
            data.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\"avatar\"\r\nContent-Type: "+contentType+"\r\n\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
            data.write(bytes);data.write(("\r\n--"+boundary+"--\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1"+path))
                .header("Content-Type","multipart/form-data; boundary="+boundary).header(csrf.path("headerName").asText(),csrf.path("token").asText())
                .PUT(HttpRequest.BodyPublishers.ofByteArray(data.toByteArray())).build();
            return http.send(request,HttpResponse.BodyHandlers.ofString());
        }
        public HttpResponse<byte[]> bytes(String path)throws Exception{return http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1"+path)).GET().build(),HttpResponse.BodyHandlers.ofByteArray());}
        public HttpResponse<String> send(String method,String path,Object input,JsonNode csrf)throws Exception{
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1"+path)).timeout(Duration.ofSeconds(30)).header("Content-Type","application/json");
            if(csrf!=null)request.header(csrf.path("headerName").asText(),csrf.path("token").asText());
            request.method(method,input==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input)));
            return http.send(request.build(),HttpResponse.BodyHandlers.ofString());
        }
    }
}
