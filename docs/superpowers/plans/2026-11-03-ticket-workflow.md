# Ticket workflow implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. No commits without user authorization.

**Goal:** Implement the approved Bug/QA workflow, source evidence, project responsibilities, atomic discussions, notifications and nine-column board across existing Feature issues.

**Architecture:** Extend FeatureIssue rather than add a second ticket system. Normalize ticket state/reason in additional data and mirror compatible legacy status codes so existing history remains interpretable. One workflow policy controls transitions, capabilities, board buckets and reporting.

**Tech Stack:** React JavaScript/Vitest, Spring Boot Java 21/JDBC, MySQL native/Flyway.

**Spec:** `docs/reviews/2026-11-03-ticket-workflow-analysis.md`, user diagram and approval “tooi duyet nen thucj hien di” on 03/11/2026. Approval authorizes implementation of the presented proposal. One title terminology question remains asynchronous; independent work continues.

## Global constraints

- Keep working branch system-design and all existing WIP. Implementation originally excluded commit/push/merge; after completion the user explicitly requested a local commit ("thuc hien xong thi commit di"). Commit the completed dependent identity/profile/Ticket work together; do not push/merge. Use isolated DB tests, never test writes in main tms.
- USER retains combined Tester/Dev functions. Project duties SPEC_REVIEWER (BA/BrSE), BUG_COORDINATOR (PM Dev) may be assigned to active USER/PM members; never change account or project roles. PM/Admin retains management rights. GUEST/outside-project denied internal tickets.
- QA starts SPEC_CONFIRM; BUG starts NEW. Closed/PROCESSED awaits tester and is not finalized. Closed/FIXED confirms fixed; CANNOT_REPRODUCE/WONT_FIX final bug outcomes; UNSUPPORTED QA-only.
- Nine board columns in user order; totals cover all filtered rows, not fetched page. Existing ambiguous data appears in separate legacy reconciliation list/count, never silently hidden or declared fixed.
- Ticket evidence/version snapshots stay unchanged when test case/Feature later changes; live Feature context remains displayed. Missing historical version stays explicitly missing, never guesses latest version. Standalone monkey issues keep manual evidence and no fake case link.
- Only new V39 migration; preserve V1–V38 byte-for-byte. Legacy statuses shared with retired flows cannot be globally reinterpreted.
- No external messaging/provider requests; notifications internal and scoped. Do not resurrect run/retest workflows.
- Comments, workflow changes, assignments and notifications save atomically with version check/idempotency; ordinary comments preserve assignment and state.

## Contract shared by tasks

Keep existing `/api/v1/projects/{p}/issues` base and existing ID/key/history/source links. Add an explicit workflow policy and typed DTOs; retain source-compatible constructors for existing Java callers if needed but enforce new public request validation.

Public ticket additions: `preconditions,frequency,environment,device,testVersionId,testVersionName,executedOn,testObject,caseReference,ticketState,closureReason,boardColumn,legacyWorkflow,awaitingVerification,finalized,coordinatorMembershipId,verifierUserId,verifierName`. Existing `version` remains optimistic lock version (not testVersion). `allowedTransitions` items `{state,closureReason,columnId,label}`; `canConvertToBug,canAssign,canEdit,canComment` server-controlled. Keep old status fields for legacy consumers, new UI uses workflow fields.

States: `SPEC_CONFIRM,NEW,IN_PROGRESS,WAITING_CONFIRM,CLOSED`; reasons `PROCESSED,FIXED,CANNOT_REPRODUCE,WONT_FIX,UNSUPPORTED`, or null when not CLOSED. Column IDs: `spec,new,progress,verify,processed,fixed,cannot_reproduce,wont_fix,unsupported`; `legacy` separate reconciliation.

Mirror codes: SPEC_CONFIRM→clarify; NEW→open; IN_PROGRESS→progress; WAITING_CONFIRM→recheck; CLOSED/PROCESSED→resolved; CLOSED/FIXED→closed; CLOSED/CANNOT_REPRODUCE→unreproducible; CLOSED/WONT_FIX→wontfix; QA CLOSED/UNSUPPORTED→closed. Reports use canonical finality for Feature issues and legacy terminal flag elsewhere.

