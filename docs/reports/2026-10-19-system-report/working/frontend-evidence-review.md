# Review độc lập frontend, nghiệp vụ và bằng chứng

Ngày lập: 19/10/2026. Baseline đã kiểm tra: `9ccc73483faddde48d930c9607f2f2f7f6981761`, nhánh làm việc theo chỉ dẫn `system-design`. Tài liệu làm việc phục vụ báo cáo Word; không phải biên bản UAT mới.

## 1. Phạm vi và mức tin cậy

Đã kiểm kê toàn bộ tệp JavaScript/JSX trong `Frontend/src`, loại test/setup khỏi inventory source: 166 tệp. Đồ thị import tĩnh từ `main.jsx` đi tới 103 tệp. JSON kèm theo `frontend-module-map.json` liệt kê từng tệp, số dòng, dependency và 120 tệp có trong receipt test lịch sử. Import tĩnh không đồng nghĩa component được render; tệp nằm ngoài closure không đồng nghĩa có thể xóa. Các utility hoặc API có thể chứa cả nhánh hiện hành và legacy.

Đã đọc sâu router, auth, project scope, Feature/file/case, phân công, Status, Issue, báo cáo Markdown, Note, overview, Rules/Handbook và luồng chat/config AI. Các trang quản trị được kiểm kê và đọc seam quyền/request/validation; không đọc sâu từng dòng CSS, từng dialog/helper hoặc toàn bộ 120 test. Phần backend/controller/entity/database do review riêng phụ trách: danh sách API dưới đây là request thực tế từ frontend, **không tự chứng minh enforcement backend**. Không mở Word gốc trong nhánh review này; không suy ra cấu trúc hoặc sai lệch của Word trước khi có bóc tách từ reviewer tài liệu.

Không chạy test/build mới, browser, dịch vụ, migration, database, OAuth/probe hoặc AI. Không sửa sản phẩm/cấu hình, commit/push/upload. `git status --short` trong lượt review chỉ báo thư mục `docs/reports/` mới. Các command đọc đều có tiền tố `rtk`; Python không sẵn trên PATH nên dùng Node có sẵn để đọc UTF-8 và phân tích JSON. Hai lệnh đọc phụ không thành công (tham số `rtk read` không hỗ trợ và wildcard đường dẫn Windows của rg) được thay bằng đọc Node/đường dẫn trực tiếp, không có thao tác sản phẩm.

### Skill đã đọc → áp dụng → đầu ra

| Skill (dưới `C:/Users/admin/.codex/skills/`) | Cách dùng thực tế | Bằng chứng trong review |
|---|---|---|
| `frontend-patterns/SKILL.md` | Truy import/router, Context/local state, async race, loading/error, capability và form | Mục 2–5, source path + symbol + dòng |
| `grill-with-docs/SKILL.md` và dependency `grilling/SKILL.md` | Đối chiếu quyết định đã chốt với source trước khi tạo câu hỏi; không hỏi lại C01–C14 | Mục 6 Known/Unknown và mâu thuẫn; không diễn giải tài liệu cũ thành lệnh mới |
| `domain-modeling/SKILL.md` | Chuẩn hóa Feature/file/row/assignment/actor/Status/Issue/report, phân biệt mô hình cũ | Mục 3, 6; không thay domain hoặc tạo ADR không có quyết định thực |
| `documentation-and-adrs/SKILL.md` | Ghi provenance, thời điểm và phạm vi quyết định; không bịa lý do công nghệ | Mục 1, 6, 7 |
| `code-review/SKILL.md` | Review độc lập độ đúng của mô tả so với spec/source, tách rule và evidence | Những hạn chế ở mục 6 và phân biệt nguồn ở mục 7 |

Skill `code-review` nguyên bản dành cho diff từ fixed point và hai review con; tác vụ này là kiểm chứng mô tả hệ thống trên baseline hiện hành, không sửa code và không có diff sản phẩm cần triển khai. Vì vậy áp dụng tiêu chí spec/standards cho review độc lập được giao, không tuyên bố đã thực hiện workflow diff đầy đủ hoặc sinh issue. User yêu cầu không hỏi lại quyết định đã rõ có ưu tiên hơn vòng phỏng vấn chung trong `grilling`.

## 2. Bản đồ điều hướng hiện hành đầy đủ ở cấp module

Mọi đường dưới đây là hash route (`#/...`). `AppRouter.jsx:18–57` là bảng quyết định chính của workspace; `AdminApp.jsx:13–24` là bảng quyết định quản trị. Root app không dùng React Router: `App.jsx:18–45` nghe `hashchange`; `routeInfo.js:3–29` tách path/query và kiểm context.

