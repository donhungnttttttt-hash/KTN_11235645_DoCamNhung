package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static vn.syp.tms.workitem.WorkItemStore.number;
import java.io.ByteArrayInputStream;
import java.util.*;
import javax.sql.DataSource;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.execution.*;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.qa.*;
import vn.syp.tms.retest.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.*;

/** Existing V19 isolated schema only. Every fixture and mutation rolls back with its test. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="integration")
class NativeFileWorkQaIntegrationTest {
    @DynamicPropertySource static void isolatedDatabaseBeforeSpring(DynamicPropertyRegistry r)throws Exception {
        NativeFqDatabase.requireMode("integration");
        // This is evaluated before context refresh, not BeforeEach after Flyway has run.
        try(var c=NativeFqDatabase.connect()) {
            assertThat(NativeFqFixture.scalar(c,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")).isEqualTo(19);
        }
        NativeFqDatabase.flyway("19").validate();
        r.add("spring.datasource.url",NativeFqDatabase::url);r.add("spring.datasource.username",NativeFqDatabase::user);r.add("spring.datasource.password",NativeFqDatabase::password);
        r.add("TMS_DB_URL",NativeFqDatabase::url);r.add("TMS_DB_USER",NativeFqDatabase::user);r.add("TMS_DB_PASSWORD",NativeFqDatabase::password);
        r.add("TMS_MIGRATION_USER",NativeFqDatabase::user);r.add("TMS_MIGRATION_PASSWORD",NativeFqDatabase::password);
        r.add("spring.flyway.enabled",()->"false");r.add("spring.sql.init.mode",()->"never");r.add("spring.jpa.hibernate.ddl-auto",()->"validate");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");
        r.add("tms.bootstrap.enabled",()->"false");r.add("tms.redmine.enabled",()->"false");
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");
    }
    @Autowired DataSource dataSource;@Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;
    @Autowired FileWorkService groups;@Autowired FileWorkSessionService sessions;@Autowired FileWorkExecutionService files;
    @Autowired ExecutionService execution;@Autowired WorkItemService work;@Autowired RetestService retest;@Autowired QaService qa;
    NativeFqFixture f;
    @BeforeEach void ownFixture()throws Exception {
        var connection=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try{f=NativeFqFixture.seed(connection,false);}finally{DataSourceUtils.releaseConnection(connection,dataSource);}
    }
    @ParameterizedTest @ValueSource(strings={"FULL_CASE","BUG_ONLY"})
    void fileSessionBugFixRetestAndClosureKeepCanonicalHistoryAndSource(String verificationScope)throws Exception {
        var create=new FileWorkDtos.Create(f.document,f.cycle,f.configuration,List.of(f.revision),f.testerMember,0L,"file-create-0001");
        assertThat(groups.preview(f.project,f.pm,create.scope())).containsEntry("valid",true);
        var detail=groups.create(f.project,f.pm,create);long group=number(map(detail,"group"),"id");
        assertThat(number(map(groups.create(f.project,f.pm,create),"group"),"id")).isEqualTo(group);
        long run=number(items(detail).getFirst(),"runItemId");
        var assigned=groups.assign(f.project,f.pm,group,new FileWorkDtos.Assignment(f.testerMember,"Confirm assignment",0L,List.of(new FileWorkDtos.RunVersion(run,0L)),"file-assign-0001"));
        assertThat(number(map(assigned,"group"),"version")).isEqualTo(1);
        execution.activate(f.project,f.pm,f.cycle,new ExecutionDtos.Version(version("test_cycles",f.cycle)));
        var start=new FileWorkDtos.Start(f.allocation,f.build,1L,"file-start-0001");
        var session=sessions.start(f.project,f.tester,group,start);long sessionId=number(session,"id");
        assertThat(number(sessions.start(f.project,f.tester,group,start),"id")).isEqualTo(sessionId);
        assertThat(session).containsEntry("state","DOING");
        session=sessions.pause(f.project,f.tester,sessionId,sessionCommand(session,"file-pause-0001"));
        assertThat(session).containsEntry("state","PAUSED");
        session=sessions.resume(f.project,f.tester,sessionId,sessionCommand(session,"file-resume-0001"));
        assertThat(session).containsEntry("state","DOING");
        long sessionVersion=number(session,"version");
        var ok=attempt(group,run,sessionId,sessionVersion,"OK","file-result-ok01");
        var pending=attempt(group,run,sessionId,sessionVersion,"P","file-result-p001");
        assertThat(jdbc.queryForObject("SELECT result_code FROM execution_attempts WHERE id=?",String.class,number(pending,"id"))).isEqualTo("P");
        var blocked= sessionCommand(session,"file-complete-p1");
        assertThatThrownBy(()->sessions.complete(f.project,f.tester,sessionId,blocked)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("COMPLETION_BLOCKED"));
        var ng=attempt(group,run,sessionId,sessionVersion,"NG","file-result-ng01");
        long ngId=number(ng,"id");
        assertThat(jdbc.queryForList("SELECT result_code FROM execution_attempts WHERE project_id=? AND run_item_id=? ORDER BY attempt_no",String.class,f.project,run)).containsExactly("OK","P","NG");
        assertThat(jdbc.queryForObject("SELECT file_work_session_id FROM execution_attempts WHERE id=?",Long.class,ngId)).isEqualTo(sessionId);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE id=?",Long.class,number(ok,"id"))).isEqualTo(1);
        var unlinked=sessionCommand(session,"file-complete-n1");
        assertThatThrownBy(()->sessions.complete(f.project,f.tester,sessionId,unlinked)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("COMPLETION_BLOCKED"));
        var bug=work.create(f.project,f.tester,new WorkItemDtos.Create("BUG","Observed native bug","Description","MEDIUM",null,null,null,"Steps","Expected","Observed",f.build,f.environment,f.device,f.revision,ngId,null,"native-bug-0001"));
        long bugId=number(bug,"id");
        assertThat(jdbc.queryForObject("SELECT attempt_id FROM work_item_execution_links WHERE project_id=? AND work_item_id=?",Long.class,f.project,bugId)).isEqualTo(ngId);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM work_item_execution_links WHERE project_id=? AND attempt_id=?",Long.class,f.project,number(ok,"id"))).isZero();
        session=sessions.complete(f.project,f.tester,sessionId,sessionCommand(session,"file-complete-01"));
        assertThat(session).containsEntry("state","COMPLETED");
        assertThat(jdbc.queryForList("SELECT action FROM file_work_history WHERE project_id=? AND group_id=? ORDER BY id",String.class,f.project,group)).containsExactly("CREATE","ASSIGN","START","PAUSE","RESUME","COMPLETE");
        assertExport(group,run,ngId);
        bug=work.update(f.project,f.pm,bugId,new WorkItemDtos.Update("Observed native bug","Description","MEDIUM",null,null,f.devMember,"Steps","Expected","Observed","Assign own fix",number(bug,"version")));
        bug=work.transition(f.project,f.dev,bugId,new WorkItemDtos.Transition("progress","Investigating",null,number(bug,"version")));
        bug=work.transition(f.project,f.dev,bugId,new WorkItemDtos.Transition("resolved","Fixed on selected build",f.otherBuild,number(bug,"version")));
        var coverage=retest.coverage(f.project,f.pm,bugId,new RetestDtos.Coverage(List.of(run),"Verify affected case",number(bug,"version")));
        long coverageId=number(map(coverage,"coverage"),"id"),coverageItem=number(items(coverage).getFirst(),"id");
        var request=retest.createRequest(f.project,f.pm,bugId,new RetestDtos.Request(coverageId,List.of(coverageItem),verificationScope,f.testerMember,"Verify fix",number(coverage,"bugVersion"),"native-retest-01"));
        long requestId=number(request,"id");
        long before=countAttempts(run);
        var submitted=retest.submit(f.project,f.tester,requestId,new RetestDtos.Submit(List.of(new RetestDtos.Result(coverageItem,"PASS","Verified fixed",null,version("run_items",run))),number(request,"version"),version("work_items",bugId),"native-submit-01",false,null));
        assertThat(submitted).containsEntry("status","SUBMITTED");
        if(verificationScope.equals("FULL_CASE")) {
            assertThat(countAttempts(run)).isEqualTo(before+1);
            assertThat(jdbc.queryForObject("SELECT result_code FROM execution_attempts WHERE project_id=? AND run_item_id=? AND build_id=?",String.class,f.project,run,f.otherBuild)).isEqualTo("OK");
            assertThat(jdbc.queryForObject("SELECT file_work_session_id FROM execution_attempts WHERE project_id=? AND run_item_id=? AND build_id=?",Long.class,f.project,run,f.otherBuild)).isNull();
        }else{
            assertThat(countAttempts(run)).isEqualTo(before);
            assertThat(jdbc.queryForObject("SELECT execution_attempt_id FROM bug_verification_attempts WHERE project_id=? AND request_id=?",Long.class,f.project,requestId)).isNull();
        }
        var closed=retest.close(f.project,f.pm,bugId,new RetestDtos.Closure("FIXED","Coverage passed",null,null,version("work_items",bugId)));
        assertThat(closed).containsEntry("status","closed");
        assertSourceUnchanged();
    }
    @Test void typedQaLifecyclePinsAnswerAndConfirmationThenInvalidatesOnReopenAndReassignment() {
        var created=qa.create(f.project,f.tester,new QaDtos.Create("Question","What is expected?","MEDIUM",null,null,f.document,null,null,f.revision,"qa-create-000001"));
        long id=created.item().id();assertThat(created.item().type()).isEqualTo("QA");
        var assigned=qa.assign(f.project,f.pm,id,new QaDtos.Assign(f.devMember,"Find answer",created.item().version(),"qa-assign-000001"));
        var started=qa.start(f.project,f.dev,id,new QaDtos.Command("Investigating",assigned.item().version(),"qa-start-000001"));
        var answered=qa.answer(f.project,f.dev,id,new QaDtos.Answer("Expected answer","spec section 1",started.item().version(),"qa-answer-000001"));
        long answerId=answered.currentAnswer().id(),answerVersion=answered.currentAnswer().answerVersion();
        assertThatThrownBy(()->qa.confirm(f.project,f.tester,id,new QaDtos.Confirm(answerId,answerVersion+1,"Wrong version",answered.item().version(),"qa-wrong-version"))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("ANSWER_VERSION_CONFLICT"));
        assertThat(qa.confirmations(f.project,f.pm,id,0,20).totalItems()).isZero();
        var confirmed=qa.confirm(f.project,f.tester,id,new QaDtos.Confirm(answerId,answerVersion,"Confirmed",answered.item().version(),"qa-confirm-00001"));
        assertThat(confirmed.currentConfirmation().answerId()).isEqualTo(answerId);
        var closed=qa.close(f.project,f.pm,id,new QaDtos.Close("Answer verified",false,confirmed.item().version(),"qa-close-0000001"));
        assertThat(closed.item().status()).isEqualTo("closed");
        var reopened=qa.reopen(f.project,f.pm,id,new QaDtos.Command("New question",closed.item().version(),"qa-reopen-000001"));
        assertThat(reopened.currentAnswer()).isNull();assertThat(reopened.currentConfirmation()).isNull();
        assertThat(reopened.item().generation()).isGreaterThan(answered.item().generation());
        var newAnswer=qa.answer(f.project,f.dev,id,new QaDtos.Answer("Revised answer","spec section 2",reopened.item().version(),"qa-answer-000002"));
        assertThat(newAnswer.currentAnswer().answerVersion()).isEqualTo(answerVersion+1);
        var reassigned=qa.assign(f.project,f.pm,id,new QaDtos.Assign(f.dev2Member,"Second reviewer",newAnswer.item().version(),"qa-assign-000002"));
        assertThat(reassigned.currentAnswer()).isNull();assertThat(reassigned.currentConfirmation()).isNull();
        assertThat(reassigned.item().generation()).isGreaterThan(newAnswer.item().generation());
        assertThat(qa.answers(f.project,f.pm,id,0,20).totalItems()).isEqualTo(2);
        assertThat(qa.confirmations(f.project,f.pm,id,0,20).totalItems()).isEqualTo(1);
        assertThatThrownBy(()->qa.confirm(f.project,f.tester,id,new QaDtos.Confirm(answerId,answerVersion,"Stale",reassigned.item().version(),"qa-stale-0000001"))).isInstanceOf(BusinessException.class);
    }
    @Test void revokedCurrentDevRoleCannotReplayPreviouslySuccessfulAnswer() {
        var created=qa.create(f.project,f.tester,new QaDtos.Create("Question","Expected?","MEDIUM",null,null,null,null,null,null,"qa-revoke-create"));
        long id=created.item().id();var assigned=qa.assign(f.project,f.pm,id,new QaDtos.Assign(f.devMember,"Answer",created.item().version(),"qa-revoke-assign"));
        var input=new QaDtos.Answer("Answer","basis",assigned.item().version(),"qa-revoke-answer");
        var answer=qa.answer(f.project,f.dev,id,input);
        assertThat(qa.answer(f.project,f.dev,id,input).currentAnswer().id()).isEqualTo(answer.currentAnswer().id());
        jdbc.update("UPDATE identity_users SET role_code='TESTER' WHERE id=?",f.dev);
        assertThatThrownBy(()->qa.answer(f.project,f.dev,id,input)).isInstanceOf(BusinessException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM qa_answers WHERE project_id=? AND work_item_id=?",Long.class,f.project,id)).isEqualTo(1);
    }
    @Test void httpRequiresAuthenticationCsrfAndCurrentTesterRoleBeforeQaCreate()throws Exception {
        String endpoint="/api/v1/projects/"+f.project+"/qa";
        mvc.perform(get(endpoint)).andExpect(status().isUnauthorized());
        String body="{\"title\":\"HTTP QA\",\"question\":\"Expected?\",\"priority\":\"MEDIUM\",\"requestKey\":\"http-qa-create01\"}";
        mvc.perform(post(endpoint).with(actor(f.tester,"TESTER")).contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post(endpoint).with(actor(f.tester,"TESTER")).with(Objects.requireNonNull(csrf())).contentType("application/json").content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.item.type").value("QA"));
        jdbc.update("UPDATE project_memberships SET project_role='DEV' WHERE id=?",f.testerMember);
        mvc.perform(post(endpoint).with(actor(f.tester,"TESTER")).with(Objects.requireNonNull(csrf())).contentType("application/json").content(body)).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM qa_details WHERE project_id=?",Long.class,f.project)).isEqualTo(1);
    }
    private Map<String,Object> attempt(long group,long run,long session,long sv,String result,String key){return files.record(f.project,f.tester,group,run,new FileWorkExecutionService.FileAttempt(session,sv,result,f.build,"Observed","Pending dependency","native-evidence",key,version("run_items",run)));}
    private FileWorkDtos.SessionCommand sessionCommand(Map<String,Object> session,String key){return new FileWorkDtos.SessionCommand(number(session,"version"),number(session,"groupVersion"),"Native transition",key);}
    private void assertExport(long group,long run,long attempt)throws Exception {
        // Move library head after pinning; export must still show revision 1.
        var c=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try{long newer=NativeFqFixture.insert(c,"INSERT INTO test_case_revisions(project_id,test_case_id,revision_no,title_vi,steps_vi,expected_vi,created_at,created_by) VALUES(?,?,2,'New library title','New steps','New expected',UTC_TIMESTAMP(6),?)",f.project,f.testCase,f.pmMember);NativeFqFixture.update(c,"UPDATE test_cases SET current_revision_id=? WHERE id=?",newer,f.testCase);}finally{DataSourceUtils.releaseConnection(c,dataSource);}
        var exported=files.export(f.project,f.tester,group,f.build);
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(exported.content()))){
            assertThat(book.getSheet("TestCases").getRow(1).getCell(2).getStringCellValue()).isEqualTo("Pinned title");
            var meta=book.getSheet("TMS Execution");assertThat(meta).isNotNull();
            int header=-1;for(var row:meta)if(row.getCell(0)!=null&&row.getCell(0).getStringCellValue().equals("rowNumber"))header=row.getRowNum();
            assertThat(header).isGreaterThan(0);var values=meta.getRow(header+1);
            assertThat(values.getCell(2).getStringCellValue()).isEqualTo(Long.toString(run));
            assertThat(values.getCell(3).getStringCellValue()).isEqualTo(Long.toString(f.revision));
            assertThat(values.getCell(4).getStringCellValue()).isEqualTo("NG");
            assertThat(values.getCell(5).getStringCellValue()).isEqualTo(Long.toString(attempt));
            assertThat(values.getCell(10).getStringCellValue()).isEqualTo(Long.toString(f.build));
            assertThat(values.getCell(13).getStringCellValue()).isEqualTo("FILE_SESSION");
        }
        var alternate=files.view(f.project,f.tester,group,f.otherBuild);
        assertThat(items(alternate).getFirst()).containsEntry("resultCode","NOT_RUN");
        assertSourceUnchanged();
    }
    private void assertSourceUnchanged(){assertThat(jdbc.queryForObject("SELECT source_workbook FROM import_batches WHERE id=?",byte[].class,f.document)).isEqualTo(f.source);assertThat(jdbc.queryForMap("SELECT result_status,result_version FROM import_rows WHERE id=?",f.row)).containsEntry("result_status","FIXED").containsEntry("result_version",3L);}
    private long version(String table,long id){if(!Set.of("test_cycles","run_items","work_items").contains(table))throw new IllegalArgumentException("Unknown version table");return Objects.requireNonNull(jdbc.queryForObject("SELECT lock_version FROM "+table+" WHERE id=?",Long.class,id));}
    private long countAttempts(long run){return Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=? AND run_item_id=?",Long.class,f.project,run));}
    @SuppressWarnings("unchecked")private static Map<String,Object> map(Map<String,Object> value,String key){return (Map<String,Object>)value.get(key);}
    @SuppressWarnings("unchecked")private static List<Map<String,Object>> items(Map<String,Object> value){return (List<Map<String,Object>>)value.get(value.containsKey("rows")?"rows":"items");}
    private @org.springframework.lang.NonNull RequestPostProcessor actor(String id,String role){return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(id,0L),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)))));}
}
