package vn.syp.tms.support;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ArchiveMigrationDatabaseGuardTest {
    @TempDir Path dir;
    private Map<String,String> manifest(Map<String,Object> target,String mode)throws Exception {
        var m=Map.of("formatVersion",1,"purpose","ARCHIVE_EXCEPTION_MIGRATION","mode",mode,"target",target,"provenance",Map.of());
        Path file=dir.resolve(UUID.randomUUID()+".json");byte[] bytes=new ObjectMapper().writeValueAsBytes(m);Files.write(file,bytes);
        return new HashMap<>(Map.of("TMS_ARCHIVE_MIGRATION_MODE",mode,"TMS_ARCHIVE_MIGRATION_MANIFEST",file.toString(),"TMS_ARCHIVE_MIGRATION_MANIFEST_SHA256",CurrentWorkflowDatabaseGuard.hash(bytes)));
    }
    private Map<String,Object> target(){return new HashMap<>(Map.of("host","127.0.0.1","port",3307,"schema","tms_docstest_123456abcdef","serverUuid","11111111-2222-3333-4444-555555555555","flywayVersion","33","migrationLocations",List.of("classpath:db/migration")));}
    @Test void requiresExplicitMigrationModeBeforeAnyConnection(){assertThatThrownBy(()->ArchiveMigrationDatabaseGuard.verify(Map.of())).hasMessageContaining("Explicit migration mode");}
    @Test void rejectsAlteredManifestBeforeAnyConnection()throws Exception {var env=manifest(target(),"upgrade");env.put("TMS_ARCHIVE_MIGRATION_MANIFEST_SHA256","0".repeat(64));assertThatThrownBy(()->ArchiveMigrationDatabaseGuard.verify(env)).hasMessageContaining("Manifest digest");}
    @Test void rejectsApplicationOrRemoteTargetBeforeAnyConnection()throws Exception {for(String key:List.of("host","schema")){var target=target();target.put(key,key.equals("host")?"example.com":"tms");var env=manifest(target,"upgrade");assertThatThrownBy(()->ArchiveMigrationDatabaseGuard.verify(env)).hasMessageContaining("Unsafe migration target");}}
    @Test void rejectsUnapprovedSourceVersionAndProfileBeforeAnyConnection()throws Exception {for(String version:List.of("21","34","40")){var target=target();target.put("flywayVersion",version);var env=manifest(target,"upgrade");assertThatThrownBy(()->ArchiveMigrationDatabaseGuard.verify(env)).hasMessageContaining("Unsupported source version/profile");}}
    @Test void freshModeRequiresZeroVersionBeforeAnyConnection()throws Exception {var env=manifest(target(),"fresh");assertThatThrownBy(()->ArchiveMigrationDatabaseGuard.verify(env)).hasMessageContaining("Unsupported source version/profile");}
}
