# Rà lại Admin, xác thực và Thông tin chung — 19/10/2026

Checkpoint mới theo yêu cầu rà soát toàn bộ lần nữa. **SOURCE_REVIEW + MOCK_COMPONENT_TESTS; BROWSER/API/DB_NOT_RUN** trong lượt của agent này. Root là người duy nhất kiểm tra browser và sửa Tổng quan. Yêu cầu Tổng quan mới chỉ thay khối Công việc gần đây bằng Thông tin dự án; không được hiểu thành thay toàn trang hoặc thay màn `/settings`.

Không sửa product, source test, STATUS, quyền, tài khoản, cấu hình, process hoặc database. Nhánh vẫn `system-design`; giữ nguyên baseline và thay đổi có sẵn. Không spawn agent mới.

## Phân biệt nguồn hiện tại và bằng chứng cũ

- Đọc báo cáo tổng hiện có: **14 finding**, gồm UX-014 bổ sung sau bản13 mục. Rà lại năm finding thuộc phạm vi được giao, không mặc định mọi finding đã được sửa vì Tổng quan đang được điều chỉnh.
- Đối chiếu SHA256 từ `var/uiux-audit-2026-10-19/baseline.json`: **138/138** file source/test/CSS thuộc Admin/Auth/Projects, primitive chọn/dialog và backend phụ thuộc trong phạm vi không đổi. Thêm **11/11** dependency trực tiếp của API clients, archived Feature và legacy-write gate cũng khớp. Receipt: [admin-general-source-hashes.json](admin-general-source-hashes.json). Đây là snapshot tại thời điểm lấy hash; không khẳng định root sẽ không thay file sau đó.
- Bản inventory34 mục tại [checkpoint trước](../uiux-audit-2026-10-19/admin-general-source.md) còn phù hợp về route/caller/control. Lượt này kiểm lại route hiện tại và dependency, đọc lại đầy đủ các flow trọng yếu; dùng hash để nhận diện các file đã review trước không đổi. Không gọi hash match là một lượt browser hoặc kiểm đầy đủ mọi state.
- Quan sát browser/main readiness/Notes conflict từ báo cáo trước là **lịch sử bằng chứng**; agent không gọi API hoặc mở lại browser để tạo PASS mới. Các giới hạn viewport/keyboard/touch/AT/zoom và runtime tiếp tục mở.

## Kết luận theo finding hiện tại

