# Review độ phức tạp database và cải tiến lưu lịch sử

## Kết luận

**Database hiện tại hơi nặng cho ứng dụng quản lý bug đơn giản, nhưng không có bằng chứng rằng phần lớn 56 bảng là thừa với phạm vi TMS đã chốt.** Số lượng bảng không chứng minh thiết kế tối ưu, cũng không đủ để kết luận hệ thống chậm. Có chỗ lưu dư thực sự trong JSON lịch sử; đã sửa đường ghi mới thay vì gộp/xóa bảng hàng loạt.

Phân loại của lần tự review này: **53 bảng có lý do giữ trong mô hình hiện tại; 1 bảng diagnostic có thể loại khỏi runtime về sau; 1 bảng trạng thái 1–1 có thể gộp; 1 bảng policy cần làm rõ vai trò**. Đây là đánh giá trách nhiệm, không phải cam kết tối thiểu phải có đúng 53 bảng. Cả ba ứng viên vẫn được dùng qua code/FK; không có bảng được xác định an toàn để DROP ngay.

Nguồn: code FE/BE hiện hành, 11 migration V1–V11, [metadata schema](../database/erd/schema.json), [census có đường dẫn và dòng code cho từng bảng](database-usage-audit.json), [ảnh ERD](../database/erd/images/README.md). Schema có 514 cột, 128 FK (97 FK ghép) và 249 index: 56 PRIMARY, 69 unique phụ, 124 non-unique. Quét theo thứ tự tên cột chưa thấy hai index giống hoàn toàn hoặc non-unique index là tiền tố của index khác. Điều đó **không chứng nhận mọi index đều tối ưu**; metadata hiện chưa đủ loại index, prefix length, chiều sắp xếp và số liệu truy vấn để tự động xóa index.

Giới hạn môi trường ngày 03/10: `.env.mysql.local` chưa tồn tại; native server có listener 3307, nguồn cũ 3310 và backend 8080 không có listener lúc kiểm tra. Không thử đoán/reset mật khẩu, không khởi động thêm container. Metadata schema được xuất lúc 00:38 ngày 01/10/2026 giờ Việt Nam; số hàng tham khảo trong census lấy từ snapshot audit ngày 30/09. **Đây không phải lần đếm dung lượng hoặc kiểm tra dữ liệu live mới.**

## Phát hiện và hành động

| Mức | Phát hiện có bằng chứng | Hành động |
| --- | --- | --- |
| P2 — đã sửa | `WorkItemService.update` lấy toàn bộ GET detail rồi ghi vào `work_item_history.details_json.before`. Mỗi lần sửa lặp lại `links`, `externalReferences`, `clarifications`, `allowedTransitions`, `contextSnapshot` và các trường hiển thị. `after` lại lưu request thô, có thể khác giá trị đã trim thực sự ghi vào SQL | Thêm `WorkItemChangeHistory`: allowlist trường mà thao tác UPDATE có thể sửa; trước/sau giữ giá trị null, version và dữ liệu đã chuẩn hóa. TASK không ghi các trường bug không được SQL cập nhật. Gắn `formatVersion:2`; giữ nguyên dữ liệu lịch sử cũ và các event khác |
| P2 — đính chính review cũ | `application_info` còn là dòng khóa `SELECT ... FOR UPDATE` tại `IdentityService.bootstrap`, đảm bảo kiểm tra/tạo Admin đầu tiên được tuần tự hóa | Giữ bảng. Sửa nhận định cũ rằng đây chỉ là thông tin nhận diện có thể bỏ cùng diagnostic. Bỏ bảng phải thay cơ chế bootstrap và kiểm tra race trước |
| P2 — ứng viên loại bỏ | `foundation_checks` chỉ phục vụ lưu phép thử ghi DB ở profile local, không có nghiệp vụ dự án | Có thể ngừng endpoint ghi diagnostic và loại bảng bằng migration sau khi kiểm tra native fresh/upgrade. Không xóa các dòng/bảng trong phiên review; `Check-System.ps1` vốn kiểm tra chỉ đọc |
| P2 — tăng dữ liệu theo thời gian | Excel preview hết hạn sau 24 giờ, nhưng `getImportPreview` chỉ trả nhãn EXPIRED, không dọn `import_rows.raw_data_json`. Preview đã COMMITTED còn được dùng để trả retry cùng checksum | Cần chính sách lưu giữ riêng cho preview lỗi/hết hạn và các batch đã commit. Chưa tự xóa vì 24 giờ là hạn commit, không phải thời hạn xóa đã được người dùng chốt |
| P2 — vai trò chưa rõ | `work_item_policy_versions` có catalog `INTERNAL_V1`, FK của bug tham chiếu mã. `definition_json` không được Java đọc để thực thi; còn `rule_versions` theo dự án được `RuleService` đọc/validate thật | Giữ FK lịch sử; ghi rõ `definition_json` là mô tả policy nền ADR-006, không phải runtime rule engine. Cờ `closureEnabled:false` trong mô tả V7 không quyết định closure S07 hiện nay. Không sửa trực tiếp migration cũ hoặc hợp nhất hai phạm vi rule khi chưa có thiết kế chuyển tiếp |
| P3 — có thể gộp, lợi ích nhỏ | `bug_retest_state` gồm project/bug ID, vòng retest và current coverage, quan hệ 1–1 | Có thể gộp thuộc tính vào `bug_details`, giảm đúng một bảng. Phải đổi FK, backfill và kiểm tra retest/report/cycle. Hiện bảng là nguồn trạng thái retest, không phải bản sao đồng thời của cùng thuộc tính trong bug_details |

