package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import static vn.syp.tms.workitem.WorkItemStore.number;
import java.io.ByteArrayInputStream;
import java.util.*;
import javax.sql.DataSource;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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

/** Existing V29 isolated schema only. Every fixture and mutation rolls back with its test. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="integration")
class NativeFileWorkQaIntegrationTest {
    @DynamicPropertySource static void isolatedDatabaseBeforeSpring(DynamicPropertyRegistry r)throws Exception {
        NativeFqDatabase.requireMode("integration");
        // This is evaluated before context refresh, not BeforeEach after Flyway has run.
        try(var c=NativeFqDatabase.connect()) {
            assertThat(NativeFqFixture.scalar(c,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")).isEqualTo(29);
        }
        NativeFqDatabase.flyway("29").validate();
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
    @Test void realExcelImportBecomesAssignableSourceAndKeepsItsRunAndResultLinks() throws Exception {
        byte[] workbook;
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(f.source));var out=new java.io.ByteArrayOutputStream()) {
            book.getSheetAt(0).getRow(1).getCell(0).setCellValue("TC-IMPORTED");
            book.write(out);workbook=out.toByteArray();
        }
        String base="/api/v1/projects/"+f.project;
        var upload=new org.springframework.mock.web.MockMultipartFile("file","linked-source.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",workbook);
        var response=mvc.perform(multipart(base+"/import-previews").file(upload).with(actor(f.pm,"PM")).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.errorRows").value(0)).andReturn();
        long document=new com.fasterxml.jackson.databind.ObjectMapper().readTree(response.getResponse().getContentAsByteArray()).get("id").asLong();
        mvc.perform(post(base+"/import-previews/"+document+"/commit").with(actor(f.pm,"PM")).with(csrf())).andExpect(status().isOk());
        mvc.perform(get(base+"/test-documents").param("keyword","linked-source").with(actor(f.pm,"PM")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(document));
        mvc.perform(get(base+"/file-work-groups").param("documentId",Long.toString(document)).with(actor(f.pm,"PM")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        long caseId=Objects.requireNonNull(jdbc.queryForObject("SELECT target_case_id FROM import_rows WHERE batch_id=?",Long.class,document));
        long revision=Objects.requireNonNull(jdbc.queryForObject("SELECT current_revision_id FROM test_cases WHERE id=?",Long.class,caseId));
        mvc.perform(post(base+"/test-cases/"+caseId+"/revisions/"+revision+"/approve").with(actor(f.pm,"PM")).with(csrf())).andExpect(status().isOk());
        var assigned=groups.create(f.project,f.pm,new FileWorkDtos.Create(document,f.cycle,f.configuration,List.of(revision),f.testerMember,0L,"real-import-assign"));
        long group=number(map(assigned,"group"),"id"),run=number(items(assigned).getFirst(),"runItemId");
        mvc.perform(get(base+"/file-work-groups").param("documentId",Long.toString(document)).with(actor(f.pm,"PM")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].documentId").value(document));
        execution.activate(f.project,f.pm,f.cycle,new ExecutionDtos.Version(version("test_cycles",f.cycle)));
        var session=sessions.start(f.project,f.tester,group,new FileWorkDtos.Start(f.allocation,f.build,number(map(assigned,"group"),"version"),"real-import-start"));
        var result=attempt(group,run,number(session,"id"),number(session,"version"),"OK","real-import-result");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM file_work_group_items i JOIN import_rows r ON r.id=i.import_row_id JOIN run_items run ON run.id=i.run_item_id JOIN execution_attempts a ON a.id=run.latest_attempt_id WHERE i.group_id=? AND r.batch_id=? AND r.target_case_id=run.test_case_id AND run.revision_id=? AND a.id=? AND a.result_code='OK'",Long.class,group,document,revision,number(result,"id"))).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT source_workbook FROM import_batches WHERE id=?",byte[].class,document)).isEqualTo(workbook);
    }
    @Test void genericRunAssignmentCannotBypassAnOpenFileSession() {
        var detail=groups.create(f.project,f.pm,new FileWorkDtos.Create(f.document,f.cycle,f.configuration,List.of(f.revision),f.testerMember,0L,"group-assignment-guard"));
        long group=number(map(detail,"group"),"id"),run=number(items(detail).getFirst(),"runItemId");
        execution.activate(f.project,f.pm,f.cycle,new ExecutionDtos.Version(version("test_cycles",f.cycle)));
        var session=sessions.start(f.project,f.tester,group,new FileWorkDtos.Start(f.allocation,f.build,number(map(detail,"group"),"version"),"group-assignment-start"));
        assertThatThrownBy(()->execution.assign(f.project,f.pm,run,new ExecutionDtos.Assignment(f.pmMember,"Bypass active file session",version("run_items",run))))
            .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("FILE_GROUP_ASSIGNMENT_REQUIRED"));
        assertThat(jdbc.queryForObject("SELECT assignee_membership_id FROM run_items WHERE id=?",Long.class,run)).isEqualTo(f.testerMember);
        assertThat(jdbc.queryForObject("SELECT state FROM file_work_sessions WHERE id=?",String.class,number(session,"id"))).isEqualTo("DOING");
    }
    NativeFqFixture f;
    @BeforeEach void ownFixture()throws Exception {
        var connection=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try{f=NativeFqFixture.seed(connection,false);}finally{DataSourceUtils.releaseConnection(connection,dataSource);}
    }
    @ParameterizedTest @CsvSource({"FULL_CASE,false","BUG_ONLY,false","FULL_CASE,true","BUG_ONLY,true"})
    void fileSessionBugFixRetestAndClosureKeepCanonicalHistoryAndSource(String verificationScope,boolean adminExecutes)throws Exception {
        if(adminExecutes) {
            jdbc.update("UPDATE identity_users SET role_code='ADMIN' WHERE id=?",f.pm);
            jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",f.pmMember);
        }
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
        String inbox="/api/v1/projects/"+f.project+"/action-inbox";
        mvc.perform(get(inbox).param("kind","BUG").with(actor(f.dev,"DEV"))).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(bugId));
        bug=work.transition(f.project,f.dev,bugId,new WorkItemDtos.Transition("resolved","Fixed on selected build",f.otherBuild,number(bug,"version")));
        mvc.perform(get(inbox).param("kind","BUG").with(actor(f.dev,"DEV"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        var coverage=retest.coverage(f.project,f.pm,bugId,new RetestDtos.Coverage(List.of(run),"Verify affected case",number(bug,"version")));
        long coverageId=number(map(coverage,"coverage"),"id"),coverageItem=number(items(coverage).getFirst(),"id");
        var request=retest.createRequest(f.project,f.pm,bugId,new RetestDtos.Request(coverageId,List.of(coverageItem),verificationScope,f.testerMember,"Verify fix",number(coverage,"bugVersion"),"native-retest-01"));
        long requestId=number(request,"id");
        mvc.perform(get(inbox).param("kind","RETEST").with(actor(f.tester,"TESTER"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(requestId)).andExpect(jsonPath("$.items[0].targetId").value(bugId));
        mvc.perform(get(inbox).param("kind","RETEST").with(actor(f.dev,"DEV"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        long before=countAttempts(run);
        if(adminExecutes) {
            assertThat(retest.request(f.project,f.pm,requestId)).containsEntry("canSubmit",true);
        }
        var submitted=retest.submit(f.project,adminExecutes?f.pm:f.tester,requestId,new RetestDtos.Submit(List.of(new RetestDtos.Result(coverageItem,"PASS","Verified fixed",null,version("run_items",run))),number(request,"version"),version("work_items",bugId),"native-submit-01",false,null));
        assertThat(submitted).containsEntry("status","SUBMITTED");
        assertThat(jdbc.queryForObject("SELECT verified_by FROM bug_verification_attempts WHERE project_id=? AND request_id=?",Long.class,f.project,requestId)).isEqualTo(adminExecutes?f.pmMember:f.testerMember);
        assertThat(jdbc.queryForObject("SELECT assignee_membership_id FROM run_items WHERE id=?",Long.class,run)).isEqualTo(f.testerMember);
        mvc.perform(get(inbox).param("kind","RETEST").with(actor(f.tester,"TESTER"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        if(verificationScope.equals("FULL_CASE")) {
            assertThat(countAttempts(run)).isEqualTo(before+1);
            assertThat(jdbc.queryForObject("SELECT result_code FROM execution_attempts WHERE project_id=? AND run_item_id=? AND build_id=?",String.class,f.project,run,f.otherBuild)).isEqualTo("OK");
            assertThat(jdbc.queryForObject("SELECT executor_membership_id FROM execution_attempts WHERE project_id=? AND run_item_id=? AND build_id=?",Long.class,f.project,run,f.otherBuild)).isEqualTo(adminExecutes?f.pmMember:f.testerMember);
            assertThat(jdbc.queryForObject("SELECT file_work_session_id FROM execution_attempts WHERE project_id=? AND run_item_id=? AND build_id=?",Long.class,f.project,run,f.otherBuild)).isNull();
        }else{
            assertThat(countAttempts(run)).isEqualTo(before);
            assertThat(jdbc.queryForObject("SELECT execution_attempt_id FROM bug_verification_attempts WHERE project_id=? AND request_id=?",Long.class,f.project,requestId)).isNull();
        }
        var closed=retest.close(f.project,f.pm,bugId,new RetestDtos.Closure("FIXED","Coverage passed",null,null,version("work_items",bugId)));
        assertThat(closed).containsEntry("status","closed");
        assertSourceUnchanged();
        assertDocumentResult(verificationScope.equals("FULL_CASE")?"OK":"NG",verificationScope.equals("FULL_CASE")?7L:6L);
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
    @Test void preparationUsesCurrentProjectDataAndRequiresPm() throws Exception {
        String endpoint="/api/v1/projects/"+f.project+"/file-work-groups/preparation";
        mvc.perform(get(endpoint)).andExpect(status().isUnauthorized());
        mvc.perform(get(endpoint).with(actor(f.tester,"TESTER"))).andExpect(status().isForbidden());
        mvc.perform(get(endpoint).with(actor(f.pm,"PM"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.counts.documents").value(1)).andExpect(jsonPath("$.counts.approvedCases").value(1))
            .andExpect(jsonPath("$.counts.testers").value(1)).andExpect(jsonPath("$.counts.configuredDraftCycles").value(1))
            .andExpect(jsonPath("$.counts.assignedGroups").value(0)).andExpect(jsonPath("$.asOf").exists());
        jdbc.update("UPDATE builds SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",f.build);
        jdbc.update("UPDATE test_case_revisions SET approved_at=NULL,approved_by=NULL WHERE id=?",f.revision);
        mvc.perform(get(endpoint).with(actor(f.pm,"PM"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.counts.approvedCases").value(0)).andExpect(jsonPath("$.counts.configuredDraftCycles").value(0));
        jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",f.pmMember);
        mvc.perform(get(endpoint).with(actor(f.pm,"PM"))).andExpect(status().isNotFound());
    }
    @Test void actionInboxFollowsQaHandoffsAndNeverShowsAnotherDevAssignment() throws Exception {
        var created=qa.create(f.project,f.tester,new QaDtos.Create("Inbox question","Expected?","MEDIUM",null,null,null,null,null,null,"inbox-qa-create"));
        long id=created.item().id();
        var assigned=qa.assign(f.project,f.pm,id,new QaDtos.Assign(f.devMember,"Answer",created.item().version(),"inbox-qa-assign"));
        String endpoint="/api/v1/projects/"+f.project+"/action-inbox";
        mvc.perform(get(endpoint).with(actor(f.dev,"DEV"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].kind").value("QA"));
        mvc.perform(get(endpoint).with(actor(f.dev2,"DEV"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        qa.answer(f.project,f.dev,id,new QaDtos.Answer("Confirmed answer","basis",assigned.item().version(),"inbox-qa-answer"));
        mvc.perform(get(endpoint).with(actor(f.tester,"TESTER"))).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(id));
        mvc.perform(get(endpoint).with(actor(f.dev,"DEV"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        mvc.perform(get(endpoint).param("page","-1").with(actor(f.pm,"PM"))).andExpect(status().isUnprocessableEntity());
        jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",f.testerMember);
        mvc.perform(get(endpoint).with(actor(f.tester,"TESTER"))).andExpect(status().isNotFound());
    }
    @Test void actionInboxPaginatesProjectWorkAndChecksCurrentRoles() throws Exception {
        groups.create(f.project,f.pm,new FileWorkDtos.Create(f.document,f.cycle,f.configuration,List.of(f.revision),f.testerMember,0L,"inbox-file-create"));
        qa.create(f.project,f.tester,new QaDtos.Create("Question 1","Expected?","MEDIUM",null,null,null,null,null,null,"inbox-question01"));
        qa.create(f.project,f.tester,new QaDtos.Create("Question 2","Expected?","MEDIUM",null,null,null,null,null,null,"inbox-question02"));
        String endpoint="/api/v1/projects/"+f.project+"/action-inbox";
        mvc.perform(get(endpoint).param("size","1").param("page","2").with(actor(f.pm,"PM"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalItems").value(3)).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.projectWide").value(true));
        mvc.perform(get(endpoint).param("kind","FILE").with(actor(f.tester,"TESTER"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get(endpoint).param("kind","FILE").with(actor(f.dev,"DEV"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        jdbc.update("UPDATE identity_users SET role_code='DEV' WHERE id=?",f.tester);
        mvc.perform(get(endpoint).param("kind","FILE").with(actor(f.tester,"TESTER"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        jdbc.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",f.project);
        mvc.perform(get(endpoint).with(actor(f.pm,"PM"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0)).andExpect(jsonPath("$.archived").value(true));
    }
    @Test void fileGroupShowsNamesForSelectedBuildWithoutChangingExecutionAuthority() {
        var detail=groups.create(f.project,f.pm,new FileWorkDtos.Create(f.document,f.cycle,f.configuration,List.of(f.revision),f.testerMember,0L,"readable-group-01"));
        long group=number(map(detail,"group"),"id");
        assertThat(map(detail,"group")).containsEntry("environmentName","QA").containsEntry("deviceName","iPad").containsEntry("selectedBuildLabel","1");
        assertThat(groups.executionSummary(f.project,f.tester,group,f.otherBuild)).containsEntry("selectedBuildLabel","2");
        assertSourceUnchanged();
        assertDocumentResult("FIXED",3L);
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
        assertDocumentResult("NG",6L);
    }
    private void assertSourceUnchanged(){assertThat(jdbc.queryForObject("SELECT source_workbook FROM import_batches WHERE id=?",byte[].class,f.document)).isEqualTo(f.source);}
    private void assertDocumentResult(String result,long version){assertThat(jdbc.queryForMap("SELECT result_status,result_version FROM import_rows WHERE id=?",f.row)).containsEntry("result_status",result).containsEntry("result_version",version);}
    private long version(String table,long id){if(!Set.of("test_cycles","run_items","work_items").contains(table))throw new IllegalArgumentException("Unknown version table");return Objects.requireNonNull(jdbc.queryForObject("SELECT lock_version FROM "+table+" WHERE id=?",Long.class,id));}
    private long countAttempts(long run){return Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=? AND run_item_id=?",Long.class,f.project,run));}
    @SuppressWarnings("unchecked")private static Map<String,Object> map(Map<String,Object> value,String key){return (Map<String,Object>)value.get(key);}
    @SuppressWarnings("unchecked")private static List<Map<String,Object>> items(Map<String,Object> value){return (List<Map<String,Object>>)value.get(value.containsKey("rows")?"rows":"items");}
    private @org.springframework.lang.NonNull RequestPostProcessor actor(String id,String role){return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(id,0L),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)))));}
}
