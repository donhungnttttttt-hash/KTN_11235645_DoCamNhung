# Bảng tài liệu và phân công test lần 2 — 10/10/2026

Nhánh `system-design`; COMPLETE_LOCAL / IN_REVIEW. Người dùng xác nhận “Thêm phân công test lần 2 cho PM”. Không commit, push, merge hoặc deploy. Các thay đổi có sẵn của vòng import/UI/linkage được giữ nguyên.

## Thay đổi

- Chuyển phân trang, số dòng và cỡ chữ lên toolbar. Toolbar cuộn ngang riêng khi thiếu chỗ; bảng chiếm phần chiều cao còn lại và cuộn độc lập.
- Nhấp đúp/Enter mở sửa ô với Lưu/Hủy và lịch sử. Trường nội dung case tạo revision mới cần PM duyệt; ô bổ sung có version riêng. Không sửa ID hoặc kết quả qua ô văn bản. Dữ liệu đã thực thi và file gốc giữ nguyên. Xung đột trả lỗi và giữ bản nháp; chờ autosave kết quả hoàn tất trước khi mở sửa/phân công.
- Cột không có tiêu đề và hoàn toàn không có nội dung được ẩn. N/O/P có dữ liệu vẫn giữ: tài liệu 15 có dữ liệu ở các dòng phía dưới nên không thể coi là cột trống từ ảnh đầu bảng.
- Hai cột nghiệp vụ “Người test lần 2 / Ghi chú 2” liên kết bảng `test_document_retests` với `run_items`, không gán chuỗi tên người vào dữ liệu nguồn. PM chọn đợt DRAFT, cấu hình và Tester đang hoạt động trong cùng dự án; case phải được duyệt. PM bắt đầu đợt, Tester được giao thực thi qua luồng hiện có. Lần chạy có version/lịch sử phân công và kết quả hiện lại trong tài liệu. Có liên kết mở đợt; xuất Excel bổ sung phân công/kết quả lần 2.
- Sau khi giao, đổi người/ghi chú giữ nguyên đợt và cấu hình; đợt CLOSED không sửa. Có thể mở dialog qua nút hoặc nhấp đúp/Enter vào hai cột nghiệp vụ. Nếu chưa có đợt nháp/cấu hình, UI giải thích và dẫn đến Đợt kiểm thử, không tự tạo hay kích hoạt đợt.
- Nút kết quả chỉ xem không còn tooltip gợi ý chuyển trạng thái. Admin tổng không có membership không được mở sửa revision; vẫn xem mọi dự án và nhập Excel theo quyền import đã chốt.
- Bỏ shortcut Công việc theo file khỏi Tổng quan dự án. Kanban giữ các cột trạng thái, thao tác chuyển trạng thái cho PM theo rule; thêm chuyển chế độ Kanban/Danh sách rõ ràng. Cả hai dùng cùng dữ liệu công việc; QA vẫn theo luồng chuyên biệt.

## Quyền

- PM: duyệt case, cấu hình/phạm vi/assignment, phân công lần 2, mở/chốt đợt và nghiệp vụ quản lý dự án.
- Tester: ghi kết quả chính thức cho lượt được giao khi đợt cho phép; không tự thay người nhận hoặc mở/chốt đợt.
- Dev: làm việc theo luồng ticket/bug/QA và chuyển trạng thái được backend cho phép; không tự nhận quyền ghi kết quả kiểm thử.
- Admin tổng: quản trị hệ thống và import Excel; khi xem dự án không có membership thì là observer. Quyền ghi trong dự án phụ thuộc membership hợp lệ, không suy từ quyền đọc toàn hệ thống.

## Database và API

V27 thêm bảng overlay, lịch sử ô và liên kết lần 2, cùng FK liên kết đúng project/row/case/run. API mới kiểm tra actor/project, quyền PM, revision/version, assignee active và vòng đời đợt bằng service thực thi hiện có. Contract tại `docs/api/test-cases.openapi.json` và `docs/api/test-cases.md`.

Main native MySQL 3307 đã lên V27 sau backup `var/mysql-native/backups/2026-10-10T12-29-35-966Z-tms.sql` và manifest. Backend local 8080 đã restart với V27. Không chạy fixture ghi/xóa trên main `tms`; test database là `tms_docstest_202610100016`.

Audit đọc database: 76 bảng, 184 FK, 6 kiểm tra domain, 0 vi phạm. Audit liên kết workflow: 7 kiểm tra, 0 mismatch. Dự án DEMO-PILOT vẫn có 4 file/252 case nguồn/0 nhóm phân công file/240 lượt thực thi; không tự biến import thành phân công. Các bảng có quan hệ nhưng tài liệu nguồn và công việc được giao là hai bước nghiệp vụ riêng.

## Kiểm chứng

- RED → GREEN cho vị trí toolbar, tooltip chỉ xem, quyền sửa của Admin observer, API sửa ô, đúng `membershipId` của member API, khóa sửa khi autosave đang chờ và mở ghi chú lần 2 bằng nhấp đúp.
- `npm test`: **748 test / 69 file PASS** (19:43, bản cuối).
- `npm run build`: PASS. Cảnh báo bundle ~642 KB còn; không có lỗi build.
- Backend hồi quy: **237 test PASS** trong 13 class workbook/document/file-work/QA/handoff/retest/reporting/guard.
- `TestDocumentIntegrationTest`: **11 PASS**, gồm sửa nội dung, revision/concurrency/history, bảo toàn file gốc, quyền phân công, từ chối case chưa duyệt, chống trùng, Tester thực thi, nguồn cũ không bị ghi đè, cập nhật ghi chú và xuất Excel.
- `NativeFileWorkQaIntegrationTest`: **10 PASS**; `NativeFileWorkQaConcurrencyTest`: **5 PASS** trên V27. Native runner: **12 PASS**.
- OpenAPI JSON parse và `git diff --check`: PASS.
- Chrome local: Admin và PM, tài liệu thật 15/9, sửa ô mở/đóng, hộp PM chọn đúng Tester, trạng thái thiếu đợt nháp, Kanban/Danh sách. Không lưu thao tác nghiệp vụ thử vào database sử dụng.
- Viewport 1920×945, 1366×768, 390×844: không tràn trang; bảng cuộn độc lập. Bản cuối 390×844 có pageWidth 390, pageHeight/gridBottom 844, vùng bảng cao 513 px. Đã reset viewport và khôi phục tài khoản Admin.
- Ảnh giao diện cuối: `var/ui-audit/document-workspace-final.png` (tài liệu 15, Admin observer, toolbar có phân trang/cỡ chữ ở trên).

Skills đã áp dụng: `ui-ux-pro-max`, `frontend-patterns`, `api-design`, `security-review`, `verification-loop`. Không đo coverage toàn sản phẩm; số test PASS không đại diện coverage.

## Còn lại

Người dùng/PM UAT quy trình với file và đợt thật; thiết bị cảm ứng/Safari và toàn bộ tổ hợp vai trò/trạng thái chưa được browser-verify. Không kết luận mọi màn hình trong sản phẩm hết lỗi, không ký nghiệm thu S11 thay người dùng. Chỉ push sau yêu cầu rõ ràng mới.
