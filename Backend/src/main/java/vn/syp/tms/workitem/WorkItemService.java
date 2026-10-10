package vn.syp.tms.workitem;

import static vn.syp.tms.workitem.WorkItemStore.*;
import java.net.URI;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.retest.BugRetestLifecycle;
import vn.syp.tms.qa.QaService;
import vn.syp.tms.qa.QaDtos;

@Service @Transactional
public class WorkItemService {
    private final WorkItemStore db;
    private final ProjectAudit audit;
    private final BugRetestLifecycle retest;
    private final vn.syp.tms.rules.RuleService rules;
    private final QaService qa;
    public WorkItemService(WorkItemStore db,ProjectAudit audit,BugRetestLifecycle retest,vn.syp.tms.rules.RuleService rules,QaService qa) { this.db=db; this.audit=audit; this.retest=retest; this.rules=rules; this.qa=Objects.requireNonNull(qa); }
    private static final String SELECT="""
        SELECT w.id,w.item_key AS `key`,w.item_type AS type,w.title,w.description,w.status_code AS status,
        w.priority_code AS priority,w.category_id AS categoryId,w.milestone_id AS milestoneId,
        w.assignee_membership_id AS assigneeMembershipId,w.lock_version AS version,
        w.created_at AS createdAt,w.updated_at AS updatedAt,w.created_by AS creatorMembershipId,
        creator.display_name AS creator,assignee.display_name AS assignee,c.name AS category,m.name AS milestone,
        b.policy_version AS policyVersion,b.rule_version_id AS ruleVersionId,b.steps,b.expected_result AS expectedResult,b.actual_result AS actualResult,
        b.build_id AS buildId,b.environment_id AS environmentId,b.device_id AS deviceId,b.test_case_id AS testCaseId,
        b.revision_id AS revisionId,b.standalone_reason AS standaloneReason,b.fixed_build_id AS fixedBuildId,
        b.context_snapshot AS contextSnapshot,build.version_label AS buildLabel,env.name AS environmentName,dev.name AS deviceName
        FROM work_items w
        JOIN project_memberships cm ON cm.project_id=w.project_id AND cm.id=w.created_by
        JOIN identity_users creator ON creator.id=cm.user_id
        LEFT JOIN project_memberships am ON am.project_id=w.project_id AND am.id=w.assignee_membership_id
        LEFT JOIN identity_users assignee ON assignee.id=am.user_id
        LEFT JOIN categories c ON c.project_id=w.project_id AND c.id=w.category_id
        LEFT JOIN milestones m ON m.project_id=w.project_id AND m.id=w.milestone_id
        LEFT JOIN bug_details b ON b.project_id=w.project_id AND b.work_item_id=w.id
        LEFT JOIN builds build ON build.project_id=b.project_id AND build.id=b.build_id
        LEFT JOIN environments env ON env.project_id=b.project_id AND env.id=b.environment_id
        LEFT JOIN devices dev ON dev.project_id=b.project_id AND dev.id=b.device_id
        """;

