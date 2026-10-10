# Khu quản trị tổng TMS — thiết kế và kế hoạch đề xuất

Ngày: 05/10/2026. Nhánh: `system-design`.
Trạng thái: ĐÃ TRIỂN KHAI A1–A4 và hoàn tất review code; còn gate kiểm thử native trên schema riêng và UAT. Bằng chứng và giới hạn kiểm chứng tại [báo cáo triển khai](../../reviews/2026-10-05-admin-implementation.md).
Nguồn: yêu cầu người dùng tách màn ADMIN, tổng hợp nhiều dự án, quản lý user và kho thiết bị/bàn giao theo dự án.

## Quyết định mới nhất — ưu tiên hơn bản thiết kế ban đầu bên dưới

- Dashboard ADMIN luôn tổng hợp toàn hệ thống. Header bỏ bộ chọn phạm vi; tab **Dự án** mặc định tất cả rồi mới chọn dự án. Người dùng/Thiết bị/Nhật ký có bộ lọc riêng trong trang.
- ADMIN tạo dự án qua API quản trị, chọn rõ PM và thành viên Tester/Dev, cùng máy ban đầu. Không tự thêm người tạo thành PM. Đây là phân bổ ban đầu, **không phải hạn mức số người/máy**.
- ADMIN quản lý thành viên và bàn giao máy. PM nhận dự án để điều hành; quyền tạo Tester được ADMIN ủy quyền trước đây vẫn giữ.
- Dev xem case/kết quả, xử lý bug được giao, ghi thông tin/build sửa; không ghi kết quả test/tài liệu/retest, không đóng/mở lại lỗi đã kết thúc. Tester thực thi/retest, PM phân công/đóng lỗi.
- Migration đã áp dụng trên native sau backup: V14 bổ sung vai trò DEV, V15 kho tài sản và bàn giao, V16 báo cáo PM. Không sửa migration đã áp dụng.

## 1. Kết quả mong muốn

- `admin.local` mang vai trò ADMIN đăng nhập vào khu quản trị tổng. Phân quyền theo role, không hardcode username; các ADMIN khác có cùng trải nghiệm.
- PM/Tester tiếp tục dùng khu làm việc dự án hiện có, theo quyền đã chốt. PM được cấp quyền tạo Tester vẫn có chức năng đó nhưng không được vào quản trị tổng.
- Mặc định mọi trang admin xem **Tất cả dự án**. Chọn một dự án để dashboard, danh sách user và thiết bị cùng phản ánh phạm vi đó.
- Admin đọc số liệu tổng hợp toàn hệ thống qua API riêng. Không tự thêm ADMIN vào mọi dự án với vai trò PM, không nới quyền duyệt test case/đóng bug của PM.
- Thống kê dùng dữ liệu đã lưu; thiếu kế hoạch ghi rõ thiếu dữ liệu. Không đưa health check, Flyway, log SQL lên dashboard nghiệp vụ.

## 2. Đối chiếu code trước khi thiết kế

