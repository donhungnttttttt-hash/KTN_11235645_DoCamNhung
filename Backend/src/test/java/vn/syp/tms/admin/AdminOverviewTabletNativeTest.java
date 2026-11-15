package vn.syp.tms.admin;
import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import vn.syp.tms.support.UnifiedTestingFixtures;

class AdminOverviewTabletNativeTest extends UnifiedTestingFixtures {
 @Autowired AdminOverviewService overview;
 @BeforeEach void setup()throws Exception{testingFixture();}
 private Map<String,Object> asset(String type){return new LinkedHashMap<>(Map.of("assetCode","tablet-test-"+UUID.randomUUID(),"type",type,"model","Test model","conditionCode","AVAILABLE"));}
 @Test void tabletCanBeCreatedAndOtherDevicesAreNotReclassified()throws Exception{
  var caller=loggedIn(admin);String path="/admin/device-assets";
  var other=caller.write("POST",path,asset("OTHER"));assertThat(other.statusCode()).as(other.body()).isEqualTo(201);
  long otherId=body(other).path("id").asLong();
  var created=caller.write("POST",path,asset("TABLET"));assertThat(created.statusCode()).as(created.body()).isEqualTo(201);
  assertThat(body(created).path("type").asText()).isEqualTo("TABLET");
  assertThat(body(caller.get(path+"/"+otherId)).path("type").asText()).isEqualTo("OTHER");
  var groups=overview.overview(admin.getId(),null).inventory().get("byTypeAndStatus");assertThat(groups.toString()).contains("TABLET","OTHER");
  assertThat(caller.write("POST",path,asset("UNKNOWN")).statusCode()).isEqualTo(422);
 }
 @Test void existingOtherDeviceMayBeExplicitlyChangedToTablet()throws Exception{
  var caller=loggedIn(admin);String path="/admin/device-assets";var input=asset("OTHER");
  var created=caller.write("POST",path,input);assertThat(created.statusCode()).isEqualTo(201);
  input.put("type","TABLET");input.put("expectedVersion",0);
  var updated=caller.write("PATCH",path+"/"+body(created).path("id").asLong(),input);assertThat(updated.statusCode()).as(updated.body()).isEqualTo(200);
  assertThat(body(updated).path("type").asText()).isEqualTo("TABLET");
 }
 @Test void overviewIncludesAllProjectsAndStillEnforcesScope() {
  var all=overview.overview(admin.getId(),null);assertThat(all.byProject()).hasSize(Math.toIntExact(all.totalProjects()));
  var selected=overview.overview(admin.getId(),p);assertThat(selected.totalProjects()).isEqualTo(1);assertThat(selected.byProject()).hasSize(1);
 }
}
