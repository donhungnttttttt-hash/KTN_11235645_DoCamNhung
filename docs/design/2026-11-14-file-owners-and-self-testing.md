# Phân công file, tự nhận case và người test đầu tiên

Yêu cầu đã được người dùng duyệt thực hiện ngày 14/11/2026, thay hành vi phân công Feature hiện tại.

- Phân công test case: nhập vùng thứ tự case trong file. Server lấy người nhận từ phiên đăng nhập, không nhận user ID từ form. Phạm vi đã có người khác nhận vẫn báo xung đột; không ảnh hưởng quyền cập nhật Status.
- Người phụ trách file: PM/Admin chọn nhiều thành viên đang hoạt động trong dự án qua dropdown checkbox. Quan hệ này độc lập với phân công từng case và không chặn người khác kiểm thử.
- USER, PM và Admin có quyền làm việc trong dự án được ghi Status dù không được phân công case/file. Khách giữ phạm vi xem tiến độ/báo cáo, không mở bảng case hoặc ghi kết quả; ngoài dự án, tài khoản bị khóa, file/Feature/dự án lưu trữ giữ giới hạn hiện có.
- Người test: tài khoản nhận case đầu tiên, hoặc người ghi Status đầu tiên nếu case chưa có người test. Sau đó không thay đổi khi người khác xác nhận. Lịch sử Status lưu người thực hiện mỗi lần.
- Theo đính chính mới nhất: Status là ô **72×72 px**, mỗi cạnh bằng chiều rộng nút Lịch sử Status 72 px bên dưới, dùng chung biến CSS; nền theo token trạng thái, không dùng nền trắng/viền màu đậm.
- Issue luôn mở bên phải sát nút, không tự lật trái. Nếu sát mép màn hình, bảng chừa khoảng trống cuối và cuộn ngang vừa đủ để hiển thị khung bên phải.

## Contract

- `PUT /api/v1/projects/{p}/test-documents/{d}/self-assignment`: `{expectedVersion, requestKey, rowIds}`; mảng rỗng nhả các case của chính mình. Không cho mạo danh user. 409 khi version cũ hoặc vùng đã thuộc người khác; retry cùng key/payload không tạo lịch sử trùng.
- `GET /api/v1/projects/{p}/test-documents/{d}/owners`: `{version, items:[{membershipId,name}]}`.
- `PUT .../owners`: `{expectedVersion, requestKey, membershipIds}` thay toàn bộ danh sách; chỉ PM/Admin; kiểm tra active/enabled và đúng dự án, mảng rỗng bỏ người phụ trách. Cùng optimistic lock với file để không ghi đè thay đổi đồng thời.
- Detail case bổ sung `assigneeUserId`, `selfUserId`; `firstTesterName` lấy theo ID tài khoản. Kết quả ghi Status trả thêm `firstTesterName` để cập nhật đúng ô ngay khi lưu thành công.
- API phân công cũ giữ tương thích; giao diện mới chỉ dùng self-assignment. Đồng bộ attribution mới khi đi qua API cũ.

V41 là migration bổ sung: tách danh sách phụ trách file, thêm ID người nhận/người test đầu tiên vào phân công case, thêm user ID vào lịch sử phân công. Backfill từ membership hiện có; không sửa migration cũ hoặc xóa lịch sử. Kiểm thử migration/API trên database riêng, không ghi dữ liệu thử lên database đang sử dụng.
