# Rà source CSS và controls — Testing / Issue / Project

Ngày19/10/2026, nhánh `system-design`. Đọc đầy đủ attachment UTF-8 `596c2d39-3955-4dc2-b707-228524050552/Pasted text.txt`: người dùng báo lỗi nặng menu trái ngay sau login Admin và yêu cầu rà chi tiết toàn hệ thống, nhất quán/hierarchy/feedback/tối giản/accessibility. Root sở hữu shared/nav/Chrome. **Checkpoint đầu: SOURCE_REVIEW / BROWSER_NOT_RUN / TESTS_NOT_RUN**, chỉ ghi ledger, chưa sửa sản phẩm. Sau findings root ủy quyền sửa ba điểm giới hạn; xem delta triển khai cuối tài liệu. Không API/DB/backend/env/process/cài dependency/commit/push; không sửa shared. Không nhận screenshot/test cũ thành phép kiểm mới.

Skills được đọc/đối chiếu: `frontend-ui-engineering` cho CSS ownership, layout/label/hidden/focus/overflow; `frontend-patterns` cho state và feedback/async/URL. Dùng hệ thống TMS đã chốt, không chọn palette/font/layout marketing mới. Truy caller/route và các ledger audit/polish trước để phân biệt regression mới với phần còn mở. Các khuyến nghị bên dưới chưa phải thay đổi đã triển khai.

## Kết luận ưu tiên gửi root

**Chưa tìm thấy selector Testing/Issue/Project gây trực tiếp sidebar Admin hỏng.** Tất cả21 file CSS dưới `Frontend/src/app/features` được parse bằng PostCSS đã cài; không có bare `nav/aside/ul/li/button` rule tác động mọi navigation. Namespace Testing/Issue không target `.admin-sidebar`/`.admin-nav-*`. Đây là kết luận source trong phạm vi kiểm, không bác bỏ lỗi người dùng hoặc thay thế browser của root.

Các selector generic trong `projects.css` là coupling có thật nhưng chưa chứng minh nguyên nhân sidebar: `.page-container`, `.form-group`, `.btn*`, `.tabs/.tab-btn`, `.data-table`, `.message*`, `.text-danger`, `.archived-row`, `.dialog-*`. Nhiều consumer hiện tại dùng chúng có chủ đích; chỉ vì generic không tự là defect. Không đề nghị xóa hoặc namespace hàng loạt khi chưa đối chiếu caller.

Ba điểm cụ thể đáng xác minh tiếp: source ID của grid không sticky dù phải cuộn tới Status; read-only cell thiếu ngắt chuỗi dài; retry lỗi archive/hide không phục hồi đúng thông báo thao tác. Các risk đã tồn tại (route draft exit, pagination shrink, conflict comparison) được giữ riêng, không báo là lỗi mới do polish.

## Finding cụ thể

### TI-ENTRY-01 — P2 đề xuất — Cuộn tới Status/Issue làm mất identity case

- **Entry/actor:** `/board/testing/features/F/documents/D`, manager/Tester/DEV có quyền đọc; file nhiều cột, mobile hoặc viewport nhỏ.
- **Source đã xác nhận:** `TestingDocumentPage.jsx:61-76` sinh tất cả th/td mà không gắn `.td-sticky-id` cho cột source ID. Trong khi `testing.css:1` đặt grid min-width90rem; `test-documents.css:69-72` đã định nghĩa sticky ID nhưng caller active không dùng. Old `TestDocumentPage` còn gắn class, nhưng route cũ không phải bằng chứng current grid đúng.
- **Tái hiện cần root:** mở file nhiều cột, ghi nhớ case đầu, kéo ngang tới Status/Issue. Kiểm còn nhìn ID của cùng hàng khi đọc/sửa Status hoặc bấm Issue không. So sánh row dài/chia trang, không submit để kiểm geometry.
- **Expected:** thao tác cuối hàng vẫn xác định được source ID bằng sticky column hoặc cơ chế tương đương rõ ràng. **Actual static:** không có cơ chế sticky ở current DOM; khi cột source đi khỏi scrollport không có identity thay thế trong ResultCycleButton visual text (accessible label có ID, không thay visual context).
- **Phân loại:** confirmed missing class/caller hook; tác động cụ thể trên Chrome **NOT_RUN**. Không gọi bảng rộng/cuộn ngang tự nó là lỗi.
- **Remedy/AC:** gắn đúng source-ID column theo `columns.sourceId`, không giả định index0; header/cell background/z-index đúng; ID vẫn visible khi cuộn tới Status và không che content/preview, keyboard focus rõ, 390/768/1440, reordered columns.