| Module/màn | Đường truy cập và actor | Chức năng/input/output chính | Nguồn đã đối chiếu |
|---|---|---|---|
| Đăng nhập/khóa phiên | AuthBoundary trước mọi app | username/password → login; loading, anonymous, expired, unavailable; xác thực lại giữ nháp cùng user | `features/auth/AuthBoundary.jsx:7–60`, `AuthProvider.jsx:12–93` |
| Chọn không gian theo vai trò | ADMIN mặc định `/admin`; workspace opt-in `workspace=1`; vai trò khác vào workspace | Tránh chọn workspace của user trước trở thành mặc định user sau | `AppEntry.jsx:20–56` |
| Menu/tài khoản/chọn dự án | Header/Sidebar/AccountMenu, không phải trang độc lập | Menu responsive, project context; PM được cấp `users:create` mở form tạo TESTER | `components/Sidebar.jsx:10–25,39–89`; `auth/AccountMenu.jsx:15–38`; `projects/ProjectProvider.jsx:20–75` |
| Tổng quan dự án | `/dashboard`, người đọc dự án | Thông tin dự án + số Bug/QA theo trạng thái + mốc phát hành | `pages/DashboardPage.jsx:5`; `modules/ProjectOverview.jsx:12–74` |
| Bảng trạng thái | `/board`, `/board/list`, `/board/issue/:id` | Kanban/danh sách, filter Feature/type/status/keyword; mở detail, đề xuất chuyển trạng thái qua bước xác nhận | `pages/WorkBoardPage.jsx:9–17`; `work-items/FeatureIssuesPage.jsx:18–54` |
| Quản lý kiểm thử – Feature | `/board/testing?projectId=...` | Danh sách/phân trang/search; PM dự án/ADMIN tạo/sửa/archive/restore; member đọc | `testing/TestingFeaturesPage.jsx:13–34` |
| File trong Feature | `/board/testing/features/:featureId` | Môi trường/mô tả, file/progress/assignee, import Excel, ẩn file; Feature archived chỉ đọc | `testing/TestingFeaturePage.jsx:11–29` |
| Case trong file | `/board/testing/features/:featureId/documents/:documentId`, optional `caseId` | Bảng case/search/Status/pagination/detail, sửa ô, phân công/tự nhận, history, Issue, export original/current | `testing/TestingDocumentPage.jsx:18–81` |
| Import Excel | Dialog từ file list | 1–20 `.xlsx`; kiểm client 5 MiB/file không rỗng; preview rồi commit từng file; giữ partial success | `test-cases/ImportExcelDialog.jsx:8–10,37–94,127–138`; `services/api/features.js:17–18` |
| Phân công/history | Dialog trong case page | Khoảng thứ tự case → rowIds, chọn Tester hoặc self; expectedVersion, requestKey; lịch sử người thay đổi | `testing/DocumentAssignments.jsx:8–31`; `DocumentAssignmentHistory.jsx` được kiểm kê, test history được đọc tên |
| Status/history | Nút/overlay trong case page | Vòng Unexecuted/OK/NG/P/NA; actor history, người đầu tiên/gần nhất là phân công | `ResultCycleButton.jsx:3–14`; `useDocumentResults.js:5–38`; `TestingDocumentPage.jsx:59–80` |
| Issue từ case | Nút Issue, popup và modal ngay tại row | GET count/list đúng Feature/document/row; tạo BUG/QA có prefill server; giữ vị trí case | `work-items/CaseIssueAction.jsx:10–56`; `FeatureIssueForm.jsx:6–47` |
| Quản lý lỗi/monkey | `/issues` | Bug/QA list, filter, tạo monkey Bug chọn đúng Feature, có thể không case | `FeatureIssuesPage.jsx:20–54`; `FeatureIssueForm.jsx:23,39` |
| Chi tiết Issue | `/board/issue/:id` hoặc modal case | Nội dung, DEV assignee, priority, status/reason, comments/history, soft-delete monkey, source deep-link | `FeatureIssueDetail.jsx:19–176` |
| Tổng hợp & Phân tích | `/analysis`; `/progress` alias còn hoạt động, PM dự án/ADMIN | Status metrics, so sánh Feature, Bug/QA; soạn/lưu/xem/tải Markdown; AI preview | `AppRouter.jsx:49–51`; `reports/ManagementAnalysisPage.jsx:20–166` |
| Thông tin chung | `/settings` | Đọc/sửa tên, mô tả, timezone (manager), code read-only | `projects/ProjectSettingsPage.jsx:14–65` |
| Thành viên/thiết bị dự án | `/settings/members` | Thành viên chỉ đọc trong workspace; ADMIN link sang quản trị và bổ sung/thu hồi máy; PM nhận máy, phân phối ngoài phần mềm | `ProjectSettingsPage.jsx:27`; `projects/ProjectDevices.jsx:7–14` |
| Note | `/settings/notes` | PM/ADMIN CRUD note chung; member đọc; version conflict compare, soft deletion | `projects/ProjectNotes.jsx:7–85` |
| Quy tắc báo lỗi | `/settings/rules` | Nội bộ DEMO, draft/publish/history; contract legacy còn mở | `projects/RulesPanel.jsx:5–47` |
| Sổ tay dự án | `/settings/handbook` | Guide/spec/account reference, nội dung và revision history; PM/ADMIN tạo revision | `projects/HandbookPanel.jsx:5–58` |
| Tổng quan hệ thống | `/admin` | KPI các dự án/tài khoản/Status/bug/kho máy, bảng và mục cần chú ý, scope dự án | `admin/AdminDashboard.jsx:6–40` |
| Quản lý dự án | `/admin/projects`, `/admin/projects/:id` | List/create/edit, chọn thành viên chưa thuộc dự án nào, thêm/gỡ/đổi role, readiness/archive/reopen/history, máy | `admin/AdminProjects.jsx:7–22`; `AdminProjectDetail.jsx:12–48`; `AdminProjectForm.jsx:9–39`; `AdminProjectLifecycle.jsx:15–88` |
| Tài khoản | `/admin/users` | Tạo ADMIN/PM/TESTER/DEV, khóa/mở, cấp/thu hồi PM tạo TESTER, search/filter | `admin/AdminUsers.jsx:9–17`; `UserCreateDialog.jsx:7–30` |
| Kho thiết bị | `/admin/devices` | Asset list/edit, AVAILABLE handover, ALLOCATED return; allocation history; PM recipient | `admin/AdminDevices.jsx:8–33`; `DeviceAllocationDialog.jsx:8–18` |
| Nhật ký | `/admin/audit` | Search + project/from/to, Asia/Ho_Chi_Minh trọn ngày kết thúc; không type/timezone selector | `admin/AdminAudit.jsx:8–19` |
| Báo cáo tiến độ cũ | Section trong `/admin/projects/:id` | GET lịch sử, không POST từ UI; dẫn tới report mới | `admin/ProjectStatusReports.jsx:8–29` |
| Chat AI/cấu hình | Chat launcher toàn app, không menu trang AI | Phạm vi project/Feature, riêng chủ hội thoại, provider/model/history/new, gửi/retry/copy; config trong toolbar | `AppEntry.jsx:56`; `ai/AiChat.jsx:14–217`; `AiConnections.jsx:12–109` |
| NotFound/retirement notices | Route sai, route đã nghỉ | Thông báo và hướng điều hướng; không đoán mapping ID cũ → Feature | `AppRouter.jsx:29,43–56`; `routeInfo.js:8–16`; `RetiredAiEntry.jsx` kiểm kê qua import |