Code cho phần đã sửa: [WorkItemService](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemService.java), [WorkItemChangeHistory](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemChangeHistory.java), [kiểm thử hành vi](../../Backend/src/test/java/vn/syp/tms/workitem/WorkItemHistoryTest.java). Trường actor/time/reason/fromStatus/toStatus của event giữ nguyên. Frontend hiển thị các trường event đó, không phụ thuộc bản GET detail lồng trong `details_json`.

Không chạy UPDATE/DELETE để thu gọn JSON cũ; vì vậy cải tiến làm giảm phần lặp ở **các lần sửa tiếp theo sau khi chạy bản backend mới**, chưa làm giảm kích thước dữ liệu đang lưu. Chưa đo phần trăm tiết kiệm hoặc tốc độ trên dữ liệu thật.

## Giải thích từng bảng

“Giữ” nghĩa là đang có trách nhiệm và phụ thuộc cụ thể, không đồng nghĩa mọi cột/index đã hoàn hảo. Các đường dẫn/dòng tham chiếu runtime, FK vào/ra, index và số hàng snapshot của **từng bảng** nằm trong [census JSON](database-usage-audit.json). Tìm tên bảng bằng Ctrl+F.

### 1. Danh tính và đăng nhập — 6 bảng

Code: [IdentityService](../../Backend/src/main/java/vn/syp/tms/identity/IdentityService.java), [LoginThrottle](../../Backend/src/main/java/vn/syp/tms/identity/LoginThrottle.java), [cấu hình Spring Session](../../Backend/src/main/resources/application.yml).

| Bảng | Kết luận và lý do |
| --- | --- |
| `identity_users` | Giữ: tài khoản, hash mật khẩu, quyền tạo tài khoản riêng của PM và version |
| `identity_roles` | Giữ: catalog ADMIN/PM/TESTER, FK bảo vệ role của user; ít hàng và không có SELECT trực tiếp không phải thừa |
| `identity_audit` | Giữ: ai tạo/vô hiệu hóa tài khoản/cấp quyền; không phải lịch sử sửa bug |
| `identity_login_buckets` | Giữ: giới hạn thử đăng nhập theo username/IP qua restart; có dọn bucket hết hạn trong LoginThrottle |
| `SPRING_SESSION` | Giữ: phiên đăng nhập; vô hiệu tài khoản phải hủy phiên; Spring Session dọn expiry |
| `SPRING_SESSION_ATTRIBUTES` | Giữ: Spring Session JDBC tự quản lý thuộc tính phiên; không có tên bảng trong Java nghiệp vụ là bình thường |

### 2. Dự án và cấu hình — 13 bảng

Code: [ProjectService](../../Backend/src/main/java/vn/syp/tms/project/ProjectService.java), [CatalogService](../../Backend/src/main/java/vn/syp/tms/catalog/CatalogService.java), [RuleService](../../Backend/src/main/java/vn/syp/tms/rules/RuleService.java), [HandbookService](../../Backend/src/main/java/vn/syp/tms/handbook/HandbookService.java).

