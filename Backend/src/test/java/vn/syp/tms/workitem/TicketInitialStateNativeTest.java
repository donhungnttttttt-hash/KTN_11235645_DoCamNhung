package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.*;
import vn.syp.tms.project.ProjectDtos;
import vn.syp.tms.support.UnifiedTestingFixtures;

class TicketInitialStateNativeTest extends UnifiedTestingFixtures {
 private Client manager,tester;private long pmMember;private String base;
 @BeforeEach void prepare()throws Exception{testingFixture();var pm=account("PM");pmMember=projects.addOrUpdateMember(p,admin.getId(),pm.getId(),new ProjectDtos.SetMember("PM")).membershipId();manager=loggedIn(admin);tester=loggedIn(worker);base="/projects/"+p+"/issues";}
 private Map<String,Object> request(long recipient){var input=new LinkedHashMap<String,Object>();input.put("type","BUG");input.put("featureId",f);input.put("monkey",true);input.put("title","Initial state");input.put("description","Evidence and reason for chosen initial state");input.put("steps","Open");input.put("expectedResult","Expected");input.put("actualResult","Actual");input.put("frequency","1/2");input.put("environment","Test");input.put("device","Desktop");input.put("assigneeMembershipId",recipient);input.put("requestKey",UUID.randomUUID());return input;}
 private List<String> columns(JsonNode response){var ids=new ArrayList<String>();response.path("initialTransitions").forEach(choice->ids.add(choice.path("columnId").asText()));return ids;}
 @Test void managerOptionsExposePermittedClosedReasonsAndCreateUsesSamePolicy()throws Exception{
  var options=manager.get(base+"/options?type=BUG&assigneeMembershipId="+pmMember);assertThat(options.statusCode()).isEqualTo(200);assertThat(columns(body(options))).containsExactly("new","progress","verify","processed","fixed","cannot_reproduce","wont_fix");
  var input=request(pmMember);input.put("ticketState","CLOSED");input.put("closureReason","FIXED");var saved=manager.write("POST",base,input);assertThat(saved.statusCode()).as(saved.body()).isEqualTo(201);assertThat(body(saved).path("closureReason").asText()).isEqualTo("FIXED");
 }
 @Test void ordinaryCreatorSeesOnlyDefaultAndCannotSubmitPrivilegedState()throws Exception{
  assertThat(columns(body(tester.get(base+"/options?type=BUG&assigneeMembershipId="+pmMember)))).containsExactly("new");var input=request(pmMember);input.put("ticketState","CLOSED");input.put("closureReason","WONT_FIX");assertThat(tester.write("POST",base,input).statusCode()).isEqualTo(403);assertThat(body(tester.get(base)).path("totalItems").asLong()).isZero();
 }
 @Test void selfAssignedDesignatedUserCanChooseProgressAndRevokedDutyIsRechecked()throws Exception{
  assertThat(manager.write("PUT","/projects/"+p+"/ticket-responsibilities/"+member,Map.of("duties",List.of("BUG_COORDINATOR"),"expectedVersion",0)).statusCode()).isEqualTo(200);
  assertThat(columns(body(tester.get(base+"/options?type=BUG&assigneeMembershipId="+member)))).containsExactly("new","progress","wont_fix");var input=request(member);input.put("ticketState","IN_PROGRESS");assertThat(tester.write("POST",base,input).statusCode()).isEqualTo(201);
  assertThat(manager.write("PUT","/projects/"+p+"/ticket-responsibilities/"+member,Map.of("duties",List.of(),"expectedVersion",1)).statusCode()).isEqualTo(200);assertThat(columns(body(tester.get(base+"/options?type=BUG&assigneeMembershipId="+member)))).isEmpty();input.put("requestKey",UUID.randomUUID());assertThat(tester.write("POST",base,input).statusCode()).isEqualTo(422);
 }
 @Test void closedInitialStateRequiresClosureReasonAndNondefaultRequiresExplanation()throws Exception{
  var input=request(pmMember);input.put("ticketState","CLOSED");assertThat(manager.write("POST",base,input).statusCode()).isEqualTo(422);input.put("closureReason","WONT_FIX");input.put("description","");assertThat(manager.write("POST",base,input).statusCode()).isEqualTo(422);
 }
}
