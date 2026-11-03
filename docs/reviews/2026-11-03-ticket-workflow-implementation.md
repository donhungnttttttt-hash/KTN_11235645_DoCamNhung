# Triển khai Ticket Bug/QA — 03/11/2026

**DONE trong phạm vi đã duyệt.** Backend local 8080 đang chạy **V39, health UP**; frontend localhost:5173/127.0.0.1:5173 dùng source mới. Đã đăng nhập cả admin/admin2 và kiểm tra Ticket trên bản đang chạy. Giữ thay đổi identity/profile/avatar có sẵn trên system-design.

**Bàn giao source:** sau nghiệm thu, người dùng yêu cầu “thuc hien xong thi commit di”. Cho phép commit local trên `system-design`, gồm tài khoản hợp nhất, hồ sơ/avatar, Ticket và migration V37–V39 cùng tài liệu/kiểm thử liên quan; không push/merge. Các ghi chú “không commit/push” ở checkpoint trước mô tả giai đoạn triển khai. Áp dụng `verification-loop` để đối chiếu source với bằng chứng kiểm thử, kiểm tra file đưa vào Git và giữ cấu hình riêng, backup, log ngoài commit.

Kiểm tra trước commit: 226 file source/tài liệu/cấu hình mẫu; 781 file Backend/Frontend khớp bản đã kiểm thử, các bằng chứng cuối khớp SHA-256. Kiểm tra cấu trúc contract và `git diff --check` đạt; 12/12 test script backup, khởi tạo MySQL và bảo vệ database/build kiểm thử đạt. Không chạy lại bộ kiểm thử sản phẩm vì source không thay đổi sau kiểm chứng cuối.

Nguồn: [phân tích được duyệt](2026-11-03-ticket-workflow-analysis.md), [kế hoạch](../superpowers/plans/2026-11-03-ticket-workflow.md) và sơ đồ người dùng.

## Kết quả

- Mở rộng Issue hiện có, giữ mã/ID/liên kết/lịch sử.
- QA mặc định **Xác nhận spec**, chọn đầu mối; chuyển cùng ticket thành Bug hoặc đóng **Không được hỗ trợ**. Bug mặc định **Chưa xử lý**; được chọn trạng thái ban đầu khác theo quyền, đóng cần lý do.
- Bug **Đóng – Đã xử lý** vẫn chờ kiểm thử xác nhận; người xác nhận chốt **Đã sửa**, **Không thể tái hiện** hoặc mở lại. **Không xử lý** là quyết định riêng. Chín cột Kanban có nhãn tiếng Việt, tổng toàn bộ dữ liệu theo bộ lọc và phân trang từng cột.
- Form có điều kiện tiên quyết, bước thực hiện, kỳ vọng, thực tế, tần suất, môi trường, thiết bị, người nhận và version/ngày thực thi đã lưu tại đúng case. Nội dung được sửa; version nguồn do server lấy. Feature hiện tại hiển thị riêng với bằng chứng lúc phát hiện.
- Tiêu đề mới dùng [Đối tượng test][Tên file][No/ID case] và mô tả thêm. Tiền tố dài được rút gọn riêng bằng dấu …, có thông báo; dữ liệu nguồn/bằng chứng giữ đầy đủ. Bug monkey nhập thủ công, không có liên kết case giả.
- **Trách nhiệm Ticket** cho quản lý chỉ định đầu mối spec/điều phối Bug, gồm User thường. Không đổi loại tài khoản. User điều phối không tự có quyền sửa ưu tiên hoặc người xác nhận.
- Comment bên trái, dropdown xử lý/phân công bên phải; màn nhỏ xếp dọc. Comment và thay đổi lưu cùng giao dịch, có xác nhận, giữ nháp khi lỗi/xung đột. Bình luận thường giữ trạng thái/phân công; retry không nhân đôi lịch sử/thông báo.
- Chuông thông báo riêng của người nhận, kiểm quyền hiện tại; Guest/người ngoài không xem nội dung nội bộ. Không gửi email/Slack trong tác vụ.
- Báo cáo, Tổng quan Admin, ngữ cảnh AI và điều kiện lưu trữ dùng cùng định nghĩa hoàn tất/chờ xác nhận. Ticket không tự sửa kết quả OK/NG của case.

## Checklist

| Task | Kết quả |
| --- | --- |
| 1 — Backend/migration/API/quyền/snapshots/actions/notifications/metrics | DONE; review và bản sửa đã được kiểm lại |
| 2 — Form/chi tiết/comment/Kanban/trách nhiệm/thông báo frontend | DONE; kiểm thử hành vi và review |
| 3 — Tích hợp/Chrome/diễn tập/cập nhật local | DONE; review cuối sạch, V39/healthUP và main smoke đạt |

