# Admin/project deep review

Scope: complete current files in frontend admin/projects, backend admin/project/identity/handbook/rules/catalog, related tests, and all SQL migrations. Source tests were read before implementation changes. Existing dirty/untracked work was preserved. Exact hashes, ranges, paths and every scoped control declaration are recorded in deep-review-admin-ledger.json.

168/168 ledger files were fully read (9532 lines), including 27 SQL migration files. 242 control declarations are traced below: buttons, links, forms, inputs and custom wrappers, **not** a count of unique user buttons or passing flows. Root-owned source cross-references remain separate from exhaustive ownership.

Skills: code-review-and-quality delegated multi-model review; brainstorming read-only context; using-superpowers; frontend patterns and behavioral TDD; ponytail review for genuine unnecessary duplication. No product DB writes, commit or push.

## Confirmed defects and bounded fixes

1. AdminProjectDetail.jsx:38 / AdminProjects.jsx:22: summary reload refreshed only summary, leaving management project and archive state stale. Reproduce externally archived project then Tải lại: summary archived while Sửa remains enabled. Shared revision refresh now reloads management and summary together. AdminProjectLifecycle.integration regression was RED before fix; focused lifecycle/projects/management suite GREEN 22 tests.
2. ProjectStatusReportService.java:42–59: global Admin constructed role-only member then read missing id, causing valid POST to fail with NullPointerException. Uses existing ProjectActorService.forWrite for real actor/inactive attribution; workspace canPost is globally Admin while archive/central readonly remains guarded. Unit regression RED NPE, then GREEN; capability regression RED false then GREEN. ProjectStatusReportTest 8 GREEN; security suite was also checked earlier. New AdminWorkspaceNativeTest:88–101 checks isolated stored attribution/history/idempotent readback, still pending execution.
3. ProjectStatusReports.jsx:31: central readonly report history had no direct entry to posting workspace. Added selected-project /progress?workspace=1 link. Navigation assertion RED link absent → GREEN status-reports suite 6 tests.

## Action contract matrix

The API/permission/readback columns apply to each action referenced by contract ID in the complete declaration appendix. Local inputs/search/navigation do not mutate data by themselves. Runtime evidence is precise and limited; complete source trace is not presented as end-to-end verification.

| Contract | Disabled/validation/pending/success/error/retry | FE API → BE permission | Data readback | Evidence / limits |
|---|---|---|---|---|
| navigation: AdminApp, AdminLayout, ProjectSelector, ProjectAccessNotice | Navigation, scope selection, logout; local navigation is synchronous; project loading and logout display pending/error/retry. Global Admin project read does not create membership. | auth.logout, projectsApi.list/get → IdentityController, SessionAccountFilter, ProjectController/ProjectService | ProjectProvider reloads current identity/project; scope comes from projectId query and selected project. | admin-routing, admin-role-compatibility, ProjectProvider, projects settings tests; native AdminWorkspace assertions pending combined run |
| read: AdminAudit, AdminDashboard, shared, MetricBars | Filters reset pagination; reload/retry uses current key and abort/stale generation protection. Paging disabled at bounds. Read failures remain visible; successful navigation/read has no write success requirement. | adminApi.audit/overview/projectSummary → AdminAuditService, AdminOverviewService, AdminProjectService; ADMIN controller authorization | Current project/membership/status/asset projections, sanitized actor/entity audit response. | admin.test, status-reports audit retries, AdminOverviewServiceTest, AdminAuditServiceTest |
| picker: AdminProjectDropdown, AdminUserProjectFilter, AdminProjectDropdown, ProjectRoleSelect | Select/search/paging controls update local scope or draft; named labels and loading/error/retry path. Current-account role constrains project role options. No write from picking alone. | adminApi.projects/users → AdminProjectService, AdminIdentityService; ADMIN management endpoints | Selected project label fetched independently when not on current page; membership role validated again on write. | project-picker, admin-management, CentralMembershipTest |
| project: AdminProjects, AdminProjectDetail, AdminProjectForm | Create/edit/member saves validate required fields and role compatibility. Mutation disables fieldsets; partial member saves remove fulfilled rows and retain failed/unattempted rows. Retry obtains current version. Generation/key guards isolate project/editor completion. Summary reload now refreshes management/lifecycle too. | adminApi.createProject/updateProject/project/members/memberCandidate/setMember/removeMember → AdminManagementController, AdminProjectManagementService; ADMIN, enabled account, last enabled PM, optimistic version/project locks | Versioned projects/current enabled memberships, summary and lifecycle reload on revision; initial device allocations in same create transaction. | admin-projects, admin-management, AdminProjectLifecycle.integration (reload RED→GREEN), AdminNativeIntegrationTest, CentralMembershipTest |
| lifecycle: AdminProjectLifecycle | Archive/reopen dialogs show readiness/history, reason validation, pending, conflict/error retry preserving reason, and saved status. Pending unsaved changes explained before lifecycle transition. Archived state disables writes; receive asset remains possible. | adminApi.archiveReadiness/archiveProject/reopenProject/lifecycleHistory → ProjectLifecycleService; ADMIN, version/lock, active allocation blockers, idempotent actor/payload request key | projects.archived_at/version, append-only project_lifecycle_events and project_audit. | AdminProjectLifecycle tests, lifecycle native tests owned by root; read source evidence only for unexecuted checks |
| users: AdminUsers | Create/status/permission controls display validation, busy, error and success; preserve draft on failure, reload current data on stale version. Account creation role options constrained; status last-PM failure remains visible. | adminApi.createUser/setEnabled/setCreatePermission/users → AdminIdentityService, IdentityService; ADMIN or separately authorized PM may create TESTER only; versions, identity-before-project locking, last enabled PM guard | identity_users and current memberships; response excludes password/hash. | action-button-audit, admin-management, AdminStateProjectionTest, CentralMembershipTest, IdentityIntegrationTest |
| dialog: AdminFormDialog, useInlineEditorFocus | Modal focus/escape/backdrop and inline form focus restoration; busy prevents dismissal. Validation focuses message/invalid field; pending and response handled by owning form. | No direct API; delegates form actions → Delegated owning form guard | No storage mutation from close/open. | admin-dialog, device-editor-focus, shared useDialogFocus regressions reviewed |
| inventory: AdminDevices, DeviceAssetForm, DeviceAllocationDialog, InitialDevicePicker, ProjectDevices, ProjectDeviceAssignDialog | Create/edit/assign/return validate required values and recipient. Bulk recipient applies only selected rows; missing-recipient count and jump visible. Failed handover retains failed/unattempted rows; fulfilled rows removed and authoritative stock reloaded. Busy prevents duplicate submit; stale editor completion isolated; success/error and retry version shown. | adminApi.assets/createAsset/updateAsset/allocate/receive/allocations; projectsApi.catalogs plus eligible members → DeviceInventoryService; ADMIN; asset version, active enabled project recipient, archive guard for assignment; return allowed for archived project; sorted asset/project locking | device_assets status/version and device_allocations sole active allocation via generated unique key; project summary refresh. | inventory, button-recheck, device-handover-feedback, NativeInitialAllocationTest, native 20-handover test owned by root |
| progress: ProjectStatusReports | History paging/retry; workspace canPost gates form, busy prevents duplicate submit. Failed draft/idempotency key retained; keyed project prevents old completion erasing new draft. Central history has direct selected-project workspace link. Admin global canPost true only active workspace; central stays readonly. | adminApi.statusReports/createStatusReport → ProjectStatusReportService; current ADMIN or active project PM, enabled actor, project lock/archive guard; ProjectActorService inactive attribution for global Admin | Append-only project_status_reports and audit, actor-bound request key; actual author identity preserved; warnings computed from actual milestones. | status-reports 6 GREEN with new navigation RED→GREEN; ProjectStatusReportTest 8 GREEN; AdminWorkspaceNative new author/readback pending |
| catalog: CatalogPage, CatalogEditor | Tab/filter/toggle/new/edit actions; required native validation and visible form alert; pending/error/retry and saved notice. Editor cancel guards pending; version/state refreshed after mutation. Builds show active choices, explicit date clear preserved. | projectsApi.catalogs/createCatalog/updateCatalog → CatalogController/Service/Store; global Admin/current PM policy, project scope, archive write guard, version/project lock; normalized build uniqueness | project_environments/device_types/milestones/builds; scoped identifiers, versioned responses and refreshed lists. | CatalogPage, CatalogInputTest; no native catalog write performed in this pass |
| handbook: HandbookPanel | List/detail/history selection with loading/error/retry; create/new version required validation, pending/error and saved status. Versions immutable; local draft retained after failure. | projectsApi.handbook/handbookDetail/createHandbook/addRevision → HandbookController/Service; current Admin/PM, active project, current revision expected ID/project lock | project_resources + resource_revisions project-scoped current revision FK; append-only revision history; content rendered as text. | settings tests; backend source trace; no new handbook native mutation in this pass |
| rules: RulesPanel | Reload/new draft/publish; required names, schema JSON error, busy/error/saved notice. Publish uses current version and immutable version list. | projectsApi.rules/createRule/publishRule → InternalRuleController/Service; Admin/PM, project archive guard, validated declarative schema, version/project lock | internal_rule_sets/versions and scoped current_version_id; no arbitrary evaluator code. | settings tests, InternalRulePolicyTest |
| settings: ProjectSettingsPage, ProjectMembers, CreateProjectDialog, projectAccess | Settings fields save with busy/error/success/version reload; central member management link. Legacy MemberEditor exists but current settings intentionally passes canEdit=false. Legacy CreateProjectDialog has no production caller; API directs centralized creation, so reviewed dead legacy form is not a reachable create route. | projectsApi.update/members/userLookup; legacy create returns central-creation-required → ProjectController/Service, AdminProjectManagementService; Admin/current project PM, enabled role compatibility, last enabled PM/version/project scope | Current project summary and memberships refreshed after successful mutation; role/archive capability checks. | settings, CreateProjectDialog.review, ProjectProvider, ProjectTimezoneTest |

