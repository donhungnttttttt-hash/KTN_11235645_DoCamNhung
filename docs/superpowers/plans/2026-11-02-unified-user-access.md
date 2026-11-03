# Unified User Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hợp nhất quyền Tester/Dev thành User thường, thêm Khách chỉ đọc báo cáo, thay form tạo tài khoản và chuyển đúng hai Admin tổng đã chốt mà không mất lịch sử.

**Architecture:** Giữ mã ADMIN/PM, thêm USER/GUEST; dùng policy theo hành động và membership, không gán đồng thời hai role cũ. Guest có biên API đọc riêng. Migration schema/role phổ quát tách khỏi công cụ thiết lập hai Admin tổng bằng UUID và đầu vào bí mật cục bộ.

**Tech Stack:** React JavaScript, Vitest/RTL, Java 21/Spring Boot, JUnit/Mockito, MySQL native + Flyway; giữ phiên bản dependency hiện có.

**Spec:** [Thiết kế đã duyệt](../specs/2026-11-02-unified-user-access-design.md), được người dùng duyệt bằng “Duyệt rồi nha” ngày 02/11/2026. Baseline `13737f4`, nhánh `system-design`.

**Status:** DONE U01–U10, Chrome riêng và cutover main V37 hoàn tất 03/11. Hồ sơ cá nhân bổ sung đã hoàn tất và main hiện V38; xem [báo cáo hiện hành](../../reviews/2026-11-03-self-profile-and-cutover.md). Không commit/push.

## Global Constraints

- User thường có hợp các quyền nghiệp vụ Tester và Dev cũ; giữ membership, assignment/ownership, lifecycle, optimistic version, CSRF, idempotency và audit của từng hành động.
- Mã tài khoản ADMIN/PM/USER/GUEST; membership PM/USER/GUEST; MEMBER chỉ dành attribution không cấp quyền hoạt động. Không mở lại UI đổi vai trò.
- ID đăng nhập dùng `username`, tên dùng `displayName`; giữ UUID và FK. Không đổi hàng loạt ID thành mẫu syp_userNNN.
- Tạo tài khoản: `isProjectAdmin=false`, `isGuest=false` -> USER; một cờ -> PM/GUEST. Cả hai -> popup, không POST, không mất nháp; backend trả422. Không nhận cấp quyền qua `role` cũ.
- PM có `canCreateUsers` chỉ tạo USER; chỉ Admin tổng tạo PM/GUEST. Checkbox Admin nghĩa là Admin dự án, không phải Admin tổng.
- Giữ `admin.local` -> `admin`, `syp.demo.admin` -> `admin2`, tên tương ứng; khóa `handover.admin`. Mật khẩu lấy từ đầu vào riêng đã được người dùng chỉ định, không chép literal hoặc hash cố định vào Git/log/argv.
- Mật khẩu UI vẫn 12–128 ký tự; ngoại lệ chỉ trong thao tác thiết lập riêng hai Admin tổng. Không có API tạo Admin tổng thứ ba.
- Khách chỉ đọc tiến độ/biểu đồ/báo cáo đã lưu của dự án có membership hoạt động; không workspace nội bộ, AI hoặc nghiệp vụ ghi.
- Không sửa migration V1–V36, không rewrite audit/attempt/revision JSON lịch sử, không khôi phục run/retest đã nghỉ, không tự đổi case OK khi Issue resolved.
- Tests ghi chỉ dùng schema test mới có tên kiểm soát; không dùng `tms` hoặc xóa dữ liệu của schema test cũ. Giữ nguyên thay đổi có sẵn.
- Không commit/push/merge/deploy tự động. Các checkpoint dưới đây là review diff, không phải lệnh commit. Cutover local chỉ ở task cuối sau kiểm chứng và backup.

## Review Focus

1. USER đồng thời tạo Bug monkey và được giao xử lý: lấy hợp quyền, không bị nhánh Dev lọc mất quyền Tester — test U05.
2. Khách gọi API trực tiếp, replay request cũ hoặc đã bị gỡ membership: không nhận nội dung workspace/AI hoặc ghi dữ liệu — tests U06/U08/U10.
3. Rename/bootstrap chạy lại hoặc hai tiến trình tranh hai vị trí Admin tổng: giữ UUID, không reset mật khẩu ngoài ý muốn, không có Admin thứ ba — tests U01/U09.
4. Nhiều thành viên hiện tại nằm ở đầu kết quả tìm kiếm: loại trước pagination, tổng/số trang đúng; không phân công cho Khách hoặc tài khoản khóa — tests U03/U04.
5. Dữ liệu legacy có role/membership không nhất quán, hoặc đổi quyền giữa đọc và gửi: fail closed với chẩn đoán cụ thể, không mất lịch sử hoặc ghi nhờ requestKey đã dùng — tests U01/U02/U10.

## File map và quy ước thực thi

