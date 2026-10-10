package vn.syp.tms.filework;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.syp.tms.execution.ExecutionService;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class FileWorkServiceTest {
    final WorkItemStore db=mock(WorkItemStore.class);
    final IdentityService identity=mock(IdentityService.class);
    final ExecutionService execution=mock(ExecutionService.class);
    final ProjectAudit audit=mock(ProjectAudit.class);
    final FileWorkSessionService sessionService=mock(FileWorkSessionService.class);
    final FileWorkService service=new FileWorkService(db,identity,execution,audit,new ObjectMapper().findAndRegisterModules(),sessionService);
    String global="PM",role="PM",documentState="COMMITTED",cycleState="DRAFT";
    long cycleVersion=3,runCount=0;
    List<Map<String,Object>> sources=new ArrayList<>(),runs=new ArrayList<>(),sessions=new ArrayList<>(),commands=new ArrayList<>();
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @BeforeEach void setup() {
        when(sessionService.capabilities(anyLong(),any(),any(),any())).thenReturn(Map.of("canStart",false,"canExport",true));
        var account=mock(IdentityUserRepository.CurrentAccount.class);
        when(account.getRole()).thenAnswer(i->global);
        when(identity.lockCurrent("actor")).thenReturn(account);
        when(db.row(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);
            if(sql.contains("FROM projects"))return new HashMap<>(Map.of("id",1L));
            if(sql.contains("FROM project_memberships"))return new HashMap<>(Map.of("id",7L,"projectRole",role));
            if(sql.contains("FROM import_batches"))return Map.of("id",10L,"status",documentState);
            if(sql.contains("FROM test_cycles"))return Map.of("id",20L,"statusCode",cycleState,"version",cycleVersion);
            if(sql.contains("FROM cycle_configurations"))return Map.of("id",30L);
            if(sql.contains("FROM file_work_groups"))return new HashMap<>(Map.of("id",40L,"documentId",10L,"cycleId",20L,"configurationId",30L,"version",2L,"defaultBuildId",50L,"cycleVersion",3L,"cycleStatus","ACTIVE"));
            return Map.of("id",8L);
        });
        when(db.rows(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);
            if(sql.contains("FROM test_case_revisions"))return sources;
            if(sql.contains("FROM file_work_commands"))return commands;
            if(sql.contains("FROM file_work_group_items"))return runs;
            if(sql.contains("FROM file_work_sessions"))return sessions;
            return List.of();
        });
        when(db.count(anyString(),any(Object[].class))).thenAnswer(i->((String)i.getArgument(0)).contains("FROM run_items")?runCount:0L);
        when(db.checksum(any())).thenReturn("checksum");
        when(db.encode(any())).thenReturn("{}");
        sources.add(source(1,101,true));
    }
    Map<String,Object> source(long revision,long c,boolean approved){return new HashMap<>(Map.of("importRowId",revision+1000,"rowNumber",revision,"testCaseId",c,"revisionId",revision,"caseNo","TC"+c,"approved",approved));}
    FileWorkDtos.Scope scope(List<Long> ids){return new FileWorkDtos.Scope(10L,20L,30L,ids,8L,3L);}
    @SuppressWarnings("unchecked") List<Map<String,Object>> errors(Map<String,Object> result){return (List<Map<String,Object>>)result.get("errors");}
    void error(String code,Runnable action){assertEquals(code,assertThrows(BusinessException.class,action::run).code());}
    Map<String,Object> metadata() {return service.metadata(1,"actor");}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void emptyPmListReceivesServerCreateCapabilityWithoutLoadingGroupsOrBlob(){
        var result=metadata();assertEquals(Map.of("canCreate",true,"canViewMine",false,"canReadAll",true,"membershipId",7L,"archived",false),result);
        var order=inOrder(identity,db);order.verify(identity).lockCurrent("actor");order.verify(db).row(contains("FROM projects"),eq(1L));order.verify(db).row(contains("FROM project_memberships"),eq(1L),eq("actor"));
        verify(db,never()).rows(anyString(),any(Object[].class));verify(db,never()).count(anyString(),any(Object[].class));verifyNoInteractions(execution,sessionService,audit);
    }
    @Test void testerMetadataProvidesMineAndReadAllWithoutPmCreate(){global="TESTER";role="TESTER";var result=metadata();assertEquals(false,result.get("canCreate"));assertEquals(true,result.get("canViewMine"));assertEquals(true,result.get("canReadAll"));}
    @Test void effectiveGlobalDevCannotReceiveCreateOrMineFromStalePmTesterMembership(){global="DEV";for(String stale:List.of("PM","TESTER")){role=stale;var result=metadata();assertEquals(false,result.get("canCreate"));assertEquals(false,result.get("canViewMine"));assertEquals(true,result.get("canReadAll"));}}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void archivedProjectMetadataBlocksCreateButKeepsMemberReadPolicy(){when(db.row(contains("FROM projects"),any(Object[].class))).thenReturn(Map.of("id",1L,"archivedAt","date"));var result=metadata();assertEquals(true,result.get("archived"));assertEquals(false,result.get("canCreate"));assertEquals(true,result.get("canReadAll"));}
    @Test void metadataRequiresCurrentEnabledIdentityBeforeProjectRead(){when(identity.lockCurrent("actor")).thenThrow(new BusinessException(401,"UNAUTHENTICATED","Disabled"));error("UNAUTHENTICATED",this::metadata);verifyNoInteractions(db,execution,sessionService,audit);}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void metadataRejectsRevokedMembership(){when(db.row(contains("FROM project_memberships"),any(Object[].class))).thenThrow(new BusinessException(404,"NOT_FOUND","Revoked"));error("NOT_FOUND",this::metadata);}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void metadataRejectsStaleSessionBeforeProjectRead(){
        var principal=new SessionPrincipal("actor",1L);org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(principal,null,List.of()));
        when(db.row(contains("lock_version AS version FROM identity_users"),eq("actor"))).thenReturn(Map.of("version",2L));
        try{error("UNAUTHENTICATED",this::metadata);verify(db,never()).row(contains("FROM projects"),any(Object[].class));}finally{org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    }
    @Test void metadataControllerHasStaticRouteAndUsesServerActor() throws Exception {
        var mocked=mock(FileWorkService.class);var result=Map.<String,Object>of("canCreate",true,"membershipId",7L);when(mocked.metadata(1,"actor")).thenReturn(result);
        var auth=org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal("actor",0L),null,List.of());
        assertEquals(result,new FileWorkController(mocked).metadata(auth,1));verify(mocked).metadata(1,"actor");
        var route=FileWorkController.class.getMethod("metadata",org.springframework.security.core.Authentication.class,long.class).getAnnotation(org.springframework.web.bind.annotation.GetMapping.class);assertArrayEquals(new String[]{"/metadata"},route.value());
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void previewValidExactSourcePinsWithoutWrites(){var r=service.preview(1,"actor",scope(List.of(1L)));assertEquals(true,r.get("valid"));assertEquals(1,r.get("selectedCount"));verify(db,never()).update(anyString(),any(Object[].class));verifyNoInteractions(execution);}
    @Test void previewReportsUnapproved(){sources.getFirst().put("approved",false);assertEquals("REVISION_NOT_APPROVED",errors(service.preview(1,"actor",scope(List.of(1L)))).getFirst().get("code"));}
    @Test void previewReportsDuplicateSourceCase(){sources.add(source(2,101,true));assertTrue(errors(service.preview(1,"actor",scope(List.of(1L,2L)))).stream().anyMatch(e->"INVALID_SCOPE".equals(e.get("code"))));}
    @Test void previewCannotReuseExistingRun(){sources.getFirst().put("existingRunItemId",99L);assertEquals("DUPLICATE_SCOPE",errors(service.preview(1,"actor",scope(List.of(1L)))).getFirst().get("code"));}
    @Test void previewBoundsWholeCycleBeforeChunking(){runCount=500;assertEquals("SCOPE_LIMIT",errors(service.preview(1,"actor",scope(List.of(1L)))).getFirst().get("code"));}
    @Test void adminMemberDoesNotReceivePmCommandPower(){global="ADMIN";role="MEMBER";error("FORBIDDEN",()->service.preview(1,"actor",scope(List.of(1L))));verifyNoInteractions(execution);}
    @Test void globalDevWithPmMembershipCannotPreview(){global="DEV";error("FORBIDDEN",()->service.preview(1,"actor",scope(List.of(1L))));}
    @Test void invalidPageRejected(){error("INVALID_PAGE",()->service.list(1,"actor",new FileWorkDtos.Filter(-1,101,false,null,null,null,null,null,null)));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void monitoringProjectionJoinsSameProjectMilestoneAndSavedActivityWithoutChangingBuildMetrics(){
        var projection=new HashMap<>(service.group(1,40,false));
        projection.put("milestoneId",6L);projection.put("milestoneName","Release");projection.put("milestoneDueOn","2026-10-06");
        projection.put("updatedAt",java.time.Instant.parse("2026-10-05T00:00:00Z"));projection.put("latestActivityAt",java.time.Instant.parse("2026-10-06T02:00:00Z"));
        when(db.row(contains("FROM file_work_groups"),eq(1L),eq(40L))).thenReturn(projection);
        sessions.add(new HashMap<>(Map.of("id",60L,"state","DOING","buildId",51L,"startedAt",java.time.Instant.parse("2026-10-06T00:00:00Z"))));
        var value=service.executionSummary(1,"actor",40,50);
        assertEquals("2026-10-06",value.get("milestoneDueOn"));assertEquals(6L,value.get("milestoneId"));assertEquals("Release",value.get("milestoneName"));
        assertEquals(projection.get("latestActivityAt"),value.get("latestActivityAt"));assertEquals(projection.get("updatedAt"),value.get("updatedAt"));
        assertEquals(sessions.getFirst().get("startedAt"),value.get("startedAt"));assertEquals(50L,value.get("selectedBuildId"));
        assertNull(((Map<?,?>)value.get("counts")).get("executionRate"));assertNull(((Map<?,?>)value.get("counts")).get("passRate"));
        verify(db,atLeastOnce()).row(argThat(sql->sql.contains("LEFT JOIN milestones ms ON ms.project_id=c.project_id AND ms.id=c.milestone_id") && sql.contains("DATE_FORMAT(ms.due_on,'%Y-%m-%d') AS milestoneDueOn") && sql.contains("MAX(a.executed_at)") && sql.contains("MAX(s.last_transition_at)") && sql.contains("GREATEST(g.updated_at") && sql.contains("AS latestActivityAt")),eq(1L),eq(40L));
        verify(db).rows(contains("a.build_id=?"),eq(50L),eq(50L),eq(1L),eq(40L));
    }
    FileWorkDtos.Create create(){return new FileWorkDtos.Create(10L,20L,30L,sources.stream().map(s->((Number)s.get("revisionId")).longValue()).toList(),8L,3L,"create_key");}
    Map<String,Object> item(long id,long assignee,long version){return new HashMap<>(Map.of("runItemId",id,"assigneeMembershipId",assignee,"assigneeName","Tester "+assignee,"runVersion",version));}
    FileWorkDtos.Assignment assignment(List<FileWorkDtos.RunVersion> versions){return new FileWorkDtos.Assignment(8L," Transfer ",2L,versions,"assign_key");}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    void writable(){when(db.update(anyString(),any(Object[].class))).thenReturn(1);when(db.insert(anyString(),any(Object[].class))).thenReturn(40L);}
    void command(String action,long group,long actor){commands.add(Map.of("action",action,"groupId",group,"actorMembershipId",actor,"checksum","checksum","response","{\"group\":{\"id\":40},\"items\":[],\"sessions\":[]}"));}
    @Test void previewRejectsUncommittedDocumentAndFrozenCycle(){documentState="PREVIEW";cycleState="ACTIVE";var codes=errors(service.preview(1,"actor",scope(List.of(1L)))).stream().map(e->e.get("code")).toList();assertEquals(List.of("INVALID_SCOPE","INVALID_SCOPE"),codes);}
    @Test void replayStillRejectsUncommittedDocument(){documentState="PREVIEW";command("CREATE",40,7);error("INVALID_SCOPE",()->service.create(1,"actor",create()));}
    @Test void missingSourceAndDuplicateRevisionAreRejected(){assertFalse((Boolean)service.preview(1,"actor",scope(List.of(2L))).get("valid"));assertFalse((Boolean)service.preview(1,"actor",scope(List.of(1L,1L))).get("valid"));}
    @Test void revisionLimitRejects501BeforeWrites(){error("SCOPE_LIMIT",()->service.preview(1,"actor",scope(java.util.stream.LongStream.rangeClosed(1,501).boxed().toList())));verifyNoInteractions(execution);}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void fiveBoundedChunksAdvanceCycleVersionAndKeepExactPins(){
        sources.clear();for(long n=1;n<=500;n++)sources.add(source(n,n+100,true));writable();
        when(execution.addScope(eq(1L),eq("actor"),eq(20L),any())).thenAnswer(i->Map.of("version",((vn.syp.tms.execution.ExecutionDtos.AddScope)i.getArgument(3)).expectedVersion()+1));
        service.create(1,"actor",create());
        var chunks=org.mockito.ArgumentCaptor.forClass(vn.syp.tms.execution.ExecutionDtos.AddScope.class);verify(execution,times(5)).addScope(eq(1L),eq("actor"),eq(20L),chunks.capture());
        assertEquals(List.of(3L,4L,5L,6L,7L),chunks.getAllValues().stream().map(scope -> Objects.requireNonNull(scope).expectedVersion()).toList());
        assertEquals(List.of(100,100,100,100,100),chunks.getAllValues().stream().map(c->c.revisionIds().size()).toList());
        verify(db).update(contains("INSERT INTO file_work_group_items"),eq(1L),eq(40L),eq(10L),eq(20L),eq(30L),eq(1001L),eq(8L),eq(101L),eq(1L));
        verify(db,times(500)).update(contains("INSERT INTO file_work_group_items"),any(Object[].class));
    }
    @Test void newCreateChecksVersionAndNeverAddsPartialScope(){cycleVersion=4;error("VERSION_CONFLICT",()->service.create(1,"actor",create()));verifyNoInteractions(execution);}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void createReplayReturnsOriginalDespiteStaleVersion(){command("CREATE",40,7);cycleVersion=9;cycleState="ACTIVE";assertEquals(40,((Map<?,?>)service.create(1,"actor",create()).get("group")).get("id"));verifyNoInteractions(execution);verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void reusedKeyDifferentActorActionOrChecksumConflicts(){command("ASSIGN",40,7);error("IDEMPOTENCY_CONFLICT",()->service.create(1,"actor",create()));commands.clear();command("CREATE",40,8);error("IDEMPOTENCY_CONFLICT",()->service.create(1,"actor",create()));commands.clear();command("CREATE",40,7);when(db.checksum(any())).thenReturn("different");error("IDEMPOTENCY_CONFLICT",()->service.create(1,"actor",create()));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void revokedPmCannotReplaySuccessfulCreate(){command("CREATE",40,7);role="TESTER";error("FORBIDDEN",()->service.create(1,"actor",create()));verify(db,never()).rows(contains("FROM file_work_commands"),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void authorizationLocksBeforeConsistentReads(){service.preview(1,"actor",scope(List.of(1L)));var order=inOrder(identity,db);order.verify(identity).lockCurrent("actor");order.verify(db).row(contains("FROM projects"),eq(1L));order.verify(db).row(contains("user_id=? AND active=TRUE FOR UPDATE"),eq(1L),eq("actor"));order.verify(db).row(contains("FROM import_batches"),eq(1L),eq(10L));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void assigneeMustBeCurrentEnabledProjectTesterNotGlobalDev(){service.preview(1,"actor",scope(List.of(1L)));verify(db).row(contains("m.project_role='TESTER' AND u.enabled=TRUE AND u.role_code<>'DEV' FOR SHARE"),eq(1L),eq(8L));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void wrongProjectDocumentCannotBeSubstituted(){when(db.row(contains("FROM import_batches"),eq(2L),eq(10L))).thenThrow(new BusinessException(404,"NOT_FOUND","missing"));error("NOT_FOUND",()->service.preview(2,"actor",scope(List.of(1L))));verifyNoInteractions(execution);}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void mineUsesServerMembershipAndConsistentAssignmentPredicate(){service.list(1,"actor",new FileWorkDtos.Filter(0,20,true,null,null,null,null,null,"_%"));verify(db).rows(contains("NOT EXISTS"),eq(1L),eq("_%"),eq(7L),eq(20),eq(0L));verify(db).count(contains("LOCATE(?,ib.file_name)"),eq(1L),eq("_%"),eq(7L));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void mixedAssignmentsAreProjectionAndDoNotChangeCanonicalRuns(){runs.add(item(100,8,1));runs.add(item(101,9,2));var detail=service.detail(1,"actor",40);var group=(Map<?,?>)detail.get("group");assertEquals("MIXED",group.get("assignmentState"));assertNull(group.get("assigneeMembershipId"));verify(db,never()).update(anyString(),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void selectedBuildCountersNeverUseLatestOtherBuild(){runs.add(item(100,8,1));service.detail(1,"actor",40);verify(db).rows(contains("a.build_id=?"),eq(50L),eq(50L),eq(1L),eq(40L));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void assignmentRequiresAllUniqueRunVersionsBeforeWrites(){runs.add(item(100,8,1));runs.add(item(101,9,2));error("INVALID_SCOPE",()->service.assign(1,"actor",40,assignment(List.of(new FileWorkDtos.RunVersion(100L,1L)))));error("INVALID_SCOPE",()->service.assign(1,"actor",40,assignment(List.of(new FileWorkDtos.RunVersion(100L,1L),new FileWorkDtos.RunVersion(100L,1L)))));verify(db,never()).update(anyString(),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void staleRunAndForeignRunRejectedBeforeAssignment(){runs.add(item(100,8,1));error("VERSION_CONFLICT",()->service.assign(1,"actor",40,assignment(List.of(new FileWorkDtos.RunVersion(100L,0L)))));error("INVALID_SCOPE",()->service.assign(1,"actor",40,assignment(List.of(new FileWorkDtos.RunVersion(999L,1L)))));verify(db,never()).update(anyString(),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void doingAndPausedBlockReassignment(){runs.add(item(100,8,1));for(String state:List.of("DOING","PAUSED")){sessions.clear();sessions.add(new HashMap<>(Map.of("id",60L,"state",state,"buildId",50L)));error("SESSION_OPEN",()->service.assign(1,"actor",40,assignment(List.of(new FileWorkDtos.RunVersion(100L,1L)))));}verify(db,never()).update(anyString(),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void assignmentBumpsEveryRunOnceAndGroupOnceWithHistory(){writable();runs.add(item(101,9,2));runs.add(item(100,8,1));service.assign(1,"actor",40,assignment(List.of(new FileWorkDtos.RunVersion(100L,1L),new FileWorkDtos.RunVersion(101L,2L))));verify(db,times(2)).update(contains("UPDATE run_items"),any(Object[].class));verify(db).update(contains("UPDATE file_work_groups"),eq(7L),eq(1L),eq(40L),eq(2L));verify(db).update(contains("INSERT INTO file_work_history"),eq(1L),eq(40L),eq("ASSIGN"),eq(3L),eq("Transfer"),eq("{}"),eq(7L));verify(db).update(contains("INSERT INTO file_work_commands"),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void sameAssigneeRepairStillBumpsVersionAndKeepsHistory(){writable();runs.add(item(100,8,1));service.assign(1,"actor",40,assignment(List.of(new FileWorkDtos.RunVersion(100L,1L))));verify(db).update(contains("INSERT INTO run_item_assignments"),eq(1L),eq(100L),eq(8L),eq(8L),eq(7L),eq("Transfer"));verify(db).update(contains("UPDATE run_items"),eq(8L),eq(1L),eq(100L),eq(1L));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void exactAssignmentReplayDoesNotBumpAgain(){runs.add(item(100,8,7));command("ASSIGN",40,7);service.assign(1,"actor",40,assignment(List.of(new FileWorkDtos.RunVersion(100L,1L))));verify(db,never()).update(anyString(),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void historyPaginates50ParsesDetailsAndUsesLastIdCursor(){var events=new ArrayList<Map<String,Object>>();for(long n=100;n>=50;n--)events.add(new HashMap<>(Map.of("id",n,"details","{\"runItemId\":1}")));when(db.rows(contains("FROM file_work_history"),any(Object[].class))).thenReturn(events);var result=service.history(1,"actor",40,0);assertEquals(50,((List<?>)result.get("items")).size());assertEquals(51L,result.get("nextBefore"));assertTrue(((Map<?,?>)((List<?>)result.get("items")).getFirst()).get("details") instanceof Map);}
    @Test void sessionHistoricalNamesComeFromSnapshot(){sessions.add(new HashMap<>(Map.of("id",60L,"state","COMPLETED","buildId",51L,"assetCode","RENAMED","executorName","Current","contextSnapshot","{\"physicalAsset\":{\"assetCode\":\"PINNED\"},\"executor\":{\"displayName\":\"Original\"}}")));var result=service.detail(1,"actor",40);var session=(Map<?,?>)((List<?>)result.get("sessions")).getFirst();assertEquals("PINNED",session.get("assetCode"));assertEquals("Original",session.get("executorName"));assertEquals(51L,((Map<?,?>)result.get("group")).get("selectedBuildId"));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void expiredSessionVersionRejectedBeforeProjectRead(){
        var principal=new SessionPrincipal("actor",1L);
        var auth=org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(principal,null,List.of());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
        when(db.row(contains("lock_version AS version FROM identity_users"),eq("actor"))).thenReturn(Map.of("version",2L));
        try{error("UNAUTHENTICATED",()->service.preview(1,"actor",scope(List.of(1L))));verify(db,never()).row(contains("FROM projects"),any(Object[].class));}finally{org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    }
    @Test void controllerCreateReturns201AndGroupLocation(){var mocked=mock(FileWorkService.class);when(mocked.create(eq(1L),eq("actor"),any())).thenReturn(Map.of("group",Map.of("id",40L)));var auth=org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal("actor",0L),null,List.of());var response=new FileWorkController(mocked).create(auth,1,create());assertEquals(201,response.getStatusCode().value());assertEquals("/api/v1/projects/1/file-work-groups/40",java.util.Objects.requireNonNull(response.getHeaders().getLocation(),"Created response must include Location").toString());}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void callerCannotAssignWithBlankReason(){error("REASON_REQUIRED",()->service.assign(1,"actor",40,new FileWorkDtos.Assignment(8L,"  ",2L,List.of(new FileWorkDtos.RunVersion(100L,1L)),"assign_key")));verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void groupAndSessionCapabilitiesUseCurrentSessionServiceProjection(){
        when(sessionService.capabilities(anyLong(),any(),any(),any())).thenReturn(Map.of("canPause",true,"canRecord",true,"canExport",true));
        sessions.add(new HashMap<>(Map.of("id",60L,"state","DOING","buildId",50L)));
        var result=service.detail(1,"actor",40);
        assertEquals(true,((Map<?,?>)((Map<?,?>)result.get("group")).get("capabilities")).get("canRecord"));
        assertEquals(true,((Map<?,?>)((Map<?,?>)((List<?>)result.get("sessions")).getFirst()).get("capabilities")).get("canPause"));
    }
}
