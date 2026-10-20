# Report AI generation follow-up — 19/10/2026

## Scope and evidence

Owned product file: `Frontend/src/app/features/reports/ManagementAnalysisPage.jsx`.
Owned tests: existing `ManagementAnalysisPage.test.jsx`, new `ManagementAnalysisPage.ai.test.jsx` and `ManagementAnalysisPage.providers.test.jsx`.
After root reproduced a live failure and expanded ownership, targeted backend files are `AiDraftContent.java`, `AiDraftService.java`, `AiManagementReportGenerator.java`, `OpenAiResponsesClient.java`, the safe-code allowlist in `AiChatService.java`, and their focused tests (`AiDraftServiceTest.java`, `AiManagementReportGeneratorTest.java`, `OpenAiResponsesClientTest.java`). The shared frontend `aiErrors.js` adds a safe HTTP 402 message.
No REST API/DTO, database schema, dependency, credential, live-provider call, browser session, database mutation, restart, commit or push was performed by this agent. Root owns browser/live calls and runtime restart.

### Trace

The button calls `managementReportsApi.preview(projectId, body)` with a project/optional Feature, selected provider/model and generated request key. The client acquires CSRF and POSTs `/projects/{id}/management-reports/preview`, using its 35-second preview timeout. `ManagementReportPreviewController` delegates to `AiManagementReportGenerator`, which checks management rights, builds bounded current metrics and requests an `AiDraftContent` object through `AiDraftService`. READY is converted to `{ state, draftId, failureCode, markdown }` server-side. Frontend and backend field names agree.

Root's controlled Chrome attempt at 12:46:33Z–12:46:51Z, after pausing frontend writes, reproduced `AI_INVALID_RESPONSE` with the editor empty. Earlier silent attempts overlapped App/AppRouter edits (19:45:58 Vietnam time) and were not treated as proof of an independent provider/StrictMode bug. A real-provider-context StrictMode test, using production CSRF/API clients and mocking only fetch, produced exactly one request and kept the completed response.

The exact failed provider field was not recorded by the prior code, so the original rejection branch remains unproven. The backend change addresses a confirmed contract gap and adds safe branch diagnostics; it does not claim the model necessarily exceeded a particular limit.

### Reproduced user-visible failures

1. A valid READY report left the empty Markdown editor empty. There was no success announcement; content only appeared in a separate proposal panel requiring another action.
2. READY with empty/whitespace Markdown was accepted as a proposal with an active apply action.
3. A null/unrecognized response could surface a property-access error, rather than retaining the request for a safe retry.
4. HTTP success with unreadable JSON cleared its admitted key, allowing a new generation instead of reconciling the original request.
5. A new generation left an old proposal actionable; users could apply stale content while awaiting a newer result.
6. AI_INPUT_TOO_LARGE advised shortening a chat message although this report action has no message input, or reduced to the backend's generic error.

### Resulting behavior

- A nonempty READY result fills the Markdown editor only if it remains empty and unchanged since the request started. The user's title is retained. An explicit status says generated content is not yet saved.
- Existing content, content typed while waiting, and content intentionally cleared while waiting remain unchanged. The new proposal is shown separately and is applied only by the explicit `Đưa vào bản soạn` action.
- Applying or generating text never calls report create/update automatically.
- Empty READY is an actionable failure. Unknown/null responses and unreadable HTTP responses retain the admitted request identity for retry; timeouts/network/5xx/pending behaviors stay pinned.
- A new request removes the older unapplied proposal. Pending requests disable the apply action.
- Scope overflow errors direct the user to select one Feature. Other AI-coded errors are mapped through the existing safe error messages.
- Existing project-switch disposal, permission checks, saved draft restoration and version conflict behavior are retained and exercised by the report regression suite.

### Why not pin every HTTP 422

Unlike the connection-probe path, `AiDraftService.generate` marks provider `AI_UNAVAILABLE`/`AI_INTERRUPTED` failures terminal and returns a FAILED draft. Preflight gateway exceptions occur before generation reservation. Therefore this report fix does not copy the probe's pending-422 rule without evidence. A valid FAILED response permits a distinct later request.

## Verification and skills

| Skill | Application | Evidence |
| --- | --- | --- |
| systematic-debugging | Traced the UI, API timeout/CSRF, generator, schema validation and output mapping before edits; separated frontend failures from unverified provider behavior. | Trace above and behavioral RED logs. |
| test-driven-development + writing-good-tests | Tested actual rendered report/editor behavior with only the API/network boundary mocked; independent Markdown values, late edits and duplicate-request checks. | `red-ai-generation.log`: 9 failed / 1 passed; `red-unreadable-response.log`: 1 failed / 10 passed. |
| verification-before-completion | Ran focused + existing report/provider-buffer/API tests and inspected failures before declaring the subtask verified. | `green-report-ai-provider-integration.log` and JSON: 61/61 tests, 5 files, exit 0. Earlier `green-report-ai.log`: 60/60. |
| api-design | Compared provider request contract, response validation and error/pending semantics; kept public DTOs unchanged. | Backend contract RED 2/13 → GREEN 47/47 verify/package; `backend-contract-red.log`, `backend-contract-green.log`. |
| security-review | Retained strict field/citation validation and project rights; added only enum diagnostics with no model content, credentials or source values. | Sanitized-log behavioral test, existing forged-reference tests and full AI regression. |

