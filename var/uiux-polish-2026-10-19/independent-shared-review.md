# Independent review — shared shell, report draft và portal integration

## Phạm vi / fixed point

Source review ngày 19/10/2026. Ban đầu READ-ONLY; sau khi thấy nguy cơ header dialog/drawer, root ủy quyền rõ **chỉ viết/chạy behavioral RED test** để kiểm chứng. Sau đó root cho phép thêm RED test nested project picker và sửa guard shared hook tối thiểu sau RED. Đây là ngoại lệ được giao cụ thể: hai file test mới và guard Escape trong `useDialogFocus.js`, không tự mở rộng product scope. Không browser/API/DB/env. Đọc `code-review/SKILL.md`; đối chiếu hai trục Standards và Spec trong cùng agent theo giới hạn parent không mở thêm task/agent. Spec là `docs/planning/2026-10-19-uiux-polish.md` và yêu cầu người dùng được chốt ở đó. Phần guard do reviewer sửa được ghi riêng, không gọi là độc lập review chính mình.

Fixed point là `baseline.json`, capturedAt **2026-10-19T03:42:06.118Z**, branch system-design, 2.853 file. Đã so hash hiện tại với từng entry, không dùng HEAD làm baseline. Cả mười file tồn tại ở baseline trong danh sách dưới đã đổi hash; `ReportDraftProvider.jsx` là file mới. Baseline chỉ giữ hash, không giữ nội dung cũ, nên không thể dựng chính xác hunk trước/sau hoặc gán thời điểm hồi quy cho mọi lỗi còn lại chỉ bằng manifest này.

Đọc toàn bộ module: App.jsx, AppEntry.jsx, MainLayout.jsx, global.css, app-shell.css, selection-table.css, ProjectOverview.jsx/project-overview.css, ReportDraftProvider.jsx, ManagementAnalysisPage.jsx, useDialogFocus.js; đọc seam Modal/ModalActivity và CaseIssueAction portal cùng test liên quan. AuthBoundary/context do tôi đã triển khai được dùng để trace integration, không trình bày như phần review độc lập của chính mình.

## Spec — finding và disposition

### ISR-01 — P2, tìm thấy rồi owner sửa: remount report khi phiên khóa làm mất draft

Source ban đầu: provider `read` trả null khi active=false, Workspace hydrate bằng useState chỉ lần mount đầu. Nếu người dùng đã giữ nháp, đổi màn, phiên expired/unavailable rồi browser Back/hash mở lại /analysis khi app vẫn bị khóa, editor mount với nội dung rỗng. Sau cùng chủ đăng nhập lại, persistence effect coi editor clean và remove entry; không khôi phục draft đã giữ. Đây là mất dữ liệu chưa lưu, không phải chỉ thiếu thông báo.

Đã gửi root/owner ngay khi thấy. Owner xác nhận RED expired/unavailable hai failure; sau đó thêm `DraftWorkspaceGate` ở `ManagementAnalysisPage.jsx:29`: project-keyed gate chờ provider active trước lần mount đầu, nhưng giữ nguyên workspace đã admitted qua reauth. Tôi đã đọc lại gate và bốn test mới ở `ManagementAnalysisPage.test.jsx:68,76`: new draft và saved draft, expired/unavailable, không đọc saved report lúc inactive, sau active phục hồi draft v3 và khóa Save nếu server v4.

Disposition: **source acceptance PASS + đọc receipt owner 39/39 PASS, 2 file**, `reports-draft-locked-remount-green.json`. Tôi không chạy lại test trong lượt READ-ONLY này và không xác nhận browser. Không mở cache read khi inactive, không bỏ revalidation và không remount editor đã admitted chỉ vì auth status đổi.

### ISR-02 — P2, tìm thấy rồi owner sửa: API401 khóa workspace sau cùng chủ reauth

Source lúc phát hiện: `ManagementAnalysisPage.jsx:52` gom401 và403 thành `setAccessDenied(true)`; nhánh restore saved report ở line78 cũng vậy. Dòng render khi accessDenied trả màn Không có quyền truy cập; không có reset hoặc retry khi cùng user authenticated trở lại. AppEntry/AuthBoundary chủ động giữ provider/workspace theo identity trong lần hết phiên. Các số dòng này chỉ bản trước sửa; source mới được mô tả ở disposition bên dưới.