Đường dẫn của các nguồn trong bảng tương đối với `Frontend/src/app/`, trừ `App.jsx` và `AppEntry.jsx` tương đối với `Frontend/src/`.

### Những tuyến đã nghỉ và mã giữ lại

`AppRouter.jsx:43` chuyển **mọi** `/tests` và `/tests/*` thành thông báo luồng đã thay đổi. Bao gồm thư viện độc lập, `/tests/cases`, `/tests/documents/...`, cycles/runner/retest/file-work. Các trang `TestDocumentsPage`, `TestDocumentPage`, `TestCyclesPage`, `ExecutionRunnerPage`, `RetestQueuePage`, `FileWorkPage` tồn tại nhưng không phải màn hiện hành. `/dashboard/*` là thông báo đổi overview; `/board/new` hướng tạo Issue theo context; `/settings/catalogs` hướng Note; `/ai` và `/admin/ai` hướng mở chat. `/progress` đặc biệt **không phải màn lỗi/retired**: vẫn alias tới Analysis có guard.

`legacyRoutes.js:3–14` chỉ đổi alias `/design/*` sang route tương ứng, giữ query; không map test-cycle ID thành Feature ID. `routeInfo.js:17–29` còn parser legacy không chứng minh legacy screen còn hoạt động. `data.js` còn các seed, kiểu TASK/REQUEST/IMPROVEMENT và số count mẫu; màn mới chỉ lấy danh mục label/color trạng thái, không lấy count mẫu (`ProjectOverview.jsx:19–23`, `FeatureIssuesPage.jsx:44,49`). Không mô tả sample như số liệu dự án.

Import closure phát hiện các nhóm không được import từ entry: `features/file-work/*`, `features/retest/*`, `features/qa/*`, `features/integrations/RedminePanel.jsx`, `features/reports/ReportsPage.jsx`, `features/ai/AiAssistantPage.jsx`, đa số `features/test-execution/*` (trừ utility), các screen thư viện/test legacy, `CatalogPage/CatalogEditor`, old work-item screens. Điều đó chỉ kết luận frontend entry hiện tại không mở các màn đó; không kết luận backend API/DB/tích hợp Redmine đã bị xóa.

Một seam còn hoạt động là `AppEntry.jsx:49` vẫn mount `ProjectDataProvider`. Provider này tại `work-items/ProjectData.jsx:29–36` đọc legacy work-items/metadata và catalog members/categories/milestones/builds/environments/devices khi đổi project, dù bảng mới dùng FeatureIssue API. Đây là phụ thuộc đọc còn tồn tại; không được viết “frontend hoàn toàn không còn dùng API legacy”. Không đo ảnh hưởng performance trong tác vụ này.

## 3. Thuật ngữ và quy tắc đã xác nhận

Nguồn quyết định hiện hành: `docs/planning/2026-10-19-fixreports-clarification.md`, C01–C14; bảng quyền ưu tiên ở `docs/business/permissions.md:3–24`. `FixReports.md` là yêu cầu ban đầu cần đọc cùng bản làm rõ, không thay những quyết định mới hơn.

| Khái niệm | Nghĩa cần dùng trong báo cáo | Điều không được đánh đồng |
|---|---|---|
| Feature | Một đợt kiểm thử có tên, môi trường nhập tự do, mô tả | Không mặc định là chức năng phần mềm; không bằng cycle cũ dù có nguồn chuyển đổi |
| File/document | Bản nội dung test case thuộc một Feature, có workbook nguồn và các row | Cùng tên/checksum ở Feature khác không là cùng bản dữ liệu có thể sửa chung |
| Case/row | Nội dung kiểm thử trong file; sourceId để người dùng tra, rowId để request thao tác | Ordinal của form phân công không phải số dòng Excel hoặc ID nguồn |
| Assignment | Người chịu trách nhiệm và phạm vi row | Không chứng minh người đó thực sự đã test; không tạo execution attempt mới |
| Status | Kết quả hiện hành riêng bản case của Feature | Không là trạng thái Issue; không là kết quả execution/run cũ |
| Người đầu tiên/gần nhất | Hai cột biểu diễn phân công theo quy tắc chuyển người | Không sinh cột lần 3/4; actor ghi Status phải đọc lịch sử |
| Bug/QA | Hai loại Issue hoạt động; monkey là Bug gắn Feature có thể không case | Không là loại MONKEY riêng; QA mới không đồng nhất typed-QA legacy |
| Report | Văn bản Markdown đã lưu, có version và phạm vi optional Feature | Sửa “10 lỗi” → “8 lỗi” không sửa issue/case thật |
| 100% tiến độ | Mọi case có Status khác Unexecuted | Không bằng pass rate, UAT hoặc nghiệm thu khách hàng |

