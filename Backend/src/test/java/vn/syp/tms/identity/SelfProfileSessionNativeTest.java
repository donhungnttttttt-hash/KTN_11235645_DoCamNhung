package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Map;
import java.util.concurrent.*;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import vn.syp.tms.support.UnifiedAccessFixtures;

class SelfProfileSessionNativeTest extends UnifiedAccessFixtures {
 @MockitoSpyBean SecurityContextRepository contexts;
 @MockitoSpyBean IdentityAudit audit;
 @MockitoSpyBean IdentityService identities;

 private Map<String,Object> rename(com.fasterxml.jackson.databind.JsonNode profile,String name){
  return Map.of("displayName",name,"expectedVersion",profile.path("version").asLong(),"expectedAccountVersion",profile.path("accountVersion").asLong());
 }

 @Test void concurrentRequestDuringRenameKeepsCurrentSessionButExpiresOtherSession() throws Exception {
  var user=account("USER");var current=loggedIn(user);var other=loggedIn(user);
  var profile=body(current.get("/me/profile"));
  var beforeResponse=new CountDownLatch(1);var release=new CountDownLatch(1);
  doAnswer(call->{
   HttpServletRequest request=call.getArgument(1);
   if("PUT".equals(request.getMethod())&&request.getRequestURI().endsWith("/me/profile")){
    beforeResponse.countDown();if(!release.await(10,TimeUnit.SECONDS))throw new IllegalStateException("Test barrier timed out");
   }
   return call.callRealMethod();
  }).when(contexts).saveContext(any(),any(),any());
  try(var executor=Executors.newSingleThreadExecutor()){
   var saving=executor.submit(()->current.write("PUT","/me/profile",Map.of("displayName","Tên đồng thời","expectedVersion",profile.path("version").asLong(),"expectedAccountVersion",profile.path("accountVersion").asLong())));
   try{
    assertThat(beforeResponse.await(10,TimeUnit.SECONDS)).isTrue();
    assertThat(current.get("/me").statusCode()).as("same browser refresh before profile response").isEqualTo(200);
    assertThat(other.get("/me").statusCode()).as("a different session stays revoked").isEqualTo(401);
   }finally{release.countDown();}
   assertThat(saving.get(15,TimeUnit.SECONDS).statusCode()).isEqualTo(200);
   assertThat(current.get("/me").statusCode()).isEqualTo(200);
  }
 }

 @Test void requestThatLoadedOldPrincipalBeforeRenameUsesOnlyRenewedSameSession() throws Exception {
  var user=account("USER");var current=loggedIn(user);var profile=body(current.get("/me/profile"));
  var arrived=new CountDownLatch(1);var release=new CountDownLatch(1);var armed=new java.util.concurrent.atomic.AtomicBoolean(true);
  doAnswer(call->{if(armed.compareAndSet(true,false)){arrived.countDown();if(!release.await(10,TimeUnit.SECONDS))throw new IllegalStateException("Test barrier timed out");}return call.callRealMethod();}).when(identities).current(user.getId());
  try(var executor=Executors.newSingleThreadExecutor()){
   var reading=executor.submit(()->current.get("/me"));
   try{
    assertThat(arrived.await(10,TimeUnit.SECONDS)).isTrue();
    assertThat(current.write("PUT","/me/profile",rename(profile,"Tên mới trong lúc tải")).statusCode()).isEqualTo(200);
   }finally{release.countDown();}
   assertThat(reading.get(15,TimeUnit.SECONDS).statusCode()).isEqualTo(200);
   assertThat(current.get("/me").statusCode()).isEqualTo(200);
  }
 }

 @Test void failedRenameRollsBackBothProfileAndSessionPrincipal() throws Exception {
  var user=account("USER");var current=loggedIn(user);var profile=body(current.get("/me/profile"));
  doThrow(new org.springframework.dao.DataIntegrityViolationException("Synthetic rollback test"))
   .when(audit).record(eq(user.getId()),eq(user.getId()),eq("SELF_PROFILE_UPDATED"),any());
  assertThat(current.write("PUT","/me/profile",rename(profile,"Không được lưu")).statusCode()).isGreaterThanOrEqualTo(400);
  assertThat(current.get("/me").statusCode()).isEqualTo(200);
  var after=body(current.get("/me/profile"));assertThat(after.path("displayName")).isEqualTo(profile.path("displayName"));
  assertThat(after.path("accountVersion")).isEqualTo(profile.path("accountVersion"));assertThat(after.path("version")).isEqualTo(profile.path("version"));
 }

 @Test void administrativeLockPasswordResetAndDelegationStillRevokeRenewedSessions() throws Exception {
  var administrator=loggedIn(admin);
  for(String action:java.util.List.of("lock","password","delegation")){
   var user=account("delegation".equals(action)?"PM":"USER");var current=loggedIn(user);var profile=body(current.get("/me/profile"));
   var saved=body(current.write("PUT","/me/profile",rename(profile,"Tên trước thu hồi "+action)));long version=saved.path("accountVersion").asLong();
   var result="password".equals(action)?administrator.write("PUT","/users/"+user.getId()+"/password",Map.of("newPassword",PASSWORD+"-changed","expectedVersion",version)):
    administrator.write("PATCH","/users/"+user.getId(),"lock".equals(action)?Map.of("enabled",false,"expectedVersion",version):Map.of("canCreateUsers",true,"expectedVersion",version));
   assertThat(result.statusCode()).isEqualTo(200);assertThat(current.get("/me").statusCode()).as(action).isEqualTo(401);
  }
 }
}
