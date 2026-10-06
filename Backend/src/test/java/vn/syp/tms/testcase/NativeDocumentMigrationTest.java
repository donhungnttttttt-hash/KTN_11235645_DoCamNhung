package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Opt-in: empty disposable schema only. Never cleans a schema with pre-existing tables. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_FRESH_MIGRATION",matches="true")
class NativeDocumentMigrationTest {
    @Test void upgradesV11WithoutLosingRowsThenMigratesFreshAndRestarts() throws Exception {
        String url=System.getenv("TMS_TEST_DB_URL"),user=System.getenv("TMS_TEST_DB_USER"),password=System.getenv("TMS_TEST_DB_PASSWORD");
        if(url==null || !url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+"))
            throw new IllegalArgumentException("Dedicated native test schema required");
        try(var c=DriverManager.getConnection(url,user,password);var sql=c.createStatement()) {
            assertThat(scalar(sql,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()"))
                    .as("Refuse to clean any pre-existing test data").isZero();
            var previous=Flyway.configure().dataSource(url,user,password).target("11").cleanDisabled(true).load();
            assertThat(previous.migrate().migrationsExecuted).isEqualTo(11);
            sql.executeUpdate("INSERT INTO foundation_checks VALUES('document-upgrade','Preserved by V12',UTC_TIMESTAMP(6))");
            var latest=Flyway.configure().dataSource(url,user,password).target("12").cleanDisabled(true).load();
            assertThat(latest.migrate().migrationsExecuted).isEqualTo(1);
            assertThat(scalar(sql,"SELECT COUNT(*) FROM foundation_checks WHERE id='document-upgrade'" )).isEqualTo(1);
            assertThat(scalar(sql,"SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='import_batches' AND column_name IN ('sheet_name','source_workbook')")).isEqualTo(2);
            latest.validate();assertThat(latest.migrate().migrationsExecuted).isZero();
            // Guard above establishes every table here was created by this test invocation.
            Flyway.configure().dataSource(url,user,password).cleanDisabled(false).load().clean();
            assertThat(latest.migrate().migrationsExecuted).isEqualTo(12);
            latest.validate();assertThat(latest.migrate().migrationsExecuted).isZero();
            assertThat(scalar(sql,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")).isEqualTo(56);
            assertThat(scalar(sql,"SELECT COUNT(*) FROM identity_users")).isZero();
        }
    }
    private long scalar(Statement sql,String query) throws SQLException {
        try(var rows=sql.executeQuery(query)) { assertThat(rows.next()).isTrue();return rows.getLong(1); }
    }
}
