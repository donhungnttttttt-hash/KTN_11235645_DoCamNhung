# Arena lifecycle and settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho ADMIN lưu trữ dự án có tồn đọng cycles/retests cũ bằng ngoại lệ có lý do và lịch sử, đồng thời làm Rules diễn đạt đúng phạm vi đang có.

**Architecture:** Mở rộng additive contract/archive decision hiện hành, giữ nghĩa `canArchive` và digest lệnh cũ. Server dựng snapshot và tái kiểm dưới transaction; UI chỉ xác nhận snapshot server. Rules chỉ sửa trình bày, không đưa rule engine cũ vào Feature Issue và không đổi quyền công bố hiện có.

**Tech Stack:** Spring Boot/Java/MySQL/Flyway, React JavaScript/Vitest, native integration tests có guard.

**Spec:** [Kế hoạch chính](2026-10-25-arena-followup.md), [RX-02/RX-10 và quyết định ngoại lệ của người dùng](../../reviews/2026-10-19-uiux-system-repair-plan.md), [FixReports C01–C14](../../planning/2026-10-19-fixreports-clarification.md), [ma trận U17–U21](../../planning/2026-10-25-arena-acceptance-matrix.md).

## Global Constraints

- Áp dụng Global Constraints của kế hoạch chính. **Chỉ** `UNFINISHED_CYCLES` và `OPEN_RETESTS` được ADMIN xác nhận ngoại lệ có lý do.
- `ACTIVE_SESSIONS`, `ALLOCATED_DEVICES`, `OPEN_WORK_ITEMS`, `PENDING_PUBLICATIONS` vẫn chặn. Loại bỏ trạng thái legacy khỏi UI không có nghĩa được âm thầm bỏ blocker.
- Không đóng/xóa/đổi trạng thái child để archive; giữ nguyên dữ liệu, history, audit, reopen và ordinary-command replay.
- “Trao đổi DEV/khách hàng và xác minh lại là quy trình bên ngoài; người dùng yêu cầu không đưa quy trình đó thành workflow code mới.” Không phục hồi QA answer-confirm/retest/scope engine.
- Không đổi PM/TESTER/DEV thành người archive; ADMIN vẫn chịu version và quyền hiện hành tại thời điểm submit.
- Không sửa migration đã áp dụng. Sau pull, `db/demo/V34__complete_local_demo.java` đã tồn tại. Dùng V37 dự kiến cho archive; kiểm cả SQL/Java và tất cả locations trước khi đặt số. Core/release hiện cuối V33; local core+demo cuối V34.
- Không tự commit/push/merge/deploy hoặc migration/restart main. Fresh/upgrade chỉ chạy trên target cô lập đã được xác nhận.

## Review Focus

1. Payload cũ/replay sau reopen bị hỏng do thay digest hoặc thứ tự kiểm — AR-06 compatibility tests.
2. Số blocker bằng nhau nhưng là ID khác — AR-06 fingerprint identity test; AR-07 bỏ chọn xác nhận khi refresh/conflict.
3. Thiết bị/công việc/outbox xuất hiện sau preview — AR-06 locking native race, không chỉ mock count.
4. Timeout/retry dùng fingerprint mới nhưng key cũ — AR-07 giữ nguyên pending command; conflict mới tạo ý định mới.
5. UI Rules hứa điều backend không làm hoặc client xóa required fields gây422 — AR-08 text/contract tests, không sửa policy engine.

## AR-06 — Backend và migration ngoại lệ lưu trữ

**Files:**

- Modify: `Backend/src/main/java/vn/syp/tms/admin/ProjectLifecycleService.java`, `ProjectLifecycleController.java` cùng thư mục.
- Create: `Backend/src/main/java/vn/syp/tms/admin/LegacyArchiveSnapshot.java` — canonical snapshot/hash policy, không thêm repository/service tổng quát.
- Create: `Backend/src/main/resources/db/migration/V37__project_archive_legacy_exception.sql` — dự kiến V37, kiểm lại số khi thực thi; không trùng hoặc sửa V34 demo.
- Create: `Backend/src/test/java/vn/syp/tms/admin/LegacyArchiveSnapshotTest.java`, `ProjectArchiveLegacyExceptionTest.java`, `NativeCurrentProjectLifecycleIntegrationTest.java`, `NativeCurrentProjectLifecycleConcurrencyTest.java`.
- Create: `Backend/src/test/java/vn/syp/tms/filework/NativeArchiveExceptionMigrationTest.java` — guard riêng cho hai target fresh/upgrade, **không** nằm trong runner integration.
- Preserve/port assertions: `Backend/src/test/java/vn/syp/tms/filework/NativeProjectLifecycleIntegrationTest.java`, `NativeProjectLifecycleConcurrencyTest.java`, `NativeProjectLifecycleMigrationTest.java`.
- Update: `docs/api/fixreports-contract.md`, runner allowlist/guard tests AR-00 chỉ cho hai class current lifecycle mới sau review.

