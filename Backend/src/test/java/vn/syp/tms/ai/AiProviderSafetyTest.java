package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import org.junit.jupiter.api.Test;

class AiProviderSafetyTest {
    private final ObjectMapper json = new ObjectMapper();
    @Test void ollamaRejectsRemoteDnsCredentialsAndPath() {
        for (String url : new String[]{"http://example.com:11434", "http://localhost:11434", "http://127.0.0.1.evil:11434", "http://user@127.0.0.1:11434", "http://127.0.0.1:11434/path", "http://127.0.0.1:11434?x=1"})
            assertThatThrownBy(() -> LocalAiConfiguration.ollamaUri(url)).isInstanceOf(IllegalArgumentException.class);
        assertThat(LocalAiConfiguration.ollamaUri("http://127.0.0.1:11434")).isEqualTo(URI.create("http://127.0.0.1:11434"));
    }
    @Test void modelIdsCannotContainMarkupWhitespaceOrOversizedValues() {
        for(String model : new String[]{"<script>","model\nsecret","a".repeat(101),"../model"})
            assertThatThrownBy(() -> AiProviderGateway.validateModel(model)).hasMessage("AI_INVALID_MODEL");
        AiProviderGateway.validateModel("qwen3:8b");
    }
    @Test void streamRequiresExactlyOneSuccessfulTerminalEvent() {
        var parser = new ChatGptSse(json);
        for(String body : new String[]{"data: {\"type\":\"response.output_text.delta\",\"delta\":\"partial\"}\n\n", "data: {\"type\":\"response.failed\"}\n\n", "data: [DONE]\n\n", "x".repeat(1048577)})
            assertThatThrownBy(() -> parser.parse(body.getBytes(java.nio.charset.StandardCharsets.UTF_8))).isInstanceOf(OpenAiResponsesClient.Failure.class);
    }
    @Test void quotaAndRateErrorsAreDistinctAndSanitized() {
        assertThat(ProviderHttp.errorCode(429,"{\"error\":{\"code\":\"credit_balance_exhausted\",\"message\":\"secret\"}}".getBytes(),json)).isEqualTo("AI_QUOTA_EXHAUSTED");
        assertThat(ProviderHttp.errorCode(429,"<script>secret</script>".getBytes(),json)).isEqualTo("AI_RATE_LIMITED");
    }
    @Test void overlappingInferenceForTheSameOwnerIsRejectedAndSlotReleased() {
        assertThat(ProviderHttp.inference("actor",()->{
            assertThatThrownBy(()->ProviderHttp.inference("actor",()->"bad")).hasMessage("AI_BUSY");return "ok";
        })).isEqualTo("ok");
        assertThat(ProviderHttp.inference("actor",()->"next")).isEqualTo("next");
    }
}
