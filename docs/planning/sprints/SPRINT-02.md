# Sprint 02 — Đăng nhập, người dùng và phân quyền

**DONE — 22/09/2026**, nhánh `feature/sprint-02-auth`. Trạng thái chi tiết theo [STATUS.json](../STATUS.json). Ước lượng ban đầu 4–7 ngày công là số dùng để chia phạm vi, không phải thời gian thực tế đã đo.

Người dùng xác nhận chỉ tài khoản nội bộ và chỉ Admin/PM được Admin cấp quyền mới tạo tài khoản. S02 giới hạn PM được cấp chỉ tạo Tester; tạo Admin/PM, bật/tắt user và cấp/thu hồi quyền chỉ Admin. Xem [ADR-002](../../decisions/ADR-002-internal-auth.md), [ma trận quyền](../../business/permissions.md), [API](../../api/identity.md).

## Mục tiêu

Người dùng đăng nhập thật; backend bảo vệ các API của sprint này theo vai trò. Chuẩn bị chính sách quyền theo dự án để thực thi và kiểm chứng cùng project membership ở S03.

## Phụ thuộc và điều kiện vào

S01; xác nhận ma trận quyền sơ bộ và phương thức đăng nhập ở gate S02.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không SSO/enterprise identity, không tài khoản khách, không workflow bug hoàn chỉnh. Quản trị tài khoản bằng API nội bộ trong S02, chưa có màn quản trị riêng. Membership/quyền dự án thuộc S03; các màn nghiệp vụ còn dùng dữ liệu prototype.

## Thứ tự task

### S02-T01 — Contract và chính sách truy cập

- **Feature:** Contract và chính sách truy cập
- **Objective:** Chốt auth/session, actor, role scope; định nghĩa lỗi auth và quyền.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/planning/decisions/; docs/api/openapi.yaml; docs/business/permissions.md
- **Backend changes:** Security policy và application boundary; không rải role check tùy tiện.
- **Frontend changes:** Mô tả login, expired/forbidden state và member context.
- **Database changes:** Thiết kế users/roles/session và project membership sẽ hoàn thiện S03.
- **API changes:** auth/csrf, login/logout, me, users: DTO + errors + quyền.
- **Business rules:** Frontend hidden button không phải security boundary; customer view read-only theo quyết định.
- **Tests / bằng chứng cần có:** Rà ma trận cho phép/từ chối; chuẩn bị các kịch bản truy cập dự án ngoài quyền. Kiểm thử thực tế qua project API được thực hiện ở S03-T01 khi có membership.
- **Dependencies:** S01-T03; Q quyền/auth được trả lời.
- **Risk:** Dùng client userId hoặc global role làm lộ project.
- **Definition of Done riêng:** ADR và contract đủ để implement; quyền chưa rõ không tự cấp.

### S02-T02 — Identity backend

- **Feature:** Identity backend
- **Objective:** Tạo tài khoản quản trị có kiểm soát, đăng nhập và thực thi quyền trên các API identity.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/src/main/java/**/identity/; Backend/src/main/java/**/shared/security/; Backend/src/test/; Backend/src/main/resources/db/migration/
- **Backend changes:** Password hash, session rotate/expiry/revoke, CSRF, throttling login, user disable, audit redacted.
- **Frontend changes:** N/A — backend độc lập trước khi nối UI.
- **Database changes:** Migration users/roles/session/audit foundations; bootstrap admin từ secret, không default password commit.
- **API changes:** Implement contract auth/user đã duyệt.
- **Business rules:** Không lộ account existence; không log mật khẩu; tối thiểu quyền.
- **Tests / bằng chứng cần có:** Unit test quyền; integration test đăng nhập, hết phiên, CSRF, tài khoản bị vô hiệu hóa và phản hồi 403; kiểm tra nâng schema MySQL.
- **Dependencies:** S02-T01.
- **Risk:** Quên revoke session, sai CORS/CSRF.
- **Definition of Done riêng:** Negative auth tests PASS, persistence thật, không có secret trong repo.

### S02-T03 — Nối login và session vào ứng dụng

- **Feature:** Nối login và session vào ứng dụng
- **Objective:** Loại actor hardcode ở luồng mới, giữ nguyên navigation khi đã đăng nhập.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Frontend/src/app/features/auth/; Frontend/src/app/providers/; Frontend/src/app/components/Header.jsx; Frontend/src/AppEntry.jsx; Frontend/src/app/services/api/
- **Backend changes:** Hoàn thiện me/permission response theo UI.
- **Frontend changes:** Login/logout, loading/expiry/forbidden, permission-aware shell; thay NG/hardcode actor bằng profile.
- **Database changes:** N/A ngoài dữ liệu S02-T02.
- **API changes:** Dùng auth client; không lưu secret/token vào browser storage.
- **Business rules:** Không cho thao tác ghi sau hết phiên; giữ draft an toàn khi lỗi.
- **Tests / bằng chứng cần có:** RTL cho các trạng thái đăng nhập; E2E đăng nhập, đăng xuất, hết phiên và regression menu; build.
- **Dependencies:** S02-T02.
- **Risk:** Ẩn menu làm tưởng đủ kiểm soát quyền.
- **Definition of Done riêng:** Luồng auth end-to-end PASS; tài liệu account/profile demo riêng.

