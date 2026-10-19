# Rà soát lại reports / AI / shared shell và trạng thái route

Ngày 19/10/2026. Đây là **SOURCE_REVIEW**, kèm một lượt test component dùng API giả lập; **BROWSER_NOT_RUN / HTTP_NOT_RUN / DB_NOT_RUN / LIVE_AI_NOT_RUN** bởi reviewer này. Root là người duy nhất điều khiển trình duyệt. Không sửa source sản phẩm, cấu hình, database, tài khoản, process hoặc provider/OAuth/probe. Không triển khai sửa lỗi. Tài liệu này bổ sung, không ghi đè các báo cáo audit trước.

## Phạm vi và quyết định mới nhất

Đã đọc lại toàn bộ các component reports/AI đang hoạt động, API client liên quan, router/layout/header/sidebar/project provider và các file CSS tương ứng; đối chiếu các backend projection/read/CRUD đang phục vụ chúng. Các dòng source dưới đây là mốc lúc rà lại, trước phần sửa Tổng quan riêng do root thực hiện. Không tuyên mã Tổng quan sau khi root sửa đã được nghiệm thu từ lượt đọc này.

**Điều chỉnh cách hiểu Tổng quan:** người dùng chỉ yêu cầu thay khối **Công việc tạo gần đây** bằng **Thông tin dự án**, không yêu cầu bỏ toàn bộ dashboard. Cần giữ/khôi phục **Trạng thái công việc** và **Mốc phát hành** nhưng bám dữ liệu Feature Bug/QA hiện hành. Nhận định trước đây rằng chỉ còn bài giới thiệu là đủ phải nhường cho yêu cầu mới nhất này. Root sở hữu thay đổi và kiểm trình duyệt Tổng quan; reviewer này chỉ chỉ ra seam/API và các rủi ro nối dữ liệu bên dưới.

Không mở lại luồng run/session/retest/handoff cũ để khôi phục dashboard. Không suy quyền đọc AI liên dự án thành quyền đọc dashboard/quản lý dự án ngoài phạm vi. Main V33/8080 đã có bằng chứng lịch sử trong báo cáo trước; lượt này không gọi API hoặc kiểm runtime nên không đưa ra xác nhận môi trường mới.

## Skill → công việc thực tế → bằng chứng

| Skill đã đọc và dùng lại | Công việc | Bằng chứng / giới hạn |
| --- | --- | --- |
| `frontend-patterns` | Truy vòng đời route/project/account, nháp, khóa đồng bộ, request cũ, retry và scroll | UX-004, R06/R07/R08 được truy lại bằng source; test ManagementAnalysis/AiChat dùng API giả lập. Không coi test hiện có là test tái hiện đầy đủ các rủi ro. |
| `frontend-ui-engineering` | Rà tên nút/label, focus, trạng thái vô hiệu, nonmodal chat, sidebar modal, vùng bảng/cuộn | Bảng control/state bên dưới; CSS và hook đọc lại. Không đo geometry/contrast/zoom/touch hoặc kiểm screen reader. |
| `api-design` | Đối chiếu summary/catalog/current Issue/milestone, giới hạn quyền, create/update/download/idempotency | Phân tích seam Tổng quan và R08; không đổi contract hoặc gọi endpoint. |
| `security-review` | Giữ account ownership, che nội dung khi mất quyền, scope project, safe Markdown và link ngoài | AppEntry/AiConnections/AiChat/SafeMarkdown/client; test giả lập quyền/mạng/pinned source. Không pentest hoặc gọi provider. |
| `code-review` | So yêu cầu hiện tại với toàn file, tách lỗi hiện hữu với rủi ro chưa tái hiện và loại mã đã nghỉ | Kết luận UX-004/012 vẫn còn cơ chế gây lỗi; cảnh báo không dùng nguyên legacy overview/CTA. Không tuyên hồi quy nếu không có mốc so sánh. |
| `ui-ux-pro-max` | Dùng lại kết quả tra cứu có mục tiêu từ audit trước về focus bị che và phản hồi submit; không chọn lại palette/font | Nguồn và giới hạn tra cứu đã ghi ở `var/uiux-audit-2026-10-19/reports-ai-source.md`. Lượt này kiểm source cụ thể; không tuyên chạy lại search hoặc đo tiêu chuẩn. |

## Kết quả revalidate finding/risk

