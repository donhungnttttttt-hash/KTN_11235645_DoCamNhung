# Independent core review — FR-02/03, A01–A05/A19

Reviewer: admin/search agent; core source owner is a different agent. Read-only review; no core source edits, Maven, database queries/writes, service actions or extra subagents. Root already owns the project-archive/capability mismatch finding; it is excluded here rather than duplicated.

## Fixed point and actual diff

FR-00 baseline: `baseline.json` captured2026-10-18T18:01:40Z, HEAD `caf075af7231f207259b6a62808bff5c8445f6af`; `rtk git rev-parse HEAD` still resolves that exact HEAD. Reviewed tracked `git diff --` for TestCaseService, TestDocumentController/DTO/Service/EditingService and CustomerWorkbook, plus newly added Feature/Assignment/V31/V32/testing frontend files absent from the baseline inventory and Git index. These new files are treated as additions, not assumed baseline behavior. The tracked diff includes additive Feature routing/ownership guards, removal of FIXED input, Feature export reconstruction and identity-safe revision authorship. Baseline's preexisting dirty test-documents CSS was not attributed to this task.

`core-independent-review-snapshot.json` records hashes for the reviewed new source at01:46:12 Asia/Ho_Chi_Minh; core is actively changing files afterward, so line numbers below refer to that reviewed snapshot. Task/spec sources: implementation-plan R02/R03, FR-02/03, migration table and acceptance A01–05/A19; clarification and common API contract. Standards: AGENTS/RTK, docs/development-skills.md, established Java21/Spring/MySQL and React JavaScript conventions. User/root's no-subagents rule overrides code-review skill's default parallel agents.

## Spec findings

### P1 — PM assignment UI submits the PM as a Tester and blocks the primary flow

`Frontend/src/app/features/testing/DocumentAssignments.jsx:9`,`:13`,`:15`; server rejection `Backend/src/main/java/vn/syp/tms/feature/FeatureService.java:187`.

Detail legitimately returns a PM's own membership as selfMembershipId. DocumentAssignments initializes selected to that PM membership even when canManage=true. On first choosing TesterA, choose() stages `{[PMid]: ''}` before selecting TesterA. Save then sends both `{assigneeMembershipId:PMid,rowIds:[]}` and TesterA's range. The server checks eligibility of every scope, including an empty one, so PM role fails TESTER_REQUIRED. This blocks ordinary PM→Tester allocation; an outside Admin with null membership does not encounter it. It contradicts A01/A04 and FR-03's PM/Admin allocation flow.

Reproduction trace: canManage=true,selfMembershipId=99(projectRole PM), choose Tester10, enter1–40 → changes `[ {99,[]},{10,[row1…row40]} ]` →422. Existing DocumentAssignments tests only canManage=false and do not exercise PM selection. Proposed bounded fix: manager initial selection empty/valid Tester only; never stage the invalid initial PM value. Add rendered PM-with-membership test asserting only chosen Tester scope is submitted, then HTTP/native integration as root schedules. **Static state/payload trace, not claimed runtime reproduction by reviewer.** Sent to root/core immediately.

### P2 — New internal import silently truncates source identity

`Backend/src/main/java/vn/syp/tms/feature/FeatureService.java:143–148`; unchanged parser `testcase/TestCaseWorkbook.java:51–54`,`:89–93`; baseline old validation `TestCaseService.java:338–339`.

The internal workbook parser permits a blank or long text caseNo at its parsing boundary (each cell max8000). The old import validator rejected invalid internal IDs. The new preview validator checks only raw duplicate membership/title/steps/expected, then shortens source_case_key to64 instead of validating its representability. A blank source ID becomes a generated XLSX identity in the display fallback. Two distinct >64-character IDs sharing the first64 characters pass the raw HashSet check, then persist as the same displayed source identity. This violates FR-02/A02's preserved full file/case identity and can make Issue context/badges visually ambiguous even though row PKs differ.

Proposed bounded fix: reject blank/unrepresentable source IDs and duplicates under the agreed ID comparison before persistence; do not invent a new customer ID rule or silently truncate accepted values. Customer parser already rejects blank/>64 and duplicate IDs. Add blank/overlength/common-prefix internal workbook public preview tests. **Source proof only; no new Maven/HTTP run by reviewer.** Sent to root/core.

### P2 — Migration rejects valid customer workbooks because physical header width differs from supported effective width

`Backend/src/main/java/db/migration/V32__copy_feature_documents.java:39–44`; existing `testcase/CustomerWorkbook.java:51–63`,`:81–102`; `TestCaseWorkbook.customerTemplate()`.

