# Rà soát backend và mô hình dữ liệu cho báo cáo hệ thống

Ngày: 19/10/2026. HEAD xác minh: `9ccc73483faddde48d930c9607f2f2f7f6981761`, nhánh làm việc được giao `system-design`. Đây là rà soát source, không phải kết quả chạy lại HTTP, test, migration hoặc metadata database. Không sửa code sản phẩm, không ghi DB, không restart, không gửi dữ liệu lên AI. Bằng chứng runtime lịch sử phải được tác giả báo cáo đối chiếu receipt riêng; các con số trong STATUS không được coi là phép đo mới của lượt này.

Quy ước đường dẫn rút gọn trong phần nhận xét: `feature/...`, `ai/...`, `project/...` và package Java khác đều tính từ `Backend/src/main/java/vn/syp/tms/`; `Vn__...sql` tính từ `Backend/src/main/resources/db/migration/`, riêng V20/V22 nằm ở `db/demo`. Manifest ghi đầy đủ đường dẫn không rút gọn. Số dòng chỉ là điểm dẫn vào symbol/nhánh được mô tả, không phải phạm vi dòng đầy đủ.

## 1. Phạm vi và phương pháp

Đã kiểm kê toàn bộ 40 tệp `*Controller.java`, 33 migration V1–V33 (gồm V20/V22 ở `db/demo`, V32/V33 là Java migration), 85 câu lệnh CREATE TABLE trong source và 133 tệp Java dưới `Backend/src/test`. Số 85 không gồm `flyway_schema_history`; không phải số bảng đang có trong server. 133 là số tệp Java được kiểm kê, gồm helper/test fixture, không phải số test thực thi. Manifest `backend-schema-inventory.json` chứa đường dẫn controller, annotation mapping và dòng, toàn bộ DDL CREATE/ALTER/INDEX theo tệp, danh sách test. DDL trong manifest là lịch sử thay đổi; không được trình bày CREATE V4/V7 như schema cuối mà bỏ ALTER V26/V31.

Đọc sâu: FeatureService, AssignmentPlan, FeatureIssueService; TestDocumentService và TestDocumentEditingService; ProjectService/ProjectActorService; IdentityService/SecurityConfig; Notes; ManagementReportService/ReportMetrics; DeviceInventoryService/ProjectLifecycleService; AiAccess/AiPortfolioContext/FeatureFacts/AiChatService; migrations V4/V7/V15/V25/V31 và luồng copy V32/V33. Đối chiếu FixReports contract và clarification 19/10, planning/STATUS và hướng dẫn repository. Các module legacy được kiểm kê endpoint và interceptor, đọc chọn lọc service; không tuyên bố đã kiểm mọi nhánh của tất cả service cũ. Không đọc sâu dependency, `target`, cache, file sinh tự động, credential hoặc dump DB. Không đọc Word gốc ở tiểu nhiệm vụ này.

| Skill đã đọc | Áp dụng thực tế | Đầu ra |
|---|---|---|
| domain-modeling | Phân biệt Feature, file, row/case/revision, phân công, Status và Issue | Từ điển và cardinality phần 2/5; không đổi mô hình sản phẩm |
| codebase-design | Xác định controller/service/store, các policy và chỗ tái sử dụng projection | Bản đồ module và luồng xuyên backend |
| api-design | Đối chiếu request/response, pagination, version, idempotency và lỗi | Bảng API và nhận xét sai khác envelope |
| security-review | Đọc session, CSRF, quyền project/role, scope AI và upload | Ma trận quyền và giới hạn kiểm chứng; không pentest/cài công cụ |
| code-review | So sánh mô tả mong muốn với implementation và nguồn quyết định | Các phát hiện có đường dẫn/dòng ở phần 8. Áp dụng review tài liệu độc lập theo yêu cầu người dùng, không chạy workflow review diff/issue-tracker hoặc sửa sản phẩm |

Các skill nằm tại `C:/Users/admin/.codex/skills/<tên>/SKILL.md`. Hướng dẫn trong skill về tạo glossary/refactor/issue không mở rộng phạm vi tác vụ biên soạn này.

## 2. Từ điển nghiệp vụ và hệ thống