Quy tắc tiến độ mới: `(OK + NG + P + NA) / tổng case`; NA nằm ở cả tử và mẫu, file không case là 0%. `TestingDocumentPage.jsx:41` và `AdminDashboard.jsx:40` phản ánh công thức này; `ManagementAnalysisPage.jsx:161` nhắc tiến độ không thay nghiệm thu. Không lấy công thức cũ `(OK+NG)/(tổng−NA)` để giải thích màn Feature.

Quy tắc lịch sử ngày 11/10 (`docs/planning/2026-10-11-execution-document-results.md:8–10`): execution mới nhất cập nhật cột iPad một chiều, chỉnh iPad không đổi execution; người test lần 2 lấy run riêng. Quy tắc này cần đặt ở phần **mô hình cũ/chuyển đổi**, không mô tả nó là workflow mới 19/10: route run/second-test đã nghỉ, Status mới lưu trực tiếp; đổi phân công không tạo lần chạy.

### Ma trận vai trò cần giữ đúng

| Hành động | ADMIN | PM chính dự án | TESTER thành viên | DEV thành viên |
|---|---|---|---|---|
| Đọc Feature/file/case | Mọi dự án, không membership | Có | Có | Có |
| CRUD mềm Feature/file/import/sửa nội dung | Có (guard archive/scope/version vẫn giữ) | Có | Không | Không |
| Phân công | Toàn quyền | Quản lý file | Tự nhận/sửa phần mình, không đè người khác | Không |
| Ghi Status | Có | Có | Row đang được giao | Không |
| Tạo case Issue/monkey | Có | Có | Có trong project | Không |
| Quản trị Issue | Theo capability quản lý | Theo capability quản lý | Monkey do mình tạo; comment/transition theo capability | Issue được giao; không triage/assign |
| Note | CRUD | CRUD | Đọc | Đọc |
| Management report | Có | Có | Không | Không |
| Dữ liệu AI liên dự án | Chi tiết theo quyền quản trị, không private chat người khác | Có thể đọc qua AI dù ngoài membership | Chi tiết trong phạm vi; ngoài phạm vi chỉ kinh nghiệm tổng hợp ẩn danh | Như TESTER |
| Tạo tài khoản | ADMIN/PM/TESTER/DEV | Chỉ TESTER nếu ADMIN cấp riêng | Không | Không |
| Handover máy | Bàn giao/thu hồi cho PM | Nhận và phân phối nội bộ ngoài phần mềm | Không phân phối máy trong TMS | Không phân phối máy trong TMS |

`projectAccess.js:1–16` ưu tiên ADMIN toàn cục; global DEV không được quyền PM từ membership bất nhất. `permissions.md:20` cấm suy quyền AI đọc liên dự án của PM thành CRUD/report liên dự án. `AppRouter.jsx:50` và `ManagementAnalysisPage.jsx:25` chặn route report ở UI; backend phải là nguồn enforcement cuối, đã được review riêng.

## 4. Các hành trình frontend → request → phản hồi

### 4.1 Đăng nhập, hết phiên, project deep-link

`AuthProvider.refresh()` gọi `/auth/me` qua auth adapter; 401 đổi anonymous/expired, lỗi khác unavailable (`AuthProvider.jsx:27–38`). `client.js:31–33` phát unauthorized event; `AuthBoundary.jsx:47` giữ app cùng user.id nhưng hidden/inert trong khi khóa, reauth cùng user không làm mất nháp. User khác đổi key. Timeout mặc định 8 giây, JSON malformed không che mã lỗi HTTP; error có `status/code/fieldErrors/requestId` (`client.js:8–64`). CSRF lấy trước lệnh ghi; same-origin credentials không phải JWT client storage.

`ProjectProvider.refreshProjects()` đọc `/projects`; linked `projectId` ưu tiên hơn localStorage, project không tồn tại/không quyền trả notice và **không chọn bừa dự án khác** (`ProjectProvider.jsx:29–35`). Các response cũ bị bỏ qua bằng generation. `routeInfo` từ chối ID không dương/không safe integer, projectId/caseId trùng hoặc caseId thiếu document (`routeInfo.js:1–16`). Document loader kiểm `document.featureId` khớp URL trước render (`TestingDocumentPage.jsx:24`).

### 4.2 Feature và import file

UI manager tạo/sửa Feature → `featuresApi.create/update` → POST/PUT `/projects/{p}/features[/{f}]`; archive/restore có `expectedVersion` và `requestKey`. List/search phân trang server size20 (`features.js:9–18`). `TestingFeaturesPage.jsx:28` recovery chỉ đọc lại danh sách, không gửi lại lệnh archive/restore. File hide cũng vậy (`TestingFeaturePage.jsx:21–23`).

Từ file list, dialog nhận rõ `featureId`; preview POST multipart `/features/{f}/import-previews`, commit POST preview-id/commit. Preview client không tự chứng minh cấu trúc Excel hợp lệ: server trả `validRows/errorRows/status`; chỉ commit PREVIEW có validRows và không errorRows (`ImportExcelDialog.jsx:10,53,80`). Batch theo từng file: file lỗi không rollback file đã nhập, lỗi 401/403 dừng vòng; generation bỏ response khi ngữ cảnh đã unmount. Có xuất file gốc và workbook hiện hành qua `/test-documents/{d}/export?original=...` (`testCases.js:24`). Browser upload/download thật còn có gate riêng ở mục 7.

