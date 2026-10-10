package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class IdentityIntegrationTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.8");
    // JUnit @Container owns and closes this instance.
    static { mysql.withDatabaseName("tms_identity_test").withUsername("test").withPassword("ephemeral-test-only"); }
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        registry.add("TMS_DB_URL", mysql::getJdbcUrl);
        registry.add("TMS_DB_USER", mysql::getUsername);
        registry.add("TMS_DB_PASSWORD", mysql::getPassword);
        registry.add("TMS_MIGRATION_USER", mysql::getUsername);
        registry.add("TMS_MIGRATION_PASSWORD", mysql::getPassword);
    }
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired IdentityUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired IdentityService service;
    IdentityUser admin, pm, tester;
    static final String PASSWORD = "Fixture-password-2026!";

    @BeforeEach void fixtures() {
        jdbc.update("DELETE FROM SPRING_SESSION");
        jdbc.update("DELETE FROM identity_audit");
        jdbc.update("DELETE FROM identity_login_buckets");
        users.deleteAll();
        String hash = passwords.encode(PASSWORD);
        admin = users.saveAndFlush(new IdentityUser("admin.test", "Quản trị thử", hash, "ADMIN"));
        pm = users.saveAndFlush(new IdentityUser("pm.test", "Quản lý thử", hash, "PM"));
        tester = users.saveAndFlush(new IdentityUser("tester.test", "Kiểm thử thử", hash, "TESTER"));
    }

    @Test void realCookieSessionRotatesPersistsAndLogsOut() throws Exception {
        var client = new Client();
        client.csrf();
        String before = client.sessionId();
        var login = client.login("ADMIN.TEST", PASSWORD);
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(client.sessionId()).isNotEqualTo(before);
        assertThat(login.headers().allValues("Set-Cookie").toString()).contains("HttpOnly", "SameSite=Strict");
        assertThat(body(login).path("displayName").asText()).isEqualTo("Quản trị thử");
        assertThat(login.body()).doesNotContain("password", "passwordHash", "pbkdf2");
        assertThat(client.get("/me").statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM SPRING_SESSION WHERE PRINCIPAL_NAME = ?", Integer.class, admin.getId())).isEqualTo(1);
        String oldSession = client.sessionId();
        assertThat(client.write("POST", "/auth/logout", null).statusCode()).isEqualTo(204);
        assertThat(client.get("/me").statusCode()).isEqualTo(401);
        assertThat(new Client().withSession(oldSession).get("/me").statusCode()).isEqualTo(401);
    }

    @Test void noEnumerationAndLoginThrottlingPersistsInMysql() throws Exception {
        var client = new Client();
        var missing = client.login("missing.test", PASSWORD);
        var wrong = client.login("tester.test", "wrong-password");
        assertThat(missing.statusCode()).isEqualTo(401);
        assertThat(body(missing).path("message")).isEqualTo(body(wrong).path("message"));
        jdbc.update("UPDATE identity_users SET enabled = FALSE WHERE id = ?", tester.getId());
        var disabled = client.login("tester.test", PASSWORD);
        assertThat(body(disabled).path("message")).isEqualTo(body(missing).path("message"));
        for (int i = 0; i < 5; i++) assertThat(client.login("throttled.test", PASSWORD).statusCode()).isEqualTo(401);
        var throttled = new Client().login("throttled.test", PASSWORD);
        assertThat(throttled.statusCode()).isEqualTo(429);
        assertThat(throttled.headers().firstValue("Retry-After")).contains("60");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM identity_login_buckets", Integer.class)).isPositive();
        jdbc.update("UPDATE identity_login_buckets SET expires_at = DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 1 MINUTE)");
        assertThat(client.login("throttled.test", PASSWORD).statusCode()).isEqualTo(401);
    }

    @Test void testerAndUndelegatedPmCannotCreateUsersEvenByCallingApiDirectly() throws Exception {
        for (String username : List.of("tester.test", "pm.test")) {
            var client = new Client();
            assertThat(client.login(username, PASSWORD).statusCode()).isEqualTo(200);
            assertThat(client.write("POST", "/users", createInput("not.allowed", "TESTER")).statusCode()).isEqualTo(403);
            assertThat(client.get("/users").statusCode()).isEqualTo(403);
            assertThat(client.write("PATCH", "/users/" + pm.getId(), Map.of("canCreateUsers", true, "expectedVersion", 0)).statusCode()).isEqualTo(403);
        }
        assertThat(users.count()).isEqualTo(3);
    }

    @Test void adminCanDelegateOnlyToPmAndRevocationTakesEffectImmediately() throws Exception {
        var owner = new Client(); owner.login("admin.test", PASSWORD);
        var manager = new Client(); manager.login("pm.test", PASSWORD);
        assertThat(owner.write("PATCH", "/users/" + tester.getId(), Map.of("canCreateUsers", true, "expectedVersion", 0)).statusCode()).isEqualTo(422);
        var grant = owner.write("PATCH", "/users/" + pm.getId(), Map.of("canCreateUsers", true, "expectedVersion", 0));
        assertThat(grant.statusCode()).isEqualTo(200);
        assertThat(manager.get("/me").statusCode()).isEqualTo(401);
        var login = manager.login("pm.test", PASSWORD);
        assertThat(body(login).path("permissions").toString()).contains("users:create");
        assertThat(manager.write("POST", "/users", createInput("new.tester", "TESTER")).statusCode()).isEqualTo(201);
        assertThat(manager.write("POST", "/users", createInput("new.admin", "ADMIN")).statusCode()).isEqualTo(403);
        assertThat(manager.write("POST", "/users", createInput("new.pm", "PM")).statusCode()).isEqualTo(403);
        assertThat(manager.write("PATCH", "/users/" + pm.getId(), Map.of("canCreateUsers", true, "expectedVersion", 1)).statusCode()).isEqualTo(403);
        long version = body(grant).path("version").asLong();
        assertThat(owner.write("PATCH", "/users/" + pm.getId(), Map.of("canCreateUsers", false, "expectedVersion", version)).statusCode()).isEqualTo(200);
        assertThat(manager.get("/me").statusCode()).isEqualTo(401);
        manager.login("pm.test", PASSWORD);
        assertThat(manager.write("POST", "/users", createInput("another.tester", "TESTER")).statusCode()).isEqualTo(403);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM identity_audit WHERE event_code IN ('CREATE_USERS_GRANTED', 'CREATE_USERS_REVOKED')", Integer.class)).isEqualTo(2);
    }

    @Test void disableRevokesAllSessionsAndStaleUpdatesCannotOverwrite() throws Exception {
        var owner = new Client(); owner.login("admin.test", PASSWORD);
        var first = new Client(); first.login("tester.test", PASSWORD);
        var second = new Client(); second.login("tester.test", PASSWORD);
        assertThat(owner.write("PATCH", "/users/" + tester.getId(), Map.of("enabled", false, "expectedVersion", 0)).statusCode()).isEqualTo(200);
        assertThat(first.get("/me").statusCode()).isEqualTo(401);
        assertThat(second.get("/me").statusCode()).isEqualTo(401);
        assertThat(owner.write("PATCH", "/users/" + tester.getId(), Map.of("enabled", true, "expectedVersion", 0)).statusCode()).isEqualTo(409);
        assertThat(owner.write("PATCH", "/users/" + admin.getId(), Map.of("enabled", false, "expectedVersion", 0)).statusCode()).isEqualTo(409);
        assertThat(users.findById(java.util.Objects.requireNonNull(tester.getId())).orElseThrow().isEnabled()).isFalse();
    }

    @Test void expiredSessionsAndMissingCsrfAreRejected() throws Exception {
        var client = new Client(); client.login("admin.test", PASSWORD);
        assertThat(client.send("POST", "/users", createInput("no.csrf", "TESTER"), null).statusCode()).isEqualTo(403);
        jdbc.update("UPDATE SPRING_SESSION SET EXPIRY_TIME = 0, LAST_ACCESS_TIME = 0 WHERE PRINCIPAL_NAME = ?", admin.getId());
        assertThat(client.get("/me").statusCode()).isEqualTo(401);
        assertThat(new Client().get("/users").statusCode()).isEqualTo(401);
    }

    @Test void validatesAccountsHashesPasswordsAndNeverReturnsSecrets() throws Exception {
        var client = new Client(); client.login("admin.test", PASSWORD);
        var created = client.write("POST", "/users", createInput("New.Tester", "TESTER"));
        assertThat(created.statusCode()).isEqualTo(201);
        var saved = users.findByUsername("new.tester").orElseThrow();
        assertThat(saved.getPasswordHash()).startsWith("{pbkdf2-v5_8}").doesNotContain(PASSWORD);
        assertThat(passwords.matches(PASSWORD, saved.getPasswordHash())).isTrue();
        assertThat(client.write("POST", "/users", createInput("new.tester", "TESTER")).statusCode()).isEqualTo(409);
        assertThat(client.write("POST", "/users", Map.of("username", "bad", "displayName", "", "password", "short", "role", "TESTER")).statusCode()).isEqualTo(422);
        var list = client.get("/users?page=0&size=2");
        assertThat(body(list).path("items").size()).isEqualTo(2);
        assertThat(body(list).path("totalElements").asInt()).isEqualTo(4);
        assertThat(list.body()).doesNotContain("password", "Hash", "pbkdf2");
        assertThat(client.get("/users?size=101").statusCode()).isEqualTo(422);
        assertThat(client.get("/users?page=no").statusCode()).isEqualTo(400);
    }

    @Test void bootstrapIsExplicitAndNeverResetsExistingAccounts() {
        assertThat(service.bootstrap("bootstrap.admin", "Another-fixture-password", "Admin")).isFalse();
        assertThat(users.count()).isEqualTo(3);
        users.deleteAll();
        assertThat(service.bootstrap("bootstrap.admin", "Another-fixture-password", "Admin")).isTrue();
        String original = users.findByUsername("bootstrap.admin").orElseThrow().getPasswordHash();
        assertThat(service.bootstrap("bootstrap.admin", "Changed-fixture-password", "Admin")).isFalse();
        assertThat(users.findByUsername("bootstrap.admin").orElseThrow().getPasswordHash()).isEqualTo(original);
    }

    Map<String, Object> createInput(String username, String role) {
        return Map.of("username", username, "displayName", "Thành viên thử", "password", PASSWORD, "role", role);
    }
    JsonNode body(HttpResponse<String> response) throws Exception { return json.readTree(response.body()); }
    class Client {
        CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        HttpClient http = HttpClient.newBuilder().cookieHandler(cookies).connectTimeout(Duration.ofSeconds(10)).build();
        Client withSession(String id) {
            var cookie = new HttpCookie("TMS_SESSION", id); cookie.setPath("/"); cookie.setVersion(0);
            cookies.getCookieStore().add(URI.create("http://127.0.0.1:" + port), cookie);
            return this;
        }
        String sessionId() { return cookies.getCookieStore().getCookies().stream().filter(c -> c.getName().equals("TMS_SESSION")).map(cookie -> cookie.getValue()).findFirst().orElse(""); }
        JsonNode csrf() throws Exception { return body(get("/auth/csrf")); }
        HttpResponse<String> get(String path) throws Exception { return send("GET", path, null, null); }
        HttpResponse<String> login(String username, String password) throws Exception { return write("POST", "/auth/login", Map.of("username", username, "password", password)); }
        HttpResponse<String> write(String method, String path, Object input) throws Exception { return send(method, path, input, csrf()); }
        HttpResponse<String> send(String method, String path, Object input, JsonNode csrf) throws Exception {
            var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1" + path))
                    .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json");
            if (csrf != null) request.header(csrf.path("headerName").asText(), csrf.path("token").asText());
            request.method(method, input == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input)));
            return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }
    }
}
