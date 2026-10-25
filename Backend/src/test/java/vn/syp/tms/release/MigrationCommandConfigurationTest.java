package vn.syp.tms.release;

import static org.assertj.core.api.Assertions.*;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Configuration-only checks: no database connection or application context. */
class MigrationCommandConfigurationTest {
    private Map<String,String> settings() {
        return new HashMap<>(Map.of("TMS_DB_URL","jdbc:mysql://127.0.0.1:3307/isolated_configuration_test",
            "TMS_MIGRATION_USER","migrator","TMS_MIGRATION_PASSWORD","configuration-test-only"));
    }

    @Test void releaseDefaultDoesNotResolvePublicDemoMigrations() {
        var config=MigrationCommand.configuration(settings());
        assertThat(config.getLocations()).extracting(location->location.getDescriptor()).containsExactly("classpath:db/migration");
        assertThat(config.isCleanDisabled()).isTrue();
        assertThat(config.isBaselineOnMigrate()).isFalse();
        assertThat(config.isOutOfOrder()).isFalse();
        assertThat(config.getIgnoreMigrationPatterns()).isEmpty();
    }

    @Test void localInitializerExplicitlyIncludesSqlAndJavaDemoLocation() {
        var settings=settings();settings.put("TMS_MIGRATION_INCLUDE_DEMO","true");
        var config=MigrationCommand.configuration(settings);
        assertThat(config.getLocations()).extracting(location->location.getDescriptor())
            .containsExactlyInAnyOrder("classpath:db/migration","classpath:db/demo");
        assertThat(config.isOutOfOrder()).isFalse();
        assertThat(config.isCleanDisabled()).isTrue();
    }

    @Test void falseKeepsReleaseLocations() {
        var settings=settings();settings.put("TMS_MIGRATION_INCLUDE_DEMO","false");
        assertThat(MigrationCommand.configuration(settings).getLocations()).extracting(location->location.getDescriptor())
            .containsExactly("classpath:db/migration");
    }

    @Test void invalidFlagFailsClosedWithoutEchoingInput() {
        for(String value:new String[]{"TRUE","yes","1","","true ","private-value"}) {
            var settings=settings();settings.put("TMS_MIGRATION_INCLUDE_DEMO",value);
            assertThatThrownBy(()->MigrationCommand.configuration(settings))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("TMS_MIGRATION_INCLUDE_DEMO must be true or false");
        }
    }
}
