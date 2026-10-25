# Arena current workflow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chứng minh các vai trò phối hợp đúng trên luồng Feature hiện hành và khép các lỗi được tái hiện, với bằng chứng gắn cùng source/schema.

**Architecture:** Tái sử dụng service, React components và tests đang có. Thêm runner native có guard dùng chung cho các suite hiện hành; test nền không tạo server/reset/migrate. Task kiểm chứng có thể kết thúc bằng bằng chứng chức năng đã đúng, không bắt buộc sửa sản phẩm.

**Tech Stack:** React JavaScript/Vitest, Java/Spring Boot/JUnit, MySQL native/Flyway, Maven wrapper, Node/PowerShell.

**Spec:** [Kế hoạch chính và quyết định đã chốt](2026-10-25-arena-followup.md), [Arena a016](../../../.arena/run-20261024-131934-s399645/BAO-CAO-DANH-GIA.md), [C01–C14](../../planning/2026-10-19-fixreports-clarification.md), [U01–U26/G01–G07](../../planning/2026-10-25-arena-acceptance-matrix.md).

## Global Constraints

- Áp dụng toàn bộ Global Constraints của kế hoạch chính. Baseline tái phân tích `a45974a`; core hiện V33, local core+demo có V34; không dùng một số version để đại diện mọi profile/máy. Xác minh locations/version/checksum khi bắt đầu, migration archive dự kiến V37.
- “Người dùng xác nhận chỉ giữ Bug/QA trên toàn hệ thống”; không khôi phục retired writes hoặc thêm run/session/device gate vào Feature.
- Status `Unexecuted → OK → NG → P → NA → Unexecuted`; `[U,U,OK,P,NA]` = `3/5 = 60%`, 0 case = 0%; Unexecuted `#C0C0C0`/text `#333333`.
- PM được cấp chỉ tạo TESTER; ADMIN không được bỏ qua version. AI đọc không mở quyền CRUD/report ngoài project.
- Không tự commit/push/merge/deploy; không chạy lên `tms`, không dùng credential trong argument/log. Không chạy test có reset/delete-all vào database dùng chung.
- Test hiện có GREEN ngay là `CONFIRMED_EXISTING`. Chỉ sửa sản phẩm sau test RED tái hiện lỗi; lưu failing assertion, không suy lỗi từ mô tả Arena cũ.

## Review Focus

1. Reauth sau thu quyền giữ quyền/form trái phép — AR-01 `removesDelegatedDraftAfterReauthWithoutGrant`.
2. Cùng file ở hai Feature, filter/page làm sai export/progress — AR-02 `independentCopiesAndAllRowsExport`.
3. Mất phản hồi hoặc stale version làm ghi trùng — AR-02/03 request replay và AR-04 report draft tests.
4. AI lộ dữ liệu hoặc ghi đè nội dung người dùng — AR-04 permission-before-retrieval/concurrent-draft tests.
5. Test target/backup sai và toàn suite SKIP vẫn xanh — AR-00 fail-before-connect/nonzero-count; AR-09 metadata/blob hashes.

## AR-00 — Baseline và runner kiểm thử native hiện hành

**Files:**

- Create: `scripts/Test-CurrentWorkflowNative.cjs`, `scripts/Test-CurrentWorkflowNative.test.cjs` — CLI/guard/receipt; không provision/reset.
- Create: `Backend/src/test/java/vn/syp/tms/support/CurrentWorkflowDatabaseGuard.java`, `CurrentWorkflowDatabaseGuardTest.java` cùng thư mục — bảo vệ cả khi gọi Maven trực tiếp.
- Modify: `Backend/src/test/java/vn/syp/tms/testcase/FeatureIntegrationTest.java`, `NativeFeatureIssueIntegrationTest.java`, `ManagementReportIntegrationTest.java`, `NativeProjectNotesIntegrationTest.java` cùng thư mục — gọi guard chung thay target cứng; giữ fixture riêng của từng suite.
- Reuse read-only: `scripts/database/mysql-client.cjs` (`parseConfig`, `query`). Không tái dùng selector rộng của `Test-AdminNative.cjs` hoặc mode V21/V29/V30 của `Test-FileWorkQaNative.cjs`.
- Create on execution: `var/arena-followup/<run-id>/baseline.json`, `target.json`, `receipt.json` trong thư mục bằng chứng riêng; dữ liệu local không tự stage lên Git.

**Interfaces:**

