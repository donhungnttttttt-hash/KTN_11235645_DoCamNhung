# Kiểm tra lại Testing / Feature / Issue — 19/10/2026

Reviewer: `ux_audit_testing_issues`. Phạm vi: source hiện tại của Feature/file/import/document, phân công/Status/lịch sử, Issue case/monkey, board/list và các API quyền liên quan. Root là người duy nhất dùng browser và đang sửa riêng Tổng quan theo yêu cầu mới: chỉ thay khối Công việc gần đây, giữ phần khác. Reviewer không sửa product/test/config hoặc file root đang làm; không browser/API/DB, không restart, migration, cài đặt hay Git mutation.

**Kết quả:** UX-001/005/006/007/008/009/013 vẫn có nguyên nhân trong source; không mục nào đủ bằng chứng đánh FIXED. Source 94 file thuộc nhóm này có trong baseline audit đều khớp SHA256 cũ. Đã tìm thêm các gap có thể kiểm chứng tại đường phục hồi409 của Feature, điều hướng từ Issue về case và hiển thị metadata Issue. Chúng được ghi riêng là SOURCE_ONLY, chưa tăng danh mục lỗi browser.

## Baseline, skill và loại bằng chứng

- Nhánh `system-design`; HEAD/baseline audit trước `caf075af7231f207259b6a62808bff5c8445f6af`. Working tree có nhiều thay đổi tồn tại từ trước; HEAD không đại diện toàn bộ source chưa commit.
- Đã đọc lại danh mục UX hiện tại và independent-testing-review; đối chiếu router/component/API hiện tại, không chỉ diff. So sánh các file baseline thuộc `features/testing`, `features/test-cases`, `features/work-items`, routes/WorkBoardPage và backend Feature/FeatureIssue: **94/94 unchanged, 0 changed** tại thời điểm rà soát. Các file không nằm baseline không được suy là unchanged chỉ từ phép so sánh này.
- Giữ clarification mới: Feature/file/case độc lập; U→OK→NG→P→NA→U; P/NA tính đã test; tổng gồm NA, empty0%; Bug/QA; không thêm run/build/device/retest gate; ADMIN có quyền toàn cục trên dự án active, PM CRUD theo membership, Tester tự nhận/phần mình và own-monkey, DEV theo Issue được giao.
- `code-review` → rà toàn caller/source/contract và đánh giá finding cũ/mới → bảng revalidation và new-gap bên dưới. Không giới hạn theo diff; không spawn reviewer khác.
- `frontend-patterns` → rà keyed scope, URL/filter/page, pending/draft/abort,409/refresh → UX006,409 Feature và risk register.
- `frontend-ui-engineering` → rà CSS ancestry, shared Modal, case detail callbacks, portal Tab/blur, bảng/long text/control states → UX001/007/008/013. Không tuyên đo kích thước/contrast/AT bằng source.
- `api-design` → rà DTO preview, pagination/history, expectedVersion/requestKey và matching UI/API → UX005/009,409 Feature, Issue metadata.
- `security-review` → rà session/CSRF/service project scope, active/archive, self-assignment/DEV/own-monkey và retirement → role matrix. Không pentest hoặc gửi dữ liệu ra ngoài.
- Skill đã đọc ở lượt audit trước và tái áp dụng; không đếm việc chạy test như bằng chứng dùng mọi skill hoặc mọi UI đạt.

**SOURCE_REVIEW** nghĩa đã đối chiếu code. **MOCK_TEST_EXECUTED** nghĩa test Vitest/jsdom dùng mocked APIs chạy trong lượt này. **BROWSER_PRIOR_ROOT** là evidence audit trước do root thu, không được gọi là browser kiểm lại trong lượt này. Browser/live API/backend integration/coverage/build mới của reviewer: **NOT_RUN / NOT_MEASURED**.

## Revalidation các finding được giao

