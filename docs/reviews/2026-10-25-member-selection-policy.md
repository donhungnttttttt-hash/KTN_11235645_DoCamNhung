# Chọn thành viên và vai trò cố định — 25/10/2026

## Quyết định đã chốt và kết quả

- Danh sách thêm thành viên lấy tài khoản đang hoạt động trên toàn hệ thống, loại thành viên đang hoạt động của chính dự án trước khi đếm/phân trang. Thành viên ở dự án khác vẫn có thể được chọn. Thành viên đã gỡ có thể được thêm lại.
- Bỏ chọn/đổi vai trò khi thêm hoặc tạo dự án; vai trò chỉ hiển thị. Backend cũng từ chối đổi vai trò thành viên qua cả hai đường API.
- ADMIN tổng thêm được mọi nhóm tài khoản. PM chỉ thêm DEV/TESTER vào dự án mình quản lý; không được thêm PM/ADMIN hoặc dùng endpoint quản trị.
- Tài khoản ADMIN khi thêm mới mang nhiệm vụ PM trong dự án, hiển thị **ADMIN · Làm PM**. `identity_users.role_code` vẫn là ADMIN, không mất quyền quản trị tổng. PM → PM, DEV → DEV, TESTER → TESTER.
- Giữ nguyên vai trò thành viên đã lưu trước đây; không sửa dữ liệu cũ, không tạo migration. Quyền gỡ thành viên vẫn thuộc ADMIN.
- API ứng viên dành cho PM không trả tên/mã các dự án khác; chỉ cho biết tài khoản đã có dự án hay chưa.

## Triển khai

`MemberPicker` dùng chung cho quản trị và cài đặt dự án; bỏ `ProjectRoleSelect`. Danh sách gửi phạm vi loại trừ về backend, giữ bộ lọc tìm kiếm/vai trò/trạng thái và lựa chọn nhiều trang. Vai trò lúc lưu được đối chiếu từ backend. Luồng PM giữ lựa chọn chưa lưu khi lỗi một phần, loại người đã thêm thành công khỏi danh sách chọn.

`AdminProjectService` lọc thành viên trước COUNT/LIMIT; `ProjectMemberCandidateController` bổ sung GET `/api/v1/projects/{projectId}/member-candidates`. `ProjectService` kiểm tra actor, phạm vi dự án, nhóm tài khoản đích và vai trò cố định; từ chối `ROLE_CHANGE_NOT_ALLOWED` với yêu cầu đổi vai trò. Gọi lại cùng vai trò với thành viên đang hoạt động là no-op; nhật ký thêm/khôi phục dùng ADD_MEMBER/RESTORE_MEMBER. Nhãn lịch sử SET_ROLE vẫn được giữ để đọc audit cũ.

## Skill → mục đích → bằng chứng

| Skill | Áp dụng | Bằng chứng |
| --- | --- | --- |
| tdd-workflow | Tái hiện sai danh sách, đổi vai trò và quyền PM trước sửa | Frontend RED cho loại thành viên/chọn vai trò; native RED count 4 thay vì 3, đổi vai trò trả 200 thay vì 422, thiếu endpoint PM; sau sửa GREEN |
| code-review-and-quality | Rà luồng dùng chung, quyền, phiên bản và ảnh hưởng fixture cũ | Chặn cả hai API; giữ quyền hệ thống ADMIN; không rò tên dự án khác cho PM; đổi fixture legacy sang thiết lập trực tiếp trong test |
| verification-loop | Kiểm thử hồi quy, build, diagnostics, contract và bản chạy thật | Kết quả cụ thể bên dưới; không suy ra coverage hoặc UAT toàn hệ thống từ số test |

## Kiểm chứng

- [x] Toàn bộ frontend: **1.221/1.221 test, 132 file** PASS. Sau chỉnh nhỏ cuối về lựa chọn lưu một phần/nhãn ADMIN, chạy lại **48/48 test liên quan, 5 file** PASS.
- [x] Frontend production build PASS; cảnh báo chunk JavaScript 512,49 kB vẫn còn, không phải lỗi build.
- [x] Backend fresh isolated Maven verify/package: **37/37 test, 7 suite**, gồm **11 native MySQL test** PASS. Các suite: UserProfileNativeTest, CentralMembershipTest, AdminSearchTest, AdminProjectServiceTest, AdminManagementSecurityTest, AdminSecurityTest, AdminAuditLabelsTest.
- [x] Native kiểm tra loại trừ trước phân trang; ứng viên từ dự án khác; tài khoản tắt; restore; quyền actor/đích; từ chối đổi vai trò; ADMIN làm PM vẫn giữ role ADMIN và truy cập API quản trị.
- [x] JDT quét **329 source Java: 0 error, 0 warning**; contract check và git diff whitespace PASS.
- [x] Chrome localhost:5173: dự án DEMO-REVIEW-0930 có 2 thành viên; danh sách thêm còn 116/118 tài khoản, không có hai thành viên hiện tại. Admin local hiển thị ADMIN · Làm PM; tài khoản thuộc dự án khác vẫn chọn được, vai trò chỉ là văn bản. Không gửi thao tác thêm/gỡ vào main.
- [x] Backend 8080 chạy artifact đã kiểm chứng, readiness UP. Giữ Flyway target 33 tại process, không đổi cấu hình hoặc áp dụng V34. Hash toàn bộ hàng của identity_users (118), project_memberships (144), flyway_schema_history (33) giống nhau trước/sau restart.

## Giới hạn và bằng chứng cục bộ

Không chạy toàn bộ backend/Testcontainers hoặc UAT mọi vai trò/trình duyệt. Các fixture legacy ở SettingsReviewTest/TestCaseIntegrationTest/WorkItemIntegrationTest/NativeAdminCurrentReadTest đã cập nhật và compile, không coi là đã thực thi các suite đó. Coverage chưa đo mới cho phạm vi này. Lần chạy native trung gian gặp HTTP 429 do dùng chung bucket login trong test; fixture chỉ dọn bucket IP kiểm thử trong database cô lập, không đổi rate limit sản phẩm; lần chạy cuối PASS.

Bằng chứng local trong `Backend/target/user-profile-verification/`: `member-final-frontend.json`, `member-final-focused.json`, `after-pull-backend.log`, báo cáo Surefire trong `member-exclusion-backend/target/`, `member-main-startup.log`, `main-preservation.json`. File environment/credential và log thô không đưa vào Git.

Checkpoint kiểm chứng ban đầu chưa commit/push/merge. Sau đó người dùng yêu cầu commit và push toàn bộ thay đổi tác vụ lên `system-design`; không merge/deploy. S11/FR-12 giữ IN_REVIEW; không triển khai kế hoạch Arena trong tác vụ này.

Bàn giao kèm kiểm tra AI máy khác: code Caheo đã có trên remote, khác biệt model đến từ cấu hình backend riêng hoặc hội thoại cũ; chưa truy cập máy khác để xác định biến thiếu cụ thể. Bổ sung [hướng dẫn cấu hình](../operations/caheo-new-machine.md), test loader 1/1 PASS, không đưa key vào Git. Dùng `code-review-and-quality` để rà diff/quyền/bí mật và `verification-loop` để đối chiếu bằng chứng test/build với source bàn giao.
