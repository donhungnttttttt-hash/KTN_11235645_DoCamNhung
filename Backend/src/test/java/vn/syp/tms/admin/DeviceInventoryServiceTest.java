package vn.syp.tms.admin;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.workitem.WorkItemStore;
import vn.syp.tms.shared.web.BusinessException;
class DeviceInventoryServiceTest {
 final WorkItemStore db=mock(WorkItemStore.class);
 final IdentityService identity=mock(IdentityService.class);
 final ProjectService projects=mock(ProjectService.class);
 final DeviceInventoryService service=new DeviceInventoryService(db,identity,projects,mock(ProjectAudit.class));
 @Test void pmCannotWriteInventory(){
  when(identity.current("pm")).thenReturn(new IdentityUser("pm","PM","hash","PM"));
  assertEquals(403,assertThrows(BusinessException.class,()->service.assign("pm",new DeviceInventoryDtos.Assign(1,1,"pm",null,"",0L))).status());
  verifyNoInteractions(db);
 }
 @Test void expectedReturnUsesProjectLocalDate(){
  assertDoesNotThrow(()->DeviceInventoryService.validateDate(java.time.LocalDate.of(2026,10,5),"Pacific/Honolulu",java.time.Instant.parse("2026-10-06T01:00:00Z")));
  assertEquals(422,assertThrows(BusinessException.class,()->DeviceInventoryService.validateDate(java.time.LocalDate.of(2026,10,5),"Asia/Ho_Chi_Minh",java.time.Instant.parse("2026-10-06T01:00:00Z"))).status());
 }
 void admin(){when(identity.current("admin")).thenReturn(new IdentityUser("admin","Admin","hash","ADMIN"));lenient().when(db.rows(java.util.Objects.requireNonNull(contains("FROM identity_users")),any(Object[].class))).thenReturn(List.of(Map.of("id","person")));}
 @Test void staleAndAllocatedMachinesCannotBeAssigned(){
  admin();when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(i->((String)i.getArgument(0)).contains("FROM projects")?Map.of("timezone","UTC"):Map.of("version",2L,"conditionCode","AVAILABLE"));
  assertEquals(409,assertThrows(BusinessException.class,()->service.assign("admin",new DeviceInventoryDtos.Assign(1,2,"person",null,"",1L))).status());
  when(db.rows(java.util.Objects.requireNonNull(contains("active_asset_id")),any(Object[].class))).thenReturn(List.of(Map.of("id",1L)));
  assertEquals("ASSET_UNAVAILABLE",assertThrows(BusinessException.class,()->service.assign("admin",new DeviceInventoryDtos.Assign(1,2,"person",null,"",2L))).code());
  verify(db,never()).insert(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
 }
 @Test void archivedAndOutsiderRecipientRejected(){
  admin();when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(i->((String)i.getArgument(0)).contains("FROM projects")?Map.of("timezone","UTC","archivedAt","archived"):Map.of("version",0L,"conditionCode","AVAILABLE"));
  assertEquals("ARCHIVED",assertThrows(BusinessException.class,()->service.assign("admin",new DeviceInventoryDtos.Assign(1,2,"person",null,"",0L))).code());
  when(db.row(java.util.Objects.requireNonNull(contains("FROM projects")),any(Object[].class))).thenReturn(Map.of("timezone","UTC"));
  assertEquals("INVALID_RECIPIENT",assertThrows(BusinessException.class,()->service.assign("admin",new DeviceInventoryDtos.Assign(1,2,"person",null,"",0L))).code());
  verify(db,never()).insert(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
 }
 @Test void allocatedAssetCannotBePutIntoMaintenanceOrRetired(){
  admin();when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(Map.of("version",0L));
  when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(List.of(Map.of("id",5L)));
  for(String condition:List.of("MAINTENANCE","RETIRED"))assertEquals("ASSET_ALLOCATED",assertThrows(BusinessException.class,()->service.update("admin",1,new DeviceInventoryDtos.Asset("A","IPAD","iPad",null,null,null,condition,"",0L))).code());
  verify(db,never()).update(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
 }
 @Test void archivedProjectCanReturnButSameAllocationCannotReturnTwice(){
  admin();when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);if(sql.contains("FROM projects"))return Map.of("archivedAt","archived");if(sql.contains("FROM device_assets"))return Map.of("version",1L);return Map.of("projectId",2L,"assetId",1L,"version",0L);});
  service.receive("admin",5,new DeviceInventoryDtos.Return(0L,"MAINTENANCE","Screen"));
  verify(db).update(java.util.Objects.requireNonNull(contains("UPDATE device_allocations")),eq("admin"),eq("MAINTENANCE"),eq("Screen"),eq(5L));
  when(db.row(java.util.Objects.requireNonNull(contains("returned_at AS returnedAt")),any(Object[].class))).thenReturn(Map.of("projectId",2L,"assetId",1L,"version",1L,"returnedAt","returned"));
  assertEquals("ALREADY_RETURNED",assertThrows(BusinessException.class,()->service.receive("admin",5,new DeviceInventoryDtos.Return(1L,"AVAILABLE",""))).code());
 }
 @Test void initialRecipientsMustBeSelectedAndAssetsLockInAscendingOrder(){
  admin();var a=new DeviceInventoryDtos.Initial(9,"member",null,"",0L);var b=new DeviceInventoryDtos.Initial(2,"member",null,"",0L);
  assertEquals("INVALID_RECIPIENT",assertThrows(BusinessException.class,()->service.allocateInitial("admin",1,List.of(a),Set.of("other"))).code());
  assertEquals("DUPLICATE_ASSET",assertThrows(BusinessException.class,()->service.allocateInitial("admin",1,List.of(a,a),Set.of("member"))).code());
  when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(i->((String)i.getArgument(0)).contains("FROM projects")?Map.of("timezone","UTC"):Map.of("version",0L,"conditionCode","AVAILABLE"));
  when(db.rows(java.util.Objects.requireNonNull(contains("project_memberships")),any(Object[].class))).thenReturn(List.of(Map.of("id",3L)));
  service.allocateInitial("admin",1,List.of(a,b),Set.of("member"));
  var order=inOrder(db);order.verify(db).row(java.util.Objects.requireNonNull(contains("FROM projects")),eq(1L));order.verify(db).row(java.util.Objects.requireNonNull(contains("FROM device_assets")),eq(2L));order.verify(db).row(java.util.Objects.requireNonNull(contains("FROM device_assets")),eq(9L));
 }
 @Test void membershipReadIsLockingAndFollowsProjectAndAssetLocks(){
  admin();when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(i->((String)i.getArgument(0)).contains("FROM projects")?Map.of("timezone","UTC"):Map.of("version",0L,"conditionCode","AVAILABLE"));
  when(db.rows(java.util.Objects.requireNonNull(contains("project_memberships")),any(Object[].class))).thenReturn(List.of(Map.of("id",3L)));
  service.assign("admin",new DeviceInventoryDtos.Assign(1,2,"member",null,"",0L));
  var order=inOrder(db);order.verify(db).rows(java.util.Objects.requireNonNull(contains("enabled=TRUE FOR SHARE")),eq("member"));order.verify(db).row(java.util.Objects.requireNonNull(contains("FROM projects")),eq(2L));order.verify(db).row(java.util.Objects.requireNonNull(contains("FROM device_assets")),eq(1L));order.verify(db).rows(java.util.Objects.requireNonNull(contains("active=TRUE FOR UPDATE")),eq(2L),eq("member"));
 }
}
