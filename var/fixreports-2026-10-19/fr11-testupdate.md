# FR11 QA test migration to active Feature context

Owner: fr_ui_audit. Date2026-10-19. Scope explicitly transferred by root: qa/qa-glue.test.jsx and tiny retired-create notice in WorkBoardPage.jsx. No other Issue production source, backend, Maven, services, DB or browser used.

## Evidence and preservation

Fresh original reproduction at01:40:09: **20FAIL/26PASS of46**. Source AST inventory found **19 expanded cases in10 declarations** depended on retired active WorkBoard/generic create/group/run-source URLs. The other **27 cases in18 declarations** exercise historical NewWorkItemForm/WorkItemDetail/QaPanel compatibility directly and were retained **byte-for-byte** (not merely equivalent assertions).

`qa-glue-preservation-manifest.json` records original labels, expanded counts, disposition and SHA256 per test declaration. `Verify-QaTestPreservation.cjs` verified preserved27, declarations18, missing[] after the update. `Update-QaCompatibilityTests.cjs` was the one-time targeted rewrite helper; do not rerun it against current source because current retired-notice tests also intentionally instantiate WorkBoardPage.

The two apparently historical detail failures in the original run were cascading mock contamination: a failing retired creation test enqueued qaApi.get.mockRejectedValueOnce but could not reach a form to consume it. vi.clearAllMocks clears call history, not queued behavior. Setup now explicitly resets qaApi.get before default resolution. No historical test body or production detail/form behavior changed. Removed unused old ProjectData/BoardPage mock scaffolding after its only consumers were replaced.

## Replacement coverage

Added21 current cases:10 behavioral tests plus11 old query variants. Final qa-glue has48 tests (27 preserved+21 replacement).

- FeatureIssueForm QA uses exact current project/Feature/document/**rowId** context; type options only Bug/QA; old group/run/revision/attempt IDs never enter new payload. Returned persisted identity is used directly; no old QA create endpoint or generic work item write.
- Failure retains question/title/source; exact retry reuses requestKey and payload; editing rejected draft issues a fresh key. Pending/failed source cannot submit. Context and save responses from departed project are ignored; duplicate submit locked.
- CaseIssueAction creates QA at same case, closes modal, restores badge focus and refreshes exact context; closed QA counted with no status filter. DEV/read-only initial preview has no create action. Failed badge read retries without creating.
- Monkey creation stays Bug with chosen Feature, no document/row or old execution source; free title retained. No new generic Task creation entry introduced. Historical standalone generic component tests remain compatibility tests, not active routes.
- Old create=QA/BUG/TASK markers, duplicate markers and malformed old source pins display explicit retired guidance, do not infer any Feature/case mapping, and do not fetch current Issue/Feature lists or write.

The11 retired-marker assertions observed **RED11/48** at01:41:25 because the wrapper silently mounted current board. Tiny WorkBoard source change extends the existing `/board/new` guidance to any `create` marker, explains no inferred mapping, and links to actual scoped testing list. No board/list behavior changed.

## Verification

- Latest scoped at01:42:12: **52/52 PASS,4files** (qa-glue48 + existing FeatureIssueForm1 + CaseIssueAction1 + FeatureIssuesPage2).
- A previous combined run with root-owned WorkBoardPage.test had62PASS/1FAIL of63: its notice CTA expected `/board/testing` while wrapper now consistently emits `/board/testing?projectId=1`. Sent exact root-owned line57 expectation to root; do not claim this run fully GREEN until root updates/checks it.
- Preservation verification: original46, replaced19, preserved27,18declarations, missing[].
- Scoped git diff --check PASS (configured LF/CRLF advisory only).
- Coverage not remeasured in this scoped pass. Root has not yet announced source freeze; **no full FE coverage/build run performed in this follow-up**. Await root freeze before requested consolidated run. No native/HTTP/browser proof inferred from mock API tests.

## Review note sent to root

CaseIssueAction currently uses canCreate to gate opening buttons. An already-open FeatureIssueForm remains mounted if canCreate becomes false. Server still enforces. Root owns Issue source and was sent this potential stale-capability UI gap for evaluation/reproduction; no speculative fix applied by this agent.

## Skills → application → evidence

Previously read tdd-workflow, frontend-patterns, security-review, code-review, verification-loop, systematic behavior diagnosis from earlier work. Used tdd to reproduce original20fail and new11fail before tiny notice fix; frontend patterns for current callback/context/abort tests; security review for exact rowId and no generic write/scope leakage; code review to preserve direct compatibility tests and report capability gap; verification-loop to separate scoped mocks/coverage/native claims. No duplicate skill-driven workflow, subagent or new package introduced.