| Finding | Kết luận source hiện tại | Nguồn/caller quyết định | Evidence và phần chưa chạy lại |
| --- | --- | --- | --- |
| UX-001 P1 Issue Modal mất layout | **OPEN, nguồn không đổi.** Các caller hiện tại vẫn thiếu ancestor mà CSS yêu cầu. | `components.jsx:189-223` xuất d-modal; `FeatureIssuesPage.jsx:37,49-50` root không `.work-items`; `CaseIssueAction.jsx:34` nằm trong testing grid. `work-items.css:1455-1487` đòi `.work-items`; `work-items-live.css:52-63`; expand `work-board.css:253` đòi `.dashboard-board.work-items`. MainLayout không thêm wrapper đó. | BROWSER_PRIOR_ROOT đã xác nhận monkey768, case390, detail/expand; không browser mới. Mock modal tests chỉ kiểm `.ex-modal` của Feature/assignment/cell editor, **không** phủ Issue d-modal ancestry. |
| UX-005 P2 preview ID | **OPEN, contract mismatch nguyên.** | Backend `FeatureService.java:160` alias `caseNo`; frontend `ExcelImportPreview.jsx:44` đọc `sourceCaseKey`; `testCases.js:14` alias `featuresApi.preview`, `features.js:17` không adapter. | Prior isolated API+source. Browser preview vẫn NOT_RUN do upload tool limitation cũ; không quy lỗi quyền user. Generic batch mocks không kiểm Feature response ID seam. |
| UX-006 P2 URL/project/filter | **OPEN.** Filter/page vẫn local; route builder vẫn bỏ projectId. | `FeatureIssuesPage.jsx:11-13,30-33,48`; ProjectProvider khôi phục query hoặc stored project; current scope không tự gắn vào URL Issue. | Prior root filter-reload reproduced; copied-link after changed stored project vẫn source risk. Mock tests hiện kiểm filter restore khi route prop đổi, không kiểm refresh/copy trên hai project. |
| UX-007 P2 case Previous/Next | **OPEN.** Active caller không truyền callbacks. | `TestingDocumentPage.jsx:58`; `DocumentCaseDialog.jsx:12` render hai button disabled khi thiếu onPrevious/onNext. | Prior root case390, file60case. Current tests mở case dialog/current assignment values nhưng không đòi Next của middle/first nonfinal case enabled. |
| UX-008 P2 preview keyboard | **OPEN.** Trigger focus không đưa focus vào portal; blur timer đóng popup khi Tab đi qua history. | `CaseIssueAction.jsx:19-20,27-33`; portal cuối body, không direct-focus/aria-controls/arrow handling; current Issue button đứng trước history/next row trong grid. | Prior root Tab→history→popup disappear. Existing mock test dùng fireEvent.click/keyDown trực tiếp vào region; không mô phỏng chuỗi Tab thực đến action trong portal. |
| UX-009 P2 assignment history entry | **OPEN, gap UI.** Endpoint/client/storage còn; không active consumer. | `features.js:21`, `FeatureController.java:31`, `FeatureService.java:195,209-212`; current grid chỉ `Lịch sử Status` (`TestingDocumentPage.jsx:55,59`) → result history. Full active source search không có `featuresApi.history` consumer. | SOURCE_REVIEW; dữ liệu lịch sử không bị mất. Không API/browser gọi trong lượt này. |
| UX-013 P3 disabled Status copy | **OPEN.** Reason cố định vẫn gộp quyền với pending/error/export/archive. | `TestingDocumentPage.jsx:39,55`; `ResultCycleButton.jsx:12-14` đưa reason vào title của disabled button. | Prior root pending-state observation; current sourcetest không kiểm state-specific reason. Không suy thành quyền backend sai. |
| UX-010 liên quan archive | **OPEN ADMIN-only affordance mismatch.** PM helper đúng, ADMIN bypass helper archived check ở list/files. | `TestingFeaturesPage.jsx:19`; `TestingFeaturePage.jsx:19`; `projectAccess.js:6-9`; backend writer kiểm archive trước ADMIN ở `FeatureService.java:34-40`. | Prior root main mở form không lưu. Không write main hoặc browser lại; document server caps đã gồm projectActive. |

Không gọi các mục trên là hồi quy do thay đổi Tổng quan của root: source nhóm này không đổi và đã tồn tại trong audit trước. Không đụng scope Tổng quan, không đề xuất bỏ tab/khối ngoài chỉ đạo mới.

## Controls và trạng thái được rà lại

32 biến thể route/UI của [inventory nguồn trước](../uiux-audit-2026-10-19/testing-issues-source.md) vẫn khớp current router. Bảng dưới nhóm theo component thực sự chung; không dùng một instance đúng để suy mọi instance/viewport đúng.