One intermediate regression run had 1/48 failure: a previous test used `findByText('Bản gợi ý')`, which became ambiguous once both textarea and rendered preview contained the returned text. It was updated to assert the editor's value; the same-key assertion was preserved. See `green-ai-generation.log` for the retained intermediate failure.

## Backend follow-up

- Confirmed contract gap: the existing report instructions merely said to use the specified schema, whereas the validator requires exactly five fields and hard text/list/citation bounds. `AiDraftContent.schema` does not convey the bounds in the wire schema. The prior Caheo investigation (`docs/reviews/2026-10-18-caheo-chat-send.md`) already proved that this compatible provider can ignore the strict format and return the wrong field names.
- `feature-report-v2` now includes the complete JSON schema as explicit instructions, including the existing length/list/citation limits and allowed source reference enum. It asks for the object itself, without an `answer` wrapper or Markdown fences. This makes both the shape and limits visible even when the gateway ignores structured formatting.
- Existing wire schema is retained for compatibility with older/fine-tuned models; the bounded schema is part of the instructions only. [Official OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs) distinguishes supported schema constraints and additional fine-tuned-model limitations. Provider support is not inferred from the name alone.
- Validation is not weakened. Rejections still return the sanitized `AI_INVALID_RESPONSE` code and cannot become READY or create a stored report. Server logs can now identify an enum-only rejection stage such as `ROOT_SHAPE`, `SUMMARY_TEXT` or `CITATION_REF`. A test verifies that model content and response IDs are absent from those log messages.
- Targeted backend: **47/47 tests, verify/package success, exit 0**. Full AI offline suites: **177/177 tests, no failures/errors/skips, exit 0**. The full AI selector excludes all four LiveConnectionTest classes and uses only mocked or local HTTP dependencies; no DB/provider call. See `backend-ai-regression.log/json`.
- Expected warnings remain in Maven logs: Mockito/ByteBuddy dynamic attachment, JVM class sharing, and deliberately rejected configuration cases. The validation warning is intentional test evidence. These were not represented as application startup failures.

### Provider transport diagnostic follow-up

Root's next controlled call after restart with prompt v2 returned `AI_REQUEST_REJECTED`, not `AI_INVALID_RESPONSE`; a selected-Feature attempt did the same. No content-validation warning was observed. This is a distinct transport rejection, and success is not claimed.

`OpenAiResponsesClient` now logs the rejected HTTP status and a code from a fixed allowlist only. Arbitrary codes become `UNKNOWN`; provider messages, parameters, response bodies, prompts and credentials are never logged. Request format, timeouts and retry behavior are unchanged. New tests first failed twice on the absent diagnostic, then **45/45 tests** across the three relevant backend classes passed with verify/package and exit 0 (`backend-http-diagnostic-red.log`, `backend-http-diagnostic-green.log`). The earlier 177-test regression predates this diagnostic-only addition. Root owns the follow-up runtime restart and exact live HTTP diagnosis.

### Actual HTTP rejection and payment guidance

At 19:57:12 Vietnam time, root's controlled live attempt logged `httpStatus=402, code=UNKNOWN`. HTTP 402 by itself does not prove that the visible account balance is zero. The frontend now maps the safe local `AI_PAYMENT_REQUIRED` code to guidance to check the provider account's payment or limits, instead of telling the user to change content/model. Manual draft text remains intact; neither automatic retry nor automatic report saving occurs.

TDD evidence: `backend-payment-red.log` has three expected failures (two transport mappings and the safe-code boundary); `frontend-payment-red.log` has two rendered feedback failures (FAILED body and HTTP error). `backend-payment-green.log`: **48/48 tests**, verify/package exit 0. `frontend-payment-green.log`: **58/58 tests**, five files, exit 0. `backend-ai-regression-final.log`: **182/182 offline AI tests**, exit 0; this run precedes the subsequent known-balance-type change.

Root then performed one public synthetic request without project data. The provider returned HTTP 402 with machine `error.type=insufficient_balance`, confirming what the current configured key/request was being refused for. The user reports that their account still has balance, so the discrepancy remains external and unresolved; no assertion is made about the account's actual balance or which provider limit is responsible. Root owns the sanitized probe receipt. There were no additional provider calls by this sub-agent.

The final transport change maps this exact known machine type to the existing `AI_QUOTA_EXHAUSTED` guidance; unknown HTTP 402 retains `AI_PAYMENT_REQUIRED`. Other HTTP 400 failures remain `AI_REQUEST_REJECTED`. The targeted known-balance test failed first (`backend-known-balance-red.log`: 1 failure / 35), then **183/183 offline AI tests passed with verify/package**, no failures/errors/skips, exit 0, finished 20:02:17 Vietnam time (`backend-ai-final-verify.log/json`). The final jar is ready for root's coordinated restart. This is a verified classification/feedback fix, not proof of a successful live generated report.

Final owned-file hashes are recorded in `final-report-ai-hashes.json` (13 source/test files). Scoped `git diff --check` passed. The frontend source has remained unchanged since the payment message; root is rerunning the full frontend suite/build independently.

Full frontend suite/build and live Chrome verification after restart are owned by root and are not claimed here. Coverage percentages were not measured; Maven produced JaCoCo data during checks, which is not a reported coverage result. No assertion is made that live model output always conforms to the schema or that every role/state has been browser-tested.
