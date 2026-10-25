package db.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.Savepoint;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;

/** Additive, synthetic demo for local installations only. V1-V33 and existing business rows stay immutable. */
public final class V34__complete_local_demo extends BaseJavaMigration {
    private static final String PASSWORD = "TmsDemo34!2026"; // Public local-demo credential, never a production credential.
    private static final String[] USERS = {"admin", "pm", "dev01", "dev02", "tester01", "tester02"};
    private static final String[] ROLES = {"ADMIN", "PM", "DEV", "DEV", "TESTER", "TESTER"};
    private static final String[] BUG_STATUSES = {"open", "progress", "recheck", "clarify", "ready", "planning", "resolved", "unreproducible", "wontfix", "closed"};
    private static final String[] QA_STATUSES = {"open", "progress", "clarify", "resolved", "recheck", "closed"};
    private static final String[][] RESULTS = {
        {"OK", "OK", "OK", "OK", "OK", "OK", "OK", "NG", "P", "NA"},
        {"OK", "OK", "OK", "OK", "OK", "NG", "NG", "P", "NA", "UNEXECUTED"},
        {"OK", "OK", "NG", "P", "NA", "UNEXECUTED", "UNEXECUTED", "UNEXECUTED", "UNEXECUTED", "UNEXECUTED"},
        {"OK", "NG", "NA", "UNEXECUTED", "UNEXECUTED", "UNEXECUTED", "UNEXECUTED", "UNEXECUTED", "UNEXECUTED", "UNEXECUTED"}
    };
    private final ObjectMapper json = new ObjectMapper();
    private Connection connection;
    private Instant now;
    private record Case(long row, long testCase, long revision, String sourceId, String title, String steps, String expected) {}
    private record Document(long id, long feature, String fileName, List<Case> cases) {}
    private record Project(long id, String code, Map<String, Long> members, List<Document> documents) {}

    @Override public void migrate(Context context) throws Exception {
        connection = Objects.requireNonNull(context.getConnection()); now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        boolean ownedTransaction = connection.getAutoCommit();
        if (ownedTransaction) connection.setAutoCommit(false);
        Savepoint savepoint = ownedTransaction ? null : connection.setSavepoint();
        try {
            requireUnusedNamespace(); createUsers();
            var projects = List.of(createProject(0), createProject(1));
            createInventory(projects); // A late uniqueness failure must roll back the complete fixture.
            if (ownedTransaction) connection.commit();
            else connection.releaseSavepoint(Objects.requireNonNull(savepoint));
        } catch (Exception failure) {
            try {
                if (ownedTransaction) connection.rollback();
                else connection.rollback(Objects.requireNonNull(savepoint));
            } catch (Exception rollbackFailure) { failure.addSuppressed(rollbackFailure); }
            throw failure;
        } finally {
            if (ownedTransaction) connection.setAutoCommit(true);
        }
    }

    private void requireUnusedNamespace() throws Exception {
        if (count("SELECT COUNT(*) FROM identity_users WHERE username LIKE 'syp.demo34.%'") > 0
                || count("SELECT COUNT(*) FROM projects WHERE code LIKE 'TMS-DEMO34-%'") > 0) {
            throw new IllegalStateException("DEMO34 namespace is already in use. Existing data was preserved; inspect the collision without cleaning or repairing migration history.");
        }
        for (String user : USERS) if (count("SELECT COUNT(*) FROM identity_users WHERE id=?", user(user)) > 0)
            throw new IllegalStateException("DEMO34 identity collision. Existing accounts were preserved.");
    }

    private void createUsers() throws Exception {
        var encoder = Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8();
        for (int i = 0; i < USERS.length; i++) {
            String name = USERS[i];
            update("INSERT INTO identity_users(id,username,display_name,password_hash,role_code,enabled,can_create_users,created_at) VALUES(?,?,?,?,?,TRUE,FALSE,?)",
                user(name), "syp.demo34." + name, "DEMO34 · " + ROLES[i] + " · " + name,
                "{pbkdf2-v5_8}" + encoder.encode(PASSWORD), ROLES[i], time(-20));
        }
        for (String name : USERS) update("INSERT INTO identity_audit(id,actor_id,subject_id,event_code,request_id,occurred_at) VALUES(?,?,?,'DEMO_SEED','flyway-v34-local',?)",
            key("identity/" + name), user("admin"), user(name), time(-20));
    }