- CLI mới: `node scripts/Test-CurrentWorkflowNative.cjs --mode integration --manifest <path> --manifest-sha256 <digest> --tests <classes> --evidence-dir <new-path> [--check-only]`. Mọi argument trừ `--check-only` bắt buộc; không default schema, wildcard, seed, live, reset hay migration mode.
- Node exports: `parseArgs(args)`, `readTargetManifest(filePath, expectedSha256)`, `testPlan(mode, selectors)`, `testConfiguration(config, manifest)`, `run(args, io = {})`; I/O injectable cho negative tests không cần DB.
- Java: `CurrentWorkflowDatabaseGuard.configure(DynamicPropertyRegistry registry)`; kiểm manifest/target/storage trước Spring context, đăng ký datasource/storage đã kiểm, tắt auto-migration/seed/AI/Redmine/jobs có cấu hình tắt. `EvidenceStartupCleanup` vẫn chạy theo ApplicationReadyEvent, nên database cô lập **bắt buộc đi cùng storage cô lập**, không được chỉ dựa vào tắt cron.
- Manifest v1: `{formatVersion:1,purpose:"CURRENT_WORKFLOW_NATIVE",target:{host,port,schema,serverUuid,flywayVersion,migrationLocations},provenance:{receiptPath,receiptSha256}}`. Không chứa credential. Receipt provenance phải xác nhận đúng target cô lập đã được chuẩn bị, không tự viết giấy xác nhận cho database chưa biết nguồn.
- `host` chỉ `127.0.0.1`/`localhost`; port nguyên 1–65535; schema `^tms_docstest_[a-f0-9]{12}$`, khác `tms` và schema ứng dụng trong config. Server UUID/schema/version/checksums phải khớp receipt; locations chỉ core hoặc core+demo đúng provenance.
- Initial allowlist đúng sáu class: `FeatureIntegrationTest,FeatureLegacyRetirementIntegrationTest,FeatureAiIntegrationTest,NativeFeatureIssueIntegrationTest,ManagementReportIntegrationTest,NativeProjectNotesIntegrationTest`. Các class mới AR-01/05/06 chỉ thêm sau khi guard/fixture của chúng đã review. Không đưa `SystemJourneyTest`, `AdminWorkspaceNativeTest`, seed hoặc historical migration vào runner này.
- Child env bắt buộc `TMS_CURRENT_WORKFLOW_MODE=integration`, `TMS_CURRENT_WORKFLOW_MANIFEST`, `TMS_CURRENT_WORKFLOW_MANIFEST_SHA256`, `TMS_TEST_FEATURE_MODE=integration`; URL dựng canonical từ manifest, credential nạp private. Gỡ opt-in seed/migration/live kế thừa. Java không fallback target cứng khi thiếu manifest.
- Storage: runner tạo run-dir mới và thư mục con `attachments` rỗng, ghi ownership receipt; truyền absolute `TMS_CURRENT_WORKFLOW_EVIDENCE_DIR` và `TMS_ATTACHMENT_ROOT`. Java đối chiếu receipt/canonical paths và override attachment root trong DynamicPropertyRegistry trước Spring. Từ chối shared/app storage, thư mục đã dùng, symlink/junction/reparse point thoát run-dir; không chấp nhận attachment root kế thừa từ môi trường. Runner không xóa root sau test. Restore AR-09 dùng cặp DB/storage riêng có provenance, không trỏ vào storage của ứng dụng.

- [ ] Ghi HEAD/dirty diff/source hash/migration list, schema mục tiêu đã biết quyền sở hữu và checksum fixture. `git status` bẩn không cho phép reset; tách phần có sẵn trong manifest.
- [ ] Viết Node/Java guard tests: `rejectsUnsafeTargetBeforeConnect`, `rejectsManifestOrProvenanceMismatch`, `rejectsUnexpectedMigrationAndUnknownSelector`, `rejectsDirectMavenWithoutManifest`, `failsWhenSelectedSuitesOnlySkip`, `ignoresInheritedApplicationAttachmentRoot`, `rejectsSharedOrEscapingAttachmentRoot`. Storage tests phải chứng minh registered root là thư mục run sở hữu riêng và sentinel ở app storage không bị đọc/xóa; không khởi động Spring với root không an toàn. Assertion chính:

  ```js
  assert.equal(io.mysqlCalls.length, 0); // malformed target/provenance/selector
  assert.equal(io.mavenCalls.length, 0);
  assert.equal(result.ok, false); // selected suite tests=0 or skipped>0
  ```

  Với target/version sai phát hiện qua SELECT, cho phép read-only SELECT nhưng phải `mavenCalls=0`, không mutation. Có positive fixture giả lập khớp hoàn toàn, chỉ spawn đúng classes và env được kiểm soát.
- [ ] Chạy RED: root `rtk proxy node --test scripts/Test-CurrentWorkflowNative.test.cjs`; root `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "CurrentWorkflowDatabaseGuardTest"`. Trước implementation phải fail vì guard/runner chưa tồn tại, không vì thiếu credential.
- [ ] Implement interfaces trên. Java thực hiện Flyway **validate + pending check**, không migrate/repair/baseline/clean; require đúng version/checksums và không pending. Sau validate đặt `spring.flyway.enabled=false`, Hibernate `ddl-auto=validate`, tắt SQL/session initialization và jobs. Không cho integration test tự nâng V33/V34→V37 khi AR-06 thêm migration.
- [ ] Port bốn dynamic-property guards; hai Feature subclasses kế thừa guard qua parent. Ghi số test thực chạy, không gọi các inherited executions là các scenario độc lập.
- [ ] Chạy GREEN hai lệnh guard ở trên. Sau đó `--check-only` với manifest đã review: chỉ đọc DB, không Maven/fixture; ghi rõ validate Java chưa chạy nếu chỉ preflight Node.
- [ ] Chạy một suite allowlist bằng command template dưới; yêu cầu tests>0, failures=0, errors=0, skipped=0 cho **từng suite được chọn**, receipt gắn source/schema. Nếu thiếu target an toàn, đánh dấu native BLOCKED, vẫn hoàn thành offline guard, không tự tạo server/schema.

**Command template dùng lại trong các task:**

```powershell
rtk proxy node scripts/Test-CurrentWorkflowNative.cjs --mode integration --manifest <reviewed-target.json> --manifest-sha256 <SHA256-cua-file-target> --tests FeatureIntegrationTest --evidence-dir <thu-muc-receipt-moi> --check-only
rtk proxy node scripts/Test-CurrentWorkflowNative.cjs --mode integration --manifest <reviewed-target.json> --manifest-sha256 <SHA256-cua-file-target> --tests FeatureIntegrationTest --evidence-dir <thu-muc-receipt-moi-khac>
```

