package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import java.sql.Connection;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;

/** Owns only the initially empty schema validated by NativeFqDatabase. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="fresh-migration")
class NativeScaleDemoMigrationTest {
    private Flyway demo(String target) {return NativeProjectLifecycleMigrationTest.flyway(target);}

    @Test void scaleDemoIsCompleteIsolatedRepeatableAndAtomic() throws Exception {
        NativeFqDatabase.requireMode("fresh-migration");
        try(var c=NativeFqDatabase.connect()) {
            assertThat(NativeFqFixture.scalar(c,"SELECT GET_LOCK(CONCAT('native-fq-',DATABASE()),0)")).isEqualTo(1);
            try {
                assertThat(NativeFileWorkQaMigrationTest.tables(c)).isEmpty();
                // Release/core migrations never install public demo credentials.
                NativeFqDatabase.flyway("21").migrate();
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users")).isZero();
                NativeFqDatabase.cleanOwned(c,NativeFileWorkQaMigrationTest.tables(c));
                assertThat(demo("21").migrate().migrationsExecuted).isEqualTo(21);
                var fixture=NativeFqFixture.seed(c,true);
                var before=new LinkedHashMap<String,NativeFileWorkQaMigrationTest.Snapshot>();
                for(String table:NativeFileWorkQaMigrationTest.tables(c)) {
                    if(!table.equals("flyway_schema_history"))before.put(table,NativeFileWorkQaMigrationTest.snapshot(c,table,null));
                }
                assertThat(demo("22").migrate().migrationsExecuted).isEqualTo(1);
                verify(c);
                for(var entry:before.entrySet())assertThat(NativeFileWorkQaMigrationTest.snapshot(c,entry.getKey(),null).rows()).as(entry.getKey()+" existing rows preserved").containsAll(entry.getValue().rows());
                assertThat(NativeFqFixture.bytes(c,"SELECT source_workbook FROM import_batches WHERE id=?",fixture.document)).isEqualTo(fixture.source);
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM test_cases")).isEqualTo(1);
                NativeFqFixture.update(c,"UPDATE identity_users SET password_hash='user-changed',enabled=FALSE WHERE username='syp.lab.tester01'");
                NativeFqFixture.update(c,"UPDATE device_assets SET notes='user-edited' WHERE asset_code='SYP-LAB-22-IPAD-01'");
                assertThat(demo("22").migrate().migrationsExecuted).isZero();demo("22").validate();
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users WHERE username='syp.lab.tester01' AND password_hash='user-changed' AND enabled=FALSE")).isEqualTo(1);
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_assets WHERE asset_code='SYP-LAB-22-IPAD-01' AND notes='user-edited'")).isEqualTo(1);

                // A late inventory collision must roll back accounts, projects and memberships.
                NativeFqDatabase.cleanOwned(c,NativeFileWorkQaMigrationTest.tables(c));demo("21").migrate();
                NativeFqFixture.update(c,"UPDATE device_assets SET asset_code='SYP-LAB-22-IPAD-01' WHERE asset_code='SYP-DEMO-20-IPAD-01'");
                assertThatThrownBy(()->demo("22").migrate()).isInstanceOf(org.flywaydb.core.api.FlywayException.class);
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users WHERE username LIKE 'syp.lab.%'")).isZero();
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM projects WHERE code LIKE 'SYP-LAB-22-%'")).isZero();
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_assets WHERE asset_code='SYP-LAB-22-IPAD-01'")).isEqualTo(1);

                // Do not silently attribute seed data to a disabled or demoted administrator.
                NativeFqDatabase.cleanOwned(c,NativeFileWorkQaMigrationTest.tables(c));demo("21").migrate();
                NativeFqFixture.update(c,"UPDATE identity_users SET role_code='TESTER' WHERE username='syp.demo.admin'");
                assertThatThrownBy(()->demo("22").migrate()).isInstanceOf(org.flywaydb.core.api.FlywayException.class);
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users WHERE username LIKE 'syp.lab.%'")).isZero();

                NativeFqDatabase.cleanOwned(c,NativeFileWorkQaMigrationTest.tables(c));
                assertThat(demo("22").migrate().migrationsExecuted).isEqualTo(22);verify(c);
                for(String table:List.of("import_batches","test_cases","file_work_groups","execution_attempts","work_items"))assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM "+table)).as(table+" not seeded").isZero();
                demo("22").validate();
            } finally {NativeFqFixture.scalar(c,"SELECT RELEASE_LOCK(CONCAT('native-fq-',DATABASE()))");}
        }
    }

    private void verify(Connection c)throws Exception {
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users WHERE username LIKE 'syp.lab.%'")).isEqualTo(100);
        for(var entry:Map.of("PM",3,"DEV",20,"TESTER",77).entrySet())assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users WHERE username LIKE 'syp.lab.%' AND role_code=?",entry.getKey())).isEqualTo(entry.getValue().longValue());
        var hashes=new HashSet<String>();
        try(var s=c.createStatement();var r=s.executeQuery("SELECT username,password_hash,enabled,can_create_users FROM identity_users WHERE username LIKE 'syp.lab.%'")) {
            while(r.next()) {
                assertThat(r.getBoolean(3)).isTrue();assertThat(r.getBoolean(4)).isFalse();
                String hash=Objects.requireNonNull(r.getString(2));assertThat(hash).startsWith("{pbkdf2-v5_8}");hashes.add(hash);
                assertThat(Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8().matches("@test1234",hash.substring("{pbkdf2-v5_8}".length()))).as(r.getString(1)).isTrue();
            }
        }assertThat(hashes).hasSize(100);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM projects WHERE code LIKE 'SYP-LAB-22-%'")).isEqualTo(3);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM project_memberships m JOIN projects p ON p.id=m.project_id JOIN identity_users u ON u.id=m.user_id WHERE p.code LIKE 'SYP-LAB-22-%' AND m.active=TRUE AND m.project_role=u.role_code")).isEqualTo(100);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(DISTINCT m.project_id) FROM project_memberships m JOIN projects p ON p.id=m.project_id WHERE p.code LIKE 'SYP-LAB-22-%' AND m.project_role='PM'")).isEqualTo(3);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_assets WHERE asset_code LIKE 'SYP-LAB-22-%'")).isEqualTo(120);
        for(String group:List.of("IPAD","IPHONE","TABLET","PHONE")) {
            String prefix="SYP-LAB-22-"+group+"-%";
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_assets WHERE asset_code LIKE ?",prefix)).isEqualTo(30);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(DISTINCT os_version) FROM device_assets WHERE asset_code LIKE ?",prefix)).isGreaterThanOrEqualTo(3);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(DISTINCT model) FROM device_assets WHERE asset_code LIKE ?",prefix)).isGreaterThanOrEqualTo(3);
        }
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_assets WHERE asset_code LIKE 'SYP-LAB-22-%' AND (serial IS NULL OR serial NOT LIKE 'DEMO22-%' OR model='' OR os_name='' OR os_version='' OR notes IS NULL OR notes NOT LIKE '%DEMO%')")).isZero();
        for(var entry:Map.of("AVAILABLE",104,"MAINTENANCE",12,"RETIRED",4).entrySet())assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_assets WHERE asset_code LIKE 'SYP-LAB-22-%' AND condition_code=?",entry.getKey())).isEqualTo(entry.getValue().longValue());
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_allocations a JOIN device_assets d ON d.id=a.asset_id JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.recipient_membership_id WHERE d.asset_code LIKE 'SYP-LAB-22-%' AND d.condition_code='AVAILABLE' AND a.returned_at IS NULL AND m.project_role='TESTER' AND m.active=TRUE")).isEqualTo(24);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_audit WHERE request_id='flyway-v22-local'")).isEqualTo(100);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM project_audit a JOIN device_assets d ON a.entity_type='DEVICE_ASSET' AND a.entity_id=d.id WHERE d.asset_code LIKE 'SYP-LAB-22-%' AND a.action='DEMO_SEED'")).isEqualTo(120);
    }
}
