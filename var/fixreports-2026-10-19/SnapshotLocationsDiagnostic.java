import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;

/** Root-reviewed diagnostic only; no migrate/repair/clean, Spring, provider or scheduler. */
class SnapshotLocationsDiagnostic {
    static final String SCHEMA="tms_docstest_4106ddac5f8d";
    static final String BACKUP_SHA="dd945970478c48c4eb550fdda6fa2b0ade9b19d162b1556c6a31a674ad386f73";
    static void require(boolean value){if(!value)throw new IllegalStateException("SNAPSHOT_DIAGNOSTIC_GUARD_REFUSED");}
    static String code(org.flywaydb.core.api.ErrorDetails details){String value=details==null?"NONE":details.errorCode.toString();return value.matches("[A-Z_]{1,100}")?value:"UNEXPECTED_CODE";}
    static Map<String,Object> validate(String url,String user,String password,String...locations){
        var result=Flyway.configure().dataSource(url,user,password).locations(locations).target("33").cleanDisabled(true).createSchemas(false).initSql("SET SESSION TRANSACTION READ ONLY").load().validateWithResult();
        var invalid=new ArrayList<Map<String,String>>();for(var migration:result.invalidMigrations)invalid.add(Map.of("version",migration.version!=null&&migration.version.matches("[0-9.]{1,32}")?migration.version:"UNVERSIONED","code",code(migration.errorDetails)));
        return Map.of("locations",List.of(locations),"validationSuccessful",result.validationSuccessful,"validatedMigrationCount",result.validateCount,"overallCode",code(result.errorDetails),"invalidMigrations",invalid);
    }
    public static void main(String[] args)throws Exception{
        try{
            String url=System.getenv("TMS_TEST_DB_URL"),user=System.getenv("TMS_TEST_DB_USER"),password=System.getenv("TMS_TEST_DB_PASSWORD");
            String suffix=":3307/"+SCHEMA+"?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED";
            require(("jdbc:mysql://127.0.0.1"+suffix).equals(url)||("jdbc:mysql://localhost"+suffix).equals(url));
            require(BACKUP_SHA.equals(System.getenv("TMS_SNAPSHOT_BACKUP_SHA256")));
            try(var c=DriverManager.getConnection(url,user,password)){
                c.setReadOnly(true);
                try(var s=c.prepareStatement("SELECT DATABASE(),(SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'),(SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1)");var r=s.executeQuery()){require(r.next()&&SCHEMA.equals(r.getString(1))&&r.getInt(2)==76&&r.getInt(3)==30);}
            }
            var result=Map.of("schema",SCHEMA,"preVersion",30,"oldTables",76,"mode","READ_ONLY_VALIDATE_ONLY_NO_MIGRATION","defaultLocations",validate(url,user,password,"classpath:db/migration"),"correctedLocations",validate(url,user,password,"classpath:db/migration","classpath:db/demo"));
            byte[] data=new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsBytes(result);
            Files.write(Path.of("var/fixreports-2026-10-19/snapshot-location-validation.json"),data,StandardOpenOption.CREATE_NEW,StandardOpenOption.WRITE);
            System.out.println(new String(data,java.nio.charset.StandardCharsets.UTF_8));
        }catch(Throwable failure){throw new AssertionError("Snapshot read-only diagnostic refused or failed: "+failure.getClass().getSimpleName());}
    }
}