    public Map<String,Object> membership(long p,String actor) {
        return db.row("SELECT m.id,CASE WHEN u.role_code='DEV' THEN 'DEV' ELSE m.project_role END AS role,u.role_code AS systemRole FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.user_id=? AND m.active=TRUE AND u.enabled=TRUE",p,actor);
    }
    /** Read-only projection. ID 0 cannot authorize assignments, comments, or execution. */
    public Map<String,Object> readMembership(long p,String actor) {
        return db.row("""
            SELECT COALESCE(m.id,0) AS id,
                CASE WHEN u.role_code='DEV' THEN 'DEV' ELSE m.project_role END AS role,u.role_code AS systemRole
            FROM identity_users u JOIN projects p ON p.id=?
            LEFT JOIN project_memberships m ON m.project_id=p.id AND m.user_id=u.id AND m.active=TRUE
            WHERE u.id=? AND u.enabled=TRUE AND (u.role_code='ADMIN' OR m.id IS NOT NULL)
            """,p,actor);
    }
    public Map<String,Object> writable(long p,String actor) {
        // Same project lock order as execution and membership changes, before consistent reads.
        var project=db.row("SELECT id,code,archived_at FROM projects WHERE id=? FOR UPDATE",p);
        var member=membership(p,actor);
        if(project.get("archived_at")!=null) fail(409,"ARCHIVED","Dự án đã được lưu trữ.");
        return member;
    }
    private Map<String,Object> writeMember(long p,String actor) {
        // Current identity -> project -> membership locks must precede the first consistent read.
        // Otherwise even type discovery can pin an old REPEATABLE READ snapshot while waiting.
        qa.authorize(p,actor,true);
        return writable(p,actor);
    }
    public static boolean developer(Map<String,Object> member) {return "DEV".equals(member.get("role")) || "DEV".equals(member.get("systemRole"));}
    public static boolean ownBug(Map<String,Object> member,Map<String,Object> item) {return "BUG".equals(item.get("type")) && !BugRetestLifecycle.terminal(item.get("status")) && item.get("assigneeMembershipId") instanceof Number assigned && assigned.longValue()==number(member,"id");}
    private static boolean ordinaryWork(Map<String,Object> item) {return Set.of("TASK","REQUEST","IMPROVEMENT").contains(item.get("type"));}
    private List<Map<String,Object>> allowedTransitions(Map<String,Object> member,Map<String,Object> item) {
        if(developer(member)) return ownBug(member,item)
            ? db.rows("SELECT code AS id,label_vi AS label FROM work_item_statuses WHERE code IN ('progress','resolved') AND code<>? ORDER BY sort_order",item.get("status")) : List.of();
        if(!"PM".equals(member.get("role"))) return List.of();
        if(ordinaryWork(item)) {
            if(BugRetestLifecycle.terminal(item.get("status")))
                return db.rows("SELECT code AS id,label_vi AS label FROM work_item_statuses WHERE code='open'");
            return db.rows("SELECT code AS id,label_vi AS label FROM work_item_statuses WHERE (terminal=FALSE OR code IN ('closed','wontfix')) AND code<>? ORDER BY sort_order",item.get("status"));
        }
        return BugRetestLifecycle.terminal(item.get("status")) ? List.of()
            : db.rows("SELECT code AS id,label_vi AS label FROM work_item_statuses WHERE terminal=FALSE AND code<>? ORDER BY sort_order",item.get("status"));
    }
    private void pm(Map<String,Object> member) { if(developer(member) || !"PM".equals(member.get("role"))) fail(403,"PROJECT_PM_REQUIRED","Chỉ PM dự án được phân công và phân loại công việc."); }
    public Map<String,Object> overview(long p,String actor) {
        qa.authorize(p,actor,false);
        readMembership(p,actor);
        return Map.of("items",projectQa(p,actor,db.rows(SELECT+" WHERE w.project_id=? ORDER BY w.created_at DESC,w.id DESC LIMIT 30",p)),
            "statuses",db.rows("SELECT status_code AS status,COUNT(*) AS count FROM work_items WHERE project_id=? GROUP BY status_code",p),
            "milestones",db.rows("SELECT m.id,m.name,DATE_FORMAT(m.due_on,'%Y-%m-%d') AS dueOn,COUNT(w.id) AS total,COALESCE(SUM(w.status_code='closed'),0) AS done FROM milestones m LEFT JOIN work_items w ON w.project_id=m.project_id AND w.milestone_id=m.id WHERE m.project_id=? AND m.archived_at IS NULL GROUP BY m.id,m.name,m.due_on ORDER BY m.id DESC",p));
    }
    @Transactional(readOnly=true)
    public Map<String,Object> source(long p,String actor,long attemptId) {
        readMembership(p,actor); var attempt=ng(p,attemptId);
        var revision=db.row("SELECT title_vi,steps_vi,expected_vi FROM test_case_revisions WHERE project_id=? AND id=?",p,attempt.get("revision_id"));
        var result=new LinkedHashMap<String,Object>();
        result.put("attemptId",attemptId); result.put("revisionId",attempt.get("revision_id")); result.put("buildId",attempt.get("build_id"));
        result.put("environmentId",attempt.get("environment_id")); result.put("deviceId",attempt.get("device_id"));
        result.put("title",revision.get("title_vi")); result.put("steps",revision.get("steps_vi")); result.put("expectedResult",revision.get("expected_vi"));
        result.put("actualResult",db.row("SELECT actual_result FROM execution_attempts WHERE project_id=? AND id=?",p,attemptId).get("actual_result"));
        return result;
    }
    public Map<String,Object> metadata(long p,String actor) {
        var current=qa.authorize(p,actor,false);
        var member=readMembership(p,actor);
        var statuses=db.rows("SELECT code AS id,label_vi AS label,color,terminal FROM work_item_statuses ORDER BY sort_order");
        var qaStatuses=List.of("open","progress","clarify","resolved","recheck","closed").stream()
                .map(code -> Map.<String,Object>of("id",code,"label",QaService.statusLabel(code),"terminal","closed".equals(code))).toList();
        return Map.of("statuses",statuses,"statusesByType",Map.of("BUG",statuses,"REQUEST",statuses,"TASK",statuses,"IMPROVEMENT",statuses,"QA",qaStatuses),
            "types",List.of(Map.of("id","BUG","label","Lỗi"),Map.of("id","REQUEST","label","Yêu cầu"),Map.of("id","TASK","label","Công việc"),Map.of("id","IMPROVEMENT","label","Cải tiến"),Map.of("id","QA","label","QA")),
            "canCreate",current.membershipId()>0&&!current.archived()&&!developer(member),"canCreateQa",!current.archived()&&(current.pm()||current.tester()),"canTriage",!current.archived()&&!developer(member) && "PM".equals(member.get("role")),"membershipId",current.membershipId(),"policyVersion","INTERNAL_V1","titlePrefix",rules.titlePrefix(p));
    }
    public WorkItemDtos.Page<Map<String,Object>> list(long p,String actor,int page,int size,String type,String status,String keyword,Long assignee,Long category,Long milestone) {
        qa.authorize(p,actor,false);
        readMembership(p,actor);
        if(page<0 || size<1 || size>100) fail(422,"INVALID_PAGE","Kích thước trang từ 1 đến 100, trang từ 0.");
        if(text(keyword).length()>200) fail(422,"INVALID_FILTER","Từ khóa tối đa 200 ký tự.");
        String where=" WHERE w.project_id=?"; var args=new ArrayList<Object>(List.of(p));
        if(!text(type).isEmpty()) { where+=" AND w.item_type=?"; args.add(type); }
        if(!text(status).isEmpty()) { where+=" AND w.status_code=?"; args.add(status); }
        if(!text(keyword).isEmpty()) { where+=" AND (LOCATE(?,w.title)>0 OR LOCATE(?,CONVERT(w.item_key USING utf8mb4))>0)"; args.add(text(keyword));args.add(text(keyword)); }
        if(assignee!=null) { where+=" AND w.assignee_membership_id=?"; args.add(assignee); }
        if(category!=null) { where+=" AND w.category_id=?"; args.add(category); }
        if(milestone!=null) { where+=" AND w.milestone_id=?"; args.add(milestone); }
        long total=db.count("SELECT COUNT(*) FROM work_items w"+where,args.toArray());
        args.add(size); args.add((long)page*size);
        return new WorkItemDtos.Page<>(projectQa(p,actor,db.rows(SELECT+where+" ORDER BY w.updated_at DESC,w.id DESC LIMIT ? OFFSET ?",args.toArray())),total,page,size,(int)((total+size-1)/size));
    }
    public Map<String,Object> get(long p,String actor,long id) {
        // A nonlocking type discovery keeps unchanged BUG callers (including read-only retest summary)
        // free of QA locking guards. It is never QA ownership/state/context/replay authority.
        if(isQa(p,id)) return qaProjection(qa.detail(p,actor,id));
        var member=readMembership(p,actor);
        var item=db.row(SELECT+" WHERE w.project_id=? AND w.id=?",p,id);
        item.put("allowedTransitions",allowedTransitions(member,item));
        item.put("canComment",number(member,"id")>0 && (!developer(member) || ownBug(member,item)));
        item.put("canAttach",number(member,"id")>0 && (!developer(member) || ownBug(member,item)));
        item.put("links",db.rows("SELECT l.attempt_id AS attemptId,l.run_item_id AS runItemId,a.attempt_no AS attemptNo,tc.case_no AS caseNo FROM work_item_execution_links l JOIN execution_attempts a ON a.project_id=l.project_id AND a.run_item_id=l.run_item_id AND a.id=l.attempt_id JOIN run_items r ON r.project_id=l.project_id AND r.id=l.run_item_id JOIN test_cases tc ON tc.project_id=r.project_id AND tc.id=r.test_case_id WHERE l.project_id=? AND l.work_item_id=? ORDER BY l.attempt_id",p,id));
        item.put("externalReferences",db.rows("SELECT id,provider,external_id AS externalId,external_url AS url,reconciliation_status AS reconciliationStatus FROM work_item_external_references WHERE project_id=? AND work_item_id=? ORDER BY id",p,id));
        item.put("clarifications",db.rows("SELECT id,source_kind AS sourceKind,source_reference AS sourceReference,confirmed_by AS confirmedBy,confirmed_at AS confirmedAt,conclusion,recorded_at AS recordedAt FROM work_item_clarifications WHERE project_id=? AND work_item_id=? ORDER BY id DESC",p,id));
        return item;
    }
    public Map<String,Object> create(long p,String actor,WorkItemDtos.Create input) {
        QaService.rejectGenericMutation(input.type());
        var member=writeMember(p,actor); long author=number(member,"id"); String checksum=db.checksum(input);
        if(developer(member))fail(403,"FORBIDDEN","Dev chỉ xử lý bug được giao.");
        var duplicate=db.rows("SELECT id,created_by,request_checksum FROM work_items WHERE project_id=? AND request_key=?",p,input.requestKey());
        if(!duplicate.isEmpty()) {
            var old=duplicate.getFirst();
            if(number(old,"created_by")!=author || !checksum.equals(old.get("request_checksum"))) fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã được dùng cho nội dung hoặc người khác.");
            return get(p,actor,number(old,"id"));
        }
        if(input.categoryId()!=null || input.milestoneId()!=null || input.assigneeMembershipId()!=null || (input.priority()!=null && !"MEDIUM".equals(input.priority()))) pm(member);
        classification(p,input.categoryId(),input.milestoneId(),input.assigneeMembershipId());
        Map<String,Object> source=null; String contextSnapshot=null;
        Long ruleVersion=null;
        if("BUG".equals(input.type())) {
            ruleVersion=rules.applicableVersion(p,input.title());
            required(input.steps(),"bước tái hiện"); required(input.expectedResult(),"kết quả mong đợi"); required(input.actualResult(),"kết quả thực tế");
            if(input.attemptId()!=null) {
                source=ng(p,input.attemptId());
                if(!Objects.equals(input.revisionId(),number(source,"revision_id")) || !Objects.equals(input.buildId(),number(source,"build_id")) || !Objects.equals(input.environmentId(),number(source,"environment_id")) || !Objects.equals(input.deviceId(),number(source,"device_id"))) fail(422,"ATTEMPT_CONTEXT_MISMATCH","Ngữ cảnh bug phải khớp lần chạy NG đã chọn.");
                contextSnapshot=db.row("SELECT context_snapshot FROM execution_attempts WHERE project_id=? AND id=?",p,input.attemptId()).get("context_snapshot").toString();
            } else if(input.revisionId()!=null) source=db.row("SELECT r.test_case_id,r.id AS revision_id FROM test_case_revisions r JOIN test_cases c ON c.project_id=r.project_id AND c.id=r.test_case_id WHERE r.project_id=? AND r.id=? AND c.archived_at IS NULL",p,input.revisionId());
            else { pm(member); required(input.standaloneReason(),"lý do chưa có test case"); }
            if(input.attemptId()==null) contextSnapshot=db.encode(context(p,input.buildId(),input.environmentId(),input.deviceId()));
        } else if(input.attemptId()!=null || input.revisionId()!=null) fail(422,"BUG_REQUIRED","Liên kết kiểm thử chỉ áp dụng cho loại Lỗi.");
        db.update("INSERT INTO project_counters(project_id,counter_code,next_value) VALUES(?,'WORK_ITEM',1) ON DUPLICATE KEY UPDATE next_value=next_value",p);
        long next=db.count("SELECT next_value FROM project_counters WHERE project_id=? AND counter_code='WORK_ITEM' FOR UPDATE",p);
        String key=db.row("SELECT code FROM projects WHERE id=?",p).get("code")+"-"+next;
        long id=db.insert("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,priority_code,category_id,milestone_id,assignee_membership_id,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,?)",p,next,key,input.type(),text(input.title()),text(input.description()),input.priority()==null?"MEDIUM":input.priority(),input.categoryId(),input.milestoneId(),input.assigneeMembershipId(),author,author,input.requestKey(),checksum);
        db.update("UPDATE project_counters SET next_value=next_value+1 WHERE project_id=? AND counter_code='WORK_ITEM'",p);
        if("BUG".equals(input.type())) {
            db.update("INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,build_id,environment_id,device_id,test_case_id,revision_id,standalone_reason,context_snapshot) VALUES(?,?,'INTERNAL_V1',?,?,?,?,?,?,?,?,?,?)",p,id,text(input.steps()),text(input.expectedResult()),text(input.actualResult()),input.buildId(),input.environmentId(),input.deviceId(),source==null?null:source.get("test_case_id"),input.revisionId(),text(input.standaloneReason()),contextSnapshot);
            if(ruleVersion!=null)db.update("UPDATE bug_details SET rule_version_id=? WHERE project_id=? AND work_item_id=?",ruleVersion,p,id);
            if(input.attemptId()!=null) insertLink(p,id,input.attemptId(),number(source,"run_item_id"),author);
            retest.ensure(p,id);
        }
        history(p,id,author,"CREATE",null,"open","Tạo công việc",Map.of("policyVersion","INTERNAL_V1"));
        audit.record(p,actor,"WORK_ITEM",id,"CREATE"); return get(p,actor,id);
    }
    public Map<String,Object> update(long p,String actor,long id,WorkItemDtos.Update input) {
        var member=writeMember(p,actor);
        rejectQa(p,id);
        pm(member); var old=get(p,actor,id); QaService.rejectGenericMutation((String)old.get("type")); version(old,input.expectedVersion());
        if(ordinaryWork(old) && BugRetestLifecycle.terminal(old.get("status")))
            fail(422,"REOPEN_REQUIRED","PM cần mở lại công việc với lý do trước khi sửa nội dung hoặc phân công.");
        classification(p,input.categoryId(),input.milestoneId(),input.assigneeMembershipId());
        if("BUG".equals(old.get("type"))) {
            rules.validateTitle(p,old.get("ruleVersionId")==null?null:number(old,"ruleVersionId"),input.title());
            BugRetestLifecycle.editable(old);
            required(input.steps(),"bước tái hiện"); required(input.expectedResult(),"kết quả mong đợi"); required(input.actualResult(),"kết quả thực tế");
            if(!text(input.steps()).equals(old.get("steps")) || !text(input.expectedResult()).equals(old.get("expectedResult")) || !text(input.actualResult()).equals(old.get("actualResult"))) retest.invalidate(p,id,false);
            db.update("UPDATE bug_details SET steps=?,expected_result=?,actual_result=? WHERE project_id=? AND work_item_id=?",text(input.steps()),text(input.expectedResult()),text(input.actualResult()),p,id);
        }
        db.update("UPDATE work_items SET title=?,description=?,priority_code=?,category_id=?,milestone_id=?,assignee_membership_id=? WHERE project_id=? AND id=?",text(input.title()),text(input.description()),input.priority(),input.categoryId(),input.milestoneId(),input.assigneeMembershipId(),p,id);
        history(p,id,number(member,"id"),"UPDATE",null,null,input.reason(),WorkItemChangeHistory.updateDetails(old,input));
        bump(p,id,number(member,"id")); audit.record(p,actor,"WORK_ITEM",id,"UPDATE"); return get(p,actor,id);
    }
    public Map<String,Object> transition(long p,String actor,long id,WorkItemDtos.Transition input) {
        var member=writeMember(p,actor);
        rejectQa(p,id);
        var item=get(p,actor,id); QaService.rejectGenericMutation((String)item.get("type")); version(item,input.expectedVersion());
        if(developer(member)) {
            if(!ownBug(member,item) || !List.of("progress","resolved").contains(input.status()))fail(403,"FORBIDDEN","Dev chỉ xử lý bug đang được giao sang Đang xử lý hoặc Đã sửa.");
            required(input.reason(),"nội dung xử lý bản sửa");
        } else pm(member);
        var target=db.row("SELECT terminal FROM work_item_statuses WHERE code=?",input.status());
        if(ordinaryWork(item)) {
            required(input.reason(),"lý do chuyển trạng thái công việc");
            if(input.fixedBuildId()!=null || (Boolean.TRUE.equals(target.get("terminal")) && !Set.of("closed","wontfix").contains(input.status())))
                fail(422,"INVALID_TRANSITION","Công việc chỉ kết thúc bằng Hoàn thành hoặc Không xử lý; không dùng build sửa lỗi.");
            if(BugRetestLifecycle.terminal(item.get("status")) && !"open".equals(input.status()))
                fail(422,"REOPEN_REQUIRED","PM cần mở lại công việc về Chưa xử lý với lý do trước khi tiếp tục.");
        } else {
            if(Boolean.TRUE.equals(target.get("terminal"))) fail(422,"CLOSURE_NOT_ENABLED","Dùng thao tác Đóng lỗi trong phần Kiểm thử lại để kiểm tra đủ điều kiện.");
            BugRetestLifecycle.editable(item);
        }
        if(input.status().equals(item.get("status"))) return item;
        if("BUG".equals(item.get("type")) && ("resolved".equals(input.status()) || "resolved".equals(item.get("status")))) retest.invalidate(p,id,!"resolved".equals(input.status()));
        if("resolved".equals(input.status()) && "BUG".equals(item.get("type"))) {
            if(input.fixedBuildId()==null) fail(422,"FIXED_BUILD_REQUIRED","Chọn build đã sửa; trạng thái này vẫn chờ kiểm thử lại.");
            db.row("SELECT id FROM builds WHERE project_id=? AND id=? AND archived_at IS NULL",p,input.fixedBuildId());
            db.update("UPDATE bug_details SET fixed_build_id=? WHERE project_id=? AND work_item_id=?",input.fixedBuildId(),p,id);
        }
        db.update("UPDATE work_items SET status_code=? WHERE project_id=? AND id=?",input.status(),p,id);
        history(p,id,number(member,"id"),"TRANSITION",(String)item.get("status"),input.status(),input.reason(),input.fixedBuildId()==null?Map.of():Map.of("fixedBuildId",input.fixedBuildId()));
        bump(p,id,number(member,"id")); audit.record(p,actor,"WORK_ITEM",id,"TRANSITION"); return get(p,actor,id);
    }
    public List<Map<String,Object>> batch(long p,String actor,WorkItemDtos.Batch input) {
        pm(writeMember(p,actor)); var seen=new HashSet<Long>(); var result=new ArrayList<Map<String,Object>>();
        for(var item:input.items()) {
            if(!seen.add(item.id())) fail(422,"DUPLICATE_ITEM","Không chọn trùng công việc trong cùng yêu cầu.");
            rejectQa(p,item.id());
        }
        for(var item:input.items()) {
            result.add(transition(p,actor,item.id(),new WorkItemDtos.Transition(input.status(),input.reason(),input.fixedBuildId(),item.expectedVersion())));
        }
        return result;
    }
    public Map<String,Object> link(long p,String actor,long id,WorkItemDtos.Link input) {
        var member=writeMember(p,actor);
        rejectQa(p,id);
        var item=get(p,actor,id);
        QaService.rejectGenericMutation((String)item.get("type"));
        if(developer(member))fail(403,"FORBIDDEN","Dev không sửa liên kết kết quả kiểm thử.");
        if(!"BUG".equals(item.get("type"))) fail(422,"BUG_REQUIRED","Chỉ liên kết lần NG với một bug.");
        var attempt=ng(p,input.attemptId());
        if(db.count("SELECT COUNT(*) FROM work_item_execution_links WHERE project_id=? AND work_item_id=? AND attempt_id=?",p,id,input.attemptId())>0) return item;
        BugRetestLifecycle.editable(item);
        version(item,input.expectedVersion()); insertLink(p,id,input.attemptId(),number(attempt,"run_item_id"),number(member,"id"));
        retest.invalidate(p,id,false);
        history(p,id,number(member,"id"),"LINK_NG",null,null,"Liên kết lần kiểm thử NG",Map.of("attemptId",input.attemptId()));
        bump(p,id,number(member,"id")); return get(p,actor,id);
    }
    public List<Map<String,Object>> history(long p,String actor,long id,int before) {
        get(p,actor,id);
        return db.rows("SELECT h.id,h.event_type AS eventType,h.from_status AS fromStatus,h.to_status AS toStatus,h.reason,h.details_json AS details,h.occurred_at AS occurredAt,u.display_name AS actor FROM work_item_history h JOIN project_memberships m ON m.project_id=h.project_id AND m.id=h.actor_membership_id JOIN identity_users u ON u.id=m.user_id WHERE h.project_id=? AND h.work_item_id=? AND (?=0 OR h.id<?) ORDER BY h.id DESC LIMIT 50",p,id,before,before);
    }
    public List<Map<String,Object>> comments(long p,String actor,long id,int before) {
        get(p,actor,id);
        return db.rows("SELECT c.id,c.body,c.visibility,c.created_at AS createdAt,u.display_name AS author FROM work_item_comments c JOIN project_memberships m ON m.project_id=c.project_id AND m.id=c.author_membership_id JOIN identity_users u ON u.id=m.user_id WHERE c.project_id=? AND c.work_item_id=? AND (?=0 OR c.id<?) ORDER BY c.id DESC LIMIT 50",p,id,before,before);
    }
    public Object comment(long p,String actor,long id,WorkItemDtos.Comment input) {
        // Keep all type routing after the current identity/project locks; standalone get stays nonlocking.
        qa.authorize(p,actor,true);
        long author;
        if(isQa(p,id)) {
            // Current identity -> project -> membership -> item -> source, before replay.
            // The typed helper retains its locks in this outer read/write command transaction.
            author=qa.authorizeWriter(p,actor,id).actor().membershipId();
            if(!"INTERNAL".equals(input.visibility()) || text(input.body()).isEmpty() || text(input.body()).length()>20000
                    || input.requestKey()==null || !input.requestKey().matches("[A-Za-z0-9_-]{8,64}"))
                fail(422,"INVALID_COMMENT","Nội dung INTERNAL và request key phải hợp lệ.");
        } else {
            var member=writable(p,actor); var item=get(p,actor,id);
            if(developer(member) && !ownBug(member,item))fail(403,"FORBIDDEN","Dev chỉ ghi chú bug đang được giao.");
            author=number(member,"id");
        }
        var old=db.rows("SELECT id,body,author_membership_id FROM work_item_comments WHERE project_id=? AND work_item_id=? AND request_key=? FOR UPDATE",p,id,input.requestKey());
        if(!old.isEmpty()) {
            if(!text(input.body()).equals(old.getFirst().get("body")) || number(old.getFirst(),"author_membership_id")!=author) fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu bình luận đã được dùng.");
            return Map.of("id",old.getFirst().get("id"));
        }
        long comment=db.insert("INSERT INTO work_item_comments(project_id,work_item_id,body,visibility,author_membership_id,created_at,request_key) VALUES(?,?,?,'INTERNAL',?,UTC_TIMESTAMP(6),?)",p,id,text(input.body()),author,input.requestKey());
        audit.record(p,actor,"WORK_ITEM_COMMENT",comment,"CREATE"); return Map.of("id",comment);
    }
    public Map<String,Object> external(long p,String actor,long id,WorkItemDtos.ExternalReference input) {
        var member=writeMember(p,actor);
        rejectQa(p,id);
        pm(member); var item=get(p,actor,id); QaService.rejectGenericMutation((String)item.get("type")); version(item,input.expectedVersion());
        if("REDMINE".equalsIgnoreCase(text(input.provider())) && db.count("SELECT COUNT(*) FROM redmine_bindings WHERE project_id=? AND work_item_id=?",p,id)>0)
            fail(409,"REDMINE_ALREADY_MANAGED","Bug đã có liên kết Redmine được quản lý. Dùng phần Công bố và đối chiếu Redmine.");
        try { var uri=URI.create(input.url()); if(!List.of("https","http").contains(uri.getScheme()) || uri.getHost()==null || uri.getUserInfo()!=null) throw new IllegalArgumentException(); }
        catch(IllegalArgumentException e) { fail(422,"INVALID_URL","Đường dẫn phải là HTTP/HTTPS hợp lệ, không chứa thông tin đăng nhập."); }
        var previous=db.rows("SELECT work_item_id FROM work_item_external_references WHERE project_id=? AND provider=? AND external_id=?",p,text(input.provider()),text(input.externalId()));
        if(!previous.isEmpty() && number(previous.getFirst(),"work_item_id")!=id) fail(409,"REFERENCE_IN_USE","Tham chiếu đã thuộc một công việc khác.");
        db.update("INSERT INTO work_item_external_references(project_id,work_item_id,provider,external_id,external_url,recorded_by,recorded_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE external_url=?,recorded_by=?,recorded_at=UTC_TIMESTAMP(6)",p,id,text(input.provider()),text(input.externalId()),input.url(),number(member,"id"),input.url(),number(member,"id"));
        history(p,id,number(member,"id"),"EXTERNAL_REFERENCE",null,null,"Nhập thủ công — chưa đối soát",input);
        bump(p,id,number(member,"id")); return get(p,actor,id);
    }
    public Map<String,Object> clarify(long p,String actor,long id,WorkItemDtos.Clarification input) {
        var member=writeMember(p,actor);
        rejectQa(p,id);
        pm(member); var item=get(p,actor,id); QaService.rejectGenericMutation((String)item.get("type")); version(item,input.expectedVersion());
        db.insert("INSERT INTO work_item_clarifications(project_id,work_item_id,source_kind,source_reference,confirmed_by,confirmed_at,conclusion,recorded_by,recorded_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,input.sourceKind(),text(input.sourceReference()),text(input.confirmedBy()),Timestamp.from(input.confirmedAt()),text(input.conclusion()),number(member,"id"));
        history(p,id,number(member,"id"),"CLARIFICATION",null,null,"Ghi nhận nội dung làm rõ",input);
        bump(p,id,number(member,"id")); return get(p,actor,id);
    }
    private boolean isQa(long p,long id) {
        return "QA".equals(db.row("SELECT w.item_type AS type FROM work_items w WHERE w.project_id=? AND w.id=?",p,id).get("type"));
    }
    private void rejectQa(long p,long id) {if(isQa(p,id))QaService.rejectGenericMutation("QA");}
    private List<Map<String,Object>> projectQa(long p,String actor,List<Map<String,Object>> rows) {
        return rows.stream().map(item -> "QA".equals(item.get("type")) ? qaProjection(qa.detail(p,actor,number(item,"id"))) : item).toList();
    }
    private Map<String,Object> qaProjection(QaDtos.QaDetail detail) {
        var q=detail.item();var item=new LinkedHashMap<String,Object>();
        item.put("id",q.id());item.put("projectId",q.projectId());item.put("itemNo",q.itemNo());item.put("key",q.key());item.put("type",q.type());item.put("typeLabel","QA");
        item.put("title",q.title());item.put("description",q.question());item.put("question",q.question());item.put("status",q.status());item.put("statusLabel",q.statusLabel());
        item.put("priority",q.priority());item.put("categoryId",q.categoryId());item.put("milestoneId",q.milestoneId());
        item.put("assigneeMembershipId",q.assigneeMembershipId());item.put("assigneeName",q.assigneeName());item.put("assignee",q.assigneeName());
        item.put("createdBy",q.createdBy());item.put("creatorMembershipId",q.createdBy());item.put("creatorName",q.creatorName());item.put("creator",q.creatorName());
        item.put("createdAt",q.createdAt());item.put("updatedAt",q.updatedAt());item.put("version",q.version());item.put("generation",q.generation());
        item.put("documentId",q.documentId());item.put("groupId",q.groupId());item.put("runItemId",q.runItemId());item.put("testCaseId",q.testCaseId());item.put("revisionId",q.revisionId());
        item.put("currentAnswerId",q.currentAnswerId());item.put("currentAnswerVersion",q.currentAnswerVersion());item.put("currentConfirmationId",q.currentConfirmationId());
        item.put("contextSnapshot",detail.contextSnapshot());item.put("currentAnswer",detail.currentAnswer());item.put("currentConfirmation",detail.currentConfirmation());item.put("capabilities",q.capabilities());
        item.put("allowedTransitions",List.of());item.put("canComment",q.capabilities().canComment());item.put("canAttach",q.capabilities().canUploadEvidence());
        item.put("links",List.of());item.put("externalReferences",List.of());item.put("clarifications",List.of());
        return item;
    }
    private Map<String,Object> ng(long p,long attempt) {
        var row=db.row("SELECT a.run_item_id,a.build_id,a.result_code,r.revision_id,r.test_case_id,c.environment_id,c.device_id FROM execution_attempts a JOIN run_items r ON r.project_id=a.project_id AND r.id=a.run_item_id JOIN cycle_configurations c ON c.project_id=r.project_id AND c.cycle_id=r.cycle_id AND c.id=r.configuration_id WHERE a.project_id=? AND a.id=?",p,attempt);
        if(!"NG".equals(row.get("result_code"))) fail(422,"NG_REQUIRED","Chỉ liên kết với lần chạy có kết quả NG."); return row;
    }
    private Map<String,Object> context(long p,Long build,Long environment,Long device) {
        if(build==null || environment==null || device==null) fail(422,"CONTEXT_REQUIRED","Bug cần build, môi trường và thiết bị.");
        return Map.of("build",db.row("SELECT id,version_label AS versionLabel,build_number AS buildNumber,platform FROM builds WHERE project_id=? AND id=? AND archived_at IS NULL",p,build),
            "environment",db.row("SELECT id,code,name FROM environments WHERE project_id=? AND id=? AND active=TRUE",p,environment),
            "device",db.row("SELECT id,code,name,model,os_name AS osName,os_version AS osVersion FROM devices WHERE project_id=? AND id=? AND active=TRUE",p,device));
    }
    private void classification(long p,Long category,Long milestone,Long assignee) {
        if(category!=null) db.row("SELECT id FROM categories WHERE project_id=? AND id=? AND active=TRUE",p,category);
        if(milestone!=null) db.row("SELECT id FROM milestones WHERE project_id=? AND id=? AND archived_at IS NULL",p,milestone);
        if(assignee!=null) db.row("SELECT m.id FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.id=? AND m.active=TRUE AND u.enabled=TRUE",p,assignee);
    }
    private void insertLink(long p,long id,long attempt,long run,long actor) { db.update("INSERT INTO work_item_execution_links(project_id,work_item_id,run_item_id,attempt_id,linked_by,linked_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,run,attempt,actor); }
    private void bump(long p,long id,long actor) { db.update("UPDATE work_items SET lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",actor,p,id); }
    private void history(long p,long id,long actor,String event,String from,String to,String reason,Object details) {
        db.insert("INSERT INTO work_item_history(project_id,work_item_id,event_type,from_status,to_status,reason,details_json,actor_membership_id,occurred_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,event,from,to,text(reason),db.encode(details),actor);
    }
}
