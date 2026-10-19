# Báo cáo rà soát và sửa UI/UX — Reports / AI

Ngày 19/10/2026, nhánh `system-design`. **SOURCE_REVIEW + MOCK_COMPONENT_TESTS; BROWSER_NOT_RUN / HTTP_NOT_RUN / DB_NOT_RUN / LIVE_AI_NOT_RUN / OAUTH_NOT_RUN / PROBE_NOT_RUN** bởi reviewer này. Root phụ trách Chrome và thay đổi shared/global. Không chạy backend, thay config/env, tạo tài khoản, cài package, commit hay push.

## Phạm vi và căn cứ

Đã đọc toàn bộ source của `features/reports`, `features/ai`, adapter `pages/AnalysisPage.jsx`, CSS/test liên quan; truy read-only router, AuthBoundary, AppEntry và contract server để phân biệt luồng đang dùng với widget được giữ lại. Phần triển khai chỉ sửa:

- `Frontend/src/app/features/ai/AiChat.jsx`, `AiChat.test.jsx`, `ai.css`.
- `Frontend/src/app/features/reports/ManagementAnalysisPage.jsx`, `ManagementAnalysisPage.test.jsx`, `management-analysis.css`, `reports.css`.
- Thêm `features/reports/ReportDraftProvider.jsx` và `ReportDraftProvider.test.jsx`.

Các file khác đã dirty/untracked từ công việc trước không được tính thành thay đổi của lượt này. Không sửa `STATUS`, planning, Shell/global, Admin/testing/work-items hay backend. Root đã tự wire `ReportDraftProvider` ở `Frontend/src/AppEntry.jsx:12,56`; reviewer chỉ đọc lại wiring, không sửa AppEntry.

Skill đã đọc và áp dụng:

| Skill | Công việc thực tế | Bằng chứng |
|---|---|---|
| `frontend-ui-engineering` | Rà visible label, focus, native controls, loading/error/empty, long text, responsive, hierarchy | Ledger bên dưới; scoped CSS dùng semantic palette/radius, giữ cấu trúc sản phẩm và màu kết quả. Browser/contrast thực tế chưa đo. |
| `frontend-patterns` | Effect cleanup, async stale response, request lock, identity lifecycle, bộ nhớ nháp | Chat revalidation/scroll; report buffer keyed owner/project/report hoặc Feature; test delayed response và auth transitions. |
| `ui-ux-pro-max` | Rà quick-reference về feedback, focus, target size, wrapping, transform/opacity, reduced motion | Local search bằng Python có sẵn ngoài PATH, không cài: `C:/Users/admin/AppData/Local/Programs/Python/Python313/python.exe .../ui-ux-pro-max/scripts/search.py "loading feedback" --domain ux`. 3 kết quả; top `Feedback / Loading Indicators` phù hợp và được áp dụng cho stable busy/retry. Query trước `scroll position feedback` trả smooth anchor/horizontal scroll, không dùng làm bằng chứng giữ viewport chat. |
| `tdd-workflow` | RED hành vi trước sửa, GREEN dùng API/mock hoàn toàn trong bộ nhớ | Các receipt bên dưới. Không coi lỗi import thiếu provider ban đầu là RED hành vi; có lượt stub chạy được và fail đúng restoration/beforeunload. Không đo coverage, không tuyên bố đạt 80%. |

## Phân loại entry hiện hành

| Entry | Trạng thái | Căn cứ |
|---|---|---|
| `/analysis`, `/progress` | Đang dùng: `ManagementAnalysisPage`, chỉ PM của project và ADMIN | `routes/AppRouter.jsx:49`, `pages/AnalysisPage.jsx:3`, `ManagementAnalysisPage.jsx:20` |
| Chat ở header workspace/Admin | Đang dùng, độc lập route, owner-scoped | `AppEntry.jsx:56`, `AiChat.jsx:14`, `ChatLauncherSlot.jsx:5` |
| Cấu hình nguồn/model/OAuth UI trong chat | Đang dùng qua `AiSourceSelector` | `AiChat.jsx:191`, `AiConnections.jsx:80` |
| `/ai`, `/admin/ai` | Entry chuyển tiếp đã retire; không mount task assistant cũ | `routes/AppRouter.jsx:54`, `features/admin/AdminApp.jsx:24` |
| `AiAssistantPage` / `AiWorkspace` / `AdminAiPage` | Source được giữ lại và test regression; không coi là active route | `AiAssistantPage.jsx:32,38,43`; router ở trên |
| `ReportsPage` overview/progress/quality, `TestingOverview`, `ProgressPage` | Widget retained legacy; router hiện không dùng để thay Management Analysis | `ReportsPage.jsx:13`, `AppRouter.jsx:44–51`. CSS chung được làm mềm nhưng không khôi phục entry/luồng cũ. |