| Hiện có | Có thể tái sử dụng / khoảng trống |
| --- | --- |
| AuthProvider, AuthBoundary, session/CSRF, role ADMIN/PM/TESTER | Dùng lại đăng nhập, hết phiên, đăng xuất; bổ sung route guard ADMIN |
| AppEntry bọc ProjectProvider/ProjectDataProvider cho mọi người | Tách nhánh admin trước provider dự án, tránh tải board/project mặc định khi chỉ xem quản trị |
| ProjectService.list chỉ trả membership đang hoạt động | Cần API admin riêng để thấy mọi dự án, kể cả admin không tham gia |
| ProjectService.create chỉ ADMIN, tạo membership PM cho người tạo | Tái sử dụng luồng tạo, bổ sung giao PM rõ ràng; không thay đổi âm thầm hành vi cũ |
| /users GET/PATCH chỉ ADMIN, POST theo users:create | Tái sử dụng tạo/khóa/mở khóa/cấp quyền PM; thêm lọc theo dự án và từ khóa tại server |
| project_memberships có unique(project_id,user_id), active, version | Một user tham gia nhiều dự án qua bảng trung gian; không đếm trùng user tổng |
| ReportingService/ReportMetrics: run item, kết quả mới nhất, loại NA | Dùng cùng định nghĩa tiến độ; không lấy trạng thái tham khảo của file Excel để cộng vào tiến độ thực thi |
| milestones có starts_on/due_on, work_items có milestone_id; test_cycles liên kết milestone | Có căn cứ hạn mốc, chưa có baseline tiến độ tổng dự án hoặc hạn riêng từng cycle |
| devices có project_id, model/OS, được cycle_configurations tham chiếu | Đây là cấu hình kiểm thử, không đủ căn cứ coi là máy vật lý/serial trong kho |
| Chart.js/react-chartjs-2 và lucide-react đã cài | Dùng lại biểu đồ/icon, không thêm bộ UI hoặc thư viện chart |
| MySQL native + Flyway đến V13 | Chỉ tạo V mới khi bắt đầu phần kho đã chốt; không sửa V1–V13 |

## 3. Bố cục và điều hướng

### Điều chỉnh người dùng ngày 05/10/2026 sau khi xem bản A1

- Bỏ bộ chọn phạm vi khỏi header. Tab **Dự án** mở mặc định tất cả dự án, chọn dự án ngay trong tab để xem riêng. Dashboard ADMIN mặc định tổng hệ thống. Trang người dùng/thiết bị giữ bộ lọc tại nội dung của chính trang, không đặt trên header và không tự mang phạm vi từ menu khác sang.
- ADMIN tổng là nơi tạo dự án và phân bổ PM, Tester/Dev, thiết bị ngay từ đầu. PM nhận dự án đã được phân bổ để điều hành công việc; quản lý membership/bàn giao thuộc ADMIN.
- **Nguồn lực đã chốt:** chỉ chọn người/máy ban đầu, không giới hạn về sau. Hiển thị số lượng từ danh sách được chọn; không thêm quota/cột hạn mức hoặc guard giới hạn số lượng.
- **DEV đã chốt:** xem case/kết quả, xử lý bug được giao, ghi thông tin sửa/build. Tester thực thi/retest; PM phân công và đóng lỗi. DEV không ghi kết quả test/tài liệu hoặc retest, không tự đóng/mở lại lỗi đã kết thúc. Tái sử dụng lý do chuyển trạng thái/lịch sử và bình luận để ghi thông tin sửa; không thêm trường/bảng trùng nội dung.
- A2 cần migration additive cho vai trò DEV; dịch thứ tự migration kho/báo cáo về các version tiếp theo, không chỉnh V1–V13. A3 nối lựa chọn thiết bị lúc tạo dự án vào cùng giao dịch khi API kho có mặt.

Các mục dưới đây là thiết kế gốc đã duyệt; điều chỉnh mới phía trên được ưu tiên khi có khác biệt.

Sidebar admin: **Tổng quan**, **Dự án**, **Người dùng**, **Thiết bị**, **Nhật ký quản trị**.
Header: TMS · Quản trị hệ thống, bộ chọn phạm vi, tài khoản/đăng xuất.
Không dùng sidebar của PM cho khu admin. Có lối “Không gian dự án” dành cho ADMIN có membership; vào đó áp dụng chính sách dự án hiện có.

Routes đề xuất:

- `#/admin`: dashboard toàn bộ hoặc `?projectId=...`.
- `#/admin/projects`: danh sách tất cả dự án; `#/admin/projects/:id`: trang tổng hợp riêng.
- `#/admin/users?projectId=...`: danh sách tài khoản trong phạm vi.
- `#/admin/devices?projectId=...`: kho máy / các máy đang giao cho dự án.
- `#/admin/audit?projectId=...`: lịch sử quản trị tương ứng; sự kiện hệ thống không có project chỉ xuất hiện khi chọn tất cả.

