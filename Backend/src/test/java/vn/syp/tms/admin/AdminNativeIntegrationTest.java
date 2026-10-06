package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
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

/** Only an explicitly provisioned isolated native schema; rollback every fixture. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_DB_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+")
class AdminNativeIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        String url=System.getenv("TMS_TEST_DB_URL");
        if(url==null || !url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+"))throw new IllegalStateException("Dedicated native schema required");
        r.add("TMS_DB_URL",()->url);r.add("TMS_DB_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_DB_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_MIGRATION_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_MIGRATION_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");
    }
    @Autowired MockMvc mvc;@Autowired IdentityUserRepository users;@Autowired ProjectService projects;@Autowired AdminOverviewService service;@Autowired JdbcTemplate jdbc;
    IdentityUser admin,owner,tester;long first,second;
    @BeforeEach void fixture() {
        String tag=UUID.randomUUID().toString().substring(0,8);
        admin=users.saveAndFlush(new IdentityUser("a1.admin."+tag,"Admin","SECRET","ADMIN"));
        owner=users.saveAndFlush(new IdentityUser("a1.owner."+tag,"Owner","SECRET","ADMIN"));
        tester=users.saveAndFlush(new IdentityUser("a1.tester."+tag,"Tester","SECRET","TESTER"));
        first=projects.create(owner.getId(),new ProjectDtos.CreateProject("A1A"+tag,"First","","Asia/Ho_Chi_Minh")).id();
        second=projects.create(owner.getId(),new ProjectDtos.CreateProject("A1B"+tag,"Second","","Asia/Ho_Chi_Minh")).id();
        projects.addOrUpdateMember(first,owner.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"));
        projects.addOrUpdateMember(second,owner.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"));
    }
    @org.springframework.lang.NonNull RequestPostProcessor actor(IdentityUser u) {return java.util.Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(u.getId(),u.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole())))));}
    @Test void outsiderAdminReadsBothProjectsAndPublicDtoHasNoSecrets() throws Exception {
        String response=mvc.perform(get("/api/v1/admin/projects").param("keyword","A1").with(actor(admin))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(response).contains("First","Second").doesNotContain("SECRET","password","session","token");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=?",Long.class,admin.getId())).isZero();
        mvc.perform(get("/api/v1/admin/projects/"+first).with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.metrics.executionPercent").doesNotExist());
        mvc.perform(get("/api/v1/admin/projects/9223372036854775807").with(actor(admin))).andExpect(status().isNotFound());
    }
    @Test void distinctUsersAndScopeAndNoRunDenominator() {
        var selected=service.overview(admin.getId(),first);
        assertThat(selected.totalUsers()).isEqualTo(2);assertThat(selected.enabledUsers()).isEqualTo(2);
        assertThat(selected.totalProjects()).isEqualTo(1);assertThat(selected.metrics()).containsEntry("applicable",0L).containsEntry("executionPercent",null);
        var all=service.overview(admin.getId(),null);
        assertThat(all.totalProjects()).isGreaterThanOrEqualTo(2);
        assertThat(all.totalUsers()).isEqualTo(jdbc.queryForObject("SELECT COUNT(*) FROM identity_users",Long.class));
    }
    @Test void anonymousTesterAndRevokedAdminDenied() throws Exception {
        mvc.perform(get("/api/v1/admin/overview")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/overview").with(actor(tester))).andExpect(status().isForbidden());
        var stale=actor(admin);jdbc.update("UPDATE identity_users SET role_code='PM' WHERE id=?",admin.getId());users.flush();
        // Clear first-level persistence cache so the current account read reflects DB role.
        entityManager.clear();
        mvc.perform(get("/api/v1/admin/overview").with(stale)).andExpect(status().isForbidden());
    }
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired AdminProjectService management;
    @Autowired DeviceInventoryService inventory;
    @Autowired ProjectStatusReportService statusReports;
    @Autowired AdminAuditService auditRead;
    @Test void reportReplayHistoryAndSanitizedAuditKeepAutomaticWarnings() {
        jdbc.update("INSERT INTO milestones(project_id,code,name,due_on,created_at,updated_at) VALUES(?,'LATE','Late milestone','2000-01-01',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",first);
        long milestone=java.util.Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM milestones WHERE project_id=? AND code='LATE'",Long.class,first));
        long member=java.util.Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,first,owner.getId()));
        jdbc.update("INSERT INTO test_cycles(project_id,code,name,milestone_id,created_at,created_by) VALUES(?,'PLAN','Planned unfinished cycle',?,UTC_TIMESTAMP(6),?)",first,milestone,member);
        var input=new ProjectStatusReportService.Input("native-replay","Update","Cause","Plan",null);
        var report=statusReports.create(owner.getId(),first,input);
        assertThat(statusReports.create(owner.getId(),first,input).get("id")).isEqualTo(report.get("id"));
        assertThat(statusReports.history(admin.getId(),first,true,0,20).reports().totalElements()).isEqualTo(1);
        assertThat(statusReports.history(tester.getId(),first,false,0,20).canPost()).isFalse();
        assertThat(service.overview(admin.getId(),first).attention().get("overdueMilestoneCount")).isEqualTo(1);
        var audit=auditRead.list(admin.getId(),first,"STATUS_REPORT",null,null,"UTC",0,20);
        assertThat(audit.totalElements()).isEqualTo(1);
        assertThat(audit.items().getFirst().keySet()).doesNotContain("requestKey","request_id","payload_hash","summary","password_hash");
    }
    @Test void allocationLifecycleAndInitialSelectionShareGuards() {
        var created=inventory.create(admin.getId(),new DeviceInventoryDtos.Asset("INV"+UUID.randomUUID(),"IPAD","iPad",null,"iOS","18","AVAILABLE","",null));
        long assetId=((Number)created.get("id")).longValue();
        var allocation=inventory.assign(admin.getId(),new DeviceInventoryDtos.Assign(assetId,first,tester.getId(),null,"First",0L));
        long allocationId=((Number)allocation.get("id")).longValue();
        assertThatThrownBy(()->inventory.assign(admin.getId(),new DeviceInventoryDtos.Assign(assetId,second,tester.getId(),null,"Duplicate",1L))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        jdbc.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",first);
        inventory.receive(admin.getId(),allocationId,new DeviceInventoryDtos.Return(0L,"AVAILABLE","Returned"));
        assertThatThrownBy(()->inventory.receive(admin.getId(),allocationId,new DeviceInventoryDtos.Return(1L,"AVAILABLE","Again"))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        inventory.assign(admin.getId(),new DeviceInventoryDtos.Assign(assetId,second,tester.getId(),null,"Second",2L));
        assertThat(inventory.assets(admin.getId(),first,"","",0,20).totalElements()).isZero();
        assertThat(inventory.allocations(admin.getId(),null,assetId,true,0,20).totalElements()).isEqualTo(2);
        assertThat(inventory.projectAllocations(tester.getId(),second,0,20).items()).anyMatch(a->((Number)a.get("assetId")).longValue()==assetId);
    }
    @Test void userPagesKeepUnassignedAndDeduplicateMemberships() {
        var all=management.users(admin.getId(),null,tester.getUsername(),null,null,0,1);
        assertThat(all.totalElements()).isEqualTo(1);
        assertThat(all.items()).hasSize(1);
        assertThat((List<?>)all.items().getFirst().get("memberships")).hasSize(2);
        assertThat(management.users(admin.getId(),null,admin.getUsername(),"ADMIN",true,0,20).totalElements()).isEqualTo(1);
        assertThat(management.users(admin.getId(),first,admin.getUsername(),null,null,0,20).totalElements()).isZero();
    }
    @Test void centralCreateDoesNotEnrollAdminAndLegacyMembershipRequiresAdmin() {
        var dev=users.saveAndFlush(new IdentityUser("a2.dev."+UUID.randomUUID().toString().substring(0,8),"Developer","SECRET","DEV"));
        var created=management.create(admin.getId(),new AdminProjectService.Create(new ProjectDtos.CreateProject("A2"+UUID.randomUUID().toString().substring(0,8),"Central","","UTC"),List.of(new AdminProjectService.InitialMember(owner.getId(),"PM"),new AdminProjectService.InitialMember(dev.getId(),"DEV"))));
        long id=((Number)created.get("id")).longValue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,id,admin.getId())).isZero();
        assertThat(management.members(admin.getId(),id)).hasSize(2);
        assertThatThrownBy(()->projects.addOrUpdateMember(id,dev.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        assertThatThrownBy(()->projects.requireNotDev(id,dev.getId())).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
    }
}
