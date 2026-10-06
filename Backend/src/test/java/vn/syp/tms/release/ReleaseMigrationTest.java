package vn.syp.tms.release;

import static org.assertj.core.api.Assertions.*;
import java.sql.DriverManager;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;

@Testcontainers
class ReleaseMigrationTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.8");
    // JUnit @Container owns and closes this instance.
    static { mysql.withDatabaseName("release_test").withUsername("migrator").withPassword("isolated-test-only"); }

    @Test void missingConfigurationFailsWithoutExposingValues() {
        assertThatThrownBy(() -> MigrationCommand.configuration(Map.of())).hasMessage("Missing TMS_DB_URL");
        assertThatThrownBy(() -> MigrationCommand.configuration(Map.of("TMS_DB_URL","jdbc:mysql://test"))).hasMessage("Missing TMS_MIGRATION_USER");
        assertThatThrownBy(() -> MigrationCommand.configuration(Map.of("TMS_DB_URL","jdbc:mysql://test","TMS_MIGRATION_USER","private-user"))).hasMessage("Missing TMS_MIGRATION_PASSWORD");
        assertThatThrownBy(() -> MigrationCommand.configuration(Map.of("TMS_DB_URL"," "))).hasMessage("Missing TMS_DB_URL");
    }

    @Test void rejectsMissingSchemaEvenIfValidationPolicyIgnoresPendingFiles() {
        var flyway=org.mockito.Mockito.mock(Flyway.class);
        var info=org.mockito.Mockito.mock(org.flywaydb.core.api.MigrationInfoService.class);
        org.mockito.Mockito.when(flyway.info()).thenReturn(info);
        org.mockito.Mockito.when(info.pending()).thenReturn(new org.flywaydb.core.api.MigrationInfo[]{org.mockito.Mockito.mock(org.flywaydb.core.api.MigrationInfo.class)});
        assertThatThrownBy(()->ReleaseDatabaseConfig.validateReady(flyway)).hasMessageContaining("Schema is not ready");
        org.mockito.Mockito.when(info.pending()).thenReturn(new org.flywaydb.core.api.MigrationInfo[0]);
        assertThatThrownBy(()->ReleaseDatabaseConfig.validateReady(flyway)).hasMessageContaining("Schema is not ready");
    }

    @Test void runtimeRequiresCompleteSchemaAndUsesNoDdlPrivileges() throws Exception {
        var settings=Map.of("TMS_DB_URL",mysql.getJdbcUrl(),"TMS_MIGRATION_USER",mysql.getUsername(),"TMS_MIGRATION_PASSWORD",mysql.getPassword());
        var full=MigrationCommand.configuration(settings).load();
        assertThat(full.getConfiguration().isCleanDisabled()).isTrue();
        assertThat(full.getConfiguration().isBaselineOnMigrate()).isFalse();
        assertThat(full.getConfiguration().isOutOfOrder()).isFalse();
        assertThatThrownBy(()->ReleaseDatabaseConfig.validateReady(full)).isInstanceOf(RuntimeException.class);
        MigrationCommand.configuration(settings).target("10").load().migrate();
        assertThatThrownBy(()->ReleaseDatabaseConfig.validateReady(full)).isInstanceOf(RuntimeException.class);
        int pending=full.info().pending().length;
        assertThat(pending).isPositive();
        assertThat(MigrationCommand.migrate(settings)).isEqualTo(pending);
        assertThat(MigrationCommand.migrate(settings)).isZero();
        try(var connection=DriverManager.getConnection(mysql.getJdbcUrl(),"root",mysql.getPassword());var sql=connection.createStatement()) {
            sql.execute("CREATE USER 'runtime'@'%' IDENTIFIED BY 'isolated-runtime-only'");
            sql.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON release_test.* TO 'runtime'@'%'");
        }
        var runtime=Flyway.configure().dataSource(mysql.getJdbcUrl(),"runtime","isolated-runtime-only")
            .locations("classpath:db/migration").cleanDisabled(true).load();
        new ReleaseDatabaseConfig().validateSchemaBeforeRuntime().migrate(runtime);
        try(var connection=DriverManager.getConnection(mysql.getJdbcUrl(),"runtime","isolated-runtime-only");var sql=connection.createStatement()) {
            assertThatThrownBy(()->sql.execute("CREATE TABLE forbidden(id INT)")).isInstanceOf(java.sql.SQLException.class);
        }
        try(var connection=DriverManager.getConnection(mysql.getJdbcUrl(),mysql.getUsername(),mysql.getPassword());var sql=connection.createStatement()) {
            sql.executeUpdate("UPDATE flyway_schema_history SET checksum=checksum+1 WHERE version='11'");
            assertThatThrownBy(()->ReleaseDatabaseConfig.validateReady(runtime)).isInstanceOf(RuntimeException.class);
        }
    }
}
