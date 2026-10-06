package vn.syp.tms.identity;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.syp.tms.shared.web.BusinessException;

class IdentityPolicyTest {
    @Test void testerCannotCreateAndDelegatedPmCannotCreateDev() {
        var users=mock(IdentityUserRepository.class);var jdbc=mock(JdbcTemplate.class);var audit=mock(IdentityAudit.class);
        var service=new IdentityService(users,mock(PasswordEncoder.class),jdbc,audit);
        var tester=new IdentityUser("tester","Tester","hash","TESTER");
        var pm=new IdentityUser("pm","PM","hash","PM");pm.setCanCreateUsers(true);
        when(users.findById("tester")).thenReturn(Optional.of(tester));when(users.findById("pm")).thenReturn(Optional.of(pm));
        var input=new IdentityDtos.CreateUser("dev.new","Dev","example-password","DEV");
        assertEquals(403,assertThrows(BusinessException.class,()->service.create("tester",input,"request")).status());
        assertEquals(403,assertThrows(BusinessException.class,()->service.create("pm",input,"request")).status());
        assertTrue(mockingDetails(users).getInvocations().stream().noneMatch(i->i.getMethod().getName().equals("saveAndFlush")));verifyNoInteractions(jdbc,audit);
    }
    @Test void adminCannotDisableSelf() {
        var users=mock(IdentityUserRepository.class);var audit=mock(IdentityAudit.class);var jdbc=mock(JdbcTemplate.class);
        var service=new IdentityService(users,mock(PasswordEncoder.class),jdbc,audit);
        var admin=new IdentityUser("admin","Admin","hash","ADMIN");when(users.findById(java.util.Objects.requireNonNull(admin.getId()))).thenReturn(Optional.of(admin));
        assertEquals("SELF_DISABLE",assertThrows(BusinessException.class,()->service.update(admin.getId(),admin.getId(),new IdentityDtos.UpdateUser(false,null,0L),"request")).code());
        assertTrue(admin.isEnabled());verifyNoInteractions(jdbc,audit);
    }
}
