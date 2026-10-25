package vn.syp.tms.admin;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class AdminAuditServiceTest {
 final WorkItemStore db=mock(WorkItemStore.class);
 final IdentityService identity=mock(IdentityService.class);
 final AdminAuditService service=new AdminAuditService(db,identity);
 void admin(){when(identity.current("actor")).thenReturn(new IdentityUser("admin","Admin","secret","ADMIN"));}
 @Test void scopedSanitizedQueryAndCountUseSameInclusiveVietnamDay(){
  admin();
  when(db.count(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(c->{assertThat((String)c.getArgument(0)).contains("UNION ALL","e.projectId=?","e.occurredAt>=?","e.occurredAt<?").doesNotContain("request_id","password","session");return 31L;});
  var result=service.list("actor",7L,"",LocalDate.parse("2026-10-19"),LocalDate.parse("2026-10-19"),1,20);
  assertThat(result.totalElements()).isEqualTo(31);
  verify(db).rows(java.util.Objects.requireNonNull(contains("LIMIT ? OFFSET ?")),eq(7L),eq(LocalDateTime.parse("2026-10-18T17:00:00")),eq(LocalDateTime.parse("2026-10-19T17:00:00")),eq(20),eq(20L));
 }
 @Test void rejectsReversedAndUnrepresentableDateWindowsAndInvalidPaging(){
  admin();
  assertInvalid(()->service.list("actor",null,"",LocalDate.of(2026,10,20),LocalDate.of(2026,10,19),0,20));
  assertInvalid(()->service.list("actor",null,"",null,LocalDate.MAX,0,20));
  assertInvalid(()->service.list("actor",null,"",LocalDate.of(999,1,1),null,0,20));
  assertInvalid(()->service.list("actor",null,"",null,null,-1,20));
  verifyNoInteractions(db);
 }
 @Test void nonAdminCannotReadAudit(){
  when(identity.current("tester")).thenReturn(new IdentityUser("tester","Tester","hash","TESTER"));
  assertThatThrownBy(()->service.list("tester",null,"",null,null,0,20)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
  verifyNoInteractions(db);
 }
 private void assertInvalid(org.assertj.core.api.ThrowableAssert.ThrowingCallable action){assertThatThrownBy(action).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("INVALID_FILTER"));}
}
