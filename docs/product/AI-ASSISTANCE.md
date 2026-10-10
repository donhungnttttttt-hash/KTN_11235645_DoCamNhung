# Trợ lý AI theo vai trò

Phạm vi mở rộng được người dùng yêu cầu ngày 09/10/2026. Trợ lý xuất hiện ở menu dự án (`/ai`) và menu Admin (`/admin/ai`, chọn dự án). Quyền lấy từ backend tại thời điểm thao tác, không dựa vào việc ẩn menu.

| Người dùng | Tác vụ | Phạm vi dữ liệu |
| --- | --- | --- |
| Admin | Rà soát dự án | Nguồn lực, trạng thái công việc, kết quả đợt đang chạy và mốc dự án đã chọn |
| PM | Soạn báo cáo tiến độ | Kết quả thực thi mới nhất trong đợt ACTIVE; công việc, thiết bị, cảnh báo hạn từ quy tắc hiện có |
| PM | Gợi ý phân công file | File đã được đưa vào công việc theo file; tối đa 10 Tester hoạt động, khối lượng case, phiên đang làm, tối đa 3 máy/người |
| Tester | Tổng hợp công việc của tôi | Lượt test, ticket do mình tạo, tối đa 8 phiên gần nhất trong 14 ngày |
| Tester | Hoàn thiện mô tả bug | Bug mình tạo hoặc được giao; bước tái hiện, expected/actual, build và thiết bị đã ghi |
| Dev | Rà soát ticket được giao | BUG/QA hiện được giao; thông tin còn thiếu, câu hỏi cần xác nhận và tối đa 3 ticket cùng dự án có từ khóa liên quan |

Gợi ý nhân sự không phải xếp hạng năng lực. Dữ liệu hiện chưa có lịch rảnh, chuyên môn hoặc kinh nghiệm đã được xác nhận; AI phải nêu giới hạn và PM đối chiếu tương thích thiết bị trước khi phân công. Dev tìm kiếm nội bộ dự án; chưa tích hợp tìm Internet hay phân tích repository. AI không tự bịa bằng chứng, nguyên nhân hoặc số liệu.

## Luồng sử dụng

1. Đăng nhập, chọn dự án, vào **Trợ lý AI**. Backend trả các tác vụ của vai trò hiện tại.
2. Chọn tác vụ; chọn file/ticket nếu cần. Tìm theo từ khóa nếu danh sách dài.
3. Chọn **Tạo bản nháp**. Backend dựng snapshot tối thiểu, giữ mã yêu cầu rồi gọi OpenAI ngoài transaction database.
4. Chỉ hiển thị thành công sau khi lưu kết quả hợp lệ. Lỗi provider được lưu bằng mã cố định, không lưu raw error hoặc khóa. Timeout dùng **Kiểm tra lại yêu cầu**, không tự phát sinh lần gọi mới.
5. Đối chiếu nguồn, chỉnh nội dung, chọn **Lưu chỉnh sửa** hoặc **Sao chép** để đưa vào báo cáo/ticket qua luồng nghiệp vụ hiện có. Bản AI ban đầu vẫn được giữ để so sánh.
6. Đọc lại ở **Bản nháp của bạn**. Một bản nháp chỉ chủ sở hữu được đọc; mất quyền dự án hoặc bị chuyển ticket sẽ chặn truy cập tương ứng.

## Lưu tạm và kiểm soát

- Flyway **V23**, bảng `ai_generated_drafts`: owner, project, tác vụ/nguồn, request key/hash, trạng thái, model, nội dung JSON, text đã sửa/version, token usage và thời gian tạo/hết hạn.
- TTL mặc định **7 ngày**, cấu hình 1–30 ngày; API ẩn ngay khi hết hạn, job dọn tối đa 500 bản/giờ. Đây không phải kho lưu báo cáo vĩnh viễn. Sao chép vào nghiệp vụ trước khi hết hạn nếu cần giữ lâu.
- Mặc định 20 yêu cầu/dự án/ngày UTC, đếm trong database. Provider giới hạn thêm 20 lần gọi/phút UTC trên mỗi process, tự phục hồi ở phút tiếp theo. Không retry tự động; kết quả FAILED muốn tạo lại phải chủ động gửi yêu cầu mới.
- Snapshot dài được rút gọn theo kích thước UTF-8 thực tế của request (16 KB gồm prompt/schema), ưu tiên nguồn chính và đánh dấu `truncated`. Nguồn được cung cấp có thể chưa bao quát toàn bộ dự án.
- Chỉnh sửa chưa lưu được giữ trong bộ nhớ của phiên tài khoản khi đổi bản nháp, dự án hoặc menu; tải lại trang có cảnh báo. Chỉ nút **Lưu chỉnh sửa** mới lưu nội dung sửa vào database; đăng xuất xóa bộ nhớ này.
- Mã yêu cầu xác định tác vụ + đối tượng; gửi lại lấy snapshot cũ kể cả dữ liệu nguồn đã đổi. Muốn đánh giá dữ liệu mới, tạo bản nháp mới.
- JSON được kiểm tra kiểu dữ liệu, kích thước và ID nguồn; hiển thị như text, không chạy HTML từ model. Dữ liệu trong ticket không được xem là chỉ dẫn hệ thống.
- Tạo/sửa chặn khi dự án đã lưu trữ; đọc bản còn hạn vẫn được. Mỗi lần đọc/ghi kiểm tra lại tài khoản, phiên, role và quyền với nguồn.
- Quyền AI không thay đổi quy tắc phân công, ghi kết quả, bug/retest, đóng lỗi hoặc gửi Redmine. Không gửi thông báo tự động.

## Kết nối và giới hạn nghiệm thu

Khóa chỉ nằm ở backend `OPENAI_API_KEY`; tên hiển thị của khóa trên OpenAI (ví dụ `project`) không phải tên biến cấu hình. Bật `TMS_OPENAI_ENABLED=true` trong cấu hình server rồi khởi động lại. Không dùng biến `VITE_*` cho khóa. Mẫu cấu hình ở [env example](../../.env.mysql.example).

Kết quả gọi live kiểm tra ngày 09/10: **429 insufficient_quota / credit_balance_exhausted**. Chưa xác nhận chất lượng nội dung model thật và chưa gửi dữ liệu dự án trong kiểm thử live. Chỉ thử lại sau khi tài khoản API có số dư. Kiểm thử tự động dùng provider giả định và MySQL riêng, không thay thế nghiệm thu chất lượng AI với người dùng.

API chi tiết: [contract](../api/ai-assistance.md), [OpenAPI](../api/ai-assistance.openapi.json). Thiết kế: [spec](../superpowers/specs/2026-10-09-role-ai-design.md). Kế hoạch: [implementation](../superpowers/plans/2026-10-09-role-ai.md).