| Nhóm/route active | Controls đã trace | State/call chain rà | Mức xác minh lượt này |
| --- | --- | --- | --- |
| `/board/testing` active/archive list | create/edit/archive/restore, search, archived checkbox, refresh/retry, prev/next, Feature open | role/admin archive, empty/search-empty, loading/error, version, last-page shrink, long metadata | SOURCE_REVIEW + mocked Features2 tests |
| Feature form create/edit | name/environment/description, save/close/Escape | required/bounds, failure draft, create key, update409, saved-read-failure, pending lock | SOURCE_REVIEW + reused modal/Features tests; no product writes |
| `/board/testing/features/F` files | open, import, hide, keyword, page/reload/back | active/archive, file assignees/progress, imported success, no-match vs empty, hide/no-restore UI | SOURCE_REVIEW; no direct TestingFeaturePage test file exists in current inventory |
| Import dialog single/batch | template, file input, rules disclosure, preview, per-file selection/replacement/retry, confirm/finish/back/cancel | <=20files/5MiB/xlsx, partial commit, auth stop, unmount/project generation, empty/mapped IDs, expired preview | SOURCE_REVIEW + mocked batch9 tests. No browser upload/real workbook parse executed |
| Document grid `/.../documents/D` | search, Status filter,20/50/100 size, prev/next, exports/original, refresh, cell editor, assignment, case ID, Status cycle/history/Issue | ownership/mismatch, deep-link focus/page, zero/P/NA metric, disabled/pending/error, manager/self/DEV/archive, header/extra cells | SOURCE_REVIEW + mocked Document4 tests; first focus assertion failure then4PASS isolated, see test section |
| Assignment manager/self modal | Tester directory/retry, ordinal range, staged member switch, save, version reload, close | eligible members, empty directory, stable row IDs, overlap/out-of-range, own-only authority,409 current data comparison, retained drafts | SOURCE_REVIEW + mocked Assignment4 tests; no concurrent live writes |
| Cell/case/result history dialogs | cell textarea/save/current-version/history/retry/cancel, case close/prev/next, result history retry/older cursor | bounds/revision/version, current Status/assignees instead imported raw values,50-history page, safe plain text/timezone | SOURCE_REVIEW + existing modal5/result-history1 mocked tests; no browser new geometry |
| Case Issue button/popover | count, hover/focus/click/Escape, error reload, list page, open/create | exact project/Feature/document/row scope, closed count, portal ordering, anchor position, eager list requests, return focus | SOURCE_REVIEW + mocked CaseIssue3; actual Tab remains prior root evidence |
| Issue form Bug/QA/monkey | type, context-prefill, description/steps/expected/actual, save/cancel, context retry | context load/denial, revoked capability, required/bounds, same payload key, pending parent close, dirty Feature change | SOURCE_REVIEW + mocked Form3; no live writes |
| `/board`, `/board/list`, `/issues` | Kanban/list toggle, Feature/type/status/keyword, refresh/page, key/title detail, drag/select move, monkey Feature selector | abort stale read, filter URL, server page vs labelled page totals, no unsupported create entry, invalid filter, list error | SOURCE_REVIEW + mocked FeatureIssues3/WorkBoard11 |
| `/board/issue/I`, nested case detail | reload/edit/DEV directory/retry, priority/assignee, status/reason, note, delete-confirm, history/detail expand/close | version/late read, draft merge, read-only/current caps, soft own-monkey, deleted state, safe content, context metadata links | SOURCE_REVIEW + mocked Detail17, CSS expansion source only |
| Current/legacy routing | board/testing nav, scoped Back, invalid IDs, old create, `/tests/**`, `/design/*` aliases | key project/Feature/document, malformed/duplicate scope, retired guidance, no old-ID remap | SOURCE_REVIEW + mocked navigation23; old Board/Issues/execution/retest components remain unmounted |

## Quyền và API liên quan

Rà trực tiếp controller/DTO/services, không suy guard từ button:

