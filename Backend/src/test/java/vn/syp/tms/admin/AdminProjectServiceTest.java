package vn.syp.tms.admin;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class AdminProjectServiceTest {
    final WorkItemStore db=mock(WorkItemStore.class);final IdentityService identity=mock(IdentityService.class);
    final ProjectService projects=mock(ProjectService.class);final ProjectAudit audit=mock(ProjectAudit.class);
    final AdminProjectService service=new AdminProjectService(db,identity,projects,audit,mock(DeviceInventoryService.class));
    final ProjectDtos.CreateProject p=new ProjectDtos.CreateProject("AA","Alpha","","UTC");
    void admin(){when(identity.current("admin")).thenReturn(new IdentityUser("admin","Admin","hash","ADMIN"));}
    @Test void onlyCurrentAdminAndExplicitPmCanCreate(){
        doThrow(new BusinessException(403,"ADMIN_REQUIRED","admin only")).when(projects).requireAdmin("pm");
        assertEquals(403,assertThrows(BusinessException.class,()->service.create("pm",new AdminProjectService.Create(p,List.of()))).status());
        admin();assertEquals("PM_REQUIRED",assertThrows(BusinessException.class,()->service.create("admin",new AdminProjectService.Create(p,List.of(new AdminProjectService.InitialMember("dev","DEV"))))).code());
        verifyNoInteractions(db,audit);
    }
    @Test void creationAssignsOnlySelectedPeople(){
        admin();when(db.insert(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(12L);
        var selected=List.of(new AdminProjectService.InitialMember("pm","PM"),new AdminProjectService.InitialMember("dev","DEV"));
        service.create("admin",new AdminProjectService.Create(p,selected));
        verify(projects).addOrUpdateMember(12L,"admin","pm",new ProjectDtos.SetMember("PM"));
        verify(projects).addOrUpdateMember(12L,"admin","dev",new ProjectDtos.SetMember("DEV"));
        verify(projects).requireAdmin("admin");
        verify(projects).lockMemberAccount("dev");
        verify(projects).lockMemberAccount("pm");
        verifyNoMoreInteractions(projects);
        verify(audit).record(12L,"admin","PROJECT",12L,"CREATE");
        var order=inOrder(projects,db);
        order.verify(projects).requireAdmin("admin");
        order.verify(projects).lockMemberAccount("dev");order.verify(projects).lockMemberAccount("pm");
        order.verify(db).count("SELECT COUNT(*) FROM projects WHERE code=?","AA");
    }
    @Test void duplicatesAndStaleVersionsRejected(){
        admin();var m=new AdminProjectService.InitialMember("pm","PM");
        assertEquals("DUPLICATE_MEMBER",assertThrows(BusinessException.class,()->service.create("admin",new AdminProjectService.Create(p,List.of(m,m)))).code());
        when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(Map.of("version",3L));
        assertEquals(409,assertThrows(BusinessException.class,()->service.update("admin",12,new ProjectDtos.UpdateProject("New","","UTC",2L))).status());
        verify(db,never()).update(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
    }
    @Test void pagingAndRoleFiltersValidated(){admin();assertEquals(422,assertThrows(BusinessException.class,()->service.users("admin",null,"","OTHER",null,0,20)).status());assertEquals(422,assertThrows(BusinessException.class,()->service.users("admin",null,"",null,null,0,101)).status());}
    @Test void competingPatchRejectsCurrentVersionEvenWhenSnapshotIsOld(){
        admin();when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(inv->Map.of("version",inv.getArgument(0,String.class).contains("FOR UPDATE")?3L:2L));
        assertEquals("VERSION_CONFLICT",assertThrows(BusinessException.class,()->service.update("admin",12,new ProjectDtos.UpdateProject("New","","UTC",2L))).code());
        verify(db,never()).update(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
    }
    @Test void patchUsesCurrentFallbackFieldsAndConditionalVersionWrite(){
        when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(Map.of("name","Current","description","latest","timezone","UTC","version",2L));
        when(db.update(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(1);
        service.update("admin",12,new ProjectDtos.UpdateProject("New",null,null,2L));
        verify(db).update("UPDATE projects SET name=?,description=?,timezone=?,updated_by=?,updated_at=UTC_TIMESTAMP(6),lock_version=lock_version+1 WHERE id=? AND lock_version=?","New","latest","UTC","admin",12L,2L);
        verifyNoInteractions(identity);
    }
}
