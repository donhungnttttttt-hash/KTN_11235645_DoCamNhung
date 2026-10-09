package vn.syp.tms.ai;

import static vn.syp.tms.workitem.WorkItemStore.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.workitem.WorkItemStore;

@Service
@Transactional
public class AiDraftStore {
    public record Reservation(long id, boolean created) {}
    public record Draft(long id, long projectId, String createdBy, String purpose, String sourceReference,
                        String promptVersion, String state, String model, JsonNode content, String failureCode,
                        Instant createdAt, Instant expiresAt, String editedText, long version) {}
    private final WorkItemStore db;
    private final AiAccess access;
    private final ObjectMapper json;
    private final OpenAiConfiguration config;
    private final int retentionDays;
    private final int dailyLimit;
    private static final String SELECT = """
        SELECT id,project_id AS projectId,created_by AS createdBy,purpose,source_reference AS sourceReference,
        prompt_version AS promptVersion,state,model,content_json AS content,failure_code AS failureCode,
        created_at AS createdAt,expires_at AS expiresAt,edited_text AS editedText,lock_version AS version FROM ai_generated_drafts
        """;

    public AiDraftStore(WorkItemStore db, AiAccess access, ObjectMapper json, OpenAiConfiguration config,
            @Value("${TMS_AI_DRAFT_RETENTION_DAYS:7}") int retentionDays,
            @Value("${TMS_AI_PROJECT_DAILY_LIMIT:20}") int dailyLimit) {
        if (retentionDays < 1 || retentionDays > 30 || dailyLimit < 1 || dailyLimit > 100)
            throw new IllegalArgumentException("Invalid AI draft retention or daily limit.");
        this.db = db;
        this.access = access;
        this.json = json;
        this.config = config;
        this.retentionDays = retentionDays;
        this.dailyLimit = dailyLimit;
    }

    public Reservation reserve(long projectId, String actor, AiDraftService.Task task) {
        var caller = access.authorize(projectId, actor, true);
        validate(task);
        access.requireSource(projectId,caller,AiPurpose.parse(task.purpose()),task.sourceReference());
        String hash = db.checksum(List.of(task.purpose(),task.sourceReference()));
        var prior = db.rows("""
            SELECT id,request_hash AS requestHash,expires_at>UTC_TIMESTAMP(6) AS unexpired
            FROM ai_generated_drafts WHERE project_id=? AND created_by=? AND request_key=? FOR UPDATE
            """, projectId, actor, task.requestKey());
        if (!prior.isEmpty()) {
            var row = prior.getFirst();
            if (!hash.equals(row.get("requestHash"))) fail(409, "AI_REQUEST_CONFLICT", "Mã yêu cầu đã được dùng cho nội dung khác.");
            if (!Boolean.TRUE.equals(row.get("unexpired")) && !Objects.equals(row.get("unexpired"), 1L)
                    && !Objects.equals(row.get("unexpired"), 1)) fail(410, "AI_DRAFT_EXPIRED", "Bản nháp AI đã hết hạn.");
            return new Reservation(number(row, "id"), false);
        }
        // Project row is locked: multiple instances cannot race past the per-project daily limit.
        if (db.count("SELECT COUNT(*) FROM ai_generated_drafts WHERE project_id=? AND created_at>=UTC_DATE()", projectId) >= dailyLimit)
            fail(429, "AI_DAILY_LIMIT", "Dự án đã đạt giới hạn yêu cầu AI hôm nay.");
        long id = db.insert("""
            INSERT INTO ai_generated_drafts(project_id,created_by,purpose,source_reference,prompt_version,
            request_key,request_hash,model,created_at,expires_at)
            VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,?,UTC_TIMESTAMP(6)))
            """, projectId, actor, task.purpose(), task.sourceReference(), task.promptVersion(), task.requestKey(), hash, config.model(), retentionDays);
        return new Reservation(id, true);
    }

