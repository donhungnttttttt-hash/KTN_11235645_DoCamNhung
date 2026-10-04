# Database và migration đang thực thi

## V13 — Kết quả tài liệu được lưu tự động (04/10/2026)

`V13__persist_document_results.sql` bổ sung vào `import_rows`: `result_status` (enum bằng CHECK, mặc định UNEXECUTED), `result_version`, `result_updated_at` (UTC), `result_updated_by` (FK identity_users), `result_request_key` (UUID). Không tạo thêm bảng; native vẫn có **56 bảng**. Lịch sử dùng `project_audit`, entity `TEST_DOCUMENT_ROW`, action `RESULT_{before}_{after}` và index project/entity/id sẵn có.

`raw_data_json` và `import_batches.source_workbook` giữ nguyên. PUT ghi trạng thái và audit cùng transaction; export hiện tại dùng revision + result_status; original download lấy nguyên BLOB. Quyết định người dùng: trạng thái tài liệu riêng, không thay execution/NA/bug/retest. Xem [contract](../api/test-documents.md).

Đã backup native trước khi restart; Flyway V13 success trên 127.0.0.1:3307/tms, V1–V12 không sửa. Kiểm chứng thao tác chỉ trên tài liệu demo project4/document5. Bộ integration tạo dữ liệu trên schema riêng vẫn chờ quyền tạo schema; không chạy nó trên tms.

**Native runtime 03/10/2026:** đã xác thực app trên MySQL Windows 3307, backend startup/readiness PASS; Flyway đã nâng V11→V12 lúc22:47 ngày03/10; audit 56 bảng/128 FK/6 điều kiện domain không vi phạm. [Nguyên nhân lỗi chạy Maven trực tiếp và bằng chứng](../reviews/2026-10-03-native-startup.md). Còn kiểm chứng UI/chứng cứ và full regression 9.7, không coi toàn S11 đã DONE.

**Excel khách 03/10/2026:** code có V12 bổ sung `import_batches.sheet_name`, `source_workbook` và index tài liệu; không thêm bảng. `mapping_version` phân biệt mẫu nguồn. V12 đã áp dụng thành công lên `tms` sau backup theo yêu cầu người dùng; restart validate/up-to-date PASS. Browser nhập155case/xem tài liệu và API export thật PASS. Fresh migration và integration permission/rollback còn chờ schema test riêng. Xem [contract tài liệu](../api/test-documents.md).

**Rà soát audit và quan hệ 03/10/2026:** [ma trận 56 bảng, các trường còn thiếu và bảng trung gian hiện có](../reviews/2026-10-03-database-audit-fields-relations.md). Đề xuất audit còn chưa triển khai; số V12 trong đề xuất cũ là dự kiến tại thời điểm đó, migration audit sau này phải chọn số kế tiếp còn trống. [Hướng dẫn MySQL/Workbench](mysql-workbench.md) đã có đường dùng backup SQL sẵn có, không cần bật Docker.

**Review 03/10/2026:** [giải thích từng bảng và phần dư cần xử lý](../reviews/2026-10-03-database-complexity.md), [census code/FK/index](../reviews/database-usage-audit.json). Đã giảm JSON lặp trong lịch sử sửa công việc; schema vẫn V11/56 bảng. `application_info` còn được dùng để khóa bootstrap Admin, không được xóa như bảng diagnostic thuần túy. Lần review này chưa kiểm tra live native hoặc chạy migration mới.

**Review 01/10/2026:** ứng dụng dùng một schema `tms`, gồm 56 bảng. **[Ảnh ERD đủ 56 bảng (PNG)](erd/images/00-toan-bo-56-bang.png)**, [8 ảnh chi tiết theo nhóm](erd/images/README.md), [tải bộ ảnh ZIP](erd/tms-database-images-v11.zip), [review độ phức tạp](../reviews/2026-10-01-database-native-mysql.md), [MySQL Windows và Workbench từng bước](mysql-workbench.md). Đã chuẩn bị cấu hình native, chưa xác thực/cutover server 3307.

