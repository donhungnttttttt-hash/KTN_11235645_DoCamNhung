# Lưu trữ và mở lại dự án — 08/10/2026

Người dùng cho phép lựa chọn quy tắc có lợi cho khách hàng, triển khai rồi đánh giá lại. Phạm vi này bổ sung cho đợt cải tiến khách hàng trên `system-design`; không thay đổi trạng thái BUG/QA hoặc kết quả test đã chốt.

## Quyết định

- ADMIN tổng được lưu trữ/mở lại dự án. Bắt buộc lý do, version hiện hành và mã yêu cầu để thử lại không ghi trùng. Lịch sử ghi người thực hiện, thời điểm, lý do và chuyển trạng thái.
- Lưu trữ là đưa dự án sang chỉ đọc, không xóa tài liệu, phiên, kết quả, ticket hoặc audit. Thành viên vẫn tra cứu và xuất dữ liệu theo quyền hiện hành. Không tự kết thúc việc, trả máy hoặc sửa kết quả.
- Kiểm tra trước khi lưu trữ: phiên DOING/PAUSED, máy chưa thu hồi, ticket chưa terminal theo danh mục, đợt ACTIVE hoặc đợt DRAFT đã có run, retest OPEN, công việc Redmine QUEUED/RETRY_WAIT/RUNNING đều chặn. Đợt DRAFT trống không chặn.
- Backend kiểm tra lại trong transaction khi nhận lệnh; kết quả checklist không phải giấy phép ghi và không tránh được kiểm tra xung đột. Dùng khóa dự án chung với các thao tác nghiệp vụ có liên quan.
- Redmine FAILED/UNCERTAIN/CONFLICT hiển thị cảnh báo riêng, không thành blocker vĩnh viễn. Dữ liệu lỗi được giữ nguyên; sau lưu trữ, muốn đối chiếu/thử lại thì Admin phải mở lại dự án trước. Không tự gửi lại ra ngoài.
- Mở lại cần quyền ADMIN, lý do và version; không tự cấp lại máy, tạo phiên hay mở lại ticket đã kết thúc.
- Không thêm nút bỏ qua blocker. Việc không còn cần làm phải được người có quyền kết thúc bằng luồng riêng, có lý do; trạng thái hoàn tất, không xử lý và không tái hiện không được đánh đồng.
- PM dự án được kết thúc TASK/REQUEST/IMPROVEMENT sang `closed` (Hoàn thành) hoặc `wontfix` (Không xử lý), bắt buộc lý do/version/lịch sử. Mở lại từ terminal chỉ về `open`. Không dùng `unreproducible` hoặc build sửa lỗi cho công việc thường; BUG/QA giữ luồng typed riêng. Quy tắc này giải quyết đường cụt: trước đây generic transition chặn mọi terminal, khiến dự án có công việc thường không thể lưu trữ.

## Trải nghiệm

Màn chi tiết dự án của Admin hiển thị trạng thái, checklist và số việc còn vướng; hướng xử lý nêu đúng vai trò. Form lý do giữ nguyên khi lỗi mạng/xung đột. Chỉ thông báo thành công sau phản hồi backend; refresh dữ liệu đọc sau lệnh. Workspace ghi rõ “đã lưu trữ, chỉ đọc”; tên dự án vẫn có trong bộ chọn để đọc hồ sơ.

## Kiểm chứng và đánh giá lại

Viết regression hành vi trước sửa. Dùng schema native MySQL 3307 riêng `tms_docstest_202610080021` để kiểm thử V20→V21, quyền, dữ liệu giữ nguyên, blocker, version/replay và giao dịch đồng thời. Không tạo fixture trên `tms`. Chạy build, kiểm tra Java, contract, UI ở các kích thước và rà lại từ vai trò Admin/PM/Tester/Dev. Báo cáo kết quả thực tế và giới hạn tại `docs/reviews/2026-10-08-customer-reassessment.md` khi hoàn tất.

Skills: `brainstorming`, `api-design`, `security-review`, `frontend-patterns`, `ui-ux-pro-max`, `tdd-workflow`, `verification-loop`, `ponytail`, `code-review-and-quality`. Quyết định đã được ủy quyền trong yêu cầu mới; không hỏi lại phê duyệt chung. Review mô phỏng khách hàng không thay cho UAT có người dùng thật.
