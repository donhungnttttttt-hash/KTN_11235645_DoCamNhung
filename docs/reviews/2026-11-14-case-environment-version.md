# Execution ledger — case environment/version

Plan: `docs/superpowers/plans/2026-11-14-case-environment-version.md`.
Approved for native execution 14/11/2026. Skills: brainstorming, writing-plans, executing-plans, test-driven-development.

Ruling: use current dirty system-design workspace — approved changes depend on existing uncommitted fixes; copying/resetting them would risk unrelated work. No commit/push authorization for this task.
Pre-flight: Task 2 catalogue/context schema feeds Task 3 writes and Task 4 UI; Task 5 reads context independently of Status snapshots. Expected context version must accompany result writes; preserve legacy result constructors for existing consumers.
Ruling: separate current metadata from result snapshots; no RESULT audit/initial tester changes for dropdown edits.
Task 1: Chrome browser host unavailable on fresh attempt. No live geometry claimed. Continue independent implementation and automated checks; browser acceptance remains open.

## Kết quả triển khai

Source đã triển khai trên `system-design`. Runtime local đã lên V42; còn nghiệm thu hình học Chrome, vì browser host không khả dụng. Không coi component test là bằng chứng khoảng cách pixel.

- Version và Môi trường nằm dưới tiêu đề Feature, ô tìm/thêm ở đầu, danh sách ở dưới, có trạng thái không tìm thấy. Thêm thành công đóng menu; lỗi giữ bản nháp.
- Người phụ trách file dùng icon và vẫn hiển thị tên. Thùng rác mở xác nhận; Hủy không gọi API. Khôi phục file giữ nguyên.
- Cột **MT & Ver** có hai dropdown độc lập. API context riêng, optimistic version và request key; sửa metadata không tạo kết quả, ngày test, tiến độ hoặc người test ban đầu.
- Status ghi snapshot môi trường/version/ngày thực tế. Lịch sử phân biệt thay đổi metadata với thay đổi Status. Mục đã xóa vẫn đọc được trong dữ liệu cũ.
- Issue mới gợi ý môi trường hiện tại, vẫn cho sửa tay; không gán môi trường thành thiết bị. Excel giữ 13 cột, MT & Ver có nhãn theo dòng; import vẫn chỉ lấy chín trường.
- Dropdown native ở 41 consumer dùng adapter giữ giá trị/form/change contract; menu tìm kiếm ở trên và mũi tên đổi chiều. Picker dự án có tìm kiếm/tạo phía trên. Inventory local: `var/context-dropdown-inventory.json`.
- Cụm Status đổi sang grid cao theo nội dung: Status 72 × 72, lịch sử rộng 72, gap 6 px, không kéo giãn theo chiều cao dòng. Đã kiểm tra CSS contract; chưa đo DOM thật ở zoom 100%/125%.

## Quyết định triển khai và review

Ruling: reuse `FeatureService` authorization/transaction/idempotency for environment catalogue instead of creating the proposed separate `FeatureEnvironmentService`. The context helper is separate and called only within authorized transactions. Cost if wrong: service becomes harder to maintain, no intended permission change.

Ruling: reuse `FeatureTestVersions` with an environment flag instead of a duplicated `FeatureEnvironments` component. Both catalogues share add/filter/delete/focus behavior. Cost if wrong: coupling when their UX diverges.

Ruling: retain native form controls through `UnifiedSelect` while replacing popup presentation; preserve existing values, labels, validation, callbacks and multiple-select behavior. Tests that used simulated native selection and asserted absence of popups now click actual custom options. Cost if wrong: browser-specific select/input behavior; Chrome acceptance remains open.

Ruling: current metadata and execution snapshots are separate; retrying a Status command validates its immutable execution payload but returns a consistent current metadata/version pair. Cost if wrong: stale clients could otherwise overwrite unseen metadata.

Final review: fresh reviewer `review_context`; two Important findings entered one fix pass:

