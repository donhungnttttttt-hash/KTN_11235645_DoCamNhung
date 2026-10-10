package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import java.sql.SQLException;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Empty, explicitly provisioned schema only; preserves V20 content during V21 upgrade. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="fresh-migration")
class NativeProjectLifecycleMigrationTest {
    static org.flywaydb.core.Flyway flyway(String version) {
        return org.flywaydb.core.Flyway.configure().dataSource(NativeFqDatabase.url(),NativeFqDatabase.user(),NativeFqDatabase.password())
            .locations("classpath:db/migration","classpath:db/demo").target(version).cleanDisabled(true).load();
    }
    @Test void v21PreservesV20DemoAndSourceAndEnforcesDecisionHistory() throws Exception {
        NativeFqDatabase.requireMode("fresh-migration");
        try(var c=NativeFqDatabase.connect()) {
            assertThat(NativeFqFixture.scalar(c,"SELECT GET_LOCK(CONCAT('native-fq-',DATABASE()),0)")).isEqualTo(1);
            try {
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")).isZero();
                assertThat(flyway("20").migrate().migrationsExecuted).isEqualTo(20);
                var source=NativeFqFixture.seed(c,false);
                var before=new LinkedHashMap<String,NativeFileWorkQaMigrationTest.Snapshot>();
                for(String table:List.of("identity_users","projects","project_memberships","import_batches","import_rows","run_items","execution_attempts","work_items","device_allocations","project_audit"))
                    before.put(table,NativeFileWorkQaMigrationTest.snapshot(c,table,null));
                var latest=flyway("21");
                assertThat(latest.migrate().migrationsExecuted).isEqualTo(1);latest.validate();
                assertThat(latest.migrate().migrationsExecuted).isZero();
                for(var entry:before.entrySet())assertThat(NativeFileWorkQaMigrationTest.snapshot(c,entry.getKey(),null)).as(entry.getKey()).isEqualTo(entry.getValue());
                assertThat(NativeFqFixture.bytes(c,"SELECT source_workbook FROM import_batches WHERE id=?",source.document)).isEqualTo(source.source);
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM project_lifecycle_decisions")).isZero();
                c.setAutoCommit(false);
                try {
                    long project=NativeFqFixture.scalar(c,"SELECT MIN(id) FROM projects");
                    String actor;
                    try(var s=c.createStatement();var r=s.executeQuery("SELECT id FROM identity_users WHERE role_code='ADMIN' ORDER BY id LIMIT 1")){r.next();actor=r.getString(1);}
                    String insert="INSERT INTO project_lifecycle_decisions(project_id,action,reason,expected_version,result_version,request_key,payload_hash,actor_id,decided_at) VALUES(?,?,?,?,?,?,REPEAT('a',64),?,UTC_TIMESTAMP(6))";
                    NativeFqFixture.update(c,insert,project,"ARCHIVE","Accepted",0,1,"migration-one",actor);
                    assertThatThrownBy(()->NativeFqFixture.update(c,insert,project,"ARCHIVE","Again",1,2,"migration-one",actor)).isInstanceOf(SQLException.class);
                    assertThatThrownBy(()->NativeFqFixture.update(c,insert,project,"REOPEN"," ",1,2,"migration-two",actor)).isInstanceOf(SQLException.class);
                    assertThatThrownBy(()->NativeFqFixture.update(c,insert,project,"DELETE","Invalid",1,2,"migration-two",actor)).isInstanceOf(SQLException.class);
                    assertThatThrownBy(()->NativeFqFixture.update(c,insert,project,"REOPEN","Invalid",1,3,"migration-two",actor)).isInstanceOf(SQLException.class);
                } finally {c.rollback();c.setAutoCommit(true);}
            } finally {NativeFqFixture.scalar(c,"SELECT RELEASE_LOCK(CONCAT('native-fq-',DATABASE()))");}
        }
    }
}