    private Project createProject(int number) throws Exception {
        boolean mobile = number == 0;
        String code = "TMS-DEMO34-" + (mobile ? "MOBILE" : "WEB");
        long id = insert("INSERT INTO projects(code,name,description,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?)",
            code, mobile ? "[DEMO34] Spider Plus Mobile" : "[DEMO34] Cổng quản trị Web",
            "Bộ DEMO34 tổng hợp: Feature, Excel, Status, Bug/QA, phân công và báo cáo. Dữ liệu giả lập để thực hành; không phải dữ liệu hoặc yêu cầu của khách hàng.",
            time(-18), user("admin"), time(-1), user("pm"));
        var members = new LinkedHashMap<String, Long>();
        for (int i = 1; i < USERS.length; i++) members.put(USERS[i], insert("INSERT INTO project_memberships(project_id,user_id,project_role,created_at,updated_at) VALUES(?,?,?,?,?)",
            id, user(USERS[i]), ROLES[i], time(-18), time(-18)));
        audit(id, user("admin"), "PROJECT", id, "DEMO_SEED", -18);
        for (long member : members.values()) audit(id, user("admin"), "MEMBERSHIP", member, "DEMO_SEED", -18);
        createCatalogs(id, mobile);
        var documents = new ArrayList<Document>();
        String[] features = mobile ? new String[]{"Đăng nhập và phân quyền", "Quản lý bản vẽ"}
            : new String[]{"Quản trị dự án", "Báo cáo và phân tích"};
        for (int featureIndex = 0; featureIndex < features.length; featureIndex++) {
            String featureName = features[featureIndex];
            long feature = insert("INSERT INTO testing_features(project_id,name,environment,description,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                id, featureName, mobile ? "Thiết bị iPad/iPhone giả lập · QA nội bộ" : "Trình duyệt máy tính · QA nội bộ",
                "Feature DEMO34 có file chức năng và giao diện. Có thể phân công, đổi Status, tạo Issue và xuất Excel để thực hành.", user("pm"), user("pm"), time(-15 + featureIndex), time(-1));
            audit(id, user("pm"), "FEATURE", feature, "DEMO_SEED", -15 + featureIndex);
            for (int fileIndex = 0; fileIndex < 2; fileIndex++) documents.add(createDocument(id, number, featureIndex, fileIndex, feature, featureName, members));
        }
        var project = new Project(id, code, members, List.copyOf(documents));
        createIssues(project); createNotesAndReports(project, number); createHandbook(project);
        return project;
    }

    private void createCatalogs(long project, boolean mobile) throws Exception {
        update("INSERT INTO environments(project_id,code,name,description,created_at,updated_at) VALUES(?,'DEMO-QA','QA nội bộ DEMO34','Môi trường giả lập, không kết nối hệ thống khách hàng',?,?)", project, time(-18), time(-18));
        update("INSERT INTO builds(project_id,version_label,build_number,platform,notes,released_at,created_at,updated_at) VALUES(?,'1.0.0-DEMO','34',?,'Build giả lập DEMO34',?,?,?)",
            project, mobile ? "IOS" : "WEB", java.sql.Date.valueOf(now.atZone(java.time.ZoneOffset.UTC).toLocalDate().minusDays(10)), time(-18), time(-18));
        update("INSERT INTO devices(project_id,code,name,model,os_name,os_version,created_at,updated_at) VALUES(?,'DEMO-DEVICE',?,?,?,?,?,?)",
            project, mobile ? "iPad demo" : "Máy tính demo", mobile ? "iPad giả lập" : "Desktop giả lập", mobile ? "iPadOS" : "Windows", mobile ? "18" : "11", time(-18), time(-18));
        for (String category : List.of("FUNCTIONAL", "UI")) update("INSERT INTO categories(project_id,code,name,created_at,updated_at) VALUES(?,?,?,?,?)",
            project, category, "FUNCTIONAL".equals(category) ? "Chức năng" : "Giao diện", time(-18), time(-18));
        for (int index = 0; index < 2; index++) update("INSERT INTO milestones(project_id,code,name,starts_on,due_on,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
            project, index == 0 ? "DEMO-REVIEW" : "DEMO-RELEASE", index == 0 ? "Đối soát còn quá hạn · DEMO" : "Hoàn tất kiểm thử · DEMO",
            date(-14), date(index == 0 ? -2 : 14), time(-18), time(-18));
    }

