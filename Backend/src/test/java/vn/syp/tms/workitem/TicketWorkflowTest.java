package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.shared.web.BusinessException;

class TicketWorkflowTest {
    private TicketWorkflow.Rights rights(boolean manager,boolean reviewer,boolean coordinator,boolean assigned,boolean verifier){return new TicketWorkflow.Rights(manager,reviewer,coordinator,assigned,verifier);}
    @Test void defaultsAndNineColumnsHaveDistinctMeaning(){
        assertThat(TicketWorkflow.initial("QA")).isEqualTo("SPEC_CONFIRM");assertThat(TicketWorkflow.initial("BUG")).isEqualTo("NEW");
        assertThat(TicketWorkflow.COLUMNS).extracting(value -> Objects.requireNonNull(Objects.requireNonNull(value).columnId())).containsExactly("spec","new","progress","verify","processed","fixed","cannot_reproduce","wont_fix","unsupported");
        for(var c:TicketWorkflow.COLUMNS){String type=Set.of("spec","unsupported").contains(c.columnId())?"QA":"BUG";assertThat(TicketWorkflow.combination(type,c.state(),c.closureReason())).isEqualTo(c);assertThat(TicketWorkflow.mirror(c)).isNotBlank();}
    }
    @Test void processedIsClosedButNotFinalized(){
        assertThat(TicketWorkflow.finalized("CLOSED","PROCESSED")).isFalse();assertThat(TicketWorkflow.awaiting("CLOSED","PROCESSED")).isTrue();
        assertThat(TicketWorkflow.awaiting("WAITING_CONFIRM",null)).isTrue();assertThat(TicketWorkflow.awaiting("NEW",null)).isFalse();
        for(String reason:List.of("FIXED","CANNOT_REPRODUCE","WONT_FIX","UNSUPPORTED"))assertThat(TicketWorkflow.finalized("CLOSED",reason)).isTrue();
        assertThat(TicketWorkflow.finalized("NEW",null)).isFalse();assertThat(TicketWorkflow.finalized(null,null)).isFalse();
    }
    @Test void invalidTypeStateReasonCannotBecomeAColumn(){
        assertThatThrownBy(()->TicketWorkflow.combination("QA","NEW",null)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->TicketWorkflow.combination("BUG","CLOSED","UNSUPPORTED")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->TicketWorkflow.combination("BUG","IN_PROGRESS","FIXED")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->TicketWorkflow.combination("BUG","CLOSED",null)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->TicketWorkflow.combination("TASK","NEW",null)).isInstanceOf(BusinessException.class);
    }
    @Test void workerCanProcessButOnlyVerifierCanFinalizeCorrectBranch(){
        var worker=rights(false,false,false,true,false);var verifier=rights(false,false,false,false,true);
        assertThat(TicketWorkflow.allowed("BUG","NEW",null,worker)).extracting(value -> Objects.requireNonNull(Objects.requireNonNull(value).columnId())).containsExactly("progress");
        assertThat(TicketWorkflow.allowed("BUG","IN_PROGRESS",null,worker)).extracting(value -> Objects.requireNonNull(Objects.requireNonNull(value).columnId())).containsExactly("verify","processed");
        assertThat(TicketWorkflow.allowed("BUG","CLOSED","PROCESSED",worker)).isEmpty();
        assertThat(TicketWorkflow.allowed("BUG","CLOSED","PROCESSED",verifier)).extracting(value -> Objects.requireNonNull(Objects.requireNonNull(value).columnId())).containsExactly("new","fixed");
        assertThat(TicketWorkflow.allowed("BUG","WAITING_CONFIRM",null,verifier)).extracting(value -> Objects.requireNonNull(Objects.requireNonNull(value).columnId())).containsExactly("new","cannot_reproduce");
    }
    @Test void combinedDutiesAreUnionAndNeverGrantManagerOverride(){
        var combined=rights(false,true,true,true,true);
        assertThat(TicketWorkflow.allowed("BUG","CLOSED","PROCESSED",combined)).extracting(value -> Objects.requireNonNull(Objects.requireNonNull(value).columnId())).containsExactly("new","fixed","wont_fix");
        assertThat(TicketWorkflow.allowed("BUG","CLOSED","FIXED",combined)).isEmpty();
        assertThat(TicketWorkflow.allowed("BUG",null,null,combined)).isEmpty();
        assertThat(TicketWorkflow.allowed("QA","SPEC_CONFIRM",null,combined)).extracting(value -> Objects.requireNonNull(Objects.requireNonNull(value).columnId())).containsExactly("unsupported");
        assertThat(TicketWorkflow.allowed("QA","SPEC_CONFIRM",null,rights(false,false,false,true,false))).isEmpty();
    }
    @Test void managerCanReconcileLegacyAndCannotCreateImpossibleTypeCombination(){
        var manager=rights(true,false,false,false,false);
        assertThat(TicketWorkflow.allowed("BUG",null,null,manager)).hasSize(7);
        assertThat(TicketWorkflow.allowed("QA",null,null,manager)).extracting(value -> Objects.requireNonNull(Objects.requireNonNull(value).columnId())).containsExactly("spec","unsupported");
        assertThat(TicketWorkflow.allowed("BUG","NEW",null,rights(false,false,false,false,false))).isEmpty();
    }
}
