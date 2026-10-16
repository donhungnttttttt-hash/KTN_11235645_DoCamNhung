# Rà soát luồng hiện hữu — 16–17/10/2026

Hoàn tất phần source, sửa lỗi tái hiện được và kiểm chứng local dưới đây: **5 lỗi hành vi đã sửa**, thêm16 regression frontend và1 regression HTTP native. Test HTTP mới chưa chạy vì thiếu schema test V29. Sửa thêm3 tài liệu mô tả sai quyền/implementation hiện hành. Không kết luận mọi button, dữ liệu và trạng thái đã được nghiệm thu.

S11 giữ **IN_REVIEW**. Không commit/push/merge/deploy/PR/issue, không start/restart ứng dụng/container, không fixture/ghi/xóa/seed trên database sử dụng. Script/artifact lịch sử trong `var/` được giữ nguyên, không thực thi. Checklist duy nhất tại [tasks/todo.md](../../tasks/todo.md); task/phụ thuộc/acceptance tại [tasks/plan.md](../../tasks/plan.md).

## Baseline và phương pháp

- Branch `system-design`, integration `develop`; HEAD đầu đợt `c42e3f0ab87403cf39122c85fe63bc267368b7ad`, tracked diff ban đầu rỗng. Bắt đầu16/10, kiểm chứng cuối qua00:00 ngày17/10 Asia/Saigon. Số liệu11/10 là lịch sử, không dùng làm kết quả chạy mới.
- React18.3.1 JavaScript, Vite6.4.3, Vitest4.1.11/Testing Library; Java21, Spring Boot3.5.16, JPA và store JDBC hiện có; MySQL native9.7.0/Flyway V29, `127.0.0.1:3307/tms`. Không đổi stack/schema/migration.
- Đọc AGENTS/RTK, planning README/STATUS/execution guide, development-skills, product/permissions, kế hoạch/checklist, contract/DDL/decision liên quan. Truy vết đường nghiệp vụ chính và diff qua UI→API→quyền hiện hành→service/transaction→DB→readback. Inventory/tìm tên phương thức không được tính là đã đọc và chứng minh đúng mọi dòng.
- Ba agent phụ có phạm vi ghi riêng: Admin/project/identity; testcase/execution/filework; work/QA/retest/report/AI/integration. Root giữ shared UI/API/router, scripts/Maven và tài liệu. Review chéo theo **Spec + Standards**; tự review không được gọi là độc lập.
- Phạm vi đọc, từng action/test seam và giới hạn chi tiết: [admin](../../var/review-2026-10-16/admin.md), [testing](../../var/review-2026-10-16/testing.md), [work-quality](../../var/review-2026-10-16/work-quality.md). Đây là evidence local, không phải tracker/nghiệm thu khác.

## Thuật ngữ và quyết định có hiệu lực

| Khái niệm | Điều kiện đã chốt được dùng khi review |
| --- | --- |
| ADMIN/membership/actor | [Quyết định10/10](../planning/2026-10-10-admin-full-authority.md) và [permissions](../business/permissions.md) thay Admin chỉ xem. ADMIN toàn quyền nghiệp vụ dự án, vẫn giữ validation/version/archive/history. Membership inactive để attribution không tự enroll ADMIN làm PM. Private chat/credential AI vẫn theo ownership contract. |
| Case/revision/cycle/run | Case là identity, revision bất biến/được duyệt trước scope. Run pin revision/cycle/config/assignee. Reload không âm thầm đổi run hoặc duyệt revision chưa đối chiếu. |
| Document result/execution result | [Quyết định11/10](../planning/2026-10-11-execution-document-results.md): Unexecuted→OK→NG→P→NA→Unexecuted; manual không ghi ngược run. Lần ghi execution mới nhất cùng project/case chiếu sang tài liệu, không mặc định chỉ lấy Tester lần2. Replay không đè manual change xảy ra sau lần ghi gốc. |
| Test lần2 | Phân công một run thật có cycle/config/Tester/version, không chỉ là tên cột Excel. Existing run không tự chuyển context khi retry. |
| File-work/máy | Range theo ID nguồn; scope pin run. Session dùng máy vật lý được bàn giao đúng project/người; máy kho khác cấu hình browser/device của run. |
| BUG/QA/retest | Fix không phải OK; QA answer/confirmation có generation, khác comment. BUG_ONLY khác FULL_CASE. Generic transition không thay typed authority hoặc tự ghi kết quả. |
| Report/integration | NA không thuộc mẫu số applicable; narrative không sửa metric. Queued không phải Redmine delivered. AI tạo nội dung riêng để duyệt, không tự thực hiện lệnh nghiệp vụ. |