| Khái niệm | Ý nghĩa hiện hành | Đại diện trong source |
|---|---|---|
| Project | Phạm vi cộng tác, thành viên, dữ liệu, cấu hình, archive | `projects`, `project_memberships` |
| Feature | Một đợt/phạm vi kiểm thử do người dùng đặt tên, có môi trường/server và mô tả; không mặc định là chức năng sản phẩm | `testing_features` |
| File test case | Bản import thuộc đúng một Feature trong luồng mới, workbook nguồn và nội dung hiện hành riêng | `import_batches` có `feature_id`; `source_workbook` |
| Dòng nguồn | Một dòng trong file, giữ source ID/row number/raw JSON; Status hiện hành gắn dòng | `import_rows` |
| Test case | Identity nội bộ, không lấy source ID hiển thị làm khóa toàn hệ thống | `test_cases`; số nội bộ `XLSX-{documentId}-{sourceRow}` |
| Revision | Nội dung có phiên bản của một case; `current_revision_id` chọn phiên bản hiện hành | `test_case_revisions` |
| Assignment | Trách nhiệm hiện tại theo row; first/latest là thông tin phân công, không chứng minh ai đã thao tác test | `test_document_assignments`, `test_document_assignment_changes` |
| Status | `UNEXECUTED/OK/NG/P/NA`, cập nhật trực tiếp theo row version | `import_rows.result_status`, `project_audit` |
| Bug/QA | Issue có Feature context, có thể gắn document+row; Monkey là cờ của BUG | `work_items`, `work_item_feature_context`, `bug_details/qa_details` |
| Note | Ghi chú văn bản dự án có title/body, soft archive | `project_notes` |
| Báo cáo quản lý | Markdown được lưu độc lập, chỉnh số trong báo cáo không sửa Issue hay case | `project_management_reports` |
| Chat/draft AI | Nội dung tạm, riêng từng tài khoản và phạm vi, không phải bản báo cáo đã lưu | `ai_chat_threads`, `ai_chat_turns`, `ai_generated_drafts` |
| Thiết bị vật lý | Tài sản và lịch sử bàn giao, độc lập với device cấu hình test cũ | `device_assets`, `device_allocations` khác `devices` |

## 3. Bản đồ module backend

Kiến trúc thực tế là một ứng dụng Spring Boot có các package theo chức năng. Controller nhận request và chuyển sang service; service áp dụng quyền, transaction và business rule. Một phần identity/project dùng Spring Data JPA, nhiều module nghiệp vụ dùng JdbcTemplate/WorkItemStore và SQL tường minh. Không mô tả hệ thống là microservices hay toàn bộ persistence đều ORM. Dùng MySQL/Flyway; các adapter AI và Redmine là tích hợp ra ngoài, không phải actor có quyền tự cập nhật tất cả dữ liệu.

`Backend/pom.xml` khai báo Java 21, Spring Boot 3.5.16, Apache POI 5.5.1, Spring Security/Session JDBC, Actuator, Flyway MySQL; test có JUnit/Spring test/Testcontainers và JaCoCo 0.8.15. Đây là phiên bản cấu hình dự án, không phải phiên bản JVM/dependency runtime vừa đo. `application.yml` đặt JPA ddl-auto validate, SQL init never, Flyway clean-disabled/validate-on-migrate, credentials từ biến môi trường, bind mặc định 127.0.0.1:8080, Hikari pool5. `application-local.yml` thêm db/demo và cấu hình file local bên ngoài package, native MySQL default3307; không mở file credential. Docker/Testcontainers là công cụ kiểm thử riêng, không điều kiện triển khai luồng Feature.

| Package / controller chính | Vai trò hiện hành và dữ liệu | Mức đọc |
|---|---|---|
| identity: AuthController, UserController | Login/logout/me, tài khoản, phân quyền tạo user; identity_users, session, audit | Sâu |
| project: ProjectController | Dự án, thành viên, kiểm quyền project; Admin quản lý roster | Sâu |
| admin: AdminController, AdminManagementController, AdminAuditController | Tổng quan, danh sách quản trị, quản lý project/user, audit | Kiểm kê/controller, source policy chọn lọc |
| admin: DeviceInventoryController, ProjectLifecycleController | Kho máy, bàn giao/thu hồi, archive/reopen project | Sâu |
| admin: ProjectStatusReportController | GET lịch sử; POST status report cũ bị retire, không phải report hiện hành | Đối chiếu contract/controller |
| feature: FeatureController | Feature, file/import, archive, phân công theo row | Sâu |
| testcase: TestDocumentController, TestDocumentEditingController | Đọc file, sửa cell/revision, Status/history/export; chuyển Feature-owned writes qua FeatureService | Sâu |
| testcase: ImportController, TestCaseController, TestSuiteController | API legacy giữ đọc; writes retire có ngoại lệ addRevision của case thuộc file mới | Sâu interceptor + selected service |
| workitem: FeatureIssueController | `/issues`: Bug/QA/Monkey, status, comment, history | Sâu |
| notes: ProjectNotesController | Notes title/body; member đọc, PM/Admin quản lý | Sâu |
| reporting: ManagementReportController/PreviewController | Summary theo nguồn mới, lưu/sửa/download Markdown; preview AI tách lưu | Sâu service, controller |
| ai: AiChatController, AiDraftController, AiProviderController, AiReadScopeController | Chat/draft, provider account, project/Feature selector | Sâu policy/context/chat; adapter inventory |
| catalog: CatalogController | Environment/build/logical device/category/milestone legacy/settings API còn source | Controller/policy inventory; không suy còn menu độc lập |
| handbook: HandbookController | Resource và revisions dự án | Controller inventory |
| rules: RuleController | Ruleset/version/publish còn source; Rules contract/UI còn điểm chưa chốt | Controller + planning |
| integration: RedmineController | Cấu hình/state/outbox/history có code; command dưới `/work-items/**` bị interceptor chặn | Controller/path + selected service |
| attachment: EvidenceController | Attachment legacy có read/download; command dưới `/work-items/**` bị retire | Controller/path + selected service |
| execution/cycle/retest/filework/qa/workitem cũ | ExecutionController, CycleDecisionController, RetestController, FileWorkController, FileWorkSessionController, FileWorkExecutionController, ActionInboxController, QaController, HandoffController, WorkItemController | Retained graph/history. Không đưa Start/End/Retest/generic Task vào use case ghi của luồng mới |
| foundation/config/shared/release | Local health/foundation checks, cấu hình security/error, search/validation, công cụ migration release | Hạ tầng, không phải màn nghiệp vụ |

