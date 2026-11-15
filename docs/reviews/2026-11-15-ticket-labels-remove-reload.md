# Thống nhất Ticket và bỏ nút tải lại

## Thay đổi

- Dùng **Ticket** thay **Issue** trong nhãn giao diện dự án: bảng trạng thái, danh sách, cột test case, preview, form tạo/sửa, chi tiết, bình luận, lịch sử, thông báo và phân tích. Đổi cả tiêu đề cột xuất Excel, thông báo nghiệp vụ backend và nhãn nhật ký quản trị.
- Giữ nguyên endpoint, tên trường API, khóa dữ liệu và migration đã áp dụng. Không sửa nội dung do người dùng nhập hoặc dữ liệu lịch sử chỉ vì có chữ Issue.
- Gỡ các nút tải lại/làm mới thường trực trên màn hình. Giữ tự cập nhật sau thao tác thành công; khi quay lại cửa sổ, các màn liên quan đọc lại dữ liệu qua loader hiện có, bảo toàn bản nháp. Focus vào trường nhập không kích hoạt đọc lại.
- Các nút **Thử lại** chỉ phục vụ lỗi đọc hoặc đối chiếu dữ liệu, không tự gửi lại lệnh ghi. Lịch sử Ticket có nút mở/thu gọn; khi lỗi có Thử lại lịch sử. Xung đột chỉnh tài khoản dùng Đóng và cập nhật.

## Kiểm chứng

- **1.444/1.444 kiểm thử frontend PASS**, 162 file. Các kiểm tra hiện có được cập nhật theo nhãn/thao tác mới; vẫn kiểm tra quyền bị thu hồi, bản nháp, retry và chống gửi trùng. Thêm kiểm tra hook: bỏ qua focus trường nhập, đọc khi focus cửa sổ, dọn listener khi unmount.
- **8 kiểm thử backend thực thi PASS**: AdminAuditLabelsTest (3), FeatureWorkbookExportTest (2), FeatureIssueServiceTest (3). Runner đã build artifact thành công. 53 kiểm thử integration cũ bị skip do điều kiện môi trường của lớp test; không tính vào số PASS.
- Build frontend PASS, chỉ còn cảnh báo kích thước chunk >500 kB. `git diff --check` PASS. Không đo coverage mới.
- Rà AST không còn nút Tải lại/Làm mới thường trực hoặc nhãn Issue hiển thị; tên route/identifier kỹ thuật giữ nguyên.
- Chrome headless kiểm tra các trang quản trị, danh sách Ticket, chi tiết và tạo Ticket từ case. Không gửi bản nháp kiểm tra, không thay đổi dữ liệu nghiệp vụ.
- Backend local chạy artifact `var/workspace-ui-browser/ticket-label-runtime/tms-backend.jar`, health UP. Flyway xác nhận schema hiện tại không cần migration; main giữ V46.

Skill đã áp dụng: frontend-patterns. Không commit/push trong tác vụ này.

Bằng chứng cục bộ (ignored): `var/workspace-ui-browser/ticket-copy-final-all.json`, `ticket-labels-live.cjs`, thư mục `ticket-label-runtime`; log backend test `Backend/target/unified-access-verification/last-test.log`.
