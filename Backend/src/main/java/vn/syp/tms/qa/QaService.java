package vn.syp.tms.qa;

import static vn.syp.tms.workitem.WorkItemStore.*;
import static vn.syp.tms.qa.QaDtos.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.filework.FileWorkGuard;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

/** QA owns its typed commands; work_items remains the sole status/assignment/version authority. */
@Service
@Transactional
public class QaService {
    private final WorkItemStore db;
    private final FileWorkGuard identity;
    private final ProjectAudit audit;
    private final ObjectMapper json;
    public QaService(WorkItemStore db, FileWorkGuard identity, ProjectAudit audit, ObjectMapper json) {
        this.db=db;this.identity=identity;this.audit=audit;this.json=json;
    }
    public record Actor(long membershipId, boolean pm, boolean tester, boolean dev, boolean archived) {}
    public record Writer(Actor actor, Map<String,Object> item) {}
    private record Context(Long documentId,Long groupId,Long runItemId,Long testCaseId,Long revisionId,Map<String,Object> snapshot) {}
    private record Intent(Long version,String key,String reason,String body,String basis,Long assignee,
                          Long answerId,Long answerVersion,boolean exception) {}
    private static final Set<String> ACTIVE=Set.of("open","progress","clarify","resolved","recheck");
    private static final Map<String,String> LABELS=Map.of("open","Câu hỏi mới","progress","Dev đang xác minh",
        "clarify","Cần bổ sung thông tin","resolved","Đã trả lời","recheck","Tester đã xác nhận","closed","PM kết thúc");
    private static final String ITEM_SELECT="""
        SELECT w.id,w.project_id AS projectId,w.item_no AS itemNo,w.item_key AS `key`,w.item_type AS type,
        w.title,w.status_code AS status,w.priority_code AS priority,w.category_id AS categoryId,
        w.milestone_id AS milestoneId,w.assignee_membership_id AS assigneeMembershipId,
        w.created_by AS createdBy,
        w.created_at AS createdAt,w.updated_at AS updatedAt,w.lock_version AS version,
        q.question,q.document_id AS documentId,q.group_id AS groupId,q.run_item_id AS runItemId,
        q.test_case_id AS testCaseId,q.revision_id AS revisionId,q.context_snapshot AS contextSnapshot,
        q.generation,q.current_answer_id AS currentAnswerId,q.current_confirmation_id AS currentConfirmationId
        FROM work_items w LEFT JOIN qa_details q ON q.project_id=w.project_id AND q.work_item_id=w.id
        """;
    // Kept separate from ITEM_SELECT: another actor may hold identity SHARE while waiting for this project.
    // Only work_items/qa_details receive exclusive item locks; all joined display/history reads are shared.
    private static final String ITEM_PROJECTION_SELECT="""
        SELECT w.id,au.display_name AS assigneeName,cu.display_name AS creatorName,
        a.answer_version AS currentAnswerVersion,cf.answer_id AS confirmedAnswerId,cf.generation AS confirmationGeneration
        FROM work_items w JOIN qa_details q ON q.project_id=w.project_id AND q.work_item_id=w.id
        JOIN project_memberships cm ON cm.project_id=w.project_id AND cm.id=w.created_by
        JOIN identity_users cu ON cu.id=cm.user_id
        LEFT JOIN project_memberships am ON am.project_id=w.project_id AND am.id=w.assignee_membership_id
        LEFT JOIN identity_users au ON au.id=am.user_id
        LEFT JOIN qa_answers a ON a.project_id=q.project_id AND a.work_item_id=q.work_item_id AND a.generation=q.generation AND a.id=q.current_answer_id
        LEFT JOIN qa_confirmations cf ON cf.project_id=q.project_id AND cf.work_item_id=q.work_item_id AND cf.generation=q.generation AND cf.answer_id=q.current_answer_id AND cf.id=q.current_confirmation_id
        """;
    private static final String ANSWER_SELECT="""
        SELECT a.id,a.work_item_id AS workItemId,a.generation,a.answer_version AS answerVersion,a.body,
        a.basis_reference AS basisReference,a.author_membership_id AS authorMembershipId,u.display_name AS authorName,a.answered_at AS answeredAt
        FROM qa_answers a JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.author_membership_id
        JOIN identity_users u ON u.id=m.user_id
        """;
    private static final String CONFIRM_SELECT="""
        SELECT c.id,c.work_item_id AS workItemId,c.generation,c.answer_id AS answerId,a.answer_version AS answerVersion,
        c.body,c.confirmed_by AS confirmedBy,u.display_name AS confirmerName,c.confirmed_at AS confirmedAt
        FROM qa_confirmations c JOIN qa_answers a ON a.project_id=c.project_id AND a.work_item_id=c.work_item_id AND a.generation=c.generation AND a.id=c.answer_id
        JOIN project_memberships m ON m.project_id=c.project_id AND m.id=c.confirmed_by JOIN identity_users u ON u.id=m.user_id
        """;

