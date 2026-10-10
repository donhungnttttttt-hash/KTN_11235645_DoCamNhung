package vn.syp.tms.project;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.math.BigInteger;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.data.projection.SpelAwareProxyProjectionFactory;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.identity.IdentityUserRepository;
import vn.syp.tms.shared.web.BusinessException;

class AdminStateProjectionTest {
    private ProjectRepository.AdminState state(Number archived) {
        return new SpelAwareProxyProjectionFactory().createProjection(
                ProjectRepository.AdminState.class, Objects.requireNonNull(Map.of("archived", archived)));
    }

    @Test void numericNativeExpressionPreservesBothArchiveStates() {
        for (Number zero : new Number[]{0, 0L, BigInteger.ZERO}) {
            assertFalse(state(zero).getArchived());
        }
        for (Number one : new Number[]{1, 1L, BigInteger.ONE}) {
            assertTrue(state(one).getArchived());
        }
    }

    @Test void currentNumericStateAllowsActiveProjectAndRejectsArchivedBeforeMembershipWrites() {
        var repository = mock(ProjectRepository.class);
        var memberships = mock(MembershipRepository.class);
        var identity = mock(IdentityService.class);
        var account = mock(IdentityUserRepository.CurrentAccount.class);
        when(account.getRole()).thenReturn("ADMIN");
        when(identity.lockCurrent("admin")).thenReturn(account);
        var service = new ProjectService(repository, memberships, identity,
                mock(ProjectAudit.class), mock(IdentityUserRepository.class));
        when(repository.lockAdminState(1L)).thenReturn(Optional.of(state(0)));
        assertDoesNotThrow(() -> service.lockAdminProject(1L, "admin"));
        when(repository.lockAdminState(1L)).thenReturn(Optional.of(state(1)));
        var error = assertThrows(BusinessException.class,
                () -> service.removeMember(1L, "admin", "tester", 0L));
        assertEquals(409, error.status());
        assertEquals("ARCHIVED", error.code());
        verifyNoInteractions(memberships);
    }
}