Nguồn chính cho retire: `Backend/src/main/java/vn/syp/tms/feature/LegacyTestingWrites.java:20` chỉ chặn method ghi và xác định theo controller/ownership; GET/HEAD/OPTIONS được đi tiếp tới policy của service. `Backend/src/main/java/vn/syp/tms/workitem/FeatureIssueLegacyWrites.java:14` chặn non-read trên `/api/v1/projects/*/work-items/**` và `/qa/**`, trả 410 `USE_FEATURE_ISSUES`. Vì vậy controller/service tồn tại không đồng nghĩa người dùng còn được chạy command đó. `reporting/ReportingController.java:15` kiểm quyền quản lý rồi retire GET summary/export cũ. Không khái quát thành mọi Redmine command đều retire: `integration/RedmineController.java:20` còn route `/redmine-deliveries/{id}/retry` ngoài hai pattern này, qua policy của RedmineService; chưa xác minh live readiness/side effect.

## 4. Quyền, API và hành trình cốt lõi

Ma trận dưới đây nói quyền hệ thống hiện hành, phải kiểm cả role tài khoản, membership đang active và trạng thái archive. ADMIN có quyền toàn hệ thống, PM CRUD chỉ tại dự án mình có project_role PM; PM AI là ngoại lệ đọc rộng được xác nhận, không mở CRUD.

| Hành động | ADMIN | PM dự án | TESTER dự án | DEV dự án |
|---|---|---|---|---|
| Tạo account | Có | Chỉ PM hệ thống có quyền được cấp, chỉ tạo TESTER | Không | Không |
| Tạo dự án; quản lý thành viên | Có | Không | Không | Không |
| Đọc Feature/file/case và Issue thông thường | Có, không cần membership | Có | Có | Có |
| CRUD/archive/restore Feature; import/hide file; sửa cell nội dung | Có | Có | Không | Không |
| Phân công case | Quản lý các Tester | Quản lý các Tester | Chỉ tự đổi phạm vi mình, không ghi đè người khác | Không |
| Sửa Status | Có | Có | Chỉ row được giao | Không |
| Tạo Bug/QA, kể cả không từ case | Có | Có | Có | Không |
| Sửa nội dung Issue | Có | Có | Chỉ BUG Monkey chính mình tạo | Không |
| Xóa Issue | Chỉ soft-delete Monkey | Chỉ soft-delete Monkey | Monkey chính mình tạo | Không |
| Giao Issue cho DEV | Có | Có | Không | Không |
| Chuyển status Issue | Status hợp lệ theo loại | Như ADMIN | Chỉ Monkey của mình | Chỉ Issue được giao; progress/resolved |
| Comment Issue | Có | Có | Có | Chỉ Issue được giao; comment history cũng giới hạn |
| Note | CRUD | CRUD | Đọc | Đọc |
| Management report summary/lưu/sửa/export | Có | Có | Không | Không |
| Kho máy/bàn giao/thu hồi | Quản lý | Đọc allocation dự án | Đọc allocation dự án | Đọc allocation dự án |
| AI liên dự án | Mọi dự án | Mọi dự án qua AI | Chi tiết trong quyền; ngoài quyền chỉ aggregate an toàn | Như Tester, tác vụ riêng Dev kiểm assignee |
| Chat của tài khoản khác | Không có bypass owner trong API chat | Không | Không | Không |