Các giá trị trong `<...>` lấy từ receipt AR-00, **không chạy nguyên placeholder**. Mỗi lần dùng thư mục mới; runner không xóa fixture. Migration/fresh/upgrade và browser fixture có quy trình riêng AR-06/09/10, không thêm quyền ghi đó vào runner chung.

**Done:** U01 có bằng chứng offline + positive native hoặc native được ghi BLOCKED cụ thể; chỉ khi native đạt mới mở các gate native phụ thuộc. Checklist hoàn tất task không được che BLOCKED.

**Bổ sung sau pull:** kiểm tra guard/fixture đã có trong `UserProfileNativeTest`, `NativeCurrentDemoMigrationTest` trước khi xây mới. Tái sử dụng assertion/quy trình phù hợp, không copy nguyên test có auto-migration/storage không phù hợp vào runner. AR-00 phải ghi rõ bước provision target rỗng trên MySQL native hiện có và receipt đầu vào của guard; có quyền chuẩn bị target cô lập từ tác vụ trước không cần hỏi lại, nhưng không coi schema cũ có dữ liệu là disposable. Nếu chưa có target an toàn, native vẫn NOT_RUN/BLOCKED, không đánh DONE toàn AR-00. Nên tách output build/test khỏi `Backend/target` đang được Java language server dùng để tránh bytecode/metadata bị ghi đồng thời; receipt ghi đúng nguồn, JDK và artifact.

## AR-01 — Xác nhận đường PM tạo TESTER và thu quyền

**Files:**

- Existing product, chỉ sửa nếu tái hiện lỗi: `Frontend/src/app/features/auth/AccountMenu.jsx`, `Frontend/src/app/features/admin/UserCreateDialog.jsx`, `Backend/src/main/java/vn/syp/tms/identity/IdentityService.java`, `Backend/src/main/java/vn/syp/tms/identity/SessionAccountFilter.java`.
- Test: `Frontend/src/app/features/auth/account-create-tester.test.jsx`, `Frontend/src/app/features/auth/auth.test.jsx`, `Backend/src/test/java/vn/syp/tms/identity/IdentityIntegrationTest.java`, `IdentityPolicyTest.java`, `SessionAccountFilterTest.java` cùng thư mục identity.
- Create nếu cần native bằng chứng cùng môi trường: `Backend/src/test/java/vn/syp/tms/identity/NativeDelegatedIdentityIntegrationTest.java`; fixture có UUID/owned IDs, dùng guard AR-00, không copy cleanup DELETE-all từ Testcontainers class.

**Interfaces:** Giữ `adminApi.createUser(input)` → `POST /api/v1/users`; `testerOnly` cố định TESTER; server reread quyền hiện hành. Không thêm API/form/quyền mới. Input/output/account-session contract hiện hành là authority.

- [ ] Chạy tests có sẵn để phân biệt already-correct và regression; ghi đường `Header → AccountMenu → UserCreateDialog` ngoài `/admin`.
- [ ] Bổ sung `removes a delegated Tester creation draft after the same PM reauthenticates without the grant` vào `auth.test.jsx`: mở form có nháp, session401, login cùng ID nhưng chỉ `profile:read`, kiểm không còn entry/dialog, `createUser` không bị gọi lại. Giữ test reauth cùng PM **còn grant** phải giữ nháp.
- [ ] Bổ sung HTTP role `DEV` vào test PM chỉ tạo TESTER; kiểm ADMIN/PM/DEV403, TESTER201, username normalize/duplicate409, old session sau revoke401 rồi reauth không grant403. Assertions: userCount/auditCount chỉ tăng một lần trên create hợp lệ, rejected calls không tăng; CSRF sai bị chặn. Với ca revoke, cho revoke commit trước server kiểm quyền create. Request đã được kiểm quyền trước revoke có thể hoàn tất; ghi timeline/read-back, không đặt yêu cầu rollback mới hoặc đánh dấu lỗi chỉ vì UI còn pending lúc thu quyền.
- [ ] Chạy frontend từ `Frontend`: `rtk proxy npm test -- src/app/features/auth/account-create-tester.test.jsx src/app/features/auth/auth.test.jsx src/app/features/admin/admin.test.jsx --maxWorkers=2`. Root: `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "IdentityPolicyTest,SessionAccountFilterTest"`. Nếu test mới GREEN ngay ghi `CONFIRMED_EXISTING`; nếu RED sửa tối thiểu ở các file sở hữu rồi chạy lại.
- [ ] Native class mới dùng login/grant/create/revoke endpoints với fixture synthetic, explicit allowlist AR-00. Không chạy `IdentityIntegrationTest` trên native: đó là suite Testcontainers có cleanup rộng. Chỉ chạy Testcontainers khi môi trường riêng phù hợp đã có; Docker không là điều kiện chạy ứng dụng.
- [ ] Browser hai phiên ADMIN/PM, U02/U03: grant→relogin, entry ngoài admin, pending/double click/duplicate/error focus, revoke→reauth, không tạo membership. Lưu API IDs và count, không chụp mật khẩu.

**Done:** U02/U03 cả FE/native/browser có receipt; không lặp implementation F6. Native/browser chưa chạy thì giữ task IN_REVIEW.

### AR-01 bổ sung — thành viên và hồ sơ tài khoản đã có (U23/U24)

**Files:** `Frontend/src/app/features/projects/MemberPicker.jsx`, `ProjectMembers.jsx`, `ProjectSettingsPage.jsx`; `Frontend/src/app/features/admin/AdminProjectDetail.jsx`, `UserEditDialog.jsx`, `UserPasswordResetDialog.jsx`; `Backend/src/main/java/vn/syp/tms/admin/AdminProjectService.java`, `ProjectMemberCandidateController.java`; `Backend/src/main/java/vn/syp/tms/project/ProjectService.java`; `Backend/src/main/java/vn/syp/tms/identity/IdentityService.java`.