| ID hiện hành | Kết luận source lúc rà lại | Source / bằng chứng | Phần chưa kiểm |
| --- | --- | --- | --- |
| **UX-004 / P2** | **Còn nguyên cơ chế mất nháp khi rời route/đổi project.** Nháp chỉ ở local state; guard chỉ quanh Feature/report/new. | `ManagementAnalysisPage.jsx:25,33,53–60,87`; `App.jsx:47–50` đổi route không hỏi dirty; `ProjectProvider.jsx:66–74` đổi project, workspace key làm remount. `AiEditBuffer` không được editor report sử dụng. | Không tái hiện browser lượt này; bằng chứng browser trước của root vẫn thuộc checkpoint trước. Test component hiện có kiểm guard bên trong editor, không kiểm away/back. |
| **UX-012 / P2** | **Còn nguyên sự khác phạm vi không được ghi rõ.** Feature select đổi metrics/Issue nhưng bảng Feature vẫn dùng toàn bộ catalog. | `ManagementAnalysisPage.jsx:41,85–86,104–108`; `ManagementReportService.java:34–39`: metrics/Issue theo Feature, query catalog36 theo toàn project. Không có heading visible nói bảng đang bỏ qua filter. | Không đo/đổi nội dung browser. Test chọn Feature hiện có chỉ chứng minh request nhận Feature ID, không phủ hai Feature có số khác nhau. Công thức P/NA không bị kết luận sai. |
| **R06** | **Còn rủi ro kéo người đọc lịch sử về cuối.** Cùng effect xử lý cả prepend, append và busy/outgoing. | `AiChat.jsx:96` gán `scrollTop=scrollHeight` trên mọi đổi turns/busy/outgoing;193 prepend lượt cũ. Test231–233 chỉ kiểm nội dung/cursor/không trùng. | Chưa có đo scroll anchor/viewport thật; giữ SOURCE_RISK, không nâng thành browser-confirmed chỉ vì 49 chat tests PASS. |
| **R07** | **Còn gộp lỗi đọc detail tạm thời với denied.** Reopen catch mọi lỗi đều set denied và clear turns. | `AiChat.jsx:71–78`;164 khóa gửi khi denied,201 gợi ý hội thoại mới/chọn lại history thay cho direct read retry. `perform`106–110 có phân loại quyền tốt hơn, nhưng không thay catch reopen này. | Chưa chạy controlled failure trên browser/backend. Giữ che dữ liệu thật khi401/403/404; không “sửa” bằng giữ nội dung bất chấp quyền. |
| **R08** | **Còn thiếu identity phục hồi create báo cáo khi mất phản hồi.** Khóa click đồng bộ có sẵn nhưng không chống POST mới sau timeout đã commit. | `ManagementAnalysisPage.jsx:57,64–65`: saved chỉ được gán khi await thành công; `managementReports.js:12`; `ManagementReportDtos.java:6` không có intent key; `ManagementReportService.java:60–61` INSERT mới. | Không tạo báo cáo/không mô phỏng commit thật. Test error/conflict hiện có không chứng minh đúng một row trong tình huống commit+lost response. Vẫn SOURCE_RISK, không tuyên đã có báo cáo trùng. |

### Các tiêu chí kiểm lại cần giữ

- UX-004: nháp giả ở A → rời route/quay lại và A → B → A phải giữ đúng nháp hoặc cho người dùng hủy/bỏ trước khi mất; account khác không thấy nội dung; không autosave dữ liệu nghiệp vụ. Cần kiểm riêng refresh/close.
- UX-012: danh mục select vẫn đủ mọi Feature, nhưng bảng/heading phải cho biết cùng hay khác phạm vi; các số selected A, Issue và đề xuất report không bị đánh đồng với B/toàn project. Không đổi công thức để chữa nhầm phạm vi.
- R06: thread dài nhiều trang, giữ turn/offset khi prepend; chỉ theo tin mới khi người đọc đang ở cuối hoặc chọn theo dõi. JSDOM không chứng minh bố cục thực.
- R07: GET detail lỗi mạng/503 một lần → retry cùng thread và nháp;403/404 hoặc đổi account vẫn che nội dung và loại late response. Không gửi tin hoặc tạo conversation để chữa lỗi đọc.
- R08: fixture cô lập cho commit+lost response → retry cùng intent → đúng một report ID/row; double click và thay nội dung/key kiểm riêng. Không thử bằng main writes.