V32 uses header.getLastCellNum() as the expected source cell width. The existing customer parser deliberately pads all rows to at least14 columns, and extends width to nonblank data cells even where the header ends sooner. The repository's customerTemplate has13 physical header cells, so its valid parsed rows contain14 sourceCells. V32 compares14≠13 and records SOURCE_CONTENT_UNAVAILABLE, skipping all Feature copies. A valid supported workbook with content beyond its last header similarly fails. Original bytes/rows are safely retained, but A03's valid migration mapping is incomplete for ordinary supported inputs.

Proposed bounded fix: validate against the same effective workbook projection as the existing parser, including legitimate padded/trailing cells, while continuing to reject actual overlay/source mismatches. Add a V30 customer-template migration fixture and byte/current-content/effective-width assertions. Existing native migration fixture uses internal11-column data and cannot catch this. **Source/counterexample proof only; no new migration or native run by reviewer.** Sent to root/core. If V32 is already applied anywhere, use the agreed next-version strategy rather than changing an applied migration without coordination.

## Standards review

No separate blocking documented-standard violation found in this bounded slice. The new transaction authority and scoped FK boundaries are localized; no framework/dependency switch or destructive old-graph cleanup appears in the diff. Compact multi-statement methods and repeated capability reads make review harder, but these are style judgements, not promoted to product findings. Do not infer that every line or performance characteristic has been independently verified.

## Preservation, authorization and concurrency observations

* V31 is additive, uses same-project FKs for Feature/document/case/assignment/context, keeps original work-item rows and relaxes only the agreed new-Issue legacy-context nullability. There is no cascading hard-delete path.
* V32 only inserts copies/provenance/exception rows and new case revisions/cell overlays; original workbook BLOB/current revisions/rows are not rewritten. Group/retest/direct-run mapping is unioned and project-scoped; orphan Feature and empty cycles are handled. New copies reset Status/assignment and do not manufacture historical result actors. Missing/corrupt/ambiguous input is recorded and skipped; finding3 concerns falsely classifying valid inputs as such exceptions.
* Write path locks current identity→project→Feature→document→assignment rows. Project serialization plus document expectedVersion prevents concurrent overlap silently overwriting a winner. Pure AssignmentPlan removes only explicitly named owners and rejects taking omitted owners' rows; Tester can submit only self scope. Result updates separately lock the row and version while authorizing its current owner; changing owner keeps current Status and separate actual actor/history. This supports A04/A05 by source analysis, subject to owner/root's native evidence.
* PM scope is active project role; Admin paths do not require synthetic memberships. Existing ProjectService.requireMembership explicitly allows global Admin, so the reused result writer is not incorrectly flagged as membership-blocking Admin. Feature/context read and mutation IDs remain project-bound. Parent's known archive/DEV capability findings are tracked by that owner separately.
* Native tests inspected: FeatureIntegrationTest covers imported internal/customer copy isolation, canonical/noncanonical edit, original bytes, progress3/5, assignment/result history and real concurrent claim, archive/restore/file hide/link retention; NativeFeatureMigrationTest covers internal current revision/overlay/multi-cycle/orphan/missing source and selected unrelated counts. They are inspected evidence from owner, **not rerun by reviewer**. Customer migration width, normal PM frontend assignment and internal malformed IDs are absent and need regressions above.
* Backup restoration rehearsal remains NOT_RUN in core report. Source retention and Flyway no-op replay are useful evidence but are not an independently executed backup/restore rehearsal. Runtime main DB cutover is not approved or implied.

## Skill → actual use → evidence

| Skill | Applied review | Evidence |
| --- | --- | --- |
| code-review | Fixed FR-00 baseline, tracked diff plus all new additions, separate Spec/Standards axes, findings with causal paths | P1/P2 findings and source hashes above; independent owner separation, no extra agents |
| codebase-design | Follow Feature→document→row→revision/result/Issue through old reusable services and new authority seam | FK/write/result/export tracing; no rewrite proposed |
| deprecation-and-migration | Check additive copy/provenance, old graph retention, source/content width, one-to-many/orphan/reset behavior | DDL/V32 and migration test inspection; valid customer counterexample |
| security-review | Scope/identity/admin membership/current assignee, row/project lock and no fake history review | Authority/FK/concurrency observations, targeted reproduction requests |
| api-design | Compare actual rendered commands and input validation with scoped contract/version/eligibility | PM invalid-scope payload and internal ID validation findings |
| frontend-patterns | Trace manager selection/draft/range to submitted scopes and role fixture coverage | Finding1; no production edit during independent review |
| verification-loop | Distinguish source counterexample from observed execution; record baseline/hash, tests not rerun and limits | This report; no Maven/native/DB claims added |

Spec axis: **3 findings** (1 P1,2 P2). Standards axis: **0 blocking findings**. Root/core must verify fixes with their targeted tests before closing these findings.