Các đường dẫn rút gọn dưới đây nối chính xác với prefix, không phải glob:

| Prefix | Thư mục |
| --- | --- |
| B | `Backend/src/main/java/vn/syp/tms/` |
| BT | `Backend/src/test/java/vn/syp/tms/` |
| F | `Frontend/src/app/` |

| Thành phần | File chính và trách nhiệm |
| --- | --- |
| Loại tài khoản/registry | Tạo B`identity/AccountType.java`, `AccountPolicy.java`, `SystemAdminRegistry.java`; giới hạn loại và hai UUID có quyền tổng |
| Schema | Tạo `Backend/src/main/java/db/migration/V37__unified_user_access.java`; thêm role/registry/journal, chuyển dữ liệu có kiểm tra |
| Identity | Sửa B`identity/IdentityDtos.java`, `IdentityService.java`, `AuthController.java`, `SessionAccountFilter.java`, `AdminBootstrap.java`; contract, phiên, bootstrap |
| Project | Sửa B`project/ProjectService.java`, `MembershipRepository.java`, `ProjectActorService.java`, B`admin/AdminProjectService.java`; fixed membership, scope, picker |
| Worker | Sửa B`feature/FeatureService.java`, B`testcase/TestDocumentService.java`, `TestDocumentEditingService.java`, `TestCaseService.java`, B`workitem/FeatureIssueService.java`; union theo hành động |
| Guest | Tạo B`reporting/ReportingProjectController.java`, `GuestReportView.java`, B`config/GuestRequestAuthorization.java`; sửa ManagementReportService/Controller và SecurityConfig |
| UI | Form tài khoản, project picker, router/sidebar, testing/Issue dùng capability; tách read-only report view để không mount editor cho Khách |
| Thiết lập riêng | Tạo B`identity/SystemAdminProvisioner.java`, `SystemAdminProvisionRunner.java`, `scripts/Provision-SystemAdmins.ps1`; preflight/apply từ đầu vào riêng |
| Kiểm chứng | Tạo runner `scripts/Test-UnifiedAccessNative.cjs`, BT`support/UnifiedAccessFixtures.java`, các test dưới đây và báo cáo nghiệm thu |

V37 là số còn trống ở baseline đã kiểm tra cả SQL/Java core/demo. Trước tạo migration phải kiểm lại; nếu đã có V37 mới, dùng số kế tiếp và sửa các tham chiếu trong kế hoạch. Nếu dùng V37, cập nhật số dự kiến Arena trong `docs/superpowers/plans/2026-10-25-arena-lifecycle-settings.md`, không triển khai Arena cùng đợt này.

**Lệnh chung:** chạy từ root và luôn qua `rtk`. `BE <classes>` dưới đây là `rtk proxy node scripts/Test-UnifiedAccessNative.cjs --tests <classes>`; runner tạo build riêng dưới ignored `Backend/target/unified-access-verification`, dùng native schema mới `tms_userstest_<12 hex>` và tắt tích hợp ngoài. RED phải là assertion/contract cần sửa, không phải thiếu credential hoặc suite bị skip. GREEN phải có số tests chạy >0, zero failures/errors; ghi skipped riêng. `FE <path>` là `rtk proxy npm test -- <path>` từ thư mục Frontend.

**Phụ thuộc:** U01 -> U02 -> U03; U04/U05 dựa U03; U06 dựa U02/U03; U07 dựa U04/U05/U06; U08 dựa U03/U06; U09 dựa U01/U02; U10 sau tất cả. Một kế hoạch vì các phần dùng chung mô hình quyền, phải phát hành đồng bộ; không triển khai từng nửa lên runtime đang dùng.

**Skill theo task:** đọc SKILL.md trước lần dùng đầu tiên. U01/U09: `backend-patterns`, `tdd-workflow`, `security-review`; U02/U03/U06/U08: `api-design`, `tdd-workflow`, `security-review`; U04/U05: `tdd-workflow`, `security-review`; U07: `frontend-patterns`, `tdd-workflow`; U10: `verification-loop`, `browser-testing-with-devtools`, `code-review`. Tôn trọng React JavaScript/Spring/MySQL hiện tại. Báo cáo từng task: skill -> việc áp dụng -> file/test/bằng chứng; không coi đọc skill là đã kiểm chứng.

## U01 — Schema, registry và bộ kiểm thử chuyển đổi

**Files:** Create migration/AccountType/AccountPolicy/SystemAdminRegistry ở file map; `scripts/Test-UnifiedAccessNative.cjs`, `scripts/Test-UnifiedAccessNative.test.cjs`, BT`support/UnifiedAccessFixtures.java`, BT`identity/UnifiedAccessMigrationNativeTest.java`, BT`identity/AccountPolicyTest.java`. Modify chỉ tham chiếu version Arena nếu cần.

