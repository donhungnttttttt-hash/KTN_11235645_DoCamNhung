package vn.syp.tms.execution;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.lang.NonNull;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.filework.FileWorkGuard;

@Service
@Transactional
public class ExecutionService {
    private final JdbcTemplate db;
    private final ProjectService projects;
    private final ProjectAudit audit;
    private final ObjectMapper json;
    private final FileWorkGuard fileGuard;

    public ExecutionService(JdbcTemplate db, ProjectService projects, ProjectAudit audit, ObjectMapper json, FileWorkGuard fileGuard) {
        this.db=db; this.projects=projects; this.audit=audit; this.json=json; this.fileGuard=Objects.requireNonNull(fileGuard);
    }

    private static final String CYCLE="SELECT c.id,c.code,c.name,c.status_code AS statusCode,c.lock_version AS version,c.milestone_id AS milestoneId,c.activated_at AS activatedAt,(SELECT COUNT(*) FROM run_items r WHERE r.project_id=c.project_id AND r.cycle_id=c.id) AS runCount FROM test_cycles c ";
    private static final String RUN="""
        SELECT r.id,r.cycle_id AS cycleId,r.configuration_id AS configurationId,r.test_case_id AS testCaseId,
        r.revision_id AS revisionId,r.assignee_membership_id AS assigneeMembershipId,r.lock_version AS version,
        (SELECT i.group_id FROM file_work_group_items i WHERE i.project_id=r.project_id AND i.run_item_id=r.id) AS fileWorkGroupId,
        tc.case_no AS caseNo,rv.revision_no AS revisionNo,rv.title_vi AS titleVi,
        rv.preconditions_vi AS preconditionsVi,rv.steps_vi AS stepsVi,rv.expected_vi AS expectedVi,
        u.display_name AS assigneeName,m.user_id AS assigneeUserId,
        cf.environment_id AS environmentId,cf.device_id AS deviceId,cf.default_build_id AS defaultBuildId,
        e.name AS environmentName,d.name AS deviceName,COALESCE(a.result_code,'NOT_RUN') AS resultCode,
        a.id AS latestAttemptId,a.executed_at AS executedAt,COALESCE(sd.excluded,FALSE) AS excluded,sd.reason AS scopeReason,
        (NOT COALESCE(sd.excluded,FALSE) AND a.result_code='NG' AND NOT EXISTS(SELECT 1 FROM work_item_execution_links l WHERE l.project_id=a.project_id AND l.attempt_id=a.id)) AS pendingBugLink
        FROM run_items r JOIN test_cases tc ON tc.project_id=r.project_id AND tc.id=r.test_case_id
        JOIN test_case_revisions rv ON rv.project_id=r.project_id AND rv.test_case_id=r.test_case_id AND rv.id=r.revision_id
        JOIN project_memberships m ON m.project_id=r.project_id AND m.id=r.assignee_membership_id
        JOIN identity_users u ON u.id=m.user_id
        JOIN cycle_configurations cf ON cf.project_id=r.project_id AND cf.cycle_id=r.cycle_id AND cf.id=r.configuration_id
        JOIN environments e ON e.project_id=r.project_id AND e.id=cf.environment_id
        JOIN devices d ON d.project_id=r.project_id AND d.id=cf.device_id
        LEFT JOIN execution_attempts a ON a.project_id=r.project_id AND a.run_item_id=r.id AND a.id=r.latest_attempt_id
        LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id
        """;
    private static final String ATTEMPT="""
        SELECT a.id,a.run_item_id AS runItemId,a.attempt_no AS attemptNo,a.result_code AS resultCode,
        a.build_id AS buildId,a.executor_membership_id AS executorMembershipId,a.executed_at AS executedAt,
        a.actual_result AS actualResult,a.reason,a.evidence_reference AS evidenceReference,
        a.context_snapshot AS contextSnapshot,a.file_work_session_id AS fileWorkSessionId,u.display_name AS executorName
        FROM execution_attempts a JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.executor_membership_id
        JOIN identity_users u ON u.id=m.user_id
        """;

    @Transactional(readOnly=true)
    public ExecutionDtos.Page<Map<String,Object>> cycles(long p,String actor,int page,int size) {
        projects.requireMembership(p,actor); paging(page,size);
        long total=count("SELECT COUNT(*) FROM test_cycles WHERE project_id=?",p);
        return new ExecutionDtos.Page<>(rows(CYCLE+"WHERE c.project_id=? ORDER BY c.id DESC LIMIT ? OFFSET ?",p,size,(long)page*size),total,page,size,(int)((total+size-1)/size));
    }