    private Document createDocument(long project, int projectIndex, int featureIndex, int fileIndex, long feature,
            String featureName, Map<String, Long> members) throws Exception {
        String prefix = "D34-P" + (projectIndex + 1) + "-F" + (featureIndex + 1) + "-" + (fileIndex + 1);
        String fileName = prefix + (fileIndex == 0 ? "-chuc-nang.xlsx" : "-giao-dien.xlsx");
        var workbook = Demo34Workbook.create(prefix, prefix, featureName, fileIndex == 1);
        long document = insert("INSERT INTO import_batches(project_id,feature_id,file_name,file_checksum,status,mapping_version,total_rows,valid_rows,error_rows,staged_expires_at,committed_at,imported_by,created_at,sheet_name,source_workbook,lock_version) VALUES(?,?,?,?,'COMMITTED','INTERNAL_V1',10,10,0,?,?,?,?, 'TestCases',?,2)",
            project, feature, fileName, hash(workbook.bytes()), time(-10), time(-12), user("pm"), time(-12), workbook.bytes());
        long suite = insert("INSERT INTO test_suites(project_id,code,name,description,sort_order,created_at,updated_at) VALUES(?,?,?,'Bộ test case giả lập DEMO34',?,?,?)",
            project, "XLSX-" + document, featureName + (fileIndex == 0 ? " — Chức năng" : " — Giao diện"), fileIndex, time(-12), time(-12));
        var cases = new ArrayList<Case>();
        for (int i = 0; i < workbook.rows().size(); i++) {
            var row = workbook.rows().get(i); int rowNumber = i + 2;
            long testCase = insert("INSERT INTO test_cases(project_id,case_no,suite_id,owning_document_id,created_at,updated_at) VALUES(?,?,?,?,?,?)",
                project, "XLSX-" + document + "-" + rowNumber, suite, document, time(-12), time(-12));
            long revision = insert("INSERT INTO test_case_revisions(project_id,test_case_id,revision_no,title_vi,preconditions_vi,steps_vi,expected_vi,title_jp,preconditions_jp,steps_jp,expected_jp,source_reference,created_by,created_by_user_id,created_at) VALUES(?,?,1,?,?,?,?,?,?,?,?,?,?,?,?)",
                project, testCase, row.get("titleVi"), row.get("preconditionsVi"), row.get("stepsVi"), row.get("expectedVi"), "", "", "", "", row.get("sourceReference"), members.get("pm"), user("pm"), time(-12));
            update("UPDATE test_cases SET current_revision_id=? WHERE project_id=? AND id=?", revision, project, testCase);
            String status = RESULTS[projectIndex * 2 + featureIndex][i]; boolean executed = !"UNEXECUTED".equals(status);
            String tester = i % 2 == 0 ? "tester01" : "tester02";
            long imported = insert("INSERT INTO import_rows(project_id,batch_id,owning_document_id,source_row_number,source_case_key,suite_code,raw_data_json,target_case_id,is_valid,created_at,result_status,result_version,result_updated_by,result_updated_at,result_request_key) VALUES(?,?,?,?,?,?,?,?,TRUE,?,?,?,?,?,?)",
                project, document, document, rowNumber, row.get("caseNo"), "XLSX-" + document, encode(row), testCase, time(-12), status,
                executed ? 1 : 0, executed ? user(tester) : null, executed ? time(-4 + i % 4) : null, executed ? key(prefix + "/result/" + i) : null);
            update("INSERT INTO test_document_assignments(project_id,document_id,row_id,assignee_membership_id,first_tester_membership_id,latest_tester_membership_id) VALUES(?,?,?,?,?,?)",
                project, document, imported, members.get(tester), members.get("tester01"), i % 2 == 0 ? null : members.get("tester02"));
            if (executed) audit(project, user(tester), "TEST_DOCUMENT_ROW", imported, "RESULT_UNEXECUTED_" + status, -4 + i % 4);
            cases.add(new Case(imported, testCase, revision, String.valueOf(row.get("caseNo")), String.valueOf(row.get("titleVi")), String.valueOf(row.get("stepsVi")), String.valueOf(row.get("expectedVi"))));
        }
        // The assignment viewer pages by ID, so insert each batch in chronological order.
        for (var source : cases) assignment(project, document, source.row(), null, members.get("tester01"), 1, prefix + "/assign1", -10);
        for (int i = 1; i < cases.size(); i += 2) assignment(project, document, cases.get(i).row(), members.get("tester01"), members.get("tester02"), 2, prefix + "/assign2", -6);
        audit(project, user("pm"), "TEST_DOCUMENT", document, "DEMO_SEED", -12);
        return new Document(document, feature, fileName, List.copyOf(cases));
    }

