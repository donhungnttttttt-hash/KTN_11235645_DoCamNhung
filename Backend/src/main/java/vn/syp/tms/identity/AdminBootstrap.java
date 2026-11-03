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
    private final SystemAdminProvisioner users;
    private final Environment environment;
    public AdminBootstrap(SystemAdminProvisioner users, Environment environment) { this.users = users; this.environment = environment; }
    @Override public void run(ApplicationArguments arguments) {
        String username = environment.getProperty("TMS_BOOTSTRAP_USERNAME", "");
        String password = environment.getProperty("TMS_BOOTSTRAP_PASSWORD", "");
        String displayName = environment.getProperty("TMS_BOOTSTRAP_DISPLAY_NAME", "Quản trị viên");
        boolean created = users.bootstrap(username,displayName,password,
            environment.getProperty("TMS_BOOTSTRAP_SECOND_USERNAME",""),environment.getProperty("TMS_BOOTSTRAP_SECOND_DISPLAY_NAME",""),environment.getProperty("TMS_BOOTSTRAP_SECOND_PASSWORD",""));
        LoggerFactory.getLogger(AdminBootstrap.class).info(created ? "Two system administrators created from private configuration." : "Two registered administrators verified; credentials unchanged.");
    }
}
