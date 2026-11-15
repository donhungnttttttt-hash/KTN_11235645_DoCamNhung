package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import vn.syp.tms.support.UnifiedAccessFixtures;
import vn.syp.tms.project.ProjectDtos;

class AdminProjectFiltersNativeTest extends UnifiedAccessFixtures {
 @Test void filtersLocalCreationDaysBeforeCountingAndPagingWithStableOrdering()throws Exception{
  String tag="date"+UUID.randomUUID().toString().substring(0,8);
  String[] times={"2026-11-13 16:59:59","2026-11-13 17:00:00","2026-11-14 16:59:59","2026-11-14 17:00:00"};
  long[] ids=new long[4];
  for(int i=0;i<4;i++){
   ids[i]=projects.create(admin.getId(),new ProjectDtos.CreateProject(tag+i,tag,"","Asia/Ho_Chi_Minh")).id();
   jdbc.update("UPDATE projects SET created_at=? WHERE id=?",times[i],ids[i]);
  }
  var caller=loggedIn(admin);String path="/admin/projects?keyword="+tag+"&createdFrom=2026-11-14&createdTo=2026-11-14&size=1";
  var first=caller.get(path+"&sort=newest");assertThat(first.statusCode()).as(first.body()).isEqualTo(200);
  assertThat(body(first).path("totalElements").asInt()).isEqualTo(2);
  assertThat(body(first).path("items").get(0).path("id").asLong()).isEqualTo(ids[2]);
  assertThat(body(first).path("items").get(0).path("createdAt").isMissingNode()).isFalse();
  assertThat(body(caller.get(path+"&sort=newest&page=1")).path("items").get(0).path("id").asLong()).isEqualTo(ids[1]);
  assertThat(body(caller.get(path+"&sort=oldest")).path("items").get(0).path("id").asLong()).isEqualTo(ids[1]);
  assertThat(body(caller.get("/admin/projects?keyword="+tag+"&createdFrom=2026-11-15")).path("totalElements").asInt()).isEqualTo(1);
  assertThat(body(caller.get("/admin/projects?keyword="+tag+"&createdTo=2026-11-13")).path("totalElements").asInt()).isEqualTo(1);
  jdbc.update("UPDATE projects SET created_at=? WHERE id=?",times[1],ids[2]);
  assertThat(body(caller.get(path+"&sort=newest")).path("items").get(0).path("id").asLong()).isEqualTo(ids[2]);
 }
 @Test void rejectsInvalidFiltersAndKeepsAdminAuthorization()throws Exception{
  var caller=loggedIn(admin);
  assertThat(caller.get("/admin/projects?createdFrom=2026-11-15&createdTo=2026-11-14").statusCode()).isEqualTo(422);
  assertThat(caller.get("/admin/projects?sort=invalid").statusCode()).isEqualTo(422);
  assertThat(loggedIn(account("USER")).get("/admin/projects?sort=newest").statusCode()).isEqualTo(403);
 }
}
