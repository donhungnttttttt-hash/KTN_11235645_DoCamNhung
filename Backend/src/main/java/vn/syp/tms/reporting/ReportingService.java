package vn.syp.tms.reporting;

import static vn.syp.tms.workitem.WorkItemStore.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.workitem.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=30)
public class ReportingService {
    public static final int MAX_RUNS=10000,MAX_EXPORT_RUNS=5000;
    private final WorkItemStore db;
    private final WorkItemService work;
    private final ReportWorkbook workbook;
    private final ProjectAudit audit;
    public ReportingService(WorkItemStore db,WorkItemService work,ReportWorkbook workbook,ProjectAudit audit) {
        this.db=db;this.work=work;this.workbook=workbook;this.audit=audit;
    }
    private static final String RUN_FROM="""
        JOIN test_cycles c ON c.project_id=r.project_id AND c.id=r.cycle_id
        JOIN test_cases tc ON tc.project_id=r.project_id AND tc.id=r.test_case_id
        JOIN test_case_revisions rv ON rv.project_id=r.project_id AND rv.id=r.revision_id
        JOIN cycle_configurations cf ON cf.project_id=r.project_id AND cf.id=r.configuration_id
        JOIN environments e ON e.project_id=r.project_id AND e.id=cf.environment_id
        JOIN devices d ON d.project_id=r.project_id AND d.id=cf.device_id
        JOIN project_memberships m ON m.project_id=r.project_id AND m.id=r.assignee_membership_id
        JOIN identity_users u ON u.id=m.user_id
        LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id
        """;
    public Map<String,Object> summary(long p,String actor,Long cycle,Long build,int page) {
        if(page<0) fail(422,"INVALID_PAGE","Trang phải từ 0.");
        var report=snapshot(p,actor,cycle,build,MAX_RUNS,page);
        @SuppressWarnings("unchecked") var rows=(List<Map<String,Object>>)report.remove("rows");
        long total=((Number)report.remove("totalRows")).longValue();
        report.put("source",new WorkItemDtos.Page<>(rows,total,page,50,(int)((total+49)/50)));
        return report;
    }
    @Transactional(isolation=Isolation.REPEATABLE_READ,timeout=30)
    public byte[] export(long p,String actor,Long cycle,Long build) {
        var report=snapshot(p,actor,cycle,build,MAX_EXPORT_RUNS,null);
        byte[] bytes=workbook.create(report);
        audit.record(p,actor,"REPORT",p,"EXPORT_XLSX");return bytes;
    }
    private Map<String,Object> snapshot(long p,String actor,Long cycle,Long build,int limit,Integer page) {
        work.readMembership(p,actor);
        Instant asOf=Instant.now();
        var project=db.row("SELECT id,code,name,timezone FROM projects WHERE id=?",p);
        if(cycle!=null) { positive(cycle);db.row("SELECT id FROM test_cycles WHERE project_id=? AND id=?",p,cycle); }
        if(build!=null) { positive(build);db.row("SELECT id FROM builds WHERE project_id=? AND id=?",p,build); }
        var groups=page==null?null:aggregates(p,cycle,build);
        var metrics=page==null?null:ReportMetrics.aggregate(groups);
        if(metrics!=null && ((Number)metrics.get("total")).longValue()>limit) limitExceeded(limit);
        var rows=source(p,cycle,build,page==null?limit:50,page==null?0:(long)page*50,page==null);
        var bugs=bugs(p,cycle);
        if(metrics==null)metrics=ReportMetrics.calculate(rows);
        metrics.put("bugs",bugs.size());metrics.put("openBugs",bugs.stream().filter(b->!ReportMetrics.excluded(b.get("terminal"))).count());
        metrics.put("awaitingVerification",bugs.stream().filter(b->"resolved".equals(b.get("status"))).count());
        var report=new LinkedHashMap<String,Object>();report.put("metricDefinitionVersion","internal-v1");report.put("asOf",asOf);report.put("timeZone",project.get("timezone"));report.put("project",project);
        var filters=new LinkedHashMap<String,Object>();filters.put("cycleId",cycle);filters.put("buildId",build);report.put("filters",filters);
        report.put("metrics",metrics);
        report.put("byCycle",page==null?ReportMetrics.group(rows,"cycleId","cycleName"):ReportMetrics.groupedAggregates(groups,"cycleId","cycleName"));
        report.put("byAssignee",page==null?ReportMetrics.group(rows,"assigneeMembershipId","assigneeName"):ReportMetrics.groupedAggregates(groups,"assigneeMembershipId","assigneeName"));
        if(page!=null)report.put("totalRows",metrics.get("total"));
        report.put("daily",daily(p,cycle,build,ZoneId.of(project.get("timezone").toString()),asOf));report.put("bugs",bugs);report.put("rows",rows);
        return report;
    }
    private void positive(long id) { if(id<1) fail(422,"INVALID_FILTER","Mã bộ lọc phải là số nguyên dương."); }
    private List<Map<String,Object>> source(long p,Long cycle,Long build,int limit,long offset,boolean boundedExport) {
        String attempt=build==null?"r.latest_attempt_id":"(SELECT a2.id FROM execution_attempts a2 WHERE a2.project_id=r.project_id AND a2.run_item_id=r.id AND a2.build_id=? ORDER BY a2.attempt_no DESC LIMIT 1)";
        var args=new ArrayList<Object>();args.add(p);if(cycle!=null)args.add(cycle);args.add(boundedExport?limit+1:limit);args.add(offset);if(build!=null)args.add(build);
        // LIMIT materializes the selected runs before joining their display fields. A build
        // selects the latest attempt on that build; it never removes unexecuted runs.
        String pageFrom="FROM (SELECT r.* FROM run_items r JOIN test_cycles c ON c.project_id=r.project_id AND c.id=r.cycle_id WHERE r.project_id=? AND c.status_code<>'DRAFT'"+
            (cycle==null?"":" AND r.cycle_id=?")+" ORDER BY r.id LIMIT ? OFFSET ?) r ";
        var rows=db.rows("""
            SELECT r.id,r.cycle_id AS cycleId,c.name AS cycleName,c.status_code AS cycleStatus,
            tc.case_no AS caseNo,rv.title_vi AS titleVi,rv.id AS revisionId,rv.revision_no AS revisionNo,
            e.name AS environmentName,d.name AS deviceName,m.id AS assigneeMembershipId,u.display_name AS assigneeName,
            COALESCE(sd.excluded,FALSE) AS excluded,sd.reason AS scopeReason,
            a.id AS attemptId,a.result_code AS resultCode,a.build_id AS buildId,a.executed_at AS executedAt,
            CONCAT(b.version_label,' (',COALESCE(b.build_number,'—'),')') AS buildLabel
            """+pageFrom+RUN_FROM+" LEFT JOIN execution_attempts a ON a.project_id=r.project_id AND a.id="+attempt+
            " LEFT JOIN builds b ON b.project_id=a.project_id AND b.id=a.build_id ORDER BY r.id",args.toArray());
        if(rows.size()>limit) limitExceeded(limit);
        rows.forEach(row->{row.put("excluded",ReportMetrics.excluded(row.get("excluded")));if(row.get("resultCode")==null)row.put("resultCode","NOT_RUN");});return rows;
    }
    private static void limitExceeded(int limit) {fail(422,"REPORT_LIMIT","Phạm vi vượt giới hạn "+limit+" lượt. Chọn một đợt nhỏ hơn để xem hoặc xuất báo cáo.");}
    private List<Map<String,Object>> aggregates(long p,Long cycle,Long build) {
        String attempt=build==null?"r.latest_attempt_id":"(SELECT a2.id FROM execution_attempts a2 WHERE a2.project_id=r.project_id AND a2.run_item_id=r.id AND a2.build_id=? ORDER BY a2.attempt_no DESC LIMIT 1)";
        var args=new ArrayList<Object>();if(build!=null)args.add(build);args.add(p);if(cycle!=null)args.add(cycle);
        return db.rows("""
            SELECT g.cycleId,c.name AS cycleName,g.assigneeMembershipId,u.display_name AS assigneeName,
            g.total,g.na,g.ok,g.ng,g.pending FROM (
            SELECT r.project_id AS projectId,r.cycle_id AS cycleId,r.assignee_membership_id AS assigneeMembershipId,MIN(r.id) AS firstRunId,
            COUNT(*) AS total,SUM(IF(COALESCE(sd.excluded,FALSE),1,0)) AS na,
            SUM(IF(NOT COALESCE(sd.excluded,FALSE) AND a.result_code='OK',1,0)) AS ok,
            SUM(IF(NOT COALESCE(sd.excluded,FALSE) AND a.result_code='NG',1,0)) AS ng,
            SUM(IF(NOT COALESCE(sd.excluded,FALSE) AND a.result_code='P',1,0)) AS pending
            FROM run_items r JOIN test_cycles c ON c.project_id=r.project_id AND c.id=r.cycle_id
            LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id
            """+" LEFT JOIN execution_attempts a ON a.project_id=r.project_id AND a.id="+attempt+
            " WHERE r.project_id=? AND c.status_code<>'DRAFT'"+(cycle==null?"":" AND r.cycle_id=?")+
            " GROUP BY r.project_id,r.cycle_id,r.assignee_membership_id) g"+
            " JOIN test_cycles c ON c.project_id=g.projectId AND c.id=g.cycleId"+
            " JOIN project_memberships m ON m.project_id=g.projectId AND m.id=g.assigneeMembershipId"+
            " JOIN identity_users u ON u.id=m.user_id ORDER BY g.firstRunId",args.toArray());
    }
    private List<Map<String,Object>> bugs(long p,Long cycle) {
        // EXISTS prevents N:N joins from multiplying bug totals. Include links and PM-added retest coverage.
        String filter=cycle==null?"":" AND r.cycle_id=?";
        var args=new ArrayList<Object>();args.add(p);if(cycle!=null){args.add(cycle);args.add(cycle);}
        var bugs=db.rows("""
            SELECT w.id,w.item_key AS `key`,w.title,w.status_code AS status,s.label_vi AS statusLabel,s.terminal,
            w.priority_code AS priority,CASE w.priority_code WHEN 'HIGH' THEN 'Cao' WHEN 'LOW' THEN 'Thấp' ELSE 'Trung bình' END AS priorityLabel
            FROM work_items w JOIN work_item_statuses s ON s.code=w.status_code WHERE w.project_id=? AND w.item_type='BUG'
            AND (EXISTS(SELECT 1 FROM work_item_execution_links l JOIN run_items r ON r.project_id=l.project_id AND r.id=l.run_item_id
                JOIN test_cycles c ON c.project_id=r.project_id AND c.id=r.cycle_id WHERE l.project_id=w.project_id AND l.work_item_id=w.id AND c.status_code<>'DRAFT'
            """+filter+") OR EXISTS(SELECT 1 FROM bug_coverage_items i JOIN bug_retest_state st ON st.project_id=i.project_id AND st.work_item_id=i.work_item_id AND st.current_coverage_id=i.coverage_revision_id JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id JOIN test_cycles c ON c.project_id=r.project_id AND c.id=r.cycle_id WHERE i.project_id=w.project_id AND i.work_item_id=w.id AND c.status_code<>'DRAFT'"+filter+")) ORDER BY w.id LIMIT 10001",args.toArray());
        if(bugs.size()>MAX_RUNS) fail(422,"REPORT_LIMIT","Quá nhiều bug liên quan. Thu hẹp phạm vi theo đợt.");return bugs;
    }
    private List<Map<String,Object>> daily(long p,Long cycle,Long build,ZoneId zone,Instant asOf) {
        LocalDate today=asOf.atZone(zone).toLocalDate();var args=new ArrayList<Object>();var buckets=new StringBuilder("CASE");
        // UTC boundaries computed per date handle DST without depending on MySQL timezone tables.
        for(int day=13;day>=0;day--) {
            LocalDate date=today.minusDays(day);buckets.append(" WHEN a.executed_at>=? AND a.executed_at<? THEN ?");
            args.add(Timestamp.from(date.atStartOfDay(zone).toInstant()));args.add(Timestamp.from(date.plusDays(1).atStartOfDay(zone).toInstant()));args.add(date.toString());
        }
        buckets.append(" END");args.add(p);args.add(Timestamp.from(today.minusDays(13).atStartOfDay(zone).toInstant()));args.add(Timestamp.from(asOf));
        String filter="";if(cycle!=null){filter+=" AND r.cycle_id=?";args.add(cycle);}if(build!=null){filter+=" AND a.build_id=?";args.add(build);}
        return db.rows("SELECT g.date,g.membershipId,u.display_name AS name,g.attempts,g.ok,g.ng,g.pending FROM (SELECT "+buckets+
            " AS date,a.project_id AS projectId,a.executor_membership_id AS membershipId,COUNT(*) AS attempts,SUM(a.result_code='OK') AS ok,SUM(a.result_code='NG') AS ng,SUM(a.result_code='P') AS pending"+
            " FROM execution_attempts a JOIN run_items r ON r.project_id=a.project_id AND r.id=a.run_item_id JOIN test_cycles c ON c.project_id=r.project_id AND c.id=r.cycle_id"+
            " WHERE a.project_id=? AND a.executed_at>=? AND a.executed_at<=? AND c.status_code<>'DRAFT'"+filter+
            " GROUP BY date,a.project_id,a.executor_membership_id) g JOIN project_memberships m ON m.project_id=g.projectId AND m.id=g.membershipId"+
            " JOIN identity_users u ON u.id=m.user_id ORDER BY g.date DESC,g.membershipId",args.toArray());
    }
}
