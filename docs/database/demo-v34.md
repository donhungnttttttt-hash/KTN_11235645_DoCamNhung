# Bộ dữ liệu demo V34

Cập nhật source ngày 25/10/2026. V34 bổ sung dữ liệu giả lập cho luồng **Dự án → Feature → file XLSX → case/Status → Bug hoặc QA**, kèm phân công, thiết bị, ghi chú và báo cáo. Đây là bộ demo công khai để các máy có thể bắt đầu với cùng kịch bản nghiệp vụ; không phải bản sao dữ liệu thật của một máy.

## Migration nằm ở đâu?

| Nhóm | Nguồn | Profile sử dụng |
| --- | --- | --- |
| Migration chính | `Backend/src/main/resources/db/migration` và `Backend/src/main/java/db/migration` | Local và release |
| Demo cũ V20, V22 | `Backend/src/main/resources/db/demo` | Local |
| Demo mới V34 | [V34__complete_local_demo.java](../../Backend/src/main/java/db/demo/V34__complete_local_demo.java), [Demo34Workbook.java](../../Backend/src/main/java/db/demo/Demo34Workbook.java) | Local |

Toàn bộ V1–V33 được giữ lại. Database **local mới hoàn toàn**, chạy source hiện tại, áp dụng V1–V34 theo thứ tự. Database local đã có V1–V33 hợp lệ chỉ cần áp dụng V34. Flyway ghi nhận từng migration đã chạy trong `flyway_schema_history` và không chạy lại migration đã hoàn tất khi khởi động lần sau.

Profile `release` chỉ tìm `classpath:db/migration`: không nạp V20, V22, V34. Với bộ source này, release mới có 31 migration chính, phiên bản cuối V33; khoảng trống số phiên bản demo là chủ ý. Job `--tms-migrate` cũng mặc định chỉ chạy migration chính. Chỉ khi chủ động đặt **`TMS_MIGRATION_INCLUDE_DEMO=true`**, job này mới tìm thêm `classpath:db/demo`; giá trị khác `true`/`false` bị từ chối. Initializer native đã bật cờ này cho tiến trình migration để đồng nhất với profile local.

## Tài khoản demo

Mật khẩu chung của **sáu tài khoản V34** là **`TmsDemo34!2026`**. Đây là mật khẩu công khai dành cho môi trường demo, không phải mật khẩu MySQL và không dùng cho dữ liệu vận hành thật.

| Tên đăng nhập | Role | Vai trò trong bộ demo |
| --- | --- | --- |
| `syp.demo34.admin` | ADMIN | Quản trị tổng; xem và quản trị các dự án |
| `syp.demo34.pm` | PM | PM của cả hai dự án demo |
| `syp.demo34.dev01` | DEV | Nhận xử lý Bug/QA |
| `syp.demo34.dev02` | DEV | Nhận xử lý Bug/QA |
| `syp.demo34.tester01` | TESTER | Người test đầu tiên của 80 case |
| `syp.demo34.tester02` | TESTER | Người được phân công test lần 2 cho 40 case |

V34 không đổi mật khẩu, trạng thái hoạt động hay phân quyền của tài khoản có sẵn. Tài khoản V20/V22 vẫn giữ nguyên theo migration cũ. Khi người dùng đổi mật khẩu tài khoản V34 sau khi nạp, khởi động lại không đặt về mật khẩu demo.

## Dữ liệu được bổ sung

Các số dưới đây **chỉ tính phần V34 thêm vào**, không phải tổng toàn database sau V1–V34; bộ demo cũ và dữ liệu bạn tạo trước đó vẫn tồn tại.

| Đối tượng | Số lượng / nội dung |
| --- | --- |
| Dự án | 2: `TMS-DEMO34-MOBILE` — **[DEMO34] Spider Plus Mobile**; `TMS-DEMO34-WEB` — **[DEMO34] Cổng quản trị Web** |
| Feature | 4: Đăng nhập và phân quyền; Quản lý bản vẽ; Quản trị dự án; Báo cáo và phân tích |
| File XLSX | 8 file, mỗi Feature có file chức năng và giao diện, 10 case/file |
| Case | 80 case có nội dung, điều kiện, bước thực hiện, kết quả mong đợi và liên kết tới file |
| Status ban đầu | **30 OK · 10 NG · 6 P · 8 NA · 26 UNEXECUTED (chưa chạy)** |
| Phân công | 80 người test đầu tiên; trong đó 40 case có phân công test lần 2, kèm lịch sử |
| Kết quả đã ghi | 54 case có người ghi, thời điểm và lịch sử Status; 26 case chưa chạy |
| Issue | 32: 20 Bug, 12 QA; có phân công, lịch sử/trao đổi, liên kết Feature và case; mỗi dự án có một Bug monkey không gắn case |
| Ghi chú | 4 ghi chú dự án |
| Báo cáo | 4 bản báo cáo Markdown mẫu |
| Thiết bị | 6: 2 iPad, 2 iPhone, 2 Android |
| Bàn giao | 4 bàn giao đang mở cho Tester của dự án; 2 thiết bị còn sẵn sàng |
| Danh mục và thông tin dự án | Có môi trường, build, thiết bị cấu hình, danh mục, mốc thời gian và sổ tay giả lập |

