package vn.syp.tms.qa;

import static vn.syp.tms.workitem.WorkItemStore.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.retest.BugRetestLifecycle;
import vn.syp.tms.retest.RetestService;
import vn.syp.tms.workitem.WorkItemDtos.Page;
import vn.syp.tms.workitem.WorkItemStore;

/** Derived read model only. Read/write transaction is required by the current authorization locks. */
@Service
@Transactional(isolation=Isolation.REPEATABLE_READ)
public class HandoffService {
    private final WorkItemStore db;
    private final QaService qa;
    private final RetestService retest;
    private static final Set<String> STATES=Set.of("RETRY_REQUIRED","PREPARE_RETEST","READY_TO_CLOSE","VERIFYING","ASSIGNED");
    private static final String BUGS="""
        SELECT /* handoff bugs */ w.id AS workItemId,w.item_type AS type,w.item_key AS `key`,w.title,
        w.status_code AS status,w.assignee_membership_id AS assigneeMembershipId,w.updated_at AS updatedAt,
        b.fixed_build_id AS fixedBuildId,(fb.id IS NOT NULL AND fb.archived_at IS NULL) AS buildUsable,
        s.round_no AS roundNo,s.current_coverage_id AS coverageRevisionId,
        c.round_no AS coverageRoundNo,c.build_id AS coverageBuildId,
        (EXISTS(SELECT 1 FROM bug_coverage_revisions h WHERE h.project_id=w.project_id AND h.work_item_id=w.id)
         OR EXISTS(SELECT 1 FROM retest_requests h WHERE h.project_id=w.project_id AND h.work_item_id=w.id)) AS historyExists
        FROM work_items w JOIN bug_details b ON b.project_id=w.project_id AND b.work_item_id=w.id
        LEFT JOIN builds fb ON fb.project_id=b.project_id AND fb.id=b.fixed_build_id
        LEFT JOIN bug_retest_state s ON s.project_id=w.project_id AND s.work_item_id=w.id
        LEFT JOIN bug_coverage_revisions c ON c.project_id=s.project_id AND c.work_item_id=s.work_item_id AND c.id=s.current_coverage_id
        WHERE w.project_id=? AND w.item_type='BUG' AND w.status_code NOT IN ('closed','unreproducible','wontfix')
        AND (?='' OR LOCATE(?,w.item_key)>0 OR LOCATE(?,w.title)>0)
        ORDER BY w.id DESC
        """;
    private static final String ITEMS="""
        SELECT /* handoff items */ i.work_item_id AS workItemId,i.coverage_revision_id AS coverageRevisionId,
        i.id AS coverageItemId,i.run_item_id AS runItemId,COALESCE(sd.excluded,FALSE) AS excluded,
        r.assignee_membership_id AS assigneeMembershipId,cf.environment_id AS environmentId,cf.device_id AS deviceId,
        (cy.status_code='ACTIVE' AND rv.approved_at IS NOT NULL AND tc.archived_at IS NULL
         AND ts.archived_at IS NULL AND e.active=TRUE AND d.active=TRUE
         AND m.active=TRUE AND u.enabled=TRUE AND u.role_code<>'DEV'
         AND m.project_role IN ('PM','TESTER')) AS contextUsable
        FROM bug_retest_state s
        JOIN work_items w ON w.project_id=s.project_id AND w.id=s.work_item_id AND w.item_type='BUG'
        JOIN bug_coverage_items i ON i.project_id=s.project_id AND i.work_item_id=s.work_item_id AND i.coverage_revision_id=s.current_coverage_id
        JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id
        JOIN test_cycles cy ON cy.project_id=r.project_id AND cy.id=r.cycle_id
        LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id
        JOIN test_cases tc ON tc.project_id=r.project_id AND tc.id=r.test_case_id
        JOIN test_suites ts ON ts.project_id=tc.project_id AND ts.id=tc.suite_id
        JOIN test_case_revisions rv ON rv.project_id=r.project_id AND rv.id=r.revision_id
        JOIN cycle_configurations cf ON cf.project_id=r.project_id AND cf.id=r.configuration_id
        JOIN environments e ON e.project_id=cf.project_id AND e.id=cf.environment_id
        JOIN devices d ON d.project_id=cf.project_id AND d.id=cf.device_id
        JOIN project_memberships m ON m.project_id=r.project_id AND m.id=r.assignee_membership_id
        JOIN identity_users u ON u.id=m.user_id
        WHERE s.project_id=? AND w.status_code NOT IN ('closed','unreproducible','wontfix')
        """;
    private static final String REQUESTS="""
        SELECT /* handoff requests */ q.work_item_id AS workItemId,q.coverage_revision_id AS coverageRevisionId,
        q.round_no AS roundNo,q.build_id AS buildId,q.id AS requestId,q.status,
        q.assignee_membership_id AS assigneeMembershipId,q.environment_id AS environmentId,q.device_id AS deviceId,
        qi.coverage_item_id AS coverageItemId,qi.run_item_id AS runItemId,v.id AS verificationId,v.verdict
        FROM bug_retest_state s
        JOIN work_items w ON w.project_id=s.project_id AND w.id=s.work_item_id AND w.item_type='BUG'
        JOIN bug_details b ON b.project_id=w.project_id AND b.work_item_id=w.id
        JOIN retest_requests q ON q.project_id=s.project_id AND q.work_item_id=s.work_item_id
          AND q.coverage_revision_id=s.current_coverage_id AND q.round_no=s.round_no AND q.build_id=b.fixed_build_id
        JOIN retest_request_items qi ON qi.project_id=q.project_id AND qi.work_item_id=q.work_item_id
          AND qi.coverage_revision_id=q.coverage_revision_id AND qi.request_id=q.id
        LEFT JOIN bug_verification_attempts v ON v.project_id=qi.project_id AND v.work_item_id=qi.work_item_id
          AND v.request_id=qi.request_id AND v.coverage_item_id=qi.coverage_item_id AND v.run_item_id=qi.run_item_id
        WHERE s.project_id=? AND q.status IN ('OPEN','SUBMITTED')
          AND w.status_code NOT IN ('closed','unreproducible','wontfix')
        """;

