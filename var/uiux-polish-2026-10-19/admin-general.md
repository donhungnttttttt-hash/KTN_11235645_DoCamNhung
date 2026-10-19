# Admin / Auth / General — audit và polish ngày 19/10/2026

## Phạm vi và mức bằng chứng

Phạm vi sở hữu: `Frontend/src/app/features/admin`, `auth`, `projects` trừ `ProjectInformation` và CSS riêng của nó. Không sửa backend, API contract, database, cấu hình, planning/STATUS, Header, global CSS, shared hooks/components hoặc các feature Testing/Work items/Reports/AI. Không browser, HTTP/API thật, cấp quyền hoặc tạo tài khoản thật. Mọi kiểm chứng ở đây là **SOURCE_REVIEW + component/unit mocks**; **BROWSER_NOT_RUN**. Không suy coverage hoặc runtime PASS từ số test.

Đối chiếu inventory trước ở `../uiux-audit-2026-10-19/admin-general-source.md`, checkpoint `../uiux-recheck-2026-10-19/admin-general-recheck.md` và báo cáo tổng hợp. Các kết quả cũ không được tính là test mới. Giữ compact typography, layout hiện có và năm màu kết quả của người dùng; không redesign toàn bộ trang.

## Đã triển khai

| Mã / vấn đề | Trước → sau | Source và chứng cứ mới |
| --- | --- | --- |
| UX-014 — PM được cấp quyền chỉ thấy lời nhắc | Menu tài khoản nay có **Tạo tài khoản Tester** khi PM có `users:create`. Mở dialog ngay trong workspace, không mở AdminUsers cho PM. Form không có role selector, payload luôn TESTER, báo pending/lỗi inline, giữ draft khi lỗi, focus lỗi và trả focus trigger sau đóng. Thu quyền sẽ bỏ dialog. Tài khoản mới không tự thành member của project. | `auth/AccountMenu.jsx`, mới `admin/UserCreateDialog.jsx`; AdminUsers tái dùng cùng form, vẫn có bốn role cho ADMIN. Test mới 3 case RED trước sửa. Backend vẫn là ranh giới enforce, không bỏ role/scope/CSRF. |
| UX-003 — editor Note giữ version cũ sau 409 | Sau 409, giữ draft nhưng chặn Save. Người dùng chọn **Đối chiếu bản mới của Note**, đọc bản server và chọn **Đã đối chiếu, giữ nháp để lưu lại**. Chỉ khi đó lấy version mới cho lần Save tiếp theo; không tự ghi đè. Lỗi tải có thể thử lại, draft còn. 404 giải thích cần giữ nội dung trước khi hủy. Lần sửa đồng thời tiếp theo vẫn có thể trả409 và quay lại đối chiếu. | `projects/ProjectNotes.jsx`, `project-notes.css`; hai test mới chứng minh compare, explicit rebase, retry và payload expectedVersion mới. Vùng nội dung server có focus để keyboard cuộn; thời gian ghi rõ giờ Việt Nam. |
| R12 — focus khi thêm phiên bản Handbook | Textarea của revision nhận focus. Hủy editor trả focus vào nút Thêm phiên bản mới được render lại, thay vì body sau khi trigger cũ bị unmount. Không dùng query toàn document. | `projects/HandbookPanel.jsx`; `handbook-editor-focus.test.jsx` RED trước sửa. Không thay immutable revision hoặc expectedCurrentRevisionId. |
| Form tài khoản dùng ngoài Admin | Dialog tự có body typography, control/button styling và kích thước phù hợp, thay vì kế thừa caption của AccountMenu và phụ thuộc `.admin-main`. Username/password có hướng dẫn format ngay dưới trường, không làm thay đổi accessible label. | `admin/admin.css`, `admin/UserCreateDialog.jsx`; field labels vẫn được existing Admin tests truy vấn. |
| Focus / hierarchy / motion cục bộ | Login input focus ring rõ; General description textarea cùng font/border/radius với input; fieldset General bỏ chrome mặc định; Handbook document đang chọn có border/inset marker, không chỉ font weight. Các panel/control dùng token radius/motion. AdminFormDialog có một entry opacity/6px Y; không animate form con hoặc overlay. Reduced motion tắt animation/transition và spinner quay. Note comparison phân tách rõ với draft, wrap text và body dài có vùng cuộn keyboard-focusable. | `auth/auth.css`, `projects/projects.css`, `projects/project-notes.css`, `admin/admin.css`. Đây là CSS source review; không có test decorative hoặc tuyên bố đã đo contrast/viewport. |

## Inventory route/control/state

Tất cả 34 dòng là SOURCE_REVIEW; không đổi thành browser PASS. Các state liệt kê là state có trong source/cần kiểm khi tương tác, không có nghĩa từng tổ hợp đã chạy test. Lỗi read có retry; pending write giữ khóa busy theo implementation hiện có trừ khi nêu riêng.