Reproduction để owner viết test: mount PM/ADMIN hợp lệ, nhập draft; cho request summary/list/get hoặc save trả401 và đưa auth status sang expired; đăng nhập lại cùng identity/role/grant. **Expected:** phục hồi draft và có cách đọc/thử lại thao tác hợp lệ. **Actual theo source:** admitted Workspace giữ accessDenied=true, chỉ hiện Không có quyền truy cập, không có editor hoặc retry để phục hồi trong route. Nhánh403 cần tiếp tục che dữ liệu khi bị thu quyền; không sửa bằng cách bỏ kiểm quyền chung.

Mức độ P2 vì không tự ghi sai dữ liệu nhưng chặn tiếp tục làm việc và draft đang giữ không thể truy cập cho tới khi đổi route/remount. Đây là defect tìm thấy trong source; **không gán là hồi quy của lượt polish** vì không có nội dung baseline cũ để chứng minh. Test trước chỉ chứng minh403 revoked, chưa chứng minh401→reauth.

Owner đã sửa sau RED: `readError` phân biệt auth401 với forbidden403; reauth effect chỉ probe quyền bằng summary GET sau locked→active của cùng owner. Editor còn bị che cho tới khi probe thành công, rồi tải lại list và đối chiếu version saved report. Không tự phát lại save hoặc paid preview. Initial403/recovery403 tiếp tục deny; lỗi network có retry rõ ràng. Functional setter khi recovery thành công giữ forbidden nếu một request403 đồng thời đã deny. Tôi đã đọc lại source mới và các regression test, đồng thời đọc [reports-401-reauth-green.json](reports-401-reauth-green.json): **45/45 PASS, 2 file** ở receipt cuối. Có test giữ draft/version sau rejected update401, update chỉ được gọi một lần và concurrent403 không bị recovery200 xóa. Disposition: **source acceptance PASS + owner receipt**, không phải reviewer rerun/browser.

### ISR-R1 — P2, root xác nhận RED rồi sửa: focus sau khi bỏ draft bằng nested confirm

Source lúc phát hiện: `work-items/components.jsx:237` mở recursive Modal cho discard; nút Bỏ bản nháp gọi onClose của modal cha, unmount cả hai. Hook cleanup trước sửa chỉ restore nếu dialog là topmost và opener còn connected. Có đường parent cleanup thấy child topmost nên bỏ restore, child cleanup thấy opener là nút trong parent đã unmount nên cũng bỏ restore. Caller monkey tại `FeatureIssuesPage.jsx:54` chỉ setMonkey(false), không tự restore opener như CaseIssueAction.

Test đề nghị: focus/mở Ghi lỗi monkey → chọn Feature → nhập nội dung dirty → Escape → Bỏ bản nháp → assert trigger Ghi lỗi monkey nhận lại focus. Ban đầu đây là SOURCE_RISK, chưa count confirmed. Root sau đó tái hiện đúng bằng [monkey-discard-focus-red.json](monkey-discard-focus-red.json): **5 PASS / 1 FAIL**, failure đúng case trả focus về opener. Vì đã có RED, disposition nay là confirmed P2 được sửa; vẫn không gọi browser-confirmed.

Root đã sửa opener chain trong shared hook: entry giữ `{dialog,previous}`, parent cleanup chuyển opener của child về opener còn tồn tại trước khi remove parent. Tôi đã đọc lại source mới và receipt `nested-focus-green.json`26/26, `shared-dialog-final-green.json`28/28; regression cuối33/33 dưới đây tiếp tục bao gồm case này. Phần opener chain do root sửa; reviewer chỉ thêm guard picker sau đó theo ủy quyền riêng.

### ISR-03 — P2 confirmed by new mock test: Header dialog mở trên drawer nhận sai Tab/Escape

Viewport/mobile path: navigation drawer mở nhưng Header vẫn pointer-accessible. `app-shell.css` đặt Header z-index60, drawer55, backdrop51 bắt đầu ở y48; chỉ app-workspace bị inert, không phải Header. PM được cấp quyền có thể mở AccountMenu → Tạo tài khoản Tester trong Header. Dialog mới nằm ở DOM trước Sidebar. Shared hook chọn `visibleDialogs.at(-1)` theo DOM order, nên vẫn chọn Sidebar thay vì dialog vừa mở.

Expected: Tab ở trong dialog tài khoản nhìn thấy phía trên; Escape đóng dialog này trước. Actual **test mới xác nhận**: Tab focus nút Đóng menu của drawer phía sau; Escape để dialog tài khoản còn mounted. Test dùng MainLayout/Header/Sidebar/AccountMenu thật, chỉ mock Project/Auth context và không submit tài khoản. Không assert selector/order nội bộ làm expected result.

