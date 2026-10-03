# MySQL trực tiếp trên Windows và MySQL Workbench

Cập nhật 03/10/2026. Hướng chạy mặc định là **MySQL Server cài trực tiếp**, không cần Docker để chạy ứng dụng. Workbench là công cụ kết nối/xem dữ liệu; dữ liệu được lưu trong MySQL Server, không nằm trong Workbench. Schema hiện hành vẫn V11; [đề xuất bổ sung audit](../reviews/2026-10-03-database-audit-fields-relations.md) chưa được triển khai.

**Máy hiện tại đã có `tms` và `.env.mysql.local`.** Ngày 03/10 đã khởi động backend trên 3307, Flyway V11/11 migration và kiểm tra readiness/audit PASS; xem [bằng chứng](../reviews/2026-10-03-native-startup.md). Khi mở lại dự án, dùng bước 4 trở đi; không chạy lại initializer/import. Các bước 1–3 bên dưới dành cho thiết lập lần đầu trên máy/schema chưa khởi tạo.

## Máy hiện tại đã có gì?

| Thành phần | Đã kiểm tra |
| --- | --- |
| Windows service | `MySQL97`, đang chạy |
| MySQL Server | Thư mục `C:\Program Files\MySQL\MySQL Server 9.7`; server phản hồi ở cổng **3307** |
| Cấu hình service | `C:\ProgramData\MySQL\MySQL Server 9.7\my.ini`, `port=3307` |
| Workbench | `C:\Program Files\MySQL\MySQL Workbench 8.0 CE\MySQLWorkbench.exe` |
| Dữ liệu ứng dụng đã kiểm chứng trước đây | `tms` trên server cũ ở **3310**; ngày 03/10 không thấy listener 3310, nhưng đã có bản sao SQL cục bộ |
| Kết nối server 3307 | Đã có `tms` và `.env.mysql.local`; app kết nối thành công, Flyway V11, audit 56 bảng/128 FK PASS; còn kiểm chứng UI/chứng cứ và nghiệm thu cutover |

**3307 là cổng đúng trên máy này, không phải 3306.** Không cần cài thêm một MySQL nữa. Không dừng/xóa service, container, volume hoặc đổi mật khẩu root đang có.