Các đường dẫn rút gọn tiếp theo thuộc `Frontend/src/app/features/ai/` hoặc `.../reports/` theo tên file; số dòng là source tại checkpoint này, có thể dịch nếu root sửa thêm.

## Ledger controls và trạng thái — Chat

Tất cả hàng là **SOURCE_REVIEW**, không ngụ ý từng tổ hợp đã được mở trong browser. Các trạng thái mock có test được nêu riêng ở phần receipt.

| Control / phần hiển thị | Hiện/ẩn, khóa và kết quả | Text, màu, viền, focus, long content |
|---|---|---|
| Launcher `Mở chat AI`, thu nhỏ, Escape | Ẩn launcher khi dialog mở; không render khi owner inactive. Thu nhỏ giữ nháp; Escape không chặn native SELECT. Focus mở về composer, đóng về launcher. `AiChat.jsx:99,183–186` | Icon có accessible label; header slot có kích thước 40px desktop/44px mobile, fallback floating. Dialog nonmodal. Entry transform/opacity 240ms, reduced-motion bỏ animation. |
| Provenance nguồn/model/phạm vi | Thread có cấu hình pin; thay nguồn chỉ áp dụng thread mới. Legacy thread hiện purpose/nguồn cũ, không suy diễn thành Feature mới. `:159–180,188` | Wrap tên project/Feature/model dài, helper text cấp phụ; surface mint-light, không dùng màu làm thông tin duy nhất. |
| `Mới` | Khóa khi đang có request/pending/GENERATING; invalidate request cũ, giữ free text, mở scope. `:105,172,189` | Native button, focus-visible; không tự gửi hoặc xóa free text. |
| `Lịch sử`, `Phạm vi chat`, `Cấu hình AI` | Disclosure loại trừ nhau; aria-expanded; cấu hình có aria-controls. Có thể xem disclosure trong khi gửi, các thao tác thay context khóa theo request. `:189–198` | Selected toolbar mint-light + viền, hover có transition fast; không animation width/height. Scope/config/history entry nhẹ 200ms, không chặn input chờ animation. |
| Project SELECT | Toàn bộ project được phép hoặc project cụ thể; khóa khi đang xử lý/tải chi tiết; đổi scope tạo thread mới và giữ free text. `:106,192–196` | Visible label, option dài giữ tên trong native menu. Portfolio label phân biệt ADMIN/PM/member. Không thêm source/task selector bị retire. |
| Feature SELECT và `Tải lại Feature cho chat` | Whole-project default; list loading/error; archived option disabled; selected target thiếu vẫn có fallback rõ ràng, không silently downgrade. Retry chỉ read catalog. `:88–98,163–173,194` | Native label, disabled state, alert ngay phần liên quan. Wrap lỗi; không gửi trước khi target được xác nhận. |
| Câu hỏi preset và disclosure `Câu hỏi về dự án` | Chỉ portfolio/project mode; gửi ngay một lần khi canSend. Giữ nháp nhập tự do. TESTER/DEV dùng personal scopes, PM/ADMIN có management prompts. `:180,202`, `aiProjectPrompts.js:3–26` | Summary target 44px; các nút wrap, 2 cột hoặc 1 cột <=360px. Copy nói rõ gửi ngay; không đổi nội dung preset ở lượt này. |
| History row / current item | Pinned provider/model/purpose; row disabled khi request/detail loading; `aria-current=true` phản ánh thread đang mở. `:198` | Selected row đã dùng được style viền/surface cũ; text dài wrap. Không chỉ dựa màu để xác định current. |
| `Xem hội thoại cũ hơn` | Dùng server cursor, cho phép trang filtered-empty có nextBefore; chống duplicate row. `:42–45,198` | Busy disabled; không giả empty khi còn loading hoặc load error. |
| `Xem tin nhắn cũ hơn` | Khóa trong busy/detail error/denied; prepend dedup theo ID và giữ vị trí đang đọc. `:100–104,203` | Không kéo người đọc về cuối vì busy. DOM scroll anchor tự xử lý theo delta height; CSS tắt native overflow-anchor để tránh hai cơ chế cùng điều chỉnh. |
| Transcript READY / FAILED / GENERATING | Log có polite live region. READY là text literal; sources disclosure; FAILED có lỗi/tùy lỗi quota có Usage link; GENERATING cần explicit inspect. `:204` | Question/answer tách mặt nền nhẹ; nhãn Bạn/AI và provenance. Long token pre-wrap/anywhere; không HTML render raw. Không animate toàn bộ list tin nhắn. |
| `Sao chép câu trả lời` | Chỉ READY; success notice, clipboard failure hướng dẫn chọn text; không thực hiện send. `:204` | Icon + visible label, focus/hover. Actual clipboard không chạy, chỉ mock. |
| `Gửi lại tin nhắn` FAILED | Explicit mới dùng requestKey mới; free text mới đang soạn giữ nguyên. `:127–155,204` | Giải thích tin chưa gửi được và giữ nội dung. Nút khóa theo canSend. |
| Optimistic outgoing SENDING/UNKNOWN/FAILED | Hiện câu hỏi ngay trước create thread kết thúc; UNKNOWN giữ pending/key để inspect, FAILED giữ text hoặc hồi composer không đè nháp mới. `:127–155,204` | Text trạng thái rõ, không dùng spinner/màu làm bằng chứng AI đã thành công. |
| `Kiểm tra yêu cầu chat` | Pending dùng cùng request/key/body; nếu server GENERATING thì tiếp tục explicit check. Busy/denied khóa. `:157,211` | Không tự tạo paid retry hoặc đổi provider. |
| `Tải lại dự án và lịch sử` | Có khi initial/reopen scope reads fail; giữ draft, khóa gửi, retry read mà không send. `:30,66–86,173,208` | Error cạnh recovery; empty state không xuất hiện đồng thời với load lỗi. |
| `Tải lại hội thoại` | Transient reopen failure giữ cached turns và draft, khóa gửi tới GET revalidation thành công. 401/403/404 vẫn xóa turns/deny. `:77–83,173,209` | Recovery surface gọn, explicit text chưa xác nhận dữ liệu. Reopen/retry thành công xóa banner lỗi cũ. |
| `Mở cấu hình AI`, `Mở phạm vi chat` recovery | Chỉ hiện theo provider/feature lỗi; mở đúng disclosure, không route tới assistant cũ. `:210–213` | Native buttons, visible context; không gửi provider request khi chỉ mở disclosure. |
| Composer và send icon | Native form; Enter gửi, Shift+Enter xuống dòng, composing/229 không gửi; max2000; có count; free text tiếp tục sửa trong request. Send khóa readiness/scope/permission/pending/detail validation. `:173,214` | Visible label, min16px input trên mobile; border/focus theo token. Error/footer cao có max-height + overflow; cần browser kiểm ở keyboard viewport thấp. |
| Empty/archived/denied/session states | Empty chỉ khi đọc xong và không lỗi; archive chỉ read; denied gợi ý New/history. Same-owner expiration giữ nháp nhưng app không truy cập được; owner khác reset. `:37–41,199–201,213` | Thông báo bằng chữ; không dùng loose numeric `0` hoặc fake chat answer. Session/portal visibility thuộc shared AuthBoundary/root, không tự sửa tại đây. |