- [ ] Đối chiếu tests đã có: `admin-role-compatibility.test.jsx`, `fixreports-members.test.jsx`, `settings.test.jsx`, `admin-user-profile.test.jsx`, `admin-self-account-update.test.jsx`, `account-updated.test.jsx`, `UserProfileNativeTest`, `IdentityProfileControllerTest`, `IdentityUpdatePolicyTest`. Chạy những test đã có trước; không tạo tính năng hoặc RED giả để làm lại `bf3971c`/`9b39f0d`.
- [ ] U23: danh sách loại active member của đúng dự án **trước count/pagination**, người ở dự án khác vẫn có thể thêm; PM chỉ DEV/TESTER, Admin mọi nhóm; API/UI không đổi role; ADMIN làm PM vẫn `role_code=ADMIN`. Phân biệt quyền tạo TESTER với thêm tài khoản hiện có, không yêu cầu grant `users:create` cho thao tác thêm thành viên.
- [ ] Kiểm hai người thêm cùng tài khoản; lỗi lưu một phần giữ những lựa chọn chưa thành công; active replay không ghi audit trùng; membership cũ inactive giữ role đã lưu. Bổ sung ca inactive legacy role khác role mặc định: danh sách/lookup/save phải giải thích nhất quán, không hiện chọn được rồi lỗi im lặng và không tự sửa lịch sử.
- [ ] U24: đổi username/displayName/reset password qua Admin giữ identity ID, memberships, tác giả lịch sử; hết hiệu lực phiên cũ, kiểm self-edit/reauth và nháp. Chỉ tạo fixture disposable để thử mật khẩu; không reset tài khoản dùng thật.
- [ ] Kiểm icon/nút cuối bảng từ `a45974a`: tên truy cập, hit target, keyboard, pending/error/footerAction; không phục hồi dropdown role bị xóa chỉ để khớp test cũ.

**Interfaces:** giữ endpoint/DTO đã triển khai, không thêm endpoint identity/member mới. Native suite profile có guard khác; giữ runner riêng đã review hoặc port sang guard AR-00 có kiểm storage/migration trước khi đưa vào allowlist. PASS trong báo cáo 37 backend/1.221 frontend cũ là bằng chứng nền, không đánh U23/U24 PASS trên baseline mới.

## AR-02 — Feature, file, phân công, Status và XLSX

**Files:**

- Test: `Backend/src/test/java/vn/syp/tms/testcase/FeatureIntegrationTest.java`, `CustomerWorkbookTest.java`, `DocumentWorkbookTest.java`, `TestCaseWorkbookTest.java`; `Backend/src/test/java/vn/syp/tms/reporting/FeatureProgressContractTest.java`.
- Test: `Frontend/src/app/features/testing/TestingFeaturesPage.test.jsx`, `TestingFeaturePage.test.jsx`, `TestingDocumentPage.test.jsx`, `DocumentAssignments.test.jsx`.
- Product owners nếu RED: `Backend/src/main/java/vn/syp/tms/feature/FeatureService.java`, `Backend/src/main/java/vn/syp/tms/testcase/TestDocumentController.java`, `Frontend/src/app/features/testing/TestingDocumentPage.jsx`, `TestingFeaturesPage.jsx`, `DocumentAssignments.jsx`, `testingState.js` cùng thư mục.

**Interfaces:** Dùng Feature CRUD/import-preview/import-commit/assignment ở `FeatureController`; document Status/history/original/current export ở `TestDocumentController`. Giữ expectedVersion/requestKey hiện có. Fixture output cho AR-03/04: projectA/B, featureA/B, documentA/B, row IDs, owned tester IDs, original SHA-256, expected Status counts; không dùng tên file làm identity.

- [ ] Tạo fixture qua API hiện hành với hai Feature import cùng workbook; ghi owned IDs riêng để các ca đọc lại đúng bản. Không dùng seed SPIDER-PLUS single-use hoặc dữ liệu main.
- [ ] Bổ sung các assertion chưa được cover vào tests hiện có: `independentCopiesAndAllRowsExport`, `competingSelfClaimsHaveOneWinner`, `failedAssignmentBatchWritesNothing`, `statusReplayKeepsActualActorAndVersion`. Kiểm 2 connection thật khi race, không thay bằng tuần tự/mock.

  ```java
  assertEquals(3, tested); assertEquals(5, total); assertEquals(60, percent);
  assertEquals(originalSha256, downloadedOriginalSha256);
  assertEquals(allSavedRowIds, exportedRowIds); // bất kể filter/page UI
  assertEquals(beforeOtherFeature, afterOtherFeature);
  assertEquals(1, successfulClaims); assertEquals(1, conflictClaims);
  ```

- [ ] Kiểm date filters theo boundary timezone hiện có, invalid range giữ dữ liệu; phân trang sau archive/delete không mắc trang rỗng. Giữ field/name/requirement hiện hành, không thêm field Feature.
- [ ] Chạy focused FE từ `Frontend`: `rtk proxy npm test -- src/app/features/testing --maxWorkers=2`. Root offline: `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "FeatureProgressContractTest,CustomerWorkbookTest,DocumentWorkbookTest,TestCaseWorkbookTest"`.
- [ ] Chạy runner AR-00 với selector `FeatureIntegrationTest`; bổ sung test rồi nếu RED mới sửa owner. Test preview lỗi phải chứng minh **không commit**; retry cùng request không nhân document/history. Kiểm version/403/cross-project/archived và mất phản hồi sau commit: tải lại không tự ghi lần nữa.
- [ ] Browser U04–09/U12: vòng Status, tự nhận/giao lại, first/latest không bịa actor, Issue keyboard/touch context, export/download thật. Lưu file hash và parse workbook; filename/download event không đủ chứng minh nội dung.