| Bảng | Kết luận và lý do |
| --- | --- |
| `projects` | Giữ: dự án, timezone, archive và khóa giao dịch theo dự án |
| `project_memberships` | Giữ: user tham gia nhiều dự án với vai trò khác nhau; role toàn hệ thống không thay thế quyền PM dự án |
| `environments` | Giữ: môi trường test, không cùng thực thể với thiết bị hoặc bản build |
| `builds` | Giữ: bản phần mềm xảy ra lỗi/bản đã sửa; dùng trong lịch sử chạy và đóng lỗi |
| `devices` | Giữ: thiết bị/OS/model; phạm vi một case trên nhiều thiết bị cần ID riêng |
| `categories` | Giữ: phân loại công việc, có archive/active và FK theo dự án |
| `milestones` | Giữ: mốc phát hành/ngày hạn, dùng cho cycle và work item; khác bản build cụ thể |
| `rulesets` | Giữ: danh tính bộ rule và con trỏ phiên bản đang công bố |
| `rule_versions` | Giữ: nội dung/bản công bố mà bug đã áp dụng; sửa rule mới không đổi lịch sử bug cũ |
| `project_resources` | Giữ: danh tính sổ tay/tài liệu, loại và tiêu đề |
| `resource_revisions` | Giữ: các lần sửa nội dung sổ tay và người sửa; khác bản hiện hành |
| `project_counters` | Giữ: cấp số công việc theo dự án dưới khóa; không lấy MAX(id)+1 khi nhiều người tạo |
| `project_audit` | Giữ: nhật ký tổng hợp metadata các thao tác trong dự án, không lưu lại toàn bộ nội dung mỗi domain. Nhiều hàng demo chưa chứng minh chiếm nhiều dung lượng |

### 3. Test case và Excel — 5 bảng

Code: [TestCaseService](../../Backend/src/main/java/vn/syp/tms/testcase/TestCaseService.java), [mapping JPA](../../Backend/src/main/java/vn/syp/tms/testcase/TestCaseEntities.java).

| Bảng | Kết luận và lý do |
| --- | --- |
| `test_suites` | Giữ: nhóm/cây test case; không lặp case theo mỗi màn hình |
| `test_cases` | Giữ: danh tính/mã case, nhóm và current revision |
| `test_case_revisions` | Giữ: nội dung và phê duyệt từng phiên bản; run ghim phiên bản để không bị đổi sau khi đã chạy |
| `import_batches` | Giữ: một phiên upload, checksum, người nhập, thống kê lỗi, TTL và trạng thái commit; cần cho retry |
| `import_rows` | Giữ: dữ liệu từng dòng để preview/validate/commit; cần chính sách retention, không gộp vào case chính khi chưa hợp lệ |

### 4. Thực thi — 9 bảng

Code: [ExecutionService](../../Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java), [CycleDecisionService](../../Backend/src/main/java/vn/syp/tms/cycle/CycleDecisionService.java), [V6](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql).

| Bảng | Kết luận và lý do |
| --- | --- |
| `test_cycles` | Giữ: đợt kiểm thử DRAFT/ACTIVE/CLOSED, quyền kích hoạt/chốt |
| `cycle_configurations` | Giữ: tổ hợp môi trường/thiết bị/build mặc định trong một đợt |
| `run_items` | Giữ: một case ở một cấu hình; đây là đơn vị tính tiến độ, không tăng khi chạy lại |
| `execution_attempts` | Giữ: từng lần chạy với actor/build/result/context; mất bảng này sẽ mất lịch sử chạy lại |
| `run_item_assignments` | Giữ: lịch sử giao/chuyển người chạy, khác assignee hiện tại trên run |
| `run_scope_decisions` | Giữ: PM loại/khôi phục phạm vi NA có lý do; không coi NA là kết quả Tester |
| `cycle_decisions` | Giữ: PM chốt/mở lại đợt và ghi nhận tồn đọng; không chỉ ghi đè trạng thái hiện tại |
| `cycle_statuses` | Giữ: catalog FK cho trạng thái đợt; mã dùng trong SQL/service dù không SELECT catalog |
| `execution_results` | Giữ: catalog FK OK/NG/P; Fix và NA không được lẫn vào kết quả này |

### 5. Công việc và bug — 10 bảng

