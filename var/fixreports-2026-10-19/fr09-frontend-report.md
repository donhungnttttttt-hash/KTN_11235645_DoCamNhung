# FR-09 frontend handoff

Date2026-10-19, branch system-design. Frontend only; no Maven/native/browser/DB/service/commit actions. Existing chat scope/send/history/provider fixes and root's new inline configuration panel were preserved.

## Changes

- `AiChat.jsx`: default project catalog now uses `aiApi.chatProjects()` (AI capability scope), independently of ordinary project membership list. Existing injected `projectApi.list` adapters remain supported. Project selection optionally loads `chatFeatures(projectId)`; custom adapters may expose `.features`. Older injected adapters without either Feature reader get an empty optional catalog; production aiApi always has the endpoint, and real API failures are displayed rather than hidden.
- Feature defaults to all in project (`targetId:null`); selecting one creates PROJECT_CHAT with that Feature ID. Changing project clears the old Feature. Changing project/Feature starts a future conversation while preserving the composer; history restores its pinned project/Feature. Current transcript, provider/model and admitted pending request remain pinned. Aborted/stale Feature responses cannot populate another project. Load errors offer retry and sending cannot silently downgrade an invalid selected Feature.
- Global PM/ADMIN see management presets; TESTER/DEV (and unknown roles) get personal file/case/issue prompts. No frontend claim of enforcing AI data policy: the backend must allow/deny management/bulk retrieval and redact context/output.
- Existing Cấu hình AI panel reuses AiSourceSelector. Toolbar is a responsive4-control grid (4desktop/2mobile columns). Configuration/CTA works inside chat without old menu links. Provider/model mutation is disabled while send/pending/GENERATING or initial/history detail reads are unresolved; new/history conversation selection cannot abandon an admitted pending request. Model changes apply to the next new conversation, not the pinned one.
- `services/api/ai.js` added GET `/ai/projects` and GET `/ai/projects/{projectId}/features`, same-origin session and existing35s AI client. No business data write or project CRUD permission was added.
- `aiProjectPrompts.js`, `ai.css`, chat/API tests updated. Existing task/source/file-ticket selectors were not reintroduced.

## Verification

RED new FR09 tests:6 failed,3 passed (9new cases) on old UI: missing AI project/Feature catalog, missing Feature target/scope, missing retry and worker presets still exposed management totals. After implementation the9passed. Added pin/history/config/GET adapter regression tests. One historical rapid-project-switch test now waits for the required optional catalog read before Enter, instead of attempting a send while scope is loading.

Final scoped run: **64/64 PASS across3 files** (`AiChat.test.jsx`48, `AiConnections.test.jsx`9, `services/api/ai.test.js`7). Coverage measured on4production files via `npm run test:coverage -- ... --coverage.include=... --coverage.reportsDirectory=../var/fixreports-2026-10-19/fr09-fe-coverage`:

| File | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| AiChat.jsx |92.28%|89.29%|93.40%|93.10%|
| AiConnections.jsx |82.27%|82.03%|89.28%|95.45%|
| aiProjectPrompts.js |100%|100%|100%|100%|
| api/ai.js |100%|85.71%|100%|100%|
| Total scope |89.08%|86.49%|92.85%|94.60%|

Coverage artifacts `fr09-fe-coverage/coverage-summary.json` + HTML. Last copy-only adjustment removed a negative “management report” instruction from worker prompts to avoid keyword-classifier false rejection; final64test rerun PASS. This is mock-API/component evidence, not native HTTP/model quality or policy proof.

Frontend build PASS; existing>500kB chunk advisory. Diff check PASS (LF/CRLF notices only). Impeccable detector reports one inherited warning `ai.css:17 .ai-notice border-left:3px`, outside this task's changed CSS; no new detector finding introduced. Lint/JS typecheck not configured. Browser/responsive/keyboard runtime checks NOT_RUN by this agent; root owns them.

## Skills and review

Read/apply api-design for catalog endpoints/target DTO; security-review for server authority/owner/scope boundaries and escaped content; tdd-workflow for RED→GREEN/coverage; frontend-patterns for shared provider lifetime, abort guards and state pins; frontend-ui-engineering for labeled scope controls, pending/error/recovery; impeccable Operate/craft-floor and concrete ui-ux-pro-max nav/back/keyboard/touch references for incumbent UI consistency. Code-review SKILL read: standards and spec axes were reviewed in-thread against the pre-FR09 working source/root Cấu hình AI baseline and C04/C10/C11 + root's interface. Parent explicitly prohibited subagents, so none were spawned. No external issue-tracker or publishing action was performed. Verification-loop: scoped tests/coverage/build/diff/detector with remaining gates recorded.

Standards review: no confirmed scope/owner leak or unrelated architecture change in this frontend diff. Spec review: new optional Feature target and role-aware presets present, config/thread/history/draft/pending pins preserved in tests. Server capability/retrieval/output safety remains backend ownership, not proven by UI tests.

Root integration: wire/read/test new catalogs and optional PROJECT_CHAT target in backend; remove old AI menu only with config panel working; run browser320/768/1440 and real role/permission scope tests. Preserve chat privacy, secret/local-owner restrictions and live answer-quality gates. FR09 is not marked fully DONE from this frontend artifact.