## Ledger nguồn và kết nối AI

`AiConnections.jsx` được đọc toàn bộ, giữ logic hiện có; chỉ style thông qua `ai.css`. Không gọi các thao tác dưới đây ngoài mock.

| Control / state | Điều kiện, action, nguồn | Review |
|---|---|---|
| Nguồn AI / Model AI | `:80–90`; disabled do caller/loading/busy/authorization attempt, model thiếu có fallback selected unavailable | Native label, 44px, wrap container, readonly reason rõ. Available không bị đánh đồng live verified. |
| `Kết nối và hạn mức` details | `:91–107`; accountLabel/plan/version/failure theo connection | Summary 44px; text dài wrap; không bịa account/plan, không auto OAuth. |
| `Tải lại nguồn AI` | `:95`; disabled khi blocked; explicit read refresh | Keyboard native, token focus/hover; catalog failure có alert và giữ model không sẵn sàng. |
| Kết nối / kết nối lại / cấp quyền gói | `:96–98`; chỉ ChatGPT enabled và trạng thái tương ứng | Label phân biệt identity/plan/model. Popup/fallback chỉ auth.openai.com HTTPS được frontend chấp nhận. Không kiểm live. |
| Kiểm tra model / kiểm tra lại | `:69–74,98`; exact model/catalog, có dùng hạn mức; pending giữ key | Hành vi quota/readiness giữ nguyên; không tự probe trong browser lượt này. |
| Ngắt kết nối / đổi tài khoản | `:77,99–100`; chỉ connection state phù hợp; synchronous action lock | Success copy phân biệt xóa local với remote revoke. Không đổi quyền backend/nguồn. |
| Hủy đăng nhập / link chính thức / Usage / Ollama | `:102–106`; trạng thái và provider tương ứng | Link rel an toàn, underline/focus; cancel có thể dùng để kết thúc authorization attempt. Không mở link thật. |
| Polling, owner switch, lỗi diagnostics | `:29–60,63`; abort/current guard, timers cleanup | Test mock có untrusted URL, exact-model readiness, stale-owner metadata. Không xem test đó là xác nhận provider hoạt động live. |