**Bổ sung Sprint 11 (30/09–01/10/2026):** đã nạp bộ demo qua API vào dự án riêng DEMO-PILOT: 120 case, 240 lượt, 72 công việc; kiểm tra 128 FK và 6 điều kiện domain không có vi phạm. Không thêm migration cho dữ liệu tổng hợp, schema vẫn V11. Xem [bộ demo](../uat/demo-data.md) và [snapshot audit chỉ đọc](../uat/database-audit.json). Số hàng thực tế của từng bảng được ghi trong snapshot; các bảng vận hành chỉ phát sinh theo thao tác thật.

Cập nhật ngày 30/09/2026: Sprint 9 đã kiểm chứng nội bộ, Sprint 10 đang hoàn thiện review. V1–V5 có 26 bảng ứng dụng; V6 thêm 7, V7 thêm 10, V8 thêm 7, V9 thêm 2 và **V10 thêm 3 bảng liên kết/hàng đợi/nhật ký Redmine**. **V11 thêm version cho cấu hình và FK phiên bản rule của bug**, không thêm bảng. Tổng **55 bảng ứng dụng**, hoặc **56 bảng nếu tính `flyway_schema_history`**. Local MySQL đã áp dụng V1–V11; số bảng không đồng nghĩa toàn bộ sản phẩm đã nghiệm thu.

Đọc [thiết kế hệ thống và ERD](system-design.md) để xem quan hệ hiện hành, ràng buộc và các đề xuất tối giản chưa thực hiện; [ADR-005](../decisions/ADR-005-execution-database.md) giải thích các lựa chọn S05. DDL trong từng migration là nguồn chính xác về kiểu, nullability, FK, unique, check và index.

## Danh mục đầy đủ V1–V11

