# Khôi phục thao tác kết quả và quyền Admin tổng — 10/10/2026

## Nguyên nhân đã xác minh

Đối chiếu Git cho thấy `ResultCycleButton` và autosave chưa bị xóa. Commit `496378b` thêm `isProjectObserver` để khóa Admin ngoài membership ở frontend; backend cũng kiểm tra membership/PM/assignee. Ngoài ra, `ProjectDataProvider` dùng `membershipId=0` như dấu hiệu chỉ xem, nên nút tạo/sửa công việc vẫn bị khóa dù metadata cho phép. Vòng cũ có P trước NG và thêm Fixed.

Theo yêu cầu mới, ADMIN có toàn quyền nghiệp vụ. Không khôi phục nguyên cả commit cũ vì sẽ mất các sửa UI, nhập Excel và liên kết dữ liệu đã làm.

## Thay đổi

- Nút kết quả tài liệu chuyển bằng một lần bấm: **Unexecuted → OK → NG → P → NA → Unexecuted**, tự lưu. Import mới mặc định UNEXECUTED; dữ liệu/kết quả Fixed cũ và workbook nguồn được giữ, không reset hàng loạt.
- Frontend và backend cho ADMIN tạo/sửa/duyệt case, phân công/test lần 2, quản lý đợt, ghi kết quả tài liệu/thực thi/retest, xử lý công việc và QA. Không cần active membership hoặc được giao riêng. Capability từ API được áp dụng khi membershipId bằng 0; chưa tải được quyền thì khóa thao tác.
- Lịch sử ghi đúng Admin thực hiện. Liên kết MEMBER không hoạt động chỉ được tạo khi lệnh ghi cần FK membership, không thêm PM/Tester hay tăng roster hoạt động. GET không tạo liên kết; hạ quyền/khóa tài khoản không để lại quyền dự án mới.
- V28 tách executor thực tế khỏi người nhận máy/người khởi tạo phiên, vẫn giữ FK project/asset/allocation/session/executor. Trạng thái, phiên bản, idempotency, CSRF, đúng dự án, nguồn đã duyệt, context, đóng/mở lại vẫn áp dụng.
- Giữ riêng preview import và hội thoại AI của từng người như yêu cầu trước. Quyền Tester/Dev không được mở rộng theo Admin.
- Đồng bộ mô tả quyền API và bổ sung ba tham chiếu còn thiếu trong OpenAPI chính cho sửa ô, lịch sử sửa ô và phân công test lần 2.

## Kiểm chứng

Skills áp dụng: `code-review-and-quality` để đối chiếu lịch sử và guard, `security-review` cho quyền/actor/FK, `verification-loop` cho test và kiểm tra local. Giữ các sửa UI/UX từ lượt trước; không coi đây là nghiệm thu lại toàn bộ màn hình.

| Kiểm tra | Kết quả |
| --- | --- |
| Red trước sửa | Vòng bấm sai thứ tự; Admin không membership bị khóa; HTTP lưu kết quả trả 404. Bổ sung test provider tái hiện nút công việc vẫn khóa và quyền chưa tải vẫn mở. |
| Frontend toàn bộ | **70 file / 756 test PASS**, bao gồm bấm liên tiếp, lưu/tải lại, quyền Admin, giữ kết quả cũ, state lỗi/quyền chưa tải. |
| Build frontend | PASS; còn cảnh báo chunk 642.58 kB đã có, không phải lỗi build. |
| Backend unit | **57 lớp / 546 test PASS**. |
| Native MySQL hồi quy cuối | **35 test PASS**: Admin workspace 4, file/QA 2, concurrency 5, file/bug/retest/closure 12, document 12. Admin kiểm thử lại FULL_CASE và BUG_ONLY cho Tester, lưu đúng executor, không thay assignee. |
| Migration V27 → V28 | 1 test PASS trên schema riêng; giữ dữ liệu session/attempt, validate migration và FK. |
| Database mới | Tạo schema rỗng riêng rồi migrate tới V28; document 12 và file/QA integration 10 PASS trước bổ sung 2 biến thể Admin retest ở lượt hồi quy cuối. |
| Eclipse / Java Problems | **258 file, 0 lỗi / 0 cảnh báo** trên source cuối. |
| Runner database | 12 test PASS; chỉ schema test được phép nhận fixture. |
| Contract / diff | Checker PASS: 112 operation S03–S10, 19 file-work, 14 QA/handoff, 53 schema F/Q và liên kết 52 tài liệu. `git diff --check` PASS theo cấu hình line-ending của repository. |
| Runtime | Backend 8080 khởi động thành công, health UP, schema `tms` V28. |
| Database local chỉ đọc | 76 bảng, **185 FK + 6 kiểm tra domain + 7 kiểm tra linkage**, 0 vi phạm. Count trước/sau chỉ tăng 1 dòng Flyway; các bảng nghiệp vụ không đổi số dòng. Đây là kiểm tra count/FK, không phải so hash toàn bộ payload. |
| Chrome local sau restart | Tài khoản `[Demo] Quản trị tổng`: nút Thêm công việc enabled; mở document 13, cả 13 nút kết quả enabled, tooltip Unexecuted → OK. Không ghi kết quả giả lên dữ liệu đang dùng. |

Logs cục bộ: `var/ui-audit/admin-frontend.log`, `admin-unit.log`, `admin-native.log`, `admin-upgrade.log`, `admin-fresh.log`, `document-backend.log`; diagnostics tại `Backend/target/java-diagnostics/diagnostics.json`; audit tại `var/ui-audit/admin-database-before.json`, `admin-database-after.json`, `workflow-links.json`. Backup trước migration: `var/mysql-native/backups/2026-10-10T15-33-54-219Z-tms.sql` (không chứa dữ liệu session).

Coverage của phạm vi cuối **chưa đo**, không suy ra từ số test PASS. Chrome xác minh được accessibility tree và điều hướng; capture screenshot gặp timeout nên không tuyên bố đã kiểm tra hình ảnh từng pixel. Toàn bộ thao tác ghi trong kiểm thử chạy trên database cô lập, không dùng `tms` làm fixture.

## Bàn giao

Hoàn tất bản sửa local; nhánh `system-design`, **không commit/push/merge/deploy**. S11 vẫn IN_REVIEW cho gate UAT và môi trường thật hiện có. Người dùng tải lại trang và vào Không gian dự án để dùng quyền mới.