    public HandoffService(WorkItemStore db,QaService qa,RetestService retest) {
        this.db=Objects.requireNonNull(db);this.qa=Objects.requireNonNull(qa);this.retest=Objects.requireNonNull(retest);
    }

    public Page<Map<String,Object>> list(long project,String user,int page,int size,String state,String keyword) {
        // No consistent read may precede current identity -> project -> membership authorization.
        var actor=qa.authorize(project,user,false);
        if(!actor.pm())fail(403,"FORBIDDEN","Chỉ PM hiện tại của dự án được xem hàng chờ bàn giao.");
        String filter=text(state),term=text(keyword);
        if(page<0||size<1||size>100)fail(422,"INVALID_PAGE","Trang và kích thước trang không hợp lệ.");
        if(!filter.isEmpty()&&!STATES.contains(filter))fail(422,"INVALID_STATE","Trạng thái bàn giao không hợp lệ.");
        if(term.length()>255)fail(422,"INVALID_KEYWORD","Từ khóa không được vượt quá 255 ký tự.");
        var bugs=db.rows(BUGS,project,term,term,term);
        if(bugs.isEmpty())return new Page<>(List.of(),0,page,size,0);
        var items=byBug(db.rows(ITEMS,project));
        var requests=byBug(db.rows(REQUESTS,project));
        var rows=new ArrayList<Map<String,Object>>();
        for(var bug:bugs) {
            long id=number(bug,"workItemId");
            if(!"BUG".equals(bug.get("type"))||BugRetestLifecycle.terminal(bug.get("status")))continue;
            var row=derive(project,user,actor,bug,items.getOrDefault(id,List.of()),requests.getOrDefault(id,List.of()));
            if(row!=null&&(filter.isEmpty()||filter.equals(row.get("state"))))rows.add(row);
        }
        rows.sort(Comparator.comparingLong((Map<String,Object> row)->number(row,"workItemId")).reversed());
        // Derive/filter the complete scoped set before slicing: no page-first filter or fabricated total.
        long offset=(long)page*size,total=rows.size();
        List<Map<String,Object>> slice=offset>=total?List.of():List.copyOf(rows.subList((int)offset,(int)Math.min(total,offset+size)));
        return new Page<>(slice,total,page,size,(int)((total+size-1)/size));
    }

