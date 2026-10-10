package vn.syp.tms.qa;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import vn.syp.tms.filework.FileWorkGuard;
import vn.syp.tms.identity.IdentityUserRepository;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.retest.RetestService;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class HandoffServiceTest {
    WorkItemStore db=mock(WorkItemStore.class);
    FileWorkGuard identity=mock(FileWorkGuard.class);
    RetestService retest=mock(RetestService.class);
    QaService qa=new QaService(db,identity,mock(ProjectAudit.class),new ObjectMapper());
    HandoffService service=new HandoffService(db,qa,retest);
    List<Map<String,Object>> bugs=new ArrayList<>(),items=new ArrayList<>(),requests=new ArrayList<>();
    String global="PM",role="PM";
    boolean archived;
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @BeforeEach void setup() {
        var account=mock(IdentityUserRepository.CurrentAccount.class);
        when(account.getRole()).thenAnswer(i->global);
        when(identity.lockIdentity("user")).thenReturn(account);
        when(db.row(anyString(),any(Object[].class))).thenAnswer(i->{
            String sql=i.getArgument(0);
            if(sql.contains("FROM projects"))return map("id",1L,"archivedAt",archived?Instant.EPOCH:null);
            if(sql.contains("FROM project_memberships"))return map("id",7L,"projectRole",role);
            throw new AssertionError(sql);
        });
        when(db.rows(anyString(),any(Object[].class))).thenAnswer(i->{
            String sql=i.getArgument(0);
            if(sql.contains("/* handoff bugs */"))return bugs;
            if(sql.contains("/* handoff items */"))return items;
            if(sql.contains("/* handoff requests */"))return requests;
            throw new AssertionError(sql);
        });
        when(retest.summary(eq(1L),eq("user"),anyLong())).thenReturn(map("canClose",true));
        bugs.add(bug(10));
    }
    static Map<String,Object> map(Object...args){var m=new HashMap<String,Object>();for(int n=0;n<args.length;n+=2)m.put((String)args[n],args[n+1]);return m;}
    Map<String,Object> bug(long id){return map("workItemId",id,"type","BUG","key","TMS-"+id,"title","Bug "+id,"status","resolved","fixedBuildId",5L,"buildUsable",true,"roundNo",1L,"historyExists",false,"updatedAt",Instant.EPOCH);}
    Map<String,Object> b(){return bugs.getFirst();}
    void coverage(){b().putAll(map("coverageRevisionId",30L,"coverageRoundNo",1L,"coverageBuildId",5L,"historyExists",true));}
    Map<String,Object> item(long id){var row=map("workItemId",10L,"coverageRevisionId",30L,"coverageItemId",id,"runItemId",id+100,"excluded",false,"contextUsable",true,"assigneeMembershipId",8L,"environmentId",4L,"deviceId",6L);items.add(row);return row;}
    Map<String,Object> request(long id,long item,String status,String verdict){var row=map("workItemId",10L,"coverageRevisionId",30L,"roundNo",1L,"buildId",5L,"coverageItemId",item,"runItemId",item+100,"requestId",id,"status",status,"assigneeMembershipId",8L,"environmentId",4L,"deviceId",6L,"verificationId",verdict==null?null:id+1000,"verdict",verdict);requests.add(row);return row;}
    Map<String,Object> row(){return service.list(1,"user",0,20,null,null).items().getFirst();}
    void state(String expected){assertEquals(expected,row().get("state"));}
    void error(String code,Runnable fn){assertEquals(code,assertThrows(BusinessException.class,fn::run).code());}
    @Test void firstResolvedRoundOneWithoutHistoryPrepares(){state("PREPARE_RETEST");assertEquals(true,row().get("canPrepareRetest"));assertEquals(false,row().get("coverageConfirmed"));}
    @Test void legacyWithoutRetestStatePreparesSafely(){b().put("roundNo",null);state("PREPARE_RETEST");assertEquals(0L,row().get("roundNo"));}
    @Test void invalidatedHistoryRequiresRetry(){b().put("historyExists",true);state("RETRY_REQUIRED");assertEquals(0L,row().get("failCount"));}
    @Test void failedNonresolvedRoundCannotPrepare(){b().putAll(map("historyExists",true,"status","progress","fixedBuildId",null,"buildUsable",false));state("RETRY_REQUIRED");assertEquals(false,row().get("canPrepareRetest"));}
    @Test void ordinaryNonresolvedWithoutHistoryIsNotHandoff(){b().put("status","open");assertTrue(service.list(1,"user",0,20,null,null).items().isEmpty());}
    @ParameterizedTest @ValueSource(strings={"closed","wontfix","unreproducible"}) void terminalBugIsNotHandoff(String status){b().putAll(map("status",status,"historyExists",true));assertTrue(service.list(1,"user",0,20,null,null).items().isEmpty());}
    @Test void qaNeverParticipates(){b().put("type","QA");assertTrue(service.list(1,"user",0,20,null,null).items().isEmpty());verifyNoInteractions(retest);}
    @Test void coverageWithoutRequestsPrepares(){coverage();item(1);state("PREPARE_RETEST");assertEquals(true,row().get("coverageConfirmed"));}
    @Test void partialRequestPreparesBeforeVerifying(){coverage();item(1);item(2);request(80,1,"SUBMITTED","PASS");state("PREPARE_RETEST");}
    @Test void allPendingIsAssignedAndDedupeByItem(){coverage();item(1);item(2);request(80,1,"OPEN",null);request(81,1,"OPEN",null);request(82,2,"OPEN",null);state("ASSIGNED");assertEquals(2L,row().get("requestedCount"));assertEquals(2L,row().get("pendingCount"));assertEquals(List.of(82L,81L,80L),row().get("requestIds"));}
    @Test void partialPassWithPendingIsVerifying(){coverage();item(1);item(2);request(80,1,"SUBMITTED","PASS");request(81,2,"OPEN",null);state("VERIFYING");assertEquals(1L,row().get("passCount"));}
    @Test void allPassDelegatesClosureAuthority(){coverage();item(1);request(80,1,"SUBMITTED","PASS");state("READY_TO_CLOSE");assertEquals(true,row().get("canClose"));verify(retest,times(2)).summary(1,"user",10);}
    @Test void closureAuthorityCanVetoAllPass(){coverage();item(1);request(80,1,"SUBMITTED","PASS");when(retest.summary(1,"user",10)).thenReturn(map("canClose",false));state("VERIFYING");assertEquals(false,row().get("canClose"));}
    @Test void currentFailWinsOverMissingRequest(){coverage();item(1);item(2);request(80,1,"SUBMITTED","FAIL");state("RETRY_REQUIRED");assertEquals(1L,row().get("failCount"));verifyNoInteractions(retest);}
    @Test void nonresolvedCurrentFailRemainsVisibleWithoutPreparation(){coverage();item(1);request(80,1,"SUBMITTED","FAIL");b().put("status","progress");state("RETRY_REQUIRED");assertEquals(false,row().get("canPrepareRetest"));}
    @Test void latestVerificationPerCurrentItemWins(){coverage();item(1);request(80,1,"SUBMITTED","FAIL");request(81,1,"SUBMITTED","PASS");request(82,1,"OPEN",null);state("READY_TO_CLOSE");assertEquals(1L,row().get("passCount"));assertEquals(0L,row().get("pendingCount"));assertEquals(0L,row().get("failCount"));}
    @Test void olderCoverageFailDoesNotPoisonNewValidCoverage(){coverage();item(1);request(80,1,"SUBMITTED","FAIL").put("coverageRevisionId",29L);request(81,1,"SUBMITTED","PASS");state("READY_TO_CLOSE");assertEquals(List.of(81L),row().get("requestIds"));}
    @ParameterizedTest @ValueSource(strings={"coverageRevisionId","roundNo","buildId","runItemId","environmentId","deviceId"}) void staleRequestDoesNotCount(String field){coverage();item(1);request(80,1,"SUBMITTED","PASS").put(field,999L);state("PREPARE_RETEST");assertEquals(0L,row().get("requestedCount"));assertEquals(List.of(),row().get("requestIds"));}
    @Test void cancelledResultsCannotSatisfyCoverage(){coverage();item(1);request(80,1,"CANCELLED","PASS");state("PREPARE_RETEST");}
    @Test void openRequestWithChangedAssigneeDoesNotCount(){coverage();item(1);request(80,1,"OPEN",null).put("assigneeMembershipId",99L);state("PREPARE_RETEST");}
    @Test void submittedResultSurvivesSubsequentReassignment(){coverage();item(1);request(80,1,"SUBMITTED","PASS").put("assigneeMembershipId",99L);state("READY_TO_CLOSE");}
    @ParameterizedTest @ValueSource(strings={"coverageRoundNo","coverageBuildId"}) void mismatchedCoverageInvalidates(String field){coverage();b().put(field,999L);item(1);request(80,1,"SUBMITTED","PASS");state("RETRY_REQUIRED");assertEquals(false,row().get("coverageConfirmed"));assertEquals(0L,row().get("applicableCount"));}
    @Test void excludedCoverageCannotSilentlyPermitClosure(){coverage();item(1).put("excluded",1);request(80,1,"SUBMITTED","PASS");state("RETRY_REQUIRED");assertEquals(0L,row().get("applicableCount"));assertEquals(false,row().get("canClose"));}
    @Test void archivedOrIneligibleRunRequiresNewCoverage(){coverage();item(1).put("contextUsable",false);request(80,1,"SUBMITTED","PASS");state("RETRY_REQUIRED");verifyNoInteractions(retest);}
    @Test void archivedBuildPreventsPreparation(){b().put("buildUsable",false);state("RETRY_REQUIRED");assertEquals(false,row().get("canPrepareRetest"));}
    @Test void archivedProjectAllowsReadButNoCapabilities(){archived=true;coverage();item(1);request(80,1,"SUBMITTED","PASS");var actual=row();assertEquals("READY_TO_CLOSE",actual.get("state"));assertEquals(false,actual.get("canPrepareRetest"));assertEquals(false,actual.get("canClose"));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @ParameterizedTest @ValueSource(strings={"TESTER","DEV","ADMIN"}) void strictCurrentProjectPmEvenWhenEmpty(String value){role=value;bugs.clear();error("FORBIDDEN",()->row());verify(db,never()).rows(anyString(),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void effectiveGlobalDevWithPmMembershipIsDenied(){global="DEV";error("FORBIDDEN",()->row());verify(db,never()).rows(anyString(),any(Object[].class));}
    @Test void disabledOrStaleIdentityStopsBeforeProjectRead(){doThrow(new BusinessException(401,"UNAUTHORIZED","invalid session")).when(identity).lockIdentity("user");error("UNAUTHORIZED",()->row());verifyNoInteractions(db);}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void wrongProjectStopsBeforeSourceRows(){doThrow(new BusinessException(404,"NOT_FOUND","project")).when(db).row(contains("FROM projects"),eq(1L));error("NOT_FOUND",()->row());verify(db,never()).rows(anyString(),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void revokedMembershipStopsBeforeSourceRows(){doThrow(new BusinessException(404,"NOT_FOUND","member")).when(db).row(contains("FROM project_memberships"),eq(1L),eq("user"));error("NOT_FOUND",()->row());verify(db,never()).rows(anyString(),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void identityAndProjectGuardPrecedeConsistentReads(){row();var order=inOrder(identity,db);order.verify(identity).lockIdentity("user");order.verify(db).row(contains("FROM projects"),eq(1L));order.verify(db).row(contains("FROM project_memberships"),eq(1L),eq("user"));order.verify(db).rows(contains("/* handoff bugs */"),eq(1L),eq(""),eq(""),eq(""));}
    @Test void stateFilterPrecedesPaginationAndCount(){bugs.add(bug(20));bugs.add(bug(30));bugs.add(bug(40));bugs.get(1).put("historyExists",true);bugs.get(3).put("historyExists",true);var page=service.list(1,"user",1,1,"RETRY_REQUIRED",null);assertEquals(2,page.totalItems());assertEquals(2,page.totalPages());assertEquals(20L,page.items().getFirst().get("workItemId"));assertEquals(1,page.page());assertEquals(1,page.size());}
    @Test void pageBeyondEndRetainsTrueTotal(){var page=service.list(1,"user",Integer.MAX_VALUE,100,null,null);assertEquals(1,page.totalItems());assertTrue(page.items().isEmpty());}
    @Test void invalidPageStateAndKeywordAreControlled(){error("INVALID_PAGE",()->service.list(1,"user",-1,20,null,null));error("INVALID_PAGE",()->service.list(1,"user",0,101,null,null));error("INVALID_PAGE",()->service.list(1,"user",0,0,null,null));error("INVALID_STATE",()->service.list(1,"user",0,20,"bogus",null));error("INVALID_KEYWORD",()->service.list(1,"user",0,20,null,"x".repeat(256)));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void queryIsScopedLiteralAndNeverLoadsWorkbookOrHistoryBlob(){service.list(1,"user",0,20,null," %_' ");verify(db).rows(argThat(sql->sql.contains("w.project_id=?")&&sql.contains("w.item_type='BUG'")&&sql.contains("LOCATE(?)")==false&&sql.contains("LOCATE(?,w.item_key)")&&!sql.contains("LIMIT")),eq(1L),eq("%_'"),eq("%_'"),eq("%_'"));for(var call:mockingDetails(db).getInvocations()){String sql=String.valueOf(call.getArguments()[0]);assertFalse(sql.contains("source_content"));assertFalse(sql.contains("qa_answers"));assertFalse(sql.contains("SELECT *"));}verify(db,never()).update(anyString(),any(Object[].class));verify(db,never()).insert(anyString(),any(Object[].class));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void emptyQueueStillAuthorizesPm(){bugs.clear();var page=service.list(1,"user",0,20,null,null);assertEquals(0,page.totalItems());assertEquals(0,page.totalPages());verify(identity).lockIdentity("user");verify(db).row(contains("FROM project_memberships"),eq(1L),eq("user"));verifyNoInteractions(retest);}
    @Test void emptyConfirmedCoverageIsNotReady(){coverage();state("PREPARE_RETEST");assertEquals(false,row().get("canClose"));verifyNoInteractions(retest);}
    @Test void submittedRequestWithoutResultRequiresPreparation(){coverage();item(1);request(80,1,"SUBMITTED",null);state("PREPARE_RETEST");assertEquals(0L,row().get("pendingCount"));}
    @Test void openRequestCannotFabricateVerification(){coverage();item(1);request(80,1,"OPEN","PASS");state("ASSIGNED");assertEquals(0L,row().get("passCount"));}
    @Test void duplicateFactsDoNotMultiplyCounts(){coverage();var i=item(1);items.add(i);var r=request(80,1,"SUBMITTED","PASS");requests.add(r);state("READY_TO_CLOSE");assertEquals(1L,row().get("applicableCount"));assertEquals(1L,row().get("requestedCount"));assertEquals(1L,row().get("passCount"));assertEquals(List.of(80L),row().get("requestIds"));}
    @Test void anotherBugCannotSupplyVerification(){coverage();item(1);request(80,1,"SUBMITTED","PASS").put("workItemId",20L);state("PREPARE_RETEST");}
    @Test void jdbcNumericWidthsAndBooleanFlagsAreCompatible(){coverage();b().put("roundNo",1);b().put("buildUsable",1);item(1).put("contextUsable",1);request(80,1,"SUBMITTED","PASS");state("READY_TO_CLOSE");}
    @Test void rowHasExactPublicContract(){assertEquals(Set.of("workItemId","key","title","status","assigneeMembershipId","fixedBuildId","roundNo","coverageRevisionId","coverageConfirmed","state","applicableCount","requestedCount","pendingCount","passCount","failCount","requestIds","canPrepareRetest","canClose","updatedAt"),row().keySet());}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void factsUseThreeSetQueriesRegardlessOfBugCount(){for(long id=20;id<100;id++)bugs.add(bug(id));row();verify(db,times(3)).rows(anyString(),any(Object[].class));verifyNoInteractions(retest);}
    @Test void transactionKeepsAuthorizationLocksAndSnapshot(){var tx=HandoffService.class.getAnnotation(org.springframework.transaction.annotation.Transactional.class);assertNotNull(tx);assertFalse(tx.readOnly());assertEquals(org.springframework.transaction.annotation.Isolation.REPEATABLE_READ,tx.isolation());assertEquals(org.springframework.transaction.annotation.Propagation.REQUIRED,tx.propagation());}
    @Test void controllerUsesSessionActorAndForwardsFilters(){var auth=mock(org.springframework.security.core.Authentication.class);when(auth.getPrincipal()).thenReturn(new SessionPrincipal("user",3));var controller=new HandoffController(service);var page=controller.list(auth,1,0,20,"PREPARE_RETEST",null);assertEquals(1,page.totalItems());verify(identity).lockIdentity("user");assertEquals("/api/v1/projects/{projectId}/handoff-queue",HandoffController.class.getAnnotation(org.springframework.web.bind.annotation.RequestMapping.class).value()[0]);}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void contextQueryPinsEveryGuardAndDoesNotSelectCaseContent(){row();verify(db).rows(argThat(sql->sql.contains("/* handoff items */")&&sql.contains("rv.approved_at IS NOT NULL")&&sql.contains("tc.archived_at IS NULL")&&sql.contains("ts.archived_at IS NULL")&&sql.contains("cy.status_code='ACTIVE'")&&sql.contains("sd.excluded")&&sql.contains("u.enabled=TRUE")&&sql.contains("u.role_code<>'DEV'")&&sql.contains("e.active=TRUE")&&sql.contains("d.active=TRUE")&&sql.contains("i.coverage_revision_id=s.current_coverage_id")&&!sql.contains("steps_vi")),eq(1L));}
}