**Interfaces:** `AccountType.fromCode(String): AccountType` nhận ADMIN/PM/USER/GUEST; `AccountPolicy.creationType(boolean isProjectAdmin, boolean isGuest): AccountType`; `AccountPolicy.defaultMembershipRole(AccountType): String` trả PM cho ADMIN/PM, USER/GUEST tương ứng. `SystemAdminRegistry.contains(String userId): boolean`; `register(int slot, String userId): void` chỉ nội bộ và trong transaction; slot1/2. Fixtures tạo hai Admin đã register trong schema test, không thêm role ADMIN không registry để né policy.

- [ ] Viết tests: `creationFlagsMapExactly` dùng `assertThat(creationType(false,false)).isEqualTo(USER)` và PM/GUEST; `rejectsConflictingFlags` kiểm422. Migration tests `upgradePreservesIdentifiersAndHistory`, `freshCoreAndDemoReachSameRoleModel`, `rejectsInconsistentActiveMembership`, `registryRejectsThirdSlotAndDuplicateUser` so UUID/FK/history digest, counts và lỗi constraint; chạy lại Flyway không thay journal.
- [ ] Viết runner với dry-run schema guard: test `rejectsMainAndExistingUnownedSchema`, `rejectsSkippedNativeSuite`, `doesNotOverwriteRunningBackendBuild`. Chạy `rtk proxy node --test scripts/Test-UnifiedAccessNative.test.cjs`; rồi `BE AccountPolicyTest,UnifiedAccessMigrationNativeTest` ghi RED thực tế trên schema riêng.
- [ ] Implement migration: thêm USER/GUEST, registry hai slot với unique UUID/FK/check, journal mapping trước chuyển account TESTER/DEV và membership TESTER/DEV -> USER; giữ ID, canCreateUsers constraint, MEMBER attribution. Preflight báo các cặp account/membership không tương thích trước DML; không tự chọn Admin. Vì MySQL DDL không transactional, ghi rõ bước/checkpoint và không tự Flyway repair khi lỗi giữa chừng.
- [ ] Implement AccountPolicy và registry khóa thống nhất khi register; tăng account version/thu hồi phiên tài khoản đổi role. Giữ role lookup cũ nếu lịch sử/seed cần nhưng chặn ghi role cũ từ runtime mới.
- [ ] Chạy GREEN hai lệnh trên; kiểm core trống, core+demo trống, nâng bản sao V36. Lưu Flyway info/checksum trước sau, journal và digest không chứa bí mật; review diff.

## U02 — Tạo tài khoản, đăng nhập và thu hồi phiên

**Files:** Modify B`identity/IdentityDtos.java`, `IdentityService.java`, `AuthController.java`, `SessionAccountFilter.java`; BT`identity/IdentityPolicyTest.java`, `IdentityProfileControllerTest.java`, `SessionAccountFilterTest.java`. Create BT`identity/UnifiedIdentityNativeTest.java`. Update `docs/api/identity.md`, `docs/api/openapi.yaml`.

**Interfaces:** Consumes U01. `IdentityDtos.CreateUser(String username, String displayName, String password, boolean isProjectAdmin, boolean isGuest)`; `IdentityService.authorities(IdentityUser): List<GrantedAuthority>` cấp ROLE_ADMIN chỉ khi enabled và registry hợp lệ. Giữ response User/Me gồm username/displayName/roles/permissions/version như hiện tại; USER và GUEST là role mới.

- [ ] Tests `defaultCreatesUser`, `delegatedPmCreatesOnlyUser`, `bothFlagsRejectedWithoutInsert`, `legacyRoleFieldRejected`, `registeredAdminOnlyGetsGlobalAuthorities`, `renamedIdKeepsUuid`, `staleSessionDeniedAfterRoleOrCredentialChange`. Assert HTTP201/422/403 tương ứng, số user không tăng khi lỗi, request `role:ADMIN` bị422, account version tăng và phiên cũ bị từ chối.
- [ ] Chạy `BE IdentityPolicyTest,IdentityProfileControllerTest,SessionAccountFilterTest,UnifiedIdentityNativeTest` ghi RED; fixture Admin dùng U01 registry.
- [ ] Thay contract tạo và kiểm extra `role` tại riêng request này, không bật ignore unknown để vô tình nhận role cũ. Enforce canCreateUsers/flags tại service, giữ password validation/normalize/unique ID. `current`, `lockCurrent`, authenticate và authorities đều không cho ADMIN ngoài registry hoạt động; filter kiểm lại registry cùng version/enabled trên phiên cũ.
- [ ] Khóa đường bật lại handover/admin ngoài registry qua update thường; giữ quyền profile/reset của Admin tổng, chống khóa chính mình và giữ optimistic locking. Đổi ID không đổi UUID; audit không chứa mật khẩu.
- [ ] Chạy GREEN lệnh trên; thêm request login thật kiểm authorities và không chỉ mock `.with(user(...).roles("ADMIN"))`. Review contract và diff.

