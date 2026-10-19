# Kế hoạch triển khai FixReports

Ngày lập: **19/10/2026**. Trạng thái: **IN_REVIEW — FR-00–FR-11 đã triển khai/kiểm chứng source và môi trường cô lập; FR-12 có checkpoint cuối và các mục NOT_RUN được ghi riêng; runtime chính chưa áp dụng**.

> Dành cho Codex: đọc cả đặc tả và kế hoạch trước khi sửa. `implement` là workflow triển khai chính; các skill hỗ trợ và agent phụ dùng chung checklist này. Không tạo một roadmap hoặc sổ trạng thái thứ hai. Checkbox chưa đánh dấu nghĩa là chưa có bằng chứng hoàn thành.

**Mục tiêu:** tổ chức lại hệ thống theo luồng dự án → Feature → file → case; cải tiến UI/UX, quyền, báo cáo và AI đúng FixReports cùng các câu trả lời đã xác nhận.

**Kiến trúc:** mở rộng và tái sử dụng module hiện có theo từng phần có thể kiểm chứng. Backend quyết định quyền, identity, transaction và tiến độ; frontend thể hiện cùng contract. Chuyển đổi dữ liệu được chứng minh trên môi trường cô lập trước khi loại bỏ phụ thuộc cũ.

**Stack:** React JavaScript + Java/Spring Boot + MySQL/Flyway. MySQL native/Workbench là hướng runtime hiện hành; không đổi stack hoặc biến Docker thành điều kiện chạy ứng dụng.

**Đặc tả bắt buộc:** [FixReports.md](../../FixReports.md), [các quyết định đã chốt](2026-10-19-fixreports-clarification.md), [nội dung Thông tin dự án viết mới](../content/spider-plus-project-overview.md). Bản kế hoạch này chuyển các quyết định thành việc thực hiện, không tự tạo quyết định nghiệp vụ mới.

## 1. Phạm vi và nguồn quyết định

- Đọc `AGENTS.md`, `C:\Users\admin\.codex\RTK.md`, `docs/planning/README.md`, `STATUS.json`, `06-execution-guide.md` và hướng dẫn của thư mục trước khi làm. Mọi lệnh shell có prefix `rtk`.
- Nhánh đã kiểm tra khi lập kế hoạch: `system-design`. Working tree có nhiều thay đổi từ trước; lưu baseline và bảo toàn chúng. Không chuyển sang nhánh sprint cũ hoặc coi code đã merge vào `develop`.
- `STATUS.json` đang theo dõi S11 ở `IN_REVIEW`; việc lập tài liệu này không đổi active sprint hoặc đóng UAT. Các mã FR dưới đây là phần việc FixReports, không phải số sprint mới.
- Ưu tiên yêu cầu mới nhất của người dùng → quyết định trong bản làm rõ → FixReports gốc. Đối chiếu code/tài liệu cũ để nhận biết chỗ phải thay; không để rule cũ phủ quyết yêu cầu đã chốt. Nếu có mâu thuẫn mới chưa được giải quyết, hỏi đúng điểm đó và tiếp tục phần độc lập.
- Không hỏi lại Q01–Q19 đã chốt. Lựa chọn kỹ thuật thông thường tự xử lý theo repo; không tự đoán quyền, mapping nghiệp vụ hoặc điều kiện khách hàng còn thiếu.
- Scope bao gồm source, contract, schema/migration, test và tài liệu trực tiếp liên quan. Không thêm CMS, nút tạo công việc khắp nơi, workflow retest/nghiệm thu, phân máy PM→member, huấn luyện model hoặc tích hợp CAT/Backlog mới.
- Không tự commit/push/merge/deploy, mở PR/issue bên ngoài, cài hook/MCP hoặc đổi toolchain. Quyền thực hiện từ tác vụ lịch sử không tự áp dụng cho những hành động này.
- Không chạy fixture ghi/xóa trên database đang sử dụng, không tự tạo server/container để lách việc thiếu credential native hoặc restart runtime đang phục vụ người dùng. Môi trường kiểm thử cô lập phải được xác định trước khi chạy. Chỉ áp dụng chuyển đổi có nguy cơ mất dữ liệu trên database đang dùng sau khi đã có phương án cụ thể và quyền thực hiện tương ứng.

## 2. Các yêu cầu bất biến

| Mã | Hành vi phải đạt | Quyết định gốc | Task chính |
| --- | --- | --- | --- |
| R01 | Bảng công việc chứa Bảng trạng thái và Quản lý kiểm thử; giữ bảng/danh sách bên trong; thay khối tổng quan bằng nội dung dự án; bỏ các menu cũ đúng phạm vi | C01, C11, C14 | FR-05, FR-09, FR-11 |
| R02 | Feature là đợt test; PM/Admin CRUD Feature và import/xóa file; môi trường nhập tự do; Feature lưu trữ/khôi phục; file/case độc lập theo Feature | C01, C02, C08 | FR-01, FR-02 |
| R03 | Nhiều Tester/file, dải case không trùng, tự sửa phần mình; hai cột người test; giữ vòng Status; tiến độ khác Unexecuted/tổng case | C03, C05, C07 | FR-03 |
| R04 | Chỉ Bug/QA toàn hệ thống; Issue từ case tự điền và trở về case; badge đúng identity; monkey Bug thuộc đúng Feature, case tùy chọn | C06, C07, C13 | FR-04, FR-11 |
| R05 | Admin bỏ thông tin trùng; chọn người chưa thuộc dự án nào; chỉ PM nhận thiết bị; menu cố định | C09 và lựa chọn UI | FR-06 |
| R06 | Search AND nhiều từ, không phân biệt hoa/dấu/thứ tự; nhật ký tìm từ và lọc trọn ngày Việt Nam | C12 | FR-07 |
| R07 | Quản lý tiến độ trong Tổng hợp & Phân tích; PM/Admin có báo cáo Markdown sửa/lưu/tải; Note PM/Admin CRUD, member đọc | C10, C11 | FR-08, FR-10 |
| R08 | Giữ chatbot/cấu hình; PM và Admin được AI đọc liên dự án; Tester/DEV chỉ đọc chi tiết trong quyền và kinh nghiệm tổng hợp ngoài quyền; AI chỉ gợi ý phân công | C04, C10, C11 | FR-09, FR-10 |

Các giá trị không được thay bằng rule cũ:

- Feature có **tên, môi trường/server nhập tự do và mô tả ngắn**. PM giữ quyền theo dự án; ADMIN giữ quyền quản trị hiện hành, không bắt ADMIN có membership.
- Vòng Status: **Unexecuted → OK → NG → P → NA → Unexecuted**. Đã test = khác Unexecuted; **P và NA đều tính, NA vẫn nằm trong tổng case**. Không đồng nhất tiến độ 100% với nghiệm thu khách hàng.
- Ví dụ phân công: A sửa phần mình thành 1–40; B nhận 41–60. Không tự cắt/chuyển phần đang thuộc người khác. Không đặt giới hạn cứng hai người/file.
- Đổi người sau kết quả không reset Status hoặc tạo run; bảng chỉ có người test đầu tiên và người test lại gần nhất, các thay đổi có lịch sử. Phân biệt assignee với actor thực sự ghi kết quả.
- Giữ **workbook và nội dung case hiện hành** khi chuyển đổi. Kết quả/người test/lịch sử/issue gắn với cấu trúc kiểm thử cũ không bắt buộc chuyển tiếp; không suy thành quyền xóa tài khoản, dự án, máy, cấu hình hoặc chat riêng.
- Mỗi Feature sở hữu bản nội dung/kết quả/phân công riêng, kể cả import cùng Excel. File cũ chưa có đợt vào Feature **“Dữ liệu cũ chưa phân đợt”** trong đúng dự án.
- Sửa báo cáo chỉ sửa văn bản đã lưu của báo cáo. Không thay case/issue/Status, không diễn giải nội dung báo cáo thành lệnh ghi nghiệp vụ.
- Quyền AI liên dự án không cấp thêm quyền CRUD cho PM, không hạn chế quyền ADMIN vốn có, không mở quyền đọc secret hoặc hội thoại riêng.

## 3. Skill bắt buộc theo công việc

Đọc `SKILL.md` trước khi áp dụng, tìm theo tên tại `C:\Users\admin\.codex\skills` hoặc `C:\Users\admin\.agents\skills`. Tên dưới đây đã được đối chiếu bản cài khi lập kế hoạch; lần thực hiện phải kiểm tra lại. Nếu thiếu, báo đúng tên/phạm vi ảnh hưởng; không giả vờ đã dùng hoặc tự cài thêm. Không nạp toàn bộ thư viện vào một lượt.