## SQL and cross-domain consistency

All 27 present migrations read in full (V1–V19, V21, V23–V29; intentional numbering gaps are not missing-file findings). V3 scoped revision pointers; V11 versions; V15 physical asset/serial and generated sole-active allocation uniqueness plus project-recipient FK; V16 required report author membership; V17 file-group source uniqueness and pinned run relations; V19 nullable FK ordering; V21 lifecycle append-only version/request-key; V26 import author attribution; V27 edited-cell revisions and pinned retest; V28 recipient/executor distinction while preserving project/asset/session scope; V29 removes only group-source uniqueness and retains run exclusivity. Current query/transaction guards were traced against these constraints. No applied migration edited.

Identity→project→membership/asset locking and current-account checks protect member/last-enabled-PM transitions; physical handover remains ADMIN and active enabled recipient scoped to an active project, while archived projects allow return. Project creation uses explicit PM selection and atomic initial allocations. Global Admin audit attribution is inactive MEMBER, never self-enrollment as active PM. Handbook/rules revisions remain scoped and immutable; text rendering does not execute stored content; rule schema is declarative. Catalog explicit date clearing and application uniqueness guards account for nullable build-key SQL uniqueness.

## Remaining assurance gaps

- Browser integration/visual/focus verification delegated to root; no browser operated by this reviewer.
- Native Admin status report author/readback test added but pending isolated execution.
- Complete static review and focused tests do not prove every interleaving, every role/disabled state or every runtime configuration.
- No coverage measurement for this reviewer focused tests; parent full coverage run is separate.
- Repeated native concurrency races (identity disable/demotion, external archive, asset allocation conflict), all locale/timezone permutations and production network failures were statically traced but not re-executed for every action in this pass.
- Current focused tests use isolated mock fixtures; they never alter application tms data. Native tests must retain the guarded isolated tms_docstest_ schema and rollback.

## Every control declaration

Disabled expression is exact inventory evidence; “—” means the element has no own disabled attribute, not that parent fieldsets/capability gating are absent. Contract describes parent gates and backend checks. New workspace link appended after inventory snapshot.

