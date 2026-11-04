package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import vn.syp.tms.support.ArchiveMigrationDatabaseGuard;
import vn.syp.tms.workitem.WorkItemStore;

/** Guarded migration-only rehearsal; no Spring, application storage, clean or repair. */
@EnabledIfEnvironmentVariable(named="TMS_ARCHIVE_MIGRATION_MODE",matches="fresh|upgrade")
class NativeArchiveExceptionMigrationTest {
    private static final ObjectMapper JSON=new ObjectMapper();
    @Test void preservesExistingDataAndOrdinaryCommandHashesAcrossV40()throws Exception {
        var target=ArchiveMigrationDatabaseGuard.verify(System.getenv());boolean upgrade=target.manifest().path("mode").asText().equals("upgrade");
        Map<String,Object> before=Map.of();
        if(upgrade)try(var c=target.connect()){seed(c);before=inventory(c);}
        write(target.evidence(),"before.json",before);
        var result=target.flyway().migrate();assertThat(result.success).isTrue();assertThat(result.targetSchemaVersion).isEqualTo("40");
        target.flyway().validate();assertThat(target.flyway().info().pending()).isEmpty();
        try(var c=target.connect()) {
            if(upgrade)assertThat(inventory(c)).isEqualTo(before);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM project_lifecycle_decisions WHERE legacy_exception_snapshot IS NOT NULL")).isZero();
            var columns=rows(c,"SELECT TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION");
            var migrations=rows(c,"SELECT version,script,checksum FROM flyway_schema_history ORDER BY installed_rank");
            assertThat(rows(c,"SELECT DATA_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='project_lifecycle_decisions' AND COLUMN_NAME='legacy_exception_snapshot'")).containsExactly(List.of("json","YES"));
            write(target.evidence(),"after.json",Map.of("data",inventory(c),"columns",columns,"migrations",migrations,"target",target.manifest().path("target"),"finalVersion","40"));
        }
    }
    private void seed(Connection c)throws Exception {
        String tag=UUID.randomUUID().toString(),actor=tag;
        NativeFqFixture.update(c,"INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES(?,?,'Migration preservation','not-login','PM',UTC_TIMESTAMP(6))",actor,"migration."+tag);
        long project=NativeFqFixture.insert(c,"INSERT INTO projects(code,name,created_at,created_by,updated_at,updated_by,lock_version) VALUES(?,'Migration preservation',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?,2)","AM"+tag.substring(0,12),actor,actor);
        long member=NativeFqFixture.insert(c,"INSERT INTO project_memberships(project_id,user_id,project_role,created_at,updated_at) VALUES(?,?,'PM',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",project,actor);
        long feature=NativeFqFixture.insert(c,"INSERT INTO testing_features(project_id,name,created_by,updated_by,created_at,updated_at) VALUES(?,'Preserved feature',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",project,actor,actor);
        byte[] blob="AR06 immutable workbook bytes".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        NativeFqFixture.insert(c,"INSERT INTO import_batches(project_id,feature_id,file_name,file_checksum,status,total_rows,valid_rows,staged_expires_at,committed_at,imported_by,created_at,sheet_name,source_workbook) VALUES(?,?,'preserve.xlsx',REPEAT('a',64),'COMMITTED',0,0,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),'TestCases',?)",project,feature,actor,blob);
        long issue=NativeFqFixture.insert(c,"INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,1,?,'BUG','Preserved issue','Original content',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'migration-issue',REPEAT('b',64))",project,"AR06-"+project,member,member);
        NativeFqFixture.update(c,"INSERT INTO work_item_feature_context(project_id,work_item_id,feature_id,monkey,created_by_user_id) VALUES(?,?,?,TRUE,?)",project,issue,feature,actor);
        NativeFqFixture.update(c,"INSERT INTO work_item_feature_history(project_id,work_item_id,event_type,after_json,actor_user_id,created_at) VALUES(?,?,'CREATE','{\"preserved\":true}',?,UTC_TIMESTAMP(6))",project,issue,actor);
        var store=new WorkItemStore(null,JSON);
        for(int version=0;version<2;version++)NativeFqFixture.update(c,"INSERT INTO project_lifecycle_decisions(project_id,action,reason,expected_version,result_version,request_key,payload_hash,actor_id,decided_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",project,version==0?"ARCHIVE":"REOPEN","Preserved decision",version,version+1,"migration-old-"+version,store.checksum(List.of(version==0?"ARCHIVE":"REOPEN",(long)version,"Preserved decision")),actor);
        NativeFqFixture.update(c,"INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(?,?,'PROJECT',?,'REOPEN',UTC_TIMESTAMP(6))",project,actor,project);
    }
    private Map<String,Object> inventory(Connection c)throws Exception {
        var result=new TreeMap<String,Object>();
        for(String table:List.of("projects","testing_features","import_batches","work_items","work_item_feature_history","project_audit"))result.put(table,rows(c,"SELECT * FROM "+table+" ORDER BY id"));
        result.put("decisions",rows(c,"SELECT id,project_id,action,reason,expected_version,result_version,request_key,payload_hash,actor_id,decided_at FROM project_lifecycle_decisions ORDER BY id"));
        return result;
    }
    private List<List<String>> rows(Connection c,String sql)throws SQLException {
        var result=new ArrayList<List<String>>();try(var s=c.createStatement();var r=s.executeQuery(sql)){while(r.next()){var row=new ArrayList<String>();for(int i=1;i<=r.getMetaData().getColumnCount();i++){Object value=r.getObject(i);row.add(value instanceof byte[] bytes?HexFormat.of().formatHex(bytes):Objects.toString(value,null));}result.add(row);}}return result;
    }
    private void write(Path evidence,String name,Object data)throws Exception {Files.writeString(evidence.resolve(name),JSON.writerWithDefaultPrettyPrinter().writeValueAsString(data),StandardOpenOption.CREATE_NEW);}
}
