# Quản lý công việc

Các component dùng chung của ứng dụng chính. Khu vực thiết kế độc lập đã được gỡ bỏ.

- `HomePage.jsx`: hoạt động, thống kê trạng thái và mốc phát hành cho Tổng quan dự án.
- `BoardPage.jsx`, `IssuesPage.jsx`: hai chế độ Kanban / Danh sách.
- `IssueForm.jsx`, `components.jsx`: thêm công việc, chi tiết, bình luận và các thành phần giao diện.
- `ProjectData.jsx`: dữ liệu dùng chung; tạo mới và cập nhật trạng thái sinh hoạt động trên tổng quan.
- `issueFilters.js`: cùng một cách lọc cho Kanban và danh sách.
- `work-items.css`: CSS giới hạn trong `.work-items`.

Ứng dụng dùng menu dọc `Sidebar.jsx`, thanh thông tin `Header.jsx` và khung `MainLayout.jsx`.
Menu giữ đúng sáu mục: Tổng quan, Bảng công việc, Quản lý kiểm thử, Quản lý lỗi, Quản lý tiến độ, Tổng hợp & Phân tích.
Danh sách và thao tác thêm công việc nằm bên trong Bảng công việc, không tạo thêm mục menu.
Các liên kết cũ được chuyển hướng bởi `routes/legacyRoutes.js`, không tải giao diện thiết kế cũ.

| Đường dẫn | Nội dung |
| --- | --- |
| `#/dashboard` | Tổng quan dự án |
| `#/dashboard/testing` | Tổng quan kiểm thử |
| `#/board` | Kanban |
| `#/board/list` | Danh sách công việc |
| `#/board/new` | Thêm công việc |
| `#/board/issue/SFLUTTER-6071?view=list` | Chi tiết bên phải |
| `#/tests` | Quản lý kiểm thử |
| `#/issues` | Quản lý lỗi |
| `#/progress` | Quản lý tiến độ |
| `#/analysis` | Tổng hợp và phân tích |

Danh sách hỗ trợ các tham số `status`, `milestone`, `keyword`, `assignee`, `advanced=true`.
Dữ liệu mẫu giữ trong bộ nhớ đến khi tải lại trang; tệp đính kèm chỉ hiển thị tên, chưa có backend.

Trong `Frontend`, chạy `rtk npm run dev`; kiểm tra biên dịch bằng `rtk npm run build`.