| Nhóm / skill | Khi dùng | Công việc và bằng chứng cần có |
| --- | --- | --- |
| Prompt — `prompt-master` | Khi viết/sửa prompt giao việc | Prompt có nguồn, phạm vi, skill, tiêu chí hoàn tất; không cần chạy lại skill này để sửa sản phẩm |
| Matt — `grill-with-docs` | FR-00, khi phát sinh mâu thuẫn | Đối chiếu câu hỏi với tài liệu/code, ghi kết luận và dẫn chứng, không phỏng vấn lại quyết định đã chốt |
| Matt — `grilling` | Chỉ khi còn quyết định nghiệp vụ thực sự thiếu | Câu hỏi bằng tình huống cụ thể, phần phụ thuộc và câu trả lời; không dùng để trì hoãn phần đã rõ |
| Matt — `domain-modeling` | FR-01 | Thuật ngữ và ranh giới Feature/file/case/assignment/result/issue/report; phân biệt ownership và actor |
| Matt — `codebase-design` | FR-00, FR-01 và thay đổi module lớn | Bản đồ source, luồng dữ liệu, module tái sử dụng và phụ thuộc phải bỏ; không rewrite toàn ứng dụng |
| Matt — `to-spec` | FR-01 | Đặc tả cục bộ actor/input/output/quyền/lỗi/acceptance; không đăng issue tracker theo mặc định skill |
| Matt — `implement` | FR-02–FR-12 | Workflow chính; hoàn tất từng task theo phụ thuộc, ghi kết quả vào cùng kế hoạch, không tự commit |
| Matt — `tdd` | Các task đổi hành vi | RED→GREEN từng phần nhỏ qua UI/public API; test lỗi cũ hoặc quy tắc mới; refactor ở bước review |
| Matt — `code-review` | Cuối từng phần đáng kể và FR-12 | Review so với spec, cả staged/unstaged/file mới và baseline của tác vụ; finding có file/bằng chứng |
| Matt — `handoff` | Đổi phiên/agent hoặc FR-12 | Trạng thái, quyết định, diff, kiểm chứng, giới hạn, next action để tiếp tục không làm lại |
| Superpowers — `using-superpowers` | Đầu tác vụ và chuyển loại công việc | Chọn skill phù hợp, thông báo ngắn mục đích, không thêm chức năng sản phẩm |
| Superpowers — `brainstorming` | FR-01, lựa chọn UX/kiến trúc đáng kể | So sánh phương án và chốt lựa chọn có căn cứ; không mở lại nghiệp vụ hoặc yêu cầu duyệt chung |
| Superpowers — `writing-plans` | FR-00/01, khi chia nhỏ task | File/module, đầu vào/đầu ra, dependency, test và DoD; cập nhật kế hoạch này theo quy ước repo |
| Superpowers — `systematic-debugging` | Khi test hoặc hành vi lỗi | Tái hiện → tìm nguyên nhân → sửa nguyên nhân → regression; phân biệt lỗi và thay đổi chủ đích |
| Superpowers — `test-driven-development` | Cùng vòng test của `tdd` | Quan sát FAIL đúng lý do trước khi sửa, rồi PASS; không tạo bộ test/vòng TDD trùng |
| Superpowers — `requesting-code-review` | Khi giao review | Cung cấp spec, task, baseline/diff, test đã chạy và điều cần kiểm tra |
| Superpowers — `receiving-code-review` | Khi nhận finding | Kiểm chứng finding, sửa phần đúng, giải thích phần không áp dụng, chạy lại test liên quan |
| Superpowers — `verification-before-completion` | Trước DONE | Bằng chứng mới sau thay đổi cuối; không dùng kết quả cũ để tuyên bố thay đổi mới đã qua |
| API — `api-design` | FR-01–04, FR-06–10 | Contract và quyền; validation, pagination/count, lỗi, version, idempotency/concurrency theo hạ tầng repo |
| Bảo mật — `security-review` | Các API/input, đặc biệt FR-02/04/09/10 | Server enforce role/scope/ownership, upload/SQL/Markdown/secret, chống lộ dữ liệu AI và truy cập bằng ID giả |
| Dữ liệu — `deprecation-and-migration` | FR-01/02/11 | Mapping, bảo toàn dữ liệu, phụ thuộc cũ, fresh/upgrade/restore, điều kiện chuyển runtime |
| Frontend — `frontend-patterns` | Mọi phần React | State/query/router, pending/error/retry, giữ nháp, hủy/loại response cũ khi đổi dự án |
| Frontend — `frontend-ui-engineering` | FR-03–10 | Semantic HTML, focus, keyboard/touch, bảng và form responsive; bằng chứng browser |
| UI/UX — `impeccable` | FR-01, FR-05/06/10/12 | Chọn chế độ Operate cho app quản trị; audit luồng, phân cấp, mật độ, rõ nhãn/trạng thái; hoàn thiện nhất quán |
| UI/UX — `ui-ux-pro-max` | Vấn đề bảng/form/dashboard cần tham khảo | Chọn giải pháp có mục tiêu từ tài liệu skill, thích nghi design system hiện có, không đổi style toàn app |
| Code — `coding-standards` | Khi sửa code | Java/JS theo repo; naming, validation, xử lý lỗi, code dễ review; không áp ví dụ khác stack |
| Code — `code-simplification` | Sau khi hành vi mới đã đúng | Giảm lặp/phức tạp trực tiếp liên quan, giữ hành vi mới và kiểm tra lại; không mở rộng refactor |
| Test — `e2e-testing` | FR-12 và hành trình tích hợp từng phần | Fixture cô lập và luồng role→Feature→case→Issue→report, tránh test phụ thuộc dữ liệu thật |
| Kiểm chứng — `verification-loop` | Mỗi checkpoint và FR-12 | Lệnh/kết quả/phạm vi build/test/coverage/diff/security, PASS/FAIL/NOT_RUN chính xác |
| Điều phối — `dispatching-parallel-agents` | Có nhánh việc độc lập | Giao owner/file/output rõ; root tổng hợp contract và tránh ghi đè |
| Điều phối — `subagent-driven-development` | Khi chọn giao task triển khai cho agent phụ | Một cách thực hiện bên trong workflow `implement`, dùng cùng checklist; không thêm workflow/ledger thứ hai |

`backend-patterns` đã cài thiên về Node/Express/Next.js: chỉ tham khảo nguyên tắc dùng được nếu cần, không coi là skill Spring Boot. Không bịa skill Java/MySQL. Nếu API thư viện chưa rõ, tra tài liệu chính thức đúng phiên bản; không tự cài MCP/toolchain. Các mục audit/critique/clarify/harden/polish của Impeccable là reference/subcommand, không tự khai là skill riêng.

Các yêu cầu riêng của repo/người dùng ưu tiên mặc định skill về commit, phát hành issue, tạo worktree, tự phán đoán nghiệp vụ hoặc hỏi lại duyệt. Kế hoạch này dùng một vòng TDD/review/verification thống nhất. Khi cần áp dụng quy ước ECC `tdd-workflow`, dùng chung bằng chứng với `tdd`, không nhân bản kiểm thử.

## 4. Bản đồ source và phạm vi file

Các đường dẫn dưới đây là điểm bắt đầu đã đối chiếu, không khẳng định mọi file đều cần sửa. Trước task, mở source/tests và cập nhật file list chính xác; file mới đặt cạnh module sở hữu, theo cấu trúc repo. Không sửa file chỉ để thỏa danh sách.

| Phần | Frontend trong `Frontend/src/app/` | Backend trong `Backend/src/main/java/vn/syp/tms/` |
| --- | --- | --- |
| Điều hướng/tổng quan | `routes/AppRouter.jsx`, `routes/routeInfo.js`, `routes/legacyRoutes.js`, `components/Sidebar.jsx`, `pages/WorkBoardPage.jsx`, `modules/ProjectOverview.jsx`, `features/work-items/HomePage.jsx` | `project/ProjectService.java`, `project/ProjectActorService.java` và nguồn dữ liệu overview đang dùng |
| File/case/import | `features/test-cases/TestDocumentsPage.jsx`, `TestDocumentPage.jsx`, `useDocumentResults.js`, `DocumentCellEditor.jsx`, `services/api/testCases.js` | `testcase/TestDocumentService.java`, `TestDocumentDtos.java`, `TestDocumentController.java`, `TestDocumentEditingService.java`, `ImportController.java`, các workbook/repository liên quan |
| Phân công/luồng cũ | `features/file-work/CaseRangePicker.jsx`, `caseRange.js`, `FileWorkPage.jsx`, `features/test-execution/`, `features/retest/` | `filework/FileWorkService.java`, `FileWorkGuard.java`, `FileWorkExecutionService.java`, `execution/ExecutionService.java`, `cycle/`, `retest/` |
| Bug/QA | `features/work-items/WorkItemForm.jsx`, `WorkItemDetail.jsx`, `ProjectData.jsx`, `features/qa/QaForm.jsx`, `services/api/workItems.js`, `qa.js` | `workitem/WorkItemService.java`, `WorkItemStore.java`, `WorkItemDtos.java`, `qa/QaService.java`, `rules/InternalRulePolicy.java` |
| Admin/thiết bị | `features/admin/AdminDashboard.jsx`, `AdminProjectForm.jsx`, `AdminProjectDetail.jsx`, `AdminDevices.jsx`, `AdminAudit.jsx`, `AdminLayout.jsx` | `admin/AdminOverviewService.java`, `AdminProjectService.java`, `DeviceInventoryService.java`, `AdminAuditService.java` |
| Thông tin chung/Note | `features/projects/ProjectSettingsPage.jsx`, `CatalogPage.jsx`, `HandbookPanel.jsx` | `project/`, `catalog/`, `handbook/` để đối chiếu nơi lưu phù hợp; không coi catalog hiện tại là Note |
| Báo cáo/tiến độ | `pages/AnalysisPage.jsx`, `ProgressPage.jsx`, `features/reports/ReportsPage.jsx`, `services/api/reports.js` | `reporting/ReportingService.java`, `ReportingController.java`, `ReportMetrics.java`, `ReportWorkbook.java` |
| AI | `features/ai/AiChat.jsx`, `AiConnections.jsx`, `AiEditBuffer.jsx`, `services/api/ai.js` | `ai/AiAccess.java`, `AiContextService.java`, `AiPortfolioContext.java`, `AiChatService.java`, `AiChatStore.java`, `AiAssistanceService.java`, `AiDraftService.java`, `AiProviderGateway.java`, `LocalAiAccess.java` |

Schema: `Backend/src/main/resources/db/migration/`; tests Java: `Backend/src/test/java/vn/syp/tms/`; tests React đặt theo quy ước hiện có cạnh component. Contract tại `docs/api/`; business tại `docs/business/`; schema/native tại `docs/database/`. Dùng phiên bản Flyway thực tế lúc triển khai, không chốt sẵn một số migration có thể bị trùng.

## 5. Thứ tự triển khai và giao việc

Đường phụ thuộc chính: **FR-00 → FR-01 → FR-02 → FR-03 → FR-04 → FR-11 → FR-12**.

- Sau FR-01: FR-06 Admin, FR-07 search và FR-08 Note có thể làm độc lập nếu chốt owner và không tranh file/schema.
- FR-05 tích hợp điều hướng sau khi FR-02/03/04 cung cấp màn mới; chỉ thay Danh mục bằng Note khi FR-08 đã có màn/API, bỏ lối vào AI cũ khi FR-09 đã có đường cấu hình thay thế, bỏ lối tiến độ cũ khi FR-10 đã tiếp nhận.
- FR-09 dùng identity/tiến độ/quyền đã chốt ở FR-01–04; phần policy AI và panel cấu hình có thể chuẩn bị song song. FR-10 phụ thuộc dữ liệu FR-02–04 và quyền AI FR-09.
- FR-11 chỉ dọn phụ thuộc runtime cũ khi các đường mới đã hoạt động; FR-12 kiểm chứng cuối trên bản tích hợp.
- Tối đa ba agent phụ. Một người sở hữu thay đổi migration/contract dùng chung; root tích hợp; một người điều khiển browser tại một thời điểm. Không chạy đồng thời migration vào cùng schema.
- Không cam kết ngày hoàn thành khi chưa có baseline môi trường và khối lượng migration. Mỗi task có checkpoint; phần bị chặn ghi điều kiện và tiếp tục task độc lập.

## 6. Task chi tiết

### FR-00 — Baseline và ma trận truy vết

**Phụ thuộc:** không. **Skill:** `grill-with-docs`, `codebase-design`, `writing-plans`, `using-superpowers`; `grilling` khi cần. **Files:** tài liệu bắt buộc, các entry point ở mục 4; cập nhật ngay kế hoạch này.

