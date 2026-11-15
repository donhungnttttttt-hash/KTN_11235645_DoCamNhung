# Tổng quan Khách bằng biểu đồ và menu cố định — 15/11/2026

## Kết quả

Tổng quan có sáu biểu đồ độc lập: tiến độ kiểm thử, chất lượng, Ticket, cơ cấu chi phí một ngày, cơ cấu nhân sự và tín hiệu sức khỏe. Không render bảng Feature, danh sách thành viên, toàn bộ mô hình chi phí hoặc toàn bộ nội dung Sức khỏe & AI trên Tổng quan. Mỗi biểu đồ mở đúng tab chi tiết; báo cáo vẫn mở trong mục Báo cáo. Nhận xét dưới biểu đồ được rút gọn bằng CSS, nội dung đầy đủ giữ ở tab chi tiết.

Biểu đồ lịch sử được sửa chung cho Tiến độ và Chi phí:

- Một ngày: hiển thị thanh so sánh có nhãn/số liệu ngày đó, không vẽ đường một điểm.
- Tất cả giá trị đã quan sát bằng 0: thông báo rõ chưa có biến động, hiển thị số 0 thực tế.
- Thiếu giá trị: ghi “Chưa ghi nhận”, không chuyển null thành 0 hoặc nối đường qua ngày thiếu.
- Không có lịch sử: trạng thái chưa có dữ liệu, không tạo ngày/kết quả giả.
- Hai ngày trở lên có dữ liệu: giữ biểu đồ đường và bảng số liệu mở theo yêu cầu.

Dự án T11-15 chỉ có ngày 15/11/2026 (Chủ nhật), vì vậy biểu đồ cũ có một điểm và chi phí lũy kế bằng 0 theo lịch làm việc mô phỏng thứ Hai–thứ Sáu. Không sửa database hoặc thêm lịch sử giả để lấp biểu đồ. Cơ cấu chi phí một ngày làm việc vẫn là 10.000 User + 2.500 quản lý = 12.500 đơn vị mô phỏng, từ mô hình đã chốt.

Workspace chiếm viewport, header/menu giữ vị trí; chỉ `gd-main` cuộn. Trên điện thoại menu nằm ngang ở đầu vùng nội dung. Chuyển tab đặt scroll của nội dung về 0; menu vẫn thao tác được. Không đổi quyền Khách, API, Flyway V44 hoặc dữ liệu.

## Kiểm chứng

- Tái hiện sáu lỗi hành vi bằng test thất bại trước khi sửa.
- Kiểm thử liên quan: 17/17 PASS (GuestCharts, GuestDashboard, GuestWorkspace), gồm một ngày, zero, missing values, đường bị ngắt, điều hướng, dữ liệu dự án bị từ chối, và giữ cảnh báo AI theo fingerprint hiện tại.
- Coverage ba file GuestCharts/GuestOverview/GuestDashboard: statements 93,54%; branches 83,52%; functions 87,95%; lines 95,45%. Đây là phạm vi đo riêng, không phải coverage toàn repository.
- Vite build PASS, còn cảnh báo bundle lớn hơn 500 kB đã có. JavaScript, không có script lint/typecheck riêng trong package. `git diff --check` PASS.
- Chrome riêng với tài khoản Khách của dự án 13: 1600×1000, 1900×1000, 390×844; đủ sáu biểu đồ, không bảng/nhân sự chi tiết lẫn vào Tổng quan; chuyển tab, báo cáo và biểu đồ một ngày hoạt động. Không có JS hoặc API error sau đăng nhập.
- Kiểm tra hình học sau cuộn cuối nội dung: menu desktop y=73 giữ nguyên, mobile y=120,5 giữ nguyên; `window.scrollY=0`, nội dung cuộn lần lượt 720/327/2119 px; không tràn ngang toàn trang. Dữ liệu kiểm chứng và ảnh nằm trong `var/workspace-ui-browser/guest-*` (ignored).

Skill: frontend-patterns, tdd-workflow và verification-loop. Không cần backend/migration hoặc thêm thư viện. Giữ các thay đổi từ tác vụ trước; chưa commit/push.

Bộ hồi quy toàn frontend sau thay đổi: **156 file / 1.425 test PASS**, lệnh `npm test --prefix Frontend -- --maxWorkers=2 --testTimeout=15000`.
