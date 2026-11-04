package vn.syp.tms.support;

import static org.assertj.core.api.Assertions.*;
import java.util.Map;
import java.util.HashMap;
import java.nio.file.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

class CurrentWorkflowDatabaseGuardTest {
    @Test void rejectsDirectMavenWithoutManifest() {
        assertThatThrownBy(()->CurrentWorkflowDatabaseGuard.inspect(Map.of()))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("manifest");
    }
    private static final ObjectMapper JSON=new ObjectMapper();
    private static final String DIGEST="TMS_CURRENT_WORKFLOW_MANIFEST_SHA256";
    record Fixture(Path dir,Path file,ObjectNode manifest,Map<String,String> env) {
        void save()throws Exception {byte[] bytes=JSON.writeValueAsBytes(manifest);Files.write(file,bytes);env.put(DIGEST,CurrentWorkflowDatabaseGuard.hash(bytes));
            Path storage=dir.resolve("storage.json");ObjectNode node=(ObjectNode)JSON.readTree(Files.readAllBytes(storage));node.put("manifestSha256",env.get(DIGEST));Files.write(storage,JSON.writeValueAsBytes(node));}
    }
    private Fixture fixture()throws Exception {
        Path dir=Files.createTempDirectory("arena-java-guard-").toRealPath(),attachments=Files.createDirectory(dir.resolve("attachments"));
        ObjectNode target=JSON.createObjectNode().put("host","127.0.0.1").put("port",3307).put("schema","tms_docstest_123456abcdef").put("serverUuid","11111111-2222-3333-4444-555555555555").put("flywayVersion","39");target.putArray("migrationLocations").add("classpath:db/migration");
        ObjectNode provision=JSON.createObjectNode().put("formatVersion",1).put("purpose","CURRENT_WORKFLOW_NATIVE_PROVISION").put("createdNewSchema",true).put("preparedAt",java.time.Instant.now().toString()).put("ownerRoot",dir.toString());provision.set("target",target);provision.putArray("migrations").addObject().put("version","39").put("script","V39__test.sql").put("checksum",42);
        Path receipt=dir.resolve("provision.json");Files.write(receipt,JSON.writeValueAsBytes(provision));
        ObjectNode manifest=JSON.createObjectNode().put("formatVersion",1).put("purpose","CURRENT_WORKFLOW_NATIVE");manifest.set("target",target);manifest.putObject("provenance").put("receiptPath",receipt.toString()).put("receiptSha256",CurrentWorkflowDatabaseGuard.hash(Files.readAllBytes(receipt)));
        ObjectNode storage=JSON.createObjectNode().put("formatVersion",1).put("purpose","CURRENT_WORKFLOW_NATIVE_STORAGE").put("ownerRoot",dir.toString()).put("evidenceDir",dir.toString()).put("attachmentRoot",attachments.toString());Files.write(dir.resolve("storage.json"),JSON.writeValueAsBytes(storage));
        Map<String,String> env=new HashMap<>(Map.of("TMS_CURRENT_WORKFLOW_MODE","integration","TMS_TEST_FEATURE_MODE","integration","TMS_CURRENT_WORKFLOW_MANIFEST",dir.resolve("manifest.json").toString(),"TMS_CURRENT_WORKFLOW_EVIDENCE_DIR",dir.toString(),"TMS_ATTACHMENT_ROOT",attachments.toString(),"TMS_TEST_DB_URL","jdbc:mysql://127.0.0.1:3307/tms_docstest_123456abcdef?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC","TMS_TEST_DB_USER","fixture","TMS_TEST_DB_PASSWORD","private"));
        Fixture f=new Fixture(dir,dir.resolve("manifest.json"),manifest,env);f.save();return f;
    }
    @Test void rejectsUnsafeTargetBeforeConnect()throws Exception {
        for(String field:new String[]{"host","schema"}){var f=fixture();((ObjectNode)f.manifest().path("target")).put(field,field.equals("host")?"remote.example":"tms");f.save();assertThatThrownBy(()->CurrentWorkflowDatabaseGuard.inspect(f.env())).hasMessageContaining("Unsafe target");}
    }
    @Test void rejectsManifestOrProvenanceMismatch()throws Exception {
        var f=fixture();f.env().put(DIGEST,"0".repeat(64));assertThatThrownBy(()->CurrentWorkflowDatabaseGuard.inspect(f.env())).hasMessageContaining("Manifest hash");
        var g=fixture();((ObjectNode)g.manifest().path("provenance")).put("receiptSha256","0".repeat(64));g.save();assertThatThrownBy(()->CurrentWorkflowDatabaseGuard.inspect(g.env())).hasMessageContaining("Provenance digest");
    }
    @Test void rejectsUnexpectedMigrationLocations()throws Exception {
        var f=fixture();((ObjectNode)f.manifest().path("target")).putArray("migrationLocations").add("filesystem:unreviewed");f.save();assertThatThrownBy(()->CurrentWorkflowDatabaseGuard.inspect(f.env())).hasMessageContaining("migration locations");
    }
    @Test void ignoresInheritedApplicationAttachmentRoot()throws Exception {
        var f=fixture();Path app=Files.createTempDirectory("arena-app-sentinel-").toRealPath(),sentinel=Files.writeString(app.resolve("sentinel"),"preserve");
        var verified=CurrentWorkflowDatabaseGuard.inspect(f.env());Map<String,Object> registered=new HashMap<>();
        CurrentWorkflowDatabaseGuard.register((key,supplier)->registered.put(key,supplier.get()),verified,"fixture","private");
        assertThat(registered).containsEntry("TMS_ATTACHMENT_ROOT",f.dir().resolve("attachments").toString()).containsEntry("spring.flyway.enabled","false").containsEntry("spring.jpa.hibernate.ddl-auto","validate").containsEntry("spring.session.jdbc.initialize-schema","never");
        assertThat(Files.readString(sentinel)).isEqualTo("preserve");try(var files=Files.list(app)){assertThat(files.count()).isEqualTo(1);}
    }
    @Test void rejectsSharedOrEscapingAttachmentRoot()throws Exception {
        var f=fixture();f.env().put("TMS_ATTACHMENT_ROOT",f.dir().getParent().toString());assertThatThrownBy(()->CurrentWorkflowDatabaseGuard.inspect(f.env())).hasMessageContaining("attachment root");
        var g=fixture();Path outside=Files.createTempDirectory("arena-outside-").toRealPath();Path link=g.dir().resolve("escape");
        // Junctions are exercised by the Node tests on Windows; Java also rejects the same real-path mismatch.
        if(!System.getProperty("os.name").startsWith("Windows")){Files.createSymbolicLink(link,outside);g.env().put("TMS_ATTACHMENT_ROOT",link.toString());assertThatThrownBy(()->CurrentWorkflowDatabaseGuard.inspect(g.env())).hasMessageContaining("escaping");}
    }
}
