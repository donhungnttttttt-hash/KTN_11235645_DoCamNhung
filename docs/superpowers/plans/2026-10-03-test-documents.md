# Test documents implementation plan

> For agentic workers: use executing-plans inline; fresh review after implementation. User authorized full design and execution on 03/10/2026, no additional approval handoff.

**Goal:** Import customer XLSX into named documents, recover case grid, export source/current workbook.
**Architecture:** Reuse committed import batches and rows as document manifests, existing cases/revisions for current content. Add source metadata/binary to batches, separate member-scoped read/export APIs from private previews. Preserve current execution workflow and internal importer.
**Tech Stack:** React JavaScript/Vitest, Spring Boot/Apache POI/JUnit, native MySQL/Flyway.
**Spec:** ../specs/2026-10-03-test-documents-design.md

## Global constraints

- One sheet, .xlsx≤5MiB,500data rows,200ZIPentries,20MiB expanded,8000chars/cell; no formulas/macros/external workbook links/merges.
- Source outcomes do not create live execution, NA decisions, bugs or users. M/N preserved.
- No new DB tables; additive V12 only. No writes to application tms during destructive tests; use separate native schema.
- Work in current feature/sprint-11-pilot checkout preserving uncommitted sprint code; no commit/push/merge/deploy.
- User's full approval overrides repeat spec/plan gates. Preserve written spec/plan and test evidence.

## Review focus

1. File/project switches must not show stale rows or open a file ID as cycle ID.
2. Source ID1 repeated in another file must remain distinct; same file repeated must not duplicate.
3. Sparse/blank M/N, formulas outside expected region, unsafe hyperlinks and source strings beginning '=' must not execute or disappear.
4. Legacy committed imports lacking source bytes must remain readable/exportable.
5. Other project users and another uploader's private preview must not leak through document/export APIs.

### Task 1: Parser and source retention

Files: TestCaseWorkbook.java, CustomerWorkbook.java, TestCaseDtos.java, TestCaseEntities.java, V12__retain_test_document_sources.sql, TestCaseWorkbookTest.java, CustomerWorkbookTest.java.
Interfaces: Parsed(fileName,checksum,rows,format,sheetName,sourceBytes); ImportRowInput adds optional sourceCells list with backward-compatible constructor. Customer source cells are14 strings. Existing internal mapping unchanged.
- [x] Add failing synthetic customer workbook parser tests (ID1 numeric, multiline Unicode, M/N and unknown columns; reject duplicate IDs/formula); observed customer-format rejection RED.
- [x] Implement bounded parser dispatch and metadata/row retention; add V12 columns and entity getters/setters.
- [x] Run parser/export suite GREEN13/13; actual workbook155 rows round-trip retains cells/types/styles/39links.

### Task 2: Commit and document API/export

Files: TestCaseService.java, TestCaseRepositories.java, TestDocumentService.java, TestDocumentDtos.java, TestDocumentController.java, TestDocumentIntegrationTest.java, docs/api/test-documents.md.
Interfaces: import preview adds format/sheetName; commit ID is document ID. Document API DTOs exactly as spec. Export returns bytes with original/current mode.
- [ ] Add MySQL integration tests for import→document→export, two files with ID1, repeated commit/import, member permissions, legacy and updated revision. Run RED on isolated native schema.
- [x] Auto-create suite only during customer commit, code XLSX-batchId and generated case codes; preserve source IDs in rows. Store source workbook and dedup project-scoped committed customer checksums. Code compiled; native behavior verification pending below.
- [x] Implement projection list, detail cells overlay current revision, authorized export (POI source template or reconstructed internal workbook).
- [ ] Run integration GREEN including fresh/upgrade migration and rollback/permission regressions.

### Task 3: File library and restored grid

Files: TestSpecsPage.jsx, TestDocumentsPage.jsx, TestDocumentPage.jsx, document styles, ImportExcelDialog.jsx, testCases.js, routeInfo.js/AppRouter.jsx, document tests.
Interfaces: consume exact Task2 JSON/routes; legacy case library reachable as /tests/cases. Sidebar /tests marks document detail/library as same active child.
- [x] Add tests for file listing/navigation, grid/export, missing/project-switch and import callback. Initial new module import failed RED; legacy library navigation and unmounted callback assertions reproduced RED separately.
- [x] Implement list/grid reusing existing typography/buttons/CaseDetailModal; source outcome labels and all14 columns; route distinctly from cycle IDs; keep old case/suite mode accessible.
- [x] Update import copy/preview and committed file link; navigation on successful commit.
- [x] Run FE full222tests/build PASS; scoped4file coverage96.01/82.5/96.29/100 (statements/branches/functions/lines).

