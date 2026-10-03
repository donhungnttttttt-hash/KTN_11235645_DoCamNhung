package vn.syp.tms.release;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.*;

@Configuration
@Profile("release")
public class ReleaseDatabaseConfig {
    @Bean
    FlywayMigrationStrategy validateSchemaBeforeRuntime() {
        return ReleaseDatabaseConfig::validateReady;
    }
    static void validateReady(Flyway flyway) {
        flyway.validate();
        if(flyway.info().pending().length>0 || flyway.info().current()==null)
            throw new IllegalStateException("Schema is not ready; run the separate migration job first.");
    }
}