| Finding | Kết luận mới từ source | Bằng chứng và giới hạn |
| --- | --- | --- |
| UX-002 — P1 có điều kiện | **CÒN MỞ.** Backend chưa có cơ chế ngoại lệ có lý do cho cycle/retest cũ; UI vẫn hướng dẫn hoàn tất luồng đã ngừng | `ProjectLifecycleService.java:35,40–47,71`: sessions/cycles/retests là blocker, canArchive đòi danh sách rỗng. `AdminProjectLifecycle.jsx:8–12,60,83`: hướng dẫn cũ và khóa confirm. `LegacyTestingWrites.java:26–38`: public write controllers cũ trả410 sau kiểm scope. Không suy bỏ hai blocker này là mọi project archive được; máy, công việc và những blocker khác vẫn độc lập. Quyết định người dùng cho ngoại lệ Admin có lý do vẫn là yêu cầu chưa triển khai; không mở rộng thành bỏ qua mọi blocker |
| UX-003 — P2 | **CÒN MỞ.** Tải lại danh sách Note không đổi phiên bản snapshot trong editor | `ProjectNotes.jsx:29,42,46`: save dùng `editor.note.version`, reload chỉ tăng revision của list. `ProjectNotesService.java:34` kiểm expectedVersion đúng. Test hiện có giữ nháp sau409 rồi Hủy; chưa có test phục hồi conflict→reload→save cùng draft. Fresh test PASS không làm finding biến mất |
| UX-010 — P2 | **CÒN MỞ, UI-state mismatch; không phải privilege escalation.** Admin bypass kiểm project.archived ở hai caller Feature | `TestingFeaturesPage.jsx:19`, `TestingFeaturePage.jsx:19`: ADMIN-or-helper. Helper `projectAccess.js:6–9` có điều kiện active nhưng nhánh ADMIN không dùng nó. `FeatureService.java:34–40` từ chối dự án archived trước nhánh ADMIN. Thông tin chung/Note/Rules/Handbook dùng helper đúng, không nên quy toàn bộ UI Admin có cùng lỗi |
| UX-011 — P2 | **CÒN MỞ, giới hạn ở hướng dẫn và contract/publish cũ.** Không kết luận Bug/QA mới bị ép build/device | `RulesPanel.jsx:5,30–37` vẫn sinh requiredFields build/environment/device, nói case/run/ngoại lệ PM và công bố cho Bug mới. `InternalRulePolicy.java:11,29` vẫn yêu cầu đúng tập trường cũ. Active Feature Issue có contract riêng; chỉ sửa text bỏ field ở client có thể làm policy bị422. Cần tách nội dung lịch sử với phần còn hiệu lực, giữ dữ liệu cũ |
| UX-014 — P2 gap UI | **XÁC NHẬN LẠI SOURCE.** PM có `users:create` vẫn không có điểm mở form tạo TESTER | `AccountMenu.jsx:21` chỉ có nhãn được cấp quyền. Search toàn `Frontend/src` cho createUser/users:create cho thấy caller product duy nhất là `AdminUsers.jsx:21`; `AdminApp.jsx:19` chặn mọi non-ADMIN. `IdentityService.java:26–29,59–63` vẫn cho PM được cấp tạo TESTER, không được tạo role khác; `SecurityConfig.java:53–55` tách POST authority khỏi GET/PATCH ADMIN. Không tạo/grant account để thử. Cách sửa không phải mở toàn bộ AdminUsers cho PM vì màn đó đọc toàn users và có lock/delegate |

Không có finding P0/P1 mới được chứng minh trong lượt này. Không hạ các finding trên thành DONE chỉ vì source không đổi hoặc mock suite PASS. Không xác định thời điểm hồi quy nếu chưa có lịch sử trước/sau phù hợp.

## Ma trận rà lại toàn bộ inventory Admin/Auth/General

Mọi dòng dưới có trạng thái **SOURCE_REVIEW; browser mới NOT_RUN**. “Test mới” chỉ nói component với dữ liệu giả; không phải xác nhận backend/quyền thật hoặc hình thức hiển thị tại viewport.