| Bảng | Migration tạo | Nội dung |
| --- | --- | --- |
| `redmine_bindings` | [V10](../../Backend/src/main/resources/db/migration/V10__create_redmine_outbox.sql) | Một binding/bug, UUID marker, instance-ticket unique; snapshot routing không secret, create fence, bản gửi/quan sát và version |
| `redmine_outbox` | V10 | Snapshot bất biến, idempotency theo project, một job active/binding qua generated unique; version, lease/fencing, retry/backoff và actor yêu cầu/dispatch |
| `redmine_delivery_attempts` | V10 | Nhật ký kết quả, lý do/actor và yêu cầu retry; composite FK cùng project, unique lease để không ghi hai kết quả |
| `application_info` | [V1](../../Backend/src/main/resources/db/migration/V1__create_foundation.sql) | Nhận diện hệ thống và dòng khóa transaction khi bootstrap Admin đầu tiên; một dòng singleton |
| `foundation_checks` | [V1](../../Backend/src/main/resources/db/migration/V1__create_foundation.sql) | Bản ghi kiểm tra nội bộ API → MySQL; chỉ terminal/log |
| `identity_roles` | [V2](../../Backend/src/main/resources/db/migration/V2__create_identity.sql) | ADMIN, PM, TESTER; chưa có khách hàng |
| `identity_users` | [V2](../../Backend/src/main/resources/db/migration/V2__create_identity.sql) | UUID, password hash, role hệ thống, enabled, can_create_users và optimistic version |
| `identity_audit` | [V2](../../Backend/src/main/resources/db/migration/V2__create_identity.sql) | Nhật ký quản trị danh tính, actor/subject/requestId; không chứa bí mật |
| `identity_login_buckets` | [V2](../../Backend/src/main/resources/db/migration/V2__create_identity.sql) | Throttle đăng nhập theo username/IP qua restart |
| `SPRING_SESSION` | [V2](../../Backend/src/main/resources/db/migration/V2__create_identity.sql) | Phiên đăng nhập JDBC và thời hạn |
| `SPRING_SESSION_ATTRIBUTES` | [V2](../../Backend/src/main/resources/db/migration/V2__create_identity.sql) | Thuộc tính phiên; cascade khi phiên bị xóa |
| `projects` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Dự án, timezone, archive, version và người tạo/sửa |
| `project_memberships` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Quan hệ user–project, project_role và active; unique(project,user) |
| `project_counters` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Cấp số domain theo project dưới transaction |
| `environments` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Môi trường kiểm thử theo dự án |
| `builds` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Build/version/platform; V5 bổ sung archived_at |
| `devices` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Thiết bị, model, hệ điều hành/phiên bản và active |
| `categories` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Danh mục chức năng theo dự án |
| `milestones` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Mốc phát hành, ngày bắt đầu/hạn và archive |
| `rulesets` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Danh tính bộ quy tắc và con trỏ bản đã phát hành |
| `rule_versions` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Nội dung JSON/version của rule, người tạo/phát hành |
| `project_resources` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Danh tính sổ tay/hướng dẫn và current_revision_id |
| `resource_revisions` | [V3](../../Backend/src/main/resources/db/migration/V3__create_project_catalogs.sql) | Phiên bản nội dung, visibility, người sửa và thời điểm |
| `test_suites` | [V4](../../Backend/src/main/resources/db/migration/V4__create_test_case_library.sql) | Nhóm test case dạng cây, code unique, archive |
| `test_cases` | [V4](../../Backend/src/main/resources/db/migration/V4__create_test_case_library.sql) | Danh tính case, suite và con trỏ revision hiện tại |
| `test_case_revisions` | [V4](../../Backend/src/main/resources/db/migration/V4__create_test_case_library.sql) | Nội dung VI/JP bất biến, checksum, nguồn và phê duyệt PM |
| `import_batches` | [V4](../../Backend/src/main/resources/db/migration/V4__create_test_case_library.sql) | Metadata/checksum/owner, trạng thái preview/commit và thời hạn |
| `import_rows` | [V4](../../Backend/src/main/resources/db/migration/V4__create_test_case_library.sql) | Staging từng dòng Excel, lỗi và case đích; không nhập một phần |
| `project_audit` | [V5](../../Backend/src/main/resources/db/migration/V5__review_project_integrity.sql) | Sự kiện nghiệp vụ theo project/actor/entity/action/time |
| `cycle_statuses` | [V6](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql) | Lookup DRAFT/ACTIVE; V9 bổ sung CLOSED |
| `execution_results` | [V6](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql) | Lookup OK/NG/P; Fix không phải verdict |
| `test_cycles` | [V6](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql) | Đợt kiểm thử, milestone tùy chọn, version, kích hoạt và actor |
| `cycle_configurations` | [V6](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql) | Cấu hình môi trường + thiết bị + build mặc định trong đợt |
| `run_items` | [V6](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql) | Một case/revision trong cấu hình, người được gán, version/latest pointer |
| `run_item_assignments` | [V6](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql) | Lịch sử phân công với người cũ/mới, actor và lý do |
| `execution_attempts` | [V6](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql) | Lần chạy bất biến, kết quả/build/actor/snapshot và idempotency key |
| `work_item_statuses` | [V7](../../Backend/src/main/resources/db/migration/V7__create_work_items.sql) | 10 trạng thái nội bộ tiếng Việt; ba terminal chỉ đi qua closure có điều kiện của S07 |
| `work_item_policy_versions` | V7 | Chính sách INTERNAL_V1 bất biến; tách biệt ruleset khách hàng còn chờ xác nhận |
| `work_items` | V7 | Danh tính chung BUG/REQUEST/TASK/IMPROVEMENT, số theo dự án, phân loại/phân công, version và idempotency |
| `bug_details` | V7 | Subtype BUG, FK cùng dự án, bước tái hiện/expected/actual/context; revision hoặc lý do PM; fixed build |
| `work_item_execution_links` | V7 | Liên kết N:N bug–attempt NG; unique cặp bug/attempt và FK project/run/attempt |
| `work_item_history` | V7 | Lịch sử bất biến qua API, actor/time/reason, trạng thái trước/sau; UPDATE mới dùng payload formatVersion 2 giới hạn trường chỉnh sửa, không lặp toàn bộ GET detail; lịch sử cũ giữ nguyên |
| `work_item_comments` | V7 | Text INTERNAL, author/time; retry theo request key không tạo trùng |
| `work_item_external_references` | V7 | Provider/ID/URL nhập thủ công, unique trong dự án; luôn UNRECONCILED |
| `work_item_clarifications` | V7 | Nguồn/người/thời điểm xác nhận khai báo và người/thời điểm ghi nhận thực tế |
| `work_item_attachments` | V7 | UUID tên vật lý, owner project/work item, tên/MIME/size/SHA-256/uploader; blob lưu ngoài MySQL |
| `bug_retest_state` | [V8](../../Backend/src/main/resources/db/migration/V8__create_bug_retest.sql) | Vòng retest và con trỏ phạm vi hiện hành; backfill bug cũ, không tự công nhận PASS |
| `bug_coverage_revisions` | V8 | PM xác nhận phạm vi theo phiên bản/build/vòng, có reason/actor/time |
| `bug_coverage_items` | V8 | Các run item bắt buộc, không trùng trong coverage, FK cùng project |
| `retest_requests` | V8 | Yêu cầu theo build/môi trường/thiết bị/người chạy; BUG_ONLY/FULL_CASE, snapshot ngữ cảnh, trạng thái và idempotency |
| `retest_request_items` | V8 | Subset được phân công từ coverage, composite FK giữ đúng bug/phạm vi/run item |
| `bug_verification_attempts` | V8 | PASS/FAIL bất biến, kết quả thực tế/chứng cứ/actor; chỉ FULL_CASE có execution attempt mới |
| `bug_closure_decisions` | V8 | FIXED/UNREPRODUCIBLE/WONTFIX/REOPEN, căn cứ/nguồn/chứng cứ và ngữ cảnh khi quyết định |
| `run_scope_decisions` | [V9](../../Backend/src/main/resources/db/migration/V9__create_cycle_decisions.sql) | Quyết định NA/khôi phục bất biến, PM/lý do/thời điểm; `run_items.scope_decision_id` chỉ tới quyết định cùng project/run |
| `cycle_decisions` | V9 | CLOSE/REOPEN, lý do/tồn đọng, snapshot số liệu, PM và thời điểm; FK project/cycle/member |
| `flyway_schema_history` | Flyway quản lý | Version/checksum/kết quả; ứng dụng không tự sửa |

