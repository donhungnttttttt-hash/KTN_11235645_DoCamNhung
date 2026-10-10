# Dữ liệu demo V22 — 09/10/2026

V22 bổ sung **100 tài khoản và 120 thiết bị** để thử tìm kiếm, phân trang, phân quyền và bàn giao theo dự án. Đây là dữ liệu giả lập cho local, không phải danh sách nhân sự hay tài sản thật. Dữ liệu cũ được giữ nguyên. Người dùng yêu cầu 30 iPad; ba nhóm còn lại dùng mặc định đã thông báo: 30 iPhone, 30 tablet Android, 30 smartphone Android.

## Đăng nhập và quyền

Mật khẩu chung của **100 tài khoản mới**: **`@test1234`**. Mỗi tài khoản lưu PBKDF2 với salt riêng. Không reset mật khẩu khi khởi động lại.

| Quyền | Tài khoản | Số lượng | Công việc |
| --- | --- | ---: | --- |
| PM | `syp.lab.pm01` đến `syp.lab.pm03` | 3 | Nhận dự án; nhập/duyệt case, phân công, quản lý đợt/build, theo dõi, giao bug/QA/retest và đóng lỗi |
| DEV | `syp.lab.dev01` đến `syp.lab.dev20` | 20 | Xử lý bug/QA được giao, báo build sửa; không ghi kết quả test hoặc tự đóng lỗi |
| TESTER | `syp.lab.tester01` đến `syp.lab.tester77` | 77 | Nhận file/máy, thực thi, tạo bug/QA và retest trong phạm vi được giao |

Dùng Admin demo V20 **`syp.demo.admin`** để quản trị toàn bộ (mật khẩu ban đầu `@test1234`; nếu đã đổi thì giữ mật khẩu đã đổi). V22 không tạo thêm Admin hoặc cấp quyền tạo tài khoản cho PM. Các user mới chỉ có membership của dự án bên dưới. Tài khoản cũ như `admin.local` không đổi quyền hoặc mật khẩu.

Danh sách đủ 100 user và dự án: [demo-v22-users.csv](demo-v22-users.csv). File CSV có BOM UTF-8 để mở bằng Excel.

## Ba dự án thực hành

| Mã dự án | PM | Dev | Tester | Thành viên | Máy đã giao |
| --- | --- | --- | --- | ---: | ---: |
| `SYP-LAB-22-IOS` | pm01 | dev01–07 | tester01–26 | 34 | 12 |
| `SYP-LAB-22-TABLET` | pm02 | dev08–14 | tester27–52 | 34 | 6 |
| `SYP-LAB-22-PHONE` | pm03 | dev15–20 | tester53–77 | 32 | 6 |

Các tên rút gọn trong bảng đều có tiền tố `syp.lab.`. Mỗi dự án có môi trường QA, hai build `1.0.0/LAB-1` và `1.0.1/LAB-2`, danh mục chức năng/giao diện, một mốc sau 30 ngày và đợt nháp `LAB-C1`. Dự án iOS có hai cấu hình logic iPad/iPhone; mỗi dự án Android có một cấu hình. Thời hạn tính từ lần áp dụng migration, không tự dời khi restart.

**V22 không thêm file Excel, test case, kết quả test, phiên làm việc hay bug giả.** PM nhập file thật qua Thư viện test case, duyệt phiên bản, thêm/phân công file và kích hoạt đợt. Hai file đã chuẩn bị ở dự án `SYP-DEMO-20` trước đây vẫn giữ nguyên; xem [V20](demo-v20.md).

## Kho máy

| Nhóm | Mã (01–30) | Model, 10 máy mỗi model | OS giả lập luân phiên |
| --- | --- | --- | --- |
| iPad | `SYP-LAB-22-IPAD-01`…`30` | iPad 8th / iPad 9th / iPad Air 4th | iPadOS 16.6 / 17.5.1 / 18.0 |
| iPhone | `SYP-LAB-22-IPHONE-01`…`30` | iPhone 11 / 12 / 13 | iOS 16.6 / 17.5.1 / 18.0 |
| Tablet Android | `SYP-LAB-22-TABLET-01`…`30` | Galaxy Tab S8 / S8+ / S8 Ultra | Android 12 / 13 / 14 |
| Smartphone Android | `SYP-LAB-22-PHONE-01`…`30` | Galaxy S21 5G / S21+ 5G / S21 Ultra 5G | Android 12 / 13 / 14 |