| ID | Route / actor / control và biến thể quan trọng | State và đánh giá |
| --- | --- | --- |
| AG-I01 | Login/reauth/unavailable: username, password, reveal, submit, retry; mọi user | Loading, anonymous, expired, unavailable, invalid/pending/login failure, same/different-user draft. Regression mới tìm portal thoát hidden/inert; đã phối hợp sửa, test integrated PASS, xem đầy đủ lịch sử bên dưới. |
| AG-I02 | Account popup, logout; PM delegated create | Escape/blur, logout pending/error, grant hidden/revoked, create pending/error/success/cancel; CTA mới được mock test. |
| AG-I03 | `/admin`: reload, KPI/project/device/attention/workspace/logout links; ADMIN | Overview loading/error/retry/empty/project scope; không đo geometry/charts thật. |
| AG-I04 | Non-ADMIN truy cập Admin URL | Denied và return workspace; không mở rộng route cho PM. |
| AG-I05 | `/admin/projects`: search, scope, previous/next, create; ADMIN | Loading/error/empty/page/search reset, active/archived. Không tự sửa query/API. |
| AG-I06 | Create-project wide modal: code/name/timezone, member role/select, device recipient/date/notes, submit/X/Escape/cancel | Validation, no PM, candidate loading/error/empty, pending/failure, off-page selection. Dirty discard R01 còn; không thêm confirm rộng toàn hệ thống. |
| AG-I07 | `/admin/projects/:id`: summary, reload/edit, add/remove members, role drafts | Active/archived, partial save và retained remaining selection, pending/error/version. |
| AG-I08 | Edit-project dialog/version reload | Read/load error, dirty draft/version conflict/retry, busy close lock. So sánh server version UI hiện có chưa thay. |
| AG-I09 | MemberPicker: search/system role, selected list, checkbox/select all/page | Enabled/unassigned filters, DEV compatibility, off-page selection, loading/error/no results. Nested keyboard runtime chưa kiểm. |
| AG-I10 | Archive/reopen dialog: readiness, reason, refresh, confirm/cancel | Blocked/ready/warnings/archived, version/conflict403/uncertain same-key retry. UX-002 legacy blocker còn ngoài frontend polish. |
| AG-I11 | Lifecycle history expand/page/retry | Loading/read failure/empty/history pages; không ghi archive/reopen thật. |
| AG-I12 | Legacy status-report history / Analysis link | Read-only history, permitted/denied/no project, empty/read error; không khôi phục legacy write. |
| AG-I13 | `/admin/users`: keyword/role/project/locked filters/page, lock/unlock/delegate | Self-lock disabled, PM grant/revoke/version; pending/error. Không cấp hoặc thu quyền thật. |
| AG-I14 | Admin account-create modal | TESTER/DEV/PM/ADMIN choice còn cho ADMIN; format help/validation, pending/failure/draft/focus; tái dùng form được regression test. |
| AG-I15 | `/admin/devices`: search/condition/project/history/page/editor | Load/error/empty, generation guards; page shrink after return R04 còn cần fixture. |
| AG-I16 | Physical asset new/edit: code/serial/model/condition/notes | Invalid/pending/failure/version reload/cancel; không đổi field semantics. |
| AG-I17 | Assign single machine: project, active PM, date, note, confirm | Missing project, loading/failed members, no eligible PM, duplicate pending, conflict. Không mở assign cho từng tester. |
| AG-I18 | Return machine: condition/note/version/confirm | Pending/failure/already returned/conflict refresh/cancel. Archived project vẫn cho quản lý thu hồi theo quyền asset hiện có. |
| AG-I19 | Allocation current/history | Recipient/actor/date/note, empty/history, returned rows không có return action; horizontal tables giữ nguyên. |
| AG-I20 | `/admin/audit`: keyword/project/from/through/reload/page | Loading/error/empty/date filtering và giờ Việt Nam. Không thêm unsupported type/timezone selectors. |
| AG-I21 | `/admin/ai` retirement adapter | Adapter còn, không đưa lại sidebar; AI chat/config ngoài scope. |
| AG-I22 | Unknown Admin URL | Fallback về overview; source-only. |
| AG-I23 | Workspace project selector: active/archived marker/retry/Admin-create link | Empty/error/loading, menu dài, current selection and project switch; parent/project key behavior giữ nguyên. |
| AG-I24 | `/settings`: code/name/description/timezone, save/reload; ADMIN/active PM | Read-only/archived, load failure/retry, invalid, busy, success/update conflict. Textarea polish; không đổi refresh/provider semantics. |
| AG-I25 | `/settings/members`: member list + Admin manage link | Read-only list cho workspace, member empty/loading/error. ADMIN link centralized; legacy MemberEditor không trở thành route active. |
| AG-I26 | Project-held machines | Read-only cho nonadmin; Admin supplement/return theo quyền. No-project/empty/error/history. |
| AG-I27 | Supplement machines dialog: selected machines/one PM/date/per-item notes | No PM/loading/error, selected/off-page, partial failure còn selection và draft chưa gửi. Không submit thật. |
| AG-I28 | Note list: reload/add/edit/delete/page | Read-only controls hidden, loading/error/empty/page shrink, project switch/capability loss abort. |
| AG-I29 | Note inline create/edit | Draft/title/body validation, busy, save/cancel,409 compare/rebase mới; late/failed compare không ghi tự động. |
| AG-I30 | Note delete inline confirm/keep | Confirm before request, busy/error/retained item, success/page recovery. Không browser delete. |
| AG-I31 | `/settings/rules`: absent/existing/draft/published/history/create/version/publish | Permission/archived guard, load/error/empty/pending. UX-011 cũ vẫn cần contract work; không bỏ requiredFields để tránh422. |
| AG-I32 | `/settings/handbook`: new/list/detail/revision/history | Plain text, loading/error/retry/empty, read-only/archived, pending/error/version conflict; revision textarea/cancel focus mới. |
| AG-I33 | `/settings/catalogs` compatibility adapter | Retired catalogs không tính là active CRUD screen; hướng sang Note. |
| AG-I34 | Legacy exported CreateProjectDialog/MemberEditor | NOT_APPLICABLE_ACTIVE_ROUTE theo caller đã kiểm; không tăng số màn từ file không reachable. |

