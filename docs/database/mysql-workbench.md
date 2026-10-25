# MySQL trực tiếp trên Windows và MySQL Workbench

Cập nhật hướng dẫn ngày 25/10/2026; các bằng chứng cài đặt ngày 03/10 được giữ và ghi rõ mốc bên dưới. Hướng chạy mặc định là **MySQL Server cài trực tiếp**, không cần Docker để chạy ứng dụng. Workbench là công cụ kết nối/xem dữ liệu; dữ liệu được lưu trong MySQL Server, không nằm trong Workbench.

**Source hiện có V1–V34**, giữ toàn bộ phiên bản cũ. Local nạp thêm demo V20/V22/V34; release không nạp các migration demo. Máy mới xem [hướng dẫn V34 và tài khoản demo](demo-v34.md). Không suy ra phiên bản database đang chạy từ phiên bản source; cần đọc `flyway_schema_history` trên đúng server. Việc cập nhật tài liệu này không khởi động lại backend hoặc áp dụng V34 lên main.

**Máy phát triển đã có `tms` và `.env.mysql.local`: không chạy lại initializer/import.** Quan sát lúc `2026-10-05T20:49:35Z` ghi nhận V16 và V17/V18 mới ở source là [bằng chứng lịch sử](file-work-qa-verification.md), không phải trạng thái hiện tại. Tương tự, V11/56 bảng bên dưới là mốc thiết lập ngày 03/10, không phải yêu cầu hạ database về V11. Khi mở lại dự án, dùng bước 4 sau khi đối chiếu lịch sử/profile và backup phù hợp. Bước 1–3 dành cho máy/schema chưa khởi tạo.

## Bằng chứng cấu hình máy phát triển ngày 03/10/2026

| Thành phần | Đã kiểm tra tại mốc lịch sử |
| --- | --- |
| Windows service | `MySQL97`, đang chạy |
| MySQL Server | Thư mục `C:\Program Files\MySQL\MySQL Server 9.7`; server phản hồi ở cổng **3307** |
| Cấu hình service | `C:\ProgramData\MySQL\MySQL Server 9.7\my.ini`, `port=3307` |
| Workbench | `C:\Program Files\MySQL\MySQL Workbench 8.0 CE\MySQLWorkbench.exe` |
| Dữ liệu ứng dụng đã kiểm chứng trước đây | `tms` trên server cũ ở **3310**; ngày 03/10 không thấy listener 3310, nhưng đã có bản sao SQL cục bộ |
| Kết nối server 3307 | Đã có `tms` và `.env.mysql.local`; app kết nối thành công, Flyway V11, audit 56 bảng/128 FK PASS; còn kiểm chứng UI/chứng cứ và nghiệm thu cutover |

**3307 là cổng đã xác nhận tại mốc trên.** Máy khác cần dùng đúng cổng/đường dẫn cài đặt của mình; không bắt buộc là 3307 hoặc MySQL 9.7. Không cài thêm server, dừng/xóa service, container, volume hoặc đổi mật khẩu root đang có chỉ để làm theo ví dụ.

