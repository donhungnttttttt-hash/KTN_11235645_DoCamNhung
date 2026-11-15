# Chọn thành viên và bàn giao máy trong dự án

## Nghiệp vụ đã chốt

- Admin tổng không nằm trong bộ lọc, danh sách ứng viên hoặc tổng số người khi chọn thành viên. Quyền truy cập toàn hệ thống vẫn giữ nguyên.
- Một PM hợp lệ: máy đã chọn tự nhận PM đó. Từ hai PM trở lên: hiện một dropdown người nhận chung cho tất cả máy. Không có PM: yêu cầu bổ sung PM trước khi lưu.
- Bỏ các khung ngày dự kiến trả, ghi chú bàn giao và nút bỏ riêng từng máy bên dưới. Bỏ chọn ngay trong bảng máy.

## Thực hiện

`GET /api/v1/admin/users` có filter tùy chọn `excludeSystemAdmins=true`. Điều kiện áp dụng trước COUNT/LIMIT/OFFSET, nên số người và phân trang không tính Admin tổng. Mặc định API quản trị tài khoản vẫn hiển thị đủ tài khoản. Endpoint member-candidates luôn loại Admin tổng.

MemberPicker gửi filter mới và không có lựa chọn role ADMIN. InitialDevicePicker tự điền người nhận duy nhất, xử lý đổi/gỡ PM, giữ lựa chọn máy qua bộ lọc/phân trang và retry phần bàn giao thất bại. Admin tổng có membership PM từ dữ liệu cũ không tính vào PM nhận máy. Không xóa membership, tài khoản hoặc lịch sử bàn giao cũ.

Không migration; vẫn V46. Chỉ cập nhật backend đang chạy và frontend. Các trường ngày trả/ghi chú trong API vẫn tương thích, picker gửi ngày trả null và ghi chú rỗng.

## Kiểm chứng

- Trước sửa: hai test mới thất bại về tự chọn PM và loại Admin tổng; sau sửa đạt.
- MemberSelectionNativeTest: 3/3 PASS trên schema MySQL test riêng: phân trang và tổng số ứng viên, quyền Admin giữ nguyên, tạo dự án kèm máy giao đúng PM và không thêm Admin tổng vào membership.
- AdminOverviewTabletNativeTest: 3/3 PASS trong lượt kiểm tra cùng thay đổi backend.
- Cập nhật các test UI cũ theo nghiệp vụ đã chốt, giữ kiểm tra submit thiếu PM, lỗi bàn giao một phần, retry không gửi lại máy đã thành công.
- Frontend build PASS, còn cảnh báo bundle >500 kB. Coverage chưa đo riêng.
- Full frontend **1.442/1.442 test ở 161 file** PASS; sau bổ sung nhãn truy cập rõ ràng cho dropdown, 6 kiểm thử liên quan và build lại PASS.
- Chrome thật trên local xác nhận 117 ứng viên hoạt động, loại 2 Admin tổng; không có Admin tổng trong bộ lọc. Một PM tự nhận máy, thêm PM thứ hai hiện dropdown và chọn được, gỡ PM thứ hai quay về tự nhận cho PM còn lại. Không có form từng máy, không lỗi JavaScript. Không tạo dữ liệu thử trên database sử dụng.
- Local backend8080 đã nạp artifact kiểm thử mới, health UP, giữ V46. Bằng chứng ignored: `var/workspace-ui-browser/member-runtime/browser-result.json`, `one-pm.png`, `two-pm.png`.
- `git diff --check` PASS. Hoàn thành phạm vi đã chốt.

Skill: frontend-patterns. Chưa commit/push.

## Bổ sung: icon thao tác tài khoản

Đổi toàn bộ nút trong cột Thao tác thành icon: bút sửa thông tin, khóa chìa đặt lại mật khẩu, khóa/mở khóa, khiên cộng/trừ cấp/thu hồi quyền tạo user. Kích thước desktop34×34, thiết bị cảm ứng44×44; có title và aria-label. Lý do không thể tự khóa tài khoản chuyển vào tooltip và mô tả hỗ trợ đọc màn hình, không kéo dài hàng.

41 kiểm thử tài khoản/hồ sơ/hành động PASS, build PASS. Chrome thật xác nhận các nút chỉ chứa icon, đúng34×34, có tên truy cập và mở được dialog sửa thông tin. Ảnh local: `var/workspace-ui-browser/member-runtime/user-icons.png`. Không đổi backend/database.
