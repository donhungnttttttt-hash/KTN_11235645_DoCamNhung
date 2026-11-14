package vn.syp.tms.identity;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Explicit local setup after Flyway and before the web server accepts requests. */
@Component
@Profile("local")
@ConditionalOnProperty(name = "TMS_ADMIN_PROVISION_ON_STARTUP", havingValue = "true")
@DependsOnDatabaseInitialization
public class SystemAdminStartupProvisioning implements SmartInitializingSingleton {
    private final SystemAdminProvisioner provisioner;
    private final Environment environment;

    public SystemAdminStartupProvisioning(SystemAdminProvisioner provisioner, Environment environment) {
        this.provisioner = provisioner;
        this.environment = environment;
    }

    @Override public void afterSingletonsInstantiated() {
        boolean applied;
        try {
            if (environment.getProperty("tms.bootstrap.enabled", Boolean.class, false))
                throw new IllegalArgumentException("Choose either existing-account setup or fresh bootstrap.");
            var path = Path.of(environment.getRequiredProperty("TMS_ADMIN_PROVISION_FILE"));
            byte[] input;
            try (var stream = Files.newInputStream(path)) {
                input = stream.readNBytes(65537);
            }
            if (input.length > 65536) throw new IllegalArgumentException("Private setup file is too large.");
            var request = new ObjectMapper().readValue(input, SystemAdminProvisioner.ProvisionRequest.class);
            applied = provisioner.initializeOnce(request);
        } catch (Exception failure) {
            // Parser and JDBC causes may contain private input; never attach them to the startup log.
            throw new IllegalStateException("Local administrator setup failed. Check the private mapping file, account conflicts and existing registry. Credentials were not logged.");
        }
        LoggerFactory.getLogger(getClass()).info(applied
            ? "Local administrator setup completed; two existing accounts registered."
            : "Local administrator setup already completed; accounts and passwords unchanged.");
    }
}
