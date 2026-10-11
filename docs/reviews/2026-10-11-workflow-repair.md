# Sửa luồng dự án, thành viên, máy và phân công theo file — 11/10/2026

Nhánh `system-design`; giữ thay đổi sẵn có. Không commit/push/merge/deploy. Phạm vi mở rộng theo phản hồi người dùng và [kế hoạch W1–W7](../planning/2026-10-11-workflow-repair.md). S11 vẫn `IN_REVIEW`.

## Bài toán và nguyên nhân

Chuỗi dữ liệu hiện hành: **dự án → thành viên / danh mục / máy bàn giao → Excel và revision → đợt, cấu hình, phân công → phiên / kết quả → BUG / QA → retest**. Admin tổng có toàn quyền nghiệp vụ; PM điều phối trong dự án; Tester thực thi phần được giao; Dev xử lý ticket. Không đồng nhất trạng thái đợt với kết quả case hoặc kết quả tài liệu nguồn.

Các lỗi được xác nhận và sửa:

| Mục | Nguyên nhân | Kết quả |
|---|---|---|
| W1 | Chuẩn bị đợt mặc định tải case toàn dự án; case nháp bị khóa không có đường duyệt tại chỗ | Mặc định chọn tên file, Tester và khoảng ID `1-35`; xem danh sách case là mục mở rộng. Có duyệt hàng loạt rõ ràng trước kiểm tra/giao. Giữ lựa chọn khi lỗi. Luồng case riêng lẻ là chế độ riêng. |
| W2 | `uq_fw_group_source` và service chỉ cho một nhóm trên file/đợt/cấu hình | V29 thay unique này bằng index thường; cho chia khoảng khác nhau cho nhiều Tester. Khóa chống trùng run, kiểm tra version, khóa project và request key vẫn còn. Retry chung giữ nguyên lệnh tạo. |
| W3 | Có thể chọn lại người đã là thành viên; xử lý lưu nhiều người và lỗi một phần chưa rõ; người dùng xác nhận bấm không thấy phản hồi | Chặn chọn lại thành viên hiện có, đọc version trước ghi. Hiện “Đang lưu thành viên…” ngay khi bấm; thành công/lỗi được focus vào vùng nhìn thấy. Chỉ bỏ lựa chọn đã lưu, giữ người chưa lưu và ghi rõ tên khi lỗi. |
| W4 | Màn máy của dự án chỉ đọc | Admin bổ sung nhiều máy sẵn sàng ngay trong dự án, chọn người nhận/ngày trả/ghi chú từng máy. Có thu hồi, tải lại, phản hồi thành công và retry phần chưa lưu; khóa dự án lưu trữ. |
| W5 | Điều hướng danh mục dựa vào project cũ trong storage; thiếu đường thêm dữ liệu | Liên kết có projectId ưu tiên đúng dự án, kể cả mở lại cùng link sau đổi project thủ công. Danh mục mở đúng loại thiết bị/build. Thiếu file/Tester/cấu hình có chỉ dẫn hành động. API member trả trạng thái tài khoản để bỏ người bị khóa khỏi người nhận. |
| W6 | CSS input áp lên checkbox; caption dự án làm lệch hàng; Chat nổi che thao tác | Bộ lọc gọn và checkbox cùng hàng; bỏ caption trùng; trạng thái rỗng nằm trong bảng. Chat chuyển vào header dùng chung của Admin/workspace, không chừa vùng trống lớn ở cuối. Nút header mobile cao 44px. |
| W7 | PRD còn baseline quyền Admin cũ | Cập nhật quyết định hiện hành và hướng dẫn chuẩn bị, phân công, thực thi; giữ lịch sử quyết định cũ có ngữ cảnh. |

Đối chiếu router và các module: Admin/project/member/inventory/catalog; thư viện/import/document/result/second-test; cycle/scope/file/session; work-item/QA/retest; dashboard/report; auth/AI shell. Phần thay đổi hành vi tập trung W1–W7; các yêu cầu trước về nút kết quả, sửa ô, test lần 2, popup, Kanban và quyền Admin vẫn nằm trong cây làm việc và các review 10–11/10 trước đó. Không coi việc kiểm kê module là bằng chứng đã thao tác mọi màn hình với mọi vai trò.

## Backend và database

- API duyệt nhiều dòng xác thực project/document/revision/role trước ghi; toàn bộ lệnh trong transaction. Chặn dòng khác file, revision cũ, dòng trùng và quyền không hợp lệ. Admin không cần membership riêng để duyệt.
- Kiểm thử ghi/xóa chỉ chạy trên schema `tms_docstest_202610100016` và schema mới `tms_docstest_bab5ba2349be`; không ghi fixture vào `tms`.
- Audit chỉ đọc sau cập nhật: **76 bảng, 185 khóa ngoại, 0 dữ liệu mồ côi**. Bảy kiểm tra liên kết case/revision/run/file-group/BUG/QA/import đều 0 vi phạm. Bằng chứng local: `var/ui-audit/database-relations.json`, `workflow-links.json`.
- DEMO-S04 có 4 file, 371 dòng nguồn và chưa có file group; DEMO-PILOT có 4 file, 252 dòng nguồn và chưa có file group. Đây là dữ liệu đã nhập chưa phân công theo file, không phải file bị mất. UI có tài liệu nguồn trước phân công.
- Backup trước nâng cấp: `var/mysql-native/backups/2026-10-10T18-06-05-593Z-tms.sql`. Restart backend local 8080 áp Flyway V29 trên MySQL native 3307. Health `UP`. So sánh hash trước/sau giữ nguyên **7.224 dòng nghiệp vụ / 73 bảng**, bao gồm bytes workbook; loại trừ bảng session và lịch sử Flyway khỏi phép so sánh nghiệp vụ.

