package vn.syp.tms.workitem;

import java.util.*;
import vn.syp.tms.project.ProjectAudit;
import static vn.syp.tms.workitem.WorkItemStore.*;

/** Invoked within FeatureIssueService's transaction: lock, validate, mutate and notify together. */
final class TicketCommands {
    private final FeatureIssueService issues;private final WorkItemStore db;
    private final TicketResponsibilities responsibilities;private final TicketNotifications notifications;private final ProjectAudit audit;
    TicketCommands(FeatureIssueService issues,WorkItemStore db,TicketResponsibilities responsibilities,TicketNotifications notifications,ProjectAudit audit){this.issues=issues;this.db=db;this.responsibilities=responsibilities;this.notifications=notifications;this.audit=audit;}
    Map<String,Object> execute(long p,String user,long id,FeatureIssueDtos.Action input){
        FeatureIssueService.bounded(input.body(),20000,false);if(input.requestKey()==null)fail(422,"INVALID_ISSUE","Thiếu mã yêu cầu.");
        var actor=issues.authorize(p,user,true);var old=issues.item(p,id,true);issues.activeContext(p,old);
        String checksum=db.checksum(input);
        var prior=db.rows("SELECT actor_user_id AS actor,request_checksum AS checksum FROM ticket_commands WHERE project_id=? AND work_item_id=? AND request_key=?",p,id,input.requestKey().toString());
        if(!prior.isEmpty()){
            if(!user.equals(prior.getFirst().get("actor"))||!checksum.equals(prior.getFirst().get("checksum")))fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã được dùng cho nội dung hoặc người khác.");
            return issues.detail(p,actor,id);
        }
        version(old,input.expectedVersion());var rights=issues.rights(actor,old);
        String type=(String)old.get("type"),state=(String)old.get("ticketState"),reason=(String)old.get("closureReason"),verifier=(String)old.get("verifierUserId");
        Long assigned=nullableId(old.get("assigneeMembershipId")),coordinator=nullableId(old.get("coordinatorMembershipId"));
        boolean convert=Boolean.TRUE.equals(input.convertToBug()),changed=false;
        var recipients=new HashSet<String>();
        if(convert){
            if(!"QA".equals(type)||!"SPEC_CONFIRM".equals(state)||!rights.manager()&&!rights.reviewer())fail(403,"FORBIDDEN","Chỉ người xác nhận spec được giao hoặc quản lý được chuyển QA này thành Bug.");
            if(input.state()!=null&&!"NEW".equals(input.state())||input.closureReason()!=null)fail(422,"INVALID_TICKET_STATE","QA chuyển thành Bug bắt đầu ở Chưa xử lý.");
            var target=responsibilities.assignee(p,input.assigneeMembershipId(),"BUG_COORDINATOR",true);
            type="BUG";state="NEW";reason=null;assigned=input.assigneeMembershipId();coordinator=assigned;changed=true;recipients.add(target.get("userId").toString());
        } else if(input.assigneeMembershipId()!=null){
            if(!rights.manager()&&!rights.coordinator())fail(403,"FORBIDDEN","Chỉ đầu mối điều phối hoặc quản lý được phân công.");
            var target=responsibilities.assignee(p,input.assigneeMembershipId(),"QA".equals(type)?"SPEC_REVIEWER":null,true);
            if(!Objects.equals(assigned,input.assigneeMembershipId())){assigned=input.assigneeMembershipId();changed=true;recipients.add(target.get("userId").toString());}
            // A manager can repair/reassign a missing or revoked coordinator through an explicitly designated recipient.
            if("BUG".equals(type)&&rights.manager()&&responsibilities.hasDuty(p,input.assigneeMembershipId(),"BUG_COORDINATOR")&&!Objects.equals(coordinator,assigned)){coordinator=assigned;changed=true;}
        }
        if(input.verifierUserId()!=null){
            if(!rights.manager())fail(403,"FORBIDDEN","Chỉ quản lý được thay người xác nhận.");
            responsibilities.verifier(p,input.verifierUserId());
            if(!Objects.equals(verifier,input.verifierUserId())){verifier=input.verifierUserId();changed=true;if(TicketWorkflow.awaiting(state,reason))recipients.add(verifier);}
        }
        if(!convert&&(input.state()!=null||input.closureReason()!=null)){
            String next=input.state()==null?state:input.state();
            String nextReason="CLOSED".equals(next)?(input.closureReason()==null&&"CLOSED".equals(state)?reason:input.closureReason()):null;
            if(!"CLOSED".equals(next)&&input.closureReason()!=null)fail(422,"INVALID_TICKET_STATE","Chỉ trạng thái Đóng mới có lý do đóng.");
            var target=TicketWorkflow.combination(type,next,nextReason);
            if(!Objects.equals(state,next)||!Objects.equals(reason,nextReason)){
                if(!TicketWorkflow.allowed(type,state,reason,rights).contains(target))fail(403,"FORBIDDEN","Không có quyền chuyển Ticket sang bước này.");
                if(rights.manager()||Set.of("UNSUPPORTED","WONT_FIX").contains(Objects.toString(nextReason,"")))FeatureIssueService.bounded(input.body(),20000,true);
                if("NEW".equals(next)&&TicketWorkflow.awaiting(state,reason)){
                    var recipient=responsibilities.assignee(p,coordinator,"BUG_COORDINATOR",true);assigned=coordinator;recipients.add(recipient.get("userId").toString());
                }
                if(TicketWorkflow.awaiting(next,nextReason)){validateVerifier(p,verifier);recipients.add(verifier);}
                state=next;reason=nextReason;changed=true;
            }
        }
        if(!changed&&text(input.body()).isEmpty())fail(422,"NO_CHANGE","Nhập bình luận hoặc chọn một thay đổi thực sự.");
        if(convert){
            db.update("UPDATE qa_details SET item_type=NULL WHERE project_id=? AND work_item_id=?",p,id);
        }
        String status=state==null?(String)old.get("status"):TicketWorkflow.mirror(TicketWorkflow.combination(type,state,reason));
        int updated=db.update("UPDATE work_items SET item_type=?,status_code=?,assignee_membership_id=?,lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=? AND lock_version=?",type,status,assigned,actor.membership(),p,id,input.expectedVersion());
        if(updated!=1)fail(409,"VERSION_CONFLICT","Ticket đã thay đổi. Tải lại để đối chiếu; giữ bản nháp.");
        if(convert)db.update("INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,test_case_id,revision_id,standalone_reason,context_snapshot,converted_from_qa) SELECT project_id,work_item_id,'INTERNAL_V1',COALESCE(JSON_UNQUOTE(JSON_EXTRACT(context_snapshot,'$.steps')),''),COALESCE(JSON_UNQUOTE(JSON_EXTRACT(context_snapshot,'$.expectedResult')),''),COALESCE(JSON_UNQUOTE(JSON_EXTRACT(context_snapshot,'$.actualResult')),''),test_case_id,revision_id,'Issue phát hiện trong Feature',context_snapshot,TRUE FROM qa_details WHERE project_id=? AND work_item_id=?",p,id);
        db.update("UPDATE work_item_feature_context SET ticket_state=?,closure_reason=?,coordinator_membership_id=?,verifier_user_id=? WHERE project_id=? AND work_item_id=?",state,reason,coordinator,verifier,p,id);
        var result=issues.detail(p,actor,id);var after=issues.snapshot(result);if(!text(input.body()).isEmpty())after.put("body",text(input.body()));
        String event=convert?"CONVERT_TO_BUG":changed?"TICKET_ACTION":"COMMENT";
        long history=issues.record(p,id,user,event,issues.snapshot(old),after);
        db.update("INSERT INTO ticket_commands(project_id,work_item_id,request_key,actor_user_id,request_checksum,history_id,created_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,input.requestKey().toString(),user,checksum,history);
        notifications.notify(p,id,user,recipients,TicketWorkflow.awaiting(state,reason)?"Ticket đang chờ bạn xác nhận lại.":"Bạn được phân công xử lý Ticket.");
        audit.record(p,user,"WORK_ITEM",id,event);return result;
    }
    private void validateVerifier(long p,String user){
        if(user!=null&&db.count("SELECT COUNT(*) FROM identity_users WHERE id=? AND role_code='ADMIN' AND enabled=TRUE",user)==1)return;
        responsibilities.verifier(p,user);
    }
    private static Long nullableId(Object value){return value instanceof Number n?n.longValue():null;}
}
