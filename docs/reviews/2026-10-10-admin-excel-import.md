# Admin nhập Excel và nhập nhiều file — kiểm chứng local

Trạng thái: implementation hoàn tất local; **IN_REVIEW** cho thao tác chọn file tự động qua tiện ích Chrome. Không commit/push/merge trong tác vụ này.

## Thay đổi

- Quyền import riêng cho ADMIN ở mọi dự án đang hoạt động, kể cả không có membership. PM vẫn nhập trong dự án quản lý; Tester/Dev bị chặn. Không mở thêm quyền ghi kết quả, phân công, tạo suite thủ công hay phê duyệt.
- Nút Nhập Excel có ở thư viện tài liệu và tất cả test case. Chọn tối đa 20 file .xlsx, mỗi file không rỗng và không quá 5 MiB; giới hạn backend về cấu trúc/dòng/cột giữ nguyên.
- Xem trước theo file, không tự commit. Xác nhận các file hợp lệ; thành công/lỗi độc lập. File lỗi có thể thay và thử lại sau khi các file khác thành công; không gửi lại file đã thành công. Dừng hàng đợi khi unmount/đổi dự án hoặc gặp 401/403. Commit/checksum giữ idempotency phía server.
- V26 cho phép người tạo revision là identity của Admin, giữ membership author cũ và FK/check bắt buộc có author; không tạo membership giả. API bổ sung `createdByUserId`, `createdBy` giữ nghĩa membership nhưng nullable.
- Thư viện rỗng hiển thị lời hướng dẫn và nút thêm tài liệu thay bảng chỉ có header. Sửa khoảng trắng dành sẵn cho scrollbar ở mép bảng; bảng có cuộn riêng, phân trang cho phép xuống dòng.

## Bằng chứng

| Kiểm tra | Kết quả |
| --- | --- |
| RED frontend | 4 test thất bại đúng nguyên nhân: thiếu nút Admin, chỉ nhận một file |
| RED backend native | Admin không membership tải template trả 404 thay vì 200 |
| Frontend regression | 65 file / 730 test PASS; sau đó thêm test Admin trên dự án archived và chạy lại nhóm 26 test PASS |
| Coverage hai component import | Statements 92.07%, branches 88.95%, functions 96.96%, lines 100%; không phải coverage toàn ứng dụng |
| Build frontend | PASS; cảnh báo bundle hiện có ~621.63 kB / gzip 177.19 kB |
| Backend regression | 48 test PASS: 9 integration tài liệu/native + 39 test workbook/result/project |
| Test author bổ sung | 1 test chạy lại PASS: DTO trả identity đúng, Admin không được tạo suite thủ công/phê duyệt khi không membership |
| Migration | V25→V26 giữ revision/author cũ; fresh V26, validate và restart no-op PASS trên schema riêng |
| HTTP thật trên fixture 8081 | Hai workbook hợp lệ commit; một workbook lỗi trả 422; lặp commit/upload không trùng; 2 revision có identity author và 0 membership |
| Browser | Admin thấy nút import; hộp thoại cho multiple file; bố cục CSS 390/768/1366px không tràn trang; bảng mobile rộng 1100px trong vùng ~356px, ArrowRight thay scrollLeft; phân trang nằm trong trang |
| Contracts / diff | Check-Contracts.cjs và git diff --check PASS; kiểm tra contract mang tính cấu trúc |
| Backend chính | Cổng 8080 HTTP 200 UP, Flyway V26, MySQL 127.0.0.1:3307 |
| Bảo toàn local | SHA-256 theo cột cũ: 3.813 dòng của 7 bảng testcase/suite/import/membership/audit giữ nguyên sau migration |

Native schemas: `tms_docstest_202610100013` (RED/integration), `...0014` (fixture HTTP/browser), `...0015` (migration fresh/upgrade, regression). Không chạy test ghi/xóa trên `tms`. Fixture 8081/5174 đã dừng; frontend chính 5173 và backend chính 8080 tiếp tục chạy. Dữ liệu fixture chỉ là mẫu tổng hợp.

Lần chạy migration đầu so sánh nhầm số migration với số phiên bản (26), trong khi nguồn mặc định có 24 migration do V20/V22 nằm ở vị trí seed riêng. Đã sửa test để kiểm chứng phiên bản đích V26 và chạy lại từ schema rỗng; không sửa migration đã áp dụng.

## Giới hạn còn lại

Tiện ích Chrome chưa bật “Allow access to file URLs”, nên tự động `fileChooser.setFiles` bị chặn trước upload. Đã gửi hướng dẫn cho người dùng; không tự cấp thêm quyền cho tiện ích. Vì vậy chưa tuyên bố E2E chọn file → xác nhận qua Chrome đã PASS. Upload thật đã được kiểm chứng qua HTTP; luồng giao diện nhiều file/partial failure/retry/đổi dự án được kiểm chứng bằng React Testing Library.

Không đo coverage toàn backend/toàn frontend, không kết luận toàn hệ thống đã nghiệm thu. Không dùng kết quả task này để đóng các gate UAT của S11. Không thay đổi nguồn AI hoặc chính sách không push.

Skills đã đọc và áp dụng: `api-design`, `frontend-patterns`, `tdd-workflow`, `security-review`, `verification-loop`. Rà soát source/diff xác nhận kiểm quyền ở backend, CSRF/ownership/project scope giữ nguyên, không thêm endpoint cho phép bỏ qua preview, không lưu key/token vào source.