**Đầu vào → đầu ra:** FixReports + C01–C14 + working tree → baseline, ma trận R→module→test và phần thực sự thiếu.

- [x] Ghi nhánh, commit nền, staged/unstaged/file mới và phạm vi thay đổi sẵn có; không reset/clean/stash tự động.
- [x] Đọc đủ nguồn; trình bày ngắn cách hiểu và những rule cũ bị thay thế, gồm cycle/file-work/retest, loại issue, progress và AI scope.
- [x] Xác định scripts, test suites, schema version từ nguồn có thể đọc an toàn; ghi rõ code/docs/runtime được kiểm tra ở mức nào.
- [x] Gắn R01–R08 vào task, source và tiêu chí mục 8; hỏi ngay điểm mới không thể suy ra, chỉ chặn task phụ thuộc.

**DoD:** biết sửa phần nào, giữ gì và kiểm bằng gì; không tuyên bố runtime đúng chỉ từ đọc code. Bản plan không làm DONE các task sản phẩm.

### FR-01 — Domain, contract, dữ liệu và luồng UI

**Phụ thuộc:** FR-00. **Skill:** `domain-modeling`, `to-spec`, `api-design`, `codebase-design`, `security-review`, `deprecation-and-migration`, `brainstorming`, `impeccable`.

**Files:** source mục 4; `docs/api/test-documents.md`, `work-items.md`, `file-work.md`, `reporting.md`, AI contract; `docs/business/permissions.md`, `metrics.md`; tài liệu schema liên quan. Tạo contract mới cục bộ chỉ khi chưa có tài liệu phù hợp.

**Đầu vào → đầu ra:** mô hình hiện tại → identity/contract dùng chung cho các task sau. Chốt tên DTO/field/signature từ code thực tế trước implementation, không coi tên khái niệm trong plan là bảng/endpoint đã tồn tại.

- [x] Định nghĩa quan hệ Project→Feature→Document→Case, assignment theo case, kết quả hiện hành, lịch sử actor, issue liên kết và báo cáo văn bản. Quyết định tái sử dụng/refactor module; không dựng hai mô hình cùng làm một việc.
- [x] Viết contract CRUD/archive/restore Feature, import/list/read/export/xóa file bảo toàn dữ liệu, phân công, Status/history, Issue/list badge, Note, report và AI capabilities; input/output, scope, version, pagination và lỗi theo convention repo.
- [x] Lập ma trận quyền: PM project scope; ADMIN hiện hành; Tester tự sửa phần mình; DEV giữ quyền xử lý được giao; AI cross-project là capability đọc riêng. Client gửi ID không được quyết định quyền.
- [x] Lập mapping cycle/document/revision/case và FK liên quan, xác định workbook/nội dung cần giữ; xác định các legacy gates phải bỏ để luồng mới hoạt động.
- [x] Phác luồng màn hình, điều hướng Back/deep link, state loading/empty/error, bảng nhiều Feature, form phân công, Issue badge và preview/report; giữ giao diện ứng dụng hiện có, không làm redesign ngoài scope.

**DoD:** các task sau nhận cùng identity/contract/quyền; từng rule có ví dụ/test dự kiến. Không cần thêm vòng phê duyệt chung cho quyết định đã được người dùng chốt.

### FR-02 — Feature, file độc lập và chuyển dữ liệu

**Phụ thuộc:** FR-01. **Skill:** `implement`, `tdd`, `test-driven-development`, `api-design`, `deprecation-and-migration`, `security-review`, `frontend-patterns`.

**Files:** module `testcase/`, import/workbook, module quản lý Feature theo quyết định FR-01, migration mới, `TestDocumentsPage.jsx`, API client và tests liên quan.

**Đầu vào → đầu ra:** mapping/contract → CRUD Feature, import và thư viện theo Feature, identity độc lập cho FR-03/04/09/10.

- [x] Viết và chạy test RED: PM/Admin CRUD Feature và import/xóa file; Tester/DEV không import/xóa file/sửa Feature; tráo project/Feature/file ID bị chặn; cùng Excel ở A/B hợp lệ và các bản không dùng chung nội dung mutable.
- [x] Thực hiện API và UI tối thiểu: tên/môi trường tự do/mô tả, mở Feature thấy file, import đúng context, archive/restore Feature. PM/Admin xóa file bằng thao tác ẩn/lưu trữ bảo toàn dữ liệu, giữ case/issue và liên kết cần thiết; không hard-delete hoặc cascade xóa. Không tự thêm luồng khôi phục file riêng ngoài yêu cầu.
- [x] Xây migration append-only theo mục 7; giữ workbook và nội dung hiện hành, map một-nhiều cho file thuộc nhiều cycle, gom orphan đúng dự án. Không reset dữ liệu ngoài tập kiểm thử cũ được xác định.
- [x] Chạy fresh/upgrade trong schema cô lập; đối chiếu manifest/count/content/project; export gốc vẫn đọc được. Replay migration đang có hoặc chạy lại job chuyển đổi không sinh bản sao ngoài mapping.
- [x] Chạy GREEN và review độc lập bảo toàn dữ liệu; kiểm archive/restore giữ file/case/issue, import lỗi không để dữ liệu dở dang, không chặn cross-Feature import bởi checksum cấp dự án.

**DoD:** mỗi Feature/file/case có context chính xác; dữ liệu cần giữ chứng minh được đầy đủ. Chưa cần áp dụng lên DB đang dùng để hoàn tất phần code/test cô lập; trạng thái chuyển runtime ghi riêng.

### FR-03 — Phân công, Status và tiến độ

**Phụ thuộc:** FR-02. **Skill:** `implement`, `tdd`, `test-driven-development`, `api-design`, `security-review`, `frontend-patterns`, `frontend-ui-engineering`.

**Files:** `FileWorkService.java`, `FileWorkGuard.java`, phần testcase/result/history được chọn tại FR-01; `CaseRangePicker.jsx`, `caseRange.js`, `TestDocumentPage.jsx`, `useDocumentResults.js`, `ReportMetrics.java` và tests.

**Đầu vào → đầu ra:** stable case identity của FR-02 → assignment/current result/history và phép tính tiến độ dùng chung.

- [x] RED: A1–40/B41–60 hợp lệ; giao trùng, ngoài range, phiên bản cũ hoặc Tester sửa người khác bị từ chối. Hai request nhận trùng đồng thời chỉ có kết quả nhất quán, không silently overwrite.
- [x] Thực hiện PM/Admin phân công, Tester tự nhận và sửa dải của mình; file đã có người vẫn nhận phần hợp lệ; tự điền người test theo case, phản hồi xung đột rõ và giữ lựa chọn chưa lưu.
- [x] Lưu Status theo vòng đã chốt; đổi assignee sau kết quả giữ Status, hai cột đầu tiên/gần nhất, có history; không tạo run hoặc gán lịch sử actor giả.
- [x] RED→GREEN phép tính `2 Unexecuted + OK + P + NA = 3/5 = 60%`, file rỗng không NaN/Infinity; nhiều người không nhân số case; nhiều Feature không gộp nhầm identity.
- [x] Cho file list/multiple-Feature view và bên dùng báo cáo/AI cùng lấy chỉ số theo contract; rà sửa nội dung case/export/autosave đang có để không hồi quy khi thay nút dưới Status.

**DoD:** phân công và kết quả giữ nhất quán cả API/UI; không cần allocation máy Tester, cycle configuration hoặc run cũ để thao tác hợp lệ.

### FR-04 — Issue từ case và Bug monkey

**Phụ thuộc:** FR-02/03. **Skill:** `implement`, `tdd`, `api-design`, `security-review`, `frontend-patterns`, `frontend-ui-engineering`.

**Files:** `TestDocumentPage.jsx`, `WorkBoardPage.jsx`, form/detail work-items, `QaForm.jsx`, API clients; `WorkItemService.java`, `WorkItemStore.java`, `QaService.java`, `InternalRulePolicy.java`, tests.

**Đầu vào → đầu ra:** Feature/file/case identity → Bug/QA đúng context, danh sách badge, thao tác monkey và đường quay về.

- [x] RED: Bug/QA từ case lấy đúng Feature/file/case/steps/expected; Task/Request/Improvement không tạo được kể cả gọi API cũ; QA qua typed API vẫn theo quyền/contract chung.
- [x] Thay nút dưới Status bằng Issue, tái sử dụng form phù hợp; lưu thành công về đúng case/trang/filter/scroll, lỗi giữ draft, pending chống gửi hai lần. Không thêm nút tạo chung vào mọi bảng.
- [x] Badge đếm mọi issue đúng case kể cả đóng; case cùng tên ở Feature khác không bị tính; preview có hover/focus/touch, mở detail và quay lại đúng chỗ.
- [x] Monkey Bug tạo tại Quản lý lỗi: bắt buộc đúng Feature của lần test, case tùy chọn, title tự do; Tester CRUD mềm của mình, PM/Admin theo quyền, DEV theo assignment. Test tráo Feature/case/project và xóa dữ liệu ngoài hệ thống không được phát sinh.
- [x] Rà NG attempt/build/device, prefix BUG, retest request/coverage gates và rule cũ chặn luồng mới; gỡ đúng phần không còn cần. Không tạo state machine mới hoặc tự đóng issue khi case OK. Tìm/đếm/filter/export/AI chỉ dùng Bug/QA của luồng mới, không tự mapping loại cũ thành Bug.

**DoD:** luồng case→Issue→case chạy trọn; monkey không cần case; server thực thi cùng quy tắc UI; lịch sử liên quan không bị xóa do thao tác archive.

### FR-05 — Điều hướng và Thông tin dự án

**Phụ thuộc:** FR-02–04; thay tab Note chờ FR-08, chuyển menu AI/tiến độ chờ FR-09/10. **Skill:** `frontend-patterns`, `frontend-ui-engineering`, `impeccable`, `ui-ux-pro-max`, `tdd` cho hành vi router.

**Files:** router/sidebar, `WorkBoardPage.jsx`, overview đang được route sử dụng, styles tương ứng; `docs/content/spider-plus-project-overview.md` là nguồn copy.

**Đầu vào → đầu ra:** màn mới đã có → điều hướng chính, nội dung và các deep link hợp lệ.