Nguồn: `identity/IdentityService.java:26,62`; `project/ProjectService.java:48,86,152,186,241`; `feature/FeatureService.java:34,186,200`; `workitem/FeatureIssueService.java:45,107,119,157,164,177`; `notes/ProjectNotesService.java:39`; `reporting/ManagementReportService.java:23`; `admin/DeviceInventoryService.java:18`; `ai/AiPortfolioContext.java:64`; `ai/AiChatStore.java:40`.

### 4.1 Feature → file → case

`POST /api/v1/projects/{p}/features` nhận name/environment/description/requestKey. `FeatureService.create` khóa account/project, kiểm PM/Admin và project active, kiểm replay bằng project+requestKey+actor+action+payload checksum; ghi Feature rồi trả entity. `PUT /features/{id}` kiểm expectedVersion; archive/restore dùng requestKey+version, không hard delete. Sai project/scope trả 404, role 403, stale 409; validation nghiệp vụ 422. Nguồn `FeatureController.java:18` và `FeatureService.java:87`.

Import dùng `POST /features/{f}/import-previews` multipart: parser đọc workbook, validate source ID và nội dung bắt buộc, lưu PREVIEW hết hạn sau 24 giờ cùng workbook bytes và import_rows. Chỉ người tạo preview đọc/commit preview của mình. Commit kiểm Feature active, lock file, tạo suite, case identity và revision độc lập, nối row→case, tạo assignment row rỗng, đánh COMMITTED. Gọi commit lại cùng preview đã committed trả summary. Checksum được lưu để provenance, không dùng dedup chặn hai Feature import cùng bytes. `FeatureService.java:143,155,162`.

Parser giới hạn `.xlsx` 5 MiB, 500 dòng; kiểm ZIP trước Apache POI. `testcase/TestCaseWorkbook.java:15,26,72`. Đây là validation source đã đọc, không phải kết quả upload browser. Không suy parser hỗ trợ mọi Excel/macro/template từ tên đuôi file.

Chi tiết file `GET /test-documents/{d}` kết hợp workbook/raw cells, current revision, cell overlays, Status và assignments; trả capability canManage/canAssign/canCreateIssue và canUpdateResult từng row (`FeatureService.detail:117`). Sửa cell kiểm expectedRevisionId và cell version; field canonical tạo revision, cột bổ sung lưu overlay; ô source ID/result không dùng generic cell edit (`TestDocumentEditingService.edit:43`). Source workbook và nội dung hiện hành là hai sản phẩm export khác nhau; bản gốc không bị mô tả nhầm là luôn đã áp dụng sửa cell.

### 4.2 Phân công → Status

`PUT /test-documents/{d}/assignments` nhận expectedVersion, requestKey và changes của membershipId/rowIds thực. API làm việc theo row ID; dải case hiển thị không phải PK. Lock document và assignments theo row_id; `AssignmentPlan.apply` xóa phạm vi cũ của các owner được thay rồi áp dụng phạm vi mới. Tester chỉ gửi một change của chính mình. Row ngoài file hoặc owner lặp không hợp lệ 422; overlap/trùng row 409 `ASSIGNMENT_CONFLICT`; không tự phân chia phần trùng. PM có thể gửi nhiều owner trong một transaction. Không có giới hạn cứng hai Tester. Nguồn `feature/AssignmentPlan.java:10`, `FeatureService.java:186`.

Mỗi row tối đa một assignee hiện hành. `first_tester_membership_id` được điền lần phân công đầu; latest cập nhật khi có first và owner mới khác trạng thái cũ. Ghi lịch sử previous/new/actor/version/requestKey. Source không kiểm “đã có kết quả” trước khi cập nhật latest (`FeatureService.java:194`); do đó cần gọi đây là first/latest trách nhiệm và không dùng làm số lần test thực tế. Thay assignment không reset Status, không tạo run/session.

`PUT /test-documents/{d}/rows/{row}/result` kiểm Feature/file active và quyền row trong `FeatureService.updateResult:200`, rồi `TestDocumentService.updateResult:59` lock row, kiểm result_version, lưu status/version/actor/requestKey và audit `RESULT_<cũ>_<mới>`. Replay chỉ được nhận khi key/actor/status khớp và version = expected+1; đây là replay của cập nhật kết quả gần nhất, khác bảng command lịch sử riêng của assignment/Feature. Conflict trả `DOCUMENT_RESULT_CONFLICT` 409.

Các trạng thái có thể được ghi trực tiếp trong tập 5 giá trị; backend không bắt buộc cạnh chuyển theo vòng UI và không bắt buộc NG tạo Bug. Tiến độ = (OK+NG+P+NA)/total; NA vẫn trong mẫu số; zero total trả 0. `reporting/ReportMetrics.java:16`; `feature/FeatureService.java:217`. 100% là tất cả case có Status khác UNEXECUTED, không có nghĩa pass 100% hoặc khách hàng nghiệm thu. `passPercent` trong source = OK/total.