| Inventory cũ | Route/control/biến thể đã kiểm lại | Source/state cần giữ và kết quả lượt mới |
| --- | --- | --- |
| AG-I01 | Login/reauth/unavailable; username/password/reveal/submit/retry | AuthProvider/AuthBoundary vẫn giữ tree theo user ID, hidden/inert khi khóa; test mới phủ loading, retry, login fail, pending,401,expiry và same/different account draft |
| AG-I02 | Account popup/logout/PM delegated hint | Escape/blur/logout busy/error giữ nguyên; fresh auth test PASS. UX-014 vẫn chỉ là hint, không có CTA |
| AG-I03 | `/admin` overview; reload/project/devices/attention/workspace/logout | AdminApp/AdminLayout/Dashboard/shared CSS và API dependency không đổi; chưa gọi overview thật hoặc đo KPI mới |
| AG-I04 | Non-ADMIN đi Admin URL | Guard deny còn nguyên; không browser thử role trong lượt này; backend authority không suy từ UI guard |
| AG-I05 | `/admin/projects[?projectId=]` list/search/scope/page/create | Server search + page controls còn, shared read key/abort/retry; chưa thử concurrent page shrink |
| AG-I06 | Create-project wide modal | Code/name/timezone/PM/member/device fields còn; test mới phủ named modal, Escape/scroll lock/focus, yêu cầu PM và create failure giữ draft |
| AG-I07 | `/admin/projects/:id` summary/manage/role/add/remove/edit/reload | Key theo project; archived disable; partial save loại các member đã thành công khỏi selection; fresh management/feedback tests PASS |
| AG-I08 | Edit-project modal/version retry | Draft và expectedVersion riêng; version reload giữ draft vẫn còn, test mới PASS; chưa so sánh dữ liệu server qua browser |
| AG-I09 | MemberPicker/search/system role/select-all/selected/unselected/pages | `unassignedOnly:true`, enabled-only, DEV role tương thích và off-page selection còn; test mới chọn/filter/page/partial failures PASS |
| AG-I10 | Archive/reopen/refresh/same-key uncertain retry | UX-002 còn; test mới bảo vệ reason, blocker lock, conflict refresh,403,uncertain same-key và Escape focus. Test không có đường ngoại lệ mới |
| AG-I11 | Lifecycle history expansion/page/retry | Source vẫn có empty/read error/paging; test mới có history read retry và paging. Chưa đọc lịch sử thật |
| AG-I12 | Legacy status report history/Analysis link | Read-only history giữ nguyên; không tạo báo cáo cũ; không chạy API/browser report history |
| AG-I13 | `/admin/users` filters/lock/unlock/PM delegation | Self-lock disabled; versioned updates; test mới phủ lock/unlock/delegation/filter paging; không cấp/thu quyền thật |
| AG-I14 | Create-account modal | ADMIN form vẫn tạo TESTER/DEV/PM/ADMIN; validation/error/busy/cancel; mock create-only tests PASS, không tạo account. PM không có caller, UX-014 |
| AG-I15 | `/admin/devices` list/history/project/search/condition/page/editor | State generation bảo vệ callback của editor cũ vẫn có; no new runtime. Page sau return chưa clamp đầy đủ, R04 còn |
| AG-I16 | New/edit physical asset/version reload | Fields, condition, notes, busy close giữ nguyên; không chạy write hoặc full asset editor behavior trong suite mới |
| AG-I17 | Assign single machine/project/PM/date/note | Active PM filter, missing-project/members-loading/recipient validation còn; chưa submit assign trong browser/API; không mở lại mô hình giao máy cho từng member |
| AG-I18 | Return machine/condition/note/version reload | Existing allocation/returned conflict handling còn; không return máy hoặc sửa tài sản thật |
| AG-I19 | Allocation current/history table | PM recipient + assign/return actors/dates/notes còn; returned rows không có button return; no new geometry/format runtime |
| AG-I20 | `/admin/audit` keyword/project/from/through/reload/page | Không type/timezone selector, hiển thị giờ Việt Nam; fresh mock test xác nhận query/date display/page reset. Backend ngày biên chưa gọi lại |
| AG-I21 | `/admin/ai` retirement adapter | Entry cũ không quay lại sidebar; chat/config do root/AI reviewer phụ trách; chưa mở adapter |
| AG-I22 | Unknown Admin URL fallback | Có return overview; không browser đi URL mới |
| AG-I23 | Workspace project selector/archived marker/retry/Admin create link | Source current chooser và ProjectProvider giống baseline; keyboard/menu dài/project switch runtime chưa chạy mới |
| AG-I24 | `/settings` General/read-only/save/reload | Helper active project đúng; explicit reload sau lỗi thay form. Chưa sửa General; yêu cầu chỉ đổi khối Tổng quan không cho thay trang này |
| AG-I25 | `/settings/members` member list/Admin manage link | Routed ProjectMembers luôn canEdit=false; legacy MemberEditor không thành active entry chỉ vì export/test tồn tại. Admin link tới centralized project management còn |
| AG-I26 | Project-held physical devices | Nonadmin endpoint chỉ đọc; Admin supplement active only, return action được giữ theo quyền quản lý tài sản. Không suy archive project phải chặn thu hồi máy |
| AG-I27 | Supplement selected machines/one PM/partial failure | Loop từng máy, saved count và remaining selection còn; member load error/no PM/help links còn. Fresh test PM recipient/picker PASS, chưa submit full handover |
| AG-I28 | Note list/loading/empty/read retry/page/permission | Fresh Notes tests PASS cho literal text, read-only controls, retry, stale project response, capability loss, final-page recovery; UX-003 chưa được phủ đường phục hồi |
| AG-I29 | Note inline create/edit/save/cancel | Version snapshot vẫn nguyên sau list reload; create/save subsequent edit tests PASS không đồng nghĩa409 recovery PASS |
| AG-I30 | Note delete inline confirm/keep/error | Test mới xác nhận chưa request trước confirm, error giữ Note, remove success/page recovery. Không browser/API delete mới |
| AG-I31 | `/settings/rules` absent/existing/draft/published/history | UX-011 còn. Role helper và DEMO disclaimer giữ nguyên; không publish hoặc sửa policy |
| AG-I32 | `/settings/handbook` new/revision/list/detail/history | Plain text, immutable revision expectedCurrentRevisionId giữ; revision branch không autofocus, trigger bị ẩn khi editor mở. R12 vẫn cần browser keyboard/data fixture |
| AG-I33 | `/settings/catalogs` compatibility adapter | Router chuyển thông báo sang Note; CatalogPage/Editor source cũ không là màn active |
| AG-I34 | Legacy exported MemberEditor/CreateProjectDialog | Caller active không quay lại dùng; giữ NOT_APPLICABLE_ACTIVE_ROUTE. Không tăng số màn từ file không reachable |

