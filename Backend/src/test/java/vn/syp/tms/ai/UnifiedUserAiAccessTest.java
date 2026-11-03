package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class UnifiedUserAiAccessTest {
 @Test void userGetsWorkerPurposesWithoutPmPurposes(){
  assertThat(AiPurpose.forRole("USER")).containsExactly(AiPurpose.TESTER_WORK_REPORT,AiPurpose.TESTER_BUG_DRAFT,AiPurpose.DEV_TICKET_REVIEW);
  assertThat(AiPurpose.forRole("GUEST")).isEmpty();
  var access=new AiAccess(mock(WorkItemStore.class),mock(IdentityService.class));
  for(var purpose:AiPurpose.forRole("USER"))assertThatCode(()->access.require(new AiAccess.Context(5L,"USER",false),purpose)).doesNotThrowAnyException();
  assertThatThrownBy(()->access.require(new AiAccess.Context(5L,"USER",false),AiPurpose.PM_PROGRESS_REPORT)).isInstanceOf(BusinessException.class);
 }
 @Test void guestCannotReadAiAndPmRequiresCurrentMembership(){
  var db=mock(WorkItemStore.class);var identity=mock(IdentityService.class);var account=mock(IdentityUserRepository.CurrentAccount.class);
  when(identity.lockCurrent("actor")).thenReturn(account);when(db.row(Objects.requireNonNull(anyString()),eq(1L))).thenReturn(new HashMap<>());
  when(db.rows(Objects.requireNonNull(anyString()),eq(1L),eq("actor"))).thenReturn(List.of());
  var access=new AiAccess(db,identity);
  for(String role:List.of("GUEST","PM","USER")){
   when(account.getRole()).thenReturn(role);
   assertThatThrownBy(()->access.authorize(1,"actor",false)).isInstanceOf(BusinessException.class);
  }
 }
 @Test void guestCannotReadProviderConfigurationEvenWithValidSession(){
  var identity=mock(IdentityService.class);var user=new IdentityUser("guest","Guest","unused","GUEST");
  when(identity.current("guest")).thenReturn(user);
  var access=new LocalAiAccess(mock(LocalAiConfiguration.class),identity);
  assertThatThrownBy(()->access.verify(new SessionPrincipal("guest",0))).isInstanceOf(BusinessException.class);
 }
 @Test void revokedThreadStopsRetryBeforeProviderCall(){
  var store=mock(AiChatStore.class);var gateway=mock(AiProviderGateway.class);
  when(store.thread("actor",2)).thenThrow(new BusinessException(403,"FORBIDDEN","Scope revoked"));
  var service=new AiChatService(store,mock(AiContextService.class),gateway,new com.fasterxml.jackson.databind.ObjectMapper());
  assertThatThrownBy(()->service.send("actor",2,"hello","retry-12345678")).isInstanceOf(BusinessException.class);
  verifyNoInteractions(gateway);verify(store,never()).findRequest(anyString(),anyLong(),anyString(),anyString());
 }
}