    private void assignment(long project, long document, long row, Long previous, Long next, long version, String request, int day) throws Exception {
        update("INSERT INTO test_document_assignment_changes(project_id,document_id,row_id,previous_membership_id,new_membership_id,actor_id,changed_at,document_version,request_key) VALUES(?,?,?,?,?,?,?,?,?)",
            project, document, row, previous, next, user("pm"), time(day), version, key(request));
    }

    private void createIssues(Project project) throws Exception {
        for (int i = 0; i < BUG_STATUSES.length + QA_STATUSES.length; i++) {
            boolean bug = i < BUG_STATUSES.length; String status = bug ? BUG_STATUSES[i] : QA_STATUSES[i - BUG_STATUSES.length];
            boolean monkey = bug && i == 9;
            var document = project.documents().get(i % project.documents().size());
            var source = document.cases().get(i % document.cases().size());
            String title = (bug ? "[DEMO] Cần kiểm tra phản hồi: " : "[DEMO] Xác nhận cách xử lý: ") + source.title();
            String description = bug ? "Tình huống lỗi giả lập để thực hành phân công và chuyển trạng thái. Không phải lỗi được phát hiện trên hệ thống thật."
                : "Câu hỏi QA giả lập: phản hồi mong đợi của tình huống này cần hiển thị và lưu như thế nào?";
            String actual = bug ? "Dữ liệu mẫu minh họa một phản hồi chưa khớp mong đợi; cần đối soát theo kịch bản DEMO." : "Đang đối chiếu mô tả tình huống DEMO.";
            long assignee = Objects.requireNonNull(project.members().get(i % 2 == 0 ? "dev01" : "dev02"));
            String priority = i % 3 == 0 ? "HIGH" : i % 3 == 1 ? "MEDIUM" : "LOW";
            int finalVersion = "open".equals(status) ? 2 : 3;
            long item = insert("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,status_code,priority_code,assignee_membership_id,lock_version,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                project.id(), i + 1, project.code() + "-" + (i + 1), bug ? "BUG" : "QA", title, description, status,
                priority, assignee, finalVersion, project.members().get("tester01"), project.members().get("pm"),
                time(-8), time(-1), key(project.code() + "/issue/" + i), hash((project.code() + "/issue/" + i).getBytes(StandardCharsets.UTF_8)));
            update("INSERT INTO work_item_feature_context(project_id,work_item_id,feature_id,document_id,row_id,monkey,created_by_user_id) VALUES(?,?,?,?,?,?,?)",
                project.id(), item, document.feature(), monkey ? null : document.id(), monkey ? null : source.row(), monkey, user("tester01"));
            var context = new LinkedHashMap<String, Object>();
            context.put("featureId", document.feature());
            if (!monkey) { context.put("documentId", document.id()); context.put("fileName", document.fileName()); context.put("rowId", source.row());
                context.put("testCaseId", source.testCase()); context.put("revisionId", source.revision()); context.put("caseNo", source.sourceId()); }
            context.put("steps", source.steps()); context.put("expectedResult", source.expected()); context.put("actualResult", actual);
            if (bug) update("INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,test_case_id,revision_id,standalone_reason,context_snapshot) VALUES(?,?,'INTERNAL_V1',?,?,?,?,?,?,?)",
                project.id(), item, source.steps(), source.expected(), actual, monkey ? null : source.testCase(), monkey ? null : source.revision(), monkey ? "Bug monkey giả lập trong Feature DEMO34" : "", encode(context));
            else update("INSERT INTO qa_details(project_id,work_item_id,question,document_id,test_case_id,revision_id,context_snapshot) VALUES(?,?,?,?,?,?,?)",
                project.id(), item, description, document.id(), source.testCase(), source.revision(), encode(context));
            // Frozen history shape used by the current Issue viewer, including its readable change content.
            var snapshot = new LinkedHashMap<String, Object>();
            snapshot.put("id", item); snapshot.put("key", project.code() + "-" + (i + 1)); snapshot.put("type", bug ? "BUG" : "QA");
            snapshot.put("title", title); snapshot.put("description", "Mô tả demo ban đầu, chờ đối soát chi tiết.");
            snapshot.put("status", "open"); snapshot.put("priority", "MEDIUM"); snapshot.put("assigneeMembershipId", null);
            snapshot.put("featureId", document.feature()); snapshot.put("documentId", monkey ? null : document.id()); snapshot.put("rowId", monkey ? null : source.row());
            snapshot.put("monkey", monkey); snapshot.put("steps", source.steps()); snapshot.put("expectedResult", source.expected()); snapshot.put("actualResult", actual); snapshot.put("version", 0);
            history(project.id(), item, "CREATE", null, snapshot, "tester01", -8);
            var assigned = new LinkedHashMap<String, Object>(snapshot); assigned.put("description", description); assigned.put("priority", priority); assigned.put("assigneeMembershipId", assignee); assigned.put("version", 1); assigned.put("reason", "Phân công và đối soát nội dung minh họa DEMO34.");
            history(project.id(), item, "UPDATE", snapshot, assigned, "pm", -5);
            if (!"open".equals(status)) {
                var after = new LinkedHashMap<String, Object>(assigned); after.put("status", status); after.put("version", 2); after.put("reason", "Trạng thái minh họa trong bộ DEMO34.");
                history(project.id(), item, "STATUS", assigned, after, "pm", -2);
            }
            history(project.id(), item, "COMMENT", null, Map.of("body", bug ? "Ghi chú demo: DEV đối chiếu bước tái hiện; PM theo dõi việc xác minh." : "Trao đổi QA demo: thống nhất nội dung trước khi thực hiện kiểm thử.",
                "requestKey", key(project.code() + "/comment/" + i), "requestChecksum", hash(("comment/" + i).getBytes(StandardCharsets.UTF_8)), "version", finalVersion), "pm", -1);
            audit(project.id(), user("tester01"), "WORK_ITEM", item, "DEMO_SEED", -8);
        }
        update("INSERT INTO project_counters(project_id,counter_code,next_value) VALUES(?,'WORK_ITEM',17)", project.id());
    }

