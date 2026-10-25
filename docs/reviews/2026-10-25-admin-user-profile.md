# Admin sửa thông tin tài khoản và đặt lại mật khẩu

Người dùng chốt ngày 25/10/2026: bổ sung tên hiển thị, tên đăng nhập và đặt lại mật khẩu, dừng ở ba trường đó. Baseline `dcb46cc`, nhánh `system-design`. [Kế hoạch](../planning/2026-10-25-admin-user-profile.md), [contract](../api/identity.md).

## Kết quả sản phẩm

- Màn Người dùng có hai nút riêng **Sửa thông tin** và **Đặt lại mật khẩu**. Form thông tin chỉ gửi trường đã thay đổi; vai trò chỉ hiển thị. Form mật khẩu có nhập lại xác nhận, không lấy mật khẩu cũ từ server hoặc lưu mật khẩu vào browser storage.
- Giữ nháp khi sửa thông tin gặp lỗi, ngăn gửi trùng, focus thông báo, có bước xử lý xung đột phiên bản. Mật khẩu nhập bị xóa khi yêu cầu thất bại hoặc dialog đóng.
- PATCH `/api/v1/users/{id}` thêm `username`/`displayName`; PUT `/api/v1/users/{id}/password` riêng cho `newPassword`. Chỉ ADMIN có quyền; CSRF và optimistic version được enforce ở backend.
- Username chuẩn hóa chữ thường, kiểm tra unique cả khi cạnh tranh. Tên hiển thị không rỗng sau trim; mật khẩu 12–128 ký tự, không trim, hash bằng encoder hiện hành. Audit có nhãn tương ứng và không lưu mật khẩu/hash.
- Giữ nguyên ID, vai trò hệ thống, membership và liên kết lịch sử. Không khôi phục chức năng sửa vai trò dự án đã bỏ.
- Mọi cập nhật thực sự thu hồi phiên theo `lock_version` hiện có. Sửa chính mình giữ thông báo thành công và username mới ở màn đăng nhập; sau đăng nhập lại tải lại danh sách để lần sửa tiếp dùng phiên bản mới. PATCH no-op sau chuẩn hóa giữ phiên; request có version cũ vẫn trả 409.

## Review và kiểm chứng

| Hạng mục | Bằng chứng |
| --- | --- |
| Backend RED/GREEN | 11 test hành vi thất bại trước implementation; 13 test mới và 4 test policy/session cũ đạt sau sửa |
| Frontend RED/GREEN | Các test thiếu nút/form/auth thất bại trước implementation; bổ sung thêm hai test hồi quy race/login và dữ liệu danh sách cũ trước khi sửa |
| Frontend tập trung | 48/48 test trong 6 file; hồi quy lân cận 47/47 trong 5 file (có giao nhau, không cộng thành số test duy nhất) |
| Toàn bộ frontend | **1.218/1.218**, 132 file, 0 thất bại/0 bỏ qua, exit 0 |
| Build frontend | Vite build PASS, 1.712 module; cảnh báo bundle JS 511,42 kB vượt ngưỡng 500 kB |
| Backend build riêng | **38/38**, 9 suite gồm 8 native HTTP/MySQL, 0 thất bại/lỗi/bỏ qua; Maven verify/package PASS |
| Backend bổ sung nhánh | **26/26** trên build riêng: 9 test policy mới + 17 test đã chạy. Tổng test liên quan không trùng qua các lượt là **47**, không cộng 38 + 26 |
| Native MySQL | Cookie thực, CSRF, ADMIN/PM/TESTER/DEV; sửa tên/đăng nhập, giữ phân công/hash; đặt lại mật khẩu/đăng nhập mới; tự sửa; hết phiên cũ; no-op, stale, invalid và hai request trùng username đồng thời |
| Chrome | Mở/đóng cả hai form ở `localhost:5173/#/admin/users`, kiểm tra vai trò chỉ đọc, thông tin được điền đúng, nhập lại mật khẩu và hướng dẫn; không gửi thay đổi tài khoản thật |
| Contract/diff | `scripts/Check-Contracts.cjs` PASS cấu trúc trong phạm vi công cụ; `git diff --check` PASS |