## Ledger controls và trạng thái — Management Analysis

| Control / vùng | Visible/hidden/disabled, linkage và pending | Text / visual / keyboard |
|---|---|---|
| Entry loading/no project/deny | `ManagementAnalysisPage.jsx:20–26`; PM của project hoặc ADMIN; TESTER/DEV không fetch | Heading/paragraph rõ; không mount retained ReportsPage để lách quyền. |
| `Tải lại số liệu` | `:104`; read summary revision; lỗi không thay fake0 | Giữ nút riêng dễ tìm; request cũ abort. Không thay editor/AI input. |
| `Phạm vi Feature` | `:106`; whole-project/Feature/fallback ID; internal dirty confirm; khóa khi action/preview pending | Scope số liệu hiển thị tại summary. Không làm mất full Feature catalog để sửa nhầm scope. |
| Tiến độ và legend OK/NG/P/NA/Unexecuted | `:127–133`; exact counts và display rounding; có asOf Việt Nam | Giữ toàn bộ result tokens và công thức P/NA. Text/legend đi cùng màu; percentage tabular. Không fake progress khi chưa có case. |
| Bảng Feature | `:133`; server trả toàn project dù metrics đang filter | Heading mới `Đối chiếu tiến độ toàn dự án`; source fixture A/B test giữ B trong table và select, metrics A riêng. Scroll wrapper cho bảng rộng, không ép chữ vào cột hẹp. |
| Bảng Bug/QA | `:134`; group theo scope metric, status label dùng work-board vocabulary | Table header rõ, row hover nhẹ, long text wrap; empty state. Backend hidden-file risk vẫn riêng ở phần remaining. |
| `Báo cáo mới` | `:108`; chỉ writable, locked khi pending; dirty confirm | Không tự lưu, discard rõ; reset xóa cache entry hiện tại. |
| Report list row | `:110–111`; danh sách toàn project; selected current, locked; open GET có action status | Full width/wrap title, separator nhẹ, scope/date phụ. Opening không hiển thị `Đang lưu…`. |
| List retry, trước/sau | `:110–111`; error riêng; trang đầu/cuối/locked khóa đúng | Loading/empty/error khác nhau, pagination gọn, native buttons. |
| Editor title/Markdown | `:113–122`; required/title200; writable và busy khóa fieldset; text literal Markdown preview | Label thật, line-height1.6, radius-control8px; textarea resize dọc, mobile16px. SafeMarkdown escaped HTML và URL allowlist http/https, không render raw. |
| `Lưu báo cáo` | `:81–88,121`; title/body nonblank, writable, request lock; update expectedVersion; restored entry phải revalidate | Pending chỉ nói lưu khi đang save. Save/error không sửa metrics/Issue. Conflict giữ editor. Chưa có idempotency cho create; remaining R08. |
| `Tải bản đã lưu` | `:101,121–122`; chỉ khi saved, download saved revision, disabled busy | Operation status riêng; khi dirty giải thích file là saved revision. URL object được revoke; test download mock. |
| AI `Tạo gợi ý` / `Kiểm tra gợi ý` | `:89–100,118`; writable, provider ready hoặc pending cũ, action/preview locks, same key | Source/model visible; disabled reason accessible. Manual editor tiếp tục dùng khi AI không ready. Không tự lưu hoặc cập nhật business data. |
| `Đưa vào bản soạn` / proposal | `:119`; chỉ khi proposal có kết quả; explicit replacement Markdown; chưa save | AI proposal surface nhẹ khác preview; không tự đè editor khi response đến. Proposal không nằm trong buffer/tab persistence. |
| Read-only archive | `:105,121`; input disabled, New/Save/AI generation ẩn, saved report có thể mở/tải | Có status `Chế độ báo cáo`, không bắt người dùng đoán vì sao input xám. |
| Dirty guard nội bộ | `:73–80,108`; New/Feature/open Report confirm | Decline giữ draft. Route/project dùng memory restoration bên dưới, không thêm guard điều hướng global. |
| Nháp khôi phục | `:31–38,54–69,114–117`; owner/project/report/newFeature key, restore text+baseline+identity; existing saved GET version | Loading verification không ghi đè text; conflict/error khóa Save; `Đối chiếu lại bản đã lưu` retry; reopen current report explicit confirm để bỏ sửa. |
| Revalidation permission failure | `:37–42,60–68,102`; server401/403 hide workspace | Không giữ data visible trong accessDenied view. Buffer vẫn theo cùng owner và chỉ đọc qua quyền frontend/root gate; logout/identity clear. |