### 4.3 Phân công/self-claim và Status

Document response cung cấp `canManage/canAssign/selfMembershipId`, từng row có `canUpdateResult`, `resultVersion`. Form manager đọc `/projects/{p}/members`, chỉ lấy Tester active/enabled và không global DEV (`DocumentAssignments.jsx:13`). Chuỗi `1-40,45` parse thành các **rowId**; tự nhận chỉ gửi membership của mình; manager chỉ gửi scope được chọn (`:14–20`). Trùng trong batch bị chặn client; ranh giới giữa request hiện hành và dữ liệu khác phải được backend kiểm. PUT `/test-documents/{d}/assignments` mang version, UUID, changes. 409 giữ lựa chọn, đọc version mới, yêu cầu người dùng kiểm rồi lưu; không tự merge hoặc tự ghi lại (`:21,30`). UI hiện chưa hiển thị đầy đủ phạm vi mới của người khác khi rebase; giữ hạn chế này.

Status button tính giá trị kế tiếp (`ResultCycleButton.jsx:3–14`). Hook tạo queue từng row, gửi PUT `/test-documents/{d}/rows/{r}/result` với `{status,expectedVersion,requestKey}` (`useDocumentResults.js:20–36`). Hiển thị tạm thời có pending; chỉ thông báo “Đã lưu” khi response; lỗi revert về state đã biết, khóa sửa tiếp cho tới reload. Không có cycle/build/device/run trong payload. Document page chặn nút khác khi pending/error/export/loading (`TestingDocumentPage.jsx:42–43,70`).

### 4.4 Case → Issue → điều chỉnh/trạng thái → trở về case

Mỗi `CaseIssueAction` GET `/projects/{p}/issues?featureId&documentId&rowId&page&size`, count dùng `totalItems` không dùng độ dài trang (`CaseIssueAction.jsx:18,47`). Không lọc closed, phù hợp badge tất cả Issue đúng row. Popup hỗ trợ hover/focus/click, Escape và Tab; khi lưu đóng modal, focus trở về nút, reload badge/document (`:29–56`). Có request mỗi row hiện trên trang; chưa đo fan-out dưới tải thật.

Form lấy context server `/issues/context` để tự điền title/steps/expected, không tin mỗi text row từ UI. Payload create chứa Feature/document/row, `BUG|QA`, actual/description và requestKey giữ nguyên khi retry cùng body (`FeatureIssueForm.jsx:12–30`). BUG cần steps/expected/actual, QA cần description; monkey khóa type BUG và có thể document/row null. Lỗi giữ nháp, không phát success. Dirty-close trong modal khác với bảo vệ mọi route exit; không tuyên bố mọi cách rời trang đều giữ nháp.

Detail chỉ hiển thị action theo `canEdit/canAssign/canTransition/canComment/canDelete`, allowedStatuses server; DEV assignee được lọc active+enabled+project DEV+system DEV (`FeatureIssueDetail.jsx:63–82`). Update, status/reason đều versioned. Delete UI chỉ monkey BUG (`:86–89`). Comment có requestKey, history có actor/time trước-sau; chuyển Issue không tự cập nhật Status case. Source links dùng chính Feature/document/row + project (`:111–114`). Bảng Kanban đếm theo **trang hiện tại**, đã ghi rõ trên màn (`FeatureIssuesPage.jsx:48`), không gọi đó là tổng toàn hệ thống.

### 4.5 Management report và Note

Analysis guard PM chính dự án/ADMIN, archive chỉ đọc/tải. Summary GET optional `featureId`; bảng Feature comparison có nhãn toàn dự án dù metrics được lọc (`ManagementAnalysisPage.jsx:59,161–165`). Tạo POST hoặc PUT report mang `expectedVersion`; success mới reset baseline. Download lấy bản server theo reportId, không lấy textarea đang chưa lưu (`:112–118,132,153`). Nháp nằm trong context theo owner/project và được revalidate khi phục hồi; 401 reauth chỉ đọc quyền, không replay save hoặc trả tiền preview; 403 thật không tự clear (`:67–100,133–134`).

AI preview có requestKey/provider/model cố định trong lần yêu cầu chưa kết thúc; READY chỉ tạo proposal, cần bấm “Đưa vào bản soạn” và lưu để tạo báo cáo (`:119–130,150–152`). `SafeMarkdown.jsx:14–36` chỉ là trình đọc Markdown nhỏ; React escape text, link chỉ HTTP/HTTPS; không mô tả là full CommonMark/rich editor.

Notes GET list/get, POST create, PUT update version, DELETE version qua `notesApi`. 409 chuyển sang đối chiếu bản mới, giữ nháp và yêu cầu hành động “Đã đối chiếu” trước ghi lại (`ProjectNotes.jsx:31–50,63–67`). Delete thông báo giữ nội dung lưu trữ. Không có attachment/approval workflow Note.

### 4.6 Admin tài khoản, thành viên, máy và lifecycle

`AdminApp.jsx:19` chặn non-ADMIN. `AdminUsers.jsx:14–17` gửi version khi khóa/cấp quyền, cấm tự khóa ở UI; PM được cấp mở `UserCreateDialog testerOnly` từ AccountMenu và payload ép role TESTER. Không self-registration. `AdminProjectForm.MemberPicker:11` gửi `unassignedOnly:true` server, không chỉ loại member của project đang chọn. Existing memberships không bị suy là dữ liệu sai vì chính sách picker mới.