Không có quyết định nghiệp vụ mới cần phỏng vấn. Rule/pilot khách thật còn theo planning, không tự gắn nội bộ thành rule khách.

## Ma trận hiện trạng theo module

Source/DB dưới đây xác nhận **có implementation và đã truy vết**, không thay integration/browser. Live writes/UAT đợt này chưa chạy. Tên file frontend thuộc `Frontend/src/app/`, Java thuộc `Backend/src/main/java/vn/syp/tms/`.

| Module | Yêu cầu đã chốt | UI | API/service | Database | Test chạy mới | Khoảng trống / file:dòng |
| --- | --- | --- | --- | --- | --- | --- |
| Login/session/quyền | Current enabled identity, session version/CSRF; PM chỉ tạo TESTER khi được cấp | AuthProvider/Boundary/AccountMenu | AuthController, SessionAccountFilter, IdentityService/SecurityConfig | identity_users/session/audit; revoke/version phía server | Auth React trong872; identity/session/security trong552 | Browser login/logout chưa chạy. `features/auth/AuthProvider.jsx:12`, `identity/IdentityService.java:59,73`; revoke race còn investigation. |
| Admin/project/nhân sự/máy/catalog | ADMIN quản lý membership/máy/lifecycle; last-PM/version/recipient | AdminProjectDetail/Lifecycle; ProjectDevices/AssignDialog; Catalog/Rules/Handbook | AdminProjectService, ProjectService, Inventory/LifecycleService | Project/member/asset/allocation locks, audit cùng transaction, không tự enroll creator | ADM-01 targeted19, final872; admin/device unit trong552; ADM-03 SQL thật readonly | Bàn giao/race/rollback native chưa chạy. `features/admin/AdminProjectDetail.jsx:25,38`; `project/ProjectService.java:86,116,204,241`; `admin/DeviceInventoryService.java:22,43,57`. |
| Excel/case/revision | Preview riêng/checksum; giữ source, revision được duyệt | ImportExcelDialog, TestDocuments/Page, CellEditor | TestCaseService/controller, TestDocumentService/EditingService | import_batches/rows, case/revision, cell overlays/history; composite project FK; commit transaction | T-01 RED→GREEN; workbook/result unit trong552; UI trong872 | Import/commit/export HTTP/XLSX thật chưa chạy. `testcase/TestCaseService.java:188,233,276,298`; `TestDocumentEditingService.java:41–73`. |
| Cycle/scope/file/session | PM/ADMIN điều phối approved scope; range nguồn; session đúng máy/assignee | ScopeSetup, FileWorkPage/Detail, CaseRangePicker, AssignmentDialog | ExecutionService:70–172; FileWorkService:62–188; SessionService:23–116 | Cycle/config/run/group/session; version/replay; atomic scope; unique DOING machine |98filework service/session/execution unit trong552; React872;10SQLchecks | Native concurrency/reassignment/rollback chưa chạy. `filework/FileWorkGuard.java:23–110`, V17/V28/V29; context source/case/config/revision đã trace. |
| Result/test lần2/history | Latest execution→document một chiều; manual riêng | AttemptDialog, ResultCycleButton, DocumentExecution/SecondTest | ExecutionService:175–260; DocumentService:59–101; EditingService:79–100 | Append attempt/latest pointer/projection/audit cùng transaction; manual riêng version/history; second-test FK run | T-02 RED→GREEN;13document conflict regressions; scoped32/final872; DocumentResultService7 trong552 | NativeExecutionDocumentResultTest và runtime UI chưa chạy mới; không backfill dữ liệu. |
| BUG/Dev/retest | Theo role/assignment; Fix cần build; close đủ current coverage | WorkItemDetail/TransitionDialog, RetestPanel/Result/CoverageEditor | WorkItemService:145,184,202,232,266; RetestService:123,135,180,221,235 | Canonical work identity/history; retest round/request/result; replay/optional closure transactional | WQ-01 RED→GREEN; scoped97/final872; Dev/Lifecycle/History/Retest unit trong552 | Role journey/closure/assignment races chưa chạy native/browser. `features/work-items/WorkItemDetail.jsx:85`. |
| QA | Typed role/generation, giữ history | QaForm/Panel, HandoffPanel | QaService:123,173; HandoffService:83,109 | Same-project FK; generation invalidates pointers; immutable answers/confirmations; generic route từ chối QA |100QA/Handoff unit trong552; UI trong872 | Two-actor native race/role-data UAT chưa chạy; không đồng nhất answer/comment. |
| Report/export/audit | Một metric; NA/applicable; timezone/snapshot/source trace | ReportsPage, ProjectStatusReports, AdminDashboard/Audit | ReportingService:34,43,48; StatusReportService:35,63; AdminAudit/Overview | Repeatable-read; latest attempt theo build; workbook STRING; append-only narrative; bounded export | Unit trong552, React872; contract ADM-02 đã sửa | XLSX thật/date-DST/report replay native chưa chạy mới. `reporting/ReportWorkbook.java:58`; `admin/ProjectStatusReportService.java:35,63`. |
| Redmine/AI/evidence | Queue≠delivered; private owner; không tự mutate; scoped upload | RedminePanel, AiAssistant/Chat/Connections, EvidencePanel | RedmineService/Worker, AiAccess/Draft/Chat, EvidenceService | Outbox fence/lease; HTTP ngoài transaction; owner/key/quota; blob/digest/audit rollback | Mock/provider/client/evidence unit trong552, React872; vault2 trong552 | Không gọi provider/OAuth/Redmine thật hoặc dùng key thật/upload live. `integration/RedmineWorker.java:26,36,68,117`, `ai/AiAccess.java:18`, `attachment/EvidenceService.java:31,58,65`. |

