# Chạy ứng dụng nội bộ trên máy phát triển

Ứng dụng có backend Spring Boot, MySQL/Flyway V11 và React nối API cho dự án, thư viện, thực thi, bug/retest và báo cáo nội bộ. Theo dõi kỹ thuật qua **terminal, log và kiểm thử tự động**, không hiển thị trên web. API thực thi tại [OpenAPI](api/openapi.yaml); phạm vi nghiệm thu và phần còn lại tại [kế hoạch](planning/README.md).

Sprint 02 thêm đăng nhập nội bộ, cookie session lưu trong MySQL và Flyway V2. Admin quản trị tài khoản; PM chỉ tạo Tester khi được Admin cấp quyền; Tester không tạo tài khoản. Chi tiết ở [quyền](business/permissions.md) và [API identity](api/identity.md).

## Phiên bản đã kiểm tra

| Thành phần | Phiên bản |
| --- | --- |
| Java | JDK 21; máy hiện tại Oracle JDK 21.0.9 |
| Spring Boot | 3.5.16, cố định parent trong pom.xml |
| Maven | 3.9.11, Wrapper 3.3.4, distribution SHA-256 trong properties |
| MySQL | Image `mysql:8.4.8`, InnoDB/utf8mb4 |
| Flyway core + MySQL module | 11.7.2, do Spring Boot BOM quản lý |
| MySQL Connector/J | 9.7.0, do Spring Boot BOM quản lý |
| Testcontainers | 1.21.4, cùng image MySQL với local |
| Spring Session JDBC | 3.5.7, do Spring Boot BOM quản lý |
| Node.js | 24.14.0 trên máy kiểm tra; dùng Node 24 |
| Frontend | React 18.3.1, Vite 6.4.3; cài bằng package-lock.json |
| Kiểm thử FE | Vitest 4.1.11, RTL 16.3.0, jsdom 26.1.0 |
| Container runtime | Docker Desktop Linux containers; máy hiện tại Engine 29.5.2 |

JDK 21 và Node 24 phải có trong PATH. Chạy ứng dụng dùng MySQL Windows theo hướng dẫn native; Docker chỉ còn cần cho các bài Testcontainers hoặc đường container cũ bên dưới. Maven hệ thống không bắt buộc. Wrapper tải Maven khi chạy lần đầu; dependency và image cũng cần Internet lần đầu. RTK là công cụ của workspace: máy không dùng RTK có thể bỏ tiền tố `rtk proxy`.