**Interfaces — chốt trước AR-07:**

1. Giữ endpoints `GET /api/v1/admin/projects/{id}/archive-readiness`, `POST .../archive`, `POST .../reopen`, `GET .../lifecycle-decisions`.
2. `Command(Long expectedVersion, String reason, String requestKey, @Valid LegacyException legacyException)`; giữ constructor Java3 trường gọi constructor4 trường với null để test/callsite cũ không hỏng. Constraint cũ giữ nguyên: expectedVersion>=0, reason sau trim 1–2000 ký tự, requestKey `[A-Za-z0-9_-]{8,100}`.
3. `LegacyException(Boolean acknowledged, String snapshotFingerprint)`: object thiếu/null = lệnh thường; object có thì acknowledged phải true và fingerprint `[0-9a-f]{64}`. Service validate cả direct call, không chỉ controller Bean Validation. Object ngoại lệ gửi vào `/reopen` trả422 `INVALID_COMMAND`.

   ```json
   {
     "expectedVersion": 7,
     "reason": "Giữ nguyên các đợt và yêu cầu kiểm thử lại thuộc luồng cũ",
     "requestKey": "archive-example-01",
     "legacyException": {
       "acknowledged": true,
       "snapshotFingerprint": "<64 lowercase hex do server tra ve>"
     }
   }
   ```

4. Readiness giữ `canArchive=true` **chỉ khi active và không có blocker**. Thêm `blockers[].exceptionEligible`, `canArchiveWithLegacyException`, `legacyExceptionFingerprint`. `canArchiveWithLegacyException=true` chỉ active, có >=1 legacy blocker, không hard blocker. Fingerprint chỉ trả khi có eligible blocker; không nhận danh sách IDs/counts/policy do client đưa vào.
5. `LegacyArchiveSnapshot` nhận projectId/projectVersion + tập cycle/retest current-locking-read. Snapshot gồm `policyVersion:1`, projectId/projectVersion, cycles `{id,status,version,runIds}` và retests `{id,status,version}`; sort IDs tăng, runIds distinct/sort cho từng cycle. Điều kiện cycles giữ nguyên ACTIVE hoặc DRAFT có run; retest status OPEN. Count tính từ snapshot, không dùng count làm identity. Không đưa `asOf`, label dịch, thứ tự Map tùy ý vào hash.
6. `LegacyArchiveSnapshot.fingerprint()` SHA-256 hex trên biểu diễn canonical đã xác định bằng unit test; không hash object `toString()`. JSON persisted bổ sung `fingerprint` và counts cho việc kiểm tra sau này, fingerprint tính trên phần snapshot không chứa chính nó.
7. Migration chỉ thêm `project_lifecycle_decisions.legacy_exception_snapshot JSON NULL`; old rows/normal command/reopen giữ null. Insert snapshot cùng transaction với update project + decision + audit. History/latestDecision thêm `legacyException: null | {policyVersion, fingerprint, blockers:[{code,count}]}`; không trả requestKey/payload hash hoặc private credential. Actor/reason/time đã có, giữ làm authority.
8. Hash thường giữ **chính xác** `checksum(List.of(action, expectedVersion, trimmedReason))`. Hash ngoại lệ: `checksum(List.of("PROJECT_LIFECYCLE_LEGACY_EXCEPTION_V1",action,expectedVersion,trimmedReason,true,snapshotFingerprint))`. Không fallback hash thường cho lệnh ngoại lệ.
9. Thứ tự decide: current identity lock → project lock → basic validation → requestKey/actor/hash replay → version/state → recompute snapshot+all blockers → fingerprint/eligibility → update+decision+audit. Successful replay trả trạng thái hiện tại; không kiểm lại freshness rồi archive lần nữa sau reopen.
10. Stale snapshot:409 `LEGACY_BLOCKERS_CHANGED`; hard blockers:409 `ARCHIVE_BLOCKED`; version:409 `VERSION_CONFLICT`; changed payload/actor same key:409 `IDEMPOTENCY_CONFLICT`; nonADMIN403. Error không để transaction ghi một phần.

