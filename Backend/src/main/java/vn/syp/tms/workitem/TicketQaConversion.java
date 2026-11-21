package vn.syp.tms.workitem;

import java.util.*;
import vn.syp.tms.project.ProjectAudit;
import static vn.syp.tms.workitem.WorkItemStore.*;

/** Called only after locking the project/QA and checking conversion rights in TicketCommands. */
final class TicketQaConversion {
    private final FeatureIssueService issues;
    private final WorkItemStore db;
    private final TicketResponsibilities responsibilities;
    private final TicketNotifications notifications;
    private final ProjectAudit audit;

    TicketQaConversion(FeatureIssueService issues,WorkItemStore db,TicketResponsibilities responsibilities,TicketNotifications notifications,ProjectAudit audit){
        this.issues=issues;this.db=db;this.responsibilities=responsibilities;this.notifications=notifications;this.audit=audit;
    }

    Map<String,Object> execute(long p,String user,long qaId,FeatureIssueService.Actor actor,Map<String,Object> old,FeatureIssueDtos.Action input,String checksum,String recipient){
        if(input.verifierUserId()!=null){
            if(!actor.manager())fail(403,"FORBIDDEN","Chỉ quản lý được thay người xác nhận.");
            responsibilities.verifier(p,input.verifierUserId());
        }
        if(input.planning!=null&&!actor.manager()&&!user.equals(old.get("createdByUserId")))
            fail(403,"FORBIDDEN","Chỉ quản lý hoặc người tạo được sửa kế hoạch Ticket.");

        db.update("INSERT INTO project_counters(project_id,counter_code,next_value) VALUES(?,'WORK_ITEM',1) ON DUPLICATE KEY UPDATE next_value=next_value",p);
        long next=db.count("SELECT next_value FROM project_counters WHERE project_id=? AND counter_code='WORK_ITEM' FOR UPDATE",p);
        String key=db.row("SELECT code FROM projects WHERE id=?",p).get("code")+"-"+next;
        // Retain the original reporter/content; conversion author and time are recorded in both histories.
        long bugId=db.insert("""
            INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,status_code,priority_code,
                category_id,milestone_id,assignee_membership_id,created_by,updated_by,created_at,updated_at,request_key,request_checksum)
            SELECT project_id,?,?,'BUG',title,description,'open',priority_code,category_id,milestone_id,?,created_by,?,
                UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,? FROM work_items WHERE project_id=? AND id=?
            """,next,key,input.assigneeMembershipId(),actor.membership(),"qa-copy:"+UUID.randomUUID(),checksum,p,qaId);
        db.update("UPDATE project_counters SET next_value=next_value+1 WHERE project_id=? AND counter_code='WORK_ITEM'",p);
        db.update("""
            INSERT INTO work_item_feature_context(project_id,work_item_id,feature_id,document_id,row_id,monkey,created_by_user_id,
                ticket_state,coordinator_membership_id,verifier_user_id,preconditions,frequency,environment,device,
                test_version_id,test_version_name,executed_on,test_object,case_reference,start_on,due_on,estimated_hours,actual_hours)
            SELECT project_id,?,feature_id,document_id,row_id,FALSE,created_by_user_id,'NEW',?,COALESCE(?,verifier_user_id),
                preconditions,frequency,environment,device,test_version_id,test_version_name,executed_on,test_object,case_reference,
                start_on,due_on,estimated_hours,actual_hours
            FROM work_item_feature_context WHERE project_id=? AND work_item_id=?
            """,bugId,input.assigneeMembershipId(),input.verifierUserId(),p,qaId);
        db.update("""
            INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,
                test_case_id,revision_id,standalone_reason,context_snapshot,converted_from_qa)
            SELECT project_id,?,'INTERNAL_V1',COALESCE(JSON_UNQUOTE(JSON_EXTRACT(context_snapshot,'$.steps')),''),
                COALESCE(JSON_UNQUOTE(JSON_EXTRACT(context_snapshot,'$.expectedResult')),''),
                COALESCE(JSON_UNQUOTE(JSON_EXTRACT(context_snapshot,'$.actualResult')),''),test_case_id,revision_id,
                'Ticket phát hiện trong Đợt kiểm thử',context_snapshot,TRUE
            FROM qa_details WHERE project_id=? AND work_item_id=?
            """,bugId,p,qaId);
        db.update("INSERT INTO ticket_milestones(project_id,work_item_id,milestone_id) SELECT project_id,?,milestone_id FROM ticket_milestones WHERE project_id=? AND work_item_id=?",bugId,p,qaId);
        if(input.planning!=null)TicketPlanning.apply(db,p,bugId,old,input.planning);
        db.update("INSERT INTO ticket_qa_bug_links(project_id,qa_id,bug_id,created_by_user_id,created_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6))",p,qaId,bugId,user);

        int changed=db.update("UPDATE work_items SET status_code='closed',lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=? AND lock_version=?",actor.membership(),p,qaId,input.expectedVersion());
        if(changed!=1)fail(409,"VERSION_CONFLICT","Ticket đã thay đổi. Tải lại để đối chiếu; giữ bản nháp.");
        db.update("UPDATE work_item_feature_context SET ticket_state='CLOSED',closure_reason='CONVERTED_TO_BUG' WHERE project_id=? AND work_item_id=?",p,qaId);
        var closed=issues.detail(p,actor,qaId);
        var after=issues.snapshot(closed);after.put("convertedBugId",bugId);after.put("convertedBugKey",key);
        if(!text(input.body()).isEmpty()||input.attachmentCount>0)after.put("body",text(input.body()));
        long history=issues.record(p,qaId,user,"CONVERT_TO_BUG",issues.snapshot(old),after);
        var result=issues.detail(p,actor,bugId);var created=issues.snapshot(result);
        created.put("sourceQaId",qaId);created.put("sourceQaKey",old.get("key"));
        issues.record(p,bugId,user,"CREATE_FROM_QA",null,created);
        db.update("INSERT INTO ticket_commands(project_id,work_item_id,request_key,actor_user_id,request_checksum,history_id,result_work_item_id,created_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,qaId,input.requestKey().toString(),user,checksum,history,bugId);
        notifications.notify(p,bugId,user,List.of(recipient),"Bạn được phân công xử lý Bug tạo từ QA "+old.get("key")+".");
        audit.record(p,user,"WORK_ITEM",qaId,"CONVERT_TO_BUG");audit.record(p,user,"WORK_ITEM",bugId,"CREATE_FROM_QA");
        return result;
    }
}