- [x] QA tạo đúng mặc định và quyền đầu mối; USER được chỉ định thao tác được.
- [x] QA chuyển Bug giữ ID/bình luận/lịch sử; cùng người giữ hai trách nhiệm vẫn chuyển được.
- [x] Worker xử lý, verifier chốt/mở lại; PROCESSED chưa phải kết thúc.
- [x] Các nhánh không tái hiện/không xử lý/QA không được hỗ trợ đúng quyền/loại.
- [x] Trạng thái khác mặc định khi tạo Bug dùng cùng policy server, kiểm lý do và mô tả.
- [x] Comment riêng giữ lựa chọn; comment kèm thay đổi nguyên tử, thử lỗi ghi thông báo chứng minh rollback.
- [x] Retry không trùng; xung đột giữ nháp và tải lại có chủ đích.
- [x] Nguồn case thay đổi lúc mở form được phát hiện; version lỗi cũ không đổi khi test lại.
- [x] Thu hồi trách nhiệm/thành viên có hiệu lực; tải lại đầu mối giữ nháp/chọn lại.
- [x] Quản lý khôi phục điều phối thiếu của Bug cũ khi chọn đúng người đang nhận; mở lại sau đó đúng đầu mối.
- [x] Thông báo riêng tư, liên kết đúng; Guest/người ngoài bị chặn.
- [x] Chín cột/tổng/bộ lọc/phân trang và vùng đối soát dữ liệu cũ.
- [x] Nguồn dài vẫn lưu được, không sửa nguồn để vừa tiêu đề.
- [x] Chrome 1440/768/390px, bàn phím, focus, nháp, lỗi và xác nhận trong các luồng đã nêu.
- [x] Cài mới core/demo và nâng V38→V39 giữ migration/dữ liệu/lịch sử.
- [x] Main đăng nhập, hồ sơ, Tổng quan, Ticket, thông báo và health đạt.

## Bằng chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Toàn bộ frontend cuối | **1.293/1.293**, 145 file, 266 giây; task-3-final-fix-full-frontend.log |
| Frontend sửa cuối | **59/59**, build 1.727 module thành công |
| Hồi quy backend liên quan | **87/87**, 0 lỗi/bỏ qua, build thành công; task-3-fix1-native-green.log |
| Backend sửa cuối | **14/14** nhóm Ticket, gồm ca khôi phục điều phối mới; chạy lại đúng source cuối **1/1**. Có trùng ca với nhóm87, không cộng thành102 ca khác nhau |
| Java/JDT | **374 file, 0 lỗi, 0 cảnh báo** |
| Chrome dữ liệu riêng | **43 kiểm tra**:34 luồng/nhánh/lỗi +6 trạng thái ban đầu/nhãn/tiêu đề +3 kiểm tra cuối;27 ảnh đã kiểm tra |
| Chrome/API main | **11 kiểm tra**, cả admin/admin2;3 ảnh;0 lỗi JavaScript;8 bảng ticket/case/trách nhiệm/thông báo không đổi trong smoke chỉ đọc |
| Backup có SQL view | 5 test script; backup/restore V39 thực tế bằng tài khoản chỉ đọc có SHOW VIEW đạt; view khôi phục độc lập schema nguồn |
| Migration gắn với build | 13 test từ chối artifact bị sửa/thêm/xóa; copy/main dùng resources/dependencies/helper/demo từ jar đã chốt hash |
| Contract/định dạng | OpenAPI fragment7 đường dẫn parse/local-reference, cấu trúc contract repository và git diff --check đạt; không phải validator đầy đủ OpenAPI |
| Review cuối | Hai Important đã sửa và re-review: tiền tố dài không lưu được; chọn cùng người nhận không khôi phục điều phối. **Không còn Critical/Important/Minor trong phạm vi review** |

Đã tái hiện trước sửa: deadlock khóa người nhận, SQL CHECK với NULL, monkey gắn lẫn case, chuyển QA cùng người nhận, quyền ưu tiên của User điều phối, bộ lọc cũ bị ẩn, đầu mối bị thu hồi, cảnh báo React, nhãn/tiền tố và hai lỗi review cuối. Assertion test sai được sửa theo quyền/hành vi đúng (403 cho người không được phân công;503 cho lỗi ghi giả lập), không nới quyền/tắt test để lấy PASS.

Coverage **có đo**, không suy từ số test:

- Ba file frontend sửa cuối: dòng99,19%, nhánh88,86%, hàm93%, câu lệnh92,78%; không phải toàn frontend.
- Snapshot Task2 trước bổ sung cuối:9 file Ticket/API, dòng90,90%, nhánh82,25%, hàm76,19%; không coi là coverage source cuối toàn phạm vi.
- Snapshot backend Task1: policy100% dòng/94,74% nhánh; commands100/71,82; responsibilities96,67/66,25; notifications100/66,67; FeatureIssueService92/65,92. Chưa đo lại toàn backend sau bổ sung trạng thái ban đầu; một số nhánh tích hợp trong snapshot dưới80%.

## Dữ liệu và runtime

Main V38 ban đầu có hai Feature Bug gắn case, open/progress. Dữ liệu lịch sử không rõ lý do đóng được thử riêng, giữ vùng đối soát, không suy diễn Đã sửa.