Code: [WorkItemService](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemService.java), [EvidenceService](../../Backend/src/main/java/vn/syp/tms/attachment/EvidenceService.java), [V7](../../Backend/src/main/resources/db/migration/V7__create_work_items.sql).

| Bảng | Kết luận và lý do |
| --- | --- |
| `work_items` | Giữ: một nguồn chung cho Board/Danh sách/Quản lý lỗi, không có bảng riêng mỗi màn |
| `bug_details` | Giữ: subtype chỉ BUG có steps/expected/actual/context; không ép TASK/REQUEST có trường lỗi |
| `work_item_execution_links` | Giữ: một bug liên quan nhiều lần NG, mỗi lần NG có thể liên quan nhiều bug |
| `work_item_comments` | Giữ: trao đổi có tác giả, thời điểm, quyền; không phải thay đổi cấu trúc của ticket |
| `work_item_attachments` | Giữ: metadata chứng cứ, owner/hash/MIME/size; nội dung tệp lưu bên ngoài MySQL |
| `work_item_history` | Giữ, đã giảm dữ liệu lặp: event thay đổi nội dung/trạng thái, actor/reason và before/after |
| `work_item_clarifications` | Giữ: kết luận làm rõ có nguồn/người xác nhận/thời điểm; comment tự do không thay thế. Có API đọc/ghi dù snapshot đang 0 hàng |
| `work_item_external_references` | Giữ: liên kết nhập thủ công chưa đối soát, hỗ trợ tracker khác. RedmineService chặn gửi tự động khi đã có reference Redmine thủ công để tránh trùng |
| `work_item_statuses` | Giữ: 10 trạng thái, nhãn/màu/thứ tự/terminal dùng chung, không tạo bảng cho mỗi trạng thái |
| `work_item_policy_versions` | Xem lại mô tả policy: FK/version nền còn cần, nhưng JSON mô tả không phải bộ máy thực thi rule; chưa có lý do hợp nhất vội vào rule dự án |

### 6. Retest và đóng lỗi — 7 bảng

Code: [RetestService](../../Backend/src/main/java/vn/syp/tms/retest/RetestService.java), [BugRetestLifecycle](../../Backend/src/main/java/vn/syp/tms/retest/BugRetestLifecycle.java), [ReportingService](../../Backend/src/main/java/vn/syp/tms/reporting/ReportingService.java).

| Bảng | Kết luận và lý do |
| --- | --- |
| `bug_retest_state` | Có thể gộp 1–1 vào bug_details; hiện là nguồn vòng retest/current coverage, không thừa dữ liệu đồng thời |
| `bug_coverage_revisions` | Giữ: từng lần PM chốt phạm vi/build; chỉnh scope không làm kết quả cũ đủ điều kiện đóng |
| `bug_coverage_items` | Giữ: từng run bắt buộc trong phạm vi; không phải danh sách đã giao cho một Tester |
| `retest_requests` | Giữ: lần yêu cầu kiểm tra lại với build, scope BUG_ONLY/FULL_CASE, assignee và trạng thái gửi |
| `retest_request_items` | Giữ: tập con coverage được giao trong request; hỗ trợ chia phạm vi và FK chính xác |
| `bug_verification_attempts` | Giữ: kết quả kiểm lại từng mục, actor/evidence; BUG_ONLY không được biến thành OK của cả case |
| `bug_closure_decisions` | Giữ: PM quyết định đóng/mở lại với lý do/nguồn/chứng cứ; Tester PASS không tự thay quyền PM |

### 7. Redmine — 3 bảng

Code: [RedmineService](../../Backend/src/main/java/vn/syp/tms/integration/RedmineService.java), [RedmineWorker](../../Backend/src/main/java/vn/syp/tms/integration/RedmineWorker.java).

| Bảng | Kết luận và lý do |
| --- | --- |
| `redmine_bindings` | Giữ: một liên kết quản lý giữa bug và ticket tracker, marker và snapshot đã gửi/quan sát |
| `redmine_outbox` | Giữ: công việc gửi API có payload/idempotency/lease/retry; tách khỏi HTTP request người dùng |
| `redmine_delivery_attempts` | Giữ: kết quả từng lần gửi/đối soát, hỗ trợ điều tra lỗi; trạng thái outbox hiện tại không giữ đủ lịch sử |

### 8. Nền tảng — 3 bảng