### 4.3 Case → Bug/QA/Monkey

`FeatureIssueService.source:66` kiểm project/Feature/document/row/current case ownership, lấy nội dung qua TestDocumentService để giữ current projection. Tạo Issue nhận Feature bắt buộc, document và row phải cùng có/cùng không; không cần NG/build/device/run. Không từ case thì vẫn phải có Feature. BUG cần title/steps/expected/actual; QA cần title/description. Monkey chỉ hợp lệ với BUG. `FeatureIssueService.validate:120`, `create:126`.

Tạo ghi work_items (status open, priority MEDIUM) + Feature context + bug_details hoặc qa_details, request checksum/idempotency và history. ID display tăng bằng project_counters, không lấy row ID làm Issue key. Assignee phải là DEV account đang enabled và membership DEV active. Status ghi cần lý do và expectedVersion. Source chọn status theo capability, không có sơ đồ cạnh “open bắt buộc qua ready rồi mới progress”.

BUG có danh mục status: open, progress, recheck, clarify, ready, planning, resolved, unreproducible, wontfix, closed (`V7__create_work_items.sql:9`). QA chỉ open/progress/clarify/resolved/recheck/closed (`FeatureIssueService.java:24`). DEV được giao chỉ chọn progress/resolved. Không dùng QA-answer/retest/closure state machine cũ để mô tả luồng mới. Comment/history mới lưu trong `work_item_feature_history`; không nhầm với `work_item_comments` legacy. Soft-delete chỉ Monkey; lịch sử giữ lại.

### 4.4 Notes, báo cáo, kho thiết bị

Notes title 1–200, body không trắng tối đa 10.000; title strip, body giữ nguyên; read member/ADMIN, writes PM/ADMIN và project active; sửa/xóa kiểm expectedVersion; xóa archive. `ProjectNotesService.java:28,39,44`. Không có đính kèm hay CMS trong contract này.

Báo cáo quản lý `/management-reports`: summary và danh sách/detail cũng bị kiểm PM dự án/ADMIN; preview là tạo nháp AI, lưu do người dùng thực hiện. `ManagementReportService.java:23,30,58`. Stored Markdown được lưu verbatim; update chỉ bảng report và audit, không sửa nghiệp vụ. Version conflict 409. Download trả byte UTF-8 của Markdown đã lưu qua controller. Không đồng nhất report lưu dài hạn với draft/chat có TTL.

Thiết bị vật lý: condition AVAILABLE/MAINTENANCE/RETIRED; ALLOCATED là trạng thái suy từ allocation chưa returned. ADMIN bàn giao cho PM active của project; ngày trả không trước ngày hiện tại theo timezone dự án; khóa user→project→asset→membership; bàn giao nhiều máy ban đầu phải cùng PM và không trùng asset. Thu hồi đóng allocation và cập nhật condition tài sản, giữ lịch sử (`DeviceInventoryService.java:43,44,58,67`). Không biến physical device thành điều kiện bắt đầu luồng Feature mới.

## 5. Database: quan hệ và ràng buộc cần thể hiện

Đây là schema theo migration trong source. Các khóa project-scoped lặp project_id để ngăn liên kết chéo dự án bằng FK tổng hợp. Dữ liệu legacy còn nhiều FK/chỉ mục phục vụ lịch sử; sơ đồ ER nghiệp vụ hiện hành nên tách sơ đồ legacy/provenance.

