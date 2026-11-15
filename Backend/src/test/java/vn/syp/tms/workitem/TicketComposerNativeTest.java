package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import vn.syp.tms.support.UnifiedTestingFixtures;
import com.fasterxml.jackson.databind.JsonNode;

class TicketComposerNativeTest extends UnifiedTestingFixtures {
    @DynamicPropertySource static void storage(DynamicPropertyRegistry r){r.add("TMS_TICKET_ATTACHMENT_ROOT",()->"./target/ticket-composer-evidence");}
    private Client manager;private String base;private JsonNode ticket;
    @BeforeEach void prepare()throws Exception{
        testingFixture();manager=loggedIn(admin);base="/projects/"+p+"/issues";
        long pm=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,admin.getId()));
        var input=new LinkedHashMap<String,Object>();input.put("type","BUG");input.put("featureId",f);input.put("monkey",true);input.put("title","Comment evidence");input.put("steps","Steps");input.put("expectedResult","Expected");input.put("actualResult","Actual");input.put("frequency","Always");input.put("environment","Test");input.put("device","Tablet");input.put("assigneeMembershipId",pm);input.put("requestKey",UUID.randomUUID());
        var response=manager.write("POST",base,input);assertThat(response.statusCode()).as(response.body()).isEqualTo(201);ticket=body(response);base+="/"+ticket.path("id").asLong();
    }
    private Map<String,Object> action(){var value=new LinkedHashMap<String,Object>();value.put("expectedVersion",ticket.path("version").asLong());value.put("requestKey",UUID.randomUUID());return value;}
    @Test void savesPlanningWithCommentAndPreservesItAfterReload()throws Exception{
        var input=action();input.put("body","Planning update");input.put("planning",Map.of("startOn","2026-11-15","dueOn","2026-11-20","estimatedHours",8,"actualHours",2.5,"milestoneIds",List.of()));
        var response=manager.write("POST",base+"/actions",input);assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        var saved=body(manager.get(base));assertThat(saved.path("startOn").asText()).isEqualTo("2026-11-15");assertThat(saved.path("dueOn").asText()).isEqualTo("2026-11-20");assertThat(saved.path("actualHours").asDouble()).isEqualTo(2.5);
        assertThat(body(manager.get(base+"/comments")).toString()).contains("Planning update","2026-11-20");
    }
    @Test void attachesImageAtomicallyAndReplaysWithoutDuplicateComment()throws Exception{
        var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",bytes);
        var file=new MockMultipartFile("files","proof.png","image/png",bytes.toByteArray());var input=action();input.put("body","Evidence");
        var response=manager.multipart(base+"/actions-with-files",input,List.of(file));assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        assertThat(manager.multipart(base+"/actions-with-files",input,List.of(file)).statusCode()).isEqualTo(200);
        var comments=body(manager.get(base+"/comments"));assertThat(comments.size()).isEqualTo(1);var attachments=comments.get(0).path("attachments");assertThat(attachments.size()).isEqualTo(1);
        var download=manager.bytes(base+"/attachments/"+attachments.get(0).path("id").asText());assertThat(download.statusCode()).isEqualTo(200);assertThat(download.body()).isEqualTo(bytes.toByteArray());
        assertThat(download.headers().firstValue("X-Content-Type-Options")).contains("nosniff");
    }
    @Test void rejectsInvalidFileWithoutSavingBodyOrPlanning()throws Exception{
        var input=action();input.put("body","Must roll back");input.put("planning",Map.of("startOn","2026-11-15","milestoneIds",List.of()));
        var response=manager.multipart(base+"/actions-with-files",input,List.of(new MockMultipartFile("files","fake.png","image/png","not an image".getBytes())));
        assertThat(response.statusCode()).isEqualTo(422);assertThat(body(manager.get(base)).path("version").asLong()).isEqualTo(ticket.path("version").asLong());assertThat(body(manager.get(base+"/comments")).size()).isZero();
    }
    @Test void acceptsFileOnlyAndRejectsChangedContentOnReplay()throws Exception{
        var input=action();var file=new MockMultipartFile("files","trace.log","text/plain","first log".getBytes());
        assertThat(manager.multipart(base+"/actions-with-files",input,List.of(file)).statusCode()).isEqualTo(200);
        assertThat(manager.multipart(base+"/actions-with-files",input,List.of(new MockMultipartFile("files","trace.log","text/plain","changed log".getBytes()))).statusCode()).isEqualTo(409);
        assertThat(body(manager.get(base+"/comments")).size()).isEqualTo(1);
    }
    @Test void rejectsInvalidDatesAndMilestonesAtomically()throws Exception{
        var input=action();input.put("body","Not saved");input.put("planning",Map.of("startOn","2026-11-20","dueOn","2026-11-15","milestoneIds",List.of()));
        assertThat(manager.write("POST",base+"/actions",input).statusCode()).isEqualTo(422);
        input.put("planning",Map.of("milestoneIds",List.of(999999999L)));assertThat(manager.write("POST",base+"/actions",input).statusCode()).isEqualTo(422);
        assertThat(body(manager.get(base+"/comments")).size()).isZero();
    }
    @Test void ordinaryCommenterCannotAlterOthersPlanning()throws Exception{
        var input=action();input.put("body","Other worker");input.put("planning",Map.of("estimatedHours",1,"milestoneIds",List.of()));
        var workerClient=loggedIn(worker);assertThat(workerClient.write("POST",base+"/actions",input).statusCode()).isEqualTo(403);
        input.remove("planning");assertThat(workerClient.write("POST",base+"/actions",input).statusCode()).isEqualTo(200);
    }
    @Test void deniesAttachmentToGuestAndUnrelatedWorker()throws Exception{
        var input=action();var file=new MockMultipartFile("files","trace.log","text/plain","safe log".getBytes());
        assertThat(manager.multipart(base+"/actions-with-files",input,List.of(file)).statusCode()).isEqualTo(200);
        String id=body(manager.get(base+"/comments")).get(0).path("attachments").get(0).path("id").asText();
        assertThat(loggedIn(account("USER")).bytes(base+"/attachments/"+id).statusCode()).isIn(403,404);
        assertThat(loggedIn(account("GUEST")).bytes(base+"/attachments/"+id).statusCode()).isEqualTo(403);
    }
}