### TI-ENTRY-02 — P2 đề xuất — Read-only grid không wrap long token như manager

- **Source:** `TestingDocumentPage.jsx:68` manager dùng `.testing-case-text`, nonmanager/blocked dùng `<span>` thường. `testing.css:20` wrap-anywhere chỉ cho `.testing-case-text`; base `testing.css:1` td chỉ min/max width và white-space:pre-wrap. `test-documents.css` có `.td-cell-text` wrap-anywhere nhưng span hiện tại không có class đó.
- **Tái hiện cần fixture:** case title/steps có URL hoặc token200 ký tự không có space; so manager và DEV/Tester read-only, thêm lúc export/loading khiến manager chuyển span. Quan sát text có đè ô khác hoặc làm table width tăng bất thường không.
- **Expected/actual:** cùng dữ liệu giữ khả năng đọc và containment ở mọi capability; source hiện chỉ manager editor button có emergency line break. CSS mechanism xác nhận, rendered overflow chưa đo.
- **Remedy/AC:** shared text class/wrap rule ở đúng content cell/span, không cắt dữ liệu và không áp lên Status/ID control không cần thiết. Long token/newline/Unicode/URL manager/read-only/temporary blocked tương đương; giữ chủ đích table scroll.

### TI-ENTRY-03 — P2/P3 theo tác động — “Thử lại” không xử lý lỗi thao tác archive/hide đang hiển thị

- **Source:** `TestingFeaturesPage.jsx:20-25` mutation `error` riêng, `toggle()` xóa error khi mutation mới bắt đầu; alert lấy `error||query.error`, nút Thử lại chỉ `query.load`. `TestingFeaturePage.jsx:17-23` có cấu trúc tương tự cho hide file. `testingState.js:6-9` chỉ xóa query.error, không chạm mutation error của caller.
- **Tái hiện bằng mock cần viết khi sửa:** archive/hide reject → alert → Thử lại → list read thành công. Lỗi thao tác cũ vẫn hiện, request archive/hide không retry, không có giải thích nút chỉ tải list. Không cần DB thật để chứng minh.
- **Expected:** recovery action gọi rõ đúng bước và thông báo phản ánh kết quả mới. **Actual static:** mutation error được ưu tiên vô thời hạn tới mutation khác; successful list reload không thể giải quyết alert đang hiện.
- **Remedy/AC:** tách “Tải lại danh sách” khỏi retry action; cho xem kết quả hiện hành và retry có chủ đích với version/request identity phù hợp. Không tự replay uncertain mutation chỉ để nút có phản hồi. Test read-error, write-error, refresh-success, write-retry-success, version conflict và doubleclick.

### TI-ENTRY-04 — Nợ kỹ thuật có căn cứ, chưa xếp lỗi sidebar — CSS generic từ Projects tải toàn app

- `ProjectSettingsPage.jsx:7-12` import Admin CSS và `projects.css`; router import tĩnh Settings và các module khác, nên stylesheet không biến mất khi đổi route. `projects.css:159-285` khai báo `.form-group/.btn/.page-container/.tabs/.tab-btn/.data-table/.message/.archived-row` toàn cục.
- Caller active ngoài Settings có `.page-container`: ProjectOverview, Analysis states, retired/deny adapters; `.btn-primary` của adapters chỉ có nền/màu chứ không tự nhận padding/radius của `.btn` nếu caller không gắn cả hai (`AppRouter.jsx:29`, `RetiredAiEntry.jsx:12`). Đây là inconsistency có source evidence; kích thước/feedback browser chưa đo.
- Không thấy generic này match Admin sidebar DOM theo source; không nói “Projects CSS gây sidebar” khi chưa có matching selector/computed style.
- Khi sửa: lập mapping shared primitive hoặc namespace từng family/caller, giữ intended styles cho mọi consumer; không prefix toàn file rồi làm mất adapter buttons, General/Handbook/ProjectMembers. Test flow/semantics phù hợp và root browser computed regression. Không cần test chỉ assert literal CSS.