    public Draft complete(long projectId, String actor, long id, OpenAiResponsesClient.Output output) {
        var caller = access.authorize(projectId, actor, true);
        var prior = db.row(SELECT + " WHERE project_id=? AND created_by=? AND id=?", projectId, actor, id);
        access.requireSource(projectId,caller,AiPurpose.parse((String)prior.get("purpose")),(String)prior.get("sourceReference"));
        if (output == null || output.value() == null || !output.value().isObject()
                || output.responseId() == null || !output.responseId().matches("[A-Za-z0-9_-]{1,100}")
                || output.model() == null || !output.model().matches("[A-Za-z0-9._-]{1,100}")
                || output.inputTokens() < 0 || output.outputTokens() < 0) throw new vn.syp.tms.shared.web.BusinessException(422, "AI_INVALID_RESPONSE", "Kết quả AI không hợp lệ.");
        String content = db.encode(output.value());
        if (content.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 65536)
            fail(422, "AI_INVALID_RESPONSE", "Kết quả AI vượt giới hạn lưu tạm.");
        int updated = db.update("""
            UPDATE ai_generated_drafts SET state='READY',content_json=?,response_id=?,model=?,input_tokens=?,
            output_tokens=?,completed_at=UTC_TIMESTAMP(6)
            WHERE project_id=? AND created_by=? AND id=? AND state='GENERATING' AND expires_at>UTC_TIMESTAMP(6)
            """, content, output.responseId(), output.model(), output.inputTokens(), output.outputTokens(), projectId, actor, id);
        if (updated != 1) fail(409, "AI_DRAFT_NOT_PENDING", "Yêu cầu AI không còn chờ kết quả hoặc đã hết hạn.");
        return read(projectId, actor, id);
    }

    /** Internal completion path: fixed local codes, never provider error bodies or prompts. */
    public void markFailed(long projectId, String actor, long id, String code) {
        if (code == null || !code.matches("AI_[A-Z_]{1,60}")) throw new IllegalArgumentException("Invalid AI failure code.");
        db.update("""
            UPDATE ai_generated_drafts SET state='FAILED',failure_code=?,completed_at=UTC_TIMESTAMP(6)
            WHERE project_id=? AND created_by=? AND id=? AND state='GENERATING'
            """, code, projectId, actor, id);
    }

    public Draft get(long projectId, String actor, long id) {
        var caller = access.authorize(projectId, actor, false);
        var draft = read(projectId, actor, id);
        access.requireSource(projectId,caller,AiPurpose.parse(draft.purpose()),draft.sourceReference());
        return draft;
    }

    public int retentionDays() { return retentionDays; }

    public Draft findRequest(long projectId,String actor,AiPurpose purpose,String source,String key) {
        var caller=access.authorize(projectId,actor,false);
        access.requireSource(projectId,caller,purpose,source);
        failAbandoned(projectId,actor);
        var rows=db.rows(SELECT+" WHERE project_id=? AND created_by=? AND request_key=?",projectId,actor,key);
        if(rows.isEmpty())return null;
        var prior=view(rows.getFirst());
        if(!prior.purpose().equals(purpose.name())||!prior.sourceReference().equals(source))
            fail(409,"AI_REQUEST_CONFLICT","Mã yêu cầu đã được dùng cho nội dung khác.");
        if(!prior.expiresAt().isAfter(Instant.now()))fail(410,"AI_DRAFT_EXPIRED","Bản nháp AI đã hết hạn.");
        return prior;
    }

    public Draft edit(long p,String actor,long id,String text,long version) {
        access.authorize(p,actor,true);
        var draft=get(p,actor,id);
        if(text==null||text.length()>12000||version<0)fail(422,"AI_INVALID_INPUT","Bản chỉnh sửa tối đa 12000 ký tự.");
        if(!"READY".equals(draft.state()))fail(409,"AI_DRAFT_NOT_READY","Bản nháp chưa có nội dung để sửa.");
        if(db.update("UPDATE ai_generated_drafts SET edited_text=?,lock_version=lock_version+1 WHERE project_id=? AND created_by=? AND id=? AND lock_version=? AND expires_at>UTC_TIMESTAMP(6)",text,p,actor,id,version)!=1)
            fail(409,"VERSION_CONFLICT","Bản nháp đã thay đổi. Tải lại trước khi lưu.");
        return read(p,actor,id);
    }