Root đọc lại API client/router/resource-refresh/focus hook/SelectionTable/TableScroll. Client giữ HTTP status khi error JSON lỗi, timeout/cancel/401; table có keyboard region, select-visible giữ lựa chọn trang khác. Không có repair mới được xác nhận ở shared interface này.

## Findings và hồi quy

P2 là lỗi chức năng có ảnh hưởng thực tế, thường có workaround; P3 là mô tả/tài liệu sai. Không có P0/P1 được xác nhận trong phạm vi này, không phải chứng nhận không còn lỗi khác.

| ID / mức độ | Trigger và nguyên nhân | Sửa / vị trí hiện tại | RED→GREEN / trạng thái |
| --- | --- | --- | --- |
| ADM-01 / P2 | Sửa nháp role rồi gỡ member: roleDrafts mồ côi khiến pendingChanges true vô hạn, khóa archive readiness | `AdminProjectDetail.jsx:38`: chỉ xóa draft người vừa gỡ sau API thành công; giữ draft người khác và toàn bộ draft khi lỗi | RED đúng nút disabled→targeted19 PASS; strengthened failed-remove/retained-drafts4 PASS; full872 PASS. **FIXED**. |
| T-01 / P2 | Edit409 nhưng mọi retry dùng immutable cell.version/revision props cũ, phải đóng mất nháp | `DocumentCellEditor.jsx:16,29`: reload đúng row/case/token, giữ nội dung, hiển thị nội dung hiện hành, deliberate save;401/403/404 fail closed |7initial document regressions RED chung T-01/T-02;13final mới PASS; scoped32/full872 PASS. **FIXED**. |
| T-02 / P2 | Concurrent assignment/attempt làm token test lần2 stale; retry chỉ tải choices | `DocumentSecondTestDialog.jsx:35–60`, authority props `TestDocumentPage.jsx`: reload đúng source/run/cycle/config, giữ Tester/note, hiện current assignment và explicit save | Source-pin/missing-run/403/retry/changed-revision regressions PASS. Thêm guard revision mới RED→GREEN, không duyệt nội dung chưa xem. **FIXED** cho same-context recovery. |
| WQ-01 / P2 | Reload item pending/403/network vẫn cho comment/evidence/edit/reference bằng state/quyền cũ | `WorkItemDetail.jsx:85`, `work-items-live.css:36`: disabled fieldset bao commands khi loading/error, giữ draft/file; refresh ngoài; đọc thành công mới mở | RED15PASS/2FAIL→scoped97/full872 PASS. Đây là UI authority/feedback, không chứng minh server bypass. **FIXED**. |
| ADM-03 / P2 | Keyword Unicode trên username ascii_bin gây MySQL3854 dù OR display_name hợp lệ | `AdminProjectService.java:67`: CONVERT riêng username sang utf8mb4 COLLATE utf8mb4_bin; shared WHERE count/items, giữ literal/case | SELECT cũ **ERROR3854**, exact final clause **PASS**. Public HTTP regression `AdminNativeIntegrationTest.java:126` viết/compile, **NOT_RUN**. **SQL FIXED; HTTP gate OPEN**. |
| DOC-01 / P3 | Contract report/Redmine còn hạn chế ADMIN cũ; README work-items còn nói in-memory/no backend | `docs/api/admin-reporting.openapi.yaml`, `docs/api/redmine.md`, work-items `README.md` | Đối chiếu decision10/10/service; independent review phù hợp; contract structural check cuối. **CORRECTED**. |

