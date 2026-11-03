package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.assertThat;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import vn.syp.tms.identity.IdentityUser;
import vn.syp.tms.project.ProjectDtos;
import vn.syp.tms.support.UnifiedTestingFixtures;
import vn.syp.tms.testcase.TestDocumentDtos;

/** Explicit opt-in, guarded native fixture. Output contains test-only credentials. */
@EnabledIfEnvironmentVariable(named="TMS_TICKET_BROWSER_MANIFEST",matches=".+")
class TicketBrowserFixtureTest extends UnifiedTestingFixtures {
 @Autowired FeatureIssueService issues;
 @Test void prepareTicketBrowserFixture() throws Exception {
  testingFixture();assignWorker();
  rename(admin,"Ticket Admin");rename(worker,"Ticket Creator");
  var pm=person("PM","Ticket PM");var spec=person("USER","Ticket Spec");
  var coordinator=person("USER","Ticket Coordinator");var developer=person("USER","Ticket Worker");
  var guest=person("GUEST","Ticket Guest");var outside=person("USER","Ticket Outside");
  long pmMember=join(pm),specMember=join(spec),coordinatorMember=join(coordinator),developerMember=join(developer);join(guest);
  var manager=loggedIn(admin);
  var response=manager.write("POST","/projects/"+p+"/features/"+f+"/test-versions",Map.of("name","Discovery v1","requestKey",UUID.randomUUID()));
  assertThat(response.statusCode()).as(response.body()).isEqualTo(201);long version=body(response).path("id").asLong();
  features.updateResult(p,admin.getId(),d,row,new TestDocumentDtos.UpdateResult("NG",0L,UUID.randomUUID().toString(),version,LocalDate.of(2026,11,1)));
  // Intentional imported historical evidence in this fixture only.
  long revision=Objects.requireNonNull(documents.get(p,admin.getId(),d).rows().getFirst().revisionId());
  jdbc.update("UPDATE test_case_revisions SET preconditions_vi='Signed in to discovery environment' WHERE id=?",revision);
  var seed=new LinkedHashMap<String,Long>();
  for(var column:TicketWorkflow.COLUMNS){
   String type=Set.of("spec","unsupported").contains(column.columnId())?"QA":"BUG";
   long id=create(type,"Board "+column.columnId(),pmMember);
   jdbc.update("UPDATE work_item_feature_context SET ticket_state=?,closure_reason=? WHERE project_id=? AND work_item_id=?",column.state(),column.closureReason(),p,id);
   jdbc.update("UPDATE work_items SET status_code=? WHERE project_id=? AND id=?",TicketWorkflow.mirror(column),p,id);seed.put(column.columnId(),id);
  }
  for(int n=1;n<=23;n++)create("BUG","Paging Bug "+n,pmMember);
  long legacy=create("BUG","Historical ambiguous closed",pmMember);
  jdbc.update("UPDATE work_item_feature_context SET ticket_state=NULL,closure_reason=NULL WHERE project_id=? AND work_item_id=?",p,legacy);
  jdbc.update("UPDATE work_items SET status_code='closed' WHERE project_id=? AND id=?",p,legacy);seed.put("legacy",legacy);
  long waiting=create("BUG","Cannot reproduce journey",pmMember),wontfix=create("BUG","Wont fix journey",pmMember),unsupported=create("QA","Unsupported journey",pmMember);
  var output=new LinkedHashMap<String,Object>();
  for(var entry:Map.of("admin",admin,"creator",worker,"pm",pm,"spec",spec,"coordinator",coordinator,"worker",developer,"guest",guest,"outside",outside).entrySet())output.put(entry.getKey(),Map.of("username",entry.getValue().getUsername(),"id",entry.getValue().getId(),"name",entry.getValue().getDisplayName()));
  output.put("password",PASSWORD);output.put("project",p);output.put("feature",f);output.put("document",d);output.put("row",row);output.put("testVersion",version);output.put("revision",revision);
  output.put("members",Map.of("creator",member,"pm",pmMember,"spec",specMember,"coordinator",coordinatorMember,"worker",developerMember));output.put("seed",seed);output.put("waiting",waiting);output.put("wontfix",wontfix);output.put("unsupported",unsupported);
  Files.writeString(Path.of(Objects.requireNonNull(System.getenv("TMS_TICKET_BROWSER_MANIFEST"))),json.writeValueAsString(output));
 }
 private IdentityUser person(String role,String name){var user=account(role);rename(user,name);return user;}
 private void rename(IdentityUser user,String name){user.setDisplayName(name);users.saveAndFlush(Objects.requireNonNull(user));}
 private long join(IdentityUser user){return projects.addOrUpdateMember(p,admin.getId(),user.getId(),new ProjectDtos.SetMember(user.getRole())).membershipId();}
 private long create(String type,String title,long contact){boolean monkey="BUG".equals(type);return ((Number)issues.create(p,worker.getId(),new FeatureIssueDtos.Create(type,f,monkey?null:d,monkey?null:row,monkey,title,"Private browser evidence","Open page","Expected result","Observed defect",UUID.randomUUID(),"Signed in","3/5","Discovery staging","Desktop",contact,null,null,null,null,monkey?"Discovery manual":null)).get("id")).longValue();}
}
