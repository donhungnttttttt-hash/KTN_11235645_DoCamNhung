package vn.syp.tms.identity;

import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "tms.bootstrap.enabled", havingValue = "true")
public class AdminBootstrap implements ApplicationRunner {
    private final IdentityService users;
    private final Environment environment;
    public AdminBootstrap(IdentityService users, Environment environment) { this.users = users; this.environment = environment; }
    @Override public void run(ApplicationArguments arguments) {
        String username = environment.getProperty("TMS_BOOTSTRAP_USERNAME", "");
        String password = environment.getProperty("TMS_BOOTSTRAP_PASSWORD", "");
        String displayName = environment.getProperty("TMS_BOOTSTRAP_DISPLAY_NAME", "Quản trị viên");
        if (!username.matches("[A-Za-z0-9][A-Za-z0-9._-]{2,63}") || password.length() < 12 || password.length() > 128
                || displayName.isBlank() || displayName.length() > 100) {
            throw new IllegalStateException("Bootstrap requires valid TMS_BOOTSTRAP_USERNAME/PASSWORD/DISPLAY_NAME; no default password is provided.");
        }
        boolean created = users.bootstrap(username, password, displayName);
        LoggerFactory.getLogger(AdminBootstrap.class).info(created ? "Initial administrator created from environment." : "Administrator bootstrap skipped: accounts already exist.");
    }
}
