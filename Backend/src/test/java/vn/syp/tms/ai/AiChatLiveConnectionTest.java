package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Opt-in, one paid greeting with the real chat contract, no Spring/database or project data. */
@EnabledIfEnvironmentVariable(named = "TMS_AI_CHAT_LIVE_TEST", matches = "true")
class AiChatLiveConnectionTest {
    @Test void generalChatGreetingPassesTheProductionOutputValidation() throws Exception {
        var properties = new Properties();
        String file = System.getenv("TMS_OPENAI_TEST_CONFIG_FILE");
        if (file != null && !file.isBlank()) {
            try (var reader = Files.newBufferedReader(Path.of(file), StandardCharsets.UTF_8)) {
                properties.load(reader);
            }
        }
        var config = new OpenAiConfiguration(true, setting(properties, "OPENAI_API_KEY", ""),
                setting(properties, "TMS_OPENAI_MODEL", "gpt-4.1-mini"), 30, 1536, 1,
                setting(properties, "TMS_OPENAI_BASE_URL", "https://api.openai.com/v1"));
        var json = new ObjectMapper();
        var prompt = new AiChatService(null, null, null, json).prompt(config.model(), "Helo", null, List.of());
        try {
            var result = new OpenAiResponsesClient(config, json).generate(AiChatService.INSTRUCTIONS,
                    prompt.data(), "tms_chat", AiChatService.schema(json));
            AiChatService.validateOutput(result);
            assertThat(result.value().path("text").asText()).isNotBlank();
            System.out.println("Chat contract live PASS; inputTokens=" + result.inputTokens()
                    + ", outputTokens=" + result.outputTokens() + ". No project data sent.");
        } catch (OpenAiResponsesClient.Failure e) {
            fail("Chat contract live failed: " + e.code() + ". No key or provider payload logged.");
        }
    }

    private String setting(Properties properties, String name, String fallback) {
        String env = System.getenv(name);
        return env == null ? properties.getProperty(name, fallback) : env;
    }
}
