# Tích hợp OpenAI — 09/10/2026

**Cập nhật 10/10:** người dùng mở rộng AI cho mọi vai trò và yêu cầu lưu nội dung tạm trong DB. Phần kế hoạch nền dưới giữ lịch sử; các giới hạn “chưa có endpoint/UI, chỉ PM” được thay bằng [spec theo vai trò](../superpowers/specs/2026-10-09-role-ai-design.md), [kế hoạch triển khai](../superpowers/plans/2026-10-09-role-ai.md) và [đặc tả sản phẩm](../product/AI-ASSISTANCE.md). Live vẫn bị chặn bởi số dư API, không thử lại khi chưa thay đổi Billing.

## Phạm vi hiện tại

Người dùng đã tạo khóa có tên hiển thị `project` và lưu `OPENAI_API_KEY` vào `.env.mysql.local`. Tên hiển thị không phải model, project ID hay tên biến cấu hình. Nhánh làm việc: `system-design`.

Đợt này hoàn thành nền kết nối backend và công cụ kiểm tra bằng dữ liệu giả. Hai lần gọi thử Responses API bằng câu nhắc ngắn ngày 09/10 trả HTTP 429; lần phân loại xác nhận `credit_balance_exhausted` / `insufficient_quota`. Chưa có lần sinh nội dung thành công. Không gửi dữ liệu dự án và không nạp tiền/thay đổi Billing thay người dùng.

## Thiết kế nền kết nối

- Client Java dùng HTTPS cố định `https://api.openai.com/v1/responses`; không nhận URL từ trình duyệt, không chuyển hướng, không tự retry.
- Khóa chỉ được đọc ở backend; không ghi vào DTO, log, thông báo lỗi, Git hoặc frontend. Profile local đã import `.env.mysql.local`.
- Mặc định tắt. Việc thêm khóa không tự sinh lưu lượng hoặc đổi hành vi nghiệp vụ.
- Responses API dùng `store: false`, Structured Outputs và giới hạn input/output/timeout. `store: false` không đồng nghĩa toàn bộ dữ liệu được miễn lưu giữ: xem chính sách dữ liệu của nhà cung cấp.
- Giới hạn số lần gọi trên mỗi tiến trình nhằm hạn chế thử nghiệm; chưa phải ngân sách bền vững cho nhiều instance. Không cung cấp endpoint AI cho người dùng trước khi có phân quyền, quota bền vững và audit theo use case.
- Lỗi quota, xác thực, rate limit, timeout, từ chối sinh nội dung và dữ liệu đầu ra không hợp lệ có mã riêng; không chuyển tiếp body lỗi của OpenAI.
- Công cụ kiểm tra chỉ gửi yêu cầu trả JSON `{"ok":true}`, chạy độc lập database. Bộ test thường chỉ dùng HTTP server localhost với khóa giả.

## Bước tiếp theo: gợi ý phân công tester

Chưa triển khai trong đợt nền kết nối này. Cần nối trọn luồng PM theo file/đợt/build: lọc thành viên hợp lệ ở backend, lấy khối lượng công việc/thiết bị trong phạm vi quyền, cung cấp nguồn và khoảng trống dữ liệu. Không suy ra năng lực từ số lượng OK/NG, không dùng dữ liệu demo làm bằng chứng chuyên môn. PM quyết định; API phân công hiện có vẫn kiểm tra lại quyền/version/trạng thái.

Trước khi bật tính năng: kiểm thử live sau khi tài khoản API có số dư, chốt dữ liệu tối thiểu được gửi và đánh giá chất lượng bằng tình huống đã gán nhãn. Chưa gửi Excel, tên người, ticket hay dữ liệu khách hàng ở bước kiểm tra kết nối.

## Kiểm chứng

Viết test trước implementation cho request/response, lỗi quota thực tế, timeout, redirect, giới hạn, khóa/config và opt-in live probe. Báo cáo kết quả tại `docs/reviews/2026-10-09-openai-connection.md` sau kiểm tra. Không migration, không thay đổi UI, không đánh dấu tính năng gợi ý tester hoàn tất.

Nguồn chính thức đã đối chiếu: [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [data controls](https://developers.openai.com/api/docs/guides/your-data).
