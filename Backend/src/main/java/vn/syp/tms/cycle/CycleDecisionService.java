package vn.syp.tms.cycle;

import static vn.syp.tms.workitem.WorkItemStore.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.execution.*;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.retest.BugRetestLifecycle;
import vn.syp.tms.workitem.*;

@Service @Transactional
public class CycleDecisionService {
    private final WorkItemStore db;
    private final WorkItemService work;
    private final ExecutionService execution;
    private final BugRetestLifecycle retest;
    private final ProjectAudit audit;
    public CycleDecisionService(WorkItemStore db,WorkItemService work,ExecutionService execution,BugRetestLifecycle retest,ProjectAudit audit) {
        this.db=db;this.work=work;this.execution=execution;this.retest=retest;this.audit=audit;
    }
    private long pm(long p,String actor) {
        var member=work.writable(p,actor);
        if(WorkItemService.developer(member) || !"PM".equals(member.get("role"))) fail(403,"PROJECT_PM_REQUIRED","Chỉ PM dự án được quyết định NA, chốt hoặc mở lại đợt.");
        return number(member,"id");
    }
    public Map<String,Object> scope(long p,String actor,long id,CycleDecisionDtos.Scope input) {
        long author=pm(p,actor);var run=execution.run(p,actor,id);version(run,input.expectedVersion());required(input.reason(),"lý do quyết định");
        if(!"ACTIVE".equals(execution.cycle(p,actor,number(run,"cycleId")).get("statusCode"))) fail(409,"CYCLE_NOT_ACTIVE","Chỉ thay đổi NA trong đợt đang thực hiện.");
        if(Objects.equals(run.get("excluded"),input.excluded())) fail(409,"SCOPE_UNCHANGED","Trạng thái phạm vi đã giống quyết định này.");
        long decision=db.insert("INSERT INTO run_scope_decisions(project_id,run_item_id,excluded,reason,decided_by,decided_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,input.excluded(),text(input.reason()),author);
        db.update("UPDATE run_items SET scope_decision_id=?,lock_version=lock_version+1 WHERE project_id=? AND id=?",decision,p,id);
        db.update("UPDATE test_cycles SET lock_version=lock_version+1 WHERE project_id=? AND id=?",p,run.get("cycleId"));
        if(input.excluded()) invalidateCoverage(p,id,author,input.reason());
        audit.record(p,actor,"RUN_ITEM",id,input.excluded()?"EXCLUDE_NA":"RESTORE_SCOPE");
        return execution.run(p,actor,id);
    }
    private void invalidateCoverage(long p,long run,long actor,String reason) {
        var bugs=db.rows("""
            SELECT DISTINCT w.id FROM bug_coverage_items i
            JOIN bug_retest_state s ON s.project_id=i.project_id AND s.work_item_id=i.work_item_id AND s.current_coverage_id=i.coverage_revision_id
            JOIN work_items w ON w.project_id=i.project_id AND w.id=i.work_item_id
            WHERE i.project_id=? AND i.run_item_id=? AND w.status_code NOT IN ('closed','unreproducible','wontfix')
            """,p,run);
        for(var bug:bugs) {
            long id=number(bug,"id");retest.invalidate(p,id,false);
            db.update("UPDATE work_items SET lock_version=lock_version+1,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",p,id);
            db.update("INSERT INTO work_item_history(project_id,work_item_id,event_type,actor_membership_id,reason,details_json,occurred_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,"SCOPE_EXCLUDED",actor,text(reason),db.encode(Map.of("runItemId",run)));
        }
    }
    public Map<String,Object> decide(long p,String actor,long id,CycleDecisionDtos.Decision input) {
        long author=pm(p,actor);var cycle=execution.cycle(p,actor,id);version(cycle,input.expectedVersion());required(input.reason(),"lý do quyết định");
        boolean close="CLOSE".equals(input.action());
        if(!close && !"REOPEN".equals(input.action())) fail(422,"INVALID_DECISION","Quyết định không hợp lệ.");
        if(!(close?"ACTIVE":"CLOSED").equals(cycle.get("statusCode"))) fail(409,"CYCLE_STATE_CONFLICT","Đợt đã thay đổi trạng thái. Tải lại trước khi quyết định.");
        var snapshot=closureScope(p,id);
        if(close) {
            if(number(snapshot,"unsettled")>0) fail(409,"UNSETTLED_RUNS","Còn lượt Chưa chạy hoặc Tạm hoãn trong phạm vi áp dụng.");
            if(number(snapshot,"unlinkedNg")>0) fail(409,"UNLINKED_NG","Liên kết bug cho mọi kết quả NG trước khi chốt đợt.");
            if(number(snapshot,"ng")+number(snapshot,"openBugs")+number(snapshot,"openRetests")>0) required(input.outstandingReason(),"ghi nhận tồn đọng");
        }
        db.insert("INSERT INTO cycle_decisions(project_id,cycle_id,action,reason,outstanding_reason,scope_snapshot,decided_by,decided_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,input.action(),text(input.reason()),text(input.outstandingReason()),db.encode(snapshot),author);
        db.update("UPDATE test_cycles SET status_code=?,lock_version=lock_version+1 WHERE project_id=? AND id=?",close?"CLOSED":"ACTIVE",p,id);
        audit.record(p,actor,"TEST_CYCLE",id,input.action());return execution.cycle(p,actor,id);
    }
    private Map<String,Object> closureScope(long p,long id) {
        var result=db.row("""
            SELECT COUNT(*) AS total,COALESCE(SUM(COALESCE(s.excluded,FALSE)),0) AS na,
            COALESCE(SUM(NOT COALESCE(s.excluded,FALSE) AND (a.id IS NULL OR a.result_code='P')),0) AS unsettled,
            COALESCE(SUM(NOT COALESCE(s.excluded,FALSE) AND a.result_code='NG'),0) AS ng,
            COALESCE(SUM(NOT COALESCE(s.excluded,FALSE) AND a.result_code='NG' AND NOT EXISTS(
                SELECT 1 FROM work_item_execution_links l WHERE l.project_id=r.project_id AND l.attempt_id=a.id)),0) AS unlinkedNg
            FROM run_items r LEFT JOIN run_scope_decisions s ON s.project_id=r.project_id AND s.id=r.scope_decision_id
            LEFT JOIN execution_attempts a ON a.project_id=r.project_id AND a.id=r.latest_attempt_id
            WHERE r.project_id=? AND r.cycle_id=?
            """,p,id);
        result.put("openBugs",db.count("""
            SELECT COUNT(*) FROM work_items w
            WHERE w.project_id=? AND w.item_type='BUG' AND w.status_code NOT IN ('closed','unreproducible','wontfix')
            AND (EXISTS(SELECT 1 FROM work_item_execution_links l
                JOIN run_items r ON r.project_id=l.project_id AND r.id=l.run_item_id
                WHERE l.project_id=w.project_id AND l.work_item_id=w.id AND r.cycle_id=?)
            OR EXISTS(SELECT 1 FROM bug_coverage_items i
                JOIN bug_retest_state s ON s.project_id=i.project_id AND s.work_item_id=i.work_item_id AND s.current_coverage_id=i.coverage_revision_id
                JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id
                WHERE i.project_id=w.project_id AND i.work_item_id=w.id AND r.cycle_id=?))
            """,p,id,id));
        result.put("openRetests",db.count("""
            SELECT COUNT(DISTINCT q.id) FROM retest_requests q JOIN retest_request_items i ON i.project_id=q.project_id AND i.request_id=q.id
            JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id
            WHERE r.project_id=? AND r.cycle_id=? AND q.status='OPEN'
            """,p,id));
        return result;
    }
    @Transactional(readOnly=true)
    public ExecutionDtos.Page<Map<String,Object>> history(long p,String actor,long id,int page,boolean scope) {
        if(scope) execution.run(p,actor,id);else execution.cycle(p,actor,id);
        if(page<0) fail(422,"INVALID_PAGE","Trang phải từ 0.");
        // Identifiers are fixed server constants; only values come from the request.
        String table=scope?"run_scope_decisions":"cycle_decisions",key=scope?"run_item_id":"cycle_id";
        String from=" FROM "+table+" d JOIN project_memberships m ON m.project_id=d.project_id AND m.id=d.decided_by JOIN identity_users u ON u.id=m.user_id WHERE d.project_id=? AND d."+key+"=?";
        long total=db.count("SELECT COUNT(*)"+from,p,id);
        String fields=scope?"d.excluded":"d.action,d.outstanding_reason AS outstandingReason,d.scope_snapshot AS scopeSnapshot";
        return new ExecutionDtos.Page<>(db.rows("SELECT d.id,"+fields+",d.reason,d.decided_at AS decidedAt,u.display_name AS actor"+from+" ORDER BY d.id DESC LIMIT 50 OFFSET ?",p,id,(long)page*50),total,page,50,(int)((total+49)/50));
    }
}
