# Chốt bảng case và import 9 cột

## Yêu cầu mới ưu tiên hơn checkpoint spreadsheet trước

Người dùng yêu cầu bỏ ID redmine/Cột 14 và mọi cột nguồn ngoài danh sách, gộp hai cột người test, sửa ID/Status theo mẫu trước. Áp dụng trên `system-design`.

Bảng Feature hiển thị đúng thứ tự:

1. ID
2. No
3. Đối tượng test
4. Điều kiện tiên quyết
5. Các bước test
6. Quan điểm test
7. Hạng mục xác nhận
8. Kết quả mong đợi
9. Ghi chú thiết kế
10. Version test
11. Status
12. Issue
13. Người test

## Đã sửa

- Chiếu các cột nguồn theo tên/alias và mapping API; giữ index nguồn để thao tác sửa vẫn đúng ô khi file đảo cột. Thiếu trường tùy chọn ở file cũ hiển thị dấu gạch ngang; không bịa số No. ID vẫn là ID nguồn.
- Bỏ cột dư cả trong bảng, tìm kiếm và chi tiết case. Bỏ ghi chú thực thi cũ khỏi phần version. Giữ dữ liệu file cũ và lịch sử trong DB.
- Người test là một cột chứa các tên phân công đang có, bỏ tên hiển thị trùng; không thay đổi trách nhiệm, quyền hoặc lịch sử phân công.
- ID cuộn cùng bảng, không ghim đè cột cạnh bên. Status là ô vuông gọn nền trắng, viền màu theo kết quả; Unexecuted dùng viền xám bạc. Nút lịch sử gọn bên dưới. Giữ cột Issue và preview sát nút từ lượt trước.
- `FeatureService.preview` dùng `TestCaseWorkbook.parseFeature`: chỉ lấy nội dung 9 trường được chọn. Các vị trí ngoài danh sách để trống trong dữ liệu case; giữ độ dài/index mảng để tương thích editor và document reader. Không đổi migration hoặc reindex dữ liệu đã lưu.
- File Excel gốc được giữ nguyên byte để tải lại. Bộ đọc tài liệu lịch sử vẫn hỗ trợ format cũ. Các kiểm tra workbook an toàn, giới hạn dung lượng/sheet/dòng/cột vẫn áp dụng.
- Mẫu Excel tải về có đúng 9 tiêu đề. Hướng dẫn import Feature đã cập nhật; luồng thư viện cũ giữ mô tả riêng.

Phạm vi lượt này không đổi cơ chế xuất Excel đã ghi kết quả hoặc xóa dữ liệu lịch sử. File tải gốc vẫn có các cột gốc. Quy tắc import mới áp dụng khi tạo preview mới bằng backend bản sửa; không hồi tố batch đã tạo trước đó.

## Kiểm chứng

- RED frontend: test mới thất bại trước sửa do chưa có cột Người test duy nhất và vẫn hiển thị các cột thừa.
- RED backend: 3 test hành vi thất bại với parser cũ: nhập cả metadata, giữ bản dịch/tham chiếu ngoài danh sách và mẫu có 13 cột.
- GREEN tập trung: 19 frontend test bảng/cột đạt; 34 backend test thuộc FeatureWorkbookImportTest, CustomerWorkbookTest, TestCaseWorkbookTest, DocumentWorkbookTest, FileWorkWorkbookTest đạt, không skip.
- Hồi quy frontend: **400/400 test, 41 file**, không skip. Bao gồm Status/version, phân công, Issue hover/click, giữ nháp, routes và layouts.
- Sau cập nhật hướng dẫn import: **31/31 test, 3 file** ImportExcelBatch, ExcelImportPreview, test-cases đạt.
- V8 coverage chỉ 3 component TestingDocumentPage, TestingGridColumns, CaseIssueAction: statements **87,85%**, branches **84,48%**, functions **81,06%**, lines **93,02%**. Không phải coverage toàn hệ thống; backend không đo coverage mới cho phạm vi task.
- Vite build PASS; còn cảnh báo chunk >500 kB. `git diff --check` PASS.
- JDT: 392 source, **0 error**, không cảnh báo trong các file sửa của task. Có **7 warning ngoài phạm vi trong SystemAdminStartupTest.java** (file không thay đổi trong lượt này); không coi kiểm tra toàn bộ Java là warning-free.
- Chrome đã thử mở lại `http://localhost:5173`: `The browser access host is unavailable`. Chưa nghiệm thu ảnh render, responsive hay thao tác trực tiếp trên Chrome.

## Trạng thái và phạm vi bàn giao

Source và kiểm tra tự động hoàn tất; **IN_REVIEW** cho nghiệm thu hình render. Chưa commit/push, chưa restart backend hay ghi dữ liệu thử lên database đang sử dụng. Backend đang chạy cần nạp bản sửa trước khi áp dụng quy tắc import mới.

Skills tiếp tục áp dụng: `frontend-ui-engineering` cho bảng/CSS scoped; `tdd-workflow` cho phép chiếu cột và lọc dữ liệu import; `verification-before-completion` cho test/build và báo rõ giới hạn. Bảo toàn các thay đổi backend Admin/IDE có sẵn, không tính chúng vào task này.
