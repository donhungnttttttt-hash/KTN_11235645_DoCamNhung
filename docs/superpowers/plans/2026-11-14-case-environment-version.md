# Case Environment and Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution after plan review, or superpowers:subagent-driven-development if the user selects delegation. Implement task by task; checkboxes track verified completion, not intention.

**Goal:** Bổ sung môi trường/version độc lập với Status, chỉnh dropdown/icon và sửa khoảng trống Status, giữ dữ liệu và quy trình test hiện hành.

**Architecture:** Danh mục môi trường theo Feature; context hiện tại theo case độc lập với snapshot kết quả và audit. API context không thay Status; kết quả, Issue và Excel đọc đúng context. Thành phần dropdown dùng chung giữ giao diện/keyboard nhất quán, áp dụng dần theo từng màn.

**Tech Stack:** React 18 JavaScript, Spring Boot Java 21, MySQL native/Flyway, Vitest/Testing Library và JUnit.

**Spec:** [Thiết kế đã bổ sung ảnh lỗi](../specs/2026-11-14-case-environment-version-design.md).

## Global Constraints

- Nhánh `system-design`; giữ toàn bộ thay đổi đang có. Không tự commit/push/merge hoặc chuyển runtime trong bước lập kế hoạch.
- Một Status hiện tại; context-only không đổi Status, tiến độ, ngày thực hiện hoặc người test ban đầu.
- Môi trường và version nullable, độc lập; môi trường/server cũ không tự chuyển thành danh mục.
- Chỉ import chín trường nội dung; export 13 cột, cột thứ mười là MT & Ver; tải gốc nguyên byte.
- Xóa file/danh mục có xác nhận và giữ dữ liệu lịch sử; quyền project/Feature/archive/Khách do backend enforce.
- Status 72 × 72 CSS px, lịch sử rộng 72 px, gap 6 px; không cắt nội dung các dòng khác.
- Test ghi dữ liệu trên schema cô lập có manifest; không dùng schema đang phục vụ người dùng.
- Chưa có bằng chứng browser thì không báo đã nghiệm thu giao diện; coverage phải đo thực tế.

## Review Focus

- Dòng rất cao, zoom và cuộn ngang: cụm Status không bị kéo giãn hoặc cắt chữ — Task 1.
- Context được đổi khi chưa test: không tạo ngày test, first tester hoặc tiến độ giả — Tasks 3–4.
- Hai người ghi context/Status đồng thời, retry sau mất mạng: không overwrite âm thầm hoặc tạo sự kiện kép — Task 3.
- Danh mục bị xóa sau khi được chọn: giữ bằng chứng cũ nhưng chặn lựa chọn mới — Tasks 2–4.
- Issue chỉnh tay và Excel có Unicode/cột dư: không cập nhật ngược bằng chứng, không tái nhập thông tin thực thi — Task 5.

## Task 1: Tái hiện và sửa khoảng trống Status

**Files:** Modify `Frontend/src/app/features/testing/testing-spreadsheet.css`, `testing.css` nếu có quy tắc gây giãn; test `TestingDocumentPage.test.jsx`. Giữ `ResultCycleButton.jsx` thuần controlled.

**Interfaces:** Không đổi API. DOM `.testing-result-actions` chứa Status và lịch sử liên tiếp; cùng một kích thước cơ sở.

- [ ] Mở Chrome riêng, lấy computed styles và bounding rectangles của cụm/nút trên case nội dung dài; ghi khoảng cách thực tế và CSS thắng cascade. Nếu browser chưa khả dụng, ghi giới hạn và tiếp tục task độc lập; không kết luận nguyên nhân giả.
- [ ] Ghi regression browser: `status.width === status.height === history.width === 72`, `history.top - status.bottom === 6` (dung sai 1 CSS px); có dữ liệu đủ làm dòng cao. Component test giữ cả hai nút và thao tác Status/history riêng.
- [ ] Chạy regression trước sửa và ghi bằng chứng thất bại của lỗi tái hiện, không coi jsdom là bộ đo hình học.
- [x] Sửa đúng rule causing layout; cụm cao theo nội dung nút, không stretch/space-between hoặc margin phát sinh. Giữ nền đầy màu, Unexecuted bạc và chữ không xuống dòng/cắt. CSS contract đã kiểm tra; chưa khẳng định nguyên nhân hình học khi browser không khả dụng.
- [ ] Chạy `rtk proxy npm test -- src/app/features/testing/TestingDocumentPage.test.jsx --maxWorkers=4` tại Frontend; xác nhận browser trên dòng ngắn/dài, zoom 100%/125%, sau resize/cuộn.

## Task 2: Danh mục môi trường và migration giữ dữ liệu

**Files:** Create `Backend/src/main/resources/db/migration/V42__case_execution_context.sql` nếu V42 còn trống, `Backend/src/main/java/vn/syp/tms/feature/FeatureEnvironmentService.java`; modify `FeatureController.java`, `FeatureDtos.java`; test `Backend/src/test/java/vn/syp/tms/testcase/FeatureIntegrationTest.java`.

