# Đóng gói và triển khai có kiểm soát

Sprint 11 chuẩn bị bàn giao nội bộ. Gói local đã thử trên MySQL riêng; chưa triển khai máy chủ khách hàng hoặc xác nhận production. Schema hiện hành **V12** (giữ nguồn tài liệu Excel; không thêm bảng), đã áp dụng native ngày03/10 sau backup. Không tạo migration chỉ để thêm dữ liệu demo.

**Hướng chạy máy cá nhân từ 01/10/2026:** [MySQL Windows và Workbench](database/mysql-workbench.md), không cần Docker cho runtime. Script Test-ReleaseLocal bên dưới là diễn tập container riêng đã có, không phải bước bắt buộc để mở app. Native server3307/tms đã chạy ứng dụng và nâng V12; xem docs/reviews/2026-10-03-test-documents.md. gói s11-handover trước đó không chứa các helper native được bổ sung sau.

## Tạo và kiểm tra gói

Từ repository, cần Node/npm, JDK 21, Maven wrapper và Docker cho kiểm thử MySQL:

```powershell
rtk proxy npm test --prefix Frontend
rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1
rtk proxy node scripts/Check-Contracts.cjs
rtk proxy powershell -NoProfile -File scripts/Build-Release.ps1 -Label s11-handover
rtk proxy powershell -NoProfile -File scripts/Test-ReleaseLocal.ps1 -ArtifactDirectory artifacts/tms-s11-handover
```

`Build-Release.ps1` tạo JAR, frontend tĩnh, tài liệu, cấu hình mẫu và manifest SHA-256 trong `artifacts/`. Script đóng gói **không chạy test**; kết quả test ghi riêng trong [review S11](reviews/2026-09-30-sprint-11.md). Manifest ghi rõ HEAD/working tree chưa commit, không nhận đó là bản tag phát hành.

`Test-ReleaseLocal.ps1` xác minh hash, tạo một Compose project/volume MySQL mới với secret ngẫu nhiên, dùng cổng loopback 3311/8180, chạy migration rồi JAR profile `release`. Runtime không nhận credential migrator. Script kiểm tra readiness, chặn anonymous, login/session/CSRF, tạo–duyệt–đọc case và báo cáo; diagnostic bị từ chối. Sau đó dừng đúng tiến trình/DB vừa tạo và giữ volume/log để điều tra. Không xóa hoặc dùng lại database local ở 3310. Đây là kiểm tra JAR/API; cấu hình Nginx/TLS mẫu cần xác minh tại môi trường đích.

## Tách migration khỏi runtime

1. Dừng writer, sao lưu DB và chứng cứ theo [runbook phục hồi](operations/recovery.md). Ghi artifact/hash/schema trước nâng cấp.
2. Dùng tài khoản migrator từ secret store; tham khảo `infra/release/migration.env.example`. Không truyền mật khẩu qua command line hoặc đưa vào frontend.
3. Chạy job hữu hạn:

```text
java -jar tms-backend.jar --tms-migrate
```

Job chỉ chạy Flyway rồi thoát; không mở HTTP, tạo admin, chạy Hibernate hoặc worker. Migration lỗi trả exit code khác 0; không khởi động runtime và không tự `repair`/`clean`. V1–V11 đã áp dụng không được sửa.

4. Chạy app bằng `runtime.env.example`: `SPRING_PROFILES_ACTIVE=release`, `TMS_DB_USER=tms_app` và tài khoản chỉ SELECT/INSERT/UPDATE/DELETE. Không cấp `TMS_MIGRATION_*` cho tiến trình này. Profile release chỉ validate checksum/trạng thái migration, Hibernate vẫn validate entity; thiếu migration thì không được ready.
5. Bật bootstrap **một lần** với credential riêng để tạo admin trên DB sạch, xác nhận đăng nhập rồi tắt. Không dùng tài khoản demo ngoài local; không ghi mật khẩu vào hướng dẫn hoặc Git.

Thiết kế sử dụng [Java API của Flyway](https://documentation.red-gate.com/flyway/reference/usage/api-java) và [validation checksum](https://documentation.red-gate.com/flyway/reference/commands/validate). Phiên bản dependency được khóa theo `Backend/pom.xml`, không lấy phiên bản mới trong ví dụ tài liệu làm phiên bản sản phẩm.

## Frontend, mạng và bí mật

Frontend gọi `/api` cùng origin; build không cần nhúng secret hoặc địa chỉ DB. Phục vụ thư mục `frontend/` sau HTTPS, proxy `/api/` tới backend nội bộ; mẫu ở `infra/release/nginx.conf.example`. TLS, hostname và certificate là giá trị cần chủ môi trường cung cấp. Backend loopback/private; readiness chỉ theo dõi nội bộ. Không tạo màn diagnostic trên web.

`TMS_COOKIE_SECURE=true` trên HTTPS. Chỉ bài thử loopback HTTP mới đặt false. Với MySQL từ xa dùng TLS xác minh danh tính server và CA tin cậy; mẫu URL không được hạ xuống DISABLED ngoài bài thử local. Chứng cứ lưu ở volume riêng có ACL, nằm ngoài web root; sao lưu cùng DB. Worker Redmine mặc định tắt trong gói kiểm tra, chỉ bật sau khi xác minh mapping/URL/key và quyền trên tracker được phép.

## Checklist trước chuyển traffic

- [ ] Artifact/hash và test evidence khớp code phát hành; không có secret trong gói.
- [ ] Môi trường đích, TLS, tài khoản, backup/restore, retention và người vận hành đã chốt.
- [ ] Migration riêng thành công; runtime validate schema và ready.
- [ ] PM/Tester kiểm thử các luồng tại [pilot](uat/pilot.md); file Excel/keyboard/mobile đạt trên trình duyệt đích.
- [ ] Redmine là sandbox hay khách thật được ghi đúng; không tự gửi ticket demo ra ngoài.
- [ ] Phương án quay lại app cũ tương thích schema đã được thử; nếu không tương thích, phục hồi vào đích riêng rồi xác nhận dữ liệu trước chuyển traffic.

Chưa đủ các điều kiện trên thì giữ gói ở mức bàn giao kỹ thuật nội bộ, không ghi là đã phát hành production.
