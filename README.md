# Hệ thống quản lý kiểm thử phần mềm — SY Partners

**Nhánh làm việc hiện tại: `system-design` (03/10/2026).** Tập hợp code, migration V1–V12 và tài liệu Sprint 00–11 hiện có. Màn tài liệu test case đã khôi phục menu ba gạch, chi tiết, lịch sử và ghi kết quả theo đợt/cấu hình. Xem [bằng chứng kiểm tra và giới hạn](docs/reviews/2026-10-03-restored-test-grid.md). Đây là mốc code local, chưa đồng nghĩa mọi sprint đã nghiệm thu hoặc đã merge vào `develop`.

Frontend React có các màn Tổng quan, Bảng công việc (Kanban/Danh sách), Quản lý kiểm thử, Quản lý lỗi, Quản lý tiến độ và Tổng hợp & Phân tích.

**Sprint 01 đã có backend Spring Boot, MySQL và Flyway V1.** Kiểm tra kết nối và migration bằng terminal, log và kiểm thử tự động. Các màn nghiệp vụ được kết nối lần lượt theo kế hoạch; web không có màn chẩn đoán kỹ thuật.

**Sprint 02 thêm đăng nhập nội bộ và Flyway V2.** Chỉ Admin hoặc PM được Admin cấp quyền mới tạo tài khoản; PM được cấp chỉ tạo Tester. Quyền được kiểm tra ở backend. Xem [Sprint 02](docs/planning/sprints/SPRINT-02.md) và [ma trận quyền](docs/business/permissions.md).

**Cập nhật 30/09/2026:** S03 và S05–S09 hoàn thành trong phạm vi nội bộ. Cấu hình dự án/thành viên/danh mục, sổ tay có lịch sử và quy tắc DEMO đã nối API; luồng kiểm thử–bug–retest–báo cáo dùng MySQL. Flyway V11, 55 bảng ứng dụng + lịch sử Flyway. S04 còn bước nghiệm thu upload XLSX trên browser. Xem [review hoàn thiện](docs/reviews/2026-09-30-review-completion.md) và [STATUS.json](docs/planning/STATUS.json). Chưa commit/push/merge.

Mở **http://127.0.0.1:5173/#/tests** và chọn **DEMO · Kiểm thử phát hành 1.2** để xem thư viện; vào **Đợt kiểm thử** (`#/tests/cycles`) để xem runner và **Kiểm thử lại** (`#/tests/retests`) để xem yêu cầu được giao. PM chuẩn bị phạm vi/đóng/mở lại trong chi tiết bug. S06 dùng `#/board`, `#/board/list`, `#/issues` cho cùng công việc lưu trong MySQL. **Tổng quan → Tổng quan kiểm thử**, **Quản lý tiến độ** và **Tổng hợp & Phân tích** dùng số liệu thật, lọc đợt/build, truy xuất nguồn và xuất Excel nội bộ. PM thao tác NA/chốt/mở trong đợt kiểm thử. Trong chi tiết bug có **Công bố và đối chiếu Redmine** (PM), trạng thái/liên kết/lịch sử (thành viên). Sprint 9 đã kiểm chứng trên Redmine sandbox riêng theo [ADR-009](docs/decisions/ADR-009-redmine-sandbox.md), chưa gửi tracker khách hàng.

**Đang ở Sprint 11 — IN_REVIEW trên `system-design`.** Đã chuẩn bị gói chạy, job migration riêng, profile release và tài liệu bàn giao; backend full 178 tests/verify, frontend 181 tests/build PASS. Đã quét/vá Jackson 2.21.7. S04/S10 còn browser Excel/keyboard/mobile và nghiệm thu PM/Tester; chưa triển khai production. Xem [review S11](docs/reviews/2026-09-30-sprint-11.md), [hướng dẫn dùng](docs/user-guide.md) và [gói chạy](docs/deployment.md).

Mở **Cài đặt dự án** tại **http://127.0.0.1:5173/#/settings**, chọn **DEMO · Review cấu hình dự án** để xem phần vừa hoàn thiện. Có Thông tin chung, Thành viên, Danh mục, Quy tắc báo lỗi và Sổ tay dự án.

## Dữ liệu demo đầy đủ

Chọn **DEMO · Kiểm thử phát hành 1.2** ở thanh đầu trang: 120 test case, 4 đợt/240 lượt, 72 công việc/32 bug, đủ 10 trạng thái, chứng cứ và retest. Dữ liệu nằm trong MySQL local, không cần mở màn design cũ. [Cách nạp/kiểm tra](docs/uat/demo-data.md); seed không reset dữ liệu hiện có.

## Kế hoạch phát triển

