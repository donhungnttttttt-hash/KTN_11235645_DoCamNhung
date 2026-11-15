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
        reports.publish(p,admin.getId(),report,0L);
    }
    @Test void guestCannotReadSavedReportsButManagersKeepThem()throws Exception{
        var reader=loggedIn(guest);assertThat(reader.get("/reporting-projects").statusCode()).isEqualTo(200);
        String path="/projects/"+p+"/management-reports";
        for(String suffix:List.of("","/summary","/"+report,"/"+report+"/download"))assertThat(reader.get(path+suffix).statusCode()).as(suffix).isEqualTo(403);
        assertThat(loggedIn(admin).get(path+"/"+report).statusCode()).isEqualTo(200);
        assertThat(loggedIn(admin).get(path+"/"+report+"/download").statusCode()).isEqualTo(200);
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
        var reader=loggedIn(guest);String path="/projects/"+p+"/management-reports/dashboard";
        assertThat(reader.get(path).statusCode()).isEqualTo(200);
        jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",guestMember);
        assertThat(reader.get(path).statusCode()).isIn(403,404);
        assertThat(body(reader.get("/reporting-projects")).path("items")).isEmpty();
        guest.setEnabled(false);users.saveAndFlush(Objects.requireNonNull(guest));assertThat(reader.get(path).statusCode()).isEqualTo(401);
    }
    @Test void dashboardIsScopedAndDoesNotDisclosePersonalOrContractData()throws Exception{
        var reader=loggedIn(guest);String path="/projects/"+p+"/management-reports/dashboard";
        var response=reader.get(path);assertThat(response.statusCode()).isEqualTo(200);
        var data=body(response);assertThat(data.path("metrics").path("total").asInt()).isEqualTo(2);
        assertThat(data.path("simulation").path("baseRate").asInt()).isEqualTo(500);
        assertThat(data.path("simulation").path("managerWeight").asInt()).isEqualTo(5);
        assertThat(data.toString()).doesNotContain("password","salary","email","phone","contract");
        jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",guestMember);
        assertThat(reader.get(path).statusCode()).isIn(403,404);
    }
    @Test void guestCannotReadPublishedOrDraftReports()throws Exception{
        var reader=loggedIn(guest);
        long draft=((Number)reports.create(p,admin.getId(),new ManagementReportDtos.Create(null,"Draft","Private draft")).get("id")).longValue();
        String path="/projects/"+p+"/management-reports/"+draft;
        assertThat(reader.get(path).statusCode()).isEqualTo(403);
        var manager=loggedIn(admin);
        assertThat(manager.write("POST",path+"/publish",Map.of("expectedVersion",0)).statusCode()).isEqualTo(200);
        assertThat(reader.get(path).statusCode()).isEqualTo(403);
        reports.update(p,admin.getId(),draft,new ManagementReportDtos.Update("Changed","Unapproved change",0L));
        assertThat(reader.get(path).statusCode()).isEqualTo(403);
        assertThat(reader.write("POST",path+"/publish",Map.of("expectedVersion",1)).statusCode()).isEqualTo(403);
        assertThat(manager.write("POST",path+"/publish",Map.of("expectedVersion",0)).statusCode()).isEqualTo(409);
    }
}