**Done:** U04–09/U12 đúng cả phạm vi và dữ liệu; không thêm run, không đổi source workbook, không hồi quy Unexecuted xám bạc.

## AR-03 — Bug/QA hiện hành và ranh giới legacy

**Files:**

- Test: `Backend/src/test/java/vn/syp/tms/testcase/NativeFeatureIssueIntegrationTest.java`, `FeatureLegacyRetirementIntegrationTest.java`; `Backend/src/test/java/vn/syp/tms/workitem/FeatureIssueServiceTest.java`.
- Test: `Frontend/src/app/features/work-items/FeatureIssueDetail.test.jsx`, `FeatureIssuesPage.test.jsx`, `FeatureIssueForm.test.jsx`; `Frontend/src/app/routes/fixreports-navigation.test.jsx`.
- Product owners: `Backend/src/main/java/vn/syp/tms/workitem/FeatureIssueService.java`, `FeatureIssueLegacyWrites.java`; `Backend/src/main/java/vn/syp/tms/feature/LegacyTestingWrites.java`; `Frontend/src/app/features/work-items/FeatureIssueDetail.jsx`, `FeatureIssuesPage.jsx`; `Frontend/src/app/routes/AppRouter.jsx`.

**Interfaces:** `GET /api/v1/projects/{projectId}/issues/{id}` trả `canTransition`, `allowedStatuses`, `canComment`; `PUT .../{id}/status` dùng `{status,reason,expectedVersion}`, comment dùng version/requestKey hiện hành. Không thêm answer/confirm/coverage API. Consumes row IDs AR-02; produces issue IDs/comment-history counts cho AR-04.

- [ ] Mở rộng `qaManualStatusAndVersionedCommentsHaveNoLegacyAnswerGate`: PM tạo QA/giao DEV, DEV chuyển trạng thái được phép/comment, PM đóng đúng allowedStatuses/reason. Tester không được tăng quyền vì là creator; unassigned DEV/cross-project/archived/stale bị chặn. Không tự bịa thêm trạng thái từ nhãn UI.
- [ ] Bổ sung `legacyMutationsRemainGoneWithoutWrites`: `/qa/**`, `/work-items/**`, run/retest/file-work old writes410, không thêm bản ghi/audit/mutation. Giữ GET lịch sử đúng quyền; không biến mọi old GET thành200 để chiều tests cũ.
- [ ] Kiểm linked issue badge gồm closed, copy Feature B không bị ảnh hưởng, case-linked delete bị chặn, Monkey delete là soft-delete theo quyền; replay comment không duplicate; conflict giữ reason/comment và chỉ reload rõ ràng.
- [ ] Run FE: `rtk proxy npm test -- src/app/features/work-items/FeatureIssue src/app/routes/fixreports-navigation.test.jsx --maxWorkers=2` tại Frontend. Root offline `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "FeatureIssueServiceTest"`; native selector `NativeFeatureIssueIntegrationTest,FeatureLegacyRetirementIntegrationTest` theo AR-00.
- [ ] Chỉ sửa nếu RED; giữ UI dùng capability server, không thêm hướng dẫn F7 cũ “PM chờ Admin confirm answer”. Browser U10/U11/U20 và nhận xét của người dùng phải phân biệt QA manual hiện tại với lịch sử QA cũ.

**Done:** Luồng mới hoàn tất theo quyền, API nghỉ vẫn nghỉ, không đưa TASK/REQUEST/IMPROVEMENT trở lại board.

## AR-04 — Báo cáo Markdown, scope và AI

**Files:**

- Product: `Backend/src/main/java/vn/syp/tms/reporting/ManagementReportService.java`, `Backend/src/main/java/vn/syp/tms/ai/AiManagementReportGenerator.java`; `Frontend/src/app/features/reports/ManagementAnalysisPage.jsx`, `Frontend/src/app/features/ai/AiChat.jsx`.
- Test: `Backend/src/test/java/vn/syp/tms/testcase/ManagementReportIntegrationTest.java`, `FeatureAiIntegrationTest.java`; `Backend/src/test/java/vn/syp/tms/reporting/ManagementReportServiceTest.java`; `Backend/src/test/java/vn/syp/tms/ai/AiManagementReportGeneratorTest.java`, `AiManagementReportTextTest.java`.
- Test: `Frontend/src/app/features/reports/ManagementAnalysisPage.ai.test.jsx`, `ManagementAnalysisPage.providers.test.jsx`, các test `ManagementAnalysisPage*.test.jsx` hiện có; `Frontend/src/app/features/ai/AiChat.test.jsx`.

**Interfaces:** Consumes fixture totals/issue IDs AR-02/03. Management report CRUD/version/download giữ nguyên text; generator chỉ trả preview Markdown, không save/source mutation. AI project/Feature/all scope phải enforce trước retrieval; PM AI global read không vượt report CRUD scope.

- [ ] Kiểm/bổ sung `savedMarkdownIsVerbatimAndDoesNotChangeSource`, `staleReportSaveKeepsDraft`, `featureFilterKeepsFullSelectorCatalog`, `lateAiResponseNeverOverwritesManualDraft`, `reportPermissionIsNotAiGlobalPermission`.

  ```js
  expect(editor).toHaveValue(userEditedMarkdown);
  expect(saveReport).not.toHaveBeenCalled(); // chỉ bấm tạo gợi ý
  expect(summary.issueCount).toBe(10); // report text sửa thành “8”
  expect(featureOptions.map(x => x.id)).toEqual([featureAId, featureBId]);
  ```

