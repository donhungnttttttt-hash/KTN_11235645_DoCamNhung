package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class OpenAiResponsesClientTest {
    private static final String SECRET = "test-only-secret-never-live";
    private final ObjectMapper json = new ObjectMapper();
    private final AtomicInteger calls = new AtomicInteger();
    private final AtomicReference<String> authorization = new AtomicReference<>();
    private final AtomicReference<String> sent = new AtomicReference<>();
    private HttpServer server;
    private OpenAiResponsesClient client;

    @BeforeEach void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
        client = client(true, SECRET, 20, 3);
    }

    @AfterEach void stop() { server.stop(0); }

    private OpenAiResponsesClient client(boolean enabled, String key, int limit, int timeout) {
        var config = new OpenAiConfiguration(enabled, key, "gpt-4.1-mini", timeout, 512, limit);
        return new OpenAiResponsesClient(config, json, HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER).build(),
                URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v1/responses"));
    }

    private JsonNode schema() throws Exception {
        return json.readTree("""
            {"type":"object","properties":{"ok":{"type":"boolean"}},"required":["ok"],"additionalProperties":false}
            """);
    }

    private OpenAiResponsesClient.Output generate() throws Exception {
        return client.generate("Return the requested JSON.", json.createObjectNode().put("ok", true), "connection_check", schema());
    }

    private void respond(int status, String body) {
        server.createContext("/", exchange -> {
            calls.incrementAndGet();
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            sent.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.getResponseHeaders().set("Location", "/redirect-target");
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, bytes.length);
            try { exchange.getResponseBody().write(bytes); } finally { exchange.close(); }
        });
    }

    private String success() {
        return """
            {"id":"resp_test","model":"gpt-4.1-mini-2025-04-14","status":"completed",
             "output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"{\\"ok\\":true}"}]}],
             "usage":{"input_tokens":25,"output_tokens":5}}
            """;
    }

    @Test void transportBudgetRecoversInNextUtcMinuteWithoutRestart() throws Exception {
        var clock=org.mockito.Mockito.mock(java.time.Clock.class);
        org.mockito.Mockito.when(clock.instant()).thenReturn(java.time.Instant.parse("2026-10-10T00:00:00Z"));
        client=new OpenAiResponsesClient(new OpenAiConfiguration(true,SECRET,"gpt-4.1-mini",3,512,1),json,
                HttpClient.newHttpClient(),URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/v1/responses"),clock);
        respond(200,success());generate();assertThatThrownBy(this::generate).hasMessage("AI_REQUEST_LIMIT");
        org.mockito.Mockito.when(clock.instant()).thenReturn(java.time.Instant.parse("2026-10-10T00:01:00Z"));
        assertThat(generate().value().path("ok").asBoolean()).isTrue();assertThat(calls).hasValue(2);
    }

    @Test void sendsBoundedStatelessStructuredRequestAndReadsOutput() throws Exception {
        respond(200, success());
        var output = generate();
        assertThat(output.value().path("ok").asBoolean()).isTrue();
        assertThat(output.inputTokens()).isEqualTo(25);
        assertThat(output.outputTokens()).isEqualTo(5);
        assertThat(authorization.get()).isEqualTo("Bearer " + SECRET);
        var request = json.readTree(sent.get());
        assertThat(request.path("store").asBoolean(true)).isFalse();
        assertThat(request.path("max_output_tokens").asInt()).isEqualTo(512);
        assertThat(request.path("text").path("format").path("type").asText()).isEqualTo("json_schema");
        assertThat(request.path("text").path("format").path("strict").asBoolean()).isTrue();
        assertThat(sent.get()).doesNotContain(SECRET);
        assertThat(calls).hasValue(1);
    }

    @Test void recognizesRealCreditBalanceFailureWithoutLeakingProviderMessage() {
        respond(429, "{\"error\":{\"code\":\"credit_balance_exhausted\",\"type\":\"insufficient_quota\",\"message\":\"" + SECRET + "\"}}");
        assertThatThrownBy(this::generate).isInstanceOfSatisfying(OpenAiResponsesClient.Failure.class, e -> {
            assertThat(e.code()).isEqualTo("AI_QUOTA_EXHAUSTED");
            assertThat(e.getMessage()).isEqualTo(e.code());
            assertThat(e.getCause()).isNull();
        });
        assertThat(calls).hasValue(1);
    }

    @Test void rateLimitDoesNotAutomaticallyRetry() {
        respond(429, "{\"error\":{\"code\":\"rate_limit_exceeded\"}}");
        assertThatThrownBy(this::generate).hasMessage("AI_RATE_LIMITED");
        assertThat(calls).hasValue(1);
    }

    @Test void nonJsonRateLimitStillReportsRateLimit() {
        respond(429, "upstream temporarily throttled");
        assertThatThrownBy(this::generate).hasMessage("AI_RATE_LIMITED");
    }

    @Test void rejectsTrailingProviderPayloadInsteadOfAcceptingPartialJson() {
        respond(200, success() + "{}");
        assertThatThrownBy(this::generate).hasMessage("AI_INVALID_RESPONSE");
    }

    @Test void onlyAssistantMessageOutputMayBeUsed() {
        respond(200, success().replace("\"role\":\"assistant\"", "\"role\":\"user\""));
        assertThatThrownBy(this::generate).hasMessage("AI_INVALID_RESPONSE");
    }

    @Test void invalidInputNeverReachesProvider() throws Exception {
        var data = json.createObjectNode();
        var schema = schema();
        assertThatThrownBy(() -> client.generate(null, data, "test", schema)).hasMessage("AI_INVALID_INPUT");
        assertThatThrownBy(() -> client.generate(" ", data, "test", schema)).hasMessage("AI_INVALID_INPUT");
        assertThatThrownBy(() -> client.generate("test", null, "test", schema)).hasMessage("AI_INVALID_INPUT");
        assertThatThrownBy(() -> client.generate("test", json.createArrayNode(), "test", schema)).hasMessage("AI_INVALID_INPUT");
        assertThatThrownBy(() -> client.generate("test", data, null, schema)).hasMessage("AI_INVALID_INPUT");
        assertThatThrownBy(() -> client.generate("test", data, "invalid name", schema)).hasMessage("AI_INVALID_INPUT");
        assertThatThrownBy(() -> client.generate("test", data, "test", null)).hasMessage("AI_INVALID_INPUT");
        assertThatThrownBy(() -> client.generate("test", data, "test", json.createArrayNode())).hasMessage("AI_INVALID_INPUT");
        assertThat(calls).hasValue(0);
    }

    @ParameterizedTest @ValueSource(ints = {301, 307, 400, 401, 403, 404, 408, 500, 503})
    void rejectsHttpErrorsAndRedirectsWithoutRawMessages(int status) {
        respond(status, SECRET);
        String code = switch (status) {
            case 401, 403 -> "AI_AUTH_FAILED";
            case 408, 500, 503 -> "AI_UNAVAILABLE";
            default -> "AI_REQUEST_REJECTED";
        };
        assertThatThrownBy(this::generate).hasMessage(code).hasNoCause();
        assertThat(calls).hasValue(1);
    }

    @ParameterizedTest @ValueSource(strings = {"not-json", "null", "[]", "{}",
        "{\"status\":\"completed\",\"output\":[]}",
        "{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"not-json\"}]}]}"})
    void malformedSuccessDoesNotMasqueradeAsAnAnswer(String body) {
        respond(200, body);
        assertThatThrownBy(this::generate).hasMessage("AI_INVALID_RESPONSE");
    }

    @Test void refusalIsExplicit() {
        respond(200, "{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"refusal\",\"refusal\":\"private\"}]}]}");
        assertThatThrownBy(this::generate).hasMessage("AI_REFUSED");
    }

    @Test void incompleteAnswerIsNotUsed() {
        respond(200, "{\"status\":\"incomplete\"}");
        assertThatThrownBy(this::generate).hasMessage("AI_INCOMPLETE_RESPONSE");
    }

    @Test void disabledAndMissingKeyNeverCallProvider() {
        client = client(false, SECRET, 20, 3);
        assertThatThrownBy(this::generate).hasMessage("AI_DISABLED");
        client = client(true, "", 20, 3);
        assertThatThrownBy(this::generate).hasMessage("AI_NOT_CONFIGURED");
        assertThat(calls).hasValue(0);
    }

    @Test void processLimitCountsFailedAttemptsAndStopsFurtherSpending() {
        client = client(true, SECRET, 1, 3);
        respond(503, "down");
        assertThatThrownBy(this::generate).hasMessage("AI_UNAVAILABLE");
        assertThatThrownBy(this::generate).hasMessage("AI_REQUEST_LIMIT");
        assertThat(calls).hasValue(1);
    }

    @Test void oversizedRequestFailsBeforeNetworkOrBudgetConsumption() throws Exception {
        client = client(true, SECRET, 1, 3);
        assertThatThrownBy(() -> client.generate("x".repeat(16001), json.createObjectNode(), "check", schema()))
            .hasMessage("AI_INPUT_TOO_LARGE");
        respond(200, success());
        assertThat(generate().value().path("ok").asBoolean()).isTrue();
        assertThat(calls).hasValue(1);
    }

    @Test void oversizedResponseIsBounded() {
        respond(200, "x".repeat(65537));
        assertThatThrownBy(this::generate).hasMessage("AI_UNAVAILABLE");
    }

    @Test void timeoutHasNoProviderOrKeyDetails() {
        client = client(true, SECRET, 20, 1);
        server.createContext("/", exchange -> {
            calls.incrementAndGet();
            try { Thread.sleep(1500); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            exchange.close();
        });
        assertThatThrownBy(this::generate).hasMessage("AI_UNAVAILABLE").hasNoCause();
        assertThat(calls).hasValue(1);
    }
}
