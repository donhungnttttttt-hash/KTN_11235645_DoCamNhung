package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import java.sql.Connection;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;

/** Never runs against the application database. Owns an initially empty schema. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="fresh-migration")
class NativeDemoDataMigrationTest {
    private Flyway demo() {
        return Flyway.configure().dataSource(NativeFqDatabase.url(),NativeFqDatabase.user(),NativeFqDatabase.password())
            .locations("classpath:db/migration","classpath:db/demo").target("20").cleanDisabled(true).load();
    }
    @Test void freshAndUpgradePreserveExistingDataAndDoNotSeedFilesOrResetPasswords() throws Exception {
        NativeFqDatabase.requireMode("fresh-migration");
        try(var c=NativeFqDatabase.connect()) {
            assertThat(NativeFqFixture.scalar(c,"SELECT GET_LOCK(CONCAT('native-fq-',DATABASE()),0)")).isEqualTo(1);
            try {
                assertThat(NativeFileWorkQaMigrationTest.tables(c)).isEmpty();
                assertThat(demo().migrate().migrationsExecuted).isEqualTo(20);
                verify(c);
                for(String t:List.of("test_cases","import_batches","import_rows","execution_attempts","file_work_groups"))
                    assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM "+t)).as(t).isZero();
                var owned=NativeFileWorkQaMigrationTest.tables(c);
                NativeFqDatabase.cleanOwned(c,owned);
                assertThat(NativeFqDatabase.flyway("19").migrate().migrationsExecuted).isEqualTo(19);
                var old=NativeFqFixture.seed(c,true);
                var users=NativeFileWorkQaMigrationTest.snapshot(c,"identity_users",null);
                var batches=NativeFileWorkQaMigrationTest.snapshot(c,"import_batches",null);
                assertThat(demo().migrate().migrationsExecuted).isEqualTo(1);
                verify(c);
                assertThat(NativeFileWorkQaMigrationTest.snapshot(c,"import_batches",null)).isEqualTo(batches);
                assertThat(NativeFileWorkQaMigrationTest.snapshot(c,"identity_users",null).rows()).containsAll(users.rows());
                assertThat(NativeFqFixture.bytes(c,"SELECT source_workbook FROM import_batches WHERE id=?",old.document)).isEqualTo(old.source);
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM test_cases")).isEqualTo(1);
                NativeFqFixture.update(c,"UPDATE identity_users SET password_hash='changed-by-user',enabled=FALSE WHERE username='syp.demo.tester01'");
                assertThat(demo().migrate().migrationsExecuted).isZero();
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users WHERE username='syp.demo.tester01' AND password_hash='changed-by-user' AND enabled=FALSE")).isEqualTo(1);
                demo().validate();
                NativeFqDatabase.cleanOwned(c,owned);
                NativeFqDatabase.flyway("19").migrate();
                var collision=NativeFqFixture.seed(c,false);
                NativeFqFixture.update(c,"UPDATE device_assets SET asset_code='SYP-DEMO-20-IPAD-01' WHERE id=?",collision.asset);
                assertThatThrownBy(()->demo().migrate()).isInstanceOf(org.flywaydb.core.api.FlywayException.class);
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users WHERE username LIKE 'syp.demo.%'"))
                    .as("Late collision rolls back all demo accounts").isZero();
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM projects WHERE code IN ('SYP-DEMO-20','SYP-DEMO-WEB-20')"))
                    .as("Late collision rolls back demo projects").isZero();
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_assets WHERE id=? AND asset_code='SYP-DEMO-20-IPAD-01'",collision.asset)).isEqualTo(1);
                NativeFqDatabase.cleanOwned(c,owned);
                assertThat(demo().migrate().migrationsExecuted).isEqualTo(20);
                verify(c);
            } finally { NativeFqFixture.scalar(c,"SELECT RELEASE_LOCK(CONCAT('native-fq-',DATABASE()))"); }
        }
    }
    private void verify(Connection c)throws Exception {
        var expected=java.util.Map.of("syp.demo.admin","ADMIN","syp.demo.pm","PM","syp.demo.tester01","TESTER","syp.demo.tester02","TESTER","syp.demo.dev","DEV");
        try(var s=c.createStatement();var r=s.executeQuery("SELECT username,role_code,password_hash,enabled,can_create_users FROM identity_users WHERE username LIKE 'syp.demo.%'")) {
            int count=0;
            while(r.next()) {
                count++;assertThat(r.getString(2)).isEqualTo(expected.get(r.getString(1)));
                assertThat(r.getBoolean(4)).isTrue();assertThat(r.getBoolean(5)).isFalse();
                String hash=r.getString(3);assertThat(hash).startsWith("{pbkdf2-v5_8}");
                assertThat(Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8().matches("@test1234",hash.substring("{pbkdf2-v5_8}".length()))).isTrue();
            } assertThat(count).isEqualTo(5);
        }
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM projects WHERE code IN ('SYP-DEMO-20','SYP-DEMO-WEB-20')")).isEqualTo(2);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM project_memberships m JOIN projects p ON p.id=m.project_id WHERE p.code IN ('SYP-DEMO-20','SYP-DEMO-WEB-20') AND m.active=TRUE")).isEqualTo(7);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE u.username='syp.demo.admin'")).isZero();
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM project_memberships m JOIN identity_users u ON u.id=m.user_id JOIN projects p ON p.id=m.project_id WHERE u.username='syp.demo.tester01' AND p.code='SYP-DEMO-WEB-20'")).isZero();
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_assets WHERE asset_code LIKE 'SYP-DEMO-20-%'")).isEqualTo(4);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_allocations a JOIN device_assets d ON d.id=a.asset_id JOIN project_memberships m ON m.id=a.recipient_membership_id AND m.project_id=a.project_id WHERE d.asset_code LIKE 'SYP-DEMO-20-%' AND a.returned_at IS NULL AND m.project_role='TESTER'")).isEqualTo(3);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM cycle_configurations c JOIN projects p ON p.id=c.project_id WHERE p.code IN ('SYP-DEMO-20','SYP-DEMO-WEB-20')")).isEqualTo(2);
    }
}