## Các trạng thái còn mở đã đối chiếu lại

Các hàng này đã có trong ledger audit/polish, không được nhân thành lỗi mới hoặc nhận đã sửa chỉ từ số test PASS cũ.

| Nhóm | Source/current state | Expected/kiểm tiếp |
| --- | --- | --- |
| Issue draft route exit | `FeatureIssueDetail`/form local state; Modal requestClose guard nhưng source anchor/sidebar/hash/back/refresh không dùng cùng guard | Note/status/edit draft có thể bị unmount khi rời route; policy retain/explicit discard cần riêng. Không restore bằng localStorage tùy tiện. |
| Feature/file last page | Page state không clamp khi archive/hide làm totalPages giảm; pagination hiển thị page+1 trực tiếp | Mock2pages→remove sole last item→query1page; cần về trang hợp lệ hoặc explain recovery. Document grid đã dùng currentPage clamp, không quy chung. |
| Assignment409 | Reload lấy latest.version nhưng không hiển thị latest.items để so; selected ranges vẫn original rows | Display comparison trước explicit resave; giữ server scope/overlap/version. |
| Assignment empty directory | Members=[] không có specific no-eligible-Tester copy; only Chọn Tester + disabled Save | Feedback rõ lý do, không cấp/thêm member trái centralized workflow. |
| Assignment-history name retry | Name directory failure có fallback ID nhưng không có retry tên riêng nếu history read vẫn thành công | P3 recovery improvement, không mất history. Không gộp với history API failure đã có retry. |
| Missing valid caseId | Syntactically valid ID không có trong rows: không highlight/focus và không giải thích | Cho thông báo rõ, không remap theo ordinal/tên khác. |
| Saved vs refresh failure | `useTestingQuery.load` nuốt read reject thành state, caller await vẫn resolve và có thể close sau saved write | Nói đã lưu nhưng list chưa tải lại, không gọi rollback/mất dữ liệu. |
| Per-row Issue reads | Mỗi badge GET list khi mount;100 mounted rows có thể100 reads | Performance source-risk, không claim production latency; batch API ngoài frontend scope. |
| File hide discoverability | Soft hide tức thì, không archive-file list/restore UI tương ứng | Giữ dữ liệu server, cần UX recoverability policy; không gọi hard delete. |
| Rules legacy | `RulesPanel` vẫn required build/environment/device và publish hứa áp dụng Bug mới | UX-011 còn contract work; không bỏ field frontend làm422, không khôi phục run/device gate. |

## Kiểm kê CSS toàn features

Parse bằng PostCSS dependency có sẵn, không cài/chạy detector khác. Selector scan loại keyframes khỏi bare-element classification. Đã xét display/visibility/pointer-events/outline/position và namespace. Không dùng số rule như coverage UI.