Phạm vi được giữ trong URL khi chuyển menu, đặt lại phân trang khi đổi bộ lọc. Phạm vi admin độc lập với currentProject của không gian PM. Response cũ không được ghi đè khi đổi dự án nhanh. PM/Tester gõ trực tiếp URL admin nhận thông báo không có quyền; API trả 403.

## 4. Màn hình cụ thể

### 4.1 Tổng quan

Hàng đầu: tiêu đề, mô tả phạm vi, thời điểm cập nhật và nút Tải lại.

KPI: dự án đang hoạt động; tài khoản đang hoạt động; tiến độ thực thi; bug chưa kết thúc; máy đang bàn giao / sẵn sàng. Trước khi kho thiết bị được triển khai không hiển thị số máy giả bằng số cấu hình devices.

Biểu đồ:

1. Thanh ngang so sánh tiến độ thực thi theo dự án (dự án có nhiều lượt chạy không bị mất trọng số trong KPI tổng).
2. Cột chồng OK / NG / P / Chưa chạy; NA hiển thị riêng để thấy mẫu số.
3. Phân bổ nhân sự theo vai trò hệ thống và số thành viên từng dự án. Số membership không được gắn nhãn số người duy nhất.
4. Phân bổ máy theo loại/tình trạng sau khi có kho máy.

Bên dưới: danh sách mốc quá hạn, bug chờ xác minh, dự án chưa có PM hoạt động, thiết bị đến hạn trả (khi có ngày dự kiến trả). Mỗi mục có link tới danh sách tương ứng, không chỉ biểu đồ trang trí.

Mặc định so sánh tối đa 10 dự án trong chart và ghi rõ số đang hiển thị; bảng phân trang cho toàn bộ dự án. KPI truy vấn toàn phạm vi, không cộng từ trang hiện tại.

### 4.2 Quản lý dự án

Bảng: mã/tên, PM, thành viên hoạt động, số lượt kiểm thử áp dụng, % đã thực thi, % đạt, bug mở, số mốc quá hạn, số máy đang giữ, trạng thái hoạt động/lưu trữ.

Chọn một dòng mở trang riêng gồm: Tổng hợp, Thành viên, Mốc & tiến độ, Thiết bị bàn giao, Lịch sử. Các số liệu đều lọc cùng projectId.

Thao tác trong phạm vi đầu: tạo dự án, sửa tên/mô tả/múi giờ, thêm/đổi/gỡ thành viên theo version, giao vai trò PM. Không xóa cứng dự án hay dữ liệu chạy test. Dự án lưu trữ vẫn đọc được, các thao tác ghi tuân thủ rule archived.

### 4.3 Quản lý người dùng

Mặc định toàn bộ tài khoản, có phân trang và tìm theo username/tên. Lọc theo dự án, vai trò, trạng thái hoạt động. User không thuộc dự án nào vẫn xuất hiện trong “Tất cả”.

Cột: username, tên, vai trò hệ thống, hoạt động/khóa, các dự án tham gia, quyền tạo Tester của PM, ngày tạo. Bảng toàn hệ thống một user một dòng.

Thao tác: tạo tài khoản, khóa/mở khóa, cấp/thu hồi quyền tạo Tester cho PM, xem các membership và quản lý tại trang dự án. Dùng lại CSRF/audit/version và guard không tự khóa tài khoản hiện hành. Không tự đổi mật khẩu tài khoản đang dùng hoặc hạ chính sách mật khẩu trong tác vụ này.

### 4.4 Quản lý thiết bị

**Quyết định D1 đã chốt:** từng máy vật lý, một dự án tại một thời điểm; giữ lịch sử bàn giao–thu hồi.

