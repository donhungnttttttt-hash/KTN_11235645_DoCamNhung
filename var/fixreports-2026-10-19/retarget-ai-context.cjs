const fs=require('node:fs'),p='Backend/src/main/java/vn/syp/tms/ai/AiContextService.java';
let s=fs.readFileSync(p,'utf8');
const start=s.indexOf('            rows=db.rows("""',s.indexOf('if(purpose==AiPurpose.PM_ASSIGNMENT_SUGGESTION)'));
const end=s.indexOf('        } else {',start);
s=s.slice(0,start)+`            rows=db.rows("SELECT b.id,CONCAT(f.name,' · ',b.file_name) AS label FROM import_batches b JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id WHERE b.project_id=? AND b.status='COMMITTED' AND b.archived_at IS NULL AND f.archived_at IS NULL AND (?='' OR LOCATE(?,b.file_name)>0 OR LOCATE(?,f.name)>0) ORDER BY b.id DESC LIMIT 51",p,q,q,q);
`+s.slice(end);
s=s.replace('case "FILE_GROUP" -> "file:"+target;','case "DOCUMENT" -> "document:"+target;');
const from=s.indexOf('    private void project('),to=s.indexOf('    private void ticket(',from);
s=s.slice(0,from)+`    private void project(long p,AiPurpose purpose,List<AiDraftService.Source> sources,List<Map<String,Object>> facts) {
        var project=db.row("SELECT code,name,lock_version AS version FROM projects WHERE id=?",p);
        var current=new LinkedHashMap<String,Object>(new FeatureFacts(db).snapshot(p,null,null,true,null));
        current.put("name",project.get("name"));current.put("code",project.get("code"));
        add(sources,facts,"project:"+p,"Tổng quan dự án","/board/testing",number(project,"version"),current);
    }
    private void assignment(long p,long document,List<AiDraftService.Source> sources,List<Map<String,Object>> facts) {
        var file=db.row("SELECT b.id,b.lock_version AS version,b.file_name AS fileName,b.feature_id AS featureId,f.name AS featureName,f.environment FROM import_batches b JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id WHERE b.project_id=? AND b.id=? AND b.status='COMMITTED' AND b.archived_at IS NULL AND f.archived_at IS NULL",p,document);
        var projection=new FeatureFacts(db);
        file.put("candidates",db.rows("SELECT m.id AS membershipId,u.display_name AS displayName,COUNT(CASE WHEN f.id IS NOT NULL THEN a.row_id END) AS assignedCases,COALESCE(SUM(f.id IS NOT NULL AND r.result_status='UNEXECUTED'),0) AS remainingCases FROM project_memberships m JOIN identity_users u ON u.id=m.user_id LEFT JOIN test_document_assignments a ON a.project_id=m.project_id AND a.assignee_membership_id=m.id LEFT JOIN import_rows r ON r.project_id=a.project_id AND r.id=a.row_id LEFT JOIN import_batches b ON b.project_id=r.project_id AND b.id=r.batch_id AND b.status='COMMITTED' AND b.archived_at IS NULL LEFT JOIN testing_features f ON f.project_id=b.project_id AND f.id=b.feature_id AND f.archived_at IS NULL WHERE m.project_id=? AND m.active=TRUE AND m.project_role='TESTER' AND u.enabled=TRUE AND u.role_code<>'DEV' GROUP BY m.id,u.display_name ORDER BY assignedCases,m.id LIMIT 10",p));
        file.put("recordedHistory",projection.experience(p,number(file,"featureId")));
        add(sources,facts,"document:"+document,Objects.toString(file.get("fileName")),"/board/testing/features/"+number(file,"featureId")+"/documents/"+document,number(file,"version"),file);
    }
    private void ownWork(long p,Long member,List<AiDraftService.Source> sources,List<Map<String,Object>> facts) {
        Object own=member==null?Map.of("limitation","Không có phân công thành viên dự án; không tạo thành viên giả."):new FeatureFacts(db).personal(p,member);
        add(sources,facts,"my-work","Công việc của tôi","/board/testing",null,own);
    }
`+s.slice(to);
s=s.replace('Tối đa 10 tester đang hoạt động, ưu tiên số case đang được giao ít hơn, tối đa 3 máy/người. Máy phải được PM kiểm tra tương thích trước khi giao. Đây không phải xếp hạng năng lực; thiếu lịch rảnh và kinh nghiệm thực tế.','Tối đa 10 tester đang hoạt động, workload từ phân công case hiện tại và kinh nghiệm từ actor trong audit Status. Số thay đổi được ghi không phải số lần thực thi thực tế hoặc xếp hạng năng lực. Thiếu lịch rảnh và độ khó; gợi ý không tự phân công.');
s=s.replace('Chỉ công việc của người yêu cầu trong 14 ngày; tối đa 8 phiên gần nhất. Số attempt có thể gồm test lại, không phải số case duy nhất.','Chỉ phân công hiện hành và thay đổi Status do người yêu cầu thực sự ghi; tối đa 5 case cá nhân. Thay đổi Status không phải số lần thực thi thực tế.');
s=s.replace('Kết quả kiểm thử lấy lần thực thi mới nhất của từng run-item ở đợt ACTIVE. Tối đa 8 mốc; dùng deadlineStatus do hệ thống tính. Không suy nhanh/chậm từ phần trăm hoặc dữ liệu demo.','Kết quả từ Status hiện tại của case trong Feature/file chưa lưu trữ; P/NA tính đã test và NA giữ trong tổng số case. Không suy nhanh/chậm hoặc nghiệm thu chỉ từ phần trăm.');
fs.writeFileSync(p,s);
const portfolio='Backend/src/main/java/vn/syp/tms/ai/AiPortfolioContext.java';let text=fs.readFileSync(portfolio,'utf8');
text=text.slice(0,text.indexOf('    private Map<String,Object> metrics('))+'}\n';fs.writeFileSync(portfolio,text);
