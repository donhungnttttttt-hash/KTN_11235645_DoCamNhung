# Kế hoạch dữ liệu và migration MySQL + Flyway

Ngày lập và đối chiếu tài liệu kỹ thuật: **22/09/2026**. Đây là **blueprint nghiệp vụ để triển khai theo sprint**. S01 đã có MySQL/Flyway và V1 tạo hai bảng nền tảng; schema thực tế, cách nâng cấp và giới hạn tại [database/README.md](../database/README.md). Các bảng nghiệp vụ bên dưới vẫn là mục tiêu thiết kế, không phải tất cả đã được tạo.

**Cập nhật S02:** V2 đã tạo `identity_roles`, `identity_users`, `identity_audit`, `identity_login_buckets` và hai bảng `SPRING_SESSION*`. Quyền hệ thống cố định trong backend, quyền cấp thêm cho PM lưu `can_create_users`; chưa cần tạo bảng permission/binding động trong blueprint. Session dùng Spring Session JDBC, không tự xây bảng refresh token. Không có user khách, project/membership thuộc S03. Xem [ADR-002](../decisions/ADR-002-internal-auth.md); không tạo lại các bảng identity chỉ vì tên dự thảo bên dưới khác tên thực thi.

**Cập nhật S07 (29/09/2026):** schema thực tế đã tới V8; xem [inventory đầy đủ](../database/README.md), [thiết kế đã đối chiếu code](../database/system-design.md), [ADR-006](../decisions/ADR-006-internal-work-items.md) và [ADR-007](../decisions/ADR-007-internal-retest.md). Blueprint bên dưới là mô hình mục tiêu, không phải DDL hiện hành. `identity_*`, `SPRING_SESSION*`, `project_audit` đã thay các tên logic cũ. S05 dùng `cycle_configurations`, `run_item_assignments` và snapshot attempt; chỉ OK/NG/P. V7 tạo work item/BUG, liên kết NG, history/comment/clarification/external reference và evidence. V8 thêm 7 bảng coverage/retest/closure, bảo toàn NG cũ. NA/đóng đợt đã chốt ADR-008, sẽ triển khai S08. Không chạy nguyên blueprint để tạo bảng trùng hoặc tự công bố rule khách.

## 1. Quyết định nền tảng và cách chốt phiên bản

MySQL là nơi lưu dữ liệu nghiệp vụ chính. Spring Boot thực hiện phân quyền, validation, giao dịch và API; React gọi API, không truy cập MySQL. Flyway quản lý toàn bộ thay đổi schema và dữ liệu tham chiếu dùng chung.

