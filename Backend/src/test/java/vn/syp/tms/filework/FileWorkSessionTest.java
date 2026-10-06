package vn.syp.tms.filework;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.workitem.WorkItemStore;
import vn.syp.tms.shared.web.BusinessException;

class FileWorkSessionTest {
    final WorkItemStore db=mock(WorkItemStore.class);
    final IdentityService identity=mock(IdentityService.class);
    final ProjectAudit audit=mock(ProjectAudit.class);
    final FileWorkGuard guard=new FileWorkGuard(db,identity);
    final FileWorkSessionService service=new FileWorkSessionService(db,guard,audit,new ObjectMapper().findAndRegisterModules());
    String role="TESTER",global="TESTER",state="DOING",cycle="ACTIVE",condition="AVAILABLE",platform="iOS";
    boolean returned=false,archived=false,archivedBuild=false,approved=true,excluded=false,active=true;
    long executor=7,assignee=7,groupVersion=2,sessionVersion=0,recipient=7,blockers=0;
    List<Map<String,Object>> commands=new ArrayList<>(),open=new ArrayList<>(),busy=new ArrayList<>(),prior=new ArrayList<>();
    Map<String,Object> group(){return Map.of("id",40L,"documentId",10L,"cycleId",20L,"configurationId",30L,"version",groupVersion,"cycleStatus",cycle,"environmentId",41L,"deviceId",42L,"defaultBuildId",50L);}
    Map<String,Object> session(){return Map.of("id",60L,"groupId",40L,"executorMembershipId",executor,"allocationId",70L,"assetId",80L,"buildId",50L,"state",state,"version",sessionVersion,"contextSnapshot","{\"executor\":{\"displayName\":\"Pinned\"},\"physicalAsset\":{\"assetCode\":\"PIN\"}}");}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @BeforeEach void setup(){var account=mock(IdentityUserRepository.CurrentAccount.class);when(account.getRole()).thenAnswer(i->global);when(identity.lockCurrent("actor")).thenReturn(account);
        when(db.row(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);
            if(sql.contains("FROM projects")){var v=new HashMap<String,Object>(Map.of("id",1L));if(archived)v.put("archivedAt","date");return v;}
            if(sql.contains("FROM project_memberships m JOIN"))return Map.of("membershipId",7L,"displayName","Tester","username","tester");
            if(sql.contains("FROM project_memberships"))return Map.of("id",7L,"projectRole",role);
            if(sql.contains("FROM file_work_groups"))return group();
            if(sql.contains("FROM file_work_sessions"))return session();
            if(sql.contains("FROM environments"))return Map.of("id",41L,"code","ENV","name","Environment","description","","active",active);
            if(sql.contains("FROM devices"))return Map.of("id",42L,"code","DEV","name","Display Android","osName","iPadOS","model","iPad Pro","osVersion","18","active",active);
            if(sql.contains("FROM builds")){var build=new HashMap<String,Object>(Map.of("id",50L,"platform",platform));if(archivedBuild)build.put("archivedAt","date");return build;}
            if(sql.contains("FROM device_assets"))return Map.of("id",80L,"assetCode","A80","type","IPAD","model","iPad Pro","serial","S","osName","iOS","osVersion","18","conditionCode",condition);
            if(sql.startsWith("SELECT asset_id"))return Map.of("assetId",80L);
            if(sql.contains("FROM device_allocations")){var v=new HashMap<String,Object>(Map.of("id",70L,"assetId",80L,"recipientMembershipId",recipient,"assignedAt","2026-10-06T00:00:00Z"));if(returned)v.put("returnedAt","date");return v;}
            return Map.of("version",1L);
        });
        when(db.rows(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);
            if(sql.startsWith("SELECT COALESCE(sd.excluded"))return List.of(Map.of("excluded",false,"resultCode",blockers==0?"OK":"P","bugLinked",false));
            if(sql.contains("FROM file_work_group_items")){var r=new HashMap<String,Object>(Map.of("runItemId",100L,"revisionId",101L,"assigneeMembershipId",assignee,"version",1L,"excluded",excluded));if(approved)r.put("approvedAt","date");return List.of(r);}
            if(sql.contains("FROM file_work_commands"))return commands;
            if(sql.startsWith("SELECT id,state FROM file_work_sessions"))return prior.isEmpty()?open:prior;
            if(sql.contains("asset_id=? AND state='DOING'"))return busy;
            if(sql.contains("state IN ('DOING','PAUSED')"))return open;
            if(sql.contains("FROM device_allocations al"))return List.of(Map.of("allocationId",70L,"assetId",80L));
            return List.of();
        });
        when(db.count(anyString(),any(Object[].class))).thenAnswer(i->blockers);
        when(db.checksum(any())).thenReturn("checksum");when(db.encode(any())).thenReturn("{}");
        when(db.insert(anyString(),any(Object[].class))).thenReturn(60L);when(db.update(anyString(),any(Object[].class))).thenReturn(1);
    }
    FileWorkDtos.Start start(){return new FileWorkDtos.Start(70L,50L,2L,"start_key");}
    FileWorkDtos.SessionCommand command(){return new FileWorkDtos.SessionCommand(0L,2L," reason ","action_key");}
    void error(String code,Runnable action){assertEquals(code,assertThrows(BusinessException.class,action::run).code());}
    void replay(String action){commands.add(Map.of("groupId",40L,"sessionId",60L,"actorMembershipId",7L,"action",action,"checksum","checksum","response","{\"id\":60,\"state\":\"COMPLETED\"}"));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void startPinsActualMachineBuildExecutorAndRecordsNoVerdict(){var result=service.start(1,"actor",40,start());assertEquals(60L,result.get("id"));verify(db).insert(contains("INSERT INTO file_work_sessions"),eq(1L),eq(40L),eq(7L),eq(70L),eq(80L),eq(50L),eq("{}"));verify(db,never()).insert(contains("execution_attempts"),any(Object[].class));verify(audit).record(1L,"actor","FILE_WORK_SESSION",60L,"START");}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void startReplayRechecksRevocationBeforeOldCommand(){replay("START");returned=true;error("ALLOCATION_INACTIVE",()->service.start(1,"actor",40,start()));verify(db,never()).rows(contains("FROM file_work_commands"),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void doingAndPausedBlockNewStart(){for(String s:List.of("DOING","PAUSED")){open.add(Map.of("id",60L,"state",s));error("SESSION_OPEN",()->service.start(1,"actor",40,start()));open.clear();}verify(db,never()).insert(anyString(),any(Object[].class));}
    @Test void assetBusyBlocksStartAndResume(){busy.add(Map.of("id",61L));error("ASSET_BUSY",()->service.start(1,"actor",40,start()));state="PAUSED";error("ASSET_BUSY",()->service.resume(1,"actor",60,command()));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void pauseRequiresReasonAndAdvancesOnlySessionAndGroup(){error("REASON_REQUIRED",()->service.pause(1,"actor",60,new FileWorkDtos.SessionCommand(0L,2L," ","pause_key")));service.pause(1,"actor",60,command());verify(db).update(contains("UPDATE file_work_sessions SET state=?"),eq("PAUSED"),eq(1L),eq(60L),eq(0L));verify(db).update(contains("UPDATE file_work_groups"),eq(7L),eq(1L),eq(40L),eq(2L));verify(db).update(contains("INSERT INTO file_work_history"),eq(1L),eq(40L),eq(60L),eq("PAUSE"),eq("DOING"),eq("PAUSED"),eq(3L),eq(1L),eq("reason"),eq("{}"),eq(7L));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void completeBlockedUntilSelectedBuildScopeHasNoUnresolvedResults(){blockers=1;error("COMPLETION_BLOCKED",()->service.complete(1,"actor",60,command()));verify(db,never()).update(anyString(),any(Object[].class));blockers=0;service.complete(1,"actor",60,command());verify(db).update(contains("ended_at=UTC_TIMESTAMP(6)"),eq("COMPLETED"),eq(1L),eq(60L),eq(0L));verify(db,atLeastOnce()).rows(contains("l.attempt_id=a.id"),eq(50L),eq(50L),eq(1L),eq(40L));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void exactCompleteReplayIgnoresOriginalStateAndVersionsButDoesNotWrite(){state="COMPLETED";sessionVersion=9;groupVersion=10;replay("COMPLETE");assertEquals("COMPLETED",service.complete(1,"actor",60,command()).get("state"));verify(db,never()).update(anyString(),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void pmCanCancelWhenExecutorAndAllResourcesAreRevoked(){role="PM";global="PM";executor=99;assignee=99;recipient=99;returned=true;condition="RETIRED";cycle="CLOSED";approved=false;active=false;service.cancel(1,"actor",60,command());verify(db,never()).row(contains("condition_code AS conditionCode"),any(Object[].class));verify(db).row(eq("SELECT id FROM device_assets WHERE id=? FOR UPDATE"),eq(80L));verify(db).update(contains("UPDATE file_work_sessions"),eq("CANCELLED"),eq(1L),eq(60L),eq(0L));}
    @Test void currentGlobalDevCannotCancelEvenWithPmMembership(){role="PM";global="DEV";error("FORBIDDEN",()->service.cancel(1,"actor",60,command()));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void archivedPinnedBuildStillRejectsStartResumeAndCanonicalRecording(){
        archivedBuild=true;
        error("SESSION_CONTEXT_MISMATCH",()->service.start(1,"actor",40,start()));
        state="PAUSED";error("SESSION_CONTEXT_MISMATCH",()->service.resume(1,"actor",60,command()));
        state="DOING";error("SESSION_CONTEXT_MISMATCH",()->guard.fileAttempt(1,"actor",40,100,60,50,0L));
        assertEquals(false,service.capabilities(1,new FileWorkGuard.Actor(7,false,true,false),group(),session()).get("canRecord"));
        verify(db,never()).insert(anyString(),any(Object[].class));verify(db,never()).update(anyString(),any(Object[].class));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void archivedPinnedBuildKeepsDoingAndPausedCancelExclusiveToCurrentPm(){
        archivedBuild=true;
        for(String blocked:List.of("DOING","PAUSED")) {
            state=blocked;role="TESTER";global="TESTER";error("FORBIDDEN",()->service.cancel(1,"actor",60,command()));
            role="PM";global="DEV";error("FORBIDDEN",()->service.cancel(1,"actor",60,command()));
            global="PM";assertEquals(true,service.capabilities(1,new FileWorkGuard.Actor(7,true,false,false),group(),session()).get("canCancel"));
            service.cancel(1,"actor",60,command());
        }
        verify(db,times(2)).update(contains("UPDATE file_work_sessions"),eq("CANCELLED"),eq(1L),eq(60L),eq(0L));
        verify(db,never()).row(contains("FROM builds"),any(Object[].class));
    }
    @Test void wrongExecutorCurrentAssignmentAndReturnedPinBlockActions(){executor=8;error("NOT_SESSION_EXECUTOR",()->service.pause(1,"actor",60,command()));executor=7;assignee=8;error("NOT_ASSIGNED",()->service.resume(1,"actor",60,command()));assignee=7;recipient=8;error("ALLOCATION_INACTIVE",()->service.complete(1,"actor",60,command()));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void staleSessionOrGroupVersionCannotWrite(){sessionVersion=1;error("VERSION_CONFLICT",()->service.pause(1,"actor",60,command()));sessionVersion=0;groupVersion=3;error("VERSION_CONFLICT",()->service.pause(1,"actor",60,command()));verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void differentActionActorOrBodyCannotReuseKey(){replay("PAUSE");error("IDEMPOTENCY_CONFLICT",()->service.resume(1,"actor",60,command()));commands.clear();replay("COMPLETE");when(db.checksum(any())).thenReturn("other");error("IDEMPOTENCY_CONFLICT",()->service.complete(1,"actor",60,command()));}
    @Test void fileAttemptRequiresDoingSameGroupRunBuildVersionAndScope(){var c=guard.fileAttempt(1,"actor",40,100,60,50,0L);assertEquals(100L,c.runs().getFirst().get("runItemId"));error("SESSION_CONTEXT_MISMATCH",()->guard.fileAttempt(1,"actor",41,100,60,50,0L));error("NOT_FOUND",()->guard.fileAttempt(1,"actor",40,999,60,50,0L));error("SESSION_CONTEXT_MISMATCH",()->guard.fileAttempt(1,"actor",40,100,60,51,0L));error("VERSION_CONFLICT",()->guard.fileAttempt(1,"actor",40,100,60,50,1L));state="PAUSED";error("SESSION_NOT_DOING",()->guard.fileAttempt(1,"actor",40,100,60,50,0L));state="DOING";excluded=true;error("RUN_EXCLUDED",()->guard.fileAttempt(1,"actor",40,100,60,50,0L));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void identityAndProjectLockPrecedeAllGroupReads(){guard.execution(1,"actor",60);var order=inOrder(identity,db);order.verify(identity).lockCurrent("actor");order.verify(db).row(contains("FROM projects"),eq(1L));order.verify(db).row(contains("FROM project_memberships"),eq(1L),eq("actor"));order.verify(db).row(contains("FROM file_work_sessions"),eq(1L),eq(60L));order.verify(db).row(contains("FROM file_work_groups"),eq(1L),eq(40L));order.verify(db).rows(contains("ORDER BY r.id FOR UPDATE"),eq(1L),eq(40L));}
    @Test void historicalCompletedSessionCannotAdvertiseStartWhileAnotherSessionPaused(){state="COMPLETED";open.add(Map.of("id",61L,"state","PAUSED"));var caps=service.capabilities(1,new FileWorkGuard.Actor(7,false,true,false),group(),session());assertEquals(false,caps.get("canStart"));}
    @Test void pmHistoricalSessionCannotAssignWhileAnotherSessionDoing(){pmHistoricalAssignmentBlocked("DOING");}
    @Test void pmHistoricalSessionCannotAssignWhileAnotherSessionPaused(){pmHistoricalAssignmentBlocked("PAUSED");}
    private void pmHistoricalAssignmentBlocked(String currentState){
        var caller=new FileWorkGuard.Actor(7,true,false,false);open.add(Map.of("id",61L,"state",currentState));
        for(String historical:List.of("COMPLETED","CANCELLED")){state=historical;var caps=service.capabilities(1,caller,group(),session());assertEquals(false,caps.get("canAssign"),historical+" history must respect current "+currentState);assertEquals(false,caps.get("canCancel"),"Terminal history cannot be cancelled");}
        state=currentState;var currentCaps=service.capabilities(1,caller,group(),session());assertEquals(true,currentCaps.get("canCancel"));assertEquals(false,currentCaps.get("canAssign"));
    }
    @Test void pmHistoricalSessionCanAssignWhenNoSessionRemainsOpen(){
        var caller=new FileWorkGuard.Actor(7,true,false,false);
        for(String historical:List.of("COMPLETED","CANCELLED")){state=historical;var caps=service.capabilities(1,caller,group(),session());assertEquals(true,caps.get("canAssign"));assertEquals(false,caps.get("canCancel"));}
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void nextStartHistoryPreservesPreviousTerminalProjection(){prior.add(Map.of("id",59L,"state","CANCELLED"));service.start(1,"actor",40,start());verify(db).update(contains("INSERT INTO file_work_history"),eq(1L),eq(40L),eq(60L),eq("START"),eq("CANCELLED"),eq("DOING"),eq(3L),eq(0L),eq(""),eq("{}"),eq(7L));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void exactStartReplayStillWorksWithStaleGroupVersionAndDoesNotInsert(){replay("START");groupVersion=9;assertEquals(60,service.start(1,"actor",40,start()).get("id"));verify(db,never()).insert(anyString(),any(Object[].class));verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void snapshotIncludesServerPinsAndDoesNotMutateCurrentCatalogRows(){var snapshot=guard.usable(1,new FileWorkGuard.Actor(7,false,true,false),group(),guard.runs(1,40),70,50,80L);assertEquals(40L,snapshot.get("groupId"));assertEquals(List.of(101L),snapshot.get("revisionIds"));assertEquals(80L,((Map<?,?>)snapshot.get("physicalAsset")).get("id"));assertEquals(7L,((Map<?,?>)snapshot.get("executor")).get("membershipId"));assertEquals(70L,((Map<?,?>)snapshot.get("allocation")).get("id"));assertEquals(50L,((Map<?,?>)snapshot.get("build")).get("id"));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void completionVerdictPolicyUsesCanonicalNaAndExactAttemptBugLink(){
        for(String result:List.of("NOT_RUN","P","NG")){when(db.rows(startsWith("SELECT COALESCE(sd.excluded"),any(Object[].class))).thenReturn(List.of(Map.of("excluded",false,"resultCode",result,"bugLinked",false)));assertFalse(guard.completionReady(1,40,50));}
        when(db.rows(startsWith("SELECT COALESCE(sd.excluded"),any(Object[].class))).thenReturn(List.of(Map.of("excluded",false,"resultCode","NG","bugLinked",true),Map.of("excluded",true,"resultCode","NOT_RUN","bugLinked",false),Map.of("excluded",false,"resultCode","OK","bugLinked",false)));
        assertTrue(guard.completionReady(1,40,50));
        when(db.rows(startsWith("SELECT COALESCE(sd.excluded"),any(Object[].class))).thenReturn(List.of(Map.of("excluded",true,"resultCode","P","bugLinked",false)));
        assertTrue(guard.completionReady(1,40,50));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void resumeUsesOriginalPinsAndWritesDoingWithoutChangingContext(){state="PAUSED";service.resume(1,"actor",60,command());verify(db,atLeastOnce()).row(contains("FROM device_allocations WHERE project_id=? AND id=? FOR UPDATE"),eq(1L),eq(70L));verify(db,atLeastOnce()).row(contains("FROM device_assets WHERE id=? FOR UPDATE"),eq(80L));verify(db).update(contains("UPDATE file_work_sessions SET state=?"),eq("DOING"),eq(1L),eq(60L),eq(0L));verify(db,never()).update(contains("SET context_snapshot"),any(Object[].class));}
    @Test void frozenCycleArchivedProjectAndInactiveCatalogBlockTesterActions(){cycle="CLOSED";error("CYCLE_NOT_ACTIVE",()->service.start(1,"actor",40,start()));cycle="ACTIVE";archived=true;error("ARCHIVED",()->service.pause(1,"actor",60,command()));archived=false;active=false;error("SESSION_CONTEXT_MISMATCH",()->service.resume(1,"actor",60,command()));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void mixedCanonicalRunAssignmentsBlockExecution(){when(db.rows(contains("ORDER BY r.id FOR UPDATE"),any(Object[].class))).thenReturn(List.of(Map.of("assigneeMembershipId",7L),Map.of("assigneeMembershipId",8L)));error("ASSIGNMENT_MIXED",()->service.start(1,"actor",40,start()));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void staleLoginSessionRejectedBeforeAnyProjectRead(){var principal=new SessionPrincipal("actor",0L);org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(principal,null,List.of()));try{error("UNAUTHENTICATED",()->service.start(1,"actor",40,start()));verify(db,never()).row(contains("FROM projects"),any(Object[].class));}finally{org.springframework.security.core.context.SecurityContextHolder.clearContext();}}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void cancellationReplayStillRequiresCurrentPmAndReason(){role="PM";global="PM";state="CANCELLED";replay("CANCEL");assertEquals(60,service.cancel(1,"actor",60,command()).get("id"));verify(db,never()).update(anyString(),any(Object[].class));role="TESTER";error("FORBIDDEN",()->service.cancel(1,"actor",60,command()));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void generatedUniqueConstraintsTranslateToSafeConflicts(){when(db.insert(contains("INSERT INTO file_work_sessions"),any(Object[].class))).thenThrow(new org.springframework.dao.DuplicateKeyException("uq_fw_session_asset_doing"));error("ASSET_BUSY",()->service.start(1,"actor",40,start()));when(db.insert(contains("INSERT INTO file_work_sessions"),any(Object[].class))).thenThrow(new org.springframework.dao.DuplicateKeyException("uq_fw_session_group_doing"));error("SESSION_OPEN",()->service.start(1,"actor",40,start()));verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void compatibilityEnforcesTypeOsModelAndVersionWithoutDisplayNameInference(){
        var logical=new HashMap<String,Object>(Map.of("osName","iPadOS","model","M","osVersion","18"));var physical=new HashMap<String,Object>(Map.of("type","IPAD","osName","iOS","model","M","osVersion","18"));var build=Map.<String,Object>of("platform","iOS");
        for(String field:List.of("type","osName","model","osVersion")){var mismatch=new HashMap<>(physical);mismatch.put(field,switch(field){case "type"->"IPHONE";case "osName"->"Android";default->"different";});error("DEVICE_INCOMPATIBLE",()->FileWorkGuard.compatible(logical,mismatch,build));}
        for(String missing:List.of("","Other")){logical.put("osName",missing);logical.put("name","iPad iOS");error("DEVICE_COMPATIBILITY_UNKNOWN",()->FileWorkGuard.compatible(logical,physical,build));}
        logical.put("osName","iOS");physical.put("type","IPHONE");assertDoesNotThrow(()->FileWorkGuard.compatible(logical,physical,build));
        logical.put("osName","Android");logical.put("model","");logical.put("osVersion","");physical.put("type","ANDROID");physical.put("osName","Android");assertDoesNotThrow(()->FileWorkGuard.compatible(logical,physical,Map.of("platform","Android")));
    }
    @Test void pinnedSnapshotNamesAndCapabilityReflectCurrentBlockers(){blockers=1;var value=service.read(1,new FileWorkGuard.Actor(7,false,true,false),group(),session());assertEquals("Pinned",value.get("executorName"));assertEquals("PIN",value.get("assetCode"));assertEquals(false,((Map<?,?>)value.get("capabilities")).get("canComplete"));assertEquals(true,((Map<?,?>)value.get("capabilities")).get("canRecord"));returned=true;assertEquals(false,service.capabilities(1,new FileWorkGuard.Actor(7,false,true,false),group(),session()).get("canRecord"));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void eligibleAllocationsUseCurrentRecipientAndSkipBusyMachines(){assertEquals(1,service.eligible(1,"actor",40).size());busy.add(Map.of("id",61L));assertTrue(service.eligible(1,"actor",40).isEmpty());verify(db,atLeastOnce()).rows(contains("al.recipient_membership_id=? AND al.returned_at IS NULL"),eq(1L),eq(7L));}
    @Test void controllerStartReturns201AndSessionLocation(){var mocked=mock(FileWorkSessionService.class);when(mocked.start(eq(1L),eq("actor"),eq(40L),any())).thenReturn(Map.of("id",60L));var auth=org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal("actor",0L),null,List.of());var response=new FileWorkSessionController(mocked).start(auth,1,40,start());assertEquals(201,response.getStatusCode().value());assertEquals("/api/v1/projects/1/file-work-sessions/60",java.util.Objects.requireNonNull(response.getHeaders().getLocation(),"Created response must include Location").toString());}
    @Test void compatibilityRequiresExplicitOsAndBuildPlatform() {
        var device=Map.<String,Object>of("osName","iPadOS","model","iPad Pro","osVersion","18");
        var asset=Map.<String,Object>of("type","IPAD","osName","iOS","model"," ipad pro ","osVersion","18");
        assertDoesNotThrow(()->FileWorkGuard.compatible(device,asset,Map.of("platform"," iOS ")));
        assertEquals("DEVICE_COMPATIBILITY_UNKNOWN",assertThrows(BusinessException.class,()->FileWorkGuard.compatible(device,asset,Map.of("platform","unknown"))).code());
        assertEquals("DEVICE_INCOMPATIBLE",assertThrows(BusinessException.class,()->FileWorkGuard.compatible(device,asset,Map.of("platform","Android"))).code());
    }
}
