# Admin entry / sidebar — source audit và sửa ngày 19/10/2026

## Phạm vi và thay đổi quyền sở hữu

Đã đọc đầy đủ attachment UTF-8 ngày19/10: lỗi được báo ở menu trái **ngay sau đăng nhập ADMIN tổng**, cùng yêu cầu consistency, hierarchy, feedback, simplicity và accessibility. Ban đầu được giao independent source review; sau root tái hiện hình học đã được giao triển khai riêng `AdminLayout.jsx`, `admin.css` và test mới. Không sửa MainLayout/Sidebar workspace/global CSS, backend, API, DB, environment hoặc dữ liệu. Root là người điều khiển browser; agent chỉ đọc source, chạy mock/component test và xem capture root đã lưu.

Baseline mới3374 file do root giữ tại `baseline.json`; không dùng HEAD để suy thay đổi hoặc hồi quy. Tất cả dirty cũ được giữ. Các kết quả PASS từ lượt polish trước không được dùng thay cho kiểm tra mới.

## Root cause đã xác định

### AE-01 — sidebar Admin chỉ cao theo nội dung, không cao theo vùng làm việc

Caller thật: `main.jsx` → `AppEntry` → `AuthenticatedShell/AuthBoundary` → `RoleApp` → `AdminApp` → `AdminLayout`. ADMIN chưa opt-in workspace được đưa về `#/admin`, không mount ProjectProvider; đây là route đúng. `AdminLayout` dùng `.admin-sidebar` riêng, không phải workspace `.app-sidebar` có collapse/drawer trước đó.

CSS trước sửa đặt shell `min-height:100dvh`, grid rows `auto 1fr`; aside có `align-self:start`, chỉ có `max-height:100dvh`, không có height/min-height lấp đầy track. Vì vậy sidebar co theo six links + footer, còn main kéo dài theo toàn bộ dashboard; footer margin-top:auto không có không gian để đẩy xuống đáy viewport. Không phải lỗi dữ liệu tài khoản hoặc quyền.

Root đã tái hiện sau login thật trong [admin-entry-before.json](admin-entry-before.json) và [ảnh trước sửa](admin-entry-before.jpg): viewport1381×862; header77.067px; aside bắt đầu77.067, cao388px, kết thúc465.067; main cao3289.533px. Agent đã đọc capture này, không tự chạy browser.

### AE-02 — thiếu trạng thái điều hướng Admin, coverage trước chỉ kiểm workspace

AdminLayout trước không có collapse hoặc mobile toggle/drawer. Ở≤768, CSS đổi grid còn một cột nhưng giữ explicit rows `auto 1fr`; header/aside/main có ba grid children, main trở thành implicit row. Source có nguy cơ khoảng trống ở loading/empty layout, cùng menu ngang cuộn để tới link cuối. Đường hình học mobile cũ chưa được agent đo browser, nên không gọi khoảng trống này là browser-confirmed.

Các test cũ RoleApp/Admin kiểm hash/heading/permission, một số mock App workspace; unit jsdom không tính grid track/height. Test drawer/collapsed trước dùng MainLayout/Sidebar, không bao phủ AdminLayout. Vì vậy suite PASS cũ không chứng minh sidebar landing đã đúng.

## Điều đã sửa

- Shell Admin là grid cao100dvh, rows `auto minmax(0,1fr)`, vùng header/sidebar/main được đặt tên. Header tự cao theo nội dung wrap; không hardcode77px. Sidebar chiếm toàn track còn lại, nav `flex:1;min-height:0;overflow-y:auto`, controls/footer flex-none; main `min-height:0;overflow:auto` để nội dung dài không kéo toàn document.
- Desktop có **Thu gọn menu quản trị / Mở rộng menu quản trị**; rail64px giữ đủ six destinations, tên truy cập, tooltip và aria-current. Không đổi permission hoặc route của từng link.
- ≤768 có **Mở menu quản trị**, drawer toàn viewport với tên Menu quản trị, giữ đủ six links. Close control luôn có chỗ riêng; nav cuộn khi height thấp; footer ở đáy. Escape, backdrop và link đều đóng; trả focus opener. Header và main inert trong khi drawer mở. Drawer không dùng header-height cố định nên không lệch khi header wrap.
- Resize từ mobile đang mở sang desktop bỏ modal/inert và focus desktop toggle. Trạng thái collapse desktop được giữ độc lập với mobile drawer.
- Main reset scrollTop và nhận focus khi **pathname** đổi. Query/project-filter rerender cùng path giữ focus và vị trí cuộn. Khi route mới có modal đang mở, không giành focus của modal. Skip link giữ nguyên hash.
- Dialog editor vẫn giữ nguyên component, full-viewport fixed overlay và focus hook; shell/main không transform. Một test mới bảo vệ editor Escape/focus return. Thử geometry/wheel/PageDown với dialog thật vẫn do root làm; không suy document.body lock là đã khóa scroll pane độc lập.

Không đổi năm màu kết quả, typography compact, dữ liệu KPI, input/payload, thao tác lưu hoặc account authority. Reports owner được giao dirty-close cho các form khác; họ xác nhận không sửa AdminLayout/admin.css. Agent này không đụng các form họ đang sở hữu.

## Route-dependent CSS / collision trace

