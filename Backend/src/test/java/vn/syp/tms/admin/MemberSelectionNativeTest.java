package vn.syp.tms.admin;
import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.support.UnifiedAccessFixtures;
import vn.syp.tms.project.ProjectDtos;
class MemberSelectionNativeTest extends UnifiedAccessFixtures {
 @Test void creatingProjectWithAutomaticallySelectedPmAssignsDevicesWithoutExtraHandoverFields()throws Exception{
  var manager=account("PM");var caller=loggedIn(admin);String tag=UUID.randomUUID().toString().substring(0,8);
  var asset=caller.write("POST","/admin/device-assets",Map.of("assetCode","AUTO-"+tag,"type","TABLET","model","Test tablet","conditionCode","AVAILABLE"));
  assertThat(asset.statusCode()).as(asset.body()).isEqualTo(201);long assetId=body(asset).path("id").asLong();
  var response=caller.write("POST","/admin/projects",Map.of("project",Map.of("code","AUTO"+tag,"name","Automatic PM","timezone","Asia/Ho_Chi_Minh"),"members",List.of(Map.of("userId",manager.getId(),"projectRole","PM")),"devices",List.of(Map.of("assetId",assetId,"recipientUserId",manager.getId(),"expectedVersion",0,"handoverNote",""))));
  assertThat(response.statusCode()).as(response.body()).isEqualTo(201);long project=body(response).path("id").asLong();
  assertThat(jdbc.queryForObject("SELECT m.user_id FROM device_allocations a JOIN project_memberships m ON m.id=a.recipient_membership_id WHERE a.project_id=? AND a.asset_id=? AND a.returned_at IS NULL",String.class,project,assetId)).isEqualTo(manager.getId());
  assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND user_id=?",Integer.class,project,admin.getId())).isZero();
 }
 @Test void systemAdminsAreExcludedBeforePaginationButRemainInAccountAdministration()throws Exception{
  String tag="pick"+UUID.randomUUID().toString().substring(0,8);
  var manager=account("PM");var worker=account("USER");
  for(var user:List.of(admin,manager,worker))jdbc.update("UPDATE identity_users SET display_name=? WHERE id=?",tag,user.getId());
  var caller=loggedIn(admin);String path="/admin/users?keyword="+tag;
  assertThat(body(caller.get(path)).path("totalElements").asInt()).isEqualTo(3);
  var ids=new HashSet<String>();
  for(int page=0;page<2;page++){
   var response=caller.get(path+"&excludeSystemAdmins=true&size=1&page="+page);assertThat(response.statusCode()).isEqualTo(200);
   var data=body(response);assertThat(data.path("totalElements").asInt()).isEqualTo(2);assertThat(data.path("items").size()).isEqualTo(1);ids.add(data.path("items").get(0).path("id").asText());
  }
  assertThat(ids).containsExactlyInAnyOrder(manager.getId(),worker.getId());
  assertThat(body(caller.get(path+"&excludeSystemAdmins=true&role=ADMIN")).path("totalElements").asInt()).isZero();
 }
 @Test void projectCandidatesAlsoExcludeSystemAdminsWithoutChangingTheirAccess()throws Exception{
  long project=projects.create(admin.getId(),new ProjectDtos.CreateProject("PC"+UUID.randomUUID().toString().substring(0,8),"Candidate test","","UTC")).id();
  var caller=loggedIn(admin);
  var response=caller.get("/projects/"+project+"/member-candidates?keyword="+admin.getUsername());
  assertThat(response.statusCode()).isEqualTo(200);assertThat(body(response).path("totalElements").asInt()).isZero();
  assertThat(caller.get("/admin/projects/"+project).statusCode()).isEqualTo(200);
 }
}
