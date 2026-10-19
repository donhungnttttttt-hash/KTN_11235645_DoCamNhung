package vn.syp.tms.ai;

import java.time.Duration;
import java.net.URI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Server-only configuration. Deliberately not a record: toString must never contain a key. */
@Component
public class OpenAiConfiguration {
    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final Duration timeout;
    private final int maxOutputTokens;
    private final int requestLimit;
    private final URI responsesEndpoint;

    @Autowired
    public OpenAiConfiguration(@Value("${TMS_OPENAI_ENABLED:false}") boolean enabled,
            @Value("${OPENAI_API_KEY:}") String apiKey,
            @Value("${TMS_OPENAI_MODEL:gpt-4.1-mini}") String model,
            @Value("${TMS_OPENAI_TIMEOUT_SECONDS:20}") int timeoutSeconds,
            @Value("${TMS_OPENAI_MAX_OUTPUT_TOKENS:1536}") int maxOutputTokens,
            @Value("${TMS_OPENAI_REQUEST_LIMIT:20}") int requestLimit,
            @Value("${TMS_OPENAI_BASE_URL:https://api.openai.com/v1}") String baseUrl) {
        if (apiKey == null || apiKey.length() > 512 || apiKey.chars().anyMatch(Character::isWhitespace)
                || model == null || !model.matches("[a-zA-Z0-9._-]{1,100}")
                || timeoutSeconds < 1 || timeoutSeconds > 30
                || maxOutputTokens < 16 || maxOutputTokens > 2048
                || requestLimit < 1 || requestLimit > 100) {
            throw new IllegalArgumentException("Invalid OpenAI configuration; inspect local settings without logging secrets.");
        }
        this.enabled = enabled;
        this.apiKey = apiKey;
        this.model = model;
        this.timeout = Duration.ofSeconds(timeoutSeconds);
        this.maxOutputTokens = maxOutputTokens;
        this.requestLimit = requestLimit;
        this.responsesEndpoint = responsesEndpoint(baseUrl);
    }

    public OpenAiConfiguration(boolean enabled, String apiKey, String model, int timeoutSeconds,
            int maxOutputTokens, int requestLimit) {
        this(enabled, apiKey, model, timeoutSeconds, maxOutputTokens, requestLimit, "https://api.openai.com/v1");
    }

    private static URI responsesEndpoint(String value) {
        try {
            URI base = URI.create(value);
            String host = base.getHost() == null ? "" : base.getHost().toLowerCase(java.util.Locale.ROOT);
            if (!"https".equals(base.getScheme()) || !java.util.Set.of("api.openai.com", "caheoai.com").contains(host)
                    || base.getUserInfo() != null || base.getQuery() != null || base.getFragment() != null
                    || (base.getPort() != -1 && base.getPort() != 443)
                    || !("/v1".equals(base.getRawPath()) || "/v1/".equals(base.getRawPath()))) {
                throw new IllegalArgumentException();
            }
            return URI.create("https://" + host + "/v1/responses");
        } catch (Exception ignored) {
            throw new IllegalArgumentException("Invalid AI API base URL; use an approved HTTPS provider with the /v1 path.");
        }
    }

    public boolean enabled() { return enabled; }
    public boolean configured() { return !apiKey.isEmpty(); }
    String apiKey() { return apiKey; }
    public String model() { return model; }
    public Duration timeout() { return timeout; }
    public int maxOutputTokens() { return maxOutputTokens; }
    public int requestLimit() { return requestLimit; }
    public URI responsesEndpoint() { return responsesEndpoint; }
}
