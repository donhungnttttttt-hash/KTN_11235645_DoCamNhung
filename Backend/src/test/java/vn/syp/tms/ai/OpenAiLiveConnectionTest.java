package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Explicit opt-in only: one small, paid provider call, no Spring/database or project data. */
@EnabledIfEnvironmentVariable(named = "TMS_OPENAI_LIVE_TEST", matches = "true")
class OpenAiLiveConnectionTest {
    @Test void genericJsonProbeUsesTheBackendClient() throws Exception {
        var properties = new Properties();
        String file = System.getenv("TMS_OPENAI_TEST_CONFIG_FILE");
        if (file != null && !file.isBlank()) {
            try (var reader = Files.newBufferedReader(Path.of(file), StandardCharsets.UTF_8)) {
                properties.load(reader);
            }
        }
        String key = setting(properties, "OPENAI_API_KEY", "");
        var config = new OpenAiConfiguration(true, key,
                setting(properties, "TMS_OPENAI_MODEL", "gpt-4.1-mini"), 20, 32, 1);
        var json = new ObjectMapper();
        var schema = json.readTree("""
            {"type":"object","properties":{"ok":{"type":"boolean","enum":[true]}},
             "required":["ok"],"additionalProperties":false}
            """);
        try {
            var result = new OpenAiResponsesClient(config, json).generate("Return the JSON object with ok set to true.",
                    json.createObjectNode().put("connectionCheck", true), "connection_check", schema);
            assertThat(result.value().path("ok").isBoolean()).isTrue();
            assertThat(result.value().path("ok").asBoolean()).isTrue();
            System.out.println("OpenAI generic probe PASS; inputTokens=" + result.inputTokens()
                    + ", outputTokens=" + result.outputTokens() + ". No project data sent.");
        } catch (OpenAiResponsesClient.Failure e) {
            fail("OpenAI generic probe failed: " + e.code() + ". No key or provider payload logged.");
        }
    }

    private String setting(Properties properties, String name, String fallback) {
        String env = System.getenv(name);
        return env == null ? properties.getProperty(name, fallback) : env;
    }
}
