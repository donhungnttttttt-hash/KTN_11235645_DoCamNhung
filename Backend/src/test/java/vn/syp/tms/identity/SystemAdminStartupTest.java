package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import vn.syp.tms.identity.SystemAdminProvisioner.*;

class SystemAdminStartupTest {
    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final PlatformTransactionManager manager = mock(PlatformTransactionManager.class);

    private SystemAdminProvisioner provisioner() {
        when(manager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(db.queryForObject(anyString(), eq(Long.class), anyString())).thenReturn(0L);
        when(db.queryForObject(anyString(), eq(Long.class))).thenReturn(0L);
        return spy(new SystemAdminProvisioner(db, encoder, mock(IdentityAudit.class), manager));
    }

    private ProvisionRequest request() {
        return new ProvisionRequest(UUID.randomUUID().toString(), List.of(
            new Mapping(1, UUID.randomUUID().toString(), "old.first", "admin", "First admin"),
            new Mapping(2, UUID.randomUUID().toString(), "old.second", "admin2", "Second admin")
        ), List.of(), "Test-fixture-only");
    }

    @Test void uninitializedDatabaseUsesTheValidatedSnapshot() {
        var service = provisioner();
        var request = request();
        doReturn(new ProvisionPreview("snapshot", false)).when(service).preflight(request);
        doReturn(new ProvisionPreview("snapshot", true)).when(service).apply(request, "snapshot");

        assertThat(service.initializeOnce(request)).isTrue();
        verify(service).apply(request, "snapshot");
        verify(manager).commit(any());
    }

    @Test void completedOperationDoesNotResetPasswordsOrRejectLaterProfileEdits() {
        var service = provisioner();
        var request = request();
        when(db.queryForObject("SELECT COUNT(*) FROM system_admin_provision_receipts WHERE operation_id=?",
            Long.class, request.operationId())).thenReturn(1L);

        assertThat(service.initializeOnce(request)).isFalse();
        verify(service, never()).preflight(any());
        verify(service, never()).apply(any(), any());
        verifyNoInteractions(encoder);
    }

    @Test void anotherOperationCannotReplaceAnExistingRegistry() {
        var service = provisioner();
        when(db.queryForObject("SELECT COUNT(*) FROM system_admin_registry", Long.class)).thenReturn(2L);

        assertThatThrownBy(() -> service.initializeOnce(request()))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("already configured");
        verify(service, never()).apply(any(), any());
        verify(manager).rollback(any());
    }

    @Test void mappingConflictStopsSetupWithoutApplying() {
        var service = provisioner();
        var request = request();
        doThrow(new IllegalArgumentException("Target login ID is occupied.")).when(service).preflight(request);

        assertThatThrownBy(() -> service.initializeOnce(request)).isInstanceOf(IllegalArgumentException.class);
        verify(service, never()).apply(any(), any());
        verify(manager).rollback(any());
    }
}
