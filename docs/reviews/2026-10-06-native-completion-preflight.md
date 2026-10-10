# Chuẩn bị hoàn tất nghiệm thu native F/Q — 06/10/2026

Yêu cầu tiếp tục của người dùng gồm migration V17/V18, trọn luồng F/Q và cập nhật backend local 8080. Phần tài khoản, kiểm tra quyền và mã nghiệp vụ đã bàn giao ở [báo cáo trước](2026-10-06-role-handover.md); đợt này không làm lại những phần đã đạt.

## Bổ sung kiểm thử

- `NativeFileWorkQaConcurrencyTest`: 5 kịch bản với giao dịch service thật, không có transaction bao ngoài test: identity SHARE và projection tên QA; trạng thái/version BUG sau writer commit; quyền Dev sau đổi người được giao; hai comment QA cùng request; commit độc lập và rollback batch khi mục thứ hai lỗi version.
- `NativeFqDatabaseGuardTest`: 2 test offline kiểm tra URL/mode/credential trước kết nối. Từ chối schema `tms`, host ngoài máy, port không hợp lệ, query URL thay đổi, thiếu cấu hình và sai mode.
- Runner chỉ thêm selector `NativeFileWorkQaConcurrencyTest` trong mode `integration`; vẫn yêu cầu schema riêng V18. Không thay đổi cleanup của suite migration.

## Bằng chứng đã có

| Kiểm tra | Kết quả |
|---|---|
| Node runner regression | RED trước allowlist mới; GREEN 7/7 |
| Java guard | RED trước helper overload; GREEN 2/2, không skip |
| Maven compile | 127 main + 67 test source đạt |
| JDT null/unused diagnostics | 194 source, 0 lỗi, 0 cảnh báo |
| Review độc lập delta | Approved về source, không có Critical/Important |
| Native fresh/upgrade/integration/concurrency | NOT_RUN |
| HTTP trọn luồng F/Q mới | NOT_RUN |
| Áp V17/V18 và restart backend 8080 | NOT_RUN |

Hai test stale BUG dùng latch sau identity lock và chờ writer commit. Chúng kiểm tra dữ liệu/quyền sau commit trong command đang chạy, chưa chứng minh riêng việc waiter đã vào project-lock wait hoặc đã có snapshot repeatable-read cũ. Kịch bản identity/projection kiểm tra quan hệ lock bằng SQL/service thật. Tất cả khẳng định runtime vẫn phải chờ suite chạy trên MySQL.

Coverage: **NOT_MEASURED**. Compile hoặc guard PASS không thay cho nghiệm thu native. Log và review cục bộ nằm trong `scratch/handover/native-completion-report.md`, `native-completion-review.md`, `native-completion-jdt/` (không đưa cấu hình/credential local lên Git).

Skills áp dụng: `tdd-workflow`, `verification-loop`; thực hiện theo kế hoạch bàn giao đã duyệt.

## Điều kiện còn thiếu và thứ tự hoàn tất

Kiểm tra lại native MySQL `127.0.0.1:3307`: app/migrator chỉ có quyền trên `tms`, Flyway hiện V16, chưa thấy schema kiểm thử được cấp. Root cấu hình từng bị từ chối 1045; file credential chưa thay đổi. Đã đề nghị người dùng cập nhật credential root native vào `.env` cục bộ, không gửi mật khẩu vào chat. Không reset root, tạo server thay thế hoặc chạy fixture trên dữ liệu đang sử dụng.

1. Dùng root hợp lệ tạo/cấp schema `tms_docstest_202610030001`, xác minh quyền và trạng thái schema.
2. Chạy migration fresh/upgrade bằng runner có guard; chạy hai suite integration/concurrency trên V18.
3. Chạy API thật theo vai trò: tạo dự án/thiết bị/thành viên, import, giao file, phiên làm việc, kết quả, BUG→Dev→retest→PM đóng, QA và export. Kịch bản HTTP đã chuẩn bị cục bộ nhưng chưa chạy.
4. Khi đạt: backup mới dữ liệu đang dùng, xác minh và dừng đúng tiến trình backend 8080, áp migration bằng Flyway, khởi động bản mới và kiểm tra health/version/API.
5. Cập nhật bằng chứng, bàn giao và push `system-design`; giữ S11 ở IN_REVIEW nếu còn tiêu chí chưa nghiệm thu.
