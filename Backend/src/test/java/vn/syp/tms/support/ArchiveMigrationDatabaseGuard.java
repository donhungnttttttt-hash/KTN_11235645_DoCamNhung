package vn.syp.tms.support;

import com.fasterxml.jackson.databind.*;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import static vn.syp.tms.support.CurrentWorkflowDatabaseGuard.*;

/** Separate explicit capability for the AR-06 migration rehearsal; never used by integration runner. */
public final class ArchiveMigrationDatabaseGuard {
    private static final ObjectMapper JSON=new ObjectMapper();
    public record Target(JsonNode manifest,JsonNode receipt,Path evidence,String url,String user,String password,String[] locations) {
        public Connection connect()throws SQLException{return DriverManager.getConnection(url,user,password);}
        public Flyway flyway(){return Flyway.configure().dataSource(url,user,password).locations(locations).target("40").cleanDisabled(true).load();}
    }
    private ArchiveMigrationDatabaseGuard(){}
    public static Target verify(Map<String,String> env)throws Exception {
        String mode=env.get("TMS_ARCHIVE_MIGRATION_MODE");require(Set.of("fresh","upgrade").contains(Objects.toString(mode,"")),"Explicit migration mode required");
        byte[] bytes=Files.readAllBytes(safePath(env.get("TMS_ARCHIVE_MIGRATION_MANIFEST")));
        require(hash(bytes).equals(env.get("TMS_ARCHIVE_MIGRATION_MANIFEST_SHA256")),"Manifest digest mismatch");
        JsonNode m=JSON.readTree(bytes),t=m.path("target");var fields=new HashSet<String>();m.fieldNames().forEachRemaining(fields::add);
        require(fields.equals(Set.of("formatVersion","purpose","mode","target","provenance")),"Unexpected manifest fields");
        require(m.path("formatVersion").asInt()==1&&m.path("purpose").asText().equals("ARCHIVE_EXCEPTION_MIGRATION")&&m.path("mode").asText().equals(mode),"Manifest mode/purpose mismatch");
        String host=t.path("host").asText(),schema=t.path("schema").asText(),version=t.path("flywayVersion").asText();int port=t.path("port").asInt();
        require(List.of("127.0.0.1","localhost").contains(host)&&schema.matches("tms_docstest_[a-f0-9]{12}")&&t.path("port").isIntegralNumber()&&port>0&&port<=65535&&t.path("serverUuid").asText().matches("(?i)[a-f0-9-]{36}"),"Unsafe migration target");
        String location=t.path("migrationLocations").toString();boolean demo=location.equals("[\"classpath:db/migration\",\"classpath:db/demo\"]");
        require(demo||location.equals("[\"classpath:db/migration\"]"),"Unexpected migration locations");
        require(mode.equals("fresh")?version.equals("0"):(version.equals("39")||(demo?version.equals("34"):version.equals("33"))),"Unsupported source version/profile");
        byte[] provenance=Files.readAllBytes(safePath(m.path("provenance").path("receiptPath").asText()));require(hash(provenance).equals(m.path("provenance").path("receiptSha256").asText()),"Provenance digest mismatch");
        JsonNode receipt=JSON.readTree(provenance);require(receipt.path("formatVersion").asInt()==1&&receipt.path("purpose").asText().equals("ARCHIVE_EXCEPTION_MIGRATION_PROVISION")&&receipt.path("createdNewSchema").asBoolean()&&receipt.path("target").equals(t)&&receipt.path("migrations").isArray(),"Invalid migration provenance");
        java.time.Instant.parse(receipt.path("preparedAt").asText());Path owner=safePath(receipt.path("ownerRoot").asText()),evidence=safePath(env.get("TMS_ARCHIVE_MIGRATION_EVIDENCE_DIR"));
        require(Files.isDirectory(evidence)&&evidence.startsWith(owner.resolve("var/arena-followup")),"Owned migration evidence directory required");
        String url="jdbc:mysql://"+host+":"+port+"/"+schema+"?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
        require(url.equals(env.get("TMS_TEST_DB_URL")),"Canonical migration URL required");
        var locations=new ArrayList<String>();t.path("migrationLocations").forEach(n->locations.add(n.asText()));
        var target=new Target(m,receipt,evidence,url,Objects.requireNonNull(env.get("TMS_TEST_DB_USER")),Objects.requireNonNull(env.get("TMS_TEST_DB_PASSWORD")),locations.toArray(String[]::new));
        try(var c=target.connect()) {
            c.setReadOnly(true);
            try(var s=c.createStatement();var r=s.executeQuery("SELECT DATABASE(),@@server_uuid")){require(r.next()&&schema.equals(r.getString(1))&&t.path("serverUuid").asText().equals(r.getString(2)),"Connected target mismatch");}
            if(mode.equals("fresh")) {
                require(receipt.path("migrations").isEmpty(),"Fresh provenance contains migrations");
                try(var s=c.createStatement();var r=s.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")){r.next();require(r.getLong(1)==0,"Fresh target is not empty");}
            } else {
                var expected=receipt.path("migrations");int index=0;
                try(var s=c.createStatement();var r=s.executeQuery("SELECT version,script,checksum,success FROM flyway_schema_history ORDER BY installed_rank")) {
                    while(r.next()){require(index<expected.size(),"Unexpected migration");var item=expected.get(index++);require(r.getBoolean(4)&&item.path("version").asText().equals(r.getString(1))&&item.path("script").asText().equals(r.getString(2))&&Objects.equals(item.path("checksum").isNull()?null:item.path("checksum").asInt(),r.getObject(3,Integer.class)),"Migration history mismatch");}
                }
                require(index>0&&index==expected.size()&&version.equals(expected.get(index-1).path("version").asText()),"Source version mismatch");
            }
        }
        // A second invocation cannot silently rerun/seal an already-used evidence directory.
        Files.writeString(evidence.resolve("guard.json"),JSON.writeValueAsString(Map.of("manifestSha256",hash(bytes),"mode",mode,"sourceVersion",version)),StandardOpenOption.CREATE_NEW);
        // Pending versions are expected only in this explicit upgrade rehearsal.
        // Applied source checksums must still validate; final validation permits no pending migrations.
        if(!mode.equals("fresh"))Flyway.configure().dataSource(target.url(),target.user(),target.password()).locations(target.locations()).cleanDisabled(true).ignoreMigrationPatterns("*:pending").load().validate();
        return target;
    }
}
