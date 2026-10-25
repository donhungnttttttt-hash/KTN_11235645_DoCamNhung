package vn.syp.tms.ai;

import static vn.syp.tms.workitem.WorkItemStore.*;
import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

/** All stored reads recheck the owner, active session and current source permissions. */
@Service
@Transactional(isolation=Isolation.READ_COMMITTED)
public class AiChatStore {
    public record ThreadView(long id, Long projectId, String purpose, Long targetId, String sourceReference,
                             String provider, String model, Instant createdAt, Instant expiresAt) {}
    public record Turn(long id,long threadId,String requestKey,String text,String state,JsonNode content,
                       String failureCode,String provider,String requestedModel,String model,String connectionId,
                       long connectionVersion,boolean contextTruncated,Instant createdAt,Instant completedAt,Instant expiresAt) {}
    public record Detail(ThreadView thread,List<Turn> turns,Long nextBefore) {}
    public record Page(List<ThreadView> items,Long nextBefore) {}
    public record Reservation(long id,boolean created) {}
    private final WorkItemStore db;
    private final AiAccess access;
    private final LocalAiAccess sessions;
    private final ObjectMapper json;
    private final int dailyLimit;
    private final AiPortfolioContext portfolio;
    private static final String THREAD = "SELECT id,project_id AS projectId,purpose,target_id AS targetId,source_reference AS sourceReference,provider,model,created_at AS createdAt,expires_at AS expiresAt FROM ai_chat_threads";
    private static final String TURN = "SELECT id,thread_id AS threadId,request_key AS requestKey,user_text AS text,state,content_json AS content,failure_code AS failureCode,provider,requested_model AS requestedModel,model,connection_id AS connectionId,connection_version AS connectionVersion,context_truncated AS contextTruncated,created_at AS createdAt,completed_at AS completedAt,expires_at AS expiresAt FROM ai_chat_turns";

