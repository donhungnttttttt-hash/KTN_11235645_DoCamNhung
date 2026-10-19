package vn.syp.tms.workitem;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.shared.search.MultiWordSearch;
import vn.syp.tms.testcase.TestDocumentService;
import static vn.syp.tms.workitem.WorkItemStore.*;

/** Feature issues retain work-item identity without any run/device/retest/QA-answer prerequisite. */
@Service @Transactional
public class FeatureIssueService {
    private final WorkItemStore db;
    private final IdentityService identity;
    private final ProjectAudit audit;
    private final TestDocumentService documents;
    private final ObjectMapper json;
    public FeatureIssueService(WorkItemStore db,IdentityService identity,ProjectAudit audit,TestDocumentService documents,ObjectMapper json){this.db=db;this.identity=identity;this.audit=audit;this.documents=documents;this.json=json;}
    private record Actor(String user,Long membership,boolean manager,boolean tester,boolean dev,boolean archived) {}
    private static final Set<String> QA_STATUSES=Set.of("open","progress","clarify","resolved","recheck","closed");
    private static final String FROM="""
        FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id
        JOIN testing_features f ON f.project_id=x.project_id AND f.id=x.feature_id
        LEFT JOIN import_batches d ON d.project_id=x.project_id AND d.id=x.document_id
        LEFT JOIN import_rows ir ON ir.project_id=x.project_id AND ir.batch_id=x.document_id AND ir.id=x.row_id
        LEFT JOIN test_cases tc ON tc.project_id=ir.project_id AND tc.id=ir.target_case_id
        LEFT JOIN bug_details b ON b.project_id=w.project_id AND b.work_item_id=w.id
        LEFT JOIN qa_details q ON q.project_id=w.project_id AND q.work_item_id=w.id
        JOIN identity_users author ON author.id=x.created_by_user_id
        LEFT JOIN project_memberships am ON am.project_id=w.project_id AND am.id=w.assignee_membership_id
        LEFT JOIN identity_users assignee ON assignee.id=am.user_id
        JOIN work_item_statuses s ON s.code=w.status_code
        """;
    private static final String SELECT="""
        SELECT w.id,w.item_key AS `key`,w.item_type AS type,w.title,w.description,w.status_code AS status,s.label_vi AS statusLabel,
        w.priority_code AS priority,w.assignee_membership_id AS assigneeMembershipId,assignee.display_name AS assignee,
        w.lock_version AS version,w.created_at AS createdAt,w.updated_at AS updatedAt,x.created_by_user_id AS createdByUserId,
        author.display_name AS creator,x.feature_id AS featureId,f.name AS featureName,x.document_id AS documentId,d.file_name AS fileName,
        x.row_id AS rowId,COALESCE(NULLIF(ir.source_case_key,''),tc.case_no) AS caseNo,x.monkey,x.deleted_at AS deletedAt,
        f.archived_at AS featureArchivedAt,d.archived_at AS documentArchivedAt,
        COALESCE(b.steps,JSON_UNQUOTE(JSON_EXTRACT(q.context_snapshot,'$.steps')),'') AS steps,
        COALESCE(b.expected_result,JSON_UNQUOTE(JSON_EXTRACT(q.context_snapshot,'$.expectedResult')),'') AS expectedResult,
        COALESCE(b.actual_result,JSON_UNQUOTE(JSON_EXTRACT(q.context_snapshot,'$.actualResult')),'') AS actualResult
        """;