- [x] RED→GREEN điều hướng: Bảng công việc có Bảng trạng thái/Quản lý kiểm thử; bảng/danh sách bên trong vẫn dùng được; Feature→files→cases đúng dự án và Back giữ context.
- [x] Bỏ Việc cần xử lý/Công việc tạo gần đây khỏi overview và trình bày bản nội dung đã viết mới; xác định đúng dự án Spider Plus trước khi gắn. Nếu không xác định được identity, hỏi riêng mapping, vẫn làm phần độc lập.
- [x] Chuyển Quản lý tiến độ vào Tổng hợp & Phân tích; Cài đặt dự án→Thông tin chung, Danh mục→Note. Gỡ menu testing cũ và menu AI khi đã có đường thay thế.
- [x] Kiểm deep link cũ/bookmark sau chuyển đổi: map được thì về đúng context theo mapping, không map được thì báo rõ; không chuyển ngẫu nhiên sang Feature/dự án khác.
- [x] Kiểm trực quan mobile/tablet/desktop, focus và sidebar. Nội dung Spider Plus chỉ ở đúng dự án; link tham khảo không tạo tích hợp CAT/Backlog hoặc điều kiện NA/nghiệm thu trong code.

**DoD:** không còn đường menu chính dẫn vào workflow đã bỏ, không mất bảng/danh sách nội bộ, không hardcode một dự án cho cả hệ thống.

### FR-06 — Admin, thành viên và bàn giao thiết bị

**Phụ thuộc:** FR-01; tích hợp guard với FR-03. **Skill:** `api-design`, `security-review`, `tdd`, `frontend-patterns`, `frontend-ui-engineering`, `impeccable`.

**Files:** Admin dashboard/project form/detail/devices/layout, `AdminOverviewService.java`, `AdminProjectService.java`, `DeviceInventoryService.java`, membership queries/tests.

**Đầu vào → đầu ra:** quyền Admin hiện hành → picker đúng người, PM nhận máy và menu ổn định.

- [x] RED→GREEN picker chỉ người chưa thuộc bất kỳ dự án nào; query/count/pagination thống nhất. Không phá membership cũ hoặc tự thêm unique constraint người chỉ được thuộc một dự án.
- [x] Bàn giao các máy đã chọn cho một PM; server từ chối role khác, giữ thông tin máy/PM/bàn giao cần thiết và kiểm soát cập nhật đồng thời hiện có.
- [x] Bỏ giao diện/phụ thuộc phân máy xuống member; chứng minh Tester được thực hiện case theo quyền mà không cần allocation riêng. PM phân phối nội bộ bên ngoài ứng dụng.
- [x] Giữ bảng vai trò Tổng/Hoạt động, bỏ biểu đồ lặp cùng số liệu; giữ các thông tin khác. Menu Admin cố định khi nội dung cuộn, menu dài vẫn truy cập được trên màn nhỏ.

**DoD:** dữ liệu bàn giao rõ PM nào nhận thiết bị nào; không thêm workflow quản lý máy của PM; kiểm tra trực quan và API cho hành vi thay đổi.

### FR-07 — Tìm kiếm nhiều từ và nhật ký giờ Việt Nam

**Phụ thuộc:** FR-01; nối các danh sách mới khi FR-02/04 có. **Skill:** `api-design`, `tdd`, `security-review`, `frontend-patterns`.

**Files:** inventory ô tìm kiếm trong Admin/project/Feature/file/issue/note khi có, API queries/count; `AdminAudit.jsx`, `AdminAuditService.java`, `AdminAuditController.java`, tests.

**Đầu vào → đầu ra:** contract tìm kiếm chung → query, total count và phân trang nhất quán.

- [x] Liệt kê ô tìm kiếm liên quan FixReports để không sót nhưng không dựng search engine mới; chốt chuẩn hóa token và cách match nhiều trường theo API hiện có.
- [x] RED→GREEN: `NHUNG cam` khớp `Cẩm Nhung`; thiếu một token không khớp; đảo thứ tự, nhiều khoảng trắng, dấu Unicode và chữ đ/Đ được xử lý nhất quán; `%`, `_`, dấu nháy không biến thành cấu trúc truy vấn.
- [x] Áp dụng AND tất cả token trong truy vấn server và count; chuyển keyword reset trang hợp lệ; request cũ không ghi đè kết quả mới.
- [x] Nhật ký bỏ dropdown Loại sự kiện và selector timezone; keyword tìm actor/project/object/action, giữ From–Through, cố định Asia/Ho_Chi_Minh.
- [x] Test trọn ngày cuối theo khoảng từ đầu ngày bắt đầu đến trước đầu ngày kế tiếp của ngày kết thúc; kiểm các thời điểm UTC sát biên, ngày không hợp lệ và kết quả phân trang.

**DoD:** tìm thấy dữ liệu trên toàn tập được phép, không chỉ trang hiện tại; hiển thị/query cùng múi giờ, không âm thầm mở rộng quyền search.

### FR-08 — Note chung trong Thông tin chung

**Phụ thuộc:** FR-01. **Skill:** `api-design`, `security-review`, `tdd`, `frontend-patterns`, `frontend-ui-engineering`.

**Files:** `ProjectSettingsPage.jsx`, entry Danh mục/Note, nguồn lưu được chọn ở FR-01, API client/contract và tests.

**Đầu vào → đầu ra:** scope dự án và contract Note → danh sách/CRUD cho PM/Admin, chế độ đọc cho member.

- [x] RED→GREEN PM/Admin CRUD theo quyền; TESTER/DEV đọc dự án được giao, gọi trực tiếp API ghi bị từ chối; tráo project/Note ID không lộ dữ liệu.
- [x] Thay riêng tab Danh mục bằng Note, giữ các tab còn lại. Danh sách, empty state, form tối thiểu, pending/error giữ nội dung và xác nhận kết quả lưu.
- [x] Xử lý nội dung hiển thị an toàn, version/xung đột theo convention; không tạo attachments/CMS/phê duyệt hoặc lớp phân quyền mới.

**DoD:** Note lưu/đọc đúng dự án và quyền; việc bỏ tab không có nghĩa xóa catalog đang được phần khác tham chiếu trước FR-11.

### FR-09 — Chatbot, quyền AI và gợi ý phân công

**Phụ thuộc:** contract FR-01; dữ liệu FR-02–04 để tích hợp đầy đủ. **Skill:** `api-design`, `security-review`, `tdd`, `frontend-patterns`, `frontend-ui-engineering`, `code-review`.

**Files:** các file AI tại mục 4, contract AI, role/context/integration tests; giữ các thay đổi AI có sẵn trong working tree.

**Đầu vào → đầu ra:** actor/capability, project/Feature context và dữ liệu thật → retrieval được lọc, câu trả lời/gợi ý có căn cứ, config vẫn truy cập được.

- [x] RED→GREEN cả allow/deny: ADMIN và PM được AI đọc/trích xuất dữ liệu nghiệp vụ dự án không tham gia; PM vẫn bị chặn CRUD ngoài quyền; ADMIN giữ quyền hiện hành. Không lấy private chat/secret làm nguồn.
- [x] TESTER/DEV hỏi case/issue/người từng test/phần việc, tiến độ file trong quyền thành công; yêu cầu báo cáo quản trị toàn dự án, Analysis-equivalent hoặc bulk export bị chặn ở capability/API. Không dùng tiêu chí mơ hồ do model tự quyết “hỏi sâu”.
- [x] Thiết kế nguồn kinh nghiệm tổng hợp ngoài dự án cho TESTER/DEV: không chuyển dữ liệu thô ngoài quyền vào model rồi trông cậy câu nhắc che đi. Kiểm context/citation/response không lộ tên dự án/người, case/issue/doc/số liệu riêng; dữ liệu nguồn không có quyền đổi policy.
- [x] Gợi ý phân công theo lịch sử thực có, khối lượng/độ khó và người trong dự án; nêu căn cứ/suy luận/dữ liệu thiếu, không bịa kinh nghiệm sau migration; không tự ghi assignment. Giải thích case và tìm người test trước theo evidence thật.
- [x] Retrieval có project/Feature target, giới hạn minh bạch, không tuyên bố đọc toàn hệ thống khi chỉ có vài mẫu. Test chọn riêng project/Feature vẫn dùng được nền toàn hệ thống theo policy: PM/Admin truy xuất được dữ kiện liên dự án khi cần, Tester/DEV chỉ nhận kinh nghiệm đã tổng hợp an toàn; không vô tình giữ giới hạn PROJECT_CHAT chỉ một dự án của code cũ. Scope/permission thay đổi phải tái kiểm theo request và cơ chế thread hiện có, tránh cache/context cũ lộ dữ liệu.
- [x] Đưa “Cấu hình AI” vào toolbar chat, dùng lại `AiSourceSelector`/`AiConnections.jsx`; giữ per-user capability, local owner/localhost và server secrets. Bỏ menu AI, giữ history/draft/send/retry; đổi nguồn/model cho hội thoại mới, không đổi ngầm thread hoặc request đang chạy.

**DoD:** policy được test trước retrieval và ở output/response; menu AI bỏ nhưng chat/cấu hình hoạt động; không coi test mock là chứng minh chất lượng live model.

### FR-10 — Tổng hợp & Phân tích và báo cáo Markdown

**Phụ thuộc:** FR-02–04, FR-09. **Skill:** `api-design`, `security-review`, `tdd`, `frontend-patterns`, `frontend-ui-engineering`, `impeccable`, `ui-ux-pro-max`.

**Files:** `AnalysisPage.jsx`, `ProgressPage.jsx`, `ReportsPage.jsx`, report API; `ReportingService.java`, `ReportingController.java`, `ReportMetrics.java`, module lưu văn bản được chọn sau khi đối chiếu `AiDraftService.java` và nguồn hiện có.

**Đầu vào → đầu ra:** số liệu Feature/Status/Bug/QA và policy AI → dashboard, chức năng tiến độ và report text đã lưu.

- [x] RED→GREEN PM/Admin dùng màn/API báo cáo; TESTER/DEV không xem/tạo/sửa/tải báo cáo quản trị bằng route hoặc HTTP trực tiếp, kể cả ID đoán được. Không chặn nhầm các chỉ số file phục vụ việc test.
- [x] Tổ chức dashboard sức khỏe/tiến độ rõ, nhất quán metric R03; đưa quản lý tiến độ hiện có vào màn này, loại phụ thuộc cycle/build bắt buộc không còn trong model Feature.
- [x] Tạo báo cáo: chọn dự án, Feature tùy chọn; không chọn Feature là toàn dự án. Nội dung có thông tin, tiến độ, phân bố Status, Bug/QA, điểm cần chú ý, nhận xét/đề xuất có căn cứ và thiếu dữ liệu.
- [x] Preview/sửa/lưu/tải Markdown; edit buffer không mất khi lỗi, thành công sau server xác nhận; tải lại đúng bản đã lưu. Nếu tái sử dụng module draft, tách báo cáo đã lưu khỏi TTL/cleanup của nháp hoặc chat; test chạy cleanup nháp không làm mất bản báo cáo. Render an toàn, không chạy HTML/script/URL nguy hiểm từ nội dung không tin cậy.
- [x] Test sửa “10 lỗi” thành “8 lỗi”: report đọc/tải là 8, nguồn issue vẫn 10, Status không đổi. AI lỗi/timeout không ghi report thành công giả hoặc ghi đè bản đang sửa.