    /** Call first in a read/write transaction, before project/item/source reads (including replay). */
    public Actor authorize(long p,String user,boolean write) {
        positive(p);
        var account=identity.lockIdentity(user);
        var project=db.row("SELECT id,code,archived_at AS archivedAt FROM projects WHERE id=? FOR UPDATE",p);
        // Membership ID 0 is a read-only observer, never a persisted/assignable member.
        if(!write && "ADMIN".equals(account.getRole()) && db.rows(
            "SELECT id FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE FOR UPDATE",p,user).isEmpty())
            return new Actor(0,false,false,false,project.get("archivedAt")!=null);
        var member=db.row("SELECT id,project_role AS projectRole FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE FOR UPDATE",p,user);
        boolean globalDev="DEV".equals(account.getRole());
        var actor=new Actor(number(member,"id"),!globalDev&&"PM".equals(member.get("projectRole")),
            !globalDev&&"TESTER".equals(member.get("projectRole")),globalDev&&"DEV".equals(member.get("projectRole")),project.get("archivedAt")!=null);
        if(write&&actor.archived())fail(409,"ARCHIVED","Dự án đã lưu trữ.");
        return actor;
    }
    /** Shared INTERNAL comment/evidence writer policy for 6B. No WorkItemService dependency. */
    public Writer authorizeWriter(long p,String user,long id) {
        var actor=authorize(p,user,true);var item=lockedItem(p,id);
        if(!writer(actor,item))fail(403,"FORBIDDEN","Chỉ PM, Tester tạo QA hoặc Dev được giao được ghi QA.");
        if(!ACTIVE.contains(item.get("status")))fail(409,"INVALID_QA_STATE","QA đã kết thúc.");
        currentContext(p,item,false);
        return new Writer(actor,Collections.unmodifiableMap(item));
    }
    /** Generic mutation routes must call this before their state machine, including every batch item. */
    public static void rejectGenericMutation(String type) {
        if("QA".equals(type))fail(409,"QA_COMMAND_REQUIRED","Dùng lệnh chuyên biệt tại /qa cho công việc QA.");
    }
    public static String statusLabel(String status) {return LABELS.get(status);}
    public static Capabilities capabilities(Actor actor,Map<String,Object> item,boolean contextUsable) {
        boolean active=!actor.archived()&&ACTIVE.contains(item.get("status")),usable=active&&contextUsable;
        boolean assigned=actor.dev()&&Objects.equals(item.get("assigneeMembershipId"),actor.membershipId());
        boolean creator=Objects.equals(item.get("createdBy"),actor.membershipId());
        String state=String.valueOf(item.get("status"));
        return new Capabilities(usable&&actor.pm(),usable&&assigned&&Set.of("open","clarify").contains(state),
            usable&&assigned&&Set.of("open","progress").contains(state),
            usable&&creator&&(actor.pm()||actor.tester())&&state.equals("clarify"),usable&&assigned,
            usable&&creator&&actor.tester()&&state.equals("resolved")&&item.get("currentAnswerId")!=null,
            active&&actor.pm()&&state.equals("recheck")&&confirmed(item),active&&actor.pm(),
            !actor.archived()&&actor.pm()&&state.equals("closed"),usable&&writer(actor,item),usable&&writer(actor,item));
    }
    private static boolean writer(Actor a,Map<String,Object> item) {
        return a.pm() || a.tester()&&Objects.equals(item.get("createdBy"),a.membershipId())
            || a.dev()&&Objects.equals(item.get("assigneeMembershipId"),a.membershipId());
    }
    private static boolean confirmed(Map<String,Object> item) {
        return item.get("currentAnswerId")!=null&&item.get("currentConfirmationId")!=null
            &&Objects.equals(item.get("currentAnswerId"),item.get("confirmedAnswerId"))
            &&Objects.equals(item.get("generation"),item.get("confirmationGeneration"));
    }