## Test mới và failure không được che

Các file test dùng jsdom và API object/module mock; không chạy backend/testcontainers/seed. `AdminProjectLifecycle.integration.test.jsx` là integration component với API giả, không HTTP/DB integration. Coverage **NOT_MEASURED**.

1. RED trước sửa: `rtk proxy npm.cmd test -- src/app/features/auth/account-create-tester.test.jsx src/app/features/projects/ProjectNotes.test.jsx src/app/features/projects/handbook-editor-focus.test.jsx --reporter=json --outputFile=../var/uiux-polish-2026-10-19/admin-general-red.json` tại Frontend. **15 tests: 9 PASS / 6 FAIL**, 3 file, exit1. Sáu failure đúng các behavior mới chưa có. [Receipt](admin-general-red.json).
2. GREEN sau sửa ba behavior: cùng ba file, output `admin-general-green.json`. **15/15 PASS**, 3 file, exit0. [Receipt](admin-general-green.json).
3. Regression scope: `rtk proxy npm.cmd test -- src/app/features/admin src/app/features/auth src/app/features/projects --reporter=json --outputFile=../var/uiux-polish-2026-10-19/admin-general-scoped.json`. **183/184 PASS**, 28 file, exit1. [Receipt](admin-general-scoped.json). Failure: auth test “does not close a retained draft modal when Escape is pressed on the login screen”.
4. Isolation: `rtk proxy npm.cmd test -- src/app/features/auth/auth.test.jsx --reporter=json --outputFile=../var/uiux-polish-2026-10-19/admin-general-auth-isolated.json`. Cùng failure lặp lại; không tăng timeout để né. [Receipt](admin-general-auth-isolated.json).

Root cause source xác định: `work-items/components.jsx` Modal mới portal ra `document.body`, thoát khỏi `AuthBoundary` hidden/inert wrapper. `useDialogFocus` kiểm closest hidden/inert nên không nhận ra modal đã bị lock; Escape gọi close và portal có thể vẫn hiện. Không sửa chéo file owner khác: đã phối hợp root/testing owner như sau, giữ nguyên các receipt thất bại:

- Auth scope tạo `DialogVisibilityContext.js` (mặc định true để component độc lập không cần AuthBoundary); `AuthBoundary` cung cấp authenticated flag cho children được giữ lại. Không `return null` để tránh xóa draft.
- Testing owner dùng context cho Modal và CaseIssueAction portal host hidden/inert. Root tích hợp context vào `useDialogFocus` để mọi modal nhả body overflow/focus khi app khóa và khôi phục khi mở lại. Các file này do owner tương ứng sửa.
- Strengthen auth regression: portal input không visible và có inert ancestor khi expired; Escape không gọi close; same-account login phục hồi nguyên input. [RED mới](admin-general-portal-red.json) đã thấy input vẫn visible trước sửa.
- Thêm auth regression cho Admin modal retained: expired cần nhả body overflow, same-account login giữ draft và khóa cuộn lại. [RED mới](admin-general-scroll-lock-red.json) fail đúng vì overflow vẫn hidden trước hook fix.
- Tự phát hiện một tương tác trong entry PM mới: `auth.can` false khi expired làm form bị unmount. [RED](admin-general-pm-retention-red.json) chứng minh mất trường Tên hiển thị. `AccountMenu` nay giữ form theo grant trong retained profile chỉ khi expired/unavailable; authenticated profile thu grant vẫn đóng form, không dùng profile cũ cấp quyền write. AuthBoundary/context giữ UI đó hidden/inert. Test giữ draft qua reauth cùng PM; không gửi createUser. Login helper test được scope vào form Đăng nhập đang visible để không nhầm hidden username field của draft.

