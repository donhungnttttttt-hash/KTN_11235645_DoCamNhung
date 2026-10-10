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
@WebMvcTest(DeviceInventoryController.class) @Import({SecurityConfig.class,RequestIdFilter.class})
class InventorySecurityTest {
 @Autowired MockMvc mvc;@MockitoBean DeviceInventoryService service;@MockitoBean IdentityService identity;
 @org.springframework.lang.NonNull RequestPostProcessor actor(String role){var user=new IdentityUser("person","Person","hash",role);when(identity.current(user.getId())).thenReturn(user);return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),0),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)))));}
 @Test void readsAndWritesRequireAdminAndCsrf() throws Exception {
  mvc.perform(get("/api/v1/admin/device-assets")).andExpect(status().isUnauthorized());
  for(String role:List.of("PM","TESTER","DEV")){mvc.perform(get("/api/v1/admin/device-assets").with(actor(role))).andExpect(status().isForbidden());mvc.perform(post("/api/v1/admin/device-allocations").with(actor(role)).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{}")).andExpect(status().isForbidden());}
  mvc.perform(post("/api/v1/admin/device-assets").with(actor("ADMIN")).contentType("application/json").content("{}")).andExpect(status().isForbidden());verifyNoInteractions(service);
 }
 @Test void malformedAndMissingVersionRejected() throws Exception {
  mvc.perform(post("/api/v1/admin/device-assets").with(actor("ADMIN")).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"assetCode\":\"A\",\"type\":\"BAD\",\"model\":\"iPad\",\"conditionCode\":\"AVAILABLE\"}")).andExpect(status().isUnprocessableEntity());
  mvc.perform(patch("/api/v1/admin/device-allocations/1").with(actor("ADMIN")).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"conditionCode\":\"AVAILABLE\"}")).andExpect(status().isUnprocessableEntity());verifyNoInteractions(service);
 }
}