- [ ] Viết unit `snapshotIsStableAcrossRowOrder`, `sameCountDifferentIdsChangesFingerprint`, `normalDigestRemainsByteCompatible`, `exceptionPayloadValidationAndDigest`. Kiểm cả đổi status/version/runIds, labels/asOf không tham gia digest. `assertNotEquals(hashA, hashB)` với cùng count khác ID; `assertEquals(oldDigest, newNormalDigest)`.
- [ ] Chạy RED root: `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "LegacyArchiveSnapshotTest,ProjectArchiveLegacyExceptionTest"`; fail vì behavior/class chưa có, không do DB.
- [ ] Thêm additive migration và snapshot/DTO/contract. Reuse current locking joins/reads, giữ thứ tự project lock tương thích writer khác. Không thêm fallback runtime “thiếu cột thì bỏ qua” cho schema V21 cũ.
- [ ] Implement decision flow ở interface trên. Snapshot được dựng server-side, không tin client count/codes; có fingerprint hợp lệ vẫn phải kiểm **mọi** hard blocker. Giữ `canArchive` backward compatible.
- [ ] Port regression hiện có từ fixture V21 sang **current** native classes mới, gồm ordinary archive/reopen, blocker removal, actor, batch/no partial, lost response/replay. Historical migration V21 test giữ riêng; không chạy current service truy vấn cột mới trên schema V21 rồi nới validation để xanh.
- [ ] Native integration thêm: `archivesOnlyAcknowledgedLegacyBlockersWithoutChangingChildren`, `oldCommandReplaySurvivesMigration`, `exceptionReplayAfterReopenDoesNotArchiveAgain`, `rejectsChangedActorOrPayloadForSameKey`, `rollsBackDecisionAndProjectTogether`. Assertions: child IDs/status/checksums trước=sau, decision/audit +1 khi thành công, replay +0, history reason/snapshot đúng, normal snapshot null.
- [ ] Native race thêm: `sameCountReplacementInvalidatesPreview`, `hardBlockerCommittedAfterPreviewStillBlocksArchive`, `adminRevocationBeforeSubmitBlocksArchive`, `concurrentArchiveRequestsHaveOneWinner`. Dùng hai connections/latches để chứng minh khóa, không sleep đoán. Giữ các hard blockers riêng lẻ và tổ hợp; có ordinary legacy work item vẫn chặn, đưa nhu cầu giải quyết nó sang G07.
- [ ] Viết migration test riêng với `TMS_ARCHIVE_MIGRATION_MODE=fresh|upgrade`, manifest+digest bắt buộc. Dùng cùng validation target/provenance của AR-00 nhưng cho phép **migration đúng một task này**: fresh schema rỗng; upgrade fixture core V33 hoặc local V34 theo locations được ghi trong manifest, có decisions/hash/history/blobs inventory. Không cho arbitrary source version, không clean/repair/reset và không mặc định schema. Guard kiểm xong mới gọi Flyway trong test. Lưu baseline trước và assert old IDs/content/payload_hash giữ nguyên, cột mới null; fresh và upgrade của cùng profile phải cùng cấu trúc/checksums cuối.
- [ ] Chạy GREEN offline hai class mới. Fresh/upgrade mỗi lần một target/manifest riêng được chuẩn bị: root `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "NativeArchiveExceptionMigrationTest"`, chỉ sau khi env mode+manifest đã nạp private; yêu cầu có test thực chạy,0skip. Không dùng runner AR-00 để migrate.
- [ ] Sau migration fixture, cập nhật receipt target version mới rồi runner AR-00 selector `NativeCurrentProjectLifecycleIntegrationTest,NativeCurrentProjectLifecycleConcurrencyTest`. Không sửa manifest cũ in-place; bản mới liên kết receipt nâng cấp và giữ bản cũ.

**Done:** Contract được review, migration fresh/upgrade và native races đạt, U17/U18 có evidence backend. Nếu chỉ offline đạt thì chưa bàn giao như archive đã an toàn. Không áp migration main trong task này.

**Điều chỉnh migration/kiểm tra blocker sau tái phân tích:**