- [ ] Kiểm fixture3/5, scope Feature A/toàn dự án, labels/bảng/chart cùng scope hoặc ghi rõ bảng so sánh toàn dự án. Không lấy danh mục dropdown từ bảng đã lọc. Empty/0%, partial API failure/403/409 và pending không mất nháp.
- [ ] Kiểm AI plain text/multipart, toolcall/refusal/incomplete, provider402/timeout, fallback manual save; không hạ validation chung của các tác vụ AI khác. TTL draft không xóa report đã lưu. Preset một click một request, IME/Shift+Enter và chat private không rò.
- [ ] Run FE: `rtk proxy npm test -- src/app/features/reports/ManagementAnalysisPage src/app/features/ai/AiChat.test.jsx --maxWorkers=2`; root offline `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "ManagementReportServiceTest,AiManagementReportGeneratorTest,AiManagementReportTextTest"`; runner native `ManagementReportIntegrationTest,FeatureAiIntegrationTest`.
- [ ] U13–15 browser: AI result điền editor → sửa text → lưu → reopen → download đúng text, số liệu nguồn không đổi. Live provider là lớp riêng: synthetic trước, chỉ dùng dữ liệu đã được phép; thiếu provider/hạn mức ghi BLOCKED, không báo mock PASS là live PASS. Không đổi provider/model/key do task kế hoạch.

**Done:** Text AI lưu như text người dùng, scoped reports nhất quán; không claim mọi nội dung AI đúng ngữ nghĩa/ngày giờ chỉ vì schema/text hợp lệ.

### AR-04 bổ sung — timeout và cấu hình hai máy (U25)

Nhánh chẩn đoán này không phụ thuộc fixture AR-02/03. Lượt kiểm tra trước tái phân tích: thread11 thất bại sau30,0542s; GET models200; probe synthetic tối thiểu cũng timeout30,013s; người dùng báo cả hai máy. Đây là lỗi quan sát được của lời gọi inference, chưa xác định nhà cung cấp quá tải, mạng hay cơ chế timeout là nguyên nhân gốc.

**Owners:** `OpenAiConfiguration.java`, `OpenAiResponsesClient.java`, `AiChatService.java`, `AiChatStore.java` trong package ai; `Frontend/src/app/features/ai/aiErrors.js`, `AiChat.jsx`; `Frontend/src/app/services/api/ai.js`; `scripts/local-ai/LocalAi.ps1`; `docs/operations/caheo-new-machine.md`.

- [ ] Viết test phân biệt request timeout/transport timeout với HTTP408/5xx, auth401/403, payment402 và lỗi schema. Chốt mapping contract `AI_TIMEOUT` riêng cho hết hạn local; cập nhật safe-code allowlist và UI nếu mapping mới được triển khai, không log raw provider response/key/prompt. Timeout test dùng local stub; không phụ thuộc Caheo để test xanh.
- [ ] Test `timeoutKeepsUserMessageAndAllowsExplicitRetry`, `oneClickDoesNotRetryProviderAutomatically`, `lateResponseCannotOverwriteNewThreadOrManualDraft`. UI nói đúng hết thời gian chờ, giữ lịch sử và không tạo thêm request tính phí ngầm.
- [ ] Hiện backend giới hạn30s, frontend35s, turn quá2phút bị interrupted. Nếu muốn tăng timeout, trước hết đo synthetic có giới hạn và được phép; sau đó thiết kế đồng bộ ba giới hạn cùng probe/request cancellation. Không chỉ sửa env thành60/90 vì `OpenAiConfiguration` hiện từ chối >30; không tự chốt timeout mới hoặc chuyển model.
- [ ] Đối chiếu profile/config precedence từng máy: process/Windows User/file, file path theo working directory; local profile đã import `.env.mysql.local`. Metadata available chỉ kiểm cấu hình, không chứng minh inference hoạt động. Tạo hội thoại mới khi đổi model, giữ thread cũ.
- [ ] Run focused: frontend `rtk proxy npm test -- src/app/features/ai/AiChat.test.jsx src/app/services/api/ai.test.js --maxWorkers=2`; backend selector `OpenAiResponsesClientTest,OpenAiEndpointConfigurationTest,AiChatServiceTest` qua Test-Backend. Bổ sung đúng test mới cho error mapping/config. Live receipt tách riêng theo thời điểm/host/provider/model/duration, không gửi dữ liệu dự án để chẩn đoán kết nối.

**Done riêng:** phần lỗi/UX có thể FIXED với deterministic tests; provider live chỉ PASS khi có phản hồi thật. Nếu provider vẫn timeout thì giữ FAILED/BLOCKED ở live và hướng dẫn tiếp tục báo cáo thủ công, không tuyên bố AI hoàn tất.

## AR-05 — Sổ tay revision và concurrency

**Files:**

- Product owners: `Backend/src/main/java/vn/syp/tms/handbook/HandbookService.java`, `Frontend/src/app/features/projects/HandbookPanel.jsx`.
- Test: `Frontend/src/app/features/projects/settings.test.jsx`, `Frontend/src/app/features/projects/handbook-editor-focus.test.jsx`. Đọc các assertion còn phù hợp trong `Backend/src/test/java/vn/syp/tms/hardening/SettingsReviewTest.java` để port; đây là suite Testcontainers có cả legacy assumptions, không phải offline/native current command.
- Create: `Backend/src/test/java/vn/syp/tms/handbook/NativeHandbookRevisionIntegrationTest.java` nếu chưa có current native scenario, guard AR-00 + fixture owned IDs.