## U03 — Membership cố định và candidate đúng phạm vi

**Files:** Modify B`project/ProjectService.java`, `MembershipRepository.java`, `ProjectActorService.java`; B`admin/AdminProjectService.java`, `DeviceInventoryService.java`, `ProjectLifecycleService.java`, `AdminOverviewService.java`. Create BT`project/UnifiedMembershipNativeTest.java`; update BT`admin/AdminProjectServiceTest.java`, `NativeInitialAllocationTest.java` và `docs/business/permissions.md`, `docs/api/admin-management.openapi.yaml`.

**Interfaces:** Consumes AccountPolicy mapping. Giữ các endpoint membership/candidate; response projectRole trả PM/USER/GUEST, ADMIN được thêm với projectRole PM và nhãn “Làm PM”. `ProjectService.requireWorkspaceAccess(long projectId, String actorId): void` chặn GUEST; `requireReportingAccess(long projectId, String actorId): void` cho ADMIN hợp lệ hoặc PM/GUEST có membership đúng loại, active. Giữ `requireReadAccess` làm wrapper workspace để các GET cũ không tự mở cho Guest.

- [ ] Tests `adminAddsFixedTypesPmAddsOnlyUser`, `existingMembersExcludedBeforePagination`, `guestNeverDeviceRecipientOrLastPm`, `inactiveAttributionGrantsNoAccess`: tạo >1 trang với người đã tham gia ở đầu; assert content/total/counts đúng; ADMIN account vẫn ADMIN khi membership PM.
- [ ] Chạy `BE UnifiedMembershipNativeTest,AdminProjectServiceTest,NativeInitialAllocationTest` ghi RED.
- [ ] Thay whitelist role, SQL filters/counts và eligible recipients; dùng mapping server, từ chối role request không khớp. Thay guard phủ định DEV bằng allowlist theo action. Bảo toàn last-PM locks, inactive attribution, project archive constraints và điều kiện tạo dự án phải có PM.
- [ ] Tách reporting guard khỏi workspace guard như interface trên; ProjectService listing bình thường không làm kênh đọc nội bộ cho Khách. Update metrics nhãn USER/GUEST, không đếm membership thay số user duy nhất.
- [ ] Chạy GREEN lệnh trên, thêm cross-project/disabled membership assertions; review diff.

## U04 — User ghi kết quả, nhận case và giữ version test

**Files:** Modify B`feature/FeatureService.java`; B`testcase/TestDocumentService.java`, `TestDocumentEditingService.java`, `TestCaseService.java`; Create BT`feature/UnifiedUserTestingNativeTest.java`; update BT`workitem/TestVersionsNativeTest.java` và các fixture role liên quan.

**Interfaces:** Consumes U03 workspace guard, USER membership. Giữ request/response Feature, kết quả, assignment, version/date; `canUpdateResult`, `canCreateIssue` phản ánh policy server, không suy từ DEV/TESTER client.

- [ ] Tests `formerDeveloperCanExecuteAssignedCaseAsUser`, `sameMembershipCanBeCaseAssignee`, `userCannotManageFeatureOrEditCaseContent`, `guestAndDisabledUserNotAssignable`, `versionDateUpdateOnlyTargetCase`. Assert cùng USER ghi NG đúng case, version/date/history đúng; case khác không đổi; giữ yêu cầu assignment cũ.
- [ ] Chạy `BE UnifiedUserTestingNativeTest,TestVersionsNativeTest` ghi RED.
- [ ] Hợp quyền đọc/ghi kết quả của worker, bỏ eligibility TESTER-only/global-not-DEV theo policy mới; không nới các thao tác PM như import, quản lý Feature/version, phân công người khác. Kiểm lại quyền trước replay/idempotency response; giữ stale version409 và version đã xóa không dùng cho kết quả mới.
- [ ] Chạy GREEN lệnh trên; đối chiếu response capability với quyền API thật; review diff.

## U05 — User vừa kiểm thử vừa xử lý Issue

**Files:** Modify B`workitem/FeatureIssueService.java`; Create BT`workitem/UnifiedUserIssueNativeTest.java`; update BT`workitem/FeatureIssueServiceTest.java`, `FeatureIssueContextNativeTest.java`, `docs/api/fixreports-contract.md`.

**Interfaces:** Consumes U03; response capability/allowedStatuses hiện có giữ tên. Thay Actor tester/dev thành worker và predicates ownMonkey/assigned; status allowed là union của từng nhánh action hợp lệ rồi giao với lifecycle/BUG–QA constraints, không filter cả union theo nhánh Dev.

