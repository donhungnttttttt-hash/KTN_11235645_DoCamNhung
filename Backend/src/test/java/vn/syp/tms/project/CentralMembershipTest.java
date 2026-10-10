package vn.syp.tms.project;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.shared.web.BusinessException;

class CentralMembershipTest {
    final ProjectRepository projects=mock(ProjectRepository.class);
    final MembershipRepository memberships=mock(MembershipRepository.class);
    final IdentityService identity=mock(IdentityService.class);
    final IdentityUserRepository users=mock(IdentityUserRepository.class);
    final ProjectService service=new ProjectService(projects,memberships,identity,mock(ProjectAudit.class),users);
    static IdentityUserRepository.CurrentAccount account(String role) {
        return new IdentityUserRepository.CurrentAccount() {
            public String getId(){return "id";}
            public String getUsername(){return "user";}
            public String getDisplayName(){return "User";}
            public String getRole(){return role;}
            public boolean getEnabled(){return true;}
        };
    }
    void admin() {
        when(identity.lockCurrent("admin")).thenReturn(account("ADMIN"));
        when(projects.lockAdminState(1L)).thenReturn(Optional.of(mock(ProjectRepository.AdminState.class)));
    }
    MembershipRepository.CurrentMember member(String user,String role) {
        var member=mock(MembershipRepository.CurrentMember.class);
        when(member.getId()).thenReturn(9L);when(member.getUserId()).thenReturn(user);
        when(member.getProjectRole()).thenReturn(role);when(member.getActive()).thenReturn(true);
        when(memberships.lockMember(1L,user)).thenReturn(member);return member;
    }
    @Test void disabledPmDoesNotAllowRemovingLastEnabledPm() {
        admin();member("pm","PM");when(memberships.lockEnabledPmUsers(1L)).thenReturn(List.of("pm"));
        assertEquals("LAST_PM",assertThrows(BusinessException.class,()->service.removeMember(1L,"admin","pm",0L)).code());
        verify(memberships,never()).updateCurrent(any(),anyString(),anyBoolean(),anyLong());
    }
    @Test void distinctPmRemovalOrDemotionUsesCurrentSetInsteadOfOldTwoPmSnapshot() {
        admin();member("b","PM");when(users.lockAccount("b")).thenReturn(Optional.of(account("PM")));
        // A was removed by the transaction ahead of us; an earlier RR snapshot still contains both.
        when(memberships.findByProjectIdAndActiveTrue(1L)).thenReturn(List.of(new ProjectMembership(1L,"a","PM"),new ProjectMembership(1L,"b","PM")));
        when(memberships.lockEnabledPmUsers(1L)).thenReturn(List.of("b"));
        assertEquals("LAST_PM",assertThrows(BusinessException.class,()->service.removeMember(1L,"admin","b",0L)).code());
        assertEquals("LAST_PM",assertThrows(BusinessException.class,()->service.addOrUpdateMember(1L,"admin","b",new ProjectDtos.SetMember("TESTER",0L))).code());
        verify(memberships,never()).findByProjectIdAndActiveTrue(1L);
        verify(memberships,never()).updateCurrent(any(),anyString(),anyBoolean(),anyLong());
    }
    @Test void currentIdentityRejectsDevPromotionDespiteCachedTesterAccount() {
        admin();when(users.findById("target")).thenReturn(Optional.of(new IdentityUser("target","T","hash","TESTER")));
        when(users.lockAccount("target")).thenReturn(Optional.of(account("DEV")));
        assertEquals("INVALID_ROLE",assertThrows(BusinessException.class,()->service.addOrUpdateMember(1L,"admin","target",new ProjectDtos.SetMember("PM"))).code());
        var order=inOrder(identity,users,projects);
        order.verify(identity).lockCurrent("admin");order.verify(users).lockAccount("target");order.verify(identity).lockCurrent("admin");order.verify(projects).lockAdminState(1L);
        verify(users,never()).findById("target");verifyNoInteractions(memberships);
    }
    @Test void currentMembershipVersionWinsOverCachedEntity() {
        admin();var current=member("tester","TESTER");when(current.getVersion()).thenReturn(2L);
        when(memberships.findByProjectIdAndUserId(1L,"tester")).thenReturn(new ProjectMembership(1L,"tester","TESTER"));
        assertEquals("VERSION_CONFLICT",assertThrows(BusinessException.class,()->service.removeMember(1L,"admin","tester",0L)).code());
        verify(memberships,never()).findByProjectIdAndUserId(1L,"tester");
    }
    @Test void removalUsesCurrentStateAndVersionPredicate() {
        admin();member("tester","TESTER");when(memberships.updateCurrent(9L,"TESTER",false,0L)).thenReturn(1);
        service.removeMember(1L,"admin","tester",0L);
        var order=inOrder(identity,projects,memberships);
        order.verify(identity).lockCurrent("admin");order.verify(projects).lockAdminState(1L);
        order.verify(memberships).lockMember(1L,"tester");order.verify(memberships).updateCurrent(9L,"TESTER",false,0L);
    }
    @Test void devCannotWriteResultsEvenWithOldTesterMembership() {
        when(identity.current("dev")).thenReturn(new IdentityUser("dev","Dev","hash","DEV"));
        when(memberships.findByProjectIdAndUserId(1L,"dev")).thenReturn(new ProjectMembership(1L,"dev","TESTER"));
        assertEquals(403,assertThrows(BusinessException.class,()->service.requireNotDev(1L,"dev")).status());
        when(identity.current("dev")).thenReturn(new IdentityUser("tester","Tester","hash","TESTER"));
        when(memberships.findByProjectIdAndUserId(1L,"dev")).thenReturn(new ProjectMembership(1L,"dev","DEV"));
        assertEquals(403,assertThrows(BusinessException.class,()->service.requireNotDev(1L,"dev")).status());
    }
    @Test void pmCannotAdministerMembershipEvenOnOwnProject() {
        when(identity.lockCurrent("actor")).thenReturn(account("PM"));
        assertEquals(403,assertThrows(BusinessException.class,()->service.addOrUpdateMember(1L,"actor","target",new ProjectDtos.SetMember("TESTER"))).status());
        verifyNoInteractions(users,projects,memberships);
    }
}