Lệnh integrated: `rtk proxy npm.cmd test -- src/app/features/auth/auth.test.jsx src/app/features/auth/account-create-tester.test.jsx src/app/features/admin/admin-dialog.test.jsx --reporter=json --outputFile=../var/uiux-polish-2026-10-19/admin-general-auth-dialog-green.json`. **18/18 PASS, 3 file, exit0**. [Receipt](admin-general-auth-dialog-green.json). Không kết luận mọi portal đã kiểm browser; root vẫn cần xác minh hình thức hiển thị, pointer và keyboard khi lock.

Regression cuối mới, sau toàn bộ sửa ở scope và phối hợp context: `rtk proxy npm.cmd test -- src/app/features/admin src/app/features/auth src/app/features/projects --reporter=json --outputFile=../var/uiux-polish-2026-10-19/admin-general-scoped-final.json`. **186/186 PASS, 28 file, exit0**. [Receipt cuối](admin-general-scoped-final.json). `rtk git diff --check -- Frontend/src/app/features/admin Frontend/src/app/features/auth Frontend/src/app/features/projects`: exit0. Không chạy build/lint/backend trong agent này; root thực hiện các kiểm tra chung. Coverage vẫn NOT_MEASURED.

## Việc còn lại / cần browser

- UX-002 legacy archive blockers, UX-010 archived Feature Admin affordance và UX-011 Rules contract/copy cũ vẫn cần owner tương ứng. Không đánh dấu fixed chỉ từ polish này.
- UX-003 và UX-014 đã có sửa source + mock proof; runtime/role enforcement thật còn NOT_RUN. PM global AI READ không cho CRUD toàn hệ thống. Không mở PM tới AdminUsers.
- R01 long-form dirty close chưa được sửa chung; R04 asset page clamp và nested picker keyboard vẫn cần fixture/reproduction phù hợp. Handbook cancel focus đã sửa riêng; chưa tuyên bố focus sau save/during concurrent revision được browser kiểm.
- General save-success/provider-refresh-failure vẫn là risk cần fixture; không suy hai alert đồng thời từ catch code. Timestamp02:08 fixture trước không phải bug UTC/VN.
- Browser queue root: mở/cancel delegated PM create bằng fixture quyền có sẵn (không grant/create account chỉ để screenshot); ADMIN form role choices; Note409→compare→read→ack→Save/second409/error404; Handbook revision textarea focus→Hủy returns focus; login focus/reveal/paste/pending; 320/390/768/1440 và viewport thấp cho dialog/compare text dài, keyboard Tab/ShiftTab/Escape, reduced motion. Khi reauth, thử có modal portal đang mở và xác minh nó không hiển thị/nhận input/Escape. Không coi các scenario này đã chạy.

## Skill → công việc → bằng chứng

| Skill | Áp dụng thực tế | Bằng chứng / giới hạn |
| --- | --- | --- |
| frontend-ui-engineering | Rà focus, loading/submit, form help, hidden permission state, bounded dialogs và local tokens; bảo toàn layout/type/result colors | Ba behavior fixes, scoped CSS, inventory34; chưa browser/AT/contrast measurement |
| ui-ux-pro-max | Dùng local priority/quick-reference: error clarity, inline validation/help, loading feedback, focus management, reduced motion | Đã đọc SKILL.md/pro-rules/quick-reference. Search CLI không chạy vì python/python3/py không có PATH; **không có database-query result**, không cài thêm; native mobile sizing không áp thành quy chuẩn desktop |
| frontend-patterns | Tái dùng UserCreateDialog, local locks/lifetime cleanup, giữ draft và explicit version rebase | Source form/account/Notes, mock pending/revoke/conflict tests |
| tdd-workflow | Viết behavior test fail trước sửa, chạy GREEN rồi regression và isolation | RED6→GREEN15; regression failure được giữ/report, không suy coverage |
| security-review + api-design (đã đọc trong cùng phiên) | PM capability gate chỉ tạo TESTER, không lộ Admin user list; preserve backend enforcement, expectedVersion và abort | Không backend/API changes, không disable version checks, không account/grant thật |

Checkpoint source/test đã ổn định: scope regression186 PASS. Đây chưa phải xác nhận toàn bộ UI/UX PASS, và không thay thế browser/AT/viewport evidence.
