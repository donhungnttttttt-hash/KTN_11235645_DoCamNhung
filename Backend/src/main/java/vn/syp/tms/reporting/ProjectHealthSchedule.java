package vn.syp.tms.reporting;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import vn.syp.tms.workitem.WorkItemStore;

@Component @EnableScheduling
@ConditionalOnProperty(name="TMS_DASHBOARD_MONITOR_ENABLED",havingValue="true",matchIfMissing=true)
public class ProjectHealthSchedule {
 private final WorkItemStore db;private final ProjectHealthMonitor monitor;
 private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(ProjectHealthSchedule.class);
 public ProjectHealthSchedule(WorkItemStore db,ProjectHealthMonitor monitor){this.db=db;this.monitor=monitor;}
 @org.springframework.context.annotation.Bean(name="projectDashboardScheduler")
 public static org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler scheduler(){var scheduler=new org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler();scheduler.setPoolSize(1);scheduler.setThreadNamePrefix("dashboard-monitor-");scheduler.setDaemon(true);return scheduler;}
 @org.springframework.context.annotation.Bean(name="taskScheduler")
 @ConditionalOnProperty(name="TMS_DASHBOARD_MONITOR_ENABLED",havingValue="true",matchIfMissing=true)
 @org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean(name="taskScheduler")
 public static org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler housekeeping(){var scheduler=new org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler();scheduler.setPoolSize(1);scheduler.setThreadNamePrefix("housekeeping-");scheduler.setDaemon(true);return scheduler;}
 @Scheduled(initialDelay=15000,fixedDelay=300000,scheduler="projectDashboardScheduler")
 public void refresh(){
  for(var project:db.rows("SELECT p.id FROM projects p WHERE p.archived_at IS NULL AND EXISTS(SELECT 1 FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=p.id AND m.active=TRUE AND u.enabled=TRUE AND u.role_code='GUEST')")){
   try{monitor.refresh(WorkItemStore.number(project,"id"));}catch(RuntimeException failure){log.warn("Project dashboard refresh could not complete for project {}",project.get("id"));}
  }
 }
}
