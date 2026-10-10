package vn.syp.tms.foundation;

import static org.assertj.core.api.Assertions.assertThat;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Testcontainers
class FoundationIntegrationTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.8");
    // JUnit @Container owns and closes this instance.
    static { mysql.withDatabaseName("tms_test").withUsername("test").withPassword("ephemeral-test-only"); }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("TMS_DB_URL", mysql::getJdbcUrl);
        registry.add("TMS_DB_USER", mysql::getUsername);
        registry.add("TMS_DB_PASSWORD", mysql::getPassword);
        registry.add("TMS_MIGRATION_USER", mysql::getUsername);
        registry.add("TMS_MIGRATION_PASSWORD", mysql::getPassword);
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @Test
    void reportsRealDatabaseAndAppliedMigrations() throws Exception {
        mvc.perform(get("/api/v1/system/status")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.migrationVersion").value("11"))
                .andExpect(jsonPath("$.appliedMigrations").value(11))
                .andExpect(header().exists("X-Request-ID"));
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM application_info", Integer.class)).isEqualTo(1);
    }

    @Test
    void persistsVietnameseTextAcrossSeparateRequests() throws Exception {
        String content = mvc.perform(post("/api/v1/system/checks").with(csrf())
                .contentType("application/json").content("{\"message\":\"  Kết nối thử từ giao diện  \"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.message").value("Kết nối thử từ giao diện"))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(content).get("id").asText();
        assertThat(jdbc.queryForObject("SELECT message FROM foundation_checks WHERE id = ?", String.class, id))
                .isEqualTo("Kết nối thử từ giao diện");
        mvc.perform(get("/api/v1/system/checks")).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id == '" + id + "')].message").value("Kết nối thử từ giao diện"));
    }

    @Test
    void rejectsInvalidPayloadWithoutWriting() throws Exception {
        Long before = jdbc.queryForObject("SELECT COUNT(*) FROM foundation_checks", Long.class);
        mvc.perform(post("/api/v1/system/checks").with(csrf()).header("X-Request-ID", "test-validation")
                .contentType("application/json").content("{\"message\":\"   \"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("message"))
                .andExpect(jsonPath("$.requestId").value("test-validation"))
                .andExpect(jsonPath("$.trace").doesNotExist());
        mvc.perform(post("/api/v1/system/checks").with(csrf())
                .contentType("application/json").content(java.util.Objects.requireNonNull(json.writeValueAsString(new FoundationDtos.CreateCheck("x".repeat(161))))))
                .andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM foundation_checks", Long.class)).isEqualTo(before);
    }

    @Test
    void requiresCsrfForLocalWritesAndLocksBusinessEndpoints() throws Exception {
        mvc.perform(get("/api/v1/system/csrf")).andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString()).andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"));
        mvc.perform(post("/api/v1/system/checks").contentType("application/json").content("{\"message\":\"test\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        mvc.perform(get("/api/v1/projects")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void rejectsMalformedJsonAndReplacesUnsafeRequestId() throws Exception {
        mvc.perform(post("/api/v1/system/checks").with(csrf())
                .header("X-Request-ID", "<script>")
                .contentType("application/json").content("{invalid"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(header().string("X-Request-ID", java.util.Objects.requireNonNull(org.hamcrest.Matchers.matchesPattern("[a-f0-9-]{36}"))));
    }
}