## Ledger bộ nhớ nháp và retained widgets

`ReportDraftProvider.jsx:5–38` dùng actual `user.id` làm identity key, tách active theo auth status bằng ref hiện hành. Expired/unavailable giữ cùng instance và Map; read/write/remove bị khóa khi inactive. Context thông báo active thay đổi để editor reconcile cache khi cùng owner đăng nhập lại; `ManagementAnalysisPage.jsx:55–61` nhớ entry đã buffer, dọn đúng entry cũ khi một save đã được xác nhận trong lúc app bị khóa. Không ghi cache khi inactive. Logout (`user=null`) hoặc đổi tài khoản tạo owner mới và dọn owner cũ. Không localStorage/sessionStorage, server autosave hoặc background send. `beforeunload` chỉ cảnh báo khi Map còn dirty. Root đặt provider **bên trong AuthBoundary, bên ngoài AiEditBuffer**, nên route/project return cùng owner giữ nháp.

Buffer chỉ giữ `editor`, `baseline`, `featureId`, và saved identity `{id,featureId,version}`; không lưu response AI, provider credential, proposal hoặc pending paid request. New report key `new:<Feature>`, saved report key `report:<id>`, có project prefix. Save thành công/explicit discard xóa entry; hành vi delete không có trong UI này nên không bịa thêm nút delete. Promise sau disposal bị abort/guard, không ghi kết quả vào buffer. Refresh/đóng hẳn tab mất memory; native beforeunload không phải cơ chế persistence.

Đã rà retained `ReportsPage.jsx:17–87`: refresh/export/cycle/build/paged cycle/source pagination/bug pagination và link, loading/filter error/export error/empty/missing project/late-response guards; `reports.test.jsx` mock các trạng thái này. Không đổi action/state vì router hiện đã thay entry, chỉ generic surface/radius/text palette tại reports.css; giữ mọi result-specific style.

Đã rà retained `AiAssistantPage.jsx:43–165`: task/target search, Enter search, target loading/error/retry/empty/hasMore, generation pending same key, history pagination, output state, editor/save/reset/copy/original/source links, archived/denied/unavailable/owner buffer. Không đưa task/source selector này trở lại chat. `AiEditBuffer` và `ChatLauncherSlot` không được sửa. Các test retained chạy để tránh CSS/component import làm hỏng widget nhưng không tính thành active browser coverage.

## Thay đổi đã sửa và bằng chứng

