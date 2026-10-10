package vn.syp.tms.admin;

import static vn.syp.tms.workitem.WorkItemStore.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.workitem.WorkItemStore;

/** Archive is a reversible, audited read-only boundary. It never completes or deletes child work. */
@Service @Transactional
public class ProjectLifecycleService {
    public record Command(@NotNull @PositiveOrZero Long expectedVersion,
            @NotBlank @Size(max=2000) String reason,
            @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,100}") String requestKey) {}
    private final WorkItemStore db;
    private final ProjectAudit audit;
    public ProjectLifecycleService(WorkItemStore db,ProjectAudit audit){this.db=db;this.audit=audit;}
    private static final String PROJECT="SELECT id,code,name,archived_at AS archivedAt,lock_version AS version FROM projects WHERE id=?";
    private static final String HISTORY="SELECT d.id,d.action,d.reason,d.result_version AS resultVersion,d.decided_at AS decidedAt,u.display_name AS actorName FROM project_lifecycle_decisions d JOIN identity_users u ON u.id=d.actor_id WHERE d.project_id=?";
    private void admin(String actor) {
        // Current locking projection avoids cached session/JPA roles and old RR snapshots.
        var current=db.rows("SELECT role_code AS role,enabled FROM identity_users WHERE id=? FOR SHARE",actor);
        if(current.isEmpty() || !Boolean.TRUE.equals(current.getFirst().get("enabled")))fail(401,"UNAUTHENTICATED","Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        if(!"ADMIN".equals(current.getFirst().get("role")))fail(403,"ADMIN_REQUIRED","Chỉ ADMIN được lưu trữ hoặc mở lại dự án.");
    }
    public Map<String,Object> readiness(String actor,long projectId) {
        admin(actor);var project=db.row(PROJECT+" FOR SHARE",projectId);
        return readiness(projectId,project);
    }
    private Map<String,Object> readiness(long id,Map<String,Object> project) {
        var blockers=new ArrayList<Map<String,Object>>();
        add(blockers,"ACTIVE_SESSIONS","Phiên kiểm thử đang làm hoặc tạm dừng",db.count("SELECT COUNT(*) FROM file_work_sessions WHERE project_id=? AND state IN ('DOING','PAUSED') FOR SHARE",id));
        add(blockers,"ALLOCATED_DEVICES","Thiết bị chưa thu hồi",db.count("SELECT COUNT(*) FROM device_allocations WHERE project_id=? AND returned_at IS NULL FOR SHARE",id));
        add(blockers,"OPEN_WORK_ITEMS","Công việc, bug hoặc QA chưa kết thúc",db.count("SELECT COUNT(*) FROM work_items w JOIN work_item_statuses s ON s.code=w.status_code WHERE w.project_id=? AND s.terminal=FALSE FOR SHARE",id));
        // A direct locking join also sees newly committed runs under an older RR snapshot;
        // an ordinary EXISTS subquery could otherwise retain that transaction's old view.
        add(blockers,"UNFINISHED_CYCLES","Đợt kiểm thử đang hoạt động hoặc bản nháp đã có case",db.count("SELECT COUNT(DISTINCT c.id) FROM test_cycles c LEFT JOIN run_items r ON r.project_id=c.project_id AND r.cycle_id=c.id WHERE c.project_id=? AND (c.status_code='ACTIVE' OR (c.status_code='DRAFT' AND r.id IS NOT NULL)) FOR SHARE",id));
        add(blockers,"OPEN_RETESTS","Yêu cầu kiểm thử lại chưa kết thúc",db.count("SELECT COUNT(*) FROM retest_requests WHERE project_id=? AND status='OPEN' FOR SHARE",id));
        add(blockers,"PENDING_PUBLICATIONS","Yêu cầu Redmine đang chờ hoặc đang gửi",db.count("SELECT COUNT(*) FROM redmine_outbox WHERE project_id=? AND status IN ('QUEUED','RETRY_WAIT','RUNNING') FOR SHARE",id));
        boolean archived=project.get("archivedAt")!=null;
        var result=new LinkedHashMap<String,Object>();
        result.put("projectId",id);result.put("projectCode",project.get("code"));result.put("projectName",project.get("name"));
        result.put("version",project.get("version"));result.put("archived",archived);result.put("archivedAt",project.get("archivedAt"));
        result.put("canArchive",!archived&&blockers.isEmpty());result.put("canReopen",archived);result.put("asOf",Instant.now());result.put("blockers",blockers);
        var warnings=new ArrayList<Map<String,Object>>();
        // Only the latest publication per binding needs attention; an older failure followed
        // by a successful delivery is retained history, not an unresolved warning.
        add(warnings,"PUBLICATION_REVIEW","Công bố Redmine cần kiểm tra",db.count("SELECT COUNT(*) FROM redmine_outbox o LEFT JOIN redmine_outbox newer ON newer.project_id=o.project_id AND newer.binding_id=o.binding_id AND newer.id>o.id WHERE o.project_id=? AND o.status IN ('FAILED','CONFLICT','UNCERTAIN') AND newer.id IS NULL FOR SHARE",id));
        result.put("warnings",warnings);
        var latest=db.rows(HISTORY+" ORDER BY d.id DESC LIMIT 1 FOR SHARE",id);
        result.put("latestDecision",latest.isEmpty()?null:latest.getFirst());return result;
    }
    private void add(List<Map<String,Object>> blockers,String code,String label,long count){if(count>0)blockers.add(Map.of("code",code,"label",label,"count",count));}
    public Map<String,Object> decide(String actor,long projectId,Command input,boolean archive) {
        admin(actor);var project=db.row(PROJECT+" FOR UPDATE",projectId);
        required(input.reason(),"lý do lưu trữ hoặc mở lại");
        if(text(input.reason()).length()>2000 || input.expectedVersion()==null || input.expectedVersion()<0 || input.requestKey()==null || !input.requestKey().matches("[A-Za-z0-9_-]{8,100}"))fail(422,"INVALID_COMMAND","Lý do, phiên bản và mã yêu cầu không hợp lệ.");
        String action=archive?"ARCHIVE":"REOPEN",reason=text(input.reason());
        String hash=db.checksum(List.of(action,input.expectedVersion(),reason));
        var previous=db.rows("SELECT actor_id AS actor,payload_hash AS hash FROM project_lifecycle_decisions WHERE project_id=? AND request_key=? FOR UPDATE",projectId,input.requestKey());
        if(!previous.isEmpty()) {
            if(!actor.equals(previous.getFirst().get("actor")) || !hash.equals(previous.getFirst().get("hash")))fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã được sử dụng với người thực hiện hoặc nội dung khác.");
            // Return current state: an old successful retry must never undo a later reopen/archive.
            return readiness(projectId,project);
        }
        version(project,input.expectedVersion());
        if(archive==(project.get("archivedAt")!=null))fail(409,"PROJECT_STATE_CONFLICT",archive?"Dự án đã được lưu trữ.":"Dự án đang hoạt động.");
        if(archive && !Boolean.TRUE.equals(readiness(projectId,project).get("canArchive")))fail(409,"ARCHIVE_BLOCKED","Còn việc chưa xử lý. Tải lại kiểm tra và hoàn tất các mục đang chặn trước khi lưu trữ.");
        int changed=db.update("UPDATE projects SET archived_at="+(archive?"UTC_TIMESTAMP(6)":"NULL")+",lock_version=lock_version+1,updated_at=UTC_TIMESTAMP(6),updated_by=? WHERE id=? AND lock_version=?",actor,projectId,input.expectedVersion());
        if(changed!=1)fail(409,"VERSION_CONFLICT","Dự án đã thay đổi. Tải lại để kiểm tra.");
        db.insert("INSERT INTO project_lifecycle_decisions(project_id,action,reason,expected_version,result_version,request_key,payload_hash,actor_id,decided_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",
            projectId,action,reason,input.expectedVersion(),input.expectedVersion()+1,input.requestKey(),hash,actor);
        audit.record(projectId,actor,"PROJECT",projectId,action);
        return readiness(projectId,db.row(PROJECT+" FOR SHARE",projectId));
    }
    public AdminDtos.Page<Map<String,Object>> history(String actor,long projectId,int page,int size) {
        admin(actor);db.row(PROJECT+" FOR SHARE",projectId);
        if(page<0||size<1||size>100)fail(422,"INVALID_FILTER","Kích thước trang từ 1 đến 100, trang từ 0.");
        long count=db.count("SELECT COUNT(*) FROM project_lifecycle_decisions WHERE project_id=? FOR SHARE",projectId);
        return new AdminDtos.Page<>(db.rows(HISTORY+" ORDER BY d.id DESC LIMIT ? OFFSET ? FOR SHARE",projectId,size,(long)page*size),page,size,count);
    }
}
