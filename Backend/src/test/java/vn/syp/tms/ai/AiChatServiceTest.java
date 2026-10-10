package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.*;
import vn.syp.tms.shared.web.BusinessException;

class AiChatServiceTest {
    final ObjectMapper json = new ObjectMapper();
    final AiChatStore store = mock(AiChatStore.class);
    final AiContextService contexts = mock(AiContextService.class);
    final AiProviderGateway gateway = mock(AiProviderGateway.class);
    final AiChatService service = new AiChatService(store, contexts, gateway, json);
    final AiProviderGateway.ResolvedSelection selection = new AiProviderGateway.ResolvedSelection("OPENAI_API", "test-model", null, 0);
    final AiChatStore.ThreadView thread = new AiChatStore.ThreadView(1, null, null, null, null, "OPENAI_API", "test-model", Instant.now(), Instant.now().plusSeconds(604800));
    @BeforeEach void setup() {
        when(store.thread("owner",1)).thenReturn(thread);
        when(gateway.resolve(eq("owner"),any())).thenReturn(selection);
        when(store.reserve(eq("owner"),eq(1L),anyString(),anyString(),eq(selection),any(),anyBoolean())).thenReturn(new AiChatStore.Reservation(2,true));
        when(store.history("owner",1)).thenReturn(List.of());
        when(gateway.generate(eq("owner"),eq(selection),anyString(),any(),anyString(),any())).thenReturn(new OpenAiResponsesClient.Output(json.createObjectNode().put("text","Answer"),"resp_test","test-model",1,1));
        when(gateway.withCurrent(eq("owner"),eq(selection),any())).thenAnswer(c->((java.util.function.Supplier<?>)c.getArgument(2)).get());
    }
    @Test void priorIntentNeverResolvesOrCallsProvider() {
        var prior = mock(AiChatStore.Turn.class);
        when(store.findRequest("owner",1,"same-key-001","Hello")).thenReturn(prior);
        assertThat(service.send("owner",1,"Hello","same-key-001")).isSameAs(prior);
        verifyNoInteractions(gateway);
    }
    @Test void changedTextConflictDoesNotCallProvider() {
        when(store.findRequest(anyString(),anyLong(),anyString(),anyString())).thenThrow(new BusinessException(409,"AI_REQUEST_CONFLICT","Conflict"));
        assertThatThrownBy(()->service.send("owner",1,"Changed","same-key-001")).isInstanceOf(BusinessException.class);
        verifyNoInteractions(gateway);
    }
    @Test void interruptedOutputIsFailedWithoutCompletion() {
        when(gateway.generate(anyString(),any(),anyString(),any(),anyString(),any())).thenThrow(new OpenAiResponsesClient.Failure("AI_INTERRUPTED"));
        service.send("owner",1,"Hello","same-key-001");
        verify(store).markFailed("owner",2,"AI_INTERRUPTED");
        verify(store,never()).complete(anyString(),anyLong(),any());
    }
    @Test void changedConnectionIsFencedBeforeSave() {
        when(gateway.withCurrent(anyString(),any(),any())).thenThrow(new OpenAiResponsesClient.Failure("AI_RECONNECT_REQUIRED"));
        service.send("owner",1,"Hello","same-key-001");
        verify(store).markFailed("owner",2,"AI_RECONNECT_REQUIRED");
        verify(store,never()).complete(anyString(),anyLong(),any());
    }
    @Test void changedAccountOrProjectDiscardsOutput() {
        when(store.complete(anyString(),anyLong(),any())).thenThrow(new BusinessException(401,"UNAUTHENTICATED","Changed"));
        assertThatThrownBy(()->service.send("owner",1,"Hello","same-key-001")).isInstanceOf(BusinessException.class);
        verify(store).markFailed("owner",2,"AI_CONTEXT_CHANGED");
    }
    @Test void malformedContentNeverCompletes() {
        when(gateway.generate(anyString(),any(),anyString(),any(),anyString(),any())).thenReturn(new OpenAiResponsesClient.Output(json.createObjectNode().put("html","bad"),"resp_test","test-model",1,1));
        service.send("owner",1,"Hello","same-key-001");
        verify(store).markFailed("owner",2,"AI_INVALID_RESPONSE");
        verify(store,never()).complete(anyString(),anyLong(),any());
    }
    @Test void invalidInputIsRejectedBeforeAnyRead() {
        assertThatThrownBy(()->service.send("owner",1,"x".repeat(2001),"same-key-001")).isInstanceOf(BusinessException.class);
        verifyNoInteractions(store,gateway);
    }
    @Test void successfulOutputCommitsThroughConnectionFence() {
        service.send("owner",1,"Hello","same-key-001");
        verify(gateway).withCurrent(eq("owner"),eq(selection),any());
        verify(store).complete(eq("owner"),eq(2L),any());
    }
    @Test void reservationRaceLoserNeverGenerates() {
        when(store.reserve(eq("owner"),eq(1L),anyString(),anyString(),eq(selection),any(),anyBoolean())).thenReturn(new AiChatStore.Reservation(2,false));
        service.send("owner",1,"Hello","same-key-001");
        verify(gateway,never()).generate(anyString(),any(),anyString(),any(),anyString(),any());
    }
    @Test void unavailableProviderStillPreservesReservedQuestionAsFailure() {
        when(gateway.resolve(eq("owner"),any())).thenThrow(new OpenAiResponsesClient.Failure("AI_DISABLED"));
        service.send("owner",1,"Hello","same-key-001");
        verify(store).markFailed("owner",2,"AI_DISABLED");
        verify(gateway,never()).generate(anyString(),any(),anyString(),any(),anyString(),any());
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.MethodSource("invalidOutputs")
    void untrustedProviderPayloadAndProvenanceMustValidateBeforeSaving(OpenAiResponsesClient.Output invalid) {
        when(gateway.generate(anyString(),any(),anyString(),any(),anyString(),any())).thenReturn(invalid);
        service.send("owner",1,"Hello","same-key-001");
        verify(store).markFailed("owner",2,"AI_INVALID_RESPONSE");
        verify(store,never()).complete(anyString(),anyLong(),any());
    }
    static java.util.stream.Stream<OpenAiResponsesClient.Output> invalidOutputs() {
        var json=new ObjectMapper();var valid=json.createObjectNode().put("text","Valid");
        return java.util.stream.Stream.of(null,
                new OpenAiResponsesClient.Output(null,"resp_test","model",1,1),
                new OpenAiResponsesClient.Output(json.createArrayNode(),"resp_test","model",1,1),
                new OpenAiResponsesClient.Output(valid.deepCopy().put("tool","run SQL"),"resp_test","model",1,1),
                new OpenAiResponsesClient.Output(json.createObjectNode().put("text",12),"resp_test","model",1,1),
                new OpenAiResponsesClient.Output(json.createObjectNode().put("text"," "),"resp_test","model",1,1),
                new OpenAiResponsesClient.Output(json.createObjectNode().put("text","x".repeat(12001)),"resp_test","model",1,1),
                new OpenAiResponsesClient.Output(json.createObjectNode().put("text","\u0001".repeat(10001)),"resp_test","model",1,1),
                new OpenAiResponsesClient.Output(valid,null,"model",1,1),
                new OpenAiResponsesClient.Output(valid,"secret <markup>","model",1,1),
                new OpenAiResponsesClient.Output(valid,"resp_test",null,1,1),
                new OpenAiResponsesClient.Output(valid,"resp_test","bad <model>",1,1),
                new OpenAiResponsesClient.Output(valid,"resp_test","model",-1,1),
                new OpenAiResponsesClient.Output(valid,"resp_test","model",1,-1));
    }
}