### Task 4: Verification and review

Files: scratch local probes (ignored), docs/reviews/2026-10-03-test-documents.md, docs/planning/STATUS.json, SPRINT-04/11 journals, database docs.
- [ ] Build backend; run meaningful existing and new tests against isolated test data; measure scoped coverage (report honestly if gate not reached).
- [ ] Browser synthetic upload→list→grid→edit revision→export/reimport, reload/back, narrow viewport and Tester visibility. Actual customer155-row parse/export comparison local only.
- [x] Fresh reviewer checks feature files/spec/five review focus classes; unmounted import callback finding RED→GREEN. Minor legacy-fixture expansion deferred until native validation; no second review claimed.
- [ ] Update test evidence/remaining limits/status; leave servers as requested and do not claim UAT/production completion.

## Ledger

- Setup: user authorizes complete implementation and delegates design review; no additional approval needed. Current dirty feature checkout contains required live API code; copying a clean worktree would omit it. Work in place and limit touched files.
- Preflight Task1→2: additive row sourceCells nullable for legacy; Parsed fields used by importer. Task2→3: separate document route/DTO avoids cycle collision; no execution state from source.
- Ruling: reuse COMMITTED import batches as durable document manifests with dedicated read/export API, instead of adding document/sheet tables, because supported source has exactly one sheet and immutable import identity. A future multi-sheet format requires a separate design.
- Ruling: reuse mapping_version as format discriminator instead of a duplicate source_format column; legacy1.0 is internal. Cost if a future mapping revision needs a separate axis: additive schema/API change.
- Task1 complete: final parser/export13/13, actual155rows source/servicebounds round-trip PASS. Maven package PASS. No migration executed against tms.
- Task2 code complete, verification pending: six native integration scenarios and opt-in empty-schema migration test prepared. User says will create schema; read-only check still0 at22:26. No MySQL test PASS claim.
- Task3 complete:222/222 FE,build,scopedcoverage PASS. Browser mock API visual/navigation at1280/390px PASS, not full E2E.
- Final fixed: async import callbacks after unmount; deferred-commit assertion RED→GREEN. Additional observed debounce initialtimer page reset fixed with pagination regression, suite222/222 PASS.
- Final minor (deferred): legacy native test should also set null sheet_name/1.0 mapping/no sourceCells, not only null BLOB.
- Final Ruling: reviewer declined actual MySQL/transaction/E2E judgement; keep task2/4 andS04/S11 IN_REVIEW until isolated native schema and real browser integration pass. Cost of skipping this gate would be unverified persistence; gate is retained.
- Final Ruling: unrelated dirty sprint changes excluded from scoped review; feature review does not certify full project/UAT. No commit/push/merge/deploy.
- Diagnostics: Eclipse136sources/0errors/0warnings; null-check contract kept enabled. Final evidence and next commands in docs/reviews/2026-10-03-test-documents.md.

### Ledger tiếp theo — native V12 theo yêu cầu người dùng

03/10/2026 22:47–23:00: theo yêu cầu dùng Flyway tự cập nhật, đã backup native tms rồi restart backend để áp V12 thành công; restart lần nữa validate/up-to-date. API tài liệu hết404. Browser thật nhập workbook155case vào project1/document3, mở lưới/chi tiết revision, lọc NG3dòng, phân trang100+55, reload/menu/mobile PASS. Export API200, bản gốc giống bytes và bản hiện tại giữ155x14cell/type/style/hyperlink (39links). FE224/224/build PASS, BE14/14 parser/export/verify PASS. Coverage riêng TestDocumentPage: statements94.59%,branches83.2%,functions92.5%,lines98.59%. Còn isolated native integration/fresh migration, coverage BE API/service và UAT; không chạy destructive tests trên tms. Chi tiết docs/reviews/2026-10-03-test-documents.md.

Quyết định mới thay thế thứ tự chờ schema test trước cập nhật: backup và áp migration additive trên runtime do user yêu cầu rõ. Không bỏ các gate kiểm thử riêng của Task2/4. Legacy fixture đã mở rộng và compile; browser thật đã thực hiện import/list/grid/reload, chưa xác nhận browser download/reimport hoặc matrix Tester.
