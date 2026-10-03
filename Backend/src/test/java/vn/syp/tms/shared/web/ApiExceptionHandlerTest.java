package vn.syp.tms.shared.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ApiExceptionHandlerTest {
    @RestController
    static class FailureController {
        @GetMapping("/unavailable")
        public void unavailable() { throw new DataAccessResourceFailureException("private db credentials must not leak"); }
        @GetMapping("/unexpected")
        public void unexpected() { throw new IllegalStateException("private internal detail"); }
    }

    @Test
    void mapsDatabaseFailureToSafe503() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new FailureController())
                .setControllerAdvice(new ApiExceptionHandler()).addFilters(new RequestIdFilter()).build();
        mvc.perform(get("/unavailable")).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("DATABASE_UNAVAILABLE"))
                .andExpect(jsonPath("$.requestId").isString())
                .andExpect(content().string(java.util.Objects.requireNonNull(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("credentials")))));
        mvc.perform(get("/unexpected")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(content().string(java.util.Objects.requireNonNull(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private")))));
    }
}

