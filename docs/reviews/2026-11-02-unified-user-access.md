# Mô hình tài khoản thống nhất — kết quả triển khai 03/11/2026

**Sau U10:** phần hồ sơ cá nhân được bổ sung và main hiện V38; [báo cáo03/11](2026-11-03-self-profile-and-cutover.md). Các số V37 bên dưới là checkpoint chuyển đổi quyền.

## Cập nhật 03/11 — hoàn tất U10 và chuyển main V37

Chrome riêng chạy nền (Google Chrome 156.0.8078.74), không điều khiển desktop người dùng: tạo USER/PM/GUEST, hai cờ xung đột không gửi POST và giữ nháp/focus; PM được cấp tạo USER; picker trang 2; cùng User ghi NG và xử lý Issue nhưng case giữ NG; case chưa phân công bị khóa. Guest đọc/tải báo cáo, URL/API nội bộ bị chặn, gỡ membership khi tab mở xóa nội dung; khóa User thu hồi phiên (/me 401). Viewport 1440 và 768, ảnh đã xem; không có uncaught page error hoặc unexpected failed request. Test lần đầu sai locator nhãn select và chờ chuyển route cùng URL: sửa script kiểm thử, kiểm khóa chạy riêng PASS; không báo mọi button của toàn ứng dụng đã nghiệm thu.

Backup mới: var/mysql-native/backups/2026-11-02T17-47-07-174Z-tms.sql, SHA-256 6c47175bf21c24dafe19fd32436fc41e9b87de1db2b22e7e835dfae065dd2c5a; restore schema riêng tms_accesscopy_00fd9a530422, 86 bảng đối chiếu trùng. Dừng riêng backend8080; migration offline V37 và provision mapping đã duyệt hoàn tất. 81 bảng nghiệp vụ, UUID/created_at tài khoản, lịch sử/checksum Flyway cũ giữ nguyên. Hai registry Admin hoạt động: admin/admin2; handover.admin bị khóa. Không nạp V34. Main health UP, Chrome đăng nhập hai ID mới thành công và ID cũ trả401; mở/đóng form tạo không ghi nghiệp vụ main. Password dùng đúng giá trị người dùng chỉ định, không ghi vào tài liệu/Git.

Local đổi sang locations core + bản sao chính xác hai demo SQL đã áp dụng V20/V22 tại var/mysql-native/legacy-demo-v20-v22; bỏ cấu hình ignore-ignored rộng có sẵn, không repair/out-of-order hoặc sửa V1–V36. Tắt bootstrap sau provision. File private trước đổi được lưu riêng. Jar đã kiểm chứng được lưu ngoài Git, backend8080 PID32272. Chưa commit/push/merge/deploy.

Skill → việc → bằng chứng: browser-testing-with-devtools → kiểm Chrome cô lập qua Playwright CLI vì user yêu cầu chỉ thao tác Chrome → chrome-acceptance.json + chrome-lock.json + ảnh; verification-loop → backup/restore/hash, startup và login → main-cutover.json + chrome-main.json. Artifact tại .superpowers/sdd/2026-11-02-unified-user-access/, Git ignored, không xuất bản credentials.

Yêu cầu mở rộng hồ sơ cá nhân (tên/avatar/email/điện thoại/chức danh/phòng ban) đã hoàn tất riêng sau U01–U10; ID và loại tài khoản chỉ đọc, Admin tổng giữ quyền sửa ID. Main hiện V38, xem [báo cáo hồ sơ và cutover](2026-11-03-self-profile-and-cutover.md).

**Checkpoint trước cutover (lịch sử): Source đã triển khai U01–U09; U10 chưa hoàn tất. Không coi ứng dụng đang dùng đã chuyển đổi.** Main vẫn V36, backend 8080 chưa restart; tài khoản `admin/admin2` và mật khẩu đã chỉ định chưa được áp dụng vào main. Không commit/push/merge/deploy.

## Thay đổi đã triển khai

