package vn.syp.tms.integration;

import org.springframework.lang.NonNull;

import static vn.syp.tms.workitem.WorkItemStore.*;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

/** Claim / HTTP / finalize: no database transaction spans a network call. Lease fencing protects completion. */
@Component
public class RedmineWorker {
    private final WorkItemStore db;
    private final RedmineService service;
    private final RedmineConfiguration config;
    private final RedmineClient remote;
    private final TransactionTemplate transaction;
    private record Claim(long project,long id,String lease,Map<String,Object> job,Map<String,Object> binding,String blocked) {}
    private record Outcome(String status,String error,int http,long delay,RedmineClient.Remote observed,Long knownId,boolean resetCreate) {}
    public RedmineWorker(WorkItemStore db,RedmineService service,RedmineConfiguration config,RedmineClient remote,@NonNull PlatformTransactionManager manager) {
        this.db=db;this.service=service;this.config=config;this.remote=remote;this.transaction=new TransactionTemplate(manager);
    }
    public boolean runOne() {
        var candidates=db.rows("SELECT id,project_id FROM redmine_outbox WHERE (status IN ('QUEUED','RETRY_WAIT') AND next_attempt_at<=UTC_TIMESTAMP(6)) OR (status='RUNNING' AND lease_until<UTC_TIMESTAMP(6)) ORDER BY id LIMIT 10");
        for(var candidate:candidates) {
            Claim claim=transaction.execute(s->claim(number(candidate,"project_id"),number(candidate,"id")));
            if(claim==null)continue;
            Outcome outcome=claim.blocked()==null?deliver(claim):new Outcome("FAILED",claim.blocked(),0,0,null,null,false);
            transaction.executeWithoutResult(s->finish(claim,outcome));return true;
        }
        return false;
    }
    private Claim claim(long p,long id) {
        db.row("SELECT id FROM projects WHERE id=? FOR UPDATE",p);
        var eligible=db.rows("SELECT * FROM redmine_outbox WHERE project_id=? AND id=? AND ((status IN ('QUEUED','RETRY_WAIT') AND next_attempt_at<=UTC_TIMESTAMP(6)) OR (status='RUNNING' AND lease_until<UTC_TIMESTAMP(6))) FOR UPDATE",p,id);
        if(eligible.isEmpty())return null;
        var job=eligible.getFirst();boolean expired="RUNNING".equals(job.get("status"));
        if(expired) {
            attempt(job,job.get("lease_key").toString(),"UNCERTAIN","WORKER_LEASE_EXPIRED",0);
            db.update("UPDATE redmine_outbox SET reconcile_only=TRUE WHERE id=?",id);
            if(number(job,"attempt_count")>=number(job,"max_attempts")) {
                db.update("UPDATE redmine_outbox SET status='UNCERTAIN',error_code='RETRY_LIMIT_REACHED',lease_until=NULL,lock_version=lock_version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?",id);
                return null;
            }
        }
        String lease=UUID.randomUUID().toString();
        db.update("UPDATE redmine_outbox SET status='RUNNING',lease_key=?,lease_until=UTC_TIMESTAMP(6)+INTERVAL 60 SECOND,attempt_count=attempt_count+1,lock_version=lock_version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?",lease,id);
        job=db.row("SELECT * FROM redmine_outbox WHERE id=?",id);
        var binding=db.row("SELECT * FROM redmine_bindings WHERE id=?",job.get("binding_id"));
        String blocked=null;
        if(!allowed(job))blocked="PUBLISH_PERMISSION_REVOKED";
        else try {service.verifyRouting(binding,p);}catch(BusinessException e){blocked="REDMINE_CONFIGURATION_UNAVAILABLE";}
        return new Claim(p,id,lease,job,binding,blocked);
    }
    private boolean allowed(Map<String,Object> job) {
        return db.count("SELECT COUNT(*) FROM project_memberships m JOIN identity_users u ON u.id=m.user_id JOIN projects p ON p.id=m.project_id WHERE m.project_id=? AND m.id=? AND m.active=TRUE AND u.enabled=TRUE AND m.project_role='PM' AND p.archived_at IS NULL",job.get("project_id"),job.get("dispatch_by"))==1;
    }
    private boolean reserveCreate(Claim c) {
        return Boolean.TRUE.equals(transaction.execute(s->{
            db.row("SELECT id FROM projects WHERE id=? FOR UPDATE",c.project());
            if(!owns(c) || !allowed(c.job()))return false;
            return db.update("UPDATE redmine_bindings SET create_attempted=TRUE,lock_version=lock_version+1 WHERE id=? AND create_attempted=FALSE AND external_issue_id IS NULL",c.binding().get("id"))==1;
        }));
    }
    private Outcome deliver(Claim c) {
        var mapping=config.mapping(c.project());var binding=c.binding();var job=c.job();
        var wanted=service.read(job.get("payload_json"),RedminePayload.class);
        String marker=binding.get("correlation_marker").toString();
        Long known=binding.get("external_issue_id")==null?null:number(binding,"external_issue_id");
        boolean creating=false,writeSucceeded=false;
        try {
            if(known==null) {
                var found=remote.find(mapping,marker);
                if(found.size()>1)return new Outcome("CONFLICT","REMOTE_DUPLICATE_MARKER",200,0,null,null,false);
                if(found.size()==1) {
                    var observed=remote.read(found.getFirst().id(),mapping,marker);
                    return compared(wanted,observed);
                }
                if(Boolean.TRUE.equals(job.get("reconcile_only")) || Boolean.TRUE.equals(binding.get("create_attempted")))
                    return new Outcome("UNCERTAIN","REMOTE_NOT_FOUND_AFTER_UNKNOWN_WRITE",0,0,null,null,false);
                if(!reserveCreate(c))return new Outcome("UNCERTAIN","CREATE_RESERVATION_UNAVAILABLE",0,0,null,null,false);
                creating=true;known=remote.create(wanted,mapping);writeSucceeded=true;
                return compared(wanted,remote.read(known,mapping,marker));
            }
            var observed=remote.read(known,mapping,marker);
            if(wanted.equals(observed.payload()))return compared(wanted,observed);
            String expected=(String)job.get("expected_remote_fingerprint");
            if(expected==null)expected=(String)binding.get("delivered_fingerprint");
            if(Boolean.TRUE.equals(job.get("reconcile_only")) || expected==null || !expected.equals(db.checksum(observed.payload())))
                return new Outcome("CONFLICT","REMOTE_CHANGED",200,0,observed,known,false);
            // Recheck authorization after the preflight read, before any outbound update.
            if(!Boolean.TRUE.equals(transaction.execute(s->{db.row("SELECT id FROM projects WHERE id=? FOR UPDATE",c.project());return owns(c) && allowed(job);})))
                return new Outcome("FAILED","PUBLISH_PERMISSION_REVOKED",0,0,observed,known,false);
            remote.update(known,wanted,mapping);writeSucceeded=true;
            return compared(wanted,remote.read(known,mapping,marker));
        } catch(RedmineClient.Failure e) {
            boolean uncertain=e.uncertain() || writeSucceeded;
            String status=uncertain?"UNCERTAIN":e.retryable() && number(job,"attempt_count")<number(job,"max_attempts")?"RETRY_WAIT":"FAILED";
            if(Set.of("REMOTE_DUPLICATE_MARKER","REMOTE_IDENTITY_MISMATCH").contains(e.getMessage()))status="CONFLICT";
            if(creating && "REMOTE_IDENTITY_MISMATCH".equals(e.getMessage()))known=null;
            long backoff=Math.min(3600,30L*(1L<<Math.min(6,number(job,"attempt_count")-1)));
            // Only an explicit rejection of CREATE releases the durable create fence.
            boolean rejectedCreate=creating && !writeSucceeded && !e.uncertain() && e.httpStatus()>=400 && e.httpStatus()<500 && e.httpStatus()!=408;
            return new Outcome(status,e.getMessage(),e.httpStatus(),Math.max(backoff,e.retryAfterSeconds()),null,known,rejectedCreate);
        }
    }
    private Outcome compared(RedminePayload wanted,RedmineClient.Remote observed) {
        boolean same=wanted.equals(observed.payload());
        return new Outcome(same?"DELIVERED":"CONFLICT",same?null:"REMOTE_CHANGED",200,0,observed,observed.id(),false);
    }
    private boolean owns(Claim c) {
        return db.count("SELECT COUNT(*) FROM redmine_outbox WHERE id=? AND status='RUNNING' AND lease_key=? AND lease_until>UTC_TIMESTAMP(6)",c.id(),c.lease())==1;
    }
    private void finish(Claim c,Outcome outcome) {
        db.row("SELECT id FROM projects WHERE id=? FOR UPDATE",c.project());
        if(!owns(c))return;
        var b=c.binding();String status=outcome.status(),error=outcome.error();
        if(outcome.knownId()!=null && db.count("SELECT COUNT(*) FROM redmine_bindings WHERE instance_hash=? AND external_issue_id=? AND id<>?",b.get("instance_hash"),outcome.knownId(),b.get("id"))>0) {
            status="CONFLICT";error="REMOTE_ALREADY_BOUND";
        } else if(outcome.knownId()!=null) db.update("UPDATE redmine_bindings SET external_issue_id=?,lock_version=lock_version+1 WHERE id=?",outcome.knownId(),b.get("id"));
        if(outcome.resetCreate())db.update("UPDATE redmine_bindings SET create_attempted=FALSE WHERE id=? AND external_issue_id IS NULL",b.get("id"));
        if(outcome.observed()!=null) {
            String encoded=db.encode(outcome.observed().payload()),fingerprint=db.checksum(outcome.observed().payload());
            db.update("UPDATE redmine_bindings SET observed_payload=?,observed_fingerprint=?,observed_at=UTC_TIMESTAMP(6),lock_version=lock_version+1 WHERE id=?",encoded,fingerprint,b.get("id"));
            if(status.equals("DELIVERED"))db.update("UPDATE redmine_bindings SET delivered_payload=?,delivered_fingerprint=?,delivered_source_version=? WHERE id=?",encoded,fingerprint,c.job().get("source_version"),b.get("id"));
        }
        db.update("UPDATE redmine_outbox SET status=?,error_code=?,http_status=?,next_attempt_at=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6)),lease_until=NULL,updated_at=UTC_TIMESTAMP(6),lock_version=lock_version+1 WHERE id=?",status,error,outcome.http()==0?null:outcome.http(),outcome.delay(),c.id());
        attempt(c.job(),c.lease(),status,error,outcome.http());
    }
    private void attempt(Map<String,Object> job,String lease,String outcome,String error,int http) {
        db.update("INSERT INTO redmine_delivery_attempts(project_id,outbox_id,attempt_no,lease_key,outcome,error_code,http_status,actor_membership_id,reason,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",job.get("project_id"),job.get("id"),job.get("attempt_count"),lease,outcome,error,http==0?null:http,job.get("dispatch_by"),job.get("reason"));
    }
}
