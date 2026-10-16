# Quản lý công việc

Workspace hiện dùng API Spring Boot và dữ liệu MySQL. `ProjectData.jsx` tải danh sách, metadata quyền và danh mục qua API; lỗi tải được hiển thị, không thay bằng dữ liệu mẫu. Các component thiết kế cũ còn trong thư mục không chứng minh một route đang dùng dữ liệu mẫu.

- `WorkItemForm.jsx`: tạo BUG/REQUEST/TASK/IMPROVEMENT qua API; QA chuyển sang `QaForm` và endpoint chuyên biệt.
- `WorkItemDetail.jsx`: đọc chi tiết, bình luận và lịch sử; sửa/phân công, chuyển trạng thái, tham chiếu thủ công, QA, chứng cứ, retest và Redmine dùng các lệnh riêng. Trong lúc tải lại hoặc sau lỗi đọc chi tiết, khóa các thao tác và giữ bản nháp đến khi tải lại thành công.
- `EvidencePanel.jsx`: upload, download và gỡ chứng cứ đã lưu. Backend kiểm tra quyền, dự án, định dạng và chứng cứ đã được dùng trong xác minh/đóng lỗi.
- `BoardPage.jsx`, `IssuesPage.jsx`, `HomePage.jsx`: các phần trình bày được route/container truyền dữ liệu và lệnh; `ProjectData.jsx` là nguồn dữ liệu workspace hiện hành.
- `TransitionDialog.jsx`: gửi trạng thái cùng lý do và expectedVersion; lỗi 409 giữ lý do để tải và đối chiếu bản hiện hành trước khi gửi lại.

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
| `#/board/issue/{id}?view=list` | Chi tiết công việc theo ID số của backend |
| `#/tests` | Quản lý kiểm thử |
| `#/issues` | Quản lý lỗi |
| `#/progress` | Quản lý tiến độ |
| `#/analysis` | Tổng hợp và phân tích |

Danh sách hỗ trợ các tham số `status`, `milestone`, `keyword`, `assignee`, `advanced=true`.
Dữ liệu mẫu và API double trong test không là nguồn dữ liệu workspace hiện hành. `item_key` là mã hiển thị; liên kết chi tiết dùng ID số của backend. Xem `pages/WorkBoardPage.jsx` và `routes/AppRouter.jsx` để xác định component thực tế của từng màn.

Quyền hiện hành xem [permissions.md](../../../../../docs/business/permissions.md); contract xem [work-items.md](../../../../../docs/api/work-items.md), [qa.md](../../../../../docs/api/qa.md) và [retest.md](../../../../../docs/api/retest.md). ADMIN tổng có toàn quyền nghiệp vụ theo quyết định ngày 10/10/2026; quyền và ownership của PM/Tester/Dev vẫn do backend kiểm tra. Chứng cứ, bình luận và lịch sử không thay thế câu trả lời QA hoặc kết quả retest chính thức.

Trong `Frontend`, chạy `rtk proxy npm test` hoặc `rtk proxy npm run build`. Kết quả test React không đồng nghĩa đã kiểm chứng trên runtime/MySQL hoặc dịch vụ Redmine/AI thật.