| Quan hệ / cardinality | PK/FK, nullable và ràng buộc quan trọng | Nguồn |
|---|---|---|
| User N–N Project qua membership | identity_users PK id VARCHAR36; membership PK id, unique(project_id,user_id), project/user FK; membership role+active+version | V2; V3:25; V11 |
| Project 1–N Feature | Feature PK id; FK project; unique(project_id,id), unique(project_id,migration_key); migration_key/source_cycle nullable; archive nullable, version≥0 | V31:2 |
| Feature 1–N file | import_batches PK id; feature_id nullable cho legacy/preview; FK(project_id,feature_id); unique(feature_id,source_batch_id) chống replay clone; source_batch_id nullable self FK | V4:84; V12; V31:13 |
| File 1–N row | row PK id; batch FK; unique(batch_id,source_row_number); owning_document nullable cho legacy, CHECK owner null hoặc bằng batch; unique(batch_id,source_import_row_id) | V4:105; V31:21 |
| File 1–N case mới | test_cases PK id; owning_document FK; composite unique(project_id,owning_document_id,id). Row→case FK tổng hợp cùng document. Không cho một row file mới nối case owned file khác | V31:18,21 |
| Suite 1–N case; case 1–N revision | case_no unique trong project; suite FK; revision unique(project,case,revision_no); case current_revision nullable FK(project,id,current_revision)→revision(project,case,id) | V4:6,27,46,78 |
| Row 0–1 assignment record; record có 0–1 assignee | PK(project_id,row_id); FK(project,document,row)→import_rows; assignee/first/latest nullable FK membership cùng project. Commit tạo record cho mỗi row mới | V31:25 |
| Row 1–N assignment changes | PK id; row composite FK; previous/new nullable; actor identity NOT NULL; document_version/request_key; index(project,document,id) | V31:35 |
| Row 0–N cell overlays/history | cell_edits PK(project,row,column), version; cell_changes có id/actor/before/after/time | V27:5,17 |
| Row Status | result_status NOT NULL mặc định UNEXECUTED, CHECK 5 trạng thái; result_version≥0; result_updated_by nullable identity FK và requestKey | V13:3 |
| Project 1–N testing_commands | PK id, unique(project,request_key), checksum/actor/action/response_json; required Feature, optional document composite FK đúng Feature | V31:44 |
| Work item 0–1 Feature context | context PK(project,work_item), Feature FK; document,row nullable; row cần document CHECK; scope Feature/file/row bằng composite FK; creator identity NOT NULL | V31:66 |
| Issue 1–N Feature history | PK id; FK project/workitem, actor identity; before/after JSON; index(project,workitem,id) | V31:76 |
| Work item core | PK id; unique item_key, (project,item_no), (project,request_key); status FK; priority HIGH/MEDIUM/LOW; assignee nullable; created_by/updated_by legacy membership nullable sau V31 | V7:24; V18; V31:64 |
| Bug/QA details | Work-item-associated detail; build/env/device đã nullable cho Bug mới; QA giữ legacy answer pointer nhưng Feature Issue không yêu cầu answer workflow | V7:64; V18:6; V31:65 |
| Project 1–N management report | PK id; project FK; Feature nullable composite FK; creator/editor identity; version; index(project,updated_at,id) | V31:82 |
| Project 1–N Note | PK id; project/creator/editor FK; archive nullable; index(project,archived_at,updated_at,id) | V31:90 |
| Asset 1–N allocation lịch sử; ≤1 allocation mở | Asset unique asset_code, serial nullable unique; allocation generated active_asset_id=asset_id khi returned_at NULL, unique chặn bàn giao kép; recipient FK(project,membership) | V15:3,19 |
| User 1–N chat; chat 1–N turn | thread unique(id,created_by); turn FK(thread_id,created_by)→thread ON DELETE CASCADE; unique(created_by,request_key); indexes owner/expiry/pending; state CHECK GENERATING/READY/FAILED | V25:2,24 |

Index cần ghi trên ER vật lý/appendix: `ix_feature_list(project_id,archived_at,id)`, `ix_feature_documents(project_id,feature_id,status,archived_at,id)`, `ix_document_owner(project_id,document_id,assignee_membership_id,row_id)`, `ix_feature_issues(project_id,feature_id,deleted_at,work_item_id)`, `ix_case_issues(project_id,row_id,deleted_at,work_item_id)`, `ix_management_reports`, `ix_project_notes_list`. Index là thiết kế source, không bằng chứng hiệu năng thực tế; chưa EXPLAIN/benchmark lượt này.

85 bảng CREATE được phân nhóm trong manifest. Nhóm legacy gồm cycles/configurations/runs/attempts, file_work_groups/items/sessions/commands/history, retest/coverage/closure, QA answers/confirmations/commands, Redmine bindings/outbox/attempts và status_reports. Không xóa chúng khỏi ER vật lý chỉ vì UI mới không dùng. Bảng testing_migration_case_map lưu old/new identity; testing_migration_exceptions lưu ngoại lệ, không phải Issue nghiệp vụ.

V32 tạo Feature từ cycle cũ, gom orphan đúng project, copy file/case/current revision/overlays độc lập, assignment rỗng và Status mặc định; không sao chép một lần test thành kết quả mới. V33 xử lý lại nguồn customer workbook bị padding và giữ exception gốc, bổ sung dấu phục hồi. Nguồn `Backend/src/main/java/db/migration/V32__copy_feature_documents.java:19,35,52`, `V33__recover_padded_customer_documents.java:26,35,52`. Migration code có thể thay dữ liệu khi chạy, nhưng tiểu nhiệm vụ này chỉ đọc. Số bản copy/711 case/120 unfiled và missing workbook trong STATUS là bằng chứng lịch sử cần kiểm receipt, không tự suy từ code.

## 6. AI: scope, độ tin cậy và giới hạn