**Interfaces:** `GET/POST /api/v1/projects/{p}/features/{f}/test-environments`, `DELETE .../test-environments/{id}`. Create `{name,requestKey}`; list/create return `{id,name,createdAt}`. Service `list(p,actor,f)`, `create(p,actor,f,input)`, `delete(p,actor,f,id)`.

- [x] Thêm test list/create/duplicate trim/retry, xóa mềm, chéo scope, Guest và archive bị từ chối; chạy trên native schema cô lập để thấy contract chưa tồn tại.
- [x] Tạo `feature_test_environments` với scoped FK, tên active duy nhất, deleted_at/by. Tạo `test_document_case_contexts` theo project/document/row: environment/version nullable, context_version, actor/time; tạo context change records liên kết project audit và request key.
- [x] Bổ sung environment nullable vào execution snapshots, cho version nullable; giữ ngày test của snapshot thực thi. Backfill current context chỉ từ execution khớp result_version; dữ liệu thiếu giữ trống.
- [x] Implement API cùng quyền quản lý version, validate tên 1–255 sau trim. Khóa scope nhất quán khi xóa và ghi; idempotency theo actor/scope/payload.
- [x] Fresh migration và upgrade V41 trên DB riêng; đối chiếu Status/history/first tester/counts trước-sau, migration replay không nhân dữ liệu. Giữ artifact/manifest của schema đích cho các task sau.

## Task 3: Context riêng, snapshot Status và lịch sử

**Files:** Create `Backend/src/main/java/vn/syp/tms/feature/CaseExecutionContextService.java`; modify `FeatureController.java`, `FeatureDtos.java`, `FeatureService.java`, `testcase/TestDocumentDtos.java`, `testcase/TestDocumentService.java`; tests `FeatureIntegrationTest.java`, `workitem/TestVersionsNativeTest.java`.

**Interfaces:** `PUT /api/v1/projects/{p}/test-documents/{d}/rows/{r}/execution-context`; body `{expectedContextVersion,requestKey,environmentId?,testVersionId?}`. At least one positive ID; absent field preserves old value. Response `{rowId,contextVersion,environmentId,environmentName,testVersionId,testVersionName}`. Result request adds optional `environmentId,expectedContextVersion`; all readers receive current context fields separately from resultVersion.

- [x] Tests: version-only/environment-only on Unexecuted preserves Status/date/firstTester and progress; same value no event; mismatched scope rejected; stale expected version 409; duplicate key same payload replays and different payload 409.
- [x] Implement `update(p,actor,d,r,input)` transaction validating writable case without claiming it. Lock row then context then selected catalogue records in consistent order; create context if absent at version 0. Persist before/after changes with `CASE_CONTEXT_UPDATED` audit, not RESULT events.
- [x] Extend Status save transaction to read/validate context and snapshot effective environment/version/date. Explicit toolbar values apply to next result; missing environment preserves current case environment. Concurrent context change conflicts rather than losing metadata. Existing deleted selection may be retained unchanged, never newly selected.
- [x] Result response includes latest context version and names; metadata-only never sets resultUpdatedBy or first tester. Update history DTO with event kind and before/after context; merge into stable audit-id pagination with real Status events.
- [x] Tests for edit context while another actor changes Status, catalogue deletion race, retained deleted value, rollback and retry. Existing legacy non-Feature result paths retain compatibility.
- [x] Run guarded native suites on migrated isolated schema; run Java unit regression and diagnostics. Verify both current detail and history after reload, not only immediate response.

## Task 4: Dropdowns, icon xác nhận và bảng MT & Ver

**Files:** Create `Frontend/src/app/components/SearchableSelect.jsx`, `searchable-select.css`, `SearchableSelect.test.jsx`, `features/testing/FeatureEnvironments.jsx`; modify `FeatureTestVersions.jsx`, `TestingFeaturePage.jsx`, `DocumentOwners.jsx`, `TestingDocumentPage.jsx`, `TestingGridColumns.jsx`, `testing.css`, `testing-spreadsheet.css`, `services/api/features.js`, `features/test-cases/DocumentResultHistory.jsx`, `useDocumentResults.js`, related tests.

**Interfaces:** `SearchableSelect({label,value,options,onChange,disabled,searchable=true,placeholder})`; option `{value,label,disabled?}`. Controlled value, internal open/search, portal position, aria-expanded and keyboard navigation. Catalogue manager adds separate creation form above options, not implicit creation in ordinary selects. API wrappers `testEnvironments`, `createTestEnvironment`, `deleteTestEnvironment`, `updateExecutionContext` match Tasks 2–3.