    private Actor authorize(long p,String user,boolean write){
        if(p<1)fail(404,"NOT_FOUND","Không tìm thấy dự án.");
        String systemRole=write?identity.lockCurrent(user).getRole():identity.current(user).getRole();
        var project=db.row("SELECT id,code,archived_at AS archivedAt FROM projects WHERE id=?"+(write?" FOR UPDATE":""),p);
        boolean archived=project.get("archivedAt")!=null;
        if(write&&archived)fail(409,"ARCHIVED","Dự án đã lưu trữ.");
        if("ADMIN".equals(systemRole))return new Actor(user,null,true,false,false,archived);
        var rows=db.rows("SELECT id,project_role AS projectRole FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE"+(write?" FOR UPDATE":""),p,user);
        if(rows.isEmpty())fail(404,"NOT_FOUND","Không tìm thấy dự án trong phạm vi được phép.");
        var member=rows.getFirst();String role=String.valueOf(member.get("projectRole"));boolean dev="DEV".equals(systemRole);
        return new Actor(user,number(member,"id"),!dev&&"PM".equals(role),!dev&&"TESTER".equals(role),dev&&"DEV".equals(role),archived);
    }
    private Map<String,Object> feature(long p,long id,boolean lock,boolean active){
        var result=db.row("SELECT id,name,archived_at AS archivedAt FROM testing_features WHERE project_id=? AND id=?"+(lock?" FOR UPDATE":""),p,id);
        if(active&&result.get("archivedAt")!=null)fail(409,"ARCHIVED","Feature đã lưu trữ.");return result;
    }
    private Map<String,Object> source(long p,String user,long f,long d,long row,boolean lock){
        var feature=feature(p,f,lock,true);
        var document=db.row("SELECT id,file_name AS fileName,archived_at AS archivedAt FROM import_batches WHERE project_id=? AND feature_id=? AND id=? AND status='COMMITTED'"+(lock?" FOR UPDATE":""),p,f,d);
        if(document.get("archivedAt")!=null)fail(409,"ARCHIVED","File đã lưu trữ.");
        db.row("SELECT ir.id FROM import_rows ir JOIN test_cases c ON c.project_id=ir.project_id AND c.id=ir.target_case_id WHERE ir.project_id=? AND ir.batch_id=? AND ir.id=? AND c.owning_document_id=? AND c.archived_at IS NULL"+(lock?" FOR UPDATE":""),p,d,row,d);
        var detail=documents.get(p,user,d);
        var selected=detail.rows().stream().filter(value->Objects.equals(value.rowId(),row)).findFirst().orElseThrow(()->new vn.syp.tms.shared.web.BusinessException(404,"NOT_FOUND","Không tìm thấy case trong file này."));
        var result=new LinkedHashMap<String,Object>();result.put("featureId",f);result.put("featureName",feature.get("name"));result.put("documentId",d);result.put("fileName",document.get("fileName"));result.put("rowId",row);
        result.put("testCaseId",selected.caseId());result.put("revisionId",selected.revisionId());result.put("caseNo",text(selected.sourceId()).isEmpty()?selected.caseNo():selected.sourceId());
        result.put("title",cell(selected.cells(),detail.columns().getOrDefault("titleVi",2)));result.put("steps",cell(selected.cells(),detail.columns().getOrDefault("stepsVi",4)));result.put("expectedResult",cell(selected.cells(),detail.columns().getOrDefault("expectedVi",5)));return result;
    }
    private static String cell(List<String> cells,int index){return index>=0&&index<cells.size()?cells.get(index):"";}
    @Transactional(readOnly=true) public Map<String,Object> context(long p,String user,long f,long d,long row){authorize(p,user,false);return source(p,user,f,d,row,false);}