## Kiểm chứng

Skill đã đọc/áp dụng: `ui-ux-pro-max`, `code-review-and-quality`, `frontend-patterns`, `tdd-workflow`, `verification-loop`, `api-design`, `security-review`. `prompt-master` đã đọc nhưng không áp dụng cho sửa mã thông thường. Công cụ tìm thiết kế Python của UI skill không chạy được vì máy không có Python; dùng các hướng dẫn layout/accessibility trong skill, không tuyên bố đã chạy tra cứu đó.

- RED → GREEN cho giữ lựa chọn khi lưu một phần, phản hồi đang lưu/focus, trạng thái tài khoản trong member DTO, phân chia file, khoảng ID/duyệt, project deep link mở lặp lại, idempotency retry, Chat header và bộ lọc Admin.
- Frontend toàn bộ: **73 file / 791 test PASS**, `workflow-full-frontend-final.log`. Sau chỉnh câu hướng dẫn và mobile hit target, kiểm tra liên quan **87 + 15 test PASS**; production build PASS (`workflow-final-focused.log`, `workflow-member-final.log`, `workflow-build-final.log`). Đây là các lượt chạy có test trùng nhau, không cộng thành tổng test độc lập.
- Backend unit chọn lọc: **547 PASS** (`admin-unit.log`). Lượt hồi quy gồm unit và native: **99 PASS** (`workflow-regression.log`), bao gồm phân chia hai khoảng, overlap, quyền, transaction duyệt, membership và thiết bị. Không cộng hai số do trùng suite.
- Migration nâng cấp V28 → V29 **1 PASS**, migration database rỗng → V29 **1 PASS**, workflow trên schema mới **7 PASS**. Runner/guard Node **12 PASS**. Các log `workflow-upgrade.log`, `workflow-fresh-migration.log`, `workflow-fresh-regression.log`.
- Eclipse JDT kiểm tra **262 source / 0 lỗi / 0 cảnh báo**, gồm sửa non-null helpers trong test mới; không tắt null analysis. Đây là kết quả compiler, chưa phải ảnh xác nhận panel Problems của VS Code.
- Contract/schema reference checker và `git diff --check` PASS. Không đo lại coverage toàn phạm vi này; không suy ra coverage từ số test PASS. Build còn cảnh báo Vite chunk lớn hơn 500 kB.

## Kiểm tra trực tiếp Chrome local

Dùng tài khoản Admin hiện có, không tạo fixture nghiệp vụ:

- Nhật ký: sau chọn dự án, project trigger và loại sự kiện cùng tọa độ dọc/kích thước.
- Chi tiết dự án: mở hộp Bổ sung máy, tìm kiếm danh sách máy sẵn sàng và chọn người nhận; hủy không ghi. Hộp tại 390px có clientWidth/scrollWidth cùng 366px, không tràn ngang.
- Liên kết danh mục từ dự án mở đúng DEMO-S04 và tab Thiết bị; backend trả dữ liệu danh mục thật.
- Đợt TR-20261011: chọn file thật, cấu hình và Tester; nhập `1-35` chọn đúng **35 case**, báo **33 case chưa duyệt** và có nút duyệt. Không bấm duyệt/giao trên database đang sử dụng; hành vi ghi đã được kiểm tra trên schema riêng và component tests.
- 1366px, 390px, 320px: Chat trong header; nút header trên mobile cao 44px, không chồng nhau; không tràn ngang trang. Reset viewport sau kiểm tra.
- Ảnh bằng chứng: `var/ui-audit/workflow-file-range-desktop.jpg`.

## Cách sử dụng và giới hạn còn lại

Xem [hướng dẫn dự án → kiểm thử](../user-guides/project-testing-workflow.md) để thêm thành viên, máy, thiết bị cấu hình, build và giao khoảng case. Không tự thêm mẫu máy/build giả vào dự án đang dùng.

Phiên file có máy vật lý hiện hỗ trợ iPad/iPhone/Android. OS/model/version của cấu hình, máy và nền tảng build phải tương thích theo guard hiện có. Cấu hình Chrome / Windows + build WEB đang dùng được trong luồng case thông thường, chưa dùng cho phiên file có máy vật lý. UI và hướng dẫn đã nêu tại điểm giao việc; mở rộng nền tảng này là phạm vi riêng, không đổi nhãn dữ liệu cũ để vượt kiểm tra.

W1–W7 đã hoàn tất trong phạm vi kiểm chứng trên. UAT mọi vai trò/mọi tổ hợp màn hình, phiên trên máy thật, tải production và chất lượng model AI live vẫn là gate riêng của S11. Không khẳng định toàn bộ sản phẩm đã hết lỗi chỉ từ các lượt test này.