**DoD:** report là tài liệu văn bản tách khỏi dữ liệu nghiệp vụ; tính quyền ở backend; số liệu có nguồn/phạm vi rõ, không lẫn dữ liệu Feature hoặc dự án khác.

### FR-11 — Loại bỏ phụ thuộc cũ và chuẩn bị chuyển runtime

**Phụ thuộc:** FR-02–10 đã tích hợp phần liên quan. **Skill:** `deprecation-and-migration`, `codebase-design`, `code-simplification`, `security-review`, `code-review`.

**Files:** các module cycle/filework/retest/execution/catalog/device/metrics/export/AI, router/legacyRoutes, contract/docs và tests đang phụ thuộc luồng cũ; chỉ sửa phần có bằng chứng.

**Đầu vào → đầu ra:** luồng mới đã kiểm chứng → dependency inventory được giải quyết và phương án chuyển runtime có thể review.

- [x] Rà từng legacy consumer/route/API/guard/FK/KPI/export/AI; phân loại tái sử dụng, thay thế, ngừng lộ ra ngoài hoặc giữ làm lịch sử. Không xóa dữ liệu/module chỉ vì tên giống menu bị bỏ.
- [x] Gỡ yêu cầu cycle/config/run/file-work/retest/member-device không còn đúng để luồng mới không bị chặn; giữ auth, input validation, concurrency và toàn vẹn dữ liệu.
- [x] Rà toàn hệ thống chỉ còn Bug/QA hoạt động; loại cũ không được tạo qua API/form/filter; dữ liệu cũ chưa chuyển không bị giả đổi thành Bug. Test thay đổi chủ đích được cập nhật kèm R-ID, không xóa test chỉ để suite xanh.
- [x] Hoàn tất manifest chuyển đổi/backup/restore, chạy diễn tập cô lập; chuẩn bị danh sách giữ/bỏ và diff cụ thể trước khi xin quyền áp dụng thao tác phá hủy trên DB đang dùng nếu cần. Không yêu cầu xác nhận lại để được viết source/migration hoặc test cô lập đã rõ.
- [x] Cập nhật docs nghiệp vụ/API/schema/navigation; ghi riêng trạng thái code, migration test, runtime applied và UAT. Chưa có quyền/điều kiện runtime thì giữ phần đó NOT_RUN, không tự đánh dấu triển khai production.

**DoD:** không còn gate cũ cản hành vi đã chốt; kế hoạch chuyển môi trường dùng thật đủ để review, giới hạn còn lại rõ và không mất dữ liệu ngoài phạm vi.

### FR-12 — Tích hợp, review, UI/UX và bàn giao

**Phụ thuộc:** các task trên hoặc ghi rõ task bị chặn. **Skill:** `e2e-testing`, `code-review`, `requesting-code-review`, `receiving-code-review`, `impeccable`, `verification-loop`, `verification-before-completion`, `handoff`.

**Files:** tests/config đã có đúng scope, tài liệu traceability/review, kế hoạch và STATUS theo quy ước khi thực sự triển khai.

**Đầu vào → đầu ra:** bản tích hợp cuối → bằng chứng nghiệm thu theo R-ID, danh sách hạn chế và bàn giao.

- [ ] Chạy ma trận mục 8 với dữ liệu cô lập, vai trò ADMIN/PM/TESTER/DEV và dự án ngoài membership; tách UI test, HTTP integration, migration và live AI.
- [ ] Kiểm browser ở mobile/tablet/desktop, tối thiểu các mức đại diện 390/768/1440px và màn nhỏ hơn nếu layout đang hỗ trợ; chụp/xem ảnh trước-sau cùng route/role/data/viewport. Bảng cuộn trong vùng có chủ đích, không tràn toàn trang.
- [ ] Kiểm keyboard/focus/return focus, touch thay hover, nhãn form, lỗi cạnh trường, contrast/Status không chỉ dùng màu, double submit, mạng lỗi, session hết hạn và đổi project khi request đang chạy.
- [x] Review độc lập phần migration/quyền/luồng chính đáng kể; finding có mức độ/source/ảnh hưởng, xác minh rồi sửa; chạy lại phần bị ảnh hưởng. Không review lại vô hạn vì nhiều skill.
- [x] Chạy checks mục 9, ghi kết quả thật sau sửa cuối; update ledger/task/review. Không đánh dấu S11 DONE hoặc UAT đạt chỉ vì local tests PASS.


**Checkpoint FR-12:** ba checkbox đầu là tập kiểm rộng, chưa đánh dấu hoàn tất toàn bộ: browser bốn role/320–1440px đã chạy; upload bị quyền extension chặn; chưa có bộ ảnh trước/sau đồng nhất cho mọi trạng thái, kiểm bàn phím/contrast/session/network có UI regression và hành trình chính nhưng chưa exhaust mọi control. Xem ma trận A01–A20 và giới hạn trong báo cáo cuối. Không dùng ba checkbox này để làm lại các test đã PASS.

**DoD:** R01–R08 có kết quả và evidence, không còn lỗi nghiêm trọng chưa xử lý trong phạm vi; phần NOT_RUN/BLOCKED có điều kiện và next action; không đưa kết luận “hệ thống hoàn toàn không lỗi”.

## 7. Thiết kế và kiểm chứng chuyển dữ liệu

| Tình huống | Xử lý đã xác định | Bằng chứng cần giữ |
| --- | --- | --- |
| Cycle có file | Feature trong đúng project; bản file/case của đợt đó | Mapping old cycle/document/case → new Feature/document/case |
| File dùng nhiều cycle | Tạo các bản mutable độc lập trong các Feature tương ứng | Count theo mapping một-nhiều; sửa A không đổi B; export/query AI đúng scope |
| File chưa có cycle | Feature “Dữ liệu cũ chưa phân đợt” của đúng project | Không file/case bị bỏ rơi hoặc chuyển nhầm dự án |
| Nội dung case đã sửa sau import | Giữ cả workbook nguồn và nội dung case hiện hành cần giữ | Hash workbook; so sánh giá trị case/ô theo định dạng hiện có, không chỉ đếm dòng |
| Workbook thiếu/hỏng, quan hệ mơ hồ | Báo đúng tập dữ liệu; chưa chuyển phần không chứng minh được bảo toàn | Danh sách exception và hướng xử lý; không bịa binary/identity để đủ count |
| Kết quả/tester/history/issue cũ không chuyển | Liệt kê rõ tập liên quan và FK, cô lập với dữ liệu khác | Manifest giữ/bỏ; không có xóa lan sang project/user/device/config/chat |
| Archive Feature vận hành mới | Ẩn, giữ dữ liệu và phục hồi được | Round-trip archive→restore, liên kết file/case/issue còn nguyên |

Trình tự: snapshot/manifest nguồn → migration trên bản cô lập → đối chiếu dữ liệu → kiểm API/UI → diễn tập phục hồi → review phương án áp dụng. Flyway migration đã áp dụng không sửa; dùng version tiếp theo thực tế. Khôi phục dựa trên backup đã kiểm chứng và phiên bản ứng dụng tương thích, không giả định có thể rollback bằng sửa migration cũ. Không chạy cleanup phá hủy cùng bước chưa chứng minh copy thành công.

## 8. Ma trận nghiệm thu bắt buộc

| ID | Kịch bản/expected | Task | Loại bằng chứng |
| --- | --- | --- | --- |
| A01 | PM/Admin CRUD Feature/import/xóa file; Tester/DEV bị chặn; ADMIN không cần membership | FR-02 | API allow/deny + UI |
| A02 | Import Excel giống nhau ở A/B; sửa nội dung, Status, assignment A không đổi B | FR-02/03 | DB integration + export/API |
| A03 | Migration giữ workbook/current content, cycle mapping, orphan và một-nhiều đủ; dữ liệu khác không bị tác động | FR-02/11 | fresh/upgrade/restore + manifest |
| A04 | A1–40/B41–60 hợp lệ; overlap/concurrent/version cũ bị xử lý nhất quán, không đổi phần người khác | FR-03 | API/transaction + UI conflict |
| A05 | Đổi assignee sau kết quả: Status giữ, hai cột và history đúng, không run/cột 3 | FR-03 | API + UI + dữ liệu |
| A06 | 2 Unexecuted+OK+P+NA =3/5; file rỗng hợp lệ; số liệu file/Feature/report/AI nhất quán | FR-03/09/10 | unit + integration |
| A07 | Issue đúng context, save trở đúng case; fail giữ draft; badge gồm đóng, không lẫn Feature | FR-04 | UI/browser + API |
| A08 | Monkey đúng Feature không case; title tự do; ownership và soft delete đúng; chỉ Bug/QA toàn hệ thống | FR-04/11 | API allow/deny + UI |
| A09 | Bảng/danh sách nội bộ còn; menu cũ thay đúng; Back/deep link/project switch không lạc context | FR-05 | router + browser |
| A10 | Overview Spider Plus đúng dự án, bản viết mới, không sinh workflow nghiệm thu/CAT | FR-05 | UI + kiểm dữ liệu cấu hình |
| A11 | Picker chưa thuộc dự án nào; PM nhận máy; Tester không cần phân máy nội bộ | FR-06 | API + browser |
| A12 | AND không dấu/hoa/thứ tự, count khớp; nhật ký đúng trọn ngày VN | FR-07 | query integration + UI |
| A13 | PM/Admin CRUD Note, member đọc; cross-project/ID giả bị chặn | FR-08 | API allow/deny + UI |
| A14 | PM và ADMIN dùng AI đọc dự án ngoài membership; PM không có CRUD thêm; chat riêng/secret không lộ | FR-09 | policy/retrieval/API tests |
| A15 | Tester/DEV hỏi case/issue trong quyền được; management report/bulk export bị chặn; ngoài quyền chỉ kinh nghiệm không lộ chi tiết | FR-09/10 | negative/positive API + context/output |
| A16 | AI không bịa lịch sử sau migration, gợi ý có căn cứ và không ghi phân công; chọn project/Feature vẫn có nền toàn hệ thống đúng policy | FR-09 | context/service + đối chiếu phản hồi |
| A17 | Menu AI bỏ, config còn dùng; history/draft/provider/model/thread/owner guards không hồi quy | FR-09 | FE/BE regression + browser |
| A18 | Báo cáo sửa10→8, mở/tải là8, issue vẫn10; cleanup nháp không xóa report đã lưu; Markdown an toàn, fail không lưu giả | FR-10 | API persistence + UI/browser |
| A19 | Archive/restore Feature giữ dữ liệu; lỗi monkey soft delete; PM/Admin xóa file khỏi danh sách hoạt động mà case/issue/dữ liệu cần giữ còn nguyên | FR-02/04 | DB/API integration |
| A20 | Luồng đầy đủ PM tạo/import→Tester nhận/test→Issue/monkey→DEV theo quyền→PM báo cáo; không bị legacy gate cản | FR-12 | browser + HTTP tích hợp cô lập |