| Path:line | Control / label | Handler / destination | Own disabled expression | Contract |
|---|---|---|---|---|
| Frontend/src/app/features/admin/AdminApp.jsx:19 | a Về không gian dự án | "#/dashboard" | — | navigation |
| Frontend/src/app/features/admin/AdminApp.jsx:24 | a Về tổng quan | {`#/admin${projectId ? `?projectId=${projectId}` : ''}`} | — | navigation |
| Frontend/src/app/features/admin/AdminAudit.jsx:13 | button Tải lại | {"onClick":"{state.retry}"} | — | read |
| Frontend/src/app/features/admin/AdminAudit.jsx:14 | AdminUserProjectFilter "Dự án trong nhật ký" | {"onChange":"{v=>change('projectId',v)}"} | — | read |
| Frontend/src/app/features/admin/AdminAudit.jsx:15 | select  | {"onChange":"{e=>change('type',e.target.value)}"} | — | read |
| Frontend/src/app/features/admin/AdminAudit.jsx:16 | input  | {"onChange":"{e=>change('from',e.target.value)}"} | — | read |
| Frontend/src/app/features/admin/AdminAudit.jsx:16 | input  | {"onChange":"{e=>change('through',e.target.value)}"} | — | read |
| Frontend/src/app/features/admin/AdminAudit.jsx:17 | select  | {"onChange":"{e=>change('timezone',e.target.value)}"} | — | read |
| Frontend/src/app/features/admin/AdminAudit.jsx:20 | a  | {`#/admin/projects/${e.projectId}`} | — | read |
| Frontend/src/app/features/admin/AdminAudit.jsx:21 | button Trang trước | {"onClick":"{()=>setFilters({...filters,page:filters.page-1})}"} | {!filters.page} | read |
| Frontend/src/app/features/admin/AdminAudit.jsx:21 | button Trang sau | {"onClick":"{()=>setFilters({...filters,page:filters.page+1})}"} | {(filters.page+1)*20>=state.data.totalElements} | read |
| Frontend/src/app/features/admin/AdminDashboard.jsx:16 | button Tải lại | {"onClick":"{state.retry}"} | — | read |
| Frontend/src/app/features/admin/AdminDashboard.jsx:24 | a  | {`#/admin/projects/${p.id}${scope}`} | — | read |
| Frontend/src/app/features/admin/AdminDashboard.jsx:31 | a Mở kho máy | {'#/admin/devices'+scope} | — | read |
| Frontend/src/app/features/admin/AdminDashboard.jsx:33 | a Xem toàn bộ dự án | {`#/admin/projects${scope}`} | — | read |
| Frontend/src/app/features/admin/AdminDashboard.jsx:35 | a · | {`#/admin/projects/${m.projectId}${scope}`} | — | read |
| Frontend/src/app/features/admin/AdminDashboard.jsx:36 | a  | {`#/admin/projects/${p.id}${scope}`} | — | read |
| Frontend/src/app/features/admin/AdminDashboard.jsx:37 | a · | {`#/admin/projects/${b.projectId}${scope}`} | — | read |
| Frontend/src/app/features/admin/AdminDashboard.jsx:38 | a · | {`#/admin/devices?projectId=${a.projectId}`} | — | read |
| Frontend/src/app/features/admin/AdminDevices.jsx:10 | button Thu hồi | {"onClick":"{()=>onReturn(a)}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:28 | button Nhập máy | {"onClick":"{()=>setEditor({kind:'asset',asset:null})}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:28 | button Tải lại | {"onClick":"{()=>{setRefresh(n=>n+1);setEditor(null);}}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:29 | AdminUserProjectFilter "Dự án đang giữ máy" | {"onChange":"{v=>filter(setProject,v)}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:29 | input  | {"onChange":"{e=>filter(setHistory,e.target.checked)}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:29 | input  | {"onChange":"{e=>filter(setKeyword,e.target.value)}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:29 | select  | {"onChange":"{e=>filter(setStatus,e.target.value)}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:30 | DeviceAssetForm  | {"onSaved":"{changed}","onCancel":"{()=>setEditor(null)}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:31 | DeviceAllocationDialog  | {"onSaved":"{changed}","onCancel":"{()=>setEditor(null)}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:33 | AllocationTable  | {"onReturn":"{a=>setEditor({kind:'return',asset:{id:a.assetId,assetCode:a.assetCode},allocation:a})}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:33 | button {`Sửa ${a.assetCode}`} | {"onClick":"{()=>setEditor({kind:'asset',asset:a})}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:33 | button {`Bàn giao ${a.assetCode}`} | {"onClick":"{()=>setEditor({kind:'assign',asset:a})}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:33 | button {`Thu hồi ${a.assetCode}`} | {"onClick":"{()=>receive(a)}"} | — | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:34 | button Trang trước | {"onClick":"{()=>setPage(page-1)}"} | {!page} | inventory |
| Frontend/src/app/features/admin/AdminDevices.jsx:34 | button Trang sau | {"onClick":"{()=>setPage(page+1)}"} | {(page+1)*20>=state.data.totalElements} | inventory |
| Frontend/src/app/features/admin/AdminFormDialog.jsx:13 | button "Đóng" | {"onClick":"{onClose}"} | {busy} | dialog |
| Frontend/src/app/features/admin/AdminLayout.jsx:15 | a Đến nội dung | "#admin-main" | — | navigation |
| Frontend/src/app/features/admin/AdminLayout.jsx:16 | button  | {"onClick":"{signOut}"} | {busy} | navigation |
| Frontend/src/app/features/admin/AdminLayout.jsx:28 | a  | {`#${href}`} | — | navigation |
| Frontend/src/app/features/admin/AdminLayout.jsx:38 | AdminUserProjectFilter "Phạm vi dự án" | {"onChange":"{id=>navigate(path,id)}"} | — | navigation |
| Frontend/src/app/features/admin/AdminProjectDetail.jsx:38 | AdminProjectLifecycle  | {"onSaved":"{result=>{setLifecycleNotice(result.archived?'Đã lưu trữ dự án. Dữ liệu đã lưu vẫn có thể xem và xuất.':'Dự án đang hoạt động. Có thể tiếp tục công việc theo quyền hiện hành.');setRevision(n=>n+1);}}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectDetail.jsx:39 | AdminProjectForm  | {"onCancel":"{()=>setEditing(false)}","onSaved":"{()=>{setEditing(false);setRevision(n=>n+1);}}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectDetail.jsx:39 | button Sửa dự án | {"onClick":"{()=>setEditing(true)}"} | {!!state.data.project.archivedAt} | project |
| Frontend/src/app/features/admin/AdminProjectDetail.jsx:40 | button Tải phiên bản hiện hành | {"onClick":"{state.retry}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectDetail.jsx:41 | ProjectRoleSelect {`Vai trò ${m.displayName}`} | {"onChange":"{e=>setRoleDrafts({...roleDrafts,[m.userId]:e.target.value})}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectDetail.jsx:41 | button Lưu vai trò | {"onClick":"{()=>mutate(async()=>{await api.setMember(id,m.userId,{projectRole:roleDrafts[m.userId],expectedVersion:m.version});setRoleDrafts(old=>{const next={...old};delete next[m.userId];return next;});})}"} | {!roleDrafts[m.userId]} | project |
| Frontend/src/app/features/admin/AdminProjectDetail.jsx:41 | button Gỡ | {"onClick":"{()=>mutate(()=>api.removeMember(id,m.userId,m.version))}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectDetail.jsx:42 | MemberPicker  | {"onChange":"{setSelected}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectDetail.jsx:42 | button  | {"onClick":"{saveSelected}"} | {!selected.length} | project |
| Frontend/src/app/features/admin/AdminProjectDetail.jsx:43 | a Xem nhật ký dự án | {`#/admin/audit?projectId=${id}`} | — | project |
| Frontend/src/app/features/admin/AdminProjectDropdown.jsx:69 | div  | {"onBlur":"{event=>{if(!event.currentTarget.contains(event.relatedTarget))close();}}","onKeyDown":"{event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close(true);}}}"} | — | picker |
| Frontend/src/app/features/admin/AdminProjectDropdown.jsx:74 | button  | {"onClick":"{()=>open?close():show()}","onKeyDown":"{event=>{if(event.key==='ArrowDown'\|\|event.key==='ArrowUp'){event.preventDefault();if(!open)show();}}}"} | — | picker |
| Frontend/src/app/features/admin/AdminProjectDropdown.jsx:82 | input "Tìm dự án theo tên hoặc mã" | {"onChange":"{event=>{setActive(-1);onSearch(event.target.value);}}","onKeyDown":"{searchKey}"} | — | picker |
| Frontend/src/app/features/admin/AdminProjectDropdown.jsx:90 | li  | {"onMouseDown":"{event=>event.preventDefault()}","onMouseMove":"{()=>setActive(index)}","onClick":"{()=>choose(index)}"} | — | picker |
| Frontend/src/app/features/admin/AdminProjectDropdown.jsx:97 | div  | {"onClick":"{()=>input.current?.focus()}"} | — | picker |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:14 | SelectionTable "Thành viên" | {"onChange":"{ids=>onChange(ids.map(id=>value.find(m=>m.userId===id)\|\|(()=>{const u=state.data.items.find(u=>u.id===id);return {userId:u.id,projectRole:u.role==='PM'?'PM':u.role==='DEV'?'DEV':'TESTER',displayName:u.displayName,username:u.username};})()))}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:15 | input "Tìm tài khoản đang hoạt động" | {"onChange":"{e=>{setKeyword(e.target.value);setPage(0);}}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:15 | select "Lọc vai trò tài khoản" | {"onChange":"{e=>{setRole(e.target.value);setPage(0);}}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:16 | ProjectRoleSelect {'Vai trò '+u.displayName} | {"onChange":"{e=>onChange(value.map(m=>m.userId===u.id?{...m,projectRole:e.target.value}:m))}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:19 | button Người trước | {"onClick":"{()=>setPage(page-1)}"} | {!page} | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:19 | button Người sau | {"onClick":"{()=>setPage(page+1)}"} | {(page+1)*20>=state.data.totalElements} | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:20 | button Bỏ chọn | {"onClick":"{()=>onChange(value.filter(v=>v.userId!==m.userId))}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:30 | AdminFormDialog  | {"onClose":"{onCancel}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:30 | form  | {"onSubmit":"{save}","onInvalid":"{()=>setError('Kiểm tra các trường bắt buộc được đánh dấu; với máy đã chọn, hãy chọn người nhận.')}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:32 | input  | {"onChange":"{e=>setDraft({...draft,code:e.target.value})}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:33 | input  | {"onChange":"{e=>setDraft({...draft,name:e.target.value})}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:34 | textarea  | {"onChange":"{e=>setDraft({...draft,description:e.target.value})}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:35 | input  | {"onChange":"{e=>setDraft({...draft,timezone:e.target.value})}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:37 | MemberPicker  | {"onChange":"{changeMembers}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:37 | InitialDevicePicker  | {"onChange":"{setDevices}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:38 | button  | {} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:38 | button Hủy | {"onClick":"{onCancel}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectForm.jsx:38 | button Tải version hiện hành, giữ bản nháp | {"onClick":"{reloadVersion}"} | — | project |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:29 | button  | {"onClick":"{()=>setOpen(true)}"} | {pendingChanges} | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:29 | a Xem nhật ký dự án | {`#/admin/audit?projectId=${encodeURIComponent(projectId)}`} | — | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:32 | LifecycleDialog  | {"onCancel":"{()=>setOpen(false)}","onSaved":"{saved}"} | — | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:38 | button Lịch sử lưu trữ / mở lại | {"onClick":"{()=>setOpen(value=>!value)}"} | — | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:46 | button Lịch sử trước | {"onClick":"{()=>setPage(value=>value-1)}"} | {!page} | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:46 | button Lịch sử sau | {"onClick":"{()=>setPage(value=>value+1)}"} | {(page+1)*20>=state.data.totalElements} | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:76 | button Hủy | {"onClick":"{onCancel}"} | {busy} | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:82 | a Thu hồi thiết bị | {`#/admin/devices?projectId=${encodeURIComponent(projectId)}`} | — | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:89 | form  | {"onSubmit":"{submit}"} | — | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:90 | textarea  | {"onChange":"{e=>{setReason(e.target.value);if(error?.status===422)setError(null);}}"} | {busy\|\|uncertain} | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:92 | button  | {} | {busy\|\|state.loading\|\|!applicable\|\|needsReview\|\|!reason.trim()} | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:93 | button Thử lưu lại | {"onClick":"{()=>submit(null,true)}"} | {busy} | lifecycle |
| Frontend/src/app/features/admin/AdminProjectLifecycle.jsx:94 | button Kiểm tra lại, giữ lý do | {"onClick":"{refresh}"} | {busy\|\|state.loading} | lifecycle |
| Frontend/src/app/features/admin/AdminProjects.jsx:14 | button Tạo dự án mới | {"onClick":"{()=>setCreating(true)}"} | — | project |
| Frontend/src/app/features/admin/AdminProjects.jsx:14 | AdminProjectForm  | {"onCancel":"{()=>setCreating(false)}","onSaved":"{p=>{if(!mounted.current)return;setCreating(false);window.location.hash=`/admin/projects/${p.id}`;state.retry();}}"} | — | project |
| Frontend/src/app/features/admin/AdminProjects.jsx:14 | form  | {"onSubmit":"{e=>e.preventDefault()}"} | — | project |
| Frontend/src/app/features/admin/AdminProjects.jsx:14 | input  | {"onChange":"{e=>{setKeyword(e.target.value);setPage(0);}}"} | — | project |
| Frontend/src/app/features/admin/AdminProjects.jsx:15 | button Trang trước | {"onClick":"{()=>setPage(page-1)}"} | {!page} | project |
| Frontend/src/app/features/admin/AdminProjects.jsx:15 | button Trang sau | {"onClick":"{()=>setPage(page+1)}"} | {(page+1)*20>=state.data.totalElements} | project |
| Frontend/src/app/features/admin/AdminProjects.jsx:22 | button Tải lại | {"onClick":"{state.retry}"} | — | project |
| Frontend/src/app/features/admin/AdminProjects.jsx:22 | a máy vật lý đang giữ | {`#/admin/devices?projectId=${p.id}`} | — | project |
| Frontend/src/app/features/admin/AdminUserProjectFilter.jsx:28 | button Dự án trước | {"onClick":"{()=>setPage(page-1)}"} | {!page} | picker |
| Frontend/src/app/features/admin/AdminUserProjectFilter.jsx:28 | button Dự án tiếp | {"onClick":"{()=>setPage(page+1)}"} | {(page+1)*100>=state.data.totalElements} | picker |
| Frontend/src/app/features/admin/AdminUserProjectFilter.jsx:30 | AdminProjectDropdown {label} | {"onChange":"{choose}","onSearch":"{setSearch}","onReset":"{()=>{setSearch('');setKeyword('');setPage(0);}}"} | — | picker |
| Frontend/src/app/features/admin/AdminUserProjectFilter.jsx:33 | select  | {"onChange":"{event=>choose(event.target.value)}"} | — | picker |
| Frontend/src/app/features/admin/AdminUsers.jsx:15 | button Tạo tài khoản | {"onClick":"{()=>{setNotice('');setCreating(true);}}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:15 | UserForm  | {"onCancel":"{()=>setCreating(false)}","onSaved":"{name=>{setNotice(`Đã tạo tài khoản ${name}.`);setCreating(false);state.retry();}}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:16 | input  | {"onChange":"{e=>filter('keyword',e.target.value)}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:16 | select  | {"onChange":"{e=>filter('role',e.target.value)}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:16 | select  | {"onChange":"{e=>filter('enabled',e.target.value)}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:16 | AdminUserProjectFilter  | {"onChange":"{id=>filter('projectId',id)}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:17 | button Tải dữ liệu hiện hành | {"onClick":"{state.retry}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:17 | a  | {`#/admin/projects/${m.projectId}`} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:17 | button  | {"onClick":"{()=>update(u,{enabled:!u.enabled})}"} | {busy\|\|u.id===user.id} | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:17 | button  | {"onClick":"{()=>update(u,{canCreateUsers:!u.canCreateUsers})}"} | {busy} | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:17 | button Trang trước | {"onClick":"{()=>setFilters({...filters,page:filters.page-1})}"} | {!filters.page} | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:17 | button Trang sau | {"onClick":"{()=>setFilters({...filters,page:filters.page+1})}"} | {(filters.page+1)*20>=state.data.totalElements} | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:22 | AdminFormDialog  | {"onClose":"{onCancel}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:22 | form  | {"onSubmit":"{save}","onInvalid":"{()=>setError('Kiểm tra các trường bắt buộc được đánh dấu trước khi lưu.')}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:22 | input  | {"onChange":"{e=>setDraft({...draft,username:e.target.value})}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:22 | input  | {"onChange":"{e=>setDraft({...draft,displayName:e.target.value})}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:22 | input  | {"onChange":"{e=>setDraft({...draft,password:e.target.value})}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:22 | select  | {"onChange":"{e=>setDraft({...draft,role:e.target.value})}"} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:22 | button  | {} | — | users |
| Frontend/src/app/features/admin/AdminUsers.jsx:22 | button Hủy | {"onClick":"{onCancel}"} | — | users |
| Frontend/src/app/features/admin/DeviceAllocationDialog.jsx:14 | AdminFormDialog  | {"onClose":"{onCancel}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAllocationDialog.jsx:14 | form  | {"onSubmit":"{save}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAllocationDialog.jsx:15 | select  | {"onChange":"{e=>setCondition(e.target.value)}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAllocationDialog.jsx:15 | AdminUserProjectFilter "Dự án nhận máy" | {"onChange":"{id=>{setProjectId(id);setRecipient('');}}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAllocationDialog.jsx:15 | select  | {"onChange":"{e=>setRecipient(e.target.value)}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAllocationDialog.jsx:15 | input  | {"onChange":"{e=>setDate(e.target.value)}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAllocationDialog.jsx:16 | textarea  | {"onChange":"{e=>setNote(e.target.value)}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAllocationDialog.jsx:16 | button Xác nhận | {} | — | inventory |
| Frontend/src/app/features/admin/DeviceAllocationDialog.jsx:16 | button Hủy | {"onClick":"{onCancel}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAllocationDialog.jsx:16 | button Tải phiên bản hiện hành, giữ bản nháp | {"onClick":"{reload}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAssetForm.jsx:10 | AdminFormDialog  | {"onClose":"{onCancel}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAssetForm.jsx:10 | form  | {"onSubmit":"{save}","onInvalid":"{()=>setError('Kiểm tra các trường bắt buộc được đánh dấu trước khi lưu.')}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAssetForm.jsx:11 | input  | {"onChange":"{e=>setDraft({...draft,[key]:e.target.value})}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAssetForm.jsx:12 | select  | {"onChange":"{e=>setDraft({...draft,type:e.target.value})}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAssetForm.jsx:13 | select  | {"onChange":"{e=>setDraft({...draft,conditionCode:e.target.value})}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAssetForm.jsx:14 | textarea  | {"onChange":"{e=>setDraft({...draft,notes:e.target.value})}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAssetForm.jsx:15 | button  | {} | — | inventory |
| Frontend/src/app/features/admin/DeviceAssetForm.jsx:15 | button Hủy | {"onClick":"{onCancel}"} | — | inventory |
| Frontend/src/app/features/admin/DeviceAssetForm.jsx:15 | button Tải phiên bản hiện hành, giữ bản nháp | {"onClick":"{reload}"} | — | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:14 | select  | {"onChange":"{e=>setBulkRecipient(e.target.value)}"} | — | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:15 | button Áp dụng cho máy đã chọn | {"onClick":"{()=>onChange(value.map(a=>({...a,recipientUserId:bulkRecipient})))}"} | {!validRecipient(bulkRecipient)} | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:18 | button Điền người nhận còn thiếu | {"onClick":"{()=>recipientRefs.current[missing[0].assetId]?.focus()}"} | — | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:20 | SelectionTable "Máy sẵn sàng" | {"onChange":"{ids=>onChange(ids.map(id=>value.find(a=>a.assetId===id)\|\|(()=>{const a=state.data.items.find(a=>a.id===id);return {assetId:a.id,assetCode:a.assetCode,model:a.model,expectedVersion:a.version,recipientUserId:'',expectedReturnOn:'',handoverNote:''};})()))}"} | — | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:21 | input "Tìm máy sẵn sàng" | {"onChange":"{e=>{setKeyword(e.target.value);setPage(0);}}"} | — | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:25 | button "Tải lại máy sẵn sàng" | {"onClick":"{state.retry}"} | {state.loading} | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:26 | button Máy trước | {"onClick":"{()=>setPage(page-1)}"} | {state.loading\|\|!state.data\|\|!page} | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:26 | button Máy sau | {"onClick":"{()=>setPage(page+1)}"} | {state.loading\|\|!state.data\|\|(page+1)*20>=state.data.totalElements} | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:29 | select  | {"onChange":"{e=>change(a.assetId,'recipientUserId',e.target.value)}"} | — | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:29 | input  | {"onChange":"{e=>change(a.assetId,'expectedReturnOn',e.target.value)}"} | — | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:29 | textarea  | {"onChange":"{e=>change(a.assetId,'handoverNote',e.target.value)}"} | — | inventory |
| Frontend/src/app/features/admin/InitialDevicePicker.jsx:29 | button Bỏ máy | {"onClick":"{()=>onChange(value.filter(s=>s.assetId!==a.assetId))}"} | — | inventory |
| Frontend/src/app/features/admin/ProjectRoleSelect.jsx:7 | select {label} | {"onChange":"{onChange}"} | — | picker |
| Frontend/src/app/features/admin/ProjectStatusReports.jsx:35 | form  | {"onSubmit":"{submit}"} | — | progress |
| Frontend/src/app/features/admin/ProjectStatusReports.jsx:36 | textarea  | {"onChange":"{e=>update('summary',e.target.value)}"} | — | progress |
| Frontend/src/app/features/admin/ProjectStatusReports.jsx:37 | textarea  | {"onChange":"{e=>update('delayReason',e.target.value)}"} | — | progress |
| Frontend/src/app/features/admin/ProjectStatusReports.jsx:38 | textarea  | {"onChange":"{e=>update('recoveryPlan',e.target.value)}"} | — | progress |
| Frontend/src/app/features/admin/ProjectStatusReports.jsx:39 | input  | {"onChange":"{e=>update('expectedFinishOn',e.target.value)}"} | — | progress |
| Frontend/src/app/features/admin/ProjectStatusReports.jsx:41 | button  | {} | — | progress |
| Frontend/src/app/features/admin/ProjectStatusReports.jsx:43 | button Tải cảnh báo hiện hành | {"onClick":"{state.retry}"} | — | progress |
| Frontend/src/app/features/admin/ProjectStatusReports.jsx:47 | button Báo cáo trước | {"onClick":"{()=>setPage(page-1)}"} | {!page} | progress |
| Frontend/src/app/features/admin/ProjectStatusReports.jsx:47 | button Báo cáo tiếp | {"onClick":"{()=>setPage(page+1)}"} | {(page+1)*20>=data.reports.totalElements} | progress |
| Frontend/src/app/features/admin/shared.jsx:23 | button Thử lại | {"onClick":"{retry}"} | — | read |
| Frontend/src/app/features/admin/shared.jsx:28 | a · | {`#/admin/projects/${p.id}${scope}`} | — | read |
| Frontend/src/app/features/projects/CatalogEditor.jsx:34 | form {item ? 'Sửa danh mục' : 'Thêm danh mục'} | {"onSubmit":"{save}","onInvalid":"{()=>setError('Kiểm tra các trường bắt buộc được đánh dấu trước khi lưu danh mục.')}"} | — | catalog |
| Frontend/src/app/features/projects/CatalogEditor.jsx:39 | input  | {"onChange":"{event => setForm({ ...form, [field.key]: event.target.value })}"} | {!!item && field.key === 'code'} | catalog |
| Frontend/src/app/features/projects/CatalogEditor.jsx:42 | button  | {} | {busy} | catalog |
| Frontend/src/app/features/projects/CatalogEditor.jsx:42 | button Hủy | {"onClick":"{onClose}"} | {busy} | catalog |
| Frontend/src/app/features/projects/CatalogPage.jsx:111 | button Sửa | {"onClick":"{() => setEditor({ item })}"} | {archiving!==null \|\| !!editor} | catalog |
| Frontend/src/app/features/projects/CatalogPage.jsx:113 | button  | {"onClick":"{() => handleArchive(item)}"} | {archiving!==null \|\| !!editor} | catalog |
| Frontend/src/app/features/projects/CatalogPage.jsx:129 | button Thêm mới | {"onClick":"{() => setEditor({ item: null })}"} | {archiving!==null \|\| !!editor} | catalog |
| Frontend/src/app/features/projects/CatalogPage.jsx:137 | button  | {"onClick":"{() => setActiveType(type.id)}"} | {archiving!==null \|\| !!editor} | catalog |
| Frontend/src/app/features/projects/CatalogPage.jsx:148 | CatalogEditor  | {"onClose":"{() => {setEditor(null);setReload(value=>value+1);}}","onSaved":"{() => {setNotice('Đã lưu danh mục.');setEditor(null);setReload(value=>value+1);}}"} | — | catalog |
| Frontend/src/app/features/projects/CatalogPage.jsx:154 | button Thử lại | {"onClick":"{()=>setReload(value=>value+1)}"} | — | catalog |
| Frontend/src/app/features/projects/CreateProjectDialog.jsx:46 | button "Đóng" | {"onClick":"{onClose}"} | {loading} | settings |
| Frontend/src/app/features/projects/CreateProjectDialog.jsx:48 | form  | {"onSubmit":"{handleSubmit}"} | — | settings |
| Frontend/src/app/features/projects/CreateProjectDialog.jsx:53 | input  | {"onChange":"{handleChange}"} | — | settings |
| Frontend/src/app/features/projects/CreateProjectDialog.jsx:66 | input  | {"onChange":"{handleChange}"} | — | settings |
| Frontend/src/app/features/projects/CreateProjectDialog.jsx:78 | textarea  | {"onChange":"{handleChange}"} | — | settings |
| Frontend/src/app/features/projects/CreateProjectDialog.jsx:89 | select  | {"onChange":"{handleChange}"} | — | settings |
| Frontend/src/app/features/projects/CreateProjectDialog.jsx:102 | button Hủy | {"onClick":"{onClose}"} | {loading} | settings |
| Frontend/src/app/features/projects/CreateProjectDialog.jsx:105 | button  | {} | {loading} | settings |
| Frontend/src/app/features/projects/HandbookPanel.jsx:18 | button Thêm tài liệu | {"onClick":"{()=>setEditor({item:null})}"} | {!!editor} | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:20 | button Thử lại | {"onClick":"{()=>setReload(x=>x+1)}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:22 | HandbookEditor  | {"onClose":"{()=>setEditor(null)}","onSaved":"{()=>{setNotice('Đã lưu tài liệu.');setEditor(null);setSelected(null);setReload(x=>x+1);}}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:24 | button · v | {"onClick":"{()=>setSelected(item.id)}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:25 | HandbookDetail  | {"onEdit":"{item=>setEditor({item})}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:32 | button Thử lại | {"onClick":"{()=>setReload(x=>x+1)}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:34 | button Thêm phiên bản | {"onClick":"{()=>onEdit(data)}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:37 | summary Lịch sử chỉnh sửa ( ) | {} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:48 | form  | {"onSubmit":"{save}","onInvalid":"{()=>setError('Kiểm tra các trường bắt buộc được đánh dấu trước khi lưu tài liệu.')}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:51 | input  | {"onChange":"{e=>setForm({...form,code:e.target.value})}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:51 | input  | {"onChange":"{e=>setForm({...form,name:e.target.value})}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:52 | select  | {"onChange":"{e=>setForm({...form,resourceType:e.target.value})}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:53 | textarea  | {"onChange":"{e=>setForm({...form,contentHtml:e.target.value})}"} | — | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:55 | button Lưu tài liệu | {} | {busy} | handbook |
| Frontend/src/app/features/projects/HandbookPanel.jsx:55 | button Hủy | {"onClick":"{onClose}"} | {busy} | handbook |
| Frontend/src/app/features/projects/ProjectDeviceAssignDialog.jsx:29 | AdminFormDialog  | {"onClose":"{onClose}"} | — | inventory |
| Frontend/src/app/features/projects/ProjectDeviceAssignDialog.jsx:29 | form  | {"onSubmit":"{save}"} | — | inventory |
| Frontend/src/app/features/projects/ProjectDeviceAssignDialog.jsx:31 | a Mở thành viên dự án | {`#/admin/projects/${projectId}`} | — | inventory |
| Frontend/src/app/features/projects/ProjectDeviceAssignDialog.jsx:32 | InitialDevicePicker  | {"onChange":"{changeSelected}"} | — | inventory |
| Frontend/src/app/features/projects/ProjectDeviceAssignDialog.jsx:36 | button  | {} | {!selected.length} | inventory |
| Frontend/src/app/features/projects/ProjectDeviceAssignDialog.jsx:36 | button Hủy | {"onClick":"{onClose}"} | — | inventory |
| Frontend/src/app/features/projects/ProjectDeviceAssignDialog.jsx:36 | a Nhập máy mới vào kho | "#/admin/devices" | — | inventory |
| Frontend/src/app/features/projects/ProjectDevices.jsx:10 | button Bổ sung máy vào dự án | {"onClick":"{()=>setAdding(true)}"} | — | inventory |
| Frontend/src/app/features/projects/ProjectDevices.jsx:11 | a Danh mục dự án | {`#/settings/catalogs?workspace=1&projectId=${projectId}&type=devices`} | — | inventory |
| Frontend/src/app/features/projects/ProjectDevices.jsx:12 | a Mở kho / nhập máy mới | "#/admin/devices" | — | inventory |
| Frontend/src/app/features/projects/ProjectDevices.jsx:12 | AllocationTable  | {"onReturn":"{admin?a=>setReturning(a):undefined}"} | — | inventory |
| Frontend/src/app/features/projects/ProjectDevices.jsx:12 | button Máy trước | {"onClick":"{()=>setPage(page-1)}"} | {!page} | inventory |
| Frontend/src/app/features/projects/ProjectDevices.jsx:12 | button Máy sau | {"onClick":"{()=>setPage(page+1)}"} | {(page+1)*20>=state.data.totalElements} | inventory |
| Frontend/src/app/features/projects/ProjectDevices.jsx:13 | ProjectDeviceAssignDialog  | {"onClose":"{()=>setAdding(false)}","onChanged":"{count=>{setNotice(`Đã bàn giao ${count} máy. Danh sách đã được cập nhật.`);setPage(0);setReload(n=>n+1);}}"} | — | inventory |
| Frontend/src/app/features/projects/ProjectDevices.jsx:14 | DeviceAllocationDialog  | {"onCancel":"{()=>setReturning(null)}","onSaved":"{()=>{setReturning(null);setReload(n=>n+1);setNotice('Đã thu hồi máy.');}}"} | — | inventory |
| Frontend/src/app/features/projects/ProjectMembers.jsx:24 | button Thêm thành viên | {"onClick":"{()=>setEditor({member:null})}"} | {busy \|\| !!editor} | settings |
| Frontend/src/app/features/projects/ProjectMembers.jsx:26 | button Thử lại | {"onClick":"{()=>setReload(x=>x+1)}"} | {busy} | settings |
| Frontend/src/app/features/projects/ProjectMembers.jsx:27 | MemberEditor  | {"onClose":"{()=>setEditor(null)}","onSaved":"{()=>{setEditor(null);setReload(x=>x+1);onMembershipChange();}}"} | — | settings |
| Frontend/src/app/features/projects/ProjectMembers.jsx:29 | button Sửa vai trò | {"onClick":"{()=>setEditor({member})}"} | {busy \|\| !!editor} | settings |
| Frontend/src/app/features/projects/ProjectMembers.jsx:29 | button Gỡ | {"onClick":"{()=>remove(member)}"} | {busy \|\| !!editor} | settings |
| Frontend/src/app/features/projects/ProjectMembers.jsx:42 | form  | {"onSubmit":"{save}"} | — | settings |
| Frontend/src/app/features/projects/ProjectMembers.jsx:46 | input  | {"onChange":"{e=>{setUsername(e.target.value);setCandidate(null);}}"} | — | settings |
| Frontend/src/app/features/projects/ProjectMembers.jsx:46 | button Tìm tài khoản | {"onClick":"{lookup}"} | {!username.trim()} | settings |
| Frontend/src/app/features/projects/ProjectMembers.jsx:48 | select  | {"onChange":"{e=>setRole(e.target.value)}"} | — | settings |
| Frontend/src/app/features/projects/ProjectMembers.jsx:50 | button Lưu thành viên | {} | {busy \|\| !candidate} | settings |
| Frontend/src/app/features/projects/ProjectMembers.jsx:50 | button Hủy | {"onClick":"{onClose}"} | {busy} | settings |
| Frontend/src/app/features/projects/ProjectSelector.jsx:37 | div  | {"onKeyDown":"{event => { if (event.key === 'Escape' && open) { event.stopPropagation(); closeMenu(); } }}","onBlur":"{event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}"} | — | navigation |
| Frontend/src/app/features/projects/ProjectSelector.jsx:40 | button Thử lại | {"onClick":"{() => projectContext.refreshProjects()}"} | — | navigation |
| Frontend/src/app/features/projects/ProjectSelector.jsx:41 | button  | {"onClick":"{() => setOpen(!open)}"} | — | navigation |
| Frontend/src/app/features/projects/ProjectSelector.jsx:55 | div  | {"onClick":"{closeMenu}"} | — | navigation |
| Frontend/src/app/features/projects/ProjectSelector.jsx:63 | button  | {"onClick":"{() => {\r\n                        selectProject(p.id);\r\n                        closeMenu();\r\n                      }}"} | — | navigation |
| Frontend/src/app/features/projects/ProjectSelector.jsx:80 | button  | {"onClick":"{() => {\r\n                    closeMenu();\r\n                    window.location.hash='/admin/projects';\r\n                  }}"} | — | navigation |
| Frontend/src/app/features/projects/ProjectSettingsPage.jsx:26 | a Quản lý thành viên tại khu Admin | {`#/admin/projects/${project.id}`} | — | settings |
| Frontend/src/app/features/projects/ProjectSettingsPage.jsx:51 | form  | {"onSubmit":"{save}"} | — | settings |
| Frontend/src/app/features/projects/ProjectSettingsPage.jsx:52 | button Tải lại thông tin | {"onClick":"{()=>{setMessage('');setReload(x=>x+1);}}"} | {busy} | settings |
| Frontend/src/app/features/projects/ProjectSettingsPage.jsx:55 | input  | {} | true | settings |
| Frontend/src/app/features/projects/ProjectSettingsPage.jsx:57 | input  | {"onChange":"{e=>setForm({...form,name:e.target.value})}"} | — | settings |
| Frontend/src/app/features/projects/ProjectSettingsPage.jsx:58 | textarea  | {"onChange":"{e=>setForm({...form,description:e.target.value})}"} | — | settings |
| Frontend/src/app/features/projects/ProjectSettingsPage.jsx:59 | input  | {"onChange":"{e=>setForm({...form,timezone:e.target.value})}"} | — | settings |
| Frontend/src/app/features/projects/ProjectSettingsPage.jsx:61 | button  | {} | {busy} | settings |
| Frontend/src/app/features/projects/RulesPanel.jsx:25 | button Tải lại quy tắc | {"onClick":"{()=>setReload(x=>x+1)}"} | {busy} | rules |
| Frontend/src/app/features/projects/RulesPanel.jsx:27 | button Tạo bộ quy tắc nội bộ | {"onClick":"{()=>mutate(()=>projectsApi.createRuleset(projectId,{code:'INTERNAL_DEMO',name:'Quy tắc báo lỗi nội bộ DEMO'}),'Đã tạo bộ quy tắc nội bộ.')}"} | {busy} | rules |
| Frontend/src/app/features/projects/RulesPanel.jsx:30 | form  | {"onInvalid":"{()=>setError('Kiểm tra các trường bắt buộc được đánh dấu trước khi lưu quy tắc.')}","onSubmit":"{event=>{event.preventDefault();mutate(()=>projectsApi.createRuleVersion(projectId,rule.id,{contentJson:JSON.stringify({schemaVersion:1,scope:'INTERNAL_DEMO',sourceReference:source,titlePrefix:prefix,requiredFields})}),'Đã lưu bản nháp quy tắc.');}}"} | — | rules |
| Frontend/src/app/features/projects/RulesPanel.jsx:32 | input  | {"onChange":"{e=>setSource(e.target.value)}"} | — | rules |
| Frontend/src/app/features/projects/RulesPanel.jsx:33 | input  | {"onChange":"{e=>setPrefix(e.target.value)}"} | — | rules |
| Frontend/src/app/features/projects/RulesPanel.jsx:35 | button Lưu bản nháp | {} | {busy} | rules |
| Frontend/src/app/features/projects/RulesPanel.jsx:38 | RuleVersion  | {"onPublish":"{()=>{if(window.confirm(`Công bố phiên bản ${version.versionNo} cho bug mới trong dự án?`))mutate(()=>projectsApi.publishRule(projectId,rule.id,version.id,rule.activeVersion?.id \|\| 0),`Đã công bố phiên bản ${version.versionNo}.`);}}"} | — | rules |
| Frontend/src/app/features/projects/RulesPanel.jsx:45 | button Công bố phiên bản | {"onClick":"{onPublish}"} | {busy} | rules |
| Frontend/src/app/features/admin/ProjectStatusReports.jsx:31 | a Mở không gian báo cáo tiến độ | #/progress?workspace=1&projectId=<encoded selected project> | — | progress |