Đọc [kế hoạch theo sprint](docs/planning/README.md) và [trạng thái công việc](docs/planning/STATUS.json) trước khi bắt đầu thay đổi. Roadmap Sprint 00–11 chia 39 task, có mục tiêu, phụ thuộc, kiểm thử và tiêu chí hoàn thành. Người dùng đã cho phép tiếp tục tuần tự các sprint ngày 29/09/2026: kiểm chứng và cập nhật từng sprint trước khi chuyển tiếp, không gom toàn bộ lộ trình vào một đợt chưa kiểm soát.

Codex chủ động áp dụng các skill phù hợp cho từng task theo [hướng dẫn ECC](docs/development-skills.md): thiết kế API, React, test trước khi sửa hành vi, review quyền và kiểm chứng kết quả. Quy tắc đã được lưu trong [AGENTS.md](AGENTS.md) để các phiên sau tiếp tục nhất quán.

Chi tiết đã triển khai: [Sprint 01](docs/planning/sprints/SPRINT-01.md), [API contract](docs/api/openapi.yaml), [database và migration](docs/database/README.md). [Blueprint nghiệp vụ](docs/planning/04-database-and-migrations.md) dành cho các sprint tiếp theo, chưa phải tất cả schema hiện có.

## Database diagram và MySQL Workbench

TMS dùng **một schema tms với 56 bảng**. [Ảnh ERD](docs/database/erd/images/README.md), [review thiết kế](docs/reviews/2026-10-01-database-native-mysql.md). Ngày 03/10 đã kết nối backend với **MySQL Windows 3307**, schema V11; startup/readiness và audit database PASS. [Bằng chứng và cách chạy](docs/reviews/2026-10-03-native-startup.md); còn kiểm chứng UI/chứng cứ và nghiệm thu cutover. Giữ dữ liệu nguồn/backup và V1–V11.

## Chạy thử FE + BE + MySQL

Yêu cầu JDK 21, Node 24 và MySQL Server cài trực tiếp. Máy hiện tại có MySQL Windows cổng **3307**, Workbench đã cài. Xem [hướng dẫn tạo/kết nối từng bước](docs/database/mysql-workbench.md). Nếu giữ dữ liệu đang có ở server cũ, thực hiện backup/import theo hướng dẫn trước; không khởi tạo DB rỗng rồi coi là đã chuyển dữ liệu.

Trên máy hiện tại, `.env.mysql.local` và database `tms` đã có. Chạy backend trong terminal thứ nhất:

```powershell
cd Backend
mvn spring-boot:run
```

Lệnh Maven tự chọn profile `local`, đọc `.env.mysql.local` ở thư mục gốc và kết nối `127.0.0.1:3307/tms`. Nếu chưa cài Maven hệ thống, dùng `rtk proxy .\mvnw.cmd spring-boot:run`. Giữ terminal mở khi dùng ứng dụng. `TMS` trên ô kết nối Workbench là tên kết nối; schema ứng dụng là `tms`.

Khởi tạo database mới chỉ dành cho máy/schema chưa thiết lập (script hỏi mật khẩu root ở terminal). Bỏ qua khối dưới trên máy hiện tại:

```powershell
cd Backend
rtk proxy .\mvnw.cmd -B -ntp -DskipTests package
cd ..
rtk proxy powershell -NoProfile -File scripts/Initialize-NativeMySql.ps1 -Port 3307
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-Backend.ps1
```

Ở terminal khác, trong thư mục `Frontend`:

```powershell
rtk proxy npm ci
rtk proxy npm run dev
```

Mở **http://127.0.0.1:5173/#/dashboard** để đăng nhập. Xem tài khoản Admin local bằng `rtk proxy powershell -NoProfile -File scripts/Show-LocalLogin.ps1`; không chia sẻ kết quả chứa mật khẩu. Theo dõi backend/MySQL/Flyway tại terminal ở thư mục gốc:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Check-System.ps1
```

Hướng dẫn phiên bản, kiểm thử, cổng và xử lý lỗi tại [docs/development.md](docs/development.md). Môi trường không sử dụng RTK có thể bỏ tiền tố `rtk proxy`.

Kiểm tra cảnh báo Java giống compiler của VS Code (không chạy ứng dụng hoặc database), từ thư mục gốc:

```powershell
rtk proxy node scripts/Check-JavaDiagnostics.cjs --java-home "C:\Program Files\Java\jdk-21"
```

Cần extension Java của VS Code hoặc truyền `--compiler` tới Eclipse compiler batch JAR. [Kết quả sửa Problems và cách làm mới cache Java/Maven](docs/reviews/2026-10-03-java-problems.md).

Thông tin component/route: [Quản lý công việc](Frontend/src/app/features/work-items/README.md). Hướng dẫn tiếp tục công việc: [AGENTS.md](AGENTS.md).