- [x] Tests first: input precedes options, search filters, Add failure retains text, successful Add closes and displays new value, chevron follows aria-expanded; Escape/click-outside/keyboard retain focus, overlay not clipped.
- [x] Implement shared select and catalogue manager pattern. Move version/environment below Feature title; preserve old description/environment text and independent Nhập Excel button. Soft-delete icons confirm before API call; deleted selected display remains readable.
- [x] Replace file owner trigger with accessible user icon, retain selected names, add top search; file trash opens labelled confirmation with filename, Hủy sends no request, Xác nhận archives once. Preserve restore controls and owner conflict flow.
- [x] Rename metadata column to MT & Ver via stable field key, render two independent selectors calling context endpoint. Update local state from context response; errors block stale edits until refreshed. Toolbar gains optional environment; existing version/day selection rules remain. Context-only save message must not say Status saved.
- [x] Update case detail/search and history display. Tests assert selecting environment does not call updateResult; next Status save carries valid context version; dates/initial tester remain correct after refresh.
- [x] Inventory remaining dropdowns with `rtk proxy rg -n '<select|aria-expanded|role="listbox"' Frontend/src/app`; record owners in review log. Migrate ordinary selects/custom pickers by screen using shared behaviour, preserving API values and permissions. Long lists searchable; no Add on user/status selectors. Test each changed screen's filtering/submission, disabled and keyboard states.
- [ ] Run targeted Vitest suites after each screen group, then `rtk proxy npm test -- --maxWorkers=4` and `rtk proxy npm run build` at Frontend. Native browser check on Feature/case/list screens after API is ready.

## Task 5: Issue và export đọc đúng thông tin

**Files:** Modify `Backend/src/main/java/vn/syp/tms/workitem/FeatureIssueService.java`, `testcase/FeatureWorkbookExport.java`, `testcase/TestDocumentService.java`; frontend `features/work-items/FeatureIssueForm.jsx`; tests `FeatureIntegrationTest.java`, `NativeFeatureIssueIntegrationTest.java`, `FeatureWorkbookExportTest.java`, related Issue form tests.

**Interfaces:** Issue context adds `environmentId,environmentName`, current version fields. Form defaults manual environment only when initializing from case; saved Issue evidence remains its own value. Export `HEADERS[9] = "MT & Ver"`, total 13; value lines `Môi trường: ...`, `Version: ...`, `Ngày thực hiện: ...` only when present.

- [x] Write failure tests: new Issue gets current case environment/version, edited manual environment persists, later case context change does not alter saved Issue; device is never populated from environment name.
- [x] Wire context reader into source context and initial form state without overwriting drafts on refresh. Preserve current Feature description display and ticket snapshot rules.
- [x] Write export tests: exactly 13 columns, environment-only/version-only/neither, Unicode and deleted names, real Status and initial tester, original bytes unchanged. Re-import ignores MT & Ver and uses approved nine fields only.
- [x] Update export to read current context plus actual execution date; remove dependence on version inner joins which would drop environment-only rows. Use text cells and preserve content/format safeguards.
- [x] Run Feature/Issue native suites and workbook unit tests; compare supplied 55-case workbook content/counts in isolated fixture, not by mutating main.

## Task 6: Review, nghiệm thu và ghi nhận

**Files:** `docs/planning/STATUS.json`, `README.md`; create `docs/reviews/2026-11-14-case-environment-version.md`.

- [x] Review complete diff against spec: context vs Status side effects, project isolation, no restore/history regressions, all dropdown inventory accounted for; include five Review Focus cases.
- [x] Run frontend build/tests/coverage for changed components, Maven verify using guarded native runner, JDT diagnostics, `rtk proxy git diff --check`. Store exact commands/results and actual coverage, separate existing failures.
- [ ] Chrome acceptance in dedicated tab: gap and square Status geometry, dropdown placement/chevron/keyboard, delete cancel/confirm, per-case edit + Status save, history, Issue defaults, downloaded Excel. Recheck with long names, scroll and narrow viewport.
- [x] Prepare backed-up runtime cutover only after verified artifact/migration rehearsal; preserve active user data. Do not claim deployed until observed startup/Flyway/health and authenticated smoke pass. No test writes to main.
- [x] Update checklist and STATUS accurately; list any blocked browser step. No commit/push without instruction for this task.

## Execution handoff

Kế hoạch đã bao gồm ảnh lỗi khoảng trống và được tự rà về phạm vi/contract/tests. Đề xuất **Native**: triển khai tuần tự ngay trong phiên này, ưu tiên Task 1, vì các task còn lại phụ thuộc chung context API và migration. Theo skill, cần người dùng xem bản kế hoạch này và chọn cách thực hiện trước khi bắt đầu code. Chưa chạy test hoặc sửa source sản phẩm trong bước lập kế hoạch.

## Checkpoint thực thi 14/11/2026

Người dùng đã duyệt và đã thực hiện native. Tasks 2–5 đã triển khai/kiểm chứng tự động; Task 1 đã sửa CSS và có regression contract, nhưng kiểm tra hình học thật còn mở. Task 6 đã review, backup/cutover V42 và authenticated smoke; chưa nghiệm thu Chrome do công cụ không kết nối. Dòng checklist ghép test tự động với browser vẫn để mở nếu còn thiếu browser. Các quyết định khác brief và số đo tại `docs/reviews/2026-11-14-case-environment-version.md`. Không commit/push.
