package vn.syp.tms.feature;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.syp.tms.shared.web.BusinessException;

/** Transaction-scoped persistence; callers authorize and lock project/document before use. */
public final class CaseExecutionContextService {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    public CaseExecutionContextService(JdbcTemplate db,ObjectMapper json){this.db=db;this.json=json;}
    public Map<Long,Map<String,Object>> document(long p,long d){
        var result=new HashMap<Long,Map<String,Object>>();
        for(var row:db.queryForList("SELECT r.id AS rowId,COALESCE(c.context_version,0) AS contextVersion,c.environment_id AS environmentId,e.name AS environmentName,c.test_version_id AS testVersionId,v.name AS testVersionName FROM import_rows r LEFT JOIN test_document_case_contexts c ON c.project_id=r.project_id AND c.row_id=r.id LEFT JOIN feature_test_environments e ON e.id=c.environment_id LEFT JOIN feature_test_versions v ON v.id=c.test_version_id WHERE r.project_id=? AND r.batch_id=?",p,d))result.put(((Number)row.get("rowId")).longValue(),row);
        return result;
    }
    public Map<String,Object> read(long p,long row){
        var values=db.queryForList("SELECT c.row_id AS rowId,c.context_version AS contextVersion,c.environment_id AS environmentId,e.name AS environmentName,c.test_version_id AS testVersionId,v.name AS testVersionName FROM test_document_case_contexts c LEFT JOIN feature_test_environments e ON e.id=c.environment_id LEFT JOIN feature_test_versions v ON v.id=c.test_version_id WHERE c.project_id=? AND c.row_id=?",p,row);
        if(!values.isEmpty())return values.getFirst();var empty=new LinkedHashMap<String,Object>();empty.put("rowId",row);empty.put("contextVersion",0L);for(var k:List.of("environmentId","environmentName","testVersionId","testVersionName"))empty.put(k,null);return empty;
    }
    public void lock(long p,long f,long d,long row){
        db.update("INSERT INTO test_document_case_contexts(project_id,feature_id,document_id,row_id) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE row_id=row_id",p,f,d,row);
        db.queryForList("SELECT row_id FROM test_document_case_contexts WHERE project_id=? AND row_id=? FOR UPDATE",p,row);
    }
    public void validateSelection(long p,long f,String kind,Long id,Object existing){
        if(id==null)return;
        String table="environment".equals(kind)?"feature_test_environments":"feature_test_versions";
        var values=db.queryForList("SELECT deleted_at FROM "+table+" WHERE project_id=? AND feature_id=? AND id=? FOR SHARE",p,f,id);
        if(values.isEmpty()||(values.getFirst().get("deleted_at")!=null&&!Objects.equals(id,existing)))throw new BusinessException(422,"INVALID_EXECUTION_CONTEXT","Môi trường/version không thuộc Đợt kiểm thử hoặc đã bị xóa.");
    }
    public Map<String,Object> update(long p,String actor,long f,long d,long row,FeatureDtos.ExecutionContext input){
        if(input.environmentId()==null&&input.testVersionId()==null)throw new BusinessException(422,"INVALID_EXECUTION_CONTEXT","Chọn môi trường hoặc version.");
        lock(p,f,d,row);String payload=encode(Arrays.asList(d,row,input));
        var replays=db.queryForList("SELECT payload,response_json FROM test_document_context_changes WHERE project_id=? AND actor_id=? AND request_key=?",p,actor,input.requestKey().toString());
        if(!replays.isEmpty()){var replay=replays.getFirst();if(!payload.equals(replay.get("payload")))throw conflict();return decode(String.valueOf(replay.get("response_json")));}
        var before=read(p,row);check(before,input.expectedContextVersion());
        validateSelection(p,f,"environment",input.environmentId(),before.get("environmentId"));validateSelection(p,f,"version",input.testVersionId(),before.get("testVersionId"));
        Long env=input.environmentId()!=null?input.environmentId():(Long)before.get("environmentId"),ver=input.testVersionId()!=null?input.testVersionId():(Long)before.get("testVersionId");
        boolean changed=!Objects.equals(env,before.get("environmentId"))||!Objects.equals(ver,before.get("testVersionId"));
        Long audit=null;
        if(changed){save(p,row,env,ver);var key=new org.springframework.jdbc.support.GeneratedKeyHolder();db.update(c->{var s=c.prepareStatement("INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(?,?,'TEST_DOCUMENT_ROW',?,'CASE_CONTEXT_UPDATED',UTC_TIMESTAMP(6))",java.sql.Statement.RETURN_GENERATED_KEYS);s.setLong(1,p);s.setString(2,actor);s.setLong(3,row);return s;},key);audit=Objects.requireNonNull(key.getKey()).longValue();}
        var after=read(p,row);db.update("INSERT INTO test_document_context_changes(project_id,row_id,actor_id,request_key,payload,response_json,before_json,audit_id,created_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,row,actor,input.requestKey().toString(),payload,encode(after),encode(before),audit);return after;
    }
    public void check(Map<String,Object> current,Long expected){if(expected!=null&&((Number)current.get("contextVersion")).longValue()!=expected)throw conflict();}
    public void save(long p,long row,Long env,Long ver){db.update("UPDATE test_document_case_contexts SET environment_id=?,test_version_id=?,context_version=context_version+1 WHERE project_id=? AND row_id=?",env,ver,p,row);}
    public Map<String,Object> decode(String value){try{return json.readValue(value,new TypeReference<LinkedHashMap<String,Object>>(){});}catch(Exception e){throw new IllegalStateException(e);}}
    private String encode(Object value){try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException(e);}}
    private BusinessException conflict(){return new BusinessException(409,"CASE_CONTEXT_CONFLICT","Thông tin môi trường/version đã thay đổi. Tải lại trước khi lưu.");}
}
