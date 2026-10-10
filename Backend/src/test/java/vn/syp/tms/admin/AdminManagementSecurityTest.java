package vn.syp.tms.admin;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import java.util.*;
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
import vn.syp.tms.shared.web.RequestIdFilter;

@WebMvcTest(AdminManagementController.class)
@Import({SecurityConfig.class,RequestIdFilter.class})
class AdminManagementSecurityTest {
    @Autowired MockMvc mvc;@MockitoBean AdminProjectService service;@MockitoBean IdentityService identity;
    @org.springframework.lang.NonNull RequestPostProcessor actor(String role){var user=new IdentityUser("person","Person","hash",role);when(identity.current(user.getId())).thenReturn(user);return java.util.Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),0),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)))));}
    @Test void nonAdminsAndMissingCsrfCannotMutate() throws Exception {
        for(String role:List.of("PM","TESTER","DEV"))mvc.perform(put("/api/v1/admin/projects/1/members/person").with(actor(role)).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content("{\"projectRole\":\"DEV\"}")).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/admin/projects/1/members/person").with(actor("ADMIN")).contentType("application/json").content("{\"projectRole\":\"DEV\"}")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void invalidRoleIsRejectedBeforeService() throws Exception {
        mvc.perform(put("/api/v1/admin/projects/1/members/person").with(actor("ADMIN")).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content("{\"projectRole\":\"ADMIN\"}")).andExpect(status().isUnprocessableEntity());verifyNoInteractions(service);
    }
    @Test void nullInitialMemberIsValidationErrorBeforeService() throws Exception {
        mvc.perform(post("/api/v1/admin/projects").with(actor("ADMIN")).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content("{\"project\":{\"code\":\"AA\",\"name\":\"Alpha\",\"timezone\":\"UTC\"},\"members\":[null]}"))
            .andExpect(status().isUnprocessableEntity());
        verifyNoInteractions(service);
    }
}