`AiPortfolioContext.current:56` dùng role hệ thống: ADMIN/PM có danh sách mọi project; người khác chỉ membership active. Scope reference hash gồm role/grants/membership version; PROJECT_CHAT thêm project và optional Feature. Scope và owner được kiểm lại khi đọc cache/history, reserve và complete (`AiChatStore.java:40,46,86,140,157`). Thay quyền không tiếp tục dùng scope cũ như một cấp quyền vĩnh viễn.

Target project/Feature xác định đối tượng trả lời; background lấy những project người hỏi được AI phép đọc. Worker chỉ có bounded ordinary readable details, personal progress, không nhận execution management aggregates/workload/experience actors. Ngoài quyền chỉ whitelist câu kinh nghiệm tổng quát, không identity/tên/số lượng riêng; query yêu cầu ít nhất 5 actor và 2 project để bật aggregate (`FeatureFacts.safeExperienceOutside:89`). Đây là ngưỡng kỹ thuật đang triển khai, không phải tiêu chí đánh giá năng lực đã được khách hàng xác nhận.

Snapshot tối đa 30 project, 10 file metadata, 3 file có tên được hỏi, 5 case/Issue, 10 audit gần nhất mỗi case, tối đa 20 actor/workload cho management. Có truncated/limitations và giảm history/context khi vượt request bytes. Không có bằng chứng vector database/RAG bao phủ mọi cell; không viết “AI đọc toàn bộ dữ liệu chính xác tức thời” (`AiPortfolioContext.java:16,114`; `FeatureFacts.java:16,66`; `AiChatService.java:113`).

AI lấy actor thực tế trong audit, source-import audit có nhãn MIGRATED_SOURCE; recordedChanges là số thay Status, không phải số lần thực thi vật lý hay competence score. first/latest assignment hoặc tester text trong Excel không dùng làm chứng minh kinh nghiệm. Suggestion không gọi assign/CRUD.

`AiChatService.send:35` chuẩn bị context, pin provider/model, reserve request, gọi gateway ngoài DB transaction, validate output, kiểm session/connection rồi complete. Output phải JSON một trường text ≤12.000 ký tự; reference dạng project/document/ticket/feature/member/milestone:ID phải trong sources allowlist (`AiChatService.java:88,102`). Đây là kiểm định cấu trúc và reference nhận dạng, không phải bộ chứng minh semantic toàn bộ ngôn ngữ tự nhiên; chưa kết luận mọi leakage/hallucination bị chặn. Không thực hiện live provider call trong review này.

## 7. Xác thực và bảo mật theo source

`SecurityConfig.java:26` dùng PBKDF2 qua DelegatingPasswordEncoder, HTTP session repository, CSRF session token. Cookie `TMS_SESSION` HttpOnly, SameSite Strict; Secure có điều kiện theo `TMS_COOKIE_SECURE`, không được viết luôn Secure/HTTPS nếu chưa đọc deployment thực tế. Login/logout/me dùng API riêng, không dùng HTTP Basic/JWT mặc định. SessionAccountFilter đứng trước AuthorizationFilter để phản ánh quyền/tài khoản hiện hành. `/api/v1/admin/**` Admin; routes project đòi authenticated và service kiểm quyền dữ liệu; unknown route denyAll. Local foundation checks chỉ theo local profile, không phải form nghiệp vụ.

`IdentityService.create:59` kiểm quyền và PM delegated chỉ tạo TESTER; username normalize, unique conflict; update version, chặn tự khóa, chỉ PM được cấp users:create, xóa session khi đổi enable/delegation. Không có role khách/BrSE độc lập trong các flows đã đọc. Tạo mới quyền đó phải là yêu cầu tương lai.

Các query dữ liệu đầu vào dùng placeholders; search helper tạo expression cột do source sở hữu. Không biến nhận xét này thành “đã quét sạch mọi SQL injection/dependency vulnerability” vì chưa audit toàn bộ lịch sử/dependencies. Không đọc/đưa secret vào báo cáo. Các endpoint provider/Redmine có source không chứng minh credential/live mapping đang sẵn sàng.

## 8. Sai khác và điểm phải diễn đạt thận trọng