- [ ] Tests `creatorAndAssigneeGetsUnionOfTransitions`, `creatorOnlyAndAssigneeOnlyKeepExistingLimits`, `unrelatedUserCannotMutateIssue`, `resolveDoesNotPassCase`, `userCanCreateQaAndBugFromCase`. Assert tập status chính xác từ bảng lifecycle hiện hành; với cùng Issue so `allowedBoth` bằng union `allowedCreator`/`allowedAssignee`, không chỉ assert số lượng.
- [ ] Chạy `BE UnifiedUserIssueNativeTest,FeatureIssueServiceTest,FeatureIssueContextNativeTest` ghi RED.
- [ ] Hợp các predicate tạo/sửa/xóa/comment/chuyển trạng thái; eligible assignee là USER active đúng dự án. Chỉ manager phân công nếu rule hiện tại yêu cầu; giữ priority, Feature environment hiện tại, optimistic version, attachment scope và audit.
- [ ] Chạy GREEN lệnh trên; gửi mutation mà capability không cho phép phải bị server chặn. Review diff, không tái mở WorkItem legacy writes.

## U06 — API Khách chỉ đọc tiến độ và báo cáo

**Files:** Create B`config/GuestRequestAuthorization.java`, B`reporting/ReportingProjectController.java`, `GuestReportView.java`, BT`reporting/GuestReportingNativeTest.java`; Modify B`config/SecurityConfig.java`, B`reporting/ManagementReportService.java`, `ManagementReportController.java`; update `docs/api/reporting.md`, `docs/api/fixreports-contract.md`.

**Interfaces:** Consumes `requireReportingAccess`. GET `/api/v1/reporting-projects` trả `{items:[{id,code,name,projectRole}],page,size,totalElements}` chỉ active guest memberships, có pagination. Existing GET `/api/v1/projects/{projectId}/management-reports` + `/summary` + `/{id}` + `/{id}/download` hỗ trợ GUEST qua projection riêng. Summary Guest chỉ có project id/code/name, asOf/timeZone, counts/progress để vẽ chart; report Guest có id/title/markdown/createdAt/updatedAt, không source context hoặc audit actors.

- [ ] Tests `guestReadsOnlyMemberReports`, `guestCannotReadWorkspaceOrAi`, `membershipRemovalRevokesReadsImmediately`, `guestSummaryContainsOnlyDocumentedFields`. Parameterize method/path gồm members, files, Issues, attachments, notes, devices, audit, provider, AI thread/portfolio/retry, admin và report POST/PUT; assert403, provider không được gọi và DB không đổi. Cross-project report ID bị chặn; report download đúng scope.
- [ ] Chạy `BE GuestReportingNativeTest` ghi RED với đăng nhập/session thật, CSRF hợp lệ cho test forbidden mutation (tránh PASS chỉ vì thiếu CSRF).
- [ ] Implement reporting access và projections; create/update/AI report generator vẫn guard PM/Admin. List project riêng không dùng DTO workspace giàu dữ liệu. Guest không được tùy chọn featureId để lấy context nội bộ; summary chỉ trả aggregate hợp đồng đã nêu.
- [ ] Implement `GuestRequestAuthorization implements AuthorizationManager<RequestAuthorizationContext>` với allowlist method/resource đặt trước catch-all authenticated cho principal GUEST; cho auth csrf/login/logout, GET me, reporting-projects và các GET report nêu trên. Tài nguyên khác mặc định deny; path matching cùng cơ chế Spring Security, không check substring. Service luôn kiểm lại membership/resource.
- [ ] Chạy GREEN lệnh trên, kiểm anonymous401/CSRF403 và GUEST không thành USER qua request. Review field allowlist và diff.

## U07 — Form, điều hướng và giao diện theo mô hình mới

**Files:** Modify F`features/admin/UserCreateDialog.jsx`, `AdminUsers.jsx`, `AdminProjectForm.jsx`, `AdminProjectDetail.jsx`, `shared.jsx`; F`features/auth/AuthProvider.jsx`, `AccountMenu.jsx`; F`features/projects/MemberPicker.jsx`, `ProjectMembers.jsx`, `CreateProjectDialog.jsx`, `ProjectProvider.jsx`, `projectAccess.js`, `ProjectAccessNotice.jsx`; F`routes/AppRouter.jsx`, `components/Sidebar.jsx`, `layouts/MainLayout.jsx`, `pages/WorkBoardPage.jsx`; `Frontend/src/AppEntry.jsx`. Modify F`features/reports/ManagementAnalysisPage.jsx`, F`services/api/managementReports.js`; Create F`features/reports/ReadOnlyProjectReports.jsx`, `ReadOnlyProjectReports.test.jsx`, F`features/admin/unified-account-create.test.jsx`, F`routes/unified-access.test.jsx`. Update testing/Issue UI đang dùng isProjectDeveloper thay vì capabilities.

**Interfaces:** Consumes U02 DTO và U04/U05 capabilities, U06 read API. Tạo `ReadOnlyProjectReports({projectId})`, không mount editor; service `listReportingProjects({page,size,signal})`. ProjectProvider của GUEST lấy list riêng, không gọi workspace metadata/settings. ID label “ID đăng nhập”, displayName label “Tên”; thống nhất nhãn bốn loại như spec.