| ID / mức | Trước sửa, nguyên nhân | Sau sửa / acceptance | Bằng chứng |
|---|---|---|---|
| R06 / P2 source behavior | Prepend hoặc busy luôn gán scrollTop=scrollHeight | Prepend giữ offset bằng delta height; không scroll chỉ vì busy; chỉ follow latest khi ở cuối hoặc vừa chủ động gửi | RED scrollTop1600 thay720 → GREEN mocked geometry720; `AiChat.test.jsx`, `reports-ai-red.json`, `reports-ai-final.json` |
| R07 / P2 source behavior | Mọi lỗi reopen đều denied và xóa turns | Transient giữ turns/draft, khóa send và có retry; auth401/403/404 vẫn xóa/deny | RED thiếu retry và mất answer → GREEN gồm 3 deny variants, no send; latest revalidation clears stale error banner |
| CHAT-RECOVERY / P2 | Initial read error chỉ có thông báo, không có retry tại chỗ; history current không có aria-current | Retry project/history giữ draft, không auto send; row current có semantic/visual state | `reports-ai-recovery-red.json` 2 fail → full GREEN; banner follow-up riêng RED1→GREEN57 |
| UX-004 / P2 | Local report state mất khi route/project remount | Owner memory restoration + saved-version GET, không overwrite; late-save result không đổi buffer; save/discard clears | Behavior RED5 fail; auth integration RED2 fail → provider7 + management26 GREEN33; root wiring đọc lại ở AppEntry56 |
| UX-012 / P2 clarity | Filter metrics/Issue, table tất cả Feature nhưng nhãn không phân biệt | Visible scope metric + heading/copy full-project table; không đổi backend/query/formula | `reports-scope-red.json` fail1; two-Feature fixture GREEN trong management27 |
| REPORT-FEEDBACK / P3 | Open/download dùng busy chung làm Save nói `Đang lưu…`; archive chỉ disable không giải thích | Action-specific accessible status và archive read-only status | RED2 → GREEN; operation lock giữ nguyên |
| VISUAL / polish | Viền teal đậm/khác nhau, radius rải rác, chat pop thẳng và các panel chưa có entry/reduced-motion riêng | Border-light/surface/token palette; control8px/panel12px, chatentry240/disclosure200/hover140ms, reduced-motion; report list/editor/AI/preview grouping rõ | Source CSS review, không test chỉ để assert CSS. Browser còn pending root. |

## Receipts kiểm thử

Tất cả lệnh dùng `rtk proxy npm test -- ...`, cwd `Frontend`, Vitest4.1.11/jsdom, API giả lập trong bộ nhớ. Clipboard/window.open/download được mock; không test nào gửi project data tới provider hoặc DB.

