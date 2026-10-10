# Trợ lý AI theo vai trò trong TMS

## Mục tiêu và quyết định

Người dùng yêu cầu AI cho mọi tài khoản, phục vụ công việc riêng của Admin, PM, Tester và Dev; kết quả phải lưu tạm trong database. Tiếp tục trên `system-design`, giữ React JavaScript + Spring Boot + MySQL/Flyway. Đây là một phân hệ mới (architectural), mở rộng phạm vi nền kết nối đã bắt đầu.

Chọn các tác vụ có nguồn dữ liệu và nút thao tác rõ ràng trong một màn **Trợ lý AI**. So với chat tự do, cách này kiểm soát được quyền, dữ liệu gửi và đánh giá đầu ra. So với agent tự ghi ticket/kết quả, bản nháp để người dùng duyệt phù hợp luồng trách nhiệm hiện có. Không xây kho vector/agent framework hoặc thêm dependency khi SQL và client HTTP hiện có đáp ứng.

## Tác vụ phiên bản đầu

| Vai trò hiệu lực | Tác vụ | Dữ liệu được dùng | Kết quả |
| --- | --- | --- | --- |
| Admin toàn hệ thống | Rà soát dự án được chọn | Số thành viên, thiết bị, công việc, mốc và trạng thái dự án | Tổng hợp tình hình, điểm cần hỏi PM, dữ liệu còn thiếu |
| PM dự án | Báo cáo tiến độ | Công việc/file/phiên test và mốc của dự án | Báo cáo tiến độ, tồn đọng, hành động đề xuất |
| PM dự án | Hỗ trợ phân công file | File được chọn; tester đang hoạt động, công việc/thiết bị hiện có | Các phương án phân công dựa trên dữ kiện, không chấm năng lực hoặc tự gán người |
| Tester dự án | Báo cáo công việc cá nhân | File/phiên test và ticket của chính tester trong dự án | Báo cáo để gửi PM, phần bị chặn và kế hoạch tiếp theo |
| Tester dự án | Soạn mô tả bug | Ticket được chọn thuộc công việc của tester | Bản nháp mô tả và danh sách thông tin còn thiếu; không bịa bước/actual/evidence |
| Dev dự án | Rà soát ticket | Ticket được giao và thông tin liên quan trong cùng dự án | Điểm thiếu, câu hỏi gửi tester/PM, gợi ý kiểm tra và phản hồi |

Tìm kiếm hỗ trợ Dev ở phiên bản đầu chỉ trong dữ liệu dự án mà người dùng có quyền đọc. Chưa có tìm kiếm internet hoặc truy cập source repository của khách hàng. Có quyền AI không làm tăng quyền ghi test, đóng bug hay phân công. Tài khoản chưa được giao dự án thấy hướng dẫn nhận phân công thay vì dữ liệu dự án khác.

## Nguồn và chất lượng

Backend chọn và giới hạn dữ liệu; trình duyệt gửi mã tác vụ và đối tượng được chọn, không gửi system prompt. Mỗi nguồn có mã tham chiếu và version/thời điểm. Đầu ra có tiêu đề, tóm tắt, nhận xét, hành động đề xuất và thông tin còn thiếu. Những nhận xét dựa trên dữ liệu phải có mã nguồn hợp lệ. Backend kiểm tra hình dạng, độ dài và mã nguồn; người dùng kiểm tra tính đúng đắn trước khi sử dụng.

Không suy diễn chất lượng nhân sự từ tốc độ hoặc số OK/NG. Không tự tính dự án “trễ” khi thiếu ngày kế hoạch. Nội dung ticket/Excel là dữ liệu, không được coi là lệnh điều khiển AI. Không gửi khóa, mật khẩu, cookie hoặc cấu hình hệ thống. Trước khi tạo, UI thông báo dữ liệu tác vụ được xử lý qua OpenAI.

## Lưu tạm và quyền

Flyway V23 tạo `ai_generated_drafts`: dự án, người yêu cầu, loại tác vụ, nguồn/phiên bản prompt, idempotency key/hash, trạng thái GENERATING/READY/FAILED, model, response ID, token usage, nội dung JSON, thời gian tạo/hoàn thành/hết hạn. Bản nháp chỉ người tạo có quyền theo vai trò hiện hành được đọc; không chia sẻ sang người khác mặc định.

Mặc định lưu 7 ngày, cấu hình trong khoảng 1–30 ngày. Nội dung hết hạn không thể đọc ngay từ thời điểm hết hạn; job xóa theo lô 500 mỗi giờ. Bản nháp không phải dữ liệu nghiệp vụ chính thức. Khi áp dụng phải qua thao tác và API nghiệp vụ hiện có; phiên bản đầu cho xem, chỉnh bản nháp và sao chép.

Gửi lại cùng request key trong thời gian lưu trả đúng yêu cầu cũ, không tự gọi API thêm. Nội dung thay đổi với cùng key trả 409. Reservation và lưu kết quả là transaction ngắn; không giữ khóa database lúc đợi OpenAI. Kiểm tra lại quyền trước khi lưu và đọc. Lỗi quota/token/auth/rate/timeout được lưu dưới dạng mã nội bộ, không lưu raw provider error.

## Giới hạn và UI

- Mặc định AI tắt; cấu hình bật và có API credit mới gọi thật được. API không làm ảnh hưởng thao tác nghiệp vụ thông thường khi AI lỗi.
- Giới hạn 20 yêu cầu/dự án/ngày (UTC), kể cả lần lỗi; thêm 20 lần/phút UTC/tiến trình, tự phục hồi khi sang phút mới. Cấu hình tăng trong giới hạn 100; đây là giới hạn số request, không phải trần tiền của OpenAI.
- Request tối đa 16 KB, response tối đa 64 KB, timeout tối đa 30 giây; không retry/redirect. `store:false` không thay thế chính sách lưu dữ liệu của nhà cung cấp.
- Menu Trợ lý AI ở không gian dự án và Admin, sử dụng màu/controls dùng chung. Tác vụ theo role, chọn đối tượng khi cần, tạo bản nháp, xem lịch sử và hạn lưu. Có empty/loading/error, chống double-click, giữ request key khi timeout, bỏ response cũ khi đổi dự án. Bố cục 375/768/1366 px.
- Khi AI hết tiền: hiển thị rõ tạm chưa tạo được, người dùng vẫn xem bản nháp còn hạn và làm việc bình thường. Không hiển thị key hoặc form diagnostics trên web.

## Điều kiện nghiệm thu

1. Bốn vai trò dùng đúng tác vụ; cross-project, sai role, khóa tài khoản, session cũ và quyền bị thu hồi bị chặn ở backend.
2. Nội dung sinh được lưu trước khi báo READY; refresh đọc lại từ MySQL. Lỗi không trở thành kết quả giả; gửi trùng không tính thêm request.
3. Hết hạn/cleanup/quota có test; V23 fresh + upgrade giữ nguyên dữ liệu cũ trên schema riêng.
4. Có test prompt injection/citation không hợp lệ và xác nhận không tự ghi test/ticket/phân công.
5. FE test thao tác và kiểm tra responsive bằng browser; báo riêng kết quả mock và gọi OpenAI thật.

Giới hạn hiện tại: live request đang trả `credit_balance_exhausted` / `insufficient_quota`. Code/test độc lập tiếp tục; chưa được tuyên bố chất lượng AI live đạt nghiệm thu khi chưa có API credit và đánh giá bản nháp thật.
