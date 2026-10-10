package vn.syp.tms.retest;

import static vn.syp.tms.workitem.WorkItemStore.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.workitem.*;
import vn.syp.tms.execution.*;
import vn.syp.tms.filework.FileWorkGuard;

@Service @Transactional
public class RetestService {
    private final WorkItemStore db;
    private final WorkItemService work;
    private final ExecutionService execution;
    private final BugRetestLifecycle lifecycle;
    private final FileWorkGuard guard;
    public RetestService(WorkItemStore db,WorkItemService work,ExecutionService execution,BugRetestLifecycle lifecycle,FileWorkGuard guard) {
        this.db=db; this.work=work; this.execution=execution; this.lifecycle=lifecycle; this.guard=Objects.requireNonNull(guard);
    }
    private static final String REQUEST="""
        SELECT q.id,q.work_item_id AS bugId,w.item_key AS bugKey,w.title AS bugTitle,w.lock_version AS bugVersion,
        q.coverage_revision_id AS coverageRevisionId,q.round_no AS roundNo,q.build_id AS buildId,
        q.environment_id AS environmentId,q.device_id AS deviceId,q.verification_scope AS verificationScope,
        q.assignee_membership_id AS assigneeMembershipId,q.status,q.lock_version AS version,q.reason,
        q.created_by AS createdBy,q.created_at AS createdAt,q.request_checksum AS requestChecksum,
        q.submit_request_key AS submitRequestKey,q.submit_checksum AS submitChecksum,q.submitted_by AS submittedBy,
        q.submitted_at AS submittedAt,q.context_snapshot AS contextSnapshot,u.display_name AS assigneeName,
        b.version_label AS buildLabel,b.build_number AS buildNumber,e.name AS environmentName,d.name AS deviceName
        FROM retest_requests q JOIN work_items w ON w.project_id=q.project_id AND w.id=q.work_item_id
        JOIN project_memberships m ON m.project_id=q.project_id AND m.id=q.assignee_membership_id
        JOIN identity_users u ON u.id=m.user_id JOIN builds b ON b.project_id=q.project_id AND b.id=q.build_id
        JOIN environments e ON e.project_id=q.project_id AND e.id=q.environment_id
        JOIN devices d ON d.project_id=q.project_id AND d.id=q.device_id
        """;
    private static final String ITEMS="""
        SELECT i.id,i.run_item_id AS runItemId,r.cycle_id AS cycleId,r.lock_version AS runVersion,
        cy.status_code AS cycleStatus,COALESCE(sd.excluded,FALSE) AS excluded,
        r.assignee_membership_id AS assigneeMembershipId,tc.case_no AS caseNo,rv.title_vi AS titleVi,
        rv.revision_no AS revisionNo,rv.steps_vi AS stepsVi,rv.expected_vi AS expectedVi,
        cf.environment_id AS environmentId,cf.device_id AS deviceId,e.name AS environmentName,d.name AS deviceName,
        u.display_name AS assigneeName,
        (SELECT v.verdict FROM bug_verification_attempts v WHERE v.project_id=i.project_id AND v.coverage_item_id=i.id ORDER BY v.id DESC LIMIT 1) AS verdict
        FROM bug_coverage_items i JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id
        JOIN test_cycles cy ON cy.project_id=r.project_id AND cy.id=r.cycle_id
        LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id
        JOIN test_cases tc ON tc.project_id=r.project_id AND tc.id=r.test_case_id
        JOIN test_case_revisions rv ON rv.project_id=r.project_id AND rv.id=r.revision_id
        JOIN cycle_configurations cf ON cf.project_id=r.project_id AND cf.id=r.configuration_id
        JOIN environments e ON e.project_id=cf.project_id AND e.id=cf.environment_id
        JOIN devices d ON d.project_id=cf.project_id AND d.id=cf.device_id
        JOIN project_memberships m ON m.project_id=r.project_id AND m.id=r.assignee_membership_id
        JOIN identity_users u ON u.id=m.user_id
        """;
    private void pm(Map<String,Object> member) {
        if(WorkItemService.developer(member) || !"PM".equals(member.get("role"))) fail(403,"PROJECT_PM_REQUIRED","Chỉ PM của dự án được xác nhận phạm vi, phân công, đóng hoặc mở lại lỗi.");
    }
    private Map<String,Object> bug(long p,String actor,long id) {
        var bug=work.get(p,actor,id);
        if(!"BUG".equals(bug.get("type"))) fail(422,"BUG_REQUIRED","Kiểm thử lại chỉ áp dụng cho lỗi.");
        return bug;
    }
    private Map<String,Object> state(long p,long id) {
        return db.row("SELECT round_no AS roundNo,current_coverage_id AS coverageId FROM bug_retest_state WHERE project_id=? AND work_item_id=?",p,id);
    }
    private void resolved(Map<String,Object> bug) {
        if(!"resolved".equals(bug.get("status")) || bug.get("fixedBuildId")==null) fail(409,"BUG_NOT_RESOLVED","Bug cần được báo đã xử lý và có build sửa trước khi kiểm thử lại.");
    }
    private List<Long> unique(List<Long> values) {
        if(new HashSet<>(values).size()!=values.size()) fail(422,"DUPLICATE_SCOPE","Không chọn trùng mục trong phạm vi.");
        return values;
    }
    private Map<String,Object> eligibleRun(long p,String actor,long runId) {
        var run=execution.run(p,actor,runId);
        if(Boolean.TRUE.equals(run.get("excluded"))) fail(409,"RUN_EXCLUDED","Lượt NA không còn trong phạm vi kiểm thử lại.");
        var valid=db.row("SELECT c.status_code,rv.approved_at,tc.archived_at,s.archived_at AS suite_archived FROM run_items r JOIN test_cycles c ON c.project_id=r.project_id AND c.id=r.cycle_id JOIN test_case_revisions rv ON rv.project_id=r.project_id AND rv.id=r.revision_id JOIN test_cases tc ON tc.project_id=r.project_id AND tc.id=r.test_case_id JOIN test_suites s ON s.project_id=tc.project_id AND s.id=tc.suite_id WHERE r.project_id=? AND r.id=?",p,runId);
        if(!"ACTIVE".equals(valid.get("status_code")) || valid.get("approved_at")==null || valid.get("archived_at")!=null || valid.get("suite_archived")!=null) fail(409,"RUN_NOT_ELIGIBLE","Chọn case đã duyệt trong đợt đang thực hiện và chưa lưu trữ.");
        eligibleMember(p,number(run,"assigneeMembershipId"));
        return run;
    }
    private void eligibleMember(long p,long id) {
        db.row("SELECT m.id FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.id=? AND m.active=TRUE AND u.enabled=TRUE AND u.role_code<>'DEV' AND m.project_role IN ('PM','TESTER')",p,id);
    }
    private Map<String,Object> context(long p,long build,long env,long device) {
        return Map.of("build",db.row("SELECT id,version_label AS versionLabel,build_number AS buildNumber,platform FROM builds WHERE project_id=? AND id=? AND archived_at IS NULL",p,build),
            "environment",db.row("SELECT id,name FROM environments WHERE project_id=? AND id=? AND active=TRUE",p,env),
            "device",db.row("SELECT id,name,model,os_name AS osName,os_version AS osVersion FROM devices WHERE project_id=? AND id=? AND active=TRUE",p,device));
    }
    // Arbitrary IDs may route through locking QA detail before the BUG_REQUIRED guard.
    public Map<String,Object> summary(long p,String actor,long id) {
        var bug=bug(p,actor,id); var state=state(p,id); var result=new LinkedHashMap<String,Object>();
        List<Map<String,Object>> items=List.of(); Object coverage=null;
        if(state.get("coverageId")!=null) {
            coverage=db.row("SELECT id,revision_no AS revisionNo,round_no AS roundNo,build_id AS buildId,reason,created_at AS createdAt FROM bug_coverage_revisions WHERE project_id=? AND work_item_id=? AND id=?",p,id,state.get("coverageId"));
            items=db.rows(ITEMS+" WHERE i.project_id=? AND i.work_item_id=? AND i.coverage_revision_id=? ORDER BY i.id",p,id,state.get("coverageId"));
        }
        long passed=items.stream().filter(i->"PASS".equals(i.get("verdict"))).count();
        result.put("bugId",id);result.put("bugVersion",bug.get("version"));result.put("status",bug.get("status"));result.put("fixedBuildId",bug.get("fixedBuildId"));
        result.put("roundNo",state.get("roundNo"));result.put("coverage",coverage);result.put("items",items);
        result.put("passedCount",passed);result.put("totalCount",items.size());
        result.put("canClose","resolved".equals(bug.get("status")) && !items.isEmpty() && passed==items.size());
        result.put("requests",db.rows(REQUEST+" WHERE q.project_id=? AND q.work_item_id=? ORDER BY q.id DESC LIMIT 50",p,id));
        result.put("decisions",db.rows("SELECT c.id,c.decision_kind AS kind,c.reason,c.source_reference AS sourceReference,c.evidence_attachment_id AS evidenceAttachmentId,c.decided_at AS decidedAt,u.display_name AS actor FROM bug_closure_decisions c JOIN project_memberships m ON m.project_id=c.project_id AND m.id=c.decided_by JOIN identity_users u ON u.id=m.user_id WHERE c.project_id=? AND c.work_item_id=? ORDER BY c.id DESC LIMIT 50",p,id));
        result.put("otherOpenBugs",db.rows("""
            SELECT DISTINCT w.id,w.item_key AS `key`,w.title,w.status_code AS status
            FROM work_items w JOIN work_item_execution_links l ON l.project_id=w.project_id AND l.work_item_id=w.id
            WHERE w.project_id=? AND w.id<>? AND w.status_code NOT IN ('closed','unreproducible','wontfix')
            AND (EXISTS(SELECT 1 FROM work_item_execution_links source WHERE source.project_id=l.project_id AND source.run_item_id=l.run_item_id AND source.work_item_id=?)
              OR EXISTS(SELECT 1 FROM bug_coverage_items i JOIN bug_retest_state s ON s.project_id=i.project_id AND s.work_item_id=i.work_item_id AND s.current_coverage_id=i.coverage_revision_id
                        WHERE i.project_id=l.project_id AND i.run_item_id=l.run_item_id AND i.work_item_id=?))
            ORDER BY w.id LIMIT 100
            """,p,id,id,id));
        return result;
    }
    @Transactional(readOnly=true)
    public WorkItemDtos.Page<Map<String,Object>> candidates(long p,String actor,int page,String keyword) {
        work.readMembership(p,actor); page=Math.max(0,page); String term="%"+text(keyword).replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        String from=" FROM run_items r JOIN test_cycles c ON c.project_id=r.project_id AND c.id=r.cycle_id JOIN test_cases tc ON tc.project_id=r.project_id AND tc.id=r.test_case_id JOIN test_case_revisions rv ON rv.project_id=r.project_id AND rv.id=r.revision_id JOIN cycle_configurations cf ON cf.project_id=r.project_id AND cf.id=r.configuration_id JOIN environments e ON e.project_id=cf.project_id AND e.id=cf.environment_id JOIN devices d ON d.project_id=cf.project_id AND d.id=cf.device_id JOIN project_memberships m ON m.project_id=r.project_id AND m.id=r.assignee_membership_id JOIN identity_users u ON u.id=m.user_id WHERE r.project_id=? AND c.status_code='ACTIVE' AND tc.archived_at IS NULL AND (tc.case_no LIKE ? ESCAPE '!' OR rv.title_vi LIKE ? ESCAPE '!')";
        from+=" AND NOT EXISTS (SELECT 1 FROM run_scope_decisions sd WHERE sd.project_id=r.project_id AND sd.id=r.scope_decision_id AND sd.excluded=TRUE)";
        long total=db.count("SELECT COUNT(*)"+from,p,term,term);
        return new WorkItemDtos.Page<>(db.rows("SELECT r.id,tc.case_no AS caseNo,rv.title_vi AS titleVi,c.name AS cycleName,e.name AS environmentName,d.name AS deviceName,u.display_name AS assigneeName"+from+" ORDER BY r.id LIMIT 50 OFFSET ?",p,term,term,(long)page*50),total,page,50,(int)((total+49)/50));
    }
    public Map<String,Object> coverage(long p,String actor,long id,RetestDtos.Coverage input) {
        var member=work.writable(p,actor); pm(member); var bug=bug(p,actor,id);version(bug,input.expectedVersion());resolved(bug);
        for(long run:unique(input.runItemIds())) eligibleRun(p,actor,run);
        db.row("SELECT id FROM builds WHERE project_id=? AND id=? AND archived_at IS NULL",p,bug.get("fixedBuildId"));
        lifecycle.invalidate(p,id,false);long round=number(state(p,id),"roundNo");
        long next=db.count("SELECT COALESCE(MAX(revision_no),0)+1 FROM bug_coverage_revisions WHERE project_id=? AND work_item_id=?",p,id);
        long coverage=db.insert("INSERT INTO bug_coverage_revisions(project_id,work_item_id,revision_no,round_no,build_id,reason,created_by,created_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,next,round,bug.get("fixedBuildId"),text(input.reason()),number(member,"id"));
        for(long run:input.runItemIds()) db.insert("INSERT INTO bug_coverage_items(project_id,work_item_id,coverage_revision_id,run_item_id) VALUES(?,?,?,?)",p,id,coverage,run);
        db.update("UPDATE bug_retest_state SET current_coverage_id=? WHERE project_id=? AND work_item_id=?",coverage,p,id);
        change(p,id,number(member,"id"),"RETEST_COVERAGE",input.reason(),Map.of("coverageId",coverage));
        return summary(p,actor,id);
    }
    public Map<String,Object> createRequest(long p,String actor,long id,RetestDtos.Request input) {
        var member=work.writable(p,actor);pm(member);var bug=bug(p,actor,id);long author=number(member,"id");String checksum=db.checksum(input);
        var previous=db.rows("SELECT id,work_item_id,created_by,request_checksum FROM retest_requests WHERE project_id=? AND request_key=?",p,input.requestKey());
        if(!previous.isEmpty()) {
            var old=previous.getFirst();
            if(number(old,"created_by")!=author || number(old,"work_item_id")!=id || !checksum.equals(old.get("request_checksum"))) fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã được dùng cho nội dung hoặc người khác.");
            return request(p,actor,number(old,"id"));
        }
        version(bug,input.expectedVersion());resolved(bug);var state=state(p,id);
        if(!Objects.equals(state.get("coverageId"),input.coverageRevisionId())) fail(409,"STALE_COVERAGE","Phạm vi đã thay đổi; PM cần đối chiếu lại.");
        eligibleMember(p,input.assigneeMembershipId()); var selected=new ArrayList<Map<String,Object>>();
        for(long item:unique(input.coverageItemIds())) {
            var row=db.row("SELECT run_item_id FROM bug_coverage_items WHERE project_id=? AND work_item_id=? AND coverage_revision_id=? AND id=?",p,id,input.coverageRevisionId(),item);
            var run=eligibleRun(p,actor,number(row,"run_item_id"));
            if(number(run,"assigneeMembershipId")!=input.assigneeMembershipId()) fail(422,"ASSIGNEE_MISMATCH","Các case phải được phân công cho cùng người thực hiện yêu cầu.");
            if(!selected.isEmpty() && (!run.get("environmentId").equals(selected.getFirst().get("environmentId")) || !run.get("deviceId").equals(selected.getFirst().get("deviceId")))) fail(422,"CONFIGURATION_MISMATCH","Tạo yêu cầu riêng cho từng môi trường và thiết bị.");
            selected.add(run);
        }
        var first=selected.getFirst(); var snapshot=context(p,number(bug,"fixedBuildId"),number(first,"environmentId"),number(first,"deviceId"));
        long request=db.insert("INSERT INTO retest_requests(project_id,work_item_id,coverage_revision_id,round_no,build_id,environment_id,device_id,verification_scope,assignee_membership_id,reason,created_by,created_at,request_key,request_checksum,context_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),?,?,?)",p,id,input.coverageRevisionId(),state.get("roundNo"),bug.get("fixedBuildId"),first.get("environmentId"),first.get("deviceId"),input.verificationScope(),input.assigneeMembershipId(),text(input.reason()),author,input.requestKey(),checksum,db.encode(snapshot));
        for(int n=0;n<input.coverageItemIds().size();n++) db.update("INSERT INTO retest_request_items(project_id,work_item_id,coverage_revision_id,request_id,coverage_item_id,run_item_id) VALUES(?,?,?,?,?,?)",p,id,input.coverageRevisionId(),request,input.coverageItemIds().get(n),selected.get(n).get("id"));
        change(p,id,author,"RETEST_REQUEST",input.reason(),Map.of("requestId",request));return request(p,actor,request);
    }
    @Transactional(readOnly=true)
    public WorkItemDtos.Page<Map<String,Object>> queue(long p,String actor,int page,boolean mine,String status) {
        var member=work.readMembership(p,actor);page=Math.max(0,page);var args=new ArrayList<Object>();args.add(p);
        String where=" WHERE q.project_id=?";
        if(mine) {where+=" AND q.assignee_membership_id=?";args.add(member.get("id"));}
        if(!text(status).isEmpty()) {if(!Set.of("OPEN","SUBMITTED","CANCELLED").contains(status)) fail(422,"INVALID_STATUS","Trạng thái yêu cầu không hợp lệ.");where+=" AND q.status=?";args.add(status);}
        long total=db.count("SELECT COUNT(*) FROM retest_requests q"+where,args.toArray());args.add((long)page*50);
        return new WorkItemDtos.Page<>(db.rows(REQUEST+where+" ORDER BY q.id DESC LIMIT 50 OFFSET ?",args.toArray()),total,page,50,(int)((total+49)/50));
    }
    @Transactional(readOnly=true)
    public Map<String,Object> request(long p,String actor,long id) {
        var member=work.readMembership(p,actor);var request=db.row(REQUEST+" WHERE q.project_id=? AND q.id=?",p,id);
        var items=db.rows(ITEMS+" JOIN retest_request_items qi ON qi.project_id=i.project_id AND qi.coverage_item_id=i.id WHERE qi.project_id=? AND qi.request_id=? ORDER BY i.id",p,id);
        request.put("items",items);request.put("results",db.rows("SELECT coverage_item_id AS coverageItemId,verdict,actual_result AS actualResult,evidence_attachment_id AS evidenceAttachmentId,execution_attempt_id AS executionAttemptId,verified_at AS verifiedAt FROM bug_verification_attempts WHERE project_id=? AND request_id=? ORDER BY id",p,id));
        var state=state(p,number(request,"bugId"));
        boolean current=Objects.equals(state.get("coverageId"),request.get("coverageRevisionId")) && Objects.equals(state.get("roundNo"),request.get("roundNo"));
        request.put("current",current);
        boolean cycleActive=items.stream().allMatch(i->"ACTIVE".equals(i.get("cycleStatus")) && !Boolean.TRUE.equals(i.get("excluded")) && !(i.get("excluded") instanceof Number n && n.intValue()!=0));
        request.put("cycleActive",cycleActive);
        request.put("canSubmit",!WorkItemService.developer(member) && current && cycleActive && "OPEN".equals(request.get("status")) && number(request,"assigneeMembershipId")==number(member,"id") && items.stream().allMatch(i->number(i,"assigneeMembershipId")==number(member,"id")));
        return request;
    }
    public Map<String,Object> submit(long p,String actor,long id,RetestDtos.Submit input) {
        guard.lockIdentity(actor);
        var member=work.writable(p,actor);long author=number(member,"id");var request=request(p,actor,id);String checksum=db.checksum(input);
        if(WorkItemService.developer(member))fail(403,"FORBIDDEN","Dev không được ghi kết quả kiểm thử lại.");
        if(request.get("submitRequestKey")!=null) {
            if(!input.requestKey().equals(request.get("submitRequestKey")) || !checksum.equals(request.get("submitChecksum")) || number(request,"submittedBy")!=author) fail(409,"IDEMPOTENCY_CONFLICT","Yêu cầu đã có kết quả; không ghi đè lịch sử.");
            return request;
        }
        if(number(request,"assigneeMembershipId")!=author) fail(403,"NOT_ASSIGNED","Chỉ người được phân công mới được ghi kết quả kiểm thử lại.");
        eligibleMember(p,author);version(request,input.expectedVersion());
        long bugId=number(request,"bugId");var bug=bug(p,actor,bugId);version(bug,input.expectedBugVersion());resolved(bug);
        if(!Boolean.TRUE.equals(request.get("current")) || !"OPEN".equals(request.get("status")) || !Objects.equals(request.get("buildId"),bug.get("fixedBuildId"))) fail(409,"STALE_RETEST","Yêu cầu không còn thuộc bản sửa và phạm vi hiện hành.");
        if(input.closeBug()) {pm(member);required(input.closureReason(),"lý do đóng lỗi");}
        context(p,number(request,"buildId"),number(request,"environmentId"),number(request,"deviceId"));
        var items=db.rows("SELECT coverage_item_id AS id,run_item_id AS runItemId FROM retest_request_items WHERE project_id=? AND request_id=? ORDER BY coverage_item_id",p,id);
        var byId=new HashMap<Long,Map<String,Object>>();items.forEach(item->byId.put(number(item,"id"),item));
        unique(input.results().stream().map(result -> result.coverageItemId()).toList());
        if(input.results().size()!=items.size() || !byId.keySet().containsAll(input.results().stream().map(result -> result.coverageItemId()).toList())) fail(422,"INCOMPLETE_REQUEST","Nhập kết quả cho toàn bộ mục trong yêu cầu, không thêm hoặc bỏ sót mục.");
        boolean failed=false;
        for(var result:input.results()) {
            long runId=number(byId.get(result.coverageItemId()),"runItemId");var run=eligibleRun(p,actor,runId);version(run,result.expectedRunVersion());
            if(number(run,"assigneeMembershipId")!=author) fail(409,"ASSIGNMENT_CHANGED","Case đã được phân công lại; PM cần tạo yêu cầu mới.");
            String evidence=evidence(p,bugId,result.evidenceAttachmentId(),false);Long attempt=null;
            if("FULL_CASE".equals(request.get("verificationScope"))) {
                String key=db.checksum(List.of("RETEST",id,result.coverageItemId(),input.requestKey()));
                attempt=number(execution.recordRetest(p,actor,runId,new ExecutionDtos.Attempt("PASS".equals(result.verdict())?"OK":"NG",number(request,"buildId"),text(result.actualResult()),"",evidence==null?"":"attachment:"+evidence,key,result.expectedRunVersion()),id,result.coverageItemId()),"id");
                if("FAIL".equals(result.verdict())) db.update("INSERT INTO work_item_execution_links(project_id,work_item_id,run_item_id,attempt_id,linked_by,linked_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",p,bugId,runId,attempt,author);
            }
            db.insert("INSERT INTO bug_verification_attempts(project_id,work_item_id,request_id,coverage_item_id,run_item_id,verdict,actual_result,evidence_attachment_id,execution_attempt_id,verified_by,verified_at) VALUES(?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,bugId,id,result.coverageItemId(),runId,result.verdict(),text(result.actualResult()),evidence,attempt,author);
            failed|="FAIL".equals(result.verdict());
        }
        db.update("UPDATE retest_requests SET status='SUBMITTED',lock_version=lock_version+1,submit_request_key=?,submit_checksum=?,submitted_by=?,submitted_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",input.requestKey(),checksum,author,p,id);
        if(failed) {lifecycle.invalidate(p,bugId,true);db.update("UPDATE work_items SET status_code='progress' WHERE project_id=? AND id=?",p,bugId);}
        change(p,bugId,author,"RETEST_RESULT",failed?"Kiểm thử lại thất bại — cần xử lý tiếp":"Đã lưu kết quả kiểm thử lại",Map.of("requestId",id,"failed",failed));
        if(input.closeBug()) close(p,actor,bugId,new RetestDtos.Closure("FIXED",input.closureReason(),null,null,number(bug,"version")+1));
        return request(p,actor,id);
    }
    private String evidence(long p,long bug,String id,boolean required) {
        if(text(id).isEmpty()) {if(required) fail(422,"EVIDENCE_REQUIRED","Cần chứng cứ của lỗi này để ghi nhận quyết định.");return null;}
        db.row("SELECT id FROM work_item_attachments WHERE project_id=? AND work_item_id=? AND id=?",p,bug,id);return id;
    }
    public Map<String,Object> close(long p,String actor,long id,RetestDtos.Closure input) {
        var member=work.writable(p,actor);pm(member);var bug=bug(p,actor,id);version(bug,input.expectedVersion());BugRetestLifecycle.editable(bug);
        String evidence=null;String status;
        if("FIXED".equals(input.kind())) {
            if(!Boolean.TRUE.equals(summary(p,actor,id).get("canClose"))) fail(422,"COVERAGE_INCOMPLETE","Chưa đủ kết quả đạt trên toàn phạm vi và build sửa hiện hành.");
            status="closed";
        } else {
            evidence=evidence(p,id,input.evidenceAttachmentId(),true);required(input.sourceReference(),"nguồn xác nhận");
            status="UNREPRODUCIBLE".equals(input.kind())?"unreproducible":"wontfix";
        }
        decision(p,id,number(member,"id"),input.kind(),input.reason(),evidence,input.sourceReference(),bug);
        db.update("UPDATE work_items SET status_code=? WHERE project_id=? AND id=?",status,p,id);lifecycle.cancel(p,id);
        change(p,id,number(member,"id"),"BUG_CLOSURE",input.reason(),Map.of("from",bug.get("status"),"to",status));return summary(p,actor,id);
    }
    public Map<String,Object> reopen(long p,String actor,long id,RetestDtos.Reopen input) {
        var member=work.writable(p,actor);pm(member);var bug=bug(p,actor,id);version(bug,input.expectedVersion());
        if(!BugRetestLifecycle.terminal(bug.get("status"))) fail(422,"TERMINAL_REQUIRED","Chỉ mở lại lỗi đã kết thúc.");
        decision(p,id,number(member,"id"),"REOPEN",input.reason(),null,null,bug);lifecycle.invalidate(p,id,true);
        db.update("UPDATE work_items SET status_code='progress' WHERE project_id=? AND id=?",p,id);
        change(p,id,number(member,"id"),"BUG_REOPEN",input.reason(),Map.of("from",bug.get("status"),"to","progress"));return summary(p,actor,id);
    }
    private void decision(long p,long id,long actor,String kind,String reason,String evidence,String source,Map<String,Object> bug) {
        var state=state(p,id);
        db.insert("INSERT INTO bug_closure_decisions(project_id,work_item_id,decision_kind,reason,evidence_attachment_id,source_reference,coverage_revision_id,round_no,build_id,decided_by,decided_at) VALUES(?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,kind,text(reason),evidence,text(source),state.get("coverageId"),state.get("roundNo"),bug.get("fixedBuildId"),actor);
    }
    private void change(long p,long bug,long actor,String event,String reason,Object details) {
        db.update("UPDATE work_items SET lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",actor,p,bug);
        db.insert("INSERT INTO work_item_history(project_id,work_item_id,event_type,reason,details_json,actor_membership_id,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,bug,event,text(reason),db.encode(details),actor);
    }
}