- GET `issues/context`: existing fields plus preconditions, testObject, actualResult if available, testVersionId/name, executedOn, resultVersion. Saved row version is source, not a header selection. Server revalidates source revision/resultVersion at creation when supplied.
- POST `issues`: existing content + preconditions/frequency/environment/device/assigneeMembershipId/ticketState/closureReason/sourceRevisionId/sourceResultVersion/manualTestVersion (monkey only). Return enriched ticket. BUG requires steps/expected/actual/frequency/environment/device; QA requires description and chosen spec contact. Case missing testVersion may create with explicit missing metadata; user can first record case version. Source version cannot be spoofed by client.
- GET `issues/options?type=BUG|QA&assigneeMembershipId=...`: `{assignees:[{membershipId,userId,displayName,username}],canManageResponsibilities,initialTransitions:[{state,closureReason,columnId,label}]}`. Recipient query optional; includes active project PM (ADMIN membership PM) plus designated USER for respective duty; no global user leakage. Initial transitions use the same creation policy for current actor/recipient; no recipient yields default only, revoked recipient yields empty choices with current contact list. Bug UI supports authorized nondefault state and required closure reason per approved analysis.
- PUT `issues/{id}`: content editing; workflow and assignment mutations consolidated by the command below, retain backward compatibility safely for existing explicit assignment update if necessary.
- POST `issues/{id}/actions`: `{body?,state?,closureReason?,assigneeMembershipId?,verifierUserId?,convertToBug?,expectedVersion,requestKey}`; omitted fields preserve values, invalid explicit null assignment rejected where required. Returns enriched ticket. At least one real change or nonblank comment. QA conversion requires valid Bug coordinator, preserves ID/history/comments.
- Existing comment/status endpoints delegate to same policy/transaction, never bypass permission/closure checks. `/comments` still returns comment records; an action containing a comment must be visible there and in history.
- GET `issues/board`: existing filters plus `column`; `{columns:[{id,label,count}],legacyCount,totalItems}`. Existing list supports `column` so each column and legacy list can be loaded/paged consistently.
- GET `/projects/{p}/ticket-responsibilities`: `{canManage,members:[{membershipId,userId,displayName,username,projectRole,systemRole,duties,version}]}`. PUT `.../{membershipId}` `{duties:[SPEC_REVIEWER|BUG_COORDINATOR],expectedVersion}`; only manager writes, membership/current user lock and version check.
- GET `/me/ticket-notifications?page=0&size=20`: `{items:[{id,projectId,ticketId,ticketKey,title,actorName,message,createdAt,readAt}],unreadCount,totalItems}`. PUT `.../{id}/read` idempotently acknowledges only caller's currently accessible notice. No guest access.

## Review focus

1. Same USER occupies multiple duties or is creator and assignee: no unintended privilege, duplicate notice, or forced fake approval.
2. Recipient removed/disabled or duties revoked during edit: server checks current rights and UI retains draft.
3. Source case changed while ticket form open: no silent snapshot mismatch; conflict with retained draft.
4. Historical closed tickets lack closure reason: preserve finality/history and expose reconciliation; never invent FIXED evidence.
5. Timeout/retry or two comments on same lock version: atomic single event/notice, informative conflict, no lost draft.

### Task 1: Backend workflow, data, API and reporting

**Files:** new V39 migration; `workitem/TicketWorkflow.java`, `TicketResponsibilities.java`, `TicketNotifications.java` and controllers as needed; modify FeatureIssueService/Dtos/Controller, relevant reporting/admin/AI queries; new `TicketWorkflowTest`, `TicketWorkflowNativeTest`, `TicketWorkflowMigrationNativeTest`; adapt related backend regression tests to approved behavior.

**Interfaces:** Produces contract above; old FeatureIssue identity preserved. Pure TicketWorkflow policy derives valid combinations, column, finality, mirror status and labels; authorization service checks actor duties, creator/verifier and assigned worker. Do not expand existing FeatureIssueService into an unreviewable monolith.

- [x] Write and run failing tests for QA default/convert same ID, USER duty vs global PM rights, Bug processed not final, tester final/reopen, Guest/outside denied, atomic comment/assignment with notification/retry, source version snapshot, board totals > page size and legacy preservation.
- [x] Add migration/data and policy. Backfill only unambiguous legacy values; expose legacy reconciliation for others. Record native before/after hashes, no old migration edit.
- [x] Implement shared commands/context/responsibilities/notifications and permission rules from approved matrix; creators can edit their source issue, assigned spec reviewers convert, coordinators assign, assigned workers progress/process, verifier finalizes/reopens, managers override with reason. Staff comments do not grant edit permissions.
- [x] Update reporting/Admin/AI/archive calculations to count processed+waiting as awaiting verification, processed not terminal; keep legacy nonfeature behavior.
- [x] Verify with `rtk proxy node scripts/Test-UnifiedAccessNative.cjs --tests TicketWorkflowTest,TicketWorkflowNativeTest,TicketWorkflowMigrationNativeTest` (owned native schema only) and related suites. Final expanded gate:83executed,0failures/errors/skips. RED/GREEN evidence under task workspace.
- [x] Review task diff, address important findings, report exact tests and limits. One fix round, scoped review approved; JDT0errors/0warnings. No commit.