- [ ] Migration matrix phải gồm fresh core, fresh core+demo, upgrade core V33→V37 và upgrade local V34→V37. Release không cần migration demo V34 để lên core V37; không thêm V34 giả vào release, không đổi checksum cũ. Assertions bảo toàn dữ liệu phải kiểm cả project/file/Issue demo và cột snapshot mới null cho quyết định cũ.
- [ ] U26: lập fixture Bug Monkey trạng thái mở → xóa mềm; và Issue mở → archive Feature/ẩn file. `ProjectLifecycleService` hiện đếm work_items nonterminal không lọc context.deleted_at, trong khi board lọc deleted/archived và mutation bị chặn khi context archived. Tái hiện bằng test/HTTP trước khi kết luận mức ảnh hưởng; lưu ID blocker và đường xử lý còn khả dụng.
- [ ] Không tự bỏ mọi hidden/deleted Issue khỏi blocker hoặc mở rộng ngoại lệ ngoài cycles/retests. Nếu tái hiện bế tắc, đưa phương án rõ để chốt: xóa mềm có chấm dứt nghĩa vụ hay không; archive Feature/file phải chặn khi Issue còn mở hay cần lối khôi phục/đối soát. Đây là quyết định khác với ngoại lệ cycles/retests đã được duyệt; cập nhật contract/tests sau quyết định, tiếp tục phần độc lập.

## AR-07 — UI xác nhận ngoại lệ, retry và lịch sử

**Files:**

- Modify: `Frontend/src/app/features/admin/AdminProjectLifecycle.jsx`, `Frontend/src/app/services/api/admin.js` nếu cần chuyển DTO mới; không tạo endpoint song song.
- Test: `Frontend/src/app/features/admin/AdminProjectLifecycle.test.jsx`, `AdminProjectLifecycle.integration.test.jsx`.

**Interfaces:** Consumes readiness/Command/history AR-06 nguyên tên, không suy eligibility từ label. `adminApi.archiveProject(id,input)` gửi `legacyException:{acknowledged:true,snapshotFingerprint:readiness.legacyExceptionFingerprint}` chỉ khi người dùng đã chọn; lệnh thường bỏ object. Fingerprint nháp phía client gồm expectedVersion/reason/object để giữ đúng requestKey.

- [ ] Viết RED `requiresExplicitLegacyAcknowledgementAndReason`, `neverOffersExceptionForHardBlockers`, `uncertainRetryKeepsExactCommand`, `conflictRefreshClearsAcknowledgementButKeepsReason`, `historyShowsAcceptedLegacyCounts`. Payload assertion:

  ```js
  expect(archiveProject.mock.calls[1][1]).toEqual(archiveProject.mock.calls[0][1]);
  expect(checkbox).not.toBeChecked(); // sau refresh/snapshot409
  expect(reasonInput).toHaveValue(typedReason);
  ```

- [ ] Run RED tại Frontend: `rtk proxy npm test -- src/app/features/admin/AdminProjectLifecycle.test.jsx src/app/features/admin/AdminProjectLifecycle.integration.test.jsx --maxWorkers=2`.
- [ ] UI giữ danh sách blocker đầy đủ và phân biệt hai mục được xác nhận. Checkbox mặc định tắt, nhãn **“Tôi xác nhận lưu trữ dù còn đợt kiểm thử/yêu cầu kiểm thử lại thuộc luồng cũ; dữ liệu và lịch sử được giữ nguyên.”** Chỉ cho gửi khi canArchive thường hoặc exception eligible + checked + reason hợp lệ. Disabled có lý do đọc được bằng keyboard/mobile.
- [ ] Thay hướng dẫn không còn thực hiện được “vào màn đợt/retest cũ để hoàn tất” bằng giải thích thuộc luồng cũ và ngoại lệ ADMIN. Hard blockers vẫn có hướng dẫn phù hợp; nếu legacy type không có lối xử lý ghi cần đối soát, không tự bật waiver.
- [ ] Khi pending khóa submit/close phù hợp hiện trạng; timeout giữ nguyên command/key để retry. 409 giữ reason, fetch readiness, bỏ chọn acknowledgement; chỉ sau xác nhận mới tạo key mới. Không tự fetch fingerprint rồi ghép vào request cũ. 403/revocation đóng quyền thao tác nhưng giải thích kết quả, không báo success.
- [ ] Lịch sử hiện actor/time/reason và “Ngoại lệ tồn đọng luồng cũ”, code labels/count. Ordinary decisions không hiển thị ngoại lệ giả; text từ server được render an toàn.
- [ ] Run GREEN cùng lệnh, sau đó browser ADMIN/PM ở isolated U17/U18: chỉ legacy, thêm từng hard blocker, stale tab, retry response-loss, archive→reopen→replay cũ. Đối chiếu đúng one decision và child không thay đổi.

**Done:** UI opt-in đúng snapshot đã thấy; không mở rộng quyền, không dùng số lượng đơn thuần để xác nhận dữ liệu mới.