- **38 định nghĩa V1–V38 giữ nguyên SHA256**; chỉ thêm V39, giữ lịch sử Flyway cũ.
- Backup mới khi backend đã dừng ghi; khôi phục vào database riêng rồi nâng đúng bản đã chốt. **89 bảng cũ không gồm Flyway/session giữ nguyên dữ liệu ở các cột cũ**, cả bản sao và main sau migration.
- Backup local: var/mysql-native/backups/2026-11-03T03-11-41-549Z-tms.sql; bản diễn tập cuối: tms_ticketcopy_4d6a72038a8f. Backup/private config không vào Git.
- Backend main **PID21868**, 127.0.0.1:8080, V39/healthUP. Chỉ dừng backend đã đối chiếu chủ sở hữu; không dừng Chrome/MySQL/dịch vụ khác. Giữ tiến trình frontend5173.
- Main smoke giữ ticket76/77 và nguồn/lịch sử, đủ9 cột; admin/admin2 vào Tổng quan. Chỉ tạo phiên/nhật ký đăng nhập thông thường; không thêm/sửa ticket/case thử.
- Runtime test8087/5174 đã dừng; dùng Chrome riêng, không điều khiển desktop/Chrome cá nhân.

## Skill → việc dùng → bằng chứng

| Task | Skill | Việc dùng / bằng chứng |
| --- | --- | --- |
| Chuẩn bị | using-superpowers, brainstorming, writing-plans | Đọc quy trình, đối chiếu sơ đồ/source, chốt USER/duties, contract và task phụ thuộc |
| 1 | api-design, tdd-workflow, security-review | API/version/idempotency; RED→GREEN, quyền/rollback/concurrency;87 hồi quy cuối và review |
| 2 | frontend-patterns, tdd-workflow | Form/composer, hủy response cũ, giữ nháp/focus, count server; test hành vi/build |
| 3 | browser-testing-with-devtools | DOM/network/console/ảnh bằng Chrome cài sẵn và profile riêng qua Playwright;43 kiểm tra cô lập +11 main |
| Mọi task | subagent-driven-development | Một implementer mỗi task, review riêng; broad review và một vòng sửa cuối/re-review sạch |
| 3 | verification-loop, verification-before-completion | Test/JDT/build/hash, backup/restore/migrate và main smoke trước khi DONE |
| Bàn giao | finishing-a-development-branch | Giữ nhánh/working tree theo phạm vi đã duyệt; không commit/push/merge hoặc dọn dữ liệu chưa lưu |

## Quyết định và giới hạn

- Dùng working tree có WIP đã duyệt, không stash/reset/chuyển nhánh; tách DB/build/Chrome và snapshot để bảo toàn. Đánh đổi: đối chiếu hash thay vì coi toàn diff HEAD thuộc Ticket.
- Thực hiện theo phê duyệt hiện tại, không xin lại phê duyệt chung. **No bug/ID** còn chờ làm rõ: hiện dùng No/ID case, chưa tạo cột mã Bug riêng. Nếu ý nghĩa khác, chỉnh phần tham chiếu trong tiêu đề; không đổi mã ticket độc lập.
- QA chuyển Bug giữ cả bằng chứng còn thiếu/lịch sử QA với dấu riêng do server đặt. Bug mới vẫn cần dữ liệu bắt buộc. Không bịa version; bổ sung bằng chứng thật khi có.
- Monkey gửi lẫn ID case/file nhận422 để tránh nguồn giả; client cũ dùng tổ hợp này cần sửa.
- Trạng thái ban đầu khác mặc định theo quyền đã duyệt là phần UI còn thiếu được bổ sung, không mở quyền mới.
- Tiền tố dài rút gọn riêng và có thông báo. Đánh đổi: tiêu đề không chứa trọn tên dài, nhưng ngữ cảnh/bằng chứng giữ đầy đủ.
- Metadata runtime/credential/Chrome dependency tác vụ trước chỉ đọc để giữ ứng dụng, không sửa artifact trước. Giữ artifact tác vụ này vì chưa commit lưu bằng chứng; không tự dọn bỏ.
- Không nâng thư viện chỉ để ẩn cảnh báo. Còn Flyway/MySQL9.7, instrumentation Mockito và bundle>500kB; các phép kiểm trên đạt ở môi trường này, không suy ra mọi phiên bản/quy mô.
- Không tuyên bố UAT mọi màn hình/thiết bị, tải lớn hoặc hiệu năng toàn hệ thống. Không gọi AI/Redmine ngoài; không mở lại execution/retest đã nghỉ hoặc triển khai thêm Arena. WIP identity/profile chỉ kiểm tại ranh giới liên quan, không coi là đã audit lại toàn bộ.

Artifact chi tiết: .superpowers/sdd/2026-11-03-ticket-workflow/ — ledger/snapshot/hash/log/review/ảnh, verification-gates.json, cutover.json, main-runtime.json, main-smoke.json. Một wrapper log fixture cũ bị seed script ghi đè; đã ghi rõ và lưu receipt mới riêng, không dựng lại log cũ. Các bằng chứng native/Chrome khác giữ nguyên.
