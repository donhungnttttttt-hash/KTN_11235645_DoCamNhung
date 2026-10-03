# Review database và chuyển hướng MySQL native

**Đính chính 03/10:** review sâu theo code phát hiện application_info còn là khóa bootstrap Admin, phải giữ. [Review mới](2026-10-03-database-complexity.md) giải thích 56 bảng và sửa phần JSON lặp trong history; metadata ở tài liệu này vẫn là snapshot ngày 01/10, không phải số liệu live ngày 03/10.

## Kết luận

Ứng dụng TMS dùng **một database/schema `tms`**, không chia database theo sprint, dự án, màn hình hoặc người dùng. Database này có **56 bảng, 514 cột và 128 constraint FK** theo metadata đọc trực tiếp ngày 01/10/2026. Các MySQL phục vụ bài thử/Redmine là môi trường riêng, không phải database nghiệp vụ khác của TMS.

Thiết kế hiện tại tương đối nặng cho bản nội bộ, nhưng không có cơ sở xóa hàng loạt bảng. Phần lớn độ phức tạp đến từ yêu cầu đã chốt: giữ revision, lần chạy, actor/build, kiểm thử lại đủ phạm vi và quyết định đóng lỗi. Vấn đề rõ nhất là tài liệu lịch sử lẫn với schema hiện hành và cách chạy bị buộc vào Docker; hai phần này được sửa trong lần review.

## Phát hiện và xử lý

| Mức | Phát hiện có bằng chứng | Xử lý |
| --- | --- | --- |
| P1 vận hành | Start-Backend trước đây đọc `.env` rồi cố định 3310/tms; README yêu cầu Docker. Máy có MySQL Windows ở 3307 nên mở Workbench cổng 3306 không thấy TMS | Thêm native initializer, `.env.mysql.local`, native mặc định, đường cũ phải chọn `-LegacyDocker`; không âm thầm đổi DB |
| P2 tài liệu | system-design còn nói S03/S09 chưa xong, cần thêm bảng S07 đã có và migration kế tiếp V11 dù đã áp dụng | Cập nhật theo V11; ERD/metadata lấy từ schema thực tế |
| P2 độ phức tạp | `foundation_checks` phục vụ diagnostic. Đính chính 03/10: `application_info` một dòng còn là khóa transaction của IdentityService.bootstrap | Chỉ foundation_checks là ứng viên loại bỏ sau migration/test riêng. Giữ application_info và cơ chế bootstrap; hiện giữ V1 và dữ liệu |
| P2 độ phức tạp | `bug_retest_state` chỉ giữ vòng/current coverage, quan hệ 1:1 với bug | Có thể đưa thuộc tính vào bug_details, nhưng phải sửa retest/report/cycle, FK và backfill; chỉ giảm một bảng, chưa nên làm gấp |
| P2 mô hình | `work_item_policy_versions` global một policy và `rule_versions` theo dự án cùng được bug tham chiếu | Phạm vi khác nhau: policy nền cố định và bản quy tắc dự án. Có thể hợp nhất sau khi thiết kế scope/version/fallback, không đổi FK ngay hoặc áp rule khách tự suy |
| P2 ràng buộc | Unique build có build_number nullable ở DB | CatalogService đã chặn trùng bằng COALESCE dưới khóa dự án. Không phải lỗi API chưa sửa; DB vẫn cho nhiều NULL nếu ghi ngoài API. Cân nhắc unique normalized key sau rà dữ liệu |
| P2 môi trường | Workbench 8.0 và server Windows 9.7 chưa được kiểm thử cùng toàn ứng dụng; regression trước dùng MySQL 8.4.8 | Ghi giới hạn phiên bản, cung cấp Reverse Engineer live và DDL/ERD offline; chưa xác nhận cutover khi thiếu root credential |

## Các bảng cần giữ