## AR-08 — Rules diễn đạt đúng phạm vi lịch sử

**Files:**

- Modify: `Frontend/src/app/features/projects/RulesPanel.jsx`, `Frontend/src/app/features/projects/settings.test.jsx`.
- Inspect/retain: `Frontend/src/app/features/projects/ProjectSettingsPage.jsx`, `Backend/src/main/java/vn/syp/tms/rules/RuleService.java`, `InternalRulePolicy.java`, `Backend/src/main/java/vn/syp/tms/workitem/FeatureIssueService.java`.
- Regression: `Backend/src/test/java/vn/syp/tms/rules/InternalRulePolicyTest.java`, `Backend/src/test/java/vn/syp/tms/hardening/SettingsReviewTest.java`, Feature Issue tests AR-03; update `docs/api/fixreports-contract.md` với note phạm vi.

**Interfaces:** Không đổi API/DTO/quyền/create/publish/version backend. Đổi copy tại UI để diễn tả trạng thái cấu hình lịch sử, không hứa enforcement trên Feature Issue. Policy mới/read-only retirement toàn API là scope riêng, **không** tự triển khai trong task này.

Copy thống nhất:

| Vị trí | Câu mới |
| --- | --- |
| Tiêu đề | `Quy tắc nội bộ của luồng cũ` |
| Giải thích | `Các phiên bản này lưu cấu hình của luồng báo lỗi cũ. Bug/QA trong Feature hiện tại không áp dụng bộ quy tắc này.` |
| Active version | `Phiên bản được công bố trong cấu hình cũ: …` |
| Form | `Thêm phiên bản cấu hình cũ` |
| Required-fields text | `Các trường dưới đây thuộc cấu trúc quy tắc cũ, không phải điều kiện để tạo Bug/QA trong Feature.` + danh sách cũ để người đọc hiểu dữ liệu |
| Publish confirm | `Công bố phiên bản {n} trong cấu hình cũ? Thao tác này không thay đổi quy tắc của Bug/QA trong Feature hiện tại.` |
| History active badge | `Bản công bố hiện tại của cấu hình cũ` |

- [ ] Viết RED cho `rulesExplainLegacyScopeForEmptyAndExistingSets`, `publishingLegacyVersionDoesNotPromiseFeatureEnforcement`: PM/Admin/reader, DEMO có dữ liệu/rỗng. Kiểm không còn “cho bug mới trong dự án”/“Đang áp dụng” không có phạm vi; reader không có create/publish; dialog copy đúng.
- [ ] Run tại Frontend `rtk proxy npm test -- src/app/features/projects/settings.test.jsx --maxWorkers=2`; chỉ sửa text/layout cần thiết, giữ requiredFields payload phù hợp `InternalRulePolicy` (không xóa buildId/deviceId ở client khiến backend422).
- [ ] Giữ expectedActiveVersionId khi publish; conflict409/quyền403 không báo thành công, history không mất. Không công bố rule trên main để thử. Kiểm source/contract không gọi RuleService từ FeatureIssueService; không thay đổi V1/V2 pin lịch sử hoặc hồi tố dữ liệu cũ.
- [ ] Root `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "InternalRulePolicyTest,FeatureIssueServiceTest"`; FE GREEN và browser U19 trên fixture, cả keyboard/error/history. `SettingsReviewTest` chỉ là nguồn assertion lịch sử để đối chiếu: đó là Testcontainers suite có legacy HTTP assumptions, không tính vào offline/current acceptance.

**Done:** UI trung thực về tác dụng của cấu hình; version history và quyền giữ nguyên; không lẫn sửa nhãn với thêm business policy.

## Handoff sang nghiệm thu

- [ ] AR-06 contract và migration receipt chuyển cho AR-07/AR-09/AR-10; source/schema trong receipt phải khớp.
- [ ] AR-06/07 defects liên quan hard blocker loại cũ ngoài allowlist vào G07, không lách bằng mở API legacy hoặc xóa dữ liệu.
- [ ] AR-08 copy/tests được đối chiếu cùng Feature Issue current tests; chức năng policy mới chỉ lập yêu cầu riêng nếu người dùng muốn.
- [ ] Ghi skill thực dùng (api-design/security-review/TDD/frontend-patterns) → hành động → command/assertion → bằng chứng. Đọc SKILL.md trước khi dùng, không tuyên bố đã triển khai theo bảng dự kiến.
- [ ] Không áp migration/restart main hay commit/push chỉ vì các tests isolated đạt.