**Năm trọng tâm review:** bản case độc lập giữa Feature (A02); tranh chấp phân công (A04/05); quyền AI và dữ liệu ngoài scope (A14/15); report không ghi ngược nghiệp vụ (A18); giữ nội dung khi migration/archive (A03/19). Mỗi trọng tâm phải có test của task sở hữu, không chỉ nhận xét bằng mắt.

## 9. Lệnh kiểm chứng và cách ghi bằng chứng

Đọc scripts/config hiện tại trước khi chạy. Các lệnh dưới đây đã đối chiếu nguồn khi lập kế hoạch, **chưa được chạy cho việc triển khai FixReports**:

| Thư mục | Lệnh | Kết quả cần có / điều kiện |
| --- | --- | --- |
| `Frontend` | `rtk proxy npm test -- --maxWorkers=2` | Vitest PASS; khi đang sửa chọn test file cụ thể để tái hiện RED/GREEN |
| `Frontend` | `rtk proxy npm run build` | Build PASS; ghi riêng warning tồn tại, không tự gọi warning là FAIL |
| `Frontend` | `rtk proxy npm run test:coverage -- --maxWorkers=2` | Báo 4 chỉ số thực đo và phạm vi; không suy từ số test |
| Repo root | `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests '<suite thực tế>'` | Maven verify; thay placeholder bằng suite đã xác định, kiểm điều kiện DB/Testcontainers của suite trước |
| Repo root | `rtk proxy node scripts/Check-Contracts.cjs` | Structural contract PASS; không thay HTTP/schema validation đầy đủ |
| Repo root | `rtk git diff --check` | Không có lỗi whitespace do thay đổi; kiểm file mới và diff baseline riêng vì git diff không bao phủ untracked |

Native migration/HTTP tests chọn script sau khi đọc và xác minh target schema cô lập. Không dùng script cũ trong `var/` như lệnh đáng tin chỉ vì tên liên quan. Không tự bật Docker khi thiếu native credential; ghi điều kiện còn thiếu và tiếp tục phần kiểm được.

Coverage gate hiện có phải được giữ đúng phạm vi hoặc cập nhật có lý do nghiệp vụ khi module được thay thế; không thu hẹp để che code chưa test. Lint/typecheck không có script thì ghi `NOT_CONFIGURED`. Coverage chưa đo ghi `NOT_MEASURED`. Browser fixture, HTTP thật, native migration và live provider là các mức bằng chứng khác nhau; ghi riêng, không cộng hoặc gọi thay nhau. Live AI chỉ dùng dữ liệu kiểm thử phù hợp và quyền thực tế, không tự gửi tài liệu dự án thật để thử.

## 10. Trạng thái, checkpoint và bàn giao

| Task | Trạng thái khi lập kế hoạch | Evidence khi thực hiện |
| --- | --- | --- |
| FR-00 | DONE (khảo sát) | `var/fixreports-2026-10-19/baseline.json`, `baseline.patch`, `environment-readonly.json`; ba audit domain/Admin-search/UI; ma trận R/A bên dưới và contract mới |
| FR-01 | DONE (contract cục bộ) | `GLOSSARY.md`, `docs/api/fixreports-contract.md`, `var/fixreports-2026-10-19/core-contract-proposal.md`; root chốt public seams/API, một owner V31+ |
| FR-02 | DONE — code/test cô lập | V30→33 snapshot PASS:76 bảng/7.362 row cũ nguyên;10 file/711 case; fixture fresh/upgrade/restore/replay0;1 source thiếu workbook và120 case không file giữ riêng; main chưa apply |
| FR-03 | DONE — code/test cô lập | Native phân công/concurrency/actor/Status + browser dải1–40/41–60, overlap, đổi assignee giữOK/first/latest; metrics3/5=60% |
| FR-04 | DONE — code/test cô lập | NativeIssue6 cuối PASS, FE form/detail/badge/router trong975; browser case→Issue→case, monkey CRUD mềm, DEV status/comment/history |
| FR-05 | DONE — code/test cô lập | Router101 + full975; browser menu/deep links/overview/Back; Spider Plus thật12 đúngPM syp.lab.pm03 |
| FR-06 | DONE — code/test cô lập | NativeAdmin14; browser lưu1 member, feedback thiếuPM, bàn giao2máy cho1PM; không allocationTester |
| FR-07 | DONE — code/test cô lập | Native UnicodeNFD/đ/AND/literal/count/page/VNdates/audit labels; browser keyword đảo thứ tự và ngàyVN |
| FR-08 | DONE — code/test cô lập | Note18 service/policy/controller, FE38 và native5 cuối; browser PM lưu/Tester đọc |
| FR-09 | DONE — policy/context/test cô lập; live riêng | 102 focused +16guard cuối PASS; FE64/90 trong975; worker facts/history, no bulk/management, PM globalread nhưng CRUDscope giữ; browserconfig/scope320 |
| FR-10 | DONE — code/test cô lập | NativeReport3 cuối PASS cảactualpurge/10→8/source10giữ; generator3/FE24; browser reopen/download110bytes exactSHA |
| FR-11 | DONE — source/diễn tập; main chưa chuyển | 410/403 retirement, giữ history/source; QA27bodyhash giữ/48PASS; docs8, backup main mới, snapshotV33/replay0 vàrestorefixture86 bảng PASS |
| FR-12 | IN_REVIEW — checkpoint cuối, giới hạn nêu rõ | FE975/105files+build; BE645/74classes+package; native102/Admin14/Root14/snapshot1 theo scope; browser4roles; upload/live/UAT/kiểm manual đầy đủ còn riêng |

Mỗi checkpoint ghi: task/R-ID → thay đổi và file → skill thực áp dụng → test/lệnh/kết quả → môi trường/coverage → finding đã xử lý → phần còn lại. Có thể đánh dấu phần code đã kiểm và runtime chưa áp dụng riêng; không che thiếu điều kiện bằng một chữ DONE chung.

### Checkpoint thực thi 19/10/2026 — FR-00/01

- Baseline: nhánh `system-design`, HEAD `caf075af7231f207259b6a62808bff5c8445f6af`; 53 file thay đổi/có sẵn ngoài `var/` được hash và lưu diff. Không reset/stash/clean. S11 giữ IN_REVIEW.
- Môi trường đọc-only: native MySQL loopback 3307, main `tms` Flyway 30; có ba schema cô lập `tms_docstest_202610080023/24/25`, chưa xác nhận điều kiện ghi nên chưa chạy migration/fixture. Không restart dịch vụ.
- Review cách hiểu đã thông báo trước source edits: Feature→file→case độc lập, giữ workbook/current revision/cell edits, loại gate cycle/run/build/device khỏi đường mới; bảng Status và metrics dùng định nghĩa R03.
- Điểm thiếu C14: inventory chưa có Spider Plus. Đã hỏi đúng mapping; người dùng trả lời cho phép tự bổ sung. Dùng mã riêng `SPIDER-PLUS`; không gắn vào demo, không tạo workflow CAT/nghiệm thu.
- `using-superpowers` → chọn skills theo giai đoạn → inventory/điều phối và các bản SKILL đã đọc; không cài hook/toolchain.
- `grill-with-docs` + `grilling` → đối chiếu Q01–Q19 với source, chỉ hỏi identity Spider Plus → câu trả lời mới trên; không mở lại quyết định đã chốt.
- `codebase-design` → map document/revision/overlay, membership/device, router/report/AI consumers → `var/fixreports-2026-10-19/{domain,admin-search,ui}-audit.md` có file/seam và gate cụ thể.
- `writing-plans` → giữ một ledger, chốt dependency/ownership và public test seams → mục 5/8/10 kế hoạch này + `docs/api/fixreports-contract.md`.
- `domain-modeling` → phân biệt Feature/file/case/assignment/actor/report → `GLOSSARY.md`; `to-spec` + `api-design` → actor/input/output/quyền/lỗi/version ở contract cục bộ.
- `deprecation-and-migration` → additive clone/provenance, giữ revision+overlay, union cycle mapping, manifest exceptions, không cleanup trước → domain audit + contract. `security-review` → server scope/role/ownership, Admin không membership, không lộ secret/chat → các guard/test seams trong contract.
- `brainstorming` → so sánh mở rộng import/document với kho/parser mới hoặc đổi tên cycle → chọn additive tái sử dụng, ghi lý do trong contract. `impeccable` → Operate trên UI quản trị, audit sidebar/routes/focus/cấu hình AI → UI audit; context chạy một lần, không update tool.
- `dispatching-parallel-agents` → ba audit độc lập, mỗi agent chỉ sở hữu artifact được giao → ba báo cáo, không tranh source/schema/browser.
- Kiểm chứng checkpoint: đọc đủ năm tài liệu yêu cầu, source và DB inventory chỉ SELECT; chưa có test sản phẩm cho FR mới, coverage NOT_MEASURED, runtime migration NOT_RUN, UAT NOT_RUN.
- FR-01 contract chốt: Feature CRUD/archive/restore; nested Feature import/documents; assignment `{expectedVersion,requestKey,changes:[{assigneeMembershipId,rowIds}]}` thay trọn phần của owner được nêu, phần không nêu giữ nguyên; Tester chỉ sửa phần mình. Core page giữ `pageSize` tương thích document; các module đang dùng `size` giữ contract riêng. Ownership implementation: core FR02/03 + migrations; Admin/search FR06/07; Note/overview FR08/05; root Issue/AI/report/integration.
- Môi trường native test: tài khoản migrator bị MySQL **1044/42000** từ chối tạo schema mới. Ba schema cũ đều 69 bảng nên không coi là trống/không tự clean. Đã chuẩn bị `var/fixreports-2026-10-19/provision-isolated-tests.sql` chỉ tạo hai schema test mới và cấp quyền migrator; chờ provision. A03/native HTTP vẫn NOT_RUN, không tác động main.
- Cập nhật môi trường sau trả lời người dùng: đã được cung cấp tài khoản quản trị, dùng credential một lần qua stdin không echo/không lưu. Đã tạo/grant/verify **hai schema mới trống** trên native 3307: migration `tms_docstest_7cb4aee200db`, integration `tms_docstest_2060e04c986c`; manifest `isolated-targets.json`. Main `tms` và ba schema cũ không bị ghi. Không còn chờ user provision; password không nằm trong source/artifact.
- Core: `tdd` + `test-driven-development` → cùng một vòng RED/GREEN: FIXED validator RED8/1fail rồi GREEN8; assignment6 behavior RED rồi GREEN6. `api-design`/`security-review` → explicit scope/identity/version/row ownership; `deprecation-and-migration` → V31/V32 clone + exceptions. Native upgrade đã PASS1 (V30 fixture→32, bytes/revision/overlay/cycle/orphan/emptycycle/không tác động dữ liệu khác/replay0); fresh integration đang chạy. Harness đã sửa count migration thực tế28 ở V30, không bịa 30; environment AI local bị tắt riêng cho test, không đụng vault thật.
- Admin/search: `implement`, `api-design`, `security-review`, `tdd`, frontend skills → picker unassigned, one-PM handover, sticky nav, AND search và audit Việt Nam. FE scoped 150PASS; coverage S89.42/B85.68/F87.93/L94.10 đúng phạm vi25files (`admin-coverage`); BE Admin guard2GREEN, AdminSearch2RED đã quan sát trước sửa; xác nhận mới/native còn chờ. Chi tiết skills/commands tại `fr06-07-report.md`.
- Note/overview: `api-design`/`security-review` → backend scoped/PM/Admin/no fake membership/version; `tdd` → Notes service8RED stub rồi18GREEN (service8, real-policy6, MockMvc4); frontend patterns/UI/Impeccable Operate → CRUD/read-only/error/draft/project-race + approved identity copy. FE38PASS; coverage5files S96.85/B94.32/F96.22/L100 (`fr08-fe-coverage`). Chưa Browser/native, không gọi mock là DB proof.
- AI frontend: `frontend-patterns`, `frontend-ui-engineering`, `api-design`, `security-review`, `tdd`, `code-review` → toolbar config reuse, project/Feature target, future/pinned selection, owner/draft/race guards, worker personal prompts. FE64PASS, coverage4files S89.08/B86.49/F92.85/L94.60; buildPASS với existing chunk advisory. `fr09-frontend-report.md` giữ lệnh/phạm vi. Backend PM background + restricted totals + chosen-target background3RED đã quan sát; source đang thay, chưa claim GREEN.
- Metrics R03: `FeatureProgressContractTest` RED2 đúng lỗi 25% thay vì60 và empty null; đã đổi ReportMetrics giữ NA mẫu số, P/NA tử số, empty0. Chưa confirm mới trên toàn consumer, legacy reporting còn trong danh sách FR11.
- Issue frontend: `tdd` + frontend/API/security patterns → form tự điền exact context, failed save giữ actual text, không gọi onSaved/badge success; RED1 missing form → GREEN1. Backend stubs chưa có hành vi; chưa wiring case/board.
- Quy ước bằng chứng: build/test cũ không áp cho source thay sau cùng. Maven hiện dùng một slot độc quyền root cấp để tránh target overlap; các lần compile fail do file stub đang lên không được tính RED hành vi. Lint/typecheck chưa cấu hình riêng; coverage toàn repo chưa đo cho bản FixReports cuối.