- Case/revision: một danh tính, nhiều bản nội dung/phê duyệt; không ghi đè lịch sử.
- Run item/attempt: phạm vi case/cấu hình khác các lần chạy; tránh đếm retest thành case mới.
- Coverage/request/verification/closure: phạm vi PM chốt khác việc được giao, kết quả Tester và quyết định PM. Gộp sẽ gây nhiều NULL, lặp dữ liệu hoặc mất ràng buộc phiên bản.
- work_items/bug_details: Board/List/Quản lý lỗi chung ID; subtype BUG không ép task/yêu cầu có trường lỗi giả.
- import_batches/import_rows: preview/validation trước commit, không nhập dòng Excel lỗi vào case thật.
- identity_audit/project_audit/work_item_history: có phần metadata lặp nhưng quyền, nội dung và vòng đời khác nhau; không thay FK domain bằng một audit JSON đa hình.
- redmine_bindings/outbox/delivery_attempts: cần cho idempotency, retry và đối chiếu đã triển khai. Native/demo có thể tắt worker; không cần xóa schema.

work_item_clarifications và work_item_external_references có API đọc/ghi dù đang ít/không có hàng. **Ít dữ liệu không đồng nghĩa bảng thừa.** Không seed lịch sử/session/outbox giả để làm database trông đầy.

## Nhóm bảng

| Nhóm | Số bảng |
| --- | ---: |
| Danh tính, đăng nhập và audit danh tính | 6 |
| Dự án, cấu hình, rule/sổ tay, counter/audit | 13 |
| Thư viện test case và nhập Excel | 5 |
| Đợt kiểm thử, scope, lần chạy và quyết định | 9 |
| Công việc, bug, bình luận, chứng cứ và lịch sử | 10 |
| Retest và đóng lỗi | 7 |
| Tích hợp Redmine | 3 |
| Nền tảng và Flyway | 3 |
| **Tổng** | **56** |

Mỗi bảng được phân loại đúng một lần. Không có bảng riêng cho dashboard, Kanban hoặc từng sprint. Xem [sơ đồ tương tác](../database/erd/index.html), [SVG](../database/erd/core.svg), [Mermaid đầy đủ](../database/erd/full-schema.mmd), [DDL](../database/erd/schema-only.sql), [metadata](../database/erd/schema.json).

## Đã làm và chưa làm

Đã đối chiếu service MySQL97/config/cổng 3307, Workbench đã cài; server từ chối root không mật khẩu. Đã xuất metadata và backup từ database cũ, không tạo thêm container/DB thử. Có công cụ native và [hướng dẫn Workbench từng bước](../database/mysql-workbench.md).

**Chưa đăng nhập quản trị server 3307, tạo/restore tms trên đó hoặc chuyển backend sang 3307.** Không đọc vault, reset root hay suy mật khẩu website là mật khẩu MySQL. Backend/dữ liệu hiện hành vẫn ở server cũ cho tới khi bước chuyển được xác minh.

Runtime Java/React/Flyway có đường chạy không Docker. Testcontainers, diễn tập container và Redmine sandbox vẫn giữ; chưa loại Docker khỏi mọi bài test. Không chạy integration test lên database đang sử dụng.

ECC: security-review (credential, quyền, từ chối overwrite), tdd-workflow (native client fail-closed), verification-loop (schema/backup/tests/diagram/syntax/docs). Kiểm tra cụ thể ghi bên dưới; không lấy 178 BE/181 FE của lần trước làm bằng chứng MySQL Windows 9.7.

## Bằng chứng kiểm tra lần này

