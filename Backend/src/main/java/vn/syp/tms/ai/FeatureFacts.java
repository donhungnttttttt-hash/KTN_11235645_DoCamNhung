package vn.syp.tms.ai;

import java.util.*;
import vn.syp.tms.reporting.ReportMetrics;
import vn.syp.tms.workitem.WorkItemStore;

/** Bounded read projection. Caller establishes project access before any retrieval. */
public final class FeatureFacts {
    private final WorkItemStore db;
    public FeatureFacts(WorkItemStore db) { this.db=db; }
    private static final String ACTIVE=" FROM import_rows r JOIN import_batches b ON b.project_id=r.project_id AND b.id=r.batch_id JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id WHERE r.project_id=? AND r.target_case_id IS NOT NULL AND b.status='COMMITTED' AND b.archived_at IS NULL AND f.archived_at IS NULL";
    public Map<String,Object> metrics(long project,Long feature) {
        var values=db.row("SELECT COUNT(*) AS total,COALESCE(SUM(r.result_status='NA'),0) AS na,COALESCE(SUM(r.result_status='OK'),0) AS ok,COALESCE(SUM(r.result_status='NG'),0) AS ng,COALESCE(SUM(r.result_status='P'),0) AS pending"+ACTIVE+featureFilter(feature),args(project,feature));
        return ReportMetrics.counts(number(values,"total"),number(values,"na"),number(values,"ok"),number(values,"ng"),number(values,"pending"));
    }
    public Map<String,Object> snapshot(long project,Long feature,Long member,boolean management,String question) {
        var result=new LinkedHashMap<String,Object>();
        if(management) {
            result.put("execution",metrics(project,feature));
            result.put("workByStatus",db.rows("SELECT w.item_type AS type,w.status_code AS status,COUNT(*) AS total FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id JOIN testing_features f ON f.project_id=x.project_id AND f.id=x.feature_id LEFT JOIN import_batches document ON document.project_id=x.project_id AND document.id=x.document_id WHERE w.project_id=? AND x.deleted_at IS NULL AND f.archived_at IS NULL AND (document.id IS NULL OR document.archived_at IS NULL) AND w.item_type IN ('BUG','QA')"+featureFilter(feature)+" GROUP BY w.item_type,w.status_code",args(project,feature)));
            result.put("experience",experience(project,feature));result.put("workload",workload(project,feature));
        }
        String request=fold(question);
        String counts=management?",COUNT(r.id) AS total,COALESCE(SUM(r.result_status<>'UNEXECUTED'),0) AS tested":"";
        String rowJoin=management?" LEFT JOIN import_rows r ON r.project_id=b.project_id AND r.batch_id=b.id AND r.target_case_id IS NOT NULL":"";
        result.put("sourceFiles",db.rows("SELECT b.id AS documentId,b.feature_id AS featureId,f.name AS featureName,b.file_name AS fileName"+counts+" FROM import_batches b JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id"+rowJoin+" WHERE b.project_id=? AND b.status='COMMITTED' AND b.archived_at IS NULL AND f.archived_at IS NULL"+featureFilter(feature)+(management?" GROUP BY b.id,b.feature_id,f.name,b.file_name":"")+" ORDER BY "+matchScore("b.file_name")+" DESC,b.id DESC LIMIT 10",append(args(project,feature),request)));
        result.put("selectedFileProgress",selectedFileProgress(project,feature,request));
        // Ordinary project read permission is independent of assignment.
        result.put("caseSample",cases(project,feature,null,question));
        var issueArgs=new ArrayList<Object>(List.of(project));if(feature!=null)issueArgs.add(feature);issueArgs.add(question==null?"":question);
        result.put("issueSample",db.rows("SELECT w.id,w.item_key AS itemKey,w.item_type AS type,w.title,LEFT(w.description,1500) AS description,w.status_code AS status,w.priority_code AS priority,x.feature_id AS featureId,x.document_id AS documentId,x.row_id AS rowId,LEFT(b.steps,1200) AS steps,LEFT(b.expected_result,1200) AS expectedResult,LEFT(b.actual_result,1200) AS actualResult,LEFT(q.question,1200) AS question FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id JOIN testing_features f ON f.project_id=x.project_id AND f.id=x.feature_id LEFT JOIN import_batches document ON document.project_id=x.project_id AND document.id=x.document_id LEFT JOIN bug_details b ON b.project_id=w.project_id AND b.work_item_id=w.id LEFT JOIN qa_details q ON q.project_id=w.project_id AND q.work_item_id=w.id WHERE w.project_id=? AND x.deleted_at IS NULL AND f.archived_at IS NULL AND (document.id IS NULL OR document.archived_at IS NULL) AND w.item_type IN ('BUG','QA')"+featureFilter(feature)+" ORDER BY (LOCATE(w.item_key,?)>0) DESC,w.updated_at DESC,w.id DESC LIMIT 5",issueArgs.toArray()));
        if(member!=null&&member>0) {
            result.put("personal",personal(project,member,feature));
            var own=new ArrayList<Object>(List.of(project,member));if(feature!=null)own.add(feature);
            result.put("myWorkSample",db.rows("SELECT w.id,w.item_key AS itemKey,w.item_type AS type,w.title,w.status_code AS status,w.priority_code AS priority FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id JOIN testing_features f ON f.project_id=x.project_id AND f.id=x.feature_id LEFT JOIN import_batches document ON document.project_id=x.project_id AND document.id=x.document_id WHERE w.project_id=? AND w.assignee_membership_id=? AND x.deleted_at IS NULL AND f.archived_at IS NULL AND (document.id IS NULL OR document.archived_at IS NULL) AND w.item_type IN ('BUG','QA')"+featureFilter(feature)+" ORDER BY w.updated_at DESC,w.id DESC LIMIT 5",own.toArray()));
            result.put("myCaseSample",cases(project,feature,member,question));
        }
        return result;
    }
    public List<Map<String,Object>> workload(long project,Long feature) {
        return db.rows("SELECT m.id AS membershipId,u.display_name AS assignee,COUNT(*) AS assignedCases,COALESCE(SUM(r.result_status='UNEXECUTED'),0) AS remainingCases FROM test_document_assignments a JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.assignee_membership_id JOIN identity_users u ON u.id=m.user_id JOIN import_rows r ON r.project_id=a.project_id AND r.id=a.row_id JOIN import_batches b ON b.project_id=r.project_id AND b.id=r.batch_id JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id WHERE a.project_id=? AND b.status='COMMITTED' AND b.archived_at IS NULL AND f.archived_at IS NULL"+featureFilter(feature)+" GROUP BY m.id,u.id,u.display_name ORDER BY assignedCases DESC,u.id LIMIT 20",args(project,feature));
    }
    public List<Map<String,Object>> experience(long project,Long feature) {
        // Distinct audit IDs avoid double counting old events after multi-Feature cloning.
        // mappedFeatures is provenance, never proof that an actor tested each cloned round.
        return db.rows("SELECT u.id AS actorId,u.display_name AS actor,COUNT(DISTINCT a.id) AS recordedChanges,COUNT(DISTINCT a.entity_id) AS recordedCases,COUNT(DISTINCT b.feature_id) AS mappedFeatures,MAX(a.occurred_at) AS lastRecordedAt FROM project_audit a JOIN identity_users u ON u.id=a.actor_id JOIN import_rows r ON r.project_id=a.project_id AND (r.id=a.entity_id OR r.source_import_row_id=a.entity_id) JOIN import_batches b ON b.project_id=r.project_id AND b.id=r.batch_id JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id WHERE a.project_id=? AND a.entity_type='TEST_DOCUMENT_ROW' AND a.action LIKE 'RESULT!_%' ESCAPE '!' AND b.status='COMMITTED'"+featureFilter(feature)+" GROUP BY u.id,u.display_name ORDER BY recordedChanges DESC,u.id LIMIT 20",args(project,feature));
    }
    public Map<String,Object> personal(long project,long member) {
        var result=personal(project,member,null);result.put("myCaseSample",cases(project,null,member,null));return result;
    }
    public Map<String,Object> personal(long project,long member,Long feature) {
        var result=new LinkedHashMap<String,Object>();
        var values=new ArrayList<Object>(List.of(project,member));if(feature!=null)values.add(feature);
        result.put("assignment",db.row("SELECT COUNT(*) AS assignedCases,COALESCE(SUM(r.result_status<>'UNEXECUTED'),0) AS testedCases"+ACTIVE.replace(" WHERE r.project_id=?"," JOIN test_document_assignments a ON a.project_id=r.project_id AND a.row_id=r.id WHERE r.project_id=?")+" AND a.assignee_membership_id=?"+featureFilter(feature),values.toArray()));
        String selected=feature==null?"":" AND EXISTS(SELECT 1 FROM import_rows r JOIN import_batches b ON b.project_id=r.project_id AND b.id=r.batch_id WHERE r.project_id=a.project_id AND (r.id=a.entity_id OR r.source_import_row_id=a.entity_id) AND b.feature_id=?)";
        result.put("recordedStatusChanges",db.count("SELECT COUNT(*) FROM project_audit a JOIN project_memberships m ON m.project_id=a.project_id AND m.user_id=a.actor_id WHERE a.project_id=? AND m.id=? AND a.entity_type='TEST_DOCUMENT_ROW' AND a.action LIKE 'RESULT!_%' ESCAPE '!'"+selected,values.toArray()));
        return result;
    }
    private List<Map<String,Object>> selectedFileProgress(long project,Long feature,String request) {
        if(request.isEmpty())return List.of();
        var values=append(args(project,feature),request);
        var rows=db.rows("SELECT b.id AS documentId,b.file_name AS fileName,COUNT(r.id) AS total,COALESCE(SUM(r.result_status='NA'),0) AS na,COALESCE(SUM(r.result_status='OK'),0) AS ok,COALESCE(SUM(r.result_status='NG'),0) AS ng,COALESCE(SUM(r.result_status='P'),0) AS pending FROM import_batches b JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id LEFT JOIN import_rows r ON r.project_id=b.project_id AND r.batch_id=b.id AND r.target_case_id IS NOT NULL WHERE b.project_id=? AND b.status='COMMITTED' AND b.archived_at IS NULL AND f.archived_at IS NULL"+featureFilter(feature)+" AND "+matchScore("b.file_name")+">0 GROUP BY b.id,b.file_name ORDER BY b.id DESC LIMIT 3",values);
        for(var row:rows)row.putAll(ReportMetrics.counts(number(row,"total"),number(row,"na"),number(row,"ok"),number(row,"ng"),number(row,"pending")));
        return rows;
    }
    private List<Map<String,Object>> cases(long project,Long feature,Long member,String question) {
        var values=new ArrayList<Object>(List.of(project));if(feature!=null)values.add(feature);if(member!=null)values.add(member);
        String exact=caseKey(question);if(exact!=null){values.add(exact);values.add(exact);}
        String request=fold(question);values.add(request);values.add(request);values.add(request);
        String joins=" JOIN test_cases c ON c.project_id=r.project_id AND c.id=r.target_case_id JOIN test_case_revisions rv ON rv.project_id=c.project_id AND rv.id=c.current_revision_id";
        // Rank explicit filename and longest literal case identity/title before the ordinary bounded sample.
        // All candidates are already scoped to the authorized project/Feature, regardless of assignment.
        var rows=db.rows("SELECT r.id AS rowId,r.batch_id AS documentId,b.feature_id AS featureId,r.target_case_id AS caseId,r.source_case_key AS sourceId,c.case_no AS caseNo,rv.title_vi AS title,rv.steps_vi AS steps,rv.expected_vi AS expectedResult,r.result_status AS status"+ACTIVE.replace(" WHERE r.project_id=?",joins+" WHERE r.project_id=?")+featureFilter(feature)+(member==null?"":" AND EXISTS(SELECT 1 FROM test_document_assignments a WHERE a.project_id=r.project_id AND a.row_id=r.id AND a.assignee_membership_id=?)")+(exact==null?"":" AND (c.case_no=? OR r.source_case_key=?)")+" ORDER BY "+matchScore("b.file_name")+" DESC,GREATEST("+matchScore("rv.title_vi")+","+matchScore("r.source_case_key")+") DESC,r.id LIMIT 5",values.toArray());
        for(var row:rows){
            long id=number(row,"rowId");
            row.put("cellOverrides",db.rows("SELECT column_index AS columnIndex,LEFT(cell_value,1200) AS value FROM test_document_cell_edits WHERE project_id=? AND row_id=? ORDER BY column_index LIMIT 16",project,id));
            row.put("resultHistory",db.rows("SELECT a.action,a.occurred_at AS recordedAt,u.display_name AS actor,CASE WHEN a.entity_id=r.id THEN 'CURRENT_ROW' ELSE 'MIGRATED_SOURCE' END AS origin FROM import_rows r JOIN project_audit a ON a.project_id=r.project_id AND (a.entity_id=r.id OR a.entity_id=r.source_import_row_id) JOIN identity_users u ON u.id=a.actor_id WHERE r.project_id=? AND r.id=? AND a.entity_type='TEST_DOCUMENT_ROW' AND a.action LIKE 'RESULT!_%' ESCAPE '!' ORDER BY a.id DESC LIMIT 10",project,id));
        }
        return rows;
    }
    private static Object[] append(Object[] values,Object value){var result=Arrays.copyOf(values,values.length+1);result[values.length]=value;return result;}
    private static String fold(String value){return java.text.Normalizer.normalize(Objects.toString(value,""),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replace('đ','d');}
    /** Source-owned expressions only. Literal containment avoids wildcard interpretation of question text. */
    private static String matchScore(String field){
        String folded="REPLACE(REPLACE(REGEXP_REPLACE(CONVERT(COALESCE("+field+",'') USING utf8mb4),CONCAT(CHAR(92 USING utf8mb4),'p{M}'),''),_utf8mb4'Đ',_utf8mb4'D'),_utf8mb4'đ',_utf8mb4'd') COLLATE utf8mb4_0900_ai_ci";
        return "CASE WHEN CHAR_LENGTH("+field+")>=3 AND LOCATE("+folded+",CONVERT(? USING utf8mb4) COLLATE utf8mb4_0900_ai_ci)>0 THEN CHAR_LENGTH("+field+") ELSE 0 END";
    }
    /** Only whitelisted boolean categories leave this query, never identities or exact counts. */
    public Map<String,Object> safeExperienceOutside(String actor) {
        var rows=db.rows("SELECT MAX(a.action REGEXP '_NG$') AS hasFailurePractice,MAX(a.action REGEXP '_P$') AS hasPendingPractice,MAX(a.action REGEXP '_NA$') AS hasNotApplicablePractice FROM project_audit a WHERE a.entity_type='TEST_DOCUMENT_ROW' AND a.action LIKE 'RESULT!_%' ESCAPE '!' AND NOT EXISTS(SELECT 1 FROM project_memberships m WHERE m.project_id=a.project_id AND m.user_id=? AND m.active=TRUE) HAVING COUNT(DISTINCT a.actor_id)>=5 AND COUNT(DISTINCT a.project_id)>=2",actor);
        if(rows.isEmpty())return Map.of("available",false,"limitation","Chưa đủ bằng chứng tổng hợp ẩn danh ngoài phạm vi.");
        var row=rows.getFirst();var categories=new ArrayList<String>();
        if(flag(row.get("hasFailurePractice")))categories.add("Khi ghi NG, mô tả actual rõ và liên kết Issue.");
        if(flag(row.get("hasPendingPractice")))categories.add("Phân biệt P đang chờ với Unexecuted.");
        if(flag(row.get("hasNotApplicablePractice")))categories.add("Giữ NA trong tổng số case.");
        return Map.of("available",true,"patterns",categories,"limitation","Kinh nghiệm ẩn danh chỉ để tham khảo; không kết luận năng lực cá nhân hay tình trạng một dự án.");
    }
    private static String caseKey(String question) {
        if(question==null)return null;
        var matcher=java.util.regex.Pattern.compile("(?i)\\b(?:XLSX-\\d+-\\d+|CASE-\\d+|TC[-_]?\\d+)\\b").matcher(question);
        if(matcher.find())return matcher.group();
        matcher=java.util.regex.Pattern.compile("(?i)\\bcase\\s+#?(\\d+)\\b").matcher(question);return matcher.find()?matcher.group(1):null;
    }
    private static String featureFilter(Long feature){return feature==null?"":" AND f.id=?";}
    private static boolean flag(Object value){return Boolean.TRUE.equals(value)||value instanceof Number n&&n.intValue()!=0;}
    private static long number(Map<String,Object> row,String key){return row.get(key) instanceof Number n?n.longValue():0;}
    private static Object[] args(long project,Long feature){return feature==null?new Object[]{project}:new Object[]{project,feature};}
}