Lựa chọn kỹ thuật đối chiếu [Spring Boot 3.5 requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [khởi tạo database bằng Flyway](https://docs.spring.io/spring-boot/3.5/how-to/data-initialization.html), [Maven Wrapper](https://maven.apache.org/tools/wrapper/), [MySQL 8.4 release notes](https://dev.mysql.com/doc/relnotes/mysql/8.4/en/). Bảng trên là các phiên bản đã thử cùng nhau, không phải tuyên bố phiên bản mới nhất.

## Khởi động trên Windows — MySQL native

Làm theo [MySQL Workbench và tạo database](database/mysql-workbench.md) cho thiết lập lần đầu. Máy hiện tại đã có `.env.mysql.local` và `tms`, cổng 3307. Không cần Docker để chạy FE/BE/Flyway.

Terminal backend, từ thư mục gốc:

```powershell
cd Backend
mvn spring-boot:run
```

Maven tự chọn profile `local` và đọc cấu hình native bên ngoài source. Wrapper thay thế khi không có Maven: `rtk proxy .\mvnw.cmd spring-boot:run`. Script `..\scripts\Start-Backend.ps1` vẫn dùng được. [Bằng chứng và thứ tự ưu tiên cấu hình](reviews/2026-10-03-direct-maven-startup.md).

Terminal frontend, từ thư mục gốc:

```powershell
cd Frontend
npm run dev
```

Giữ hai terminal mở; truy cập `http://127.0.0.1:5173`. Phần dưới là quy trình container cũ được giữ cho dữ liệu và các bài test trước đây.

## Môi trường container cũ — chỉ dùng khi chọn rõ

Tại thư mục gốc repository:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Initialize-Local.ps1
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Initialize-Auth.ps1
rtk proxy docker compose up -d --wait mysql
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-Backend.ps1 -LegacyDocker
```

Script đầu tạo `.env` với mật khẩu ngẫu nhiên, không in mật khẩu và không ghi đè file đã có. `.env` bị git ignore. Script backend đọc cấu hình đó, bật profile `local`, chạy Maven Wrapper ở Backend. Giữ terminal backend mở.

Mở terminal khác, vào `Frontend`:

```powershell
rtk proxy npm ci
rtk proxy npm run dev
```

Mở **http://127.0.0.1:5173/#/dashboard** và đăng nhập. Tổng quan chỉ có Tổng quan dự án và Tổng quan kiểm thử.

Xem tài khoản Admin local bằng lệnh riêng (lệnh này hiển thị mật khẩu; không đưa kết quả vào git/log chia sẻ):

```powershell
rtk proxy powershell -NoProfile -File scripts/Show-LocalLogin.ps1
```

`Initialize-Auth.ps1` tạo `admin.local` với mật khẩu ngẫu nhiên trong `.env`, không ghi đè cấu hình đã có. Backend chỉ bootstrap khi DB chưa có tài khoản; restart không đặt lại mật khẩu. File `.env.example` tắt bootstrap mặc định. Nếu đã tự tạo `.env` từ example, tự đặt secret và bật `TMS_BOOTSTRAP_ENABLED=true` trước lần khởi động đầu. Sau khi có tài khoản, có thể chuyển về false. Không seed mật khẩu trong migration. `TMS_SESSION_TIMEOUT` mặc định `30m`; HTTPS dùng cookie Secure, có thể bắt buộc bằng biến môi trường `TMS_COOKIE_SECURE=true` khi triển khai sau này.

Thanh tài khoản góc phải có tên thật, vai trò và Đăng xuất. Khi hết phiên, ứng dụng khóa và giữ bản nháp trong bộ nhớ cho cùng tài khoản; đăng xuất hoặc đổi tài khoản sẽ xóa cây dữ liệu hiện tại. Tải lại trang mất bản nháp chưa lưu. S02 cung cấp API quản trị tài khoản, chưa mở khách hàng. **Cài đặt dự án** (`#/settings`) quản lý thông tin/thành viên/quy tắc/sổ tay; `#/settings/catalogs` quản lý năm danh mục. Thêm thành viên chỉ dùng tài khoản đã có, không tạo tài khoản hoặc cấp quyền hệ thống.

Theo dõi kết nối backend, phiên bản MySQL và Flyway tại terminal từ thư mục gốc:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Check-System.ps1
rtk proxy docker compose ps
rtk proxy docker compose logs --tail 50 mysql
```

`Check-System.ps1` chỉ đọc, không ghi dữ liệu; trả exit code 0 khi sẵn sàng, 1 khi kết nối/trạng thái không hợp lệ. Backend khác cổng dùng `-BackendPort <port>`. Log API/Flyway nằm ở terminal chạy Start-Backend.ps1. Kiểm chứng đường ghi/đọc dữ liệu qua integration test ở phần Kiểm tra bên dưới.

| Dịch vụ | Địa chỉ |
| --- | --- |
| Frontend | `127.0.0.1:5173` |
| Backend | `127.0.0.1:8080` |
| Readiness | `http://127.0.0.1:8080/actuator/health/readiness` |
| MySQL | `127.0.0.1:3310`, database `tms` |

Vite chuyển `/api` và `/actuator` sang backend cùng origin, giữ cookie CSRF/session. Dùng thống nhất `127.0.0.1` khi mở FE. Không cần cấu hình CORS rộng. Nếu cổng MySQL bận, đổi `TMS_MYSQL_PORT` trong `.env` trước khi khởi động; không dừng database của ứng dụng khác. Nếu đổi cổng backend, cần đổi target trong vite.config.js cho khớp.

## Dữ liệu, quyền và phạm vi local

- Container `syp-tms-mysql-1`, volume `syp-tms_mysql_data` độc lập với MySQL khác trên máy.
- `tms_app` chỉ có SELECT/INSERT/UPDATE/DELETE trong `tms`; `tms_migrator` có quyền schema trong `tms`. App không dùng root.
- Flyway chạy bằng migrator; Hibernate dùng runtime user và `ddl-auto=validate`, không tự tạo/sửa bảng.
- `V1__create_foundation.sql` tạo `application_info` và `foundation_checks`. Dòng nhận diện hệ thống là reference data; không seed khách hàng, dự án, bug hoặc test case giả vào DB thật.
- Các endpoint `/api/v1/system/**` chỉ bật ở profile local. Không cấu hình profile đó cho triển khai dùng chung. Backend và MySQL mặc định bind loopback.
- API diagnostic local dùng nội bộ và integration test; không có form hay lời gọi diagnostic từ frontend. Ghi qua API cần CSRF token và session cookie. Identity S02 dùng API riêng `/api/v1/auth/**`, `/me`, `/users`.
- V2 tạo bảng identity và session; tạo/cấp quyền/bật tắt user được audit trong giao dịch. Khi thay quyền hoặc khóa user, mọi phiên của tài khoản đó bị thu hồi. Không cấp quyền bằng sửa dữ liệu trực tiếp.
- Bản ghi kiểm tra không mang actor/project và không phải audit nghiệp vụ. V1 đã áp dụng được giữ nguyên; bảng diagnostic không chứa dữ liệu khách.
- Ghi thử là thao tác append, không có idempotency key. Client không tự retry POST; nếu cần thử thủ công và mất phản hồi, đọc lại danh sách bằng công cụ API trước khi gửi lại.

## Kiểm tra

Từ gốc repo, Docker phải hoạt động:

```powershell
rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1
```

Testcontainers tạo database tạm riêng rồi dọn container sau test; không chạy test vào database local `tms`. Script chạy Maven verify, tắt DEBUG/TRACE kế thừa trong thời gian test rồi khôi phục chúng. Dùng `-Tests 'SystemJourneyTest'` để chọn suite. Các test kiểm tra migration mới/chạy lại/checksum/clean-disabled, API ghi đọc và validation, lỗi an toàn, CSRF và khóa profile mặc định. [Kiểm tra phụ thuộc S10](security/sprint-10-dependencies.md) và [bài đo tải opt-in](performance/sprint-10.md) chạy riêng.

Trong `Frontend`:

```powershell
rtk proxy npm test
rtk proxy npm run build
```

Các test FE mock API một cách tường minh trong test: HTTP 401/403/404/409/422/503, timeout/cancel, sidebar submenu và deep link case. Runtime API client không fallback sang dữ liệu mẫu. Bộ test của màn diagnostic đã được gỡ cùng màn đó.

Kết quả nghiệm thu và hạn chế: [Sprint 01](planning/sprints/SPRINT-01.md), [Sprint 02](planning/sprints/SPRINT-02.md). Không coi build FE hoặc trạng thái UP là bằng chứng các chức năng nghiệp vụ đã hoàn thành.

## Dừng và chạy lại

Dừng FE/BE bằng Ctrl+C ở terminal tương ứng. Dừng MySQL mà giữ dữ liệu:

```powershell
rtk proxy docker compose stop mysql
```

Lần sau chạy `docker compose up -d --wait mysql`, script backend và `npm run dev`. Flyway validate V1–V11 đã áp dụng, không chạy lại seed. Không dùng `docker compose down -v` hoặc xóa volume nếu cần giữ dữ liệu.

## Xử lý lỗi thường gặp

- **Docker không kết nối được:** mở Docker Desktop, chờ engine sẵn sàng rồi chạy lại compose. Test backend cần Docker thật, không tự bỏ qua test khi Docker tắt.
- **Chưa có cấu hình:** chạy Initialize-Local; kiểm tra đủ tên biến theo `.env.example`. Không dán nội dung `.env` hoặc `docker compose config` vào log/chat.
- **Sai mật khẩu sau khi sửa .env:** script init MySQL chỉ chạy lúc volume mới. Thay file env không tự đổi user trong volume đã có; khôi phục env đúng hoặc đổi credential bằng quy trình quản trị, không xóa dữ liệu để che lỗi.
- **API 503/readiness DOWN:** kiểm tra container MySQL và log backend, rồi chạy lại Check-System.ps1. Tra requestId trong log khi cần; không đưa bảng kiểm tra kỹ thuật lên web.
- **Checksum Flyway lệch:** khôi phục migration đã áp dụng đúng checksum, không sửa V1–V11 hoặc auto-repair. Chỉ tạo migration tiếp theo khi có thay đổi schema thực sự; xem [quy trình migration](database/README.md).
- **Thiếu JAVA_HOME/JDK:** trỏ JAVA_HOME tới JDK 21, mở terminal mới; dùng wrapper trong Backend.