Tạo project yêu cầu ít nhất một PM, optional máy đều có cùng PM nhận (`AdminProjectForm.jsx:30`). `InitialDevicePicker.jsx:17–19` một người nhận chung cho tất cả máy; `DeviceAllocationDialog.jsx:14` kiểm người nhận PM hiện hành, expectedVersion, ghi ngày trả/ghi chú. Recovery 409 chỉ cho các mã VERSION_CONFLICT/ASSET_UNAVAILABLE/ALREADY_RETURNED; đọc lại giữ nháp, không auto-write (`:14–18`).

Lifecycle đọc readiness, yêu cầu reason/ack/version theo form; archive chỉ applicable khi `canArchive && blockers.length===0` (`AdminProjectLifecycle.jsx:59`). Không có blanket Admin bypass; ngoại lệ legacy được duyệt nhưng còn chưa triển khai (UX-002). Không được gọi trạng thái này là đã DONE chỉ vì ADMIN toàn quyền nghiệp vụ.

### 4.7 Chat AI và nguồn/model

Chat được mount toàn shell (`AppEntry.jsx:56`), owner key theo user (`AiChat.jsx:14–17`). `GET /ai/projects` và `/ai/projects/{id}/features` là adapter riêng, không dùng workspace project list mặc định (`ai.js:23–24`, `AiChat.jsx:72,94–99`). Hội thoại mới POST `/ai/chats` mang provider/model, purpose `MY_PROJECTS` hoặc `PROJECT_CHAT`, targetId optional Feature; tin nhắn POST `/ai/chats/{id}/messages` với text/requestKey (`AiChat.jsx:127–143`). Request không rõ kết quả giữ key/body, “Kiểm tra yêu cầu” dùng lại request; lỗi chắc chắn phục hồi draft hoặc giữ failed bubble (`:145–158`).

Thread ghim provider/model/scope; đổi nguồn/model chỉ áp hội thoại mới; scope locked khi pending/generating. Preset gửi ngay nhưng giữ nháp tự viết; Enter gửi, Shift+Enter xuống dòng, guard IME (`:174–202,214`). UI ghi nguồn và context truncation/source reference; kết quả AI không tự thực hiện phân công/Issue write.

Provider options OPENAI_API, CHATGPT, OLLAMA do metadata/capability backend điều khiển (`AiConnections.jsx:12–16,80–109`). CHATGPT cần VERIFIED đúng model + plan permission + catalog ready; Ollama cần model catalog, API hệ thống chỉ hiện cấu hình, **không được suy metadata-ready thành live proof**. Authorize URL kiểm HTTPS/auth.openai.com ở UI; token/key không nhập vào form này (`:64–67`). Các điều kiện localhost/local owner và kiểm quyền context là tầng backend, không được chứng minh chỉ bằng frontend.

## 5. Loading/error/empty/guard/feedback: kết luận có giới hạn

Các seam đọc sâu có trạng thái loading, lỗi có retry, empty, pending và phản hồi save theo server. Pattern race gồm AbortController, generation, owner key, project key. `client.js` phân biệt network/timeout/status và 401; mô tả frontend cung cấp hỗ trợ UX, không thay authorization server.

Không được khái quát “mọi màn đều đầy đủ state” từ các seam này. Có các mẫu khác nhau: Note cho so sánh nội dung mới, assignment chỉ nhận version mới, Feature/file list chưa tự sửa page khi số trang co lại, một số form dùng native confirm còn admin dùng dialog trong app. Full role × route × state × device chưa được kiểm chứng. Trình đọc Markdown có tập cú pháp hạn chế; user text HTML được render như text chứ không rich content.

## 6. Known/Unknown, mâu thuẫn và nguy cơ mô tả sai

