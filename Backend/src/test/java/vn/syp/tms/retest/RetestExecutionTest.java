package vn.syp.tms.retest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.syp.tms.execution.*;
import vn.syp.tms.filework.FileWorkGuard;
import vn.syp.tms.workitem.*;
import vn.syp.tms.shared.web.BusinessException;

class RetestExecutionTest {
    final WorkItemStore db=mock(WorkItemStore.class);
    final WorkItemService work=mock(WorkItemService.class);
    final ExecutionService execution=mock(ExecutionService.class);
    final BugRetestLifecycle lifecycle=mock(BugRetestLifecycle.class);
    final FileWorkGuard guard=mock(FileWorkGuard.class);
    final RetestService service=spy(new RetestService(db,work,execution,lifecycle,guard));
    String scope="FULL_CASE";
    final RetestDtos.Submit pass=new RetestDtos.Submit(List.of(new RetestDtos.Result(55L,"PASS","Observed OK",null,1L)),0L,2L,"submit_123",false,null);
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @BeforeEach void setup(){
        when(work.writable(1,"actor")).thenReturn(Map.of("id",7L,"role","TESTER","globalRole","TESTER"));
        when(work.get(1,"actor",70)).thenReturn(Map.of("id",70L,"type","BUG","status","resolved","fixedBuildId",50L,"version",2L));
        doAnswer(i->new HashMap<>(Map.ofEntries(Map.entry("id",60L),Map.entry("assigneeMembershipId",7L),Map.entry("version",0L),Map.entry("bugId",70L),Map.entry("buildId",50L),Map.entry("environmentId",41L),Map.entry("deviceId",42L),Map.entry("current",true),Map.entry("status","OPEN"),Map.entry("verificationScope",scope)))).when(service).request(1,"actor",60);
        when(execution.run(1,"actor",100)).thenReturn(Map.of("id",100L,"version",1L,"assigneeMembershipId",7L,"excluded",false));
        when(db.row(anyString(),any(Object[].class))).thenReturn(Map.of("id",1L,"status_code","ACTIVE","approved_at","date"));
        when(db.rows(anyString(),any(Object[].class))).thenReturn(List.of(Map.of("id",55L,"runItemId",100L)));
        when(execution.recordRetest(eq(1L),eq("actor"),eq(100L),any(),eq(60L),eq(55L))).thenReturn(Map.of("id",200L));
        when(db.checksum(any())).thenReturn("a".repeat(64));
    }
    @Test void identityIsLockedBeforeRetestProjectWriteAndFullCaseUsesInternalCanonicalEntry(){
        service.submit(1,"actor",60,pass);
        var order=inOrder(guard,work,execution);order.verify(guard).lockIdentity("actor");order.verify(work).writable(1,"actor");
        verify(execution).recordRetest(eq(1L),eq("actor"),eq(100L),argThat(a->a.resultCode().equals("OK") && a.buildId()==50L && a.actualResult().equals("Observed OK")),eq(60L),eq(55L));
        verify(execution,never()).record(anyLong(),anyString(),anyLong(),any());
    }
    @Test void revokedIdentityFailsBeforeAnyRetestReadOrReplay(){
        doThrow(new BusinessException(401,"UNAUTHENTICATED","Revoked")).when(guard).lockIdentity("actor");
        assertEquals(401,assertThrows(BusinessException.class,()->service.submit(1,"actor",60,pass)).status());verifyNoInteractions(work,db,execution,lifecycle);
    }
    @Test void bugOnlyCreatesNoExecutionAttempt(){scope="BUG_ONLY";service.submit(1,"actor",60,pass);verify(execution,never()).recordRetest(anyLong(),anyString(),anyLong(),any(),anyLong(),anyLong());verify(execution,never()).record(anyLong(),anyString(),anyLong(),any());}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void fullCaseFailureKeepsNgAndExactBugAttemptLink(){
        var fail=new RetestDtos.Submit(List.of(new RetestDtos.Result(55L,"FAIL","Still broken",null,1L)),0L,2L,"submit_123",false,null);
        service.submit(1,"actor",60,fail);
        verify(execution).recordRetest(eq(1L),eq("actor"),eq(100L),argThat(a->a.resultCode().equals("NG") && a.actualResult().equals("Still broken")),eq(60L),eq(55L));
        verify(db).update(contains("INSERT INTO work_item_execution_links"),eq(1L),eq(70L),eq(100L),eq(200L),eq(7L));verify(lifecycle).invalidate(1,70,true);
    }
    @Test void qaSummaryRejectsBeforeCoverageAndHasCompatibleOuterTransaction() throws Exception {
        when(work.get(1,"actor",70)).thenReturn(Map.of("id",70L,"type","QA"));
        var error=assertThrows(BusinessException.class,()->service.summary(1,"actor",70));
        assertEquals(422,error.status());assertEquals("BUG_REQUIRED",error.code());
        verifyNoInteractions(db,execution,lifecycle,guard);
        var outer=RetestService.class.getAnnotation(org.springframework.transaction.annotation.Transactional.class);
        assertNotNull(outer);assertFalse(outer.readOnly());
        assertEquals(org.springframework.transaction.annotation.Propagation.REQUIRED,outer.propagation());
        var own=RetestService.class.getMethod("summary",long.class,String.class,long.class).getAnnotation(org.springframework.transaction.annotation.Transactional.class);
        assertTrue(own==null||!own.readOnly(),"QA misuse must reach BUG_REQUIRED in a transaction allowing current typed locks");
    }
}