    public QaDetail create(long p,String user,Create input) {
        var actor=authorize(p,user,true);
        if(!actor.pm()&&!actor.tester())fail(403,"FORBIDDEN","Chỉ TESTER hoặc PM tạo QA.");
        key(input.requestKey());bounded(input.title(),300,"INVALID_QUESTION",true);bounded(input.question(),20000,"INVALID_QUESTION",true);
        String priority=input.priority()==null?"MEDIUM":input.priority();
        if(!Set.of("HIGH","MEDIUM","LOW").contains(priority))fail(422,"INVALID_QUESTION","Mức ưu tiên không hợp lệ.");
        optionalId(input.categoryId());optionalId(input.milestoneId());
        if(input.categoryId()!=null)db.row("SELECT id FROM categories WHERE project_id=? AND id=? AND active=TRUE FOR SHARE",p,input.categoryId());
        if(input.milestoneId()!=null)db.row("SELECT id FROM milestones WHERE project_id=? AND id=? AND archived_at IS NULL FOR SHARE",p,input.milestoneId());
        var context=context(p,input.documentId(),input.groupId(),input.runItemId(),input.revisionId(),false);
        String checksum=db.checksum(List.of("QA","CREATE",p,input));
        var replay=replay(p,actor,"CREATE",null,input.requestKey(),checksum);
        if(replay!=null)return replay;
        if(!db.rows("SELECT id FROM work_items WHERE project_id=? AND request_key=? FOR UPDATE",p,input.requestKey()).isEmpty())
            fail(409,"IDEMPOTENCY_CONFLICT","Request key đã được dùng.");
        db.update("INSERT INTO project_counters(project_id,counter_code,next_value) VALUES(?,'WORK_ITEM',1) ON DUPLICATE KEY UPDATE next_value=next_value",p);
        long next=db.count("SELECT next_value FROM project_counters WHERE project_id=? AND counter_code='WORK_ITEM' FOR UPDATE",p);
        String itemKey=db.row("SELECT code FROM projects WHERE id=? FOR SHARE",p).get("code")+"-"+next;
        long id=db.insert("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,priority_code,category_id,milestone_id,assignee_membership_id,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,?,?,'QA',?,?,?,?,?,NULL,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,?)",
            p,next,itemKey,text(input.title()),text(input.question()),priority,input.categoryId(),input.milestoneId(),actor.membershipId(),actor.membershipId(),input.requestKey(),checksum);
        db.update("UPDATE project_counters SET next_value=next_value+1 WHERE project_id=? AND counter_code='WORK_ITEM'",p);
        db.update("INSERT INTO qa_details(project_id,work_item_id,question,document_id,group_id,run_item_id,test_case_id,revision_id,context_snapshot) VALUES(?,?,?,?,?,?,?,?,?)",
            p,id,text(input.question()),context.documentId(),context.groupId(),context.runItemId(),context.testCaseId(),context.revisionId(),db.encode(context.snapshot()));
        history(p,id,actor,"CREATE",null,"open","",Map.of("version",0,"generation",0,"context",context.snapshot()));
        audit.record(p,user,"QA",id,"CREATE");
        var result=readDetail(p,actor,lockedItem(p,id),true);
        saveCommand(p,id,actor,"CREATE",input.requestKey(),checksum,result);
        return result;
    }
    public QaDetail assign(long p,String user,long id,Assign input) {
        return mutate(p,user,id,"ASSIGN",input,new Intent(input.expectedVersion(),input.requestKey(),input.reason(),null,null,input.assigneeMembershipId(),null,null,false));
    }
    public QaDetail start(long p,String user,long id,Command input) {return command(p,user,id,"START",input);}
    public QaDetail requestInfo(long p,String user,long id,Command input) {return command(p,user,id,"REQUEST_INFO",input);}
    public QaDetail reopen(long p,String user,long id,Command input) {return command(p,user,id,"REOPEN",input);}
    private QaDetail command(long p,String user,long id,String action,Command input) {
        return mutate(p,user,id,action,input,new Intent(input.expectedVersion(),input.requestKey(),input.reason(),null,null,null,null,null,false));
    }
    public QaDetail provideInfo(long p,String user,long id,ProvideInfo input) {
        return mutate(p,user,id,"PROVIDE_INFO",input,new Intent(input.expectedVersion(),input.requestKey(),null,input.body(),null,null,null,null,false));
    }
    public QaDetail answer(long p,String user,long id,Answer input) {
        return mutate(p,user,id,"ANSWER",input,new Intent(input.expectedVersion(),input.requestKey(),null,input.body(),input.basisReference(),null,null,null,false));
    }
    public QaDetail confirm(long p,String user,long id,Confirm input) {
        return mutate(p,user,id,"CONFIRM",input,new Intent(input.expectedVersion(),input.requestKey(),null,input.body(),null,null,input.answerId(),input.answerVersion(),false));
    }
    public QaDetail close(long p,String user,long id,Close input) {
        return mutate(p,user,id,"CLOSE",input,new Intent(input.expectedVersion(),input.requestKey(),input.reason(),null,null,null,null,null,input.exception()));
    }
    private QaDetail mutate(long p,String user,long id,String action,Object typed,Intent input) {
        var actor=authorize(p,user,true);var item=lockedItem(p,id);
        authorizeAction(actor,item,action);
        validate(action,input);
        currentContext(p,item,Set.of("CLOSE","REOPEN").contains(action));
        if(action.equals("ASSIGN"))eligibleDev(p,input.assignee());
        String checksum=db.checksum(List.of("QA",action,p,id,typed));
        var replay=replay(p,actor,action,id,input.key(),checksum);
        if(replay!=null)return replay;
        version(item,input.version());
        String from=(String)item.get("status"),to=from;
        long generation=number(item,"generation");Long assignee=nullable(item,"assigneeMembershipId"),answer=nullable(item,"currentAnswerId"),confirmation=nullable(item,"currentConfirmationId");
        var details=new LinkedHashMap<String,Object>();
        if(action.equals("REOPEN"))requireState(from,Set.of("closed"));
        else requireState(from,ACTIVE);
        switch(action) {
            case "ASSIGN" -> {
                details.put("previousAssigneeMembershipId",assignee);details.put("assigneeMembershipId",input.assignee());
                if(!Objects.equals(assignee,input.assignee())){generation++;answer=null;confirmation=null;to="open";}
                details.put("sameAssignee",Objects.equals(assignee,input.assignee()));assignee=input.assignee();
            }
            case "START" -> {requireState(from,Set.of("open","clarify"));to="progress";}
            case "REQUEST_INFO" -> {requireState(from,Set.of("open","progress"));to="clarify";}
            case "PROVIDE_INFO" -> {
                requireState(from,Set.of("clarify"));to="progress";details.put("body",text(input.body()));
                // Separate key namespace avoids collision with ordinary comments on this work item.
                db.insert("INSERT INTO work_item_comments(project_id,work_item_id,body,visibility,author_membership_id,created_at,request_key) VALUES(?,?,?,'INTERNAL',?,UTC_TIMESTAMP(6),?)",p,id,text(input.body()),actor.membershipId(),commentKey(input.key()));
            }
            case "ANSWER" -> {
                long next=db.count("SELECT COALESCE(MAX(answer_version),0) FROM qa_answers WHERE project_id=? AND work_item_id=?",p,id)+1;
                answer=db.insert("INSERT INTO qa_answers(project_id,work_item_id,generation,answer_version,body,basis_reference,author_membership_id,answered_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,generation,next,text(input.body()),text(input.basis()),actor.membershipId());
                confirmation=null;to="resolved";details.put("answerId",answer);details.put("answerVersion",next);
            }
            case "CONFIRM" -> {
                requireState(from,Set.of("resolved"));
                if(answer==null||!Objects.equals(answer,input.answerId())||!Objects.equals(nullable(item,"currentAnswerVersion"),input.answerVersion()))
                    fail(409,"ANSWER_VERSION_CONFLICT","Câu trả lời hiện hành đã thay đổi.");
                // Composite FK repeats the exact QA/generation/answer pin as a database boundary.
                confirmation=db.insert("INSERT INTO qa_confirmations(project_id,work_item_id,generation,answer_id,body,confirmed_by,confirmed_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,generation,answer,text(input.body()),actor.membershipId());
                to="recheck";details.put("answerId",answer);details.put("answerVersion",input.answerVersion());details.put("confirmationId",confirmation);
            }
            case "CLOSE" -> {
                if(!input.exception()&&(!from.equals("recheck")||!confirmed(item)))fail(409,"QA_CONFIRMATION_REQUIRED","Cần xác nhận câu trả lời hiện hành hoặc kết thúc ngoại lệ có lý do.");
                to="closed";details.put("exception",input.exception());details.put("answerId",answer);details.put("confirmationId",confirmation);
            }
            case "REOPEN" -> {to="open";generation++;answer=null;confirmation=null;}
            default -> throw new IllegalArgumentException("Unsupported QA command");
        }
        if(db.update("UPDATE work_items SET status_code=?,assignee_membership_id=?,lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=? AND lock_version=?",to,assignee,actor.membershipId(),p,id,input.version())!=1)
            fail(409,"VERSION_CONFLICT","Dữ liệu đã thay đổi.");
        db.update("UPDATE qa_details SET generation=?,current_answer_id=?,current_confirmation_id=? WHERE project_id=? AND work_item_id=?",generation,answer,confirmation,p,id);
        details.put("generation",generation);details.put("version",input.version()+1);
        history(p,id,actor,action,from,to,input.reason(),details);audit.record(p,user,"QA",id,action);
        var result=readDetail(p,actor,lockedItem(p,id),!Set.of("CLOSE","REOPEN").contains(action)||contextUsable(p,item));
        saveCommand(p,id,actor,action,input.key(),checksum,result);
        return result;
    }
    private void authorizeAction(Actor actor,Map<String,Object> item,String action) {
        if(Set.of("ASSIGN","CLOSE","REOPEN").contains(action)) {
            if(!actor.pm())fail(403,"FORBIDDEN","Chỉ PM hiện hành của dự án được thực hiện lệnh này.");
        } else if(Set.of("START","REQUEST_INFO","ANSWER").contains(action)) {
            if(!actor.dev())fail(403,"FORBIDDEN","Cần tài khoản DEV và vai trò DEV của dự án.");
            if(!Objects.equals(item.get("assigneeMembershipId"),actor.membershipId()))fail(403,"NOT_ASSIGNED","QA chưa được giao cho bạn.");
        } else {
            if(!actor.tester()&&!(action.equals("PROVIDE_INFO")&&actor.pm()))fail(403,"FORBIDDEN","Cần vai trò người tạo QA hợp lệ.");
            if(number(item,"createdBy")!=actor.membershipId())fail(403,"NOT_QA_CREATOR","Chỉ người tạo QA được thực hiện lệnh này.");
        }
    }
    private void eligibleDev(long p,Long id) {
        positive(id);
        var candidates=db.rows("SELECT m.id FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.id=? AND m.active=TRUE AND m.project_role='DEV' AND u.enabled=TRUE AND u.role_code='DEV' FOR SHARE",p,id);
        if(candidates.isEmpty())fail(422,"INVALID_ASSIGNEE","Người nhận phải là DEV đang hoạt động trong dự án.");
    }
    private void validate(String action,Intent in) {
        key(in.key());if(in.version()==null||in.version()<0)fail(422,"VERSION_CONFLICT","Version phải không âm.");
        if(Set.of("ASSIGN","START","REQUEST_INFO","CLOSE","REOPEN").contains(action))bounded(in.reason(),1000,"REASON_REQUIRED",true);
        if(action.equals("ASSIGN"))positive(in.assignee());
        if(action.equals("ANSWER")){bounded(in.body(),20000,"INVALID_ANSWER",true);bounded(in.basis(),1000,"INVALID_ANSWER",false);}
        if(action.equals("CONFIRM")){positive(in.answerId());positive(in.answerVersion());bounded(in.body(),20000,"INVALID_CONFIRMATION",true);}
        if(action.equals("PROVIDE_INFO"))bounded(in.body(),20000,"INVALID_QUESTION",true);
    }

    private Context context(long p,Long document,Long group,Long run,Long revision,boolean allowArchived) {
        optionalId(document);optionalId(group);optionalId(run);optionalId(revision);
        var snapshot=new LinkedHashMap<String,Object>();Long testCase=null;
        if(group!=null) {
            var g=db.row("SELECT id,document_id AS documentId,cycle_id AS cycleId,configuration_id AS configurationId FROM file_work_groups WHERE project_id=? AND id=? FOR SHARE",p,group);
            long groupDocument=number(g,"documentId");
            if(document!=null&&document!=groupDocument)invalidContext();document=groupDocument;snapshot.put("group",g);
        }
        if(run!=null) {
            var r=db.row("SELECT id,test_case_id AS testCaseId,revision_id AS revisionId,cycle_id AS cycleId,configuration_id AS configurationId FROM run_items WHERE project_id=? AND id=? FOR SHARE",p,run);
            long pin=number(r,"revisionId");if(revision!=null&&revision!=pin)invalidContext();revision=pin;testCase=number(r,"testCaseId");snapshot.put("run",r);
            if(group!=null)db.row("SELECT run_item_id AS id FROM file_work_group_items WHERE project_id=? AND group_id=? AND run_item_id=? AND revision_id=? AND test_case_id=? FOR SHARE",p,group,run,revision,testCase);
        }
        if(revision!=null) {
            var r=db.row("SELECT rv.id AS revisionId,rv.test_case_id AS testCaseId,rv.revision_no AS revisionNo,c.case_no AS caseNo,rv.title_vi AS title,rv.preconditions_vi AS preconditions,rv.steps_vi AS steps,rv.expected_vi AS expected,c.archived_at AS archivedAt,s.archived_at AS suiteArchivedAt FROM test_case_revisions rv JOIN test_cases c ON c.project_id=rv.project_id AND c.id=rv.test_case_id JOIN test_suites s ON s.project_id=c.project_id AND s.id=c.suite_id WHERE rv.project_id=? AND rv.id=? FOR SHARE",p,revision);
            if(testCase!=null&&testCase!=number(r,"testCaseId"))invalidContext();testCase=number(r,"testCaseId");
            if(!allowArchived&&(r.get("archivedAt")!=null||r.get("suiteArchivedAt")!=null))fail(409,"ARCHIVED","Test case hoặc suite nguồn đã lưu trữ.");
            var pin=new LinkedHashMap<>(r);pin.remove("archivedAt");pin.remove("suiteArchivedAt");snapshot.put("revision",pin);
        }
        if(document!=null) {
            var d=db.row("SELECT id,file_name AS fileName,status FROM import_batches WHERE project_id=? AND id=? FOR SHARE",p,document);
            if(!"COMMITTED".equals(d.get("status")))fail(422,"INVALID_QA_CONTEXT","Tài liệu nguồn phải COMMITTED.");
            snapshot.put("document",Map.of("id",document,"fileName",d.get("fileName")));
            if(testCase!=null)db.row("SELECT id FROM import_rows WHERE project_id=? AND batch_id=? AND target_case_id=? FOR SHARE",p,document,testCase);
        }
        snapshot.put("documentId",document);snapshot.put("groupId",group);snapshot.put("runItemId",run);snapshot.put("testCaseId",testCase);snapshot.put("revisionId",revision);
        return new Context(document,group,run,testCase,revision,snapshot);
    }
    private void currentContext(long p,Map<String,Object> item,boolean allowArchived) {
        var current=context(p,nullable(item,"documentId"),nullable(item,"groupId"),nullable(item,"runItemId"),nullable(item,"revisionId"),allowArchived);
        if(!Objects.equals(current.testCaseId(),nullable(item,"testCaseId")))invalidContext();
    }
    private boolean contextUsable(long p,Map<String,Object> item) {
        try{currentContext(p,item,false);return true;}catch(BusinessException e){if(Set.of("ARCHIVED","NOT_FOUND","INVALID_QA_CONTEXT").contains(e.code()))return false;throw e;}
    }
    private static void invalidContext(){fail(422,"INVALID_QA_CONTEXT","Các nguồn QA phải thuộc cùng dự án và khớp với nhau.");}
    private Map<String,Object> lockedItem(long p,long id) {
        positive(id);var row=db.row(ITEM_SELECT+" WHERE w.project_id=? AND w.id=? FOR UPDATE",p,id);
        if(!"QA".equals(row.get("type")))fail(422,"WRONG_ITEM_TYPE","Công việc không phải QA.");
        if(row.get("generation")==null)fail(404,"NOT_FOUND","Không tìm thấy nội dung QA.");
        projectItems(p,List.of(row));
        return row;
    }
    /** Caller already owns exclusive item locks. Batch the compatible current display/pointer projection. */
    private void projectItems(long p,List<Map<String,Object>> items) {
        if(items.isEmpty())return;
        String marks=String.join(",",Collections.nCopies(items.size(),"?"));
        var args=new ArrayList<Object>();args.add(p);items.forEach(item->args.add(number(item,"id")));
        var projections=db.rows(ITEM_PROJECTION_SELECT+" WHERE w.project_id=? AND w.id IN ("+marks+") ORDER BY w.id FOR SHARE",args.toArray());
        var byId=new HashMap<Long,Map<String,Object>>();projections.forEach(row->byId.put(number(row,"id"),row));
        for(var item:items) {
            var projection=byId.get(number(item,"id"));
            if(projection==null)throw new BusinessException(404,"NOT_FOUND","Không tìm thấy nội dung QA.");
            for(String field:List.of("assigneeName","creatorName","currentAnswerVersion","confirmedAnswerId","confirmationGeneration"))
                item.put(field,projection.get(field));
        }
    }
    public QaDetail detail(long p,String user,long id) {
        var actor=authorize(p,user,false);var item=lockedItem(p,id);return readDetail(p,actor,item,contextUsable(p,item));
    }
    public Page<QaSummary> list(long p,String user,Filter filter) {
        var actor=authorize(p,user,false);page(filter.page(),filter.size());
        String status=text(filter.status()),keyword=text(filter.keyword());
        if(!status.isEmpty()&&!LABELS.containsKey(status))fail(422,"INVALID_QA_STATE","Trạng thái QA không hợp lệ.");
        bounded(keyword,255,"INVALID_QUESTION",false);
        String where=" WHERE w.project_id=? AND w.item_type='QA'";var args=new ArrayList<Object>();args.add(p);
        if(!status.isEmpty()){where+=" AND w.status_code=?";args.add(status);}
        if(!keyword.isEmpty()){where+=" AND (LOCATE(?,w.title)>0 OR LOCATE(?,w.item_key)>0 OR LOCATE(?,q.question)>0)";args.add(keyword);args.add(keyword);args.add(keyword);}
        if(filter.mine()) {
            if(actor.dev()){where+=" AND w.assignee_membership_id=?";args.add(actor.membershipId());}
            else if(actor.pm()){where+=" AND (w.created_by=? OR w.assignee_membership_id=?)";args.add(actor.membershipId());args.add(actor.membershipId());}
            else {where+=" AND w.created_by=?";args.add(actor.membershipId());}
        }
        long total=db.count("SELECT COUNT(*) FROM work_items w JOIN qa_details q ON q.project_id=w.project_id AND q.work_item_id=w.id"+where,args.toArray());
        args.add(filter.size());args.add((long)filter.page()*filter.size());
        var rows=db.rows(ITEM_SELECT+where+" ORDER BY w.updated_at DESC,w.id DESC LIMIT ? OFFSET ? FOR UPDATE",args.toArray());
        projectItems(p,rows);
        var items=rows.stream().map(r->summary(actor,r,contextUsable(p,r))).toList();
        return new Page<>(items,total,filter.page(),filter.size(),pages(total,filter.size()));
    }
    public Page<QaAnswer> answers(long p,String user,long id,int page,int size) {
        authorize(p,user,false);lockedItem(p,id);page(page,size);
        long total=db.count("SELECT COUNT(*) FROM qa_answers WHERE project_id=? AND work_item_id=?",p,id);
        var rows=db.rows(ANSWER_SELECT+" WHERE a.project_id=? AND a.work_item_id=? ORDER BY a.answer_version DESC LIMIT ? OFFSET ? FOR SHARE",p,id,size,(long)page*size);
        return new Page<>(rows.stream().map(r->json.convertValue(r,QaAnswer.class)).toList(),total,page,size,pages(total,size));
    }
    public Page<QaConfirmation> confirmations(long p,String user,long id,int page,int size) {
        authorize(p,user,false);lockedItem(p,id);page(page,size);
        long total=db.count("SELECT COUNT(*) FROM qa_confirmations WHERE project_id=? AND work_item_id=?",p,id);
        var rows=db.rows(CONFIRM_SELECT+" WHERE c.project_id=? AND c.work_item_id=? ORDER BY c.id DESC LIMIT ? OFFSET ? FOR SHARE",p,id,size,(long)page*size);
        return new Page<>(rows.stream().map(r->json.convertValue(r,QaConfirmation.class)).toList(),total,page,size,pages(total,size));
    }
    private QaDetail readDetail(long p,Actor actor,Map<String,Object> item,boolean usable) {
        long id=number(item,"id");QaAnswer answer=null;QaConfirmation confirmation=null;
        if(item.get("currentAnswerId")!=null)answer=json.convertValue(db.row(ANSWER_SELECT+" WHERE a.project_id=? AND a.work_item_id=? AND a.generation=? AND a.id=? FOR SHARE",p,id,number(item,"generation"),item.get("currentAnswerId")),QaAnswer.class);
        if(item.get("currentConfirmationId")!=null)confirmation=json.convertValue(db.row(CONFIRM_SELECT+" WHERE c.project_id=? AND c.work_item_id=? AND c.generation=? AND c.answer_id=? AND c.id=? FOR SHARE",p,id,number(item,"generation"),item.get("currentAnswerId"),item.get("currentConfirmationId")),QaConfirmation.class);
        return new QaDetail(summary(actor,item,usable),decodeSnapshot(item.get("contextSnapshot")),answer,confirmation);
    }
    private QaSummary summary(Actor actor,Map<String,Object> r,boolean usable) {
        return new QaSummary(number(r,"id"),number(r,"projectId"),number(r,"itemNo"),(String)r.get("key"),"QA",(String)r.get("title"),(String)r.get("question"),
            (String)r.get("status"),statusLabel((String)r.get("status")),(String)r.get("priority"),nullable(r,"categoryId"),nullable(r,"milestoneId"),nullable(r,"assigneeMembershipId"),
            (String)r.get("assigneeName"),number(r,"createdBy"),(String)r.get("creatorName"),instant(r.get("createdAt")),instant(r.get("updatedAt")),number(r,"version"),number(r,"generation"),
            nullable(r,"documentId"),nullable(r,"groupId"),nullable(r,"runItemId"),nullable(r,"testCaseId"),nullable(r,"revisionId"),nullable(r,"currentAnswerId"),nullable(r,"currentAnswerVersion"),
            nullable(r,"currentConfirmationId"),capabilities(actor,r,usable));
    }
    private QaDetail replay(long p,Actor actor,String action,Long id,String key,String checksum) {
        var rows=db.rows("SELECT work_item_id AS workItemId,action,actor_membership_id AS actorMembershipId,request_checksum AS checksum,response_json AS response FROM qa_commands WHERE project_id=? AND request_key=? FOR UPDATE",p,key);
        if(rows.isEmpty())return null;var saved=rows.getFirst();
        if(!action.equals(saved.get("action"))||number(saved,"actorMembershipId")!=actor.membershipId()||id!=null&&id!=number(saved,"workItemId")||!checksum.equals(saved.get("checksum")))
            fail(409,"IDEMPOTENCY_CONFLICT","Request key đã được dùng cho nội dung hoặc lệnh khác.");
        // CREATE also checks the persisted QA identity/context, not just the incoming source IDs.
        if(id==null){var item=lockedItem(p,number(saved,"workItemId"));if(number(item,"createdBy")!=actor.membershipId())fail(403,"NOT_QA_CREATOR","Chỉ người tạo được phát lại lệnh.");currentContext(p,item,false);}
        try{return json.readValue(String.valueOf(saved.get("response")),QaDetail.class);}catch(Exception e){throw new IllegalStateException("Cannot decode QA response",e);}
    }
    private void saveCommand(long p,long id,Actor actor,String action,String key,String checksum,QaDetail result) {
        db.update("INSERT INTO qa_commands(project_id,work_item_id,action,actor_membership_id,request_key,request_checksum,response_json,occurred_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,action,actor.membershipId(),key,checksum,db.encode(result));
    }
    private void history(long p,long id,Actor actor,String action,String from,String to,String reason,Map<String,Object> details) {
        db.insert("INSERT INTO work_item_history(project_id,work_item_id,event_type,from_status,to_status,reason,details_json,actor_membership_id,occurred_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,"QA_"+action,from,to,text(reason),db.encode(details),actor.membershipId());
    }
    @SuppressWarnings("unchecked") private Map<String,Object> decodeSnapshot(Object value) {
        try{return value instanceof Map<?,?>?(Map<String,Object>)value:json.readValue(String.valueOf(value),Map.class);}catch(Exception e){throw new IllegalStateException("Cannot decode QA context",e);}
    }
    private static Instant instant(Object value){if(value instanceof java.sql.Timestamp t)return t.toInstant();if(value instanceof java.time.LocalDateTime t)return t.toInstant(java.time.ZoneOffset.UTC);return (Instant)value;}
    private static Long nullable(Map<String,Object> row,String key){return row.get(key)==null?null:((Number)row.get(key)).longValue();}
    private static void positive(Long id){if(id==null||id<=0)fail(422,"INVALID_QA_CONTEXT","ID phải lớn hơn 0.");}
    private static void optionalId(Long id){if(id!=null)positive(id);}
    private static void key(String key){if(key==null||!key.matches("[A-Za-z0-9_-]{8,64}"))fail(422,"INVALID_QUESTION","Request key không hợp lệ.");}
    private static void bounded(String value,int max,String code,boolean required){if(required&&text(value).isEmpty()||value!=null&&value.length()>max)fail(422,code,"Nội dung bắt buộc và độ dài phải đúng giới hạn.");}
    private static void requireState(String state,Set<String> allowed){if(!allowed.contains(state))fail(409,"INVALID_QA_STATE","Trạng thái QA không cho phép lệnh này.");}
    private static void page(int page,int size){if(page<0||size<1||size>100)fail(422,"INVALID_PAGE","Page phải không âm; size từ 1 đến 100.");}
    private static long pages(long count,int size){return (count+size-1)/size;}
    private String commentKey(String key){return "qa:"+db.checksum(List.of("QA_PROVIDE_INFO",key)).substring(0,60);}
}