- [ ] Tests `defaultsToUserAndSubmitsFlags`, `bothCheckboxesWarnWithoutPostAndKeepDraft`, `delegatedPmCannotSelectAdminOrGuest`, `adminMembershipShowsLamPm`, `guestLandingLoadsOnlyReportingApis`, `workerSeesExecutionAndIssueActions`. Assert cả hai checkbox vẫn tích được trong nháp, submit mở dialog chính xác “Không thể chọn đồng thời Admin và Khách”; form không reset; không dropdown role.
- [ ] Chạy RED: `FE src/app/features/admin/unified-account-create.test.jsx`, `FE src/app/features/reports/ReadOnlyProjectReports.test.jsx`, `FE src/app/routes/unified-access.test.jsx`.
- [ ] Implement form booleans/default/error dialog và nhãn; tái sử dụng focus/dirty-close dialog hiện có. PM entry chỉ tạo USER. Pickers hiển thị role cố định, loại active members đúng API; filter cập nhật USER/GUEST, không tái thêm chọn role.
- [ ] Implement Guest landing/sidebar và read-only report UI từ chart/markdown dùng chung; chặn route workspace trước mount/fetch, không AI launcher. Worker UI dùng capability backend thay nhánh DEV-only; giữ admin landing và nút quay lại quản trị. Loading/error/empty/retry giữ scoped project; đổi project hủy response cũ để tránh hiển thị nhầm.
- [ ] Chạy GREEN ba lệnh trên và các suite admin/project/testing/work-items/reports/auth/routes hiện có; test role cũ chỉ giữ cho migration/historical fixtures. `rtk proxy npm run build` từ Frontend phải PASS; review keyboard/focus và spacing ở 1440px/768px, không chỉnh bố cục ngoài phạm vi.

## U08 — AI hợp quyền và các lối vào còn sót

**Files:** Modify B`ai/AiPurpose.java`, `AiAccess.java`, `AiContextService.java`, `AiPortfolioContext.java`, `AiChatService.java`, `AiChatStore.java`, `LocalAiAccess.java`; F`features/ai/aiLabels.js`, `AiAssistantPage.jsx`, `AiChat.jsx` nếu còn role gating; Create BT`ai/UnifiedUserAiAccessTest.java`; update BT`ai/AiAccessTest.java`. Review B`execution`, `retest`, `qa`, `filework`, `integration/RedmineWorker.java` và controllers retired; ghi từng occurrence runtime vào báo cáo.

**Interfaces:** Consumes U03/U06. Giữ enum purpose IDs cũ; `AiPurpose.forRole(String)` cho USER trả TESTER_WORK_REPORT, TESTER_BUG_DRAFT, DEV_TICKET_REVIEW; GUEST không có purpose. AiAccess kiểm account/membership hiện tại trước đọc/gửi/apply, không dùng role snapshot trong thread làm nguồn cấp quyền.

- [ ] Tests `userGetsWorkerPurposesWithoutPmPurposes`, `oldThreadUsesCurrentMembership`, `guestCannotReadProviderOrThreadContext`, `revokedScopeStopsRetryBeforeProviderCall`; assert source ownership/cross-project, verify provider zero calls khi bị chặn. Regression retired endpoints vẫn410 với tài khoản có quyền tương ứng, không được tái mở do USER.
- [ ] Chạy `BE UnifiedUserAiAccessTest,AiAccessTest` ghi RED.
- [ ] Implement purpose union và current authorization; giữ historical payload, không rewrite thread role. Soát mọi literal TESTER/DEV/role-code trong main Java/JS/SQL runtime/scripts đang dùng: phân loại current policy cần sửa, lịch sử cần giữ, luồng retired cần giữ đóng; sửa các policy background/attachment còn dựa role cũ, không kích hoạt workflow retired.
- [ ] Chạy GREEN lệnh trên, suite AI frontend/backend và regression retired liên quan. Kiểm permission trước đọc cache/replay requestKey, không gửi key/prompt tới nhà cung cấp trong test. Review inventory không còn occurrence quyền hiện hành chưa giải quyết.

## U09 — Công cụ thiết lập hai Admin và bootstrap an toàn

**Files:** Create B`identity/SystemAdminProvisioner.java`, `SystemAdminProvisionRunner.java`, BT`identity/SystemAdminProvisionNativeTest.java`, `scripts/Provision-SystemAdmins.ps1`; Modify B`identity/AdminBootstrap.java`; Create `docs/database/unified-user-access-cutover.md`. Update hướng dẫn bootstrap/demo hiện hành để không còn tạo Admin không registry.

