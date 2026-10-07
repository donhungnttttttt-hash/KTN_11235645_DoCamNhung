package vn.syp.tms.filework;

import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.qa.QaService;
import vn.syp.tms.workitem.WorkItemStore;
import static vn.syp.tms.workitem.WorkItemStore.*;

/** A live queue of outstanding work; reading it never acknowledges or completes a task. */
@Service @Transactional
public class ActionInboxService {
    private final WorkItemStore db;
    private final QaService identity;
    public ActionInboxService(WorkItemStore db,QaService identity){this.db=db;this.identity=identity;}

    public Map<String,Object> list(long projectId,String user,int page,int size,String kind) {
        var actor=identity.authorize(projectId,user,false);
        if(page<0 || size<1 || size>100 || !Set.of("","FILE","QA","BUG","RETEST").contains(kind))
            fail(422,"INVALID_FILTER","Bộ lọc công việc không hợp lệ.");
        var parts=new ArrayList<String>();var args=new ArrayList<Object>();
        if(!actor.archived() && (actor.pm() || actor.tester()) && (kind.isEmpty() || kind.equals("FILE"))) {
            parts.add("""
                SELECT 'FILE' AS kind,g.id,ib.file_name AS title,
                    COALESCE(s.state,'READY') AS status,g.updated_at AS updatedAt,
                    (SELECT GROUP_CONCAT(DISTINCT u.display_name ORDER BY u.display_name SEPARATOR ', ')
                     FROM file_work_group_items i JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id
                     JOIN project_memberships m ON m.project_id=r.project_id AND m.id=r.assignee_membership_id
                     JOIN identity_users u ON u.id=m.user_id WHERE i.project_id=g.project_id AND i.group_id=g.id) AS ownerName,
                    g.id AS targetId
                FROM file_work_groups g JOIN import_batches ib ON ib.project_id=g.project_id AND ib.id=g.document_id
                JOIN test_cycles c ON c.project_id=g.project_id AND c.id=g.cycle_id AND c.status_code<>'CLOSED'
                LEFT JOIN file_work_sessions s ON s.project_id=g.project_id AND s.group_id=g.id
                    AND s.id=(SELECT MAX(x.id) FROM file_work_sessions x WHERE x.project_id=g.project_id AND x.group_id=g.id)
                WHERE g.project_id=? AND COALESCE(s.state,'READY')<>'COMPLETED'
                """+(actor.pm()?"":" AND EXISTS(SELECT 1 FROM file_work_group_items i WHERE i.project_id=g.project_id AND i.group_id=g.id) AND NOT EXISTS(SELECT 1 FROM file_work_group_items i JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id WHERE i.project_id=g.project_id AND i.group_id=g.id AND r.assignee_membership_id<>?)"));
            args.add(projectId);if(!actor.pm())args.add(actor.membershipId());
        }
        if(!actor.archived() && (actor.pm() || actor.tester() || actor.dev()) && (kind.isEmpty() || kind.equals("QA"))) {
            String scope=actor.pm()?"w.status_code IN ('open','progress','clarify','resolved','recheck')":actor.dev()?"w.assignee_membership_id=? AND w.status_code IN ('open','progress')":"w.created_by=? AND w.status_code IN ('clarify','resolved')";
            parts.add("""
                SELECT 'QA' AS kind,w.id,w.title,w.status_code AS status,w.updated_at AS updatedAt,
                    u.display_name AS ownerName,w.id AS targetId
                FROM work_items w JOIN qa_details q ON q.project_id=w.project_id AND q.work_item_id=w.id
                LEFT JOIN project_memberships m ON m.project_id=w.project_id
                    AND m.id=CASE WHEN w.status_code IN ('clarify','resolved') THEN w.created_by ELSE w.assignee_membership_id END
                LEFT JOIN identity_users u ON u.id=m.user_id WHERE w.project_id=? AND w.item_type='QA' AND
                """+scope);
            args.add(projectId);if(!actor.pm())args.add(actor.membershipId());
        }
        if(!actor.archived() && (actor.pm() || actor.dev()) && (kind.isEmpty() || kind.equals("BUG"))) {
            parts.add("""
                SELECT 'BUG' AS kind,w.id,w.title,w.status_code AS status,w.updated_at AS updatedAt,u.display_name AS ownerName,w.id AS targetId
                FROM work_items w JOIN work_item_statuses st ON st.code=w.status_code
                LEFT JOIN project_memberships m ON m.project_id=w.project_id AND m.id=w.assignee_membership_id
                LEFT JOIN identity_users u ON u.id=m.user_id
                WHERE w.project_id=? AND w.item_type='BUG' AND st.terminal=FALSE
                """+(actor.pm()?"":" AND w.assignee_membership_id=? AND w.status_code NOT IN ('resolved','recheck')"));
            args.add(projectId);if(!actor.pm())args.add(actor.membershipId());
        }
        if(!actor.archived() && (actor.pm() || actor.tester()) && (kind.isEmpty() || kind.equals("RETEST"))) {
            parts.add("""
                SELECT 'RETEST' AS kind,q.id,w.title,q.status,q.created_at AS updatedAt,u.display_name AS ownerName,w.id AS targetId
                FROM retest_requests q JOIN work_items w ON w.project_id=q.project_id AND w.id=q.work_item_id
                JOIN bug_retest_state bs ON bs.project_id=q.project_id AND bs.work_item_id=q.work_item_id
                    AND bs.current_coverage_id=q.coverage_revision_id AND bs.round_no=q.round_no
                JOIN project_memberships m ON m.project_id=q.project_id AND m.id=q.assignee_membership_id
                JOIN identity_users u ON u.id=m.user_id
                WHERE q.project_id=? AND q.status='OPEN'
                """+(actor.pm()?"":" AND q.assignee_membership_id=?"));
            args.add(projectId);if(!actor.pm())args.add(actor.membershipId());
        }
        List<Map<String,Object>> items=List.of();long total=0;
        if(!parts.isEmpty()) {
            String from=" FROM ("+String.join(" UNION ALL ",parts)+") inbox";
            total=db.count("SELECT COUNT(*)"+from,args.toArray());args.add(size);args.add((long)page*size);
            items=db.rows("SELECT *"+from+" ORDER BY updatedAt DESC,kind,id DESC LIMIT ? OFFSET ?",args.toArray());
        }
        return Map.of("items",items,"totalItems",total,"page",page,"pageSize",size,"totalPages",(total+size-1)/size,
            "asOf",Instant.now(),"projectWide",actor.pm(),"archived",actor.archived());
    }
}
