package vn.syp.tms.ai;

import java.time.Duration;
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

    public OpenAiConfiguration(@Value("${TMS_OPENAI_ENABLED:false}") boolean enabled,
            @Value("${OPENAI_API_KEY:}") String apiKey,
            @Value("${TMS_OPENAI_MODEL:gpt-4.1-mini}") String model,
            @Value("${TMS_OPENAI_TIMEOUT_SECONDS:20}") int timeoutSeconds,
            @Value("${TMS_OPENAI_MAX_OUTPUT_TOKENS:1536}") int maxOutputTokens,
            @Value("${TMS_OPENAI_REQUEST_LIMIT:20}") int requestLimit) {
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
    }

    public boolean enabled() { return enabled; }
    public boolean configured() { return !apiKey.isEmpty(); }
    String apiKey() { return apiKey; }
    public String model() { return model; }
    public Duration timeout() { return timeout; }
    public int maxOutputTokens() { return maxOutputTokens; }
    public int requestLimit() { return requestLimit; }
}