| ID | Nhận xét có bằng chứng | Ảnh hưởng tới báo cáo |
|---|---|---|
| BE-R01 | `FeatureService.java:237` trả `pageSize`, Notes/management report trả `size`; FixReports tổng quát viết size | Ghi contract từng endpoint; không đưa một schema pagination chung sai |
| BE-R02 | `ManagementReportService.java:39` query issues không join/filter document.archived_at; FeatureFacts workByStatus và FeatureIssueService.list có loại document đã ẩn | Source inconsistency: khi hide file có thể lệch count Issue giữa summary và danh sách; chưa tái hiện runtime lượt này, không trình bày metrics mọi màn luôn đồng nhất |
| BE-R03 | `ProjectLifecycleService.java:33` vẫn dùng blocker legacy sessions/cycles/retests/all work_items. Ngoại lệ ADMIN legacy đã được duyệt trong planning nhưng chưa có Command flag/nhánh override | Đánh dấu yêu cầu đã chốt/chưa implement, không vẽ archive luôn thành công sau chuyển Feature |
| BE-R04 | `FeatureService.java:194` latest assignment đổi kể cả chưa có kết quả; audit RESULT lưu actor thực riêng | Không gọi first/latest “người thực tế test lần 1/lần 2” hoặc dùng cột để thống kê kinh nghiệm |
| BE-R05 | `FeatureIssueService.java:107,157` dựa allowed target statuses, không bắt cạnh chuyển trạng thái hoặc NG/retest closure | Sơ đồ state phải mô tả đúng tập trạng thái/quyền; không tái sử dụng state machine legacy |
| BE-R06 | V7 policy seed INTERNAL_V1 chứa required build/environment/device/closureEnabled false; FeatureIssueService mới không theo gate đó và V31 cho nullable | Ghi seed/legacy khác behavior mới; không chép required fields từ V7 thành rule Bug hiện hành |
| BE-R07 | `AiChatService.java:102` regex reference allowlist chỉ nhận dạng một số mẫu; snapshot có giới hạn | Không tuyên bố AI được kiểm chứng semantic toàn diện hay mọi cell đều retrieval; live/UAT còn riêng |
| BE-R08 | README/contract có checkpoint “main V30 chưa restart” cùng STATUS lịch sử sau cutover V33 và publication | Ghi timestamp/checkpoint, dùng bằng chứng mới nhất nếu báo runtime; việc đọc source V33 không chứng minh server hiện đang V33 |
| BE-R09 | Catalog/Handbook/Rules/legacy controller còn nguồn, writes một số bị interceptor retire; frontend có thể đã bỏ menu | Phân biệt module code, API callable và màn điều hướng hiện hành; frontend review quyết định UI, không suy từ tên controller |

Không sửa các điểm trên trong tác vụ báo cáo. BE-R02 là nhận xét đọc query với tình huống cụ thể; BE-R03 đã có gate được ghi nhận; các điểm còn lại chủ yếu tránh mô tả sai, không mặc định là defect sản phẩm mới.

## 9. Test và traceability được phép tuyên bố

Đã đọc test source `Backend/src/test/java/vn/syp/tms/feature/AssignmentPlanTest.java`: có các assertion manager thay hai ranh giới nhưng giữ owner bỏ qua, Tester không lấy row người khác, tự nhả/nhận row trống, trùng owner/row ngoài file bị từ chối. `Backend/src/test/java/vn/syp/tms/reporting/ManagementReportServiceTest.java` có mock assertion Tester không đọc management summary và project ngoài scope bị từ chối trước đọc report. `Backend/src/test/java/vn/syp/tms/reporting/FeatureProgressContractTest.java` có assertion 2 chưa chạy+OK+P+NA đạt 60%, NA vẫn trong total và empty đạt0. Đây là assertion được viết, không phải PASS vừa chạy.

Manifest còn có `testcase/FeatureIntegrationTest.java`, `testcase/NativeFeatureIssueIntegrationTest.java`, `testcase/ManagementReportIntegrationTest.java`, `testcase/FeatureLegacyRetirementIntegrationTest.java`, `filework/NativeFeatureMigrationTest.java`, `filework/NativeFeatureRepairMigrationTest.java`, `notes/ProjectNotesPolicyTest.java`, `notes/ProjectNotesSecurityTest.java`, `ai/AiPortfolioContextTest.java` và `filework/NativeProjectLifecycleConcurrencyTest.java` dưới `Backend/src/test/java/vn/syp/tms/`. Các tệp này mới kiểm kê tên ở lượt này, chưa đọc đủ mọi assertion. Lượt review này không chạy test, không đo coverage, không mở server/browser, không đọc DB metadata. Chỉ ghi PASS/số lượng/coverage khi có report và receipt đúng revision.

Đề nghị traceability tối thiểu: C01/C02→FeatureService+V31/V32/V33→ER Feature/file/case; C03→AssignmentPlan+FeatureService.assign→sequence phân công/conflict; C04→AiPortfolioContext/FeatureFacts/AiChatStore→data-scope diagram; Bug/QA→FeatureIssueService→use case và status capabilities; Notes→ProjectNotesService; report→ManagementReportService→preview/save/download sequence; Admin/device→ProjectService/DeviceInventoryService; archive exception→ProjectLifecycleService/plan với trạng thái chưa implement. Kết luận triển khai source, historical tests và runtime/UAT phải là ba cột riêng.