Quyền tạo tài khoản vẫn chỉ ADMIN hoặc PM được ADMIN cấp riêng; PM được cấp chỉ tạo TESTER. Phê duyệt case, triage, đóng/mở lại bug chỉ PM dự án. Các bảng role/binding/session tên khác trong blueprint cũ không cần tạo trùng. V7 triển khai bug/evidence theo [ADR-006](../decisions/ADR-006-internal-work-items.md); V8 retest/closure theo ADR-007, đồng bộ tracker thuộc S09.

## Khi thêm migration

1. Kiểm tra sprint đang làm và schema hiện có. Code hiện đã có V12 cho tài liệu Excel; migration mới chọn số thực tế kế tiếp, không đặt số theo sprint nếu đã có migration xen giữa.
2. Giữ nguyên các migration đã áp dụng V1–V11. Thêm file có mô tả; chỉnh schema qua Flyway, Hibernate chỉ validate.
3. Tách seed demo khỏi migration dùng chung. Không thêm mọi bảng trong blueprint cùng một lần.
4. Chạy `mvnw verify`: cài mới và nâng từ phiên bản trước với dữ liệu đại diện. V1 chưa có bản trước; kiểm tra DB rỗng → V1 và V1 → chạy lại không đổi dữ liệu. Từ V2 phải có fixture schema/data V1.
5. Review DDL, FK/index, thời gian lock, charset và ảnh hưởng dữ liệu. Trước môi trường dùng chung, backup và thử restore trên database riêng.