| Thành phần | Hướng lựa chọn | Việc phải chốt tại Sprint 01 |
| --- | --- | --- |
| Java | Java 21 LTS | Bản phân phối JDK, bản vá, giấy phép sử dụng và phiên bản CI thống nhất. Java 21 là một nhánh LTS theo [Oracle Java support roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html). |
| Spring Boot | Bản stable tương thích Java 21, Spring Security, JPA, Flyway và bộ kiểm thử | Ghi chính xác version vào `pom.xml` sau khi đối chiếu [system requirements](https://docs.spring.io/spring-boot/system-requirements.html). Không tự động lấy `latest`, snapshot hoặc milestone. |
| Build | Maven Wrapper | Commit wrapper và checksum distribution; cố định Maven để máy Windows và CI dùng cùng bản. [Maven Wrapper](https://maven.apache.org/tools/wrapper/) hỗ trợ wrapper riêng cho Windows. |
| MySQL | Nhánh MySQL 8.4 LTS, InnoDB, `utf8mb4` | Chốt bản vá và image tag/digest sau thử nghiệm tương thích; kiểm tra tài liệu [MySQL 8.4 LTS](https://dev.mysql.com/doc/refman/8.4/en/faqs-general.html). Không coi số patch trong tài liệu này là phiên bản đã cài. |
| Flyway | Ưu tiên dependency management của bản Boot đã chọn; bản cộng đồng đủ cho migration SQL trong phạm vi này | Cần module MySQL riêng `org.flywaydb:flyway-mysql`, ngoài phần Flyway core/starter phù hợp bản Boot. Chốt Connector/J tương thích; không lấy tọa độ driver cũ từ ví dụ một cách máy móc. [Flyway MySQL support](https://documentation.red-gate.com/flyway/reference/database-driver-reference/mysql). |
| DB integration test | Testcontainers chạy MySQL thật, cùng nhánh/bản vá với môi trường mục tiêu | Chốt phiên bản tương thích BOM, dependency driver và Docker runtime; không thay kiểm thử migration bằng H2. [Testcontainers MySQL module](https://java.testcontainers.org/modules/databases/mysql/). |

Hồ sơ Sprint 01 phải lưu bảng phiên bản đã chọn, lý do, dependency tree và kết quả chạy thử migration trên DB trống. Khi nâng cấp dependency, mở task riêng và chạy lại kiểm thử tương thích.

## 2. Nguyên tắc dữ liệu

1. **Công việc và lỗi dùng chung định danh.** `work_items` chứa dữ liệu chung; `bug_details` mở rộng khi loại là lỗi. Bảng Kanban, Danh sách và Quản lý lỗi là các cách xem cùng bản ghi. Không tạo một bug thứ hai chỉ để đưa lên Kanban.
2. **Dữ liệu cũ phải truy vết được.** Test case đã phát hành có revision bất biến. Mỗi lần thực thi lưu revision, người thực hiện, build, môi trường, thiết bị và thời điểm. Sửa nội dung test case tạo revision mới, không sửa lịch sử của đợt đã chạy.
3. **Retest giữ riêng kết luận bug và kết luận test case.** NG ở build A vẫn là NG. Kiểm tra riêng bước tái hiện bug tạo `bug_verification_attempts`; chỉ khi chạy lại đầy đủ test case mới tạo `execution_attempt` với kết luận toàn case và cập nhật kết quả hiện tại của đúng run item/đợt. Targeted retest đạt không đủ để biến kết luận NG của toàn case thành OK.
4. **Phạm vi truy cập là dự án.** Mọi bảng nghiệp vụ mang `project_id`; API và repository luôn kiểm tra thành viên/quyền dự án. Khóa ngoại ghép ngăn liên kết nhầm giữa hai dự án. Đây là phân tách dữ liệu theo dự án trong một hệ thống; chưa mặc định xây SaaS nhiều tổ chức.
5. **Trạng thái là dữ liệu có mã ổn định.** Dùng bảng tra cứu và workflow, không dùng tên tiếng Việt làm khóa, không lưu MySQL `ENUM` cho trạng thái có thể thay đổi. Hiện có bằng chứng cho 10 trạng thái UI, chưa xác nhận 12 trạng thái. Danh sách chính thức và điều kiện chuyển trạng thái chốt trong sprint nghiệp vụ.
6. **Giao diện tiếng Việt; tài liệu gốc được giữ lại.** Revision chứa nội dung tiếng Việt dùng khi kiểm thử, nội dung tiếng Nhật gốc nếu được cung cấp, nguồn nhập, người dịch/người duyệt. Không phát triển giao diện tiếng Nhật chỉ vì lưu văn bản gốc.
7. **Báo cáo tính theo đối tượng chuẩn.** Đếm lỗi bằng `work_items.id` với loại lỗi; tiến độ bằng `run_items.id` trong phạm vi cycle, không đếm số dòng join hoặc tổng số lần retest. Kết quả NG/OK lịch sử là chỉ số riêng.

### Quy ước dùng trong danh mục schema

- `id`: dự kiến `BIGINT` có dấu, sinh tại DB; API dùng chuỗi nếu cần tránh giới hạn số nguyên an toàn của JavaScript. Dùng thống nhất kiểu ở PK/FK. Mã hiển thị như `SFLUTTER-6071` tách khỏi PK; số thứ tự cấp theo dự án trong giao dịch, không dùng `MAX + 1` không khóa.
- `P`: `project_id NOT NULL`; bảng có `id` và P thêm `UNIQUE(project_id,id)` để được tham chiếu bằng FK ghép. `FK cùng P` nghĩa là `(project_id,child_id)` tham chiếu `(project_id,id)`, **không chỉ** `child_id`.
- Thời gian lưu UTC với độ chính xác microsecond; ngày lịch dùng `DATE`. Hiển thị/báo cáo ngày theo múi giờ dự án. Chuỗi code/khóa idempotency cần collation có quy tắc phân biệt hoa thường xác định; văn bản tiếng Việt/Nhật dùng `utf8mb4`.
- Bảng có thể sửa: `created_at`, `created_by`, `updated_at`, `updated_by`, `lock_version` cho optimistic locking. Bảng lịch sử: người ghi, thời điểm, sự kiện nguồn; không cập nhật/xóa qua API thường.
- `U(...)`: unique; `I(...)`: index dự kiến. Index dưới đây là điểm khởi đầu, phải kiểm tra với truy vấn thực tế và `EXPLAIN` trước khi mở rộng.
- **Chính sách xóa mặc định:** FK `RESTRICT`; archive/vô hiệu hóa đối tượng thay vì xóa vật lý khi đã có lịch sử. Không cascade xóa dự án, cycle, test case, bug hoặc người dùng. Chỉ bảng nối thuần túy chưa có lịch sử được xóa có kiểm soát.
- `CHECK`, `NOT NULL`, `UNIQUE`, FK bảo vệ ràng buộc cấu trúc. Quy tắc nhiều bản ghi và quyền actor nằm ở domain/service, được kiểm thử trong giao dịch; không kỳ vọng JPA validation thay thế DB constraints.

## 3. Danh mục bảng và quan hệ mục tiêu

### 3.1. Danh tính, dự án, quyền và dữ liệu dùng chung

| Bảng / mục đích | PK và trường chính | FK, unique, index chính | Xóa / thời điểm |
| --- | --- | --- | --- |
| `users` — người dùng nội bộ/khách xem | PK `id`; login chuẩn hóa, tên, email, password hash nếu dùng local auth, active | U(login chuẩn hóa); I(active,id). Không lưu mật khẩu gốc | Vô hiệu hóa; S02 |
| `roles` — vai trò như PM, tester, BrSE, developer, viewer | PK `id`; code, tên, scope | U(code) | Vô hiệu hóa nếu đã gán; S02 |
| `permissions` — quyền hành động | PK `code`; mô tả | Code cố định do backend định nghĩa | Migration mới khi đổi; S02 |
| `role_permissions` — ma trận quyền | PK `(role_id,permission_code)` | FK roles, permissions; I(permission_code,role_id) | Xóa liên kết có audit; S02 |
| `auth_sessions` — phiên đăng nhập nếu chọn session/refresh token | PK `id`; user_id, token hash, expires_at, revoked_at | FK users; U(token_hash); I(user_id,expires_at) | Thu hồi; dọn bản hết hạn theo retention; S02. Chốt cơ chế auth trước khi tạo |
| `projects` — dự án | PK `id`; code, tên, timezone, trạng thái archive | U(code) | Archive; S03 |
| `project_memberships` — người thuộc dự án | PK `id`; P, user_id, active | FK projects/users; U(P,user_id); U(P,id); I(user_id,active,P) | Vô hiệu hóa, giữ lịch sử actor; S03 |
| `project_role_bindings` — quyền thành viên trong dự án | PK `(project_id,membership_id,role_id)` | FK cùng P membership; FK role; I(P,role_id,membership_id) | Thay đổi có audit; S03 |
| `project_counters` — cấp số công việc/test case | PK `(project_id,counter_code)`; next_value | FK project; tăng số trong transaction có khóa | Không xóa khi dự án tồn tại; S03 |
| `environments` — môi trường kiểm thử | PK `id`; P, code, tên, mô tả, active | U(P,code); FK project | Vô hiệu hóa; S03 |
| `builds` — phiên bản ứng dụng thực tế | PK `id`; P, version_label, build_number, platform, released_at | U(P,platform,version_label,build_number); I(P,released_at,id) | Không sửa danh tính khi đã dùng; S03 |
| `devices` — danh mục thiết bị | PK `id`; P, mã, model, OS/version, active | U(P,code); I(P,active,id) | Vô hiệu hóa; snapshot cấu hình ở attempt; S03 |
| `categories` — danh mục chức năng | PK `id`; P, code, tên, active | U(P,code) | Archive; S03 |
| `milestones` — mốc phát hành | PK `id`; P, code, tên, starts_on, due_on | U(P,code); I(P,due_on,id) | Archive; không suy hạn phát hành từ tên; S03 |
| `project_resources` — danh tính hướng dẫn và đầu mối tài khoản kiểm thử | PK `id`; P, code, loại, tên, current_revision_id, archived_at | U(P,code); FK project; FK `(P,id,current_revision_id)` tới resource revision; I(P,type,updated_at,id) | Archive có audit; S03 |
| `resource_revisions` — phiên bản sổ tay/hướng dẫn | PK `id`; P, resource_id, revision_no, nội dung/URL hoặc `secret_reference`, visibility, người sửa/duyệt, published_at | FK cùng P resource/member; U(P,resource_id,revision_no); U(P,resource_id,id) | Published bất biến; S03. Không lưu mật khẩu tài khoản kiểm thử dạng rõ |
| `rulesets` — nhóm quy tắc dự án | PK `id`; P, code, tên, active_version_id | U(P,code); FK cùng P tới version, kiểm tra version thuộc ruleset | Archive; S03 nền, S06 hoàn thiện rule bug |
| `rule_versions` — bản quy tắc đã phát hành | PK `id`; P, ruleset_id, version_no, nội dung cấu trúc/JSON, published_at, actor | FK cùng P ruleset; U(P,ruleset_id,version_no); U(P,ruleset_id,id) phục vụ active pointer | Published bất biến; S03/S06 |

`role_permissions` không tự đồng nghĩa mọi người có vai trò đều thấy mọi dự án. Backend lấy quyền qua membership và binding đúng P; quyền quản trị hệ thống, nếu cần, phải được thiết kế riêng và audit, không suy ra từ một project role.

S02 chỉ cần audit cho danh tính/quyền hệ thống; cột và FK dự án của audit được bổ sung cùng `projects` ở S03. Các con trỏ vòng như `rulesets.active_version_id`, `project_resources.current_revision_id` hoặc `test_cases.current_revision_id` được thêm sau khi đã tạo đủ hai bảng, kèm FK ghép xác nhận version thuộc đúng đối tượng; không bỏ FK chỉ vì thứ tự tạo bảng.

### 3.2. Test case và nhập tài liệu

| Bảng / mục đích | PK và trường chính | FK, unique, index chính | Xóa / thời điểm |
| --- | --- | --- | --- |
| `test_suites` — nhóm test case | PK `id`; P, code, tên, parent_id, sort_order | U(P,code); FK cùng P parent; I(P,parent_id,sort_order,id) | Archive; kiểm tra vòng lặp cây tại service; S04 |
| `test_cases` — danh tính test case | PK `id`; P, case_no, suite_id, current_revision_id, archived_at | U(P,case_no); FK cùng P suite; I(P,suite_id,id) | Archive; S04 |
| `test_case_revisions` — nội dung bất biến theo phiên bản | PK `id`; P, test_case_id, revision_no, title_vi, preconditions_vi, steps_vi, expected_vi; các trường JP gốc; source_reference, translator/reviewer, checksum | FK cùng P test_case; U(P,test_case_id,revision_no); U(P,test_case_id,id). Current revision phải thuộc đúng case | Revision đã dùng không sửa/xóa; S04 |
| `import_batches` — theo dõi nhập Excel | PK `id`; P, file checksum, trạng thái, mapping_version, người nhập, thời điểm | FK project/user; I(P,created_at,id); idempotency key theo project/người thực hiện | Giữ metadata và kết quả; S04 |
| `import_rows` — staging và lỗi theo dòng nhập | PK `(batch_id,row_number)`; P, source_case_key, dữ liệu đã chuẩn hóa, lỗi validation, target_case_id | FK cùng P batch/case; U(P,batch_id,row_number) | Dọn raw staging theo retention; không mất dấu batch/revision đã công bố; S04 |

Không dùng số dòng Excel làm PK lâu dài. Khi nhập lại, hiển thị preview thêm mới/thay đổi/trùng/lỗi; người dùng xác nhận trước khi phát hành revision. Lưu bản dịch và bản gốc như nội dung nghiệp vụ, không tự dịch rồi ghi đè nội dung đã duyệt.

### 3.3. Chu kỳ, phân công và kết quả thực thi

| Bảng / mục đích | PK và trường chính | FK, unique, index chính | Xóa / thời điểm |
| --- | --- | --- | --- |
| `test_cycles` — đợt kiểm thử | PK `id`; P, code, tên, milestone_id, thời gian, trạng thái | U(P,code); FK cùng P milestone; I(P,status,starts_on,id) | Archive khi hoàn tất; S05 |
| `cycle_assignments` — phân công nhóm/suite | PK `id`; P, cycle_id, suite_id, assignee_membership_id, target_count, due_on | FK cùng P cycle/suite/member; U(P,cycle_id,suite_id,assignee_membership_id); I(P,assignee_membership_id,cycle_id) | Hủy có lịch sử, không xóa assignment đã có thực thi; S05 |
| `run_items` — một test case trong một cấu hình của đợt | PK `id`; P, cycle_id, assignment_id, test_case_id, revision_id, environment_id, device_id, assignee_membership_id, latest_attempt_id | FK cùng P các đối tượng; FK `(P,test_case_id,revision_id)` tới revision; U(P,cycle_id,test_case_id,environment_id,device_id); I(P,cycle_id,assignee_membership_id,id) | Hủy/loại khỏi phạm vi có audit; S05 |
| `execution_results` — mã kết quả | PK `code`; nhãn VI, nhóm kết quả | Các mã được chốt như NOT_RUN, OK, NG, BLOCKED, SKIPPED; không coi SKIPPED=OK | Versioned reference data; S05 |
| `execution_attempts` — từng lần thực thi | PK `id`; P, run_item_id, attempt_no, result_code, build_id, environment_id, device_id, executor_membership_id, executed_at, actual_result, snapshot môi trường/thiết bị/build, request_key | FK cùng P run item/catalog/member; FK result; U(P,run_item_id,attempt_no); U(P,run_item_id,id); U(P,request_key); I(P,run_item_id,executed_at,id) | Append-only; sửa nhầm bằng lần hiệu chỉnh có lý do/liên kết, không ghi đè; S05 |

Đối với môi trường/thiết bị không áp dụng, dùng bản ghi danh mục được khai báo rõ như `NOT_APPLICABLE`, tránh nullable làm yếu unique scope. Snapshot lưu thông số thực tế lúc chạy để danh mục thay đổi không làm biến đổi bằng chứng. `latest_attempt_id` phải FK tới `(P,run_item_id,id)` của attempt tương ứng, không được trỏ sang run item khác. Giao dịch tạo attempt và đổi latest pointer dùng khóa/optimistic version cùng idempotency key.

`NOT_RUN` là trạng thái suy ra khi run item chưa có attempt; không tạo attempt giả chỉ để có dòng kết quả. Khi cần đổi cấu hình môi trường/thiết bị của phạm vi đã chạy, tạo run item mới có liên kết nguồn/audit và xử lý trạng thái mục cũ theo rule, không đổi phạm vi lịch sử của attempt đã ghi.

### 3.4. Công việc, bug, bằng chứng và workflow

| Bảng / mục đích | PK và trường chính | FK, unique, index chính | Xóa / thời điểm |
| --- | --- | --- | --- |
| `work_item_statuses` — trạng thái theo dự án | PK `id`; P, code, label_vi, màu, nhóm, is_terminal, sort_order, active | U(P,code); I(P,active,sort_order) | Vô hiệu hóa khi không còn dùng; S06 |
| `workflow_transitions` — đường chuyển trạng thái và rule | PK `id`; P, from_status_id, to_status_id, required_permission, rule_version_id | FK cùng P status/rule; FK permission; U(P,from_status_id,to_status_id,required_permission) | Version/audit cấu hình; S06 |
| `work_items` — task/request/bug dùng chung | PK `id`; P, item_no, type_code, title, description, status_id, priority_code, reporter/assignee membership, parent_id, start/due_date, estimated/actual_minutes, lock_version | U(P,item_no); FK cùng P status/member/parent; I(P,status_id,updated_at,id); I(P,assignee_membership_id,status_id,id); I(P,type_code,updated_at,id) | Archive; không xóa bug có traceability; S06 |
| `work_item_categories` — phân nhóm công việc | PK `(project_id,work_item_id,category_id)` | FK cùng P work item/category; I(P,category_id,work_item_id) | Xóa liên kết có audit; S06 |
| `work_item_milestones` — nhiều mốc phát hành nếu nghiệp vụ yêu cầu | PK `(project_id,work_item_id,milestone_id)` | FK cùng P work item/milestone; I(P,milestone_id,work_item_id) | Xóa liên kết có audit; S06 |
| `bug_details` — trường bắt buộc riêng của lỗi | PK `work_item_id`; P, environment_id, device_id, affected_build_id, fix_build_id, steps_to_reproduce, expected_result, actual_result, rule_version_id, closure_reason | U(P,work_item_id); FK cùng P work item/catalog/rule; I(P,affected_build_id,work_item_id) | Theo work item; S06. Service bảo đảm chỉ loại BUG có detail và BUG bắt buộc có detail |
| `execution_issue_links` — lỗi liên quan nhiều lần thực thi và ngược lại | PK `(project_id,execution_attempt_id,work_item_id)`; link_kind, linked_by, linked_at | FK cùng P attempt/bug_details; I(P,work_item_id,execution_attempt_id) | Gỡ liên kết nhầm cần lý do/audit; không xóa attempt/bug; S06 |
| `work_item_comments` — trao đổi trên ticket | PK `id`; P, work_item_id, actor_membership_id, body, visibility, edited_at | FK cùng P item/member; I(P,work_item_id,created_at,id) | Lưu revision/redaction audit nếu sửa; S06 |
| `attachments` — metadata và vòng đời tệp bằng chứng | PK `id`; P, object_key, tên gốc, mime_type, size, checksum, scan_status, upload_state, uploaded_by, staged_expires_at | U(object_key); FK cùng P uploader; I(P,upload_state,staged_expires_at,id) | Tệp mới được staging chưa có owner; chỉ publish sau kiểm tra; cleanup staged quá hạn/mồ côi theo policy; S06 |
| `attachment_links` — tái sử dụng bằng chứng, giữ provenance từng liên kết | PK `id`; P, attachment_id, một owner trong work_item_id/comment_id/execution_attempt_id/case_revision_id, linked_by, linked_at | FK cùng P attachment, từng owner và actor; CHECK đúng một owner trên **mỗi link**; U(P,attachment_id,work_item_id) và unique tương đương cho từng loại owner; I(P,attachment_id,id) | Gỡ link có audit, không xóa blob đang có link khác; S06. S07 thêm owner bug_verification_attempt_id và FK khi bảng đó tồn tại |
| `work_item_status_history` — lịch sử trạng thái | PK `id`; P, work_item_id, from_status_id, to_status_id, actor, reason, rule_version_id, occurred_at, command_id | FK cùng P item/status/rule/member; I(P,work_item_id,occurred_at,id); U(P,command_id) | Append-only; S06 |
| `customer_confirmations` — quyết định khách hàng qua BrSE | PK `id`; P, work_item_id, decision_code, response_summary, source_reference, confirmed_by, confirmed_at, supersedes_id | FK cùng P bug/member/confirmation cũ; I(P,work_item_id,confirmed_at,id) | Append-only; quyết định mới thay thế logic, không xóa quyết định cũ; S06/S07 |
| `audit_events` — nhật ký thao tác nhạy cảm | PK `id`; P nullable chỉ cho sự kiện hệ thống, actor_user_id, entity_type/id, action, before/after đã lọc nhạy cảm, request_id, occurred_at | FK project/user khi có; I(P,occurred_at,id); I(P,entity_type,entity_id,occurred_at) | Append-only; retention có phê duyệt; nền S02, mở rộng theo sprint |

`audit_events.entity_type/id` là tham chiếu lịch sử, không thay thế FK nghiệp vụ. Tệp nằm ở kho lưu trữ, DB giữ metadata; đường dẫn không phải URL công khai mặc định. Attachment có thể chưa có link khi staging, hoặc có nhiều link sau khi dùng lại; mỗi link luôn chỉ có một owner hợp lệ. Chỉ người upload/người có quyền quản lý mới xem tệp staging; tệp đã liên kết phải qua quyền dự án, owner và visibility, không làm lộ tệp nội bộ khi gắn vào nội dung cho khách. Không đưa secret, access token hoặc mật khẩu vào audit, snapshot, payload lỗi.

### 3.5. Retest, báo cáo và kết nối bên ngoài

| Bảng / mục đích | PK và trường chính | FK, unique, index chính | Xóa / thời điểm |
| --- | --- | --- | --- |
| `retest_requests` — phạm vi yêu cầu kiểm tra bản sửa | PK `id`; P, work_item_id, fix_build_id, environment_id, device_id, coverage_revision, rule_version_id, requested_by, assigned_to, trạng thái, requested_at, lock_version | FK cùng P bug/build/env/device/rule/member; I(P,work_item_id,coverage_revision,status,id); I(P,assigned_to,status,id) | Một request đúng một build/env/device; toàn bộ nhóm request của coverage revision được chốt trước submit; hủy có lý do; S07 |
| `retest_request_items` — từng mục bắt buộc/xử lý ngoại lệ của coverage | PK `(project_id,retest_request_id,run_item_id)`; origin_attempt_id, required_scope (BUG_TARGETED/FULL_CASE), disposition, waiver_reason, approved_by, latest_verification_id | FK cùng P request/run item/member; FK `(P,run_item_id,origin_attempt_id)` tới attempt; U(P,retest_request_id,run_item_id); latest verification phải thuộc đúng request item; I(P,run_item_id,retest_request_id) | Khởi tạo đầy đủ từ coverage đã duyệt, không suy từ danh sách kết quả gửi lên; giữ lịch sử miễn trừ/thay scope; S07 |
| `bug_verification_attempts` — kết quả xác minh bug riêng biệt | PK `id`; P, retest_request_id, run_item_id, attempt_no, verification_scope, verdict (PASS/FAIL/INCONCLUSIVE), actual_result, full_case_attempt_id nullable, executor, executed_at, request_key; snapshot cấu hình của request | FK `(P,retest_request_id,run_item_id)` tới request item; FK `(P,run_item_id,full_case_attempt_id)` tới execution attempt; U(P,retest_request_id,run_item_id,attempt_no); U(P,retest_request_id,run_item_id,id); I(P,retest_request_id,run_item_id,executed_at,id) | Append-only; full_case_attempt_id chỉ có khi thực sự chạy đầy đủ case; không coi verdict PASS là result OK toàn case; S07 |
| `report_snapshots` — báo cáo đã xuất/chốt, chỉ nếu cần | PK `id`; P, cycle_id, as_of, timezone, metric_definition_version, filters_json, values_json, generated_by | FK cùng P cycle/member; I(P,cycle_id,as_of,id) | Bất biến, retention; S08. Dashboard bình thường truy vấn dữ liệu nguồn, không bắt buộc tạo bảng cache |
| `integration_connections` — cấu hình kết nối Redmine nếu được chọn | PK `id`; P, provider, base_url, remote_project_id, secret_reference, enabled | U(P,provider,base_url,remote_project_id); FK project | Vô hiệu hóa; S09 có điều kiện |
| `external_ticket_links` — tham chiếu thủ công tới ticket ngoài, sau đó có thể đồng bộ | PK `id`; P, work_item_id, provider, instance_key, external_id, external_url, last_reconciled_at, reconciled_by, external_status, external_updated_at; S09 thêm connection_id nullable, sync_state, last_synced_at | S06 FK cùng P bug/member; U(P,provider,instance_key,external_id); U(P,provider,instance_key,work_item_id). S09 mới thêm FK cùng P connection và quy tắc ánh xạ instance | Giữ link khi tắt integration; metadata thủ công S06 không phụ thuộc bảng S09; tự động hóa có điều kiện S09 |
| `integration_status_mappings` — ánh xạ workflow | PK `(project_id,connection_id,local_status_id)`; remote_status_id, sync_direction | FK cùng P connection/status; kiểm tra ánh xạ ngược khi publish | Version/audit; S09 có điều kiện |
| `integration_outbox` — yêu cầu đồng bộ bền vững | PK `id`; P, connection_id, aggregate_id, event_type, payload_version, payload_json, dedupe_key, attempts, next_attempt_at, state, last_error | FK cùng P connection/work item; U(P,connection_id,dedupe_key); I(state,next_attempt_at,id) | Retention sau hoàn tất, giữ lỗi cần xử lý; S09 có điều kiện |

Các bảng lookup nhỏ cho loại công việc/ưu tiên/lý do đóng được định nghĩa cùng migration của module, với code bất biến và FK từ bảng nghiệp vụ. Không lưu danh sách ID quan hệ trong một chuỗi hoặc JSON chỉ để bỏ qua bảng nối. Danh mục này là blueprint: từng sprint phải hoàn thiện DDL mọi cột, kiểu, nullability, default, check, FK, unique, index, thứ tự tạo trước khi chạy migration.

Kết quả xác minh bug và trạng thái theo hệ thống khách hàng là hai dữ kiện riêng. Nếu Q01 chọn external tracker làm nguồn trạng thái chính, giữ `work_items.status_id` theo workflow authoritative; local PASS/đủ coverage chỉ ghi verification và yêu cầu đóng đang chờ. Chỉ xác nhận trạng thái closed khi có acknowledgment/đối soát đúng ticket và đúng phiên bản sau cùng; timeout hoặc phản hồi cũ không được tự đóng local mirror. S06–S07 có thể ghi acknowledgment thủ công có người xác nhận và nguồn; S09 mới tự động qua adapter. Nếu Q01 chọn TMS làm nguồn chính, local close có thể commit trước rồi hiển thị sync pending. Báo cáo phải phân biệt verified local, pending closure và closed authoritative.

S07 bổ sung trên `bug_details` các trường dự kiến `active_coverage_revision`, `local_verification_state`, `closure_request_state`, `closure_request_key`, `closure_requested_at`, `closure_acknowledged_at`; trạng thái này độc lập `work_items.status_id`. Khóa yêu cầu đóng và version bug là căn cứ từ chối acknowledgment cũ sau khi reopen. Căn cứ xác nhận (remote version nếu provider có, ID/link sự kiện hoặc biên bản xác nhận thủ công, actor/thời điểm) lưu cùng external reference/customer confirmation/audit; không chỉ giữ trong state frontend.

### Quan hệ logic để triển khai ERD chi tiết ở từng sprint

| Quan hệ | Cardinality và ràng buộc |
| --- | --- |
| User — Project | N:N qua membership; role bindings nằm trong đúng membership dự án |
| Project — Catalog / Suite / Cycle / Work item | 1:N; toàn bộ con mang P |
| Suite — Test case — Revision | 1:N và 1:N; case có một current revision, run giữ revision đã chọn |
| Cycle — Run item — Execution attempt | 1:N và 1:N; lần chạy không làm phát sinh test case mới |
| Work item — Bug details | 1:0..1; loại BUG cần đúng một detail |
| Execution attempt — Bug | N:N qua execution_issue_links, cùng dự án |
| Bug — Retest request — Retest request item — Bug verification | 1:N, 1:N, 1:N; coverage có nhiều cấu hình; verification chỉ tham chiếu full execution khi chạy lại cả case |
| Bug — Customer confirmation / Status history | 1:N, giữ lịch sử |
| Bug — External ticket | 1:N theo connection, một link duy nhất trên mỗi connection |

## 4. Blueprint SQL đại diện — chỉ để review thiết kế

Đây là đoạn minh họa constraint cho bảng nối. **Không phải migration hoàn chỉnh để chạy**: các bảng cha, kiểu cột, collation và dữ liệu tham chiếu phải được thiết kế/kiểm thử trong sprint tương ứng. Không tạo file `.sql` từ đoạn này ở giai đoạn lập kế hoạch.

```sql
CREATE TABLE execution_issue_links (
    project_id BIGINT NOT NULL,
    execution_attempt_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    link_kind VARCHAR(24) NOT NULL,
    linked_by BIGINT NOT NULL,
    linked_at DATETIME(6) NOT NULL,
    PRIMARY KEY (project_id, execution_attempt_id, work_item_id),
    KEY ix_issue_attempt (project_id, work_item_id, execution_attempt_id),
    CONSTRAINT fk_link_attempt
        FOREIGN KEY (project_id, execution_attempt_id)
        REFERENCES execution_attempts (project_id, id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_link_bug
        FOREIGN KEY (project_id, work_item_id)
        REFERENCES bug_details (project_id, work_item_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_link_actor
        FOREIGN KEY (project_id, linked_by)
        REFERENCES project_memberships (project_id, id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;
```

Ý nghĩa cần nghiệm thu: cùng một bug có thể liên kết nhiều lần chạy; một lần chạy có thể phát hiện nhiều bug; DB từ chối liên kết khác dự án; link trùng bị unique chặn. Các constraint còn lại như `link_kind` phải tham chiếu lookup đã chốt trước khi viết SQL thực thi.

## 5. Ranh giới giao dịch và tính nhất quán

| Use case | Một transaction MySQL phải bao gồm | Không gộp vào transaction DB |
| --- | --- | --- |
| Ghi kết quả test | Kiểm tra quyền/scope, khóa run item/version, thêm attempt bất biến, đổi latest pointer, audit | Upload tệp lớn; gọi Slack/Redmine |
| Tạo bug từ NG | Validation bằng rule version đã chọn, tạo work item + bug detail, liên kết attempt, trạng thái đầu/audit; idempotency | Tạo ticket Redmine bằng HTTP đồng bộ trong transaction |
| Chuyển trạng thái | Kiểm tra transition/quyền/confirmation và optimistic version, cập nhật current status, thêm history/audit | Logic riêng trên frontend tự ghi trạng thái không qua domain |
| Nộp retest và đề nghị đóng lỗi | Khóa/kiểm tra version của bug, coverage, request và run item; thêm bug verification; chỉ full-case rerun mới thêm execution attempt/đổi latest full-case pointer; tổng hợp coverage; close local hoặc ghi pending closure theo Q01; history/audit và outbox nếu S09 đã triển khai | Sửa NG cũ; targeted PASS làm case OK; kết quả một cấu hình đại diện toàn coverage; đóng authoritative trước acknowledgment; chờ HTTP bên ngoài |
| Phân công hoặc đổi phạm vi | Kiểm tra cycle/suite/member cùng P, cập nhật assignment/run items có version, audit | Ghi trực tiếp từ bảng UI mà bỏ qua permission |

Đóng lỗi cần phân biệt ít nhất hai đường: **đã sửa và retest đạt**; **không tái hiện/không xử lý với lý do, bằng chứng, xác nhận cần thiết**. Đường thứ hai không tạo kết quả OK giả. Nếu một run item có nhiều bug, kiểm tra từng bug và kết quả thực thi; trạng thái bug không là phép suy luận thay cho kết quả test case. Một bug ảnh hưởng nhiều run item cần tất cả mục bắt buộc đã retest hoặc có quyết định loại trừ có lý do theo rule đã duyệt.

Một lần submit chỉ thuộc một tổ hợp build/môi trường/thiết bị; nhiều cấu hình gửi ở nhiều request. Coverage đóng lỗi được đánh giá trên **toàn bộ tập run item/cấu hình bắt buộc của coverage revision hiện hành**, kết hợp verification đã lưu trước đó và kết quả mới trong transaction. Không lấy payload vừa gửi làm mẫu số, không dùng PASS ở build cũ bù cho build sửa mới, không dùng PASS cũ nếu đã có FAIL mới hơn hoặc bug bị reopen/coverage thay đổi. Hệ thống giữ đủ lineage để chỉ chọn kết quả còn hợp lệ theo policy.

Ví dụ: case C có hai bug A/B, kết luận đầy đủ gần nhất là NG. Tester chỉ kiểm tra bước tái hiện A và xác nhận PASS: ghi verification của A, giữ kết luận C là NG. Khi tester chạy lại **đầy đủ C** trên bản sửa và đáp ứng toàn bộ expected result mới tạo execution OK của C; thao tác đó vẫn không tự đóng B nếu thiếu điều kiện xác minh riêng. Một bug A cần cả Android/iOS: Android PASS không đủ đóng, nhưng có thể kết hợp iOS PASS hợp lệ đã lưu trước đó đúng revision/build theo policy.

Nếu `closureRequested=true` nhưng coverage/quyền/điều kiện chưa đủ, contract dự kiến trả 422 và rollback toàn bộ submit; người dùng được gửi lại chỉ lưu verification. External acknowledgment là bước sau local commit khi tracker ngoài authoritative, không nằm trong ACID transaction local và không được biểu diễn là đã closed từ đầu.

Nếu hai tester cùng gửi kết quả hoặc cùng đóng bug, unique/idempotency và version phải đảm bảo chỉ một thao tác được chấp nhận, thao tác còn lại trả conflict có thể xử lý. Báo cáo đọc snapshot nhất quán tại một thời điểm; tổng ngắt theo nhiều request phải hiển thị cùng `asOf` nếu yêu cầu đối chiếu chính xác.

## 6. Cấu trúc và quy trình Flyway

Thư mục dự kiến: `Backend/src/main/resources/db/migration/`. Tên file `V<version>__<description>.sql`, mô tả bằng snake_case tiếng Anh. Flyway áp dụng versioned migrations theo thứ tự, lưu version/checksum trong `flyway_schema_history`; script đã áp dụng vào môi trường dùng chung phải được giữ nguyên, sửa bằng version mới. [Versioned migrations](https://documentation.red-gate.com/fd/versioned-migrations-273973333.html).

**Số migration là dãy toàn dự án, không phải số sprint.** Bảng dưới chỉ là ví dụ nếu mỗi sprint ban đầu cần một migration. Một sprint có thể cần nhiều file, hoặc không cần file; luôn lấy version tiếp theo chưa dùng sau khi đồng bộ `develop`. Không dành sẵn một khoảng số cứng cho từng sprint, không chèn migration thấp hơn version đã phát hành, không đổi tên script đã áp dụng.

| Sprint | Nội dung dự kiến | Ví dụ tên theo chuỗi giả định |
| --- | --- | --- |
| S01 | Foundation tối thiểu: thiết lập schema/migration, quy ước, reference nền cần thiết; chưa tạo toàn bộ domain | `V1__create_foundation.sql` |
| S02 | User, role, permission, session nếu cần, audit nền | `V2__create_identity_and_access.sql` |
| S03 | Project, membership, catalog, resources/revisions, ruleset nền | `V3__create_project_catalogs.sql` |
| S04 | Suite, case, revision, import staging | `V4__create_test_case_library.sql` |
| Review S03/S04 | Integrity/audit | Đã áp dụng `V5__review_project_integrity.sql` |
| S05 | Cycle, assignment, run item, execution attempt | Đã áp dụng `V6__create_test_execution.sql` |
| S06 | Work item/bug dùng chung, workflow nội bộ, tham chiếu thủ công, chứng cứ | Đã áp dụng `V7__create_work_items.sql` |
| S07 | Retest coverage/verification và traceability đóng lỗi | Chọn số kế tiếp khi triển khai; hiện tại V8 |
| S08 | Index/query báo cáo; snapshot nếu có nhu cầu đã xác nhận | Chọn số kế tiếp khi triển khai |
| S09 | Mapping/outbox tracker nếu được duyệt | Chọn số kế tiếp khi triển khai |

Số và tên thực tế được ghi vào hồ sơ sprint khi triển khai. Nếu S01 cần hai migration, migration đầu S02 có thể là V3; bảng trên không được dùng làm lý do sửa lịch sử.

Kiểm tra phụ thuộc bắt buộc: S03 mới gắn project FK cho audit; S04 import giữ metadata nguồn riêng, chưa FK tới attachment S06; S05 NG ghi nhận trước, S06 mới thêm bug links; S06 manual external reference chưa có connection FK; S07 mới thêm attachment link tới bug verification; S09 mới có connection/mapping/outbox. Domain hook ở S06–S07 không được ghi vào bảng outbox chưa tồn tại. Mọi latest pointer vòng được thêm sau bảng đích trong cùng sprint.

### Cấu hình chính sách dự kiến

Các giá trị dưới đây là yêu cầu cấu hình, chưa phải file cấu hình đã được cài:

| Thiết lập | Chính sách dự án |
| --- | --- |
| `spring.jpa.hibernate.ddl-auto` | `validate`: JPA kiểm tra mapping; Flyway sở hữu thay đổi schema. Không dùng `update`, `create`, `create-drop` trên DB dùng chung |
| `spring.sql.init.mode` | `never`: tránh chạy thêm `schema.sql`/`data.sql` song song |
| `spring.flyway.locations` | `classpath:db/migration` cho schema dùng chung |
| `spring.flyway.clean-disabled` | `true`, khai báo rõ ở các cấu hình được hỗ trợ |
| `spring.flyway.baseline-on-migrate` | `false` cho DB mới; không tự baseline DB có bảng mà chưa có lịch sử |
| `spring.flyway.validate-on-migrate` | `true`; thất bại phải dừng migration/startup |
| `spring.flyway.out-of-order` | `false`; xử lý xung đột version trước khi áp dụng vào DB dùng chung |

Việc chọn `ddl-auto=validate` là quyết định của dự án. Spring Boot khuyến nghị một cơ chế tạo schema và hướng dẫn dùng riêng Flyway thay vì trộn với `schema.sql`/`data.sql`; cấu hình chính xác cần đối chiếu lại theo phiên bản Boot chốt ở S01. [Spring Boot database initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html).

Chặn `clean` và không tự baseline là mặc định làm việc đã chọn cho repo; Flyway có các thiết lập tương ứng. Baseline một DB cũ chỉ được thực hiện sau khi kiểm kê schema, so sánh dữ liệu, backup và lập phương án tiếp nhận riêng. [Clean disabled](https://documentation.red-gate.com/fd/flyway-clean-disabled-setting-277578981.html), [Baseline on migrate](https://documentation.red-gate.com/fd/flyway-baseline-on-migrate-setting-277578974.html).

### Credentials và môi trường

- Tài khoản **runtime** chỉ có quyền DML tối thiểu trên schema nghiệp vụ; không DDL, không quyền quản trị toàn máy chủ. Tài khoản **migrator** có quyền thay đổi schema đích và bảng history cần thiết, chỉ dùng trong migration job hoặc cấu hình phát triển có kiểm soát.
- Development có thể migrate lúc khởi động bằng cấu hình Flyway riêng. Môi trường dùng chung ưu tiên migration job chạy trước ứng dụng; runtime khởi động chỉ validate, không giữ mật khẩu migrator trong process ứng dụng.
- URL/user/password lấy từ biến môi trường/secret store; file mẫu chỉ có placeholder. Cấp đủ ba cấu hình Flyway riêng để không vô tình fallback sang datasource runtime. Không ghi credentials vào git, log, screenshot hoặc tài liệu sprint.
- Local, CI, staging có DB/schema tách biệt. CI tạo MySQL container dùng một lần; giữ `clean-disabled=true`, kết thúc bằng bỏ container thay vì mở quyền clean trên DB dùng chung.
- Dữ liệu tham chiếu thật cần để ứng dụng chạy (mã trạng thái/quyền) nằm trong migration được review. Demo seed giả nằm riêng, chỉ bật rõ ở profile demo/test; không đóng gói fixture khách hàng, tài khoản thực hoặc mật khẩu cố định vào artifact production.

### Quy trình mỗi thay đổi schema

1. Đọc sprint đang được giao, schema hiện tại và `flyway_schema_history` của môi trường phát triển phù hợp; xác định bảng/cột/query bị ảnh hưởng.
2. Review blueprint, ảnh hưởng dữ liệu cũ, index, tính tương thích API và kế hoạch phục hồi trước khi viết migration.
3. Đồng bộ nhánh nền, lấy số migration tiếp theo; viết file nhỏ có mục đích rõ. Không gộp tạo toàn bộ backend vào một migration của S01.
4. Chạy DB mới từ đầu và nâng cấp từ schema sprint trước có fixture đại diện; validate lịch sử/checksum. `validate` phát hiện khác biệt tên/kiểu/checksum giữa file và lịch sử, không phải chứng minh toàn bộ business data đã đúng. [Flyway validate](https://documentation.red-gate.com/flyway/reference/commands/validate).
5. Chạy kiểm thử constraint, giao dịch, repository/API và truy vấn liên quan. Kiểm tra migration chạy lại không tạo bản ghi lặp hoặc thay đổi đã áp dụng.
6. PR ghi version, nội dung, tác động, thời gian/khóa bảng dự kiến, bằng chứng kiểm thử và cách phục hồi. Áp dụng qua quy trình phát hành phù hợp khi được giao sprint đó; lưu kết quả vào hồ sơ sprint.

## 7. Khi migration lỗi hoặc cần đổi schema đang có dữ liệu

MySQL DDL thường gây implicit commit. Atomic DDL của InnoDB bảo vệ một thao tác DDL khi lỗi/sự cố, **không** biến chuỗi nhiều DDL thành transaction có thể `ROLLBACK` toàn bộ. Không hứa rằng Flyway thất bại giữa file sẽ tự trả schema về trạng thái ban đầu. [MySQL implicit commit](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html), [MySQL atomic DDL](https://dev.mysql.com/doc/refman/8.4/en/atomic-ddl.html).

- Khi thất bại: dừng bước triển khai tiếp theo, lưu log, kiểm kê thay đổi đã áp dụng, đối chiếu history và trạng thái thật. Không tự chạy lại mù, xóa bảng, đổi checksum hoặc chạy `repair` để làm build xanh.
- Ưu tiên migration mới sửa tiếp về trước sau khi xác định trạng thái. Nếu trạng thái schema/history không cho migrate tiếp, lập phương án xử lý rõ ràng, review trước khi cập nhật history; `repair` không tự sửa dữ liệu/schema. Nếu cần phục hồi, dùng backup đã thử restore và kế hoạch khôi phục tương ứng.
- Đổi tên/xóa cột dùng **expand–contract**: thêm cấu trúc tương thích → ứng dụng ghi/đọc chuyển tiếp → backfill chia lô, có checkpoint → đối soát số liệu → chuyển đọc → chỉ xóa cấu trúc cũ ở lần phát hành sau khi hết cửa sổ quay lại ứng dụng cũ.
- Thêm `NOT NULL`/unique vào dữ liệu hiện có phải phát hiện NULL/trùng trước, có quy tắc sửa dữ liệu được duyệt. Tách DDL khỏi backfill lớn; đánh giá metadata lock và dung lượng index trên dữ liệu gần thực tế.
- Không dùng `clean`, `baseline` hoặc `repair` như bước cài đặt thường ngày. DB local dùng thử có thể tạo lại bằng môi trường tách biệt, nhưng không dùng tài khoản/quy trình đó cho DB dùng chung.

## 8. Bộ kiểm thử và điều kiện nghiệm thu theo sprint

| Nhóm kiểm tra | Bằng chứng cần lưu |
| --- | --- |
| DB trống | MySQL container mới → toàn bộ migrations đến sprint hiện tại → Flyway validate → JPA validate → API smoke test |
| Nâng cấp | Schema release/sprint trước + fixture hợp lệ có lịch sử NG/bug → migrate → dữ liệu và revision cũ giữ nguyên, bản ghi mới đúng |
| Chạy lại | Migrate lần hai không áp dụng lại version cũ; dữ liệu tham chiếu không bị lặp |
| History/checksum | Bản sao môi trường test phát hiện file đã áp dụng bị đổi; không chạy test phá checksum trên DB dùng chung |
| Phân tách dự án | API từ chối đọc/ghi trái quyền; composite FK từ chối gắn bug P1 vào attempt P2, member sai P, revision sai case |
| Trùng và cạnh tranh | Gửi lặp request không tạo hai bug/attempt; hai người retest đồng thời không ghi đè, không đóng lỗi thiếu điều kiện |
| Traceability | NG ban đầu còn nguyên; targeted verification PASS không đổi latest fullcase NG; fullcase OK có đúng build/actor/revision; N:N không làm tăng count sai |
| Coverage retest | Nhiều request/cấu hình cộng đủ coverage đã duyệt; thiếu iOS không dùng Android thay; không dùng kết quả cũ đã bị FAIL mới/reopen thay thế; miễn trừ có người duyệt |
| Nguồn trạng thái ngoài | Q01 external authoritative: local verified hiển thị pending closure tới acknowledgment hợp lệ; timeout/retry/stale acknowledgment không đóng sai |
| Bằng chứng | Staging chưa owner có TTL; một blob dùng nhiều link không mất provenance; gỡ một link không mất tệp đang dùng; quyền tải không rộng hơn visibility |
| Hiệu năng | Phân trang có thứ tự ổn định, không N+1; EXPLAIN các query danh sách, board, report có kích thước fixture đã ghi |
| Phục hồi | Trước release có dữ liệu thật: backup/restore rehearsal, đối soát version/checksum và dữ liệu quan trọng |

Một sprint có DB change chỉ được đánh dấu xong khi migration, mapping JPA, constraints, API contract và kiểm thử liên quan cùng khớp. Không đánh dấu xong chỉ vì migration chạy thành công.

## 9. Điểm cần quyết định và giới hạn tích hợp

- Chốt catalog trạng thái, transition, lý do đóng, loại công việc, độ ưu tiên và ai được xác nhận phía khách hàng; không tự bổ sung hai trạng thái chỉ để đủ con số 12.
- Chốt việc ghi một bug độc lập có bắt buộc liên kết test case hay cho phép lý do ngoại lệ; riêng bug phát sinh từ test run phải giữ link tới attempt nguồn.
- Chốt quy tắc đóng bug có nhiều testcase/thiết bị, quyền miễn retest và bằng chứng bắt buộc. Đây là đầu vào của S06–S07, không tự giải quyết bằng cập nhật SQL hàng loạt.
- **Redmine là quyết định bắt buộc trước pilot thực tế:** hoặc hệ thống nội bộ được chấp nhận là nơi ghi nhận chính, hoặc phải có quy trình liên kết/đồng bộ Redmine đạt yêu cầu khách hàng. Adapter tự động S09 là có điều kiện; yêu cầu mọi bug lên Redmine không được âm thầm bỏ qua khi adapter chưa làm.
- Nếu dùng adapter: ghi thay đổi local và outbox trong cùng transaction; worker gửi sau, retry có giới hạn, dedupe và đối soát khi HTTP timeout không rõ kết quả. Không giả định remote hỗ trợ idempotency; nếu chưa xác định ticket đã tạo hay chưa thì đưa vào đối soát, tránh retry tạo trùng. Local commit và Redmine không phải một transaction ACID chung; hiển thị trạng thái đang chờ/lỗi đồng bộ. Khi external là nguồn chính, local verified không đồng nghĩa workflow khách hàng đã closed; chỉ acknowledgment hợp lệ mới cập nhật authoritative status.
- Slack/Notion và dịch AI không mặc định là phần triển khai bắt buộc của các sprint đầu. Lưu reference xác nhận và xuất báo cáo là bước có thể đáp ứng trước; không lưu/call dịch vụ ngoài khi chưa có lựa chọn tích hợp cụ thể.

Các quyết định còn mở phải ghi vào task tương ứng và được chốt trước task phụ thuộc. Chỉ triển khai phần schema của sprint người dùng yêu cầu; không tạo trước toàn bộ bảng trong tài liệu này.

## S08 thực thi ngày 30/09/2026

V9 (`V9__create_cycle_decisions.sql`) thêm run_scope_decisions/cycle_decisions, con trỏ quyết định NA cùng project/run, CLOSED và index attempt theo build. Tổng 52 bảng ứng dụng; V1–V9 đã áp dụng local và bất biến. Báo cáo dùng transaction snapshot trực tiếp, không tạo report_snapshots/export_jobs vì mẫu nội bộ xuất đồng bộ có cap. Chi tiết [schema thực tế](../database/README.md) và [metrics](../business/metrics.md).

## S09 thực thi ngày 30/09/2026

V10 thêm redmine_bindings/redmine_outbox/redmine_delivery_attempts, tổng 55 bảng ứng dụng. Mapping/credentials ở máy chủ; binding chỉ lưu routing snapshot không secret. Unique một job hoạt động, FK cùng project, create fence, lease và nhật ký actor/reason. V1–V10 local đã áp dụng, không sửa checksum. Xem [vận hành](../operations/integration.md) và [ADR-009](../decisions/ADR-009-redmine-sandbox.md).