    private void createNotesAndReports(Project project, int number) throws Exception {
        for (int i = 0; i < 2; i++) {
            long note = insert("INSERT INTO project_notes(project_id,title,body,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
                project.id(), i == 0 ? "Hướng dẫn thực hành DEMO34" : "Checklist đối soát trước bàn giao",
                i == 0 ? "Dùng PM để phân công file, Tester để cập nhật Status và tạo Bug/QA, Dev để xử lý Issue được giao. Tất cả nội dung trong dự án này là giả lập."
                    : "Kiểm tra đủ người phụ trách; mở file Excel và lịch sử Status; đối chiếu Issue; chỉnh sửa và tải báo cáo. Bộ demo không tự gọi AI hay Redmine.",
                user("pm"), user("pm"), time(-7 + i), time(-3 + i));
            audit(project.id(), user("pm"), "PROJECT_NOTE", note, "DEMO_SEED", -7 + i);
            long report = insert("INSERT INTO project_management_reports(project_id,feature_id,title,markdown,created_by_user_id,updated_by_user_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                project.id(), i == 0 ? null : project.documents().get(0).feature(), i == 0 ? "Báo cáo tổng hợp DEMO34" : "Đối soát Feature DEMO34",
                "# Báo cáo minh họa DEMO34\n\nĐây là văn bản mẫu có thể chỉnh sửa; không phải kết luận kiểm thử thực tế.\n\n## Tại thời điểm khởi tạo\n\n"
                    + (number == 0 ? "Đã ghi Status 38/40 case (95%): 24 OK, 6 NG, 4 P, 4 NA và 2 chưa chạy." : "Đã ghi Status 16/40 case (40%): 6 OK, 4 NG, 2 P, 4 NA và 24 chưa chạy.")
                    + "\n\n## Việc tiếp theo\n\n- Đối soát case NG và các Bug liên quan.\n- Hoàn tất case đang chờ và chưa chạy.\n- Trao đổi các câu hỏi QA với PM.\n\nSố liệu văn bản này không tự cập nhật khi bạn thay đổi dữ liệu demo.",
                user("pm"), user("pm"), time(-3 + i), time(-3 + i));
            audit(project.id(), user("pm"), "MANAGEMENT_REPORT", report, "DEMO_SEED", -3 + i);
        }
    }