| CSS file | Phân loại/điểm nối được kiểm |
| --- | --- |
| `admin/admin.css` | `.admin-*`/`.admin-shell` namespace; sidebar/nav root+Admin reviewer sở hữu. Không sửa/certify từ reviewer này. |
| `admin/status-reports.css` | `.sr-*` namespace retained history; không có bare nav rule. |
| `auth/auth.css` | `.auth-*`/`.account-*`; responsive hidden account name không ẩn trigger accessible label. |
| `ai/ai.css` | `.ai-*` và explicit header launcher selectors; hidden launcher có override, nonmodal dialog không tự là modal trap. Root/AI owner kiểm chi tiết. |
| `file-work/file-work.css` | `.fw-*`; retained route không coi active CRUD. Wide table scroll là chủ đích. |
| `integrations/redmine.css` | `.rm-*` namespace; không có generic Admin nav target. |
| `projects/projects.css` | Generic shared families nói tại TI-ENTRY-04; project selector desktop/mobile và General/Handbook/ProjectMembers caller đã đọc. |
| `projects/project-information.css` | `.project-information` ancestor; text/links wrap, table padding responsive, không nav leakage. |
| `projects/project-notes.css` | `.project-note*`/`.project-notes*`; comparison text có max-height/overflow và focus target, not global textarea. |
| `reports/management-analysis.css` | `.management-*` namespace, metric bar overflow clip có chủ đích; no nav leakage. |
| `reports/reports.css` | `.rp-*` namespace retained widgets; result styles không tự đổi palette. |
| `retest/retest.css` | `.rt-*` namespace retained, không restore active old workflow. |
| `test-cases/excel-import.css` | `.xl-*` import family; actual active import caller dùng shared rules. |
| `test-cases/test-cases.css` | `.tc-*` modal/form; tab transition property-list, no bare navigation rule. |
| `test-cases/test-documents.css` | `.td-*` family reused current/legacy; sticky-ID/content-wrap hooks thiếu ở current caller (TI-ENTRY-01/02). Search outline:none được bù focus-within tại wrapper. |
| `test-execution/execution.css` | `.ex-*`; retained execution+common modal styles được current document tái dùng; không bare nav. |
| `testing/testing.css` | `.testing-*` hoặc `.testing-page` ancestor; labels/fields/loading/grid/read-only; min90rem không tự là lỗi. |
| `work-items/feature-issues.css` | `.feature-*`/`.case-issue-*`; latest filter minwidth/fullwidth, stronger field specificity, source nav and hidden guard. |
| `work-items/work-item-modal.css` | `.wi-modal-host` ancestor; body portal independently scoped, hidden explicit; fixed backdrop/bounded body không dựa old work-items ancestor. |
| `work-items/work-items-live.css` | `.wi-*` global family intentionally reused; old modal rules require `.work-items`. Equal-specificity field cascade đã có fix tại new Feature form; không nhắm Admin sidebar. |
| `work-items/work-items.css` | `.work-items` ancestor cho mọi layout; old mock controls/overflow styles không áp current Issue portal. Không coi362 rules là362 active controls. |

## Controls / label / hidden / feedback checklist theo active caller

| Group | Đã đọc source và trạng thái | Kết luận/giới hạn |
| --- | --- | --- |
| Feature list/file list | Search visible label, archive checkbox, create/edit/archive/restore/import/hide/open, page, error/loading/empty, active vs archived project | Role archive guard hiện có; last-page/retry message gaps riêng bên trên. Không bấm archive/hide. |
| Feature form | Required/max lengths, busy close, expectedVersion compare/blocked/create boundary | Current comparison giữ draft; idle dirty close còn mở; no new product regression established. |
| Import | Native file label, single/batch/partial/error/replace/retry, preview exact ID and confirm/finish/template | Source contract fix còn; actual upload/keyboard/viewport chưa chạy. |
| Document | Search/Status/page/page-size/export/source file/reload, cell edit/case dialog, self/manager assignment, histories | All actions accessible labels theo source; grid identity/wrap risks bên trên. Loading/read-only changes layout span vs button cần browser. |
| Case Issue preview | aria-controls/expanded, keyboard path, hidden/inert portal/auth visibility, error retry through trigger, create/page/open | Current guards vẫn có; không suy browser PASS từ source. Long read/scroll/touch chưa chạy. |
| Issue create/detail/monkey | Bug/QA field label, source context, locked picker, pending/dirty discard, priority/source links, status/comment/edit/history/delete | Modal lifecycle current; route exit risk còn. Không source-ID/priority data loss claim. |
| Project selector | Trigger/title/current item, list/create link, read error/retry, blur/Escape, native page selection | Shared header placement root kiểm; menu mobile fixed, minwidth200 vs tiny viewport cần runtime. Generic selector không chứng minh sidebar cause. |
| General/Note/Handbook/Rules/members/devices | Field labels, readonly/archived, update/save/conflict/error/retry, version/handover centralized links | Latest Note compare/Handbook focus logic có; Rules legacy còn; no live submit/account/device changes. |
| Auth hidden subtree | Portal host context+hidden/inert, CSS explicit [hidden], useDialogFocus active scope | Không thấy current Testing/Issue portal tự escape lock lại. Cần actual reauth root nếu nghi regression. |

## Phép kiểm và handoff

