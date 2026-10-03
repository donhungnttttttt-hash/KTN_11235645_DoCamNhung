# Review bảo mật S10

Ngày 30/09/2026; self-review theo ECC `security-review`, không phải pentest độc lập. Phạm vi: bản nội bộ, React + Spring Boot/MySQL, Redmine sandbox. Không xác nhận an toàn production từ checklist này.

## Kiểm tra và bằng chứng

| Đường dữ liệu | Cơ chế / kiểm tra |
| --- | --- |
| Đăng nhập/tài khoản | PBKDF2 salt, session JDBC/rotation/revoke; `IdentityIntegrationTest`: login 401 không lộ tồn tại user, throttle DB 429, logout/expiry, Admin/delegated PM, Tester bị chặn |
| Project/IDOR | Service kiểm tra membership còn hoạt động; HTTP `SystemJourneyTest` kiểm tra người ngoài với project/catalog/case/cycle/work-item/report/retest/Redmine/handbook; API theo ID kiểm tra trong suite riêng |
| CSRF/CORS | Session CSRF, cookie HttpOnly/SameSite Strict; HTTP thiếu token bị 403, origin ngoài không có Access-Control-Allow-Origin; không bật wildcard CORS |
| Input/SQL | Truy vấn nghiệp vụ có bind parameter; giới hạn paging/upload/report; timezone sai và DTO catalog không được validate đã tái hiện RED và sửa |
| Stored XSS | React render text; `WorkItemDetail.test.jsx` có payload img/onerror và assert không sinh thẻ img; Redmine compare render text; URL reference server chỉ cho HTTP(S) |
| XLSX | Đọc POI với cap 5 MiB/500 dòng/20 MiB giải nén; từ chối formula/macro/external link/merged cells; import atomic và owner scoped; export string cells |
| Evidence | UUID server path, kiểm tra nội dung/đuôi, 20 MiB, 100 tệp/bug, ảnh giới hạn pixels, attachment+nosniff+no-store, tải cần membership; giữ file đã dùng để retest/đóng lỗi |
| Tracker | Server-owned URL/key/mapping; HTTPS ngoài loopback, không redirect, timeout/body cap, PM-only, create fence/lease/marker, không gửi nội dung nội bộ |
| Log/secret | Error envelope có requestId, không in cause/payload/key; bỏ ảnh hưởng DEBUG=release thừa kế trong Start-Backend, chỉ bật debug khi chủ động truyền -DebugLogging; kiểm tra secret riêng trước chốt |
| Quyền MySQL runtime | Đọc SHOW GRANTS bằng tms_app trên container local: chỉ USAGE và SELECT/INSERT/UPDATE/DELETE trên tms.*, không DDL hoặc GRANT OPTION; mật khẩu lấy bên trong container, không in ra |

Các bảng này mô tả cơ chế và test liên quan; kết quả chạy lần cuối và coverage phải xem báo cáo review S10, không tự coi tên test là PASS.

## Giới hạn còn mở trước production

- Evidence identification **không phải malware scanner**. PDF/MP4 không được render inline, nhưng magic bytes/regex không chứng minh tệp không có payload. Cần quyết định scanner/quarantine và retention cho dữ liệu khách; không tự đánh dấu rủi ro này đã được người dùng chấp nhận.
- Cần HTTPS/reverse proxy được cấu hình đúng, cookie Secure, secret store/rotation, quota/rate limiting theo triển khai và giám sát tải. Compose hiện chỉ phục vụ localhost.
- Review S03 tiếp theo đã bổ sung concurrency/audit/validation, UI thành viên/ruleset/sổ tay và test project scope/XSS/rule policy. Xem [bằng chứng cuối](../reviews/2026-09-30-review-completion.md). Rule INTERNAL_DEMO chưa thay thế policy khách; không có tài khoản khách được mở.
- `npm audit --json` ngày 30/09/2026: 294 dependency, 0 vulnerability được nguồn advisory báo cáo. OSV backend 94 runtime dependency: đã vá 4 package có 12 advisory; scan lại không còn finding theo nguồn. Xem [bản vá và giới hạn scan](sprint-10-dependencies.md). Không đồng nghĩa chứng minh không có lỗ hổng; review độc lập và scan OS/image/JDK còn mở trước pilot.
- Chưa có chính sách retention/xóa audit/credential kiểm thử được chốt. Không đưa credential kiểm thử thật vào mô tả, XLSX, evidence hoặc dữ liệu sổ tay.

Runbook [recovery](../operations/recovery.md) bao gồm least privilege, backup và rotation. Không tự áp dụng sửa SQL ở production hoặc deploy từ kết quả test local.