    private Map<String,Object> derive(long project,String user,QaService.Actor actor,Map<String,Object> bug,
                                      List<Map<String,Object>> sourceItems,List<Map<String,Object>> sourceRequests) {
        boolean resolved="resolved".equals(bug.get("status")),build=truth(bug.get("buildUsable"));
        boolean coverage=bug.get("coverageRevisionId")!=null&&same(bug,"roundNo",bug,"coverageRoundNo")
            &&same(bug,"fixedBuildId",bug,"coverageBuildId");
        // invalidate clears the pointer, but round 1 can be the FIRST resolution without any retest history.
        boolean invalid=(!coverage&&(bug.get("coverageRevisionId")!=null||truth(bug.get("historyExists"))))
            ||(resolved&&!build);
        var applicable=new LinkedHashMap<Long,Map<String,Object>>();
        if(coverage)for(var item:sourceItems) {
            if(!same(bug,"coverageRevisionId",item,"coverageRevisionId"))continue;
            if(truth(item.get("excluded"))||!truth(item.get("contextUsable"))){invalid=true;continue;}
            applicable.put(number(item,"coverageItemId"),item);
        }
        var requested=new HashSet<Long>();
        var open=new HashSet<Long>();
        var latest=new HashMap<Long,Map<String,Object>>();
        var ids=new TreeSet<Long>(Comparator.reverseOrder());
        if(coverage)for(var request:sourceRequests) {
            var item=applicable.get(number(request,"coverageItemId"));
            if(item==null||!current(bug,item,request))continue;
            long itemId=number(item,"coverageItemId");
            requested.add(itemId);ids.add(number(request,"requestId"));
            if("OPEN".equals(request.get("status")))open.add(itemId);
            else if(request.get("verificationId")!=null&&Set.of("PASS","FAIL").contains(request.get("verdict"))) {
                var old=latest.get(itemId);
                if(old==null||number(request,"verificationId")>number(old,"verificationId"))latest.put(itemId,request);
            }
        }
        long count=applicable.size(),pass=latest.values().stream().filter(r->"PASS".equals(r.get("verdict"))).count();
        long fail=latest.values().stream().filter(r->"FAIL".equals(r.get("verdict"))).count();
        long pending=open.stream().filter(id->!latest.containsKey(id)).count();
        if(!resolved&&!invalid&&fail==0)return null;
        boolean allPass=coverage&&count>0&&pass==count&&!invalid&&resolved;
        // Reuse the existing close FIXED authority. Never fork a second closure policy here.
        boolean closure=allPass&&Boolean.TRUE.equals(retest.summary(project,user,number(bug,"workItemId")).get("canClose"));
        String state;
        if(invalid||fail>0)state="RETRY_REQUIRED";
        else if(!coverage||count==0||requested.size()<count||pass+fail+pending<count)state="PREPARE_RETEST";
        else if(closure)state="READY_TO_CLOSE";
        else if(pass>0)state="VERIFYING";
        else state="ASSIGNED";
        var row=new LinkedHashMap<String,Object>();
        for(String key:List.of("workItemId","key","title","status","assigneeMembershipId","fixedBuildId","coverageRevisionId","updatedAt"))row.put(key,bug.get(key));
        row.put("roundNo",bug.get("roundNo")==null?0L:number(bug,"roundNo"));
        row.put("coverageConfirmed",coverage);row.put("state",state);row.put("applicableCount",count);
        row.put("requestedCount",(long)requested.size());row.put("pendingCount",pending);row.put("passCount",pass);row.put("failCount",fail);
        row.put("requestIds",List.copyOf(ids));row.put("canPrepareRetest",!actor.archived()&&resolved&&build);
        row.put("canClose",!actor.archived()&&closure);
        return row;
    }

    private static boolean current(Map<String,Object> bug,Map<String,Object> item,Map<String,Object> request) {
        if(!same(bug,"coverageRevisionId",request,"coverageRevisionId")||!same(bug,"roundNo",request,"roundNo")
            ||!same(bug,"fixedBuildId",request,"buildId")||!same(item,"runItemId",request,"runItemId")
            ||!same(item,"environmentId",request,"environmentId")||!same(item,"deviceId",request,"deviceId"))return false;
        return "SUBMITTED".equals(request.get("status"))||"OPEN".equals(request.get("status"))
            &&same(item,"assigneeMembershipId",request,"assigneeMembershipId");
    }
    private static boolean same(Map<String,Object> a,String ak,Map<String,Object> b,String bk) {
        return a.get(ak) instanceof Number x&&b.get(bk) instanceof Number y&&x.longValue()==y.longValue();
    }
    private static boolean truth(Object value){return Boolean.TRUE.equals(value)||value instanceof Number n&&n.intValue()!=0;}
    private static Map<Long,List<Map<String,Object>>> byBug(List<Map<String,Object>> rows) {
        var result=new HashMap<Long,List<Map<String,Object>>>();
        for(var row:rows)result.computeIfAbsent(number(row,"workItemId"),id->new ArrayList<>()).add(row);
        return result;
    }
}
