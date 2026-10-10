package vn.syp.tms.filework;

import static vn.syp.tms.workitem.WorkItemStore.*;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.syp.tms.identity.*;
import vn.syp.tms.reporting.ReportMetrics;
import vn.syp.tms.workitem.WorkItemStore;

/** Independent JDBC guard. Identity -> project -> group -> ordered runs -> session -> asset -> allocation. */
@Component
public class FileWorkGuard {
    private final WorkItemStore db;
    private final IdentityService identity;
    public FileWorkGuard(WorkItemStore db,IdentityService identity){this.db=db;this.identity=identity;}
    public record Actor(long membershipId,boolean pm,boolean tester,boolean archived) {}
    public record Context(Actor actor,Map<String,Object> group,List<Map<String,Object>> runs,
                          Map<String,Object> session,Map<String,Object> snapshot) {}

    /** Retest must call this before its existing project/work locks. Safe to reacquire in one transaction. */
    public IdentityUserRepository.CurrentAccount lockIdentity(String actor) {
        var account=identity.lockCurrent(actor);
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth!=null && auth.getPrincipal() instanceof SessionPrincipal principal) {
            var current=db.row("SELECT lock_version AS version FROM identity_users WHERE id=? AND enabled=TRUE FOR SHARE",actor);
            if(!principal.id().equals(actor) || principal.version()!=number(current,"version")) fail(401,"UNAUTHENTICATED","Phiên đăng nhập đã thay đổi.");
        }
        return account;
    }
    public Actor authorize(long p,String actor,boolean pmWrite) {
        positive(p);var account=lockIdentity(actor);
        var project=db.row("SELECT id,archived_at AS archivedAt FROM projects WHERE id=? FOR UPDATE",p);
        var member=db.row("SELECT id,project_role AS projectRole FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE FOR UPDATE",p,actor);
        boolean effective=!"DEV".equals(account.getRole());
        var caller=new Actor(number(member,"id"),effective&&"PM".equals(member.get("projectRole")),effective&&"TESTER".equals(member.get("projectRole")),project.get("archivedAt")!=null);
        if(pmWrite && !caller.pm())fail(403,"FORBIDDEN","Chỉ PM hiện hành của dự án được hủy phiên.");
        if(pmWrite && caller.archived())fail(409,"ARCHIVED","Dự án đã được lưu trữ.");
        return caller;
    }
    public Map<String,Object> group(long p,long id) {
        positive(id);
        return db.row("SELECT g.id,g.document_id AS documentId,g.cycle_id AS cycleId,g.configuration_id AS configurationId,g.lock_version AS version,c.status_code AS cycleStatus,cf.environment_id AS environmentId,cf.device_id AS deviceId,cf.default_build_id AS defaultBuildId FROM file_work_groups g JOIN test_cycles c ON c.project_id=g.project_id AND c.id=g.cycle_id JOIN cycle_configurations cf ON cf.project_id=g.project_id AND cf.cycle_id=g.cycle_id AND cf.id=g.configuration_id WHERE g.project_id=? AND g.id=? FOR UPDATE",p,id);
    }
    public List<Map<String,Object>> runs(long p,long group) {
        return db.rows("SELECT r.id AS runItemId,r.revision_id AS revisionId,r.assignee_membership_id AS assigneeMembershipId,r.lock_version AS version,rv.approved_at AS approvedAt,c.archived_at AS archivedAt,s.archived_at AS suiteArchivedAt,COALESCE(sd.excluded,FALSE) AS excluded FROM file_work_group_items i JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id AND r.revision_id=i.revision_id AND r.test_case_id=i.test_case_id AND r.cycle_id=i.cycle_id AND r.configuration_id=i.configuration_id JOIN test_case_revisions rv ON rv.project_id=r.project_id AND rv.id=r.revision_id JOIN test_cases c ON c.project_id=r.project_id AND c.id=r.test_case_id JOIN test_suites s ON s.project_id=c.project_id AND s.id=c.suite_id LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id WHERE i.project_id=? AND i.group_id=? ORDER BY r.id FOR UPDATE",p,group);
    }
    public Map<String,Object> session(long p,long id,boolean lock) {
        positive(id);
        return db.row("SELECT id,project_id AS projectId,group_id AS groupId,executor_membership_id AS executorMembershipId,allocation_id AS allocationId,asset_id AS assetId,build_id AS buildId,state,lock_version AS version,context_snapshot AS contextSnapshot,started_at AS startedAt,last_transition_at AS lastTransitionAt,ended_at AS endedAt FROM file_work_sessions WHERE project_id=? AND id=?"+(lock?" FOR UPDATE":""),p,id);
    }
    public void assigned(Actor actor,List<Map<String,Object>> runs) {
        if(actor.archived())fail(409,"ARCHIVED","Dự án đã được lưu trữ.");
        if(!actor.tester())fail(403,"FORBIDDEN","Chỉ TESTER được giao file được thực thi.");
        var ids=runs.stream().map(r->number(r,"assigneeMembershipId")).distinct().toList();
        if(ids.size()!=1)fail(409,"ASSIGNMENT_MIXED","PM cần giao lại toàn bộ file trước khi thực thi.");
        if(ids.getFirst()!=actor.membershipId())fail(403,"NOT_ASSIGNED","File chưa được giao cho bạn.");
    }
    public Map<String,Object> usable(long p,Actor actor,Map<String,Object> group,List<Map<String,Object>> runs,long allocation,long build,Long pinnedAsset) {
        assigned(actor,runs);
        if(!"ACTIVE".equals(group.get("cycleStatus")))fail(409,"CYCLE_NOT_ACTIVE","Đợt kiểm thử phải đang ACTIVE.");
        for(var run:runs)if(run.get("approvedAt")==null || run.get("archivedAt")!=null || run.get("suiteArchivedAt")!=null)fail(422,"REVISION_NOT_APPROVED","Case và suite của phiên bản pin phải đang hoạt động và đã được duyệt.");
        var environment=db.row("SELECT id,code,name,description,active FROM environments WHERE project_id=? AND id=? FOR SHARE",p,number(group,"environmentId"));
        var device=db.row("SELECT id,code,name,model,os_name AS osName,os_version AS osVersion,active FROM devices WHERE project_id=? AND id=? FOR SHARE",p,number(group,"deviceId"));
        var selected=db.row("SELECT id,version_label AS versionLabel,build_number AS buildNumber,platform,archived_at AS archivedAt FROM builds WHERE project_id=? AND id=? FOR SHARE",p,build);
        if(number(group,"defaultBuildId")!=build){var defaultBuild=db.row("SELECT id,archived_at AS archivedAt FROM builds WHERE project_id=? AND id=? FOR SHARE",p,number(group,"defaultBuildId"));if(defaultBuild.get("archivedAt")!=null)fail(409,"SESSION_CONTEXT_MISMATCH","Build mặc định của cấu hình không còn sử dụng được.");}
        if(!ReportMetrics.excluded(environment.get("active")) || !ReportMetrics.excluded(device.get("active")) || selected.get("archivedAt")!=null)fail(409,"SESSION_CONTEXT_MISMATCH","Môi trường, thiết bị logic hoặc build không còn sử dụng được.");
        var lookup=db.row("SELECT asset_id AS assetId FROM device_allocations WHERE project_id=? AND id=?",p,allocation);
        long assetId=number(lookup,"assetId");
        if(pinnedAsset!=null && pinnedAsset!=assetId)fail(409,"SESSION_CONTEXT_MISMATCH","Phân bổ không còn khớp máy đã pin.");
        var asset=db.row("SELECT id,asset_code AS assetCode,type,model,serial,os_name AS osName,os_version AS osVersion,condition_code AS conditionCode FROM device_assets WHERE id=? FOR UPDATE",assetId);
        var assigned=db.row("SELECT id,project_id AS projectId,asset_id AS assetId,recipient_membership_id AS recipientMembershipId,assigned_at AS assignedAt,returned_at AS returnedAt FROM device_allocations WHERE project_id=? AND id=? FOR UPDATE",p,allocation);
        if(assigned.get("returnedAt")!=null || number(assigned,"recipientMembershipId")!=actor.membershipId() || number(assigned,"assetId")!=assetId)fail(409,"ALLOCATION_INACTIVE","Máy phải được phân bổ hiện hành cho chính bạn trong dự án.");
        if(!"AVAILABLE".equals(asset.get("conditionCode")))fail(409,"ALLOCATION_INACTIVE","Máy không còn sẵn sàng để thực thi.");
        compatible(device,asset,selected);
        var executor=db.row("SELECT m.id AS membershipId,u.display_name AS displayName,u.username FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.id=? AND m.active=TRUE AND m.project_role='TESTER' AND u.enabled=TRUE AND u.role_code<>'DEV' FOR SHARE",p,actor.membershipId());
        var snapshot=new LinkedHashMap<String,Object>();
        for(String key:List.of("id","documentId","cycleId","configurationId"))snapshot.put(key.equals("id")?"groupId":key,group.get(key));
        snapshot.put("revisionIds",runs.stream().map(r->number(r,"revisionId")).toList());
        snapshot.put("environment",without(environment,"active"));snapshot.put("device",without(device,"active"));snapshot.put("build",without(selected,"archivedAt"));snapshot.put("executor",executor);snapshot.put("physicalAsset",without(asset,"conditionCode"));snapshot.put("allocation",without(assigned,"returnedAt","projectId","assetId"));return snapshot;
    }
    public Context execution(long p,String actor,long sessionId) {
        var caller=authorize(p,actor,false);var located=session(p,sessionId,false);var group=group(p,number(located,"groupId"));var runs=runs(p,number(group,"id"));var session=session(p,sessionId,true);
        if(number(session,"executorMembershipId")!=caller.membershipId())fail(403,"NOT_SESSION_EXECUTOR","Chỉ người thực thi của phiên được thao tác.");
        var snapshot=usable(p,caller,group,runs,number(session,"allocationId"),number(session,"buildId"),number(session,"assetId"));
        return new Context(caller,group,runs,session,snapshot);
    }
    /** Must be called before canonical attempt replay or reads. Returned runs are locked in stable ID order. */
    public Context fileAttempt(long p,String actor,long groupId,long runId,long sessionId,long buildId,Long expectedSessionVersion) {
        var context=execution(p,actor,sessionId);
        if(number(context.group(),"id")!=groupId || number(context.session(),"buildId")!=buildId)fail(409,"SESSION_CONTEXT_MISMATCH","Session, file và build phải đúng pin.");
        if(context.runs().stream().noneMatch(r->number(r,"runItemId")==runId))fail(404,"NOT_FOUND","Run không thuộc file của phiên.");
        if(!"DOING".equals(context.session().get("state")))fail(409,"SESSION_NOT_DOING","Phiên phải đang DOING để ghi kết quả.");
        version(context.session(),expectedSessionVersion);
        var run=context.runs().stream().filter(r->number(r,"runItemId")==runId).findFirst().orElseThrow();
        if(ReportMetrics.excluded(run.get("excluded")))fail(409,"RUN_EXCLUDED","Run đã được PM loại khỏi scope.");
        return context;
    }
    public boolean completionReady(long p,long group,long build) {
        var latest=db.rows("SELECT COALESCE(sd.excluded,FALSE) AS excluded,COALESCE(a.result_code,'NOT_RUN') AS resultCode,EXISTS(SELECT 1 FROM work_item_execution_links l JOIN work_items w ON w.project_id=l.project_id AND w.id=l.work_item_id AND w.item_type='BUG' WHERE l.project_id=r.project_id AND l.run_item_id=r.id AND l.attempt_id=a.id) AS bugLinked FROM file_work_group_items i JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id LEFT JOIN execution_attempts a ON a.project_id=r.project_id AND a.run_item_id=r.id AND a.build_id=? AND a.attempt_no=(SELECT MAX(x.attempt_no) FROM execution_attempts x WHERE x.project_id=r.project_id AND x.run_item_id=r.id AND x.build_id=?) WHERE i.project_id=? AND i.group_id=? ORDER BY r.id",build,build,p,group);
        return latest.stream().allMatch(row->ReportMetrics.excluded(row.get("excluded")) || "OK".equals(row.get("resultCode")) || ("NG".equals(row.get("resultCode")) && ReportMetrics.excluded(row.get("bugLinked"))));
    }
    public static void compatible(Map<String,Object> device,Map<String,Object> asset,Map<String,Object> build) {
        String logical=normalized(device.get("osName")),physical=family(asset.get("osName")),platform=family(build.get("platform")),type=normalized(asset.get("type"));
        String required=family(logical);
        if(required.isEmpty() || physical.isEmpty() || platform.isEmpty() || !Set.of("ipad","iphone","android").contains(type))fail(422,"DEVICE_COMPATIBILITY_UNKNOWN","Cần cấu hình OS và build platform iOS/iPadOS/Android cùng loại máy được hỗ trợ.");
        boolean typeMatch=logical.equals("ipados")?type.equals("ipad"):required.equals("ios")?Set.of("ipad","iphone").contains(type):type.equals("android");
        if(!typeMatch || !physical.equals(required) || !platform.equals(required))fail(422,"DEVICE_INCOMPATIBLE","Máy và build không khớp OS của thiết bị logic.");
        for(String field:List.of("model","osVersion"))if(!normalized(device.get(field)).isEmpty() && !normalized(device.get(field)).equals(normalized(asset.get(field))))fail(422,"DEVICE_INCOMPATIBLE","Model hoặc phiên bản OS của máy không khớp cấu hình.");
    }
    private static String family(Object value){return switch(normalized(value)){case "ios","ipados"->"ios";case "android"->"android";default->"";};}
    private static String normalized(Object value){return value==null?"":value.toString().trim().toLowerCase(Locale.ROOT);}
    private static Map<String,Object> without(Map<String,Object> source,String...keys){var value=new LinkedHashMap<>(source);for(String key:keys)value.remove(key);return value;}
    public static void positive(Long id){if(id==null || id<=0)fail(422,"INVALID_SCOPE","ID phải lớn hơn 0.");}
    public static void key(String value){if(value==null || !value.matches("[A-Za-z0-9_-]{8,64}"))fail(422,"INVALID_SCOPE","Request key không hợp lệ.");}
}