    public Map<String,Object> create(long p,String actor,ExecutionDtos.CreateCycle input) {
        projects.lockWritableProject(p,actor);
        if(count("SELECT COUNT(*) FROM test_cycles WHERE project_id=? AND code=?",p,input.code())>0) fail(409,"DUPLICATE_CODE","Mã đợt kiểm thử đã tồn tại.");
        if(input.milestoneId()!=null) row("SELECT id FROM milestones WHERE project_id=? AND id=? AND archived_at IS NULL",p,input.milestoneId());
        long id=insert("INSERT INTO test_cycles(project_id,code,name,milestone_id,created_at,created_by) VALUES(?,?,?,?,UTC_TIMESTAMP(6),?)",p,input.code(),input.name().trim(),input.milestoneId(),member(p,actor));
        audit.record(p,actor,"TEST_CYCLE",id,"CREATE"); return cycle(p,actor,id);
    }

    @Transactional(readOnly=true)
    public Map<String,Object> cycle(long p,String actor,long id) {
        projects.requireMembership(p,actor);
        return row(CYCLE+"WHERE c.project_id=? AND c.id=?",p,id);
    }

    @Transactional(readOnly=true)
    public List<Map<String,Object>> configurations(long p,String actor,long cycle) {
        cycle(p,actor,cycle);
        return rows("""
            SELECT c.id,c.environment_id AS environmentId,c.device_id AS deviceId,c.default_build_id AS buildId,
            e.name AS environmentName,d.name AS deviceName,b.version_label AS versionLabel,b.build_number AS buildNumber
            FROM cycle_configurations c JOIN environments e ON e.project_id=c.project_id AND e.id=c.environment_id
            JOIN devices d ON d.project_id=c.project_id AND d.id=c.device_id
            JOIN builds b ON b.project_id=c.project_id AND b.id=c.default_build_id
            WHERE c.project_id=? AND c.cycle_id=? ORDER BY c.id
            """,p,cycle);
    }

