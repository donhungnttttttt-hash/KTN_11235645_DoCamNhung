# Audit 2026-10-16: Admin, dự án và danh tính

Phạm vi: source hiện tại trên `system-design`; frontend `features/admin`, `features/projects`, `features/auth`; backend `admin`, `project`, `identity`, `catalog`, `handbook`, `rules`. Đã đọc hướng dẫn RTK/AGENTS, README/STATUS/execution guide của planning, quyền hiện hành và contract liên quan. `S11 IN_REVIEW` được giữ; số test lịch sử 11/10 không được dùng làm bằng chứng kiểm chứng mới.

## Phát hiện đã tái hiện và sửa

### ADM-01 — P2: bản nháp vai trò của thành viên đã gỡ khóa vĩnh viễn nút vòng đời dự án

- Vị trí: `Frontend/src/app/features/admin/AdminProjectDetail.jsx:25` (`pendingChanges`), handler gỡ trước bản sửa tại cùng file, hiện ở dòng 38.
- Tái hiện: sửa vai trò của Tester One nhưng chưa lưu; sửa vai trò của Tester Two nhưng chưa lưu; gỡ thành công Tester One; giữ nguyên bản nháp Tester Two; hoàn nguyên Tester Two về vai trò đã lưu. Trước sửa, nút **Kiểm tra lưu trữ** vẫn bị khóa, dù không còn thay đổi nào có thể sửa trong UI. **Tải lại** chỉ tải dữ liệu, không loại bản nháp mồ côi.
- Nguyên nhân: gỡ thành công không xóa `roleDrafts` của người bị gỡ. `pendingChanges` so sánh bản nháp đó với member không còn tồn tại, nên luôn nhận `true`.
- Sửa tối thiểu: sau khi `api.removeMember` thành công, chỉ xóa bản nháp vai trò của chính người vừa gỡ. Giữ nguyên bản nháp của các thành viên khác. Lệnh thất bại đi thẳng vào catch của `mutate`, trước khi xóa bản nháp.
- Seam: `AdminProjectDetail` thật cùng `AdminProjectLifecycle`; thao tác qua role select và nút, quan sát trạng thái lifecycle sau readback members.
- RED: `rtk proxy npx vitest run src/app/features/admin/AdminProjectLifecycle.integration.test.jsx --maxWorkers=1`: 1 test mới FAIL ở `toBeEnabled()` của nút Kiểm tra lưu trữ; 3 test hiện có PASS.
- GREEN: `rtk proxy npx vitest run src/app/features/admin/AdminProjectLifecycle.integration.test.jsx src/app/features/admin/admin-management.test.jsx --maxWorkers=1`: 19/19 test, 2/2 file PASS. Test mới cũng chứng minh bản nháp của Tester Two không bị mất và vẫn chặn vòng đời cho đến khi được hoàn nguyên.
- Bổ sung trong chính test này: lần gỡ đầu trả conflict, cả hai role draft được giữ; lần retry mới gỡ thành công. Lượt rerun cuối file integration: 4/4 PASS. Đây là tập con của lượt 19, không cộng thành 23 test duy nhất.
- Không đổi quyền, API, transaction, DB hoặc migration.

### ADM-02 — P3: contract báo cáo tiến độ còn ghi ADMIN không có quyền gửi

- Vị trí: `docs/api/admin-reporting.openapi.yaml:13` và phần POST status-reports.
- `docs/business/permissions.md` xác nhận ADMIN tổng toàn quyền từ 10/10. Source `ProjectStatusReportService.java:35` cho global ADMIN gửi báo cáo không cần membership; lịch sử workspace ở dòng 63 trả `canPost=true` cho ADMIN trên dự án writable. `ProjectStatusReports.jsx:33` đưa người dùng từ trang quản trị sang workspace để gửi.
- Contract cũ vẫn ghi ADMIN không có membership PM không được gửi. Đã sửa mô tả read/post/403 theo quyền hiện hành, ghi đúng actual actor. Route GET quản trị vẫn `canPost=false`; đây là lựa chọn của route/UI quản trị, không thu hồi quyền ADMIN ở POST workspace.
- Chỉ thay mô tả contract, không mở endpoint/quyền mới. Root phụ trách kiểm chứng contract tổng hợp.

### ADM-03 — P2: tìm tài khoản bằng tên tiếng Việt gây lỗi MySQL 3854

