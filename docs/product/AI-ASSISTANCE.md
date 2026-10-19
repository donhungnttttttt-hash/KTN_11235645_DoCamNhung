# Trợ lý AI theo vai trò

Phạm vi chat tổng hợp **Các dự án của tôi** và bốn câu hỏi có sẵn đã được bổ sung ngày18/10/2026; xem [triển khai, kiểm chứng và giới hạn](../reviews/2026-10-18-ai-my-projects.md). Kết quả local không thay thế nghiệm thu chất lượng câu trả lời trên dữ liệu thực.

Theo yêu cầu tiếp theo18/10, panel chat chỉ chọn **Phạm vi chat**: mặc định toàn bộ dự án được phép, chọn một dự án dùng `PROJECT_CHAT` tự lấy ngữ cảnh. Không có tác vụ/tìm nguồn/file-ticket trong panel; gợi ý gửi ngay và nhập tự do đều dùng cùng scope. Tác vụ soạn báo cáo/gợi ý theo vai trò ở màn Trợ lý AI bên dưới vẫn là chức năng riêng.

Phạm vi mở rộng được người dùng yêu cầu ngày 09/10/2026. Trợ lý xuất hiện ở menu dự án (`/ai`) và menu Admin (`/admin/ai`, chọn dự án). Quyền lấy từ backend tại thời điểm thao tác, không dựa vào việc ẩn menu.

| Người dùng | Tác vụ | Phạm vi dữ liệu |
| --- | --- | --- |
| Tài khoản nội bộ | Tổng hợp các dự án của tôi | Membership đang hoạt động; ADMIN toàn bộ dự án; KPI cùng định nghĩa báo cáo, mẫu công việc/case chỉ của người hỏi, nguồn/thời điểm/giới hạn rõ |
| Admin | Rà soát dự án | Nguồn lực, trạng thái công việc, kết quả đợt đang chạy và mốc dự án đã chọn |
| PM | Soạn báo cáo tiến độ | Kết quả thực thi mới nhất trong đợt ACTIVE; công việc, thiết bị, cảnh báo hạn từ quy tắc hiện có |
| PM | Gợi ý phân công file | File đã được đưa vào công việc theo file; tối đa 10 Tester hoạt động, khối lượng case, phiên đang làm, tối đa 3 máy/người |
| Tester | Tổng hợp công việc của tôi | Lượt test, ticket do mình tạo, tối đa 8 phiên gần nhất trong 14 ngày |
| Tester | Hoàn thiện mô tả bug | Bug mình tạo hoặc được giao; bước tái hiện, expected/actual, build và thiết bị đã ghi |
| Dev | Rà soát ticket được giao | BUG/QA hiện được giao; thông tin còn thiếu, câu hỏi cần xác nhận và tối đa 3 ticket cùng dự án có từ khóa liên quan |

Gợi ý nhân sự không phải xếp hạng năng lực. Dữ liệu hiện chưa có lịch rảnh, chuyên môn hoặc kinh nghiệm đã được xác nhận; AI phải nêu giới hạn và PM đối chiếu tương thích thiết bị trước khi phân công. Dev tìm kiếm nội bộ dự án; chưa tích hợp tìm Internet hay phân tích repository. AI không tự bịa bằng chứng, nguyên nhân hoặc số liệu.

User chốt18/10 **tổng hợp nhiều dự án trong một câu trả lời**. Chat có scope `MY_PROJECTS` và bốn gợi ý bấm gửi ngay. Scope dùng fingerprint quyền do server dựng, kiểm tra khi đọc/list/history/reserve/complete. Quyền thay đổi yêu cầu hội thoại mới để không lộ lịch sử ngoài quyền; General/Project cũ giữ nguyên. Snapshot tối đa30 dự án rồi rút gọn theo ngân sách hiện có; từng mẫu việc/case tối đa5, dự án lưu trữ chỉ có metadata. Chat riêng dự án dùng PROJECT_CHAT không cần chọn tác vụ/nguồn; [kiểm chứng scope](../reviews/2026-10-18-ai-chat-scope.md), [thiết kế](../planning/2026-10-18-ai-my-projects.md), [API chat](../api/ai-chat.md).

## Luồng sử dụng

1. Đăng nhập, chọn dự án, vào **Trợ lý AI**. Admin mở **Dự án cần hỗ trợ** và gõ tên hoặc mã ngay trong dropdown để tìm, rồi chọn kết quả; không cần nút tìm riêng. Gõ từ khóa hoặc đóng dropdown chưa làm thay đổi dự án đang chọn. Backend trả các tác vụ của vai trò hiện tại.
2. Chọn tác vụ; chọn file/ticket nếu cần. Tìm theo từ khóa nếu danh sách dài.
3. Chọn nguồn/model ở phía trên **Tác vụ AI**, rồi chọn **Phân tích**. Backend dựng snapshot tối thiểu, giữ mã yêu cầu và gọi nguồn đã chọn ngoài transaction database; kết quả được lưu thành bản nháp để đối chiếu.
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