**Interfaces:** Consumes registry U01, auth U02. `SystemAdminProvisioner.preflight(ProvisionRequest): ProvisionPreview`; `apply(ProvisionRequest, String expectedFingerprint): ProvisionReceipt` chạy transaction/lock. Records chứa operationId, hai mapping source UUID/expected username -> target username/displayName/slot, danh sách UUID cần khóa và bí mật chỉ trong memory; preview/receipt không chứa password/hash. Runner chỉ bật profile `identity-provision`, non-web, tắt worker/scheduler; script nhận secret qua secure input/private file và không truyền password bằng argv.

- [ ] Tests `renamesInPlaceAndLocksHandover`, `replayDoesNotResetPasswordAgain`, `concurrentProvisionCannotCreateThirdAdmin`, `targetIdConflictAbortsWithoutPartialChanges`, `freshBootstrapRequiresTwoConfiguredAdmins`, `unknownMappingFailsClosed`. Assert UUID/membership/history nguyên vẹn, login ID mới thành công, ID cũ/phiên cũ thất bại, duplicate operation không đổi version/hash lần nữa.
- [ ] Chạy `BE SystemAdminProvisionNativeTest` ghi RED; dùng mật khẩu test riêng, không dùng mật khẩu người dùng trong fixture.
- [ ] Implement preflight fingerprint và transaction apply; kiểm hai target ID trống/đúng UUID, nguồn/khóa đúng snapshot, registry tối đa2. Xử lý tất cả ADMIN hiện tại: chỉ hai UUID approved registered, handover khóa; nếu có ADMIN khác ngoài mapping thì dừng, không tự hạ quyền. Bump version/revoke sessions và audit không bí mật.
- [ ] Bootstrap trống tạo đúng hai Admin từ cấu hình riêng, không mặc định password; DB đã có tài khoản bắt buộc mapping rõ, không count>0 rồi bỏ qua registry. Chạy provisioning khi HTTP tắt, không để app bình thường phát request trong khoảng migration xong/registry chưa thiết lập. Các demo cũ chạy trước migration vẫn cần bước provision rõ ràng, không ngầm cấp quyền ADMIN thứ ba.
- [ ] Chạy GREEN lệnh trên; dry-run script phải không đổi DB, apply cần fingerprint khớp. Viết recovery cho lỗi MySQL DDL/provision và cách xác thực backup; không mở web endpoint provision. Review diff và tìm bí mật trong tracked/untracked files định đưa vào Git.

## U10 — Nghiệm thu toàn hệ thống và cutover local

**Files:** Create BT`identity/UnifiedAccessJourneyNativeTest.java`, `docs/reviews/2026-11-02-unified-user-access.md`; Update `docs/planning/STATUS.json`, `README.md`, permissions/API/README chạy ứng dụng và fixtures hiện hành. Không sửa dữ liệu kiểm thử để che lỗi quyền.

**Interfaces:** Consumes toàn bộ task. Journey dùng HTTP session thật/CSRF, cùng UUID USER làm testing và Issue; quyền Guest qua allowlist/report guard; provisioning theo U09.

- [ ] Viết journey trước cutover: `oneUserExecutesThenResolvesAssignedIssue`, `replayAfterMembershipRemovalCannotWrite`, `guestReadsOnlyAssignedProjectReports`, `adminCheckboxDoesNotGrantSystemAdmin`. Assert DB/response/history và denied401/403/409/422; archived project/Feature, version đã xóa, cross-project, stale account/session. Chạy `BE UnifiedAccessJourneyNativeTest` rồi sửa failure trong task sở hữu, không bypass guard.
- [ ] Chạy toàn frontend, build, toàn backend unit/native có môi trường phù hợp; suites Testcontainers chưa có môi trường phải ghi skipped/blocked và bổ sung kiểm native tương đương cho thay đổi này. Chạy `rtk proxy node scripts/Check-JavaDiagnostics.cjs`, `rtk proxy node scripts/Check-Contracts.cjs`, `rtk proxy git diff --check`. Ghi counts thực tế và coverage đo từ Vitest/JaCoCo cho phần đổi; không suy coverage từ số PASS.
- [ ] Chrome trên bản thử nghiệm: Admin tổng tạo USER/PM/GUEST/cả hai, PM delegate, User cùng một phiên ghi case rồi xử lý Issue, Guest landing/report/URL bị cấm, picker phân trang, khóa/gỡ membership khi tab còn mở. Dùng dữ liệu riêng; xem console/network, focus/error/loading, desktop/narrow viewport. Không gửi tin AI thật hoặc ghi case main để kiểm thử.
- [ ] Hoàn tất fresh core/core+demo/upgrade bản sao local; so sánh counts, UUID/FK, assignment, version/date, Issue/report, history digests; old migration checksums không đổi. Khôi phục backup vào schema riêng và đọc lại để chứng minh backup dùng được.
- [ ] Cutover local sau khi các bước trên đạt: backup mới, kiểm mapping/source version/fingerprint, dừng riêng backend, chạy migration + provision non-web, khởi động backend/frontend đồng bộ và smoke read/login. Cấp quyền đã có trong yêu cầu triển khai; chỉ hỏi nếu xuất hiện mapping/nghiệp vụ mới chưa được chốt. Không tự chọn Admin khác khi preflight lệch. Không reset main hoặc đưa fixtures test vào main.
- [ ] Review toàn diff và báo cáo từng task skill -> tác dụng -> bằng chứng; đánh dấu DONE chỉ khi đạt nghiệm thu. Nếu thiếu kiểm chứng/cutover chưa chạy, ghi rõ NOT DONE và nguyên nhân. Không commit/push khi chưa có yêu cầu cho tác vụ này.