Mỗi dự án có 10 Bug minh họa đủ trạng thái `open`, `progress`, `recheck`, `clarify`, `ready`, `planning`, `resolved`, `unreproducible`, `wontfix`, `closed`; 6 QA minh họa `open`, `progress`, `clarify`, `resolved`, `recheck`, `closed`. Đây là dữ liệu thực hành theo luồng hiện có, không phát sinh thay đổi quy tắc nghiệp vụ.

Workbook được sinh từ nội dung giả lập và lưu trong database, có thể tải file gốc hoặc xuất kết quả hiện tại. Bộ này không mang theo tài liệu, ảnh/chứng cứ của khách hàng hoặc file từ máy người dùng.

## Chạy trên máy mới

Chuẩn bị JDK 21, Node 24 và MySQL Server. Docker không bắt buộc. MySQL Workbench chỉ là công cụ xem/quản trị server.

### Cách A — Chưa có database và tài khoản ứng dụng

Dùng [Initialize-NativeMySql.ps1](../../scripts/Initialize-NativeMySql.ps1) trên máy chưa có schema `tms`, các user `tms_app`/`tms_migrator`/`tms_viewer`, `.env.mysql.local` hoặc checkpoint `var/mysql-native/pending.env`. **Không copy `.env.mysql.example` trước cách này**; script tự sinh cấu hình và mật khẩu MySQL. Script có gọi RTK bên trong nên cần RTK.

Từ thư mục gốc, build lại JAR từ source vừa pull, rồi khởi tạo:

```powershell
cd Backend
rtk proxy .\mvnw.cmd -B -ntp -DskipTests package
cd ..
rtk proxy powershell -NoProfile -File scripts/Initialize-NativeMySql.ps1 -Port 3307 -MySqlClient "C:\Program Files\MySQL\MySQL Server 9.7\bin\mysql.exe"
```

Thay `3307` và đường dẫn `mysql.exe` cho đúng máy. Cổng/đường dẫn trên chỉ là ví dụ theo cấu hình máy phát triển, không phải yêu cầu cài MySQL đúng thư mục đó. Thêm `-AdminUser` nếu tài khoản quản trị không phải `root`. Mật khẩu quản trị được hỏi kín tại terminal; không ghi vào lệnh hoặc đưa lên Git. Thêm `-PlanOnly` nếu chỉ muốn xem đích và kế hoạch, không tạo database.

Script từ chối ghi đè schema, user, cấu hình đã tồn tại. Nó tạo schema/quyền, chạy và validate tất cả migration local, kiểm tra không có migration thất bại, rồi lưu cấu hình. Không còn kiểm tra cứng V12 hoặc 56 bảng. `-DskipTests package` chỉ đóng gói, không phải bằng chứng đã chạy test.