Mỗi máy có mã riêng, model, serial DEMO duy nhất, OS/phiên bản, tình trạng; ghi chú chứa nhóm máy, dung lượng, màu, kết nối, phụ kiện và vị trí kho. Không dùng serial/IMEI của thiết bị thật. Tablet và smartphone Android dùng loại `ANDROID` hiện có, phân biệt bằng mã/model/ghi chú. Đây là các cấu hình lịch sử để test bộ lọc, không phải đề xuất OS mới nhất hoặc xác nhận đã kiểm thử trên máy vật lý.

Danh sách đủ trường: [demo-v22-devices.csv](demo-v22-devices.csv).

Trong **mỗi nhóm 30 máy**:

- 01–06 đang bàn giao; 07–26 sẵn sàng trong kho; 27–29 bảo trì; 30 ngừng sử dụng.
- Tổng giao diện: **24 đang bàn giao + 80 sẵn sàng + 12 bảo trì + 4 ngừng sử dụng = 120**.
- `condition_code=AVAILABLE` là tình trạng vật lý, bao gồm cả máy đang giao; trạng thái hiển thị còn tính lượt bàn giao đang mở.
- iPad01–06 giao tester01–06, iPhone01–06 giao tester07–12, Tablet01–06 giao tester27–32, Phone01–06 giao tester53–58; hạn trả sau 14 ngày.
- Mỗi máy chỉ có một lượt bàn giao đang mở. Các lượt và audit ghi rõ `DEMO_SEED`/V22.

Đã đối chiếu phạm vi model/OS với tài liệu hãng: [Apple iPadOS 18](https://www.apple.com/newsroom/2024/09/ipados-18-is-now-available-taking-ipad-to-the-next-level/), [Apple iOS/iPadOS 18](https://support.apple.com/en-bh/121250), [Samsung Galaxy Tab S8 ra mắt](https://news.samsung.com/us/galaxy-tab8-unpacked/?na=s), [Samsung Android 14](https://www.samsung.com/de/support/newsalert/126255/). Không dùng các nguồn này thay cho kiểm thử phần cứng thật.

## Cách nạp sau khi pull

1. Cấu hình MySQL trong `.env.mysql.local` theo [README](../../README.md); database đã tồn tại, user migration có quyền trên schema. Máy bàn giao dùng `127.0.0.1:3307/tms`.
2. Đặt `TMS_BOOTSTRAP_ENABLED=false`, chạy backend profile `local` như hướng dẫn. Flyway tự áp dụng V22 từ `db/demo`, không cần chạy SQL bằng tay. Frontend chạy bình thường ở 5173.
3. Đăng nhập Admin → Người dùng, tìm `syp.lab.`; Kho thiết bị tìm `SYP-LAB-22-`. Đổi role/project để kiểm tra lọc. PM01/02/03 chỉ nhận dự án tương ứng.

Migration: `Backend/src/main/resources/db/demo/V22__local_scale_demo_data.sql`. Core hiện tại là V21; local bổ sung V20 và V22, release không nạp `db/demo`. **Migration core tiếp theo phải dùng V23 trở lên.** Không chạy release trên cùng schema đã dùng demo.

V22 chỉ INSERT trong transaction. Nếu trùng tên user/mã dự án/máy hoặc Admin demo bị thiếu/khóa/đổi quyền thì dừng và rollback; không tự sửa quyền, ghi đè dữ liệu hoặc reset user. Flyway/MySQL có thể lưu một bản ghi migration thất bại; chỉ xử lý xung đột và lịch sử sau khi điều tra, không tự `clean`/`repair` để bỏ qua.

## Kiểm nghiệm và giới hạn

Test migration cần schema riêng mới, trống, đã cấp quyền:

```powershell
node scripts/Test-FileWorkQaNative.cjs tms_docstest_<12-hex> fresh-migration NativeScaleDemoMigrationTest
```

Test kiểm tra fresh, nâng V21→V22 giữ bản ghi/workbook, mật khẩu cả 100 user, role/membership/phân bổ/audit, restart không reset, collision rollback và Admin bị đổi quyền. Không chạy fixture trên `tms`. Kết quả UI/API/native và giới hạn nghiệm thu nằm trong [báo cáo kiểm nghiệm](../reviews/2026-10-09-verification-demo-v22.md).
