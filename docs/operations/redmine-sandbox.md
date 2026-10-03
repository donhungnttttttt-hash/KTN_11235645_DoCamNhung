# Chạy Redmine sandbox nội bộ

S09 dùng sandbox riêng tại `http://127.0.0.1:3080`, image `redmine:7.0.1-alpine` và MySQL `8.4.8`. Không kết nối tracker khách hàng. Container/volume thuộc compose project `syp-tms-redmine`, tách khỏi `syp-tms`.

```powershell
rtk proxy powershell -NoProfile -File scripts/Initialize-RedmineSandbox.ps1
rtk proxy powershell -NoProfile -File scripts/Start-RedmineSandbox.ps1
rtk proxy powershell -NoProfile -File scripts/Seed-RedmineSandbox.ps1
rtk proxy powershell -NoProfile -File scripts/Test-RedmineSandbox.ps1
rtk proxy powershell -NoProfile -File scripts/Link-RedmineSandbox.ps1 -ProjectId 1
```

Initialize tạo mật khẩu ngẫu nhiên trong `.env.redmine.local` (ignore), không in ra. Start tạo chứng chỉ CA/server trong `var/redmine/tls` (ignore), giữ file đã có, từ chối sinh lại khi bộ file thiếu một phần. Chứng chỉ server có DNS `database`; Redmine chỉ mount CA công khai, MySQL mount khóa server riêng. MySQL yêu cầu secure transport; client Redmine xác minh CA/hostname. Chứng chỉ thử hạn 5 năm; không dùng cho production.

Seed chỉ chạy khi không có dự án khác ngoài `tms-sandbox`. Lần đầu đổi mật khẩu admin mặc định, tạo tài khoản tích hợp không admin, tắt đăng ký và thông báo email; dự án/issue private. Chạy lại giữ credential và không tạo trùng status/project. `.env.redmine-state.local` giữ API key và mapping, không in/commit/chia sẻ file này. Nếu cần đăng nhập UI sandbox, username là `admin`, password nằm tại khóa `RDM_ADMIN_PASSWORD` trong file local; độc lập hoàn toàn tài khoản TMS.

Test dùng API key qua header, chỉ cho URL host 127.0.0.1. Tạo một ticket smoke, đổi sang Đã xử lý, kiểm tra `is_private=true` và tìm theo custom field marker, xác nhận API quản trị user bị từ chối. State marker trong `var/redmine/api-smoke.json`; chạy lại tìm đúng ticket cũ. Nếu POST đã thử nhưng không tìm thấy, script dừng ở “chưa rõ kết quả”, không tự tạo lần nữa.

`Link-RedmineSandbox.ps1` liên kết ID dự án TMS được chỉ định với sandbox; thay `1` bằng đúng ID dự án demo. Mapping nằm trong `var/redmine/tms-mapping.json` (ignore). `Start-Backend.ps1` đọc các khóa kết nối đã biết trong `.env.redmine-state.local`; khởi động lại backend sau khi đổi cấu hình. Script link/seed không gửi bug. Trong web, mở chi tiết bug → **Công bố và đối chiếu Redmine**; chỉ PM dự án có thao tác công bố. Không có form nhập API key trên web.

Không chạy `down -v`, không xóa volume khi nâng cấp. Để dừng riêng sandbox và giữ dữ liệu:

```powershell
rtk proxy docker compose --env-file .env.redmine.local -f compose.redmine.yaml stop
```

## Bằng chứng ngày 30/09/2026

Sandbox trả Redmine 7.0.1.stable, project 1, tracker 1, 10 status và 3 priority. API smoke CREATE/read/UPDATE/filter PASS; service account gọi `/users.json` bị 403. Seed/API test chạy lại không tạo ticket mới.

**Sửa kết luận kiểm tra ban đầu:** smoke đầu chỉ gửi cờ private, chưa assert giá trị đọc lại nên chưa đủ chứng minh ticket riêng tư. E2E adapter đã phát hiện Redmine bỏ cờ này khi role thiếu quyền. Thêm `set_own_issues_private` (chỉ ticket do service account tạo), bổ sung assertion, quan sát RED rồi GREEN ngày 30/09. Ticket smoke #1 đã được kiểm tra private thật; project sandbox cũng là private. Không thêm quyền admin. Bằng chứng này không tự thay thế kiểm thử outbox và giao diện.

Lỗi khởi tạo ban đầu: MariaDB client trong image Alpine từ chối chứng chỉ tự sinh của MySQL do CA/hostname. Đã cấu hình CA/server có SAN phù hợp; không tắt xác minh TLS. Nguồn: [Docker Redmine image](https://hub.docker.com/_/redmine), [mysql2 0.5.7](https://github.com/brianmario/mysql2/tree/0.5.7), [REST Issues](https://www.redmine.org/projects/redmine/wiki/Rest_Issues).

REST issue JSON chuẩn 7.0.1 không trả `lock_version` (đã đối chiếu `app/views/issues/show.api.rsb` trong image). Adapter phải công bố giới hạn: đối chiếu fingerprint trước/sau cập nhật phát hiện sai lệch quan sát được; không tuyên bố CAS atomic giữa GET và PUT trên Redmine chuẩn. Production cần thống nhất quyền sở hữu field hoặc cơ chế conditional update phía provider nếu yêu cầu chống mọi race.
