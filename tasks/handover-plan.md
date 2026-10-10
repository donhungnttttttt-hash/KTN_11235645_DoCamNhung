# Bàn giao theo vai trò — 06/10/2026

Người dùng đã yêu cầu tạo tài khoản Admin/PM/Tester/Dev, tự kiểm thử, sửa 7 cảnh báo Java, bàn giao và push lên system-design.

## Giới hạn chung
- Giữ các thay đổi ADMIN/FQ đã review; không làm lại nhiệm vụ DONE.
- Không reset, clean hoặc chạy fixture phá dữ liệu trên tms. Kiểm thử migration dùng schema riêng.
- Được tạo tài khoản và commit/push system-design; không merge, force-push hay triển khai ngoài máy này.
- Không đưa mật khẩu, cấu hình local hoặc dữ liệu khách hàng lên Git.

## Task 1: Sửa cảnh báo null Java
Tái hiện 7 cảnh báo potential null trong FileWorkSessionService, QaService, FileWorkExecutionTest, FileWorkServiceTest, FileWorkSessionTest, QaServiceTest bằng JDT có potentialNullReference bật. Sửa null flow thực sự, không tắt warning/suppress. Giữ hành vi, chạy các test liên quan và chẩn đoán lại. Lưu bằng chứng và diff so với working tree trước sửa. Không commit riêng vì các file thuộc đợt ADMIN/FQ chưa commit; controller sẽ commit toàn bộ sau review.

## Task 2: Tài khoản và kiểm thử thực tế
Kiểm tra quyền native hiện tại, dùng schema riêng để kiểm thử migration khi quyền cho phép. Chuẩn bị backup trước migration live. Tạo tài khoản thử nghiệm có vai trò tương ứng, kiểm thử API quyền và luồng nghiệp vụ; ghi rõ kiểm thử đã chạy và phần chưa chạy. Không suy diễn compile thành nghiệm thu runtime.

## Task 3: Bàn giao và push
Cập nhật hướng dẫn/PRD/đặc tả/STATUS bằng kết quả thực tế; kiểm tra diff, secrets và build/test cần thiết. Commit và push system-design, kiểm tra remote SHA.

## Kết quả 06/10/2026
- Task 1 hoàn tất, review Approved: 7 cảnh báo sửa xong; JDT cuối 192 source / 0 lỗi / 0 cảnh báo.
- Task 2 tài khoản và kiểm tra quyền hoàn tất: 4 tài khoản, PM/Tester/Dev vào DEMO-PILOT, 47 kiểm tra HTTP, browser đăng nhập đủ 4 vai trò. Phát hiện/sửa thêm lỗi 500 khi gán thành viên do projection MySQL; regression RED/GREEN, review Approved; 396 test offline PASS.
- Task 2 migration/full F/Q còn chặn bởi quyền MySQL: root cấu hình trả 1045, chưa có schema riêng. Đã backup; không chạy fixture phá dữ liệu trên tms hoặc ghi PASS không có bằng chứng.
- Task 3 bộ tài liệu/kiểm tra đã hoàn thiện, code tập hợp tại commit `2a0ace7`; báo cáo đầy đủ tại docs/reviews/2026-10-06-role-handover.md. Trạng thái push được đối chiếu remote trong bước bàn giao cuối. Native UAT không vì push mà tự chuyển DONE.

## Tiếp tục nghiệm thu native — 06/10/2026
- Người dùng yêu cầu hoàn tất phần còn lại, bao gồm cập nhật backend local cổng 8080 sau kiểm thử migration và luồng F/Q. Đây là quyền thực hiện restart local; không mở rộng sang deploy bên ngoài.
- Đã kiểm tra lại: tài khoản app/migrator hoạt động nhưng chỉ được cấp quyền trên `tms`; schema hiện vẫn V16. Mật khẩu root native hợp lệ chưa được cung cấp, không thử lại credential đã thất bại hoặc reset root.
- Bổ sung 5 kịch bản giao dịch/concurrency native và 2 test guard offline; mở allowlist runner cho đúng suite mới. Không thay đổi mã nghiệp vụ hoặc cơ chế clean migration.
- Guard Java 2/2 và runner Node 7/7 PASS; JDT 194 source, 0 lỗi/0 cảnh báo. Review độc lập Approved trong phạm vi source; native vẫn NOT_RUN. Chi tiết tại `docs/reviews/2026-10-06-native-completion-preflight.md`.
- Tiếp theo: cấp schema riêng bằng root hợp lệ, chạy fresh/upgrade V18 và integration/concurrency, chạy HTTP đủ Admin→PM→Tester→Dev→retest/QA/export, backup mới, rồi áp migration/restart 8080 và kiểm tra lại. Không đánh dấu hoàn thành trước khi có bằng chứng runtime.

## Kết quả hoàn tất native — 06/10/2026
- Credential native người dùng cung cấp đã kết nối root thành công ở 3307. Tạo/cấp schema riêng, không thay đổi mật khẩu hoặc đưa credential lên Git.
- Native phát hiện hai FK QA dùng chung index với phần nullable bị bỏ lọt trên MySQL 9.7 hiện tại; V19 tách thứ tự/index, thêm FK kiểm tra dữ liệu trước khi bỏ FK cũ. V1–V18 giữ nguyên.
- Migration 1/1, integration 5/5, concurrency 5/5 PASS; cấu hình local 5/5, guard 2/2, runner 7/7, JDT 194 source 0 lỗi/0 cảnh báo. HTTP 37 bước mỗi bản V18/V19, export đối chiếu nội dung PASS.
- Backup mới V16 SHA-256 đã kiểm tra; `tms` nâng V19, 56 bảng nghiệp vụ cũ giữ số dòng. Backend 8080 PID 40628 bản mới readiness UP, 23 HTTP kiểm tra 4 vai trò PASS, browser PM tải dashboard/công việc theo file không có lỗi console. Frontend 5173 giữ nguyên.
- Hướng dẫn pull-and-run và template native đã cập nhật; local có thể dùng một DB account cho app/Flyway hoặc tài khoản migration riêng. Báo cáo `docs/reviews/2026-10-06-native-completion.md`. UAT/pilot do người dùng nghiệm thu riêng.
