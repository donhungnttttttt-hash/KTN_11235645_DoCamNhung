package vn.syp.tms.reporting;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import vn.syp.tms.identity.IdentityUser;
import vn.syp.tms.project.ProjectDtos;
import vn.syp.tms.support.UnifiedTestingFixtures;

class GuestReportingNativeTest extends UnifiedTestingFixtures {
    @Autowired ManagementReportService reports;
    IdentityUser guest;long report,guestMember;
    @BeforeEach void prepare()throws Exception{
        testingFixture();guest=account("GUEST");guestMember=projects.addOrUpdateMember(p,admin.getId(),guest.getId(),new ProjectDtos.SetMember("GUEST")).membershipId();
        report=((Number)reports.create(p,admin.getId(),new ManagementReportDtos.Create(null,"Saved report","# Safe report")).get("id")).longValue();
    }
    @Test void guestReadsOnlyMemberReportsAndDocumentedFields()throws Exception{
        var reader=loggedIn(guest);var projectsResponse=reader.get("/reporting-projects");assertThat(projectsResponse.statusCode()).isEqualTo(200);
        assertThat(body(projectsResponse).path("totalElements").asInt()).isEqualTo(1);
        var response=reader.get("/projects/"+p+"/management-reports/summary");assertThat(response.statusCode()).isEqualTo(200);
        var summary=body(response);assertThat(summary.has("features")).isFalse();assertThat(summary.has("feature")).isFalse();
        assertThat(summary.path("project").has("description")).isFalse();assertThat(summary.path("metrics").path("total").asInt()).isEqualTo(2);
        var saved=reader.get("/projects/"+p+"/management-reports/"+report);assertThat(saved.statusCode()).isEqualTo(200);
        assertThat(body(saved).path("markdown").asText()).isEqualTo("# Safe report");assertThat(body(saved).has("featureId")).isFalse();
        assertThat(reader.get("/projects/"+p+"/management-reports/"+report+"/download").statusCode()).isEqualTo(200);
        long other=projects.create(admin.getId(),new ProjectDtos.CreateProject("OTHER"+UUID.randomUUID().toString().substring(0,6),"Other","","UTC")).id();
        assertThat(reader.get("/projects/"+other+"/management-reports/"+report).statusCode()).isIn(403,404);
    }
    @Test void guestCannotReadWorkspaceOrAiOrMutateEvenWithCsrf()throws Exception{
        var reader=loggedIn(guest);String prefix="/projects/"+p;
        for(String path:List.of("/projects",prefix,prefix+"/members",prefix+"/features",prefix+"/test-documents/"+d,prefix+"/issues",prefix+"/notes","/admin/overview","/ai/providers","/ai/chats","/ai/projects"))
            assertThat(reader.get(path).statusCode()).as(path).isEqualTo(403);
        for(String path:List.of(prefix+"/management-reports","/ai/chats",prefix+"/features","/users"))
            assertThat(reader.write("POST",path,Map.of()).statusCode()).as(path).isEqualTo(403);
        assertThat(reader.write("PUT",prefix+"/management-reports/"+report,Map.of("title","Injected","markdown","Denied","expectedVersion",0)).statusCode()).isEqualTo(403);
        assertThat(reports.get(p,admin.getId(),report).get("title")).isEqualTo("Saved report");
    }
    @Test void membershipRemovalAndAccountLockRevokeReadsImmediately()throws Exception{
        var reader=loggedIn(guest);String path="/projects/"+p+"/management-reports/summary";
        assertThat(reader.get(path).statusCode()).isEqualTo(200);
        jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",guestMember);
        assertThat(reader.get(path).statusCode()).isIn(403,404);
        assertThat(body(reader.get("/reporting-projects")).path("items")).isEmpty();
        guest.setEnabled(false);users.saveAndFlush(Objects.requireNonNull(guest));assertThat(reader.get(path).statusCode()).isEqualTo(401);
    }
}