Code: [FoundationService](../../Backend/src/main/java/vn/syp/tms/foundation/FoundationService.java), [IdentityService.bootstrap](../../Backend/src/main/java/vn/syp/tms/identity/IdentityService.java), [cấu hình Flyway](../../Backend/src/main/resources/application.yml).

| Bảng | Kết luận và lý do |
| --- | --- |
| `application_info` | Giữ: thông tin cài đặt và dòng khóa bootstrap Admin; đính chính đánh giá cũ |
| `foundation_checks` | Ứng viên loại khỏi runtime: chỉ phép thử ghi kỹ thuật, không cần cho nghiệp vụ; chưa DROP |
| `flyway_schema_history` | Giữ: Flyway quản lý version/checksum; ứng dụng không tự sửa/xóa |

## Những trường nhìn giống nhau nhưng không nên xóa ngay

- `project_id` xuất hiện ở nhiều bảng để FK ghép ngăn tham chiếu sang dự án khác. Unique `(project_id,id)` có thể nhìn dư so với PK `id`, nhưng còn là khóa đích của FK và hỗ trợ truy vấn theo dự án.
- Con trỏ `current_revision_id`, `latest_attempt_id`, `current_coverage_id` chọn đúng phiên bản/kết quả hiện hành; không phải một bản nội dung thứ hai.
- Context snapshot cố ý giữ tên build/thiết bị/môi trường lúc chạy, vì catalog có thể được đổi tên. Khác với việc sao chép lại snapshot đó ở mọi lần sửa tiêu đề ticket, đã được loại bỏ trong bản sửa này.
- Có `project_audit` lẫn history domain vì cái đầu là chỉ mục sự kiện chung với payload rất nhỏ, cái sau có ngữ nghĩa before/after hoặc quyết định riêng. Không thay tất cả bằng một bảng `entity_type/entity_id/JSON` rồi mất FK và quyền domain.
- Không có bảng dashboard/Kanban/report hoặc database riêng theo sprint. Excel xuất từ dữ liệu nguồn; không lưu thêm toàn bộ báo cáo thành nguồn sự thật thứ hai.

## Kiểm chứng và việc còn lại

- ECC `coding-standards`: trách nhiệm từng bảng/cột, so sánh query thực tế với thiết kế.
- ECC `security-review`: giữ project FK, phiên đăng nhập, quyền PM/Admin và lịch sử; không xuất credential hoặc dữ liệu hàng mới.
- ECC `tdd-workflow`: `WorkItemHistoryTest` ban đầu 3 test, 2 FAIL đúng lỗi lặp context và lưu bug fields cho TASK; sau sửa 3/3 PASS. Test stale version không ghi history/audit.
- ECC `verification-loop`: Maven verify chọn `WorkItemHistoryTest` PASS, compile toàn bộ main/test và đóng gói JAR thành công. JaCoCo lớp mới WorkItemChangeHistory: 19/19 dòng, 6/6 nhánh, 2/2 method, 145/145 instruction. Đây là coverage phần mới, **không phải coverage toàn WorkItemService hoặc toàn backend**.
- Chạy kiểm tra bằng JDK 21: đặt JAVA_HOME trong terminal rồi `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests WorkItemHistoryTest`.
- Census tái lập: `rtk proxy node scripts/Review-DatabaseUsage.cjs`; đầu ra không kết nối MySQL, không đánh nhãn “không dùng” chỉ vì thiếu chuỗi tên bảng trong Java.
- Không thay FE/schema/migration. Chưa chạy lại MySQL integration/E2E/runtime vì nguồn cũ chưa chạy và chưa có credential/config native; không dùng 178 tests của lần trước làm bằng chứng cho thay đổi hôm nay.
- Chưa đo byte lưu thực tế, EXPLAIN/load mới, retention hoặc fresh/upgrade cho một migration tinh gọn. Chưa commit/push/deploy.

Ưu tiên tiếp theo: hoàn tất kết nối native theo [hướng dẫn Workbench](../database/mysql-workbench.md), đo kích thước/index/query thực tế; chốt retention cho staging/log; sau đó mới quyết định có đáng bỏ foundation_checks hoặc gộp trạng thái retest. Không đặt mục tiêu giảm tùy ý từ 56 xuống 20–30 bảng mà cắt mất nghiệp vụ đã chốt.
