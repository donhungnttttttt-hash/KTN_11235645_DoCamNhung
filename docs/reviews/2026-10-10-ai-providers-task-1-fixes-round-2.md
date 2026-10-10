# AI providers — Task 1 settlement fixes, round 2

Date: 2026-10-10. Reviewed base: `5a2c709cad2213a28cc6dea47d85b7023a7e2f54`. Scope: remaining R3 and new R6/R7 from scoped re-review. No live provider calls, schema changes, application restart, push or changes to root planning files.

## Changes and recovery behavior

New request admission remains nonwaiting: a busy state fence, refresh in progress or pending settlement returns `AI_BUSY`. Completed external operations use a separate, single local settlement worker. Its retained action waits for the state fence, then rechecks connection/version before writing. The originating request waits only its existing remaining deadline. Timeout or interruption does not cancel the action. No provider HTTP operation runs under the state fence or on the settlement worker.

- **R3:** terminal refresh errors retain their invalidation action during contention. Settlement clears credentials and verification, increments the version and durably marks `RECONNECT_REQUIRED`. Pending settlement blocks another refresh, including when the original caller has timed out. The regression restarts from the persisted vault snapshot and proves no second refresh occurs.
- **R6:** successful rotating credentials are retained until persisted or rejected because the connection actually changed. A caller deadline does not discard the replacement. A temporary vault-write error keeps admission closed and retries only local persistence once per second; it does not send another OAuth request. Refresh transport/validation errors are handled separately from settlement errors so a completed rotation is not misclassified as a temporary provider failure.
- **R7:** successful and failed probe outcomes settle without replaying inference, retain the original request key/daily reservation, and become terminal during the same process. Callback failures likewise settle terminal attempt state. Callback success and probe readiness revalidate the captured session at settlement, including logout that happens while the fence is occupied. Callback persistence retry does not prematurely mark the attempt failed.

Probe persistence now prepares a copy before writing, so a failed write cannot expose an in-memory READY state before durable acceptance. DTOs and gateway signatures are unchanged. [API documentation](../api/ai-providers.md) now describes transient `AI_BUSY` during settlement, same-key lookup, vault failure recovery and the crash window.

## Verification

Applied skills continue to be `api-design`, `tdd-workflow`, and `security-review`. All shell commands used RTK. Tests use mocks or in-process loopback fixtures only.

Before implementation, this command reproduced **four behavioral failures in 18 tests**, with no compilation errors: terminal invalidation, rotating-token acceptance, completed probe, and failed OAuth callback all returned before acquiring the held settlement fence and lost their required transition.

```text
rtk proxy mvn -f Backend/pom.xml '-Dtest=ChatGptConnectionServiceTest' test -q
```

The final selected verify run passed **96 tests, zero failures/errors/skips**, including package and JaCoCo generation:

```text
rtk proxy mvn -f Backend/pom.xml '-Dtest=AiProvider*Test,ChatGpt*Test,AiDraftServiceTest,AiAssistanceServiceTest,OpenAiResponsesClientTest,OpenAiConfigurationTest,AiAccessTest,AiDraftContentTest,AiContextBudgetTest' verify -q
rtk git diff --check
```

Nine added cases cover the four reported races, probe success/failure variants, deadline expiry while the rotated result is retained, vault-write failure/retry, callback logout during settlement, and callback persistence retry. Existing stale-disconnect/version fences, fail-fast admission, five-second catalog budget, authorization, vault, SSE, draft and legacy API regressions remain green. The existing timeout fixture now explicitly allows transient `AI_BUSY` while its retained local failure update completes; its network deadline assertion remains unchanged. An intermediate full run exposed that expected asynchronous observation race (95 passing, one error); the final run is green.

Measured focused AI-package coverage: **852/1215 lines (70.1%)**, **612/1206 branches (50.7%)**. This remains below 80% and is not whole-system coverage. Native V24's previous 18 passing tests were not rerun because this round changes no schema. Existing Mockito future-JDK warnings remain.

## Limitations

The retained outcome is in memory until the protected vault commit. Abrupt process termination before that commit can lose an outcome; this is not a distributed transaction with the provider. Startup still marks abandoned probe reservations `AI_INTERRUPTED` without resetting quota or replaying inference. Loss of a rotating response can require explicit reconnect. Persistent filesystem failure keeps admission closed rather than using the consumed credential again; operator repair is required. Graceful application shutdown is not claimed to make an uncommitted outcome crash-durable.

Live user OAuth, plan entitlement/schema acceptance and native Ollama acceptance remain untested operational gates. No paid-call acceptance is claimed.
