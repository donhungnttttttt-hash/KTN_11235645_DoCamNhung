package vn.syp.tms.foundation;

import static org.assertj.core.api.Assertions.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class MigrationTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.8");
    // JUnit @Container owns and closes this instance.
    static { mysql.withDatabaseName("tms_migrations").withUsername("test").withPassword("ephemeral-test-only"); }

    @Test
    void freshDatabaseRestartChecksumAndCleanProtection(@TempDir Path changedLocation) throws Exception {
        var flyway = Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())
                .locations("classpath:db/migration").target("1").cleanDisabled(true).baselineOnMigrate(false).load();
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(1);
        try (var connection = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
             var statement = connection.createStatement()) {
            statement.executeUpdate("INSERT INTO foundation_checks VALUES ('00000000-0000-0000-0000-000000000001', 'Giữ nguyên sau khởi động', UTC_TIMESTAMP(6))");
        }
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        flyway.validate();
        try (var connection = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
             var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT COUNT(*) FROM foundation_checks")) {
            rows.next();
            assertThat(rows.getInt(1)).isEqualTo(1);
        }
        String original;
        try (var stream = getClass().getResourceAsStream("/db/migration/V1__create_foundation.sql")) {
            assertThat(stream).isNotNull();
            original = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }
        Files.writeString(changedLocation.resolve("V1__create_foundation.sql"), original + "\nSELECT 123;\n");
        var changed = Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())
                .locations("filesystem:" + changedLocation.toAbsolutePath()).load();
        assertThat(changed.validateWithResult().validationSuccessful).isFalse();
        assertThatThrownBy(changed::migrate).isInstanceOf(FlywayException.class);
        assertThatThrownBy(flyway::clean).isInstanceOf(FlywayException.class);
        flyway.validate(); // Only the temporary copy changed; the real V1 remains valid.
        var upgrade = Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())
                .locations("classpath:db/migration").cleanDisabled(true).load();
        assertThat(upgrade.migrate().migrationsExecuted).isEqualTo(11);
        assertThat(upgrade.migrate().migrationsExecuted).isZero();
        try (var connection = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
             var statement = connection.createStatement()) {
            try (var rows = statement.executeQuery("SELECT COUNT(*) FROM foundation_checks")) {
                rows.next(); assertThat(rows.getInt(1)).isEqualTo(1);
            }
            try (var rows = statement.executeQuery("SELECT COUNT(*) FROM identity_roles")) {
                rows.next(); assertThat(rows.getInt(1)).isEqualTo(3);
            }
            try (var rows = statement.executeQuery("SELECT COUNT(*) FROM identity_users")) {
                rows.next(); assertThat(rows.getInt(1)).isZero(); // No credentials seeded by migration.
            }
        }
    }

    @Test
    void failsMigrationWhenDatabaseIsUnavailable() {
        var unavailable = Flyway.configure().dataSource(
                "jdbc:mysql://127.0.0.1:1/missing?connectTimeout=1000", "unavailable", "not-a-real-credential")
                .connectRetries(0).load();
        assertThatThrownBy(unavailable::migrate).isInstanceOf(FlywayException.class);
    }

    @Test
    void upgradesV4WithExistingProjectBuildAndApprovedRevision() throws Exception {
        try (var previous=new MySQLContainer<>("mysql:8.4.8")) {
            previous.withDatabaseName("tms_upgrade").withUsername("test").withPassword("ephemeral-test-only");
            previous.start();
            var v4=Flyway.configure().dataSource(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword())
                    .locations("classpath:db/migration").target("4").cleanDisabled(true).load();
            assertThat(v4.migrate().migrationsExecuted).isEqualTo(4);
            try(var connection=DriverManager.getConnection(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword());var sql=connection.createStatement()) {
                sql.executeUpdate("INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES ('upgrade-user','upgrade.user','PM thử','fixture-only','PM',UTC_TIMESTAMP(6))");
                sql.executeUpdate("INSERT INTO projects(id,code,name,timezone,created_at,created_by,updated_at,updated_by) VALUES (1,'UPGRADE','Dữ liệu nâng cấp','UTC',UTC_TIMESTAMP(6),'upgrade-user',UTC_TIMESTAMP(6),'upgrade-user')");
                sql.executeUpdate("INSERT INTO project_memberships(id,project_id,user_id,project_role,created_at,updated_at) VALUES (1,1,'upgrade-user','PM',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
                sql.executeUpdate("INSERT INTO builds(id,project_id,version_label,platform,created_at,updated_at) VALUES (1,1,'1.0','WEB',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
                sql.executeUpdate("INSERT INTO test_suites(id,project_id,code,name,created_at,updated_at) VALUES (1,1,'AUTH','Đăng nhập',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
                sql.executeUpdate("INSERT INTO test_cases(id,project_id,case_no,suite_id,created_at,updated_at) VALUES (1,1,'TC-OLD',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
                sql.executeUpdate("INSERT INTO test_case_revisions(id,project_id,test_case_id,revision_no,title_vi,steps_vi,expected_vi,title_jp,approved_at,approved_by,created_at,created_by) VALUES (1,1,1,1,'Bản đã duyệt','Bước cũ','Kết quả cũ','原文',UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),1)");
                sql.executeUpdate("UPDATE test_cases SET current_revision_id=1 WHERE id=1");
            }
            var v5=Flyway.configure().dataSource(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword()).locations("classpath:db/migration").target("5").cleanDisabled(true).load();
            assertThat(v5.migrate().migrationsExecuted).isEqualTo(1);
            var v6=Flyway.configure().dataSource(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword()).locations("classpath:db/migration").target("6").cleanDisabled(true).load();
            assertThat(v6.migrate().migrationsExecuted).isEqualTo(1);
            try(var connection=DriverManager.getConnection(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword());var sql=connection.createStatement()) {
                sql.executeUpdate("INSERT INTO environments(id,project_id,code,name,created_at,updated_at) VALUES (1,1,'QA','QA cũ',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
                sql.executeUpdate("INSERT INTO devices(id,project_id,code,name,created_at,updated_at) VALUES (1,1,'WEB','Thiết bị cũ',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
                sql.executeUpdate("INSERT INTO test_cycles(id,project_id,code,name,status_code,activated_at,activated_by,created_at,created_by) VALUES (1,1,'C1','Đợt cũ','ACTIVE',UTC_TIMESTAMP(6),1,UTC_TIMESTAMP(6),1)");
                sql.executeUpdate("INSERT INTO cycle_configurations(id,project_id,cycle_id,environment_id,device_id,default_build_id,created_at) VALUES (1,1,1,1,1,1,UTC_TIMESTAMP(6))");
                sql.executeUpdate("INSERT INTO run_items(id,project_id,cycle_id,configuration_id,test_case_id,revision_id,assignee_membership_id,created_at) VALUES (1,1,1,1,1,1,1,UTC_TIMESTAMP(6))");
                sql.executeUpdate("INSERT INTO execution_attempts(id,project_id,run_item_id,attempt_no,result_code,build_id,executor_membership_id,executed_at,actual_result,reason,evidence_reference,context_snapshot,request_key,request_checksum) VALUES (1,1,1,1,'NG',1,1,UTC_TIMESTAMP(6),'Lỗi cũ 原文','','',JSON_OBJECT('device',JSON_OBJECT('name','Thiết bị cũ')),'upgrade-attempt',REPEAT('a',64))");
                sql.executeUpdate("UPDATE run_items SET latest_attempt_id=1 WHERE id=1");
            }
            var v7=Flyway.configure().dataSource(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword()).locations("classpath:db/migration").target("7").cleanDisabled(true).load();
            assertThat(v7.migrate().migrationsExecuted).isEqualTo(1);
            try(var connection=DriverManager.getConnection(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword());var sql=connection.createStatement()) {
                sql.executeUpdate("INSERT INTO work_items(id,project_id,item_no,item_key,item_type,title,description,status_code,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(1,1,1,'UPGRADE-1','BUG','Lỗi trước nâng cấp','','resolved',1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'upgrade-bug',REPEAT('b',64))");
                sql.executeUpdate("INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,build_id,environment_id,device_id,test_case_id,revision_id,standalone_reason,fixed_build_id,context_snapshot) VALUES(1,1,'INTERNAL_V1','Bước cũ','Mong đợi cũ','Lỗi cũ',1,1,1,1,1,'',1,JSON_OBJECT())");
                sql.executeUpdate("INSERT INTO work_item_execution_links VALUES(1,1,1,1,1,UTC_TIMESTAMP(6))");
            }
            var v8=Flyway.configure().dataSource(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword()).locations("classpath:db/migration").target("8").cleanDisabled(true).load();
            assertThat(v8.migrate().migrationsExecuted).isEqualTo(1);
            var v9=Flyway.configure().dataSource(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword()).locations("classpath:db/migration").target("9").cleanDisabled(true).load();
            assertThat(v9.migrate().migrationsExecuted).isEqualTo(1);
            try(var connection=DriverManager.getConnection(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword());var sql=connection.createStatement()) {
                sql.executeUpdate("INSERT INTO run_scope_decisions(id,project_id,run_item_id,excluded,reason,decided_by,decided_at) VALUES(1,1,1,TRUE,'Giữ quyết định cũ',1,UTC_TIMESTAMP(6))");
                sql.executeUpdate("UPDATE run_items SET scope_decision_id=1 WHERE id=1");
            }
            var latest=Flyway.configure().dataSource(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword()).locations("classpath:db/migration").cleanDisabled(true).load();
            assertThat(latest.migrate().migrationsExecuted).isEqualTo(3);
            assertThat(latest.migrate().migrationsExecuted).isZero(); latest.validate();
            try(var connection=DriverManager.getConnection(previous.getJdbcUrl(),previous.getUsername(),previous.getPassword());var sql=connection.createStatement()) {
                try(var row=sql.executeQuery("SELECT r.title_jp,r.approved_by FROM test_cases c JOIN test_case_revisions r ON r.id=c.current_revision_id WHERE c.id=1")) {
                    assertThat(row.next()).isTrue(); assertThat(row.getString(1)).isEqualTo("原文"); assertThat(row.getLong(2)).isEqualTo(1);
                }
                try(var row=sql.executeQuery("SELECT archived_at FROM builds WHERE id=1")) { assertThat(row.next()).isTrue(); assertThat(row.getTimestamp(1)).isNull(); }
                try(var row=sql.executeQuery("SELECT lock_version FROM builds WHERE id=1")) {assertThat(row.next()).isTrue();assertThat(row.getLong(1)).isZero();}
                try(var row=sql.executeQuery("SELECT rule_version_id FROM bug_details WHERE work_item_id=1")) {assertThat(row.next()).isTrue();assertThat(row.getObject(1)).isNull();}
                try(var row=sql.executeQuery("SELECT a.actual_result,a.result_code,a.context_snapshot->>'$.device.name' FROM run_items r JOIN execution_attempts a ON a.id=r.latest_attempt_id WHERE r.id=1")) {
                    assertThat(row.next()).isTrue();assertThat(row.getString(1)).isEqualTo("Lỗi cũ 原文");assertThat(row.getString(2)).isEqualTo("NG");assertThat(row.getString(3)).isEqualTo("Thiết bị cũ");
                }
                try(var row=sql.executeQuery("SELECT COUNT(*) FROM work_item_statuses")) { assertThat(row.next()).isTrue();assertThat(row.getInt(1)).isEqualTo(10); }
                try(var row=sql.executeQuery("SELECT COUNT(*) FROM work_items")) { assertThat(row.next()).isTrue();assertThat(row.getInt(1)).isEqualTo(1); }
                try(var row=sql.executeQuery("SELECT round_no,current_coverage_id FROM bug_retest_state WHERE project_id=1 AND work_item_id=1")) {
                    assertThat(row.next()).isTrue();assertThat(row.getInt(1)).isZero();assertThat(row.getObject(2)).isNull();
                }
                try(var row=sql.executeQuery("SELECT scope_decision_id FROM run_items WHERE id=1")) { assertThat(row.next()).isTrue();assertThat(row.getLong(1)).isEqualTo(1); }
                try(var row=sql.executeQuery("SELECT reason FROM run_scope_decisions WHERE id=1")) { assertThat(row.next()).isTrue();assertThat(row.getString(1)).isEqualTo("Giữ quyết định cũ"); }
                try(var row=sql.executeQuery("SELECT COUNT(*) FROM redmine_bindings")) { assertThat(row.next()).isTrue();assertThat(row.getInt(1)).isZero(); }
                try(var row=sql.executeQuery("SELECT status_code FROM test_cycles WHERE id=1")) { assertThat(row.next()).isTrue();assertThat(row.getString(1)).isEqualTo("ACTIVE"); }
                try(var row=sql.executeQuery("SELECT COUNT(*) FROM cycle_decisions")) { assertThat(row.next()).isTrue();assertThat(row.getInt(1)).isZero(); }
            }
        }
    }
}

