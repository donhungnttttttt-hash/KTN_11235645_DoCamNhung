package vn.syp.tms.admin;

import java.time.*;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.reporting.ReportMetrics;
import vn.syp.tms.workitem.WorkItemStore;
import static vn.syp.tms.workitem.WorkItemStore.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=30)
public class AdminOverviewService {
    private final WorkItemStore db;
    private final IdentityService identity;
    public AdminOverviewService(WorkItemStore db,IdentityService identity) {this.db=db;this.identity=identity;}
    private void authorize(String actor) {
        // Read the enabled account each time, even when session authorities are stale.
        if(!"ADMIN".equals(identity.current(actor).getRole())) fail(403,"FORBIDDEN","Chỉ ADMIN được truy cập quản trị hệ thống.");
    }
    private void scope(Long projectId) {
        if(projectId!=null) db.row("SELECT id FROM projects WHERE id=?",projectId);
    }
    private String filter(Long id) {return id==null?"":" AND p.id=?";}
    private Object[] args(Long id) {return id==null?new Object[0]:new Object[]{id};}
    private static final String PROJECTS="""
        SELECT p.id,p.code,p.name,p.description,p.timezone,p.archived_at AS archivedAt,p.lock_version AS version,
        COALESCE(m.members,0) AS activeMembers,COALESCE(m.pmCount,0) AS activePmCount,m.pmNames,
        COALESCE(r.total,0) AS total,COALESCE(r.na,0) AS na,COALESCE(r.ok,0) AS ok,COALESCE(r.ng,0) AS ng,COALESCE(r.pending,0) AS pending,
        (SELECT COUNT(*) FROM device_allocations l WHERE l.project_id=p.id AND l.returned_at IS NULL) AS heldDevices,
        COALESCE(b.openBugs,0) AS openBugs,COALESCE(b.awaitingVerification,0) AS awaitingVerification
        FROM projects p
        LEFT JOIN (SELECT m.project_id,COUNT(*) AS members,SUM(m.project_role='PM') AS pmCount,
            GROUP_CONCAT(CASE WHEN m.project_role='PM' THEN u.display_name END ORDER BY u.display_name SEPARATOR ', ') AS pmNames
            FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.active=TRUE AND u.enabled=TRUE GROUP BY m.project_id) m ON m.project_id=p.id
        LEFT JOIN (SELECT r.project_id,COUNT(*) AS total,SUM(COALESCE(sd.excluded,FALSE)) AS na,
            SUM(IF(NOT COALESCE(sd.excluded,FALSE) AND a.result_code='OK',1,0)) AS ok,
            SUM(IF(NOT COALESCE(sd.excluded,FALSE) AND a.result_code='NG',1,0)) AS ng,
            SUM(IF(NOT COALESCE(sd.excluded,FALSE) AND a.result_code='P',1,0)) AS pending
            FROM run_items r JOIN test_cycles c ON c.project_id=r.project_id AND c.id=r.cycle_id
            LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id
            LEFT JOIN execution_attempts a ON a.project_id=r.project_id AND a.id=r.latest_attempt_id
            WHERE c.status_code<>'DRAFT' GROUP BY r.project_id) r ON r.project_id=p.id
        LEFT JOIN (SELECT w.project_id,SUM(NOT s.terminal) AS openBugs,SUM(w.status_code='resolved') AS awaitingVerification
            FROM work_items w JOIN work_item_statuses s ON s.code=w.status_code WHERE w.item_type='BUG' GROUP BY w.project_id) b ON b.project_id=p.id
        WHERE 1=1
        """;
    private Map<String,Object> enrich(Map<String,Object> row) {
        row.put("metrics",ReportMetrics.counts(number(row,"total"),number(row,"na"),number(row,"ok"),number(row,"ng"),number(row,"pending")));
        
        for(String key:List.of("total","na","ok","ng","pending")) row.remove(key);
        return row;
    }
    public AdminDtos.Page<Map<String,Object>> projects(String actor,Long projectId,String keyword,int page,int size) {
        authorize(actor);
        if(page<0 || size<1 || size>100 || keyword!=null && keyword.length()>100) fail(422,"VALIDATION_ERROR","Bộ lọc hoặc phân trang không hợp lệ.");
        scope(projectId);
        // LOCATE performs literal substring search: '%' and '_' do not broaden scope.
        String search=" AND (?='' OR LOCATE(?,p.code)>0 OR LOCATE(?,p.name)>0)";
        var params=new ArrayList<Object>(Arrays.asList(args(projectId)));String term=text(keyword);
        params.add(term);params.add(term);params.add(term);
        long count=db.count("SELECT COUNT(*) FROM projects p WHERE 1=1"+filter(projectId)+search,params.toArray());
        params.add(size);params.add((long)page*size);
        var rows=db.rows(PROJECTS+filter(projectId)+search+" ORDER BY p.id LIMIT ? OFFSET ?",params.toArray());
        rows.forEach(this::enrich);
        addDeadlineCounts(rows,milestones(projectId,Instant.now()));
        return new AdminDtos.Page<>(rows,page,size,count);
    }
    public Map<String,Object> project(String actor,long projectId) {
        authorize(actor);scope(projectId);
        var result=enrich(db.row(PROJECTS+" AND p.id=?",projectId));
        var milestones=milestones(projectId,Instant.now());addDeadlineCounts(List.of(result),milestones);
        result.put("milestones",milestones);result.put("verificationBugs",awaitingBugs(projectId));return result;
    }
    @SuppressWarnings("unchecked")
    public AdminDtos.Overview overview(String actor,Long projectId) {
        authorize(actor);scope(projectId);Instant asOf=Instant.now();
        var projects=db.rows(PROJECTS+filter(projectId)+" ORDER BY p.id",args(projectId));projects.forEach(this::enrich);
        var metrics=ReportMetrics.aggregate(projects.stream().map(p->(Map<String,Object>)p.get("metrics")).toList());
        String userScope=projectId==null?"":" WHERE EXISTS(SELECT 1 FROM project_memberships m WHERE m.user_id=u.id AND m.active=TRUE AND m.project_id=?)";
        var roles=db.rows("SELECT u.role_code AS role,COUNT(*) AS total,SUM(u.enabled) AS enabled FROM identity_users u"+userScope+" GROUP BY u.role_code ORDER BY u.role_code",args(projectId));
        long totalUsers=roles.stream().mapToLong(r->number(r,"total")).sum();long enabledUsers=roles.stream().mapToLong(r->number(r,"enabled")).sum();
        var milestones=milestones(projectId,asOf);
        addDeadlineCounts(projects,milestones);
        var attention=new LinkedHashMap<String,Object>();
        var overdue=milestones.stream().filter(m->"OVERDUE".equals(m.get("deadlineStatus"))).toList();
        attention.put("overdueMilestones",overdue.stream().limit(20).toList());attention.put("overdueMilestoneCount",overdue.size());
        var withoutPm=projects.stream().filter(p->p.get("archivedAt")==null && number(p,"activePmCount")==0).toList();
        attention.put("withoutPm",withoutPm.stream().limit(20).toList());attention.put("withoutPmCount",withoutPm.size());
        attention.put("insufficientMilestoneData",milestones.stream().filter(m->"INSUFFICIENT_DATA".equals(m.get("deadlineStatus"))).count());
        var awaiting=awaitingBugs(projectId);
        attention.put("awaitingVerification",awaiting);
        var inventory=inventory(projectId,asOf);
        attention.put("overdueReturns",inventory.get("overdueReturns"));
        attention.put("overdueReturnCount",inventory.get("overdueReturnCount"));
        return new AdminDtos.Overview(asOf,"internal-v1",projectId,projects.size(),projects.stream().filter(p->p.get("archivedAt")==null).count(),totalUsers,enabledUsers,
            projects.stream().mapToLong(p->number(p,"openBugs")).sum(),projects.stream().mapToLong(p->number(p,"awaitingVerification")).sum(),metrics,roles,
            projects.stream().limit(10).toList(),attention,inventory);
    }
    private Map<String,Object> inventory(Long projectId,Instant asOf) {
        String where=projectId==null?"":" WHERE l.project_id=?";
        var groups=db.rows("SELECT a.type,CASE WHEN l.id IS NOT NULL THEN 'ALLOCATED' ELSE a.condition_code END AS status,COUNT(*) AS total FROM device_assets a LEFT JOIN device_allocations l ON l.active_asset_id=a.id"+where+" GROUP BY a.type,status ORDER BY a.type,status",args(projectId));
        var result=new LinkedHashMap<String,Object>();
        for(String status:List.of("AVAILABLE","ALLOCATED","MAINTENANCE","RETIRED"))result.put(status.toLowerCase(Locale.ROOT),groups.stream().filter(g->status.equals(g.get("status"))).mapToLong(g->number(g,"total")).sum());
        result.put("byTypeAndStatus",groups);
        var allocations=db.rows("SELECT l.id,l.project_id AS projectId,p.name AS projectName,p.timezone,a.asset_code AS assetCode,l.expected_return_on AS expectedReturnOn FROM device_allocations l JOIN device_assets a ON a.id=l.asset_id JOIN projects p ON p.id=l.project_id WHERE l.returned_at IS NULL AND l.expected_return_on IS NOT NULL"+filter(projectId)+" ORDER BY l.expected_return_on,l.id",args(projectId));
        var overdue=allocations.stream().filter(l->{Object raw=l.get("expectedReturnOn");LocalDate date=raw instanceof java.sql.Date d?d.toLocalDate():LocalDate.parse(raw.toString());return date.isBefore(asOf.atZone(ZoneId.of(l.get("timezone").toString())).toLocalDate());}).toList();
        result.put("overdueReturnCount",overdue.size());result.put("overdueReturns",overdue.stream().limit(20).toList());
        return result;
    }
    private List<Map<String,Object>> milestones(Long projectId,Instant asOf) {
        return new ProjectDeadlines(db).milestones(projectId,asOf);
    }
    private List<Map<String,Object>> awaitingBugs(Long projectId) {
        return db.rows("SELECT w.id,w.project_id AS projectId,p.name AS projectName,w.item_key AS itemKey,w.title FROM work_items w JOIN projects p ON p.id=w.project_id WHERE w.item_type='BUG' AND w.status_code='resolved'"+filter(projectId)+" ORDER BY w.id LIMIT 20",args(projectId));
    }
    private void addDeadlineCounts(List<Map<String,Object>> projects,List<Map<String,Object>> milestones) {
        var overdue=new HashMap<Long,Long>();var missing=new HashMap<Long,Long>();
        milestones.forEach(m->{if("OVERDUE".equals(m.get("deadlineStatus"))) overdue.merge(number(m,"projectId"),1L,(a,b)->Objects.requireNonNull(a)+Objects.requireNonNull(b));
            if("INSUFFICIENT_DATA".equals(m.get("deadlineStatus"))) missing.merge(number(m,"projectId"),1L,(a,b)->Objects.requireNonNull(a)+Objects.requireNonNull(b));});
        projects.forEach(p->{p.put("overdueMilestones",overdue.getOrDefault(number(p,"id"),0L));p.put("insufficientMilestoneData",missing.getOrDefault(number(p,"id"),0L));});
    }
}