## Ma trận nghiệm thu và self-review kế hoạch

| Mục spec §10 | Task chịu trách nhiệm |
| --- | --- |
| 1, 2, 10: tạo/ID/delegation | U02, U07, U09 |
| 3, 4, 5, 6: union worker, assignment, giới hạn quản lý | U03, U04, U05, U07 |
| 7, 8: Guest đọc đúng và UI | U06, U07, U10 |
| 9: hai Admin, phiên, registry concurrency | U01, U02, U09 |
| 11: API/CSRF/stale/replay/lifecycle/scope | U02–U06, U10 |
| 12: AI/history/current authority | U08 |
| 13: fresh/upgrade/demo/migration preservation | U01, U09, U10 |
| 14: suites/build/diagnostics/coverage/Chrome | U10 |

- [x] Mỗi yêu cầu spec có task; không đổi quyết định quyền/ID/mật khẩu đã duyệt.
- [x] Interfaces dùng thống nhất AccountPolicy, registry, workspace/reporting guard và capabilities; Guest projection tách context nội bộ.
- [x] Năm Review Focus có test chủ sở hữu; thêm kiểm idempotency, concurrent provision, false positive do CSRF/skip.
- [x] Không viết sẵn toàn bộ implementation; mỗi task có RED/implementation/GREEN, checkpoint riêng; không tự commit theo ví dụ của skill.
- [x] File map đối chiếu source; V37 cần recheck trước execution; main và build đang chạy được bảo toàn.
- [x] Người dùng duyệt toàn bộ; thực thi Native trong checkout được chỉ định.
- [x] Đã đọc skill execution; đang thực thi và cập nhật bằng chứng U01–U10.

**Checkpoint lịch sử trước nghiệm thu:** U01–U09 đã có implementation và test theo nhóm; U10 khi đó IN_PROGRESS. Skill `using-superpowers` -> chọn workflow architectural; `brainstorming` -> thiết kế đã duyệt; `writing-plans` -> task/interface/test/cutover và self-review trên. Trạng thái mới nhất là DONE như đầu tài liệu; không sử dụng checkpoint này để kết luận còn thiếu cutover.

## Checklist tại checkpoint trước nghiệm thu 03/11/2026 (lịch sử)

- [x] U01: policy, V37, registry/journal; fresh/upgrade/demo native.
- [x] U02: flags, ID/tên, session và quyền tạo; HTTP/native/unit.
- [x] U03: membership cố định, danh sách loại thành viên hiện tại, tài khoản/assignment phù hợp.
- [x] U04/U05: USER làm case và Issue trong cùng phiên; kiểm ownership/replay/lifecycle.
- [x] U06: Guest GET allowlist/projection và kiểm quyền dự án hiện tại.
- [x] U07: form/router/Guest shell và test tự động, build.
- [ ] U07: keyboard/focus/responsive trên Chrome thật.
- [x] U08: hợp purpose, lịch sử AI qua journal, kiểm quyền trước inference.
- [x] U09: provision/registry concurrency/replay/bootstrap, diễn tập bản sao.
- [x] U10: hồi quy rộng, đo coverage, review độc lập, backup restore và đối chiếu dữ liệu.
- [ ] U10: Chrome đầy đủ và xử lý lỗi phát hiện ở runtime thử.
- [ ] U10: backup mới, chuyển main/provision mật khẩu đã chỉ định và smoke runtime mới.

Các checkbox trong từng task là brief ban đầu; checklist này lưu trạng thái trước nghiệm thu. Trạng thái sau khi đóng các việc còn lại nằm ở mục nghiệm thu dưới đây và báo cáo hiện hành.

## Nghiệm thu 03/11

- [x] U07 Chrome keyboard/focus và desktop/768.
- [x] U09 mapping Admin áp dụng main; UUID/history giữ nguyên.
- [x] U10 Chrome quyền, membership/session revocation, backup restore mới, V37/provision và smoke login main.

Các ô chưa đánh dấu ở checkpoint trước là lịch sử; trạng thái mới nhất ở mục này và đầu báo cáo. Không nghiệm thu toàn bộ luồng nghiệp vụ ngoài phạm vi.
