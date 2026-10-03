package vn.syp.tms.support;

import java.util.Objects;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.lang.NonNull;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;

/** Null contracts at the boundary of third-party MockMvc fixture factories. */
public final class MockMvcContracts {
    private MockMvcContracts() {}

    public static @NonNull SecurityMockMvcRequestPostProcessors.CsrfRequestPostProcessor csrf() {
        return Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf());
    }

    public static @NonNull byte[] jsonBytes(ObjectMapper mapper, Object value) throws JsonProcessingException {
        return Objects.requireNonNull(mapper.writeValueAsBytes(value));
    }
}
