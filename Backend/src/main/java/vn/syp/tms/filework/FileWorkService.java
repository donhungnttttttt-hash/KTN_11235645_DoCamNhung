package vn.syp.tms.filework;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.reporting.ReportMetrics;
import static vn.syp.tms.workitem.WorkItemStore.*;
import vn.syp.tms.workitem.WorkItemStore;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.execution.ExecutionService;
import vn.syp.tms.project.ProjectAudit;

@Service
@Transactional
public class FileWorkService {
    private final WorkItemStore db;
    private final IdentityService identity;
    private final ExecutionService execution;
    private final ProjectAudit audit;
    private final ObjectMapper json;
    private final FileWorkSessionService sessions;
    public FileWorkService(WorkItemStore db,IdentityService identity,ExecutionService execution,ProjectAudit audit,ObjectMapper json,FileWorkSessionService sessions) {
        this.db=db;this.identity=identity;this.execution=execution;this.audit=audit;this.json=json;this.sessions=sessions;
    }
    public record Actor(long membershipId,boolean pm,boolean tester,boolean archived) {}

    /** Current locking projections: never authorize from a repeatable-read JPA snapshot. */
    public Actor guard(long p,String actor,boolean pmWrite) {
        positive(p);
        var account=identity.lockCurrent(actor);
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth!=null && auth.getPrincipal() instanceof SessionPrincipal principal) {
            var current=db.row("SELECT lock_version AS version FROM identity_users WHERE id=? AND enabled=TRUE FOR SHARE",actor);
            if(!principal.id().equals(actor) || principal.version()!=number(current,"version")) fail(401,"UNAUTHENTICATED","Phiên đăng nhập đã thay đổi.");
        }
        var project=db.row("SELECT id,archived_at AS archivedAt FROM projects WHERE id=? FOR UPDATE",p);
        var member=db.row("SELECT id,project_role AS projectRole FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE FOR UPDATE",p,actor);
        boolean pm="PM".equals(member.get("projectRole")) && !"DEV".equals(account.getRole());
        boolean tester="TESTER".equals(member.get("projectRole")) && !"DEV".equals(account.getRole());
        boolean archived=project.get("archivedAt")!=null;
        if(pmWrite && !pm) fail(403,"FORBIDDEN","Chỉ PM hiện hành của dự án được giao file.");
        if(pmWrite && archived) fail(409,"ARCHIVED","Dự án đã được lưu trữ.");
        return new Actor(number(member,"id"),pm,tester,archived);
    }

    /** Current permissions for an empty list; scoped group/session capabilities remain separate. */
    public Map<String,Object> metadata(long p,String actor) {
        var caller=guard(p,actor,false);
        return Map.of("canCreate",caller.pm()&&!caller.archived(),"canViewMine",caller.tester(),
            "canReadAll",true,"membershipId",caller.membershipId(),"archived",caller.archived());
    }

    public Map<String,Object> preview(long p,String actor,FileWorkDtos.Scope input) {
        guard(p,actor,true);
        var cycle=scopeContext(p,input);
        return inspect(p,input,cycle);
    }

    public Map<String,Object> create(long p,String actor,FileWorkDtos.Create input) {
        var caller=guard(p,actor,true); key(input.requestKey());
        var cycle=scopeContext(p,input.scope());
        requireCommittedDocument(p,input.documentId());
        // Resource usability remains current even when an exact command bypasses old versions/state.
        var source=sourceRows(p,input.scope());
        validateSourceForReplay(input.scope(),source);
        String checksum=db.checksum(List.of("CREATE",p,input));
        var replay=replay(p,caller.membershipId(),"CREATE",null,input.requestKey(),checksum);
        if(replay!=null) return replay;
        var preview=inspect(p,input.scope(),cycle);
        @SuppressWarnings("unchecked") var errors=(List<Map<String,Object>>)preview.get("errors");
        if(!errors.isEmpty()) {
            String code=String.valueOf(errors.getFirst().get("code"));
            fail(Set.of("VERSION_CONFLICT","DUPLICATE_SCOPE","FILE_GROUP_EXISTS").contains(code)?409:422,code,String.valueOf(errors.getFirst().get("message")));
        }
        long nextVersion=number(cycle,"version");
        for(int start=0;start<input.revisionIds().size();start+=100) {
            var chunk=List.copyOf(input.revisionIds().subList(start,Math.min(start+100,input.revisionIds().size())));
            var updated=execution.addScope(p,actor,input.cycleId(),new vn.syp.tms.execution.ExecutionDtos.AddScope(input.configurationId(),chunk,input.assigneeMembershipId(),nextVersion));
            nextVersion=number(updated,"version");
        }
        long id=db.insert("INSERT INTO file_work_groups(project_id,document_id,cycle_id,configuration_id,created_by,created_at,updated_by,updated_at,request_key,request_checksum) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?,?)",p,input.documentId(),input.cycleId(),input.configurationId(),caller.membershipId(),caller.membershipId(),input.requestKey(),checksum);
        for(var selected:source) {
            var run=db.row("SELECT id FROM run_items WHERE project_id=? AND cycle_id=? AND configuration_id=? AND test_case_id=? AND revision_id=?",p,input.cycleId(),input.configurationId(),number(selected,"testCaseId"),number(selected,"revisionId"));
            db.update("INSERT INTO file_work_group_items(project_id,group_id,document_id,cycle_id,configuration_id,import_row_id,run_item_id,test_case_id,revision_id) VALUES(?,?,?,?,?,?,?,?,?)",p,id,input.documentId(),input.cycleId(),input.configurationId(),number(selected,"importRowId"),number(run,"id"),number(selected,"testCaseId"),number(selected,"revisionId"));
        }
        historyWrite(p,id,caller.membershipId(),"CREATE",0,"Phân công file ban đầu",Map.of("revisionIds",input.revisionIds()));
        audit.record(p,actor,"FILE_WORK_GROUP",id,"CREATE");
        var response=readDetail(p,caller,id);
        command(p,id,caller.membershipId(),"CREATE",input.requestKey(),checksum,response);
        return response;
    }

    private Map<String,Object> scopeContext(long p,FileWorkDtos.Scope input) {
        positive(input.documentId());positive(input.cycleId());positive(input.configurationId());positive(input.assigneeMembershipId());nonnegative(input.expectedCycleVersion());
        if(input.revisionIds()==null || input.revisionIds().isEmpty() || input.revisionIds().size()>500) fail(422,"SCOPE_LIMIT","Chọn từ 1 đến 500 phiên bản.");
        input.revisionIds().forEach(FileWorkService::positive);
        db.row("SELECT id,status FROM import_batches WHERE project_id=? AND id=?",p,input.documentId());
        var cycle=db.row("SELECT id,status_code AS statusCode,lock_version AS version FROM test_cycles WHERE project_id=? AND id=?",p,input.cycleId());
        db.row("SELECT cf.id FROM cycle_configurations cf JOIN environments e ON e.project_id=cf.project_id AND e.id=cf.environment_id AND e.active=TRUE JOIN devices d ON d.project_id=cf.project_id AND d.id=cf.device_id AND d.active=TRUE JOIN builds b ON b.project_id=cf.project_id AND b.id=cf.default_build_id AND b.archived_at IS NULL WHERE cf.project_id=? AND cf.cycle_id=? AND cf.id=?",p,input.cycleId(),input.configurationId());
        eligibleTester(p,input.assigneeMembershipId());return cycle;
    }
    private void eligibleTester(long p,long id) {
        db.row("SELECT m.id FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.id=? AND m.active=TRUE AND m.project_role='TESTER' AND u.enabled=TRUE AND u.role_code<>'DEV' FOR SHARE",p,id);
    }
    private List<Map<String,Object>> sourceRows(long p,FileWorkDtos.Scope input) {
        String marks=String.join(",",Collections.nCopies(input.revisionIds().size(),"?"));
        var args=new ArrayList<Object>(List.of(input.documentId(),input.cycleId(),input.configurationId(),p));args.addAll(input.revisionIds());
        return db.rows("""
            SELECT ir.id AS importRowId,ir.source_row_number AS rowNumber,c.id AS testCaseId,rv.id AS revisionId,c.case_no AS caseNo,
            (rv.approved_at IS NOT NULL AND c.archived_at IS NULL AND s.archived_at IS NULL AND ir.is_valid=TRUE) AS approved,
            r.id AS existingRunItemId,r.lock_version AS existingRunVersion
            FROM test_case_revisions rv JOIN test_cases c ON c.project_id=rv.project_id AND c.id=rv.test_case_id
            JOIN test_suites s ON s.project_id=c.project_id AND s.id=c.suite_id
            JOIN import_rows ir ON ir.project_id=c.project_id AND ir.target_case_id=c.id AND ir.batch_id=?
            LEFT JOIN run_items r ON r.project_id=c.project_id AND r.test_case_id=c.id AND r.cycle_id=? AND r.configuration_id=?
            WHERE rv.project_id=? AND rv.id IN (
            """+marks+") ORDER BY ir.source_row_number,ir.id,rv.id",args.toArray());
    }
    private void validateSourceForReplay(FileWorkDtos.Scope input,List<Map<String,Object>> rows) {
        if(new HashSet<>(input.revisionIds()).size()!=input.revisionIds().size()) fail(422,"INVALID_SCOPE","Không chọn trùng phiên bản.");
        var ids=new HashSet<Long>();var cases=new HashSet<Long>();
        for(var row:rows) {
            if(!ids.add(number(row,"revisionId")) || !cases.add(number(row,"testCaseId"))) fail(422,"INVALID_SCOPE","Mỗi case phải ánh xạ duy nhất một dòng nguồn và một phiên bản.");
            if(!ReportMetrics.excluded(row.get("approved"))) fail(422,"REVISION_NOT_APPROVED","Chỉ dùng phiên bản đã duyệt của case và suite đang hoạt động.");
        }
        if(ids.size()!=input.revisionIds().size()) fail(404,"NOT_FOUND","Không tìm thấy dòng nguồn của phiên bản trong tài liệu đã chọn.");
    }
    private void requireCommittedDocument(long p,long document) {
        if(!"COMMITTED".equals(db.row("SELECT id,status FROM import_batches WHERE project_id=? AND id=?",p,document).get("status")))fail(422,"INVALID_SCOPE","Tài liệu phải được import hoàn tất.");
    }
    private Map<String,Object> inspect(long p,FileWorkDtos.Scope input,Map<String,Object> cycle) {
        var items=sourceRows(p,input);var errors=new ArrayList<Map<String,Object>>();
        var document=db.row("SELECT id,status FROM import_batches WHERE project_id=? AND id=?",p,input.documentId());
        if(!"COMMITTED".equals(document.get("status"))) scopeError(errors,"INVALID_SCOPE","Tài liệu phải được import hoàn tất.",null);
        if(!"DRAFT".equals(cycle.get("statusCode"))) scopeError(errors,"INVALID_SCOPE","Chỉ thêm scope trong đợt DRAFT.",null);
        if(number(cycle,"version")!=input.expectedCycleVersion()) scopeError(errors,"VERSION_CONFLICT","Đợt kiểm thử đã thay đổi; tải lại trước khi giao file.",null);
        if(db.count("SELECT COUNT(*) FROM run_items WHERE project_id=? AND cycle_id=?",p,input.cycleId())+input.revisionIds().size()>500 || db.count("SELECT COUNT(*) FROM cycle_configurations WHERE project_id=? AND cycle_id=?",p,input.cycleId())>50) scopeError(errors,"SCOPE_LIMIT","Tối đa 500 lượt kiểm thử và 50 cấu hình trong một đợt.",null);
        if(!db.rows("SELECT id FROM file_work_groups WHERE project_id=? AND document_id=? AND cycle_id=? AND configuration_id=?",p,input.documentId(),input.cycleId(),input.configurationId()).isEmpty()) scopeError(errors,"FILE_GROUP_EXISTS","Tài liệu đã được giao trong cấu hình và đợt này.",null);
        var ids=new HashSet<Long>();var cases=new HashSet<Long>();
        for(var row:items) {
            if(!ids.add(number(row,"revisionId")) || !cases.add(number(row,"testCaseId"))) scopeError(errors,"INVALID_SCOPE","Một case chỉ được chọn một phiên bản và một dòng nguồn.",row);
            row.put("approved",ReportMetrics.excluded(row.get("approved")));
            if(!Boolean.TRUE.equals(row.get("approved"))) scopeError(errors,"REVISION_NOT_APPROVED","Phiên bản chưa duyệt hoặc case/suite đã lưu trữ.",row);
            if(row.get("existingRunItemId")!=null) scopeError(errors,"DUPLICATE_SCOPE","Case đã có run trong cấu hình; không tái dùng hoặc thay revision pin.",row);
        }
        for(long id:input.revisionIds()) if(!ids.contains(id)) scopeError(errors,"INVALID_SCOPE","Phiên bản không thuộc tài liệu của dự án.",Map.of("revisionId",id));
        if(new HashSet<>(input.revisionIds()).size()!=input.revisionIds().size()) scopeError(errors,"INVALID_SCOPE","Không chọn trùng phiên bản.",null);
        var result=new LinkedHashMap<String,Object>();result.put("documentId",input.documentId());result.put("cycleId",input.cycleId());result.put("configurationId",input.configurationId());result.put("cycleVersion",number(cycle,"version"));result.put("valid",errors.isEmpty());result.put("selectedCount",input.revisionIds().size());result.put("items",items);result.put("errors",errors);return result;
    }
    private static void scopeError(List<Map<String,Object>> errors,String code,String message,Map<String,Object> row) {
        var value=new LinkedHashMap<String,Object>();value.put("code",code);value.put("message",message);
        if(row!=null) { if(row.get("importRowId")!=null)value.put("importRowId",row.get("importRowId"));if(row.get("revisionId")!=null)value.put("revisionId",row.get("revisionId")); }errors.add(value);
    }

    public Map<String,Object> detail(long p,String actor,long id) { return readDetail(p,guard(p,actor,false),id); }
    /** Reuse the canonical selected-build counts and capability projection for the pinned execution view. */
    public Map<String,Object> executionSummary(long p,String actor,long id,long buildId) {
        var caller=guard(p,actor,false);
        return summary(p,caller,group(p,id,false),items(p,id,false),buildId);
    }
    private Map<String,Object> readDetail(long p,Actor caller,long id) {
        var group=group(p,id,false);var items=items(p,id,false);
        return Map.of("group",summary(p,caller,group,items,null),"items",items,"sessions",sessionRows(p,id,caller,group));
    }
    public Map<String,Object> group(long p,long id,boolean lock) {
        positive(id);
        return db.row("""
            SELECT g.id,g.project_id AS projectId,g.document_id AS documentId,ib.file_name AS fileName,g.cycle_id AS cycleId,
            c.name AS cycleName,c.lock_version AS cycleVersion,c.status_code AS cycleStatus,g.configuration_id AS configurationId,
            cf.environment_id AS environmentId,cf.device_id AS deviceId,cf.default_build_id AS defaultBuildId,
            g.lock_version AS version,g.updated_at AS updatedAt,
            ms.id AS milestoneId,ms.name AS milestoneName,DATE_FORMAT(ms.due_on,'%Y-%m-%d') AS milestoneDueOn,
            GREATEST(g.updated_at,
                COALESCE((SELECT MAX(a.executed_at) FROM file_work_group_items i
                    JOIN execution_attempts a ON a.project_id=i.project_id AND a.run_item_id=i.run_item_id
                    WHERE i.project_id=g.project_id AND i.group_id=g.id),g.updated_at),
                COALESCE((SELECT MAX(s.last_transition_at) FROM file_work_sessions s
                    WHERE s.project_id=g.project_id AND s.group_id=g.id),g.updated_at)) AS latestActivityAt
            FROM file_work_groups g JOIN import_batches ib ON ib.project_id=g.project_id AND ib.id=g.document_id
            JOIN test_cycles c ON c.project_id=g.project_id AND c.id=g.cycle_id
            LEFT JOIN milestones ms ON ms.project_id=c.project_id AND ms.id=c.milestone_id
            JOIN cycle_configurations cf ON cf.project_id=g.project_id AND cf.cycle_id=g.cycle_id AND cf.id=g.configuration_id
            WHERE g.project_id=? AND g.id=?
            """+(lock?" FOR UPDATE":""),p,id);
    }
    public List<Map<String,Object>> items(long p,long id,boolean lock) {
        // Lock canonical runs in stable ID order before reading the detail projection.
        if(lock) db.rows("SELECT r.id FROM run_items r JOIN file_work_group_items i ON i.project_id=r.project_id AND i.run_item_id=r.id WHERE i.project_id=? AND i.group_id=? ORDER BY r.id FOR UPDATE",p,id);
        var rows=db.rows("""
            SELECT i.import_row_id AS importRowId,ir.source_row_number AS rowNumber,i.run_item_id AS runItemId,
            i.test_case_id AS testCaseId,i.revision_id AS revisionId,c.case_no AS caseNo,r.lock_version AS runVersion,
            r.assignee_membership_id AS assigneeMembershipId,u.display_name AS assigneeName,
            COALESCE(sd.excluded,FALSE) AS excluded,sd.reason AS scopeReason
            FROM file_work_group_items i JOIN import_rows ir ON ir.project_id=i.project_id AND ir.batch_id=i.document_id AND ir.id=i.import_row_id AND ir.target_case_id=i.test_case_id
            JOIN run_items r ON r.project_id=i.project_id AND r.cycle_id=i.cycle_id AND r.configuration_id=i.configuration_id AND r.id=i.run_item_id AND r.test_case_id=i.test_case_id AND r.revision_id=i.revision_id
            JOIN test_cases c ON c.project_id=r.project_id AND c.id=r.test_case_id
            JOIN project_memberships m ON m.project_id=r.project_id AND m.id=r.assignee_membership_id JOIN identity_users u ON u.id=m.user_id
            LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id
            WHERE i.project_id=? AND i.group_id=? ORDER BY ir.source_row_number,i.run_item_id
            """,p,id);
        rows.forEach(row->row.put("excluded",ReportMetrics.excluded(row.get("excluded"))));return rows;
    }
    private List<Map<String,Object>> sessionRows(long p,long id,Actor caller,Map<String,Object> group) {
        var sessions=db.rows("""
            SELECT s.id,s.project_id AS projectId,s.group_id AS groupId,s.executor_membership_id AS executorMembershipId,
            u.display_name AS executorName,s.allocation_id AS allocationId,s.asset_id AS assetId,
            a.asset_code AS assetCode,s.build_id AS buildId,s.state,s.lock_version AS version,g.lock_version AS groupVersion,
            s.context_snapshot AS contextSnapshot,s.started_at AS startedAt,s.last_transition_at AS lastTransitionAt,s.ended_at AS endedAt
            FROM file_work_sessions s JOIN file_work_groups g ON g.project_id=s.project_id AND g.id=s.group_id
            JOIN project_memberships m ON m.project_id=s.project_id AND m.id=s.executor_membership_id JOIN identity_users u ON u.id=m.user_id
            JOIN device_assets a ON a.id=s.asset_id WHERE s.project_id=? AND s.group_id=? ORDER BY s.id DESC LIMIT 100
            """,p,id);
        sessions.forEach(s->{
            Object snapshot=parse(s.get("contextSnapshot"));s.put("contextSnapshot",snapshot);
            if(snapshot instanceof Map<?,?> context && context.get("physicalAsset") instanceof Map<?,?> asset) s.put("assetCode",asset.get("assetCode"));
            if(snapshot instanceof Map<?,?> context && context.get("executor") instanceof Map<?,?> executor) s.put("executorName",executor.get("displayName"));
            s.put("capabilities",this.sessions.capabilities(p,sessionActor(caller),group,s));
        });return sessions;
    }
    private Map<String,Object> summary(long p,Actor caller,Map<String,Object> group,List<Map<String,Object>> items,Long selectedBuild) {
        var value=new LinkedHashMap<>(group);value.remove("cycleStatus");
        var sessionValues=sessionRows(p,number(group,"id"),caller,group);var latest=sessionValues.isEmpty()?null:sessionValues.getFirst();
        long build=selectedBuild!=null?selectedBuild:latest==null?number(group,"defaultBuildId"):number(latest,"buildId");
        value.put("selectedBuildId",build);value.put("state",latest==null?"READY":latest.get("state"));
        for(String field:List.of("currentSessionId","assetId","assetCode","startedAt")) value.put(field,latest==null?null:latest.get("currentSessionId".equals(field)?"id":field));
        var assignees=items.stream().map(i->number(i,"assigneeMembershipId")).distinct().toList();boolean consistent=assignees.size()==1;
        value.put("assignmentState",consistent?"CONSISTENT":"MIXED");value.put("assigneeMembershipId",consistent?assignees.getFirst():null);value.put("assigneeName",consistent?items.getFirst().get("assigneeName"):null);
        var results=db.rows("""
            SELECT COALESCE(sd.excluded,FALSE) AS excluded,COALESCE(a.result_code,'NOT_RUN') AS resultCode
            FROM file_work_group_items i JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id
            LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id
            LEFT JOIN execution_attempts a ON a.project_id=r.project_id AND a.run_item_id=r.id AND a.build_id=?
            AND a.id=(SELECT MAX(x.id) FROM execution_attempts x WHERE x.project_id=r.project_id AND x.run_item_id=r.id AND x.build_id=?)
            WHERE i.project_id=? AND i.group_id=?
            """,build,build,p,number(group,"id"));
        var metrics=ReportMetrics.calculate(results);var counts=new LinkedHashMap<String,Object>();
        for(String key:List.of("total","notRun","ok","ng","na"))counts.put(key,metrics.get(key));counts.put("p",metrics.get("pending"));counts.put("executionRate",metrics.get("executionPercent"));counts.put("passRate",metrics.get("passPercent"));
        value.put("caseCount",items.size());value.put("counts",counts);
        value.put("openBugCount",db.count("SELECT COUNT(DISTINCT w.id) FROM file_work_group_items i JOIN work_item_execution_links l ON l.project_id=i.project_id AND l.run_item_id=i.run_item_id JOIN execution_attempts a ON a.project_id=l.project_id AND a.id=l.attempt_id AND a.build_id=? JOIN work_items w ON w.project_id=l.project_id AND w.id=l.work_item_id JOIN work_item_statuses st ON st.code=w.status_code WHERE i.project_id=? AND i.group_id=? AND w.item_type='BUG' AND st.terminal=FALSE",build,p,number(group,"id")));
        value.put("pendingRetestCount",db.count("SELECT COUNT(DISTINCT rr.id) FROM file_work_group_items i JOIN retest_request_items ri ON ri.project_id=i.project_id AND ri.run_item_id=i.run_item_id JOIN retest_requests rr ON rr.project_id=ri.project_id AND rr.id=ri.request_id JOIN bug_retest_state bs ON bs.project_id=rr.project_id AND bs.work_item_id=rr.work_item_id AND bs.current_coverage_id=rr.coverage_revision_id AND bs.round_no=rr.round_no WHERE i.project_id=? AND i.group_id=? AND rr.build_id=? AND rr.status='OPEN'",p,number(group,"id"),build));
        boolean canAssign=caller.pm() && !caller.archived() && !"CLOSED".equals(group.get("cycleStatus")) && sessionValues.stream().noneMatch(s->List.of("DOING","PAUSED").contains(s.get("state")));
        var caps=new LinkedHashMap<>(sessions.capabilities(p,sessionActor(caller),group,latest));caps.put("canAssign",canAssign);
        value.put("capabilities",caps);return value;
    }
    private FileWorkGuard.Actor sessionActor(Actor caller){return new FileWorkGuard.Actor(caller.membershipId(),caller.pm(),caller.tester(),caller.archived());}

    public FileWorkDtos.Page<Map<String,Object>> list(long p,String actor,FileWorkDtos.Filter filter) {
        var caller=guard(p,actor,false);paging(filter.page(),filter.size());
        for(Long id:Arrays.asList(filter.documentId(),filter.cycleId(),filter.assigneeMembershipId(),filter.buildId()))if(id!=null)positive(id);
        if(filter.state()!=null && !List.of("READY","DOING","PAUSED","COMPLETED","CANCELLED").contains(filter.state()))fail(422,"INVALID_SCOPE","Trạng thái nhóm không hợp lệ.");
        if(filter.keyword()!=null && filter.keyword().length()>255)fail(422,"INVALID_SCOPE","Tên file tối đa 255 ký tự.");
        String where=" WHERE g.project_id=?";var args=new ArrayList<Object>(List.of(p));
        if(filter.documentId()!=null){where+=" AND g.document_id=?";args.add(filter.documentId());}
        if(filter.cycleId()!=null){where+=" AND g.cycle_id=?";args.add(filter.cycleId());}
        if(filter.keyword()!=null && !filter.keyword().isBlank()){where+=" AND LOCATE(?,ib.file_name)>0";args.add(filter.keyword().trim());}
        if(filter.mine() || filter.assigneeMembershipId()!=null){where+=" AND EXISTS(SELECT 1 FROM file_work_group_items i WHERE i.project_id=g.project_id AND i.group_id=g.id) AND NOT EXISTS(SELECT 1 FROM file_work_group_items i JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id WHERE i.project_id=g.project_id AND i.group_id=g.id AND r.assignee_membership_id<>?)";args.add(filter.mine()?caller.membershipId():filter.assigneeMembershipId());}
        if(filter.mine() && filter.assigneeMembershipId()!=null && filter.assigneeMembershipId()!=caller.membershipId()){where+=" AND 1=0";}
        if(filter.buildId()!=null){where+=" AND (EXISTS(SELECT 1 FROM file_work_sessions s WHERE s.project_id=g.project_id AND s.group_id=g.id AND s.build_id=?) OR EXISTS(SELECT 1 FROM file_work_group_items i JOIN execution_attempts a ON a.project_id=i.project_id AND a.run_item_id=i.run_item_id WHERE i.project_id=g.project_id AND i.group_id=g.id AND a.build_id=?))";args.add(filter.buildId());args.add(filter.buildId());}
        if(filter.state()!=null){where+=" AND COALESCE((SELECT s.state FROM file_work_sessions s WHERE s.project_id=g.project_id AND s.group_id=g.id ORDER BY s.id DESC LIMIT 1),'READY')=?";args.add(filter.state());}
        String from=" FROM file_work_groups g JOIN import_batches ib ON ib.project_id=g.project_id AND ib.id=g.document_id";
        long total=db.count("SELECT COUNT(*)"+from+where,args.toArray());args.add(filter.size());args.add((long)filter.page()*filter.size());
        var ids=db.rows("SELECT g.id"+from+where+" ORDER BY g.id DESC LIMIT ? OFFSET ?",args.toArray());
        var result=new ArrayList<Map<String,Object>>();for(var id:ids){long groupId=number(id,"id");result.add(summary(p,caller,group(p,groupId,false),items(p,groupId,false),filter.buildId()));}
        return new FileWorkDtos.Page<>(result,total,filter.page(),filter.size(),(int)((total+filter.size()-1)/filter.size()));
    }

    public Map<String,Object> assign(long p,String actor,long id,FileWorkDtos.Assignment input) {
        var caller=guard(p,actor,true);key(input.requestKey());positive(input.assigneeMembershipId());nonnegative(input.expectedVersion());
        if(text(input.reason()).isEmpty())fail(422,"REASON_REQUIRED","Ghi lý do phân công lại.");
        if(text(input.reason()).length()>500)fail(422,"INVALID_SCOPE","Lý do phân công tối đa 500 ký tự.");
        var group=group(p,id,true);var items=items(p,id,true);eligibleTester(p,input.assigneeMembershipId());
        String checksum=db.checksum(List.of("ASSIGN",p,id,input));
        var replay=replay(p,caller.membershipId(),"ASSIGN",id,input.requestKey(),checksum);if(replay!=null)return replay;
        version(group,input.expectedVersion());
        if("CLOSED".equals(group.get("cycleStatus")))fail(409,"CYCLE_NOT_ACTIVE","Đợt đã chốt không được đổi phân công.");
        if(!db.rows("SELECT id FROM file_work_sessions WHERE project_id=? AND group_id=? AND state IN ('DOING','PAUSED') ORDER BY id FOR UPDATE",p,id).isEmpty())fail(409,"SESSION_OPEN","PM cần hủy phiên đang mở có lý do trước khi giao lại file.");
        if(input.runVersions()==null || input.runVersions().size()!=items.size() || input.runVersions().isEmpty() || input.runVersions().size()>500)fail(422,"INVALID_SCOPE","Gửi đủ phiên bản của tất cả run trong nhóm.");
        var versions=new HashMap<Long,Long>();
        for(var value:input.runVersions()){positive(value.runItemId());nonnegative(value.expectedVersion());if(versions.put(value.runItemId(),value.expectedVersion())!=null)fail(422,"INVALID_SCOPE","Không gửi trùng run.");}
        for(var item:items){Long expected=versions.get(number(item,"runItemId"));if(expected==null)fail(422,"INVALID_SCOPE","Run không thuộc nhóm hoặc danh sách chưa đầy đủ.");if(expected!=number(item,"runVersion"))fail(409,"VERSION_CONFLICT","Phân công run đã thay đổi; tải lại toàn nhóm.");}
        for(var item:items.stream().sorted(Comparator.comparingLong(i->number(i,"runItemId"))).toList()) {
            long run=number(item,"runItemId");
            db.update("INSERT INTO run_item_assignments(project_id,run_item_id,previous_membership_id,assignee_membership_id,assigned_by,reason,assigned_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,run,number(item,"assigneeMembershipId"),input.assigneeMembershipId(),caller.membershipId(),text(input.reason()));
            if(db.update("UPDATE run_items SET assignee_membership_id=?,lock_version=lock_version+1 WHERE project_id=? AND id=? AND lock_version=?",input.assigneeMembershipId(),p,run,number(item,"runVersion"))!=1)fail(409,"VERSION_CONFLICT","Run đã thay đổi.");
            audit.record(p,actor,"RUN_ITEM",run,"ASSIGN");
        }
        if(db.update("UPDATE file_work_groups SET lock_version=lock_version+1,updated_by=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=? AND lock_version=?",caller.membershipId(),p,id,input.expectedVersion())!=1)fail(409,"VERSION_CONFLICT","Nhóm đã thay đổi.");
        historyWrite(p,id,caller.membershipId(),"ASSIGN",input.expectedVersion()+1,text(input.reason()),Map.of("assigneeMembershipId",input.assigneeMembershipId(),"runVersions",input.runVersions()));
        audit.record(p,actor,"FILE_WORK_GROUP",id,"ASSIGN");var response=readDetail(p,caller,id);command(p,id,caller.membershipId(),"ASSIGN",input.requestKey(),checksum,response);return response;
    }
    public Map<String,Object> history(long p,String actor,long id,long before) {
        guard(p,actor,false);group(p,id,false);if(before<0)fail(422,"INVALID_PAGE","Cursor lịch sử phải từ 0.");
        var events=db.rows("SELECT h.id,h.group_id AS groupId,h.session_id AS sessionId,h.action,h.from_state AS fromState,h.to_state AS toState,h.group_version AS groupVersion,h.session_version AS sessionVersion,h.reason,h.details_json AS details,h.actor_membership_id AS actorMembershipId,u.display_name AS actorName,h.occurred_at AS occurredAt FROM file_work_history h JOIN project_memberships m ON m.project_id=h.project_id AND m.id=h.actor_membership_id JOIN identity_users u ON u.id=m.user_id WHERE h.project_id=? AND h.group_id=?"+(before==0?"":" AND h.id<?")+" ORDER BY h.id DESC LIMIT 51",before==0?new Object[]{p,id}:new Object[]{p,id,before});
        boolean more=events.size()>50;var page=new ArrayList<>(events.subList(0,Math.min(50,events.size())));page.forEach(e->e.put("details",parse(e.get("details"))));
        var result=new LinkedHashMap<String,Object>();result.put("items",page);result.put("nextBefore",more?number(page.getLast(),"id"):null);return result;
    }
    private Map<String,Object> replay(long p,long actor,String action,Long id,String key,String checksum) {
        var commands=db.rows("SELECT group_id AS groupId,action,actor_membership_id AS actorMembershipId,request_checksum AS checksum,response_json AS response FROM file_work_commands WHERE project_id=? AND request_key=?",p,key);
        if(commands.isEmpty())return null;var old=commands.getFirst();
        if(number(old,"actorMembershipId")!=actor || !action.equals(old.get("action")) || !checksum.equals(old.get("checksum")) || id!=null && number(old,"groupId")!=id)fail(409,"IDEMPOTENCY_CONFLICT","Mã yêu cầu đã được dùng cho nội dung hoặc tài nguyên khác.");
        group(p,number(old,"groupId"),true);
        Object response=parse(old.get("response"));if(!(response instanceof Map<?,?>))throw new IllegalStateException("Invalid persisted file-work response");
        @SuppressWarnings("unchecked")var result=(Map<String,Object>)response;return result;
    }
    private void historyWrite(long p,long id,long actor,String action,long version,String reason,Object details){db.update("INSERT INTO file_work_history(project_id,group_id,action,group_version,reason,details_json,actor_membership_id,occurred_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,action,version,reason,db.encode(details),actor);}
    private void command(long p,long id,long actor,String action,String key,String checksum,Object response){db.update("INSERT INTO file_work_commands(project_id,group_id,action,actor_membership_id,request_key,request_checksum,response_json,occurred_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",p,id,action,actor,key,checksum,db.encode(response));}
    private Object parse(Object value){if(value==null || value instanceof Map<?,?> || value instanceof List<?>)return value;try{return json.readValue(value.toString(),Object.class);}catch(Exception e){throw new IllegalStateException("Invalid file-work JSON metadata",e);}}
    private static void positive(Long value){if(value==null || value<=0)fail(422,"INVALID_SCOPE","ID phải lớn hơn 0.");}
    private static void nonnegative(Long value){if(value==null || value<0)fail(422,"INVALID_SCOPE","Phiên bản phải từ 0.");}
    private static void key(String key){if(key==null || !key.matches("[A-Za-z0-9_-]{8,64}"))fail(422,"INVALID_SCOPE","Mã yêu cầu gồm 8–64 chữ, số, dấu gạch ngang hoặc gạch dưới.");}
    private static void paging(int page,int size){if(page<0 || size<1 || size>100)fail(422,"INVALID_PAGE","Trang phải từ 0, kích thước từ 1 đến 100.");}
}
