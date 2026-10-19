package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class OpenAiEndpointConfigurationTest {
    @Test void defaultsToOpenAiWithoutProviderProperties() {
        new ApplicationContextRunner().withUserConfiguration(OpenAiConfiguration.class)
            .run(context -> assertThat(context.getBean(OpenAiConfiguration.class).responsesEndpoint())
                .hasToString("https://api.openai.com/v1/responses"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://caheoai.com/v1", "https://caheoai.com/v1/", "https://caheoai.com:443/v1"})
    void springConfigurationSelectsTheConfirmedCaheoResponsesEndpoint(String baseUrl) {
        new ApplicationContextRunner().withUserConfiguration(OpenAiConfiguration.class)
            .withPropertyValues("TMS_OPENAI_BASE_URL=" + baseUrl, "TMS_OPENAI_MODEL=gpt-5.6-luna")
            .run(context -> {
                assertThat(context).hasNotFailed();
                var config = context.getBean(OpenAiConfiguration.class);
                assertThat(config.responsesEndpoint()).hasToString("https://caheoai.com/v1/responses");
                assertThat(config.model()).isEqualTo("gpt-5.6-luna");
            });
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "http://caheoai.com/v1", "https://evil.example/v1",
        "https://caheoai.com.evil.example/v1", "https://caheoai.com@evil.example/v1",
        "https://private-secret@caheoai.com/v1", "https://caheoai.com:8443/v1",
        "https://caheoai.com/v1?key=private-secret", "https://caheoai.com/v1#private-secret",
        "https://caheoai.com/v1/../admin", "https://127.0.0.1/v1",
        "https://caheoai.com", "not-a-url"
    })
    void refusesUnapprovedOrAmbiguousDestinationsBeforeAnyProviderCall(String baseUrl) {
        new ApplicationContextRunner().withUserConfiguration(OpenAiConfiguration.class)
            .withPropertyValues("TMS_OPENAI_ENABLED=true", "OPENAI_API_KEY=test-only-key",
                "TMS_OPENAI_BASE_URL=" + baseUrl)
            .run(context -> {
                assertThat(context).hasFailed();
                assertThat(context.getStartupFailure()).hasRootCauseInstanceOf(IllegalArgumentException.class);
                assertThat(context.getStartupFailure().getCause().getMessage()).doesNotContain("private-secret", "test-only-key");
            });
    }
}