    public Map<String,Object> configure(long p,String actor,long id,ExecutionDtos.Configuration input) {
        projects.lockWritableProject(p,actor); var c=cycle(p,actor,id); draft(c); version(c,input.expectedVersion());
        context(p,input.environmentId(),input.deviceId(),input.buildId());
        if(count("SELECT COUNT(*) FROM cycle_configurations WHERE project_id=? AND cycle_id=?",p,id)>=50) fail(422,"SCOPE_LIMIT","Tối đa 50 cấu hình trong một đợt.");
        if(count("SELECT COUNT(*) FROM cycle_configurations WHERE project_id=? AND cycle_id=? AND environment_id=? AND device_id=?",p,id,input.environmentId(),input.deviceId())>0) fail(409,"DUPLICATE_CONFIGURATION","Cấu hình đã có trong đợt.");
        long config=insert("INSERT INTO cycle_configurations(project_id,cycle_id,environment_id,device_id,default_build_id,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,input.environmentId(),input.deviceId(),input.buildId());
        bumpCycle(p,id); audit.record(p,actor,"CYCLE_CONFIGURATION",config,"CREATE"); return cycle(p,actor,id);
    }

    public Map<String,Object> addScope(long p,String actor,long id,ExecutionDtos.AddScope input) {
        projects.lockWritableProject(p,actor); var c=cycle(p,actor,id); draft(c); version(c,input.expectedVersion());
        var cf=row("SELECT * FROM cycle_configurations WHERE project_id=? AND cycle_id=? AND id=?",p,id,input.configurationId());
        context(p,num(cf,"environment_id"),num(cf,"device_id"),num(cf,"default_build_id"));
        eligibleMember(p,input.assigneeMembershipId());
        if(count("SELECT COUNT(*) FROM run_items WHERE project_id=? AND cycle_id=?",p,id)+input.revisionIds().size()>500) fail(422,"SCOPE_LIMIT","Tối đa 500 lượt kiểm thử trong một đợt.");
        for(Long revision:input.revisionIds()) {
            var rev=approved(p,revision);
            if(count("SELECT COUNT(*) FROM run_items WHERE project_id=? AND cycle_id=? AND configuration_id=? AND test_case_id=?",p,id,input.configurationId(),num(rev,"test_case_id"))>0) fail(409,"DUPLICATE_SCOPE","Case đã có trong cấu hình này; toàn bộ yêu cầu chưa được lưu.");
            long run=insert("INSERT INTO run_items(project_id,cycle_id,configuration_id,test_case_id,revision_id,assignee_membership_id,created_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,input.configurationId(),num(rev,"test_case_id"),revision,input.assigneeMembershipId());
            assignmentHistory(p,run,null,input.assigneeMembershipId(),member(p,actor),"Phân công ban đầu");
            audit.record(p,actor,"RUN_ITEM",run,"CREATE");
        }
        bumpCycle(p,id); return cycle(p,actor,id);
    }

    public Map<String,Object> activate(long p,String actor,long id,ExecutionDtos.Version input) {
        projects.lockWritableProject(p,actor); var c=cycle(p,actor,id);
        if("ACTIVE".equals(c.get("statusCode"))) return c;
        if("CLOSED".equals(c.get("statusCode"))) fail(409,"CYCLE_CLOSED","PM cần mở lại đợt có lý do trước khi tiếp tục.");
        version(c,input.expectedVersion());
        var runs=db.queryForList("SELECT * FROM run_items WHERE project_id=? AND cycle_id=?",p,id);
        if(runs.isEmpty()) fail(422,"EMPTY_SCOPE","Thêm ít nhất một test case trước khi bắt đầu.");
        for(var r:runs) { approved(p,num(r,"revision_id")); eligibleMember(p,num(r,"assignee_membership_id")); }
        for(var cf:configurations(p,actor,id)) context(p,num(cf,"environmentId"),num(cf,"deviceId"),num(cf,"buildId"));
        db.update("UPDATE test_cycles SET status_code='ACTIVE',activated_at=UTC_TIMESTAMP(6),activated_by=?,lock_version=lock_version+1 WHERE project_id=? AND id=?",member(p,actor),p,id);
        audit.record(p,actor,"TEST_CYCLE",id,"ACTIVATE"); return cycle(p,actor,id);
    }

    @Transactional(readOnly=true)
    public ExecutionDtos.Page<Map<String,Object>> runs(long p,String actor,long cycle,int page,int size,boolean mine,boolean pendingBug) {
        cycle(p,actor,cycle); paging(page,size);
        String where=" WHERE r.project_id=? AND r.cycle_id=?"; List<Object> args=new ArrayList<>(List.of(p,cycle));
        if(mine) { where+=" AND m.user_id=?"; args.add(actor); }
        if(pendingBug) where+=" AND NOT COALESCE(sd.excluded,FALSE) AND a.result_code='NG' AND NOT EXISTS(SELECT 1 FROM work_item_execution_links l WHERE l.project_id=a.project_id AND l.attempt_id=a.id)";
        // Count from the same projection to keep filters and pagination consistent.
        long total=count("SELECT COUNT(*) FROM ("+RUN+where+") scoped",args.toArray());
        args.add(size); args.add((long)page*size);
        return new ExecutionDtos.Page<>(rows(RUN+where+" ORDER BY r.id LIMIT ? OFFSET ?",args.toArray()),total,page,size,(int)((total+size-1)/size));
    }

    @Transactional(readOnly=true)
    public Map<String,Object> run(long p,String actor,long id) {
        projects.requireMembership(p,actor); return row(RUN+" WHERE r.project_id=? AND r.id=?",p,id);
    }

    public Map<String,Object> assign(long p,String actor,long id,ExecutionDtos.Assignment input) {
        projects.lockWritableProject(p,actor); var r=run(p,actor,id); version(r,input.expectedVersion());
        if("CLOSED".equals(cycle(p,actor,num(r,"cycleId")).get("statusCode"))) fail(409,"CYCLE_CLOSED","Không thay đổi phân công trong đợt đã chốt.");
        eligibleMember(p,input.assigneeMembershipId());
        if(num(r,"assigneeMembershipId")==input.assigneeMembershipId()) return r;
        assignmentHistory(p,id,num(r,"assigneeMembershipId"),input.assigneeMembershipId(),member(p,actor),input.reason().trim());
        db.update("UPDATE run_items SET assignee_membership_id=?,lock_version=lock_version+1 WHERE project_id=? AND id=?",input.assigneeMembershipId(),p,id);
        audit.record(p,actor,"RUN_ITEM",id,"ASSIGN"); return run(p,actor,id);
    }

    @Transactional(readOnly=true)
    public List<Map<String,Object>> assignments(long p,String actor,long id) {
        run(p,actor,id);
        return rows("""
            SELECT a.id,a.previous_membership_id AS previousMembershipId,a.assignee_membership_id AS assigneeMembershipId,
            a.assigned_by AS assignedBy,a.reason,a.assigned_at AS assignedAt,u.display_name AS assigneeName
            FROM run_item_assignments a JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.assignee_membership_id
            JOIN identity_users u ON u.id=m.user_id WHERE a.project_id=? AND a.run_item_id=? ORDER BY a.id DESC
            """,p,id);
    }

    public Map<String,Object> record(long p,String actor,long id,ExecutionDtos.Attempt input) {
        fileGuard.lockIdentity(actor);
        return recordCanonical(p,actor,id,input,"LEGACY",null,null);
    }

    /** File context is validated by the independent guard before canonical reads or request-key replay. */
    public Map<String,Object> record(long p,String actor,long id,ExecutionDtos.Attempt input,long groupId,long sessionId,Long expectedSessionVersion) {
        var context=Objects.requireNonNull(fileGuard.fileAttempt(p,actor,groupId,id,sessionId,input.buildId(),expectedSessionVersion));
        return recordCanonical(p,actor,id,input,"FILE_SESSION",context,
            List.of(groupId,sessionId,expectedSessionVersion));
    }

    /** Internal FULL_CASE entry. No HTTP route or public origin field can select this path. */
    public Map<String,Object> recordRetest(long p,String actor,long id,ExecutionDtos.Attempt input,long requestId,long coverageItemId) {
        fileGuard.lockIdentity(actor);
        row("SELECT id,archived_at FROM projects WHERE id=? FOR UPDATE",p);
        long executor=member(p,actor);
        row("""
            SELECT q.id FROM retest_requests q JOIN retest_request_items i ON i.project_id=q.project_id AND i.request_id=q.id
            JOIN bug_retest_state s ON s.project_id=q.project_id AND s.work_item_id=q.work_item_id
            JOIN work_items w ON w.project_id=q.project_id AND w.id=q.work_item_id
            JOIN bug_details b ON b.project_id=w.project_id AND b.work_item_id=w.id
            WHERE q.project_id=? AND q.id=? AND i.coverage_item_id=? AND i.run_item_id=?
            AND q.verification_scope='FULL_CASE' AND q.status='OPEN' AND q.assignee_membership_id=? AND q.build_id=?
            AND s.current_coverage_id=q.coverage_revision_id AND s.round_no=q.round_no
            AND w.status_code='resolved' AND b.fixed_build_id=q.build_id FOR UPDATE
            """,p,requestId,coverageItemId,id,executor,input.buildId());
        return recordCanonical(p,actor,id,input,"RETEST_FULL_CASE",null,List.of(requestId,coverageItemId));
    }

    private Map<String,Object> recordCanonical(long p,String actor,long id,ExecutionDtos.Attempt input,String origin,FileWorkGuard.Context file,Object provenanceContext) {
        // Lock before any consistent read, also serializing member revocation and catalog changes.
        row("SELECT id,archived_at FROM projects WHERE id=? FOR UPDATE",p);
        projects.requireNotDev(p,actor);
        projects.requireMembership(p,actor);
        if(row("SELECT archived_at FROM projects WHERE id=?",p).get("archived_at")!=null) fail(409,"ARCHIVED","Dự án đã được lưu trữ.");
        long executor=member(p,actor);
        // Group authority must be checked even for a historical request key.
        var r=run(p,actor,id);
        if("LEGACY".equals(origin) && r.get("fileWorkGroupId")!=null) fail(409,"FILE_SESSION_REQUIRED","Run thuộc file cần phiên thực thi đang DOING.");
        if(num(r,"assigneeMembershipId")!=executor) fail(403,"NOT_ASSIGNED","Chỉ người được phân công mới được ghi kết quả.");
        eligibleMember(p,executor);
        if(!"ACTIVE".equals(cycle(p,actor,num(r,"cycleId")).get("statusCode"))) fail(409,"CYCLE_NOT_ACTIVE","Chỉ ghi kết quả trong đợt đang thực hiện.");
        approved(p,num(r,"revisionId"));
        if(Boolean.TRUE.equals(r.get("excluded"))) fail(409,"RUN_EXCLUDED","Lượt kiểm thử đã được PM loại khỏi phạm vi (NA).");
        var snapshot=file==null?context(p,num(r,"environmentId"),num(r,"deviceId"),input.buildId()):new LinkedHashMap<>(file.snapshot());
        String checksum="LEGACY".equals(origin)?checksum(input):checksum(List.of(origin,p,id,input,provenanceContext));
        var duplicate=db.queryForList("SELECT id,run_item_id,executor_membership_id,request_checksum FROM execution_attempts WHERE project_id=? AND request_key=?",p,input.requestKey());
        if(!duplicate.isEmpty()) {
            var old=duplicate.getFirst();
            if(num(old,"run_item_id")!=id || num(old,"executor_membership_id")!=executor || !checksum.equals(old.get("request_checksum"))) fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã được dùng cho nội dung khác.");
            return row(ATTEMPT+" WHERE a.project_id=? AND a.id=?",p,num(old,"id"));
        }
        version(r,input.expectedVersion());
        if(!List.of("OK","NG","P").contains(input.resultCode())) fail(422,"INVALID_RESULT","Kết quả không hợp lệ. Fix không phải kết quả kiểm thử.");
        if("NG".equals(input.resultCode()) && blank(input.actualResult())) fail(422,"ACTUAL_REQUIRED","Kết quả NG cần mô tả kết quả thực tế.");
        if("P".equals(input.resultCode()) && blank(input.reason())) fail(422,"REASON_REQUIRED","Tạm hoãn cần ghi lý do.");
        snapshot.put("executor",row("SELECT m.id AS membershipId,u.display_name AS displayName,u.username FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.id=?",p,executor));
        snapshot.put("revisionId",r.get("revisionId"));
        snapshot.put("cycleId",r.get("cycleId"));snapshot.put("configurationId",r.get("configurationId"));snapshot.put("provenance",origin);
        if(file!=null)snapshot.put("fileWorkSessionId",num(file.session(),"id"));
        if("RETEST_FULL_CASE".equals(origin))snapshot.put("retest",provenanceContext);
        int next=(int)count("SELECT COALESCE(MAX(attempt_no),0)+1 FROM execution_attempts WHERE project_id=? AND run_item_id=?",p,id);
        long attempt=insert("INSERT INTO execution_attempts(project_id,run_item_id,attempt_no,result_code,build_id,executor_membership_id,executed_at,actual_result,reason,evidence_reference,context_snapshot,request_key,request_checksum,file_work_session_id) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6),?,?,?,?,?,?,?)",p,id,next,input.resultCode(),input.buildId(),executor,text(input.actualResult()),text(input.reason()),text(input.evidenceReference()),encode(snapshot),input.requestKey(),checksum,file==null?null:num(file.session(),"id"));
        db.update("UPDATE run_items SET latest_attempt_id=?,lock_version=lock_version+1 WHERE project_id=? AND id=?",attempt,p,id);
        audit.record(p,actor,"EXECUTION_ATTEMPT",attempt,"CREATE");
        return row(ATTEMPT+" WHERE a.project_id=? AND a.id=?",p,attempt);
    }

    @Transactional(readOnly=true)
    public ExecutionDtos.Page<Map<String,Object>> attempts(long p,String actor,long id,int page,int size) {
        run(p,actor,id); paging(page,size); long total=count("SELECT COUNT(*) FROM execution_attempts WHERE project_id=? AND run_item_id=?",p,id);
        return new ExecutionDtos.Page<>(rows(ATTEMPT+" WHERE a.project_id=? AND a.run_item_id=? ORDER BY a.attempt_no DESC LIMIT ? OFFSET ?",p,id,size,(long)page*size),total,page,size,(int)((total+size-1)/size));
    }

    private Map<String,Object> approved(long p,long revision) {
        var rev=row("SELECT r.test_case_id,r.approved_at,c.archived_at,s.archived_at AS suite_archived FROM test_case_revisions r JOIN test_cases c ON c.project_id=r.project_id AND c.id=r.test_case_id JOIN test_suites s ON s.project_id=c.project_id AND s.id=c.suite_id WHERE r.project_id=? AND r.id=?",p,revision);
        if(rev.get("approved_at")==null || rev.get("archived_at")!=null || rev.get("suite_archived")!=null) fail(422,"REVISION_NOT_APPROVED","Chỉ dùng phiên bản đã được PM duyệt của case đang hoạt động.");
        return rev;
    }
    private Map<String,Object> context(long p,long environment,long device,long build) {
        var result=new LinkedHashMap<String,Object>();
        result.put("environment",row("SELECT id,code,name,description FROM environments WHERE project_id=? AND id=? AND active=TRUE",p,environment));
        result.put("device",row("SELECT id,code,name,model,os_name AS osName,os_version AS osVersion FROM devices WHERE project_id=? AND id=? AND active=TRUE",p,device));
        result.put("build",row("SELECT id,version_label AS versionLabel,build_number AS buildNumber,platform FROM builds WHERE project_id=? AND id=? AND archived_at IS NULL",p,build));
        return result;
    }
    private void eligibleMember(long p,long id) {
        row("SELECT m.id FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.id=? AND m.active=TRUE AND u.enabled=TRUE AND u.role_code<>'DEV' AND m.project_role IN ('PM','TESTER')",p,id);
    }
    private long member(long p,String actor) { return num(row("SELECT id FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE",p,actor),"id"); }
    private void assignmentHistory(long p,long run,Long old,long assignee,long actor,String reason) {
        db.update("INSERT INTO run_item_assignments(project_id,run_item_id,previous_membership_id,assignee_membership_id,assigned_by,reason,assigned_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,run,old,assignee,actor,reason);
    }
    private void bumpCycle(long p,long id) { db.update("UPDATE test_cycles SET lock_version=lock_version+1 WHERE project_id=? AND id=?",p,id); }
    private void draft(Map<String,Object> c) { if(!"DRAFT".equals(c.get("statusCode"))) fail(409,"SCOPE_FROZEN","Phạm vi đợt đã khóa; hãy tạo đợt mới để thay đổi cấu hình hoặc case."); }
    private void version(Map<String,Object> data,Long expected) { if(expected==null || num(data,"version")!=expected) fail(409,"VERSION_CONFLICT","Dữ liệu đã thay đổi. Tải lại để đối chiếu; bản nháp của bạn vẫn được giữ."); }
    private void paging(int page,int size) { if(page<0 || size<1 || size>100) fail(422,"INVALID_PAGE","Trang phải từ 0, kích thước trang từ 1 đến 100."); }
    private List<Map<String,Object>> rows(@NonNull String sql,Object...args) {
        var results=db.queryForList(sql,args);
        // MySQL DATETIME contains UTC by contract but JDBC returns LocalDateTime without an offset.
        // Return Instants so clients never interpret UTC wall-clock values in their local timezone.
        results.forEach(result->result.replaceAll((key,value)-> {
            if("pendingBugLink".equals(key) || "excluded".equals(key)) return value instanceof Number number ? number.intValue()!=0 : Boolean.TRUE.equals(value);
            return value instanceof LocalDateTime time ? time.toInstant(ZoneOffset.UTC) : value;
        }));
        return results;
    }
    private Map<String,Object> row(@NonNull String sql,Object...args) { var results=rows(sql,args); if(results.isEmpty()) fail(404,"NOT_FOUND","Không tìm thấy dữ liệu đang hoạt động trong dự án."); return results.getFirst(); }
    private long count(@NonNull String sql,Object...args) { return Objects.requireNonNull(db.queryForObject(sql,Long.class,args)); }
    private long insert(@NonNull String sql,Object...args) {
        var keys=new GeneratedKeyHolder();
        db.update(connection->{var statement=Objects.requireNonNull(connection.prepareStatement(sql,java.sql.Statement.RETURN_GENERATED_KEYS)); for(int i=0;i<args.length;i++) statement.setObject(i+1,args[i]); return statement;},keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }
    private static long num(Map<String,Object> value,String key) { return ((Number)value.get(key)).longValue(); }
    private String encode(Object value) { try { return json.writeValueAsString(value); } catch(Exception ex) { throw new IllegalStateException("Cannot encode execution metadata",ex); } }
    private String checksum(Object value) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(encode(value).getBytes(StandardCharsets.UTF_8))); } catch(java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); } }
    private static String text(String s) { return s==null?"":s.trim(); }
    private static boolean blank(String s) { return s==null || s.isBlank(); }
    private static void fail(int status,String code,String message) { throw new BusinessException(status,code,message); }
}