**Interfaces:** Giữ `expectedCurrentRevisionId`, plain text content, append revision/history hiện hành. Không thêm workflow duyệt hoặc editor rich text; giữ old history.

- [ ] Viết/đối chiếu test `twoEditorsPreserveWinningRevisionAndLosingDraft`: hai tab rev1, A→rev2, B409; count/history vẫn2, B vẫn nháp; chỉ sau reload chủ động + submit mới có rev3. `assertEquals(2, revisionCountAfterConflict)`; `assertEquals(revision2Text, currentText)`.
- [ ] Kiểm TESTER read/no write, PM membership revoked giữa mở/lưu, project archived giữ history/no append; `<script>`/HTML hiển thị text, không render active HTML. Không xóa nháp đang nhập chỉ do một lần load lỗi.
- [ ] Run FE: `rtk proxy npm test -- src/app/features/projects/settings.test.jsx src/app/features/projects/handbook-editor-focus.test.jsx --maxWorkers=2`. Native class mới chỉ thêm allowlist sau guard review, chạy bằng AR-00. Không gọi `SettingsReviewTest` là offline; không chạy cả legacy HTTP suite rồi mở lại retired endpoint để đạt xanh.
- [ ] Nếu GREEN ghi xác nhận code sẵn có; nếu RED sửa minimal owner và rerun. Browser U16 mở hai tab đúng revision, screenshot conflict/focus và IDs revision/native readback.

**Done:** U16 có concurrency native/browser, không đồng nhất mock revision test với transaction thật.

## AR-09 — Bảo toàn lịch sử và restore evidence

**Files:**

- Inspect/preserve: `Backend/src/main/java/vn/syp/tms/attachment/EvidenceService.java`, `EvidenceController.java`; legacy protection files AR-03.
- Test: `Backend/src/test/java/vn/syp/tms/attachment/QaEvidenceTest.java`, `EvidenceContentTest.java`; `Backend/src/test/java/vn/syp/tms/testcase/FeatureLegacyRetirementIntegrationTest.java`.
- Create: `docs/reviews/2026-10-25-arena-restore-receipt.md` khi thực thi; inventory/hash/DB receipts local trong run-dir. Dùng quy trình backup hiện có sau khi đọc `docs/database/mysql-workbench.md`; không sáng tạo lệnh destructive.

**Interfaces:** GET/download evidence lịch sử vẫn theo quyền. Legacy POST/DELETE410. Restore receipt liên kết snapshot DB, storage root/inventory, target/server/schema và artifact hashes; không tạo chức năng upload mới ở Feature Issue.

- [ ] Lập danh sách endpoint lịch sử còn đọc và endpoint nghỉ410; inventory số dòng/ID/FK + blobs/hashes của fixture synthetic sở hữu riêng, bao gồm rule versions/pins, old cycles/retests/decisions và artifacts. Không copy dữ liệu main khi chưa có phạm vi/đích được phép.
- [ ] Kiểm evidence read role/project, original bytes, missing storage503, tải lỗi không giả success; legacy upload/delete410 không thêm metadata/file. Dùng unit tests hiện có để giữ bảo vệ file đang được dùng; không gọi API cũ ghi để dựng current UAT.
- [ ] Run root `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "QaEvidenceTest,EvidenceContentTest"`; native retirement suite AR-00. Nếu cần fixture dữ liệu lịch sử, import **snapshot fixture đã review** vào target cô lập rỗng, không mở lại retired endpoint.
- [ ] Chuẩn bị hai target cô lập (source snapshot/restore destination) **mỗi target có storage root riêng** và provenance, dừng writer fixture khi chụp đồng bộ DB+blob. Xác minh absolute destination và mọi junction/symlink nằm đúng thư mục/schema được chỉ định trước copy/restore; không ghi đè backup cũ, không restore đè ứng dụng đang dùng. Trước khi khởi động backend đọc bản restore, đối chiếu metadata/blobs đủ rồi override `TMS_ATTACHMENT_ROOT` về root restore sở hữu riêng; startup cleanup không được trỏ storage thật.
- [ ] Chạy restore bằng công cụ hiện có được review, ghi command đã làm sạch secret; đối chiếu `sourceRowIds == restoredRowIds`, FK orphan0, `sourceBlobSha256 == restoredBlobSha256`, original XLSX/decision/rule/history hashes giữ nguyên. Missing blob là FAIL ngay cả DB restore thành công.
- [ ] Đo thời gian/khối lượng thực tế nhưng không kết luận đạt RPO/RTO khi G05 chưa có ngưỡng. Restore thật chưa chạy thì U21 BLOCKED/NOT_RUN; không thay bằng báo cáo “backup tạo thành công”.

**Done:** U20/U21 có bằng chứng đúng phạm vi; legacy read/protection giữ, không vô tình phục hồi workflow cũ.

## AR-10 — Regression và browser toàn chuỗi trên baseline cuối

**Files:**

- Update receipts: `docs/planning/2026-10-25-arena-acceptance-matrix.md`, create `docs/reviews/2026-10-25-arena-followup.md`.
- Read fixtures: `Backend/src/test/java/vn/syp/tms/testcase/FixReportsBrowserFixtureTest.java` và manifest liên quan; **không rerun** nếu target/manifest đã dùng.
- Product sửa lỗi chỉ theo owner AR-01–09; không refactor ngoài phạm vi.

