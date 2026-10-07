package vn.syp.tms.config;

import static org.assertj.core.api.Assertions.*;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;

/** Loads real config data with synthetic secrets; never opens a database connection. */
class LocalDatabaseConfigurationTest {
    @TempDir Path directory;

    @Configuration(proxyBeanMethods = false)
    static class NoDatabaseConfiguration {}

    private Path localConfiguration() throws Exception {
        Path file = directory.resolve("native.mysql.local");
        Files.writeString(file, """
            TMS_MYSQL_HOST=127.0.0.1
            TMS_MYSQL_PORT=3312
            TMS_DB_NAME=fixturedb
            TMS_DB_USER=fixture_app
            TMS_DB_PASSWORD=fixture-only!#=password
            TMS_MIGRATION_USER=fixture_migrator
            TMS_MIGRATION_PASSWORD=migration-fixture-only
            TMS_BOOTSTRAP_ENABLED=false
            TMS_REDMINE_ENABLED=false
            """);
        return file;
    }

    private ConfigurableApplicationContext load(String profile, Path file, String... overrides) {
        var application = new SpringApplication(NoDatabaseConfiguration.class);
        application.setWebApplicationType(WebApplicationType.NONE);
        application.setAdditionalProfiles(profile);
        application.setLogStartupInfo(false);
        var args = new java.util.ArrayList<String>();
        args.add("--spring.main.banner-mode=off");
        args.add("--TMS_LOCAL_CONFIG_FILE=" + file.toAbsolutePath().toString().replace('\\', '/'));
        args.addAll(java.util.List.of(overrides));
        return application.run(args.toArray(String[]::new));
    }

    @Test void localRunLoadsNativeCredentialsAndConstructsBothDatabaseUrls() throws Exception {
        try (var context = load("local", localConfiguration())) {
            var env = context.getEnvironment();
            String url = env.getRequiredProperty("spring.datasource.url");
            assertThat(url).startsWith("jdbc:mysql://127.0.0.1:3312/fixturedb?")
                .contains("connectionTimeZone=UTC", "forceConnectionTimeZoneToSession=true");
            assertThat(env.getRequiredProperty("spring.flyway.url")).isEqualTo(url);
            assertThat(env.getRequiredProperty("spring.flyway.locations"))
                .isEqualTo("classpath:db/migration,classpath:db/demo");
            assertThat(env.getRequiredProperty("spring.datasource.username")).isEqualTo("fixture_app");
            assertThat(env.getRequiredProperty("spring.datasource.password")).isEqualTo("fixture-only!#=password");
            assertThat(env.getRequiredProperty("spring.flyway.user")).isEqualTo("fixture_migrator");
            assertThat(env.getRequiredProperty("spring.flyway.password")).isEqualTo("migration-fixture-only");
            assertThat(context.getBeansOfType(javax.sql.DataSource.class)).isEmpty();
        }
    }

    @Test void explicitConnectionSettingsTakePrecedenceOverLocalFile() throws Exception {
        try (var context = load("local", localConfiguration(),
                "--TMS_DB_URL=jdbc:mysql://127.0.0.1:3333/override", "--TMS_DB_PASSWORD=override-secret")) {
            var env = context.getEnvironment();
            assertThat(env.getRequiredProperty("spring.datasource.url")).isEqualTo("jdbc:mysql://127.0.0.1:3333/override");
            assertThat(env.getRequiredProperty("spring.flyway.url")).isEqualTo("jdbc:mysql://127.0.0.1:3333/override");
            assertThat(env.getRequiredProperty("spring.datasource.password")).isEqualTo("override-secret");
        }
    }

    @Test void localSingleDatabaseAccountCanAlsoRunMigrations() throws Exception {
        Path file = directory.resolve("single-account.local");
        Files.writeString(file, """
            TMS_DB_USER=fixture_owner
            TMS_DB_PASSWORD=fixture-owner-password
            TMS_BOOTSTRAP_ENABLED=false
            """);
        try (var context = load("local", file)) {
            var env = context.getEnvironment();
            assertThat(env.getRequiredProperty("spring.datasource.url"))
                .startsWith("jdbc:mysql://127.0.0.1:3307/tms?");
            assertThat(env.getRequiredProperty("spring.flyway.user")).isEqualTo("fixture_owner");
            assertThat(env.getRequiredProperty("spring.flyway.password")).isEqualTo("fixture-owner-password");
            assertThat(context.getBeansOfType(javax.sql.DataSource.class)).isEmpty();
        }
    }

    @Test void releaseDoesNotImportNativeCredentials() throws Exception {
        try (var context = load("release", localConfiguration())) {
            var env = context.getEnvironment();
            assertThat(env.getProperty("TMS_DB_PASSWORD")).isNull();
            assertThatThrownBy(() -> env.getRequiredProperty("spring.datasource.url"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("TMS_DB_URL");
            assertThat(env.getActiveProfiles()).containsExactly("release");
            assertThat(env.getRequiredProperty("spring.flyway.locations")).isEqualTo("classpath:db/migration");
        }
    }

    @Test void missingLocalFileDoesNotProvideDefaultPasswords() {
        try (var context = load("local", directory.resolve("missing.local"))) {
            var env = context.getEnvironment();
            assertThat(env.getProperty("TMS_DB_PASSWORD")).isNull();
            assertThat(env.getProperty("TMS_MIGRATION_PASSWORD")).isNull();
            assertThatThrownBy(() -> env.getRequiredProperty("spring.datasource.password"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("TMS_DB_PASSWORD");
        }
    }
}
