# FR11 contract documentation synchronization

Date2026-10-19. Owner fr_ui_audit; root retains plan/STATUS/task ledger/final review ownership. Documentation only; no Maven/full FE/browser/service/DB access performed for this update.

Updated assigned8 documents with authoritative dated FixReports sections and direct cross-references:

- docs/business/metrics.md: Feature tested=OK+NG+P+NA, denominator includesNA, empty0; example3/5=60%, no pass/acceptance implication; original internal-v1 run/cycle text explicitly historical.
- docs/business/permissions.md: actual project PM/ADMIN CRUD, Tester self-scope and DEV capability boundary; ADMIN no membership; PM AI global read distinct from ordinary CRUD; current Issue/Notes/report policies precede retained old role decisions.
- docs/api/test-documents.md: exact Feature/import/document/archive/assignment endpoints and DTO shape from FeatureController/FeatureDtos, canonical row IDs, independent case copies, Status/actor/history separation; old import/noFeature/write gates explicitly superseded.
- docs/api/work-items.md: `/issues` Bug/QA context, Monkey Bug/free title/ownership/soft-delete, server capabilities and exact payloads; old work-items/qa writes410; no new generic Task creation/retest gate.
- docs/api/file-work.md: explicit410 retirement matrix including Feature-required import, workflow writes, old Issue writes, old report403/410 and private file-chat generation; authorized historical GET retained; manual retest and real physical PM handover replace session gates.
- docs/api/reporting.md: PM-project/ADMIN management API, optional Feature, preview request/provider pinning and explicit save, exact stored UTF8 Markdown download, no source writes, durable report independent of chat/draft TTL.
- docs/api/ai-chat.md: preserves original10/18 October text and verification as history; current selector projects/features, optional Feature target, server background/read policy, worker management denial, private owner/provider/thread guards and in-chat config replacement. Dated section explicitly overrides old run/NA/project-only statements.
- docs/api/fixreports-contract.md: current source crosslinks, concrete Notes API, new UI route/role/context entrypoints, manual flow, exact SPIDER-PLUS identity; direct source controller/retirement links for final verification.

All updates state that source/contract does not prove main DB migration/cutover, applied repair or UAT. Existing baselineV30 is explicitly historical; repair is pending preparation/verification, with no guessed future migration number. No settled business rules reopened; no unrelated document body rewrites. Metrics title adjusted to include current Feature definition; historical extra h1 in permissions retained rather than formatting unrelated sections.

## Verification

`Check-FR11-Docs.cjs` performs local-only Markdown title/date/code-fence/table structure and target/heading checks. Initial structural failure caught unescaped Bug|QA table delimiter; corrected. Final **8files,73 local links,2 heading fragments,19 tables,failures[]**. One warning: preexisting extra historical h1 in permissions retained. JSON evidence `fr11-docs-check.json`.

Scoped git diff --check PASS, configured LF→CRLF advisories only. No HTTP/API runtime inference from local reference checks. Source endpoints/payloads were checked against current controllers/DTOs/legacy interceptors, but root must recheck implementation once frozen; production code can still be changing concurrently.

Skills applied from prior reads: api-design for exact paths/DTO/errors; security-review for ordinary CRUD vs AI read policy/private data; verification-loop for source vs runtime evidence and local reference checks; code-review for authoritative dated sections without destroying historical context. Required review instructions already read for independent backend review.

Related pending native source checkpoint: NativeProjectNotesIntegrationTest5 + strengthened ManagementReportIntegrationTest3 are compile-ready; no Maven slot used by this agent yet. Independent report findings/dispositions are in fr10-backend-independent-review.md. Final full FE coverage/build remains pending root freeze.

## Frozen-source follow-up after02:08 — R01/R02/R03/R07/R08

Root requested independent audit against final Admin KPI/status-report retirement and export roundtrip. Read actual AdminOverviewService, ProjectDeadlines, ProjectStatusReportController/Service, TestDocumentService.featureExport, TestCaseWorkbook and roundtrip integration test. Added bounded current-contract paragraphs to six already-owned docs: feature-cases-v1 current-row authority/active Issue milestone scope; status-report POST410 after ordinary PM-project/ADMIN rights and GET canPost:false/history/worker denial; Customer and exact internal11/14-column roundtrip without duplicate metadata or importing tester history. Preexisting body/AI10/18 edits retained; no source/runtime/cutover/UAT claim.

Latest checker PASS8files/82links/2anchors/19tables, failures[]; historical extra-h1 warning retained. Scoped diff-check PASS. Consolidated per-task evidence/remaining gates: `fr-final-ui-ledger.md`. Root's full FE969/104files/coverage/build passed before the subsequently fixed browser modal CSS issue; latest modal scoped14/build PASS and parent actual-browser geometry are separate, and root owns post-fix full rerun. No Maven/browser/DB run by this agent.