| Seam | Hành vi current source | Giới hạn kết luận |
| --- | --- | --- |
| Session/CSRF | SecurityConfig`:60-63` yêu cầu authenticated cho `/projects/**`; CSRF`:85`; business scope tiếp tục ở services. | Không live request/security test backend mới. |
| Feature management | writer hiện hành/requireRead/projectActive, ADMIN không membership, project PM hợp lệ, globalDEV không hưởng PM/Tester từ membership bất nhất (`FeatureService:34-46`). | UX010 là affordance mismatch; không phải quyền server bị vượt. |
| Document ownership/caps | detail xác định owning Feature/document; writable chỉ khi project/Feature/file active; canManage/canAssign/canCreateIssue/canUpdateResult gắn authority (`FeatureService:117-131`). | UI stale sau quyền đổi vẫn cần server rejection; không chứng nhận runtime mọi tổ hợp. |
| Assignment | `AssignmentPlan:10-27` row ownership, duplicate members/rows, own-only scope; version/document lock và history actor ở FeatureService`:186-198`; no run/device required. | Manager không được suy có force takeover ngoài explicit scope; concurrent UI comparison còn gap. |
| Status | `FeatureService:200-206` giữ allowed5states, manager/assigned current person; source useDocumentResults serializes per row, refresh guards. | Current permission good in static call chain; actual network cancellation/outcome chưa thử. |
| Issue create/edit/delete | FeatureIssue authorize/context validates project/Feature/file/row; manager/Tester create, own-monkey edit/softdelete, assignedDEV transition/comment; update/version/history protected. | Case Issue creator không có own-monkey edit/delete là current intentional policy, không tự mở rộng quyền. |
| Issue status/retest | allowedStatuses from server; QA subset; DEV progress/resolved; transition reason required; no old coverage/retest gate (`FeatureIssueService:105-115,157-162`). | Không restore old typedQA/retest workflow. |
| Legacy | old public writes410; `/tests/**` guidance; GET history remains permissioned. | Không xóa graph hoặc gán old IDs thành Feature IDs để làm link chạy. |

## Gap mới / điểm cần root quyết định, SOURCE_ONLY

Các ID `RC-TI-*` là đề mục reviewer, không tự gán thêm UX toàn cục. Không có browser reproduction mới hoặc backend mutation để chứng minh các scenario dưới.

### RC-TI-01 — P2 đề xuất — Feature edit409 không có đường reconcile giữ nháp

**Route/role:** `/board/testing` → Sửa Feature, A/P; hai writer hoặc stale version.

**Repro bằng fixture/mocked boundary đề xuất:** mở Feature version0 và nhập tên mới; writer khác update version1; Save→409; tiếp tục Save hoặc tìm Tải bản mới/đối chiếu.

**Source actual:** `FeatureForm.jsx:12` mọi update lấy `expectedVersion:feature.version`; error chỉ set text (`:13`). Form chỉ có Đóng/Lưu (`:17-21`), không fetch latest/compare/update version giữ draft. Backend `FeatureService.java:93` bắt version đúng; lặp Save vẫn stale. Muốn list refresh/mở version mới phải đóng form, làm mất local fields nếu không tự copy. Tương tự nhóm version/draft ownership của UX003, nhưng caller Feature riêng; không nói Note và Feature là một implementation.

**Expected/impact:** giữ nháp và cho đọc/đối chiếu current Feature, explicit reviewed retry; không yêu cầu người dùng tự chép nhiều field hoặc bỏ server409.

**Remedy/AC:** tái dùng pattern current-vs-draft như cell editor; guard feature archive/deletion/permission, không tự nhận version mới rồi overwrite âm thầm. Two-writer test409 → fresh metadata visible → draft unchanged → explicit save correct version; quyền mất/read fail có retry và không ghi sai scope. Bổ sung affected module vào task recovery chung nếu root chấp nhận; không nhân finding chỉ vì nhiều form.

### RC-TI-02 — P2 navigation gap đề xuất — Issue metadata không có lối mở lại Feature/file/case nguồn

**Route/role:** global `/issues` hoặc board → case-linked Issue detail; all allowed readers.

**Source actual:** `FeatureIssueDetail.jsx:107` chỉ paragraph nối featureName/fileName/caseNo. Trong component không có anchor, navigate callback hoặc nút mở Feature/file/case. List/board context cũng là plain text (`FeatureIssuesPage.jsx:43-45`). Backend detail đã trả featureId/documentId/rowId (`FeatureIssueService.java:42-43`); router có đường mở đúng row bằng `projectId` + `caseId`.

**Expected/impact:** người mở Bug từ Quản lý lỗi có thể kiểm tra lại đúng case/source context mà không tìm lại bằng tên. Flow tạo từ case hiện có thể đóng modal về case, nhưng đó không cung cấp link nguồn khi entry từ global list. Monkey không có row phải được phân biệt, không tạo case giả.

**Remedy/AC:** liên kết context tới Feature và tới document/case khi IDs có thật, luôn scope projectId, bảo toàn list return context. Case-linked Issue mở đúng independent row kể cả tên file trùng ở Feature khác; monkey chỉ mở Feature; archived/missing/denied target thông báo rõ, không map tên/old IDs. Source-only gap có thể giữ dạng cải thiện navigation nếu root thấy yêu cầu hiện tại chưa bắt buộc one-click traceability.