Theo phương án đề xuất, mỗi máy có mã tài sản unique, loại (iPad/iPhone/Android/khác), hãng/model, serial tùy chọn unique khi có, OS/version, tình trạng, ghi chú, actor/time/version. Mã tài sản là bắt buộc để nhận diện máy khi chưa có serial.

Tổng kho: sẵn sàng, đang bàn giao, bảo trì, ngừng sử dụng. “Đang bàn giao” được suy từ lượt bàn giao chưa trả, không nhập tay thành một trạng thái mâu thuẫn.

Bàn giao: chọn máy sẵn sàng, dự án, người nhận đang là thành viên hoạt động của dự án, ngày dự kiến trả tùy chọn, ghi chú. Thu hồi: ngày thực tế ghi bởi server, tình trạng khi nhận, ghi chú. Chuyển dự án phải thu hồi lượt cũ rồi giao lượt mới để giữ lịch sử.

Chỉ ADMIN tạo/sửa kho và ghi nhận giao–thu hồi trong bản đầu. PM xem máy dự án được giao. Không triển khai yêu cầu mượn/phê duyệt nhiều cấp khi chưa có nhu cầu.

### 4.5 Nhật ký quản trị

Đọc các sự kiện dự án, tài khoản và bàn giao đã có actor/time. Bộ lọc ngày, dự án, loại sự kiện; phân trang. Không hiển thị mật khẩu, session, token, log SQL. Reuse audit hiện có; không dựng thêm event bus hay bảng log chung chỉ để có màn hình.

## 5. Định nghĩa số liệu

- Tổng user = COUNT DISTINCT identity_users.id trong phạm vi; riêng dự án chọn membership active. Hiển thị tách tổng tài khoản với số đang enabled.
- Tiến độ thực thi = (OK + NG) / (tổng run_items ngoài DRAFT − NA); tỷ lệ đạt = OK / cùng mẫu số. Dùng latest_attempt_id và scope_decision_id hiện hành; mẫu số 0 là null → “Chưa có phạm vi áp dụng”. Tổng nhiều dự án cộng tử/mẫu trước khi chia.
- Kết quả iPad trên file Excel thuộc tài liệu, không thay kết quả đợt. Fixed của bug không tự thành OK của case.
- Bug mở = item_type BUG có status.terminal=false. Hiển thị “Đã xử lý, chờ xác minh” riêng; không cộng vào hoàn thành.
- **D2 đã trả lời:** dùng cảnh báo theo hạn và cho PM ghi rõ lý do/báo cáo cập nhật. Cụ thể đề xuất: mốc có due_on trước ngày hiện tại của timezone dự án và còn công việc chưa terminal hoặc cycle chưa CLOSED thì cảnh báo; mốc chưa có phạm vi hoặc không có due_on là “Chưa đủ dữ liệu”. Không ghi nhãn “đúng tiến độ” chỉ vì chưa quá hạn.
- PM dự án gửi báo cáo tiến độ: nội dung cập nhật, khó khăn/nguyên nhân, kế hoạch xử lý, ngày dự kiến hoàn thành. Khi đang có cảnh báo trễ, lý do và kế hoạch xử lý bắt buộc. ADMIN thấy báo cáo gần nhất, tác giả/thời gian và có thể mở lịch sử. Báo cáo không sửa số liệu thực thi, không xóa cảnh báo trễ, không tự thay due_on của mốc. Không tự áp lịch báo cáo hằng ngày/tuần hoặc gửi email vì chưa được yêu cầu.
- Tồn kho không gồm máy ngừng sử dụng; vẫn xem được riêng lịch sử. Số đang giao đếm lượt chưa returned_at, không cộng các lượt lịch sử.

## 6. Database dự kiến cho phương án D1

Phần kho thêm **hai bảng nghiệp vụ** trong V14 nếu vẫn là version tiếp theo khi triển khai:

`device_assets`: id, asset_code unique, type, model, serial nullable unique, os_name/os_version, condition_code (AVAILABLE/MAINTENANCE/RETIRED), notes, created_at/by, updated_at/by, lock_version. AVAILABLE là tình trạng có thể sử dụng; màn hình hiển thị đang giao khi có lượt chưa trả.

`device_allocations`: id, asset_id FK, project_id FK, recipient_membership_id FK ghép(project_id,id), assigned_at/by, expected_return_on nullable, returned_at/by nullable, handover_note, return_note, returned_condition, lock_version. Lịch sử không xóa cứng; actor và thời gian được server ghi.

Quan hệ: device_assets 1—N device_allocations; projects 1—N device_allocations; project_memberships 1—N device_allocations. Một generated column active_asset_id = CASE WHEN returned_at IS NULL THEN asset_id ELSE NULL END có unique index để DB ngăn giao trùng cùng máy. Kiểm tra paired returned_at/by và hạn trả không trước ngày giao.

Không chuyển bảng devices hiện có thành kho tự động: tên Chrome/Windows có thể là cấu hình logic, không phải máy. Không đụng FK cycle_configurations/devices hoặc snapshot lịch sử. Liên kết tài sản vật lý với cấu hình chạy test là phần mở rộng riêng khi có nhu cầu.

Mọi update dùng expectedVersion; bàn giao/thu hồi trong transaction, lock asset, validate dự án/người nhận và điều kiện hiện hành. Đồng thời hai người giao cùng máy: một thành công, một 409; không ghi đè lượt cũ.

Phần báo cáo PM bổ sung **một bảng** `project_status_reports` trong migration kế tiếp: id, project_id FK, author_membership_id FK ghép, summary, delay_reason, recovery_plan, expected_finish_on, request_key unique theo(project_id,request_key), created_at/by. Báo cáo append-only nên không thêm updated_at/by mang ý nghĩa giả; đính chính bằng báo cáo mới và giữ bản cũ. Tổng cộng đề xuất ba bảng mới cho hai nghiệp vụ thật, không thêm bảng cho dashboard vì dashboard truy vấn dữ liệu sẵn có.

## 7. Contract API dự kiến

Toàn bộ `/api/v1/admin/**`: session ADMIN + guard service, JSON camelCase, phân trang page từ 0, size mặc định 20/max100. Danh sách trả {items,page,size,totalElements}. Trả 401/403/404/409/422 theo convention hiện có. Không tạo account/service key mới.

| Endpoint | Mục đích |
| --- | --- |
| GET /admin/overview?projectId | KPI/chart toàn phạm vi, asOf, định nghĩa metric |
| GET /admin/projects?keyword&page&size | Danh sách toàn hệ thống; lọc/paging tại server |
| GET /admin/projects/{id} | Tổng hợp một dự án |
| PATCH /admin/projects/{id} | Sửa quản trị có expectedVersion; audit |
| GET/PUT/DELETE /admin/projects/{id}/members[/userId] | Danh sách/đổi/gỡ membership, dùng version/last-PM guard |
| GET /admin/users?projectId&keyword&role&enabled&page&size | User duy nhất, dữ liệu tài khoản công khai nội bộ + memberships |
| GET/POST /admin/device-assets | Tìm/lọc kho hoặc tạo máy |
| PATCH /admin/device-assets/{id} | Sửa model/OS/ghi chú/tình trạng với version |
| GET/POST /admin/device-allocations | Lịch sử hoặc bàn giao mới |
| PATCH /admin/device-allocations/{id} | Thu hồi có version, không sửa project/asset của lịch sử |
| GET /projects/{id}/device-allocations | Thành viên dự án xem máy đang được giao; scope bắt buộc |
| GET /admin/audit?projectId&type&page&size | Nhật ký đã lược bỏ dữ liệu nhạy cảm |
| GET/POST /projects/{id}/status-reports | Thành viên đọc; chỉ PM dự án gửi báo cáo, requestKey chống gửi lặp |
| GET /admin/projects/{id}/status-reports | ADMIN đọc báo cáo PM dù không là thành viên dự án |

