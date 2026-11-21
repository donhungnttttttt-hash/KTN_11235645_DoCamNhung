package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.*;
import vn.syp.tms.support.UnifiedTestingFixtures;
import vn.syp.tms.identity.IdentityUser;
import vn.syp.tms.project.ProjectDtos;
import org.springframework.beans.factory.annotation.Autowired;
import vn.syp.tms.feature.FeatureDtos;
import vn.syp.tms.testcase.TestDocumentDtos;

class TicketWorkflowNativeTest extends UnifiedTestingFixtures {
    @org.springframework.test.context.DynamicPropertySource static void conversionStorage(org.springframework.test.context.DynamicPropertyRegistry registry){registry.add("TMS_TICKET_ATTACHMENT_ROOT",()->"./target/qa-conversion-evidence");}
    @Autowired vn.syp.tms.admin.AdminOverviewService overview;
    @Autowired vn.syp.tms.admin.ProjectLifecycleService lifecycle;
    @Autowired WorkItemStore store;
    private Client manager, tester, coordinator, developer;
    private IdentityUser contact, dev;
    private long contactMember, devMember;
    private String base;
    @BeforeEach void prepare() throws Exception {
        testingFixture(); base="/projects/"+p+"/issues";
        contact=account("USER"); dev=account("USER");
        contactMember=projects.addOrUpdateMember(p,admin.getId(),contact.getId(),new ProjectDtos.SetMember("USER")).membershipId();
        devMember=projects.addOrUpdateMember(p,admin.getId(),dev.getId(),new ProjectDtos.SetMember("USER")).membershipId();
        manager=loggedIn(admin);tester=loggedIn(worker);coordinator=loggedIn(contact);developer=loggedIn(dev);
    }
    private void duties() throws Exception {
        var response=manager.write("PUT","/projects/"+p+"/ticket-responsibilities/"+contactMember,Map.of("duties",List.of("SPEC_REVIEWER","BUG_COORDINATOR"),"expectedVersion",0));
        assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
    }
    private Map<String,Object> request(String type) {
        var input=new LinkedHashMap<String,Object>();input.put("type",type);input.put("featureId",f);input.put("documentId",d);input.put("rowId",row);
        input.put("title",type+" workflow");input.put("description","Question / evidence");input.put("steps","Reproduce");input.put("expectedResult","Expected");input.put("actualResult","Actual");
        input.put("frequency","3/5");input.put("environment","Staging");input.put("device","Desktop");input.put("assigneeMembershipId",contactMember);input.put("requestKey",UUID.randomUUID());return input;
    }
    private JsonNode create(String type) throws Exception {var r=tester.write("POST",base,request(type));assertThat(r.statusCode()).as(r.body()).isEqualTo(201);return body(r);}
    private JsonNode action(Client actor,JsonNode ticket,Map<String,Object> changes) throws Exception {
        var input=new LinkedHashMap<String,Object>(changes);input.put("expectedVersion",ticket.path("version").asLong());input.putIfAbsent("requestKey",UUID.randomUUID());
        var r=actor.write("POST",base+"/"+ticket.path("id").asLong()+"/actions",input);assertThat(r.statusCode()).as(r.body()).isEqualTo(200);return body(r);
    }
    @Test void qaConversionClosesOriginalAndCopiesNewBugWithoutLosingDiscussionOrSource() throws Exception {
        duties();var qa=create("QA");assertThat(qa.path("ticketState").asText()).isEqualTo("SPEC_CONFIRM");assertThat(qa.path("boardColumn").asText()).isEqualTo("spec");
        assertThat(coordinator.write("PUT","/projects/"+p+"/ticket-responsibilities/"+member,Map.of("duties",List.of("BUG_COORDINATOR"),"expectedVersion",0)).statusCode()).isEqualTo(403);
        qa=action(tester,qa,Map.of("body","Original QA discussion","planning",Map.of("startOn","2026-11-20","dueOn","2026-11-25","estimatedHours",8,"actualHours",2,"milestoneIds",List.of())));
        long qaId=qa.path("id").asLong();
        var historyBefore=body(tester.get(base+"/"+qaId+"/history"));
        var bug=action(coordinator,qa,Map.of("convertToBug",true,"assigneeMembershipId",contactMember,"body","Confirmed bug"));
        assertThat(bug.path("id")).isNotEqualTo(qa.path("id"));assertThat(bug.path("key")).isNotEqualTo(qa.path("key"));assertThat(bug.path("type").asText()).isEqualTo("BUG");assertThat(bug.path("ticketState").asText()).isEqualTo("NEW");
        assertThat(bug.path("sourceQaId").asLong()).isEqualTo(qaId);assertThat(bug.path("sourceQaKey")).isEqualTo(qa.path("key"));assertThat(bug.path("convertedFromQa").asBoolean()).isTrue();
        assertThat(bug.path("assigneeMembershipId").asLong()).isEqualTo(contactMember);assertThat(bug.path("coordinatorMembershipId").asLong()).isEqualTo(contactMember);
        for(String field:List.of("title","description","steps","expectedResult","actualResult","preconditions","frequency","environment","device","featureId","documentId","rowId","testVersionId","testVersionName","executedOn","testObject","caseReference","startOn","dueOn","estimatedHours","actualHours"))assertThat(bug.path(field)).as("Copied %s",field).isEqualTo(qa.path(field));
        var closed=body(tester.get(base+"/"+qaId));assertThat(closed.path("type").asText()).isEqualTo("QA");assertThat(closed.path("key")).isEqualTo(qa.path("key"));assertThat(closed.path("ticketState").asText()).isEqualTo("CLOSED");assertThat(closed.path("closureReason").asText()).isEqualTo("CONVERTED_TO_BUG");assertThat(closed.path("finalized").asBoolean()).isTrue();
        assertThat(closed.path("convertedBugId")).isEqualTo(bug.path("id"));assertThat(closed.path("convertedBugKey")).isEqualTo(bug.path("key"));assertThat(closed.path("canConvertToBug").asBoolean()).isFalse();assertThat(closed.path("allowedTransitions")).isEmpty();
        var comments=body(tester.get(base+"/"+qaId+"/comments"));assertThat(comments.size()).isEqualTo(2);assertThat(comments.get(0).path("body").asText()).isEqualTo("Original QA discussion");assertThat(comments.get(1).path("body").asText()).isEqualTo("Confirmed bug");
        var historyAfter=body(tester.get(base+"/"+qaId+"/history"));for(int index=0;index<historyBefore.size();index++)assertThat(historyAfter.get(index)).isEqualTo(historyBefore.get(index));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM work_items WHERE project_id=?",Long.class,p)).isEqualTo(2L);
        assertThat(documents.get(p,worker.getId(),d).rows().getFirst().resultStatus()).isEqualTo("UNEXECUTED");
    }
    @Test void qaConversionRetryReturnsSameNewBugAndCannotConvertOrReopenOriginalAgain() throws Exception {
        duties();var qa=create("QA");String url=base+"/"+qa.path("id")+"/actions";
        var command=new LinkedHashMap<String,Object>();command.put("convertToBug",true);command.put("assigneeMembershipId",contactMember);command.put("body","Confirmed once");command.put("expectedVersion",qa.path("version").asLong());command.put("requestKey",UUID.randomUUID());
        var first=coordinator.write("POST",url,command);assertThat(first.statusCode()).as(first.body()).isEqualTo(200);var bug=body(first);
        var counts=new LinkedHashMap<String,Long>();for(String table:List.of("work_items","work_item_feature_history","ticket_commands","ticket_notifications","project_audit"))counts.put(table,jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE project_id=?",Long.class,p));
        var replay=coordinator.write("POST",url,command);assertThat(replay.statusCode()).as(replay.body()).isEqualTo(200);assertThat(body(replay).path("id")).isEqualTo(bug.path("id"));
        for(var entry:counts.entrySet())assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM "+entry.getKey()+" WHERE project_id=?",Long.class,p)).as(entry.getKey()).isEqualTo(entry.getValue());
        var closed=body(manager.get(base+"/"+qa.path("id")));assertThat(closed.path("allowedTransitions")).isEmpty();
        command.put("requestKey",UUID.randomUUID());command.put("expectedVersion",closed.path("version").asLong());assertThat(manager.write("POST",url,command).statusCode()).isEqualTo(403);
        assertThat(manager.write("POST",url,Map.of("state","SPEC_CONFIRM","body","Attempt reopen","expectedVersion",closed.path("version").asLong(),"requestKey",UUID.randomUUID())).statusCode()).isEqualTo(403);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM work_items WHERE project_id=?",Long.class,p)).isEqualTo(2L);
    }
    @Test void invalidQaConversionRecipientLeavesOriginalOpenWithoutCreatingBug() throws Exception {
        duties();var qa=create("QA");
        var response=coordinator.write("POST",base+"/"+qa.path("id")+"/actions",Map.of("convertToBug",true,"assigneeMembershipId",devMember,"body","Should not save","expectedVersion",qa.path("version").asLong(),"requestKey",UUID.randomUUID()));
        assertThat(response.statusCode()).isEqualTo(422);
        var unchanged=body(tester.get(base+"/"+qa.path("id")));assertThat(unchanged.path("type").asText()).isEqualTo("QA");assertThat(unchanged.path("ticketState").asText()).isEqualTo("SPEC_CONFIRM");assertThat(unchanged.path("version")).isEqualTo(qa.path("version"));
        assertThat(body(tester.get(base+"/"+qa.path("id")+"/comments"))).isEmpty();assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM work_items WHERE project_id=?",Long.class,p)).isEqualTo(1L);
    }
    @Test void concurrentQaConversionRequestsCreateExactlyOneBug() throws Exception {
        duties();var qa=create("QA");String url=base+"/"+qa.path("id")+"/actions";
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)){
            var one=pool.submit(()->coordinator.write("POST",url,Map.of("convertToBug",true,"assigneeMembershipId",contactMember,"expectedVersion",0,"requestKey",UUID.randomUUID())));
            var two=pool.submit(()->manager.write("POST",url,Map.of("convertToBug",true,"assigneeMembershipId",contactMember,"expectedVersion",0,"requestKey",UUID.randomUUID())));
            assertThat(List.of(one.get().statusCode(),two.get().statusCode())).containsExactlyInAnyOrder(200,409);
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM work_items WHERE project_id=? AND item_type='BUG'",Long.class,p)).isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM work_items WHERE project_id=? AND item_type='QA'",Long.class,p)).isEqualTo(1L);
        assertThat(body(tester.get(base+"/"+qa.path("id"))).path("ticketState").asText()).isEqualTo("CLOSED");
    }
    @Test void conversionKeepsOriginalAndNewAttachmentsOnQaWithAccessibleSourceLink() throws Exception {
        duties();var qa=create("QA");String qaUrl=base+"/"+qa.path("id");
        byte[] originalBytes="Original QA evidence".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        var originalFile=new org.springframework.mock.web.MockMultipartFile("files","original.log","text/plain",originalBytes);
        var original=tester.multipart(qaUrl+"/actions-with-files",Map.of("body","Original evidence","expectedVersion",qa.path("version").asLong(),"requestKey",UUID.randomUUID()),List.of(originalFile));assertThat(original.statusCode()).as(original.body()).isEqualTo(200);qa=body(original);
        var oldComment=body(tester.get(qaUrl+"/comments")).get(0);
        byte[] conversionBytes="Confirmed reproduction".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        var conversionFile=new org.springframework.mock.web.MockMultipartFile("files","confirmed.log","text/plain",conversionBytes);
        var input=Map.<String,Object>of("convertToBug",true,"assigneeMembershipId",contactMember,"body","Confirmed with evidence","expectedVersion",qa.path("version").asLong(),"requestKey",UUID.randomUUID());
        var response=coordinator.multipart(qaUrl+"/actions-with-files",input,List.of(conversionFile));assertThat(response.statusCode()).as(response.body()).isEqualTo(200);var bug=body(response);
        assertThat(bug.path("id")).isNotEqualTo(qa.path("id"));assertThat(bug.path("sourceQaId")).isEqualTo(qa.path("id"));
        var replay=coordinator.multipart(qaUrl+"/actions-with-files",input,List.of(conversionFile));assertThat(replay.statusCode()).as(replay.body()).isEqualTo(200);assertThat(body(replay).path("id")).isEqualTo(bug.path("id"));
        var comments=body(tester.get(qaUrl+"/comments"));assertThat(comments.size()).isEqualTo(2);assertThat(comments.get(0)).isEqualTo(oldComment);assertThat(comments.get(1).path("attachments").size()).isEqualTo(1);
        String originalId=oldComment.path("attachments").get(0).path("id").asText(),conversionId=comments.get(1).path("attachments").get(0).path("id").asText();
        var oldDownload=tester.bytes(qaUrl+"/attachments/"+originalId);assertThat(oldDownload.statusCode()).isEqualTo(200);assertThat(oldDownload.body()).isEqualTo(originalBytes);
        var newDownload=coordinator.bytes(qaUrl+"/attachments/"+conversionId);assertThat(newDownload.statusCode()).isEqualTo(200);assertThat(newDownload.body()).isEqualTo(conversionBytes);
        assertThat(tester.bytes(base+"/"+bug.path("id")+"/attachments/"+originalId).statusCode()).isEqualTo(404);
    }
    @Test void conversionNotificationFailureRollsBackNewBugAndOriginalClosure() throws Exception {
        duties();var qa=create("QA");long qaId=qa.path("id").asLong();String recipient=dev.getId();assertThat(recipient).matches("[a-f0-9-]{36}");
        assertThat(manager.write("PUT","/projects/"+p+"/ticket-responsibilities/"+devMember,Map.of("duties",List.of("BUG_COORDINATOR"),"expectedVersion",0)).statusCode()).isEqualTo(200);
        var counts=new LinkedHashMap<String,Long>();for(String table:List.of("work_items","work_item_feature_history","ticket_commands","ticket_notifications","project_audit"))counts.put(table,jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE project_id=?",Long.class,p));
        jdbc.execute("ALTER TABLE ticket_notifications ADD CONSTRAINT ck_conversion_rollback CHECK(recipient_user_id<>'"+recipient+"')");
        try {
            var response=manager.write("POST",base+"/"+qaId+"/actions",Map.of("convertToBug",true,"assigneeMembershipId",devMember,"body","Atomic conversion","expectedVersion",qa.path("version").asLong(),"requestKey",UUID.randomUUID()));
            assertThat(response.statusCode()).isEqualTo(503);
            var original=body(tester.get(base+"/"+qaId));assertThat(original.path("type").asText()).isEqualTo("QA");assertThat(original.path("ticketState").asText()).isEqualTo("SPEC_CONFIRM");assertThat(original.path("version")).isEqualTo(qa.path("version"));
            for(var entry:counts.entrySet())assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM "+entry.getKey()+" WHERE project_id=?",Long.class,p)).as(entry.getKey()).isEqualTo(entry.getValue());
        } finally {jdbc.execute("ALTER TABLE ticket_notifications DROP CHECK ck_conversion_rollback");}
    }
    @Test void processedAwaitsTesterAndReopenClearsClosureWithoutChangingCase() throws Exception {
        duties();var bug=create("BUG");bug=action(coordinator,bug,Map.of("assigneeMembershipId",devMember));
        bug=action(developer,bug,Map.of("state","IN_PROGRESS"));bug=action(developer,bug,Map.of("state","CLOSED","closureReason","PROCESSED","body","Implemented"));
        assertThat(bug.path("finalized").asBoolean()).isFalse();assertThat(bug.path("awaitingVerification").asBoolean()).isTrue();
        var denied=developer.write("POST",base+"/"+bug.path("id")+"/actions",Map.of("state","CLOSED","closureReason","FIXED","expectedVersion",bug.path("version").asLong(),"requestKey",UUID.randomUUID()));assertThat(denied.statusCode()).isEqualTo(403);
        bug=action(tester,bug,Map.of("state","NEW","body","Still reproducible"));assertThat(bug.path("closureReason").isNull()).isTrue();assertThat(bug.path("assigneeMembershipId").asLong()).isEqualTo(contactMember);
        bug=action(coordinator,bug,Map.of("assigneeMembershipId",devMember));bug=action(developer,bug,Map.of("state","IN_PROGRESS"));bug=action(developer,bug,Map.of("state","WAITING_CONFIRM","body","Cannot reproduce"));
        bug=action(tester,bug,Map.of("state","CLOSED","closureReason","CANNOT_REPRODUCE","body","Confirmed"));assertThat(bug.path("finalized").asBoolean()).isTrue();
        var outcomes=overview.project(admin.getId(),p);assertThat(((Number)outcomes.get("fixedBugs")).longValue()).isZero();assertThat(((Number)outcomes.get("cannotReproduceBugs")).longValue()).isEqualTo(1);
        assertThat(documents.get(p,worker.getId(),d).rows().getFirst().resultStatus()).isEqualTo("UNEXECUTED");
    }
    @Test void managerRepairsHistoricalCoordinatorThroughSameAssigneeAndVerifierCanReopen() throws Exception {
        duties();var bug=create("BUG");long id=bug.path("id").asLong();
        // V39 cannot infer the coordinator for historical Bugs. Keep the original assignee.
        jdbc.update("UPDATE work_item_feature_context SET coordinator_membership_id=NULL WHERE project_id=? AND work_item_id=?",p,id);
        bug=action(tester,bug,Map.of("body","Additional evidence"));assertThat(bug.path("coordinatorMembershipId").isNull()).isTrue();
        var denied=coordinator.write("POST",base+"/"+id+"/actions",Map.of("assigneeMembershipId",contactMember,"body","Same assignee is not manager repair","expectedVersion",bug.path("version").asLong(),"requestKey",UUID.randomUUID()));assertThat(denied.statusCode()).isEqualTo(403);
        long notices=Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM ticket_notifications WHERE project_id=? AND work_item_id=?",Long.class,p,id));
        var repair=Map.of("assigneeMembershipId",contactMember,"expectedVersion",bug.path("version").asLong(),"requestKey",UUID.randomUUID());
        var response=manager.write("POST",base+"/"+id+"/actions",repair);assertThat(response.statusCode()).as(response.body()).isEqualTo(200);bug=body(response);
        assertThat(bug.path("assigneeMembershipId").asLong()).isEqualTo(contactMember);assertThat(bug.path("coordinatorMembershipId").asLong()).isEqualTo(contactMember);
        long history=Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM work_item_feature_history WHERE project_id=? AND work_item_id=?",Long.class,p,id));
        assertThat(manager.write("POST",base+"/"+id+"/actions",repair).statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM work_item_feature_history WHERE project_id=? AND work_item_id=?",Long.class,p,id)).isEqualTo(history);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ticket_notifications WHERE project_id=? AND work_item_id=?",Long.class,p,id)).isEqualTo(notices);
        bug=action(coordinator,bug,Map.of("state","IN_PROGRESS"));bug=action(coordinator,bug,Map.of("state","CLOSED","closureReason","PROCESSED"));
        bug=action(tester,bug,Map.of("state","NEW","body","Still reproducible"));assertThat(bug.path("assigneeMembershipId").asLong()).isEqualTo(contactMember);assertThat(bug.path("coordinatorMembershipId").asLong()).isEqualTo(contactMember);assertThat(bug.path("ticketState").asText()).isEqualTo("NEW");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ticket_notifications WHERE project_id=? AND work_item_id=? AND recipient_user_id=?",Long.class,p,id,contact.getId())).isEqualTo(2L);
    }
    @Test void commentsPreserveAssignmentAndRetryIsAtomicAndNotificationsScoped() throws Exception {
        duties();var bug=create("BUG");var command=new LinkedHashMap<String,Object>();command.put("body","Please investigate");command.put("assigneeMembershipId",devMember);command.put("expectedVersion",bug.path("version").asLong());command.put("requestKey",UUID.randomUUID());
        var url=base+"/"+bug.path("id")+"/actions";var first=coordinator.write("POST",url,command);assertThat(first.statusCode()).as(first.body()).isEqualTo(200);
        assertThat(coordinator.write("POST",url,command).statusCode()).isEqualTo(200);
        assertThat(body(tester.get(base+"/"+bug.path("id")+"/comments")).size()).isEqualTo(1);
        var notices=body(developer.get("/me/ticket-notifications"));assertThat(notices.path("totalItems").asInt()).isEqualTo(1);
        var updated=action(tester,body(first),Map.of("body","Extra evidence"));assertThat(updated.path("assigneeMembershipId").asLong()).isEqualTo(devMember);assertThat(updated.path("ticketState").asText()).isEqualTo("NEW");
        command.put("requestKey",UUID.randomUUID());assertThat(coordinator.write("POST",url,command).statusCode()).isEqualTo(409);
        var notice=notices.path("items").get(0).path("id").asLong();assertThat(tester.write("PUT","/me/ticket-notifications/"+notice+"/read",Map.of()).statusCode()).isEqualTo(404);
        assertThat(developer.write("PUT","/me/ticket-notifications/"+notice+"/read",Map.of()).statusCode()).isEqualTo(200);
        jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",devMember);assertThat(body(developer.get("/me/ticket-notifications")).path("totalItems").asInt()).isZero();
    }
    @Test void staleSourceInvalidAssignmentAndMissingBugEvidenceLeaveNoPartialWrites() throws Exception {
        duties();var input=request("BUG");input.put("sourceResultVersion",999);assertThat(tester.write("POST",base,input).statusCode()).isEqualTo(409);
        input=request("BUG");input.remove("frequency");assertThat(tester.write("POST",base,input).statusCode()).isEqualTo(422);
        var bug=create("BUG");jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",devMember);
        var response=coordinator.write("POST",base+"/"+bug.path("id")+"/actions",Map.of("body","Must rollback","assigneeMembershipId",devMember,"expectedVersion",bug.path("version").asLong(),"requestKey",UUID.randomUUID()));assertThat(response.statusCode()).isEqualTo(422);
        assertThat(body(tester.get(base+"/"+bug.path("id")+"/comments")).size()).isZero();
        assertThat(body(tester.get(base+"/"+bug.path("id"))).path("version")).isEqualTo(bug.path("version"));
    }
    @Test void boardCountsAllRowsAndGuestAndOutsiderCannotReadTickets() throws Exception {
        duties();for(int n=0;n<3;n++)create("BUG");create("QA");
        var listing=body(tester.get(base+"?size=1&column=new"));assertThat(listing.path("totalItems").asLong()).isEqualTo(3);assertThat(listing.path("items").size()).isEqualTo(1);
        var board=body(tester.get(base+"/board"));assertThat(board.path("columns").size()).isEqualTo(10);assertThat(board.path("totalItems").asLong()).isEqualTo(4);assertThat(board.path("columns").get(1).path("count").asLong()).isEqualTo(3);
        assertThat(loggedIn(account("USER")).get(base).statusCode()).isEqualTo(404);assertThat(loggedIn(account("GUEST")).get(base).statusCode()).isEqualTo(403);
    }
    @Test void snapshotUsesSavedCaseVersionAndKeepsMissingMetadataExplicit() throws Exception {
        duties();long first=version("Discovery"),second=version("Later");
        features.updateResult(p,admin.getId(),d,row,new TestDocumentDtos.UpdateResult("NG",0L,UUID.randomUUID().toString(),first,java.time.LocalDate.of(2026,11,1)));
        var context=body(tester.get(base+"/context?featureId="+f+"&documentId="+d+"&rowId="+row));
        assertThat(context.path("testVersionId").asLong()).isEqualTo(first);assertThat(context.path("resultVersion").asLong()).isEqualTo(1);assertThat(context.path("testObject").asText()).isEqualTo("Case title");
        var input=request("BUG");input.put("sourceRevisionId",context.path("revisionId").asLong());input.put("sourceResultVersion",1);input.put("testVersionId",second);
        var response=tester.write("POST",base,input);assertThat(response.statusCode()).as(response.body()).isEqualTo(201);var issue=body(response);assertThat(issue.path("testVersionId").asLong()).isEqualTo(first);
        features.updateResult(p,admin.getId(),d,row,new TestDocumentDtos.UpdateResult("OK",1L,UUID.randomUUID().toString(),second,java.time.LocalDate.of(2026,11,2)));
        features.update(p,admin.getId(),f,new FeatureDtos.Update("Renamed","New environment","New context",0L));
        var saved=body(tester.get(base+"/"+issue.path("id")));assertThat(saved.path("testVersionName").asText()).isEqualTo("Discovery");assertThat(saved.path("executedOn").asText()).isEqualTo("2026-11-01");assertThat(saved.path("featureName").asText()).isEqualTo("Renamed");
        input.put("requestKey",UUID.randomUUID());assertThat(tester.write("POST",base,input).statusCode()).isEqualTo(409);
        long untouched=documents.get(p,admin.getId(),d).rows().get(1).rowId();input=request("BUG");input.put("rowId",untouched);
        var missing=body(tester.write("POST",base,input));assertThat(missing.path("testVersionId").isNull()).isTrue();assertThat(missing.path("testVersionName").isNull()).isTrue();
        input=request("BUG");input.remove("rowId");input.remove("documentId");input.put("monkey",true);input.put("manualTestVersion","Manual discovery");
        var monkey=body(tester.write("POST",base,input));assertThat(monkey.path("testVersionName").asText()).isEqualTo("Manual discovery");assertThat(monkey.path("caseReference").isNull()).isTrue();
    }
    private long version(String name)throws Exception{var r=manager.write("POST","/projects/"+p+"/features/"+f+"/test-versions",Map.of("name",name,"requestKey",UUID.randomUUID()));assertThat(r.statusCode()).as(r.body()).isEqualTo(201);return body(r).path("id").asLong();}
    @Test void rejectsMixedMonkeyAndCaseSourceEvenWithManualVersion()throws Exception{
        duties();var input=request("BUG");input.put("monkey",true);input.put("manualTestVersion","Manual discovery");
        var response=tester.write("POST",base,input);assertThat(response.statusCode()).as(response.body()).isEqualTo(422);
        assertThat(body(tester.get(base)).path("totalItems").asLong()).isZero();
    }
    @Test void canonicalReportsAndLegacyReconciliationAgree() throws Exception {
        duties();var bug=create("BUG");bug=action(coordinator,bug,Map.of("assigneeMembershipId",devMember));bug=action(developer,bug,Map.of("state","IN_PROGRESS"));bug=action(developer,bug,Map.of("state","CLOSED","closureReason","PROCESSED"));
        var project=overview.project(admin.getId(),p);assertThat(((Number)project.get("openBugs")).longValue()).isEqualTo(1);assertThat(((Number)project.get("awaitingVerification")).longValue()).isEqualTo(1);
        assertThat(json.valueToTree(lifecycle.readiness(admin.getId(),p)).path("canArchive").asBoolean()).isFalse();
        var facts=json.valueToTree(new vn.syp.tms.ai.FeatureFacts(store).snapshot(p,f,null,true,""));assertThat(facts.path("workByStatus").get(0).path("closureReason").asText()).isEqualTo("PROCESSED");assertThat(facts.path("workByStatus").get(0).path("finalized").asInt()).isZero();
        bug=action(tester,bug,Map.of("state","CLOSED","closureReason","FIXED"));assertThat(bug.path("finalized").asBoolean()).isTrue();assertThat(((Number)overview.project(admin.getId(),p).get("openBugs")).longValue()).isZero();
        jdbc.update("UPDATE work_item_feature_context SET ticket_state=NULL,closure_reason=NULL WHERE project_id=? AND work_item_id=?",p,bug.path("id").asLong());
        var legacy=body(tester.get(base+"/"+bug.path("id")));assertThat(legacy.path("boardColumn").asText()).isEqualTo("legacy");assertThat(legacy.path("finalized").asBoolean()).isTrue();assertThat(legacy.path("closureReason").isNull()).isTrue();
        var board=body(tester.get(base+"/board"));assertThat(board.path("legacyCount").asLong()).isEqualTo(1);assertThat(board.path("totalItems").asLong()).isEqualTo(1);assertThat(body(tester.get(base+"?column=legacy")).path("totalItems").asLong()).isEqualTo(1);
        legacy=action(manager,legacy,Map.of("state","NEW","body","Reconciled from source evidence","assigneeMembershipId",contactMember));assertThat(legacy.path("legacyWorkflow").asBoolean()).isFalse();
    }
    @Test void conversionPreservesBlankQaEvidenceAndHistoricalAnswers() throws Exception {
        duties();var input=request("QA");input.put("steps","");input.put("expectedResult","");input.put("actualResult","");input.remove("frequency");input.remove("environment");input.remove("device");
        var qa=body(tester.write("POST",base,input));long id=qa.path("id").asLong();
        jdbc.update("INSERT INTO qa_answers(project_id,work_item_id,generation,answer_version,body,basis_reference,author_membership_id,answered_at) VALUES(?,?,0,1,'Historical answer','Spec',?,UTC_TIMESTAMP(6))",p,id,contactMember);
        var before=jdbc.queryForMap("SELECT question,context_snapshot FROM qa_details WHERE project_id=? AND work_item_id=?",p,id);
        var bug=action(coordinator,qa,Map.of("convertToBug",true,"assigneeMembershipId",contactMember));assertThat(bug.path("steps").asText()).isEmpty();assertThat(bug.path("actualResult").asText()).isEmpty();
        assertThat(jdbc.queryForMap("SELECT question,context_snapshot FROM qa_details WHERE project_id=? AND work_item_id=?",p,id)).isEqualTo(before);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM qa_answers WHERE project_id=? AND work_item_id=?",Long.class,p,id)).isEqualTo(1L);
        var edit=new LinkedHashMap<String,Object>();edit.put("title","Add evidence");edit.put("description","Question");edit.put("steps","Found steps");edit.put("expectedResult","");edit.put("actualResult","");edit.put("expectedVersion",bug.path("version").asLong());
        var saved=tester.write("PUT",base+"/"+bug.path("id"),edit);assertThat(saved.statusCode()).as(saved.body()).isEqualTo(200);
        assertThat(body(tester.get(base+"/"+id)).path("steps").asText()).isEmpty();
        edit.put("steps","");edit.put("expectedVersion",body(saved).path("version").asLong());assertThat(tester.write("PUT",base+"/"+bug.path("id"),edit).statusCode()).isEqualTo(422);
    }
    @Test void revocationNullAssignmentAndUnrelatedCommentNeverEscalate() throws Exception {
        duties();var qa=create("QA");
        var options=body(tester.get(base+"/options?type=QA"));var choices=new ArrayList<Long>();options.path("assignees").forEach(choice->choices.add(choice.path("membershipId").asLong()));assertThat(choices).contains(contactMember).doesNotContain(member,devMember);
        assertThat(manager.write("PUT","/projects/"+p+"/ticket-responsibilities/"+contactMember,Map.of("duties",List.of(),"expectedVersion",1)).statusCode()).isEqualTo(200);
        assertThat(coordinator.write("POST",base+"/"+qa.path("id")+"/actions",Map.of("convertToBug",true,"assigneeMembershipId",contactMember,"expectedVersion",0,"requestKey",UUID.randomUUID())).statusCode()).isEqualTo(403);
        var command=new LinkedHashMap<String,Object>();command.put("assigneeMembershipId",null);command.put("body","No unassignment");command.put("expectedVersion",0);command.put("requestKey",UUID.randomUUID());assertThat(manager.write("POST",base+"/"+qa.path("id")+"/actions",command).statusCode()).isEqualTo(400);
        var comment=action(developer,qa,Map.of("body","I can comment"));assertThat(comment.path("canEdit").asBoolean()).isFalse();assertThat(comment.path("canAssign").asBoolean()).isFalse();assertThat(comment.path("allowedTransitions").size()).isZero();
        assertThat(loggedIn(account("GUEST")).get("/me/ticket-notifications").statusCode()).isEqualTo(403);
    }
    @Test void twoCommentsOnSameVersionHaveOneWinner()throws Exception{
        duties();var bug=create("BUG");String url=base+"/"+bug.path("id")+"/actions";
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)){
            var one=pool.submit(()->tester.write("POST",url,Map.of("body","First","expectedVersion",0,"requestKey",UUID.randomUUID())));
            var two=pool.submit(()->developer.write("POST",url,Map.of("body","Second","expectedVersion",0,"requestKey",UUID.randomUUID())));
            assertThat(List.of(one.get().statusCode(),two.get().statusCode())).containsExactlyInAnyOrder(200,409);
        }
        assertThat(body(tester.get(base+"/"+bug.path("id")+"/comments")).size()).isEqualTo(1);
    }
    @Test void notificationFailureRollsBackCommentAssignmentVersionAndCommand()throws Exception{
        duties();var bug=create("BUG");long id=bug.path("id").asLong();
        String fixtureUser=dev.getId();assertThat(fixtureUser).matches("[a-f0-9-]{36}");
        jdbc.execute("ALTER TABLE ticket_notifications ADD CONSTRAINT ck_ticket_test_rollback CHECK(recipient_user_id<>'"+fixtureUser+"')");
        try {
            var response=coordinator.write("POST",base+"/"+id+"/actions",Map.of("body","Atomic change","assigneeMembershipId",devMember,"expectedVersion",0,"requestKey",UUID.randomUUID()));
            assertThat(response.statusCode()).isEqualTo(503);
            assertThat(body(response).path("code").asText()).isEqualTo("DATABASE_UNAVAILABLE");
            var saved=body(tester.get(base+"/"+id));assertThat(saved.path("version").asLong()).isZero();assertThat(saved.path("assigneeMembershipId").asLong()).isEqualTo(contactMember);
            assertThat(body(tester.get(base+"/"+id+"/comments")).size()).isZero();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ticket_commands WHERE project_id=? AND work_item_id=?",Long.class,p,id)).isZero();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ticket_notifications WHERE project_id=? AND work_item_id=? AND recipient_user_id=?",Long.class,p,id,dev.getId())).isZero();
        } finally {jdbc.execute("ALTER TABLE ticket_notifications DROP CHECK ck_ticket_test_rollback");}
    }
    @Test void sameCreatorCoordinatorWorkerAndVerifierNeedsNoFakeApprovalOrSelfNotice()throws Exception{
        duties();var input=request("BUG");var created=coordinator.write("POST",base,input);assertThat(created.statusCode()).isEqualTo(201);var bug=body(created);
        bug=action(coordinator,bug,Map.of("state","IN_PROGRESS"));bug=action(coordinator,bug,Map.of("state","CLOSED","closureReason","PROCESSED"));
        bug=action(coordinator,bug,Map.of("state","CLOSED","closureReason","FIXED"));assertThat(bug.path("finalized").asBoolean()).isTrue();
        assertThat(body(coordinator.get("/me/ticket-notifications")).path("totalItems").asLong()).isZero();
    }
}
