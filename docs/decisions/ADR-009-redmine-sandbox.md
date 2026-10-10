# ADR-009 — Redmine cho Sprint 9, kiểm chứng bằng sandbox nội bộ

- Ngày: 30/09/2026.
- Trạng thái: provider được người dùng xác nhận; phương án sandbox/mapping nội bộ do Codex chọn theo ủy quyền “làm theo cách bạn nghĩ là tốt nhất”. Không phải xác nhận rule hoặc quyền gửi ticket trên hệ thống khách hàng.
- Phụ thuộc: hoàn tất kiểm chứng S08 trước khi bắt đầu implementation S09.

## Quyết định

1. Chỉ triển khai Redmine; không triển khai đồng thời Backlog. Dựng Redmine local riêng, chỉ bind loopback, database/volume/tài khoản riêng với TMS. Dùng image chính thức pin phiên bản 7.0.1; script khởi tạo có thể chạy lại, không xóa volume và không đổi mật khẩu sẵn có.
2. TMS giữ quyền quyết định trạng thái bug và kết quả kiểm thử theo ADR-007. Redmine nhận bản công bố do PM yêu cầu; khác biệt ngoài hệ thống hiện là xung đột để PM đối chiếu, không tự đóng bug/đổi execution.
3. Thành viên nội bộ xem liên kết/trạng thái gửi. Chỉ PM của dự án gửi/cập nhật/thử lại và giải quyết đối chiếu; ADMIN toàn cục không tự thay PM. Credentials, địa chỉ server được vận hành cấu hình tại máy chủ; trình duyệt không nhập/đọc API key hoặc URL tùy ý để worker gọi.
4. Mapping thử là **nội bộ**: giữ 10 nhãn/trạng thái TMS trong sandbox, 3 mức ưu tiên, loại Bug. Description có các trường tối thiểu ADR-006 và định danh phiên bản công bố. Không tự chuyển comment/chứng cứ INTERNAL sang Redmine, không gửi email/watchers.
5. Mỗi bug có marker ổn định trong custom field Redmine có bật filter. Outbox chỉ chạy sau commit local, không giữ transaction SQL trong lúc gọi mạng. Không gọi lại CREATE khi timeout/5xx/chết worker khiến chưa biết Redmine đã nhận chưa; tìm theo marker và xác minh nội dung trước. Không tìm thấy sau một lần đọc không đủ chứng minh lần CREATE trước chưa xảy ra.
6. State delivery phân biệt chờ, đang gửi, chờ thử lại, chưa xác định, đã gửi, lỗi, xung đột. Retry có cap/backoff; không lộ body lỗi ngoài hệ thống hoặc token trong API/log. Cập nhật chỉ gửi sau khi kiểm tra bản remote quan sát phù hợp, không ghi đè âm thầm thay đổi của người khác.
7. Nghiệm thu S09 là nghiệm thu sandbox nội bộ. Đưa lên tracker khách hàng vẫn cần URL/project/credential do vận hành quản lý và mapping khách hàng được đối chiếu; không tự suy thông tin đó từ sandbox.

## Nguồn kỹ thuật đã khảo sát

[Redmine REST API](https://www.redmine.org/projects/redmine/wiki/Rest_api) mô tả xác thực qua header và phân trang; [Issues API](https://www.redmine.org/projects/redmine/wiki/Rest_Issues) có create/update, lọc project/status/custom field. Tài liệu không đưa ra idempotency key cho CREATE, nên adapter phải xử lý trạng thái chưa xác định. Sandbox theo [Docker Official Image](https://hub.docker.com/_/redmine), không dùng tag latest.

## Điều cần kiểm chứng

Mapping/role trên server sandbox thực tế; idempotency sau timeout, worker đồng thời/crash, credential bị thu hồi, 401/403/429/422/5xx, lỗi mapping, sai dự án, reconcile conflict; migration fresh/upgrade; UI PM/Tester; không có network call trong transaction và không có credentials trong response/export/log.