POST /projects và POST/PATCH /users tái sử dụng API hiện có. Không gọi API dự án cho từng dòng để dựng dashboard. Truy vấn aggregate độc lập theo bảng tránh join nhân số; count và dữ liệu dùng cùng bộ lọc.

## 8. Phong cách giao diện và trạng thái

Giữ nhận diện TMS xanh teal #0f766e, nền sáng, sidebar admin có nhãn rõ. Dashboard dùng card số liệu và chart có tiêu đề/đơn vị/legend; bảng dữ liệu đi kèm chart để đọc bằng bàn phím/screen reader. Màu không là cách duy nhất thể hiện cảnh báo.

Điều khiển desktop tối thiểu 36px, mobile 44px; không cố định height thấp hơn line-height+padding. 1440/1024/768/390/320px: card tự xuống hàng, bảng rộng cuộn trong vùng riêng; không tràn toàn trang. Header/phạm vi vẫn tiếp cận được bằng bàn phím. Điều hướng không mất phạm vi.

Mỗi trang có loading, empty, lỗi/retry; không thay lỗi API bằng số 0. Chặn gửi lặp, giữ draft khi lỗi, hiện 409 và tải phiên bản hiện hành. Không có biểu đồ “xu hướng” giả khi chưa có chuỗi dữ liệu lịch sử thích hợp.

## 9. Kế hoạch thực hiện tuần tự

### A1 — Nền admin + tổng quan/dự án chỉ đọc

Files: AppEntry.jsx/App.jsx; mới features/admin/AdminApp.jsx, AdminLayout.jsx, AdminDashboard.jsx, AdminProjects.jsx, admin.css, services/api/admin.js; mới backend package admin/AdminOverviewService.java, AdminController.java, AdminDtos.java; SecurityConfig.java; docs/api/admin.openapi.yaml.

- [ ] Contract overview/project, chính sách ADMIN, route mặc định theo role.
- [ ] Test trước: ADMIN thấy dự án không có membership; PM/Tester 403; không đăng nhập 401; role bị thu hồi không giữ quyền; ID sai 404; DTO không lộ secret.
- [ ] Aggregate dùng ReportMetrics; test distinct user, mẫu số0, NA/P/Fixed, dự án không có dữ liệu, toàn bộ so với một dự án.
- [ ] UI gồm KPI/chart/bảng và phạm vi URL; test đổi bộ lọc nhanh không hiển thị response cũ, lỗi không thành0, PM deep link bị chặn, default admin.local vào quản trị.
- [ ] Browser desktop/mobile/keyboard; verify FE/BE; ghi trạng thái riêng trước A2.

### A2 — Quản lý tài khoản và dự án

Files: admin/AdminUsers.jsx, AdminProjectDetail.jsx, AdminProjectForm.jsx; backend admin/AdminProjectService.java và admin endpoints; tái sử dụng IdentityService, DTO người dùng, ProjectAudit.

- [ ] Test user toàn hệ thống không trùng khi nhiều membership, tìm/lọc/paging nhất quán; user không có dự án vẫn hiện trong tất cả.
- [ ] UI tạo/khóa/mở user và ủy quyền PM nối API hiện có; giữ ràng buộc chỉ ADMIN/PM được cấp mới tạo tài khoản, PM chỉ tạo Tester.
- [ ] Tạo/sửa dự án và giao PM/thành viên; không bypass các guard dự án cũ; version conflict giữ draft; không gỡ PM cuối.
- [ ] Tất cả mutation ghi audit, chống double submit, CSRF; test không tự khóa admin; không cho Tester tạo user dù gọi API trực tiếp.
- [ ] Kiểm chứng CRUD trên schema test riêng; không tạo nhiều dữ liệu rác trong tms chỉ để tô đầy dashboard.

### A3 — Kho thiết bị và bàn giao (D1 đã chốt)

