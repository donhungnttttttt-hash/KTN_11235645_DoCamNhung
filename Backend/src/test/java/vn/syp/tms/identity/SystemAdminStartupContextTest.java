package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.SmartLifecycle;
import vn.syp.tms.identity.SystemAdminProvisioner.*;

class SystemAdminStartupContextTest {
    @TempDir Path temporary;
    final SystemAdminProvisioner service = mock(SystemAdminProvisioner.class);
    final ApplicationContextRunner context = new ApplicationContextRunner()
        .withUserConfiguration(SystemAdminStartupProvisioning.class)
        .withBean(SystemAdminProvisioner.class, () -> service);

    Path privateFile() throws Exception {
        var request = new ProvisionRequest(UUID.randomUUID().toString(), List.of(
            new Mapping(1, UUID.randomUUID().toString(), "old.first", "admin", "First admin"),
            new Mapping(2, UUID.randomUUID().toString(), "old.second", "admin2", "Second admin")
        ), List.of(), "Test-fixture-secret");
        var file = temporary.resolve("setup.json");
        new ObjectMapper().writeValue(file.toFile(), request);
        return file;
    }

    @Test void normalLocalStartupWithoutOptInDoesNotReadOrWriteAccounts() {
        context.withPropertyValues("spring.profiles.active=local")
            .run(ctx -> { assertThat(ctx).hasNotFailed(); verifyNoInteractions(service); });
    }

    @Test void nonLocalProfileCannotRunStartupProvisioning() {
        context.withPropertyValues("spring.profiles.active=production", "TMS_ADMIN_PROVISION_ON_STARTUP=true")
            .run(ctx -> { assertThat(ctx).hasNotFailed(); verifyNoInteractions(service); });
    }

    @Test void explicitLocalConfigIsAppliedBeforeLifecycleServicesStart() throws Exception {
        SmartLifecycle lifecycle = mock(SmartLifecycle.class);
        when(lifecycle.isAutoStartup()).thenReturn(true);
        context.withPropertyValues("spring.profiles.active=local", "TMS_ADMIN_PROVISION_ON_STARTUP=true",
                "TMS_ADMIN_PROVISION_FILE=" + privateFile())
            .withBean(SmartLifecycle.class, () -> lifecycle)
            .run(ctx -> {
                assertThat(ctx).hasNotFailed();
                var order = inOrder(service, lifecycle);
                order.verify(service).initializeOnce(any());
                order.verify(lifecycle).start();
            });
    }

    @Test void malformedPrivateInputStopsStartupWithoutExposingSecrets() throws Exception {
        var file = temporary.resolve("invalid.json");
        Files.writeString(file, "{\"password\":\"Private-fixture-marker\",broken}");
        context.withPropertyValues("spring.profiles.active=local", "TMS_ADMIN_PROVISION_ON_STARTUP=true",
                "TMS_ADMIN_PROVISION_FILE=" + file)
            .run(ctx -> {
                assertThat(ctx).hasFailed();
                assertThat(ctx.getStartupFailure()).hasMessageContaining("Local administrator setup failed")
                    .hasNoCause().hasMessageNotContaining("Private-fixture-marker");
                verifyNoInteractions(service);
            });
    }

    @Test void conflictingBootstrapModesFailBeforeChangingAccounts() throws Exception {
        context.withPropertyValues("spring.profiles.active=local", "TMS_ADMIN_PROVISION_ON_STARTUP=true",
                "tms.bootstrap.enabled=true", "TMS_ADMIN_PROVISION_FILE=" + privateFile())
            .run(ctx -> { assertThat(ctx).hasFailed(); verifyNoInteractions(service); });
    }

    @Test void provisioningFailureStopsStartupWithoutLeakingItsCause() throws Exception {
        when(service.initializeOnce(any())).thenThrow(new IllegalArgumentException("Private-database-marker"));
        context.withPropertyValues("spring.profiles.active=local", "TMS_ADMIN_PROVISION_ON_STARTUP=true",
                "TMS_ADMIN_PROVISION_FILE=" + privateFile())
            .run(ctx -> assertThat(ctx.getStartupFailure()).hasMessageContaining("Local administrator setup failed")
                .hasNoCause().hasMessageNotContaining("Private-database-marker"));
    }
}
