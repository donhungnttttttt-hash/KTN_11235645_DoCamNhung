package vn.syp.tms.admin;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.syp.tms.config.SecurityConfig;
import vn.syp.tms.identity.*;
import vn.syp.tms.shared.web.*;
import vn.syp.tms.workitem.WorkItemStore;

@WebMvcTest(AdminController.class)
@Import({SecurityConfig.class,AdminOverviewService.class,RequestIdFilter.class})
class AdminSecurityTest {
    private static @org.springframework.lang.NonNull org.springframework.test.web.servlet.request.RequestPostProcessor authenticated(org.springframework.security.core.Authentication auth) {return java.util.Objects.requireNonNull(authentication(auth));}
    @Autowired MockMvc mvc;
    @MockitoBean IdentityService identity;
    @MockitoBean WorkItemStore db;
    @Test void anonymousIs401AndPmTesterCannotAccessEvenDelegatedPm() throws Exception {
        mvc.perform(get("/api/v1/admin/overview")).andExpect(status().isUnauthorized());
        for(String role:List.of("PM","TESTER")) {
            var user=new IdentityUser(role,"Person","SECRET",role);user.setCanCreateUsers(true);
            when(identity.current(user.getId())).thenReturn(user);
            mvc.perform(get("/api/v1/admin/projects").with(authenticated(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),0),null,List.of(new SimpleGrantedAuthority("ROLE_"+role),new SimpleGrantedAuthority("users:create"))))))
                .andExpect(status().isForbidden());
        }
        verifyNoInteractions(db);
    }
    @Test void staleAdminAuthorityIsRejectedByCurrentRoleGuard() throws Exception {
        var user=new IdentityUser("revoked","PM","SECRET","PM");when(identity.current(user.getId())).thenReturn(user);
        mvc.perform(get("/api/v1/admin/overview").with(authenticated(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),0),null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))))))
            .andExpect(status().isForbidden());
        verifyNoInteractions(db);
    }
    @Test void disabledAccountIs401AndMissingProject404() throws Exception {
        var user=new IdentityUser("admin","Admin","SECRET","ADMIN");
        var auth=authenticated(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),0),null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        when(identity.current(user.getId())).thenThrow(new BusinessException(401,"UNAUTHENTICATED","Expired"));
        mvc.perform(get("/api/v1/admin/overview").with(auth)).andExpect(status().isUnauthorized());
        doReturn(user).when(identity).current(user.getId());
        when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenThrow(new BusinessException(404,"NOT_FOUND","Missing"));
        mvc.perform(get("/api/v1/admin/projects/999").with(auth)).andExpect(status().isNotFound());
    }
}
