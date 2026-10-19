package db.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.sql.Statement;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import vn.syp.tms.testcase.TestCaseDtos;

/** Recover only valid sources skipped by V32 header-width validation; applied V31/V32 stay unchanged. */
public class V33__recover_padded_customer_documents extends BaseJavaMigration {
    private JdbcTemplate db;
    private final ObjectMapper json=new ObjectMapper();
    @Override public void migrate(Context context) throws Exception {
        db=new JdbcTemplate(new SingleConnectionDataSource(context.getConnection(),true));
        for(var cycle:db.queryForList("SELECT c.id,c.project_id,c.name,u.id AS actor FROM test_cycles c JOIN project_memberships m ON m.project_id=c.project_id AND m.id=c.created_by JOIN identity_users u ON u.id=m.user_id ORDER BY c.project_id,c.id")){
            long p=n(cycle,"project_id"),c=n(cycle,"id");
            var names=db.queryForList("SELECT DISTINCT e.name FROM cycle_configurations cf JOIN environments e ON e.project_id=cf.project_id AND e.id=cf.environment_id WHERE cf.project_id=? AND cf.cycle_id=? ORDER BY e.name",String.class,p,c);
            createFeature(p,"CYCLE:"+c,c,String.valueOf(cycle.get("name")),shorten(String.join("; ",names),1000),String.valueOf(cycle.get("actor")));
        }
        for(var source:db.queryForList("SELECT * FROM import_batches WHERE status='COMMITTED' AND feature_id IS NULL AND EXISTS(SELECT 1 FROM testing_migration_exceptions e WHERE e.project_id=import_batches.project_id AND e.source_batch_id=import_batches.id AND e.code='SOURCE_CONTENT_UNAVAILABLE') ORDER BY project_id,id")){
            long p=n(source,"project_id"),d=n(source,"id");
            var scope=db.queryForList("SELECT DISTINCT cycle_id FROM (SELECT cycle_id FROM file_work_groups WHERE project_id=? AND document_id=? UNION SELECT r.cycle_id FROM test_document_retests t JOIN import_rows ir ON ir.project_id=t.project_id AND ir.id=t.row_id JOIN run_items r ON r.project_id=t.project_id AND r.id=t.run_item_id WHERE ir.project_id=? AND ir.batch_id=? UNION SELECT r.cycle_id FROM run_items r JOIN import_rows ir ON ir.project_id=r.project_id AND ir.target_case_id=r.test_case_id WHERE ir.project_id=? AND ir.batch_id=?) scopes ORDER BY cycle_id",Long.class,p,d,p,d,p,d);
            try{validateSource(source);}catch(Exception bad){continue;}
            if(scope.isEmpty()){
                long f=createFeature(p,"ORPHAN",null,"Dữ liệu cũ chưa phân đợt","",String.valueOf(source.get("imported_by")));copy(source,f);
            }else for(long c:scope){var ids=db.queryForList("SELECT id FROM testing_features WHERE project_id=? AND migration_key=?",Long.class,p,"CYCLE:"+c);if(ids.size()!=1){exception(p,d,"AMBIGUOUS_CYCLE","Không có Feature nguồn duy nhất cho cycle "+c);continue;}copy(source,ids.getFirst());}
        }
    }
    private void validateSource(Map<String,Object> source) throws Exception {
        long p=n(source,"project_id"),d=n(source,"id");Object raw=source.get("source_workbook");
        if(!(raw instanceof byte[] bytes)||bytes.length==0)throw new IllegalArgumentException("Workbook nguồn thiếu; giữ nguyên bản cũ và chờ xử lý.");
        int columns;
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(bytes))){var sheet=book.getSheet(String.valueOf(source.get("sheet_name")));if(sheet==null||sheet.getRow(0)==null)throw new IllegalArgumentException("Workbook/sheet nguồn không hợp lệ.");columns="CUSTOMER_V1".equals(source.get("mapping_version"))?vn.syp.tms.testcase.TestCaseWorkbook.effectiveCustomerWidth(sheet):sheet.getRow(0).getLastCellNum();}
        long targets=Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) FROM import_rows WHERE project_id=? AND batch_id=? AND target_case_id IS NOT NULL",Long.class,p,d));
        var rows=db.queryForList("SELECT ir.raw_data_json,ir.id FROM import_rows ir JOIN test_cases c ON c.project_id=ir.project_id AND c.id=ir.target_case_id JOIN test_case_revisions r ON r.project_id=c.project_id AND r.test_case_id=c.id AND r.id=c.current_revision_id WHERE ir.project_id=? AND ir.batch_id=?",p,d);
        if(rows.size()!=targets)throw new IllegalArgumentException("Liên kết case/current revision không đầy đủ.");
        for(var row:rows){var input=json.readValue(String.valueOf(row.get("raw_data_json")),TestCaseDtos.ImportRowInput.class);if("CUSTOMER_V1".equals(source.get("mapping_version"))&&(input.sourceCells()==null||input.sourceCells().size()!=columns))throw new IllegalArgumentException("Số ô nguồn không khớp header.");
            long invalid=Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) FROM test_document_cell_edits WHERE project_id=? AND row_id=? AND column_index>=?",Long.class,p,n(row,"id"),columns));if(invalid>0)throw new IllegalArgumentException("Cell overlay nằm ngoài cấu trúc workbook.");}
        long shared=Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) FROM import_rows ir WHERE ir.project_id=? AND ir.batch_id=? AND ir.target_case_id IS NOT NULL AND EXISTS(SELECT 1 FROM import_rows other WHERE other.project_id=ir.project_id AND other.target_case_id=ir.target_case_id AND other.batch_id<>ir.batch_id)",Long.class,p,d));
        if(shared>0)throw new IllegalArgumentException("Case nguồn thuộc nhiều file; cần đối chiếu association trước khi copy.");
    }
    private long createFeature(long p,String key,Long cycle,String name,String environment,String actor){
        var old=db.queryForList("SELECT id FROM testing_features WHERE project_id=? AND migration_key=?",Long.class,p,key);if(!old.isEmpty())return old.getFirst();
        return insert("INSERT INTO testing_features(project_id,name,environment,description,migration_key,source_cycle_id,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,'Chuyển từ cấu trúc kiểm thử cũ; chỉ giữ workbook và nội dung hiện hành.',?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",p,name,environment,key,cycle,actor,actor);
    }
    private void copy(Map<String,Object> source,long f){
        long p=n(source,"project_id"),old=n(source,"id");if(!db.queryForList("SELECT id FROM import_batches WHERE project_id=? AND feature_id=? AND source_batch_id=?",Long.class,p,f,old).isEmpty())return;
        exception(p,old,"SOURCE_CONTENT_RECOVERED_V33","Đã phục hồi nguồn hợp lệ bằng cấu trúc cột hiệu lực của parser; giữ nguyên exception gốc và graph cũ.");
        long d=insert("INSERT INTO import_batches(project_id,feature_id,source_batch_id,file_name,file_checksum,status,mapping_version,total_rows,valid_rows,error_rows,staged_expires_at,committed_at,imported_by,created_at,sheet_name,source_workbook) VALUES(?,?,?,?,?,'COMMITTED',?,?,?,0,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?,?)",p,f,old,source.get("file_name"),source.get("file_checksum"),source.get("mapping_version"),source.get("total_rows"),source.get("valid_rows"),source.get("imported_by"),source.get("sheet_name"),source.get("source_workbook"));
        long suite=insert("INSERT INTO test_suites(project_id,code,name,description,sort_order,created_at,updated_at) VALUES(?,?,?,'Bản file độc lập sau chuyển đổi',0,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",p,"XLSX-"+d,shorten(String.valueOf(source.get("file_name")),100));
        for(var row:db.queryForList("SELECT ir.id AS old_row,ir.source_row_number,ir.source_case_key,ir.suite_code,ir.raw_data_json,ir.target_case_id,r.* FROM import_rows ir JOIN test_cases c ON c.project_id=ir.project_id AND c.id=ir.target_case_id JOIN test_case_revisions r ON r.project_id=c.project_id AND r.test_case_id=c.id AND r.id=c.current_revision_id WHERE ir.project_id=? AND ir.batch_id=? ORDER BY ir.source_row_number,ir.id",p,old)){
            long c=insert("INSERT INTO test_cases(project_id,case_no,suite_id,owning_document_id,created_at,updated_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",p,"XLSX-"+d+"-"+n(row,"source_row_number"),suite,d);
            long revision=insert("INSERT INTO test_case_revisions(project_id,test_case_id,revision_no,title_vi,preconditions_vi,steps_vi,expected_vi,title_jp,preconditions_jp,steps_jp,expected_jp,source_reference,created_by,created_by_user_id,created_at) VALUES(?,?,1,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,c,row.get("title_vi"),row.get("preconditions_vi"),row.get("steps_vi"),row.get("expected_vi"),row.get("title_jp"),row.get("preconditions_jp"),row.get("steps_jp"),row.get("expected_jp"),row.get("source_reference"),row.get("created_by"),row.get("created_by_user_id"));
            db.update("UPDATE test_cases SET current_revision_id=? WHERE project_id=? AND id=?",revision,p,c);
            long ir=insert("INSERT INTO import_rows(project_id,batch_id,owning_document_id,source_import_row_id,source_row_number,source_case_key,suite_code,raw_data_json,target_case_id,is_valid,created_at) VALUES(?,?,?,?,?,?,?,?,?,TRUE,UTC_TIMESTAMP(6))",p,d,d,n(row,"old_row"),row.get("source_row_number"),row.get("source_case_key"),row.get("suite_code"),row.get("raw_data_json"),c);
            db.update("INSERT INTO test_document_cell_edits(project_id,row_id,column_index,cell_value,lock_version) SELECT project_id,?,column_index,cell_value,lock_version FROM test_document_cell_edits WHERE project_id=? AND row_id=?",ir,p,n(row,"old_row"));
            db.update("INSERT INTO test_document_assignments(project_id,document_id,row_id) VALUES(?,?,?)",p,d,ir);
            db.update("INSERT INTO testing_migration_case_map(project_id,feature_id,document_id,old_case_id,old_revision_id,new_case_id,new_revision_id) VALUES(?,?,?,?,?,?,?)",p,f,d,row.get("target_case_id"),row.get("id"),c,revision);
        }
    }
    private void exception(long p,long d,String code,String details){db.update("INSERT INTO testing_migration_exceptions(project_id,source_batch_id,code,details,created_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))",p,d,code,shorten(Objects.toString(details,"Không xác minh được workbook/current content."),1000));}
    private long insert(String sql,Object... args){var key=new GeneratedKeyHolder();db.update(c->{var s=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s;},key);return Objects.requireNonNull(key.getKey()).longValue();}
    private static long n(Map<String,Object> row,String key){return ((Number)row.get(key)).longValue();}
    private static String shorten(String value,int max){return value.length()>max?value.substring(0,max):value;}
}
