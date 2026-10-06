package vn.syp.tms.filework;

import static vn.syp.tms.workitem.WorkItemStore.*;
import static vn.syp.tms.filework.FileWorkGuard.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

@Service
@Transactional
public class FileWorkSessionService {
    private final WorkItemStore db;
    private final FileWorkGuard guard;
    private final ProjectAudit audit;
    private final ObjectMapper json;
    public FileWorkSessionService(WorkItemStore db,FileWorkGuard guard,ProjectAudit audit,ObjectMapper json){this.db=db;this.guard=guard;this.audit=audit;this.json=json;}

    public Map<String,Object> start(long p,String actor,long id,FileWorkDtos.Start input) {
        var caller=guard.authorize(p,actor,false);key(input.requestKey());positive(input.allocationId());positive(input.buildId());
        var group=guard.group(p,id);var runs=guard.runs(p,id);
        var snapshot=guard.usable(p,caller,group,runs,input.allocationId(),input.buildId(),null);
        String checksum=db.checksum(List.of("START",p,id,input));
        var replay=replay(p,caller.membershipId(),id,null,"START",input.requestKey(),checksum);if(replay!=null)return replay;
        version(group,input.expectedVersion());
        var previous=db.rows("SELECT id,state FROM file_work_sessions WHERE project_id=? AND group_id=? ORDER BY id DESC FOR UPDATE",p,id);
        if(previous.stream().anyMatch(s->Set.of("DOING","PAUSED").contains(s.get("state"))))fail(409,"SESSION_OPEN","File còn phiên đang DOING hoặc PAUSED; cần tiếp tục hoặc PM hủy phiên.");
        String from=previous.isEmpty()?"READY":String.valueOf(previous.getFirst().get("state"));
        @SuppressWarnings("unchecked") var asset=(Map<String,Object>)snapshot.get("physicalAsset");long assetId=number(asset,"id");
        availableAsset(assetId,null);
        long sessionId;
        try{sessionId=db.insert("INSERT INTO file_work_sessions(project_id,group_id,executor_membership_id,allocation_id,asset_id,build_id,state,context_snapshot,started_at,last_transition_at) VALUES(?,?,?,?,?,?,'DOING',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",p,id,caller.membershipId(),input.allocationId(),assetId,input.buildId(),db.encode(snapshot));}
        catch(DuplicateKeyException e){activeConflict(e);throw e;}
        bumpGroup(p,id,caller.membershipId(),number(group,"version"));
        history(p,id,sessionId,caller.membershipId(),"START",from,"DOING",number(group,"version")+1,0,"",snapshot);
        audit.record(p,actor,"FILE_WORK_SESSION",sessionId,"START");
        var response=read(p,caller,guard.group(p,id),guard.session(p,sessionId,true));
        command(p,id,sessionId,caller.membershipId(),"START",input.requestKey(),checksum,response);return response;
    }
    public Map<String,Object> pause(long p,String actor,long id,FileWorkDtos.SessionCommand input){return transition(p,actor,id,"PAUSE",input);}
    public Map<String,Object> resume(long p,String actor,long id,FileWorkDtos.SessionCommand input){return transition(p,actor,id,"RESUME",input);}
    public Map<String,Object> complete(long p,String actor,long id,FileWorkDtos.SessionCommand input){return transition(p,actor,id,"COMPLETE",input);}
    public Map<String,Object> cancel(long p,String actor,long id,FileWorkDtos.SessionCommand input){return transition(p,actor,id,"CANCEL",input);}
    private Map<String,Object> transition(long p,String actor,long id,String action,FileWorkDtos.SessionCommand input) {
        FileWorkGuard.Actor caller;Map<String,Object> group,session;
        boolean cancel=action.equals("CANCEL");
        if(cancel){caller=guard.authorize(p,actor,true);var located=guard.session(p,id,false);group=guard.group(p,number(located,"groupId"));guard.runs(p,number(group,"id"));session=guard.session(p,id,true);}
        else {var context=guard.execution(p,actor,id);caller=context.actor();group=context.group();session=context.session();}
        if(cancel){
            // Lock immutable pins in the normal order while allowing revoked/returned resources.
            db.row("SELECT id FROM device_assets WHERE id=? FOR UPDATE",number(session,"assetId"));
            db.row("SELECT id FROM device_allocations WHERE project_id=? AND id=? FOR UPDATE",p,number(session,"allocationId"));
        }
        key(input.requestKey());String reason=text(input.reason());
        if(reason.length()>1000)fail(422,"INVALID_SCOPE","Lý do tối đa 1000 ký tự.");
        if((cancel || action.equals("PAUSE")) && reason.isEmpty())fail(422,"REASON_REQUIRED","Nhập lý do tạm dừng hoặc hủy phiên.");
        long groupId=number(group,"id");String checksum=db.checksum(List.of(action,p,id,input));
        var replay=replay(p,caller.membershipId(),groupId,id,action,input.requestKey(),checksum);if(replay!=null)return replay;
        version(group,input.expectedGroupVersion());version(session,input.expectedVersion());
        String from=String.valueOf(session.get("state"));String to=switch(action){case "PAUSE"->"PAUSED";case "RESUME"->"DOING";case "COMPLETE"->"COMPLETED";default->"CANCELLED";};
        boolean allowed=cancel?Set.of("DOING","PAUSED").contains(from):action.equals("RESUME")?from.equals("PAUSED"):from.equals("DOING");
        if(!allowed)fail(409,"INVALID_SESSION_STATE","Trạng thái phiên không cho phép thao tác này.");
        if(action.equals("RESUME"))availableAsset(number(session,"assetId"),id);
        if(action.equals("COMPLETE") && !guard.completionReady(p,groupId,number(session,"buildId")))fail(409,"COMPLETION_BLOCKED","Cần chạy hết scope trên build của phiên, xử lý P và liên kết BUG cho từng NG hiện hành.");
        boolean ended=cancel || action.equals("COMPLETE");
        try{if(db.update("UPDATE file_work_sessions SET state=?,lock_version=lock_version+1,last_transition_at=UTC_TIMESTAMP(6),ended_at="+(ended?"UTC_TIMESTAMP(6)":"NULL")+" WHERE project_id=? AND id=? AND lock_version=?",to,p,id,input.expectedVersion())!=1)fail(409,"VERSION_CONFLICT","Phiên đã thay đổi; tải lại.");}
        catch(DuplicateKeyException e){activeConflict(e);throw e;}
        bumpGroup(p,groupId,caller.membershipId(),input.expectedGroupVersion());
        history(p,groupId,id,caller.membershipId(),action,from,to,input.expectedGroupVersion()+1,input.expectedVersion()+1,reason,Map.of("buildId",session.get("buildId"),"assetId",session.get("assetId")));
        audit.record(p,actor,"FILE_WORK_SESSION",id,action);
        var response=read(p,caller,guard.group(p,groupId),guard.session(p,id,true));command(p,groupId,id,caller.membershipId(),action,input.requestKey(),checksum,response);return response;
    }
    private void availableAsset(long asset,Long except) {
        // Do not lock a foreign group's session after its asset: cancellation owns session -> asset.
        // The asset lock serializes commands; the global generated unique key is the final write arbiter.
        var active=db.rows("SELECT id FROM file_work_sessions WHERE asset_id=? AND state='DOING' ORDER BY id",asset);
        if(active.stream().anyMatch(s->except==null || number(s,"id")!=except))fail(409,"ASSET_BUSY","Máy đang được sử dụng trong phiên khác.");
    }
    private void activeConflict(DuplicateKeyException error) {
        // Translate only the known generated-key constraints; other duplicates must not masquerade as machine races.
        String detail=String.valueOf(error.getMostSpecificCause().getMessage());
        if(detail.contains("uq_fw_session_asset_doing"))fail(409,"ASSET_BUSY","Máy đang được sử dụng trong phiên khác.");
        if(detail.contains("uq_fw_session_group_doing"))fail(409,"SESSION_OPEN","File đang có phiên thực thi.");
    }
    private void bumpGroup(long p,long id,long actor,long expected){if(db.update("UPDATE file_work_groups SET lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=? AND lock_version=?",actor,p,id,expected)!=1)fail(409,"VERSION_CONFLICT","File đã thay đổi; tải lại.");}
    @SuppressWarnings("unchecked") private Map<String,Object> replay(long p,long actor,long group,Long session,String action,String key,String checksum) {
        var values=db.rows("SELECT group_id AS groupId,session_id AS sessionId,action,actor_membership_id AS actorMembershipId,request_checksum AS checksum,response_json AS response FROM file_work_commands WHERE project_id=? AND request_key=? FOR UPDATE",p,key);
        if(values.isEmpty())return null;var old=values.getFirst();
        if(number(old,"groupId")!=group || (session!=null && !Objects.equals(session,old.get("sessionId"))) || number(old,"actorMembershipId")!=actor || !action.equals(old.get("action")) || !checksum.equals(old.get("checksum")))fail(409,"IDEMPOTENCY_CONFLICT","Request key đã dùng cho một lệnh khác.");
        return (Map<String,Object>)parse(old.get("response"));
    }
    private void command(long p,long group,long session,long actor,String action,String key,String checksum,Object response){db.update("INSERT INTO file_work_commands(project_id,group_id,session_id,action,actor_membership_id,request_key,request_checksum,response_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,group,session,action,actor,key,checksum,db.encode(response));}
    private void history(long p,long group,long session,long actor,String action,String from,String to,long gv,long sv,String reason,Object details){db.update("INSERT INTO file_work_history(project_id,group_id,session_id,action,from_state,to_state,group_version,session_version,reason,details_json,actor_membership_id,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,group,session,action,from,to,gv,sv,reason,db.encode(details),actor);}
    public FileWorkDtos.Page<Map<String,Object>> list(long p,String actor,long groupId,int page,int size){var caller=guard.authorize(p,actor,false);paging(page,size);var group=guard.group(p,groupId);long total=db.count("SELECT COUNT(*) FROM file_work_sessions WHERE project_id=? AND group_id=?",p,groupId);var values=db.rows("SELECT id FROM file_work_sessions WHERE project_id=? AND group_id=? ORDER BY id DESC LIMIT ? OFFSET ?",p,groupId,size,(long)page*size);var result=values.stream().map(s->read(p,caller,group,guard.session(p,number(s,"id"),false))).toList();return new FileWorkDtos.Page<>(result,total,page,size,(int)((total+size-1)/size));}
    public List<Map<String,Object>> eligible(long p,String actor,long groupId){var caller=guard.authorize(p,actor,false);var group=guard.group(p,groupId);var runs=guard.runs(p,groupId);guard.assigned(caller,runs);return eligibleCurrent(p,caller,group,runs);}
    private List<Map<String,Object>> eligibleCurrent(long p,FileWorkGuard.Actor caller,Map<String,Object> group,List<Map<String,Object>> runs){
        var candidates=db.rows("SELECT al.id AS allocationId,al.lock_version AS allocationVersion,a.id AS assetId,a.asset_code AS assetCode,a.type,a.model,a.os_name AS osName,a.os_version AS osVersion,al.recipient_membership_id AS recipientMembershipId,al.expected_return_on AS expectedReturnOn FROM device_allocations al JOIN device_assets a ON a.id=al.asset_id WHERE al.project_id=? AND al.recipient_membership_id=? AND al.returned_at IS NULL AND a.condition_code='AVAILABLE' ORDER BY a.id,al.id",p,caller.membershipId());
        var eligible=new ArrayList<Map<String,Object>>();
        for(var allocation:candidates){try{guard.usable(p,caller,group,runs,number(allocation,"allocationId"),number(group,"defaultBuildId"),number(allocation,"assetId"));availableAsset(number(allocation,"assetId"),null);eligible.add(allocation);}catch(BusinessException e){if(!Set.of("ASSET_BUSY","ALLOCATION_INACTIVE","DEVICE_INCOMPATIBLE").contains(e.code()))throw e;}}
        return eligible;
    }
    public Map<String,Object> read(long p,FileWorkGuard.Actor caller,Map<String,Object> group,Map<String,Object> session){var value=new LinkedHashMap<>(session);value.put("groupVersion",number(group,"version"));var snapshot=parse(value.get("contextSnapshot"));value.put("contextSnapshot",snapshot);if(snapshot instanceof Map<?,?> context){if(context.get("executor") instanceof Map<?,?> executor)value.put("executorName",executor.get("displayName"));if(context.get("physicalAsset") instanceof Map<?,?> asset)value.put("assetCode",asset.get("assetCode"));}value.put("capabilities",capabilities(p,caller,group,session));return value;}
    public Map<String,Object> capabilities(long p,FileWorkGuard.Actor caller,Map<String,Object> group,Map<String,Object> session){
        var caps=new LinkedHashMap<String,Object>();for(String name:List.of("canAssign","canStart","canPause","canResume","canComplete","canCancel","canRecord"))caps.put(name,false);caps.put("canExport",true);
        boolean open=session!=null && Set.of("DOING","PAUSED").contains(session.get("state"));
        boolean groupOpen=open || !db.rows("SELECT id FROM file_work_sessions WHERE project_id=? AND group_id=? AND state IN ('DOING','PAUSED') ORDER BY id FOR UPDATE",p,number(group,"id")).isEmpty();
        caps.put("canAssign",caller.pm()&&!caller.archived()&&!"CLOSED".equals(group.get("cycleStatus"))&&!groupOpen);caps.put("canCancel",caller.pm()&&!caller.archived()&&open);
        if(!caller.tester() || caller.archived())return caps;
        try{var runs=guard.runs(p,number(group,"id"));guard.assigned(caller,runs);
            if(session!=null && open){if(number(session,"executorMembershipId")!=caller.membershipId())return caps;guard.usable(p,caller,group,runs,number(session,"allocationId"),number(session,"buildId"),number(session,"assetId"));boolean doing="DOING".equals(session.get("state"));caps.put("canPause",doing);caps.put("canRecord",doing);caps.put("canComplete",doing&&guard.completionReady(p,number(group,"id"),number(session,"buildId")));if(!doing){availableAsset(number(session,"assetId"),number(session,"id"));caps.put("canResume",true);}}
            else if(!groupOpen)caps.put("canStart",!eligibleCurrent(p,caller,group,runs).isEmpty());
        }catch(BusinessException e){/* UI hints fail closed; commands recheck and return the actionable error. */}return caps;
    }
    private Object parse(Object value){if(value==null || value instanceof Map<?,?> || value instanceof List<?>)return value;try{return json.readValue(value.toString(),Object.class);}catch(Exception e){throw new IllegalStateException("Invalid session metadata",e);}}
    private static void paging(int page,int size){if(page<0 || size<1 || size>100)fail(422,"INVALID_PAGE","Trang từ 0, kích thước từ 1 đến 100.");}
}