Root đã nhận receipt [shared-header-dialog-red.json](shared-header-dialog-red.json): **0 PASS / 2 FAIL**, 1 file, exit1. Lệnh RED từ Frontend:

```text
rtk proxy npm.cmd test -- src/app/layouts/MainLayout.dialog-order.test.jsx --reporter=json --outputFile=../var/uiux-polish-2026-10-19/shared-header-dialog-red.json
```

Source ban đầu: `MainLayout.jsx` render Header trước Sidebar và inert riêng workspace; `useDialogFocus.js` trong keydown lấy dialog cuối DOM; `AccountMenu.jsx` mở AdminFormDialog trong Header. Root đã đổi topmost keyboard theo thứ tự đăng ký/mở dialog đang connected và không hidden/inert. Tôi đã đọc lại source và [shared-dialog-final-green.json](shared-dialog-final-green.json) **28/28 PASS, 5 file**, gồm hai test Header mới. Disposition: **source acceptance PASS + root receipt**; BROWSER_NOT_RUN.

### ISR-04 — P2 confirmed RED rồi sửa guard theo ủy quyền: Escape trong picker đóng cả form bàn giao

Khi kiểm lại hook đổi sang open order, reviewer phát hiện `AdminProjectDropdown` là descendant role=dialog với handler Escape riêng nhưng không đăng ký modal trap. Hook mới chỉ xét registered stack, nên capture Escape trước React handler của picker rồi đóng outer DeviceAllocationDialog. Đây là regression source/test trong lần thay guard vừa được đọc; không chỉ dự đoán từ audit R12 cũ.

Root cho phép viết RED và sửa hook guard nhỏ sau xác nhận. Test mới `admin/nested-project-picker.test.jsx` dùng form bàn giao thật và API mock: nhập ghi chú, mở Tìm dự án, Escape. [shared-nested-picker-red.json](shared-nested-picker-red.json) **1 FAIL**, outer Bàn giao IP-08 bị unmount, chỉ còn opener. Expected: chỉ search đóng, outer dialog và ghi chú còn; Escape tiếp theo mới đóng parent và trả focus opener. Không submit API bàn giao.

Guard được thêm sau lựa chọn registered topmost: với Escape từ descendant dialog không đăng ký trap, yield cho handler của popup; không thay role picker, business rule, request hoặc Tab behavior. Root là người review cuối phần guard do reviewer tự sửa, nên không gọi phần này là independent source acceptance. [shared-picker-final-green.json](shared-picker-final-green.json) là **run mới của reviewer:33/33 PASS, 7 file, exit0**, bao gồm shared28, project-picker4 và nested picker1. Focused git diff --check exit0. Product đã freeze lại và báo root chạy full coverage với source này.

## Standards — phần không thấy lỗi blocking trong source đã đọc

- App navigate xét prefers-reduced-motion trước scroll; không thêm wheel interception hoặc trì hoãn mount/server result. Global reduce rule và local CSS làm giảm motion; token 140/200/240ms, control8/panel12 giữ compact typography và năm result colors.
- Shell không animate workspace cha chứa overlay fixed. Entrance chỉ header/disclosure/owned dialog; selection rows chỉ transition background, không dịch vị trí theo hàng. Không tìm thấy bằng chứng fixed overlay bị chứa trong transformed workspace mới từ các selector đã đọc.
- MainLayout skip link preventDefault, focus main mà không đổi hash; đổi pathname focus nội dung, đổi query giữ filter focus. Guard nhường focus cho modal. Existing tests dùng mock Header/Sidebar nên chưa đo drawer/portal, screen reader, scroll thực hoặc focus vùng nằm dưới fixed header.
- Overview vẫn giữ information/status/milestone blocks. Milestone scroll region có tabIndex và tên; count dùng chữ tối trên status background, số và label không chỉ màu. Không đổi result palette. Trạng thái lỗi đọc không bị chuyển thành zero.
- AppEntry đặt ReportDraftProvider trong identity-keyed AuthBoundary, ngoài RoleApp để giữ route/project drafts trong cùng phiên. Provider key theo owner, inactive write/remove guard đọc refs hiện tại, disposed owner có alive=false và clear memory; không local/sessionStorage. useLayoutEffect setup trước passive persistence giải quyết StrictMode effect replay trong test đã có. Không thấy cross-owner cache leak từ source đã đọc.
- Portal Modal host và CaseIssueAction preview lấy React visibility context, hidden/inert có CSS `[hidden]{display:none!important}`; shared hook dùng active=ready&&scopeVisible, nhả/reacquire body scroll lock. React context theo portal dù DOM ra body. Không dựa vào hidden ancestor DOM đã bị thoát. Không xóa children để che portal.