Native test chỉ dùng schema mới `tms_userstest_72a0be8b2b7e` và tài khoản giới hạn quyền trên schema đó, cổng HTTP ngẫu nhiên. Không xóa hoặc dùng lại dữ liệu main làm fixture. Test cạnh tranh cố ý tạo một lỗi unique-constraint trong log và xác nhận response 409, rollback dữ liệu/audit, phiên người thua vẫn dùng được; đây là kỳ vọng của test.

Lượt backend trong `Backend/target/classes` dùng chung với IDE đạt 37/38, test cũ `AdminManagementSecurityTest` trả 500 do bytecode thiếu `MethodParameters`. Kiểm tra `javap` xác nhận nguyên nhân; build lại từ cùng source trong thư mục riêng đạt 38/38 mà không sửa controller ngoài phạm vi. Không ghi nhận lượt 37/38 là PASS.

Coverage frontend đo mới trên 5 component thay đổi: **97,87% lines; 95,80% statements; 95,45% functions; 89,78% branches**. Đây là coverage có phạm vi, không phải toàn bộ frontend. Backend checkpoint bổ sung đo JaCoCo: `IdentityService.update` **62/62 nhánh, 28/28 dòng**; `accountForUpdate` **8/8 nhánh, 8/8 dòng**; `resetPassword` **6/6 dòng**; `revokeSessions` **2/2 dòng**. Không suy ra coverage toàn bộ backend. Bổ sung test kiểm tra khóa/mở khóa, quyền PM, cập nhật nhiều trường, no-op, input không hợp lệ và rollback/lỗi DB; source sản phẩm không đổi sau bản build 38 test.

Review độc lập phát hiện hai điểm và đã xử lý: (1) sửa riêng tên hiển thị vẫn hết phiên vì dùng chung `lock_version`, nên giữ chính sách hiện hành và thông báo rõ; (2) sau tự sửa và đăng nhập lại, component danh sách có thể giữ version cũ, đã bổ sung tải lại khi xác thực thành công và test hồi quy. Không còn phát hiện bắt buộc sửa trong diff sản phẩm đã review.

## Runtime và bảo toàn dữ liệu

Đã khởi động lại riêng backend 8080 bằng JAR build riêng đã kiểm chứng, PID mới `21972`, Java 21. Dùng profile `local`, chỉ đặt `SPRING_FLYWAY_TARGET=33` ở tiến trình lần chạy này; không sửa `.env` hoặc cấu hình lưu trên đĩa. Startup validate đủ 34 file, báo schema hiện tại 33 và **No migration necessary**. Readiness trả HTTP 200 `UP`.

Fingerprint toàn bộ hàng của `identity_users` (118), `project_memberships` (144), `flyway_schema_history` (33) trước/sau khớp. Không sửa mật khẩu/tên tài khoản thật khi thử nghiệm. Có thể phát sinh session/audit đăng nhập demo và cleanup định kỳ bình thường của ứng dụng.

Lưu ý lần khởi động thông thường sau này bằng cấu hình local mặc định vẫn có thể áp dụng V34 demo đã có sẵn trong source; tác vụ này chỉ giữ V33 cho tiến trình được khởi động ở trên. Chức năng sửa tài khoản mới không cần migration.

## Skill và bằng chứng

| Skill | Dùng cho việc gì | Kết quả |
| --- | --- | --- |
| `api-design` | PATCH additive, PUT mật khẩu, contract lỗi/phiên | Contract và OpenAPI khớp implementation |
| `frontend-patterns` | Dialog riêng, nháp, callback sống, auth refresh | Hai form, luồng tự sửa/đăng nhập lại qua test và Chrome |
| `tdd-workflow` | RED trước sửa, GREEN và đo coverage | Test frontend/backend, native HTTP thực tế |
| `security-review` | Quyền, CSRF, input, hash/redaction, audit, concurrent updates | Review độc lập và test xử lý các trạng thái quyền/phiên |
| `verification-loop` | Build, hồi quy, runtime và preservation | Full frontend, backend build riêng, readiness và fingerprint |

