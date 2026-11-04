package vn.syp.tms.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.DriverManager;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.springframework.test.context.DynamicPropertyRegistry;

/** Fail closed before Spring can initialize SQL, migration, fixtures or startup storage cleanup. */
public final class CurrentWorkflowDatabaseGuard {
    private static final ObjectMapper JSON=new ObjectMapper();
    private CurrentWorkflowDatabaseGuard() {}
    record Verified(JsonNode manifest,JsonNode receipt,Path evidence,Path attachments,String url) {}
    static void require(boolean condition,String message) {if(!condition)throw new IllegalStateException(message);}
    static String hash(byte[] data)throws Exception {return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));}
    static Path safePath(String text)throws Exception {
        Path path=Path.of(text).toAbsolutePath().normalize();
        require(Path.of(text).isAbsolute(),"Absolute owned path required");
        for(Path current=path;current!=null;current=current.getParent())
            if(Files.exists(current,LinkOption.NOFOLLOW_LINKS))require(!Files.isSymbolicLink(current)&&current.toRealPath().equals(current),"Shared or escaping storage path rejected");
        return path;
    }
    static Verified inspect(Map<String,String> env) {
        try {
            require(env.get("TMS_CURRENT_WORKFLOW_MANIFEST")!=null,"Current workflow manifest required; no direct Maven fallback");
            require("integration".equals(env.get("TMS_CURRENT_WORKFLOW_MODE"))&&"integration".equals(env.get("TMS_TEST_FEATURE_MODE")),"Integration mode required");
            byte[] bytes=Files.readAllBytes(safePath(env.get("TMS_CURRENT_WORKFLOW_MANIFEST")));
            String digest=env.get("TMS_CURRENT_WORKFLOW_MANIFEST_SHA256");require(hash(bytes).equals(digest),"Manifest hash mismatch");JsonNode m=JSON.readTree(bytes),t=m.path("target");
            var fields=new HashSet<String>();m.fieldNames().forEachRemaining(fields::add);require(fields.equals(Set.of("formatVersion","purpose","target","provenance")),"Manifest must not contain credentials or extra fields");
            require(m.path("formatVersion").asInt()==1&&"CURRENT_WORKFLOW_NATIVE".equals(m.path("purpose").asText()),"Invalid manifest format");
            String host=t.path("host").asText(),schema=t.path("schema").asText();int port=t.path("port").asInt();
            require(List.of("127.0.0.1","localhost").contains(host)&&t.path("port").isIntegralNumber()&&port>=1&&port<=65535&&schema.matches("tms_docstest_[a-f0-9]{12}"),"Unsafe target");
            require(t.path("serverUuid").asText().matches("(?i)[a-f0-9-]{36}")&&t.path("flywayVersion").asText().matches("[0-9]+"),"Invalid target UUID/version");
            String locations=t.path("migrationLocations").toString();require(locations.equals("[\"classpath:db/migration\"]")||locations.equals("[\"classpath:db/migration\",\"classpath:db/demo\"]"),"Unexpected migration locations");
            byte[] receiptBytes=Files.readAllBytes(safePath(m.path("provenance").path("receiptPath").asText()));
            require(hash(receiptBytes).equals(m.path("provenance").path("receiptSha256").asText()),"Provenance digest mismatch");JsonNode receipt=JSON.readTree(receiptBytes);
            require(receipt.path("formatVersion").asInt()==1&&"CURRENT_WORKFLOW_NATIVE_PROVISION".equals(receipt.path("purpose").asText())&&receipt.path("createdNewSchema").asBoolean()&&receipt.path("target").equals(t)&&receipt.path("migrations").isArray()&&!receipt.path("migrations").isEmpty(),"Provenance target mismatch");
            java.time.Instant.parse(receipt.path("preparedAt").asText());
            for(var migration:receipt.path("migrations"))require(migration.path("version").isTextual()&&migration.path("script").isTextual()&&(migration.path("checksum").isNull()||migration.path("checksum").isInt()),"Invalid provenance migration");
            var migrations=receipt.path("migrations");require(migrations.get(migrations.size()-1).path("version").asText().equals(t.path("flywayVersion").asText()),"Provenance version mismatch");
            Path evidence=safePath(Objects.requireNonNull(env.get("TMS_CURRENT_WORKFLOW_EVIDENCE_DIR"),"Owned evidence directory required"));
            JsonNode storage=JSON.readTree(Files.readAllBytes(safePath(evidence.resolve("storage.json").toString())));
            Path attachment=safePath(Objects.requireNonNull(env.get("TMS_ATTACHMENT_ROOT"),"Owned attachment root required"));
            require(storage.path("formatVersion").asInt()==1&&"CURRENT_WORKFLOW_NATIVE_STORAGE".equals(storage.path("purpose").asText())&&digest.equals(storage.path("manifestSha256").asText())&&evidence.equals(safePath(storage.path("evidenceDir").asText()))&&attachment.equals(evidence.resolve("attachments"))&&attachment.equals(safePath(storage.path("attachmentRoot").asText()))&&Files.isDirectory(attachment),"Shared or escaping attachment root rejected");
            require(safePath(receipt.path("ownerRoot").asText()).equals(safePath(storage.path("ownerRoot").asText())),"Storage ownership mismatch");
            Path owner=safePath(receipt.path("ownerRoot").asText());
            require(!evidence.startsWith(owner.resolve("var/evidence"))&&!evidence.startsWith(owner.resolve("Backend")),"Application/build storage rejected");
            String url="jdbc:mysql://"+host+":"+port+"/"+schema+"?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
            require(url.equals(env.get("TMS_TEST_DB_URL")),"Canonical datasource URL required");
            require(env.get("TMS_TEST_DB_USER")!=null&&env.get("TMS_TEST_DB_PASSWORD")!=null,"Private test credentials required");
            return new Verified(m,receipt,evidence,attachment,url);
        }catch(IllegalStateException e){throw e;}catch(Exception e){throw new IllegalStateException("Current workflow manifest/storage validation failed",e);}
    }
    public static void configure(DynamicPropertyRegistry registry) {
        Map<String,String> env=System.getenv();Verified v=inspect(env);String user=env.get("TMS_TEST_DB_USER"),password=env.get("TMS_TEST_DB_PASSWORD");
        try(var c=DriverManager.getConnection(v.url(),user,password)) {
            c.setReadOnly(true);
            try(var s=c.createStatement();var rows=s.executeQuery("SELECT DATABASE(), @@server_uuid")) {
                require(rows.next()&&rows.getString(1).equals(v.manifest().path("target").path("schema").asText())&&rows.getString(2).equals(v.manifest().path("target").path("serverUuid").asText()),"Connected target mismatch");
            }
            var expected=v.receipt().path("migrations");int index=0;
            try(var s=c.createStatement();var rows=s.executeQuery("SELECT version, script, checksum, success FROM flyway_schema_history ORDER BY installed_rank")) {
                while(rows.next()){require(index<expected.size(),"Unexpected migration");var m=expected.get(index++);Integer checksum=rows.getObject(3,Integer.class);require(rows.getBoolean(4)&&Objects.equals(rows.getString(1),m.path("version").asText())&&Objects.equals(rows.getString(2),m.path("script").asText())&&Objects.equals(checksum,m.path("checksum").isNull()?null:m.path("checksum").asInt()),"Migration checksum/version mismatch");}
            }
            require(index==expected.size()&&expected.get(index-1).path("version").asText().equals(v.manifest().path("target").path("flywayVersion").asText()),"Migration version mismatch");
        }catch(Exception e){throw new IllegalStateException("Current workflow read-only database validation failed",e);}
        var locations=new ArrayList<String>();v.manifest().path("target").path("migrationLocations").forEach(n->locations.add(n.asText()));
        Flyway flyway=Flyway.configure().dataSource(v.url(),user,password).locations(locations.toArray(String[]::new)).cleanDisabled(true).load();
        flyway.validate();require(flyway.info().pending().length==0,"Pending migrations rejected; provision separately");
        register(registry,v,user,password);
    }
    static void register(DynamicPropertyRegistry r,Verified v,String user,String password) {
        Map<String,String> values=new LinkedHashMap<>();
        values.put("TMS_DB_URL",v.url());values.put("spring.datasource.url",v.url());values.put("TMS_DB_USER",user);values.put("spring.datasource.username",user);values.put("TMS_DB_PASSWORD",password);values.put("spring.datasource.password",password);
        values.put("TMS_MIGRATION_USER",user);values.put("TMS_MIGRATION_PASSWORD",password);values.put("TMS_ATTACHMENT_ROOT",v.attachments().toString());
        for(String key:List.of("spring.flyway.enabled","spring.task.scheduling.enabled","TMS_BOOTSTRAP_ENABLED","tms.bootstrap.enabled","TMS_REDMINE_ENABLED","TMS_CHATGPT_LOCAL_ENABLED","TMS_OLLAMA_ENABLED","TMS_OPENAI_ENABLED"))values.put(key,"false");
        for(String key:List.of("spring.session.jdbc.cleanup-cron","TMS_AI_DRAFT_CLEANUP_CRON","TMS_AI_CHAT_CLEANUP_CRON"))values.put(key,"-");
        values.put("spring.jpa.hibernate.ddl-auto","validate");values.put("spring.sql.init.mode","never");values.put("spring.session.jdbc.initialize-schema","never");
        values.forEach((key,value)->r.add(Objects.requireNonNull(key),()->value));
    }
}