Recovery không tự ghi đè sau409. Phân công mới gặp revision đổi cần mở lại/đối chiếu; giữ nháp để sao chép. Source/case/run thay hoặc mất quyền không mở khóa ghi chỉ vì choices tải được. Không làm yếu server validation/concurrency để nút hoạt động.

### Chưa xác nhận, không sửa theo suy đoán

- `IdentityService.create/update`, current-admin read của `DeviceInventoryService` và `TestDocumentService.updateResult:60–64` chưa chứng minh serialize với đồng thời thu hồi identity/session bằng native two-connection test. Thiếu một lock so với đường khác không đủ kết luận exploit. **INVESTIGATION_REQUIRED**; cần isolated V29, barrier revoke/write/replay, rollback/readback trước sửa.
- Giả thuyết callback refresh khiến mutation thành công báo thất bại bị loại ở production callsite: `TestDocumentPage.load` tự catch GET failure/render page error. Không sửa callback giả định không được production dùng.
- Reports pagination candidate bị loại sau trace unmount/reset khi data=null. Không tạo finding từ độ dài/độ phức tạp source đơn thuần.

## Kiểm chứng mới

Artifact mới trong [var/review-2026-10-16](../../var/review-2026-10-16/README.md). Shell qua `rtk`; không cài hook/package/toolchain hoặc đổi policy toàn máy.

