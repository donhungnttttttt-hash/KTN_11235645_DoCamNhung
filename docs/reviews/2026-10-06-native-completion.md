# Hoàn tất native MySQL, F/Q và backend local — 06/10/2026

Đã giải quyết blocker credential/quyền, chạy kiểm thử trên schema riêng và cập nhật backend chính. Máy này dùng **MySQL native 127.0.0.1:3307**, schema `tms`; 3310 trong `.env` là cấu hình Docker cũ. Maven local đọc `.env.mysql.local`, không đọc `.env` Docker.

## Thay đổi và lỗi được tìm thấy

- Tạo/cấp ba schema kiểm thử riêng bằng credential native được người dùng cung cấp. Schema `tms_docstest_202610030001` giữ bằng chứng thất bại; `tms_docstest_202610060003` dùng migration/integration/concurrency; `tms_docstest_202610060002` dùng API HTTP thật. Không chạy fixture hoặc clean lên `tms`.
- Migration đầu tiên chạy được V16→V18 và fresh V18, nhưng test cross-QA answer pointer thất bại. Trên MySQL 9.7.0 cài tại máy này, hai FK ngắn dùng index chung với FK dài có cột nullable đã bỏ lọt answer khác QA và group khác project. Đã tái hiện với SQL riêng, xác nhận `foreign_key_checks=1`; không suy kết quả này cho mọi phiên bản MySQL.
- **V19** thêm unique/index và FK với thứ tự cột riêng cho current answer và group. Thêm FK mới để kiểm tra dữ liệu đang có trước khi bỏ FK cũ; dữ liệu sai làm migration lỗi, không tự sửa/xóa lịch sử. Giữ byte-for-byte V1–V18.
- Local profile cho phép bỏ `TMS_MIGRATION_USER/PASSWORD` và dùng DB account có quyền DDL; tài khoản migration riêng vẫn ưu tiên. Release profile không thay đổi. Test cấu hình RED trước sửa, GREEN sau sửa.
- README có hướng dẫn pull, cấu hình DB/bootstrap Admin và chạy hai lệnh. Template native và Docker được ghi rõ mục đích; không đưa credential máy này vào Git.

## Kết quả kiểm tra

| Phạm vi | Kết quả |
|---|---|
| Native migration V16→V19 + fresh V19, bảo toàn dữ liệu/FK/unique | 1/1 PASS |
| Native F/Q integration, FULL_CASE/BUG_ONLY, QA/history/quyền | 5/5 PASS |
| Native concurrency, replay, commit độc lập và rollback batch | 5/5 PASS |
| Guard Java không kết nối khi target không hợp lệ | 2/2 PASS |
| Runner guard Node, từ chối live schema/V18/selector sai | 7/7 PASS |
| Local configuration, account chung/riêng/override/release | 5/5 PASS |
| JDT null/unused | 194 source, 0 lỗi/0 cảnh báo |
| Package + audit JAR | PASS, đủ 19 migration khớp source |
| Review độc lập delta V19/config | Approved, không có Critical/Important |
| HTTP đầy đủ trên schema test | 37 bước mới trên V18; 37 bước mới trên V19 |
| HTTP sau cập nhật backend chính | 23 checks, 4 vai trò, readiness UP |
| Browser frontend 5173 → backend 8080 | PM đăng nhập, dashboard/handoff/file-work tải thành công; không có error console |

Hành trình HTTP tạo Admin/PM/Tester/Dev, thiết bị/bàn giao/dự án, import Excel tự nhận cột và kế thừa tiêu đề trống, PM phê duyệt/giao file, Tester nhận máy/start/pause/resume/NG/OK, tạo BUG, Dev xử lý/fixed build, PM coverage/request, Tester retest, PM đóng; QA create/assign/start/answer/confirm/close. Có kiểm tra Tester không được tạo dự án và Dev không được đóng BUG.

Excel tải gốc khớp byte với file import; bản xuất thực thi có kết quả OK từ FULL_CASE retest, đúng người thực hiện/build/provenance, case chưa chạy ở build mới là NOT_RUN. Đối chiếu bằng POI xác nhận giữ nguyên header, xuống dòng, tiếng Nhật, ô nguồn trống và cột M/N ngoài kết quả/người thực hiện.

Lần Maven migration đầu trên V19 có test **1/1 PASS** nhưng bước repackage lỗi vì JAR đang được API test giữ trên Windows. Đã dừng đúng API test, package lại **BUILD SUCCESS**; không ghi nhầm toàn bộ lệnh đầu thành PASS. Flyway vẫn in cảnh báo phạm vi hỗ trợ MySQL 9.7; các kết quả native trên là bằng chứng chạy tại phiên bản thực tế. Mockito có cảnh báo dynamic-agent hiện hữu. Coverage toàn ứng dụng **NOT_MEASURED**.

Hai stale BUG tests dùng latch sau identity lock, chờ writer commit; không khẳng định chúng chứng minh riêng waiter đã vào project-lock wait hoặc có snapshot repeatable-read cũ. Kiểm tra add-FK trên dữ liệu sai đã có repro SQL 1452; chưa có suite tự động riêng cho toàn bộ upgrade V18 chứa dữ liệu sai. Các giới hạn này không thay đổi kết quả các kịch bản đã chạy.

## Cập nhật dữ liệu đang dùng

- Dừng backend cũ PID 19880 sau khi xác minh listener và classpath đúng repository. Không dừng frontend.
- Backup: `var/mysql-native/backups/2026-10-06T15-47-46-594Z-tms.sql`, 2.081.174 byte, schema V16. SHA-256 `9028e6c0d2b949e7018eef09b2cf3d227a16f73540d9733da78435847a329ca8` khớp manifest. Backup giữ DDL session, không giữ session đăng nhập.
- Backend mới tự chạy Flyway V17/V18/V19 khi startup. `tms` hiện V19; so sánh số dòng của 56 bảng nghiệp vụ cũ không đổi. Có 65 bảng nghiệp vụ sau migration (không tính Flyway và hai bảng session).
- Backend mới PID **40628**, port **8080**, readiness **UP**, Java 21. Artifact SHA-256 `6f24f5f0969e92befacbe9aa175467b6e6dc15e8561f303964559f5efb01d5ae` được copy vào `Backend/var/runtime/` để không khóa JAR build. Log: `Backend/var/runtime/main-v19.log`.
- Frontend 5173 PID 33356 giữ nguyên. Tài khoản bàn giao trước vẫn đăng nhập được; không reset tài khoản hoặc thêm fixture F/Q vào `tms`.

Bằng chứng cục bộ: `scratch/handover/native19-*.log`, `native-fk-investigation.md`, `native-v19-review.md`, `native-http-v18-result.json`, `native-http-result.json`, `native-http-export-check.txt`, `main-db-before.json`, `main-db-after.json`, `main-v19-smoke.json`, `main-v19-file-work.png`. Các file cấu hình/credential/fixture local không đưa lên Git.

Skills: `verification-loop`, `tdd-workflow`; thực hiện/review theo kế hoạch đã duyệt. Gate native và HTTP hoàn tất. S11 vẫn **IN_REVIEW** cho nghiệm thu người dùng/pilot và các tiêu chí ngoài phạm vi; không tự ký toàn bộ 38 kịch bản UAT từ kiểm thử tự động.