| Kiểm tra | Kết quả và giới hạn |
| --- | --- |
| TDD native client | Ban đầu RED thiếu module; sau implementation 6 unit tests PASS: host/port/schema, password không vào args, lỗi không lộ bí mật, missing config không fallback Docker |
| Đọc schema thật | 1 integration read PASS bằng mysql.exe Windows qua TCP và đường đọc nguồn cũ; helper coverage line 100%, branch 88,46%, function 100% trên 7 tests |
| PowerShell | 4 script parse PASS; gặp lỗi .NET Framework thiếu StandardInputEncoding, sửa ghi byte UTF-8 rồi kiểm tra đọc schema/tiếng Việt PASS. Chỉ đọc nguồn MySQL 8.4 ở 3310, chưa chạy provisioning 3307 |
| Backup | mysqldump Windows qua TCP xuất đủ 56 CREATE TABLE, giữ chữ Việt, không DROP TABLE hoặc INSERT session; SHA-256 khớp. Restore vào 3307 chưa chạy |
| Audit nguồn | 56 bảng, 128 FK, 6 điều kiện domain, không vi phạm; số hàng vận hành có thể đổi theo session/audit |
| ERD | Metadata/nhóm khớp đủ 56 bảng; browser mở sơ đồ, chọn run_items thấy FK composite, tìm redmine trả đúng 3 bảng; xuất SVG/ảnh xem trước |
| Contract/docs/diff | 104 operations, 50 tài liệu được kiểm tra local links; git diff --check PASS |
| Bí mật và dữ liệu nguồn | Quét 1.763 file không thấy giá trị secret local đã biết; config/backup native được Git ignore. Backend nguồn vẫn UP, MySQL 8.4.8/Flyway V11, dữ liệu không bị chuyển/xóa ngầm |
| Build/FE/BE regression | Không đổi FE/BE nghiệp vụ hoặc migration trong lần này nên không lặp full suite; kết quả cũ chỉ là nền, không chứng nhận server native mới |

Chưa commit/push/merge, chưa gỡ môi trường cũ và chưa thay đổi schema nghiệp vụ. Gói S11 trước đó là snapshot trước các helper native mới, không giả là đã đóng gói lại/kiểm thử chúng trên 3307.

## Bổ sung: ảnh ERD theo mẫu người dùng

Theo yêu cầu tiếp theo ngày 01/10, đầu ra chuyển sang **ảnh tĩnh**, không dùng trang web làm kết quả bàn giao: [PNG tổng thể](../database/erd/images/00-toan-bo-56-bang.png), [8 nhóm chi tiết và chú thích](../database/erd/images/README.md), [bộ ZIP](../database/erd/tms-database-images-v11.zip). Mỗi bảng trong nhóm hiển thị đủ cột, kiểu MySQL, PK/FK/NULL; bảng ngoài nhóm chỉ hiển thị khóa tham chiếu trên nền xám. Tổng thể có đầy đủ 56 bảng, 514 cột và 128 đường FK; khóa ghép được giữ trong CSV và tooltip SVG.

56 bảng là tương đối nhiều cho ứng dụng chỉ tạo/sửa bug, nhưng không bất thường với TMS hiện có phiên bản test case, lịch sử chạy, retest, audit và outbox. Đây là đánh giá theo phạm vi, không phải ngưỡng chuẩn hay kết luận mọi bảng đều cần giữ. Các đề xuất tối giản ở trên vẫn là đề xuất, chưa tạo migration gộp/xóa bảng.

ECC verification-loop cho đầu ra tài liệu: kiểm tra chính xác 56 node bảng, 514 tên cột/kiểu dữ liệu trong SVG, 128 đường FK, SHA-256 nguồn và 9 file PNG hợp lệ; tổng 8 nhóm khớp metadata. Kiểm tra hình ảnh để phát hiện chữ bị cắt và đầu nối bị che. Renderer sửa đầu nối cha sang mép phải bảng để ký hiệu cardinality không nằm dưới phần thân bảng. Graphviz WASM có một cảnh báo đo chiều rộng ký tự Unicode; PNG dùng font hệ thống, chữ Việt được kiểm tra trên ảnh. Không có cảnh báo layout khác.

Build/typecheck/FE/BE regression N/A cho bổ sung này vì chỉ thay công cụ xuất ảnh và tài liệu, không thay mã nghiệp vụ, migration hoặc dependency runtime. Công cụ vẽ cài riêng ở scratch; không thao tác database. Native cutover và các gate S11 giữ nguyên.
