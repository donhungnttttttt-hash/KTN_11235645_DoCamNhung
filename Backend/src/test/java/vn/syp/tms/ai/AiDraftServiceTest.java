package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class AiDraftServiceTest {
    private final AiDraftStore store = mock(AiDraftStore.class);
    private final OpenAiResponsesClient client = mock(OpenAiResponsesClient.class);
    private final ObjectMapper json = new ObjectMapper();
    private final AiDraftService service = new AiDraftService(store, client, json);
    private final AiDraftService.Task task = new AiDraftService.Task("PM_ASSIGNMENT_SUGGESTION", "file:7", "v1", "request-00001",
            "Use facts only.", json.createObjectNode().put("cases", 8), json.createObjectNode().put("type", "object"), java.util.List.of());

    @Test void successfulGenerationIsPersistedBeforeReturning() {
        var answer=json.createObjectNode().put("title","Draft").put("summary","Draft");
        answer.putArray("observations");answer.putArray("suggestedActions");answer.putArray("missingInformation");
        var output = new OpenAiResponsesClient.Output(answer, "resp_test", "gpt-4.1-mini", 10, 4);
        when(store.reserve(1, "pm", task)).thenReturn(new AiDraftStore.Reservation(9, true));
        when(client.generate(anyString(), any(), anyString(), any())).thenReturn(output);
        when(store.complete(eq(1L), eq("pm"), eq(9L), any())).thenReturn(draft("READY"));
        assertThat(service.generate(1, "pm", task).state()).isEqualTo("READY");
        var order = inOrder(store, client);
        order.verify(store).reserve(1, "pm", task);
        order.verify(client).generate(task.instructions(), task.data(), "tms_draft", task.schema());
        order.verify(store).complete(eq(1L), eq("pm"), eq(9L), argThat(value -> value.value().path("answer").path("summary").asText().equals("Draft")));
    }

    @Test void retryReturnsSavedDraftWithoutAnotherPaidCall() {
        when(store.reserve(1, "pm", task)).thenReturn(new AiDraftStore.Reservation(9, false));
        when(store.get(1, "pm", 9)).thenReturn(draft("READY"));
        assertThat(service.generate(1, "pm", task).state()).isEqualTo("READY");
        verifyNoInteractions(client);
    }

    @Test void providerFailureIsStoredAsSanitizedCodeOnly() {
        when(store.reserve(1, "pm", task)).thenReturn(new AiDraftStore.Reservation(9, true));
        when(client.generate(anyString(), any(), anyString(), any())).thenThrow(new OpenAiResponsesClient.Failure("AI_QUOTA_EXHAUSTED"));
        when(store.get(1, "pm", 9)).thenReturn(draft("FAILED"));
        assertThat(service.generate(1, "pm", task).state()).isEqualTo("FAILED");
        verify(store).markFailed(1, "pm", 9, "AI_QUOTA_EXHAUSTED");
        verify(store, never()).complete(anyLong(), anyString(), anyLong(), any());
    }

    @Test void permissionFailurePreventsNetworkUse() {
        when(store.reserve(1, "pm", task)).thenThrow(new vn.syp.tms.shared.web.BusinessException(403, "FORBIDDEN", "Forbidden"));
        assertThatThrownBy(() -> service.generate(1, "pm", task)).hasMessage("Forbidden");
        verifyNoInteractions(client);
    }

    private AiDraftStore.Draft draft(String state) {
        return new AiDraftStore.Draft(9, 1, "pm", "TESTER_SUGGESTION", "file:7", "v1", state,
                "gpt-4.1-mini", state.equals("READY") ? json.createObjectNode().put("summary", "Draft") : null,
                state.equals("FAILED") ? "AI_QUOTA_EXHAUSTED" : null, Instant.now(), Instant.now().plusSeconds(604800),null,0);
    }
}