| Truy vết | Module/seam | Acceptance |
| --- | --- | --- |
| R01 | Router/WorkBoard/overview/AI config/analysis | A09,A10,A17 |
| R02 | Feature + import/document + migration | A01,A02,A03,A19 |
| R03 | Assignment/result/progress transaction | A04,A05,A06,A20 |
| R04 | Feature issue/monkey + global type guards | A07,A08,A19,A20 |
| R05 | Admin picker/handover/layout | A11 |
| R06 | Shared token search + audit date queries | A12 |
| R07 | Notes + management report persistence | A13,A18 |
| R08 | AI policy/retrieval/config/report guards | A14,A15,A16,A17,A18 |

### Checkpoint tích hợp 19/10/2026, khoảng 01:50 — chưa phải kết luận DoD

- Core HTTP `FeatureIntegrationTest`:6 PASS trên native206 V32, gồm hai định dạng workbook độc lập, quyền ADMIN không membership, Status3/5, assignment/reassignment/history, tranh chấp và archive/hide. Nguồn bằng chứng `var/fixreports-2026-10-19/fr02-03-report.md`.
- Issue backend: native6 PASS, gồm context hiện hành, badge đóng, monkey ownership/softdelete/version/idempotency/comments, concurrent request, không tự đổi Status. Unit cuối13 PASS (trong đó AdminOverview7/Search2/Issue3/type1); coverage IssueService instructions91.77%, branches72.39%, lines100%, methods97.30% chỉ package/class được đo. Chưa suy toàn backend đạt coverage. `fr04-backend-report.md`.
- Issue frontend: detail17 hành vi PASS + sibling4, scoped detail S94.03/B78.37/F88.23/L94.68 (branch chưa80%); tests/root form/badge/board/QA tổng82 PASS ở lượt01:44. Sau đó bổ sung lỗi context-load retry/capability downgrade RED2→GREEN, Escape ở badge RED1→GREEN; lượt01:45 root19 PASS/4files. `fr04-detail-report.md`; chưa Browser.
- FR05 routing101 PASS/9files, coverage8sources S85.96/B87.39/F88.09/L92.56; build1696modules PASS. Old AI URL có hướng dẫn mở chat hiện có; deep links ràng buộc project và bỏ response/ngữ cảnh cũ. ProjectDevices obsolete Catalog link RED→GREEN, actions bàn giao/thu hồi giữ. `fr05-navigation-report.md`.
- Report: public HTTP/native2 + unit4 =6 PASS01:38:30. Sửa Markdown10→8, mở/tải đúng byte UTF8 đã lưu, nguồn10 Issue và StatusOK giữ nguyên; version cũ409; Tester/DEV denied, PM ngoài dự án404, ADMIN không membership đọc được. `ManagementReportService` lưu text riêng, không ghi vào case/Issue. Test cleanup lúc này chưa có expired draft thật, đã tăng cường source test và chờ chạy lại; không coi lượt2 cũ đã chứng minh purge thực thi.
- AI report preview: test công khai mock external boundary xác nhận selected Feature list sai2vs1 RED, filter trước provider đã sửa; core xác nhận generator3 PASS. Proposal vẫn là draft, không tự tạo/lưu report; quản trị guard trước cache/provider. Không live provider/no project data sent.
- AI policy/backend focused63 PASS. Native đã tái hiện `SecurityConfig` thiếu matcher `/ai/projects/**` (403 trước controller), worker context thiếu case được quyền đọc, actor history bị mất sau reset, và archive capability UI sai; source sửa và final native đang chạy. Không dùng kết quả focused để thay HTTP/UI chất lượng AI.
- FR11 tests:27 direct historical QA cases được giữ exact body/hash;19 trường hợp WorkBoard cũ thay21 trường hợp Feature/case/retired markers, qa-glue48 PASS. Metadata/API/type mới chỉ Bug/QA, old source read/history không bị đổi tên giả. `fr11-testupdate.md`.
- Review độc lập: `core-independent-review.md` ghi P1 PM form gửi membership PM như Tester, P2 blank/long source ID bị cắt, P2 V32 width13→padded14 từ chối source hợp lệ. Root xác minh/đẩy owner sửa bằng test; không sửa V31/V32 đã áp dụng. V33 repair bổ sung đang kiểm upgrade32; fresh33 và snapshot thực tế chưa chạy. Review report `fr10-backend-independent-review.md` đã yêu cầu purge thật và xác minh selected-Feature fix.
- Restore: `Rehearse-Restore.cjs` restore backup V32 của **migration fixture** sang `tms_docstest_78a615de4a4c`;86 bảng có row-hash/count giống nguồn, nguồn không thay đổi. `restore-rehearsal.json` có SHA backup và bằng chứng; đây chưa phải main backup restore hoặc kiểm V33.
- Main: backup native chỉ đọc tại `var/mysql-native/backups/2026-10-18T18-48-55-800Z-tms.sql` + manifest/SHA, session rows được loại theo script hiện có, DDL giữ. Không chạy migration/restart trên main. Chuẩn bị hai schema mới: fresh33 và restore snapshotV30 thật để đối chiếu trước áp dụng; không clean ba schema cũ.
- Skill áp dụng thêm: `requesting-code-review` → review cross-owner exact baseline/new files → findings có severity/source/counterexample; `receiving-code-review` → kiểm rule/callchain rồi bổ sung RED trước sửa → các finding trên, không đổi nghiệp vụ theo gợi ý. `code-simplification` → bỏ ref/state không dùng ở FeatureIssuesPage, chỉ scope thay đổi; hồi quy19 PASS. `verification-before-completion` + `verification-loop` → phân biệt các lượt source/coverage/native/runtime/UAT; structural Check-Contracts PASS và git diff --check PASS01:46. `e2e-testing` → fixture riêng4roles và API/browser plan, hiện PREPARED_NOT_RUN. `handoff` → UI handoff trong OS Temp không secret; chưa thay kết luận acceptance.
- A01–A20: hiện có bằng chứng từng phần ở module; **chưa đánh full PASS** khi browser và final integration chưa xong. Main applied/UAT/live AI vẫn NOT_RUN. Người dùng đã được hỏi tên PM phụ trách Spider Plus thật; chỉ phần tạo dự án thật chờ, tiếp tục fixture và source độc lập.
- Cập nhật sau trả lời user cho tự chọn PM: đã tạo **SPIDER-PLUS/project12** qua API nghiệp vụ của runtime8080 và đọc lại PM **syp.lab.pm03** thành công (`spider-plus-project.json`). Các PM hiện có đều đã có membership nên chọn người có ít membership nhất; không tạo tài khoản giả. Main vẫnV30/không restart, không migration/fixture; đây là **thay đổi nghiệp vụ được cho phép**, không còn tuyên bố toàn bộ main không có ghi. Snapshot V30/backup01:48 phản ánh thời điểm trước bổ sung dự án này; trước cutover phải lấy checkpoint mới. Thử credential bootstrap không hợp lệ401, sau đó dùng tài khoản demo Admin đã được tài liệu local ghi sẵn; không thay mật khẩu, không lưu/print credential.