Files: V14__create_device_inventory.sql; admin/DeviceInventoryService.java, DeviceInventoryDtos.java, DeviceInventoryController.java; frontend admin/AdminDevices.jsx, DeviceAssetForm.jsx, DeviceAllocationDialog.jsx; read-only ProjectDevices.jsx trong không gian dự án.

- [ ] Theo D1 đã chốt, viết migration additive, test fresh/upgrade và giữ lịch sử devices/cycle cũ.
- [ ] Test unique asset/serial, máy đang giao không thể giao lại/bảo trì/ngừng sử dụng; recipient phải thuộc dự án; archived project không nhận máy; hai request concurrent chỉ một thành công.
- [ ] Test thu hồi hai lần 409; bàn giao sau thu hồi giữ hai lượt lịch sử; filter dự án chỉ tính máy đang giữ theo default, lịch sử xem riêng.
- [ ] Form nhập máy, bàn giao/thu hồi có người và ngày; tồn kho/count/history cùng dữ liệu server; quyền PM chỉ đọc.
- [ ] Ghi bằng chứng migration và transaction trên schema test riêng. Chỉ áp dụng V mới lên DB sử dụng sau backup và kiểm tra phù hợp; không chạy test fixture phá dữ liệu tms.

### A4 — Cảnh báo, báo cáo PM, nhật ký và nghiệm thu

- [ ] Theo D2 đã trả lời; kiểm thử timezone, hôm nay/quá hạn, thiếu due date/phạm vi, mốc có work item/cycle chưa kết thúc.
- [ ] Thêm project_status_reports bằng V15 nếu version còn trống, service/API và form PM trong Quản lý tiến độ; ADMIN đọc bản mới nhất/lịch sử. Test Tester/ADMIN không là PM không gửi được; PM dự án khác bị chặn; requestKey replay không nhân báo cáo; có trễ thì thiếu lý do/kế hoạch bị422; báo cáo không làm mất cảnh báo tự động.
- [ ] Nối cảnh báo tới project/user/device và nhật ký; kiểm tra server filtering, count toàn phạm vi không phụ thuộc page.
- [ ] Chạy regression admin + PM + Tester; các màn test case/import/export/trạng thái/bug/retest tiếp tục hoạt động.
- [ ] Browser 1440/1024/768/390/320, keyboard/focus/dialog, không cắt chữ/scroll trapping, rõ loading/empty/error.
- [ ] Cập nhật hướng dẫn đăng nhập admin, quản trị dự án/user, bàn giao/thu hồi; ghi tests/coverage/migration thực chạy và việc chưa kiểm chứng.

Không tự commit/push hoặc đánh dấu S11 DONE do thêm khu admin. Mỗi phần có điểm kiểm chứng trước khi chuyển phần sau. Yêu cầu tiếp tục triển khai của người dùng đã được ghi nhận; người dùng đã duyệt thiết kế tổng thể ngày 05/10/2026; triển khai A1–A4, không hỏi lại D1/D2 hoặc phê duyệt chung.

## 10. Skills và lựa chọn triển khai

Đã đọc prompt-master: tác vụ là phát triển sản phẩm nên không sinh prompt thay code. Brainstorming: thay đổi kiến trúc, cần review bản thiết kế này; api-design: API scope/quyền/paging; ponytail: giữ stack, tái sử dụng session/identity/audit/chart, hai bảng kho và một bảng báo cáo PM có lịch sử. UI-UX Pro Max: dùng hướng dẫn accessibility/responsive có sẵn và dòng Analytics Dashboard trong products.csv; Python search chưa dùng được trong PATH, không coi là kết quả design-system search đã chạy.

Phương án đề xuất: một ứng dụng React với hai layout, dùng chung backend/session; API admin riêng. Một app admin độc lập sẽ làm tăng build/deploy/login; chỉ đổi sidebar trên layout cũ không giải quyết được việc provider/API luôn bám một dự án.