## Kiểm kê lại các control / state / linkage đang hoạt động

Các hàng sau là **SOURCE_REVIEW / BROWSER_NOT_RUN**. “Mock PASS” chỉ áp dụng hành vi được test giả lập của lượt81 test bên dưới, không có nghĩa mọi state/viewport của hàng đã PASS. Inventory chi tiết26 biến thể từ audit đầu vẫn là nguồn bổ sung; lượt này không loại các state khó kiểm ra khỏi coverage.

| Nhóm / đường vào | Control và trạng thái đã đối chiếu source | Kết luận / giới hạn |
| --- | --- | --- |
| `/analysis`, `/progress` | PM của project/ADMIN; project loading/no project; worker denial; archived read-only | Router49–51, ManagementAnalysis19–25/29. Không đưa report vào dashboard để vô tình mở quyền cho TESTER/DEV. |
| Refresh summary | Tải lại số liệu, loading/error, empty cases/Feature/Issue, timestamp giờ VN | Có retry và request abort; không dùng mock fallback. Tải lại summary không reset editor, nhưng project provider refresh có thể unmount editor khi loading. |
| Feature select | Toàn dự án/Feature cụ thể/fallback Feature ID; dirty confirm; locked khi action/preview pending | UX-012 còn. `window.confirm` bảo vệ nội bộ; không bảo vệ sidebar/header/project exit UX-004. |
| Saved report catalog | Mở report, selected item, paginated20, lỗi+Tải lại báo cáo, empty, metadata Feature/thời gian | Open yêu cầu xác nhận bỏ nháp, action lock và lifetime abort. List thay trang không tự thay editor. Chưa kiểm browser dài/zoom. |
| Soạn/lưu report | Tiêu đề, Markdown, required/blank guard, input vô hiệu khi busy/archive; save success/error/conflict | Text giữ khi lỗi, update có expectedVersion; R08 create chưa có phục hồi uncertain intent. Chưa có field-level display cho mọi validation server, không nâng thêm finding chỉ từ khả năng này. |
| Tải bản đã lưu | Chỉ hiện sau saved; lấy server version, giải thích nếu draft dirty, download blob/link và notice | `ManagementAnalysisPage:81,95–96`; bytes đúng version đã lưu được mock test kiểm. Download thật của lượt này NOT_RUN. Busy chung có thể làm nút Lưu hiện “Đang lưu…” trong lúc download; đây là copy/operation-state concern nhỏ chưa đo tác động, không coi dữ liệu đã bị ghi. |
| Preview Markdown | headings/lists/code/http(s) links, empty text | SafeMarkdown React-escape HTML, không raw HTML; unsupported Markdown syntax không được tự suy là hỏng toàn Markdown. Test3 PASS; external links không được truy cập. |
| AI report proposal | Nguồn/model chưa sẵn sàng, disabled reason, tạo/check pending cùng request key, uncertain/FAILED/READY, explicit apply | `ManagementAnalysis:68–79,93–94`; không autosave hoặc ghi ngược Status/Issue. Manual draft tiếp tục soạn được khi preview chờ nhưng save/scope chuyển bị khóa. Provider execution NOT_RUN. |
| Chat launcher / minimize | Port vào workspace/Admin header; open dialog nonmodal; Escape trừ SELECT; focus composer/trả launcher | ChatLauncherSlot, Header32, AiChat173–179/95. Mock portal/Escape PASS; combined overlays/scroll/geometry ở320/390/768/1440/200% zoom chưa chạy. Không coi nonmodal chat thiếu trap là lỗi tự thân. |
| Chat Mới / phạm vi | Giữ composer khi đổi project/Feature hoặc New; whole permitted/project scope; Feature loading/error retry/archived option | AiChat83–99/182–187; request-active khóa scope. Quyền portfolio do API AI riêng, không ép dùng workspace membership list. |
| Preset questions | Manager/member prompts khác nhau, explicit one-click send, draft riêng không bị xóa | AiChat171/192, aiProjectPrompts. Mock guards + composition/preset/draft tests PASS; không có dữ liệu thật gửi đi. |
| Send / inspect / retry | Synchronous lock; Enter/Shift+Enter/IME229; SENDING/UNKNOWN/GENERATING/FAILED/READY; inspect cùng key; failure giữ outgoing/draft | AiChat100–148/194–202. Chặn request đang hoạt động, không gửi tự động khi đổi provider/scope. Real provider latency, quota hoặc sentence quality NOT_RUN. |
| Chat history list/detail | Cursor, no-results filtered page, older turns, pinned model/provider/scope; unavailable provider vẫn đọc; revoked context | AiChat38–61/188/193–201. Mock late-read protection PASS, nhưng R06/R07 vẫn cần fixture riêng. History button có thể dùng lúc gửi để xem danh sách, select thread khóa theo requestActive. |
| Copy / nguồn đối chiếu | Clipboard success/failure fallback, literal-safe answer, source disclosure, context-truncated notice, quota link | AiChat194; mock copy/escaping PASS. Clipboard và link browser thật NOT_RUN. |
| Cấu hình AI | Source/model catalogs, selected unavailable fallback, “API đã cấu hình/chưa live”, Ollama no-model/error, refresh | AiConnections12–16/80–109. Current conversation pinned không bị đổi bởi selection cho thread tương lai. Mock readiness PASS, không có calls tới provider thật. |
| ChatGPT/OAuth/probe | Missing permission, connect/reconnect/change account, allowlisted HTTPS auth.openai.com popup/fallback, cancel/poll; explicit quota probe, disconnect | Source đọc lại; các thao tác tương ứng trong suite dùng vi.fn/window.open giả. Không authorize/probe/disconnect thật và không mở link ngoài. Local owner/localhost quyết định ở backend, không tự biến tất cả thành ADMIN-only. |
| Sidebar/Header/project dropdown | Group expanded/collapsed/current, management menu scope, mobile drawer focus, project error/retry/empty/archive, account popup | Header/Sidebar/MainLayout/ProjectProvider/ProjectSelector. Lúc đọc chưa có sửa source ở các file này. Guard project deep link áp dụng luồng Feature; Issue thiếuproject URL vẫn thuộc UX-006 do owner khác. |
| `/ai`, `/admin/ai` | Retirement text + mở existing chat configuration; menu AI đã bỏ | RetiredAiEntry7–12. Không coi AiAssistantPage cũ là active route; AiConnections suite có một số test tái dùng AiWorkspace cũ, nên9 tests không đồng nghĩa9 hành trình hiện hành. |
| Shared tables/modal focus | TableScroll overflow hint/label/tabIndex/sticky, dialog focus excludes hidden/inert/closed details, modal topmost, Escape/return | Có source cho các state; không đo thật overflow/focus giữa chat và modal hoặc screen reader. No blanket global CSS fix. |

