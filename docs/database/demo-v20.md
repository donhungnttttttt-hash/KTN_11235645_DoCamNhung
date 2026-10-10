# Dữ liệu demo V20 — 07/10/2026

Bổ sung ngày 09/10: [V22 thêm 100 user, 120 máy và 3 dự án](demo-v22.md). V20 bên dưới giữ nguyên, không sửa migration đã chạy. Core hiện tại V21, local đến V22; migration mới dùng V23 trở lên.

V20 được nạp tự động khi chạy `mvn spring-boot:run` (profile local). Chỉ cần cấu hình database/schema đã tồn tại và tài khoản có quyền migration trong `.env.mysql.local`; xem [hướng dẫn chạy](../../README.md). Đặt `TMS_BOOTSTRAP_ENABLED=false` khi dùng bộ demo này.

## Tài khoản

Mật khẩu chung: **`@test1234`**. Database lưu PBKDF2 với salt riêng cho mỗi tài khoản, không lưu mật khẩu dạng rõ. Đây là tài khoản demo công khai dành cho local.

| Tên đăng nhập | Quyền | Phạm vi và thao tác |
| --- | --- | --- |
| `syp.demo.admin` | ADMIN | Dashboard tổng, tạo dự án, quản lý user, gán thành viên, bàn giao/thu hồi thiết bị |
| `syp.demo.pm` | PM | Hai dự án demo; nhập và duyệt case, phân công file, quản lý đợt, theo dõi tiến độ, phân công bug/QA, đóng lỗi |
| `syp.demo.tester01` | TESTER | Chỉ dự án iPad; thực thi file được giao, ghi kết quả, tạo bug/QA, xác minh và retest |
| `syp.demo.tester02` | TESTER | Cả hai dự án; thực thi công việc của mình trong từng dự án |
| `syp.demo.dev` | DEV | Hai dự án; xem case, xử lý bug/QA được giao và cập nhật bản sửa; không ghi kết quả test hoặc tự đóng lỗi |

PM chưa được cấp quyền tạo user. ADMIN không được thêm làm PM của dự án. V20 không thay mật khẩu, quyền hoặc dữ liệu của `admin.local`, `handover.*`, `Syp_admin*` hay tài khoản khác. Khởi động lại cũng không đặt lại mật khẩu/trạng thái tài khoản demo sau khi người dùng thay đổi.

## Dữ liệu nền

- `SYP-DEMO-20`: dự án kiểm thử iPad, PM + Tester 01 + Tester 02 + Dev.
- `SYP-DEMO-WEB-20`: dự án web trên Android, PM + Tester 02 + Dev. Tester 01 không có quyền truy cập.
- Mỗi dự án có môi trường QA, thiết bị logic phù hợp, hai build `1.0.0/DEMO-1` và `1.0.1/DEMO-2`, danh mục chức năng/giao diện, mốc hoàn thành và một đợt `DEMO-C1` ở trạng thái nháp với cấu hình đầy đủ.
- Mốc hoàn thành lần lượt sau 14 và 21 ngày tính từ lần áp dụng V20, không dịch lại mỗi lần khởi động.
- Bốn tài sản giả lập được đánh dấu DEMO, không đại diện cho máy thực; chưa có serial thực tế.

| Mã tài sản | Phân bổ |
| --- | --- |
| `SYP-DEMO-20-IPAD-01` | Dự án iPad → Tester 01 |
| `SYP-DEMO-20-IPAD-02` | Dự án iPad → Tester 02 |
| `SYP-DEMO-20-ANDROID-01` | Dự án Android → Tester 02 |
| `SYP-DEMO-20-IPHONE-01` | Kho dự phòng, chưa bàn giao |

## File test case

**V20 không chứa file Excel, test case, kết quả hay bug giả.** Máy mới pull code sẽ có dữ liệu nền; PM nhập file qua Thư viện test case, duyệt phiên bản, phân công file và kích hoạt đợt để bắt đầu. Không đưa workbook của người dùng vào Git.

Riêng database local bàn giao trên máy hiện tại, đã chuẩn bị hai file có sẵn qua API import của ứng dụng, giữ nguyên tên và byte file gốc:

| File | Số case | Người thực hiện |
| --- | --- | --- |
| `(タブレット)(#標準)テスト仕様書(スタンプ機能)_VI.xlsx` | 87 | `syp.demo.tester01` |
| `Demo-khoi-phuc-test-case.xlsx` | 1 | `syp.demo.tester02` |

Cả hai thuộc `SYP-DEMO-20`, đợt `DEMO-C1`, cấu hình QA/iPad/build DEMO-1. Phiên bản case đã được PM duyệt, file đã phân công; không tạo phiên hay ghi kết quả thực thi trên database bàn giao. Kết quả tham khảo có sẵn trong Excel vẫn là dữ liệu nguồn, không phải kết quả thực thi của đợt mới.

Đăng nhập Tester → chọn dự án iPad → công việc theo file → chọn file được giao → bắt đầu với máy đã bàn giao và build DEMO-1. PM theo dõi tiến độ; khi có bug/QA thì phân công Dev. Dev báo bản sửa DEMO-2, PM giao retest, Tester xác minh, PM quyết định đóng.

## Migration và kiểm thử

Migration nằm ở `Backend/src/main/resources/db/demo/V20__local_role_demo_data.sql`; local bổ sung location `db/demo` bên cạnh `db/migration`. Tại thời điểm V20, core đến V19; hiện core đã có V21 và local bổ sung V22. Release không tự cài tài khoản demo. Dành số V20/V22 riêng cho demo; migration tiếp theo dùng V23 trở lên. Không dùng chung database demo với release hoặc xóa lịch sử demo để chuyển profile.

Script chỉ INSERT, không UPDATE/DELETE dữ liệu cũ. Trùng namespace demo sẽ báo lỗi và rollback toàn bộ dữ liệu của V20. Cần giải quyết xung đột và kiểm tra lịch sử Flyway có người giám sát; không tự `clean`, `repair`, sửa checksum hay reset database đang dùng.

Kiểm thử native yêu cầu schema **mới, trống**, được cấp quyền trước:

```powershell
node scripts/Test-FileWorkQaNative.cjs tms_docstest_<12-hex> fresh-migration NativeDemoDataMigrationTest
```

Test tự kiểm tra schema riêng, fresh/upgrade V19→V20, hash mật khẩu, FK/phân bổ, giữ dữ liệu cũ, chạy lại không reset user, không seed file và rollback khi trùng thiết bị. Test không được chạy trên `tms`. Bằng chứng và giới hạn xem [review V20](../reviews/2026-10-07-demo-v20.md).
