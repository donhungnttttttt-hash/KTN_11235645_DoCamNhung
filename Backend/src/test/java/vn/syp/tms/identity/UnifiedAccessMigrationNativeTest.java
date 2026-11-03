package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Destructive migration tests ONLY in the runner-owned schema; never an application profile. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_USERS_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+")
class UnifiedAccessMigrationNativeTest {
    private Flyway flyway(String target,boolean demo) {
        String url=System.getenv("TMS_TEST_USERS_URL");
        if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+"))throw new IllegalStateException("Isolated schema required");
        var config=Flyway.configure().dataSource(url,System.getenv("TMS_TEST_USERS_USER"),System.getenv("TMS_TEST_USERS_PASSWORD"))
            .locations(demo?new String[]{"classpath:db/migration","classpath:db/demo"}:new String[]{"classpath:db/migration"}).cleanDisabled(false);
        if(target!=null)config.target(target);
        return config.load();
    }
    private Connection connection() throws SQLException {return DriverManager.getConnection(System.getenv("TMS_TEST_USERS_URL"),System.getenv("TMS_TEST_USERS_USER"),System.getenv("TMS_TEST_USERS_PASSWORD"));}
    private List<String> rows(String sql) throws SQLException {
        try(var c=connection();var s=c.createStatement();var r=s.executeQuery(sql)){
            var out=new ArrayList<String>();while(r.next()){var v=new ArrayList<String>();for(int i=1;i<=r.getMetaData().getColumnCount();i++)v.add(r.getString(i));out.add(String.join("|",v));}return out;
        }
    }
    private void sql(String sql) throws SQLException {try(var c=connection();var s=c.createStatement()){s.execute(sql);}}
    @BeforeEach void emptyOwnedSchema(){flyway(null,false).clean();}
    @AfterAll static void leaveUsableCoreSchema(){var test=new UnifiedAccessMigrationNativeTest();test.flyway(null,false).clean();test.flyway(null,false).migrate();}
    @Test void freshCoreAndDemoReachSameRoleModel() throws Exception {
        flyway(null,false).migrate();
        assertThat(rows("SELECT code FROM identity_roles WHERE code IN ('USER','GUEST') ORDER BY code")).containsExactly("GUEST","USER");
        assertThat(rows("SELECT COUNT(*) FROM system_admin_registry")).containsExactly("0");
        assertThat(rows("SELECT COUNT(*) FROM identity_profiles")).containsExactly("0");
        flyway(null,false).clean();flyway(null,true).migrate();
        assertThat(rows("SELECT COUNT(*) FROM identity_users WHERE role_code IN ('TESTER','DEV')")).containsExactly("0");
        assertThat(rows("SELECT COUNT(*) FROM project_memberships WHERE project_role IN ('TESTER','DEV')")).containsExactly("0");
        assertThat(flyway(null,true).migrate().migrationsExecuted).isZero();
        assertThat(rows("SELECT COUNT(*) FROM identity_profiles")).containsExactly("0");
    }
    @Test void profileUpgradeFrom37PreservesExistingUsers() throws Exception {
        flyway("37",false).migrate();
        sql("INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES('profile-upgrade','profile.upgrade','Existing name','fixture-only','USER',UTC_TIMESTAMP(6))");
        var before=rows("SELECT * FROM identity_users ORDER BY id");
        var history=rows("SELECT version,checksum FROM flyway_schema_history ORDER BY installed_rank");
        assertThat(flyway(null,false).migrate().migrationsExecuted).isEqualTo(1);
        assertThat(rows("SELECT * FROM identity_users ORDER BY id")).isEqualTo(before);
        assertThat(rows("SELECT version,checksum FROM flyway_schema_history WHERE CAST(version AS UNSIGNED)<=37 ORDER BY installed_rank")).isEqualTo(history);
        assertThat(rows("SELECT COUNT(*) FROM identity_profiles")).containsExactly("0");
    }
    @Test void upgradePreservesIdentifiersAndHistory() throws Exception {
        flyway("36",true).migrate();
        var users=rows("SELECT id,username,display_name,password_hash,enabled,can_create_users,created_at FROM identity_users ORDER BY id");
        var members=rows("SELECT id,project_id,user_id,active,created_at,updated_at FROM project_memberships ORDER BY id");
        var audit=rows("SELECT * FROM identity_audit ORDER BY id");
        var checksums=rows("SELECT version,checksum FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank");
        flyway(null,true).migrate();
        assertThat(rows("SELECT id,username,display_name,password_hash,enabled,can_create_users,created_at FROM identity_users ORDER BY id")).isEqualTo(users);
        assertThat(rows("SELECT id,project_id,user_id,active,created_at,updated_at FROM project_memberships ORDER BY id")).isEqualTo(members);
        assertThat(rows("SELECT * FROM identity_audit ORDER BY id")).isEqualTo(audit);
        assertThat(rows("SELECT version,checksum FROM flyway_schema_history WHERE version IS NOT NULL AND CAST(version AS UNSIGNED)<=36 ORDER BY installed_rank")).isEqualTo(checksums);
        assertThat(rows("SELECT COUNT(*) FROM identity_users WHERE role_code IN ('TESTER','DEV')")).containsExactly("0");
        assertThat(Integer.parseInt(rows("SELECT COUNT(*) FROM identity_role_migration_journal").getFirst())).isPositive();
    }
    @Test void rejectsInconsistentActiveMembership() throws Exception {
        flyway("36",true).migrate();
        sql("UPDATE project_memberships m JOIN identity_users u ON u.id=m.user_id SET m.project_role='PM' WHERE u.role_code='DEV'");
        assertThatThrownBy(()->flyway(null,true).migrate()).hasStackTraceContaining("Inconsistent active memberships");
        assertThat(Integer.parseInt(rows("SELECT COUNT(*) FROM identity_users WHERE role_code='DEV'").getFirst())).isPositive();
    }
    @Test void registryRejectsThirdSlotAndDuplicateUser() throws Exception {
        flyway(null,true).migrate();
        String id=rows("SELECT id FROM identity_users WHERE role_code='ADMIN' ORDER BY id LIMIT 1").getFirst();
        sql("INSERT INTO system_admin_registry(slot,user_id) VALUES(1,'"+id+"')");
        assertThatThrownBy(()->sql("INSERT INTO system_admin_registry(slot,user_id) VALUES(2,'"+id+"')")).isInstanceOf(SQLException.class);
        assertThatThrownBy(()->sql("INSERT INTO system_admin_registry(slot,user_id) VALUES(3,'"+id+"')")).isInstanceOf(SQLException.class);
    }
}