Media/viewport source pass đã rà thêm: sidebar 200px ở≤640 và collapsed60 chỉ trên desktop; document-focus main có min-height0 và grid scroll flex riêng; selection filters wrap, table children min-width0, touch controls44px; overview về một cột≤960 và milestone scroll235px có focusable region. Không có CSS-only regression rõ mới được chứng minh từ những rule này. Đây không phải geometry PASS: header dài, height thấp, iOS focus zoom, pinch zoom và lồng overlay vẫn cần browser. Lỗi ISR-03 là thứ tự focus giữa các lớp, không phải đề nghị đổi breakpoint hay typography.

Không có nhận xét “style preference” hoặc code smell mang tính blocking được thêm chỉ vì file compact/minified. Không có P0/P1 mới được xác nhận trong scope review này.

## Bằng chứng / cách chạy lại

Ngoài hai run RED và run33 GREEN vừa chạy theo ủy quyền, các số khác là **đọc receipt owner/root đã có**, không phải run mới của reviewer. Không cộng chồng các run có test trùng nhau, không suy coverage từ số PASS. Receipt cũ không chứng minh các source đổi sau thời điểm run đã được test.

Owner có thể chạy từ Frontend, không HTTP/DB (các test dùng API/module mock):

```text
rtk proxy npm.cmd test -- src/app/layouts/MainLayout.navigation.test.jsx src/app/layouts/MainLayout.dialog-order.test.jsx src/app/modules/ProjectOverview.layout.test.jsx src/app/modules/ProjectOverview.test.jsx src/app/modules/ProjectOverview.permissions.test.jsx src/app/hooks/useDialogFocus.test.jsx src/app/features/auth/auth.test.jsx src/app/features/work-items/modal-expand.test.jsx src/app/features/work-items/CaseIssueAction.test.jsx src/app/features/work-items/FeatureIssuesPage.test.jsx src/app/features/admin/project-picker.test.jsx src/app/features/admin/nested-project-picker.test.jsx src/app/features/reports/ReportDraftProvider.test.jsx src/app/features/reports/ManagementAnalysisPage.test.jsx
```

Các regression mới nêu trên đã được thêm cho ISR-02/03/R1/04 và nằm trong tập test của lệnh đề nghị trên. Reviewer chưa chạy gộp nguyên lệnh này; run mới được phép là shared33 đã ghi rõ. Browser các role, geometry 320/390/768/1440, zoom, reduced motion, keyboard/screen reader và real auth401 vẫn NOT_RUN bởi reviewer. Root giữ kiểm chứng browser và full suite/build cuối.

Review không cho phép đánh dấu toàn hệ thống hoàn hảo. Có **5 P2 vấn đề được xác nhận qua source/RED trong quá trình review và đã có implementation + targeted GREEN**: ISR-01/02/03/04/R1. Bốn phần do root/owner sửa đã được đọc lại độc lập; guard ISR-04 do reviewer sửa theo ủy quyền, chuyển root review cuối. Không còn confirmed defect OPEN trong đúng danh sách review này tại checkpoint freeze; các finding cũ của audit hệ thống và browser NOT_RUN vẫn giữ phạm vi riêng. CSS/Overview không có confirmed defect mới trong phần đọc này.

## Bảo toàn sau product freeze

Root đã review guard ISR-04 đạt. Được giao thêm kiểm tra bảo toàn, reviewer tạo `Verify-Preservation.cjs` và [receipt preservation-and-links.json](preservation-and-links.json), không sửa product/docs/status. Script dùng cùng phép liệt kê `git ls-files -co --exclude-standard` của baseline, đối chiếu hash từng file cũ, ghi changed/new/missing, protected Backend/config/package và ngoài UI/docs/evidence; kiểm git diff --check và local links trong review/planning/ledger. Không in nội dung file được hash hoặc credential. Baseline chỉ đọc, có ghi hash manifest trước/sau; self-report JSON không cố hash chính nó. Ignored build/node_modules/runtime không nằm trong snapshot; external links không fetch và anchor đích không kiểm. Các số mới nhất nằm trong receipt để không tạo vòng lặp tự hash khi ledger được cập nhật.
