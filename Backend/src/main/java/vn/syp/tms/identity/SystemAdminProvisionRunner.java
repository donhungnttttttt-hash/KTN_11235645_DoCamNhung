package vn.syp.tms.identity;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.security.crypto.password.*;

/** Non-web command: creates no Spring application context, workers, schedulers or HTTP listener. */
public final class SystemAdminProvisionRunner {
    private SystemAdminProvisionRunner(){}
    public static void run(Map<String,String> env)throws Exception {
        if(!"identity-provision".equals(env.get("SPRING_PROFILES_ACTIVE")))throw new IllegalArgumentException("identity-provision profile required.");
        var path=Path.of(required(env,"TMS_ADMIN_PROVISION_FILE"));
        if(!Files.isRegularFile(path)||Files.size(path)>65536)throw new IllegalArgumentException("Invalid private provisioning file.");
        var request=new ObjectMapper().readValue(Files.readAllBytes(path),SystemAdminProvisioner.ProvisionRequest.class);
        var dataSource=new DriverManagerDataSource(required(env,"TMS_DB_URL"),required(env,"TMS_MIGRATION_USER"),required(env,"TMS_MIGRATION_PASSWORD"));
        var db=new JdbcTemplate(dataSource);
        var encoder=new DelegatingPasswordEncoder("pbkdf2-v5_8",Map.of("pbkdf2-v5_8",Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8()));
        var provisioner=new SystemAdminProvisioner(db,encoder,new IdentityAudit(db),new DataSourceTransactionManager(dataSource));
        String action=env.getOrDefault("TMS_ADMIN_PROVISION_ACTION","preflight");
        var result=switch(action){
            case "preflight" -> provisioner.preflight(request);
            case "apply" -> provisioner.apply(request,required(env,"TMS_ADMIN_PROVISION_FINGERPRINT"));
            default -> throw new IllegalArgumentException("Only preflight/apply supported.");
        };
        System.out.println(new ObjectMapper().writeValueAsString(result));
    }
    private static @org.springframework.lang.NonNull String required(Map<String,String> env,String name){String value=env.get(name);if(value==null||value.isBlank())throw new IllegalArgumentException("Missing "+name);return value;}
}