- USER hợp quyền nghiệp vụ Tester/Dev; vẫn kiểm phân công, chủ sở hữu, project scope, version và trạng thái lưu trữ tại backend.
- Form tạo có ID đăng nhập, Tên, mật khẩu và hai checkbox Admin/Khách. Mặc định USER; Admin là PM, không phải Admin tổng. Chọn cả hai giữ nháp và cảnh báo; API từ chối cờ xung đột hoặc trường role cũ. PM được cấp riêng chỉ tạo USER.
- GUEST có workspace báo cáo riêng, chỉ đọc summary/biểu đồ/báo cáo đã lưu của dự án có membership hợp lệ; không có editor, AI hoặc API nghiệp vụ. API dùng allowlist GET và projection riêng, không chỉ ẩn nút.
- Membership cố định theo loại tài khoản; ADMIN thêm với nhãn “Admin tổng · Làm PM”. Không đưa lại tính năng sửa role.
- V37 chuyển role cũ, giữ UUID/liên kết/lịch sử và thu hồi phiên; V1–V36 không sửa. Registry giới hạn hai Admin; provision offline theo UUID, fingerprint và transaction. Khóa tài khoản thứ ba, không xóa lịch sử.
- AI USER hợp ba purpose worker, không nhận quyền PM. Journal V37 cho phép đọc lịch sử portfolio/project sau chuyển đổi thuần túy; revoke/rejoin không khôi phục quyền cũ, gửi tiếp cần hội thoại mới.

## Bằng chứng kiểm chứng mới nhất

| Kiểm tra | Kết quả và giới hạn |
| --- | --- |
| Frontend toàn bộ | 137 file, **1.248/1.248 PASS**, build PASS; sau đó thêm 3 test Guest shell, nhóm Guest/router **10/10 PASS**. Không cộng nhóm trùng thành tổng full-suite mới. |
| Backend hồi quy rộng | **839 test khai báo: 742 chạy PASS, 97 skipped**, 0 failure/error. Bao gồm HTTP native cho identity/membership/testing/Issue/Guest/AI history. Các lớp Docker Integration và migration/provision riêng không nằm trong nhóm này. |
| Migration + policy riêng | 7 PASS: policy 3, native migration 4; fresh core, core+demo, upgrade và dữ liệu bất nhất. |
| Provision riêng | 6 native PASS: mapping/rename, xung đột, chạy lại, cạnh tranh registry, bootstrap và mapping không hợp lệ. |
| Feature/AI/retired integration bổ sung | Vòng đầu 56/57 PASS; phát hiện lỗi nhập lại file Excel có version/ngày thực hiện. Test RED riêng tái hiện 422. Sau sửa parser nhận chính xác định dạng xuất 14/16 cột, **65/65 PASS, không skipped**, Maven verify/package PASS. Giữ bỏ metadata thực thi/phân công khi nhập, vẫn chặn công thức. |
| Java diagnostics | Kiểm lại sau chỉnh parser cuối: **354 source, 0 error/0 warning**. |
| Contract + diff | Check-Contracts PASS (cấu trúc/refs/routes/DTO, không thay thế kiểm HTTP); git diff --check PASS. |
| Review độc lập | Hai hướng spec/standards đã tìm lỗi AI history/nhãn audit và tài liệu cũ; đã sửa. Fresh reviewer cuối không tìm thêm lỗi critical/important; review riêng parser cũng không phát hiện lỗi quan trọng. Review tĩnh không thay thế browser. |

Runner guard **3/3 PASS**: từ chối main/schema không sở hữu, phát hiện native suite bị skip, không ghi đè build backend đang dùng. Kiểm diff xác nhận không đổi migration cũ; quét mẫu API key trong phần thêm và file mới không có hit, file provision/credential riêng được Git ignore (đây là quét mẫu, không tuyên bố kiểm chứng mọi loại bí mật).

Chạy lại cuối riêng migration/provision/policy: **13/13 PASS, không skipped, Maven verify PASS**. Dòng ERROR Flyway trong log thuộc test cố ý đưa membership bất nhất vào và assert migration bị từ chối; không phải migration main thất bại. JaCoCo lần riêng này: V37 dòng20/21, nhánh2/2; SystemAdminProvisioner dòng70/71 (98,59%), nhánh79/120 (65,83%). Không gộp cộng trực tiếp coverage của các lần chạy riêng.

