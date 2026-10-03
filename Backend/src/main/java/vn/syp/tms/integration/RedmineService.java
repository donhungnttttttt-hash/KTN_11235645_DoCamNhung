package vn.syp.tms.integration;

import static vn.syp.tms.workitem.WorkItemStore.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.workitem.*;

@Service @Transactional
public class RedmineService {
    private final WorkItemStore db;
    private final WorkItemService work;
    private final RedmineConfiguration config;
    private final ObjectMapper json;
    private final ProjectAudit audit;
    public RedmineService(WorkItemStore db,WorkItemService work,RedmineConfiguration config,ObjectMapper json,ProjectAudit audit) {
        this.db=db;this.work=work;this.config=config;this.json=json;this.audit=audit;
    }
    private Map<String,Object> manager(long p,String actor) {
        var m=work.writable(p,actor);
        if(!"PM".equals(m.get("role")))fail(403,"PROJECT_PM_REQUIRED","Chỉ PM dự án được công bố và đối chiếu Redmine.");
        return m;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> configuration(long p,String actor) {
        var m=work.membership(p,actor);
        boolean manage="PM".equals(m.get("role")) && db.row("SELECT archived_at FROM projects WHERE id=?",p).get("archived_at")==null;
        var result=new LinkedHashMap<String,Object>();result.put("configured",config.configured(p));result.put("canManage",manage);
        if(config.configured(p)){result.put("baseUrl",config.base().toString());result.put("mapping",config.mapping(p));}
        return result;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> state(long p,String actor,long id) {
        var bug=work.get(p,actor,id);
        var result=new LinkedHashMap<>(configuration(p,actor));result.put("sourceVersion",bug.get("version"));
        var bindings=db.rows("SELECT id,instance_hash,external_issue_id AS externalIssueId,delivered_source_version AS deliveredSourceVersion,delivered_payload AS deliveredPayload,observed_payload AS observedPayload,observed_fingerprint AS observedFingerprint,observed_at AS observedAt FROM redmine_bindings WHERE project_id=? AND work_item_id=?",p,id);
        Map<String,Object> binding=bindings.isEmpty()?null:bindings.getFirst();
        if(binding!=null) {
            for(String key:List.of("deliveredPayload","observedPayload"))if(binding.get(key)!=null)binding.put(key,read(binding.get(key),RedminePayload.class));
            if(config.configured(p) && config.instanceHash().equals(binding.get("instance_hash")) && binding.get("externalIssueId")!=null)binding.put("url",config.issueUrl(number(binding,"externalIssueId")));
            binding.remove("instance_hash");
        }
        result.put("binding",binding);
        var jobs=db.rows("SELECT id,operation,status,source_version AS sourceVersion,reason,attempt_count AS attemptCount,max_attempts AS maxAttempts,next_attempt_at AS nextAttemptAt,error_code AS errorCode,http_status AS httpStatus,lock_version AS version,created_at AS createdAt,updated_at AS updatedAt FROM redmine_outbox WHERE project_id=? AND work_item_id=? ORDER BY id DESC LIMIT 20",p,id);
        result.put("deliveries",jobs);
        result.put("attempts",db.rows("SELECT a.id,a.outbox_id AS deliveryId,a.attempt_no AS attemptNo,a.outcome,a.reason,u.display_name AS actor,a.error_code AS errorCode,a.http_status AS httpStatus,a.occurred_at AS occurredAt FROM redmine_delivery_attempts a JOIN redmine_outbox o ON o.project_id=a.project_id AND o.id=a.outbox_id JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.actor_membership_id JOIN identity_users u ON u.id=m.user_id WHERE o.project_id=? AND o.work_item_id=? ORDER BY a.id DESC LIMIT 50",p,id));
        return result;
    }
    public Map<String,Object> queue(long p,String actor,long id,RedmineDtos.Publish input,boolean reconcile) {
        var m=manager(p,actor);required(input.reason(),"lý do");
        String checksum=db.checksum(List.of(id,reconcile,input));
        var previous=db.rows("SELECT work_item_id,created_by,request_checksum FROM redmine_outbox WHERE project_id=? AND request_key=?",p,input.requestKey());
        if(!previous.isEmpty()) {
            var old=previous.getFirst();
            if(number(old,"created_by")!=number(m,"id") || !checksum.equals(old.get("request_checksum")))fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã được dùng cho nội dung khác.");
            return state(p,actor,id);
        }
        var bug=work.get(p,actor,id);version(bug,input.expectedVersion());
        if(!"BUG".equals(bug.get("type")))fail(422,"BUG_REQUIRED","Chỉ công bố loại Lỗi lên Redmine.");
        if(db.count("SELECT COUNT(*) FROM work_item_external_references WHERE project_id=? AND work_item_id=? AND UPPER(provider)='REDMINE'",p,id)>0)
            fail(409,"REDMINE_MANUAL_REFERENCE","Bug đã có tham chiếu Redmine nhập tay. Cần đối chiếu liên kết hiện có trước khi bật công bố tự động.");
        var mapping=config.mapping(p);
        var bindings=db.rows("SELECT * FROM redmine_bindings WHERE project_id=? AND work_item_id=?",p,id);
        Map<String,Object> binding;
        if(bindings.isEmpty()) {
            if(reconcile)fail(409,"REDMINE_NOT_PUBLISHED","Bug chưa có lần công bố Redmine.");
            long b=db.insert("INSERT INTO redmine_bindings(project_id,work_item_id,correlation_marker,instance_hash,configuration_json,created_by,created_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,UUID.randomUUID().toString(),config.instanceHash(),db.encode(mapping),number(m,"id"));
            binding=db.row("SELECT * FROM redmine_bindings WHERE id=?",b);
        } else binding=bindings.getFirst();
        verifyRouting(binding,p);
        if(input.observedFingerprint()!=null && !input.observedFingerprint().equals(binding.get("observed_fingerprint")))
            fail(409,"REDMINE_RECONCILIATION_REQUIRED","Bản Redmine đã thay đổi; tải lại và đối chiếu trước khi xác nhận.");
        var active=db.rows("SELECT * FROM redmine_outbox WHERE binding_id=? AND active_binding IS NOT NULL",binding.get("id"));
        if(!active.isEmpty()) {
            var old=active.getFirst();String status=old.get("status").toString();
            if(!Set.of("CONFLICT","UNCERTAIN").contains(status))fail(409,"REDMINE_PENDING","Đang có yêu cầu Redmine chờ xử lý.");
            if(!reconcile && (!"CONFLICT".equals(status) || binding.get("external_issue_id")==null
                || input.observedFingerprint()==null || !input.observedFingerprint().equals(binding.get("observed_fingerprint"))))
                fail(409,"REDMINE_RECONCILIATION_REQUIRED","Cần đối chiếu và xác nhận bản Redmine hiện tại trước khi công bố lại.");
            db.update("UPDATE redmine_outbox SET status='SUPERSEDED',lock_version=lock_version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?",old.get("id"));
        }
        var payload=publicationSnapshot(p,bug,mapping,binding.get("correlation_marker").toString());
        Object sourceVersion=bug.get("version");
        if(reconcile) {
            var sent=db.row("SELECT payload_json,source_version FROM redmine_outbox WHERE binding_id=? AND operation='PUBLISH' ORDER BY id DESC LIMIT 1",binding.get("id"));
            payload=read(sent.get("payload_json"),RedminePayload.class);sourceVersion=sent.get("source_version");
        }
        db.insert("INSERT INTO redmine_outbox(project_id,work_item_id,binding_id,operation,source_version,payload_json,payload_checksum,expected_remote_fingerprint,request_key,request_checksum,reason,created_by,dispatch_by,created_at,updated_at,next_attempt_at,reconcile_only) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)",
            p,id,binding.get("id"),reconcile?"RECONCILE":"PUBLISH",sourceVersion,db.encode(payload),db.checksum(payload),input.observedFingerprint(),input.requestKey(),checksum,text(input.reason()),m.get("id"),m.get("id"),reconcile);
        audit.record(p,actor,"REDMINE",id,reconcile?"RECONCILE":"PUBLISH");return state(p,actor,id);
    }
    public Map<String,Object> retry(long p,String actor,long jobId,RedmineDtos.Retry input) {
        var member=manager(p,actor);required(input.reason(),"lý do");
        var job=db.row("SELECT *,lock_version AS version FROM redmine_outbox WHERE project_id=? AND id=?",p,jobId);version(job,input.expectedVersion());
        if(!"FAILED".equals(job.get("status")))fail(409,"REDMINE_RETRY_NOT_ALLOWED","Chỉ thử lại yêu cầu đã thất bại rõ ràng; kết quả chưa rõ cần đối chiếu.");
        var binding=db.row("SELECT * FROM redmine_bindings WHERE id=?",job.get("binding_id"));verifyRouting(binding,p);
        if(db.count("SELECT COUNT(*) FROM redmine_outbox WHERE binding_id=? AND (active_binding IS NOT NULL OR id>?)",binding.get("id"),jobId)>0)fail(409,"REDMINE_PENDING","Đã có yêu cầu mới hơn; hãy tải lại.");
        db.update("INSERT INTO redmine_delivery_attempts(project_id,outbox_id,attempt_no,lease_key,outcome,actor_membership_id,reason,occurred_at) VALUES(?,?,?,?,'RETRY_REQUESTED',?,?,UTC_TIMESTAMP(6))",p,jobId,job.get("attempt_count"),UUID.randomUUID().toString(),member.get("id"),text(input.reason()));
        db.update("UPDATE redmine_outbox SET status='QUEUED',max_attempts=attempt_count+5,next_attempt_at=UTC_TIMESTAMP(6),dispatch_by=?,error_code=NULL,http_status=NULL,lock_version=lock_version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?",member.get("id"),jobId);
        audit.record(p,actor,"REDMINE",jobId,"RETRY");return state(p,actor,number(job,"work_item_id"));
    }
    void verifyRouting(Map<String,Object> binding,long p) {
        var mapping=config.mapping(p);
        if(!config.instanceHash().equals(binding.get("instance_hash")) || !mapping.equals(read(binding.get("configuration_json"),RedmineConfiguration.Mapping.class)))
            fail(409,"REDMINE_MAPPING_CHANGED","Cấu hình đã đổi so với liên kết ban đầu; cần người vận hành đối chiếu.");
    }
    private RedminePayload publicationSnapshot(long p,Map<String,Object> bug,RedmineConfiguration.Mapping mapping,String marker) {
        var snapshot=new LinkedHashMap<>(bug);
        if(bug.get("contextSnapshot")!=null) {
            var context=read(bug.get("contextSnapshot"),com.fasterxml.jackson.databind.JsonNode.class);
            snapshot.put("buildLabel",context.path("build").path("versionLabel").asText((String)bug.get("buildLabel")));
            snapshot.put("environmentName",context.path("environment").path("name").asText((String)bug.get("environmentName")));
            snapshot.put("deviceName",context.path("device").path("name").asText((String)bug.get("deviceName")));
        }
        if(bug.get("fixedBuildId")!=null) {
            var fixed=db.row("SELECT version_label,build_number,platform FROM builds WHERE project_id=? AND id=?",p,bug.get("fixedBuildId"));
            snapshot.put("fixedBuildLabel",fixed.get("platform")+" "+fixed.get("version_label")+" ("+fixed.get("build_number")+")");
        }
        return RedminePayload.from(snapshot,mapping,marker);
    }
    <T>T read(Object value,Class<T> type) {try{return json.readValue(value.toString(),type);}catch(Exception e){throw new IllegalStateException("Invalid persisted Redmine metadata");}}
}