## Rủi ro và điều thu hẹp sau lần đọc lại

- **R01/nháp form dài:** AdminFormDialog vẫn đóng khi Escape/X/Hủy nếu không busy, parent unmount local draft. Test mới khẳng định close/focus hoạt động, không kiểm giữ draft; bằng chứng Admin mất nháp trước thuộc root. Không quy mọi Cancel chủ động là bug. Pending Admin dialogs đã truyền busy; không gộp với Issue caller bỏ busy.
- **R04/trang cuối:** AdminDevices/ProjectDevices vẫn không tự clamp sau trả máy giảm số trang; Previous còn để phục hồi. Chưa có fixture hoặc browser repro mới; không gọi toàn bộ list ngõ cụt.
- **R12/keyboard:** AdminProjectDropdown role=dialog không aria-modal=false làm modal hook coi nó là dialog topmost; chưa chứng minh focus thoát/hỏng. Handbook add-revision thiếu autofocus và mất trigger là nguồn rủi ro riêng. Fresh project-picker test phủ Arrow/End/Enter/Escape/Tab/outside click độc lập, chưa phủ picker lồng Admin modal.
- **Thu hẹp nghi ngờ General save→refresh lỗi:** General có message sau update, nhưng ProjectProvider.refreshProjects tự catch rồi đặt currentProject=null/error. Không thể mặc định lỗi refresh sẽ đi vào catch cục bộ của General hoặc hai thông báo sẽ cùng hiện. Cần fixture cho save-success/provider-refresh-failure để đánh giá actual screen; không nâng thành finding mới từ suy luận cũ.
- **Timezone:** giữ kết luận bác bỏ nghi ngờ02:08 fixture trước: seed19:08UTC tương ứng02:08 Việt Nam. Không lấy giờ hiện tại khác giờ tạo làm lỗi. Fresh audit-date mock PASS chỉ xác nhận fixture date formatter/query, không đo mọi timezone/runtime.
- **Quyền đã chốt:** PM AI global READ không cấp global CRUD; ADMIN không cần membership trên project active. Note read/write scope do backend kiểm. Không mở quyền thành viên/thiết bị cho PM chỉ để che UX-014. Các helper active/read-only của General/Note/Rules/Handbook không cùng bypass như TestingFeaturesPage.
- **Boundary UI/API:** backend Notes409, archived Feature409 và PM role restriction là bảo vệ đúng; hướng sửa không bỏ version/scope/role checks. Source có CSRF và same-origin client, không có browser/localStorage credential trong luồng đã đọc; đây không phải một đợt pentest.

## Kiểm thử mới và bằng chứng

