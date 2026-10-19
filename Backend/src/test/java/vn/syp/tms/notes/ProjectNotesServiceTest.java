package vn.syp.tms.notes;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.shared.web.BusinessException;

class ProjectNotesServiceTest {
    final ProjectNotesStore store=mock(ProjectNotesStore.class);
    final ProjectService projects=mock(ProjectService.class);
    final ProjectAudit audit=mock(ProjectAudit.class);
    final ProjectNotesService service=new ProjectNotesService(store,projects,audit);
    final ProjectNote note=new ProjectNote(7,1,"Tiêu đề","Nội dung",3,"author","editor",Instant.EPOCH,Instant.EPOCH);

    @Test void membersReadOnlyTheirProjectAndCannotUseAnotherNoteId() {
        when(store.list(1,20,0)).thenReturn(List.of(note));when(store.count(1)).thenReturn(21L);
        var result=service.list(1,"tester",0,20);
        assertEquals(21,result.totalItems());assertEquals(2,result.totalPages());assertEquals(List.of(note),result.items());
        verify(projects).requireReadAccess(1L,"tester");
        when(store.get(2,7,false)).thenReturn(null);
        assertEquals(404,assertThrows(BusinessException.class,()->service.get(2,"member",7)).status());
        verify(projects).requireReadAccess(2L,"member");
    }
    @Test void accessDeniedBeforeAnyNoteIsRead() {
        doThrow(new BusinessException(404,"NOT_FOUND","Không có quyền")).when(projects).requireReadAccess(1L,"outsider");
        assertEquals(404,assertThrows(BusinessException.class,()->service.list(1,"outsider",0,20)).status());
        assertEquals(404,assertThrows(BusinessException.class,()->service.get(1,"outsider",7)).status());verifyNoInteractions(store,audit);
    }
    @Test void everyMutationUsesPmAdminProjectGuardBeforeWriting() {
        for(String actor:List.of("tester","dev","pm-outside")) {
            doThrow(new BusinessException(403,"FORBIDDEN","Không có quyền ghi")).when(projects).lockWritableProject(1L,actor);
            assertEquals(403,assertThrows(BusinessException.class,()->service.create(1,actor,new ProjectNotesDtos.Create("Title","Body"))).status());
            assertEquals(403,assertThrows(BusinessException.class,()->service.update(1,actor,7,new ProjectNotesDtos.Update("Title","Body",3L))).status());
            assertEquals(403,assertThrows(BusinessException.class,()->service.remove(1,actor,7,3L)).status());
        }
        verifyNoInteractions(store,audit);
    }
    @Test void createAttributesRealIdentityAndReturnsSavedRow() {
        when(store.create(1,"admin","Title","Body")).thenReturn(7L);when(store.get(1,7,false)).thenReturn(note);
        assertEquals(note,service.create(1,"admin",new ProjectNotesDtos.Create("  Title  ","Body")));
        var order=inOrder(projects,store,audit);order.verify(projects).lockWritableProject(1L,"admin");order.verify(store).create(1,"admin","Title","Body");order.verify(audit).record(1L,"admin","PROJECT_NOTE",7L,"CREATE");
    }
    @Test void updateChecksVersionAndScopeAndReturnsPersistedContent() {
        when(store.get(1,7,true)).thenReturn(note);when(store.update(1,7,"pm","New","Changed",3)).thenReturn(1);
        var saved=new ProjectNote(7,1,"New","Changed",4,"author","pm",Instant.EPOCH,Instant.now());when(store.get(1,7,false)).thenReturn(saved);
        assertEquals(saved,service.update(1,"pm",7,new ProjectNotesDtos.Update("New","Changed",3L)));
        verify(audit).record(1L,"pm","PROJECT_NOTE",7L,"UPDATE");
        assertEquals(409,assertThrows(BusinessException.class,()->service.update(1,"pm",7,new ProjectNotesDtos.Update("Other","Body",2L))).status());
        when(store.get(2,7,true)).thenReturn(null);assertEquals(404,assertThrows(BusinessException.class,()->service.update(2,"pm",7,new ProjectNotesDtos.Update("Other","Body",3L))).status());
    }
    @Test void softDeleteRequiresVersionAndRejectsConcurrentOrMissingWrites() {
        when(store.get(1,7,true)).thenReturn(note);
        assertEquals(409,assertThrows(BusinessException.class,()->service.remove(1,"admin",7,2L)).status());
        when(store.archive(1,7,"admin",3)).thenReturn(0);
        assertEquals(409,assertThrows(BusinessException.class,()->service.remove(1,"admin",7,3L)).status());
        verifyNoInteractions(audit);when(store.archive(1,7,"admin",3)).thenReturn(1);service.remove(1,"admin",7,3L);
        verify(audit).record(1L,"admin","PROJECT_NOTE",7L,"ARCHIVE");
    }
    @Test void rejectsInvalidBodyVersionIdsAndPaginationWithoutWriting() {
        assertEquals(422,assertThrows(BusinessException.class,()->service.create(1,"pm",new ProjectNotesDtos.Create(" ","Body"))).status());
        assertEquals(422,assertThrows(BusinessException.class,()->service.create(1,"pm",new ProjectNotesDtos.Create("Title","x".repeat(10001)))).status());
        when(store.get(1,7,true)).thenReturn(note);
        assertEquals(422,assertThrows(BusinessException.class,()->service.update(1,"pm",7,new ProjectNotesDtos.Update("Title","Body",null))).status());
        assertEquals(422,assertThrows(BusinessException.class,()->service.remove(1,"pm",7,-1L)).status());
        assertEquals(422,assertThrows(BusinessException.class,()->service.list(1,"pm",-1,20)).status());
        assertEquals(422,assertThrows(BusinessException.class,()->service.list(1,"pm",0,101)).status());
        assertEquals(404,assertThrows(BusinessException.class,()->service.get(1,"pm",0)).status());verifyNoInteractions(audit);
    }
    @Test void anUpdateLostAfterReadCannotSucceedOrAudit() {
        when(store.get(1,7,true)).thenReturn(note);when(store.update(1,7,"pm","Title","Body",3)).thenReturn(0);
        assertEquals(409,assertThrows(BusinessException.class,()->service.update(1,"pm",7,new ProjectNotesDtos.Update("Title","Body",3L))).status());verifyNoInteractions(audit);
    }
}
