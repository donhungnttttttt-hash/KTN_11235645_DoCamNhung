# AI tổng hợp các dự án của tôi

Người dùng chốt ngày18/10/2026: tổng hợp các dự án của tài khoản trong một câu trả lời. ADMIN giữ toàn quyền theo quyết định10/10. PM/Tester/Dev dùng membership đang hoạt động và vai trò của từng dự án; không lấy danh sách project từ prompt/client làm quyền.

## Contract đã triển khai

- `POST /api/v1/ai/chats`: thêm tổ hợp `projectId=null,purpose="MY_PROJECTS",targetId=null`; server tự dựng `sourceReference="portfolio-v1:<SHA256>"`. General (`purpose=null`) và Project cũ giữ nguyên. Không cho client truyền fingerprint hoặc project IDs để mở rộng quyền.
- Thread/list giữ DTO cũ; `purpose` cho biết scope portfolio. Model/provider vẫn cố định. Source reference là dấu vết phạm vi, không là credential.
- Fingerprint gồm role toàn cục và project ID/role/membership version đang được cấp, sắp xếp ổn định. Mọi read/reserve/complete so với quyền hiện hành trong transaction ngắn. Khi phạm vi quyền đổi, thread bị ẩn/404; tạo hội thoại mới để dùng quyền mới. Đây là cách giữ lịch sử nhiều dự án không lộ dữ liệu đã mất quyền.
- Snapshot lấy thông tin dự án, KPI cùng định nghĩa ReportMetrics (NA loại mẫu số, P chưa thực thi, không tính DRAFT), công việc/case của chính người hỏi và nguồn đối chiếu. Phạm vi lớn bị giới hạn/rút gọn theo ngân sách hiện có và luôn thông báo phần chưa bao quát; không bịa dữ liệu thiếu.
- Bộ câu hỏi gợi ý: danh sách dự án; tiến độ kiểm thử; công việc/case còn lại; bug/công việc đang được giao cần ưu tiên. Theo yêu cầu tiếp theo18/10, bấm câu hỏi có sẵn gửi ngay qua luồng send chung, giữ nguyên bản nháp tự viết; khóa khi chưa đủ điều kiện gửi. Nội dung tự viết vẫn dùng Gửi/Enter. Có thể hỏi tiếp, vẫn chỉ dùng dữ liệu được cấp.
- UI mặc định portfolio cho hội thoại mới; theo yêu cầu tiếp theo18/10 panel chỉ chọn phạm vi, dự án cụ thể dùng `PROJECT_CHAT` không cần task/target. General cũ vẫn đọc/gửi theo scope cũ. Mở panel không tự gửi snapshot; bấm gợi ý là thao tác gửi chủ động.

Flyway V30 mở rộng đúng constraint scope; không sửa migration đã áp dụng hoặc thêm quyền nghiệp vụ. Kiểm chứng native cần schema test riêng, không ghi fixture lên database dùng. Snapshot demo không là bằng chứng chất lượng mọi tác vụ AI; không tự ký nghiệm thu S11.

Đã kiểm chứng local: 893 test frontend, 162 test backend AI, 9 test HTTP/MySQL và 14 test runner PASS; fresh/upgrade V30 trên schema riêng, live hai dự án giả lập PASS. Backend8080 đã lên V30, dữ liệu cũ giữ nguyên; xem [báo cáo và giới hạn](../reviews/2026-10-18-ai-my-projects.md). S11 giữ IN_REVIEW; không commit/push.
