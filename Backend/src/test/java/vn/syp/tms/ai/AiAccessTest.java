package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.*;
import vn.syp.tms.identity.*;
import vn.syp.tms.workitem.WorkItemStore;
import vn.syp.tms.shared.web.BusinessException;

class AiAccessTest {
    private final WorkItemStore db=mock(WorkItemStore.class);
    private final IdentityService identity=mock(IdentityService.class);
    private final IdentityUserRepository.CurrentAccount user=mock(IdentityUserRepository.CurrentAccount.class);
    private final AiAccess access=new AiAccess(db,identity);

    @BeforeEach void setup() {
        when(identity.lockCurrent("actor")).thenReturn(user);
        when(db.row(Objects.requireNonNull(startsWith("SELECT archived_at")),eq(1L))).thenReturn(new HashMap<>(Map.of("id",1L)));
    }
    private void role(String global,String project) {
        when(user.getRole()).thenReturn(Objects.requireNonNull(global));
        when(db.rows(Objects.requireNonNull(startsWith("SELECT id,project_role")),eq(1L),eq("actor")))
                .thenReturn(project==null?List.of():List.of(Map.of("id",5L,"role",project)));
    }
    @Test void eachRoleHasItsOwnTasks() {
        for(String role:List.of("PM","TESTER","DEV")) {
            role(role,role);
            var context=access.authorize(1,"actor",false);
            assertThat(context.role()).isEqualTo(role);
            assertThat(AiPurpose.forRole(role)).isNotEmpty().allMatch(p->p.role().equals(role));
        }
    }
    @Test void adminCanReviewProjectWithoutBecomingProjectPm() {
        role("ADMIN",null);
        var context=access.authorize(1,"actor",false);
        assertThat(context.role()).isEqualTo("ADMIN");
        assertThat(AiPurpose.forRole(context.role())).containsExactly(AiPurpose.ADMIN_PROJECT_REVIEW);
        assertThatThrownBy(()->access.require(context,AiPurpose.PM_PROGRESS_REPORT)).isInstanceOf(BusinessException.class);
    }
    @Test void devGlobalRoleCannotEscalateThroughOldPmMembership() {
        role("DEV","PM");
        assertThat(AiPurpose.forRole(access.authorize(1,"actor",false).role())).isEmpty();
    }
    @Test void membershipIsRequiredForNonAdmin() {
        role("TESTER",null);
        assertThatThrownBy(()->access.authorize(1,"actor",false)).isInstanceOf(BusinessException.class);
    }
    @Test void archivedProjectAllowsReadButNoGeneration() {
        role("PM","PM");
        when(db.row(Objects.requireNonNull(startsWith("SELECT archived_at")),eq(1L))).thenReturn(Map.of("archivedAt",java.time.Instant.now()));
        assertThat(access.authorize(1,"actor",false).archived()).isTrue();
        assertThatThrownBy(()->access.authorize(1,"actor",true)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("ARCHIVED"));
    }
}
