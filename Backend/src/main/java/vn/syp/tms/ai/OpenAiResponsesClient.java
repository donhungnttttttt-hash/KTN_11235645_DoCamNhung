package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.*;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/** Stateless server-side transport. Callers must authorize, minimize data and validate domain output. */
@Component
public class OpenAiResponsesClient {
    public record Output(JsonNode value, String responseId, String model, int inputTokens, int outputTokens) {}

    /** Sanitized local code only: no raw body, HTTP headers, key or nested provider exception. */
    public static class Failure extends RuntimeException {
        public Failure(String code) { super(code); }
        public String code() { return getMessage(); }
    }

    private static final URI ENDPOINT = URI.create("https://api.openai.com/v1/responses");
    static final int MAX_REQUEST_BYTES = 16000;
    private final OpenAiConfiguration config;
    private final ObjectMapper json;
    private final HttpClient http;
    private final URI endpoint;
    private final Clock clock;
    private long budgetMinute=-1;
    private int attempted;

    @Autowired
    public OpenAiResponsesClient(OpenAiConfiguration config, ObjectMapper json) {
        this(config, json, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3))
                .followRedirects(HttpClient.Redirect.NEVER).build(), ENDPOINT);
    }

    // Package-private injection supports a localhost fake; runtime endpoint is not configurable.
    OpenAiResponsesClient(OpenAiConfiguration config, ObjectMapper json, HttpClient http, URI endpoint) {
        this(config,json,http,endpoint,Clock.systemUTC());
    }
    OpenAiResponsesClient(OpenAiConfiguration config,ObjectMapper json,HttpClient http,URI endpoint,Clock clock) {
        this.config = config;
        this.json = json;
        this.http = http;
        this.endpoint = endpoint;
        this.clock=clock;
    }

    static byte[] requestBytes(OpenAiConfiguration config,ObjectMapper json,String instructions,JsonNode data,String schemaName,JsonNode schema) throws java.io.IOException {
        var payload=json.createObjectNode();
        payload.put("model",config.model()).put("store",false).put("max_output_tokens",config.maxOutputTokens());
        payload.put("instructions",instructions).put("input",json.writeValueAsString(data));
        var format=payload.putObject("text").putObject("format");
        format.put("type","json_schema").put("name",schemaName).put("strict",true).set("schema",schema);
        return json.writeValueAsBytes(payload);
    }
    private synchronized void acquireBudget() {
        long minute=clock.instant().getEpochSecond()/60;
        if(minute!=budgetMinute){budgetMinute=minute;attempted=0;}
        if(attempted>=config.requestLimit())throw failure("AI_REQUEST_LIMIT");
        attempted++;
    }

    /** Only call after role/project checks. Schema and instructions must be server-owned. */
    public Output generate(String instructions, JsonNode data, String schemaName, JsonNode schema) {
        if (!config.enabled()) throw failure("AI_DISABLED");
        if (!config.configured()) throw failure("AI_NOT_CONFIGURED");
        if (instructions == null || instructions.isBlank() || data == null || !data.isObject()
                || schemaName == null || !schemaName.matches("[A-Za-z0-9_-]{1,64}")
                || schema == null || !schema.isObject()) throw failure("AI_INVALID_INPUT");
        CompletableFuture<HttpResponse<byte[]>> future = null;
        try {
            byte[] body = requestBytes(config,json,instructions,data,schemaName,schema);
            if (body.length > MAX_REQUEST_BYTES) throw failure("AI_INPUT_TOO_LARGE");
            // A failed network attempt can still cost tokens. Never refund or automatically retry.
            acquireBudget();
            var request = HttpRequest.newBuilder(endpoint).timeout(config.timeout())
                    .header("Authorization", "Bearer " + config.apiKey())
                    .header("Content-Type", "application/json").header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body)).build();
            future = http.sendAsync(request, info -> new LimitedBody());
            var response = future.get(config.timeout().toMillis(), TimeUnit.MILLISECONDS);
            int status = response.statusCode();
            if (status == 429) {
                throw failure(quotaExhausted(response.body()) ? "AI_QUOTA_EXHAUSTED" : "AI_RATE_LIMITED");
            }
            if (status == 401 || status == 403) throw failure("AI_AUTH_FAILED");
            if (status == 408 || status >= 500) throw failure("AI_UNAVAILABLE");
            if (status != 200) throw failure("AI_REQUEST_REJECTED");
            return output(read(response.body()));
        } catch (Failure e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw failure("AI_INTERRUPTED");
        } catch (Exception e) {
            throw failure("AI_UNAVAILABLE");
        } finally {
            if (future != null && !future.isDone()) future.cancel(true);
        }
    }

    private JsonNode read(byte[] bytes) {
        try {
            JsonNode node = json.reader().with(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .readTree(bytes);
            if (node == null || !node.isObject()) throw failure("AI_INVALID_RESPONSE");
            return node;
        } catch (java.io.IOException e) {
            throw failure("AI_INVALID_RESPONSE");
        }
    }

    private boolean quotaExhausted(byte[] bytes) {
        try {
            var error = read(bytes).path("error");
            return "insufficient_quota".equals(error.path("type").asText())
                    || "insufficient_quota".equals(error.path("code").asText())
                    || "credit_balance_exhausted".equals(error.path("code").asText());
        } catch (Failure e) {
            return false;
        }
    }

    private Output output(JsonNode root) {
        if ("incomplete".equals(root.path("status").asText())) throw failure("AI_INCOMPLETE_RESPONSE");
        if (!"completed".equals(root.path("status").asText()) || !root.path("output").isArray())
            throw failure("AI_INVALID_RESPONSE");
        String text = null;
        for (var item : root.path("output")) {
            for (var content : item.path("content")) {
                if ("refusal".equals(content.path("type").asText())) throw failure("AI_REFUSED");
                if ("output_text".equals(content.path("type").asText())) {
                    if (text != null || !content.path("text").isTextual()
                            || !"message".equals(item.path("type").asText())
                            || !"assistant".equals(item.path("role").asText())) throw failure("AI_INVALID_RESPONSE");
                    text = content.path("text").asText();
                }
            }
        }
        var usage = root.path("usage");
        if (text == null || !root.path("id").isTextual() || !root.path("model").isTextual()
                || !usage.path("input_tokens").isIntegralNumber() || !usage.path("input_tokens").canConvertToInt()
                || !usage.path("output_tokens").isIntegralNumber() || !usage.path("output_tokens").canConvertToInt()
                || usage.path("input_tokens").asInt() < 0 || usage.path("output_tokens").asInt() < 0)
            throw failure("AI_INVALID_RESPONSE");
        return new Output(read(text.getBytes(java.nio.charset.StandardCharsets.UTF_8)), root.path("id").asText(),
                root.path("model").asText(), usage.path("input_tokens").asInt(), usage.path("output_tokens").asInt());
    }

    private static Failure failure(String code) { return new Failure(code); }

    private static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> body = new CompletableFuture<>();
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private Flow.Subscription subscription;

        public CompletionStage<byte[]> getBody() { return body; }
        public void onSubscribe(Flow.Subscription value) { subscription = value; value.request(1); }
        public void onNext(List<ByteBuffer> buffers) {
            for (var buffer : buffers) {
                if (bytes.size() + buffer.remaining() > 65536) {
                    subscription.cancel();
                    body.completeExceptionally(new IllegalStateException("Response too large"));
                    return;
                }
                byte[] part = new byte[buffer.remaining()];
                buffer.get(part);
                bytes.writeBytes(part);
            }
            subscription.request(1);
        }
        public void onError(Throwable error) { body.completeExceptionally(error); }
        public void onComplete() { body.complete(bytes.toByteArray()); }
    }
}
