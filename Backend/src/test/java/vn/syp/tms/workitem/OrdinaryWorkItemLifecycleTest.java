package vn.syp.tms.workitem;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.qa.QaService;
import vn.syp.tms.retest.BugRetestLifecycle;
import vn.syp.tms.rules.RuleService;
import vn.syp.tms.shared.web.BusinessException;

/** Ordinary work must be finishable without invoking bug verification commands. */
@SuppressWarnings("null") // Mockito matcher tokens are synthetic non-null argument placeholders.
class OrdinaryWorkItemLifecycleTest {
    final WorkItemStore db=mock(WorkItemStore.class);
    final ProjectAudit audit=mock(ProjectAudit.class);
    final BugRetestLifecycle retest=mock(BugRetestLifecycle.class);
    final QaService qa=mock(QaService.class);
    final WorkItemService service=spy(new WorkItemService(db,audit,retest,mock(RuleService.class),qa));
    Map<String,Object> item;

    void fixture(String type,String state,String role) {
        item=new HashMap<>(Map.of("id",11L,"type",type,"status",state,"version",2L,"assigneeMembershipId",7L));
        doReturn(Map.of("id",7L,"role",role,"systemRole",role)).when(service).writable(1L,"actor");
        doReturn(item).when(service).get(1L,"actor",11L);
        when(db.row("SELECT w.item_type AS type FROM work_items w WHERE w.project_id=? AND w.id=?",1L,11L)).thenReturn(Map.of("type",type));
        when(db.row(eq("SELECT terminal FROM work_item_statuses WHERE code=?"),anyString())).thenAnswer(invocation->Map.of("terminal",BugRetestLifecycle.terminal(invocation.getArgument(1))));
    }
    WorkItemDtos.Transition command(String target){return new WorkItemDtos.Transition(target,"PM kiểm tra và xác nhận",null,2L);}

    @ParameterizedTest @CsvSource({"TASK,closed","TASK,wontfix","REQUEST,closed","REQUEST,wontfix","IMPROVEMENT,closed","IMPROVEMENT,wontfix"})
    void pmFinishesOrdinaryWorkWithVersionReasonHistoryAndAudit(String type,String target) {
        fixture(type,"resolved","PM");
        service.transition(1,"actor",11,command(target));
        verify(db).update("UPDATE work_items SET status_code=? WHERE project_id=? AND id=?",target,1L,11L);
        verify(db).insert(contains("INSERT INTO work_item_history"),eq(1L),eq(11L),eq("TRANSITION"),eq("resolved"),eq(target),eq("PM kiểm tra và xác nhận"),isNull(),eq(7L));
        verify(db).update("UPDATE work_items SET lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",7L,1L,11L);
        verify(audit).record(1L,"actor","WORK_ITEM",11L,"TRANSITION");
        verifyNoInteractions(retest);
    }

    @ParameterizedTest @CsvSource({"TASK,closed","REQUEST,wontfix","IMPROVEMENT,closed"})
    void terminalOrdinaryWorkReopensOnlyToOpen(String type,String status) {
        fixture(type,status,"PM");
        assertEquals("REOPEN_REQUIRED",assertThrows(BusinessException.class,()->service.transition(1,"actor",11,command("progress"))).code());
        service.transition(1,"actor",11,command("open"));
        verify(db).update("UPDATE work_items SET status_code=? WHERE project_id=? AND id=?","open",1L,11L);
        verifyNoInteractions(retest);
    }

    @Test void ordinaryWorkRejectsBugOnlyOutcomesAndBuildInputs() {
        fixture("TASK","open","PM");
        assertEquals("INVALID_TRANSITION",assertThrows(BusinessException.class,()->service.transition(1,"actor",11,command("unreproducible"))).code());
        assertEquals("INVALID_TRANSITION",assertThrows(BusinessException.class,()->service.transition(1,"actor",11,new WorkItemDtos.Transition("closed","done",5L,2L))).code());
        verify(db,never()).update(anyString(),any(Object[].class));
    }

    @Test void ordinaryWorkStillRequiresCurrentPmReasonAndVersion() {
        for(String role:List.of("TESTER","DEV","ADMIN")) {
            fixture("TASK","open",role);
            assertEquals(403,assertThrows(BusinessException.class,()->service.transition(1,"actor",11,command("closed"))).status());
        }
        fixture("TASK","open","PM");
        assertEquals(409,assertThrows(BusinessException.class,()->service.transition(1,"actor",11,new WorkItemDtos.Transition("closed","done",null,1L))).status());
        assertEquals(422,assertThrows(BusinessException.class,()->service.transition(1,"actor",11,new WorkItemDtos.Transition("closed","  ",null,2L))).status());
        verify(db,never()).update(anyString(),any(Object[].class));
    }

    @Test void closingOrdinaryWorkDoesNotEnableGenericBugOrQaClosure() {
        fixture("BUG","resolved","PM");
        assertEquals("CLOSURE_NOT_ENABLED",assertThrows(BusinessException.class,()->service.transition(1,"actor",11,command("closed"))).code());
        fixture("QA","resolved","PM");
        assertEquals("QA_COMMAND_REQUIRED",assertThrows(BusinessException.class,()->service.transition(1,"actor",11,command("closed"))).code());
        verify(db,never()).update(anyString(),any(Object[].class));
        verifyNoInteractions(retest);
    }

    @Test void ordinaryWorkMustReopenBeforeEditingContent() {
        fixture("TASK","closed","PM");
        var update=new WorkItemDtos.Update("Changed","Body","MEDIUM",null,null,null,null,null,null,"update",2L);
        assertEquals("REOPEN_REQUIRED",assertThrows(BusinessException.class,()->service.update(1,"actor",11,update)).code());
        verify(db,never()).update(anyString(),any(Object[].class));
    }
}
