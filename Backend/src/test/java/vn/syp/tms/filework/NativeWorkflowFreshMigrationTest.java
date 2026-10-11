package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Creates tables only in the caller's new, verified empty isolated test schema. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="fresh-migration")
class NativeWorkflowFreshMigrationTest {
    @Test void freshV29AllowsSplitSourcesAndRetainsUniqueRunOwnership()throws Exception {
        NativeFqDatabase.requireMode("fresh-migration");
        try(var c=NativeFqDatabase.connect()){
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")).isZero();
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema=DATABASE()")).isZero();
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.events WHERE event_schema=DATABASE()")).isZero();
            NativeFqDatabase.flyway("29").migrate();NativeFqDatabase.flyway("29").validate();
            assertThat(NativeFqDatabase.flyway("29").migrate().migrationsExecuted).isZero();
            assertThat(NativeFqFixture.scalar(c,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")).isEqualTo(29);
            c.setAutoCommit(false);
            try {
                var f=NativeFqFixture.seed(c,false);long run=f.run(c),first=f.group(c,run);
                long second=NativeFqFixture.insert(c,"INSERT INTO file_work_groups(project_id,document_id,cycle_id,configuration_id,created_by,created_at,updated_by,updated_at,request_key,request_checksum) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),'fresh-v29-second',REPEAT('d',64))",f.project,f.document,f.cycle,f.configuration,f.pmMember,f.pmMember);
                assertThat(first).isNotEqualTo(second);
                assertThatThrownBy(()->NativeFqFixture.update(c,"INSERT INTO file_work_group_items(project_id,group_id,document_id,cycle_id,configuration_id,import_row_id,run_item_id,test_case_id,revision_id) VALUES(?,?,?,?,?,?,?,?,?)",f.project,second,f.document,f.cycle,f.configuration,f.row,run,f.testCase,f.revision))
                    .isInstanceOfSatisfying(java.sql.SQLException.class,e->{assertThat(e.getErrorCode()).isEqualTo(1062);assertThat(e.getMessage()).contains("uq_fw_item_run");});
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM file_work_group_items WHERE project_id=? AND group_id=?",f.project,first)).isEqualTo(1);
            } finally {c.rollback();c.setAutoCommit(true);}
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM projects")).isZero();
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM file_work_groups")).isZero();
        }
    }
}