### RC-TI-03 — P2 presentation gap đề xuất — priority lưu được nhưng người xử lý không có view đọc; history không nêu priority/assignee thay đổi

**Route/roles:** board/list/Issue detail, nhất là DEV được giao; PM/Admin edit priority/assignee.

**Source actual:** server detail SELECT trả priority và assigneeMembershipId/name (`FeatureIssueService.java:39-43`); editor gửi chúng (`FeatureIssueDetail.jsx:71,128-133`). Nhưng read-only summary `:107-112`, list/card `FeatureIssuesPage.jsx:43-45` không render priority. Chỉ người `canAssign` mới thấy selector priority ở edit; assigned DEV canAssign=false, nên không có view đọc mức HIGH/MEDIUM/LOW trong active UI. Ngoài ra history renderer `FeatureIssueDetail.jsx:157-162` chỉ status/reason/body/contentFields; `contentFields` không gồm priority/assignee. Snapshot backend`:171` vẫn lưu cả hai. Một UPDATE chỉ đổi người/priority hiển thị actor/time “Sửa nội dung” nhưng không có before→after tương ứng.

**Expected/impact:** metadata mà PM đặt để điều phối phải đọc được ở điểm xử lý phù hợp; lịch sử phân biệt nội dung, ưu tiên và phân công. Không báo dữ liệu server/history bị mất.

**Remedy/AC:** hiển thị ưu tiên tiếng Việt trong read detail và danh sách/thẻ ở mức mật độ thích hợp; history có priority/assignee diff với identity/name có chứng cứ, giữ tên người cũ nếu đã inactive. DEV assigned đọc priority nhưng không sửa; PM priority-only/assignee-only update xuất hiện diff đúng. Đây là source-confirmed absence; tính bắt buộc/severity còn root đối chiếu nghiệp vụ, không tự thêm schema/priority mới.

## Rà lại source risks cũ và các trạng thái chưa thử

| Risk | Kết luận recheck / cách xác minh tiếp |
| --- | --- |
| Issue dirty/pending close | Vẫn có: callers Modal không truyền busy; Escape/backdrop/X mặc định được đóng trong khi child busy, local draft unmount; monkey select đổi key form. Không chứng minh duplicate write hoặc mất dữ liệu đã lưu. Cần fixture delayed command/outcome, giữ same-key. |
| Save success + read refresh fail | `useTestingQuery` ở testingState`:6-9` nuốt rejection thành query.error/data null; onSaved caller vẫn close. Error có hiện, nhưng chưa phân biệt saved vs failed refresh. Không nói lỗi bị ẩn hoàn toàn hoặc server rollback. |
| Last page archive/hide | Feature/file page state không clamp khi tổng giảm; có thể trang2/1/empty sau loại entry cuối. Chưa dựng fixture nhiều trang. |
| Assignment409 compare | Reload chỉ lấy latest.version và key (`DocumentAssignments:30`), không hiển thị latest.items, ordinals vẫn từ original data.rows. Không chứng minh ghi đè trái quyền; server overlap guard vẫn bảo vệ. |
| Empty eligible Tester directory | `members=[]` không có status text “chưa có Tester đủ điều kiện”; select chỉ Chọn Tester, save disabled. Directory error/retry đã có. Giữ là feedback gap source-only, không tự mở membership editing cho PM. |
| Per-row badge fan-out | Mỗi mounted CaseIssueAction GET list khi mount; page100 có thể100 list requests. Cấu trúc xác nhận; latency/load production NOT_MEASURED. Phải tách performance check khỏi UX008 keyboard finding. |
| Preview anchor | show() tính fixed position một lần, không scroll/resize sync. Không có browser mới để chứng minh detached popup. |
| Long unbroken cell | grid span/testing-case-text không dùng `.td-cell-text` wrap-anywhere; riêng grid không đi TableScroll helper. Cần long-token/URL fixture trong manager/read-only variants; không coi min-width90rem/cuộn ngang tự nó là lỗi. |
| Missing valid caseId | route validation cú pháp đúng; linked ID không tìm thấy thì không focus/highlight và không có explanatory message. Không có API/browser mới. |
| Feature/file/card progress | P/NA,zero formula giữ đúng; file list chỉ text ratio/percent so với yêu cầu bar ban đầu. Giữ requirement presentation choice, không đổi formula để làm UI đẹp. |
| File hide | immediate soft hide không confirm/undo/discoverable archived-file view; data còn server. Feature archive có restore view, file thì khác. Không gọi hard delete/data loss. |
| Permission downgrade | Form create giữ draft khi authorized false; detail reload canEdit=false làm editor không render nhưng local draft state còn. Cần feedback/compare check, không bỏ server guard. |
| Date/history copy/IME/touch/zoom | Status history renders before/after raw; timezone helper reused. IME Enter, physical touch, low-height virtual keyboard,200% zoom/AT vẫn NOT_RUN. Không gán WCAG violation từ source-only. |

