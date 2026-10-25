package vn.syp.tms.feature;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.sql.Statement;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.testcase.*;
import vn.syp.tms.shared.search.MultiWordSearch;

/** Feature-owned documents reuse workbook/revision projection, without cycle/run/device prerequisites. */
@Service
@Transactional
public class FeatureService {
    private final JdbcTemplate db;
    private final ProjectService projects;
    private final IdentityService identity;
    private final ObjectMapper json;
    private final TestCaseWorkbook workbook;
    private final TestDocumentService documents;
    public FeatureService(JdbcTemplate db,ProjectService projects,IdentityService identity,ObjectMapper json,
            TestCaseWorkbook workbook,TestDocumentService documents) {
        this.db=db;this.projects=projects;this.identity=identity;this.json=json;this.workbook=workbook;this.documents=documents;
    }
    public record Actor(boolean manager,Long membershipId) {}
    private Actor writer(long p,String actor,boolean manager) {
        var user=identity.lockCurrent(actor);
        var state=db.queryForList("SELECT archived_at FROM projects WHERE id=? FOR UPDATE",p);
        if(state.isEmpty()) throw missing();
        projects.requireReadAccess(p,actor);
        if(state.getFirst().get("archived_at")!=null)fail(409,"ARCHIVED","Dự án đã lưu trữ.");
        if("ADMIN".equals(user.getRole()))return new Actor(true,null);
        var members=db.queryForList("SELECT id,project_role FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE FOR UPDATE",p,actor);
        if(members.isEmpty())throw missing();
        String role=String.valueOf(members.getFirst().get("project_role"));
        boolean pm="PM".equals(role) && !"DEV".equals(user.getRole());
        if((manager&&!pm)||(!pm&&(!"TESTER".equals(role)||"DEV".equals(user.getRole()))))fail(403,"FORBIDDEN","Bạn không có quyền thay đổi dữ liệu kiểm thử này.");
        return new Actor(pm,num(members.getFirst(),"id"));
    }
    private Map<String,Object> feature(long p,long f,boolean lock) {
        var rows=db.queryForList("SELECT id,project_id AS projectId,name,environment,description,archived_at AS archivedAt,lock_version AS version,created_at AS createdAt,updated_at AS updatedAt FROM testing_features WHERE project_id=? AND id=?"+(lock?" FOR UPDATE":""),p,f);
        if(rows.isEmpty())throw missing();return rows.getFirst();
    }
    private void active(Map<String,Object> value) {if(value.get("archivedAt")!=null)fail(409,"ARCHIVED","Feature hoặc file đã lưu trữ.");}
    private void version(Map<String,Object> value,long expected) {if(num(value,"version")!=expected)fail(409,"VERSION_CONFLICT","Dữ liệu đã thay đổi. Tải lại trước khi lưu.");}
    public boolean owns(long p,long d) {
        return Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) FROM import_batches WHERE project_id=? AND id=? AND feature_id IS NOT NULL",Long.class,p,d))>0;
    }
    public Long owningDocument(long p,long caseId) {
        var ids=db.queryForList("SELECT owning_document_id FROM test_cases WHERE project_id=? AND id=? AND owning_document_id IS NOT NULL",Long.class,p,caseId);
        return ids.isEmpty()?null:ids.getFirst();
    }
    public Map<String,Object> requireDocumentWritable(long p,String actor,long d,boolean manager) {
        writer(p,actor,manager);return lockDocument(p,d);
    }
    private Map<String,Object> lockDocument(long p,long d) {
        var fs=db.queryForList("SELECT feature_id FROM import_batches WHERE project_id=? AND id=? AND feature_id IS NOT NULL",p,d);
        if(fs.isEmpty())throw missing();
        var f=feature(p,num(fs.getFirst(),"feature_id"),true);active(f);
        var rows=db.queryForList("SELECT id,feature_id AS featureId,lock_version AS version,archived_at AS archivedAt,status FROM import_batches WHERE project_id=? AND id=? FOR UPDATE",p,d);
        var result=rows.getFirst();active(result);return result;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> get(long p,String actor,long f) {
        projects.requireReadAccess(p,actor);var result=feature(p,f,false);result.putAll(metrics(p,f,null));return result;
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> testVersions(long p,String actor,long f) {
        projects.requireReadAccess(p,actor);feature(p,f,false);
        return db.queryForList("SELECT id,name,created_at AS createdAt FROM feature_test_versions WHERE project_id=? AND feature_id=? AND deleted_at IS NULL ORDER BY created_at DESC,id DESC",p,f);
    }
    public void deleteTestVersion(long p,String actor,long f,long id) {
        writer(p,actor,true);active(feature(p,f,true));
        var rows=db.queryForList("SELECT deleted_at FROM feature_test_versions WHERE project_id=? AND feature_id=? AND id=? FOR UPDATE",p,f,id);
        if(rows.isEmpty())throw missing();
        if(rows.getFirst().get("deleted_at")!=null)return;
        db.update("UPDATE feature_test_versions SET deleted_at=UTC_TIMESTAMP(6),deleted_by=? WHERE project_id=? AND feature_id=? AND id=?",actor,p,f,id);
        db.update("INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(?,?,'FEATURE_TEST_VERSION',?,'DELETE',UTC_TIMESTAMP(6))",p,actor,id);
    }
    public Map<String,Object> createTestVersion(long p,String actor,long f,FeatureDtos.CreateTestVersion input) {
        writer(p,actor,true);active(feature(p,f,true));
        String payload=encode(List.of(f,input)),key=input.requestKey().toString();
        var replay=replay(p,actor,key,"TEST_VERSION_CREATE",payload);if(replay!=null)return replay;
        String name=input.name().trim();
        if(name.isEmpty()||name.length()>255)fail(422,"INVALID_TEST_VERSION","Tên version test phải có từ 1 đến 255 ký tự.");
        if(!db.queryForList("SELECT id FROM feature_test_versions WHERE project_id=? AND feature_id=? AND name=? AND deleted_at IS NULL",p,f,name).isEmpty())
            fail(409,"TEST_VERSION_EXISTS","Version test này đã có trong Feature.");
        long id=insert("INSERT INTO feature_test_versions(project_id,feature_id,name,created_by,created_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))",p,f,name,actor);
        var result=db.queryForMap("SELECT id,name,created_at AS createdAt FROM feature_test_versions WHERE id=?",id);
        remember(p,f,null,actor,key,"TEST_VERSION_CREATE",payload,result);return result;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> list(long p,String actor,int page,int size,String keyword,boolean archived) {
        return list(p,actor,page,size,keyword,archived,null,null,"created-desc");
    }
    @Transactional(readOnly=true)
    public Map<String,Object> list(long p,String actor,int page,int size,String keyword,boolean archived,
            String createdFrom,String createdTo,String sort) {
        projects.requireReadAccess(p,actor);validatePage(page,size,keyword);
        LocalDate from=creationDate(createdFrom),through=creationDate(createdTo);
        if(from!=null&&through!=null&&from.isAfter(through))
            fail(422,"INVALID_FILTER","Ngày tạo bắt đầu không được sau ngày kết thúc.");
        String order=switch(sort==null?"":sort.trim()) {
            case "", "created-desc" -> "created_at DESC,id DESC";
            case "created-asc" -> "created_at ASC,id ASC";
            case "name-asc" -> "name ASC,id ASC";
            default -> throw new BusinessException(422,"INVALID_FILTER","Cách sắp xếp Feature không hợp lệ.");
        };
        String where=" WHERE project_id=? AND archived_at IS "+(archived?"NOT NULL":"NULL");
        List<Object> args=new ArrayList<>(List.of(p));
        var search=MultiWordSearch.sql(keyword,"name","environment","description");where+=search.sql();args.addAll(search.args());
        if(from!=null){where+=" AND created_at>=?";args.add(creationDateStartUtc(from));}
        if(through!=null){where+=" AND created_at<?";args.add(creationDateStartUtc(through.plusDays(1)));}
        long total=Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) FROM testing_features"+where,Long.class,args.toArray()));
        args.add(size);args.add((long)page*size);
        var items=db.queryForList("SELECT id,project_id AS projectId,name,environment,description,archived_at AS archivedAt,lock_version AS version,created_at AS createdAt,updated_at AS updatedAt FROM testing_features"+where+" ORDER BY "+order+" LIMIT ? OFFSET ?",args.toArray());
        for(var item:items)item.putAll(metrics(p,num(item,"id"),null));
        return page(items,total,page,size);
    }
    private static LocalDate creationDate(String value) {
        if(value==null||value.isBlank())return null;
        try {
            if(!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}"))throw new DateTimeException("Invalid date format");
            LocalDate date=LocalDate.parse(value);
            if(date.getYear()<1000)throw new DateTimeException("Date outside database range");
            return date;
        } catch(DateTimeException exception) {
            throw new BusinessException(422,"INVALID_FILTER","Ngày tạo phải là ngày hợp lệ theo định dạng YYYY-MM-DD, năm từ 1000 đến 9999.");
        }
    }
    private static LocalDateTime creationDateStartUtc(LocalDate date) {
        LocalDateTime utc=LocalDateTime.ofInstant(date.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant(),ZoneOffset.UTC);
        // The first supported Vietnam day begins before MySQL DATETIME's UTC lower bound.
        LocalDateTime earliest=LocalDate.of(1000,1,1).atStartOfDay();
        return utc.isBefore(earliest)?earliest:utc;
    }
    public Map<String,Object> create(long p,String actor,FeatureDtos.Create input) {
        writer(p,actor,true);String payload=encode(input);var replay=replay(p,actor,input.requestKey().toString(),"FEATURE_CREATE",payload);if(replay!=null)return replay;
        long id=insert("INSERT INTO testing_features(project_id,name,environment,description,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",p,input.name().trim(),input.environment().trim(),input.description().trim(),actor,actor);
        var result=get(p,actor,id);remember(p,id,null,actor,input.requestKey().toString(),"FEATURE_CREATE",payload,result);return result;
    }
    public Map<String,Object> update(long p,String actor,long f,FeatureDtos.Update input) {
        writer(p,actor,true);var previous=feature(p,f,true);active(previous);version(previous,input.expectedVersion());
        db.update("UPDATE testing_features SET name=?,environment=?,description=?,lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",input.name().trim(),input.environment().trim(),input.description().trim(),actor,p,f);
        return get(p,actor,f);
    }
    public Map<String,Object> archive(long p,String actor,long f,FeatureDtos.Version input,boolean archive) {
        writer(p,actor,true);var previous=feature(p,f,true);String action=archive?"FEATURE_ARCHIVE":"FEATURE_RESTORE",payload=encode(input);
        payload=encode(List.of(f,input));var replay=replay(p,actor,input.requestKey().toString(),action,payload);if(replay!=null)return replay;
        version(previous,input.expectedVersion());
        db.update("UPDATE testing_features SET archived_at="+(archive?"UTC_TIMESTAMP(6)":"NULL")+",lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",actor,p,f);
        var result=get(p,actor,f);remember(p,f,null,actor,input.requestKey().toString(),action,payload,result);return result;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> listDocuments(long p,String actor,long f,int page,int size,String keyword) {
        projects.requireReadAccess(p,actor);feature(p,f,false);validatePage(page,size,keyword);
        String where=" WHERE project_id=? AND feature_id=? AND status='COMMITTED' AND archived_at IS NULL";
        List<Object> args=new ArrayList<>(List.of(p,f));
        var search=MultiWordSearch.sql(keyword,"file_name");where+=search.sql();args.addAll(search.args());
        long total=Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) FROM import_batches"+where,Long.class,args.toArray()));
        args.add(size);args.add((long)page*size);
        var items=db.queryForList("SELECT id,feature_id AS featureId,file_name AS fileName,sheet_name AS sheetName,mapping_version AS format,lock_version AS version,created_at AS createdAt,committed_at AS updatedAt,(source_workbook IS NOT NULL) AS hasSourceFile FROM import_batches"+where+" ORDER BY id DESC LIMIT ? OFFSET ?",args.toArray());
        for(var item:items){long id=num(item,"id");item.putAll(metrics(p,f,id));item.put("assignees",db.queryForList("SELECT DISTINCT a.assignee_membership_id AS membershipId,u.display_name AS name FROM test_document_assignments a JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.assignee_membership_id JOIN identity_users u ON u.id=m.user_id WHERE a.project_id=? AND a.document_id=?",p,id));}
        return page(items,total,page,size);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> detail(long p,String actor,long d) {
        projects.requireReadAccess(p,actor);
        var docs=db.queryForList("SELECT feature_id,lock_version AS version,archived_at AS archivedAt FROM import_batches WHERE project_id=? AND id=? AND feature_id IS NOT NULL AND status='COMMITTED'",p,d);
        if(docs.isEmpty())throw missing();long f=num(docs.getFirst(),"feature_id");
        Map<String,Object> detail=json.convertValue(documents.get(p,actor,d),new TypeReference<LinkedHashMap<String,Object>>(){});
        @SuppressWarnings("unchecked") Map<String,Object> summary=(Map<String,Object>)detail.get("document");
        summary.putAll(docs.getFirst());summary.remove("feature_id");summary.put("featureId",f);summary.put("featureName",feature(p,f,false).get("name"));summary.putAll(metrics(p,f,d));
        var assignments=assignmentRows(p,d);Map<Long,Map<String,Object>> byRow=new HashMap<>();for(var a:assignments)byRow.put(num(a,"rowId"),a);
        boolean manager=projects.isGlobalAdmin(actor)||isProjectPm(p,actor);Long self=membership(p,actor);
        boolean projectActive=Objects.requireNonNull(db.queryForObject("SELECT archived_at IS NULL FROM projects WHERE id=?",Boolean.class,p));
        boolean writable=projectActive&&summary.get("archivedAt")==null&&feature(p,f,false).get("archivedAt")==null;
        @SuppressWarnings("unchecked") var rows=(List<Map<String,Object>>)detail.get("rows");
        for(var row:rows){var a=byRow.get(((Number)row.get("rowId")).longValue());if(a!=null)row.putAll(a);row.put("canUpdateResult",writable&&(manager||(self!=null&&a!=null&&Objects.equals(self,a.get("assigneeMembershipId"))&&eligible(p,self))));}
        detail.put("secondTests",List.of());detail.put("assignments",assignments);detail.put("canManage",manager&&writable);detail.put("canAssign",writable&&(manager||(self!=null&&eligible(p,self))));detail.put("canCreateIssue",writable&&(manager||(self!=null&&eligible(p,self))));detail.put("selfMembershipId",self);
        summary.put("canCreateIssue",detail.get("canCreateIssue"));
        detail.put("testVersions",testVersions(p,actor,f));
        var executions=new HashMap<Long,Map<String,Object>>();
        for(var value:db.queryForList("SELECT e.row_id AS rowId,e.test_version_id AS testVersionId,v.name AS testVersionName,e.executed_on AS executedOn FROM test_document_result_executions e JOIN import_rows ir ON ir.project_id=e.project_id AND ir.id=e.row_id AND ir.result_version=e.result_version JOIN feature_test_versions v ON v.id=e.test_version_id WHERE e.project_id=? AND e.document_id=?",p,d))executions.put(num(value,"rowId"),value);
        for(var value:rows){var execution=executions.get(num(value,"rowId"));if(execution!=null)value.putAll(execution);}
        return detail;
    }
    public Map<String,Object> hideDocument(long p,String actor,long f,long d,FeatureDtos.Version input) {
        writer(p,actor,true);active(feature(p,f,true));
        var matches=db.queryForList("SELECT id,feature_id AS featureId,lock_version AS version,archived_at AS archivedAt FROM import_batches WHERE project_id=? AND feature_id=? AND id=? AND status='COMMITTED' FOR UPDATE",p,f,d);
        if(matches.isEmpty())throw missing();var doc=matches.getFirst();
        String payload=encode(List.of(f,d,input)),key=input.requestKey().toString();var replay=replay(p,actor,key,"DOCUMENT_ARCHIVE",payload);if(replay!=null)return replay;
        active(doc);
        version(doc,input.expectedVersion());db.update("UPDATE import_batches SET archived_at=UTC_TIMESTAMP(6),lock_version=lock_version+1 WHERE project_id=? AND id=?",p,d);
        Map<String,Object> result=new LinkedHashMap<>(doc);result.put("version",num(doc,"version")+1);result.put("archived",true);remember(p,f,d,actor,key,"DOCUMENT_ARCHIVE",payload,result);return result;
    }
    public Map<String,Object> preview(long p,String actor,long f,MultipartFile file) {
        writer(p,actor,true);active(feature(p,f,true));var parsed=workbook.parse(file);
        for(var row:parsed.rows())if(row.caseNo()==null||row.caseNo().isBlank()||row.caseNo().length()>64)
            fail(422,"INVALID_WORKBOOK","ID nguồn bắt buộc, tối đa 64 ký tự. Không rút gọn ID khi nhập file.");
        Set<String> ids=new HashSet<>();for(var row:parsed.rows()){
            if(!ids.add(row.caseNo().toUpperCase(Locale.ROOT))||row.titleVi().isBlank()||row.titleVi().length()>255||row.stepsVi().isBlank()||row.expectedVi().isBlank()||row.titleJp().length()>255||row.sourceReference().length()>255)
                fail(422,"IMPORT_HAS_ERRORS","Kiểm tra ID và nội dung case bắt buộc trong file.");
        }
        long d=insert("INSERT INTO import_batches(project_id,feature_id,file_name,file_checksum,status,mapping_version,total_rows,valid_rows,error_rows,staged_expires_at,imported_by,created_at,sheet_name,source_workbook) VALUES(?,?,?,?,'PREVIEW',?,?,?,0,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 24 HOUR),?,UTC_TIMESTAMP(6),?,?)",p,f,parsed.fileName(),parsed.checksum(),parsed.format(),parsed.rows().size(),parsed.rows().size(),actor,parsed.sheetName(),parsed.sourceBytes());
        for(var row:parsed.rows())db.update("INSERT INTO import_rows(project_id,batch_id,source_row_number,source_case_key,suite_code,raw_data_json,is_valid,created_at) VALUES(?,?,?,?,?,?,TRUE,UTC_TIMESTAMP(6))",p,d,row.rowNumber(),row.caseNo(),"XLSX-"+d,encode(row));
        return getPreview(p,actor,f,d);
    }
    public Map<String,Object> getPreview(long p,String actor,long f,long d) {
        writer(p,actor,true);feature(p,f,false);
        var rows=db.queryForList("SELECT id,feature_id AS featureId,file_name AS fileName,status,total_rows AS totalRows,valid_rows AS validRows,error_rows AS errorRows,mapping_version AS format,sheet_name AS sheetName,staged_expires_at<UTC_TIMESTAMP(6) AS expired,imported_by FROM import_batches WHERE project_id=? AND feature_id=? AND id=?",p,f,d);
        if(rows.isEmpty())throw missing();var result=rows.getFirst();if(!actor.equals(result.get("imported_by")))throw missing();result.remove("imported_by");
        if(truth(result.remove("expired"))&&"PREVIEW".equals(result.get("status")))result.put("status","EXPIRED");
        result.put("rows",db.queryForList("SELECT id,source_row_number AS rowNumber,source_case_key AS caseNo,suite_code AS suiteCode,JSON_UNQUOTE(JSON_EXTRACT(raw_data_json,'$.titleVi')) AS titleVi,is_valid AS valid,error_message AS errorMessage FROM import_rows WHERE project_id=? AND batch_id=? ORDER BY source_row_number",p,d));return result;
    }
    public Map<String,Object> commit(long p,String actor,long f,long d) {
        writer(p,actor,true);active(feature(p,f,true));var doc=lockDocument(p,d);if(num(doc,"featureId")!=f)throw missing();
        var preview=getPreview(p,actor,f,d);if("COMMITTED".equals(preview.get("status")))return documentSummary(p,actor,f,d);
        if(!"PREVIEW".equals(preview.get("status")))fail(410,"EXPIRED","Bản xem trước đã hết hạn.");
        long suite=insert("INSERT INTO test_suites(project_id,code,name,description,sort_order,created_at,updated_at) VALUES(?,?,?,'Feature-owned workbook',0,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",p,"XLSX-"+d,shorten(String.valueOf(preview.get("fileName")),100));
        for(var row:db.queryForList("SELECT id,source_row_number,raw_data_json FROM import_rows WHERE project_id=? AND batch_id=? ORDER BY id FOR UPDATE",p,d)){
            TestCaseDtos.ImportRowInput input=decode(String.valueOf(row.get("raw_data_json")),TestCaseDtos.ImportRowInput.class);long rowId=num(row,"id");
            long c=insert("INSERT INTO test_cases(project_id,case_no,suite_id,owning_document_id,created_at,updated_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",p,"XLSX-"+d+"-"+num(row,"source_row_number"),suite,d);
            long revision=insert("INSERT INTO test_case_revisions(project_id,test_case_id,revision_no,title_vi,preconditions_vi,steps_vi,expected_vi,title_jp,preconditions_jp,steps_jp,expected_jp,source_reference,created_by_user_id,created_at) VALUES(?,?,1,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,c,input.titleVi(),input.preconditionsVi(),input.stepsVi(),input.expectedVi(),input.titleJp(),input.preconditionsJp(),input.stepsJp(),input.expectedJp(),input.sourceReference(),actor);
            db.update("UPDATE test_cases SET current_revision_id=? WHERE project_id=? AND id=?",revision,p,c);
            db.update("UPDATE import_rows SET target_case_id=?,owning_document_id=? WHERE project_id=? AND id=?",c,d,p,rowId);
            db.update("INSERT INTO test_document_assignments(project_id,document_id,row_id) VALUES(?,?,?)",p,d,rowId);
        }
        db.update("UPDATE import_batches SET status='COMMITTED',committed_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",p,d);
        return documentSummary(p,actor,f,d);
    }
    private Map<String,Object> documentSummary(long p,String actor,long f,long d) {
        @SuppressWarnings("unchecked") var result=(Map<String,Object>)detail(p,actor,d).get("document");return result;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> assignments(long p,String actor,long d) {
        projects.requireReadAccess(p,actor);var docs=db.queryForList("SELECT id,feature_id AS featureId,lock_version AS version FROM import_batches WHERE project_id=? AND id=? AND feature_id IS NOT NULL AND status='COMMITTED'",p,d);if(docs.isEmpty())throw missing();
        var result=docs.getFirst();result.put("documentId",d);result.put("items",assignmentRows(p,d));return result;
    }
    public Map<String,Object> assign(long p,String actor,long d,FeatureDtos.Assignments input) {
        Actor caller=writer(p,actor,false);var doc=lockDocument(p,d);if(!"COMMITTED".equals(doc.get("status")))throw missing();
        String payload=encode(List.of(d,input)),key=input.requestKey().toString();var replay=replay(p,actor,key,"ASSIGNMENTS",payload);if(replay!=null)return replay;
        version(doc,input.expectedVersion());var current=new LinkedHashMap<Long,Long>();
        for(var row:db.queryForList("SELECT row_id,assignee_membership_id FROM test_document_assignments WHERE project_id=? AND document_id=? ORDER BY row_id FOR UPDATE",p,d))current.put(num(row,"row_id"),(Long)row.get("assignee_membership_id"));
        for(var scope:input.changes())if(!eligible(p,scope.assigneeMembershipId()))fail(422,"TESTER_REQUIRED","Chọn Tester đang hoạt động trong dự án.");
        var next=AssignmentPlan.apply(current,input.changes().stream().map(s->new AssignmentPlan.Change(s.assigneeMembershipId(),s.rowIds())).toList(),caller.membershipId(),caller.manager());
        for(var entry:next.entrySet())if(!Objects.equals(current.get(entry.getKey()),entry.getValue())){
            db.update("UPDATE test_document_assignments SET latest_tester_membership_id=CASE WHEN first_tester_membership_id IS NOT NULL AND ? IS NOT NULL THEN ? ELSE latest_tester_membership_id END,first_tester_membership_id=COALESCE(first_tester_membership_id,?),assignee_membership_id=? WHERE project_id=? AND row_id=?",entry.getValue(),entry.getValue(),entry.getValue(),entry.getValue(),p,entry.getKey());
            db.update("INSERT INTO test_document_assignment_changes(project_id,document_id,row_id,previous_membership_id,new_membership_id,actor_id,changed_at,document_version,request_key) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6),?,?)",p,d,entry.getKey(),current.get(entry.getKey()),entry.getValue(),actor,input.expectedVersion()+1,key);
        }
        db.update("UPDATE import_batches SET lock_version=lock_version+1 WHERE project_id=? AND id=?",p,d);
        var result=assignments(p,actor,d);remember(p,num(doc,"featureId"),d,actor,key,"ASSIGNMENTS",payload,result);return result;
    }
    public TestDocumentDtos.Result updateResult(long p,String actor,long d,long row,TestDocumentDtos.UpdateResult input) {
        Actor caller=writer(p,actor,false);var document=lockDocument(p,d);
        var rows=db.queryForList("SELECT assignee_membership_id FROM test_document_assignments WHERE project_id=? AND document_id=? AND row_id=? FOR UPDATE",p,d,row);
        if(rows.isEmpty())throw missing();
        if(!caller.manager()&&!Objects.equals(caller.membershipId(),rows.getFirst().get("assignee_membership_id")))fail(403,"FORBIDDEN","Case này không thuộc phạm vi bạn phụ trách.");
        if(!Set.of("UNEXECUTED","OK","NG","P","NA").contains(input.status()))fail(422,"INVALID_STATUS","Status không hợp lệ.");
        if(input.testVersionId()==null&&!testVersions(p,actor,num(document,"featureId")).isEmpty())
            fail(422,"TEST_VERSION_REQUIRED","Chọn version test và ngày thực hiện trước khi ghi kết quả.");
        return documents.updateResult(p,actor,d,row,input);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> history(long p,String actor,long d,long before) {
        assignments(p,actor,d);if(before<0)fail(422,"INVALID_REQUEST","Mốc lịch sử không hợp lệ.");
        var items=db.queryForList("SELECT h.id,h.row_id AS rowId,h.previous_membership_id AS previousMembershipId,h.new_membership_id AS newMembershipId,u.display_name AS actor,h.changed_at AS changedAt,h.document_version AS documentVersion FROM test_document_assignment_changes h JOIN identity_users u ON u.id=h.actor_id WHERE h.project_id=? AND h.document_id=? AND (?=0 OR h.id<?) ORDER BY h.id DESC LIMIT 51",p,d,before,before);
        boolean more=items.size()>50;if(more)items=new ArrayList<>(items.subList(0,50));var result=new LinkedHashMap<String,Object>();result.put("items",items);result.put("nextBefore",more?items.getLast().get("id"):null);return result;
    }
    private List<Map<String,Object>> assignmentRows(long p,long d) {
        return db.queryForList("SELECT a.row_id AS rowId,a.assignee_membership_id AS assigneeMembershipId,u.display_name AS assigneeName,f.display_name AS firstTesterName,l.display_name AS latestTesterName FROM test_document_assignments a LEFT JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.assignee_membership_id LEFT JOIN identity_users u ON u.id=m.user_id LEFT JOIN project_memberships fm ON fm.project_id=a.project_id AND fm.id=a.first_tester_membership_id LEFT JOIN identity_users f ON f.id=fm.user_id LEFT JOIN project_memberships lm ON lm.project_id=a.project_id AND lm.id=a.latest_tester_membership_id LEFT JOIN identity_users l ON l.id=lm.user_id WHERE a.project_id=? AND a.document_id=? ORDER BY a.row_id",p,d);
    }
    private Map<String,Object> metrics(long p,long f,Long d) {
        List<Object> args=new ArrayList<>(List.of(p,f));String filter=d==null?"":" AND b.id=?";if(d!=null)args.add(d);
        var result=db.queryForMap("SELECT COUNT(DISTINCT b.id) AS documentCount,COUNT(ir.id) AS caseCount,COALESCE(SUM(ir.result_status<>'UNEXECUTED'),0) AS testedCaseCount FROM import_batches b LEFT JOIN import_rows ir ON ir.project_id=b.project_id AND ir.batch_id=b.id AND ir.target_case_id IS NOT NULL WHERE b.project_id=? AND b.feature_id=? AND b.status='COMMITTED' AND b.archived_at IS NULL"+filter,args.toArray());
        long total=num(result,"caseCount"),tested=num(result,"testedCaseCount");result.put("progressPercent",total==0?0d:100d*tested/total);return result;
    }
    private boolean eligible(long p,long member) {
        return Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.id=? AND m.active=TRUE AND m.project_role='TESTER' AND u.enabled=TRUE AND u.role_code<>'DEV'",Long.class,p,member))==1;
    }
    private boolean isProjectPm(long p,String actor){return Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.user_id=? AND m.active=TRUE AND m.project_role='PM' AND u.enabled=TRUE AND u.role_code<>'DEV'",Long.class,p,actor))==1;}
    private Long membership(long p,String actor){var rows=db.queryForList("SELECT id FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE",Long.class,p,actor);return rows.isEmpty()?null:rows.getFirst();}
    private Map<String,Object> replay(long p,String actor,String key,String action,String payload) {
        var rows=db.queryForList("SELECT actor_id,action,request_checksum,response_json FROM testing_commands WHERE project_id=? AND request_key=?",p,key);if(rows.isEmpty())return null;
        var old=rows.getFirst();if(!actor.equals(old.get("actor_id"))||!action.equals(old.get("action"))||!checksum(payload).equals(old.get("request_checksum")))fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã dùng cho nội dung khác.");
        try{return json.readValue(String.valueOf(old.get("response_json")),new TypeReference<LinkedHashMap<String,Object>>(){});}catch(Exception e){throw new IllegalStateException("Invalid saved command response",e);}
    }
    private void remember(long p,long f,Long d,String actor,String key,String action,String payload,Object result){db.update("INSERT INTO testing_commands(project_id,feature_id,document_id,actor_id,request_key,request_checksum,action,response_json,created_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,f,d,actor,key,checksum(payload),action,encode(result));}
    private long insert(String sql,Object... args){var holder=new GeneratedKeyHolder();db.update(connection->{var s=Objects.requireNonNull(connection.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS));for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s;},holder);return Objects.requireNonNull(holder.getKey()).longValue();}
    private String encode(Object value){try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalArgumentException("Invalid command",e);}}
    private <T>T decode(String value,Class<T> type){try{return json.readValue(value,type);}catch(Exception e){throw new BusinessException(409,"DOCUMENT_DATA_INVALID","Dữ liệu import không hợp lệ.");}}
    private static String checksum(String value){return TestCaseWorkbook.sha256(value.getBytes(StandardCharsets.UTF_8));}
    private static Map<String,Object> page(Object items,long total,int page,int size){return Map.of("items",items,"totalItems",total,"page",page,"pageSize",size,"totalPages",(total+size-1)/size);}
    private static void validatePage(int page,int size,String keyword){if(page<0||page>100000||size<1||size>100||keyword==null||keyword.length()>255)fail(422,"INVALID_SEARCH","Tìm kiếm không hợp lệ.");}
    private static String shorten(String value,int max){return value.length()>max?value.substring(0,max):value;}
    public static long num(Map<String,Object> value,String key){return ((Number)value.get(key)).longValue();}
    private static boolean truth(Object value){return Boolean.TRUE.equals(value)||value instanceof Number n&&n.intValue()!=0;}
    private static BusinessException missing(){return new BusinessException(404,"NOT_FOUND","Không tìm thấy dữ liệu trong dự án/Feature này.");}
    private static void fail(int status,String code,String message){throw new BusinessException(status,code,message);}
}