## Demo và nghiệm thu sprint

Đăng nhập và kiểm tra quyền trên các API identity đã triển khai; đăng xuất làm phiên mất hiệu lực. Ma trận Admin/PM/Tester đã có negative tests qua HTTP thật. Khách chưa mở; kiểm chứng quyền theo dự án ở S03-T01 khi có project API.

- [x] Các task trong phạm vi đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [x] Không task bị chặn hoặc kiểm tra chưa chạy bị ghi thành DONE.
- [x] API/database/UI liên quan khớp nhau; migration kiểm tra fresh + upgrade.
- [x] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [x] Chưa tự triển khai sprint kế tiếp.

## Nhật ký thực hiện

### 22/09/2026 — S02-T01/T02/T03: PLANNED → DONE

- **Nhánh:** tạo `feature/sprint-02-auth` tại `3355cfc` (nền develop), mang mã S01 chưa commit sang để tiếp tục. Giữ checkpoint S01 trong `stash@{0}` tên `Sprint 01 foundation checkpoint before Sprint 02`. Chưa commit/push/merge, develop chưa nhận S01/S02.
- **S02-T01:** ADR-002, permissions.md, identity.md và OpenAPI đồng bộ quy tắc người dùng. Contract identity chốt trước code, cập nhật thêm PM theo yêu cầu mới. OpenAPI có 11 path/13 operation; parse YAML, duplicate key và local reference PASS. Kịch bản ngoài quyền dự án được ghi cho S03, chưa giả định đã thực thi.
- **S02-T02:** Spring Security + Spring Session JDBC; PBKDF2 có salt; login/logout/me; tạo/list/bật tắt user; quyền cấp riêng cho PM; CSRF, rotate session ID, idle timeout, revoke session và version guard; throttle username/IP trong MySQL; audit chỉ metadata. Bootstrap Admin opt-in, không có mật khẩu mặc định. V2 tạo identity/session, V1 nguyên vẹn so checkpoint S01.
- **S02-T03:** AuthProvider/Boundary, form tiếng Việt theo font/màu hiện tại, trạng thái tải/lỗi/thử lại/hết phiên; hồ sơ thật và logout trên header/runner. Thay actor mới và “Gán cho tôi”/lọc cá nhân bằng profile. Giữ draft dưới vùng hidden/inert khi hết phiên, khôi phục cùng user; khác user/đăng xuất reset; Escape không đóng nháp bị khóa. Bộ lọc lưu theo ID user. Không lưu credential/token trong browser storage. Các mẫu lịch sử không bị đổi tác giả.

**Kiểm tra PASS:**

| Kiểm tra | Bằng chứng |
| --- | --- |
| Backend | `rtk proxy .\mvnw.cmd -B -ntp verify`: **17 tests**, 0 failure/error/skipped; Testcontainers MySQL 8.4.8. |
| Phân quyền thực tế | HTTP server + cookie jar: Tester/PM chưa cấp 403; Admin cấp PM; PM tạo Tester 201 nhưng tạo Admin/PM hoặc tự cấp quyền 403; thu hồi quyền làm phiên cũ 401, đăng nhập lại vẫn không tạo được. |
| Session/validation | Rotate cookie ID, HttpOnly/SameSite, lưu session MySQL, logout/replay 401, hết hạn 401, khóa nhiều phiên, CSRF thiếu 403, throttle 429, optimistic lock 409, duplicate/validation/paging, hash không lộ, bootstrap không reset. |
| Migration | DB mới → V1+V2; V1 có dữ liệu → V2, chạy lại 0 migration; giữ dữ liệu V1; roles được seed, users rỗng trước bootstrap; checksum/clean guard. |
| Frontend | `rtk proxy npm test`: **25 tests/3 files**, gồm 9 auth, 10 API client, 6 navigation; `rtk proxy npm run build` PASS. |
| Browser | Đăng nhập Admin local; đúng tên/vai trò; mở menu con Danh sách/Kanban; mở form nhập nháp, cho phiên local hết hạn, tiếp tục nhập nhận màn Đăng nhập lại; Escape không mất form; đăng nhập cùng tài khoản giữ đúng tiêu đề nháp; đăng xuất về login. Đã xem screenshot màn login và kiểm tra DOM tương tác. |
| Runtime local | Check-System báo backend UP, MySQL 8.4.8, Flyway V2/2 migrations; restart backend không thay Admin; không có diagnostic trên web. |

**Demo:** mở `http://127.0.0.1:5173/#/dashboard`; lấy tài khoản local bằng `scripts/Show-LocalLogin.ps1`. Hướng dẫn [development.md](../../development.md). Test account/role tự động chạy DB tạm, không seed khách/PM/Tester thử vào DB local.

**Giới hạn:** chưa có UI quản trị users, đổi/quên mật khẩu hay SSO; quyền theo dự án S03 chưa triển khai. Board/test case/report vẫn prototype, auth thật không biến các dữ liệu đó thành dữ liệu backend. Bản nháp chỉ giữ trong bộ nhớ khi reauth cùng tài khoản, không tồn tại sau tải lại trang. Dừng tại S02; S03 chỉ bắt đầu khi được yêu cầu.
