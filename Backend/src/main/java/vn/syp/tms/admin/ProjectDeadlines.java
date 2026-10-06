package vn.syp.tms.admin;

import java.time.*;
import java.sql.Date;
import java.util.*;
import org.springframework.stereotype.Component;
import vn.syp.tms.reporting.ReportMetrics;
import vn.syp.tms.workitem.WorkItemStore;
import static vn.syp.tms.workitem.WorkItemStore.*;

/** One query and calendar rule shared by overview and PM narrative validation. */
@Component
public class ProjectDeadlines {
 private final WorkItemStore db;
 public ProjectDeadlines(WorkItemStore db) { this.db=db; }
 public static String status(LocalDate due,long scope,boolean unfinished,String zone,Instant asOf) {
  if(due==null||scope==0)return "INSUFFICIENT_DATA";
  return unfinished&&due.isBefore(asOf.atZone(ZoneId.of(zone)).toLocalDate())?"OVERDUE":"NO_OVERDUE_WARNING";
 }
 public List<Map<String,Object>> milestones(Long projectId,Instant asOf) {
  var rows=db.rows("""
   SELECT ms.id,ms.project_id AS projectId,p.name AS projectName,p.timezone,ms.name,ms.due_on AS dueOn,
   (SELECT COUNT(*) FROM work_items w WHERE w.project_id=ms.project_id AND w.milestone_id=ms.id) +
   (SELECT COUNT(*) FROM test_cycles c WHERE c.project_id=ms.project_id AND c.milestone_id=ms.id) AS scopeCount,
   EXISTS(SELECT 1 FROM work_items w JOIN work_item_statuses s ON s.code=w.status_code WHERE w.project_id=ms.project_id AND w.milestone_id=ms.id AND NOT s.terminal) OR
   EXISTS(SELECT 1 FROM test_cycles c WHERE c.project_id=ms.project_id AND c.milestone_id=ms.id AND c.status_code<>'CLOSED') AS unfinished
   FROM milestones ms JOIN projects p ON p.id=ms.project_id WHERE ms.archived_at IS NULL
   """+(projectId==null?"":" AND p.id=?")+" ORDER BY ms.due_on,ms.id",projectId==null?new Object[0]:new Object[]{projectId});
  rows.forEach(row->{
   Object raw=row.get("dueOn");LocalDate due=raw==null?null:raw instanceof Date date?date.toLocalDate():LocalDate.parse(raw.toString());
   boolean unfinished=ReportMetrics.excluded(row.get("unfinished"));
   row.put("unfinished",unfinished);row.put("dueOn",due);
   row.put("deadlineStatus",status(due,number(row,"scopeCount"),unfinished,row.get("timezone").toString(),asOf));
  });return rows;
 }
}