Đã chạy read-only `rtk rg`, Node/fs đọc source UTF-8 và PostCSS parse21 feature stylesheets. **Không chạy test suite/browser/build/coverage mới**, không thêm test để assert một CSS literal. Không dùng kết quả full coverage/polish trước làm kết quả lượt này.

Đề nghị root ưu tiên nguyên nhân sidebar từ actual matching selectors/DOM/computed layout ở login entry; reviewer này không có evidence gán cho CSS Feature. Sau đó kiểm scroll-right identity, read-only long token và mocking retry archive/hide. Mỗi behavioral fix cần RED đúng public seam trước sửa, CSS layout cần computed geometry/browser regression trên current active ancestry; không patch blanket global minwidth/overflow:hidden để che lỗi. Khi có ảnh/measurement, ghi rõ SOURCE_CONFIRMED mechanism so với BROWSER_CONFIRMED effect.

## Delta triển khai được root ủy quyền sau findings

Root yêu cầu sửa đúng TI-ENTRY-01/02/03; không generic CSS refactor, không shared hook/navigation. Các finding/source statements phía trên mô tả trước sửa, không xóa lịch sử RED.

### Thay đổi có giới hạn

1. `TestingFeaturesPage.jsx` / `TestingFeaturePage.jsx`: alert recovery đổi từ “Thử lại” sang **Tải lại danh sách**, xóa mutation error cũ khi người dùng bắt đầu read lại. Nếu lỗi từ archive/restore/hide, copy nói rõ chỉ đọc danh sách, **không tự gửi lại thao tác**; người dùng kiểm trạng thái rồi chọn action lần nữa nếu cần. Recovery/Làm mới dùng cùng read-only path và disabled khi loading/busy. Không tự phát lại command hoặc thay requestKey/version của mutation.
2. `TestingDocumentPage.jsx`: cột source ID theo `columns.sourceId` có header sticky và body `<th scope="row">` sticky, giữ button mở case. Không giả source index0. Nội dung read-only/blocked dùng `.td-cell-text` đã có để wrap-anywhere/pre-wrap giống manager text; không cắt dữ liệu hoặc đổi nội dung.
3. `testing.css`: body row header được scope lại top:auto/z-index1/padding/background để chỉ sticky ngang, không vô tình nhận top:0 của global table-heading rule. Zebra/hover hiện hữu giữ nguyên; header cột ID vẫn sticky ở giao điểm. Không đổi bảng màu, vòng Status, permissions hoặc table minwidth.

### RED → GREEN và regression mới

`TestingListRecovery.test.jsx` mới có bốn hành vi: read fail/reload thành công cho cả Feature/file; mutation fail→explicit read recovery thành công, stale alert biến mất và mutation vẫn chỉ gọi một lần. `TestingDocumentPage.test.jsx` thêm DOM fixture reordered source index1, exact source ID rowheader và read-only long text giữ nguyên. Không test chỉ assert một literal CSS; actual sticky/overflow pixels dành cho root Chrome.

```text
rtk proxy npm test -- src/app/features/testing/TestingListRecovery.test.jsx src/app/features/testing/TestingDocumentPage.test.jsx --maxWorkers=1 --reporter=dot --reporter=json --outputFile=../var/uiux-admin-entry-2026-10-19/testing-recovery-grid-red.json
```

**RED5 FAIL/6 PASS,2files,exit1**,6.23s. Bốn recovery fail vì không có explicit read action/helper, DOM fail vì không có rowheader. [RED receipt](testing-recovery-grid-red.json). Đây là failure hành vi/semantics đúng yêu cầu, không phải import/syntax error.

Cùng command sau sửa, output `testing-recovery-grid-green.json`: **11/11 PASS,2files,exit0**,5.71s. [GREEN receipt](testing-recovery-grid-green.json).

Regression toàn nhóm hiện tại:

```text
rtk proxy npm test -- src/app/features/testing --maxWorkers=1 --reporter=dot --reporter=json --outputFile=../var/uiux-admin-entry-2026-10-19/testing-final-regression.json
```

**26/26 PASS,8files,exit0**,16.40s. [Regression receipt](testing-final-regression.json). Không cộng11+26 vì overlap. `rtk git diff --check -- Frontend/src/app/features/testing`: exit0. Coverage mới **NOT_MEASURED**, build/full frontend/browser **NOT_RUN bởi reviewer này**. Kết quả26PASS không chứng minh sidebar Admin hoặc mọi UI đã đạt.

