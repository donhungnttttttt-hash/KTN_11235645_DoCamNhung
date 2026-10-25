package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.syp.tms.shared.web.BusinessException;

class IdentityUpdatePolicyTest {
    @Test void lockingAndUnlockingKeepProfileAndCredentialWhileAuditingBothTransitions() {
        var f = new Fixture("TESTER");
        var disabled = f.update(new IdentityDtos.UpdateUser(false, null, 0L));
        assertThat(disabled.enabled()).isFalse();
        assertThat(disabled.username()).isEqualTo("target");
        var enabled = f.update(new IdentityDtos.UpdateUser(true, null, 0L));
        assertThat(enabled.enabled()).isTrue();
        assertThat(enabled.displayName()).isEqualTo("Target");
        assertThat(f.target.getPasswordHash()).isEqualTo("existing-hash");
        assertThat(enabled.role()).isEqualTo("TESTER");
        verify(f.audit).record(f.admin.getId(), f.target.getId(), "USER_DISABLED", "request");
        verify(f.audit).record(f.admin.getId(), f.target.getId(), "USER_ENABLED", "request");
        verify(f.audit, never()).record(any(), any(), eq("USER_PROFILE_UPDATED"), any());
        verify(f.jdbc, times(2)).update("DELETE FROM SPRING_SESSION WHERE PRINCIPAL_NAME = ?", f.target.getId());
        verifyNoInteractions(f.passwords);
    }

    @Test void grantingAndRevokingPmDelegationStillRevokesSessionsAndAuditsBothTransitions() {
        var f = new Fixture("PM");
        assertThat(f.update(new IdentityDtos.UpdateUser(null, true, 0L)).canCreateUsers()).isTrue();
        assertThat(f.update(new IdentityDtos.UpdateUser(null, false, 0L)).canCreateUsers()).isFalse();
        assertThat(f.target.getRole()).isEqualTo("PM");
        assertThat(f.target.getUsername()).isEqualTo("target");
        verify(f.audit).record(f.admin.getId(), f.target.getId(), "CREATE_USERS_GRANTED", "request");
        verify(f.audit).record(f.admin.getId(), f.target.getId(), "CREATE_USERS_REVOKED", "request");
        verify(f.audit, never()).record(any(), any(), eq("USER_PROFILE_UPDATED"), any());
        verify(f.jdbc, times(2)).update("DELETE FROM SPRING_SESSION WHERE PRINCIPAL_NAME = ?", f.target.getId());
    }

    @Test void mixedProfileUnlockAndDelegationUpdatesReturnOneCoherentAccountAndExpireSessionsOnce() {
        var f = new Fixture("PM");
        f.target.setEnabled(false);
        var result = f.update(new IdentityDtos.UpdateUser(true, true, 0L, "NEW.PM", " New PM "));
        assertThat(result.username()).isEqualTo("new.pm");
        assertThat(result.displayName()).isEqualTo("New PM");
        assertThat(result.enabled()).isTrue();
        assertThat(result.canCreateUsers()).isTrue();
        assertThat(result.id()).isEqualTo(f.target.getId());
        assertThat(result.role()).isEqualTo("PM");
        assertThat(f.target.getPasswordHash()).isEqualTo("existing-hash");
        verify(f.users).flush();
        verify(f.audit).record(f.admin.getId(), f.target.getId(), "USER_PROFILE_UPDATED", "request");
        verify(f.audit).record(f.admin.getId(), f.target.getId(), "USER_ENABLED", "request");
        verify(f.audit).record(f.admin.getId(), f.target.getId(), "CREATE_USERS_GRANTED", "request");
        verify(f.jdbc).update("DELETE FROM SPRING_SESSION WHERE PRINCIPAL_NAME = ?", f.target.getId());
    }

    @Test void unchangedAccountStateAndDelegationDoNotInvalidateSessionsOrWriteAudit() {
        var f = new Fixture("PM");
        f.target.setCanCreateUsers(true);
        var result = f.update(new IdentityDtos.UpdateUser(true, true, 0L));
        assertThat(result.enabled()).isTrue();
        assertThat(result.canCreateUsers()).isTrue();
        verify(f.users, never()).flush();
        verifyNoInteractions(f.jdbc, f.audit, f.passwords);
    }

