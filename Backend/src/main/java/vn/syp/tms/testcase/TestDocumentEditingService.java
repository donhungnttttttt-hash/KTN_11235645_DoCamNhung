package vn.syp.tms.testcase;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.execution.ExecutionService;
import vn.syp.tms.execution.ExecutionDtos;
import vn.syp.tms.shared.web.BusinessException;

@Service
@Transactional
public class TestDocumentEditingService {
    private final JdbcTemplate db;
    private final ProjectService projects;
    private final TestDocumentService documents;
    private final TestCaseService cases;
    private final ExecutionService execution;
    private final ProjectAudit audit;
    public TestDocumentEditingService(JdbcTemplate db,ProjectService projects,TestDocumentService documents,
            TestCaseService cases,ExecutionService execution,ProjectAudit audit) {
        this.db=db;this.projects=projects;this.documents=documents;this.cases=cases;this.execution=execution;this.audit=audit;
    }
    public int approveRows(long p,String actor,long document,TestDocumentDtos.ApproveRows input) {
        projects.lockWritableProject(p,actor);projects.requireProjectPm(p,actor);
        if(input.rows()==null||input.rows().isEmpty()||input.rows().size()>500)fail(422,"SCOPE_LIMIT","Chọn từ 1 đến 500 case để duyệt.");
        var detail=documents.get(p,actor,document);var selected=new ArrayList<TestDocumentDtos.Row>();var ids=new HashSet<Long>();
        for(var selection:input.rows()){
            if(!ids.add(selection.rowId()))fail(422,"INVALID_SCOPE","Không chọn trùng dòng.");
            var row=row(detail,selection.rowId());
            if(row.archived())fail(409,"ARCHIVED","Phạm vi có case đã lưu trữ.");
            if(!row.revisionId().equals(selection.expectedRevisionId()))conflict();
            selected.add(row);
        }
        // Validate all pins before writing; the transaction rolls back every approval on failure.
        for(var row:selected)cases.approveRevision(p,actor,row.caseId(),row.revisionId());
        return selected.size();
    }
    public void edit(long p,String actor,long document,long rowId,int column,TestDocumentDtos.EditCell input) {
        projects.lockWritableProject(p,actor);
        var detail=documents.get(p,actor,document);var row=row(detail,rowId);
        if(row.archived()) fail(409,"ARCHIVED","Test case đã được lưu trữ.");
        if(!row.revisionId().equals(input.expectedRevisionId())) conflict();
        if(column<0 || column>=detail.headers().size() || Objects.equals(detail.columns().get("sourceId"),column)
                || Objects.equals(detail.columns().get("result"),column) || ("INTERNAL_V1".equals(detail.document().format()) && column==1))
            fail(422,"CELL_READ_ONLY","Ô định danh hoặc kết quả cần được cập nhật bằng thao tác riêng.");
        long version=detail.cellVersions().getOrDefault(rowId,Map.of()).getOrDefault(column,0L);
        if(version!=input.expectedVersion()) conflict();
        String before=row.cells().get(column),value=input.value();
        if(before.equals(value))return;
        String field=detail.columns().entrySet().stream().filter(e->e.getValue()==column).map(e->e.getKey()).findFirst().orElse("");
        if(!"CUSTOMER_V1".equals(detail.document().format())) field=switch(column) {
            case 2->"titleVi";case 3->"preconditionsVi";case 4->"stepsVi";case 5->"expectedVi";
            case 6->"titleJp";case 7->"preconditionsJp";case 8->"stepsJp";case 9->"expectedJp";case 10->"sourceReference";default->"";};
        var canonical=Set.of("titleVi","preconditionsVi","stepsVi","expectedVi","titleJp","preconditionsJp","stepsJp","expectedJp","sourceReference");
        if(canonical.contains(field)) {
            var revision=cases.getCaseDetail(p,actor,row.caseId()).currentRevision();
            Map<String,String> values=new HashMap<>();
            values.put("titleVi",revision.titleVi());values.put("preconditionsVi",revision.preconditionsVi());
            values.put("stepsVi",revision.stepsVi());values.put("expectedVi",revision.expectedVi());
            values.put("titleJp",revision.titleJp());values.put("preconditionsJp",revision.preconditionsJp());
            values.put("stepsJp",revision.stepsJp());values.put("expectedJp",revision.expectedJp());values.put("sourceReference",revision.sourceReference());
            values.put(field,value);
            cases.addRevision(p,actor,row.caseId(),new TestCaseDtos.CreateRevision(values.get("titleVi"),values.get("preconditionsVi"),values.get("stepsVi"),
                    values.get("expectedVi"),values.get("titleJp"),values.get("preconditionsJp"),values.get("stepsJp"),values.get("expectedJp"),values.get("sourceReference"),row.revisionId()));
        } else {
            db.update("INSERT INTO test_document_cell_edits(project_id,row_id,column_index,cell_value,lock_version) VALUES(?,?,?,?,1) ON DUPLICATE KEY UPDATE cell_value=?,lock_version=lock_version+1",p,rowId,column,value,value);
        }
        db.update("INSERT INTO test_document_cell_changes(project_id,row_id,column_index,before_value,after_value,actor_id,changed_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,rowId,column,before,value,actor);
        audit.record(p,actor,"TEST_DOCUMENT_CELL",rowId,"EDIT");
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> history(long p,String actor,long document,long rowId,int column) {
        row(documents.get(p,actor,document),rowId);
        return db.queryForList("SELECT c.before_value AS beforeValue,c.after_value AS afterValue,c.changed_at AS changedAt,u.display_name AS actor FROM test_document_cell_changes c JOIN identity_users u ON u.id=c.actor_id WHERE c.project_id=? AND c.row_id=? AND c.column_index=? ORDER BY c.id DESC LIMIT 50",p,rowId,column);
    }
    public void assign(long p,String actor,long document,long rowId,TestDocumentDtos.AssignSecondTest input) {
        projects.lockWritableProject(p,actor);projects.requireProjectPm(p,actor);
        var detail=documents.get(p,actor,document);var row=row(detail,rowId);
        if(row.archived())fail(409,"ARCHIVED","Test case đã được lưu trữ.");
        if(!row.revisionId().equals(input.expectedRevisionId()))conflict();
        if(db.queryForObject("SELECT COUNT(*) FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.id=? AND m.project_role='TESTER' AND m.active=TRUE AND u.enabled=TRUE AND u.role_code<>'DEV'",Long.class,p,input.assigneeMembershipId())!=1)
            fail(422,"TESTER_REQUIRED","Chọn Tester đang hoạt động trong dự án.");
        var existing=detail.secondTests().stream().filter(r->num(r,"rowId")==rowId).findFirst();
        if(existing.isPresent()) {
            var old=existing.get();
            if(num(old,"version")!=input.expectedVersion())conflict();
            if(num(old,"cycleId")!=input.cycleId() || num(old,"configurationId")!=input.configurationId())
                fail(409,"RETEST_CONTEXT_LOCKED","Giữ đợt và cấu hình của lượt lần 2 đã phân công.");
            execution.assign(p,actor,num(old,"runItemId"),new ExecutionDtos.Assignment(input.assigneeMembershipId(),"PM cập nhật phân công test lần 2",input.expectedRunVersion()));
            db.update("UPDATE test_document_retests SET note=?,lock_version=lock_version+1 WHERE project_id=? AND row_id=?",input.note(),p,rowId);
        } else {
            if(input.expectedVersion()!=0)conflict();
            execution.addScope(p,actor,input.cycleId(),new ExecutionDtos.AddScope(input.configurationId(),List.of(row.revisionId()),input.assigneeMembershipId(),input.expectedCycleVersion()));
            long run=Objects.requireNonNull(db.queryForObject("SELECT id FROM run_items WHERE project_id=? AND cycle_id=? AND configuration_id=? AND test_case_id=?",Long.class,p,input.cycleId(),input.configurationId(),row.caseId()));
            db.update("INSERT INTO test_document_retests(project_id,row_id,test_case_id,run_item_id,note) VALUES(?,?,?,?,?)",p,rowId,row.caseId(),run,input.note());
        }
        audit.record(p,actor,"TEST_DOCUMENT_RETEST",rowId,existing.isPresent()?"UPDATE":"ASSIGN");
    }
    private TestDocumentDtos.Row row(TestDocumentDtos.Detail detail,long id) {
        return detail.rows().stream().filter(r->r.rowId()==id).findFirst().orElseThrow(()->new BusinessException(404,"NOT_FOUND","Không tìm thấy dòng trong tài liệu."));
    }
    private static long num(Map<String,Object> row,String key){return ((Number)row.get(key)).longValue();}
    private static void conflict(){fail(409,"VERSION_CONFLICT","Dữ liệu đã thay đổi. Tải lại rồi kiểm tra nội dung trước khi lưu.");}
    private static void fail(int status,String code,String message){throw new BusinessException(status,code,message);}
}