    @Transactional(readOnly=true) public WorkItemDtos.Page<Map<String,Object>> list(long p,String user,FeatureIssueDtos.Filter filter){
        var actor=authorize(p,user,false);
        if(filter.page()<0||filter.page()>100000||filter.size()<1||filter.size()>100||text(filter.keyword()).length()>255)fail(422,"INVALID_FILTER","Bộ lọc hoặc phân trang Issue không hợp lệ.");
        if(!text(filter.type()).isEmpty()&&!Set.of("BUG","QA").contains(filter.type()))fail(422,"INVALID_ISSUE_TYPE","Chỉ có Bug và QA.");
        if(!text(filter.status()).isEmpty()&&db.count("SELECT COUNT(*) FROM work_item_statuses WHERE code=?",filter.status())!=1)fail(422,"INVALID_FILTER","Trạng thái không hợp lệ.");
        String where=" WHERE w.project_id=? AND x.deleted_at IS NULL AND f.archived_at IS NULL AND (d.id IS NULL OR d.archived_at IS NULL) AND w.item_type IN ('BUG','QA')";var args=new ArrayList<Object>(List.of(p));
        Long[] ids={filter.featureId(),filter.documentId(),filter.rowId()};String[] fields={"x.feature_id","x.document_id","x.row_id"};
        for(int i=0;i<ids.length;i++)if(ids[i]!=null){if(ids[i]<1)fail(422,"INVALID_FILTER","Phạm vi Issue không hợp lệ.");where+=" AND "+fields[i]+"=?";args.add(ids[i]);}
        if(!text(filter.type()).isEmpty()){where+=" AND w.item_type=?";args.add(filter.type());}
        if(!text(filter.status()).isEmpty()){where+=" AND w.status_code=?";args.add(filter.status());}
        var search=MultiWordSearch.sql(filter.keyword(),"w.item_key","w.title","w.description","f.name","d.file_name");where+=search.sql();args.addAll(search.args());
        long total=db.count("SELECT COUNT(*) "+FROM+where,args.toArray());args.add(filter.size());args.add((long)filter.page()*filter.size());
        var rows=db.rows(SELECT+FROM+where+" ORDER BY w.updated_at DESC,w.id DESC LIMIT ? OFFSET ?",args.toArray());rows.forEach(row->capabilities(actor,row));
        return new WorkItemDtos.Page<>(rows,total,filter.page(),filter.size(),(int)((total+filter.size()-1)/filter.size()));
    }
    private Map<String,Object> item(long p,long id,boolean lock){
        if(lock)db.row("SELECT w.id,w.lock_version AS version FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id WHERE w.project_id=? AND w.id=? AND x.deleted_at IS NULL FOR UPDATE",p,id);
        return db.row(SELECT+FROM+" WHERE w.project_id=? AND w.id=? AND x.deleted_at IS NULL AND w.item_type IN ('BUG','QA')",p,id);
    }
    private void activeContext(long p,Map<String,Object> item){
        feature(p,number(item,"featureId"),true,true);
        if(item.get("documentId") instanceof Number document){var row=db.row("SELECT id,archived_at AS archivedAt FROM import_batches WHERE project_id=? AND feature_id=? AND id=? FOR UPDATE",p,item.get("featureId"),document.longValue());if(row.get("archivedAt")!=null)fail(409,"ARCHIVED","File đã lưu trữ.");}
    }
    private boolean ownMonkey(Actor actor,Map<String,Object> item){return actor.tester()&&Boolean.TRUE.equals(item.get("monkey"))&&actor.user().equals(item.get("createdByUserId"));}
    private boolean assigned(Actor actor,Map<String,Object> item){return actor.dev()&&item.get("assigneeMembershipId") instanceof Number member&&Objects.equals(actor.membership(),member.longValue());}
    private List<Map<String,Object>> statuses(Actor actor,Map<String,Object> item){
        if(!actor.manager()&&!ownMonkey(actor,item)&&!assigned(actor,item))return List.of();
        var values=db.rows("SELECT code AS id,label_vi AS label FROM work_item_statuses ORDER BY sort_order");
        return values.stream().filter(row->(!"QA".equals(item.get("type"))||QA_STATUSES.contains(row.get("id")))&&(!actor.dev()||Set.of("progress","resolved").contains(row.get("id")))).toList();
    }
    private void capabilities(Actor actor,Map<String,Object> item){
        boolean active=!actor.archived()&&item.get("featureArchivedAt")==null&&item.get("documentArchivedAt")==null;
        item.remove("featureArchivedAt");item.remove("documentArchivedAt");
        item.put("canEdit",active&&(actor.manager()||ownMonkey(actor,item)));item.put("canDelete",active&&Boolean.TRUE.equals(item.get("monkey"))&&(actor.manager()||ownMonkey(actor,item)));
        item.put("canAssign",active&&actor.manager());
        var allowed=active?statuses(actor,item):List.of();item.put("allowedStatuses",allowed);item.put("canTransition",!allowed.isEmpty());item.put("canComment",active&&(actor.manager()||actor.tester()||assigned(actor,item)));
    }
    private Map<String,Object> detail(long p,Actor actor,long id){var result=item(p,id,false);capabilities(actor,result);return result;}
    @Transactional(readOnly=true) public Map<String,Object> get(long p,String user,long id){return detail(p,authorize(p,user,false),id);}

