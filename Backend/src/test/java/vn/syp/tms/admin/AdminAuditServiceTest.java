package vn.syp.tms.admin;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class AdminAuditServiceTest {
 @Test void scopedSanitizedQueryAndCountUseSameUtcBoundariesAcrossDst() {
  var db=mock(WorkItemStore.class);var identity=mock(IdentityService.class);
  when(identity.current("actor")).thenReturn(new IdentityUser("admin","Admin","secret","ADMIN"));
  when(db.count(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(c->{assertThat((String)c.getArgument(0)).contains("UNION ALL","e.projectId=?","e.entityType=?","e.occurredAt>=?","e.occurredAt<?").doesNotContain("request_id","password","session");return 31L;});
  var service=new AdminAuditService(db,identity);
  var result=service.list("actor",7L,"DEVICE_ASSET",LocalDate.parse("2026-03-08"),LocalDate.parse("2026-03-08"),"America/New_York",1,20);
  assertThat(result.totalElements()).isEqualTo(31);
  verify(db).rows(java.util.Objects.requireNonNull(contains("LIMIT ? OFFSET ?")),eq(7L),eq("DEVICE_ASSET"),eq(LocalDateTime.parse("2026-03-08T05:00:00")),eq(LocalDateTime.parse("2026-03-09T04:00:00")),eq(20),eq(20L));
  assertThatThrownBy(()->service.list("actor",null,"",null,null,"invalid-zone",0,20)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(422));
 }
}
