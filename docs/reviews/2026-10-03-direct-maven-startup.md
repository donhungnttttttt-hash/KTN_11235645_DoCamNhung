# 03/10/2026 — Chạy backend trực tiếp bằng Maven với MySQL native

Người dùng yêu cầu sửa để chạy đúng `cd Backend` rồi `mvn spring-boot:run`, không phải đổi sang script. Attachment lúc 20:00 cho thấy goal Maven đúng nhưng Spring dùng default profile và thiếu `TMS_DB_URL`. Tái hiện trong tiến trình bỏ toàn bộ biến môi trường `TMS_*`/`SPRING_*`: exit 1, cùng lỗi placeholder. Cấu hình native đã có trong `.env.mysql.local`; trước đây chỉ script PowerShell nạp file và dựng URL.

## Thay đổi

- `Backend/pom.xml`: đặt thuộc tính `spring-boot.run.profiles=local` cho lệnh Maven chạy phát triển. Không đặt `spring.profiles.default=local` trong ứng dụng hoặc bật profile local mặc định trong JAR phát hành.
- `application-local.yml`: import file `.env.mysql.local` ngoài source với extension hint `.properties`; URL datasource ghép từ host, port và schema, Flyway dùng cùng URL. Mặc định native `127.0.0.1:3307/tms`; `TMS_DB_URL` được cấu hình rõ vẫn có ưu tiên. Username/password tiếp tục bắt buộc lấy từ cấu hình, không có mật khẩu mặc định hoặc tài khoản root hardcode.
- Có thể chọn đường dẫn cấu hình local qua `TMS_LOCAL_CONFIG_FILE`; mặc định `../.env.mysql.local` khi chạy từ Backend. Tham số dòng lệnh/biến môi trường tiếp tục ghi đè file. Profile release không import file native.
- Không thêm thư viện, sửa migration hay khởi tạo lại database. `Start-Backend.ps1` và đường legacy được giữ.
- Cập nhật README, development guide và bước 4 Workbench. **TMS là tên kết nối Workbench**, ứng dụng dùng schema `tms` bên trong server `127.0.0.1:3307`.

Thiết kế dùng các khả năng có sẵn của Spring Boot 3.5: [Maven run/profile](https://docs.spring.io/spring-boot/3.5/maven-plugin/run.html), [external config/import và precedence](https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html).

## Kiểm chứng

`LocalDatabaseConfigurationTest` nạp config thật với file/secret tổng hợp trong thư mục tạm; không có DataSource hoặc kết nối MySQL. RED: 1/4 lỗi thiếu `TMS_DB_URL` khi chưa có import/URL. GREEN: 4/4 PASS, kiểm tra:

1. Local đọc file native và dựng cùng URL cho datasource/Flyway, giữ đúng username/password (cả ký tự `!#=` trong mật khẩu fixture).
2. Cấu hình ghi đè có ưu tiên so với file.
3. Release không tự đọc secret native hoặc chuyển sang profile local.
4. Thiếu file không cung cấp mật khẩu mặc định.

Maven verify/package với các test không cần database: **57 test / 0 failure / 0 error / 0 skipped, BUILD SUCCESS**. Bao gồm DefaultProfileSecurityTest để kiểm tra profile mặc định không mở diagnostic local. Không chạy integration Testcontainers hoặc test ghi/xóa trên `tms`.

Checker Eclipse đầy đủ null analysis: **126 source / 0 error / 0 warning / exit 0**. JAR đã đóng gói không chứa `.env.mysql.local` hoặc file `.env`. Chỉ thay cấu hình YAML/POM và test, không thêm dòng Java runtime; không có chỉ số coverage riêng cho config YAML/POM. Báo cáo JaCoCo của unit suite không đại diện cho coverage full suite hay gate 80% toàn backend.

Khởi động thật bằng **đúng `mvn spring-boot:run`**, working directory Backend, không nạp biến `TMS_*`/`SPRING_*` vào tiến trình:

- JDK21, profile local, Tomcat8080, `Started TmsApplication`.
- MySQL native `127.0.0.1:3307/tms`, server9.7.0.
- Flyway validate11 migration, V11, **No migration necessary**.
- Bootstrap Admin bỏ qua vì đã có tài khoản; không đặt lại mật khẩu.
- GET readiness HTTP200/statusUP; GET system/status HTTP200/UP/MySQL9.7.0/V11.
- Đã dừng đúng cây tiến trình do verifier tạo sau kiểm tra, giải phóng8080 cho người dùng; không dừng service MySQL hay process người dùng.

Log RED/GREEN và báo cáo startup tại `scratch/direct-startup/` (Git ignore). Bí mật thật không được in hoặc đưa vào repo. Flyway vẫn cảnh báo MySQL9.7 mới hơn bản đã được Flyway kiểm chứng; startup/validation PASS không thay thế full regression9.7.

Review tự thực hiện. Skill systematic-debugging → tái hiện goal/placeholder/profile; tdd-workflow → RED/GREEN config tests; security-review → secret ngoài artifact, không mật khẩu mặc định, không đổi release/default profile; verification-loop → unit/build/compiler/artifact/startup/readiness. S11 vẫn IN_REVIEW với các gate UI/UAT trước đó. Chưa commit/push/merge/deploy hoặc tạo V12.
