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

    @Test void invalidProviderShapeLogsOnlyAConstantConstraintCodeAndNeverTheOutput() {
        var logger=(ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger(AiDraftService.class);
        var appender=new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();appender.start();logger.addAppender(appender);
        try {
            var answer=json.createObjectNode().put("answer","private-fixture-content-not-for-logs");
            when(store.reserve(1,"pm",task)).thenReturn(new AiDraftStore.Reservation(9,true));
            when(client.generate(anyString(),any(),anyString(),any())).thenReturn(new OpenAiResponsesClient.Output(answer,"resp_test","test",1,1));
            when(store.get(1,"pm",9)).thenReturn(draft("FAILED"));
            assertThat(service.generate(1,"pm",task).state()).isEqualTo("FAILED");
            verify(store).markFailed(1,"pm",9,"AI_INVALID_RESPONSE");verify(store,never()).complete(anyLong(),anyString(),anyLong(),any());
            assertThat(appender.list).extracting(event -> java.util.Objects.requireNonNull(event).getFormattedMessage())
                .contains("AI draft response rejected: ROOT_SHAPE")
                .allMatch(message->!message.contains("private-fixture-content-not-for-logs")&&!message.contains("resp_test"));
        } finally {logger.detachAppender(appender);appender.stop();}
    }

    @Test void permissionFailurePreventsNetworkUse() {
        when(store.reserve(1, "pm", task)).thenThrow(new vn.syp.tms.shared.web.BusinessException(403, "FORBIDDEN", "Forbidden"));
        assertThatThrownBy(() -> service.generate(1, "pm", task)).hasMessage("Forbidden");
        verifyNoInteractions(client);
    }
    @Test void reconnectDuringInferenceNeverCommitsStaleOutput() {
        var gateway=mock(AiProviderGateway.class);var routed=new AiDraftService(store,client,json,gateway);
        var selection=new AiProviderGateway.ResolvedSelection("CHATGPT","test","connection",1);
        var selected=task.withSelection(selection);var answer=json.createObjectNode().put("title","Draft").put("summary","Draft");
        answer.putArray("observations");answer.putArray("suggestedActions");answer.putArray("missingInformation");
        when(store.reserve(1,"pm",selected)).thenReturn(new AiDraftStore.Reservation(9,true));
        when(gateway.generate(anyString(),any(),anyString(),any(),anyString(),any())).thenReturn(new OpenAiResponsesClient.Output(answer,"resp_test","test",1,1));
        when(gateway.withCurrent(eq("pm"),eq(selection),any())).thenThrow(new OpenAiResponsesClient.Failure("AI_CONNECTION_CHANGED"));
        when(store.get(1,"pm",9)).thenReturn(draft("FAILED"));
        assertThat(routed.generate(1,"pm",selected).state()).isEqualTo("FAILED");
        verify(store).markFailed(1,"pm",9,"AI_CONNECTION_CHANGED");verify(store,never()).complete(anyLong(),anyString(),anyLong(),any());verifyNoInteractions(client);
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"OPENAI_API","CHATGPT","OLLAMA"})
    void sessionInvalidatedBeforeProviderAdmissionSettlesReservedDraft(String provider) {
        var gateway=mock(AiProviderGateway.class);var routed=new AiDraftService(store,client,json,gateway);
        var selected=task.withSelection(new AiProviderGateway.ResolvedSelection(provider,"test",null,0));
        var captured=new LocalAiAccess.SessionIdentity("original",new vn.syp.tms.identity.SessionPrincipal("pm",1));
        when(gateway.captureSession("pm")).thenReturn(captured);
        when(store.reserve(1,"pm",selected)).thenReturn(new AiDraftStore.Reservation(9,true));
        doThrow(new vn.syp.tms.shared.web.BusinessException(401,"UNAUTHENTICATED","Expired")).when(gateway).verifySession(captured);
        assertThatThrownBy(()->routed.generate(1,"pm",selected)).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        verify(store).markFailed(1,"pm",9,"AI_CONTEXT_CHANGED");
        verify(store,never()).complete(anyLong(),anyString(),anyLong(),any());
        verify(gateway,never()).generate(anyString(),any(),anyString(),any(),anyString(),any());
        verifyNoInteractions(client);
    }

    private AiDraftStore.Draft draft(String state) {
        return new AiDraftStore.Draft(9, 1, "pm", "TESTER_SUGGESTION", "file:7", "v1", state,
                "gpt-4.1-mini", state.equals("READY") ? json.createObjectNode().put("summary", "Draft") : null,
                state.equals("FAILED") ? "AI_QUOTA_EXHAUSTED" : null, Instant.now(), Instant.now().plusSeconds(604800),null,0);
    }
}
