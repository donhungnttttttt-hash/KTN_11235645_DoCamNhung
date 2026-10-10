package vn.syp.tms.hardening;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.utility.MountableFile;

/** A recovery drill on anonymous test data. Never accepts a live database URL or storage path. */
final class RecoveryDrill {
    static void verify(MySQLContainer<?> source,JdbcTemplate db,Path evidence,Path temp,ObjectMapper json) throws Exception {
        if(!source.getDatabaseName().equals("tms_system_test"))throw new IllegalArgumentException("Test database only");
        long began=System.nanoTime();Path backup=temp.resolve("backup.sql");
        var dump=source.execInContainer("sh","-c","MYSQL_PWD=\"$MYSQL_PASSWORD\" mysqldump -u test --single-transaction --no-tablespaces --set-gtid-purged=OFF --hex-blob --skip-lock-tables tms_system_test > /tmp/recovery.sql");
        assertThat(dump.getExitCode()).as("mysqldump exit").isZero();
        source.copyFileFromContainer("/tmp/recovery.sql",backup.toString());assertThat(Files.size(backup)).isPositive();
        var sourceData=fingerprints(source);Path restoredEvidence=Files.createDirectory(temp.resolve("restored-evidence"));
        int files=0;
        for(var file:db.queryForList("SELECT id,sha256 FROM work_item_attachments")) {
            String id=file.get("id").toString();assertThat(UUID.fromString(id).toString()).isEqualTo(id);
            byte[] bytes=Files.readAllBytes(evidence.resolve(id));assertThat(hash(bytes)).isEqualTo(file.get("sha256"));
            Files.write(restoredEvidence.resolve(id),bytes);files++;
        }
        assertThat(files).isPositive();
        // Restore into two freshly created containers. No destructive restore against source.
        for(boolean simulateFailure:List.of(true,false)) {
            try(var restored=new MySQLContainer<>("mysql:8.4.8")) {
            restored.withDatabaseName("tms_system_test").withUsername("test").withPassword(UUID.randomUUID().toString());
                restored.start();restored.copyFileToContainer(MountableFile.forHostPath(backup),"/tmp/recovery.sql");
                var load=restored.execInContainer("sh","-c","MYSQL_PWD=\"$MYSQL_PASSWORD\" mysql -u test tms_system_test < /tmp/recovery.sql");
                assertThat(load.getExitCode()).as("restore exit").isZero();
                var flyway=Flyway.configure().dataSource(restored.getJdbcUrl(),restored.getUsername(),restored.getPassword()).locations("classpath:db/migration").cleanDisabled(true).load();
                flyway.validate();assertThat(flyway.migrate().migrationsExecuted).isZero();
                assertThat(fingerprints(restored)).as("all 54 non-session tables, ordered row bytes").isEqualTo(sourceData);
                if(simulateFailure) {
                    Path migrations=Files.createDirectory(temp.resolve("failure-migration"));
                    Files.writeString(migrations.resolve("V12__recovery_drill_only.sql"),"CREATE TABLE recovery_partial (id INT PRIMARY KEY);\nINSERT INTO table_that_does_not_exist VALUES (1);\n");
                    var broken=Flyway.configure().dataSource(restored.getJdbcUrl(),restored.getUsername(),restored.getPassword()).locations("classpath:db/migration","filesystem:"+migrations.toAbsolutePath()).cleanDisabled(true).load();
                    assertThatThrownBy(broken::migrate).isInstanceOf(FlywayException.class);
                    assertThat(broken.validateWithResult().validationSuccessful).isFalse();
                    try(var connection=connect(restored);var statement=connection.createStatement();var rows=statement.executeQuery("SELECT COUNT(*) FROM recovery_partial")) {assertThat(rows.next()).isTrue();}
                    // Partial MySQL DDL is real; next iteration recovers from the pre-change dump in another empty DB.
                }
            }
        }
        for(var file:db.queryForList("SELECT id,sha256 FROM work_item_attachments"))
            assertThat(hash(Files.readAllBytes(restoredEvidence.resolve(file.get("id").toString())))).isEqualTo(file.get("sha256"));
        assertThat(fingerprints(source)).as("source untouched").isEqualTo(sourceData);
        var report=new LinkedHashMap<String,Object>();report.put("backupBytes",Files.size(backup));report.put("backupSha256",hash(Files.readAllBytes(backup)));
        report.put("tablesCompared",sourceData.size());report.put("evidenceFilesVerified",files);report.put("schema","V11");
        report.put("restoresVerified",2);report.put("failedMigrationPartialDdlObserved",true);report.put("sourceUnchanged",true);
        report.put("elapsedMs",TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-began));
        report.put("limits","Isolated synthetic MySQL 8.4.8 + evidence byte restore; no app process started on restored DB. Live backup must pause all writers and invalidate sessions before opening recovered service. This is not an RTO/RPO commitment.");
        Files.createDirectories(Path.of("target/recovery"));json.writerWithDefaultPrettyPrinter().writeValue(Path.of("target/recovery/sprint-10.json").toFile(),report);
    }
    private static Connection connect(MySQLContainer<?> db) throws SQLException {return DriverManager.getConnection(db.getJdbcUrl(),db.getUsername(),db.getPassword());}
    private static Map<String,String> fingerprints(MySQLContainer<?> db) throws Exception {
        var result=new TreeMap<String,String>();
        try(var connection=connect(db);var statement=connection.createStatement()) {
            var tables=new ArrayList<String>();
            try(var rows=statement.executeQuery("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name NOT LIKE 'SPRING_SESSION%' ORDER BY table_name")) {while(rows.next())tables.add(rows.getString(1));}
            for(String table:tables) {
                if(!table.matches("[a-z_]+"))throw new IllegalStateException("Unexpected table name");
                var keys=new ArrayList<String>();
                try(var key=connection.prepareStatement("SELECT column_name FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name=? AND constraint_name='PRIMARY' ORDER BY ordinal_position")) {
                    key.setString(1,table);try(var rows=key.executeQuery()){while(rows.next())keys.add("`"+rows.getString(1)+"`");}
                }
                assertThat(keys).isNotEmpty();var digest=MessageDigest.getInstance("SHA-256");long count=0;
                try(var rows=statement.executeQuery("SELECT * FROM `"+table+"` ORDER BY "+String.join(",",keys))) {
                    while(rows.next()) {count++;for(int i=1;i<=rows.getMetaData().getColumnCount();i++) {
                        byte[] bytes=rows.getBytes(i);digest.update(java.nio.ByteBuffer.allocate(4).putInt(bytes==null?-1:bytes.length).array());if(bytes!=null)digest.update(bytes);
                    }}
                }
                result.put(table,count+":"+HexFormat.of().formatHex(digest.digest()));
            }
        }return result;
    }
    private static String hash(byte[] bytes) throws Exception {return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}
}