Sau khi initializer thành công:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-Backend.ps1
```

### Cách B — Đã tự tạo database và user MySQL

Không chạy lại initializer. Sao chép `.env.mysql.example` thành `.env.mysql.local` **chỉ nếu chưa có file cấu hình**, rồi điền đúng host/port/schema/user/password. User chạy Flyway phải có quyền DDL; có thể dùng `TMS_MIGRATION_USER`/`TMS_MIGRATION_PASSWORD` riêng với user ứng dụng. Đặt `TMS_BOOTSTRAP_ENABLED=false` khi dùng tài khoản demo.

Database phải rỗng hoặc có lịch sử local tương thích. Trong thư mục `Backend`, chạy:

```powershell
.\mvnw.cmd spring-boot:run
```

Maven của repo mặc định chọn profile `local`; cấu hình này nạp cả migration chính và demo. Chạy JAR trực tiếp cần chọn profile local rõ ràng; không coi mọi cách khởi động đều tự bật demo. Cách Maven trực tiếp không cần RTK.

### Mở giao diện

Trong terminal khác:

```powershell
cd Frontend
npm ci
npm run dev
```

Mở **http://127.0.0.1:5173/** sau khi backend chạy ở 8080. Đăng nhập tài khoản V34. Admin có thể vào Không gian dự án; PM/DEV/TESTER chọn một trong hai dự án `[DEMO34]`, mở Quản lý kiểm thử → Feature → file để xem case, phân công, Status và Issue.

## Database và backup đã có

- Database local có lịch sử V1–V33 hợp lệ: backup riêng trước khi nâng cấp, rồi chạy source mới bằng profile local để áp dụng V34 một lần. Không cần chạy lại initializer.
- Không dùng source Git thay cho backup. Nếu cần chuyển **đúng dữ liệu đang sử dụng** sang máy khác, chuyển backup database và file chứng cứ theo quy trình riêng; không đưa backup thật, cấu hình bí mật hoặc dữ liệu cá nhân vào migration demo.
- Backup chỉ chứa migration release có thể thiếu V20/V22 dù version cuối cao hơn. Không nhập rồi mặc định đổi sang local an toàn: thêm migration thấp hơn lịch sử đã áp dụng có thể khiến Flyway từ chối. Phải đối chiếu lịch sử và profile trước; không tự bật `outOfOrder`, `baseline`, `clean` hoặc `repair` để vượt lỗi.
- Theo chiều ngược lại, database đã nạp demo cũng không tự biến thành database release khi đổi profile. Dùng lịch sử/profile nhất quán hoặc chuẩn bị phương án chuyển riêng.
- Nếu initializer dừng, giữ database, log và `var/mysql-native/pending.env` để đối chiếu. Không xóa checkpoint, user hoặc schema để thử lại mù quáng.

## Giới hạn đồng nhất giữa các máy

Các máy nạp V34 sẽ có cùng **mã dự án, tài khoản, kịch bản và số lượng dữ liệu khởi đầu**. Tuy nhiên, ngày mẫu được tính tương đối với lúc chạy migration; ID số được MySQL sinh theo dữ liệu có sẵn, UUID demo được tạo trong namespace riêng, hash mật khẩu có salt. Database không nhất thiết giống từng byte.

Sau khi V34 hoàn tất, thay đổi của người dùng được giữ lại: restart không reset nội dung, phân công, Status hay mật khẩu. V34 không đồng bộ liên tục giữa các máy. Nếu namespace `syp.demo34.*` hoặc `TMS-DEMO34-*` đã bị dùng trước khi nạp, migration dừng để giữ dữ liệu; cần đối chiếu va chạm, không đổi lịch sử Flyway bằng tay.

V34 chỉ tạo nội dung giả lập. Nó không sao chép API key/credential thật, hội thoại hoặc kết quả AI riêng, phiên đăng nhập, dữ liệu giới hạn đăng nhập, hay liên kết/hàng đợi gửi Redmine của người dùng. Các báo cáo trong demo là văn bản mẫu, không gọi AI hoặc dịch vụ ngoài.

## Kiểm tra sau khi nạp

Chạy các truy vấn chỉ đọc trên **đúng database local**:

```sql
SELECT DATABASE(), @@port;
SELECT installed_rank, version, description, success
FROM flyway_schema_history ORDER BY installed_rank;

SELECT code, name FROM projects
WHERE code IN ('TMS-DEMO34-MOBILE', 'TMS-DEMO34-WEB');

SELECT r.result_status, COUNT(*) AS case_count
FROM import_rows r JOIN projects p ON p.id = r.project_id
WHERE p.code IN ('TMS-DEMO34-MOBILE', 'TMS-DEMO34-WEB')
GROUP BY r.result_status;
```

Lần nạp ban đầu phải có V34 thành công, hai dự án và các số Status trong bảng ở trên. Sau khi người dùng thao tác, số Status có thể khác; đó không tự động là lỗi migration. Không so sánh số bảng hoặc tổng case toàn database với một bản demo cũ.

Bộ kiểm thử [NativeCurrentDemoMigrationTest](../../Backend/src/test/java/vn/syp/tms/demo/NativeCurrentDemoMigrationTest.java) kiểm tra các đường fresh local, nâng cấp V33, release không demo, va chạm và rollback, chạy lại không ghi đè, quan hệ dữ liệu và tải/xuất XLSX. Test được giới hạn vào schema riêng `tms_demo34_test_*`, không chạy trên `tms`. Cả bốn mode đã PASS ngày 25/10/2026; xem [báo cáo, bằng chứng và giới hạn kiểm chứng](../reviews/2026-10-25-complete-demo-v34.md). Backend/database main chưa được áp dụng V34 hoặc khởi động lại trong tác vụ này.
