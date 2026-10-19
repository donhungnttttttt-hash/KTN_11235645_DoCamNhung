package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Upgrade in the explicitly authorized empty schema. No clean(), no server provisioning. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="migration")
class NativeFeatureMigrationTest {
    @Test void copiesLatestContentAndWorkbooksIndependentlyPerCycleAndReportsMissingSource()throws Exception {
        String url=System.getenv("TMS_TEST_DB_URL"),user=System.getenv("TMS_TEST_DB_USER"),password=System.getenv("TMS_TEST_DB_PASSWORD");
        if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):3307/tms_docstest_(?:7cb4aee200db|670ffab81c69)\\?.+"))throw new IllegalStateException("Authorized migration schema required");
        try(var c=DriverManager.getConnection(url,user,password)) {
            long tables=NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()");
            if(tables!=0){assertThat(NativeFqFixture.scalar(c,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")).isEqualTo(30);assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM projects")).isZero();assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users")).isZero();}
            var v30=Flyway.configure().dataSource(url,user,password).target("30").cleanDisabled(true).load();assertThat(v30.migrate().migrationsExecuted).isEqualTo(tables==0?28:0);
            var f=NativeFqFixture.seed(c,true);long run=NativeFqFixture.scalar(c,"SELECT id FROM run_items WHERE project_id=? LIMIT 1",f.project);f.group(c,run);
            NativeFqFixture.update(c,"UPDATE test_case_revisions SET title_vi='Latest edited title' WHERE id=?",f.revision);
            NativeFqFixture.update(c,"INSERT INTO test_document_cell_edits(project_id,row_id,column_index,cell_value,lock_version) VALUES(?,?,10,'Latest cell overlay',2)",f.project,f.row);
            long second=NativeFqFixture.insert(c,"INSERT INTO test_cycles(project_id,code,name,created_at,created_by) VALUES(?,'C2','Second round',UTC_TIMESTAMP(6),?)",f.project,f.pmMember);
            long config=NativeFqFixture.insert(c,"INSERT INTO cycle_configurations(project_id,cycle_id,environment_id,device_id,default_build_id,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",f.project,second,f.environment,f.device,f.build);
            // Direct run has no file-work group: must still map the document to second Feature.
            NativeFqFixture.insert(c,"INSERT INTO run_items(project_id,cycle_id,configuration_id,test_case_id,revision_id,assignee_membership_id,created_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",f.project,second,config,f.testCase,f.revision,f.testerMember);
            NativeFqFixture.insert(c,"INSERT INTO test_cycles(project_id,code,name,created_at,created_by) VALUES(?,'EMPTY','Empty round',UTC_TIMESTAMP(6),?)",f.project,f.pmMember);
            var orphan=NativeFqFixture.seed(c,false);var bad=NativeFqFixture.seed(c,false);NativeFqFixture.update(c,"UPDATE import_batches SET source_workbook=NULL WHERE id=?",bad.document);
            var customers=List.of(customer(c,false),customer(c,true));
            long oldUsers=NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users"),oldIssues=NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM work_items"),oldAssets=NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_assets");
            var latest=Flyway.configure().dataSource(url,user,password).cleanDisabled(true).load();assertThat(latest.migrate().migrationsExecuted).isEqualTo(3);latest.validate();
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM testing_features WHERE project_id=?",f.project)).isEqualTo(3);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM import_batches WHERE source_batch_id=?",f.document)).isEqualTo(2);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(DISTINCT target_case_id) FROM import_rows WHERE source_import_row_id=?",f.row)).isEqualTo(2);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM testing_features WHERE project_id=? AND migration_key='ORPHAN'",orphan.project)).isEqualTo(1);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM import_batches WHERE source_batch_id=?",orphan.document)).isEqualTo(1);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM testing_migration_exceptions WHERE source_batch_id=? AND code='SOURCE_CONTENT_UNAVAILABLE'",bad.document)).isEqualTo(1);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM import_batches WHERE source_batch_id=?",bad.document)).isZero();
            try(var s=c.prepareStatement("SELECT b.id,b.source_workbook,r.title_vi,e.cell_value,ir.result_status,a.assignee_membership_id FROM import_batches b JOIN import_rows ir ON ir.project_id=b.project_id AND ir.batch_id=b.id JOIN test_cases tc ON tc.id=ir.target_case_id JOIN test_case_revisions r ON r.id=tc.current_revision_id JOIN test_document_cell_edits e ON e.row_id=ir.id JOIN test_document_assignments a ON a.row_id=ir.id WHERE b.source_batch_id=? ORDER BY b.id")){
                s.setLong(1,f.document);try(var rows=s.executeQuery()){int count=0;while(rows.next()){assertThat(rows.getBytes(2)).isEqualTo(f.source);assertThat(rows.getString(3)).isEqualTo("Latest edited title");assertThat(rows.getString(4)).isEqualTo("Latest cell overlay");assertThat(rows.getString(5)).isEqualTo("UNEXECUTED");assertThat(rows.getObject(6)).isNull();count++;}assertThat(count).isEqualTo(2);}}
            assertThat(NativeFqFixture.bytes(c,"SELECT source_workbook FROM import_batches WHERE id=?",f.document)).isEqualTo(f.source);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM identity_users")).isEqualTo(oldUsers);assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM work_items")).isEqualTo(oldIssues);assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM device_assets")).isEqualTo(oldAssets);
            assertThat(latest.migrate().migrationsExecuted).isZero();
            for(var customer:customers){
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM import_batches WHERE source_batch_id=?",customer.document)).isEqualTo(1);
                assertThat(NativeFqFixture.bytes(c,"SELECT source_workbook FROM import_batches WHERE source_batch_id=?",customer.document)).isEqualTo(customer.bytes);
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM import_rows r JOIN test_cases c ON c.project_id=r.project_id AND c.id=r.target_case_id JOIN test_case_revisions rv ON rv.project_id=c.project_id AND rv.id=c.current_revision_id JOIN test_document_cell_edits e ON e.project_id=r.project_id AND e.row_id=r.id WHERE r.source_import_row_id=? AND rv.title_vi='Latest customer title' AND e.column_index=? AND e.cell_value='Latest customer overlay'",customer.row,customer.column)).isEqualTo(1);
            }
        }
    }
    private record Customer(long document,long row,int column,byte[] bytes) {}
    private static Customer customer(Connection c,boolean tail)throws Exception{
        var f=NativeFqFixture.seed(c,false);byte[] bytes;
        try(var book=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(new vn.syp.tms.testcase.TestCaseWorkbook().customerTemplate()));var out=new java.io.ByteArrayOutputStream()){
            if(tail)book.getSheetAt(0).getRow(1).createCell(16).setCellValue("Data beyond final header");book.write(out);bytes=out.toByteArray();
        }
        var parsed=new vn.syp.tms.testcase.TestCaseWorkbook().parse(new org.springframework.mock.web.MockMultipartFile("file","customer.xlsx","application/octet-stream",bytes));
        NativeFqFixture.update(c,"UPDATE import_batches SET source_workbook=?,file_checksum=?,mapping_version='CUSTOMER_V1',sheet_name=? WHERE id=?",bytes,vn.syp.tms.testcase.TestCaseWorkbook.sha256(bytes),parsed.sheetName(),f.document);
        NativeFqFixture.update(c,"UPDATE import_rows SET raw_data_json=?,source_case_key='1' WHERE id=?",new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(parsed.rows().getFirst()),f.row);
        NativeFqFixture.update(c,"UPDATE test_case_revisions SET title_vi='Latest customer title' WHERE id=?",f.revision);
        int column=tail?16:13;NativeFqFixture.update(c,"INSERT INTO test_document_cell_edits(project_id,row_id,column_index,cell_value,lock_version) VALUES(?,?,?,'Latest customer overlay',2)",f.project,f.row,column);
        return new Customer(f.document,f.row,column,bytes);
    }
}
