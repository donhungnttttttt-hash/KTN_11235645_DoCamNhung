package vn.syp.tms.feature;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.shared.web.BusinessException;

class AssignmentPlanTest {
    @Test void managerAdjustsTwoBoundariesAtomicallyAndPreservesOmittedOwner() {
        var current=new LinkedHashMap<Long,Long>();current.put(1L,10L);current.put(2L,10L);current.put(3L,20L);current.put(4L,30L);
        var result=AssignmentPlan.apply(current,List.of(new AssignmentPlan.Change(10L,List.of(1L)),new AssignmentPlan.Change(20L,List.of(2L,3L))),null,true);
        assertThat(result).containsEntry(1L,10L).containsEntry(2L,20L).containsEntry(3L,20L).containsEntry(4L,30L);
        assertThat(current).containsEntry(2L,10L);
    }
    @Test void testerCannotTakeAnotherPersonsRow() {
        assertThatThrownBy(()->AssignmentPlan.apply(Map.of(1L,10L,2L,20L),List.of(new AssignmentPlan.Change(10L,List.of(1L,2L))),10L,false))
            .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("ASSIGNMENT_CONFLICT"));
    }
    @Test void testerCanReleaseOwnRowsAndClaimUnassignedRows() {
        var current=new LinkedHashMap<Long,Long>();current.put(1L,10L);current.put(2L,null);current.put(3L,20L);
        assertThat(AssignmentPlan.apply(current,List.of(new AssignmentPlan.Change(10L,List.of(2L))),10L,false))
            .containsEntry(1L,null).containsEntry(2L,10L).containsEntry(3L,20L);
    }
    @Test void duplicateFinalOwnershipIsRejected() {
        assertThatThrownBy(()->AssignmentPlan.apply(Map.of(1L,10L),List.of(new AssignmentPlan.Change(10L,List.of(1L)),new AssignmentPlan.Change(20L,List.of(1L))),null,true))
            .isInstanceOf(BusinessException.class);
    }
    @Test void testerCannotSubmitAnotherPersonsScopeEvenIfEmpty() {
        assertThatThrownBy(()->AssignmentPlan.apply(Map.of(1L,20L),List.of(new AssignmentPlan.Change(20L,List.of())),10L,false))
            .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
    }
    @Test void rowOutsideDocumentIsRejected() {
        assertThatThrownBy(()->AssignmentPlan.apply(Map.of(1L,10L),List.of(new AssignmentPlan.Change(10L,List.of(2L))),null,true))
            .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("INVALID_SCOPE"));
    }
}