Artifacts local trong `Backend/target/user-profile-verification/`, `Backend/target/admin-user-profile-*.json` và `Backend/target/admin-user-profile-coverage/`. Các file cấu hình test chứa credential không được đưa vào Git. Ảnh giao diện tại `var/user-profile-2026-10-25/edit-profile.png`, `reset-password.png`.

Không commit/push/merge/deploy. Chưa chạy toàn bộ backend hoặc UAT mọi màn/thiết bị; không coi các test phạm vi này là toàn bộ hệ thống đã nghiệm thu. S11/FR-12 giữ IN_REVIEW, Arena giữ PLANNED.

## Bàn giao sau pull và sửa Problems — 25/10/2026

Người dùng tiếp tục yêu cầu pull, xử lý conflict/Problems rồi commit và push. Các giới hạn chưa commit/push ở trên là checkpoint trước yêu cầu này.

- Giữ toàn bộ thay đổi đang làm bằng stash có cả file mới; pull fast-forward `dcb46cc` → `9487333` rồi áp dụng lại thành công, không conflict. Giữ nguyên bộ lọc tình trạng phân công và nút gỡ thành viên vừa nhận từ remote.
- Tái hiện chính xác **40 warning, 0 error** trong `IdentityProfileControllerTest.java`. Bổ sung contract `@NonNull` cho helper ID/path/request và kiểm tra null tại boundary Principal/Jackson/MediaType/Hamcrest. Không bỏ assertion, suppression hoặc hạ severity.
- Sau pull phát hiện thêm **2 warning** ở captor của `AdminSearchTest.java`. Helper giữ cơ chế Mockito: đăng ký matcher và chuyển dummy null thành placeholder không-null; assertion vẫn kiểm tra SQL thực được capture. Không gọi `requireNonNull(capture())` vì Mockito trả dummy null.
- Quét cuối **328 source Java: 0 error, 0 warning**, exit 0. JDT LS riêng từ extension đang cài trả `diagnostics: []` khi mở lại `IdentityProfileControllerTest.java`; lần mở đầu chưa có notification nên không dùng làm bằng chứng sạch. Không trực tiếp đọc Problems panel của IDE người dùng.
- Bản hợp nhất: **1.219/1.219 frontend**, 132 file; Vite build PASS (JS 512,66 kB, còn cảnh báo bundle >500 kB). **50/50 backend**, 11 suite, gồm 8 native HTTP/MySQL trên schema test riêng; Maven verify/package PASS. Sau chỉnh helper captor cuối, chạy lại **3/3 AdminSearchTest PASS**; không cộng thành 53 test duy nhất.
- Contract và diff check đạt; rà file sắp commit không phát hiện API key/private key theo mẫu kiểm tra. Credential và output build/test trong `Backend/target` không đưa lên Git. Không migration hoặc restart backend chính trong lượt pull này. Không đo lại coverage toàn hệ thống; số coverage phía trên thuộc checkpoint triển khai.
- `code-review-and-quality` → đối chiếu diff remote/local, quyền/input/session và dummy matcher → không có conflict hoặc thay đổi nghiệp vụ ngoài phạm vi. `verification-loop` → RED compiler 40, GREEN 0, JDT LS, hồi quy/frontend/backend/build → bằng chứng nêu trên.

Artifact local: `Backend/target/user-profile-verification/diagnostics-before-pull.json`, `frontend-after-pull.json`, `after-pull-backend.log`; `Backend/target/java-diagnostics/diagnostics.json`; protocol dưới `Backend/target/java-ide-followup/`. Yêu cầu commit/push chỉ áp dụng nhánh `system-design`, không merge sang `develop` hoặc deploy.

Đối chiếu cuối: 364 file backend source/resources khớp bản kiểm chứng riêng. Lượt JDT LS cuối `lsp-JAMuLt` mở lại cả `IdentityProfileControllerTest.java` và `AdminSearchTest.java` đều nhận `diagnostics: []`.
