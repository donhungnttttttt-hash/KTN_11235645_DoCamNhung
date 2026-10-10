package vn.syp.tms.retest;

import java.util.Map;
import org.springframework.stereotype.Component;
import vn.syp.tms.workitem.WorkItemStore;
import static vn.syp.tms.workitem.WorkItemStore.*;

/** Called under the project write lock, in the caller's transaction. */
@Component
public class BugRetestLifecycle {
    private final WorkItemStore db;
    public BugRetestLifecycle(WorkItemStore db) { this.db=db; }
    public void ensure(long p,long bug) {
        db.update("INSERT INTO bug_retest_state(project_id,work_item_id) VALUES(?,?) ON DUPLICATE KEY UPDATE round_no=round_no",p,bug);
    }
    public void invalidate(long p,long bug,boolean clearBuild) {
        ensure(p,bug);
        db.update("UPDATE bug_retest_state SET round_no=round_no+1,current_coverage_id=NULL WHERE project_id=? AND work_item_id=?",p,bug);
        cancel(p,bug);
        if(clearBuild) db.update("UPDATE bug_details SET fixed_build_id=NULL WHERE project_id=? AND work_item_id=?",p,bug);
    }
    public void cancel(long p,long bug) {
        db.update("UPDATE retest_requests SET status='CANCELLED',lock_version=lock_version+1 WHERE project_id=? AND work_item_id=? AND status='OPEN'",p,bug);
    }
    public static boolean terminal(Object status) { return java.util.Set.of("closed","unreproducible","wontfix").contains(status); }
    public static void editable(Map<String,Object> bug) {
        if(terminal(bug.get("status"))) fail(422,"REOPEN_REQUIRED","PM cần mở lại lỗi có lý do trước khi thay đổi nội dung hoặc phạm vi.");
    }
}