- Vị trí: `Backend/src/main/java/vn/syp/tms/admin/AdminProjectService.java:67`; UI bị ảnh hưởng: tìm username/tên ở trang Người dùng và tìm thành viên khi tạo/bổ sung nhân sự dự án (`AdminUsers`, `MemberPicker`).
- Gốc lỗi: `identity_users.username` dùng `ascii_bin` tại `V2__create_identity.sql:9`, nhưng cùng keyword UTF-8 được truyền vào `LOCATE(?,u.username)` trước nhánh tên hiển thị. MySQL ép keyword có dấu về ASCII và báo lỗi; điều kiện OR tên hiển thị không cứu được query.
- RED thật do root chạy trước sửa: SELECT read-only với đúng điều kiện OR của query, keyword `Nguyễn`, trên native MySQL 9.7/tms trả **ERROR 3854**. Không thêm/sửa/xóa fixture DB chính. Bằng chứng: `var/review-2026-10-16/unicode-user-search-sql.json`.
- Sửa: đổi riêng biểu thức username thành `CONVERT(u.username USING utf8mb4) COLLATE utf8mb4_bin`. Giữ `LOCATE` literal, so khớp username phân biệt hoa/thường, collation tên hiển thị và toàn bộ filter/page hiện có. Shared WHERE dùng cho cả count lẫn items nên sửa cùng hai đường.
- GREEN SQL của root: cùng điều kiện có conversion chạy thành công, count=0 (keyword không có trong snapshot; không suy thành test positive match). Root có thể bổ sung bằng chứng exact final clause có `COLLATE`; không có lệnh DB do agent này chạy.
- Tham khảo chính thức đã đọc: [MySQL 9.7 — Cast Functions and Operators](https://dev.mysql.com/doc/refman/9.7/en/cast-functions.html), phần Character Set Conversions và collation trên kết quả CONVERT. Cùng pattern đang dùng tại `AdminOverviewService.projects` cho project code ASCII.
- Thêm test hành vi public HTTP: `AdminNativeIntegrationTest#userSearchAcceptsVietnameseDisplayNamesAndPreservesLiteralCaseSensitiveUsernames`. Test isolated/rollback sẵn có cập nhật displayName fixture thành `Nguyễn Thị Kiểm thử 100%_`; GET `/api/v1/admin/users` theo project và size1 phải trả đúng tester cho tên tiếng Việt, chuỗi `%_` literal và username; keyword không tồn tại/username uppercase trả 0. Không dùng assert so chuỗi SQL làm bằng chứng hành vi.
- **Test native mới NOT_RUN**: các schema isolated đang có chỉ V21/V22, chưa có V29 phù hợp; không tự migrate/reset schema để chạy. Root phụ trách Maven compile/unit cuối; compile hoặc skip native không được báo thành native PASS. Không sửa migration, schema, credential hay runtime.

## Ma trận đối chiếu module

| Module / yêu cầu hiện hành | UI / hành động đã truy vết | API / authority | DB / transaction và readback | Test mới / khoảng trống |
| --- | --- | --- | --- | --- |
| Đăng nhập, hết phiên, đăng xuất; giữ bản nháp cùng user nhưng khóa tương tác khi mất phiên | `AuthProvider.jsx:12`, `AuthBoundary.jsx`, `AccountMenu.jsx`; login/logout, refresh focus/activity, retry, Escape | `AuthController`, `SessionAccountFilter`; CSRF và session authority tại `config/SecurityConfig.java` | `IdentityService.current`, account version so với session principal; enabled/delegation update xóa SPRING_SESSION và ghi identity audit | Đã đọc source auth tests; lượt focused mới không chạy auth suite. Không khẳng định runtime login/logout mọi tổ hợp |
| ADMIN tạo mọi role; PM chỉ được tạo TESTER khi cấp riêng; không tự khóa tài khoản | `AdminUsers.jsx:9,14,21`; tạo, khóa/mở, cấp/thu hồi, filter/page, error/retry | `UserController` + `IdentityService.java:59,73`; backend kiểm quyền và expectedVersion, self-disable guard | `identity_users` optimistic version, username unique, audit/session revocation trong transaction | `admin-management.test.jsx` thuộc GREEN 19; ADM-03 keyword tiếng Việt có native SQL read-only RED/GREEN và public HTTP test guarded NOT_RUN; identity race còn cần proof riêng |
| ADMIN tạo dự án kèm PM/member/máy ban đầu, creator không tự là PM | `AdminProjectForm.jsx:23,28`, `MemberPicker`, `InitialDevicePicker`; chọn người/máy xuyên trang, yêu cầu PM/recipient, lưu/hủy/reload version | `/admin/projects`; `AdminProjectService.java:29`; legacy POST `/projects` trả CENTRAL_CREATION_REQUIRED | Tạo project→membership→initial allocation cùng `@Transactional`; identity locks theo thứ tự, project/assets locks; rollback toàn transaction khi có lỗi | Existing admin-management tests nằm trong GREEN19. Native transaction/race/FK chưa chạy mới ở agent này |
| Chỉ ADMIN đổi membership; DEV chỉ role DEV; giữ PM cuối theo membership policy | `AdminProjectDetail.jsx:25,27,38,45`; chọn/bỏ thêm, lưu từng vai trò, gỡ, readback và phản hồi partial save | `ProjectService.java:86,116,204,241`; backend current admin guard, target enabled, same-project member/version/last-PM | `MembershipRepository.lockMember`, updateCurrent version predicate; lock project serializes membership mutations; audit ghi cùng transaction | ADM-01 RED→GREEN; tests giữ role draft sau conflict và partial membership save trong GREEN19. Chưa chạy native hai ADMIN cùng thao tác |
| Workspace liệt kê/đọc đúng project; ADMIN toàn hệ thống, role khác cần membership active | `ProjectProvider.jsx:11`, `ProjectSelector`, `projectAccess.js`; link projectId, manual chọn, refresh, archived label | `ProjectService.java:29,41,152,185,212` | Read ADMIN không tạo member; write attribution dùng `ProjectActorService.forWrite` tạo MEMBER inactive khi cần; actor vẫn đúng ADMIN | Đã đọc ProjectProvider tests và source guard; root/full-suite cần chạy mới. Không khẳng định e2e cross-project mọi resource |
| Project settings và catalog có version/validation/archive | `ProjectSettingsPage`, `CatalogPage.jsx:19`, `CatalogEditor.jsx:19`; general save/retry, create/edit/archive 5 loại, clear dates | `ProjectController`, `CatalogController/CatalogInput`, `CatalogService`; writable project/global ADMIN/current PM non-DEV | Mọi writer gọi `lockWritableProject`, kiểm item cùng project và expectedVersion; date range/unique build; save+audit cùng transaction | Đã đọc source/test hiện có; agent chưa chạy suite catalog mới. Không thay rule archive catalog khác nhau giữa các loại |
| Sổ tay plain text có lịch sử và nguồn nội bộ; không có script/HTML execution | `HandbookPanel.jsx:5,43`; list/detail/history/new revision/save/retry | `HandbookService.createResource/addRevision`, `HandbookDtos` allowlist loại/visibility và max length | Scope project; revision expectedCurrentRevisionId, archived guard, project write lock, đúng actor membership FK; content render qua `<pre>` | Source tracing xác nhận; native revision race/HTTP XSS chưa chạy mới ở agent này |
| Rules chỉ INTERNAL_DEMO đã chốt, draft→publish versioned; không tự bịa rule khách | `RulesPanel.jsx:6,20`; tạo ruleset, lưu draft, publish xác nhận, lịch sử/retry | `RuleService`, `InternalRulePolicy.parse` typed schema/scope/field allowlist; writable project | Project lock, versionNo, expectedActiveVersionId, cùng-project rule/version, membership attribution+audit; không chạy expression | Source tracing; backend InternalRulePolicyTest đã đọc tên/source liên quan, chưa chạy Maven mới |
| Kho máy vật lý và bàn giao/thu hồi, cấu hình thiết bị kiểm thử là module riêng | `AdminDevices.jsx:12`, `DeviceAssetForm`, `DeviceAllocationDialog`, `ProjectDevices`, `ProjectDeviceAssignDialog`; search/page, import/edit, assign/return, bulk recipient, partial save/retry | `DeviceInventoryService.java:22,32,34,43,57,65,75`; ADMIN quản lý, project reader có scope | asset/project/member locks, active allocation kiểm tra, asset version, expected return theo timezone project; initial allocations cùng project-create transaction | Đã đọc source inventory/action feedback tests; không chạy native assign race/FK/real hardware mới ở agent này. Không diễn giải source thành blanket runtime guarantee |
| Archive/reopen cần ADMIN, version+reason+idempotency, không bỏ qua việc tồn | `AdminProjectLifecycle.jsx:15,62`; readiness, blockers, reason, confirm, refresh, same-key retry, history/page | `ProjectLifecycleService.java:23,29,57,79`; enabled current ADMIN locking projection | Account→project locks; readiness locking reads, active sessions/devices/work/cycles/retests/outbox; quyết định+audit atomic; replay trả current state | 4 integration tests PASS trong GREEN19 gồm archive readback/focus/edit guard và ADM-01. Native archive/write races chưa chạy mới ở agent này |
| Báo cáo tiến độ append-only; quá hạn cần nguyên nhân+kế hoạch; metric không đổi do narrative | `ProjectStatusReports.jsx:17`; post draft, key retry, readback history/page; Admin quản trị link workspace | `ProjectStatusReportService.java:35,63`; global ADMIN/current PM non-DEV, writable project; admin history readonly route | Account→project lock; unique request key bound actor+normalized payload; audit and narrative cùng transaction; deadline query dùng project timezone | ADM-02 contract đã sửa. Source review; status-report/native race suites chưa chạy mới ở agent này |
| Dashboard/audit an toàn, không lộ credential/session/payload | `AdminDashboard`, `AdminAudit`; refresh, project/date/type/zone/page, detail links | `AdminOverviewService.java:19,56,79`; `AdminAuditService.list`; current enabled ADMIN | Overview repeatable-read; NA/applicable metric definitions, unique users vs memberships; audit UNION allowlist và UTC exclusive next-day filter | Source review; số liệu và date/DST runtime không được tuyên bố đã kiểm trong lượt focused19 |

## Candidate / giới hạn chưa biến thành phát hiện đã xác nhận

- **Identity/inventory authority race:** `IdentityService.create/update` dùng ordinary `current()` thay vì scalar current lock; `DeviceInventoryService.admin` cũng dùng ordinary read. Project mutations có `lockCurrent/FOR SHARE`. Đây là điểm cần native race/service-boundary proof để xác định actual ordering và tác động; không sửa khóa theo suy đoán, không gọi là lỗi đã xác nhận.
- **Search tiếng Việt đã xác nhận và sửa:** chuyển từ candidate thành ADM-03 sau read-only SQL RED/GREEN của root; public HTTP native regression mới vẫn NOT_RUN, xem giới hạn ở trên.
- Không báo việc khóa PM cuối qua tài khoản là bug: `docs/product/SYSTEM-SPECIFICATION.md:84` ghi rõ PM bị khóa cần ADMIN xử lý, last-PM guard là membership policy.
- API collection/DTO/guard review và test React mock không tương đương browser+backend+DB acceptance. Không bấm mọi nút trên DB chính, không tạo fixture hoặc thực hiện ghi/xóa DB chính.
- Coverage chưa đo trong lượt audit của agent này. 19 test PASS không suy ra coverage toàn module/toàn app.

## Skill / quy trình thực tế

| Skill đã đọc | Áp dụng thực tế / giới hạn |
| --- | --- |
| Matt `domain-modeling` | Đối chiếu global ADMIN, project membership, actor link inactive, asset vật lý vs device config với glossary/domain docs hiện có. Không đổi model nên không tạo glossary/ADR mới |
| Matt `code-review` | Đối chiếu chuẩn repo và yêu cầu nghiệp vụ ở hai cột riêng trong module matrix; current HEAD là baseline audit của root. Agent không tự tạo tracker/PR/commit; root điều phối các module review đã được user cho phép |
| Matt `diagnosing-bugs` + Superpowers `systematic-debugging` | Ban đầu read-only audit theo nhiệm vụ; khi có nghi vấn, dựng loop đỏ tại UI seam, xác nhận root cause bản nháp mồ côi, sửa đúng chỗ sau API success, rồi kiểm chứng green. Candidate DB/race không có proof vẫn được giữ tách riêng |
| Matt `tdd` | Seam React interaction+public command/readback đã được user/root chấp thuận; test hành vi trước code, RED1 rồi GREEN19; không test private state hay snapshot copy implementation |
| ECC `frontend-patterns` | Controlled role draft, mutation pending/error, stale response/unmount, list paging, focus/dialog và giữ draft trên lỗi |
| ECC `api-design` | Đối chiếu method/path/status/version/validation/pagination và sửa đúng contract ADMIN báo cáo theo source hiện tại |
| ECC `security-review` | Xem backend current authority/scope/CSRF/session invalidation, input allowlists, plaintext rendering, audit output allowlist. Không thay stack theo ví dụ Next/Supabase trong skill; không quét hạ tầng hay xuất secret |

## Lệnh và phạm vi kiểm chứng

1. Mọi shell đều qua `rtk`; reads dùng `rtk proxy`. Không chạy script cũ trong `var/`.
2. Có một lệnh CLI bị từ chối trước test: Vitest 4 không hỗ trợ `--minWorkers`. Sau đó bỏ flag này và dùng `--maxWorkers=1`; không tính lần CLI lỗi thành test RED.
3. RED hợp lệ: 1 FAIL / 3 PASS tại UI symptom thực, trước khi sửa `AdminProjectDetail`.
4. GREEN hợp lệ: 19/19, hai file `AdminProjectLifecycle.integration.test.jsx` và `admin-management.test.jsx`; sau bổ sung assertion giữ draft khi gỡ lỗi, integration 4/4 PASS (overlap, không cộng số test).
5. ADM-03 dùng proof native SELECT read-only do root chạy, không do agent này chạy. Public HTTP native regression mới NOT_RUN; root phụ trách compile/unit tổng hợp và không suy skip/compile thành native PASS.
6. Không chạy Maven/native DB/browser write/build mới ở agent này; root phụ trách broad verification và evidence tổng hợp. Không commit/push/merge/deploy/server/container restart/migration.
