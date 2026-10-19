package vn.syp.tms.reporting;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.ai.FeatureFacts;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.workitem.WorkItemStore;

@Service
@Transactional
public class ManagementReportService {
    private final WorkItemStore db;
    private final ProjectService projects;
    private final IdentityService identity;
    private final ProjectAudit audit;
    public ManagementReportService(WorkItemStore db,ProjectService projects,IdentityService identity,ProjectAudit audit) {
        this.db=db;this.projects=projects;this.identity=identity;this.audit=audit;
    }
    private static final String SELECT="SELECT id,project_id AS projectId,feature_id AS featureId,title,markdown,lock_version AS version,created_at AS createdAt,updated_at AS updatedAt FROM project_management_reports";
    private void authorize(long p,String actor,boolean write) {
        if(write){projects.lockWritableProject(p,actor);return;}
        projects.requireReadAccess(p,actor);
        if(!identity.isAdmin(actor)&&db.count("SELECT COUNT(*) FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.user_id=? AND m.active=TRUE AND m.project_role='PM' AND u.enabled=TRUE AND u.role_code<>'DEV'",p,actor)!=1)
            WorkItemStore.fail(403,"MANAGEMENT_REPORT_FORBIDDEN","Bạn không có quyền truy cập báo cáo quản trị của dự án.");
    }
    @Transactional(readOnly=true)
    public Map<String,Object> summary(long p,String actor,Long feature) {
        authorize(p,actor,false);
        var result=new LinkedHashMap<String,Object>();
        result.put("project",db.row("SELECT id,code,name,description FROM projects WHERE id=?",p));
        result.put("feature",feature==null?null:db.row("SELECT id,name,environment,description FROM testing_features WHERE project_id=? AND id=? AND archived_at IS NULL",p,feature));
        var projection=new FeatureFacts(db);result.put("metrics",projection.metrics(p,feature));
        var features=db.rows("SELECT f.id,f.name,f.environment,COUNT(r.id) AS caseCount,COALESCE(SUM(r.result_status<>'UNEXECUTED'),0) AS testedCaseCount FROM testing_features f LEFT JOIN import_batches b ON b.project_id=f.project_id AND b.feature_id=f.id AND b.status='COMMITTED' AND b.archived_at IS NULL LEFT JOIN import_rows r ON r.project_id=b.project_id AND r.batch_id=b.id AND r.target_case_id IS NOT NULL WHERE f.project_id=? AND f.archived_at IS NULL GROUP BY f.id,f.name,f.environment ORDER BY f.id DESC",p);
        for(var row:features){long total=WorkItemStore.number(row,"caseCount");row.put("progressPercent",total==0?0d:100d*WorkItemStore.number(row,"testedCaseCount")/total);}
        result.put("features",features);
        result.put("issues",db.rows("SELECT w.item_type AS type,w.status_code AS status,COUNT(*) AS total FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id JOIN testing_features f ON f.project_id=x.project_id AND f.id=x.feature_id WHERE w.project_id=? AND x.deleted_at IS NULL AND f.archived_at IS NULL AND w.item_type IN ('BUG','QA')"+(feature==null?"":" AND x.feature_id=?")+" GROUP BY w.item_type,w.status_code",feature==null?new Object[]{p}:new Object[]{p,feature}));
        result.put("asOf",java.time.Instant.now());result.put("timeZone","Asia/Ho_Chi_Minh");return result;
    }
    public Map<String,Object> previewContext(long p,String actor,Long feature) {authorize(p,actor,true);return summary(p,actor,feature);}
    @Transactional(readOnly=true)
    public Map<String,Object> get(long p,String actor,long id) {authorize(p,actor,false);return db.row(SELECT+" WHERE project_id=? AND id=?",p,id);}
    @Transactional(readOnly=true)
    public Map<String,Object> list(long p,String actor,int page,int size) {
        authorize(p,actor,false);if(page<0||size<1||size>100)WorkItemStore.fail(422,"INVALID_PAGE","Phân trang không hợp lệ.");
        long total=db.count("SELECT COUNT(*) FROM project_management_reports WHERE project_id=?",p);
        var items=db.rows("SELECT id,project_id AS projectId,feature_id AS featureId,title,lock_version AS version,created_at AS createdAt,updated_at AS updatedAt FROM project_management_reports WHERE project_id=? ORDER BY updated_at DESC,id DESC LIMIT ? OFFSET ?",p,size,(long)page*size);
        return Map.of("items",items,"totalItems",total,"page",page,"size",size,"totalPages",(total+size-1)/size);
    }
    @Transactional(readOnly=true)
    public void requireReadManagement(long project,String actor) {authorize(project,actor,false);}

    public Map<String,Object> create(long p,String actor,ManagementReportDtos.Create input) {
        authorize(p,actor,true);
        if(input.featureId()!=null)
            db.row("SELECT id FROM testing_features WHERE project_id=? AND id=? AND archived_at IS NULL",p,input.featureId());
        // Markdown is deliberately stored verbatim. Editing a report is never a business-data command.
        long id=db.insert("INSERT INTO project_management_reports (project_id,feature_id,title,markdown,created_by_user_id,updated_by_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
            p,input.featureId(),input.title().trim(),input.markdown(),actor,actor);
        audit.record(p,actor,"MANAGEMENT_REPORT",id,"CREATE");
        return get(p,actor,id);
    }
    public Map<String,Object> update(long p,String actor,long id,ManagementReportDtos.Update input) {
        authorize(p,actor,true);
        var current=db.row(SELECT+" WHERE project_id=? AND id=? FOR UPDATE",p,id);
        WorkItemStore.version(current,input.expectedVersion());
        if(db.update("UPDATE project_management_reports SET title=?,markdown=?,lock_version=lock_version+1,updated_by_user_id=?,updated_at=UTC_TIMESTAMP(6) WHERE project_id=? AND id=? AND lock_version=?",
            input.title().trim(),input.markdown(),actor,p,id,input.expectedVersion())!=1)
            WorkItemStore.fail(409,"VERSION_CONFLICT","Báo cáo đã thay đổi. Tải lại để đối chiếu; bản đang sửa được giữ nguyên.");
        audit.record(p,actor,"MANAGEMENT_REPORT",id,"UPDATE");
        return get(p,actor,id);
    }
}
