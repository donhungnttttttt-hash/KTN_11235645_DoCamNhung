package db.migration;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Objects;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** Additive role conversion; local administrator names and secrets never belong in a migration. */
public class V37__unified_user_access extends BaseJavaMigration {
    @Override public boolean canExecuteInTransaction(){return false;}
    @Override public void migrate(Context context) throws Exception {
        Connection c=Objects.requireNonNull(context.getConnection());
        try(var s=c.createStatement();var r=s.executeQuery("""
            SELECT COUNT(*) FROM project_memberships m JOIN identity_users u ON u.id=m.user_id
            WHERE m.active=TRUE AND NOT (
              (u.role_code='ADMIN' AND m.project_role IN ('PM','TESTER','DEV','USER')) OR
              (u.role_code='PM' AND m.project_role='PM') OR
              (u.role_code='TESTER' AND m.project_role='TESTER') OR
              (u.role_code='DEV' AND m.project_role='DEV') OR
              (u.role_code='USER' AND m.project_role='USER') OR
              (u.role_code='GUEST' AND m.project_role='GUEST'))
            """)) {
            r.next();if(r.getLong(1)!=0)throw new SQLException("Inconsistent active memberships; review mapping before unified account migration");
        }
        execute(c,"""
            CREATE TABLE system_admin_registry (
              slot TINYINT NOT NULL PRIMARY KEY,
              user_id VARCHAR(36) NOT NULL UNIQUE,
              CONSTRAINT ck_system_admin_slot CHECK (slot IN (1,2)),
              CONSTRAINT fk_system_admin_user FOREIGN KEY(user_id) REFERENCES identity_users(id)
            ) ENGINE=InnoDB
            """);
        execute(c,"""
            CREATE TABLE identity_role_migration_journal (
              entity_type VARCHAR(16) NOT NULL,
              entity_id VARCHAR(36) NOT NULL,
              previous_role VARCHAR(16) NOT NULL,
              next_role VARCHAR(16) NOT NULL,
              previous_version BIGINT NOT NULL,
              migrated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
              PRIMARY KEY(entity_type,entity_id)
            ) ENGINE=InnoDB
            """);
        execute(c,"""
            CREATE TABLE system_admin_provision_receipts (
              operation_id VARCHAR(36) NOT NULL PRIMARY KEY,
              fingerprint CHAR(64) NOT NULL,
              completed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
            ) ENGINE=InnoDB
            """);
        boolean old=c.getAutoCommit();c.setAutoCommit(false);
        try {
            execute(c,"INSERT INTO identity_roles(code,display_name) VALUES ('USER','User thường'),('GUEST','Khách')");
            execute(c,"INSERT INTO identity_role_migration_journal(entity_type,entity_id,previous_role,next_role,previous_version) SELECT 'ACCOUNT',id,role_code,'USER',lock_version FROM identity_users WHERE role_code IN ('TESTER','DEV')");
            execute(c,"INSERT INTO identity_role_migration_journal(entity_type,entity_id,previous_role,next_role,previous_version) SELECT 'MEMBERSHIP',CAST(id AS CHAR),project_role,'USER',lock_version FROM project_memberships WHERE project_role IN ('TESTER','DEV')");
            execute(c,"DELETE s FROM SPRING_SESSION s JOIN identity_users u ON u.id=s.PRINCIPAL_NAME WHERE u.role_code IN ('TESTER','DEV')");
            execute(c,"UPDATE identity_users SET role_code='USER',lock_version=lock_version+1 WHERE role_code IN ('TESTER','DEV')");
            execute(c,"UPDATE project_memberships SET project_role='USER',lock_version=lock_version+1 WHERE project_role IN ('TESTER','DEV')");
            c.commit();
        } catch(Exception failure){c.rollback();throw failure;}
        finally{c.setAutoCommit(old);}
    }
    private static void execute(Connection connection,String sql) throws SQLException {
        try(var statement=connection.createStatement()){statement.execute(sql);}
    }
}
