package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import static vn.syp.tms.workitem.WorkItemStore.number;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Connection;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.shared.web.BusinessException;

/** Dedicated V29 native schema; all business fixtures roll back after each test. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="integration")
class NativeWorkflowRepairTest {
    @DynamicPropertySource static void isolatedDatabase(DynamicPropertyRegistry r)throws Exception {
        NativeFqDatabase.requireMode("integration");
        try(var c=NativeFqDatabase.connect()) {
            assertThat(NativeFqFixture.scalar(c,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")).isEqualTo(29);
        }
        NativeFqDatabase.flyway("29").validate();
        r.add("spring.datasource.url",NativeFqDatabase::url);r.add("spring.datasource.username",NativeFqDatabase::user);r.add("spring.datasource.password",NativeFqDatabase::password);
        r.add("TMS_DB_URL",NativeFqDatabase::url);r.add("TMS_DB_USER",NativeFqDatabase::user);r.add("TMS_DB_PASSWORD",NativeFqDatabase::password);
        r.add("TMS_MIGRATION_USER",NativeFqDatabase::user);r.add("TMS_MIGRATION_PASSWORD",NativeFqDatabase::password);
        r.add("spring.flyway.enabled",()->"false");r.add("spring.sql.init.mode",()->"never");r.add("spring.jpa.hibernate.ddl-auto",()->"validate");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("tms.bootstrap.enabled",()->"false");r.add("tms.redmine.enabled",()->"false");
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");
    }
    @Autowired DataSource dataSource;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired FileWorkService groups;
    NativeFqFixture f;
    Row second;
    record Row(long row,long revision,long caseId) {}

    @BeforeEach void ownFixture()throws Exception {
        var c=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try {f=NativeFqFixture.seed(c,false);second=addRow(c,"TC2",3);}
        finally {DataSourceUtils.releaseConnection(c,dataSource);}
    }
    private Row addRow(Connection c,String code,int sourceRow)throws Exception {
        long caseId=NativeFqFixture.insert(c,"INSERT INTO test_cases(project_id,case_no,suite_id,created_at,updated_at) VALUES(?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project,code,f.suite);
        long revision=NativeFqFixture.insert(c,"INSERT INTO test_case_revisions(project_id,test_case_id,revision_no,title_vi,steps_vi,expected_vi,approved_at,approved_by,created_at,created_by) VALUES(?,?,1,'Range case','Steps','Expected',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)",f.project,caseId,f.pmMember,f.pmMember);
        NativeFqFixture.update(c,"UPDATE test_cases SET current_revision_id=? WHERE id=?",revision,caseId);
        String raw=json.writeValueAsString(Map.of("caseNo",code,"suiteCode","S1","titleVi","Source range","stepsVi","Steps","expectedVi","Expected"));
        long row=NativeFqFixture.insert(c,"INSERT INTO import_rows(project_id,batch_id,source_row_number,source_case_key,suite_code,raw_data_json,target_case_id,created_at) VALUES(?,?,?,?,'S1',?,?,UTC_TIMESTAMP(6))",f.project,f.document,sourceRow,code,raw,caseId);
        NativeFqFixture.update(c,"UPDATE import_batches SET total_rows=total_rows+1,valid_rows=valid_rows+1 WHERE id=?",f.document);
        return new Row(row,revision,caseId);
    }
    @SuppressWarnings("unchecked") private static Map<String,Object> group(Map<String,Object> detail){return (Map<String,Object>)detail.get("group");}
    private long cycleVersion(){return Objects.requireNonNull(jdbc.queryForObject("SELECT lock_version FROM test_cycles WHERE id=?",Long.class,f.cycle));}
    private FileWorkDtos.Create range(List<Long> revisions,long tester,String key){return new FileWorkDtos.Create(f.document,f.cycle,f.configuration,revisions,tester,cycleVersion(),key);}
    @NonNull private RequestPostProcessor actor(String id,String role){return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(id,0),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)))));}
    @NonNull private String approvals(){return "/api/v1/projects/"+f.project+"/test-documents/"+f.document+"/approvals";}
    private Map<String,Object> pin(long row,long revision){return Map.of("rowId",row,"expectedRevisionId",revision);}
    @SafeVarargs @NonNull private final String selection(Map<String,Object>...pins)throws Exception{return Objects.requireNonNull(json.writeValueAsString(Map.of("rows",List.of(pins))));}
    private void draft(){jdbc.update("UPDATE test_case_revisions SET approved_at=NULL,approved_by=NULL WHERE id IN (?,?)",f.revision,second.revision());}
    private long approvedCount(){return Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM test_case_revisions WHERE id IN (?,?) AND approved_at IS NOT NULL",Long.class,f.revision,second.revision()));}

    @Test void disjointRangesInOneDocumentAndConfigurationKeepDifferentTestersAndOriginalGroups()throws Exception {
        Row third,fourth;
        var c=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try {third=addRow(c,"TC3",4);fourth=addRow(c,"TC4",5);}finally {DataSourceUtils.releaseConnection(c,dataSource);}
        jdbc.update("UPDATE identity_users SET role_code='TESTER' WHERE id=?",f.dev2);
        jdbc.update("UPDATE project_memberships SET project_role='TESTER' WHERE id=?",f.dev2Member);
        byte[] source=jdbc.queryForObject("SELECT source_workbook FROM import_batches WHERE id=?",byte[].class,f.document);
        var first=groups.create(f.project,f.pm,range(List.of(f.revision,second.revision()),f.testerMember,"workflow-range-first"));
        var before=jdbc.queryForList("SELECT * FROM file_work_group_items WHERE project_id=? ORDER BY group_id,run_item_id",f.project);
        var next=groups.create(f.project,f.pm,range(List.of(third.revision(),fourth.revision()),f.dev2Member,"workflow-range-second"));
        assertThat(number(group(next),"id")).isNotEqualTo(number(group(first),"id"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM file_work_groups WHERE project_id=? AND document_id=? AND cycle_id=? AND configuration_id=?",Long.class,f.project,f.document,f.cycle,f.configuration)).isEqualTo(2);
        assertThat(jdbc.queryForList("SELECT assignee_membership_id FROM run_items WHERE project_id=? ORDER BY test_case_id",Long.class,f.project)).containsExactly(f.testerMember,f.testerMember,f.dev2Member,f.dev2Member);
        assertThat(jdbc.queryForList("SELECT * FROM file_work_group_items WHERE project_id=? AND group_id=? ORDER BY group_id,run_item_id",f.project,number(group(first),"id"))).isEqualTo(before);
        long version=cycleVersion();
        var duplicate=range(List.of(second.revision(),third.revision()),f.dev2Member,"workflow-overlap-rejected");
        assertThatThrownBy(()->groups.create(f.project,f.pm,duplicate)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("DUPLICATE_SCOPE"));
        assertThat(cycleVersion()).isEqualTo(version);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM file_work_groups WHERE project_id=?",Long.class,f.project)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM run_items WHERE project_id=?",Long.class,f.project)).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT source_workbook FROM import_batches WHERE id=?",byte[].class,f.document)).isEqualTo(source);
        assertThat(number(group(groups.detail(f.project,f.pm,number(group(first),"id"))),"id")).isEqualTo(number(group(first),"id"));
    }

    @ParameterizedTest @ValueSource(strings={"PM","ADMIN"})
    void bulkApprovalsAllowPmAndGlobalAdminAndAttributeBothRevisions(String role)throws Exception {
        draft();
        if(role.equals("ADMIN")){jdbc.update("UPDATE identity_users SET role_code='ADMIN' WHERE id=?",f.pm);jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",f.pmMember);}
        mvc.perform(post(approvals()).with(actor(f.pm,role)).with(csrf()).contentType("application/json").content(selection(pin(f.row,f.revision),pin(second.row(),second.revision()))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.approvedCount").value(2));
        entityManager.flush();
        assertThat(approvedCount()).isEqualTo(2);
        assertThat(jdbc.queryForList("SELECT m.user_id FROM test_case_revisions r JOIN project_memberships m ON m.id=r.approved_by WHERE r.id IN (?,?) ORDER BY r.id",String.class,f.revision,second.revision())).containsExactly(f.pm,f.pm);
    }
    @Test void bulkApprovalsRejectTesterBeforeAnyRevisionIsApproved()throws Exception {
        draft();
        mvc.perform(post(approvals()).with(actor(f.tester,"TESTER")).with(csrf()).contentType("application/json").content(selection(pin(f.row,f.revision),pin(second.row(),second.revision())))).andExpect(status().isForbidden());
        assertThat(approvedCount()).isZero();
    }
    @Test void staleSecondPinRejectsWholeApprovalAndPreservesSource()throws Exception {
        draft();byte[] source=jdbc.queryForObject("SELECT source_workbook FROM import_batches WHERE id=?",byte[].class,f.document);
        mvc.perform(post(approvals()).with(actor(f.pm,"PM")).with(csrf()).contentType("application/json").content(selection(pin(f.row,f.revision),pin(second.row(),second.revision()+1000000))))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
        assertThat(approvedCount()).isZero();
        assertThat(jdbc.queryForObject("SELECT source_workbook FROM import_batches WHERE id=?",byte[].class,f.document)).isEqualTo(source);
    }
    @Test void foreignRowRejectsWholeApprovalWithoutLeakingOrMutatingOtherProject()throws Exception {
        draft();NativeFqFixture foreign;
        var c=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try {foreign=NativeFqFixture.seed(c,false);}finally {DataSourceUtils.releaseConnection(c,dataSource);}
        jdbc.update("UPDATE test_case_revisions SET approved_at=NULL,approved_by=NULL WHERE id=?",foreign.revision);
        mvc.perform(post(approvals()).with(actor(f.pm,"PM")).with(csrf()).contentType("application/json").content(selection(pin(f.row,f.revision),pin(foreign.row,foreign.revision))))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        assertThat(approvedCount()).isZero();
        assertThat(jdbc.queryForObject("SELECT approved_at FROM test_case_revisions WHERE id=?",Object.class,foreign.revision)).isNull();
    }
    @Test void duplicateRowsRejectWholeApproval()throws Exception {
        draft();
        mvc.perform(post(approvals()).with(actor(f.pm,"PM")).with(csrf()).contentType("application/json").content(selection(pin(f.row,f.revision),pin(f.row,f.revision))))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_SCOPE"));
        assertThat(approvedCount()).isZero();
    }

    @Test void twentyHandoversPersistRecipientsAndReadBackThroughProjectApiWithoutDuplicates()throws Exception {
        jdbc.update("UPDATE identity_users SET role_code='ADMIN' WHERE id=?",f.pm);
        var assets=new ArrayList<Long>();
        var c=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try {
            for(int i=1;i<=20;i++)assets.add(NativeFqFixture.insert(c,
                "INSERT INTO device_assets(asset_code,type,model,os_name,created_at,created_by,updated_at,updated_by) VALUES(?,'IPAD','iPad','iPadOS',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)",
                "BUTTON-"+f.project+"-"+i,f.pm,f.pm));
        }finally {DataSourceUtils.releaseConnection(c,dataSource);}
        for(long asset:assets){
            String body=Objects.requireNonNull(json.writeValueAsString(Map.of("assetId",asset,"projectId",f.project,"recipientUserId",f.tester,"expectedVersion",0,"handoverNote","Button audit")));
            mvc.perform(post("/api/v1/admin/device-allocations").with(actor(f.pm,"ADMIN")).with(csrf()).contentType("application/json").content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.projectId").value(f.project)).andExpect(jsonPath("$.assetId").value(asset));
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM device_allocations l JOIN device_assets a ON a.id=l.asset_id WHERE l.project_id=? AND a.asset_code LIKE 'BUTTON-%' AND l.recipient_membership_id=? AND l.returned_at IS NULL",Long.class,f.project,f.testerMember)).isEqualTo(20);
        mvc.perform(get(Objects.requireNonNull("/api/v1/projects/"+f.project+"/device-allocations?size=100")).with(actor(f.pm,"ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(21));
        String retry=Objects.requireNonNull(json.writeValueAsString(Map.of("assetId",assets.getFirst(),"projectId",f.project,"recipientUserId",f.tester,"expectedVersion",0,"handoverNote","Button audit")));
        mvc.perform(post("/api/v1/admin/device-allocations").with(actor(f.pm,"ADMIN")).with(csrf()).contentType("application/json").content(retry)).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM device_allocations WHERE project_id=? AND returned_at IS NULL",Long.class,f.project)).isEqualTo(21);
    }
}
