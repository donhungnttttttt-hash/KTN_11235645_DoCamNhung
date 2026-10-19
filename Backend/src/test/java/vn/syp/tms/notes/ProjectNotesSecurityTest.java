package vn.syp.tms.notes;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import java.time.Instant;
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
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.shared.web.RequestIdFilter;

@WebMvcTest(ProjectNotesController.class)
@Import({SecurityConfig.class,RequestIdFilter.class})
class ProjectNotesSecurityTest {
    @org.springframework.test.context.bean.override.mockito.MockitoBean vn.syp.tms.feature.LegacyTestingWrites legacyTestingWrites;
    @Autowired MockMvc mvc;
    @MockitoBean ProjectNotesService service;
    @MockitoBean IdentityService identity;
    @org.springframework.lang.NonNull RequestPostProcessor actor(String role){
        var user=new IdentityUser("person","Person","hash",role);when(identity.current("person")).thenReturn(user);
        return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal("person",0),null,List.of(new SimpleGrantedAuthority("ROLE_"+role)))));
    }
    @Test void requiresSessionAndCsrfOnEveryWrite()throws Exception {
        mvc.perform(get("/api/v1/projects/1/notes")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/projects/1/notes").with(actor("PM")).contentType("application/json").content("{\"title\":\"T\",\"body\":\"B\"}")).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/projects/1/notes/7").with(actor("ADMIN")).contentType("application/json").content("{\"title\":\"T\",\"body\":\"B\",\"expectedVersion\":0}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/projects/1/notes/7?expectedVersion=0").with(actor("ADMIN"))).andExpect(status().isForbidden());verifyNoInteractions(service);
    }
    @Test void rejectsBlankTextAndMissingVersionBeforeCallingService()throws Exception {
        mvc.perform(post("/api/v1/projects/1/notes").with(actor("PM")).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"title\":\" \",\"body\":\"B\"}")).andExpect(status().isUnprocessableEntity());
        mvc.perform(put("/api/v1/projects/1/notes/7").with(actor("PM")).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"title\":\"T\",\"body\":\"B\"}")).andExpect(status().isUnprocessableEntity());verifyNoInteractions(service);
    }
    @Test void sendsServerIdentityToServiceAndReturnsCreatedLocation()throws Exception {
        var note=new ProjectNote(7,1,"T","B",0,"person","person",Instant.EPOCH,Instant.EPOCH);
        when(service.create(eq(1L),eq("person"),any())).thenReturn(note);
        mvc.perform(post("/api/v1/projects/1/notes").with(actor("ADMIN")).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{\"title\":\"T\",\"body\":\"B\",\"createdBy\":\"forged\"}"))
            .andExpect(status().isCreated()).andExpect(header().string("Location","/api/v1/projects/1/notes/7")).andExpect(jsonPath("$.createdBy").value("person"));
        verify(service).create(1,"person",new ProjectNotesDtos.Create("T","B"));
    }
    @Test void propagatesForbiddenScopeAndStaleVersionWithoutSuccessfulResponse()throws Exception {
        when(service.get(2,"person",7)).thenThrow(new BusinessException(404,"NOT_FOUND","Không tìm thấy Note."));
        mvc.perform(get("/api/v1/projects/2/notes/7").with(actor("TESTER"))).andExpect(status().isNotFound());
        doThrow(new BusinessException(403,"FORBIDDEN","Không có quyền ghi")).when(service).remove(1,"person",7,0L);
        mvc.perform(delete("/api/v1/projects/1/notes/7?expectedVersion=0").with(actor("TESTER")).with(Objects.requireNonNull(csrf()))).andExpect(status().isForbidden());
        doThrow(new BusinessException(409,"VERSION_CONFLICT","Dữ liệu đã thay đổi")).when(service).remove(1,"person",7,0L);
        mvc.perform(delete("/api/v1/projects/1/notes/7?expectedVersion=0").with(actor("PM")).with(Objects.requireNonNull(csrf()))).andExpect(status().isConflict());
    }
}
