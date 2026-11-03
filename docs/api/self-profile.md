# Hồ sơ cá nhân — quyết định 03/11/2026

Mỗi tài khoản đã đăng nhập (Admin tổng, Admin dự án, User thường, Khách) xem và sửa hồ sơ của chính mình từ menu tài khoản. Tên bắt buộc; avatar, email, số điện thoại, chức danh, phòng ban không bắt buộc. ID đăng nhập, loại tài khoản và ngày tạo chỉ đọc. Chỉ Admin tổng sửa ID bằng API quản trị hiện hành; không bổ sung tự đổi mật khẩu trong yêu cầu này.

- `GET /api/v1/me/profile`: hồ sơ, version hồ sơ và accountVersion; không tạo dữ liệu khi đọc. Chỉ chủ tài khoản xem thông tin liên hệ.
- `PUT /api/v1/me/profile`: displayName (1–100), email (0–254, định dạng email), phone (0–30), jobTitle/department (0–100); expectedVersion, expectedAccountVersion. Từ chối field ID/role/quyền ngoài contract. Xung đột409 giữ bản nháp; 401 khóa form theo phiên; CSRF bắt buộc.
- `GET /api/v1/me/avatar`: ảnh PNG của chính mình; private/no-store; chưa có trả404.
- `PUT /api/v1/me/avatar?expectedVersion=…&expectedAccountVersion=…`: multipart field `file`, JPEG/PNG tối đa2MiB; xác thực nội dung, kích thước≤4096 mỗi chiều, chuyển PNG tối đa512px, loại metadata. Trả hồ sơ mới.
- `DELETE /api/v1/me/avatar?expectedVersion=…&expectedAccountVersion=…`: xóa ảnh, trả hồ sơ mới. Không thay tên hay thông tin liên hệ.

Phiên hiện tại giữ đăng nhập; không thay quyền. Khi đổi tên, accountVersion tăng để không bị Admin ghi đè bằng bản cũ; cập nhật principal của phiên đang lưu, các phiên khác phải đăng nhập lại như chính sách sửa tên hiện hành. Đổi thông tin liên hệ hoặc avatar chỉ tăng profile version. Khóa tài khoản/đổi ID/quyền qua quản trị vẫn thu hồi phiên như trước. Transaction khóa tài khoản, kiểm session và accountVersion hiện hành, dùng profile version chống ghi đè. Nhật ký chỉ lưu mã hành động, không lưu email/điện thoại/ảnh. V38 thêm bảng profile không đổi migration cũ; Arena archive dự kiến chuyển V39.

UI: hộp thoại dùng chung ở menu tài khoản của cả ba shell, hiện tải/lỗi/thử lại, avatar mặc định chữ cái; sửa và lưu thông tin, chọn ảnh/xóa ảnh có phản hồi riêng. Lỗi không mất nháp; cảnh báo khi đóng có thay đổi; upload không ghi đè các thông tin chưa lưu. Header cập nhật tên và avatar sau khi server xác nhận.

Đổi tên lưu principal của đúng phiên hiện tại cùng transaction tài khoản/hồ sơ. Spring Session JDBC dùng transaction operations REQUIRED; nếu giao dịch hồ sơ rollback thì renewal cũng rollback. Request đồng thời đã tải principal cũ chỉ được tiếp tục khi bản session đã lưu còn tồn tại, cùng người và đúng accountVersion; quyền được dựng lại từ tài khoản hiện hành. Khóa/reset mật khẩu/thu hồi quyền vẫn vô hiệu hóa phiên như trước; không tự tạo lại session bị xóa.
