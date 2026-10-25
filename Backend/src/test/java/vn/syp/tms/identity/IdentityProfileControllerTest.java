package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import static java.util.Objects.requireNonNull;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import vn.syp.tms.shared.web.ApiExceptionHandler;

class IdentityProfileControllerTest {
    private final IdentityUserRepository users = mock(IdentityUserRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final IdentityAudit audit = mock(IdentityAudit.class);
    private final IdentityUser admin = new IdentityUser("admin", "Admin", "admin-hash", "ADMIN");
    private final IdentityUser target = new IdentityUser("tester.old", "Old name", "existing-hash", "TESTER");
    private final ObjectMapper json = new ObjectMapper();
    private MockMvc mvc;
    private Principal actor;

    @BeforeEach void setup() {
        when(users.findById(requireId(admin))).thenReturn(Optional.of(admin));
        when(users.findById(requireId(target))).thenReturn(Optional.of(target));
        when(passwords.encode(anyString())).thenReturn("new-encoded-hash");
        var service = new IdentityService(users, passwords, jdbc, audit);
        clearInvocations(passwords);
        mvc = MockMvcBuilders.standaloneSetup(new UserController(service))
            .setControllerAdvice(new ApiExceptionHandler()).build();
        actor = new UsernamePasswordAuthenticationToken(admin.getId(), null);
    }

    @Test void profileUpdateNormalizesNameAndUsernameWithoutChangingIdentityOrPermissions() throws Exception {
        mvc.perform(request(patch(path()), Map.of("username", "Tester.New", "displayName", "  Nguyễn Nhung  ", "expectedVersion", 0)))
            .andExpect(status().isOk()).andExpect(jsonPath("username").value("tester.new"))
            .andExpect(jsonPath("displayName").value("Nguyễn Nhung"))
            .andExpect(jsonPath("id").value(target.getId())).andExpect(jsonPath("role").value("TESTER"))
            .andExpect(jsonPath("passwordHash").doesNotExist());
        assertThat(target.getPasswordHash()).isEqualTo("existing-hash");
        assertThat(target.isEnabled()).isTrue();
        assertThat(target.isCanCreateUsers()).isFalse();
        verify(users).flush();
        verify(jdbc).update("DELETE FROM SPRING_SESSION WHERE PRINCIPAL_NAME = ?", target.getId());
        verify(audit).record(eq(admin.getId()), eq(target.getId()), eq("USER_PROFILE_UPDATED"), any());
        verifyNoInteractions(passwords);
    }

    @Test void displayNameOnlyRevokesSessionsUnderExistingAccountVersionPolicy() throws Exception {
        mvc.perform(request(patch(path()), Map.of("displayName", "New name", "expectedVersion", 0)))
            .andExpect(status().isOk()).andExpect(jsonPath("username").value("tester.old"));
        assertThat(target.getPasswordHash()).isEqualTo("existing-hash");
        verify(jdbc).update("DELETE FROM SPRING_SESSION WHERE PRINCIPAL_NAME = ?", target.getId());
    }

    @Test void unchangedNormalizedProfileIsNoOpAndKeepsSessions() throws Exception {
        mvc.perform(request(patch(path()), Map.of("username", "TESTER.OLD", "displayName", " Old name ", "expectedVersion", 0)))
            .andExpect(status().isOk());
        verifyNoInteractions(jdbc, audit, passwords);
    }

    @Test void duplicateUsernameRejectsBeforeMutatingOtherFields() throws Exception {
        when(users.existsByUsername("tester.taken")).thenReturn(true);
        mvc.perform(request(patch(path()), Map.of("username", "tester.taken", "displayName", "Changed", "expectedVersion", 0)))
            .andExpect(status().isConflict()).andExpect(jsonPath("code").value("USERNAME_EXISTS"));
        assertThat(target.getDisplayName()).isEqualTo("Old name");
        assertThat(target.getUsername()).isEqualTo("tester.old");
        verifyNoInteractions(jdbc, audit, passwords);
    }

    @Test void concurrentDuplicateUsernameReturnsSafeConflict() throws Exception {
        doThrow(new DataIntegrityViolationException("private database username constraint detail")).when(users).flush();
        mvc.perform(request(patch(path()), Map.of("username", "tester.new", "expectedVersion", 0)))
            .andExpect(status().isConflict()).andExpect(jsonPath("code").value("USERNAME_EXISTS"))
            .andExpect(content().string(requireNonNull(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private database")))));
        verifyNoInteractions(jdbc, audit, passwords);
    }

    @Test void staleProfileAndPasswordUpdatesNeverMutateOrHash() throws Exception {
        mvc.perform(request(patch(path()), Map.of("displayName", "Stale", "expectedVersion", 1)))
            .andExpect(status().isConflict()).andExpect(jsonPath("code").value("VERSION_CONFLICT"));
        mvc.perform(request(put(path()+"/password"), Map.of("newPassword", "fixture-password-2026", "expectedVersion", 1)))
            .andExpect(status().isConflict()).andExpect(jsonPath("code").value("VERSION_CONFLICT"));
        assertThat(target.getDisplayName()).isEqualTo("Old name");
        assertThat(target.getPasswordHash()).isEqualTo("existing-hash");
        verifyNoInteractions(jdbc, audit, passwords);
    }

    @Test void nonAdminCannotUpdateProfileOrResetPassword() throws Exception {
        actor = new UsernamePasswordAuthenticationToken(target.getId(), null);
        mvc.perform(request(patch(path()), Map.of("displayName", "Denied", "expectedVersion", 0)))
            .andExpect(status().isForbidden());
        mvc.perform(request(put(path()+"/password"), Map.of("newPassword", "fixture-password-2026", "expectedVersion", 0)))
            .andExpect(status().isForbidden());
        verifyNoInteractions(jdbc, audit, passwords);
    }

    @Test void passwordResetHashesExactInputAndRevokesSessionsWithoutTouchingProfile() throws Exception {
        String newPassword = "  fixture-password-2026  ";
        mvc.perform(request(put(path()+"/password"), Map.of("newPassword", newPassword, "expectedVersion", 0)))
            .andExpect(status().isOk()).andExpect(jsonPath("username").value("tester.old"))
            .andExpect(jsonPath("displayName").value("Old name"))
            .andExpect(jsonPath("role").value("TESTER"))
            .andExpect(jsonPath("password").doesNotExist()).andExpect(jsonPath("passwordHash").doesNotExist())
            .andExpect(content().string(requireNonNull(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(newPassword)))));
        verify(passwords).encode(newPassword);
        assertThat(target.getPasswordHash()).isEqualTo("new-encoded-hash");
        verify(users).flush();
        verify(jdbc).update("DELETE FROM SPRING_SESSION WHERE PRINCIPAL_NAME = ?", target.getId());
        verify(audit).record(eq(admin.getId()), eq(target.getId()), eq("USER_PASSWORD_RESET"), any());
    }

    @Test void adminCanResetOwnPasswordAndOwnSessionsAreRevoked() throws Exception {
        mvc.perform(request(put("/api/v1/users/"+admin.getId()+"/password"), Map.of("newPassword", "fixture-password-2026", "expectedVersion", 0)))
            .andExpect(status().isOk());
        verify(jdbc).update("DELETE FROM SPRING_SESSION WHERE PRINCIPAL_NAME = ?", admin.getId());
    }

    @Test void missingAccountAndEmptyPatchReturnExplicitErrors() throws Exception {
        mvc.perform(request(patch("/api/v1/users/missing"), Map.of("displayName", "Name", "expectedVersion", 0)))
            .andExpect(status().isNotFound());
        mvc.perform(request(put("/api/v1/users/missing/password"), Map.of("newPassword", "fixture-password-2026", "expectedVersion", 0)))
            .andExpect(status().isNotFound());
        mvc.perform(request(patch(path()), Map.of("expectedVersion", 0)))
            .andExpect(status().isUnprocessableEntity());
        verifyNoInteractions(jdbc, audit, passwords);
    }

    @Test void validatesProfileAndPasswordBoundariesWithoutEchoingSecrets() throws Exception {
        for (String username : new String[]{"ab", " user ", "tên", "x".repeat(65), ""}) {
            mvc.perform(request(patch(path()), Map.of("username", username, "expectedVersion", 0)))
                .andExpect(status().isUnprocessableEntity());
        }
        for (String name : new String[]{"", "   ", "x".repeat(101)}) {
            mvc.perform(request(patch(path()), Map.of("displayName", name, "expectedVersion", 0)))
                .andExpect(status().isUnprocessableEntity());
        }
        for (String password : new String[]{"", "short-key", "x".repeat(129), " ".repeat(12)}) {
            mvc.perform(request(put(path()+"/password"), Map.of("newPassword", password, "expectedVersion", 0)))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("code").value("VALIDATION_ERROR"));
        }
        mvc.perform(request(put(path()+"/password"), Map.of("newPassword", "fixture-password-2026")))
            .andExpect(status().isUnprocessableEntity());
        mvc.perform(request(patch(path()), Map.of("displayName", "Name", "expectedVersion", -1)))
            .andExpect(status().isUnprocessableEntity());
        verifyNoInteractions(jdbc, audit, passwords);
    }

    @Test void acceptsExactLengthBoundariesAndDoesNotAcceptRoleEdits() throws Exception {
        for (String username : new String[]{"abc", "u".repeat(64)}) {
            mvc.perform(request(patch(path()), Map.of("username", username, "displayName", "N".repeat(100), "role", "ADMIN", "expectedVersion", 0)))
                .andExpect(status().isOk()).andExpect(jsonPath("role").value("TESTER"));
        }
        for (String password : new String[]{"p".repeat(12), "p".repeat(128)}) {
            mvc.perform(request(put(path()+"/password"), Map.of("newPassword", password, "expectedVersion", 0)))
                .andExpect(status().isOk());
            verify(passwords).encode(password);
        }
    }

    @Test void passwordCommandToStringNeverContainsCredential() {
        var input = new IdentityDtos.ResetPassword("fixture-password-2026", 0L);
        assertThat(input.toString()).isEqualTo("ResetPassword[redacted]");
    }

    private @NonNull String path() { return "/api/v1/users/"+target.getId(); }
    private @NonNull MockHttpServletRequestBuilder request(MockHttpServletRequestBuilder request, Map<String, ?> body) throws Exception {
        return request.principal(requireNonNull(actor)).contentType(requireNonNull(MediaType.APPLICATION_JSON))
            .content(requireNonNull(json.writeValueAsBytes(body)));
    }
    private static @NonNull String requireId(IdentityUser user) { return requireNonNull(user.getId()); }
}