Workbench được Oracle kiểm chứng với MySQL 8.0; kết nối server 8.4 trở lên có thể có hạn chế ở một số chức năng. Người dùng đã mở được SQL Editor và đọc dữ liệu `tms` trên Workbench; Reverse Engineer chưa được kiểm chứng. Nguồn: [Workbench manual](https://dev.mysql.com/doc/workbench/en/). Backend startup và Flyway validation trên MySQL 9.7 đã PASS, còn full regression/fresh-upgrade trên phiên bản này; Flyway có warning về phiên bản server mới.

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

Có thể dùng ngay bản sao SQL đã nằm trên máy:

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

Nếu thiết lập lần đầu và muốn database mới, không lấy dữ liệu cũ, bỏ `-ImportDumpPath` ở bước 3: Flyway tạo schema/reference data, chưa có bộ demo. Không chạy seed bằng journal của database cũ trên database rỗng. Trên máy hiện tại, `tms` 3307 đã có dữ liệu và kiểm tra kết nối thành công; không import lại.

Nếu bắt buộc lấy thay đổi mới nhất từ nguồn cũ, cần một backup mới từ chính nguồn đó. Công cụ chuyển nguồn cũ là `Backup-Database.cjs --legacy-docker`, nhưng không phải bước bắt buộc của hướng dẫn native và không được tự bật nguồn cũ chỉ để vượt qua thiếu credential native. Sau khi đã chuyển thành công, các backup mới dùng `rtk proxy node scripts/Backup-Database.cjs` mặc định đọc MySQL Windows.

## Bước 3 — Tạo database, quyền và chạy Flyway

Mở PowerShell tại thư mục gốc repo. Máy này có JDK 21 ở đường dẫn dưới; thêm vào **phiên terminal hiện tại** để cả Maven lẫn job Flyway gọi được Java:

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

Sau đó chạy lệnh dưới **nếu đã chọn snapshot 00:43 ngày 01/10 ở bước 2**, hoặc thay đường dẫn bằng backup khác đã xác nhận:

```powershell
rtk proxy powershell -NoProfile -File scripts/Initialize-NativeMySql.ps1 -Port 3307 -ImportDumpPath "var/mysql-native/backups/2026-09-30T17-43-20-832Z-tms.sql"
```

Script yêu cầu nhập mật khẩu root **ngay tại terminal, ký tự được ẩn**. Không gửi mật khẩu trong chat hoặc gắn vào command line. Có thể đổi `-AdminUser` hoặc `-MySqlClient` nếu máy dùng tài khoản/đường dẫn khác. `-PlanOnly` chỉ xem kế hoạch, không hỏi mật khẩu và không ghi DB.

Script sẽ:

1. Xác thực server và từ chối nếu `tms` hoặc tài khoản đích đã tồn tại, để không ghi đè dữ liệu/quyền cũ.
2. Tạo `tms` (InnoDB theo DDL, charset utf8mb4) và ba tài khoản giới hạn theo mục đích:
   - `tms_app`: đọc/ghi nghiệp vụ trong `tms`, không có quyền tạo/xóa bảng.
   - `tms_migrator`: thay đổi schema trong `tms` cho Flyway.
   - `tms_viewer`: SELECT/SHOW VIEW để xem database trong Workbench, không sửa dữ liệu.
3. Nhập backup vào schema mới rỗng nếu có, rồi chạy job `--tms-migrate` để Flyway kiểm tra/cập nhật V1–V11.
4. Kiểm tra 56 bảng và 11 migration thành công, thử quyền đọc, lưu `.env.mysql.local` bị Git ignore. Mật khẩu root không được lưu.

Nếu không có backup, Flyway tự tạo bảng theo đúng thứ tự. **Không chạy lần lượt 11 file SQL bằng tay, không tạo một database cho mỗi sprint và không thêm V12 chỉ để chuyển server.**

Nếu lỗi giữa chừng: schema có thể đã tạo một phần vì MySQL DDL không rollback toàn bộ. Giữ `var/mysql-native/pending.env`, DB và log để kiểm tra; script dừng việc chạy lại tự động, không `clean`/`repair`/drop để che lỗi. Nếu schema `tms` đã có từ trước trên server 3307, dừng ở đây và đối chiếu nó, không đổi tên/xóa tùy tiện.

## Bước 4 — Cho backend dùng MySQL Windows

Từ thư mục gốc dự án:

```powershell
cd Backend
mvn spring-boot:run
```

Maven chọn profile `local`, tự đọc `.env.mysql.local` ở thư mục gốc và ghép JDBC URL từ host/port/database trong file; không cần nạp biến môi trường trước. Trên máy hiện tại, log Flyway phải có `127.0.0.1:3307/tms`, schema V11 và `Tomcat started on port 8080`. Lệnh đã được kiểm chứng cùng readiness UP; xem [bằng chứng](../reviews/2026-10-03-direct-maven-startup.md).

Nếu không có Maven hệ thống, dùng `rtk proxy .\mvnw.cmd spring-boot:run` trong `Backend`. Script `..\scripts\Start-Backend.ps1` vẫn dùng được. Cấu hình native đã có `TMS_REDMINE_ENABLED=false`; cấu hình tracker thực tế được mở riêng sau đối chiếu. Giữ terminal backend mở khi dùng ứng dụng.

Mở terminal khác ở thư mục gốc:

```powershell
rtk proxy powershell -NoProfile -File scripts/Check-System.ps1
rtk proxy node scripts/Audit-LocalDatabase.cjs
```

Chỉ khi backend UP, Flyway V11 và audit không vi phạm mới coi chuyển kết nối thành công. Đăng nhập website, chọn **DEMO · Kiểm thử phát hành 1.2**, kiểm tra case/cycle/bug và tải một chứng cứ. Nếu lỗi trước cutover, dữ liệu nguồn ở 3310 vẫn giữ nguyên; lệnh chạy đường cũ là `Start-Backend.ps1 -LegacyDocker`. Không chạy đồng thời hai backend cùng ghi hai bản sao rồi xem chúng là một nguồn dữ liệu.

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
WHERE table_schema = 'tms' AND table_type = 'BASE TABLE'; -- 56
SELECT installed_rank, version, description, success
FROM flyway_schema_history ORDER BY installed_rank; -- V1..V11
SELECT id, code, name FROM projects;
SELECT COUNT(*) AS test_cases FROM test_cases;
SELECT COUNT(*) AS work_items FROM work_items;
SELECT status_code, COUNT(*) FROM work_items GROUP BY status_code;
```

Số lượng toàn database có thể cao hơn riêng DEMO-PILOT vì còn dự án review. Không sửa trực tiếp `identity_users`, FK, history hoặc phiên bản Flyway để thay nghiệp vụ. Quyền ADMIN/PM/TESTER trên web là **khác** tài khoản MySQL root/app/viewer.

MySQL trên Windows có thể hiển thị tên bảng dưới dạng chữ thường (ví dụ `spring_session`). Đây là thiết lập `lower_case_table_names`, không phải mất bảng; không tự đổi thiết lập đó trên data directory đã có dữ liệu.

## Bước 6 — Vẽ EER Diagram trong Workbench

1. **Database → Reverse Engineer…**.
2. Chọn connection `TMS - MySQL Windows` → Next.
3. Chọn schema `tms` → Next.
4. Chọn Tables và **Place imported objects on a diagram** → Execute → Next → Finish.
5. **Arrange → Autolayout** nếu các bảng chồng nhau; chia diagram theo [8 nhóm bảng](erd/images/README.md) để đọc dễ hơn.
6. **File → Save Model**, lưu `.mwb` tại chỗ bạn muốn.

Nguồn thao tác: [Reverse Engineering a Live Database](https://dev.mysql.com/doc/workbench/en/wb-reverse-engineer-live.html).

Nếu Workbench gặp hạn chế reverse-engineer server 9.7, dùng **File → Import → Reverse Engineer MySQL Create Script…**, chọn [schema-only.sql](erd/schema-only.sql) để dựng mô hình offline từ V11 đã trích xuất. File này không có dữ liệu hàng; **không chạy nó vào database ứng dụng**. [Ảnh PNG đủ 56 bảng](erd/images/00-toan-bo-56-bang.png), [SVG phóng lớn](erd/images/00-toan-bo-56-bang.svg) và [ảnh theo nhóm](erd/images/README.md) xem được ngay, không cần mật khẩu/server mới.

## Docker còn ở đâu trong repo?

Ứng dụng Java/React/Flyway không phụ thuộc Docker. Môi trường cũ, Redmine sandbox, `Test-ReleaseLocal.ps1` và bộ integration test dùng Testcontainers vẫn được giữ để bảo toàn dữ liệu/bằng chứng. Chúng là công cụ tùy chọn cho người phát triển, không nằm trong các bước chạy native ở trên. Chưa chuyển toàn bộ các test đó sang server native và chưa xóa dữ liệu container. Không chạy integration test có khả năng ghi/xóa lên `tms` đang sử dụng.