Kết quả gọi API live ngày 09/10 với cấu hình cũ: **429 insufficient_quota / credit_balance_exhausted**. Đây là bằng chứng lịch sử, không phải trạng thái của cấu hình Caheo bên dưới. Không tự mua credit; kiểm thử tự động với provider giả định không thay thế nghiệm thu chất lượng AI với người dùng.

Cập nhật ngày 18/10 theo yêu cầu người dùng: backend hỗ trợ `TMS_OPENAI_BASE_URL`, mặc định `https://api.openai.com/v1`; chỉ cho phép HTTPS tới `api.openai.com` hoặc `caheoai.com` với đường dẫn `/v1`, không chuyển tiếp redirect. Cấu hình local hiện dùng `https://caheoai.com/v1` và `TMS_OPENAI_MODEL=gpt-5.6-luna`. Key chỉ được lưu trong file cấu hình backend local ngoài Git, có bản sao cấu hình cũ được bảo vệ; không đưa vào frontend hoặc registry Windows. Startup loader nạp endpoint cùng key/model, thay đổi cấu hình cần khởi động lại backend.

Kiểm tra Caheo ngày 18/10: danh sách model HTTP 200 có `gpt-5.6-luna`; một probe tổng hợp qua `OpenAiResponsesClient` nhận JSON đúng schema, 2.428 input token/22 output token theo provider. Không gửi dữ liệu dự án và không retry tự động. Backend đã khởi động lại, readiness HTTP 200; metadata của phiên ADMIN trả **API của hệ thống**, available=true, model `gpt-5.6-luna`. Người dùng tải lại trang và chọn nguồn/model này; hội thoại cũ giữ nguyên nguồn/model, cần tạo hội thoại mới để dùng cấu hình mới. Chất lượng phân tích nghiệp vụ và các tác vụ có snapshot dự án vẫn cần người dùng đánh giá. [Bằng chứng và giới hạn](../reviews/2026-10-18-caheo-ai-connection.md).

Mở rộng ngày 10/10 có ba nguồn **API của hệ thống**, **ChatGPT cá nhân**, **Ollama local** và một panel **Chat AI** dùng trên các trang đã đăng nhập. Chat chung không gửi snapshot dự án; chat theo công việc chỉ dùng dự án/tác vụ/file/ticket đã được server cho phép. Hội thoại giữ cố định nguồn/model/phạm vi, lưu riêng theo tài khoản trong MySQL bảy ngày; đọc lại vẫn kiểm tra quyền hiện tại. Chat và bản nháp không tự sửa dữ liệu nghiệp vụ. Cách dùng: [giao diện AI](../ai-assistance-ui.md), [provider contract](../api/ai-providers.md), [chat contract](../api/ai-chat.md).

Phản hồi tiếp theo18/10: probe kết nối chưa bao phủ chat; đã tái hiện Caheo dùng field `answer` sai contract và sửa chỉ dẫn nêu rõ field `text`, giữ validation. UI Enter hiện câu hỏi/xóa composer ngay, giữ bản soạn mới và có gửi lại tường minh. Live đúng contract và Chrome chat thật đều trả lời thành công, đọc lại thread3 được. [Sửa lỗi và kiểm chứng mới](../reviews/2026-10-18-caheo-chat-send.md); không suy từ câu chào sang chất lượng mọi tác vụ AI.

ChatGPT cá nhân chỉ dành cho đúng TMS owner đã cấu hình trên máy loopback. Owner bàn giao local dự kiến là **admin.local**, không phải tài khoản demo dùng chung; người dùng phải tự hoàn tất đăng nhập/consent chính thức rồi chủ động kiểm chứng model. Gói ChatGPT, quyền ứng dụng và thanh toán API có trạng thái riêng; chưa có bằng chứng live nào cho ChatGPT trong bàn giao này. Ollama chưa được cài và chưa có model local. Xem [thiết lập và bàn giao](../operations/local-ai.md) cùng [bằng chứng kiểm chứng](../reviews/2026-10-10-ai-providers-chat-handover.md).

API chi tiết: [contract](../api/ai-assistance.md), [OpenAPI](../api/ai-assistance.openapi.json). Thiết kế: [spec](../superpowers/specs/2026-10-09-role-ai-design.md). Kế hoạch: [implementation](../superpowers/plans/2026-10-09-role-ai.md).
