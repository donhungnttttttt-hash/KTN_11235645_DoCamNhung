# Hệ thống quản lý kiểm thử phần mềm — SY Partners

## Chạy sau khi pull code

Dùng JDK 21, Node 24 và MySQL. Ở profile `local`, backend tự tạo/cập nhật **các bảng bằng Flyway khi khởi động**; không cần import file SQL hoặc tự chạy từng migration. Source hiện có đủ **V1–V34**: local nạp cả migration chính và demo; profile `release` không nạp V20, V22, V34 và yêu cầu chạy job migration trước khi khởi động ứng dụng. Các phiên bản cũ được giữ nguyên.

Git chứa bộ dữ liệu **giả lập** để chạy thử, không chứa bản sao database đang sử dụng. Flyway nạp migration mới một lần; sửa dữ liệu trên một máy không tự đồng bộ sang máy khác. Xem [demo V34, tài khoản và cách khởi tạo](docs/database/demo-v34.md).

**Nếu đã có database/user MySQL của bạn**, thực hiện các bước sau. **Nếu máy chưa có schema `tms` và tài khoản ứng dụng**, dùng [khởi tạo máy mới](#chạy-thử-fe--be--mysql) để script tự tạo cấu hình; không sao chép `.env.mysql.local` trước khi chạy initializer.

1. Ở thư mục gốc, sao chép `.env.mysql.example` thành `.env.mysql.local` (không ghi đè nếu đã cấu hình).
2. Điền host, port, tên database, user và password của MySQL trên máy bạn. Máy hiện tại dùng **127.0.0.1:3307/tms**; **3310 chỉ là cổng Docker cũ trong `.env`**, không phải cấu hình Maven local. Có thể dùng một tài khoản có quyền DDL; nếu dùng hai tài khoản, điền thêm `TMS_MIGRATION_USER` và `TMS_MIGRATION_PASSWORD`.
3. Đặt `TMS_BOOTSTRAP_ENABLED=false`. User dùng để migrate phải có quyền DDL; tài khoản chạy ứng dụng có thể dùng quyền đọc/ghi riêng. Profile local nạp bộ V34 với tài khoản `syp.demo34.admin`, `syp.demo34.pm`, `syp.demo34.dev01`, `syp.demo34.dev02`, `syp.demo34.tester01`, `syp.demo34.tester02`, mật khẩu demo công khai **`TmsDemo34!2026`**. Tài khoản/dữ liệu có sẵn không bị reset. [Demo V20](docs/database/demo-v20.md) và [demo V22](docs/database/demo-v22.md) vẫn được giữ; mật khẩu demo cũ không đổi. Profile release dùng bootstrap Admin riêng, không dùng các tài khoản demo.
4. Chạy hai terminal:

```powershell
cd Backend
mvn spring-boot:run
```

```powershell
cd Frontend
npm ci
npm run dev
```

Nếu chưa cài Maven, dùng `./mvnw.cmd spring-boot:run` trên Windows hoặc `./mvnw spring-boot:run` trên Linux/macOS. Mở **http://127.0.0.1:5173/** sau khi backend báo chạy ở 8080. Mỗi lần pull migration mới, khởi động lại backend để Flyway áp dụng tiếp theo thứ tự; lỗi checksum/quyền/kết nối cần xử lý theo log, không dùng `clean`/`repair` để bỏ qua.

Nếu chưa có database/tài khoản, xem [khởi tạo MySQL native](docs/database/mysql-workbench.md). Docker và schema test riêng **không phải điều kiện chạy ứng dụng**. Cách chạy Maven/npm trực tiếp không cần RTK; các script PowerShell native trong repo có gọi RTK bên trong nên cần RTK nếu chọn đường script. Không chuyển database đã chạy release sang local bằng cách bật thêm demo khi chưa đối chiếu lịch sử; xem [giới hạn chuyển profile/backup](docs/database/demo-v34.md#database-và-backup-đã-có).

**Nhánh làm việc: `system-design`.** Luồng hiện tại dùng Feature → file test case → Status và Bug/QA. Source V34 chưa tự chứng minh database đang chạy đã lên V34: kiểm tra `flyway_schema_history` trên đúng database sau khi áp dụng. Trạng thái công việc xem [STATUS](docs/planning/STATUS.json).

## Các mốc triển khai trước đây

Các con số kiểm thử/schema và đường dẫn đợt kiểm thử/retest dưới đây ghi lại thời điểm lịch sử, không phải hướng dẫn sử dụng luồng Feature hiện tại. **Mốc 03/10/2026** tập hợp migration V1–V12 và tài liệu Sprint 00–11; xem [bằng chứng khôi phục test grid](docs/reviews/2026-10-03-restored-test-grid.md). Các biên bản này không đồng nghĩa đã merge vào `develop` hoặc database hiện tại giữ nguyên phiên bản cũ.

Frontend React có các màn Tổng quan, Bảng công việc (Kanban/Danh sách), Quản lý kiểm thử, Quản lý lỗi, Quản lý tiến độ và Tổng hợp & Phân tích.

**Sprint 01 đã có backend Spring Boot, MySQL và Flyway V1.** Kiểm tra kết nối và migration bằng terminal, log và kiểm thử tự động. Các màn nghiệp vụ được kết nối lần lượt theo kế hoạch; web không có màn chẩn đoán kỹ thuật.

**Sprint 02 thêm đăng nhập nội bộ và Flyway V2.** Chỉ Admin hoặc PM được Admin cấp quyền mới tạo tài khoản; PM được cấp chỉ tạo Tester. Quyền được kiểm tra ở backend. Xem [Sprint 02](docs/planning/sprints/SPRINT-02.md) và [ma trận quyền](docs/business/permissions.md).

**Cập nhật 30/09/2026:** S03 và S05–S09 hoàn thành trong phạm vi nội bộ. Cấu hình dự án/thành viên/danh mục, sổ tay có lịch sử và quy tắc DEMO đã nối API; luồng kiểm thử–bug–retest–báo cáo dùng MySQL. Flyway V11, 55 bảng ứng dụng + lịch sử Flyway. S04 còn bước nghiệm thu upload XLSX trên browser. Xem [review hoàn thiện](docs/reviews/2026-09-30-review-completion.md) và [STATUS.json](docs/planning/STATUS.json). Chưa commit/push/merge.

Mở **http://127.0.0.1:5173/#/tests** và chọn **DEMO · Kiểm thử phát hành 1.2** để xem thư viện; vào **Đợt kiểm thử** (`#/tests/cycles`) để xem runner và **Kiểm thử lại** (`#/tests/retests`) để xem yêu cầu được giao. PM chuẩn bị phạm vi/đóng/mở lại trong chi tiết bug. S06 dùng `#/board`, `#/board/list`, `#/issues` cho cùng công việc lưu trong MySQL. **Tổng quan → Tổng quan kiểm thử**, **Quản lý tiến độ** và **Tổng hợp & Phân tích** dùng số liệu thật, lọc đợt/build, truy xuất nguồn và xuất Excel nội bộ. PM thao tác NA/chốt/mở trong đợt kiểm thử. Trong chi tiết bug có **Công bố và đối chiếu Redmine** (PM), trạng thái/liên kết/lịch sử (thành viên). Sprint 9 đã kiểm chứng trên Redmine sandbox riêng theo [ADR-009](docs/decisions/ADR-009-redmine-sandbox.md), chưa gửi tracker khách hàng.

**Mốc Sprint 11 — IN_REVIEW trên `system-design` ngày 30/09.** Đã chuẩn bị gói chạy, job migration riêng, profile release và tài liệu bàn giao; backend full 178 tests/verify, frontend 181 tests/build PASS tại mốc đó. Đã quét/vá Jackson 2.21.7. Khi đó S04/S10 còn browser Excel/keyboard/mobile và nghiệm thu PM/Tester; chưa triển khai production. Xem [review S11](docs/reviews/2026-09-30-sprint-11.md), [hướng dẫn dùng](docs/user-guide.md) và [gói chạy](docs/deployment.md).

Mở **Cài đặt dự án** tại **http://127.0.0.1:5173/#/settings**, chọn **DEMO · Review cấu hình dự án** để xem phần vừa hoàn thiện. Có Thông tin chung, Thành viên, Danh mục, Quy tắc báo lỗi và Sổ tay dự án.

## Dữ liệu demo V34 cho luồng hiện tại

Đăng nhập bằng tài khoản `syp.demo34.*`, chọn **[DEMO34] Spider Plus Mobile** hoặc **[DEMO34] Cổng quản trị Web**. V34 bổ sung tổng cộng **2 dự án, 4 Feature, 8 file XLSX, 80 case, 32 Issue, 4 ghi chú, 4 báo cáo, 6 thiết bị và 4 bàn giao**. Kết quả case ban đầu: **30 OK, 10 NG, 6 P, 8 NA, 26 chưa chạy**. Có phân công người test đầu tiên/lần 2, lịch sử và liên kết theo luồng hiện tại.

[Danh sách tài khoản, phạm vi dữ liệu và hướng dẫn V34](docs/database/demo-v34.md). Bộ này không chứa dữ liệu thật, API key, chat riêng hay phiên đăng nhập. Các hướng dẫn [demo theo đợt kiểm thử cũ](docs/uat/demo-data.md) chỉ là tài liệu lịch sử.

## Kế hoạch phát triển

Đọc [kế hoạch theo sprint](docs/planning/README.md) và [trạng thái công việc](docs/planning/STATUS.json) trước khi bắt đầu thay đổi. Roadmap Sprint 00–11 chia 39 task, có mục tiêu, phụ thuộc, kiểm thử và tiêu chí hoàn thành. Người dùng đã cho phép tiếp tục tuần tự các sprint ngày 29/09/2026: kiểm chứng và cập nhật từng sprint trước khi chuyển tiếp, không gom toàn bộ lộ trình vào một đợt chưa kiểm soát.

Codex chủ động áp dụng các skill phù hợp cho từng task theo [hướng dẫn ECC](docs/development-skills.md): thiết kế API, React, test trước khi sửa hành vi, review quyền và kiểm chứng kết quả. Quy tắc đã được lưu trong [AGENTS.md](AGENTS.md) để các phiên sau tiếp tục nhất quán.

Chi tiết đã triển khai: [Sprint 01](docs/planning/sprints/SPRINT-01.md), [API contract](docs/api/openapi.yaml), [database và migration](docs/database/README.md). [Blueprint nghiệp vụ](docs/planning/04-database-and-migrations.md) dành cho các sprint tiếp theo, chưa phải tất cả schema hiện có.

## Database diagram và MySQL Workbench

TMS dùng **một schema `tms`**. [Ảnh ERD](docs/database/erd/images/README.md) và [review thiết kế](docs/reviews/2026-10-01-database-native-mysql.md) lưu mốc V11/56 bảng; không dùng số 56 để xác nhận schema hiện tại. Ngày 03/10 đã kết nối backend với **MySQL Windows 3307**, schema V11; [bằng chứng startup/audit lịch sử](docs/reviews/2026-10-03-native-startup.md) được giữ nguyên. Kiểm tra phiên bản hiện tại bằng `flyway_schema_history`; source mới vẫn giữ toàn bộ migration trước V34.

## Chạy thử FE + BE + MySQL

Yêu cầu JDK 21, Node 24 và MySQL Server cài trực tiếp. Máy hiện tại có MySQL Windows cổng **3307**, Workbench đã cài. Xem [hướng dẫn tạo/kết nối từng bước](docs/database/mysql-workbench.md). Nếu giữ dữ liệu đang có ở server cũ, thực hiện backup/import theo hướng dẫn trước; không khởi tạo DB rỗng rồi coi là đã chuyển dữ liệu.

Trên máy hiện tại, `.env.mysql.local` và database `tms` đã có. Chạy backend trong terminal thứ nhất:

```powershell
cd Backend
mvn spring-boot:run
```

Lệnh Maven tự chọn profile `local`, đọc `.env.mysql.local` ở thư mục gốc và kết nối `127.0.0.1:3307/tms`. Nếu chưa cài Maven hệ thống, dùng `rtk proxy .\mvnw.cmd spring-boot:run`. Giữ terminal mở khi dùng ứng dụng. `TMS` trên ô kết nối Workbench là tên kết nối; schema ứng dụng là `tms`.

Khởi tạo database mới chỉ dành cho máy/schema chưa thiết lập (script hỏi mật khẩu quản trị MySQL ở terminal). Cần RTK cho đường script này; build lại JAR từ source vừa pull trước khi khởi tạo. Chưa được có `.env.mysql.local`, schema `tms` hoặc các user `tms_app`/`tms_migrator`/`tms_viewer`. Script sẽ tự tạo cấu hình và nạp cả demo local. Bỏ qua khối dưới trên máy đã có dữ liệu; không xóa dữ liệu/cấu hình để vượt qua kiểm tra.

```powershell
cd Backend
rtk proxy .\mvnw.cmd -B -ntp -DskipTests package
cd ..
rtk proxy powershell -NoProfile -File scripts/Initialize-NativeMySql.ps1 -Port 3307 -MySqlClient "C:\Program Files\MySQL\MySQL Server 9.7\bin\mysql.exe"
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-Backend.ps1
```

Thay cổng và đường dẫn `mysql.exe` bằng giá trị trên máy bạn. Có thể thêm `-PlanOnly` để xem đích mà không ghi database. Initializer kiểm tra toàn bộ migration được tìm thấy và dừng nếu lỗi; không ép số bảng/phiên bản của một sprint cũ. [Chi tiết cách nạp V34](docs/database/demo-v34.md).

Ở terminal khác, trong thư mục `Frontend`:

```powershell
rtk proxy npm ci
rtk proxy npm run dev
```

Mở **http://127.0.0.1:5173/** để đăng nhập. Admin demo mới là **`syp.demo34.admin` / `TmsDemo34!2026`**; các role khác ở [bảng tài khoản V34](docs/database/demo-v34.md#tài-khoản-demo). Tài khoản bootstrap riêng chỉ tồn tại nếu đã được tạo theo cấu hình của máy; không suy ra `admin.local` luôn có. Theo dõi backend/MySQL/Flyway tại terminal ở thư mục gốc:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Check-System.ps1
```

Hướng dẫn phiên bản, kiểm thử, cổng và xử lý lỗi tại [docs/development.md](docs/development.md). Có thể bỏ `rtk proxy` khi chạy Maven/npm trực tiếp; các script gọi RTK bên trong vẫn cần RTK.

Kiểm tra cảnh báo Java giống compiler của VS Code (không chạy ứng dụng hoặc database), từ thư mục gốc:

```powershell
rtk proxy node scripts/Check-JavaDiagnostics.cjs --java-home "C:\Program Files\Java\jdk-21"
```

Cần extension Java của VS Code hoặc truyền `--compiler` tới Eclipse compiler batch JAR. [Kết quả sửa Problems và cách làm mới cache Java/Maven](docs/reviews/2026-10-03-java-problems.md).

Thông tin component/route: [Quản lý công việc](Frontend/src/app/features/work-items/README.md). Hướng dẫn tiếp tục công việc: [AGENTS.md](AGENTS.md).
