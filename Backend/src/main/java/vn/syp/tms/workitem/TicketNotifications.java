package vn.syp.tms.workitem;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import static vn.syp.tms.workitem.WorkItemStore.*;

@Service @Transactional
public class TicketNotifications {
    private final WorkItemStore db;private final IdentityService identity;
    public TicketNotifications(WorkItemStore db,IdentityService identity){this.db=db;this.identity=identity;}
    public void notify(long p,long ticket,String actor,Collection<String> recipients,String message){
        for(String recipient:new HashSet<>(recipients))if(recipient!=null&&!recipient.equals(actor))db.update("INSERT INTO ticket_notifications(project_id,work_item_id,recipient_user_id,actor_user_id,message,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",p,ticket,recipient,actor,message);
    }
    private String role(String actor,boolean lock){String role=lock?identity.lockCurrent(actor).getRole():identity.current(actor).getRole();if(!Set.of("ADMIN","PM","USER").contains(role))fail(403,"FORBIDDEN","Không có quyền mở thông báo Ticket.");return role;}
    private static final String FROM="""
        FROM ticket_notifications n JOIN work_items w ON w.project_id=n.project_id AND w.id=n.work_item_id
        JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id
        JOIN testing_features f ON f.project_id=x.project_id AND f.id=x.feature_id
        LEFT JOIN import_batches d ON d.project_id=x.project_id AND d.id=x.document_id
        JOIN identity_users a ON a.id=n.actor_user_id
        WHERE n.recipient_user_id=? AND x.deleted_at IS NULL AND f.archived_at IS NULL AND (d.id IS NULL OR d.archived_at IS NULL)
        AND (?='ADMIN' OR EXISTS(SELECT 1 FROM project_memberships m JOIN identity_users u ON u.id=m.user_id
            WHERE m.project_id=n.project_id AND m.user_id=n.recipient_user_id AND m.active=TRUE AND u.enabled=TRUE
            AND m.project_role=u.role_code AND m.project_role IN ('PM','USER')))
        """;
    @Transactional(readOnly=true) public Map<String,Object> list(String actor,int page,int size){
        String role=role(actor,false);if(page<0||page>100000||size<1||size>100)fail(422,"INVALID_FILTER","Phân trang không hợp lệ.");
        var items=db.rows("SELECT n.id,n.project_id AS projectId,w.id AS ticketId,w.item_key AS ticketKey,w.title,a.display_name AS actorName,n.message,n.created_at AS createdAt,n.read_at AS readAt "+FROM+" ORDER BY n.id DESC LIMIT ? OFFSET ?",actor,role,size,(long)page*size);
        return Map.of("items",items,"unreadCount",db.count("SELECT COUNT(*) "+FROM+" AND n.read_at IS NULL",actor,role),"totalItems",db.count("SELECT COUNT(*) "+FROM,actor,role));
    }
    public Map<String,Object> read(String actor,long id){String role=role(actor,true);db.row("SELECT n.id "+FROM+" AND n.id=? FOR UPDATE",actor,role,id);db.update("UPDATE ticket_notifications SET read_at=COALESCE(read_at,UTC_TIMESTAMP(6)) WHERE id=? AND recipient_user_id=?",id,actor);return db.row("SELECT id,read_at AS readAt FROM ticket_notifications WHERE id=?",id);}
}