## Seam Tổng quan: khôi phục đúng khối mà không trộn legacy

### Không dùng nguyên `workItemsApi.overview`

`Frontend/src/app/services/api/workItems.js:13` gọi `/projects/{p}/work-items/overview`. Backend `WorkItemService.java:87–92` hiện:

1. Lấy30 work_items mới nhất mà không JOIN Feature context hoặc lọc BUG/QA/deleted.
2. Đếm Status trên **mọi** `work_items` trong project, không phân biệt legacy/current.
3. Mốc JOIN mọi work_items bằng milestone_id, `done` chỉ tính `status_code='closed'`; không lọc Issue ẩn hoặc Feature/file đã lưu trữ.

Đây là read API được giữ để đọc lịch sử, không phải bằng chứng nó phù hợp projection mới. Lấy nguyên kết quả để “khôi phục dashboard” sẽ trộn TASK/REQUEST/IMPROVEMENT, Issue graph cũ và dữ liệu hiện hành. Không sửa dữ liệu cũ thành Bug/QA để làm số đẹp.

`HomePage.jsx` cũ cũng không thể được gắn lại nguyên component: aside dùng bộ đếm toàn work item; mốc fallback từ `data.js`/issues nếu không được truyền data, có nguy cơ hiện nội dung mock. Các link Status183–189 là `/board/list?status=...` thiếuprojectId; link mốc210–216 là `/board/list?milestone=...`, trong khi active `FeatureIssuesPage.jsx:11–13` **không đọc milestone filter**. Vì vậy mốc clickable hiện sẽ mở danh sách không lọc mốc; đừng đưa lại CTA đó như đã hoạt động. Không tự thêm milestone linkage hoặc phân loại người dùng chưa yêu cầu.

### Các read/projection có thể tái dùng

