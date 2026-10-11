package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static vn.syp.tms.workitem.WorkItemStore.number;

import java.sql.Connection;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.execution.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.testcase.*;

/** New writes only, on the guarded native test schema; every fixture rolls back. */
@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="integration")
class NativeExecutionDocumentResultTest {
    @DynamicPropertySource static void isolatedDatabase(DynamicPropertyRegistry registry)throws Exception {
        NativeWorkflowRepairTest.isolatedDatabase(registry);
    }
    @Autowired DataSource dataSource;
    @Autowired JdbcTemplate db;
    @Autowired ExecutionService execution;
    @Autowired TestDocumentService documents;
    NativeFqFixture f;
    long run;

    @BeforeEach void fixture()throws Exception {
        Connection connection=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try { f=NativeFqFixture.seed(connection,false); run=f.run(connection); }
        finally { DataSourceUtils.releaseConnection(connection,dataSource); }
        execution.activate(f.project,f.pm,f.cycle,new ExecutionDtos.Version(0L));
        db.update("UPDATE import_rows SET result_status='UNEXECUTED',result_version=0,result_updated_at='2000-01-01 00:00:00',result_updated_by=? WHERE id=?",f.pm,f.row);
    }

    @ParameterizedTest @ValueSource(strings={"OK","NG","P"})
    void newExecutionProjectsResultWithVersionActorAndHistoryButKeepsSource(String status) {
        String raw=db.queryForObject("SELECT raw_data_json FROM import_rows WHERE id=?",String.class,f.row);
        Object previousTime=result(f.row).get("result_updated_at");
        var saved=execution.record(f.project,f.tester,run,attempt(status,0));
        assertThat(result(f.row)).containsEntry("result_status",status).containsEntry("result_version",1L)
            .containsEntry("result_updated_by",f.tester).containsEntry("result_request_key",null);
        assertThat(result(f.row).get("result_updated_at")).isNotNull().isNotEqualTo(previousTime);
        assertThat(actions(f.row)).containsExactly("RESULT_UNEXECUTED_"+status);
        assertThat(db.queryForObject("SELECT actor_id FROM project_audit WHERE project_id=? AND entity_type='TEST_DOCUMENT_ROW' AND entity_id=?",String.class,f.project,f.row)).isEqualTo(f.tester);
        assertThat(db.queryForObject("SELECT latest_attempt_id FROM run_items WHERE id=?",Long.class,run)).isEqualTo(number(saved,"id"));
        assertThat(db.queryForObject("SELECT raw_data_json FROM import_rows WHERE id=?",String.class,f.row)).isEqualTo(raw);
        assertThat(db.queryForObject("SELECT source_workbook FROM import_batches WHERE id=?",byte[].class,f.document)).isEqualTo(f.source);
    }

    @Test void manualEditDoesNotChangeExecutionAndReplayDoesNotOverwriteManualResult() {
        var input=attempt("OK",0);
        var saved=execution.record(f.project,f.tester,run,input);
        var beforeRun=db.queryForMap("SELECT * FROM run_items WHERE id=?",run);
        var beforeAttempts=db.queryForList("SELECT * FROM execution_attempts WHERE project_id=?",f.project);
        documents.updateResult(f.project,f.tester,f.document,f.row,new TestDocumentDtos.UpdateResult("NG",1L,UUID.randomUUID().toString()));
        var manual=result(f.row);
        assertThat(number(execution.record(f.project,f.tester,run,input),"id")).isEqualTo(number(saved,"id"));
        assertThat(result(f.row)).isEqualTo(manual);
        assertThat(actions(f.row)).containsExactly("RESULT_UNEXECUTED_OK","RESULT_OK_NG");
        assertThat(db.queryForMap("SELECT * FROM run_items WHERE id=?",run)).isEqualTo(beforeRun);
        assertThat(db.queryForList("SELECT * FROM execution_attempts WHERE project_id=?",f.project)).isEqualTo(beforeAttempts);
    }