## Khi thất bại

`clean-disabled=true`, `baseline-on-migrate=false`, `out-of-order=false`, `validate-on-migrate=true`. Flyway thất bại thì backend không khởi động thành công; không tiếp tục phục vụ với schema nửa chừng. MySQL DDL có implicit commit; không hứa rollback cả migration.

- Nếu checksum lệch: tìm đúng file/version từ source đã triển khai rồi khôi phục file. Không sửa checksum trong history để bỏ qua sự khác biệt.
- Nếu DDL thất bại một phần: giữ môi trường dừng ghi, đối chiếu history và schema thực tế, lập script khắc phục có review hoặc phục hồi backup vào DB riêng. Chỉ repair khi đã hiểu trạng thái và có quyết định cụ thể; không chạy tự động.
- Khôi phục môi trường có dữ liệu cần backup logic/volume phù hợp rồi kiểm chứng restore, row count và ràng buộc. Sprint 01 kiểm tra bảo toàn bản ghi khi restart; diễn tập backup/restore đầy đủ là S10, chưa được đánh dấu hoàn thành.
- Không dùng `clean`, `down -v` hoặc xóa volume như một cách nâng cấp. Testcontainers dùng DB tạm riêng, được dọn khi test kết thúc.

Quyền local: `tms_app` DML; `tms_migrator` quyền schema trong database `tms`; root chỉ khởi tạo container. Schema mặc định InnoDB/utf8mb4; script bootstrap user ở [infra/mysql/01-users.sh](../../infra/mysql/01-users.sh). Hướng dẫn chạy: [development.md](../development.md).

## Review migration 28/09/2026

Trước review database local chỉ có V1/V2. V4 chưa phát hành lỗi từ khóa ROW_NUMBER, được sửa thành source_row_number trước lần áp dụng thành công đầu tiên. Không repair history, clean hoặc xóa volume local.

V5 bổ sung `builds.archived_at`, `project_audit` (actor/entity/action/time, không nội dung nhạy cảm) và index import checksum. Đã kiểm thử fresh V1–V5, upgrade V1–V5 bảo toàn foundation, upgrade V4–V5 có project/build/revision đã duyệt bảo toàn nội dung và FK, chạy migrate lại không đổi dữ liệu.

## Nâng cấp V7 và kho chứng cứ

V7 chỉ thêm bảng/reference data, không seed tài khoản hay bug mẫu. Local được backup logic trước nâng cấp; `Check-System.ps1` xác nhận MySQL 8.4.8, Flyway V7/7 migrations. Kiểm thử fresh, upgrade và nghiệp vụ được ghi tại [review S06](../reviews/2026-09-29-sprint-06.md).

## Nâng cấp V8 và bảo toàn lịch sử

V8 bổ sung retest theo [ADR-007](../decisions/ADR-007-internal-retest.md). Chứng cứ đã được verification hoặc closure tham chiếu bị chặn gỡ cả ở API lẫn FK; blob không bị xóa. FAIL/mở lại/đổi bản sửa vô hiệu current coverage nhưng giữ các request/kết quả/quyết định cũ. BUG_ONLY không đổi `run_items.latest_attempt_id`.

Đã sao lưu local trước V8 tại thư mục scratch được ignore; nội dung backup chứa dữ liệu nội bộ và không commit. `Check-System.ps1` PASS MySQL 8.4.8 / V8 / 8 migrations. `MigrationTest` kiểm tra fresh, upgrade từ V4 qua V7 có case đã duyệt/NG/bug resolved, backfill trạng thái retest và restart không chạy migration lại.

Blob đặt tại `TMS_ATTACHMENT_ROOT` (mặc định `Backend/var/evidence` khi chạy trong Backend). UUID là tên vật lý; file gốc chỉ metadata. Rollback dọn blob, khi khởi động dọn UUID/temp mồ côi quá 24 giờ. Backup/restore cần đồng bộ **cả database và thư mục evidence**; chưa tuyên bố đã diễn tập phục hồi production hoặc có antivirus. Chính sách chi tiết: [vòng đời bug](../business/defect-lifecycle.md).