- Status replay mixed old metadata with latest context version. Regression `environmentAndVersionMetadataDoNotExecuteACase` failed in `context-replay-red`, then passed in `context-reviewed` after reading current metadata consistently. Immutable execution snapshot remains unchanged.
- Shared select did not open on click-only activation. Regression `opens from click-only activation` failed, then passed after adding the click fallback. Mouse/keyboard and modal Escape regressions pass.

No deferred minor finding from the reviewer. Missing live browser verification is a verification limitation, not a passing check.

## Bằng chứng kiểm tra

- Frontend: `node var/run-context-frontend.cjs context-coverage-complete.log test -- --maxWorkers=4` with V8 coverage include flags for the seven changed components: **1,397/1,397 tests, 152 files PASS**. Log `var/context-coverage-complete.log`.
- Coverage for `UnifiedSelect`, `SearchableSelect`, `FeatureTestVersions`, `TestingDocumentPage`, `TestingFeaturePage`, `ConfirmHideFile`, `DocumentOwners`: statements **87.90%**, branches **80.14%**, functions **86.51%**, lines **94.59%**. Scope only, not the entire frontend. Summary `var/context-coverage/coverage-summary.json`.
- Frontend production build PASS: `node var/run-context-frontend.cjs context-build-final.log run build`.
- Backend final: native `FeatureIntegrationTest` 33 + `NativeFeatureIssueIntegrationTest` 19 = **52 PASS**, Maven verify/package PASS, isolated schema manifest. Receipt `var/file-owners-20261114/context-complete/receipt.json`. Covers catalogue trim/duplicate/replay, Guest/archive rejection, invalid/deleted selection, simultaneous context writes, Status/context race and delete/selection race with rollback/preservation. The running artifact was verified earlier with 49 tests; later changes add tests only, no backend product change.
- Backend workbook/result regression **44 PASS** (`var/context-unit.log`).
- Native JaCoCo for the new `CaseExecutionContextService`: lines **100%**, branches **84.21%**, methods **100%**. Existing `FeatureService` and `TestDocumentService` are not claimed fully covered.
- JDT final product compile: **395 sources, 0 errors**, seven existing nullness warnings in `SystemAdminStartupTest.java`. These are outside this change; diagnostics are not reported warning-free. Log `var/context-diagnostics-complete.log`.
- Fresh V42 and V41 → V42 upgrade fixture PASS on isolated native schemas. Upgrade preserves matching/nonmatching result versions, deleted version names, history and initial tester; rerun applies zero migrations. Receipts under `target-context` and `target-context-upgrade`.
- `git -c core.safecrlf=false diff --check`: PASS.

## Runtime local và dữ liệu

Backup: `var/mysql-native/backups/2026-11-14T14-31-34-057Z-tms.sql` and its manifest. Backup excludes session rows; no business data deletion.

Started verified `context-reviewed` artifact SHA-256 `05e0b7f835c30606b66d37fad64d79faf60cb088351801f6aeb760987b30ff54`, Java PID 13264. Flyway V42; health **UP** on 8080 and through 5173. Authenticated read smoke through web proxy: login, `/me`, projects, Feature14, environments, versions and documents all **HTTP 200**. No test business writes to main. Receipt `var/file-owners-20261114/context-main-readonly.json` contains statuses only.

Before/after: 119 accounts, 11 projects, 145 memberships, 17 Features, 35 import batches, 2,636 import rows, 1,854 test cases, 1,022 assignments, 56 assignment changes and 2,361 project audit rows unchanged. Status distribution unchanged: FIXED1/NA1/NG3/OK29/P3/UNEXECUTED2599. Snapshots `main-before.json` and `main-after.json`.

## Còn lại

Chrome visual acceptance: actual Status gap/square at both zooms, dropdown geometry during scroll/resize, long names, delete dialog and downloaded workbook through the UI. Automated API/workbook checks pass but do not replace those visual checks. No commit, push or merge in this task.