Coverage Vitest full-suite: dòng **88,36%**, nhánh **84,25%**, hàm **82,37%**. Trong phần đổi: UserCreateDialog dòng95,65%/nhánh87,87%; accountTypes 100%/100%; ProjectProvider 90,90%/64,44%; ReadOnlyProjectReports 70,83%/44,82%. GuestWorkspace chưa được phủ trong lần đo full đó; 3 test shell bổ sung sau phép đo đã PASS, chưa đo lại coverage. Không tuyên bố mọi nhánh UI đã được kiểm.

JaCoCo nhóm backend rộng: dòng **4.363/7.526 (57,97%)**, nhánh **3.479/6.832 (50,92%)**. Đây là phạm vi toàn backend gồm nhiều luồng cũ và không gộp lần migration/provision chạy riêng. Phần đổi: AccountPolicy 4/4 dòng,10/10 nhánh; GuestRequestAuthorization 7/7 dòng,8/10 nhánh; SystemAdminRegistry 7/8 dòng,6/8 nhánh; AiPortfolioContext 109/125 dòng,103/130 nhánh; FeatureService 142/201 dòng,121/270 nhánh; FeatureIssueService 87/116 dòng,144/260 nhánh. Không suy coverage cao từ số test PASS.

## Bảo toàn dữ liệu và diễn tập

- Backup local `var/mysql-native/backups/2026-11-02T17-10-05-352Z-tms.sql`, SHA-256 `906321607bf279b44270544b80fd943a2d3e54abf460abdc3abbf5dd96493f82`. Không commit backup/credentials. Session tạm không đưa vào backup dữ liệu; DDL vẫn có.
- Restore vào schema riêng: **86 bảng đối chiếu khớp** với nguồn trước chuyển đổi.
- Áp dụng V37 và provision trên bản sao: **81 bảng nghiệp vụ không thay đổi**, UUID/thời điểm tạo tài khoản giữ nguyên; lịch sử Flyway cũ giữ nguyên; đúng2 Admin hoạt động/registry2; không còn role worker cũ. Provision diễn tập dùng mật khẩu tổng hợp riêng.
- V34 demo chưa từng chạy trên main và **không bị nạp vào bản sao**. Khi thực hiện cutover phải giữ đúng trạng thái này; không chạy Flyway mặc định để vô tình nạp demo còn thiếu.
- Kết quả máy và log chi tiết nằm trong `.superpowers/sdd/2026-11-02-unified-user-access/` bị Git ignore; không coi các artifact riêng này đã được công bố.

## Phần còn lại và lý do

**Chưa nghiệm thu Chrome/responsive, chưa cutover main và chưa smoke login trên runtime mới.** Công cụ Computer Use bị dừng vì không xác định được URL trình duyệt Windows đủ tin cậy để áp dụng chính sách; đây không phải kết luận người dùng chặn quyền. Không tiếp tục điều khiển UI bằng đường khác để vượt giới hạn đó. Theo gate U10 trong kế hoạch, giữ main nguyên trạng cho tới khi hoàn tất kiểm UI và chuyển đồng bộ app/database.

Các suite Testcontainers/fixture native tùy chọn không chạy trong môi trường này được ghi skipped/excluded, không đánh dấu PASS. Đã có kiểm HTTP/MySQL native tương ứng cho hành vi phân quyền mới, nhưng chưa tuyên bố toàn bộ suite lịch sử có thể chạy xanh trên mọi môi trường.

Lần tiếp theo: hoàn tất Chrome với dữ liệu thử riêng; lấy backup mới, đối chiếu lại UUID/Flyway/fingerprint, dừng riêng 8080, migrate/provision offline, khởi động đồng bộ và smoke login/report/USER. Quyền triển khai đã có; không cần hỏi lại phê duyệt chung. Không tái sử dụng fingerprint cũ khi dữ liệu thay đổi.

## Kiểm kê literal role cũ

