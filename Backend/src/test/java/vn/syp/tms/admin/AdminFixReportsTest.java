package vn.syp.tms.admin;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class AdminFixReportsTest {
 final WorkItemStore db=mock(WorkItemStore.class);
 final IdentityService identity=mock(IdentityService.class);
 final ProjectService projects=mock(ProjectService.class);
 final DeviceInventoryService inventory=new DeviceInventoryService(db,identity,projects,mock(ProjectAudit.class));

 void fixture(String role){
  when(identity.current("admin")).thenReturn(new IdentityUser("admin","Admin","hash","ADMIN"));
  when(db.rows(java.util.Objects.requireNonNull(contains("FROM identity_users")),any(Object[].class))).thenReturn(List.of(Map.of("id","member")));
  when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(i->((String)i.getArgument(0)).contains("FROM projects")?Map.of("timezone","UTC"):Map.of("version",0L,"conditionCode","AVAILABLE"));
  when(db.rows(java.util.Objects.requireNonNull(contains("FROM project_memberships")),any(Object[].class))).thenReturn(List.of(Map.of("id",3L,"projectRole",role)));
 }
 @Test void adminCannotHandMachineToTesterEvenWhenTheyAreAnActiveProjectMember(){
  fixture("TESTER");
  var error=assertThrows(BusinessException.class,()->inventory.assign("admin",new DeviceInventoryDtos.Assign(1,2,"member",null,"",0L)));
  assertEquals("INVALID_RECIPIENT",error.code());
  verify(db,never()).insert(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
 }
 @Test void initialMachinesCannotUseDifferentPmRecipients(){
  fixture("PM");
  var error=assertThrows(BusinessException.class,()->inventory.allocateInitial("admin",2,List.of(new DeviceInventoryDtos.Initial(1,"a",null,"",0L),new DeviceInventoryDtos.Initial(2,"b",null,"",0L)),Set.of("a","b")));
  assertEquals("SINGLE_PM_REQUIRED",error.code());
  verify(db,never()).insert(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
 }
 @Test void disabledAccountAndInactivePmCannotReceiveMachines(){
  fixture("PM");
  when(db.rows(java.util.Objects.requireNonNull(contains("FROM identity_users")),any(Object[].class))).thenReturn(List.of());
  assertEquals("INVALID_RECIPIENT",assertThrows(BusinessException.class,()->inventory.assign("admin",new DeviceInventoryDtos.Assign(1,2,"member",null,"",0L))).code());
  when(db.rows(java.util.Objects.requireNonNull(contains("FROM identity_users")),any(Object[].class))).thenReturn(List.of(Map.of("id","member")));
  when(db.rows(java.util.Objects.requireNonNull(contains("FROM project_memberships")),any(Object[].class))).thenReturn(List.of());
  assertEquals("INVALID_RECIPIENT",assertThrows(BusinessException.class,()->inventory.assign("admin",new DeviceInventoryDtos.Assign(1,2,"member",null,"",0L))).code());
  verify(db,never()).insert(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
 }
 @Test void enabledProjectPmCanReceiveMachinesWithoutChangingTheirGlobalRole(){
  fixture("PM");
  assertDoesNotThrow(()->inventory.allocateInitial("admin",2,List.of(new DeviceInventoryDtos.Initial(1,"member",null,"Device A",0L),new DeviceInventoryDtos.Initial(2,"member",null,"Device B",0L)),Set.of("member")));
  verify(db,times(2)).insert(java.util.Objects.requireNonNull(contains("INSERT INTO device_allocations")),any(Object[].class));
 }
}