Tại thời điểm lập kế hoạch chỉ khảo sát source/tài liệu và viết nội dung. Đã dùng `prompt-master` để soạn prompt và `writing-plans` để lập cấu trúc task/dependency/nghiệm thu; có review độc lập phần Feature/dữ liệu và AI/quyền, đã sửa các khoảng trống phát hiện. Đã kiểm liên kết tài liệu cục bộ, mã task và tiêu chí nghiệm thu. Không chạy build/test sản phẩm, migration, restart, commit/push. Các bước trên là yêu cầu cho phiên triển khai tương lai.

Bàn giao triển khai phải nêu các R-ID đạt/chưa đạt, hành vi người dùng nhìn thấy, thay đổi dữ liệu/contract, skill và evidence, test PASS/FAIL/NOT_RUN, hạn chế và next action. Cập nhật trạng thái dự án theo việc thực làm, giữ UAT/thiết bị thật/NFR hoặc điều kiện khác còn mở. Không kết thúc chỉ vì đã viết kế hoạch khi người dùng ở phiên sau đã yêu cầu thực hiện phần rõ; cũng không tự thực hiện kế hoạch trong phiên chỉ yêu cầu viết tài liệu.

### Checkpoint cuối 19/10/2026 — source và môi trường cô lập

- Báo cáo chính: [triển khai, skill và A01–A20](../reviews/2026-10-19-fixreports-implementation-review.md). FR00–11 hoàn tất trong phạm vi source/test cô lập; FR12 IN_REVIEW cho các giới hạn được chỉ rõ, không đóng S11.
- FE975/975,105files; coverage S86.10/B82.70/F80.33/L86.73 và build PASS. BE645/645,74class,zero failure/error/skip và verify/package PASS; coverage unit-only I46.04/B45.57/L49.60/M42.93, chưa gộp native và không claim toàn backend80%.
- Core/AI102 theo scope +16guard; Admin14 và Notes/Report/Issue14 cuối PASS. Các suite có thể lặp, không cộng thành một số tổng. Report cleanup dùng actual expired draft; browser Markdown110byte khớp nội dung đã lưu.
- Snapshot backup main trước project12: restoreV30→33 PASS,76 bảng/7.362 row cũ byte/hash nguyên,10copy/711case/currentrevision/overlay/workbook/mapping,9padded source phục hồi và replay0. Source document1/project1 thiếu workbook giữ nguyên exception;120case không file giữ nguyên, chưa chuyển. Before bất biến và firstFAIL được archive/hash; corrected local locations nạp20/22, chỉ31/32/33pending rồi migrate+postvalidate sạch; không ignore/repair.
- systematic-debugging → tách lỗi harness khỏi sản phẩm: standalone javac/runtime phải cùng resolved Mavenclasspath và Javaargfile để tránh classpath quá dài/mixedversions; WebMVC slice mock đúng guard ngoài scope; OAuth dùng latch cho deadline/discovery/settlement, giữ production và assertion. Các lượt RED được giữ riêng; final645PASS.
- Browser thật Chrome4roles trên5174/8081/schema206,320/390/768/1440px; assignment/Status/Issue/monkey/DEV/report/Note/Adminmember/device/archive/edit/chat scopes đã chạy. Modal scopedCSS và chat numeric0 đã RED→GREEN và kiểm ảnh. Bản jar test cuối dùng immutablecopy; chỉ process test được restart. Main8080V30/76tables/UP, không restart/migrate.5173Vite có thể tự đọc source mới: dùng preview5174 để kiểm model mới.
- User đã cho phép tạo project12SPIDER-PLUS vớiPM tự chọn syp.lab.pm03. Backup sau thay đổi này: var/mysql-native/backups/2026-10-18T19-02-48-762Z-tms.sql.json; snapshot diễn tập dùng backup trước đó với provenance riêng.
- NOT_RUN/giới hạn: Chrome upload bị Allow access to file URLs chặn; download workbook gốc browser chưa xác nhận; chưa có bộ ảnh trước/sau mọi trạng thái/manual exhaustive; liveAI/UAT/Safari/Firefox/thiết bị thật/pilot/NFR riêng. API/native import/export/roundtrip PASS không thay kết luận browser. Không auto đổi quyền extension; không tự commit/push/merge/deploy.
- skill→purpose→evidence từngFR nằm bảng báo cáo chính; scope/checks/sourcehash/diff/secret-shape và lệnh ở var/fixreports-2026-10-19. Lint/typecheckJS riêng NOT_CONFIGURED; coverage không đo gộp ghi rõ.

### FR-12 follow-up 19/10/2026 — lỗi tại5173 và kiểm tra lại Chrome

- Người dùng xác nhận đang dùng5173 và Allow access to file URLs đã bật. Tool vẫn từ chối setFiles; không có bằng chứng quyền thực đang tắt. Không lặp kết luận user chặn quyền. Xem [báo cáo cập nhật](../reviews/2026-10-19-fixreports-ui-followup.md).
- [x] Tái hiện main: đăng nhập/Admin GETproject200 nhưng Feature/Issue/management-reportsummary404; preview8081 cùngAPI200. Main vẫnV30/UP. Thiếu sót môi trường bàn giao là lỗi cần xử lý, không hạ thành mọi test đã qua.
- [x] Sửa7lỗi UI/hành vi: mobiletable/decimal/statuslabel/AI-disabledreason/listTesterretry/rangeerase/Adminreload. Năm regression mới RED→GREEN; full980/105files/coverage/build PASS sau sửa cuối.
- [x] Browser390/768/1440, ảnh trước/sau bảng, Adminreload, typedrange→Tester→range giữ, Escape/focus, console cửa sổ cuối sạch. Không sửa nghi vấn catalog vì browser/source bác bỏ.
- [x] Backup main mới lúc08:00, SHA/manifest và đọc-only process7016/parent6456 có workspace; phương án cutoverV30→33 cụ thể trong báo cáo, không tự dừng/start/migrate main.
- [x] Đồng bộ backend8080/main V30→33 sau khi user cho phép; backup writer-stopped,7.374 row giữ nguyên,12GET200 và Chrome5173 PASS; bằng chứng ở checkpoint cuối. Không trỏ5173 sang DBtest.
- [ ] Browserupload tự động: tool chưa hoạt động dù user xác nhận quyền bật; không bypass giới hạn chrome:// hoặc tự đổi setting. Các manual/UAT/live gates còn lại giữ riêng.

Skill→purpose→evidence trong báo cáo follow-up; dùng cùng ledgerFR12. Không commit/push/merge/deploy, không cài dependency; BE không đổi nên không chạy lại suite backend để tạo claim mới.

### FR-12 — main đã nâng cấp theo quyền người dùng (19/10/2026, 09:05–09:09)

- [x] Người dùng xác nhận “Cho phép nâng cấp main và khởi động lại 8080”. Dừng đúng Java7016; không dừng Vite5173/5174 hoặc backend8081. Khởi động workflow local hiện có, backend mới PID30588, healthUP và không có ERROR khởi động.
- [x] Backup mới sau dừng writer: `var/mysql-native/backups/2026-10-19T02-04-46-677Z-tms.sql`, 3,504,332byte, SHA256 `159fe94ffd90539b1e1fc3cf8bf16347e8b259c189f651c67da771e03f8c2c2c`, V30; giữ backup cũ và DDL session, không mang session rows vào dump.
- [x] Flyway local nạp cả migration/demo, áp đúng V31/V32/V33; validate33 PASS, failed0, pending0. Không repair/clean/đổi checksum hoặc restore đè; không chạy replay ghi trên main, replay0 vẫn là bằng chứng của diễn tập cô lập.
- [x] Main được kiểm riêng: 76 bảng cũ có74 bảng ngoài session được so sánh từng hàng/cột cũ, **7.374 hàng giữ nguyên**; hai bảng session loại khỏi kiểm row như chính sách backup, không phải claim giữ mọi session. 10 bản sao/711case/workbook/currentrevision/overlay/mapping độc lập, StatusUnexecuted và assignee rỗng đúng kế hoạch; 9 nguồn padded phục hồi. Nội dung file bằng nguồn hiện hành, không chuyển kết quả/phân công/Issue cũ vào graph mới; graph cũ vẫn giữ.
- [x] Cấu hình local giữ nguyên (hash .env.mysql.local khớp; thư mục evidence mặc định được kiểm không có file nên không có claim hash mọi evidence ở đường dẫn tùy chỉnh). Không seed dữ liệu test vào main, không gọi AI với dữ liệu dự án; dùng cấu hình AI local hiện có.
- [x] HTTP đăng nhập Admin hiện có: project/Feature/Issue/reportsummary ở project1,3,12, **12/12 GET200**, failedmigration0. Chrome5173: Feature4, file2/283case, bảng128case, form phân công tải được Tester rồi đóng không lưu; Issue và Analysis370case tải xong; Admin reload giữ analysis/workspace. Console cuối không warning/error. Mobile đo thực391px/page386px/table672px, cuộn trong bảng; viewport đã reset. Không suy kích thước yêu cầu390 thành kích thước thực khi browser zoom tạo520px.
- [ ] Workbook gốc qua browser chưa xác nhận: thử chờ download hết30s làm reset phiên công cụ; đọc lại màn không có lỗi app/console, không gán nguyên nhân hoặc đánh dấu PASS. Upload tự động vẫn là giới hạn công cụ trước đó dù người dùng xác nhận fileURL đã bật. LiveAI/UAT/mọi tổ hợp nút/thiết bị thật giữ NOT_RUN/chưa đầy đủ.
- [ ] Source1/project1 thiếu workbook và120case không gắn file vẫn được giữ ở graph cũ, chưa chuyển; cần nguồn/quan hệ có thể chứng minh nếu muốn chuyển. Không tạo workbook giả.

Skill FR-12 bổ sung: `deprecation-and-migration` → backup khi writer dừng, áp migration additive đúng đích, giữ graph cũ → backup/stop/start và before/after proof; `verification-loop` → đối chiếu dữ liệu và kiểm API/UI thực trên5173 → 7.374row,711case,12GET và browser proof. Không đổi source sản phẩm trong bước cutover, không chạy lại suite để tạo số test mới; FE980/BE645 là kết quả source trước đó. S11/FR12 vẫn IN_REVIEW vì các gate được nêu, không commit/push/merge/deploy ngoài lần khởi động local được cho phép.

Evidence chính: [đối chiếu main](../../var/fixreports-main-cutover-2026-10-19/main-after-proof.json), [HTTP](../../var/fixreports-main-cutover-2026-10-19/main-http-proof.json), [Chrome](../../var/fixreports-main-cutover-2026-10-19/main-browser-proof.json), [runtime](../../var/fixreports-main-cutover-2026-10-19/main-runtime-final.json), [backup](../../var/fixreports-main-cutover-2026-10-19/main-backup.json).
