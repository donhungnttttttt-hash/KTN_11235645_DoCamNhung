# Bàn giao thay đổi local — 14/11/2026

Người dùng yêu cầu commit và push code từ máy này lên nhánh hiện tại `system-design`.

## Phạm vi

- Thiết lập Admin tổng một lần trên profile local, bật bằng cấu hình riêng; giữ UUID và không đặt lại mật khẩu sau khi đã có receipt.
- Hiển thị phần trăm trong thanh tiến độ dự án; soạn Markdown và xem trước song song trên desktop.
- Đơn giản hóa bộ lọc Kanban, giữ bộ lọc danh sách; đổi nhãn tìm ticket, bỏ nút mở màn Trách nhiệm Ticket và đổi nhãn người phụ trách trong ticket.
- Giữ trạng thái phân công trực tiếp IN_PROGRESS: quyền backend và điều kiện chọn người phụ trách chưa thay đổi. Mẫu Backlog mới chỉ được đọc tham khảo, chưa triển khai giao diện theo mẫu.

## Đồng bộ và kiểm chứng

- Fetch remote và fast-forward từ `abaf9d8` tới `c745215` trước khi áp dụng lại các thay đổi local. Conflict chỉ ở README/STATUS; giữ cả checkpoint Java 14/11 và các checkpoint local 04/11.
- Frontend: `npm test -- src/app/features/admin src/app/features/reports src/app/features/work-items src/app/pages/WorkBoardPage.test.jsx`: 459/459 test, 54 file PASS.
- Frontend: `npm run build` PASS; còn cảnh báo bundle lớn hơn 500 kB.
- Backend: `mvn -B -ntp -Dtest=SystemAdminStartupTest,SystemAdminStartupContextTest,IdentityPolicyTest,AccountPolicyTest,SessionAccountFilterTest package`: 17/17 test, không skip, BUILD SUCCESS. Các test được chọn dùng mock, không ghi database sử dụng.
- JSON kế hoạch hợp lệ; diff check sạch; rà soát đường dẫn và mẫu khóa bí mật thông dụng không phát hiện file credential/export hoặc token trong các file thay đổi.
- `.env.mysql.local`, mapping mật khẩu và backup database vẫn nằm ngoài Git.

Không chạy migration, khởi động lại ứng dụng, ghi dữ liệu nghiệp vụ, đo coverage hoặc kiểm thử trình duyệt trong lượt bàn giao này. Các bằng chứng runtime/browser ngày 04/11 là checkpoint lịch sử, không phải kiểm chứng lại ngày 14/11.

Skills: `git-workflow-and-versioning`, `verification-before-completion`. Commit/push được người dùng cho phép; kết quả và mã commit đối chiếu bằng Git cùng thông báo bàn giao sau thực thi. Các ghi chú chưa commit/push ở checkpoint cũ mô tả thời điểm trước yêu cầu này.