**Interfaces:** Consumes task receipts, schema cuối sau AR-06 và một baseline code cuối. Produces action inventory `{route,role,control,state,expected,actual,evidence,status}`, manifest owned IDs tạo qua API hiện hành; không cần framework seed tổng quát mới.

- [ ] Tạo fixture browser mới qua API hợp lệ trên target cô lập, prefix UUID và ghi owned IDs ngay mỗi bước. Có ADMIN/PM/TESTER1/TESTER2/DEV, hai project, hai Feature và dữ liệu Status/Issue đa dạng. Không xóa `CREATE_NEW` manifest hoặc SPIDER-PLUS cũ để ép chạy seed lần nữa.
- [ ] Inventory router hiện hành và mọi nhóm nút trong phạm vi: login/password, Admin/workspace/back, account grant/create, project/member/device, Feature/file/assignment/cell/Issue, Kanban/list/filter/pagination, report/AI, Note/Handbook/Rules/archive. Kiểm default/loading/empty/denied/pending/error/stale/success, hiển thị đúng lý do disabled và phản hồi gần nút; không tuyên bố đã bấm mọi tổ hợp từ source scan.
- [ ] Chạy frontend từ `Frontend`:

  ```powershell
  rtk proxy npm test -- --maxWorkers=2
  rtk proxy npm run build
  rtk proxy npm run test:coverage -- --maxWorkers=2
  ```

  Lưu totals/coverage thực đo; nếu coverage command đã chạy full suite thì không cộng lần chạy này thành test độc lập.
- [ ] Chạy root focused offline union và contracts:

  ```powershell
  rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1 -Tests "CurrentWorkflowDatabaseGuardTest,IdentityPolicyTest,SessionAccountFilterTest,FeatureProgressContractTest,FeatureIssueServiceTest,ManagementReportServiceTest,CustomerWorkbookTest,DocumentWorkbookTest,TestCaseWorkbookTest,AiManagementReportGeneratorTest,AiManagementReportTextTest,InternalRulePolicyTest,QaEvidenceTest,EvidenceContentTest"
  rtk proxy node scripts/Check-Contracts.cjs
  rtk proxy git diff --check
  ```

  Bổ sung chính xác các unit test mới AR-06 vào selector. Đây là tập offline **có tên**, không gọi là toàn backend. Native dùng allowlist AR-00 trên schema cuối; báo riêng số selected/run/skipped. Không ép `SystemJourneyTest`/Admin legacy report expectation200 chạy trên API mới bằng việc bỏ410.
- [ ] Browser cùng baseline/source/data chạy U02→U04–15→U17–18; thêm U16/U19–26. Kiểm Chrome desktop/mobile CSS320/768/1440, zoom200%, keyboard/focus/Enter/Escape, dialog low-height, text wrap, sidebar/project switching. Emulation không được gọi là thiết bị thật; browser không khả dụng ghi blocker cụ thể.
- [ ] Với lỗi mới: receipt RED, sửa nhỏ đúng task, chạy test bị tác động rồi kiểm lại bước browser; nếu sửa code sau full suite, chạy lại phạm vi bị ảnh hưởng và ghi source hash mới. Không đổi code nhưng dùng receipt baseline cũ để đóng toàn chuỗi mới.
- [ ] Tổng hợp defects và giới hạn live/provider/cross-browser/UAT con người. Không tự ký UAT dù mọi API/test tự động PASS.

**Done:** U01–U26 được điền kết quả có bằng chứng hoặc phần chưa chạy cụ thể; hoàn tất kỹ thuật không đồng nghĩa S11/FR-12 DONE/pilot ready.

## AR-11 — Bàn giao và gate khách hàng

**Files:** `docs/reviews/2026-10-25-arena-followup.md`, `docs/planning/2026-10-25-arena-acceptance-matrix.md`, `docs/planning/README.md`, `docs/planning/STATUS.json`; tham chiếu `docs/planning/02-business-rules.md`, không sửa lại quyết định đã chốt thành OPEN.

**Interfaces:** Consumes mọi task receipt; produces bảng `Arena finding → current disposition → task → AC → actual evidence → remaining gate`. G01–G07 có người xác nhận/ngày/ví dụ khi được trả lời; thiếu thông tin giữ OPEN, không tự đặt tên người hay mục tiêu tải.

- [ ] Đối chiếu đủ F1–F7 + các nhánh bổ sung D; đánh dấu CONFIRMED_EXISTING/FIXED/HISTORICAL/BLOCKED có căn cứ. Source code chưa test không là FIXED verified.
- [ ] Ghi skill thực dùng từng task, test commands/result/count/skips, coverage đã đo hay chưa, migration/restore/source preservation và live/cross-browser/UAT chưa đạt.
- [ ] Chốt gate pilot với đúng chủ thể khi chuẩn bị pilot; không hỏi lại chỉ giữ Bug/QA, công thức P/NA, PM nhận máy, ADMIN authority, Markdown là text, AI scope hoặc current workflow đã xác nhận.
- [ ] Cập nhật STATUS theo kết quả thực tế, giữ S11/FR-12 nếu người ký/UAT/pilot còn thiếu. Mỗi defect có ID/owner/next action, không “tất cả hoạt động” khi có lớp chưa chạy.
- [ ] Bàn giao báo cáo và các file minh chứng được phép công bố. Kiểm secret/credential trước staging; commit/push chỉ nếu có yêu cầu mới cho lượt triển khai, không tự merge/deploy.

**Done:** Người dùng nhìn rõ giữ gì/sửa gì/chưa làm gì và vì sao; có đầu mối cho các quyết định thật sự còn mở.
