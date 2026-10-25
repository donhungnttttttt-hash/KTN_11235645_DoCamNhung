package vn.syp.tms.release;

import java.util.Map;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.configuration.FluentConfiguration;

/** Separate migration job; never starts HTTP, Hibernate, bootstrap or schedulers. */
public final class MigrationCommand {
    private MigrationCommand() {}
    static FluentConfiguration configuration(Map<String,String> environment) {
        String includeDemo=environment.getOrDefault("TMS_MIGRATION_INCLUDE_DEMO","false");
        if(!"true".equals(includeDemo) && !"false".equals(includeDemo))
            throw new IllegalArgumentException("TMS_MIGRATION_INCLUDE_DEMO must be true or false");
        String[] locations="true".equals(includeDemo)
            ? new String[]{"classpath:db/migration","classpath:db/demo"}
            : new String[]{"classpath:db/migration"};
        return Flyway.configure().dataSource(required(environment,"TMS_DB_URL"),
            required(environment,"TMS_MIGRATION_USER"),required(environment,"TMS_MIGRATION_PASSWORD"))
            .locations(locations).cleanDisabled(true).baselineOnMigrate(false)
            .validateOnMigrate(true).outOfOrder(false).ignoreMigrationPatterns(new String[0]);
    }
    private static String required(Map<String,String> environment,String name) {
        String value=environment.get(name);
        if(value==null || value.isBlank())throw new IllegalArgumentException("Missing "+name);
        return value;
    }
    public static int migrate(Map<String,String> environment) {
        var flyway=configuration(environment).load();
        int applied=flyway.migrate().migrationsExecuted;
        ReleaseDatabaseConfig.validateReady(flyway);
        return applied;
    }
}
