package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
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
import vn.syp.tms.project.*;

/** Global read access must neither create memberships nor grant business write permissions. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_DB_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+")
class AdminWorkspaceNativeTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        String url=System.getenv("TMS_TEST_DB_URL");
        if(url==null || !url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+"))throw new IllegalStateException("Dedicated native schema required");
        r.add("TMS_DB_URL",()->url);r.add("TMS_DB_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_DB_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_MIGRATION_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_MIGRATION_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");
    }
    @Autowired MockMvc mvc; @Autowired IdentityUserRepository users; @Autowired ProjectService projects;
    @Autowired JdbcTemplate jdbc; @Autowired jakarta.persistence.EntityManager entityManager;
    IdentityUser admin,owner,tester; long first,second,item;
    @BeforeEach void fixture() {
        String tag=UUID.randomUUID().toString().substring(0,8);
        admin=users.saveAndFlush(new IdentityUser("workspace.admin."+tag,"Admin","SECRET","ADMIN"));
        owner=users.saveAndFlush(new IdentityUser("workspace.owner."+tag,"Owner","SECRET","ADMIN"));
        tester=users.saveAndFlush(new IdentityUser("workspace.tester."+tag,"Tester","SECRET","TESTER"));
        first=projects.create(owner.getId(),new ProjectDtos.CreateProject("WA"+tag,"Workspace First","","UTC")).id();
        second=projects.create(owner.getId(),new ProjectDtos.CreateProject("WB"+tag,"Workspace Second","","UTC")).id();
        projects.addOrUpdateMember(first,owner.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"));
        Long member=jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,first,owner.getId());
        jdbc.update("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,priority_code,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,1,?,'TASK','Visible only in first','Content','MEDIUM',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,'checksum')",first,"WA"+tag+"-1",member,member,tag);
        item=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM work_items WHERE project_id=?",Long.class,first));
        jdbc.update("INSERT INTO project_counters(project_id,counter_code,next_value) VALUES(?,'WORK_ITEM',2)",first);
    }
    @org.springframework.lang.NonNull RequestPostProcessor actor(IdentityUser u) {
        return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(u.getId(),u.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole())))));
    }
    @Test void globalAdminListsAllProjectsWithoutInventingMembershipOrPmRole() throws Exception {
        var all=projects.list(admin.getId());
        assertThat(all).extracting(ProjectDtos.ProjectSummary::id).contains(first,second);
        assertThat(all).filteredOn(p->p.id()==first||p.id()==second).allMatch(p->p.projectRole()==null);
        assertThat(projects.list(owner.getId())).filteredOn(p->p.id()==first).allMatch(p->"PM".equals(p.projectRole()));
        assertThat(projects.list(tester.getId())).extracting(ProjectDtos.ProjectSummary::id).containsExactly(first);
        mvc.perform(get("/api/v1/projects/"+first).with(actor(admin))).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=?",Long.class,admin.getId())).isZero();
    }
    @Test void everyWorkspaceReadLoadsForGlobalAdminAndPreservesProjectScope() throws Exception {
        for(String suffix:List.of("/members","/catalogs/categories","/catalogs/milestones","/catalogs/builds","/catalogs/environments","/catalogs/devices","/work-items","/work-items/overview","/work-items/metadata","/test-suites","/test-documents","/test-cycles","/reports/summary","/file-work-groups","/file-work-groups/metadata","/qa","/status-reports","/handbook","/bug-rule-versions","/device-allocations","/retest-requests","/retest-candidates","/integrations/redmine","/action-inbox")) {
            mvc.perform(get("/api/v1/projects/"+first+suffix).with(actor(admin)))
                .andExpect(result->assertThat(result.getResponse().getStatus()).as(suffix+": "+result.getResponse().getContentAsString()).isEqualTo(200));
        }
        mvc.perform(get("/api/v1/projects/"+first+"/work-items").with(actor(admin))).andExpect(jsonPath("$.items[0].id").value(item));
        mvc.perform(get("/api/v1/projects/"+second+"/work-items").with(actor(admin))).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/projects/"+first+"/work-items/metadata").with(actor(admin))).andExpect(jsonPath("$.canCreate").value(false)).andExpect(jsonPath("$.canTriage").value(false));
        mvc.perform(get("/api/v1/projects/"+first+"/work-items/"+item).with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.canComment").value(false)).andExpect(jsonPath("$.canAttach").value(false)).andExpect(jsonPath("$.allowedTransitions").isEmpty());
        mvc.perform(get("/api/v1/projects/"+second+"/work-items/"+item).with(actor(admin))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/projects/"+first+"/file-work-groups/metadata").with(actor(admin))).andExpect(jsonPath("$.canCreate").value(false)).andExpect(jsonPath("$.canViewMine").value(false));
    }
    @Test void observerCannotWriteWhileActualPmStillCan() throws Exception {
        String body="{\"type\":\"TASK\",\"title\":\"Do not create\",\"description\":\"Details\",\"priority\":\"MEDIUM\",\"requestKey\":\"workspace-denied\"}";
        mvc.perform(post("/api/v1/projects/"+first+"/work-items").with(actor(admin)).with(csrf()).contentType("application/json").content(body)).andExpect(status().isNotFound());
        assertThatThrownBy(()->projects.requireMembership(first,admin.getId())).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        assertThatThrownBy(()->projects.requireProjectPm(first,admin.getId())).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        mvc.perform(post("/api/v1/projects/"+first+"/work-items").with(actor(owner)).with(csrf()).contentType("application/json").content(body)).andExpect(status().isCreated());
    }
    @Test void nonMembersRevokedAndDisabledAccountsDoNotGainGlobalReads() throws Exception {
        mvc.perform(get("/api/v1/projects/"+second+"/work-items").with(actor(tester))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/projects/9223372036854775807").with(actor(admin))).andExpect(status().isNotFound());
        var stale=actor(admin);
        jdbc.update("UPDATE identity_users SET role_code='TESTER' WHERE id=?",admin.getId());entityManager.clear();
        mvc.perform(get("/api/v1/projects/"+first+"/work-items").with(stale)).andExpect(status().isNotFound());
        jdbc.update("UPDATE identity_users SET enabled=FALSE WHERE id=?",admin.getId());entityManager.clear();
        mvc.perform(get("/api/v1/projects").with(stale)).andExpect(status().isUnauthorized());
    }
}