### Fixture chính xác và browser acceptance gửi root

- DOM fixture: project1/Feature2/document9 `Reordered.xlsx`, headers`['Nội dung','ID','Steps']`, `columns.sourceId=1`, rowId101, sourceID`TC-Đăng nhập`; cell0=`https://example.test/` + `LongToken` lặp40 (URL381 ký tự), cell2=`Bước 1\nBước 2`; canManagefalse/canUpdateResultfalse. Assert rowheader/button đúng source ID, long-text cell giữ nguyên và Status readonly. Đây là dữ liệu trong mock, không đã nhập DB.
- Root Chrome: file hiện có nhiều cột ở390/768/1440, cuộn ngang tới Status/Issue; ID vẫn visible, header không chồng dòng, zebra/hover/focus còn rõ. Case source column reordered phải đúng. Không submit Status chỉ để kiểm geometry.
- Read-only Tester/DEV và manager trong pending/export state: token không space/URL dài/newline/Unicode đọc đủ, không vẽ đè ô kế; bảng vẫn cuộn theo thiết kế. Nếu fixture thật không có token này, cần harness/fixture được phép, không gọi mock DOM là paint PASS.
- Recovery chỉ mô phỏng write/read failures trong mock; root có thể đọc copy/disabled qua fixture/harness. Không gây archive/hide thật để test giao diện. Kiểm command không replay khi bấm recovery, sau fresh read vẫn cho người dùng chọn original action rõ ràng.

Ba mục **FIXED_SOURCE_MOCK / PENDING_ROOT_BROWSER**. Generic Projects CSS nợ kỹ thuật và các remaining khác vẫn giữ mở như trên. Owned source freeze sau regression26PASS; root giữ quyền sửa shared/nav và xác nhận geometry.

## Delta layout theo phát hiện Chrome của root

Root đã kiểm sticky/read-only trên Chrome, không phải reviewer mở browser: `tester-grid-sticky-after.jpg/json` ghi scrollLeft979.2 (max979), ID1 vẫn x16 thẳng vùng grid; read-only computed overflow-wrap:anywhere. Đây là browser proof của cơ chế sticky/wrap trên fixture hiện có; không thay việc test một token381 ký tự thật khi fixture không có nội dung ấy.

Root tìm thêm lỗi active document viewport bằng actual layout1080×675: section.testing-document y92.8,height757, kết thúc850.3; grid y395.4,height438.9,kết thúc834.3 ngoài viewport675. [Before geometry](grid-height-before.json). User trước đó yêu cầu chỉ bảng cuộn dọc. Shared MainLayout document-focus CSS chỉ nhận direct `.td-document` cũ; active section dùng `.testing-document`, nên không vào flex-viewport contract. `testing.css` còn max-height65vh cho grid, độc lập chiều cao toolbar. Đây là cause source + actual browser effect, không phải phỏng đoán từ maxwidth.

Root sửa shared app-shell selectors để nhận active `.testing-document` đúng tên, không thêm class legacy vào component. Reviewer được ủy quyền sửa riêng `testing.css` và toolbar markup:

- `.document-focus .testing-document`: flex column/min-height0/height auto; non-grid children flex-shrink0; grid flex1/min-height0/heightauto/max-heightnone để dùng đúng phần workspace còn lại.
- Toolbar thành một hàng cuộn ngang, groups không shrink/wrap, filter bỏ margin dọc, progress/filter padding8px, paginator inline. Không ẩn nút quan trọng hoặc thêm một vùng cuộn dọc của toolbar.
- Toolbar là named focusable region **Điều khiển bảng case**, có tabindex0 để keyboard có thể cuộn ngang. Không gán roletoolbar nếu chưa triển khai roving/arrow key contract.

Source freeze mới sau các thay đổi này; `git diff --check` scope Testing exit0. Không thêm decorative CSS-value test. Regression26PASS phía trên chạy trước delta layout/semantic region này; không gọi nó là test mới của flex geometry. Root sẽ kiểm lại675 và viewport thấp/nhỏ trước full integration. **PENDING_ROOT_BROWSER** cho layout mới; chưa claim toàn bộ page/controls đã đạt hoặc lỗi viewport rất ngắn đã giải quyết.