- `reports-ai-red.json`: 76 tests, **4 fail/72 pass** trước sửa viewport/transient recovery/report pending/archive copy.
- `reports-ai-green-behavior.json`: **76/76 PASS** sau sửa nhóm trên.
- `reports-ai-recovery-red.json`: **2 fail**,54 skipped theo `-t`, cho initial retry/current history. Skipped là filter có chủ ý, không phải coverage.
- `reports-draft-red.json`: lỗi import skeleton chưa tồn tại, **không dùng làm RED hành vi**.
- `reports-draft-behavior-red.json`: stub có API hook chạy được, **5 fail/4 pass/20 filtered**; đúng restoration/beforeunload.
- `reports-ai-draft-green.json`: **85/85 PASS**,3 suites trước auth integration bổ sung.
- `reports-draft-auth-red.json`: **2 fail/5 pass** xác nhận key theo status làm remount app khi expired/unavailable.
- `reports-draft-auth-green.json`: **33/33 PASS** provider7 + management26 sau sửa actual-owner key, active ref và StrictMode lifecycle.
- `reports-scope-red.json`: **1 fail**,26 filtered; fixture A/B scope clarity.
- `reports-ai-final.json`: **127/127 PASS**,8 suites, start10:52:22 local,12.08s; gồm chat56, management27, provider7, connections9, retained assistant14, retained reports9, SafeMarkdown3, aiErrors2.
- `chat-recovery-banner-red.json`: **1 fail**,56 filtered cho stale network banner sau reopen thành công.
- `chat-recovery-final.json`: **57/57 PASS** latest Chat suite, start10:53:33 local,12.74s. Đây là follow-up sau full127, không nói đã có một lượt full128.
- `reports-draft-save-auth-red.json`: **1 fail**,27 filtered xác nhận stale dirty cache/beforeunload sau save hoàn thành trong lúc expired rồi cùng owner đăng nhập lại.
- `reports-draft-save-auth-green.json`: **35/35 PASS**, provider7 + management28 sau sửa active-context notification và dọn đúng buffered entry; start10:57:11 local,14.00s. Đây là latest của nhóm reports/provider. Chưa có một lượt full129: full127 cộng hai follow-up kiểm tra phần thực sự đổi, không cộng số PASS trùng thành coverage.
- `reports-draft-locked-remount-red.json`: **2 fail**,28 filtered tái hiện finding review độc lập: route report remount khi expired/unavailable đọc null một lần, sau active clean-state xóa nháp cũ.
- `reports-draft-locked-remount-green.json`: **39/39 PASS**, provider7 + management32, start11:01:55 local,4.76s. Thêm hai biến thể nháp mới và hai biến thể nháp saved cho expired/unavailable; khi inactive không có editor/private text/GET saved report, khi active phục hồi nháp rồi GET version v4 để khóa save nháp v3. Đây là latest reports/provider, thay cho checkpoint35 phía trên.
- `reports-401-reauth-red.json`: **3 fail/1 pass**,32 filtered. Cùng owner reauth không thoát accessDenied sau401; real403 đã giữ deny; failure/retry và denied-after-reauth chưa có.
- `reports-401-403-race-red.json`: **1 fail**,37 filtered. Deferred list403 được xử lý cùng batch với successful reauth-summary200; setter không bảo toàn forbidden làm workspace hiện lại.
- `reports-401-reauth-green.json`: **45/45 PASS**, provider7 + management38, start11:07:52 local,5.20s; latest reports/provider. Bao gồm same-owner recovery401 giữ nháp, initial403/recovery403 và concurrent403 vẫn deny, read-retry khi mạng lỗi, save401 không tự replay update/preview và vẫn giữ expectedVersion3. Không cộng các receipt trùng thành tổng coverage.
- Scoped `git diff --check`: exit0, chỉ cảnh báo LF/CRLF repository, không lỗi whitespace. CSS generic report token hóa cuối không thay hành vi và không viết/rerun test chỉ cho CSS.

**Coverage NOT_MEASURED; build NOT_RUN bởi reviewer; browser/focus/touch/reduced-motion/actual geometry NOT_RUN.** Root sẽ làm build và Chrome tại checkpoint chung. Mock viewport chứng minh thuật toán delta, không chứng minh paint/focus/scroll thật trên thiết bị.

### Delta cuối từ independent review — locked route remount

Root yêu cầu tạm dừng independent Testing review để sửa P2 về owner draft. `ManagementAnalysisPage.jsx:26` hiện trả `DraftWorkspaceGate` keyed project; `:29–37` là gate. Gate giữ latch admitted khi editor từng được mở trong phiên active, nên expired/unavailable không remount editor đang có. Nếu browser Back/hash làm route mới mount trong retained locked subtree, gate chỉ hiện status an toàn, chưa mount Workspace hoặc đọc nháp. Active trở lại mới mount Workspace lần đầu và khởi tạo text/baseline/saved-version revalidation trước persistence. Không mở quyền đọc cache khi inactive. Independent Admin reviewer đã đồng ý acceptance và root đã nhận source-freeze.

Gate thêm10 dòng trước Workspace; các số dòng ManagementWorkspace trong ledger chính là checkpoint trước delta này và dịch tương ứng. Logic/caller và đường dẫn giữ nguyên. Independent Testing review mới lưu partial tại `independent-testing-review.md`; không nhận nó là completed review.

### Delta theo ủy quyền root — 401 và same-owner reauthentication

Root ủy quyền sửa finding độc lập về accessDenied sticky. Current `ManagementAnalysisPage.jsx:55` tách auth401 với forbidden403, trong đó403 luôn thắng. `:85–100` chỉ thực hiện read summary khi đã quan sát locked→active cùng owner hoặc user chủ động retry read. Workspace vẫn bị che tới khi server kiểm lại quyền thành công; sau đó refresh report-list read và saved-version read, giữ editor/baseline. Không tự replay create/update/download hoặc AI preview. `:95` dùng functional setter để một read200 không xóa real403 đã đến trong cùng batch; `:133–134` giữ denied view riêng và cung cấp lỗi/retry read cho revalidation gặp network failure. Cả API permissions và optimistic version vẫn do server enforce.