    private void createHandbook(Project project) throws Exception {
        long resource = insert("INSERT INTO project_resources(project_id,code,resource_type,name,created_at,updated_at) VALUES(?,'DEMO34-GUIDE','GUIDE','Sổ tay thực hành DEMO34',?,?)",
            project.id(), time(-15), time(-15));
        long revision = insert("INSERT INTO resource_revisions(project_id,resource_id,revision_no,content_html,visibility,edited_by,published_at,created_at) VALUES(?,?,1,?,'INTERNAL',?,?,?)",
            project.id(), resource, "Dự án DEMO34\n\nDữ liệu tổng hợp để thực hành quản lý kiểm thử theo Feature, file Excel, Status và Bug/QA.\n\nPM phân công; Tester ghi kết quả; DEV xử lý Issue được giao. Không dùng mật khẩu demo trên môi trường thật.",
            project.members().get("pm"), time(-15), time(-15));
        update("UPDATE project_resources SET current_revision_id=? WHERE project_id=? AND id=?", revision, project.id(), resource);
    }

    private void createInventory(List<Project> projects) throws Exception {
        int index = 0;
        for (String type : List.of("IPAD", "IPHONE", "ANDROID")) for (int sequence = 1; sequence <= 2; sequence++) {
            String suffix = type + "-0" + sequence;
            long asset = insert("INSERT INTO device_assets(asset_code,type,model,serial,os_name,os_version,condition_code,notes,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,'AVAILABLE','Thiết bị giả lập DEMO34; không phải tài sản thật',?,?,?,?)",
                "TMS-DEMO34-" + suffix, type, type + " DEMO " + sequence, "DEMO34-" + suffix,
                "ANDROID".equals(type) ? "Android" : "IPAD".equals(type) ? "iPadOS" : "iOS", "ANDROID".equals(type) ? "15" : "18", time(-16), user("admin"), time(-16), user("admin"));
            audit(null, user("admin"), "DEVICE_ASSET", asset, "DEMO_SEED", -16);
            if (index < 4) {
                var project = projects.get(index / 2);
                long allocation = insert("INSERT INTO device_allocations(asset_id,project_id,recipient_membership_id,assigned_at,assigned_by,expected_return_on,handover_note) VALUES(?,?,?,?,?,?,?)",
                    asset, project.id(), project.members().get(index % 2 == 0 ? "tester01" : "tester02"), time(-10), user("admin"), date(20), "Bàn giao giả lập để thực hành trong DEMO34");
                audit(project.id(), user("admin"), "DEVICE_ALLOCATION", allocation, "DEMO_SEED", -10);
            }
            index++;
        }
    }

    private void history(long project, long item, String event, Object before, Object after, String actor, int day) throws Exception {
        update("INSERT INTO work_item_feature_history(project_id,work_item_id,event_type,before_json,after_json,actor_user_id,created_at) VALUES(?,?,?,?,?,?,?)",
            project, item, event, before == null ? null : encode(before), encode(after), user(actor), time(day));
    }
    private void audit(Long project, String actor, String entity, long id, String action, int day) throws Exception {
        update("INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(?,?,?,?,?,?)", project, actor, entity, id, action, time(day));
    }
    private static String user(String name) { return key("user/" + name); }
    private static String key(String value) { return UUID.nameUUIDFromBytes(("tms-local-demo-v34/" + value).getBytes(StandardCharsets.UTF_8)).toString(); }
    private Timestamp time(int days) { return Timestamp.from(now.plus(days, ChronoUnit.DAYS)); }
    private java.sql.Date date(int days) { return java.sql.Date.valueOf(now.atZone(java.time.ZoneOffset.UTC).toLocalDate().plusDays(days)); }
    private String encode(Object value) throws Exception { return json.writeValueAsString(value); }
    private static String hash(byte[] value) throws Exception { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value)); }
    private void update(String sql, Object... values) throws Exception {
        try (var statement = connection.prepareStatement(sql)) { bind(statement, values); statement.executeUpdate(); }
    }
    private long insert(String sql, Object... values) throws Exception {
        try (var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            bind(statement, values); statement.executeUpdate();
            try (var keys = statement.getGeneratedKeys()) { if (!keys.next()) throw new IllegalStateException("Missing DEMO34 generated identity"); return keys.getLong(1); }
        }
    }
    private long count(String sql, Object... values) throws Exception {
        try (var statement = connection.prepareStatement(sql)) {
            bind(statement, values); try (var rows = statement.executeQuery()) { if (!rows.next()) throw new IllegalStateException("Missing DEMO34 count"); return rows.getLong(1); }
        }
    }
    private static void bind(java.sql.PreparedStatement statement, Object[] values) throws Exception {
        for (int index = 0; index < values.length; index++) statement.setObject(index + 1, values[index]);
    }
}
