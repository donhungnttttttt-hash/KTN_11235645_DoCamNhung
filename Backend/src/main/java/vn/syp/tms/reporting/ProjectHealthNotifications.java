package vn.syp.tms.reporting;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.workitem.WorkItemStore;

@Service @Transactional
public class ProjectHealthNotifications {
 private final WorkItemStore db;private final IdentityService identity;
 public ProjectHealthNotifications(WorkItemStore db,IdentityService identity){this.db=db;this.identity=identity;}
 private static final String FROM=" FROM project_health_notifications n JOIN projects p ON p.id=n.project_id JOIN project_memberships m ON m.project_id=n.project_id AND m.user_id=n.recipient_user_id JOIN identity_users u ON u.id=m.user_id WHERE n.recipient_user_id=? AND p.archived_at IS NULL AND m.active=TRUE AND m.project_role='PM' AND u.enabled=TRUE AND u.role_code IN ('ADMIN','PM')";
 @Transactional(readOnly=true) public Map<String,Object> list(String actor){
  identity.current(actor);return Map.of("items",db.rows("SELECT n.id,n.project_id AS projectId,p.name AS projectName,n.message,n.created_at AS createdAt,n.read_at AS readAt"+FROM+" ORDER BY n.id DESC LIMIT 50",actor),"unreadCount",db.count("SELECT COUNT(*)"+FROM+" AND n.read_at IS NULL",actor));
 }
 public Map<String,Object> read(String actor,long id){identity.lockCurrent(actor);db.row("SELECT n.id"+FROM+" AND n.id=? FOR UPDATE",actor,id);db.update("UPDATE project_health_notifications SET read_at=COALESCE(read_at,UTC_TIMESTAMP(6)) WHERE id=? AND recipient_user_id=?",id,actor);return Map.of("id",id);}
}
