# Khởi động ứng dụng với MySQL Windows — 03/10/2026

## Nguyên nhân lỗi Maven người dùng gửi

`mvn spring-boot:run` đã nhận đúng plugin và Java 21, nhưng Spring dừng trước kết nối database với `Could not resolve placeholder 'TMS_DB_URL'`. `application.yml` yêu cầu biến môi trường cho datasource/Flyway. Chạy Maven trực tiếp không tự nạp `.env.mysql.local`; log cũng cho thấy profile mặc định thay vì `local`.

`scripts/Start-Backend.ps1` đã có luồng nạp cấu hình native, dựng JDBC URL và gọi Maven wrapper. Không cần sửa Java, migration hay thêm mật khẩu vào source. Từ thư mục Backend, lệnh sử dụng là:

```powershell
..\scripts\Start-Backend.ps1
```

Script chạy trong terminal và cần giữ terminal đó mở. Khi cổng 8080 đã có backend chạy, không mở thêm bản thứ hai.

## Bằng chứng đã kiểm tra

- `.env.mysql.local` tồn tại; host `127.0.0.1`, port `3307`, database `tms`, có credential app/migrator. Không in password hoặc đọc vault của Workbench.
- Khởi động bằng script: profile `local`, JDBC MySQL Windows 3307; Flyway validate đủ 11 migration, schema V11 up to date; Hibernate validate và Tomcat 8080 khởi động thành công.
- `Check-System.ps1` đã PASS: backend UP, MySQL **9.7.0**, Flyway V11/11 migration. Không nhầm startup thành toàn bộ regression PASS.
- Audit chỉ đọc lúc 13:36 giờ Việt Nam: **56 bảng, 2596 hàng, 128 FK và 6 kiểm tra domain**, không có vi phạm. Số hàng gồm dữ liệu vận hành nên có thể thay đổi theo phiên đăng nhập.
- Frontend hiện có listener 5173; HTML trả HTTP 200. Sau khi backend lên lại, lúc 13:38 giờ Việt Nam, `/api/v1/system/status` qua frontend trả HTTP200/UP/MySQL9.7.0/V11 và `/actuator/health/readiness` qua frontend trả HTTP200/UP. Đã xác nhận đường FE→BE→MySQL; chưa coi đây là kiểm thử đăng nhập/UI nghiệp vụ.
- Bootstrap Admin bỏ qua vì tài khoản đã tồn tại; không tạo lại hoặc thay mật khẩu các tài khoản đã import.

Flyway có warning rằng MySQL 9.7 mới hơn phiên bản đã được nó kiểm chứng. Startup/validate hiện PASS, nhưng chưa thay thế test fresh/upgrade và regression đầy đủ trên 9.7. Còn nghiệm thu UI, đăng nhập, dữ liệu/chứng cứ và các gate pilot S11. Giữ nguồn và backup trước khi xác nhận chuyển hoàn toàn.

Skill: `systematic-debugging` (đọc stacktrace, đối chiếu luồng cấu hình và chạy lại bằng đường khởi động đã có), `verification-before-completion` (kiểm tra startup, readiness và audit). Không có thay đổi hành vi sản phẩm nên không viết test mô phỏng lại cấu hình. Không nâng schema V12, không commit/push/deploy.