    @Test void nonPmDelegationRequestDoesNotPartiallyApplyProfileOrEnabledChanges() {
        var f = new Fixture("TESTER");
        assertThatThrownBy(() -> f.update(new IdentityDtos.UpdateUser(false, true, 0L, "changed", "Changed")))
            .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.code()).isEqualTo("VALIDATION_ERROR"));
        assertThat(f.target.getUsername()).isEqualTo("target");
        assertThat(f.target.getDisplayName()).isEqualTo("Target");
        assertThat(f.target.isEnabled()).isTrue();
        assertThat(f.target.isCanCreateUsers()).isFalse();
        verify(f.users, never()).flush();
        verifyNoInteractions(f.jdbc, f.audit, f.passwords);
    }

    @Test void duplicateUsernameDoesNotPartiallyApplyAccountStateOrDelegation() {
        var f = new Fixture("PM");
        when(f.users.existsByUsername("taken")).thenReturn(true);
        assertThatThrownBy(() -> f.update(new IdentityDtos.UpdateUser(false, true, 0L, "taken", "Changed")))
            .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.code()).isEqualTo("USERNAME_EXISTS"));
        assertThat(f.target.getUsername()).isEqualTo("target");
        assertThat(f.target.getDisplayName()).isEqualTo("Target");
        assertThat(f.target.isEnabled()).isTrue();
        assertThat(f.target.isCanCreateUsers()).isFalse();
        verify(f.users, never()).flush();
        verifyNoInteractions(f.jdbc, f.audit, f.passwords);
    }

    @Test void databaseFailureWithoutUsernameChangeIsNotMisreportedAsDuplicateUsername() {
        var f = new Fixture("TESTER");
        var failure = new DataIntegrityViolationException("fixture persistence failure");
        doThrow(failure).when(f.users).flush();
        assertThatThrownBy(() -> f.update(new IdentityDtos.UpdateUser(null, null, 0L, null, "Updated"))).isSameAs(failure);
        verifyNoInteractions(f.jdbc, f.audit, f.passwords);
    }

    @Test void unicodeWhitespaceOnlyDisplayNameIsRejectedBeforeMutatingAccount() {
        var f = new Fixture("TESTER");
        assertThatThrownBy(() -> f.update(new IdentityDtos.UpdateUser(false, null, 0L, null, "\u2003\u2003")))
            .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.code()).isEqualTo("VALIDATION_ERROR"));
        assertThat(f.target.getDisplayName()).isEqualTo("Target");
        assertThat(f.target.isEnabled()).isTrue();
        verifyNoInteractions(f.jdbc, f.audit, f.passwords);
    }

    @Test void serviceBoundaryRejectsMissingOrNegativeVersionsBeforeAnyProfileOrPasswordMutation() {
        var f = new Fixture("TESTER");
        for (Long version : new Long[]{null, -1L}) {
            assertThatThrownBy(() -> f.update(new IdentityDtos.UpdateUser(null, null, version, null, "Updated")))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.code()).isEqualTo("VALIDATION_ERROR"));
            assertThatThrownBy(() -> f.service.resetPassword(f.admin.getId(), f.target.getId(),
                new IdentityDtos.ResetPassword("fixture-password-2026", version), "request"))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.code()).isEqualTo("VALIDATION_ERROR"));
        }
        assertThat(f.target.getDisplayName()).isEqualTo("Target");
        assertThat(f.target.getPasswordHash()).isEqualTo("existing-hash");
        verify(f.users, never()).flush();
        verifyNoInteractions(f.jdbc, f.audit, f.passwords);
    }

    private static final class Fixture {
        final IdentityUserRepository users = mock(IdentityUserRepository.class);
        final PasswordEncoder passwords = mock(PasswordEncoder.class);
        final JdbcTemplate jdbc = mock(JdbcTemplate.class);
        final IdentityAudit audit = mock(IdentityAudit.class);
        final IdentityUser admin = new IdentityUser("admin", "Admin", "admin-hash", "ADMIN");
        final IdentityUser target;
        final IdentityService service;
        Fixture(String role) {
            target = new IdentityUser("target", "Target", "existing-hash", role);
            when(users.findById(java.util.Objects.requireNonNull(admin.getId()))).thenReturn(Optional.of(admin));
            when(users.findById(java.util.Objects.requireNonNull(target.getId()))).thenReturn(Optional.of(target));
            service = new IdentityService(users, passwords, jdbc, audit);
            clearInvocations(passwords);
        }
        IdentityDtos.User update(IdentityDtos.UpdateUser input) {
            return service.update(admin.getId(), target.getId(), input, "request");
        }
    }
}
