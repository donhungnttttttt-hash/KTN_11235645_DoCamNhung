package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.*;

/** Admin reads never enroll members; authorized writes preserve attribution and one-way results. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_DB_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+")
class AdminWorkspaceFileReadNativeTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        String url=System.getenv("TMS_TEST_DB_URL");
        if(url==null || !url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+"))throw new IllegalStateException("Dedicated native schema required");
        r.add("TMS_DB_URL",()->url);r.add("TMS_DB_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_DB_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_MIGRATION_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_MIGRATION_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");
    }
    @Autowired MockMvc mvc; @Autowired IdentityUserRepository users;
    @Autowired javax.sql.DataSource dataSource; @Autowired JdbcTemplate jdbc;
    @Autowired vn.syp.tms.qa.QaService qa;
    NativeFqFixture f; IdentityUser admin; long group,run;
    @BeforeEach void fixture() throws Exception {
        admin=users.saveAndFlush(new IdentityUser("observe."+UUID.randomUUID().toString().substring(0,8),"Observer","SECRET","ADMIN"));
        var c=org.springframework.jdbc.datasource.DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try { f=NativeFqFixture.seed(c,false);run=f.run(c);group=f.group(c,run); }
        finally {org.springframework.jdbc.datasource.DataSourceUtils.releaseConnection(c,dataSource);}
    }
    @org.springframework.lang.NonNull RequestPostProcessor actor() {
        return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(admin.getId(),0L),null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))));
    }
    @Test void adminReadsWithoutMutationThenStartsAndRecordsWithoutAssignment() throws Exception {
        String p="/api/v1/projects/"+f.project;
        for(String tail:List.of("/test-documents/"+f.document,"/test-documents/"+f.document+"/export","/test-cases/"+f.testCase,"/test-cases/"+f.testCase+"/revisions/"+f.revision,"/run-items/"+run,"/run-items/"+run+"/attempts","/file-work-groups/"+group,"/file-work-groups/"+group+"/execution","/file-work-groups/"+group+"/sessions","/file-work-groups/"+group+"/export"))
            mvc.perform(get(p+tail).with(actor())).andExpect(result->assertThat(result.getResponse().getStatus()).as(tail+": "+result.getResponse().getContentAsString()).isEqualTo(200));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=?",Long.class,admin.getId())).isZero();
        mvc.perform(get(p+"/file-work-groups/"+group).with(actor())).andExpect(jsonPath("$.group.capabilities.canAssign").value(true));
        jdbc.update("UPDATE test_cycles SET status_code='ACTIVE',activated_at=UTC_TIMESTAMP(6),activated_by=? WHERE id=?",f.pmMember,f.cycle);
        var started=mvc.perform(post(p+"/file-work-groups/"+group+"/sessions").with(actor()).with(csrf()).contentType("application/json").content("{\"allocationId\":"+f.allocation+",\"buildId\":"+f.build+",\"expectedVersion\":0,\"requestKey\":\"admin-start\"}"))
            .andExpect(status().isCreated()).andReturn();
        long session=new com.fasterxml.jackson.databind.ObjectMapper().readTree(started.getResponse().getContentAsByteArray()).get("id").asLong();
        mvc.perform(post(p+"/file-work-groups/"+group+"/run-items/"+run+"/attempts").with(actor()).with(csrf()).contentType("application/json")
            .content("{\"sessionId\":"+session+",\"expectedSessionVersion\":0,\"resultCode\":\"OK\",\"buildId\":"+f.build+",\"expectedVersion\":0,\"requestKey\":\"admin-file-result\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.executorName").value(admin.getDisplayName()));
        var projected=jdbc.queryForMap("SELECT result_status,result_version,result_updated_by FROM import_rows WHERE project_id=? AND id=?",f.project,f.row);
        assertThat(projected.get("result_status")).isEqualTo("OK");
        assertThat(projected.get("result_version")).isEqualTo(4L);
        assertThat(projected.get("result_updated_by")).isEqualTo(admin.getId());
        long currentVersion=((Number)projected.get("result_version")).longValue();
        mvc.perform(put(p+"/test-documents/"+f.document+"/rows/"+f.row+"/result").with(actor()).with(csrf()).contentType("application/json").content("{\"status\":\"NG\",\"expectedVersion\":"+currentVersion+",\"requestKey\":\"33333333-3333-3333-3333-333333333333\"}"))
            .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT result_status FROM import_rows WHERE project_id=? AND id=?",String.class,f.project,f.row)).isEqualTo("NG");
        assertThat(jdbc.queryForObject("SELECT a.result_code FROM run_items r JOIN execution_attempts a ON a.project_id=r.project_id AND a.id=r.latest_attempt_id WHERE r.project_id=? AND r.id=?",String.class,f.project,run)).isEqualTo("OK");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,f.project)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=? AND active=TRUE",Long.class,admin.getId())).isZero();
    }
    @Test void adminCanHandleQaOwnedByAnotherUser() throws Exception {
        var created=qa.create(f.project,f.tester,new vn.syp.tms.qa.QaDtos.Create("Visible QA","Expected behavior?","MEDIUM",null,null,f.document,null,null,f.revision,"qa-observer-0001"));
        String p="/api/v1/projects/"+f.project;
        mvc.perform(get(p+"/qa/"+created.item().id()).with(actor())).andExpect(status().isOk())
            .andExpect(jsonPath("$.item.title").value("Visible QA"))
            .andExpect(jsonPath("$.item.capabilities.canAssign").value(true)).andExpect(jsonPath("$.item.capabilities.canAnswer").value(true));
        mvc.perform(get(p+"/work-items/"+created.item().id()).with(actor())).andExpect(status().isOk()).andExpect(jsonPath("$.canComment").value(true));
        mvc.perform(get(p+"/action-inbox").param("kind","QA").with(actor())).andExpect(status().isOk()).andExpect(jsonPath("$.projectWide").value(true)).andExpect(jsonPath("$.items[0].id").value(created.item().id()));
        mvc.perform(post(p+"/qa/"+created.item().id()+"/start").with(actor()).with(csrf()).contentType("application/json").content("{\"reason\":\"Not assigned\",\"expectedVersion\":0,\"requestKey\":\"observer-qa-start\"}"))
            .andExpect(status().isOk());
        mvc.perform(post(p+"/qa/"+created.item().id()+"/answers").with(actor()).with(csrf()).contentType("application/json").content("{\"body\":\"Admin answer\",\"expectedVersion\":1,\"requestKey\":\"admin-qa-answer\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.currentAnswer.authorName").value(admin.getDisplayName()));
    }
}
