package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;

class AiAssistanceServiceTest {
    @Test void disabledGenerationDoesNotReserveQuotaOrCallProvider() {
        var context=mock(AiContextService.class);var generator=mock(AiDraftService.class);var drafts=mock(AiDraftStore.class);
        when(context.metadata(1,"actor")).thenReturn(new AiContextService.Metadata("PM",false,false,7,java.util.List.of()));
        assertThatThrownBy(()->new AiAssistanceService(context,generator,drafts).generate(1,"actor","PM_PROGRESS_REPORT",null,"disabled-request"))
                .isInstanceOfSatisfying(vn.syp.tms.shared.web.BusinessException.class,e->assertThat(e.code()).isEqualTo("AI_DISABLED"));
        verifyNoInteractions(generator);
    }
}
