# Bảng tài liệu và phân công test lần 2

Yêu cầu đã chốt: đưa phân trang/cỡ chữ lên thanh công cụ; sửa ô bằng nhấp đúp; PM phân công test lần 2 gắn với lượt chạy thật; ẩn cột nguồn trống, giữ nội dung nguồn có dữ liệu. Không commit/push.

- Giữ bản Excel gốc và các phiên bản đã thực thi. Sửa nội dung case tạo revision mới cần PM duyệt; sửa ô phụ có phiên bản và lịch sử riêng.
- Phân công lần 2 tạo run trong cấu hình của đợt nháp do PM chọn. Chỉ Tester đang hoạt động trong dự án được nhận. PM bắt đầu đợt; người được giao ghi kết quả bằng luồng thực thi hiện có. Đổi người nhận dùng lịch sử phân công hiện có.
- N/O trống được thay bằng cột nghiệp vụ; nếu N/O có dữ liệu thì giữ nguyên và thêm cột nghiệp vụ riêng. Không xóa dữ liệu P; chỉ ẩn cột nguồn không có tiêu đề/nội dung.
- Làm rõ trạng thái chỉ xem, bỏ liên kết Công việc theo file khỏi Tổng quan dự án; giữ Kanban theo cột trạng thái và bổ sung chuyển chế độ rõ ràng.
- Kiểm chứng: test lỗi trước sửa, frontend/build, backend/native MySQL schema riêng, kiểm tra giao diện thực. Không tạo dữ liệu thử trong database sử dụng.

Skills: ui-ux-pro-max, frontend-patterns, api-design, security-review, verification-loop.

Trạng thái: COMPLETE_LOCAL / IN_REVIEW — đã triển khai và kiểm chứng local; chờ người dùng UAT. Không commit/push.

Bằng chứng cuối: [review](../reviews/2026-10-10-document-workspace.md). Frontend 748 test/69 file và build PASS; backend 237 test hồi quy, 11 test document integration, 10 test file-work/QA và 5 test concurrency PASS trên schema riêng. Flyway V27 đã áp dụng local sau backup. Không đo coverage toàn sản phẩm.
