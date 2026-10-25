# Bộ chọn thành viên cho nhiều dự án

Người dùng xác nhận một tài khoản có thể tham gia nhiều dự án. Bộ chọn dùng chung ở màn tạo dự án và thêm thành viên trước đó gửi `unassignedOnly: true`, làm API loại mọi người đã có membership hoạt động ở bất kỳ dự án nào.

Đổi bộ chọn sang `unassignedOnly: false`. Giữ lọc tài khoản hoạt động, tìm kiếm, lọc vai trò và phân trang 20 người. Người đã thuộc dự án đang mở vẫn bị vô hiệu hóa lựa chọn qua `existingUserIds`; không đổi quyền hay dữ liệu backend. Backend hiện tra membership theo cặp projectId/userId.

Kiểm chứng với skill `tdd-workflow`: cập nhật test yêu cầu bộ lọc mới và quan sát thất bại trước sửa; sau sửa 19/19 test liên quan đạt. Toàn bộ frontend: 1.202/1.202 test, 129 file đạt. Test dùng API giả lập; chưa quan sát browser hoặc đối chiếu trực tiếp 111 tài khoản trong database, chưa đo coverage mới. Không chạy migration, sửa database hoặc khởi động lại server. Không commit/push. Các sửa icon thùng rác có sẵn được giữ nguyên.

Trạng thái: hoàn tất sửa source và kiểm thử frontend; kiểm tra giao diện với dữ liệu thật còn lại. Không thay đổi trạng thái nghiệm thu sprint.

## Bộ lọc trạng thái dự án

Kiểm chứng cuối: 1.203/1.203 test frontend trong 129 file đạt; Vite build đạt, còn cảnh báo bundle JS 505,37 kB vượt ngưỡng 500 kB. Coverage chưa đo lại.

Theo yêu cầu tiếp theo, thêm Trạng thái: Tất cả / Đã có dự án / Chưa có dự án. Hiển thị mã và tên các dự án từ `memberships` của tài khoản. Đây là membership đang active; không phải trạng thái khóa tài khoản hoặc trạng thái lưu trữ dự án. Người đã có dự án vẫn được chọn vào dự án khác.

Contract bổ sung: `GET /api/v1/admin/users?hasProject=true|false`. Không truyền thì giữ tất cả; true dùng EXISTS membership active, false dùng NOT EXISTS. Áp dụng cùng điều kiện cho COUNT và truy vấn phân trang, kết hợp tìm kiếm/vai trò/enabled. Tham số `unassignedOnly` cũ giữ tương thích; bộ chọn mới gửi false. Không đổi response, quyền ADMIN hoặc schema. Đổi trạng thái lọc đưa về trang đầu, không xóa lựa chọn đã có.

Skill: brainstorming cho thiết kế nhỏ theo yêu cầu, tdd-workflow cho hồi quy. Test frontend mới thất bại trước sửa do chưa có thông tin dự án; sau sửa 17/17 test liên quan đạt. Backend unit `AdminSearchTest,AdminProjectServiceTest`: 9/9 đạt, kiểm COUNT và page dùng cùng điều kiện true/false/không lọc. Không test trên database đang dùng, không restart backend hoặc migration. Backend đang chạy cần khởi động lại để nhận query parameter mới; chưa xác nhận hành vi trên browser thật.
