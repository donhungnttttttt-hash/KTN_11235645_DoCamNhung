package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import java.io.*;
import java.sql.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import vn.syp.tms.testcase.TestCaseWorkbook;

@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="repair")
class NativeFeatureRepairMigrationTest {
    @Test void validCustomerPaddingExceptionRecoversWorkbookLatestRevisionAndOverlay()throws Exception{
        String url=System.getenv("TMS_TEST_DB_URL"),user=System.getenv("TMS_TEST_DB_USER"),password=System.getenv("TMS_TEST_DB_PASSWORD");
        if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):3307/tms_docstest_7cb4aee200db\\?.+"))throw new IllegalStateException("Authorized upgrade target required");
        try(var c=java.util.Objects.requireNonNull(DriverManager.getConnection(url,user,password))){
            assertThat(NativeFqFixture.scalar(c,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")).isEqualTo(32);
            var f=NativeFqFixture.seed(c,false);byte[] bytes;
            try(var book=new XSSFWorkbook(new ByteArrayInputStream(new TestCaseWorkbook().customerTemplate()));var out=new ByteArrayOutputStream()){
                var row=book.getSheetAt(0).getRow(1);row.getCell(2).setCellValue("Customer title");row.getCell(4).setCellValue("Steps");row.getCell(7).setCellValue("Expected");book.write(out);bytes=out.toByteArray();
            }
            var parsed=new TestCaseWorkbook().parse(new org.springframework.mock.web.MockMultipartFile("file","customer.xlsx","application/octet-stream",bytes));var input=parsed.rows().getFirst();
            assertThat(input.sourceCells()).hasSize(14);
            NativeFqFixture.update(c,"UPDATE import_batches SET source_workbook=?,mapping_version='CUSTOMER_V1',sheet_name=? WHERE id=?",bytes,parsed.sheetName(),f.document);
            NativeFqFixture.update(c,"UPDATE import_rows SET raw_data_json=?,source_case_key='1' WHERE id=?",new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(input),f.row);
            NativeFqFixture.update(c,"UPDATE test_case_revisions SET title_vi='Latest customer edit' WHERE id=?",f.revision);
            NativeFqFixture.update(c,"INSERT INTO test_document_cell_edits(project_id,row_id,column_index,cell_value,lock_version) VALUES(?,?,13,'Padded tail edit',2)",f.project,f.row);
            var legacyContext=org.mockito.Mockito.mock(org.flywaydb.core.api.migration.Context.class);org.mockito.Mockito.when(legacyContext.getConnection()).thenReturn(c);
            new db.migration.V32__copy_feature_documents().migrate(legacyContext);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM testing_migration_exceptions WHERE source_batch_id=? AND code='SOURCE_CONTENT_UNAVAILABLE'",f.document)).isEqualTo(1);
            var latest=Flyway.configure().dataSource(url,user,password).cleanDisabled(true).load();latest.migrate();latest.validate();
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM import_batches WHERE source_batch_id=?",f.document)).isEqualTo(1);
            assertThat(NativeFqFixture.bytes(c,"SELECT source_workbook FROM import_batches WHERE source_batch_id=?",f.document)).isEqualTo(bytes);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM import_rows r JOIN test_cases c ON c.project_id=r.project_id AND c.id=r.target_case_id JOIN test_case_revisions rv ON rv.project_id=c.project_id AND rv.id=c.current_revision_id JOIN test_document_cell_edits e ON e.project_id=r.project_id AND e.row_id=r.id WHERE r.source_import_row_id=? AND rv.title_vi='Latest customer edit' AND e.column_index=13 AND e.cell_value='Padded tail edit'",f.row)).isEqualTo(1);
            assertThat(latest.migrate().migrationsExecuted).isZero();
        }
    }
}