    @Test void executionInvalidatesAnEarlierManualVersionAndRejectsConflictingAttemptsWithoutProjection() {
        execution.record(f.project,f.tester,run,attempt("OK",0));
        var projected=result(f.row);
        assertThatThrownBy(()->documents.updateResult(f.project,f.tester,f.document,f.row,new TestDocumentDtos.UpdateResult("NG",0L,UUID.randomUUID().toString())))
            .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("DOCUMENT_RESULT_CONFLICT"));
        assertThatThrownBy(()->execution.record(f.project,f.tester,run,attempt("NG",0)))
            .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("VERSION_CONFLICT"));
        assertThatThrownBy(()->execution.record(f.project,f.tester,run,new ExecutionDtos.Attempt("NG",f.build,"","","",UUID.randomUUID().toString(),1L)))
            .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("ACTUAL_REQUIRED"));
        assertThat(result(f.row)).isEqualTo(projected);
        assertThat(actions(f.row)).hasSize(1);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,f.project)).isEqualTo(1);
    }

    @Test void projectionIncludesAllCommittedDocumentsForCaseAndExcludesOtherCasesProjectsAndPreviews()throws Exception {
        long otherCase,otherRow,committedRow,previewRow;
        NativeFqFixture foreign;
        Connection connection=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try {
            foreign=NativeFqFixture.seed(connection,false);
            otherCase=NativeFqFixture.insert(connection,"INSERT INTO test_cases(project_id,case_no,suite_id,created_at,updated_at) VALUES(?,'TC2',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project,f.suite);
            otherRow=addRow(connection,f.document,otherCase,3);
            committedRow=addRow(connection,addDocument(connection,"COMMITTED"),f.testCase,2);
            previewRow=addRow(connection,addDocument(connection,"PREVIEW"),f.testCase,2);
        } finally { DataSourceUtils.releaseConnection(connection,dataSource); }
        var other=result(otherRow);var preview=result(previewRow);var unrelated=result(foreign.row);
        execution.record(f.project,f.tester,run,attempt("NG",0));
        assertThat(result(f.row)).containsEntry("result_status","NG").containsEntry("result_version",1L);
        assertThat(result(committedRow)).containsEntry("result_status","NG").containsEntry("result_version",1L);
        assertThat(result(otherRow)).isEqualTo(other);
        assertThat(result(previewRow)).isEqualTo(preview);
        assertThat(result(foreign.row)).isEqualTo(unrelated);
        assertThat(actions(committedRow)).containsExactly("RESULT_UNEXECUTED_NG");
        assertThat(actions(otherRow)).isEmpty();assertThat(actions(previewRow)).isEmpty();
    }

    @Test void caseWithoutCommittedImportStillRecordsExecution() {
        db.update("UPDATE import_rows SET target_case_id=NULL WHERE id=?",f.row);
        var previous=result(f.row);
        var saved=execution.record(f.project,f.tester,run,attempt("OK",0));
        assertThat(saved).containsEntry("resultCode","OK");
        assertThat(result(f.row)).isEqualTo(previous);
        assertThat(actions(f.row)).isEmpty();
    }

    @Test void latestNewExecutionAcrossCyclesWinsWithoutBackfillingOrReplayingOldResults() {
        var second=execution.create(f.project,f.pm,new ExecutionDtos.CreateCycle("C2","Second tester",null));
        long cycle=number(second,"id");
        execution.configure(f.project,f.pm,cycle,new ExecutionDtos.Configuration(f.environment,f.device,f.otherBuild,0L));
        long config=number(execution.configurations(f.project,f.pm,cycle).getFirst(),"id");
        execution.addScope(f.project,f.pm,cycle,new ExecutionDtos.AddScope(config,List.of(f.revision),f.pmMember,1L));
        execution.activate(f.project,f.pm,cycle,new ExecutionDtos.Version(2L));
        long laterRun=number(execution.runs(f.project,f.pm,cycle,0,20,false,false).items().getFirst(),"id");
        assertThat(result(f.row)).containsEntry("result_status","UNEXECUTED").containsEntry("result_version",0L);
        var first=attempt("NG",0);execution.record(f.project,f.tester,run,first);
        execution.record(f.project,f.pm,laterRun,new ExecutionDtos.Attempt("OK",f.otherBuild,"Verified","","",UUID.randomUUID().toString(),0L));
        var newest=result(f.row);
        assertThat(newest).containsEntry("result_status","OK").containsEntry("result_version",2L).containsEntry("result_updated_by",f.pm);
        execution.record(f.project,f.tester,run,first);
        assertThat(result(f.row)).isEqualTo(newest);
        execution.record(f.project,f.tester,run,attempt("P",1));
        assertThat(result(f.row)).containsEntry("result_status","P").containsEntry("result_version",3L).containsEntry("result_updated_by",f.tester);
        assertThat(actions(f.row)).containsExactly("RESULT_UNEXECUTED_NG","RESULT_NG_OK","RESULT_OK_P");
    }

    private ExecutionDtos.Attempt attempt(String result,long version) {
        return new ExecutionDtos.Attempt(result,f.build,"Observed","Pending dependency","",UUID.randomUUID().toString(),version);
    }
    private Map<String,Object> result(long row) {
        return db.queryForMap("SELECT result_status,result_version,result_updated_by,result_updated_at,result_request_key FROM import_rows WHERE id=?",row);
    }
    private List<String> actions(long row) {
        return db.queryForList("SELECT action FROM project_audit WHERE project_id=? AND entity_type='TEST_DOCUMENT_ROW' AND entity_id=? ORDER BY id",String.class,f.project,row);
    }
    private long addDocument(Connection connection,String status)throws Exception {
        return NativeFqFixture.insert(connection,"INSERT INTO import_batches(project_id,file_name,file_checksum,status,staged_expires_at,imported_by,created_at) VALUES(?,'another.xlsx',REPEAT('a',64),?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6))",f.project,status,f.pm);
    }
    private long addRow(Connection connection,long document,long caseId,int sourceRow)throws Exception {
        return NativeFqFixture.insert(connection,"INSERT INTO import_rows(project_id,batch_id,source_row_number,raw_data_json,target_case_id,created_at) VALUES(?,?,?,'{}',?,UTC_TIMESTAMP(6))",f.project,document,sourceRow,caseId);
    }
}
