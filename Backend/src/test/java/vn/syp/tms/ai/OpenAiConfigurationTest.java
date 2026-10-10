package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class OpenAiConfigurationTest {
    @Test void optionalConnectionDoesNotRequireCredentialsOrDatabaseAtStartup() {
        context().run(ctx -> {
            assertThat(ctx).hasNotFailed();
            var config = ctx.getBean(OpenAiConfiguration.class);
            assertThat(config.enabled()).isFalse();
            assertThat(config.configured()).isFalse();
            assertThat(config.model()).isEqualTo("gpt-4.1-mini");
            assertThat(ctx.getBean(OpenAiResponsesClient.class)).isNotNull();
        });
    }

    @Test void usesSpringPropertiesAndKeepsSecretOutOfToString() {
        context().withPropertyValues("OPENAI_API_KEY=test-only-secret", "TMS_OPENAI_ENABLED=true",
                "TMS_OPENAI_MODEL=gpt-4.1-mini", "TMS_OPENAI_TIMEOUT_SECONDS=5",
                "TMS_OPENAI_MAX_OUTPUT_TOKENS=128", "TMS_OPENAI_REQUEST_LIMIT=2").run(ctx -> {
            assertThat(ctx).hasNotFailed();
            var config = ctx.getBean(OpenAiConfiguration.class);
            assertThat(config.enabled()).isTrue();
            assertThat(config.configured()).isTrue();
            assertThat(config.timeout()).hasSeconds(5);
            assertThat(config.maxOutputTokens()).isEqualTo(128);
            assertThat(config.requestLimit()).isEqualTo(2);
            assertThat(config.toString()).doesNotContain("test-only-secret");
        });
    }

    @Test void rejectsInvalidConfigWithoutPrintingValues() {
        assertThatThrownBy(() -> config("private\nkey", "gpt-4.1-mini", 20, 512, 20))
            .isInstanceOf(IllegalArgumentException.class).hasMessageNotContaining("private").hasNoCause();
        assertThatThrownBy(() -> config("key", "https://bad.example", 20, 512, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> config("key", "gpt-4.1-mini", 0, 512, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> config("key", "gpt-4.1-mini", 31, 512, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> config("key", "gpt-4.1-mini", 20, 15, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> config("key", "gpt-4.1-mini", 20, 2049, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> config("key", "gpt-4.1-mini", 20, 512, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> config("key", "gpt-4.1-mini", 20, 512, 101)).isInstanceOf(IllegalArgumentException.class);
    }

    private OpenAiConfiguration config(String key, String model, int timeout, int tokens, int limit) {
        return new OpenAiConfiguration(true, key, model, timeout, tokens, limit);
    }

    private ApplicationContextRunner context() {
        return new ApplicationContextRunner().withBean(ObjectMapper.class)
                .withUserConfiguration(OpenAiConfiguration.class, OpenAiResponsesClient.class);
    }
}
