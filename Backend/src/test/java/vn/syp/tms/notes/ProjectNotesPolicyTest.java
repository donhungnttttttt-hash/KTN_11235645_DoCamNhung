package vn.syp.tms.notes;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.shared.web.BusinessException;

/** Exercise real project guards rather than trusting role hints supplied by the UI. */
class ProjectNotesPolicyTest {
    final ProjectRepository projectRepo=mock(ProjectRepository.class);
    final MembershipRepository members=mock(MembershipRepository.class);
    final IdentityService identity=mock(IdentityService.class);
    final ProjectNotesStore store=mock(ProjectNotesStore.class);
    final ProjectService projects=new ProjectService(projectRepo,members,identity,mock(ProjectAudit.class),mock(IdentityUserRepository.class),mock(ProjectActorService.class));
    final ProjectNotesService notes=new ProjectNotesService(store,projects,mock(ProjectAudit.class));
    final ProjectNote row=new ProjectNote(7,1,"Title","Body",0,"actor","actor",Instant.EPOCH,Instant.EPOCH);
    void actor(String accountRole,String projectRole){
        when(identity.current("actor")).thenReturn(new IdentityUser("actor","Actor","hash",accountRole));
        when(identity.isAdmin("actor")).thenReturn("ADMIN".equals(accountRole));
        when(projectRepo.existsById(1L)).thenReturn(true);
        when(projectRepo.lockAdminState(1L)).thenReturn(Optional.of(mock(ProjectRepository.AdminState.class)));
        if(projectRole!=null)when(members.findByProjectIdAndUserId(1L,"actor")).thenReturn(new ProjectMembership(1L,"actor",projectRole));
        when(store.get(1,7,false)).thenReturn(row);when(store.create(1,"actor","Title","Body")).thenReturn(7L);
    }
    @Test void adminWritesWithoutMembershipAndAttributesIdentityDirectly(){actor("ADMIN",null);assertEquals(row,notes.create(1,"actor",new ProjectNotesDtos.Create("Title","Body")));}
    @Test void projectPmWritesWithinProject(){actor("PM","PM");assertEquals(row,notes.create(1,"actor",new ProjectNotesDtos.Create("Title","Body")));}
    @Test void globalPmAiCapabilityDoesNotGrantNotesOutsideMembership(){
        actor("PM",null);assertEquals(404,assertThrows(BusinessException.class,()->notes.get(1,"actor",7)).status());
        assertEquals(404,assertThrows(BusinessException.class,()->notes.create(1,"actor",new ProjectNotesDtos.Create("Title","Body"))).status());verifyNoInteractions(store);
    }
    @Test void testerReadsButCannotWrite(){actor("TESTER","TESTER");assertEquals(row,notes.get(1,"actor",7));assertEquals(403,assertThrows(BusinessException.class,()->notes.create(1,"actor",new ProjectNotesDtos.Create("Title","Body"))).status());verify(store,never()).create(anyLong(),anyString(),anyString(),anyString());}
    @Test void devReadsButCannotWriteEvenWithOldPmMembership(){actor("DEV","PM");assertEquals(row,notes.get(1,"actor",7));assertEquals(403,assertThrows(BusinessException.class,()->notes.create(1,"actor",new ProjectNotesDtos.Create("Title","Body"))).status());verify(store,never()).create(anyLong(),anyString(),anyString(),anyString());}
    @Test void archivedProjectsRemainReadableAndBlockWrites(){actor("PM","PM");var archived=mock(ProjectRepository.AdminState.class);when(archived.getArchived()).thenReturn(true);when(projectRepo.lockAdminState(1L)).thenReturn(Optional.of(archived));assertEquals(row,notes.get(1,"actor",7));assertEquals(409,assertThrows(BusinessException.class,()->notes.create(1,"actor",new ProjectNotesDtos.Create("Title","Body"))).status());verify(store,never()).create(anyLong(),anyString(),anyString(),anyString());}
}