- `AiPurpose`, `AiContextService`, `AiDraftStore`, `AiAccess` và nhãn AI giữ mã purpose TESTER_/DEV_ để đọc dữ liệu cũ; quyền hiện hành của USER do policy kiểm lại.
- `WorkItemService`, QA/Handoff, FileWork/Guard, execution/retest và second-test editing giữ mã lịch sử trong đường đã nghỉ; guard retired vẫn đóng ghi. Regression FeatureLegacyRetirement kiểm điều này.
- UI `QaPanel`, `FileWorkPage`, `DocumentSecondTestDialog`, `AssignmentDialog`, `ScopeSetup` và helper developer dành luồng cũ; router hiện hành không đưa USER/GUEST vào những luồng đã nghỉ.
- Các từ DEVICE, nhãn người test và migration/demo cũ không phải quyền TESTER/DEV hiện hành; không sửa migration đã áp dụng để thay chuỗi.

## Nhật ký checkpoint trước khi chốt (không phải kết quả cuối)

Baseline `13737f4`, nhánh `system-design`. Người dùng đã duyệt toàn bộ thiết kế/kế hoạch U01–U10; không commit/push trong tác vụ này. Source đã triển khai, **chưa cutover database chính**. Chưa đánh dấu DONE toàn bộ.

| Task | Skill → áp dụng | Bằng chứng hiện có |
| --- | --- | --- |
| U01 | tdd-workflow, backend-patterns → migration/journal/registry | RED → 7 test policy và native migration PASS, giữ V1–V36 |
| U02 | api-design, security-review → flags, session, registry authority | 5 HTTP identity + 13 controller, 9 update, 2 policy, 2 session trong nhóm 40 PASS |
| U03 | security-review → membership cố định, last-PM, PM chỉ thêm USER | 3 native ban đầu PASS; thêm test chặn Guest nhận máy dù membership PM bất nhất |
| U04/U05 | tdd-workflow → cùng USER thực thi case và Issue | 3 testing + 3 Issue PASS; 4 journey HTTP PASS, Resolved không đổi NG thành OK |
| U06 | security-review → allowlist GET và DTO Guest riêng | 3 native Guest PASS, CSRF hợp lệ, cross-project và thu hồi quyền |
| U07 | frontend-patterns → hai checkbox, lỗi giữ nháp, Guest shell | 10 test mới PASS; toàn frontend 1.248/1.248 PASS trong lần chạy hiện tại |
| U08 | security-review → hợp purpose, current rights trước provider | 9 test quyền PASS; review phát hiện fingerprint lịch sử, đã bổ sung tương thích chỉ đọc; test portfolio 17 PASS |
| U09 | backend-patterns, tdd-workflow → provision offline, transaction, fingerprint | 6 native PASS: mapping, conflict, retry, concurrent, bootstrap; chưa chạy main |
| U10 | verification-loop, browser-testing-with-devtools, code-review → hồi quy, review và cutover | Đang thực hiện; chưa có kết luận Chrome/coverage/cutover |

## Review độc lập

**Standards:** contract API còn mô tả role cũ (đang cập nhật); một nhận xét về policy lặp ở nhiều service, cần cân nhắc tập trung predicate mà giữ guard từng thao tác.

**Spec:** lịch sử MY_PROJECTS/PROJECT_CHAT có fingerprint cũ bị ẩn; đã thêm đối chiếu journal V37 chỉ cho đọc, giữ chặn revoke/rejoin và inference bằng scope cũ. Nhãn audit cấp quyền còn ghi Tester; đã đổi nhãn User thường, giữ mã sự kiện.

Tổng phát hiện ban đầu: Standards 1 vi phạm tài liệu + 1 nhận xét bảo trì; Spec 2. Chưa coi review cuối đã đóng.

## Giới hạn kiểm chứng hiện tại

- Backend rộng ban đầu: 967 test, 14 failures, 85 errors, 169 skipped. Có fixture cũ và Testcontainers không có Docker; không coi vòng này đạt. Các fixture hiện hành được cập nhật theo contract mới và chạy lại.
- Nhóm gần nhất 68 test: 64 PASS, còn 4 lỗi fixture native Admin/Tester chưa chuyển. Đang sửa; không nới guard sản phẩm để cho fixture cũ qua.
- Một lần chạy hai build test chồng nhau đã hủy và không dùng làm bằng chứng; các vòng sau chạy tuần tự trên thư mục/schema riêng.
- Không có phép đo coverage hoặc bằng chứng Chrome hoàn tất ở checkpoint này. Database chính và runtime 8080 chưa chuyển đổi.
