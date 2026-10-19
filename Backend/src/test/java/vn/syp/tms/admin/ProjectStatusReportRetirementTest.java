package vn.syp.tms.admin;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.syp.tms.config.SecurityConfig;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.shared.web.RequestIdFilter;
import vn.syp.tms.workitem.WorkItemStore;

/** Actual service authorization at the public HTTP seam; legacy stored history remains readable. */
@WebMvcTest(ProjectStatusReportController.class)
@Import({ProjectStatusReportService.class,SecurityConfig.class,RequestIdFilter.class})
class ProjectStatusReportRetirementTest {
    @Autowired MockMvc mvc;
    @MockitoBean WorkItemStore db;
    @MockitoBean IdentityService identity;
    @MockitoBean ProjectAudit audit;
    @MockitoBean ProjectDeadlines deadlines;
    @MockitoBean ProjectActorService actors;
    @MockitoBean vn.syp.tms.feature.LegacyTestingWrites legacyTestingWrites;
    @BeforeEach void store(){
        when(db.row(Objects.requireNonNull(contains("FROM projects")),any(Object[].class))).thenReturn(Map.of("id",1L));
        when(deadlines.milestones(eq(1L),any())).thenReturn(List.of());
        when(db.checksum(any())).thenReturn("hash");
    }
    RequestPostProcessor person(String role,boolean member){
        var user=new IdentityUser("retired."+UUID.randomUUID(),"Synthetic "+role,"not-login",role);
        when(identity.current(user.getId())).thenReturn(user);
        when(db.rows(Objects.requireNonNull(contains("FROM identity_users")),eq(user.getId()))).thenReturn(List.of(Map.of("role",role)));
        if(member)when(db.rows(Objects.requireNonNull(contains("FROM project_memberships")),eq(1L),eq(user.getId()))).thenReturn(List.of(Map.of("id",3L,"role",role)));
        return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),0),null,List.of(new SimpleGrantedAuthority("ROLE_"+role))));
    }
    @Test void ordinaryPmAndOutsideAdminGetRetiredWriteWithoutAnyLegacyGateOrFakeActor()throws Exception {
        for(String role:List.of("PM","ADMIN"))mvc.perform(post("/api/v1/projects/1/status-reports").with(person(role,role.equals("PM"))).with(csrf()).contentType("application/json").content("{}"))
            .andExpect(status().isGone()).andExpect(jsonPath("$.code").value("USE_FEATURE_REPORTS"));
        verify(db,never()).insert(Objects.requireNonNull(anyString()),any(Object[].class));verifyNoInteractions(actors,audit,deadlines);
    }
    @Test void workersCannotReadOrWriteManagementHistoryAndOutsidePmHasNoOrdinaryAccess()throws Exception {
        for(String role:List.of("TESTER","DEV")){
            var user=person(role,true);
            mvc.perform(get("/api/v1/projects/1/status-reports").with(user)).andExpect(status().isForbidden());
            mvc.perform(post("/api/v1/projects/1/status-reports").with(user).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isForbidden());
        }
        var outsider=person("PM",false);
        mvc.perform(get("/api/v1/projects/1/status-reports").with(outsider)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/projects/1/status-reports").with(outsider).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isNotFound());
        verify(db,never()).count(Objects.requireNonNull(contains("project_status_reports")),any(Object[].class));
    }
    @Test void currentPmAndAdminStillReadHistoryWithNoComposerCapability()throws Exception {
        for(String role:List.of("PM","ADMIN"))mvc.perform(get("/api/v1/projects/1/status-reports").with(person(role,role.equals("PM"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.canPost").value(false)).andExpect(jsonPath("$.reports.totalElements").value(0));
    }
}