    public List<Draft> list(long projectId, String actor, long before) {
        var caller = access.authorize(projectId, actor, false);
        failAbandoned(projectId,actor);
        if (before < 0) fail(422, "INVALID_PAGE", "Mốc phân trang không hợp lệ.");
        var purposes=AiPurpose.forRole(caller.role());
        if(purposes.isEmpty())return List.of();
        var args=new ArrayList<Object>(List.of(projectId,actor,before,before));
        purposes.forEach(purpose->args.add(purpose.name()));
        args.add(caller.membershipId());args.add(caller.membershipId());args.add(caller.membershipId());
        // Apply current permissions before the page boundary: inaccessible recent rows must
        // neither conceal older readable drafts nor trigger an N+1 source lookup.
        String allowed=String.join(",",Collections.nCopies(purposes.size(),"?"));
        return db.rows(SELECT + """
            WHERE project_id=? AND created_by=? AND expires_at>UTC_TIMESTAMP(6) AND (?=0 OR id<?)
            AND purpose IN (
            """+allowed+")"+"""
            AND (purpose NOT IN ('DEV_TICKET_REVIEW','TESTER_BUG_DRAFT') OR EXISTS (
              SELECT 1 FROM work_items w WHERE w.project_id=ai_generated_drafts.project_id
              AND CONCAT('ticket:',w.id)=ai_generated_drafts.source_reference
              AND ((ai_generated_drafts.purpose='DEV_TICKET_REVIEW' AND w.item_type IN ('BUG','QA') AND w.assignee_membership_id=?)
                OR (ai_generated_drafts.purpose='TESTER_BUG_DRAFT' AND w.item_type='BUG' AND (w.created_by=? OR w.assignee_membership_id=?)))
            )) ORDER BY id DESC LIMIT 50
            """,args.toArray()).stream().map(this::view).toList();
    }

    public int purgeExpired() {
        return db.update("DELETE FROM ai_generated_drafts WHERE expires_at<=UTC_TIMESTAMP(6) ORDER BY expires_at,id LIMIT 500");
    }

    private Draft read(long projectId, String actor, long id) {
        failAbandoned(projectId,actor);
        return view(db.row(SELECT + " WHERE project_id=? AND created_by=? AND id=? AND expires_at>UTC_TIMESTAMP(6)", projectId, actor, id));
    }

    private void failAbandoned(long p,String actor) {
        // Provider timeout is capped at 30s. A crashed process must not leave an endless spinner.
        db.update("UPDATE ai_generated_drafts SET state='FAILED',failure_code='AI_INTERRUPTED',completed_at=UTC_TIMESTAMP(6) WHERE project_id=? AND created_by=? AND state='GENERATING' AND created_at<UTC_TIMESTAMP(6)-INTERVAL 2 MINUTE",p,actor);
    }

    private Draft view(Map<String, Object> row) {
        JsonNode content = null;
        if (row.get("content") != null) {
            try { content = json.readTree(row.get("content").toString()); }
            catch (java.io.IOException e) { throw new IllegalStateException("Invalid stored AI draft JSON."); }
        }
        return new Draft(number(row, "id"), number(row, "projectId"), (String) row.get("createdBy"),
                (String) row.get("purpose"), (String) row.get("sourceReference"), (String) row.get("promptVersion"),
                (String) row.get("state"), (String) row.get("model"), content, (String) row.get("failureCode"),
                (Instant) row.get("createdAt"), (Instant) row.get("expiresAt"),(String)row.get("editedText"),number(row,"version"));
    }

    private static void validate(AiDraftService.Task task) {
        if (task == null || task.purpose() == null || !task.purpose().matches("[A-Z_]{1,64}")
                || task.sourceReference() == null || task.sourceReference().isBlank() || task.sourceReference().length() > 160
                || task.promptVersion() == null || !task.promptVersion().matches("[A-Za-z0-9._-]{1,64}")
                || task.requestKey() == null || !task.requestKey().matches("[A-Za-z0-9_-]{8,64}")
                || task.instructions() == null || task.instructions().isBlank() || task.instructions().length() > 12000
                || task.data() == null || !task.data().isObject() || task.schema() == null || !task.schema().isObject()
                || task.sources()==null || task.sources().size()>20)
            fail(422, "AI_INVALID_INPUT", "Yêu cầu bản nháp AI không hợp lệ.");
    }
}
