package vn.syp.tms.admin;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.workitem.WorkItemStore;

class AdminSearchTest {
 // Mockito registers the capture matcher but returns a dummy null, not the captured SQL.
 private static @org.springframework.lang.NonNull String captureSql(org.mockito.ArgumentCaptor<String> captor){
  String placeholder=captor.capture();
  return placeholder==null?"":placeholder;
 }
 final WorkItemStore db=mock(WorkItemStore.class);
 final IdentityService identity=mock(IdentityService.class);
 void admin(){when(identity.current("admin")).thenReturn(new IdentityUser("admin","Admin","hash","ADMIN"));}
 @Test void membershipStatusFiltersCountAndPageBeforePagination(){
  admin();var service=new AdminProjectService(db,identity,mock(ProjectService.class),mock(ProjectAudit.class),mock(DeviceInventoryService.class));
  for(Boolean hasProject:Arrays.asList(true,false,null)){
   clearInvocations(db);
   service.users("admin",null,"","TESTER",true,false,hasProject,1,20);
   var countSql=org.mockito.ArgumentCaptor.forClass(String.class);
   var pageSql=org.mockito.ArgumentCaptor.forClass(String.class);
   verify(db).count(captureSql(countSql),eq("TESTER"),eq(true));
   verify(db).rows(captureSql(pageSql),eq("TESTER"),eq(true),eq(20),eq(20L));
   String predicate="EXISTS(SELECT 1 FROM project_memberships assigned WHERE assigned.user_id=u.id AND assigned.active=TRUE)";
   if(hasProject==null){assertFalse(countSql.getValue().contains(predicate));assertFalse(pageSql.getValue().contains(predicate));}
   else {String expected=" AND "+(hasProject?"":"NOT ")+predicate;assertTrue(countSql.getValue().contains(expected));assertTrue(pageSql.getValue().contains(expected));}
  }
 }
 @Test void unassignedPickerAndSearchUseTheSameGlobalPredicateForCountAndPage(){
  admin();var service=new AdminProjectService(db,identity,mock(ProjectService.class),mock(ProjectAudit.class),mock(DeviceInventoryService.class));
  when(db.count(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(call->{
   String sql=call.getArgument(0);assertTrue(sql.contains("NOT EXISTS"));assertTrue(sql.contains("unassigned.active=TRUE"));assertFalse(sql.contains("unassigned.project_id=?"));
   assertEquals(List.of("%nhung%","%nhung%","%cam%","%cam%",true),Arrays.asList((Object[])call.getRawArguments()[1]));return 21L;
  });
  var page=service.users("admin",null,"NHUNG cam",null,true,true,1,20);
  assertEquals(21,page.totalElements());
  verify(db).rows(java.util.Objects.requireNonNull(contains("NOT EXISTS")),eq("%nhung%"),eq("%nhung%"),eq("%cam%"),eq("%cam%"),eq(true),eq(20),eq(20L));
 }
 @Test void auditKeywordCountAndRowsShareVietnamBoundariesAndJoinedPublicFields(){
  admin();var service=new AdminAuditService(db,identity);
  when(db.count(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(call->{
   String sql=call.getArgument(0);assertTrue(sql.contains("identity_users u"));assertTrue(sql.contains("projects p"));assertTrue(sql.contains("u.display_name"));assertTrue(sql.contains("p.name"));assertTrue(sql.contains("e.action"));assertFalse(sql.contains("e.entityType=?"));assertFalse(sql.contains("request_id"));
   var args=Arrays.asList((Object[])call.getRawArguments()[1]);assertTrue(args.contains("%nhung%"));assertTrue(args.contains("%cam%"));assertTrue(args.contains(LocalDateTime.parse("2026-10-18T17:00:00")));assertTrue(args.contains(LocalDateTime.parse("2026-10-19T17:00:00")));return 31L;
  });
  assertEquals(31,service.list("admin",7L,"NHUNG cam",LocalDate.parse("2026-10-19"),LocalDate.parse("2026-10-19"),"America/New_York",1,20).totalElements());
 }
}