| Nhu cầu | Seam hiện có | Phù hợp / giới hạn |
| --- | --- | --- |
| Status công việc hiện hành cho project reader | `FeatureIssueService.list:80–93`, `/projects/{p}/issues` | Authorize52–60 cho ADMIN không membership hoặc member project; query85 JOIN Feature context, BUG/QA, x.deleted_at NULL, Feature/file active. `totalItems` là count server, không lấy số dòng một trang làm tổng. Có thể tái dùng query/policy cho grouped-status projection hoặc dùng count có filter với chi phí request được cân nhắc. Không khôi phục WorkItem/QA handoff cũ. |
| Danh mục Status/nhãn | `FeatureIssueService.metadata:105–116` và `work-items/data.js` | Dùng vocabulary hiện tại, nhưng metadata không phải tổng số. Chốt semantics “hoàn thành” bằng terminal state hiện hành hoặc nhãn chính xác, không tự coi chỉ closed là toàn bộ terminal. |
| Mốc metadata cho project reader | `GET /projects/{p}/catalogs/milestones`, `CatalogService.java:192–196`, `projectsApi.listCatalog` | Có id/code/name/startsOn/dueOn/archived/version, kiểm `requireReadAccess`. API trả cả mốc lưu trữ nên UI/projection phải thể hiện/lọc có chủ đích. Không có current Issue count hoặc progress. Đọc metadata không phục hồi màn CRUD catalog đã nghỉ. |
| Mốc có current Issue scope/deadline | `ProjectDeadlines.java:20–43` | Projection có scopeCount, unfinished, deadlineStatus; JOIN explicit milestone_id + current Feature Bug/QA, loại deleted/Feature/file archive; timezone dự án, thiếu due hoặc scopeCount0 → INSUFFICIENT_DATA. Đây là component Java tái dùng được, **không có authorization riêng**; wrapper API phải enforce project reader. Không gọi Admin endpoint cho worker. |
| Endpoint đã trả ProjectDeadlines | AdminOverview/Admin project detail; `/projects/{p}/status-reports` và Admin status-report history | Admin endpoints bị SecurityConfig52 chặn ngoài ADMIN. Status-report endpoint18–19 kiểm PM project/ADMIN qua ProjectStatusReportService28–35 vì kèm narrative quản lý, không phù hợp mở cho TESTER/DEV. Không nới quyền endpoint quản lý chỉ để có mốc dashboard. |
| Management summary | `/projects/{p}/management-reports/summary`, ManagementReportService23–40 | PM project/ADMIN only, không dùng cho dashboard reader. Có Status case/Issue groups và full Feature catalog; không có milestone. UX-012 còn; xem thêm rủi ro soft-hide dưới đây. |

**Cách nối có giới hạn:** giữ bố cục dashboard và thay đúng khối Công việc tạo gần đây bằng ProjectInformation. Projection đọc Tổng quan nên có contract riêng hoặc mở rộng read seam phù hợp với project reader, tái dùng điều kiện current Issue và ProjectDeadlines. Không cần gọi API report quản trị hoặc đưa lại old HomePage hoạt động/run/handoff. Không tự cấp quyền chỉ để tránh403. Reviewer này không tạo endpoint/component.

**Lưu ý mốc chưa có linkage:** FeatureIssueService.create134–140 không đặt `milestone_id`; DTO Create/Update hiện không có milestoneId. Vì vậy mốc lịch sử có thể tồn tại nhưng không có current Feature Issue gắn rõ. Hiển thị đúng “Chưa có phạm vi hiện hành/Chưa đủ dữ liệu”; không gán Bug/QA vào mốc theo tên, không suy tiến độ0%/100% từ legacy, không đưa mẫu mock thay vào. ProjectDeadlines cũng **không có `done/total`** như HomePage cũ; không truyền nó vào renderer cũ rồi ngầm coi missing fields là0.

**AC đề nghị cho root khi sửa Tổng quan:** có fixture trộn legacy TASK, legacy BUG, current Bug/QA, soft-deleted Issue, file/Feature archive và monkey không file; Status counts chỉ phản ánh phạm vi đã định. Mốc không liên kết phải giải thích thiếu dữ liệu, mốc có explicit current scope phải đúng terminal/deadline/timezone; không nới quyền report. Status link giữprojectId và filter mà route hỗ trợ; mốc không có route filter thì trình bày read-only/giải thích, không giả click-through đã lọc. Kiểm project switch response cũ, loading/error/empty, all roles và viewport bằng root browser sau thay đổi.