### Kiểm lại viewport thấp và fallback có chủ đích

Root báo geometry mới **GREEN tại1080×675 và390×844**, nhưng568×320 chỉ còn grid18.4px, không đọc được. Observation landscape thất bại phải giữ làm before (root quản lý tên receipt `grid-landscape-after.json`/rename before), không gọi đây là PASS nhờ grid không tràn viewport.

Theo ủy quyền mới, Testing CSS thêm duy nhất fallback `@media(max-height:500px)` cho active grid: `flex:none;min-height:240px;height:60dvh;max-height:none`. Root bổ sung cùng breakpoint tại app-shell: main overflow-y:auto/overscroll-behavior:contain, direct.testing-document flex0 0auto/minheight0/heightauto. Không dùng :has hoặc gắn class legacy. Essential toolbar vẫn là vùng cuộn ngang có label/focus; không ẩn action để ép màn ngắn.

Ở chiều cao bình thường, layout vẫn dùng phần workspace còn lại và chỉ grid cuộn dọc. Ở viewport≤500px, chủ ý cho main cuộn dọc để giữ một vùng grid tối thiểu240px có thể đọc; grid tiếp tục có scrollport riêng. Đây là ngoại lệ responsive cần thiết khi title/toolbar/note đã chiếm phần lớn chiều cao, không tuyên giải pháp fit18px là đáp ứng yêu cầu “chỉ bảng cuộn”. Cần root đo lại568×320 sau fallback, kiểm toolbar/title/actions truy cập được bằng keyboard và main scroll không làm mất ID sticky.

Owned source freeze sau CSS fallback, scoped diffcheck exit0. Không thay dữ liệu, Status/palette/permission hoặc chạy thêm test chỉ để assertCSS. Latest behavior regression vẫn26PASS; actual landscape fallback **PENDING_ROOT_BROWSER** tới khi root ghi receipt mới.

## Review chéo Admin scroll / popup và sửa được ủy quyền

Theo yêu cầu root, reviewer đọc lại final `AdminLayout.jsx`, `admin.css`, `app-shell.css`, `AdminFormDialog.jsx`, `useDialogFocus` và active Testing caller; không browser/test trước khi có finding xác nhận. Không thấy regression source chắc chắn ở grid/sidebar layout, compact JS/CSS breakpoint768, route-main focus, nested focus, source-ID mapping hoặc composition fallback≤500px. Hai risk được gửi root:

1. Body overflow lock có thể không khóa `.admin-main` cuộn độc lập khi wheel backdrop. Root kiểm320×568: main.scrollTop0→0, dialog scroll62.93 không đổi. **Chưa xác nhận lỗi này**, không thêm patch từ suy luận; không gọi risk là browser failure.
2. `AdminProjectDropdown` đặt popup dựa visualViewport nhưng không giao với `.admin-main` overflow:auto mới; above popup có thể vào vùng header và bị clip. Root **xác nhận Chrome568×320** tại “Dự án của người dùng”: main scrollTop103.467, main top77.067/bottom320; trigger176.167..220.167; popup top6/bottom170.167/height164.167, search bị cắt đầu71px. [Before JSON](admin-picker-short-check.json), [ảnh](admin-picker-short-check.jpg). Đây là finding layout có root cause source và actual browser evidence, không chỉ rủi ro cũ.

Root ủy quyền reviewer sửa duy nhất `AdminProjectDropdown.jsx` và `project-picker.test.jsx`; không sửa AdminFormDialog/shared hook/CSS của agent khác. Bản sửa:

