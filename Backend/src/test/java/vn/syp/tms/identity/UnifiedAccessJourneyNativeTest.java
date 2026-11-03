package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import java.time.LocalDate;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import vn.syp.tms.support.UnifiedTestingFixtures;
import vn.syp.tms.project.ProjectDtos;
import vn.syp.tms.feature.FeatureDtos;
import vn.syp.tms.workitem.*;
import vn.syp.tms.reporting.*;

class UnifiedAccessJourneyNativeTest extends UnifiedTestingFixtures {
 @Autowired FeatureIssueService issues;
 @Autowired ManagementReportService reports;
 @BeforeEach void prepare()throws Exception{testingFixture();assignWorker();}
 @Test void oneUserExecutesThenResolvesAssignedIssueAndRevokedReplayCannotWrite()throws Exception{
  var user=loggedIn(worker);String resultPath="/projects/"+p+"/test-documents/"+d+"/rows/"+row+"/result";
  long version=((Number)features.createTestVersion(p,admin.getId(),f,new FeatureDtos.CreateTestVersion("Journey version",UUID.randomUUID())).get("id")).longValue();
  var input=Map.of("status","NG","expectedVersion",0,"requestKey",UUID.randomUUID().toString(),"testVersionId",version,"executedOn",LocalDate.now().toString());
  assertThat(user.write("PUT",resultPath,input).statusCode()).isEqualTo(200);
  long contact=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,admin.getId()));
  var created=issues.create(p,admin.getId(),new FeatureIssueDtos.Create("BUG",f,d,row,false,"Journey","Description","Steps","Expected","Actual",UUID.randomUUID(),"","Always","Test","Desktop",contact,null,null,null,null,null));
  long issue=((Number)created.get("id")).longValue();
  issues.update(p,admin.getId(),issue,new FeatureIssueDtos.Update("Journey","Description","Steps","Expected","Actual",member,"MEDIUM","Assigned",0L));
  assertThat(user.write("PUT","/projects/"+p+"/issues/"+issue+"/status",Map.of("status","progress","reason","Started","expectedVersion",1)).statusCode()).isEqualTo(200);
  assertThat(user.write("PUT","/projects/"+p+"/issues/"+issue+"/status",Map.of("status","resolved","reason","Fixed","expectedVersion",2)).statusCode()).isEqualTo(200);
  assertThat(documents.get(p,worker.getId(),d).rows().getFirst().resultStatus()).isEqualTo("NG");
  jdbc.update("UPDATE project_memberships SET active=FALSE,lock_version=lock_version+1 WHERE id=?",member);
  assertThat(user.write("PUT",resultPath,input).statusCode()).isIn(403,404);
  assertThat(jdbc.queryForObject("SELECT result_status FROM import_rows WHERE id=?",String.class,row)).isEqualTo("NG");
 }
 @Test void archivedFeatureAndDeletedVersionCannotBeWritten()throws Exception{
  long version=((Number)features.createTestVersion(p,admin.getId(),f,new FeatureDtos.CreateTestVersion("Removed",UUID.randomUUID())).get("id")).longValue();
  features.deleteTestVersion(p,admin.getId(),f,version);var caller=loggedIn(worker);
  String path="/projects/"+p+"/test-documents/"+d+"/rows/"+row+"/result";
  assertThat(caller.write("PUT",path,Map.of("status","NG","expectedVersion",0,"requestKey",UUID.randomUUID().toString(),"testVersionId",version,"executedOn",LocalDate.now().toString())).statusCode()).isIn(409,422);
  jdbc.update("UPDATE testing_features SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",f);
  assertThat(caller.write("PUT",path,Map.of("status","NG","expectedVersion",0,"requestKey",UUID.randomUUID().toString())).statusCode()).isEqualTo(409);
 }
 @Test void adminCheckboxNeverGrantsSystemAdmin()throws Exception{
  var caller=loggedIn(admin);String username="journey."+UUID.randomUUID().toString().substring(0,8);
  var response=caller.write("POST","/users",Map.of("username",username,"displayName","Project Admin","password",PASSWORD,"isProjectAdmin",true,"isGuest",false));
  assertThat(response.statusCode()).isEqualTo(201);assertThat(body(response).path("role").asText()).isEqualTo("PM");
  var pm=users.findByUsername(username).orElseThrow();var session=loggedIn(pm);
  assertThat(session.get("/admin/users").statusCode()).isEqualTo(403);assertThat(registry.contains(pm.getId())).isFalse();
 }
 @Test void guestReadsOnlyAssignedSavedReports()throws Exception{
  var guest=account("GUEST");projects.addOrUpdateMember(p,admin.getId(),guest.getId(),new ProjectDtos.SetMember("GUEST"));
  long report=((Number)reports.create(p,admin.getId(),new ManagementReportDtos.Create(null,"Journey report","# Published report")).get("id")).longValue();
  var caller=loggedIn(guest);assertThat(caller.get("/projects/"+p+"/management-reports/"+report).statusCode()).isEqualTo(200);
  assertThat(caller.get("/projects/"+p+"/test-documents/"+d).statusCode()).isEqualTo(403);
  jdbc.update("UPDATE project_memberships SET active=FALSE,lock_version=lock_version+1 WHERE project_id=? AND user_id=?",p,guest.getId());
  assertThat(caller.get("/projects/"+p+"/management-reports/"+report).statusCode()).isIn(403,404);
 }
}