## Một rủi ro aggregate bổ sung cần kiểm, chưa nâng finding runtime

**RA-RECHECK-R01 / data-state / SOURCE_RISK, P2 candidate nếu fixture xác nhận:** summary quản trị có thể đếm Issue thuộc file đã ẩn trong khi bảng Issue không đếm.

`ManagementReportService.java:39` hiện JOIN work_items→Feature context→Feature, lọc deleted/Feature archive nhưng **không JOIN/lọc import_batches.archived_at**. `FeatureIssueService.java:85` và `FeatureFacts.java:20,31,35` có điều kiện bỏ Issue thuộc document đã archive. Như vậy file ẩn có thể rời danh sách/current metrics mà Bug/QA của nó vẫn nằm trong summary quản trị và đề xuất AI report dùng summary đó. Monkey không document phải tiếp tục được tính. Đây khác UX-012 (Feature filter/full catalog), không gọi là cùng một lỗi CSS/scope.

Test `FeatureAiIntegrationTest.java:133–151` tên `archivedDocumentIssuesAreExcludedConsistentlyFromManagementAndWorkerFacts` kiểm `/issues` và context FeatureFacts cho PM/worker; **không gọi ManagementReportService summary**. Không dùng tên test/PASS cũ làm bằng chứng summary đã loại hidden-document Issue. Không chạy test backend hoặc ẩn file để tái hiện lượt này. Root cần đối chiếu rule phạm vi và fixture GET/read sau thiết lập cô lập trước khi nâng kết luận. Khi chọn aggregate cho Tổng quan, ưu tiên cùng active-scope query với current Issue list thay vì lấy nguyên summary39.

## Test giả lập đã thực thi và receipt

Chạy đúng4 file, không dùng browser/Vite server hay backend. Các component nhận API `vi.fn()` và auth/project mocks; OAuth popup/clipboard được giả lập. Có9 test AiConnections gồm caller AiWorkspace cũ như ghi rõ ở trên. Không gọi OpenAI/ChatGPT/Ollama, không authorize/probe thật, không gửi dữ liệu dự án thật.

```text
rtk proxy npm test -- src/app/features/reports/ManagementAnalysisPage.test.jsx src/app/features/reports/SafeMarkdown.test.jsx src/app/features/ai/AiChat.test.jsx src/app/features/ai/AiConnections.test.jsx --reporter=default --reporter=json --outputFile=../var/uiux-recheck-2026-10-19/reports-ai-mocked-tests.json
```

Thư mục chạy: `Frontend`. Vitest4.1.11, jsdom. Bắt đầu local10:24:49, thời lượng15.87s, exit0.

| File | PASS | FAIL |
| --- | ---: | ---: |
| ManagementAnalysisPage.test.jsx |20|0|
| SafeMarkdown.test.jsx |3|0|
| AiChat.test.jsx |49|0|
| AiConnections.test.jsx |9|0|
| **Tổng** | **81** | **0** |

Receipt: [reports-ai-mocked-tests.json](reports-ai-mocked-tests.json), đã đọc lại `success=true`, total81/passed81/failed0/pending0,4 file passed. **Coverage NOT_MEASURED; build/backend/native/HTTP/browser/live-provider NOT_RUN.** Suite PASS bảo vệ các hành vi hiện được assert; không bác bỏ UX-004/012 hoặc chứng minh R06/R07/R08 đã hết. Không viết test mới chỉ để assert một dòng CSS/source; chưa có RED→GREEN vì đây là audit, không sửa code.

## Bước tiếp theo có giới hạn

1. Root thực hiện thay đúng khối Tổng quan, kiểm grouped status/mốc theo current scope và route supported; reviewer không can thiệp file sản phẩm root đang sửa.
2. Giữ UX-004/012 mở; ghép browser evidence cũ/mới của root đúng checkpoint. R06/R07/R08 giữ SOURCE_RISK đến khi có fixture phù hợp.
3. Rà aggregate hidden document trước khi tái dùng summary cho Tổng quan; không mở thêm quyền report hoặc revive mã cũ để vá nhanh.
4. Browser các trạng thái dài, kết hợp modal/sidebar/chat,200% zoom, keyboard/touch/screen reader, download thật và các lỗi mạng có kiểm soát vẫn cần bằng chứng riêng. Không gọi mọi UI/control PASS từ81 test.