## Nâng cấp V9 và báo cáo nội bộ

V9 bảo toàn run/attempt/bug cũ; không tự đánh dấu NA hoặc tạo quyết định chốt. Composite FK của con trỏ NA ngăn tham chiếu quyết định của run/dự án khác. CHECK kích hoạt hỗ trợ ACTIVE/CLOSED và giữ actor/time ban đầu; index `(project_id, build_id, run_item_id, attempt_no)` phục vụ chọn lần chạy theo build. Báo cáo tính trực tiếp từ nguồn cùng snapshot REPEATABLE_READ; không thêm bảng bộ đếm UI. Xem [quy tắc metric](../business/metrics.md) và [contract](../api/reporting.md).

Đã backup local trước V9; kiểm tra Testcontainers fresh, nâng V8 có NG/bug/nội dung tiếng Nhật, migrate lại và checksum. Local `Check-System.ps1`: MySQL 8.4.8/Flyway V9/9 migrations. V1–V9 từ đây bất biến; diễn tập restore đầy đủ vẫn thuộc S10.

## Nâng cấp V10 và outbox Redmine

Đã backup trước V10 (120729 byte, thư mục scratch được ignore), kiểm tra fresh/restart/checksum và nâng từ V9 có case tiếng Nhật, NG, bug, quyết định NA. Local MySQL 8.4.8 có 56 bảng gồm Flyway, V10/10 migrations. V1–V10 bất biến từ lần áp dụng local. Không tự seed/công bố bug trong migration.

`created_by` giữ người yêu cầu ban đầu, `dispatch_by` là PM yêu cầu gửi/thử lại hiện hành; lịch sử retry có actor/lý do riêng. Payload không đổi khi retry; sourceVersion giúp phân biệt bản cũ. Worker claim/finalize khóa dự án trước job, mạng ở ngoài transaction; lease key kiểm tra trước finalize. CREATE được giữ bằng cờ trước HTTP; crash không mở quyền tạo lần hai. Xem [runbook](../operations/integration.md).

## Kiểm chứng S10

Đợt đo tải đầu không thêm migration: tối ưu báo cáo bằng phân trang trước các join chi tiết và aggregate SQL trước join tên, dùng index hiện có. Không tăng pool để che lỗi tải. [Bài đo tải](../performance/sprint-10.md) ghi môi trường/giới hạn và kết quả thật. Đợt hoàn thiện review S03 tiếp theo có V11 như mô tả bên dưới.

[Diễn tập recovery](../operations/recovery.md) kiểm tra 54 bảng ngoài session (có Flyway) và chứng cứ, khôi phục hai lần vào container riêng, trong đó có tình huống DDL dở dang. Migration gây lỗi tạm trong bài test hiện là V12, không thuộc schema sản phẩm. Đây chưa phải diễn tập khôi phục production/Redmine hoặc RTO cam kết.

## V11 — Hoàn thiện cấu hình dự án

[V11](../../Backend/src/main/resources/db/migration/V11__version_project_settings.sql) thêm `lock_version` mặc định 0 cho `project_memberships`, `environments`, `builds`, `devices`, `categories`, `milestones`. Mutation cần version đã đọc, khóa theo dự án và ghi `project_audit` trong cùng giao dịch.

`bug_details.rule_version_id` nullable liên kết composite `(project_id, rule_version_id)` tới `rule_versions`. Bug mới lưu phiên bản INTERNAL_DEMO đang áp dụng; bug cũ giữ null và không bị áp hồi tố. V11 không thay đổi chính sách nền INTERNAL_V1 hoặc lịch sử retest. Backup trước migration được giữ ngoài Git; fresh/upgrade/checksum và dữ liệu cũ được kiểm tra bằng `MigrationTest`. Xem [review](../reviews/2026-09-30-review-completion.md).