    private void validate(String type,Long f,Long d,Long row,boolean monkey,String title,String description,String steps,String expected,String actual,UUID key){
        if((!"BUG".equals(type)&&!"QA".equals(type))||monkey&&!"BUG".equals(type)||f==null||f<1||key==null)fail(422,"INVALID_ISSUE","Issue cần Feature, loại Bug/QA và mã yêu cầu hợp lệ.");
        if((d==null)!=(row==null)||d!=null&&(d<1||row<1))fail(422,"INVALID_CONTEXT","File và case phải được chọn cùng nhau.");
        bounded(title,300,true);bounded(description,20000,"QA".equals(type));bounded(steps,20000,"BUG".equals(type));bounded(expected,20000,"BUG".equals(type));bounded(actual,20000,"BUG".equals(type));
    }
    private static void bounded(String value,int max,boolean required){if(text(value).length()>max||required&&text(value).isEmpty())fail(422,"INVALID_ISSUE","Kiểm tra các trường bắt buộc và độ dài nội dung Issue.");}
    public Map<String,Object> create(long p,String user,FeatureIssueDtos.Create input){
        validate(input.type(),input.featureId(),input.documentId(),input.rowId(),input.monkey(),input.title(),input.description(),input.steps(),input.expectedResult(),input.actualResult(),input.requestKey());
        var actor=authorize(p,user,true);if(!actor.manager()&&!actor.tester())fail(403,"FORBIDDEN","Chỉ Tester, PM hoặc Admin tạo Issue.");
        feature(p,input.featureId(),true,true);String checksum=db.checksum(input);
        var duplicate=db.rows("SELECT w.id,w.request_checksum AS checksum,x.created_by_user_id AS author FROM work_items w LEFT JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id WHERE w.project_id=? AND w.request_key=? FOR UPDATE",p,input.requestKey().toString());
        if(!duplicate.isEmpty()){var old=duplicate.getFirst();if(!user.equals(old.get("author"))||!checksum.equals(old.get("checksum")))fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã dùng cho nội dung hoặc người khác.");return detail(p,actor,number(old,"id"));}
        Map<String,Object> source=input.rowId()==null?Map.of():source(p,user,input.featureId(),input.documentId(),input.rowId(),true);
        db.update("INSERT INTO project_counters(project_id,counter_code,next_value) VALUES(?,'WORK_ITEM',1) ON DUPLICATE KEY UPDATE next_value=next_value",p);
        long next=db.count("SELECT next_value FROM project_counters WHERE project_id=? AND counter_code='WORK_ITEM' FOR UPDATE",p);
        String key=db.row("SELECT code FROM projects WHERE id=?",p).get("code")+"-"+next;
        long id=db.insert("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,status_code,priority_code,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,?,?,?,?,?,'open','MEDIUM',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,?)",p,next,key,input.type(),text(input.title()),text(input.description()),actor.membership(),actor.membership(),input.requestKey().toString(),checksum);
        db.update("UPDATE project_counters SET next_value=next_value+1 WHERE project_id=? AND counter_code='WORK_ITEM'",p);
        db.update("INSERT INTO work_item_feature_context(project_id,work_item_id,feature_id,document_id,row_id,monkey,created_by_user_id) VALUES(?,?,?,?,?,?,?)",p,id,input.featureId(),input.documentId(),input.rowId(),input.monkey(),user);
        if("BUG".equals(input.type()))db.update("INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,test_case_id,revision_id,standalone_reason,context_snapshot) VALUES(?,?,'INTERNAL_V1',?,?,?,?,?,?,?)",p,id,text(input.steps()),text(input.expectedResult()),text(input.actualResult()),source.get("testCaseId"),source.get("revisionId"),source.isEmpty()?"Issue phát hiện trong Feature":"",db.encode(source));
        else {var qaSource=new LinkedHashMap<String,Object>(source);qaSource.put("steps",text(input.steps()));qaSource.put("expectedResult",text(input.expectedResult()));qaSource.put("actualResult",text(input.actualResult()));db.update("INSERT INTO qa_details(project_id,work_item_id,question,document_id,test_case_id,revision_id,context_snapshot) VALUES(?,?,?,?,?,?,?)",p,id,text(input.description()),input.documentId(),source.get("testCaseId"),source.get("revisionId"),db.encode(qaSource));}
        var result=detail(p,actor,id);record(p,id,user,"CREATE",null,snapshot(result));audit.record(p,user,"WORK_ITEM",id,"CREATE");return result;
    }
    private void assignment(long p,Long id){if(id!=null&&db.rows("SELECT m.id FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.id=? AND m.active=TRUE AND m.project_role='DEV' AND u.role_code='DEV' AND u.enabled=TRUE FOR SHARE",p,id).isEmpty())fail(422,"INVALID_ASSIGNEE","Người được giao phải là DEV đang hoạt động của dự án.");}
    public Map<String,Object> update(long p,String user,long id,FeatureIssueDtos.Update input){
        var actor=authorize(p,user,true);var old=item(p,id,true);activeContext(p,old);version(old,input.expectedVersion());
        if(!actor.manager()&&!ownMonkey(actor,old))fail(403,"FORBIDDEN","Chỉ PM/Admin hoặc Tester tạo Bug monkey được sửa nội dung.");
        bounded(input.title(),300,true);bounded(input.description(),20000,"QA".equals(old.get("type")));boolean bug="BUG".equals(old.get("type"));bounded(input.steps(),20000,bug);bounded(input.expectedResult(),20000,bug);bounded(input.actualResult(),20000,bug);
        Object assigned=old.get("assigneeMembershipId"),priority=old.get("priority");
        if(actor.manager()){assignment(p,input.assigneeMembershipId());assigned=input.assigneeMembershipId();if(input.priority()!=null)priority=input.priority();}
        else if(input.assigneeMembershipId()!=null&&!Objects.equals(input.assigneeMembershipId(),assigned)||input.priority()!=null&&!input.priority().equals(priority))fail(403,"FORBIDDEN","Chỉ PM/Admin được phân công hoặc đổi ưu tiên.");
        if(!Set.of("HIGH","MEDIUM","LOW").contains(priority))fail(422,"INVALID_ISSUE","Mức ưu tiên không hợp lệ.");
        int changed=db.update("UPDATE work_items SET title=?,description=?,priority_code=?,assignee_membership_id=?,updated_by=?,updated_at=UTC_TIMESTAMP(6),lock_version=lock_version+1 WHERE project_id=? AND id=? AND lock_version=?",text(input.title()),text(input.description()),priority,assigned,actor.membership(),p,id,input.expectedVersion());if(changed!=1)fail(409,"VERSION_CONFLICT","Issue đã thay đổi. Tải lại để đối chiếu.");
        if(bug)db.update("UPDATE bug_details SET steps=?,expected_result=?,actual_result=? WHERE project_id=? AND work_item_id=?",text(input.steps()),text(input.expectedResult()),text(input.actualResult()),p,id);
        else db.update("UPDATE qa_details SET question=?,context_snapshot=JSON_SET(context_snapshot,'$.steps',?,'$.expectedResult',?,'$.actualResult',?) WHERE project_id=? AND work_item_id=?",text(input.description()),text(input.steps()),text(input.expectedResult()),text(input.actualResult()),p,id);
        var result=detail(p,actor,id);var after=snapshot(result);if(!text(input.reason()).isEmpty())after.put("reason",text(input.reason()));record(p,id,user,"UPDATE",snapshot(old),after);audit.record(p,user,"WORK_ITEM",id,"UPDATE");return result;
    }
    public Map<String,Object> transition(long p,String user,long id,FeatureIssueDtos.Status input){
        var actor=authorize(p,user,true);var old=item(p,id,true);activeContext(p,old);version(old,input.expectedVersion());bounded(input.reason(),1000,true);
        if(text(input.status()).isEmpty()||db.count("SELECT COUNT(*) FROM work_item_statuses WHERE code=?",input.status())!=1||"QA".equals(old.get("type"))&&!QA_STATUSES.contains(input.status()))fail(422,"INVALID_STATUS","Trạng thái Issue không hợp lệ.");
        if(statuses(actor,old).stream().noneMatch(value->input.status().equals(value.get("id"))))fail(403,"FORBIDDEN","Không có quyền chuyển sang trạng thái này.");
        int changed=db.update("UPDATE work_items SET status_code=?,updated_by=?,updated_at=UTC_TIMESTAMP(6),lock_version=lock_version+1 WHERE project_id=? AND id=? AND lock_version=?",input.status(),actor.membership(),p,id,input.expectedVersion());if(changed!=1)fail(409,"VERSION_CONFLICT","Issue đã thay đổi. Tải lại để đối chiếu.");
        var result=detail(p,actor,id);var after=snapshot(result);after.put("reason",text(input.reason()));record(p,id,user,"STATUS",snapshot(old),after);audit.record(p,user,"WORK_ITEM",id,"STATUS");return result;
    }
    public void remove(long p,String user,long id,long expectedVersion){
        var actor=authorize(p,user,true);var old=item(p,id,true);activeContext(p,old);version(old,expectedVersion);
        if(!Boolean.TRUE.equals(old.get("monkey"))||!actor.manager()&&!ownMonkey(actor,old))fail(403,"FORBIDDEN","Chỉ PM/Admin hoặc Tester tạo Bug monkey được xóa mềm Bug monkey.");
        db.update("UPDATE work_item_feature_context SET deleted_at=UTC_TIMESTAMP(6) WHERE project_id=? AND work_item_id=?",p,id);bump(p,id,actor);
        record(p,id,user,"DELETE",snapshot(old),Map.of("deleted",true));audit.record(p,user,"WORK_ITEM",id,"ARCHIVE");
    }
    private void bump(long p,long id,Actor actor){db.update("UPDATE work_items SET lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=?",actor.membership(),p,id);}
    private Map<String,Object> snapshot(Map<String,Object> item){var value=new LinkedHashMap<String,Object>();for(String key:List.of("id","key","type","title","description","status","priority","assigneeMembershipId","featureId","documentId","rowId","monkey","steps","expectedResult","actualResult","version"))value.put(key,item.get(key));return value;}
    private long record(long p,long id,String user,String event,Object before,Object after){return db.insert("INSERT INTO work_item_feature_history(project_id,work_item_id,event_type,before_json,after_json,actor_user_id,created_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,event,before==null?null:db.encode(before),db.encode(after),user);}
    private static final String HISTORY="SELECT h.id,h.event_type AS eventType,h.before_json AS beforeJson,h.after_json AS afterJson,h.actor_user_id AS actorId,u.display_name AS actorName,h.created_at AS createdAt FROM work_item_feature_history h JOIN identity_users u ON u.id=h.actor_user_id WHERE h.project_id=? AND h.work_item_id=?";
    private void historyAccess(long p,long id){db.row("SELECT work_item_id FROM work_item_feature_context WHERE project_id=? AND work_item_id=?",p,id);}
    private Map<String,Object> decode(Object value){if(value==null)return new LinkedHashMap<>();try{return json.readValue(String.valueOf(value),new TypeReference<LinkedHashMap<String,Object>>(){});}catch(Exception e){throw new IllegalStateException("Invalid saved issue history",e);}}
    private Map<String,Object> publicHistory(Map<String,Object> row){var before=decode(row.remove("beforeJson"));var after=decode(row.remove("afterJson"));after.remove("requestKey");after.remove("requestChecksum");row.put("before",before);row.put("after",after);if(after.containsKey("body"))row.put("body",after.get("body"));if(after.containsKey("reason"))row.put("reason",after.get("reason"));if(after.containsKey("version"))row.put("version",after.get("version"));return row;}
    @Transactional(readOnly=true) public List<Map<String,Object>> history(long p,String user,long id){var actor=authorize(p,user,false);historyAccess(p,id);String filter=actor.dev()&&!assigned(actor,db.row("SELECT assignee_membership_id AS assigneeMembershipId FROM work_items WHERE project_id=? AND id=?",p,id))?" AND h.event_type<>'COMMENT'":"";return db.rows(HISTORY+filter+" ORDER BY h.id",p,id).stream().map(this::publicHistory).toList();}
    @Transactional(readOnly=true) public List<Map<String,Object>> comments(long p,String user,long id){var actor=authorize(p,user,false);historyAccess(p,id);if(actor.dev()&&!assigned(actor,db.row("SELECT assignee_membership_id AS assigneeMembershipId FROM work_items WHERE project_id=? AND id=?",p,id)))fail(403,"FORBIDDEN","Dev chỉ xem ghi chú Issue được giao.");return db.rows(HISTORY+" AND h.event_type='COMMENT' ORDER BY h.id",p,id).stream().map(this::publicHistory).toList();}
    public Map<String,Object> comment(long p,String user,long id,FeatureIssueDtos.Comment input){
        bounded(input.body(),20000,true);if(input.requestKey()==null)fail(422,"INVALID_ISSUE","Thiếu mã yêu cầu.");
        var actor=authorize(p,user,true);var old=item(p,id,true);activeContext(p,old);
        if(!actor.manager()&&!actor.tester()&&!assigned(actor,old))fail(403,"FORBIDDEN","Bạn không có quyền ghi chú Issue này.");
        String checksum=db.checksum(input);var replay=db.rows(HISTORY+" AND h.event_type='COMMENT' AND JSON_UNQUOTE(JSON_EXTRACT(h.after_json,'$.requestKey'))=?",p,id,input.requestKey().toString());
        if(!replay.isEmpty()){var result=replay.getFirst();var after=decode(result.get("afterJson"));if(!user.equals(result.get("actorId"))||!checksum.equals(after.get("requestChecksum")))fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã dùng cho ghi chú khác.");return publicHistory(result);}
        version(old,input.expectedVersion());bump(p,id,actor);var after=new LinkedHashMap<String,Object>();after.put("body",text(input.body()));after.put("requestKey",input.requestKey().toString());after.put("requestChecksum",checksum);after.put("version",number(old,"version")+1);
        long history=record(p,id,user,"COMMENT",null,after);audit.record(p,user,"WORK_ITEM",id,"COMMENT");return publicHistory(db.row(HISTORY+" AND h.id=?",p,id,history));
    }
}