Ghi nhận ngày 03/10: Workbench được Oracle kiểm chứng với MySQL 8.0; kết nối server mới hơn có thể hạn chế một số chức năng. Người dùng đã mở SQL Editor và đọc `tms`; Reverse Engineer chưa được kiểm chứng. Nguồn tham chiếu: [Workbench manual](https://dev.mysql.com/doc/workbench/en/). Backend startup/Flyway validation trên MySQL 9.7 đã PASS tại mốc đó; khi đó còn full regression/fresh-upgrade và warning về phiên bản server mới. Không dùng kết quả này thay cho kiểm chứng V34.

## Bước 1 — Tạo kết nối quản trị trong Workbench

1. Mở **MySQL Workbench**.
2. Tại **MySQL Connections**, bấm dấu **+**.
3. Điền:

| Trường | Giá trị |
| --- | --- |
| Connection Name | `TMS` (tên kết nối bạn đã đặt; không phải tên schema) |
| Connection Method | `Standard (TCP/IP)` |
| Hostname | `127.0.0.1` |
| Port | **3307** |
| Username | `root`, hoặc tài khoản quản trị bạn đã tạo khi cài MySQL |
| Password | Bấm **Store in Vault…**, nhập mật khẩu MySQL trên máy |
| Default Schema | Để trống ở lần đầu |

4. Bấm **Test Connection**, rồi **OK** khi kết nối thành công. Nếu báo 1045 thì tài khoản/mật khẩu/quyền host chưa đúng; mật khẩu đăng nhập website TMS không phải mật khẩu root MySQL. Không tự reset root khi chưa rõ dữ liệu khác trên server.
5. Mở connection, chạy một lần để xác nhận server:

```sql
SELECT VERSION() AS mysql_version, @@port AS mysql_port, CURRENT_USER() AS mysql_account;
SHOW DATABASES;
```

`mysql`, `sys`, `information_schema`, `performance_schema` là schema hệ thống của MySQL. Chúng không phải các database nghiệp vụ do TMS tạo. TMS chỉ cần **một schema `tms`**. Hướng dẫn các trường kết nối: [Standard TCP/IP](https://dev.mysql.com/doc/workbench/en/wb-mysql-connections-methods-standard.html).

## Bước 2 — Chọn dữ liệu đưa vào MySQL Windows, không cần bật Docker

Đứng tại thư mục `D:\DCN\KTN_11235645_DoCamNhung`. Dừng backend bằng Ctrl+C nếu đang chạy để ngừng ghi trong lúc chuyển. Giữ nguyên dữ liệu nguồn và thư mục chứng cứ **`Backend/var/evidence`**.

Bản sao SQL sau đã được đối chiếu tại mốc thiết lập cũ; chỉ dùng khi chủ động chọn khôi phục đúng snapshot đó, không mặc định đây là dữ liệu mới nhất:

```text
var/mysql-native/backups/2026-09-30T17-43-20-832Z-tms.sql
```

Bản này ghi rõ nguồn MySQL cũ 3310, V11; tạo lúc **00:43 ngày 01/10/2026 giờ Việt Nam**. Đã kiểm tra SHA-256 khớp manifest ngày 03/10. Đây là snapshot theo thời điểm đó, **không bao gồm thay đổi phát sinh sau backup**. Chỉ chọn bản này nếu chấp nhận khôi phục trạng thái lúc đó; không cần bật Docker để import một file SQL sẵn có.

Nếu cần tự đối chiếu file trước khi nhập:

```powershell
rtk proxy powershell -NoProfile -Command "Get-FileHash -Algorithm SHA256 -LiteralPath 'var/mysql-native/backups/2026-09-30T17-43-20-832Z-tms.sql' | Format-List"
```

SHA-256 mong đợi: `03d31ff53d8731664ab45addbbe623b84fcdd71be973ea86bafa3ac01cdea719`.

Thư mục còn bản `2026-09-30T17-53-59-969Z-tms.sql`; manifest ghi nhãn generic “native MySQL”, không ghi endpoint. Không dùng nhãn đó để kết luận đã chuyển sang 3307 hoặc tự chọn bản mới hơn khi chưa đối chiếu nguồn. Nếu bạn có backup mới hơn đã xác nhận, dùng đường dẫn của nó ở bước 3.

Các backup này giữ cấu trúc bảng và dữ liệu, bỏ các phiên đăng nhập đang hoạt động; người dùng đăng nhập lại sau khi chuyển. Không đưa SQL backup lên Git/chat. Nếu chuyển máy, chuyển cùng thư mục evidence.

Nếu thiết lập lần đầu và muốn database mới, không lấy dữ liệu cũ, **bỏ `-ImportDumpPath`** ở bước 3: initializer hiện bật demo local, Flyway áp dụng V1–V34, gồm dữ liệu giả lập V20/V22/V34. Xem [phạm vi V34](demo-v34.md). Không chạy seed bằng journal của database cũ trên database rỗng. Nếu đã có `tms` thì không import lại bằng initializer.

Nếu chọn backup, đối chiếu lịch sử Flyway và profile nguồn trước khi nhập. Backup chỉ có migration release có thể thiếu V20/V22 dù phiên bản cuối đã cao hơn; bật thêm demo local lúc đó có thể bị Flyway từ chối vì lịch sử không tương thích. Không tự bật `outOfOrder`, `baseline`, `clean` hoặc `repair` để ép chạy. [Giới hạn backup/chuyển profile](demo-v34.md#database-và-backup-đã-có) áp dụng cả khi dùng `-ImportDumpPath`.

Nếu bắt buộc lấy thay đổi mới nhất từ nguồn cũ, cần một backup mới từ chính nguồn đó. Công cụ chuyển nguồn cũ là `Backup-Database.cjs --legacy-docker`, nhưng không phải bước bắt buộc của hướng dẫn native và không được tự bật nguồn cũ chỉ để vượt qua thiếu credential native. Sau khi đã chuyển thành công, các backup mới dùng `rtk proxy node scripts/Backup-Database.cjs` mặc định đọc MySQL Windows.

## Bước 3 — Tạo database, quyền và chạy Flyway

Mở PowerShell tại thư mục gốc repo. Đường script này cần RTK vì có gọi RTK bên trong. Chưa được có `.env.mysql.local`: script sẽ tự sinh file sau khi thành công, vì vậy không copy file mẫu trước bước này. Nếu đã tự tạo schema/user/cấu hình, dùng [cách cấu hình thủ công](demo-v34.md#cách-b--đã-tự-tạo-database-và-user-mysql).

Máy phát triển dùng JDK 21 ở đường dẫn dưới; thay bằng đường dẫn JDK 21 trên máy bạn. Thêm vào **phiên terminal hiện tại** để cả Maven lẫn job Flyway gọi được Java:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
rtk proxy java -version
```

Build JAR từ code hiện tại (không cần Docker vì bỏ chạy test ở lệnh đóng gói này; đây không phải bằng chứng integration test):

```powershell
cd Backend
rtk proxy .\mvnw.cmd -B -ntp -DskipTests package
cd ..
```

Khởi tạo local mới có demo, không nhập backup:

```powershell
rtk proxy powershell -NoProfile -File scripts/Initialize-NativeMySql.ps1 -Port 3307 -MySqlClient "C:\Program Files\MySQL\MySQL Server 9.7\bin\mysql.exe"
```

Nếu đã chủ động chọn một backup tương thích ở bước 2, thêm `-ImportDumpPath "đường-dẫn-tới-backup.sql"` vào lệnh trên. Không mặc định chọn snapshot cũ chỉ vì nó có sẵn. Luôn build lại JAR từ source vừa pull trước khi chạy initializer; script kiểm tra file JAR tồn tại, không tự kiểm tra JAR có mới nhất hay không.

Script yêu cầu nhập mật khẩu root **ngay tại terminal, ký tự được ẩn**. Không gửi mật khẩu trong chat hoặc gắn vào command line. Có thể đổi `-AdminUser` hoặc `-MySqlClient` nếu máy dùng tài khoản/đường dẫn khác. `-PlanOnly` chỉ xem kế hoạch, không hỏi mật khẩu và không ghi DB.

Script sẽ:

1. Xác thực server và từ chối nếu `tms` hoặc tài khoản đích đã tồn tại, để không ghi đè dữ liệu/quyền cũ.
2. Tạo `tms` (InnoDB theo DDL, charset utf8mb4) và ba tài khoản giới hạn theo mục đích:
   - `tms_app`: đọc/ghi nghiệp vụ trong `tms`, không có quyền tạo/xóa bảng.
   - `tms_migrator`: thay đổi schema trong `tms` cho Flyway.
   - `tms_viewer`: SELECT/SHOW VIEW để xem database trong Workbench, không sửa dữ liệu.
3. Nhập backup tương thích vào schema mới rỗng nếu đã chọn, rồi chạy job `--tms-migrate` với `TMS_MIGRATION_INCLUDE_DEMO=true`. Job migrate và validate tất cả migration được tìm thấy trong cả `db/migration` và `db/demo`; với source hiện tại local mới áp dụng V1–V34.
4. Chỉ sau khi job thành công mới kiểm tra có bảng/migration đã áp dụng, không có migration thất bại, thử quyền đọc, lưu `.env.mysql.local` bị Git ignore. Số bảng/phiên bản không bị ép về 56/V12. Mật khẩu root không được lưu.

Nếu không có backup, Flyway tự tạo bảng và nạp demo theo đúng thứ tự. **Không chạy từng file SQL/Java migration bằng tay, không tạo một database cho mỗi sprint và không sửa migration đã áp dụng chỉ để chuyển server.** Các phiên bản cũ phải được giữ để máy mới có thể chạy từ đầu.

Nếu lỗi giữa chừng: schema có thể đã tạo một phần vì MySQL DDL không rollback toàn bộ. Giữ `var/mysql-native/pending.env`, DB và log để kiểm tra; script dừng việc chạy lại tự động, không `clean`/`repair`/drop để che lỗi. Nếu schema `tms` đã có từ trước trên server 3307, dừng ở đây và đối chiếu nó, không đổi tên/xóa tùy tiện.

## Bước 4 — Cho backend dùng MySQL Windows

Từ thư mục gốc dự án:

```powershell
cd Backend
mvn spring-boot:run
```

Maven chọn profile `local`, tự đọc `.env.mysql.local` ở thư mục gốc và ghép JDBC URL từ host/port/database trong file; không cần nạp biến môi trường trước. Kiểm tra log trỏ đúng server/schema đã cấu hình, migration/validation thành công, không còn migration pending và `Tomcat started on port 8080`. Với source V34 trên local tương thích, phiên bản cuối mong đợi là V34. [Bằng chứng readiness UP ngày 03/10 tại V11](../reviews/2026-10-03-direct-maven-startup.md) chỉ ghi lại lần chạy cũ, không phải yêu cầu log hiện tại dừng ở V11.

Nếu không có Maven hệ thống, dùng `rtk proxy .\mvnw.cmd spring-boot:run` trong `Backend`. Script `..\scripts\Start-Backend.ps1` vẫn dùng được. Cấu hình native đã có `TMS_REDMINE_ENABLED=false`; cấu hình tracker thực tế được mở riêng sau đối chiếu. Giữ terminal backend mở khi dùng ứng dụng.

Mở terminal khác ở thư mục gốc:

```powershell
rtk proxy powershell -NoProfile -File scripts/Check-System.ps1
rtk proxy node scripts/Audit-LocalDatabase.cjs
```

Chỉ khi backend UP, Flyway đã áp dụng đầy đủ migration phù hợp profile và audit không vi phạm mới coi chuyển kết nối thành công. Local mới dùng tài khoản [V34](demo-v34.md#tài-khoản-demo), chọn dự án `[DEMO34]`, kiểm tra Feature/file/case/Status, Issue và tải/xuất XLSX. Nếu chuyển dữ liệu thật, phải kiểm tra thêm đúng dữ liệu và file chứng cứ đã backup; bộ demo không thay cho bước đó. Giữ nguồn/backup cũ cho đến khi nghiệm thu. Không chạy đồng thời hai backend cùng ghi hai bản sao rồi xem chúng là một nguồn dữ liệu; không tự quay về Docker chỉ để vượt lỗi nâng cấp.

## Bước 5 — Xem đủ bảng và dữ liệu trong Workbench

Xem thông tin tài khoản chỉ đọc ở terminal riêng:

```powershell
rtk proxy powershell -NoProfile -File scripts/Show-MySqlConnection.ps1 -ShowPassword
```

Tạo connection thứ hai bằng dấu **+**:

| Trường | Giá trị |
| --- | --- |
| Connection Name | `TMS - MySQL Windows` |
| Method / Host / Port | Standard TCP/IP / `127.0.0.1` / `3307` |
| Username | `tms_viewer` |
| Password | Mật khẩu viewer từ lệnh trên, lưu trong Vault nếu muốn |
| Default Schema | `tms` |

Bấm Test Connection → OK → mở connection. Trong **Navigator → SCHEMAS**, bấm biểu tượng làm mới, xóa bộ lọc nếu có, mở **tms → Tables**. Nhấp phải `projects` → **Select Rows – Limit 1000** để xem dự án. Những bảng session/audit là dữ liệu vận hành, không cần tự thêm hàng.

Chạy trong SQL Editor:

```sql
USE tms;
SELECT DATABASE(), VERSION(), @@port;
SHOW TABLES;
SELECT COUNT(*) AS table_count FROM information_schema.tables
WHERE table_schema = 'tms' AND table_type = 'BASE TABLE';
SELECT installed_rank, version, description, success
FROM flyway_schema_history ORDER BY installed_rank;
SELECT id, code, name FROM projects;
SELECT COUNT(*) AS test_cases FROM test_cases;
SELECT COUNT(*) AS work_items FROM work_items;
SELECT status_code, COUNT(*) FROM work_items GROUP BY status_code;
```

Local mới từ source này có lịch sử V1–V34; release mới không có V20/V22/V34. Tổng dữ liệu có thể cao hơn riêng V34 vì còn demo cũ và dữ liệu người dùng. Không dùng số 56 bảng tại mốc V11 để xác nhận database hiện tại. Không sửa trực tiếp `identity_users`, FK, history hoặc phiên bản Flyway để thay nghiệp vụ. Quyền ADMIN/PM/DEV/TESTER trên web là **khác** tài khoản MySQL root/app/viewer.

MySQL trên Windows có thể hiển thị tên bảng dưới dạng chữ thường (ví dụ `spring_session`). Đây là thiết lập `lower_case_table_names`, không phải mất bảng; không tự đổi thiết lập đó trên data directory đã có dữ liệu.

## Bước 6 — Vẽ EER Diagram trong Workbench

1. **Database → Reverse Engineer…**.
2. Chọn connection `TMS - MySQL Windows` → Next.
3. Chọn schema `tms` → Next.
4. Chọn Tables và **Place imported objects on a diagram** → Execute → Next → Finish.
5. **Arrange → Autolayout** nếu các bảng chồng nhau; chia diagram theo [8 nhóm bảng](erd/images/README.md) để đọc dễ hơn.
6. **File → Save Model**, lưu `.mwb` tại chỗ bạn muốn.

Nguồn thao tác: [Reverse Engineering a Live Database](https://dev.mysql.com/doc/workbench/en/wb-reverse-engineer-live.html).

Nếu Workbench gặp hạn chế reverse-engineer server 9.7, có thể dùng **File → Import → Reverse Engineer MySQL Create Script…**, chọn [schema-only.sql](erd/schema-only.sql) để xem **mô hình lịch sử V11**, không phải toàn bộ schema hiện tại. File này không có dữ liệu hàng; **không chạy nó vào database ứng dụng**. [Ảnh PNG 56 bảng tại V11](erd/images/00-toan-bo-56-bang.png), [SVG phóng lớn](erd/images/00-toan-bo-56-bang.svg) và [ảnh theo nhóm](erd/images/README.md) vẫn được giữ làm bằng chứng. Muốn mô hình mới phải trích xuất từ đúng schema đã nâng cấp.

## Docker còn ở đâu trong repo?

Ứng dụng Java/React/Flyway không phụ thuộc Docker. Môi trường cũ, Redmine sandbox, `Test-ReleaseLocal.ps1` và bộ integration test dùng Testcontainers vẫn được giữ để bảo toàn dữ liệu/bằng chứng. Chúng là công cụ tùy chọn cho người phát triển, không nằm trong các bước chạy native ở trên. Chưa chuyển toàn bộ các test đó sang server native và chưa xóa dữ liệu container. Không chạy integration test có khả năng ghi/xóa lên `tms` đang sử dụng.
