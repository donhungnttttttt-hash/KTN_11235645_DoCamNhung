package vn.syp.tms.config;

import static org.assertj.core.api.Assertions.assertThat;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.syp.tms.foundation.FoundationController;
import vn.syp.tms.foundation.FoundationService;
import vn.syp.tms.shared.web.RequestIdFilter;

@WebMvcTest(FoundationController.class)
@Import({SecurityConfig.class, RequestIdFilter.class})
class DefaultProfileSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired ApplicationContext context;
    @MockitoBean FoundationService service;
    @MockitoBean vn.syp.tms.identity.IdentityService users;

    @Test
    void doesNotRegisterOrExposeLocalDiagnosticEndpointsByDefault() throws Exception {
        assertThat(context.getBeansOfType(FoundationController.class)).isEmpty();
        mvc.perform(get("/api/v1/system/status")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mvc.perform(post("/api/v1/system/checks").with(csrf()).contentType("application/json")
                .content("{\"message\":\"not allowed outside local\"}"))
                .andExpect(status().isUnauthorized());
    }
}