| Mã | Điều đã biết / nguồn | Điều còn thiếu hoặc ảnh hưởng tới báo cáo | Phân loại |
|---|---|---|---|
| FE-K01 | ADMIN toàn quyền không membership, `permissions.md:18`, `projectAccess.js:1–12` | Mục lịch sử “Admin observer chỉ đọc” ở cùng tài liệu đã bị thay thế; không dùng làm quyền hiện hành | Quyết định + implementation |
| FE-K02 | Retest ngoài phần mềm, C07; router `/tests/*` retired | Source legacy, test legacy và DB cũ vẫn tồn tại; không đưa workflow retest/run thành use case mới | Ranh giới mô hình |
| FE-K03 | C05 Status/P/NA; file 0% khi rỗng | Tiến độ 100% không chứng minh nghiệm thu, không dựng KPI/SLA | Đã chốt |
| FE-K04 | C04 AI PM liên dự án | Không kéo theo quyền CRUD/report ngoài project; TESTER/DEV không report management/bulk, nhưng vẫn đọc case/issue được giao | Đã chốt, enforcement backend riêng |
| FE-K05 | C10 report chỉ text, test 10→8 tại `ManagementAnalysisPage.test.jsx:176–179` | Đừng viết chỉnh báo cáo sửa số lỗi trong DB | Source + test mock lịch sử |
| FE-K06 | C14:147 chỉ thay block recent-work; overview source giữ status/milestones | Không thay cả overview thành bài giới thiệu; content SPIDER-PLUS match code chính xác (`ProjectInformation.jsx:9`) | Đã chốt + source |
| FE-K07 | C03 không hard limit hai người/file; form cho nhiều scopes | Không dựng business rule “tối đa hai Tester”; hai cột khác hai người tối đa | Đã chốt |
| FE-K08 | C09 unassigned picker và PM handover | Không suy mỗi user chỉ được membership một project hoặc PM chia máy qua phần mềm | Đã chốt |
| FE-O01 | UX-002 OPEN, `AdminProjectLifecycle.jsx:59` blockers phải rỗng | Chính sách ADMIN ngoại lệ legacy có lý do đã được chấp thuận, chưa có workflow thực thi; không viết đã giải quyết archive mọi dự án | Yêu cầu đã có, implementation còn thiếu |
| FE-O02 | UX-011 OPEN; `RulesPanel.jsx:5,24,30,34` còn build/environment/device/run DEMO | Contract/copy chưa đồng bộ mô hình Feature mới. Không dùng Rules DEMO như quy tắc chính thức khách hàng hoặc điều kiện Status mới | Mâu thuẫn hiện hành đã được ghi nhận |
| FE-O03 | `ProjectStatusReports.jsx:21` link `#/analysis?projectId=...`; `AppEntry.jsx:44–48` ADMIN chưa opt-in bị chuyển admin | Có khả năng đường từ history trong admin về analysis thiếu workspace=1. Chỉ suy luận source, chưa tái hiện, cần check trước mô tả link chạy thành công | Rủi ro seam chưa xác nhận runtime |
| FE-O04 | `ProjectDataProvider` còn legacy reads dù bảng mới Feature API | Không nói mọi API legacy đã bị bỏ; chưa đo request cost/race toàn app | Phụ thuộc source đã thấy |
| FE-O05 | Assignment conflict chỉ lấy latest.version, không trình full latest scopes | UX đối chiếu còn hạn chế; server overlap validation không thể suy từ form | Limitation source |
| FE-O06 | Report cuối ghi UAT/IME/touch/zoom200/screen-reader/live/upload/download chưa đủ | Không lấy 1100 test hoặc 1004 control declaration làm “mọi button hoạt động” | Evidence gap |
| FE-O07 | C02 chỉ giữ file/nội dung khi chuyển đổi, không bảo lưu kết quả/người/lịch sử/issue vào graph mới | AI phải nói thiếu kinh nghiệm khi không có history; không suy assigned name là năng lực hoặc lịch sử test | Giới hạn dữ liệu |
| FE-O08 | Link Google Drive/SharePoint trong ProjectInformation là nguồn người dùng đưa, C14:150 | Chưa truy cập/kiểm nội dung đích; CAT/SHIFT/Backlog là bối cảnh bên ngoài, không bằng tích hợp phần mềm | Chưa kiểm nguồn ngoài |

Không có câu hỏi nghiệp vụ mới bắt buộc chặn biên soạn phần frontend: C01–C14 đã chốt; các mục mở có thể ghi minh bạch thành hạn chế. Quyết định bổ sung có thật mới cần hỏi, không hỏi lại quyền ADMIN, giữ chat, report-only-text hoặc công thức P/NA.

## 7. Bằng chứng kiểm chứng lịch sử đã đọc trực tiếp

| Evidence | Nội dung được kiểm | Cách dùng đúng |
|---|---|---|
| `var/uiux-admin-entry-2026-10-19/frontend-verified-final-tests.json` | JSON success=true; 1100 total/passed; failed/pending/todo=0; `testResults.length=120`; numTotalTestSuites=160 | 1100 test trong 120 file. Không nhầm 160 suite metadata thành 160 file. Không phải lượt test mới của tác vụ Word |
| `var/uiux-admin-entry-2026-10-19/build-verified-final.json` | exitCode=0, 1701 modules, 9.17s, JS488.03kB gzip141.76, CSS188.40kB gzip33.58 | Build local lịch sử, không production deploy/performance SLA |
| `var/uiux-admin-entry-2026-10-19/final-validation.json` | capturedAt 2026-10-19T04:56:49.138Z; 320 source/config files stable trước/sau build/test; changed/missing/added=[]; coverage NOT_MEASURED_THIS_TURN; allButtonsPassed=false | Stable snapshot của lượt đó; không bằng đọc tất cả source hoặc coverage final |
| `docs/reviews/2026-10-19-admin-entry-uiux.md` | Các nhóm layout/focus/draft/read-recovery; receipt full đầu1080 PASS/1 FAIL, checkpoint1085 rồi final1100; browser có phạm vi riêng | Giữ cả lịch sử fail; không cộng các lượt chồng nhau hoặc xóa NOT_RUN |
| `docs/reviews/2026-10-19-uiux-polish.md:173` | Coverage checkpoint1047/115 files: S87.02/B83.4/F81.37/L87.74; source có delta trong lượt coverage | Không gán những % này cho final1100 hoặc UAT |
| `docs/planning/2026-10-19-fixreports-implementation-plan.md` checkpoint cuối + cutover | Tài liệu ghi mainV30→33,12GET200, bảo toàn7374row cũ (trừ session), browser có scope, migration exceptions | Chỉ là đối chiếu bản ghi lịch sử trong nhánh frontend; các receipt DB/runtime phải được reviewer backend kiểm riêng |
| `docs/planning/STATUS.json` | activeSprint S11; uiuxAdminEntry cuối; FR12/S11 IN_REVIEW | Trạng thái quản lý; không tự chứng minh DoD |

Đã đọc assertion body của `DocumentAssignments.test.jsx:10–46`, `TestingDocumentPage.test.jsx:9–66`, và các nhóm `ManagementAnalysisPage.test.jsx:172–219` cùng mock setup. Chúng chứng minh test code có kiểm self rowIds, conflict giữ range, không gửi PM membership giả, P/NA60%, không run/device inputs, row header/deep-link, report save/download không đổi issue count, capability/revocation và stale response. Tất cả sử dụng mock API, không phải native DB test. Receipt lịch sử là bằng chứng những file ấy được chạy trong bộ full; không claim đã chạy lại.

