package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.support.UnifiedAccessFixtures;

class UnifiedSelfProfileNativeTest extends UnifiedAccessFixtures {
 private Map<String,Object> edit(JsonNode p,String name){return new HashMap<>(Map.of("displayName",name,"email","person@example.test","phone","+84 123 456 789","jobTitle","Kỹ sư","department","Chất lượng","expectedVersion",p.path("version").asLong(),"expectedAccountVersion",p.path("accountVersion").asLong()));}
 @Test void everyAccountTypeEditsOnlyOwnProfileAndKeepsSessionAndRole()throws Exception{
  for(String role:List.of("ADMIN","PM","USER","GUEST")){
   var user="ADMIN".equals(role)?admin:account(role);var client=loggedIn(user);var response=client.get("/me/profile");assertThat(response.statusCode()).isEqualTo(200);
   var initial=body(response);assertThat(initial.path("username").asText()).isEqualTo(user.getUsername());assertThat(initial.path("hasAvatar").asBoolean()).isFalse();
   var saved=client.write("PUT","/me/profile",edit(initial,"Tên cá nhân "+role));assertThat(saved.statusCode()).isEqualTo(200);
   var updated=body(client.get("/me/profile"));assertThat(updated.path("displayName").asText()).isEqualTo("Tên cá nhân "+role);assertThat(updated.path("email").asText()).isEqualTo("person@example.test");assertThat(updated.path("role").asText()).isEqualTo(role);assertThat(updated.path("username").asText()).isEqualTo(user.getUsername());
   var me=client.get("/me");assertThat(me.statusCode()).isEqualTo(200);assertThat(body(me).path("displayName").asText()).isEqualTo("Tên cá nhân "+role);
   if("GUEST".equals(role))assertThat(client.get("/ai/projects").statusCode()).isEqualTo(403);
  }
 }
 @Test void staleDraftValidationAndUnknownPrivilegeFieldsCannotOverwrite()throws Exception{
  var user=account("USER");var c=loggedIn(user);var initial=body(c.get("/me/profile"));var payload=edit(initial,"Đã lưu");assertThat(c.write("PUT","/me/profile",payload).statusCode()).isEqualTo(200);
  assertThat(c.write("PUT","/me/profile",edit(initial,"Cũ")).statusCode()).isEqualTo(409);
  var current=body(c.get("/me/profile"));payload=edit(current,"Không được lưu");payload.put("role","ADMIN");assertThat(c.write("PUT","/me/profile",payload).statusCode()).isEqualTo(422);
  payload=edit(current,"Không được lưu");payload.put("email","invalid-email");assertThat(c.write("PUT","/me/profile",payload).statusCode()).isEqualTo(422);
  payload=edit(current,"   ");assertThat(c.write("PUT","/me/profile",payload).statusCode()).isEqualTo(422);
  assertThat(body(c.get("/me/profile")).path("displayName").asText()).isEqualTo("Đã lưu");
 }
 @Test void authenticationCsrfAndOtherUserIsolation()throws Exception{
  var first=loggedIn(account("USER"));var other=account("USER");var second=loggedIn(other);var profile=body(first.get("/me/profile"));
  assertThat(first.send("PUT","/me/profile",edit(profile,"No csrf"),null).statusCode()).isEqualTo(403);
  assertThat(new Client().get("/me/profile").statusCode()).isEqualTo(401);
  assertThat(first.get("/users/"+other.getId()+"/profile").statusCode()).isEqualTo(403);
  var payload=edit(profile,"Spoof");payload.put("id",other.getId());assertThat(first.write("PUT","/me/profile",payload).statusCode()).isEqualTo(422);
  assertThat(body(second.get("/me/profile")).path("displayName").asText()).isEqualTo(other.getDisplayName());
 }
 private String avatarPath(JsonNode profile){return "/me/avatar?expectedVersion="+profile.path("version").asLong()+"&expectedAccountVersion="+profile.path("accountVersion").asLong();}
 @Test void renamedProfileRefreshesCurrentSessionAndConflictsWithOldAdminVersion()throws Exception{
  var user=account("USER");var c=loggedIn(user);var otherSession=loggedIn(user);var administrator=loggedIn(admin);var p=body(c.get("/me/profile"));
  assertThat(c.write("PUT","/me/profile",edit(p,"Tên tự sửa")).statusCode()).isEqualTo(200);
  assertThat(c.get("/me").statusCode()).isEqualTo(200);assertThat(otherSession.get("/me").statusCode()).isEqualTo(401);
  assertThat(administrator.write("PATCH","/users/"+user.getId(),Map.of("displayName","Bản quản trị cũ","expectedVersion",p.path("accountVersion").asLong())).statusCode()).isEqualTo(409);
  assertThat(body(c.get("/me/profile")).path("displayName").asText()).isEqualTo("Tên tự sửa");
 }
 @Test void concurrentContactEditsCannotSilentlyOverwrite()throws Exception{
  var user=account("USER");var first=loggedIn(user);var second=loggedIn(user);var p=body(first.get("/me/profile"));
  try(var executor=java.util.concurrent.Executors.newFixedThreadPool(2)){
   var a=executor.submit(()->first.write("PUT","/me/profile",edit(p,user.getDisplayName())).statusCode());
   var b=executor.submit(()->second.write("PUT","/me/profile",edit(p,user.getDisplayName())).statusCode());
   assertThat(List.of(a.get(),b.get())).containsExactlyInAnyOrder(200,409);
  }
 }
 @Test void avatarUploadNormalizesImagePreservesFieldsAndDeleteUsesVersion()throws Exception{
  var c=loggedIn(account("GUEST"));var initial=body(c.get("/me/profile"));assertThat(c.get("/me/avatar").statusCode()).isEqualTo(404);
  var saved=body(c.write("PUT","/me/profile",edit(initial,"Ảnh của tôi")));
  var image=new java.awt.image.BufferedImage(800,600,java.awt.image.BufferedImage.TYPE_INT_RGB);var output=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"jpg",output);
  var uploaded=c.upload(avatarPath(saved),output.toByteArray(),"image/jpeg");assertThat(uploaded.statusCode()).isEqualTo(200);var p=body(uploaded);assertThat(p.path("hasAvatar").asBoolean()).isTrue();assertThat(p.path("email").asText()).isEqualTo("person@example.test");
  var bytes=c.bytes("/me/avatar");assertThat(bytes.statusCode()).isEqualTo(200);assertThat(bytes.headers().firstValue("Content-Type").orElse("")).isEqualTo("image/png");assertThat(bytes.headers().firstValue("Cache-Control").orElse("")).contains("no-store");var normalized=javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(bytes.body()));assertThat(normalized.getWidth()).isEqualTo(512);assertThat(normalized.getHeight()).isEqualTo(384);
  assertThat(c.write("DELETE",avatarPath(saved),null).statusCode()).isEqualTo(409);
  assertThat(c.write("DELETE",avatarPath(p),null).statusCode()).isEqualTo(200);assertThat(c.get("/me/avatar").statusCode()).isEqualTo(404);assertThat(body(c.get("/me/profile")).path("displayName").asText()).isEqualTo("Ảnh của tôi");
 }
 @Test void invalidAndOversizedImagesAreRejectedWithoutChangingProfile()throws Exception{
  var c=loggedIn(account("USER"));var p=body(c.get("/me/profile"));String path=avatarPath(p);
  assertThat(c.upload(path,"<svg><script>alert(1)</script></svg>".getBytes(java.nio.charset.StandardCharsets.UTF_8),"image/svg+xml").statusCode()).isEqualTo(422);
  assertThat(c.upload(path,new byte[2*1024*1024+1],"image/png").statusCode()).isEqualTo(422);
  assertThat(c.upload(path,new byte[]{1,2,3},"image/png").statusCode()).isEqualTo(422);
  assertThat(body(c.get("/me/profile")).path("version").asLong()).isEqualTo(p.path("version").asLong());
 }
 @Test void profileEventsAreSearchableByVietnameseLabelWithoutContactDetails()throws Exception{
  var user=account("USER");var c=loggedIn(user);var p=body(c.get("/me/profile"));String name="Audit "+UUID.randomUUID();
  assertThat(c.write("PUT","/me/profile",edit(p,name)).statusCode()).isEqualTo(200);
  var administrator=loggedIn(admin);String keyword=java.net.URLEncoder.encode(name+" cập nhật hồ sơ cá nhân",java.nio.charset.StandardCharsets.UTF_8);
  var response=administrator.get("/admin/audit?keyword="+keyword);assertThat(response.statusCode()).isEqualTo(200);
  var events=body(response).path("items");assertThat(events.size()).isEqualTo(1);
  assertThat(events.get(0).path("actionLabel").asText()).isEqualTo("Cập nhật hồ sơ cá nhân");
  assertThat(response.body()).doesNotContain("person@example.test","+84 123 456 789","Kỹ sư");
 }
}