### Task 2: Frontend integrated workflow

**Files:** FeatureIssueForm/Detail/Board/IssuesPage and styles, service API; new ticketWorkflow.js, TicketResponsibilities.jsx, TicketNotifications.jsx and tests; attach responsibility dialog to project Issue page and notification bell to existing app/Admin header. Guest header excludes internal notifications.

**Interfaces:** Consumes Task 1 DTOs/endpoints; server owns capabilities/allowed transitions. Separate normalized ticket state from case result status. Source-backed version read-only, manual version only standalone.

- [x] Write/run RED behavior tests for form prefill/manual fields/assignee, QA default and conversion, action comment with unchanged selection, reason chooser, conflict/draft retention, notification read/link and duties dialog.
- [x] Implement compact form sections, title prefix and editable suffix, source reference/version with missing-state feedback. Existing standalone monkey route remains usable. Prefix third segment pending user's No/ID clarification; isolate title helper to adapt independently.
- [x] Implement detail edit/action composer, same-ID QA conversion confirmation, chronological comments/history, verifier handoff and assignment choices. Reuse existing modal focus/dirty-close conventions, visible validation/pending/retry/success.
- [x] Implement nine-column board with server totals, per-column selection/filter and pagination; legacy reconciliation surfaced separately. Drag/select uses same action form with confirmation, never optimistic unconfirmed mutation.
- [x] Add project duty editor and internal notification bell; handle stale user/duty/permission, scoped links, read/unread without leaking private data. Keyboard/responsive behavior covered in component tests; real Chrome checks in Task3. Known minor contact reload improvement handed to Task3, not dropped.
- [x] Run related tests, full frontend suite with maxWorkers2, build; record coverage honestly. Final1272/1272tests, buildPASS; scopedreviewapproved after3findings fixed. No commit.

### Task 3: Integration, Chrome, migration rehearsal and local rollout

**Files:** isolated verification artifacts/scripts, contract `docs/api/ticket-workflow.md` and OpenAPI fragment, review report and STATUS. Product fixes limited to issues found in these paths.

- [x] Cross-check actual API payloads/UI expectations and run combined native regression. Java diagnostics; no ignored skipped required tests.
- [x] Start isolated backend/frontend against owned test DB; Chrome separate/headless as user requested, no desktop control. Exercise QA→Bug→processed→fixed/reopen, cannot reproduce, comments, assignments, notifications, duties, all nine totals, mobile/keyboard and errors.
- [x] Capture meaningful screenshots/network results, inspect images, fix regressions with RED/GREEN evidence. No main fixtures.
- [x] Review source including preexisting WIP boundaries. Back up current tms, prove restore and migration on separate copy. Compare IDs/history/domain rows and old migration checksums. If data mappings remain ambiguous, retain explicit legacy list instead of destructive inference.
- [x] Apply verified migration/backend to local runtime only after rehearsal; smoke login/read paths without fake business writes. Never stop unrelated Chrome/MySQL/services.
- [x] Update per-task evidence, skill→purpose→result, DONE only when gates met; report remaining limits. No commit/push.

## Execution record

- User explicitly authorized implementation of the presented analysis; no repeated general approval gate. Preparation/spec/plan are recorded for reviewability while execution proceeds.
- Existing source WIP is retained on system-design. No stash/reset/new worktree that loses approved uncommitted identity/profile changes; build/test isolation instead.
- Responsibilities and validation defaults follow approved proposal; no role changes. The only unanswered terminology question is source No/ID, asked asynchronously.
- Native runner reuses its owned test schema only; main database is excluded from automated test fixtures.

Final03/11: Task3DONE.1293FE,87backendregression+14focused(overlap)+1exactfinal;JDT374/0/0;43isolatedChrome+11mainchecks. Finalreview2Importantfixed/re-reviewclean. MainV39/PID21868healthUP,89oldtables/Flywayhistorypreserved,38oldmigrationdefinitionsunchanged. No commit/push. Full results/limits: docs/reviews/2026-11-03-ticket-workflow-implementation.md.