| Lệnh / kiểm tra thực tế | Kết quả | Bằng chứng / giới hạn |
| --- | --- | --- |
| `rtk proxy npm test -- --maxWorkers=2` từ canonical `Frontend` trước sửa | **PASS**,78files/856tests | frontend-baseline.log; không cộng với final. |
| `rtk proxy node node_modules/vitest/vitest.mjs run --coverage --maxWorkers=2` từ `Frontend` sau freeze | **PASS**,79files/**872tests**,exit0,126.85s | frontend-final-coverage.log; +16regressions=1Admin+13document+2work; API doubles/jsdom, không phải browser/server. |
| `rtk proxy npm run build` sau freeze | **PASS**,1729modules,4.83s | frontend-final-build.log;672.71kB JS chunk vượt advisory500kB. Không đổi threshold/refactor split thiếu phép đo. |
| Cached Maven3.9.11 `-o -B -ntp -Dmaven.repo.local=C:/Users/admin/.m2/repository -Dtest=<57 lớp> verify` | **PASS**,**552tests**,0fail/0error/0skip; package/JaCoCo thành công,50.286s | backend-unit-verified.log; unit/security/mock, **không full native/Testcontainers**. AiProviderIntegrationTest là mock, không provider live. |
| Cùng Maven `-Dtest=ChatGptCredentialVaultTest -Djacoco.skip=true test` | **PASS**,2tests, nằm trong552 | backend-vault-final.log; test tự tạo key/payload tạm, không dùng credential thật. |
| `rtk proxy node scripts/Check-Contracts.cjs` | **PASS**,exit0 | STATUS/S11,113S03–S10ops,19filework+14QA/handoff,34+19F/Qschemas,52doc links/controller/DTO mapping; **structural**, không full OpenAPI/HTTP. |
| `rtk proxy node scripts/Audit-DatabaseRelations.cjs var/review-2026-10-16` | **PASS**,76tables/**185FK**,0orphan violation | database-relations.json; READ ONLY, không suy mọi rule đúng từ FK. |
| `rtk proxy node scripts/Audit-WorkflowLinks.cjs var/review-2026-10-16` | **PASS**,**10checks**,0violation | workflow-links.json; project/case/revision/run/attempt/group/source/QA, committed mapping; SELECT snapshot. |
| SELECT lỗi Unicode cũ / exact final clause | **ERROR3854→PASS**,count0 | unicode-user-search-sql-final.json; MySQL/tms READ ONLY; count0 không chứng minh positive HTTP match. |
| Impeccable context + detector5changedUI targets | Context output; mechanical JSON `[]` | ui-context.log/ui-mechanical.log; không có PRODUCT.md/DESIGN.md kiểu skill, dùng product docs/source có sẵn. Không phải WCAG/responsive/visual PASS. |
| ui-ux-pro-max local search | **NOT_RUN**, thiếu python/python3/py trên PATH | ui-ux-feedback.log; dùng fallback feedback/labels/focus của SKILL, không có verified search match. |
| `rtk proxy git diff --check` | **PASS**,exit0 | Không whitespace error; LF→CRLF warnings hiện hữu khác Java warning. |
| Native V29 / HTTP regression mới | **NOT_RUN** |3isolated schema hiện có chỉ V21/V22; runner yêu cầu preprovisioned schema, không tạo/grant/reset. Không migrate schema cũ hoặc chọn tms chạy fixture. |
| Browser/HTTP runtime | **NOT_RUN** | Health8080/5173 ECONNREFUSED; không tự restart/start. React/jsdom không thay browser. |
| UAT/physical-device/live Redmine/AI/OAuth | **NOT_RUN** | Gate môi trường/role-data/nghiệm thu thật riêng. |
| Lint/JS typecheck | **NOT_CONFIGURED** | package.json không có script; build/test không phải lint/typecheck PASS. |
| Fresh dependency advisory scan / JDT Problems | **NOT_RUN** | Không tái dùng scan/JDT cũ; compile/package/source security là bằng chứng khác. |

Maven chạy qua `rtk proxy cmd.exe /d /c C:/Users/admin/.m2/wrapper/dists/apache-maven-3.9.11/03d7e36a140982eea48e22c1dcac01d8862b2550b2939e09a0809bbc5182a5bc/bin/mvn.cmd ...`. Cache explicit vì Java sandbox có user.home khác. Selector57lớp chỉ đọc từ text `var/ui-audit/unit-test-list.txt`, kiểm regex trước dùng; không chạy script lịch sử. Run cuối ngoài sandbox được automatic approval cho unit test tự tạo temp/ACL, không cấp quyền DB/restart.

### Coverage thực đo

| Phạm vi | Statements/instructions | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend toàn phạm vi cấu hình Vitest | **87.04%** (6525/7496) | **84.16%** (6134/7288) | **81.74%** (2194/2684) | **86.92%** (3456/3976) |
| Backend JaCoCo toàn production từ57unit/security classes | Instructions **50.06%** (30836/61599) | **48.61%** (2482/5106) | Không có counter functions kiểu JS | **50.39%** (2948/5850) |

JaCoCo phân tích342class. BE line/branch thấp vì nhiều JDBC/native path chưa chạy; **không đạt/thay thế coverage native/module gates**. Không suy coverage từ số PASS hoặc gọi coverage đầy đủ hệ thống vì FE đạt80%.

### Lỗi môi trường/lượt trung gian

`Test-Backend.ps1` bị execution policy chặn; process-only Bypass với trusted script tiếp tục gặp wrapper đọc `.Target[0]` cache path lỗi trong sandbox. Không sửa wrapper/policy toàn máy. Direct Maven dùng repository sai ban đầu thiếu parent POM; cache explicit giải quyết offline. Sandbox552test có49error cleanup `@TempDir` ngoài workspace; chuyển temp vào target còn1error vì vault **đúng thiết kế** từ chối credential trong source. Không nới guard. Test vault riêng rồi final552 ngoài sandbox đều PASS. Các log FAIL được giữ, không tính thành product regression hoặc che khỏi lịch sử.

Scoped Vitest owner có summary289PASS nhưng Ctrl-C riêng session do wrapper không kết thúc/flush; exit1 không phải clean PASS. Sau đó targeted32/final872 exit0. Một lượt đồng thời lúc Admin regression đang RED có1expected failure, không thay baseline/final. Lowercase `frontend` cwd gây duplicate matcher identity trên Windows; đã dùng đúng `Frontend`, không sửa product để né harness lỗi.

## Review độc lập

- Testing owner review Admin/WorkItem diff+descendants:0actionable Spec/Standards; native fieldset bao commands/nested controls, refresh bên ngoài, không portal trong descendants này.
- Work-quality owner review Admin/documents rồi final revision guard/Unicode/scripts: không có critical/P1/P2 được xác nhận. Revision đổi bị chặn trước adoption/approval reset; equal revision vẫn recover/preserve draft/run pin. SQL audit không đổi, outputdir mới không ghi đè artifact cũ.
- Root kiểm diff, actual callback, context guards, parameterized SQL, shared client/router/focus/table và kết quả compile/package. Không mở vòng review/test toàn hệ thống mới khi chỉ thay tài liệu.

## File thay đổi và lý do

| File | Lý do |
| --- | --- |
| `Frontend/src/app/features/admin/AdminProjectDetail.jsx` | Xóa đúng role draft sau gỡ thành công. |
| `Frontend/src/app/features/admin/AdminProjectLifecycle.integration.test.jsx` | Regression failed/successful remove, retained drafts/lifecycle. |
| `Frontend/src/app/features/test-cases/DocumentCellEditor.jsx` | Conflict reload giữ nội dung/cập nhật context/token. |
| `Frontend/src/app/features/test-cases/DocumentSecondTestDialog.jsx` | Conflict reload giữ phân công nháp, source/run pin/revision guard. |
| `Frontend/src/app/features/test-cases/TestDocumentPage.jsx` | Truyền quyền hiện hành vào hai dialog. |
| `Frontend/src/app/features/test-cases/document-conflicts.test.jsx` |13behavior regressions conflict/retry/permission/source/revision. |
| `Frontend/src/app/features/work-items/WorkItemDetail.jsx` | Khóa grouped commands khi authoritative reload chưa thành công. |
| `Frontend/src/app/features/work-items/WorkItemDetail.test.jsx` |2regressions draft/file/PM edit/reference khi reload. |
| `Frontend/src/app/features/work-items/work-items-live.css` | Fieldset giữ grid/spacing/border hiện có. |
| `Backend/src/main/java/vn/syp/tms/admin/AdminProjectService.java` | Keyword Unicode trên username, giữ binary matching. |
| `Backend/src/test/java/vn/syp/tms/admin/AdminNativeIntegrationTest.java` | Public HTTP regression Unicode/literal/case/page; guarded NOT_RUN. |
| `docs/api/admin-reporting.openapi.yaml`, `docs/api/redmine.md`, work-items `README.md` | Sửa mô tả ADMIN/live API lỗi thời. |
| `scripts/Audit-DatabaseRelations.cjs`, `scripts/Audit-WorkflowLinks.cjs` | Optional outputdir tránh ghi đè evidence cũ; SQL READ ONLY không đổi. |
| `tasks/plan.md`, `tasks/todo.md`, `docs/planning/README.md`, `docs/planning/STATUS.json`, báo cáo này | Một plan/checklist, status/evidence/handoff đọc tiếp được. |
| `var/review-2026-10-16/` | Evidence local mới; Record-Verification.cjs chỉ đọc log/Git, probe listener HTTP hiện có và lưu tổng hợp. Không credential/thực thi scratch scripts cũ. |

## Skill → đầu ra thực tế

SKILL.md đọc theo giai đoạn, không nạp toàn thư viện. Gốc `C:/Users/admin/.codex/skills/<tên>/SKILL.md`; owner ghi chi tiết riêng. “Đọc” khác hoàn thành mọi bước workflow.

| Skill | Công việc áp dụng | File/đầu ra | Bằng chứng | Giới hạn |
| --- | --- | --- | --- | --- |
| ask-matt; using-superpowers | Chọn audit→diagnose→TDD→review | Plan/checklist chung | R1–R6 và baseline | Không discovery lại rule đã chốt. |
| setup-matt-pocock-skills | Kiểm tra local triage/domain/tracker setup | Dùng docs/planning/tasks/decisions/product | Không rootGLOSSARY/docs/agents; hệ thống hiện có đủ | Không tạo tracker/label từ xa. |
| domain-modeling; product-capability | Phân biệt actor/member, revision/run, manual/execution, máy/config, QA/retest | Bảng thuật ngữ/9luồng | Source traces và10SQLchecks | Không phát minh domain/khách rule. |
| codebase-design | Khoanh state/version/read-authority ở component, server đã có guards |4UIrepairs | Tận dụng API/hook/table hiện có | Không đánh đồng thiếu recovery với sai kiến trúc. |
| diagnosing-bugs; systematic-debugging | Tái hiện, kiểm hypothesis, lần dữ liệu |5finding/candidates | Expected RED, nativeSQL3854 | Không kết luận race từ source. |
| to-spec; writing-plans; to-tickets | Actor/input/error/acceptance/dependencies local | tasks/plan R1–R6, todo | Giữ nháp/revalidate/explicit resave | Không thêm tracker/task system. |
| implement; subagent-driven-development; dispatching-parallel-agents |3phạm vi riêng, root shared/Maven, freeze→review |3owner reports/diff | Tối đa3agent phụ, không cùng file | User override default commit/worktree/ledger. |
| tdd; test-driven-development | Một vòng RED→GREEN hành vi |16FE regressions | Expected failing assertions trước product sửa→872PASS | SQL lỗi thật thay string assertion; HTTP native chưa chạy. |
| code-review; requesting-code-review; receiving-code-review | Review chéo Spec/Standards, verify nhận xét | Owner independent review + review chung | Final guard/Unicode/scripts reviewed | Không gọi self-review là độc lập. |
| api-design | Endpoint/token/error/actor/scope/count-page | Owner traces, docsAPI |409không yếu server guards, count/items shared WHERE | Không thêm endpoint/schema. |
| security-review | Current role/project/owner/session, replay/upload/log/secrets |3owner matrices | Server guards/unit552/private AI/vault | Fresh scanner/revoke native chưa chạy. |
| frontend-patterns | Controlled draft, fail-closed authority, stale context/async/readback |4UIrepairs |13document+2work+1admin tests | Mock/DOM không thay browser. |
| frontend-ui-engineering | Label/feedback/focus/native fieldset/keyboard/table | Shared focus/tables, dialogs | alert/status/disabled writes/refresh accessible | Không đo contrast/viewport/touch thật. |
| ui-ux-pro-max | Feedback/error clarity/labels/focus từ SKILL defaults | Source checks/ui-ux-feedback.log | python→python3→py thiếu executable | **Fallback**, không verified search match/design generation. |
| impeccable | Scoped Operate technical audit, giữ thiết kế | Context/detector5targets | Context output, detect `[]`, audit/operate refs | Không visual/WCAG20điểm khi thiếu đo; không full polish. |
| ponytail | Native fieldset và current API/component thay abstraction mới | WorkItemDetail/dialog states | Không dependency/package mới | Giữ validation/history/permission. |
| research; documentation-lookup | Xác minh MySQL9.7 charset | ADM-03/official docs | [CONVERT/COLLATE](https://dev.mysql.com/doc/refman/9.7/en/cast-functions.html), SELECT RED/GREEN | Tra docs không phải HTTP runtime. |
| verification-loop; verification-before-completion | Tách source/unit/native/browser/security/coverage/exitcode | Bảng kiểm chứng/logs |872/552/build/SQL, coverage thực | Không dùng lịch sử làm PASS. |
| finishing-a-development-branch | Handoff/test/branch/remaining | STATUS/review | Giữ system-design/working tree | Không menu commit/push/cleanup bị user cấm. |
| retro; handoff; writing-for-agents | Nguyên nhân lọt lỗi, môi trường/next action đọc tiếp | Retro/status/pointers | Một nguồn báo cáo/checklist | Không thêm hook/AGENTS/design docs song song. |
| grill-with-docs; brainstorming | **Không kích hoạt discovery/design** | Rule đã đủ sửa lỗi | Không quyết định mới chặn | Chỉ dùng khi có lựa chọn nghiệp vụ mới. |
| improve-codebase-architecture; performance-optimization | **Không kích hoạt refactor/optimization** | Bundle advisory/cơ hội nhỏ ghi lại | Thiếu phép đo trước/sau | Không đổi kiến trúc/SLA. |
| implement-spec; executing-plans; using-git-worktrees | **Không chọn workflow thay thế** | implement+3scoped owners cùng checkout | Một kế hoạch/baseline | Không di chuyển changes/cạnh tranh workflow. |
| api-and-interface-design; backend-patterns; security-and-hardening; coding-standards; code-simplification; tdd-workflow; code-review-and-quality | Không chạy workflow skill riêng; overlap xử lý bằng skill đã đọc phía trên | Interface/security/tdd/review evidence hiện có | Không khai đã dùng khi chưa đọc/áp dụng workflow | Không scanner PASS từ source review. |
| e2e-testing; playwright | **NOT_RUN** | App ports không phục vụ, không viết E2E mới | Không khởi tạo app thay môi trường thật | Không gọi jsdom là E2E. |

## Retro và handoff

Lỗi lọt chủ yếu ở **chuyển trạng thái sau lỗi**, không phải lần lưu đầu: draft sống lâu hơn member, dialog lấy token props cố định, command không cùng authoritative loading/error. Search trước chỉ được thử ASCII; tài liệu vẫn giữ hạn chế ADMIN đã thay thế.

Giữ regression mới cho conflict/draft/source pin/failed reload và native Unicode. Dùng canonical `Frontend` trên Windows; kiểm cache/temp/ACL trước suite, không làm yếu vault guard vì sandbox. Có thể cân nhắc helper conflict recovery khi đủ nhiều invariant/test giống nhau; hiện chưa có lý do refactor rộng. Không thay hook/CI/dependency/policy máy.

Next action, không cần hỏi lại nghiệp vụ đã chốt:

1. Có **preprovisioned isolated V29** đúng guard, chạy native HTTP Unicode và suites affected/current authority/result projection/rollback. Không chọn tms/reset/migrate3schema cũ. Ghi schema/fixture/lệnh/exitcode.
2. Khi app được vận hành trong phạm vi được phép: browser thật Admin remove-draft→archive readiness, two-client409 edit/second-test, failed detail reload→retry, Unicode search; desktop/keyboard/mobile. Hiện không tự start/restart.
3. Native barrier race identity revoke/write/replay trước quyết định sửa lock; refresh dependency advisories/JDT bằng môi trường tương ứng, không tái dùng số cũ.
4. Role/data/physical-device UAT, live Redmine/model/OAuth và pilot theo S11. Chỉ DONE khi đủ DoD, không tự ký thay user.

Không có blocker quyết định nghiệp vụ mới; blocker là native V29 và app/browser chưa chạy. Các phần source/unit/read-only độc lập đã hoàn tất, không dừng ở đề xuất.
