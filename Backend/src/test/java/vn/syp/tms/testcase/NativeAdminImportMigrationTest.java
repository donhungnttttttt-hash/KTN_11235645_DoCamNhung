package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

@EnabledIfEnvironmentVariable(named="TMS_TEST_FRESH_MIGRATION",matches="true")
class NativeAdminImportMigrationTest {
    @Test void upgradesV25PreservingMembershipAuthorAndSupportsFreshV26() throws Exception {
        String url=System.getenv("TMS_TEST_DB_URL"), user=System.getenv("TMS_TEST_DB_USER"), password=System.getenv("TMS_TEST_DB_PASSWORD");
        if(url==null || !url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+")) throw new IllegalArgumentException("Dedicated test schema required");
        try(var connection=DriverManager.getConnection(url,user,password);var sql=connection.createStatement()) {
            assertThat(scalar(sql,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")).as("Requires newly provisioned empty schema").isZero();
            Flyway.configure().dataSource(url,user,password).target("25").load().migrate();
            sql.executeUpdate("INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES('migration-author','migration.author','Original author','unused','PM',UTC_TIMESTAMP(6))");
            sql.executeUpdate("INSERT INTO projects(id,code,name,created_at,updated_at,created_by,updated_by) VALUES(90001,'MIGRATION26','Migration',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'migration-author','migration-author')");
            sql.executeUpdate("INSERT INTO project_memberships(id,project_id,user_id,project_role,created_at,updated_at) VALUES(90001,90001,'migration-author','PM',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
            sql.executeUpdate("INSERT INTO test_suites(id,project_id,code,name,created_at,updated_at) VALUES(90001,90001,'S','Suite',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
            sql.executeUpdate("INSERT INTO test_cases(id,project_id,case_no,suite_id,created_at,updated_at) VALUES(90001,90001,'CASE26',90001,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
            sql.executeUpdate("INSERT INTO test_case_revisions(id,project_id,test_case_id,revision_no,title_vi,steps_vi,expected_vi,created_at,created_by) VALUES(90001,90001,90001,1,'Preserved','Steps','Expected',UTC_TIMESTAMP(6),90001)");
            var latest=Flyway.configure().dataSource(url,user,password).target("26").load();
            assertThat(latest.migrate().migrationsExecuted).isEqualTo(1);
            assertThat(scalar(sql,"SELECT COUNT(*) FROM test_case_revisions WHERE id=90001 AND title_vi='Preserved' AND created_by=90001 AND created_by_user_id IS NULL")).isEqualTo(1);
            sql.executeUpdate("INSERT INTO test_case_revisions(project_id,test_case_id,revision_no,title_vi,steps_vi,expected_vi,created_at,created_by_user_id) VALUES(90001,90001,2,'Identity author','Steps','Expected',UTC_TIMESTAMP(6),'migration-author')");
            assertThatThrownBy(()->sql.executeUpdate("UPDATE test_case_revisions SET created_by_user_id=NULL WHERE revision_no=2 AND project_id=90001")).isInstanceOf(SQLException.class);
            latest.validate();assertThat(latest.migrate().migrationsExecuted).isZero();
            // Empty-schema guard proves every table here belongs to this invocation only.
            Flyway.configure().dataSource(url,user,password).cleanDisabled(false).load().clean();
            assertThat(latest.migrate().migrationsExecuted).isPositive();
            assertThat(latest.info().current().getVersion().toString()).isEqualTo("26");
            latest.validate();assertThat(latest.migrate().migrationsExecuted).isZero();
        }
    }
    private long scalar(Statement statement,String query) throws SQLException {
        try(var rows=statement.executeQuery(query)) { assertThat(rows.next()).isTrue();return rows.getLong(1); }
    }
}
