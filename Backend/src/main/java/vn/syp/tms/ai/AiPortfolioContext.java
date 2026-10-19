package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.workitem.WorkItemStore;

/** Server-owned multi-project context; browser text never selects its project permissions. */
@Service
@Transactional
public class AiPortfolioContext {
    public static final String PURPOSE = "MY_PROJECTS";
    public static final String PROJECT_PURPOSE = "PROJECT_CHAT";
    static final int MAX_PROJECTS = 30;
    public record Scope(String reference, String role, List<Map<String,Object>> projects) {}
    private final WorkItemStore db;
    private final IdentityService identity;
    private final LocalAiAccess sessions;
    private final ObjectMapper json;
    public AiPortfolioContext(WorkItemStore db, IdentityService identity, LocalAiAccess sessions, ObjectMapper json) {
        this.db=db;this.identity=identity;this.sessions=sessions;this.json=json;
    }
    static final String INSTRUCTIONS = "For MY_PROJECTS, answer across the projects in the authorized snapshot. "
            + "For PROJECT_CHAT, focus on the selected target and use other authorized projects as background. "
            + "Use the current snapshot for current facts; history may be outdated. Name projects when comparing them. "
            + "Tested means Status other than UNEXECUTED: OK, NG, P and NA. NA remains in total; 100% is not customer acceptance. "
            + "myCaseSample/myWorkSample are personal assignments; caseSample/issueSample are bounded ordinary project-readable details. "
            + "personal contains only the current actor's assignment progress and recorded Status changes, scoped to the selected Feature when present. selectedFileProgress contains up to three explicitly named readable files; sourceFiles alone is only a ten-file metadata sample for workers. Case lookup prioritizes literal filename, source case ID or title matches within authorized scope, with at most five results. If a requested file/case cannot be identified, ask for its name/ID rather than extrapolating a sample. Each case includes at most ten recent actual resultHistory records; MIGRATED_SOURCE is older source provenance, not an execution in the copied round. Missing history is not proof nobody tested. "
            + "PM and ADMIN can read all projects through AI, without new PM business write rights. Restricted users cannot obtain management reports or bulk exports. "+
            "Use actual audit actors for experience, including prior actors and resets. Recorded Status changes are not physical test execution counts or competence scores. mappedFeatures describes migration provenance, not tests performed in each clone. Never infer experience from imported tester names. Suggestions never assign or change records. "
            + "Disclose totalProjects, includedProjects and truncation when the snapshot is partial. "
            + "If there are no projects, say there are no assigned projects in the provided scope. Do not invent facts. ";

