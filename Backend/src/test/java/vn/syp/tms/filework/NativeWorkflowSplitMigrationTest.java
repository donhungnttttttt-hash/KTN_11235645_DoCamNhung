package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** One-way V28 -> V29 upgrade on an explicitly selected isolated native schema only. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_WORKFLOW_UPGRADE",matches="true")
class NativeWorkflowSplitMigrationTest {
    private static final List<String> TABLES=List.of("file_work_groups","file_work_group_items","run_items","import_batches","import_rows","execution_attempts","file_work_sessions");
    @Test void v28RejectsSplitThenUpgradePreservesEveryExistingWorkflowAndSourceRow()throws Exception {
        NativeFqDatabase.requireMode("integration");
        try(var c=NativeFqDatabase.connect()) {
            assertThat(NativeFqFixture.scalar(c,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")).isEqualTo(28);
            NativeFqDatabase.flyway("28").validate();
            Map<String,List<List<String>>> before=snapshot(c);
            c.setAutoCommit(false);
            try {
                var f=NativeFqFixture.seed(c,false);long run=f.run(c);f.group(c,run);
                // The old source UNIQUE rejects even an empty, separately keyed group in the same context.
                assertThatThrownBy(()->NativeFqFixture.insert(c,"INSERT INTO file_work_groups(project_id,document_id,cycle_id,configuration_id,created_by,created_at,updated_by,updated_at,request_key,request_checksum) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),'split-v28-second',REPEAT('d',64))",f.project,f.document,f.cycle,f.configuration,f.pmMember,f.pmMember))
                    .isInstanceOfSatisfying(SQLException.class,e->{assertThat(e.getErrorCode()).isEqualTo(1062);assertThat(e.getMessage()).contains("uq_fw_group_source");});
            } finally {c.rollback();c.setAutoCommit(true);}
            assertThat(snapshot(c)).isEqualTo(before);
            NativeFqDatabase.flyway("29").migrate();NativeFqDatabase.flyway("29").validate();
            assertThat(NativeFqFixture.scalar(c,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")).isEqualTo(29);
            assertThat(snapshot(c)).isEqualTo(before);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='file_work_groups' AND index_name='uq_fw_group_source'")).isZero();
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='file_work_groups' AND index_name='ix_fw_group_source' AND non_unique=1")).isEqualTo(4);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='file_work_group_items' AND index_name='uq_fw_item_run' AND non_unique=0")).isEqualTo(2);
        }
    }
    private static Map<String,List<List<String>>> snapshot(Connection c)throws SQLException {
        var result=new LinkedHashMap<String,List<List<String>>>();
        for(String table:TABLES){
            var rows=new ArrayList<List<String>>();
            try(var statement=c.createStatement();var rs=statement.executeQuery("SELECT * FROM "+table+" ORDER BY 1,2,3")){
                var metadata=rs.getMetaData();
                while(rs.next()){
                    var row=new ArrayList<String>();
                    for(int i=1;i<=metadata.getColumnCount();i++){
                        Object value=rs.getObject(i);
                        row.add(value instanceof byte[] bytes?HexFormat.of().formatHex(bytes):Objects.toString(value,"<NULL>"));
                    }
                    rows.add(row);
                }
            }
            result.put(table,rows);
        }
        return result;
    }
}
