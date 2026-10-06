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
@WebMvcTest({ProjectStatusReportController.class,AdminAuditController.class}) @Import({SecurityConfig.class,RequestIdFilter.class})
class ProjectStatusReportSecurityTest {
 @Autowired MockMvc mvc;@MockitoBean ProjectStatusReportService reports;@MockitoBean AdminAuditService audit;@MockitoBean IdentityService identity;
 @org.springframework.lang.NonNull RequestPostProcessor actor(String role){var user=new IdentityUser("person","Person","hash",role);when(identity.current(user.getId())).thenReturn(user);return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),0),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)))));}
 @Test void adminAuditAndHistoryRejectNonAdminsAndReportPostRequiresCsrf()throws Exception {
  mvc.perform(get("/api/v1/admin/audit")).andExpect(status().isUnauthorized());
  for(String role:List.of("PM","TESTER","DEV")){mvc.perform(get("/api/v1/admin/audit").with(actor(role))).andExpect(status().isForbidden());mvc.perform(get("/api/v1/admin/projects/1/status-reports").with(actor(role))).andExpect(status().isForbidden());}
  mvc.perform(post("/api/v1/projects/1/status-reports").with(actor("PM")).contentType("application/json").content("{}")).andExpect(status().isForbidden());
  verifyNoInteractions(reports,audit);
 }
 @Test void blankNarrativeAndInvalidIdempotencyKeyRejected()throws Exception {
  mvc.perform(post("/api/v1/projects/1/status-reports").with(actor("PM")).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"requestKey\":\"invalid key\",\"summary\":\"\"}")).andExpect(status().isUnprocessableEntity());verifyNoInteractions(reports);
 }
}