Tests mới ở `ManagementAnalysisPage.test.jsx:85,94,102,109,116,124` bao gồm positive và negative paths, deferred race. Product source đã **FREEZE** sau GREEN45 tại11:07:52; chỉ ledger và scoped whitespace check sau đó. Các line citations trong ledger trước các delta là checkpoint lịch sử, source hiện tại đã dịch bởi Gate và auth recovery hooks.

## Remaining / giới hạn không được coi là đã đóng

1. **R08 — SOURCE_RISK, chưa sửa backend:** create report chưa có requestKey/idempotency (`ManagementAnalysisPage.jsx:83–86`, `Backend/.../ManagementReportService.java:55–63`). Nếu server commit nhưng response mất, editor giữ nháp; lần save thủ công tiếp theo có thể tạo bản khác. Buffer không tự retry hoặc giả đoán bản trùng theo title. Chưa đo/tái hiện DB.
2. **RA-RECHECK-R01 — source contract discrepancy từ audit trước, không phải CSS regression:** management Issue summary query không lọc document archived như FeatureIssueService; backend outside scope, giữ lại bằng chứng `Backend/src/main/java/vn/syp/tms/reporting/ManagementReportService.java:39` so với `workitem/FeatureIssueService.java:85`. Không đổi số liệu để chữa bằng frontend.
3. **Memory lifetime:** không phục hồi sau browser refresh/tab close/new login hoặc logout. Pending AI preview/proposal chưa apply không được buffer; retry paid request sau route disposal chưa được giải quyết bằng cơ chế persist. Chỉ editor text và saved identity được bảo vệ. Save conflict/GET revalidation error giữ text, user phải xử lý bản server rõ ràng.
4. **BROWSER_NOT_RUN:** chat keyboard viewport thấp có composer error/recovery dài; focus tab giữa nonmodal chat và Shell; reduced-motion; 320px/zoom200%; long title/model/Feature list; report horizontal TableScroll; actual scroll anchor khi prepend. Chưa có đo contrast toàn bộ rendered surfaces, performance, screen-reader announcement thực tế.
5. Các shared dialog/portal visibility, Shell navigation, global density/motion do root/owner khác xử lý; không nhận công của các thay đổi đó vào file này. Không coi retained code là lỗi cần xóa chỉ vì route đã retire.

## Kịch bản Chrome bàn giao root

1. Mở/thu nhỏ chat từ header, Escape và SELECT Escape; Tab/Shift+Tab; hover/focus/pressed/disabled/current; nhập nháp rồi đổi disclosure/scope và quay lại. Không click Send/preset/OAuth/probe thật để kiểm giao diện.
2. Chat ở 320/390/768px và zoom200%, tên model/project/Feature dài; toolbar wrap, source configuration details, error/recovery dài vẫn tới được composer/send và nút thu nhỏ. Đặt reduced motion: không entry animation.
3. Dùng fixture/mock thread nhiều trang: kéo lên giữa, tải older, giữ vị trí; đang đọc cũ nhận result không kéo xuống; chủ động gửi thì theo latest. Loading/error/auth-denied mock ở từng nhánh, không dùng provider thật.
4. `/analysis` PM/ADMIN: whole-project/selected Feature A, table so sánh A/B vẫn ghi toàn dự án; archived mode; empty/loading/error summary/list; report title dài và bảng ở mobile.
5. Nhập nháp title/body, rời route và đổi project A→B→A, text/Feature phục hồi; tab close có cảnh báo; logout/đổi account không thấy nháp cũ. Với saved draft dùng mock GET version cũ/mới/lỗi để kiểm revalidation và không overwrite. Cùng user expired/unavailable→reauth phải giữ app/nháp, chưa thử thật bởi reviewer.
6. Save/open/download pending, failure,409, stale response và AI preview pending/READY/FAILED chỉ dùng mocked harness khi cần thao tác ghi; stylesheet panel/fieldset/focus có thể xem read-only. Không tạo dữ liệu thử trên main.
