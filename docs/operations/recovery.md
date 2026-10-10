# Sao lưu và diễn tập khôi phục

## Phạm vi diễn tập S10

`RecoveryDrill` được gọi sau chuỗi HTTP trong `SystemJourneyTest`, chỉ nhận container `tms_system_test` do test tạo. Không nhận URL DB đang dùng và không ghi đè database local.

Đầu ra `Backend/target/recovery/sprint-10.json` được tạo **sau khi mọi assertion đạt**. Test dùng `mysqldump --single-transaction --hex-blob --no-tablespaces --set-gtid-purged=OFF`, phục hồi vào MySQL 8.4.8 mới, validate Flyway V11 và xác nhận migrate lại 0 thay đổi. So sánh SHA-256 các hàng theo primary key ở tất cả bảng ngoài hai bảng session; sao chép chứng cứ và đối chiếu với SHA-256 trong DB. Không in dump hoặc credential.

Test còn chèn migration V12 **tạm trong thư mục test**: CREATE TABLE thành công rồi câu SQL tiếp theo thất bại. Xác nhận schema dở dang và Flyway không hợp lệ, sau đó khôi phục backup trước thay đổi vào container sạch thứ hai. Đây không phải migration của sản phẩm, không sửa V1–V11, không dùng `repair` để che thất bại. Source được kiểm tra giữ nguyên.

Chạy từ Backend (Docker hoạt động):

```powershell
rtk proxy .\mvnw.cmd -B -ntp "-Dtest=SystemJourneyTest#xlsxToAssignedNgBugFullRetestClosureAndReportUsesRealSessions" verify
```

Giới hạn: dataset nhỏ ẩn danh, chỉ kiểm chứng bytes/database/Flyway, chưa khởi động app trên database phục hồi, chưa diễn tập mất máy/khôi phục từ kho backup ngoài máy. Thời gian đo không phải RTO/RPO.

## Runbook cho môi trường có dữ liệu thật

1. Người vận hành ghi phiên bản app, Flyway/checksum, thời điểm UTC và phạm vi. Bật bảo trì, dừng **mọi** writer: app, worker Redmine, importer và công cụ ghi tay. Giữ API và dữ liệu backup khỏi truy cập công khai.
2. Chụp DB TMS nhất quán, thư mục `TMS_ATTACHMENT_ROOT`, mapping và cấu hình bí mật. DB Redmine/file upload của tracker là bộ backup riêng cần cùng biên thời gian. Không đưa `.env`, key, dump, hash mật khẩu hoặc session vào Git. Mã hóa kho backup, giới hạn ACL và ghi manifest/hash.
3. Khôi phục vào host/DB/storage mới được chỉ định rõ. Kiểm tra đường dẫn tuyệt đối và container đích; không phục hồi trực tiếp lên nguồn. Dùng tài khoản restore riêng, không cấp DDL cho runtime.
4. Đối chiếu schema/checksum, số lượng và nội dung nghiệp vụ, mọi attachment ID/size/hash. Giữ worker và mọi outbound tắt trong khi kiểm tra. Xóa phiên đăng nhập trong **DB phục hồi** trước khi mở dịch vụ; secret/bootstrap không tự reset tài khoản.
5. Chạy app đúng phiên bản trên đích riêng, login bằng tài khoản nội bộ được phép, đọc case/attempt/bug/report và tải evidence; kiểm tra project scope. Ghi kết quả trước khi cân nhắc chuyển traffic.
6. Với Redmine, backup cũ có thể thiếu marker/binding của lần CREATE đã gửi: đối chiếu tracker và outbox với nhật ký trước khi bật worker. Không tự reset `create_attempted`, không tự gửi lại job UNCERTAIN.
7. Chỉ chuyển traffic sau phê duyệt kế hoạch cụ thể; giữ nguồn/backup cũ đủ để rollback. Migration đã áp dụng giữ nguyên; sửa bằng migration tiếp theo sau khi biết rõ trạng thái thật. Không tự `clean`, `repair` hoặc DROP dữ liệu sản phẩm.

Chưa có retention/RPO/RTO production được chủ hệ thống chốt; không tự xóa backup hay audit theo số ngày suy đoán. Credential rotation: tạo credential mới, cập nhật secret store/máy chủ, xác minh kết nối/quyền, revoke credential cũ sau khi toàn bộ instance dùng bản mới; không sửa credential trong lịch sử Git.