    public AiChatStore(WorkItemStore db,AiAccess access,LocalAiAccess sessions,ObjectMapper json,
                       @Value("${TMS_AI_CHAT_USER_DAILY_LIMIT:20}") int dailyLimit,AiPortfolioContext portfolio) {
        if(dailyLimit<1||dailyLimit>100)throw new IllegalArgumentException("Invalid chat daily limit.");
        this.db=db;this.access=access;this.sessions=sessions;this.json=json;this.dailyLimit=dailyLimit;this.portfolio=portfolio;
    }
    private void owner(String actor) {
        var principal=sessions.current(actor);
        var account=db.row("SELECT enabled,lock_version AS version FROM identity_users WHERE id=? FOR UPDATE",actor);
        if(!Boolean.TRUE.equals(account.get("enabled"))||principal.version()!=number(account,"version"))
            fail(401,"UNAUTHENTICATED","The session is no longer valid.");
    }
    private void scope(String actor,ThreadView thread,boolean write) {
        if(AiPortfolioContext.PURPOSE.equals(thread.purpose())){portfolio.assertCurrent(actor,thread.sourceReference());return;}
        if(AiPortfolioContext.PROJECT_PURPOSE.equals(thread.purpose())){portfolio.assertProjectCurrent(actor,thread.projectId(),thread.targetId(),thread.sourceReference(),write);return;}
        if(thread.projectId()==null)return;
        var caller=access.authorize(thread.projectId(),actor,write);
        var purpose=AiPurpose.parse(thread.purpose());
        if(purpose==AiPurpose.PM_ASSIGNMENT_SUGGESTION&&thread.sourceReference().startsWith("file:")) {
            if(write)fail(410,"AI_LEGACY_SCOPE","Nguồn phân công cũ chỉ đọc lịch sử. Tạo hội thoại mới với file trong Feature.");
            db.row("SELECT id FROM file_work_groups WHERE project_id=? AND id=? FOR SHARE",thread.projectId(),thread.targetId());
            access.require(caller,purpose);return;
        }
        if("TICKET".equals(purpose.target()))
            db.row("SELECT id FROM work_items WHERE project_id=? AND id=? FOR SHARE",thread.projectId(),thread.targetId());
        access.requireSource(thread.projectId(),caller,purpose,thread.sourceReference());
        if("DOCUMENT".equals(purpose.target()))
            db.row("SELECT b.id FROM import_batches b JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id WHERE b.project_id=? AND b.id=? AND b.status='COMMITTED' AND (?=FALSE OR (b.archived_at IS NULL AND f.archived_at IS NULL)) FOR SHARE",thread.projectId(),thread.targetId(),write);
    }
    public ThreadView create(String actor,Long project,String purpose,Long target,AiProviderGateway.Selection selection) {
        owner(actor);
        String source=null;
        if(AiPortfolioContext.PURPOSE.equals(purpose)) {
            if(project!=null||target!=null)fail(422,"AI_INVALID_TARGET","Phạm vi các dự án của tôi không nhận project hoặc target từ client.");
            source=portfolio.current(actor).reference();
        } else if(AiPortfolioContext.PROJECT_PURPOSE.equals(purpose)) {
            if(project==null||project<1)throw new BusinessException(422,"AI_INVALID_TARGET","Chat dự án cần một dự án hợp lệ; nguồn tùy chọn là Feature của dự án.");
            source=portfolio.currentProject(actor,project,target).reference();
        } else if(project==null) {
            if(purpose!=null||target!=null)fail(422,"AI_INVALID_TARGET","General chat has no project target.");
        } else {
            var parsed=AiPurpose.parse(purpose);AiContextService.validateTarget(parsed,target);
            source=AiContextService.source(project,parsed,target);
        }
        var candidate=new ThreadView(0,project,purpose,target,source,selection.provider(),selection.model(),null,null);
        scope(actor,candidate,true);
        if(db.count("SELECT COUNT(*) FROM ai_chat_threads WHERE created_by=? AND created_at>=UTC_DATE()",actor)>=dailyLimit)
            fail(429,"AI_DAILY_LIMIT","Daily chat creation limit reached.");
        long id=db.insert("INSERT INTO ai_chat_threads(created_by,project_id,purpose,target_id,source_reference,provider,model,created_at,expires_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",
                actor,project,purpose,target,source,selection.provider(),selection.model());
        return thread(actor,id);
    }
    public ThreadView thread(String actor,long id) {
        owner(actor);
        var row=db.row(THREAD+" WHERE created_by=? AND id=? AND expires_at>UTC_TIMESTAMP(6)",actor,id);
        var result=threadView(row);scope(actor,result,false);return result;
    }
    public Page list(String actor,long before) {
        owner(actor);page(before);
        var visible=new ArrayList<ThreadView>();
        String portfolioReference=null;
        var projectScopes=new HashMap<Long,AiPortfolioContext.Scope>();
        // Bound scans, and return the scanned cursor even when a page only contains revoked sources.
        var rows=db.rows(THREAD+" WHERE created_by=? AND expires_at>UTC_TIMESTAMP(6) AND (?=0 OR id<?) ORDER BY id DESC LIMIT 50",actor,before,before);
        for(var row:rows) {
            var candidate=threadView(row);
            try {
                if(AiPortfolioContext.PURPOSE.equals(candidate.purpose())) {
                    // Filter revoked scopes without throwing through a nested transaction;
                    // an expected invisible row must not poison the whole page's transaction.
                    if(portfolioReference==null)portfolioReference=portfolio.current(actor).reference();
                    if(!Objects.equals(portfolioReference,candidate.sourceReference()))continue;
                } else if(AiPortfolioContext.PROJECT_PURPOSE.equals(candidate.purpose())) {
                    var current=candidate.targetId()==null?projectScopes.computeIfAbsent(candidate.projectId(),p->portfolio.currentProject(actor,p)):portfolio.currentProject(actor,candidate.projectId(),candidate.targetId());
                    if(current.projects().isEmpty()||!Objects.equals(current.reference(),candidate.sourceReference()))continue;
                } else scope(actor,candidate,false);
                visible.add(candidate);
            }
            catch(BusinessException e) {if(!Set.of("NOT_FOUND","FORBIDDEN","ARCHIVED").contains(e.code()))throw e;}
        }
        return new Page(List.copyOf(visible),rows.size()==50?number(rows.getLast(),"id"):null);
    }
    public Detail get(String actor,long id,long before) {
        var thread=thread(actor,id);page(before);abandoned(actor);
        var rows=db.rows(TURN+" WHERE created_by=? AND thread_id=? AND expires_at>UTC_TIMESTAMP(6) AND (?=0 OR id<?) ORDER BY id DESC LIMIT 50",actor,id,before,before);
        var turns=new ArrayList<>(rows.stream().map(this::turnView).toList());Collections.reverse(turns);
        return new Detail(thread,List.copyOf(turns),rows.size()==50?number(rows.getLast(),"id"):null);
    }
    public Turn turn(String actor,long threadId,long id) {
        thread(actor,threadId);abandoned(actor);
        return turnView(db.row(TURN+" WHERE created_by=? AND thread_id=? AND id=? AND expires_at>UTC_TIMESTAMP(6)",actor,threadId,id));
    }
    public Turn findRequest(String actor,long threadId,String key,String text) {
        var thread=thread(actor,threadId);abandoned(actor);
        var rows=db.rows("SELECT id,thread_id AS threadId,request_hash AS requestHash FROM ai_chat_turns WHERE created_by=? AND request_key=?",actor,key);
        if(rows.isEmpty())return null;
        var row=rows.getFirst();
        if(number(row,"threadId")!=threadId||!hash(thread,text).equals(row.get("requestHash")))
            fail(409,"AI_REQUEST_CONFLICT","Request key has already been used for another intent.");
        return turn(actor,threadId,number(row,"id"));
    }
    public List<Turn> history(String actor,long id) {
        scope(actor,thread(actor,id),true);
        var turns=new ArrayList<>(db.rows(TURN+" WHERE created_by=? AND thread_id=? AND state='READY' AND expires_at>UTC_TIMESTAMP(6) ORDER BY id DESC LIMIT 10",actor,id).stream().map(this::turnView).toList());
        Collections.reverse(turns);return List.copyOf(turns);
    }
    public Reservation reserve(String actor,long threadId,String text,String key,AiProviderGateway.ResolvedSelection selection,List<AiDraftService.Source> sources,boolean truncated) {
        var thread=thread(actor,threadId);
        scope(actor,thread,true);
        var prior=findRequest(actor,threadId,key,text);if(prior!=null)return new Reservation(prior.id(),false);
        if(!thread.provider().equals(selection.provider())||!thread.model().equals(selection.model()))fail(409,"AI_REQUEST_CONFLICT","Pinned provider or model changed.");
        db.row("SELECT id FROM ai_chat_admission WHERE id=1 FOR UPDATE");
        // Expired pending jobs never automatically replay. Locks only cover admission, not inference.
        db.update("UPDATE ai_chat_turns SET state='FAILED',failure_code='AI_INTERRUPTED',completed_at=UTC_TIMESTAMP(6) WHERE state='GENERATING' AND created_at<=UTC_TIMESTAMP(6)-INTERVAL 2 MINUTE");
        if(db.count("SELECT COUNT(*) FROM ai_chat_turns WHERE created_by=? AND created_at>=UTC_DATE()",actor)>=dailyLimit)
            fail(429,"AI_DAILY_LIMIT","Daily chat turn limit reached.");
        if(db.count("SELECT COUNT(*) FROM ai_chat_turns WHERE state='GENERATING' AND created_by=?",actor)>0
                ||db.count("SELECT COUNT(*) FROM ai_chat_turns WHERE state='GENERATING'")>=2)
            fail(429,"AI_BUSY","Another chat request is pending.");
        long id=db.insert("INSERT INTO ai_chat_turns(thread_id,created_by,request_key,request_hash,user_text,sources_json,context_truncated,provider,requested_model,connection_id,connection_version,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),?)",
                threadId,actor,key,hash(thread,text),text,db.encode(sources),truncated,selection.provider(),selection.model(),selection.connectionId(),selection.connectionVersion(),java.sql.Timestamp.from(thread.expiresAt()));
        return new Reservation(id,true);
    }
    public Turn complete(String actor,long id,OpenAiResponsesClient.Output output) {
        owner(actor);
        var prior=db.row("SELECT thread_id AS threadId,sources_json AS sources FROM ai_chat_turns WHERE created_by=? AND id=?",actor,id);
        long threadId=number(prior,"threadId");scope(actor,thread(actor,threadId),true);
        AiChatService.validateOutput(output);
        var allowed=new ArrayList<AiDraftService.Source>();
        for(var source:parse(prior.get("sources")))allowed.add(new AiDraftService.Source(source.path("ref").asText(),"","",null));
        AiChatService.validateReferences(output.value().path("text").asText(),allowed);
        var content=json.createObjectNode().put("text",output.value().path("text").textValue());content.set("sources",parse(prior.get("sources")));
        if(db.update("UPDATE ai_chat_turns SET state='READY',content_json=?,model=?,response_id=?,input_tokens=?,output_tokens=?,completed_at=UTC_TIMESTAMP(6) WHERE created_by=? AND id=? AND state='GENERATING' AND expires_at>UTC_TIMESTAMP(6) AND created_at>UTC_TIMESTAMP(6)-INTERVAL 2 MINUTE",
                db.encode(content),output.model(),output.responseId(),output.inputTokens(),output.outputTokens(),actor,id)!=1)
            fail(409,"AI_CHAT_NOT_PENDING","Chat turn is no longer pending.");
        return turn(actor,threadId,id);
    }
    /** Internal failure-only path: no content read, including after permission/session revocation. */
    public void markFailed(String actor,long id,String code) {
        code=AiChatService.safeCode(code);
        db.update("UPDATE ai_chat_turns SET state='FAILED',failure_code=?,completed_at=UTC_TIMESTAMP(6) WHERE created_by=? AND id=? AND state='GENERATING'",code,actor,id);
    }
    public int purgeExpired() {return db.update("DELETE FROM ai_chat_threads WHERE expires_at<=UTC_TIMESTAMP(6) ORDER BY expires_at,id LIMIT 500");}
    private void abandoned(String actor) {
        db.update("UPDATE ai_chat_turns SET state='FAILED',failure_code='AI_INTERRUPTED',completed_at=UTC_TIMESTAMP(6) WHERE created_by=? AND state='GENERATING' AND created_at<=UTC_TIMESTAMP(6)-INTERVAL 2 MINUTE",actor);
    }
    private String hash(ThreadView t,String text) {return db.checksum(Arrays.asList(t.id(),t.projectId(),t.purpose(),t.targetId(),t.provider(),t.model(),text));}
    private static void page(long before){if(before<0)fail(422,"INVALID_PAGE","Invalid page cursor.");}
    private ThreadView threadView(Map<String,Object> r) {return new ThreadView(number(r,"id"),nullableLong(r,"projectId"),(String)r.get("purpose"),nullableLong(r,"targetId"),(String)r.get("sourceReference"),(String)r.get("provider"),(String)r.get("model"),(Instant)r.get("createdAt"),(Instant)r.get("expiresAt"));}
    private Turn turnView(Map<String,Object> r) {return new Turn(number(r,"id"),number(r,"threadId"),(String)r.get("requestKey"),(String)r.get("text"),(String)r.get("state"),parse(r.get("content")),(String)r.get("failureCode"),(String)r.get("provider"),(String)r.get("requestedModel"),(String)r.get("model"),(String)r.get("connectionId"),number(r,"connectionVersion"),Boolean.TRUE.equals(r.get("contextTruncated")),(Instant)r.get("createdAt"),(Instant)r.get("completedAt"),(Instant)r.get("expiresAt"));}
    private static Long nullableLong(Map<String,Object> r,String key){return r.get(key)==null?null:number(r,key);}
    private JsonNode parse(Object value) {if(value==null)return null;try{return json.readTree(value.toString());}catch(java.io.IOException e){throw new IllegalStateException("Invalid stored chat JSON.");}}
}