Đã đọc toàn bộ caller AdminApp/AdminLayout/AdminDashboard, main/AppEntry/App/AppRouter, AuthBoundary, Sidebar/MainLayout và CSS admin/app-shell/global. Script [Trace-Admin-Entry.cjs](Trace-Admin-Entry.cjs) đọc static relative import graph bằng Babel và source CSS bằng PostCSS; JSDOM chỉ khớp selector trên markup Admin tĩnh, không render module hay gọi API.

- [Trace trước sửa](admin-entry-source.json):126 modules,23 stylesheet; các source rule có thể match sidebar/nav/link/icon/footer chỉ đến từ admin.css và global.css.
- [Trace sau sửa](admin-entry-source-after.json): cùng126 modules/23 stylesheet; rule nguồn vẫn chỉ admin.css/global.css. Hash các caller/CSS được lưu cho từng snapshot.
- App và AdminApp đều được import tĩnh từ AppEntry. Chuyển route không đồng nghĩa stylesheet workspace chưa được tải. Tuy nhiên chưa tìm thấy selector route khác override layout `.admin-sidebar` ở source đã trace; root cause ở grid/height cục bộ. Không sửa bằng tăng z-index hoặc thêm rule thắng cascade từ feature khác.
- Trace không expand generated Tailwind/preflight, không tính computed cascade/media/geometry hoặc pseudo-class. Đây không phải xác nhận “không có mọi CSS collision ở mọi route”.

Một gap workspace riêng đã báo root: specificity `.app-shell button:focus-visible` thắng `.app-nav-item:focus-visible`, tạo teal outline trên teal ở inactive item; submenu active có rule white outline trên nền pale. Root giữ CSS workspace và đã có capture [inactive trước](workspace-inactive-focus-before.json)/[inactive sau](workspace-inactive-focus-after.json); agent không sửa các selector đó.

## State và bằng chứng mới

| State / control | Source / component proof | Browser |
| --- | --- | --- |
| Admin mặc định sau login, explicit workspace opt-in, direct deny nonadmin | RoleApp/AdminApp caller và existing routing tests giữ nguyên | Root có fresh login RED; agent không login |
| Desktop expanded/collapsed, six named links, active page | Test mới toggle/aria-expanded/links/aria-current | Root kiểm rail/label/rect |
| Mobile closed/open, six links, named modal, inert background | Test mới role/hidden/inert/trap/shift-Tab | Root kiểm320/390/768 và screenshot |
| Escape/backdrop/link close + focus return | Test mới cả ba đường | Root kiểm pointer/touch |
| Resize opened drawer→desktop | Test mới không còn dialog/inert, focus desktop control | Root kiểm actual media transition |
| Path navigation vs query/project filter | Test mới scrollTop/focus reset hoặc retain | Root kiểm pane scroll thật |
| Main dài + editor overlay | Existing focus hook + test mới editor open/type/Escape/opener | Geometry/scroll chain chưa tự đo |
| Loading/error/empty/dashboard dài/username dài | Source bounded grid; existing read states giữ nguyên | Cần root kiểm async/short height/long text |

RED trước product fix: lệnh tại Frontend:

```text
rtk proxy npm.cmd test -- src/app/features/admin/AdminLayout.navigation.test.jsx --reporter=json --outputFile=../var/uiux-admin-entry-2026-10-19/admin-layout-red.json
```

[RED receipt](admin-layout-red.json): **7 tests,1 PASS/6 FAIL**, exit1. Fail đúng collapse, mobile drawer/dismiss/resize và path main focus/reset; subdialog behavior hiện có PASS. Không viết test khẳng định CSS pixels.

Sau sửa: [admin-layout-green.json](admin-layout-green.json) **7/7 PASS**, exit0. Regression mới:

```text
rtk proxy npm.cmd test -- src/app/features/admin src/app/features/auth src/app/features/projects --reporter=json --outputFile=../var/uiux-admin-entry-2026-10-19/admin-layout-regression.json
```

[Regression receipt](admin-layout-regression.json): **194/194 PASS,30 file**, exit0. Run này trước các sửa dirty-close form đang được reports owner thực hiện; root cần full suite cuối trên source freeze chung. Focused `rtk git diff --check -- Frontend/src/app/features/admin/AdminLayout.jsx Frontend/src/app/features/admin/admin.css Frontend/src/app/features/admin/AdminLayout.navigation.test.jsx`: exit0. Coverage NOT_MEASURED ở agent này; không build/backend test/API.

## Skill → công việc → chứng cứ

| Skill | Áp dụng | Chứng cứ và giới hạn |
| --- | --- | --- |
| systematic-debugging | Trace đúng landing route, tách hai layout, xét local grid thay vì đoán CSS bleed; đối chiếu working workspace; RED trước behavior fix | Import/selector snapshots, root browser RED,6 behavioral failures, source grid explanation |
| frontend-ui-engineering | Bounded responsive layout, independent scroll, nav hierarchy, named icon rail, modal drawer/inert/focus, query-focus preservation | Seven new behavior tests và CSS source; viewport/AT không giả nhận từ jsdom |
| TDD workflow đã đọc trong cùng phiên | Chỉ thêm behavioral tests cần bảo vệ, giữ RED receipt rồi GREEN/regression | RED1/6→GREEN7, regression194; không suy coverage từ test count |

Checkpoint AdminLayout/admin.css đã freeze để root kiểm browser. Không gọi toàn hệ thống UI/UX PASS; geometry GREEN, short-height, zoom, reduced motion, exact scroll behavior của subdialog và role/browser matrix phải được root ghi bằng chứng riêng.