Đã đọc `Frontend/vite.config.js` và `src/test/setup.js`: jsdom, setup chỉ jest-dom/cleanup, không global setup gọi dịch vụ. Các file được chọn truyền API fake hoặc mock module; auth client dùng fetchImpl giả trả Response cục bộ. Không chạy script native/backend, seed, API HTTP hoặc DB. Không thêm test chỉ để tạo PASS.

Lệnh mới tại `Frontend`:

```text
rtk proxy npm.cmd test -- src/app/features/auth/auth.test.jsx src/app/features/projects/ProjectNotes.test.jsx src/app/features/admin/fixreports-members.test.jsx src/app/features/admin/fixreports-handover.test.jsx src/app/features/admin/fixreports-audit.test.jsx src/app/features/admin/admin-management.test.jsx src/app/features/admin/admin-dialog.test.jsx src/app/features/admin/admin-member-feedback.test.jsx src/app/features/admin/project-picker.test.jsx src/app/features/admin/AdminProjectLifecycle.test.jsx src/app/components/SelectionTable.test.jsx --reporter=json --outputFile=../var/uiux-recheck-2026-10-19/admin-general-tests.json
```

**Kết quả mới:60/60 test,11 file PASS, exit0.** Vitest JSON ghi13 grouped suites, không phải13 file; `testResults` có11 file. [Receipt đầy đủ](admin-general-tests.json). Coverage **NOT_MEASURED**; không build/lint/backend test trong lượt này. Không cộng60 với78/980 của lượt trước để suy coverage hoặc tổng runtime PASS.

Đọc test cho thấy khoảng trống vẫn còn: không PM delegated create form route; Note conflict test dừng ở giữ nháp/Hủy; lifecycle test vẫn chỉ cấm archive khi legacy blockers còn; không test Admin create Feature trên archived project; không current Rules policy-vs-FeatureIssue end-to-end. Vì vậy mock PASS phù hợp với việc năm finding vẫn mở.

## Skill → việc thực hiện → bằng chứng

Các SKILL.md `code-review`, `frontend-patterns`, `frontend-ui-engineering`, `security-review`, `api-design` đã được đọc trong cùng cuộc làm việc, không đọc/cài lại thư viện chỉ để tăng danh sách. Lượt này:

| Skill | Việc đã áp dụng | Bằng chứng/giới hạn |
| --- | --- | --- |
| code-review | Đối chiếu toàn inventory34 mục và năm finding với code/caller/spec hiện tại; phân biệt file active/legacy | Ma trận, hash138+11, UX-014 full caller search; không diff-only hoặc suy regression |
| frontend-patterns | Trace Notes editor/list version, General/provider refresh, project keys và request/editor generation | UX-003/R04/R12 và phần thu hẹp General; chỉ source, không browser race mới |
| frontend-ui-engineering | Xem modal busy/dirty, focus return, picker keyboard và revision editor | Fresh mock dialog/project-picker tests; no viewport/touch/AT/zoom claim |
| security-review | Đối chiếu PM delegated POST/ADMIN GET-PATCH, archived guard, identity retention, Note project scope | UX-010/014, SecurityConfig/IdentityService/AuthBoundary; không grant hoặc tạo account |
| api-design | Kiểm expectedVersion, archive command không có override, Notes get/list/write, legacy410 boundary | Source findings và mock lifecycle/Notes; không đổi contract/API hoặc gọi backend |

## Việc root cần giữ khi tổng hợp

Giữ cả năm finding UX-002/003/010/011/014 ở trạng thái mở đúng mức bằng chứng. Không dùng suite60 PASS để ghi “mọi nút Admin/General đã hoạt động”. Những controls handover, return, membership thực, account/grant, Rules publish, archived exception và keyboard nested vẫn cần fixture/runtime phù hợp khi người dùng cho triển khai sửa. Chỉ thay khối Tổng quan theo yêu cầu mới; các sửa khác vẫn cần đúng phạm vi được giao, không tự triển khai toàn repair plan từ checkpoint này.