    public Scope current(String actor) {
        return current(actor,null);
    }
    /** Empty selection means no grant; list callers can filter it without poisoning a transaction. */
    public Scope currentProject(String actor,long project) {
        return current(actor,project);
    }
    public Scope currentProject(String actor,long project,Long feature) {
        var scope=currentProject(actor,project);
        if(feature==null)return scope;
        requireProject(scope,scope.reference(),false);
        if(db.rows("SELECT id FROM testing_features WHERE project_id=? AND id=? FOR SHARE",project,feature).isEmpty())
            return new Scope(scope.reference(),scope.role(),List.of());
        return new Scope("project-chat-v1:"+db.checksum(List.of(scope.reference(),feature)),scope.role(),scope.projects());
    }
    public List<Map<String,Object>> projects(String actor) {return current(actor).projects();}
    public List<Map<String,Object>> features(String actor,long project) {
        var scope=currentProject(actor,project);requireProject(scope,scope.reference(),false);
        return db.rows("SELECT id,name,(archived_at IS NOT NULL) AS archived FROM testing_features WHERE project_id=? AND archived_at IS NULL ORDER BY id DESC",project);
    }
    private Scope current(String actor,Long project) {
        sessions.current(actor);
        String role=identity.lockCurrent(actor).getRole();
        boolean admin="ADMIN".equals(role)||"PM".equals(role);
        String query=admin ? """
            SELECT p.id,p.code,p.name,(p.archived_at IS NOT NULL) AS archived,'ADMIN' AS role,
                   m.project_role AS membershipRole,COALESCE(m.id,0) AS membershipId,COALESCE(m.lock_version,0) AS membershipVersion
            FROM projects p LEFT JOIN project_memberships m ON m.project_id=p.id AND m.user_id=? AND m.active=TRUE
            """ : """
            SELECT p.id,p.code,p.name,(p.archived_at IS NOT NULL) AS archived,m.project_role AS role,
                   m.project_role AS membershipRole,m.id AS membershipId,m.lock_version AS membershipVersion
            FROM projects p JOIN project_memberships m ON m.project_id=p.id
            WHERE m.user_id=? AND m.active=TRUE
            """;
        query+=" ORDER BY p.id FOR SHARE";
        var allRows=db.rows(query,actor);
        if(admin)allRows.forEach(row->row.put("role",role));
        var rows=project==null?allRows:allRows.stream().filter(row->WorkItemStore.number(row,"id")==project).toList();
        var grants=allRows.stream().map(row->List.of(row.get("id"),row.get("role"),row.get("membershipId"),row.get("membershipVersion"))).toList();
        return new Scope((project==null?"portfolio-v1:":"project-chat-v1:")+db.checksum(project==null?List.of(role,grants):List.of(role,grants,project)),role,List.copyOf(rows));
    }
    public void assertCurrent(String actor, String expected) {
        requireReference(current(actor),expected);
    }
    public void assertProjectCurrent(String actor,long project,String expected,boolean write) {
        requireProject(currentProject(actor,project),expected,write);
    }
    public void assertProjectCurrent(String actor,long project,Long feature,String expected,boolean write) {
        requireProject(currentProject(actor,project,feature),expected,write);
        if(write)requireActiveFeature(project,feature);
    }
    private static void requireProject(Scope scope,String expected,boolean write) {
        if(scope.projects().isEmpty())WorkItemStore.fail(404,"NOT_FOUND","Dự án không còn trong phạm vi được phép.");
        requireReference(scope,expected);
        if(write&&vn.syp.tms.reporting.ReportMetrics.excluded(scope.projects().getFirst().get("archived")))
            WorkItemStore.fail(409,"ARCHIVED","Dự án đã lưu trữ. Chỉ đọc hội thoại cũ.");
    }
    private static void requireReference(Scope current,String expected) {
        if(expected==null||!expected.equals(current.reference()))
            WorkItemStore.fail(404,"NOT_FOUND","Phạm vi dự án đã thay đổi. Tạo hội thoại mới để dùng quyền hiện tại.");
    }
    public AiDraftService.Task prepare(String actor, String expected, String key) {
        return prepare(actor,expected,key,null);
    }
    public AiDraftService.Task prepare(String actor,String expected,String key,String question) {
        var scope=current(actor);requireReference(scope,expected);
        return prepare(actor,scope,PURPOSE,key,null,null,question);
    }
    public AiDraftService.Task prepareProject(String actor,long project,String expected,String key) {
        return prepareProject(actor,project,null,expected,key,null);
    }
    public AiDraftService.Task prepareProject(String actor,long project,Long feature,String expected,String key,String question) {
        var scope=currentProject(actor,project,feature);requireProject(scope,expected,true);
        requireActiveFeature(project,feature);
        var result=prepare(actor,current(actor),PROJECT_PURPOSE,key,project,feature,question);
        return new AiDraftService.Task(result.purpose(),scope.reference(),result.promptVersion(),result.requestKey(),result.instructions(),result.data(),result.schema(),result.sources());
    }
    private AiDraftService.Task prepare(String actor,Scope scope,String purpose,String key,Long targetProject,Long targetFeature,String question) {
        boolean management=Set.of("PM","ADMIN").contains(scope.role());
        requireCapability(management,question);
        var data=json.createObjectNode().put("scope",purpose).put("systemRole",scope.role()).put("asOf",java.time.Instant.now().toString())
                .put("totalProjects",scope.projects().size()).put("includedProjects",Math.min(MAX_PROJECTS,scope.projects().size()))
                .put("truncated",scope.projects().size()>MAX_PROJECTS)
                .put("limitations","Dữ liệu Feature hiện hành; tối đa 10 file mẫu, 3 file được hỏi tên, 5 case/Issue và 10 thay đổi Status gần nhất mỗi case; 20 actor kinh nghiệm/workload chỉ cho quản lý. Tiến độ cá nhân chỉ thuộc người đang hỏi, theo Feature đã chọn; nền cùng dự án được giới hạn riêng. P/NA tính đã test, NA trong tổng. Audit nguồn cũ được đánh dấu MIGRATED_SOURCE; không suy ra số lần thực thi thực tế, lịch rảnh hay năng lực, hoặc kết luận từ dữ liệu không có trong phạm vi trả về.");
        if(targetProject!=null)data.put("targetProjectId",targetProject);
        if(targetFeature!=null)data.put("targetFeatureId",targetFeature);
        data.putObject("capabilities").put("managementReport",management).put("assignmentAdvice",management).put("businessWrites",false);
        var projection=new FeatureFacts(db);
        if(!management)data.set("safeExperience",json.valueToTree(projection.safeExperienceOutside(actor)));
        var facts=data.putArray("sources");var sources=new ArrayList<AiDraftService.Source>();
        var ordered=new ArrayList<>(scope.projects());
        if(targetProject!=null)ordered.sort(Comparator.comparingInt(row->WorkItemStore.number(row,"id")==targetProject?0:1));
        for(var project:ordered.stream().limit(MAX_PROJECTS).toList()) {
            long id=WorkItemStore.number(project,"id"),member=WorkItemStore.number(project,"membershipId");
            var detail=new LinkedHashMap<String,Object>();
            detail.put("projectId",id);detail.put("code",project.get("code"));detail.put("name",project.get("name"));
            detail.put("accessRole",management?scope.role():project.get("role"));
            detail.put("myRole",member>0?project.getOrDefault("membershipRole",project.get("role")):null);
            boolean archived=vn.syp.tms.reporting.ReportMetrics.excluded(project.get("archived"));detail.put("archived",archived);
            if(!archived){
                detail.putAll(projection.snapshot(id,Objects.equals(targetProject,id)?targetFeature:null,member>0?member:null,management,question));
                if(Objects.equals(targetProject,id)&&targetFeature!=null)
                    detail.put("projectBackground",projection.snapshot(id,null,member>0?member:null,management,question));
            }
            String ref="project:"+id;
            facts.addObject().put("ref",ref).set("facts",json.valueToTree(detail));
            sources.add(new AiDraftService.Source(ref,project.get("code")+" · "+project.get("name"),
                    "ADMIN".equals(scope.role())?"/admin/projects/"+id:"/dashboard",null));
        }
        return new AiDraftService.Task(purpose,scope.reference(),PROJECT_PURPOSE.equals(purpose)?"project-chat-v1":"portfolio-v1",key,INSTRUCTIONS,data,AiChatService.schema(json),List.copyOf(sources));
    }
    /** Explicit request handling supplements, rather than replaces, the restricted data projection. */
    private static void requireCapability(boolean management,String question) {
        if(management||question==null)return;
        String value=java.text.Normalizer.normalize(question,java.text.Normalizer.Form.NFKD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replace('đ','d').replaceAll("[^\\p{L}\\p{N}]+"," ").strip();
        boolean download=value.matches("(?s).*\\b(?:xuat|export|download)\\b.*")
                ||value.matches("(?s).*\\btai (?:xuong|ve|du lieu|file|case|test|xlsx|excel|bao cao|toan bo|tat ca)\\b.*");
        boolean bulk=download&&value.matches("(?s).*\\b(?:toan bo|tat ca|all|bulk|hang loat)\\b.*");
        boolean analysis=value.matches("(?s).*(?:bao cao|report|phan tich|analysis|analy[sz]e|tong hop|summary).*" );
        boolean personal=value.matches("(?s).*(?:cua toi|ca nhan|personal|my (?:assigned |own |current |detailed )*(?:work|progress|tasks)).*");
        boolean managementScope=value.matches("(?s).*(?:quan ly|management|team workload|all team members|nhu man.*tong hop.*phan tich).*" );
        boolean wholeProject=value.matches("(?s).*(?:toan.*du an|tong.*du an|project wide|whole project|all projects|entire project).*" );
        if(bulk||analysis&&(managementScope||wholeProject&&!personal))WorkItemStore.fail(403,"AI_CAPABILITY_DENIED","Vai trò hiện tại không có quyền phân tích/báo cáo quản lý hoặc xuất hàng loạt. Bạn có thể hỏi chi tiết case/Issue/file được phép đọc và tiến độ công việc của mình.");
    }
    private void requireActiveFeature(long project,Long feature) {
        if(feature!=null&&db.row("SELECT archived_at AS archivedAt FROM testing_features WHERE project_id=? AND id=? FOR SHARE",project,feature).get("archivedAt")!=null)
            WorkItemStore.fail(409,"ARCHIVED","Feature đã lưu trữ. Chỉ đọc hội thoại cũ.");
    }
}