`frontend-module-map.json` lưu mọi file test trong receipt và assertion count để người tổng hợp đối chiếu. Không sao chép test names thành acceptance criteria; AC phải mô tả kết quả nghiệp vụ, và mapping xuống test là riêng.

Kiểm tra đọc-only bổ sung trong lượt review báo cáo: tính SHA-256 trực tiếp cho toàn bộ 320 đường dẫn của `source-verified-after.json` và so với receipt: **320/320 khớp byte, không thiếu, không khác, không có trường hợp chỉ khác xuống dòng**. `git diff --stat 9ccc734 -- Frontend Backend` rỗng. Kết quả này tăng độ chắc chắn rằng receipt frontend lịch sử gắn đúng source hiện hành; vẫn không biến thành lượt test mới, coverage mới hoặc UAT mới.

## 8. Gợi ý traceability cho người biên soạn báo cáo

| Luồng/nhóm yêu cầu | Quyết định | Nguồn UI/request | Sơ đồ phù hợp | Evidence |
|---|---|---|---|---|
| Quản lý Feature/file | C01,C02,C08 | TestingFeaturesPage → TestingFeaturePage → featuresApi | Điều hướng, sequence import preview/commit, ERD do backend xác minh | Module tests receipt, native evidence từ backend |
| Tự nhận/phân công | C03 | DocumentAssignments → PUT assignments | Activity phân vai PM/Tester; sequence version conflict | DocumentAssignments.test, backend transaction riêng |
| Ghi Status/tiến độ | C05,C07 | TestingDocumentPage → useDocumentResults → row/result | State vòng5 trạng thái + note không phải Issue state; sequence save/reload | TestingDocumentPage.test:19, full receipt |
| Issue/monkey | C06,C13 | CaseIssueAction/FeatureIssueForm/Detail → issues API | Use case BUG/QA, sequence prefill/save/badge; không vẽ typedQA cũ vào current workflow | Full receipt + native Issue reviewer backend |
| Báo cáo | C10 | ManagementAnalysisPage → management-reports | Sequence AI proposal → editor → explicit save; storage text khác source data | ManagementAnalysisPage.test:176,184; native report receipt riêng |
| Note | C11 | ProjectNotes → notes API | Use case CRUD/read, sequence409 compare | Full frontend receipt; backend enforcement riêng |
| Admin/máy | C09,C12 | AdminProjectForm/DeviceAllocationDialog/AdminAudit | Activity Admin→PM nhận máy, context phân phối ngoài | Test/browser lịch sử có phạm vi |
| AI | C04,C10,C11 | AiChat/AiConnections → chat/provider endpoints | Context actor/data boundary, sequence thread pinned scope/retry | Source + mock receipt; live quality chưa chốt |
| Tổng quan | C14 | ProjectOverview → Issue totals + milestone catalog + ProjectInformation | Điều hướng/block layout | Recheck scoped historical proof; không gọi là toàn app UAT |

Khi kết hợp với Word gốc, thêm cột “mục Word” bằng mã mục thực tế do parser/renderer xác nhận. Không tự đoán mã chương, số trang hoặc tên use case từ review này.

## 9. Coverage đọc source của reviewer này

Đọc đầy đủ hoặc gần đầy đủ phần logic chính: App/AppEntry; AppRouter/routeInfo/legacyRoutes; AuthProvider/AuthBoundary; ProjectProvider/projectAccess; client/features/featureIssues/managementReports/notes/projects/admin/testCases/ai adapters; TestingFeaturesPage/TestingFeaturePage/TestingDocumentPage/testingState; DocumentAssignments; useDocumentResults/ResultCycleButton/ImportExcelDialog; WorkBoardPage/FeatureIssuesPage/FeatureIssueForm/FeatureIssueDetail/CaseIssueAction; DashboardPage/ProjectOverview/ProjectInformation/AnalysisPage; ManagementAnalysisPage/ProjectNotes/ProjectSettingsPage/RulesPanel/HandbookPanel/ProjectDevices; AiChat/AiConnections; AdminDashboard/ProjectStatusReports; ProjectData; SafeMarkdown; Sidebar. Một số output dòng JSX dài bị công cụ cắt phần hiển thị; các seam được trích trong bảng đã được đọc qua lượt chọn dòng/tìm pattern trước hoặc sau, không tuyên bố đã review từng byte.

Đọc có chọn lọc symbol và call sites: AdminProjects/AdminProjectDetail/AdminUsers/AdminDevices/AdminAudit/AdminProjectLifecycle/AdminProjectForm/InitialDevicePicker/DeviceAllocationDialog/UserCreateDialog/AdminLayout/shared/AccountMenu. Đã kiểm kê nhưng chưa đọc sâu: CSS toàn bộ; dialog focus internals, SelectionTable/TableScroll, ReportDraftProvider/AiEditBuffer internals; DocumentCellEditor/DocumentAssignmentHistory/DocumentResultHistory; các legacy screens/apis; toàn bộ test assertions ngoài nhóm nêu mục7. Các cơ chế này được nhắc theo caller hoặc báo cáo lịch sử, không nâng thành kết luận kiểm chứng độc lập nội bộ hook.

Excluded khỏi đọc sâu: node_modules, dist, build/cache/generated, binary asset, log dài và dữ liệu khách hàng ngoài repo; không tải Drive/SharePoint; không đọc secret config. Nhánh review này không xác nhận schema runtime, deployment, browser paint hiện tại, throughput, accessibility toàn diện hoặc chất lượng câu trả lời AI thực tế.
