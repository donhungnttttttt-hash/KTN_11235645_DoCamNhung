const fs=require('fs');
const source='Backend/src/main/java/vn/syp/tms/ai/FeatureFacts.java';
let s=fs.readFileSync(source,'utf8');
// The alias is intentionally different from bug_details b; a missing optional document remains readable.
s=s.replaceAll('LEFT JOIN bug_details b ON','LEFT JOIN import_batches document ON document.project_id=x.project_id AND document.id=x.document_id LEFT JOIN bug_details b ON');
s=s.replaceAll("WHERE w.project_id=? AND x.deleted_at IS NULL", "LEFT JOIN import_batches document ON document.project_id=x.project_id AND document.id=x.document_id WHERE w.project_id=? AND x.deleted_at IS NULL");
// issueSample already has the document join above.
s=s.replaceAll('LEFT JOIN qa_details q ON q.project_id=w.project_id AND q.work_item_id=w.id LEFT JOIN import_batches document ON document.project_id=x.project_id AND document.id=x.document_id WHERE','LEFT JOIN qa_details q ON q.project_id=w.project_id AND q.work_item_id=w.id WHERE');
s=s.replaceAll('WHERE w.project_id=? AND w.assignee_membership_id=?','LEFT JOIN import_batches document ON document.project_id=x.project_id AND document.id=x.document_id WHERE w.project_id=? AND w.assignee_membership_id=?');
s=s.replaceAll("AND x.deleted_at IS NULL AND f.archived_at IS NULL", "AND x.deleted_at IS NULL AND f.archived_at IS NULL AND (document.id IS NULL OR document.archived_at IS NULL)");
s=s.replace('        String counts=management?', '        String request=fold(question);\n        String counts=management?');
s=s.replace('" ORDER BY b.id DESC LIMIT 10",args(project,feature))', '" ORDER BY "+matchScore("b.file_name")+" DESC,b.id DESC LIMIT 10",append(args(project,feature),request))');
s=s.replace('        // Ordinary project read permission', '        result.put("selectedFileProgress",selectedFileProgress(project,feature,request));\n        // Ordinary project read permission');
s=s.replace('        if(member!=null&&member>0) {','        if(member!=null&&member>0) {\n            result.put("personal",personal(project,member,feature));');
const start=s.indexOf('    public Map<String,Object> personal('),end=s.indexOf('    /** Only whitelisted boolean categories',start);
s=s.slice(0,start)+String.raw`    public Map<String,Object> personal(long project,long member) {return personal(project,member,null);}
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
`+s.slice(end);
// String.raw keeps Java regex escapes; use one Java regex backslash pair.
s=s.replace('replaceAll("\\\\p{M}",','replaceAll("\\\\p{M}",');
fs.writeFileSync('var/fixreports-2026-10-19/FeatureFacts.java',s);
console.log('Worker projection candidate written outside Backend.');
