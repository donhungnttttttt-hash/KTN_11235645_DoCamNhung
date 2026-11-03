package vn.syp.tms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TmsApplication {
    public static void main(String[] args) {
        if(java.util.Arrays.asList(args).contains("--tms-provision-admins")){
            if(args.length!=1)throw new IllegalArgumentException("Provision mode accepts only --tms-provision-admins.");
            try{vn.syp.tms.identity.SystemAdminProvisionRunner.run(System.getenv());}
            catch(Exception failure){
                // Do not print Jackson/JDBC exception messages: they can contain private input.
                System.err.println("Administrator provisioning failed; verify private mapping, targets and preflight fingerprint. HTTP was not started.");System.exit(1);
            }
            return;
        }
        if (java.util.Arrays.asList(args).contains("--tms-migrate")) {
            if (args.length != 1) throw new IllegalArgumentException("Migration mode accepts only --tms-migrate.");
            try {
                int applied = vn.syp.tms.release.MigrationCommand.migrate(System.getenv());
                System.out.println("Migration validated; applied " + applied + " migration(s).");
            } catch (Exception exception) {
                System.err.println("Migration failed. Inspect restricted migration logs; runtime was not started.");
                System.exit(1);
            }
            return;
        }
        SpringApplication.run(TmsApplication.class, args);
    }
}
