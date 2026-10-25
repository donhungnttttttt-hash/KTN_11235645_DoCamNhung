# Lỗi khởi động backend local

Tái hiện sau pull bf3971c: Maven biên dịch thành công nhưng Spring dừng tại OpenAiConfiguration với Invalid OpenAI configuration. Kiểm tra metadata cấu hình, không in key: OPENAI_API_KEY local có khoảng trắng, vi phạm validation hiện có. Đây là cấu hình máy, không phải conflict source hoặc lỗi database.

Đã sao lưu file cấu hình sang `.env.mysql-ai-backup-20261025.local` (Git ignore), tạm đặt TMS_OPENAI_ENABLED=false và OPENAI_API_KEY trống trong `.env.mysql.local`. Giữ model/endpoint và thông số database. Chức năng AI chưa hoạt động; cần nhập key hợp lệ riêng và bật lại khi người dùng muốn dùng AI.

Kiểm chứng: lần chẩn đoán đầu tắt Flyway và bootstrap, tái hiện lỗi cấu hình. Truy vấn chỉ đọc xác nhận database hiện ở V34 và có 111 tài khoản. Chạy lại `mvn spring-boot:run` bình thường sau sửa local; Flyway validate đủ 34 migration, schema đã cập nhật, không áp dụng migration mới. Backend PID 19728 nghe 127.0.0.1:8080; readiness trả HTTP 200 và status UP. Giữ backend chạy. Không gọi nhà cung cấp AI, không sửa source backend, không commit/push. Không tuyên bố toàn bộ nghiệp vụ được kiểm thử qua health check.

Checkpoint tiếp theo: đã dừng PID 19728 theo yêu cầu để người dùng tự chạy lại. Sau khi người dùng nhập key mới, chỉ kiểm tra metadata xác nhận có key không chứa khoảng trắng và bật lại TMS_OPENAI_ENABLED=true trong file local; không sao chép key vào báo cáo, không gọi provider để xác minh. Người dùng được hướng dẫn restart backend để nạp cấu hình mới. Các trạng thái runtime ở trên là bằng chứng lịch sử, không phải trạng thái tiến trình hiện tại.
