package vn.syp.tms.shared.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ApiExceptionHandlerTest {
    @RestController
    static class FailureController {
        @org.springframework.web.bind.annotation.PostMapping(value="/json",consumes="application/json")
        public void json(@org.springframework.web.bind.annotation.RequestBody java.util.Map<String,String> body) {}
        @org.springframework.web.bind.annotation.PostMapping(value="/upload",consumes="multipart/form-data")
        public void upload(@org.springframework.web.bind.annotation.RequestPart("file") org.springframework.web.multipart.MultipartFile file) {}
        @GetMapping("/unavailable")
        public void unavailable() { throw new DataAccessResourceFailureException("private db credentials must not leak"); }
        @GetMapping("/unexpected")
        public void unexpected() { throw new IllegalStateException("private internal detail"); }
    }

    @Test void invalidTransportRequestsAreClientErrorsWithSafeContracts() throws Exception {
        var mvc=MockMvcBuilders.standaloneSetup(new FailureController()).setControllerAdvice(new ApiExceptionHandler()).build();
        mvc.perform(post("/unavailable")).andExpect(status().isMethodNotAllowed()).andExpect(header().string("Allow","GET")).andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
        mvc.perform(post("/json").contentType("text/plain").content("secret input"))
            .andExpect(status().isUnsupportedMediaType()).andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
        mvc.perform(multipart("/upload")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
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

