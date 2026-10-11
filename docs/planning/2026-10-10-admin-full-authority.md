# Admin tổng có toàn quyền và khôi phục nút kết quả

## Quyết định mới của người dùng

- ADMIN có toàn quyền nghiệp vụ trên mọi dự án, kể cả không có membership hoặc membership không phải PM. Quyết định này thay thế chế độ Admin quan sát và ngoại lệ chỉ import trước đó.
- Nút kết quả tài liệu bấm một lần chuyển: Unexecuted → OK → NG → P → NA → Unexecuted. Dòng import mới bắt đầu UNEXECUTED; kết quả đã lưu và file gốc không bị reset.
- Chưa có quyền commit/push/merge/deploy. Giữ nhánh `system-design` và trạng thái S11 IN_REVIEW.

## Đối chiếu lịch sử và nguyên nhân

`ResultCycleButton` và cơ chế autosave chưa bị xóa. Commit `496378b` thêm `isProjectObserver` vào `TestDocumentPage`, vô hiệu hóa nút của Admin chưa có membership. Backend cũng từ chối qua membership/PM/assignee guards. Vòng cũ còn `Fixed` và có thứ tự P trước NG.

## Thực hiện

1. Frontend cho Admin chỉnh sửa, duyệt, phân công, ghi kết quả; capability backend cho công việc, file, QA và retest phải thống nhất.
2. Giữ khóa dự án lưu trữ, quy tắc mở/chốt đợt, phiên bản, CSRF, idempotency, kiểm tra dữ liệu và project scope. Admin dùng lệnh mở lại tương ứng trước khi sửa dữ liệu đã chốt.
3. Lịch sử cũ dùng khóa ngoại membership: khi Admin ghi lần đầu, tạo liên kết tác giả `MEMBER`, **active=false**, nếu chưa có. Không tự cấp PM/Tester, không tăng roster đang hoạt động. Quyền luôn đến từ role ADMIN hiện hành; hạ quyền không để lại quyền dự án mới. Đọc không tạo dữ liệu.
4. V28 tách người thực hiện thực tế khỏi người nhận máy/người khởi tạo phiên, giữ FK dự án–máy–allocation–session và FK người thực hiện. Không mượn danh Tester khi Admin làm thay.
5. Kiểm thử Red→Green: vòng bấm, Admin không membership, lưu/tải lại/audit, duyệt/phân công/đợt, phiên file, QA; giữ các test âm của Tester/Dev và xung đột. Migration thử trên schema tách biệt trước khi áp dụng local.

Kết quả và giới hạn: [review](../reviews/2026-10-10-admin-full-authority.md).