## Tests thực chạy và giới hạn

Đã chạy existing Vitest/jsdom files dùng mock, không tạo/sửa test để chứng minh CSS literals và không live fetch/DB. Lệnh từ Frontend:

```text
rtk proxy npm test -- src/app/features/testing/TestingFeaturesPage.test.jsx src/app/features/testing/TestingDocumentPage.test.jsx src/app/features/testing/DocumentAssignments.test.jsx src/app/features/testing/testing-modal.test.jsx src/app/features/work-items/FeatureIssueForm.test.jsx src/app/features/work-items/FeatureIssueDetail.test.jsx src/app/features/work-items/FeatureIssuesPage.test.jsx src/app/features/work-items/CaseIssueAction.test.jsx src/app/pages/WorkBoardPage.test.jsx src/app/routes/fixreports-navigation.test.jsx src/app/features/test-cases/ImportExcelBatch.test.jsx src/app/features/test-cases/DocumentResultHistory.test.jsx src/app/features/test-cases/ResultCycleButton.test.jsx --reporter=default --reporter=json --outputFile=../var/uiux-recheck-2026-10-19/testing-tests.json
```

**Lượt đầu: 87 PASS / 1 FAIL,13 files, exit1**,9.85s. Failure `TestingDocumentPage.test.jsx:23`, test “opens the page containing the linked row and marks that case”: page2 và aria-current đúng CASE25 nhưng immediate `toHaveFocus` nhận body. Không xóa/ghi đè JSON failure: [testing-tests.json](testing-tests.json).

Đã chạy **một lượt thu hẹp có giới hạn** đúng file để kiểm failure, không sửa product/test/assertion:

```text
rtk proxy npm test -- src/app/features/testing/TestingDocumentPage.test.jsx --reporter=default --reporter=json --outputFile=../var/uiux-recheck-2026-10-19/testing-focus-rerun.json
```

**Rerun:4/4 PASS,1file, exit0**,2.45s; [testing-focus-rerun.json](testing-focus-rerun.json). Giữ cả hai kết quả. Đây là failure không lặp lại trong lượt riêng; timing giữa DOM assertion và passive-effect focus là giả thuyết phù hợp, **chưa xác nhận nguyên nhân**. Không coi isolatedPASS là toàn13file clean hoặc bằng chứng browser focus luôn đúng. Đề nghị root ghi test-instability/keyboard check cần theo dõi, không tự thêm lỗi sản phẩm chỉ từ failure này.

Test hiện có xác minh các seam cụ thể: Status/P/NA không run/device, server IDs/version, self range, permission false, draft khi save lỗi, context retry, notes late merge, deep-route dispatch, batch partial/retry, result-history cursor, case-dialog current assignments. Chúng không chứng minh UX001 geometry, UX005 real Feature DTO, UX006 copied URL, UX007 callbacks đúng, UX008 Tab thực, UX009 visible history entry hoặc mọi viewport.

Không đo coverage/build/backend/live/securityintegration trong lượt recheck. Không cộng4PASS rerun vào88 thành92 test khác nhau. Không dùng số PASS để tuyên UI/UX đạt hoặc đóng finding cũ.

## Handoff cho root

1. Giữ UX001/005/006/007/008/009/013 OPEN; cập nhật source rechecked không thay thế prior browser evidence.
2. Nếu có thời gian browser chỉ đọc, ưu tiên từ Issue board mở liên kết case nguồn (hiện không có), priority read-only DEV và empty Tester directory. Các thử409/delayed write chỉ trên fixture được phép, không main.
3. Cân nhắc RC-TI-01 như affected Feature form của nhóm recovery409; RC-TI-02/03 là source UI gap riêng, cần xác định yêu cầu/severity trước thêm global IDs. Không tự tăng số browser findings.
4. Root giữ thay đổi Tổng quan giới hạn theo user; reviewer không sửa/ghi vào file root đang triển khai. Chưa thực hiện repair plan, không mở lại workflow đã bỏ.
