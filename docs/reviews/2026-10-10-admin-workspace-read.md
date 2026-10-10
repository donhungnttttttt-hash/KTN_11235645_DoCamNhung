# Admin tổng xem dữ liệu trong Không gian dự án — 10/10/2026

## Vấn đề và phạm vi

Admin tổng thấy chín dự án ở khu quản trị nhưng workspace báo chưa chọn/không có dự án. `GET /projects` chỉ truy vấn membership active trong khi Admin tạo dự án tập trung không tự được thêm làm thành viên. Ngoài danh sách, các API đọc workspace cũng yêu cầu membership nên chỉ sửa dropdown chưa đủ.

Theo yêu cầu hiện tại, ADMIN đang hoạt động được xem mọi dự án và dữ liệu nghiệp vụ của dự án đã chọn. Quyền đọc không tạo membership hoặc nâng tài khoản thành PM/Tester. Quyền quản trị thành viên/kho máy tiếp tục nằm tại khu Admin. Phân công, import, ghi kết quả, QA, duyệt case, execution/retest vẫn cần quyền nghiệp vụ hiện hành.

## Thay đổi

- `ProjectService` phân biệt `requireReadAccess` với `requireMembership`; danh sách Admin lấy mọi dự án theo ID ổn định, giữ projectRole thật hoặc null khi chỉ quan sát. PM/Tester/Dev vẫn theo membership active.
- Áp dụng guard đọc cho danh mục, case/revision, tài liệu committed/lịch sử/xuất, đợt/run, công việc, QA, file-work, báo cáo, thành viên, thiết bị và báo cáo PM. Mọi resource vẫn bị ràng buộc projectId.
- Các guard JDBC biểu diễn Admin không có membership bằng actor đọc ID 0, tất cả cờ PM/Tester/Dev đều false. ID này không được ghi DB và không thể trở thành assignee/executor. Mutation vẫn yêu cầu membership thật hoặc kiểm tra người được giao. Hàng “Việc cần xử lý” cho Admin quan sát hiển thị việc toàn dự án; hàng bàn giao chuyên biệt của PM vẫn PM-only.
- UI dùng quyền quản lý chung, không hiện import/chỉnh sửa/phân công cho Admin chỉ quan sát; ô kết quả không được đổi, lịch sử và xuất vẫn đọc được. Thông báo quyền xem giúp phân biệt quản trị tổng với vai trò thực hiện. Không thêm migration hay dữ liệu dự án.

## Kiểm chứng

Skill đã áp dụng: `security-review` (ranh giới đọc/ghi, current identity và phạm vi resource), `frontend-patterns` (quyền UI thống nhất, dữ liệu theo dự án).

- RED: test native mới tái hiện Admin nhận danh sách `[]` và catalog 404; hai test UI tái hiện nút import và nút ghi kết quả vẫn cho Admin ngoài membership thao tác. Sau sửa đều GREEN.
- Backend: **472 test / 47 lớp, 0 failure/error/skip** theo báo cáo cuối của từng lớp. Gồm 43 lớp unit và bốn lớp native `AdminNativeIntegrationTest`, `AdminWorkspaceNativeTest`, `AdminWorkspaceFileReadNativeTest`, `TestDocumentIntegrationTest`. Native chạy riêng tại `127.0.0.1:3307/tms_docstest_202610100007`, Flyway V23, không ghi vào database tms.
- Phủ đọc danh sách và hơn 20 API workspace; dữ liệu khác dự án không lẫn; resource sai project trả 404; tài khoản bị khóa/thu hồi Admin và Tester ngoài dự án bị chặn; Admin không tự có membership; actual PM vẫn ghi được. File/case/revision/run/QA/export có fixture không rỗng. Chặn Admin khởi tạo phiên test, ghi kết quả tài liệu, tạo công việc và xử lý QA.
- `LocalDatabaseConfigurationTest` chạy riêng không có biến override demo của native harness; năm test PASS. Một lần chạy chung trước đó thất bại vì harness đặt Flyway demo location, đã tách môi trường đúng; không sửa test production để chấp nhận demo seed.
- Frontend: **684/684 test, 60/60 file PASS**; production build PASS. Sau chỉnh nhãn đọc thành “Xem kết quả theo đợt”, chạy lại hai file test liên quan: **33/33 PASS**, build lại PASS. Cảnh báo bundle trên 500 kB vẫn có (582.76 kB JS), không phải lỗi build.
- Chrome với `syp.demo.admin`: trước restart tái hiện workspace rỗng; sau restart dropdown đủ chín dự án. DEMO-S04 có hai công việc; DEMO-PILOT có 72 công việc, 120 case/sáu suite. Báo cáo PILOT có 200 lượt, 192 áp dụng, 132 OK, 28 NG, 16 P, 16 chưa chạy, tám NA. Chuyển sang DEMO-GRID-1003 thấy file `Demo-khoi-phuc-test-case.xlsx`. Không thay đổi dữ liệu nghiệp vụ trong UAT này.
- Backend local restart thành công lúc 08:25 ngày 10/10; cổng 8080, MySQL 3307/tms, `/actuator/health` UP.

Lệnh tái chạy native (PowerShell, schema đã được cấp quyền):

```powershell
$env:SPRING_FLYWAY_LOCATIONS = 'classpath:db/migration,classpath:db/demo'
rtk proxy node scripts/Test-AdminNative.cjs tms_docstest_202610100007 AdminWorkspaceNativeTest,AdminWorkspaceFileReadNativeTest,TestDocumentIntegrationTest,AdminNativeIntegrationTest
Remove-Item Env:SPRING_FLYWAY_LOCATIONS
```

## Giới hạn

Không tuyên bố coverage từ số test PASS; chưa đo coverage cho thay đổi này. Bộ Testcontainers cũ không chạy lại trong đợt này; expectation đọc của `TestCaseIntegrationTest` được cập nhật theo rule mới, regression thực tế được chạy trên native MySQL. UAT lần này tập trung lỗi quyền xem Admin trên Chrome, không là nghiệm thu mọi màn/trình duyệt. Sprint S11 vẫn IN_REVIEW; các gate AI live/pilot trước đó không đổi.