- `visibleBounds` giao visualViewport (bao gồm offsetTop/height) với client scrollport của mọi overflowY auto/scroll/hidden/clip/overlay ancestor. Không chỉ đo window khi parent main/dialog đã cắt vùng thấy được.
- Nếu lúc mở cả phía trên/dưới đều dưới136px khả dụng và scrollport đủ diện tích, dịch **nearest scrollable ancestor** vừa đủ để một phía chứa search/choices; target không vượt240px hoặc khả năng vật lý sau trigger/gaps. Tôn trọng scrollTop0/max và số đo phân số, đo lại sau dịch.
- Adaptive scroll chỉ chạy **một lần lúc mở**. Capture scroll/window resize/visualViewport scroll/resize sau đó chỉ đo lại. Không kéo lại vị trí cuộn tay và không loop điều chỉnh từ scroll listener. Popup vẫn anchored above/below; không portal vượt auth scope, không dùng global overflow:visible để giấu clipping.
- Max-height không bị ép tối thiểu80 khi thực tế không có80px chỗ trống. Không đổi search/server paging/selection/focus/Escape/request semantics, không API/DB call thật.

### Bằng chứng RED/GREEN mới

Public component fixture mô phỏng đúng root geometry: viewport320px height/main77.067..320/scrollTop103.467, trigger176.167..220.167; mocked scrollTop có clamp và thay đổi trigger rect như browser. Thêm nested scrollports (outer77..480, inner100..380), parent ở scroll limit và visualViewport resize. Assertion về popup nằm trong intersection, có≥136px, search focus/selection không đổi; manual scroll không bị script kéo lại. Không phải test màu hoặc một CSS literal.

```text
rtk proxy npm test -- src/app/features/admin/project-picker.test.jsx --maxWorkers=1 --reporter=dot --reporter=json --outputFile=../var/uiux-admin-entry-2026-10-19/admin-picker-scrollport-red.json
```

**RED2FAIL/5PASS,exit1**: popup top6<main77.067 và top6<nested100, đúng actual clipping mechanism. [RED](admin-picker-scrollport-red.json).

Lượt trung gian còn1FAIL/6PASS vì adaptive scrolling chuyển parent dù đã có164px dùng được. Giữ [receipt trung gian](admin-picker-scrollport-intermediate.json); thu điều kiện adaptive còn “cả hai phía<136px”, không hạ assertion hoặc tăng timeout. Sau sửa **7/7PASS,exit0**,5.01s. [GREEN](admin-picker-scrollport-green.json).

Regression có giới hạn các caller Admin liên quan:

```text
rtk proxy npm test -- src/app/features/admin/project-picker.test.jsx src/app/features/admin/admin-management.test.jsx src/app/features/admin/fixreports-members.test.jsx src/app/features/admin/fixreports-handover.test.jsx src/app/features/admin/inventory.test.jsx src/app/features/admin/admin-dialog.test.jsx --maxWorkers=1 --reporter=dot --reporter=json --outputFile=../var/uiux-admin-entry-2026-10-19/admin-picker-regression.json
```

**39/39PASS,6files,exit0**,22.18s. [Regression](admin-picker-regression.json). Không cộng7+39 vì overlap; không nâng test có chữ integration thành HTTP/DB thật. Scoped `git diff --check` hai file exit0; coverage/build/full frontend mới **NOT_RUN bởi reviewer này**.

Dropdown source freeze sau39PASS. Root Chrome cần kiểm568×320 popup search/choices không bị cắt, main/ancestor chỉ dịch khi cần lúc mở, manual scroll không giật lại, query/filter không commit ngoài lựa chọn, keyboard Escape/Enter và nested modal picker. Số đo mock là logic geometry, không chứng minh paint/root final suite; finding này **FIXED_SOURCE_MOCK / PENDING_ROOT_BROWSER** tới khi root thêm after receipt. Không nhận công hoặc sửa chéo AdminFormDialog/useDialogFocus đang được agent khác xử lý.

### Root Chrome xác nhận sau sửa

Root kiểm568×320: main77..320; trigger113..157; popup163.23..314 hoàn toàn trong vùng main; search176.3..220.3 nhìn thấy. Nhập `Spider` xuất hiện option `SPIDER-PLUS`; Escape đóng và trả focus đúng button, không thay selection và không ghi dữ liệu nghiệp vụ. [After JSON](admin-picker-short-after.json), [ảnh](admin-picker-short-after.jpg), [interaction](admin-picker-interaction-after.json). Đây là **ROOT_BROWSER_CONFIRMED** cho geometry/search/Escape ở hành trình này, không phải reviewer mở browser hoặc toàn dropdown mọi viewport PASS. Ledger/source freeze sau cập nhật bằng chứng này; không đổi sản phẩm.
