# Ma trận truy vết và nghiệm thu TMS

Ngày chốt: **06/10/2026**. Đi cùng [PRD](PRD.md), [đặc tả](SYSTEM-SPECIFICATION.md) và [review](../reviews/2026-10-06-system-workflow-review.md). Đây là danh sách hành vi cần đạt và bằng chứng hiện tại, **không phải tất cả kịch bản đã PASS**.

## 1. Cách đọc trạng thái

- `SOURCE`: tìm thấy đường code/API tương ứng; chưa chạy toàn hành trình trong lượt này.
- `REGRESSION`: có test được thực sự chạy, chỉ chứng minh phạm vi test đó.
- `GAP`: thiếu một mắt xích so với yêu cầu mới, chờ thiết kế/implementation.
- `PENDING_NATIVE/UAT`: chưa kiểm chứng trên schema cô lập và người dùng thật.
- Tên test trong bảng thể hiện nơi kiểm chứng hoặc test dự kiến; chỉ cột bằng chứng chạy mới là kết quả.

## 2. Baseline audit trước triển khai F/Q

Bảng này và kết quả lượt audit ở mục5 giữ trạng thái tại thời điểm V16 trước implementation F/Q. Các dòng GAP/MỘT PHẦN không mô tả source mới nhất; xem checkpoint mục7 và báo cáo triển khai. Kịch bản ở mục4 vẫn cần thực hành UAT, không được đổi thành PASS từ unit test.

| Yêu cầu | Module/nguồn implementation | Contract | Đánh giá |
| --- | --- | --- | --- |
| ADMIN tổng đăng nhập, màn riêng | [AppEntry](../../Frontend/src/AppEntry.jsx), [AdminApp](../../Frontend/src/app/features/admin/AdminApp.jsx), [IdentityService](../../Backend/src/main/java/vn/syp/tms/identity/IdentityService.java) | [Identity](../api/identity.md), [admin](../api/admin.openapi.yaml) | SOURCE; FE routing regression hiện tại |
| ADMIN tạo dự án và giao PM/user/máy | [AdminProjectService](../../Backend/src/main/java/vn/syp/tms/admin/AdminProjectService.java), [AdminProjectForm](../../Frontend/src/app/features/admin/AdminProjectForm.jsx) | [Admin management](../api/admin-management.openapi.yaml) | SOURCE; unit/MVC và FE có test; native race/transaction chưa UAT |
| User nhiều dự án, role riêng; PM cuối | [ProjectService](../../Backend/src/main/java/vn/syp/tms/project/ProjectService.java), [MembershipRepository](../../Backend/src/main/java/vn/syp/tms/project/MembershipRepository.java) | [Permissions](../business/permissions.md) | REGRESSION CentralMembershipTest; native cạnh tranh pending |
| ADMIN kho từng máy/bàn giao | [DeviceInventoryService](../../Backend/src/main/java/vn/syp/tms/admin/DeviceInventoryService.java), V15, [AdminDevices](../../Frontend/src/app/features/admin/AdminDevices.jsx) | [Inventory](../api/device-inventory.openapi.yaml) | SOURCE; DB hiện 0 máy/0 allocation, chưa pilot |
| PM nhập file theo tên cột | [TestCaseService](../../Backend/src/main/java/vn/syp/tms/testcase/TestCaseService.java), [CustomerWorkbook](../../Backend/src/main/java/vn/syp/tms/testcase/CustomerWorkbook.java), [ImportExcelDialog](../../Frontend/src/app/features/test-cases/ImportExcelDialog.jsx) | [Test cases](../api/test-cases.md), [documents](../api/test-documents.md) | SOURCE; file import FE regression; workbook BE có bằng chứng trước, không tái chạy trong lượt này |
| Bấm file mở testcase, sửa/export bản cập nhật | [TestDocumentPage](../../Frontend/src/app/features/test-cases/TestDocumentPage.jsx), [TestDocumentService](../../Backend/src/main/java/vn/syp/tms/testcase/TestDocumentService.java) | [Documents](../api/test-documents.md) | REGRESSION autosave/history; source vs updated export đã có; không phải execution export |
| PM duyệt case, đưa vào cycle/config, phân công | [ExecutionService](../../Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java), [ScopeSetup](../../Frontend/src/app/features/test-execution/ScopeSetup.jsx) | [Execution](../api/execution.md) | SOURCE, từng run; giao nguyên file là GAP |
| Tester có danh sách file của tôi | TestDocumentsPage hiện liệt kê mọi file COMMITTED của dự án; mine chỉ có run-items | F01/F02 đề xuất trong PRD/SRS | GAP |
| Tester ghi người/máy/file/đang làm | Execution lấy actor session và logical device; chưa có file work session/physical asset FK | F02/F03 đề xuất | MỘT PHẦN; actor đã có, session/máy thật thiếu |
| Tester ghi kết quả case, PM thấy tiến độ | [AttemptDialog](../../Frontend/src/app/features/test-execution/AttemptDialog.jsx), [ReportingService](../../Backend/src/main/java/vn/syp/tms/reporting/ReportingService.java) | [Execution](../api/execution.md), [reporting](../api/reporting.md) | SOURCE qua execution; ô annotation không cộng báo cáo |
| Tester tạo bug và PM giao Dev | [NgBugActions](../../Frontend/src/app/features/test-execution/NgBugActions.jsx), [WorkItemService](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemService.java) | [Work items](../api/work-items.md) | SOURCE; chưa gửi thẳng Dev theo quyền hiện tại |
| Dev bắt đầu xử lý, báo sửa/build | WorkItemService.get/transition, [WorkItemDetail](../../Frontend/src/app/features/work-items/WorkItemDetail.jsx) | [Permissions](../business/permissions.md) | REGRESSION: đã sửa progress; không có native journey DEV trong lượt này |
| QA hỏi/đáp Dev/Tester | DTO/CHECK/UI hiện chỉ BUG/REQUEST/TASK/IMPROVEMENT; Dev chỉ own BUG | Q01/Q02 đề xuất | GAP; không giả định REQUEST đã là QA |
| Sau Dev sửa, giao retest lại Tester | [RetestService](../../Backend/src/main/java/vn/syp/tms/retest/RetestService.java), [RetestPanel](../../Frontend/src/app/features/retest/RetestPanel.jsx) | [Retest](../api/retest.md) | SOURCE qua PM coverage/request; chưa auto-handoff |
| Retest cập nhật đúng kết quả file đang làm | FULL_CASE ghi attempt; BUG_ONLY giữ verdict. Không cập nhật annotation import_rows | [Retest policy](../business/retest-policy.md), F03/F05 | MỘT PHẦN; file execution projection/export còn GAP |
| PM luôn theo sát | [ReportsPage](../../Frontend/src/app/features/reports/ReportsPage.jsx), [AdminOverviewService](../../Backend/src/main/java/vn/syp/tms/admin/AdminOverviewService.java), [ProjectStatusReportService](../../Backend/src/main/java/vn/syp/tms/admin/ProjectStatusReportService.java) | Reporting/admin reporting | SOURCE snapshot theo run; file DOING/asset/handoff detail còn thiếu |

Chi tiết nguồn/đường đứt ở hai [audit file](../reviews/2026-10-05-workflow-file-audit.md) và [audit ticket](../reviews/2026-10-05-workflow-ticket-audit.md). Hai audit bắt đầu 05/10, lượt tổng kết qua ngày 06/10; không dùng ngày file để suy trạng thái code cũ còn hiệu lực sau sửa.

## 3. Fixture và điều kiện UAT an toàn

Chuẩn bị **schema test cô lập**, cùng MySQL native/version/collation với môi trường sử dụng, không dùng `tms`. Runner `scripts/Test-AdminNative.cjs` từ chối schema sử dụng và chỉ nhận mẫu schema test đã quy định. Tài khoản hiện dùng không có quyền tự tạo schema (1044 đã ghi ở review ADMIN); không đổi sang Docker hoặc reset dữ liệu để chạy cho được.

Fixture tối thiểu cần có:

- Hai dự án A/B; một ADMIN, PM-A/PM-B, Tester-A/Tester-B, Dev-A; user ngoài dự án, user disabled và membership inactive.
- Hai máy cùng loại nhưng mã/serial khác, một máy sẵn sàng, một máy bảo trì; allocation A/B và máy đã thu hồi.
- Workbook mẫu người dùng, bản đổi thứ tự cột/alias, title blank kế thừa, M/N không tiêu đề, merge trình bày hợp lệ; file thiếu cột/formula/merge qua ID và trên giới hạn.
- Case có revision approved/unapproved/archive; cùng case ở nhiều batch/config/build để phát hiện lẫn ngữ cảnh.
- Cycle DRAFT/ACTIVE/CLOSED, hai build, run được giao và run của người khác; OK/NG/P/NOT_RUN/NA.
- BUG có một/nhiều NG liên kết, resolved fixed build, current coverage nhiều config, request BUG_ONLY/FULL_CASE, PASS/FAIL/stale round; QA chỉ thêm sau capability được triển khai.

Không gọi CREATE fixture, DELETE, TRUNCATE, Flyway clean hoặc restore trên `tms`. Audit live trong lượt này chỉ SELECT/metadata. Test account/credential không đưa vào docs/repository. Sao lưu trước migration; dữ liệu có máy/ticket đúng nghĩa trong fixture, không coi số liệu demo là nghiệm thu pilot.

## 4. Bộ kịch bản chấp nhận

### A. ADMIN và quyền

| ID | Thao tác | Kết quả bắt buộc | Bằng chứng hiện tại |
| --- | --- | --- | --- |
| A01 | ADMIN login; PM/Tester/Dev vào URL admin | ADMIN thấy dashboard tổng; người khác 403/route guard | FE admin tests PASS; MVC trước; native/UAT pending |
| A02 | Tạo project có PM, Tester, Dev và hai máy | Một transaction; đủ memberships/allocations; creator không auto-PM; không quota | Unit/FE source; native fixture pending |
| A03 | Thiếu PM, user role sai/disabled, máy đang giao | Báo lỗi cụ thể, không tạo project/member/allocation một phần | Có tests trước; UAT pending |
| A04 | Hai request giao cùng một máy | Chỉ một thành công; request còn lại conflict, giữ history | Native race có test source, chưa chạy |
| A05 | Hai ADMIN cùng gỡ hai PM cuối hoặc cùng PATCH version | Không mất PM cuối/lost update; một request stale | NativeAdminCurrentReadTest có source; chưa chạy |
| A06 | ADMIN ngoài membership vào file/bug dự án | API quản trị tổng được phép; API nghiệp vụ member không được phép | Source guards; native integration cần tái chạy |
| A07 | PM tạo project/thêm member/thu hồi máy | 403; chỉ nhận công việc và điều hành | FE tests/source; UAT pending |
| A08 | PM được/không được ủy quyền tạo user | Chỉ PM được cấp tạo TESTER; ADMIN/PM/DEV bị từ chối khi PM tạo | IdentityPolicyTest PASS 2 tests + source |
| A09 | Khóa/gỡ/đổi quyền giữa request chờ lock | Current role được kiểm tra sau wait, không ghi bằng snapshot cũ | Guard unit PASS; native concurrent test pending |

### B. Excel và thư viện

| ID | Thao tác | Kết quả bắt buộc | Bằng chứng hiện tại |
| --- | --- | --- | --- |
| B01 | PM import mẫu khách thực tế | Preview đúng row/cột; commit thành một file cùng tên; case nguồn được giữ | Parser/UI source, workbook tests trước; UAT workbook thực pending |
| B02 | Đảo cột, khoảng trắng/dấu/alias được hỗ trợ | Map đúng theo header, không lấy vị trí cố định | CustomerWorkbookTest có source; FE full PASS |
| B03 | Title trống có dòng trước hợp lệ | Nội dung case kế thừa title, source/export giữ ô nguồn trống tới khi sửa revision | Source/tests trước; UAT pending |
| B04 | Hai header đồng nghĩa hoặc thiếu bắt buộc | 422 cụ thể; không commit | Source/tests trước |
| B05 | Formula, hyperlink sai, merge đụng nội dung/ID, quá 5MiB/500/64 | Từ chối đúng giới hạn; không evaluate hoặc cắt dữ liệu | Source/workbook tests trước; chưa tái chạy BE parser trong lượt này |
| B06 | Merge ngang trình bày sang cột phụ trống | Giữ merge/source; nội dung case không mất | CustomerWorkbookTest có source, UAT pending |
| B07 | Commit lặp hoặc stale sau preview | Cùng request/batch trả cùng kết quả; xung đột rollback tất cả | Native import tests có source; cần schema cô lập |
| B08 | Sửa revision/approve/archive | History còn; approval PM-only; pinned run không đổi | Source/TestCaseIntegrationTest; native pending |
| B09 | Bấm nhanh trạng thái annotation, reload | Thứ tự được lưu đúng, actor/time/version đúng; no form dưới bảng | DocumentResultServiceTest PASS 7 + FE full |
| B10 | Export annotation sau edit và original | Bản cập nhật lấy revision/result mới, original nguyên bytes; M/N giữ | Source/tests trước; UAT real workbook pending |
| B11 | Lỗi mạng/409 trong annotation | Hiển thị lỗi, giữ pending/draft, khóa export đến khi giải quyết | FE regression PASS |

### C. Giao file và thực thi

| ID | Thao tác | Kết quả bắt buộc | Bằng chứng hiện tại |
| --- | --- | --- | --- |
| C01 | PM chọn file/cycle/config/Tester rồi giao | Resolve đúng approved revision/run; cả group và lịch sử atomic | GAP F01 |
| C02 | File 500 case × 2 config vượt cycle limit | Preview scope báo vượt giới hạn và cách xử lý; không cắt case | GAP F01; giới hạn M06 đã có |
| C03 | Tester mở My files | Chỉ assignment của chính mình, context/hạn/trạng thái đúng | GAP F02 |
| C04 | Bắt đầu trên máy allocated cho mình | Session DOING lưu actor/server time/asset context, PM thấy | GAP F02 |
| C05 | Máy dự án khác/thu hồi/bảo trì, máy đã DOING | Không mở phiên/ghi result; conflict có hướng xử lý | GAP F02/F03 |
| C06 | User nhập actor hoặc đổi ID run/project/session | Server dùng principal, chặn khác actor/context/project | M06 SOURCE; session negative tests cần xây |
| C07 | Ghi OK/NG/P; NG thiếu actual/P thiếu reason | Valid lưu attempt; invalid 422; source cũ/history giữ | M06 source và FE regression; native pending |
| C08 | Không được giao/DEV/disabled/member removed/cycle closed | Không có write/attempt/replay trái quyền | DeveloperResultsTest PASS + source; native pending |
| C09 | Double click/retry/stale version | Một attempt với key hợp lệ, khác payload/stale 409; giữ draft | Source/FE regression; native concurrency pending |
| C10 | Tạm dừng/tiếp tục/kết thúc còn NOT_RUN/P/NG | Theo D-F4 đã duyệt; không đồng nhất COMPLETED với pass/release | GAP F02, quyết định còn mở |
| C11 | View cùng file trên hai config/build | Kết quả không lẫn; revision pinned và actor/máy đúng | Execution source; file projection GAP F03 |
| C12 | Export lượt hiện hành/annotation/original | Ba nguồn rõ, workbook đối chiếu context đúng; PASS không ghi mọi file | GAP F05; annotation/original có source |

### D. Bug, QA, Dev và retest

| ID | Thao tác | Kết quả bắt buộc | Bằng chứng hiện tại |
| --- | --- | --- | --- |
| D01 | Tester tạo bug từ NG | Bug links đúng attempt/run/revision/context, request retry không trùng | Source/FE full; native pending |
| D02 | Tester chọn assignee Dev khi tạo | Theo policy cũ 403; PM triage chọn Dev | Source; chỉ đổi sau quyết định D-Q2 |
| D03 | Dev BUG được giao open → progress | GET có progress; POST lưu canonical status/history | DeveloperPermissionsTest PASS 6 (bao gồm regression này) |
| D04 | Dev resolve thiếu build/stale/missing reason | 422/409; không ghi status/history một phần | DeveloperPermissionsTest PASS |
| D05 | Dev resolve build valid rồi Tester FULL_CASE | PM coverage/request trước; đúng Tester/build tạo attempt và verification mới | Source; native journey cần chạy |
| D06 | Dev BUG không được giao, terminal hoặc TASK/REQUEST | Không được comment/attach/transition ngoài policy | Unit/source; QA mới chưa mở |
| D07 | Dev mở overview/lịch sử file read-only có NG | Không được mời tạo/link bug hoặc ghi test | Hai FE regression RED → GREEN, full 344 PASS |
| D08 | Tester hỏi QA không có NG | Ticket hỏi/đáp đúng context, Dev được giao trả lời, Tester xác nhận, PM đóng | GAP Q01/Q02 |
| D09 | Resolve chưa có retest coverage/request | PM thấy Chờ chuẩn bị, không giả đã giao Tester | Data có SOURCE; queue chi tiết GAP Q03 |
| D10 | BUG_ONLY PASS | Thêm verification; latest execution vẫn NG nếu trước NG, không tự đóng bug | Retest source/integration test; chưa chạy native mới |
| D11 | FULL_CASE PASS/FAIL | Tạo OK/NG attempt; FAIL link lại bug, status progress, invalidate scope/requests cũ | Source/test có sẵn; file view execution GAP F03 |
| D12 | Retest actor/build/config/coverage round sai | Từ chối toàn bộ, không leak project, không sửa attempt | Retest source; native pending |
| D13 | Partial coverage hoặc bug khác cùng case còn mở | Không tự close/OK toàn bộ; cảnh báo đúng ID bug | Source; native pending |
| D14 | PM close đủ PASS, ngoại lệ có evidence, reopen | Closure/history đúng; bảo vệ evidence; generic transition không vượt guard | Source; UAT pending |
| D15 | Đóng REQUEST/TASK/IMPROVEMENT | Cần closure policy riêng; không ép qua BUG retest | GAP lifecycle non-BUG |

### E. PM, ADMIN, báo cáo và vận hành

| ID | Thao tác | Kết quả bắt buộc | Bằng chứng hiện tại |
| --- | --- | --- | --- |
| E01 | Lọc cycle/build, xem nhóm theo assignee; so report và XLSX | T/NA/D/kết quả/tỷ lệ đúng; build chưa chạy vẫn NOT_RUN | Source/FE; integration report cần tái chạy; API report chưa có assignee filter |
| E02 | Một run nhiều attempts, một bug nhiều links | Không đếm attempts thành scope hoặc nhân số bug | ReportMetrics/source; native pending |
| E03 | Tất cả NA hoặc scope rỗng | Rate null, thông báo chưa có phạm vi; không chia 0 | Source/FE regression |
| E04 | PM NA/restore/close/reopen cycle | Version/reason, không NOT_RUN/P khi close, NG có bug, ghi tồn đọng khi cần | Source; native cycle test pending |
| E05 | Mốc không due date/không scope hoặc quá hạn | Chưa đủ dữ liệu/overdue đúng timezone; PM report không xóa cảnh báo | Source/admin FE tests; native/UAT pending |
| E06 | PM gửi report khi overdue, thiếu reason/plan | Từ chối input thiếu; valid append-only/actor/time, retry không trùng | ProjectStatusReportTest trước; FE full PASS |
| E07 | PM xem ai DOING/file/máy và retest chờ | Đủ context trên file dashboard/handoff queue | GAP F04/Q03 |
| E08 | Redmine timeout/uncertain/retry/mapping đổi | Không CREATE lặp; PM reconcile; remote không sửa verdict/closure | Sandbox/source trước, production chưa duyệt |
| E09 | Backup/migrate/restore | Checksum nguyên, migration V mới, giữ domain data/source/evidence; restore schema cô lập | V16 đã backup/apply trước; fresh/native mới chưa chạy |
| E10 | UI mouse wheel/keyboard/modal/mobile/table rộng | Không mất scroll/nội dung/focus, không cắt select/nút | Browser trước 1440→320 + FE tests; fullmanual UAT pending |

## 5. Bằng chứng chạy của lượt 06/10

| Kiểm tra | Kết quả thực tế | Phạm vi |
| --- | --- | --- |
| DEV regression trước sửa | 6 tests: 3 failure, 1 error | Tái hiện sai canonical status/destination; hai test còn lại pass |
| UI regression trước sửa | 8 tests: 2 failure | Nút overview Dev và bug action trong read-only history |
| FE focused sau sửa | 26/26 tests, 4 files PASS | Overview permission, AttemptDialog, DocumentExecution, WorkItemDetail |
| FE toàn bộ sau cập nhật fixture permission | **344/344 tests, 44 files PASS** | Vitest, không phải browser E2E |
| BE scoped sau sửa | **26/26 tests, 6 suites PASS; 0 failure/error/skip** | DeveloperPermissions(6), WorkItemHistory(3), DeveloperResults(1), DocumentResultService(7), IdentityPolicy(2), CentralMembership(7) |
| FE build | PASS | Vite production build |
| BE package | PASS | Maven `-DskipTests package`; tests ở dòng riêng, không gọi đây full verify |
| Java diagnostics | 167 sources, 0 errors, 0 warnings | Eclipse/JDT; warning Mockito matcher mới đã sửa và kiểm lại |
| Check-Contracts | PASS 109 S03–S10 operations + local refs/path params/50 docs | Structural checker, không full OpenAPI conformance validator |
| DB SELECT/metadata | V16 success; 59 tables/560 columns/139 FK/269 indexes | Chỉ đọc; không fixture/migration/data writes |

Kiểm tra dữ liệu chỉ đọc: 4 projects, 9 users, 12 memberships, 5 COMMITTED documents, 492 cases, 242 run items, 191 attempts, 74 tickets; 0 assets/allocations. Không có active project thiếu PM enabled/non-DEV, không có run assigned DEV, không có COMMITTED import row thiếu target_case_id trong snapshot. Đây là integrity signal có giới hạn, không chứng minh business correctness của mọi record.

Lượt full FE đầu tiên sau sửa fail một fixture overview vì fixture chưa có metadata permission. Đã cập nhật fixture PM `canCreate=true`, giữ guard fail-closed, rồi rerun toàn bộ PASS. Không xóa hoặc làm yếu test để bỏ lỗi.

Không đo coverage toàn hệ thống; không tái chạy native DB integrations/full journey/UAT trong lượt này; không tạo máy/user/test data vào DB sử dụng. Hai dịch vụ người dùng 8080/5173 không bị stop/restart. Artifact backend đã build chứa bản sửa, nhưng listener đang chạy chưa được tự coi là bản mới.

## 6. Gate để gọi luồng hoàn chỉnh

1. Duyệt nguồn kết quả/chế độ file và policy QA cùng quy tắc nhóm file/session/máy.
2. Triển khai F/Q đã duyệt với contract/version/negative tests, migration mới và dữ liệu cũ tương thích.
3. Có schema test native được cấp quyền, chạy upgrade/fresh/race/export/permissions và hành trình C01→D14→E07. Không dùng `tms` để thay gate này.
4. Pilot PM/Tester/Dev thực hiện workbook/máy/build/ticket thực tế và ghi bằng chứng. Mỗi kịch bản có actual/expected/log/artifact, defect và người nghiệm thu.
5. Chỉ đóng requirement/sprint khi đạt DoD; S11/UAT/production vẫn `IN_REVIEW` đến khi đủ bằng chứng. Không phát hành hoặc push mặc định từ báo cáo.

## 7. Truy vết source F/Q hiện hành

Checkpoint cuối sau một wave sửa/scoped re-review: source **APPROVED**,612 FE/394 offline BE PASS, JDT191nguồn0lỗi/0cảnh báo, build/package/contract PASS. [Review cuối](../reviews/2026-10-06-fq-final-review.md) ghi I1–I3/M1–M2 đã xử lý. Form QA giữ route/focus/draft; lịch sử build lưu trữ vẫn đọc/xuất được, guards ghi giữ; PM cancel không phụ thuộc projection; màn file có filter/rate/start/activity/milestone context. Browser chỉ dùng fixture GET-only, không nghiệm thu lưu hoặc SQL. Tất cả kịch bản UAT/native giữ NOT_RUN đến khi thực hành riêng; baseline phía trên không được đổi PASS từ các test này.

| Yêu cầu / kịch bản | Source chính | Bằng chứng và gate còn lại |
| --- | --- | --- |
| Giao file, My work — C01–C03 | [FileWorkService](../../Backend/src/main/java/vn/syp/tms/filework/FileWorkService.java), [FileWorkPage](../../Frontend/src/app/features/file-work/FileWorkPage.jsx) | Task2/5 source review/test PASS; atomicity/MySQL/HTTP/UAT chưa chạy |
| Người/máy/phiên — C04–C05/C10 | [FileWorkSessionService](../../Backend/src/main/java/vn/syp/tms/filework/FileWorkSessionService.java), [FileWorkGuard](../../Backend/src/main/java/vn/syp/tms/filework/FileWorkGuard.java) | Task3 review/behavior tests PASS; máy/nhóm race và phiên mất nguồn lực native chưa chạy |
| Ghi execution/pin/export — C06–C09/C11–C12/D11 | [FileWorkExecutionService](../../Backend/src/main/java/vn/syp/tms/filework/FileWorkExecutionService.java), [FileWorkWorkbook](../../Backend/src/main/java/vn/syp/tms/testcase/FileWorkWorkbook.java), [FileWorkDetail](../../Frontend/src/app/features/file-work/FileWorkDetail.jsx) | Task4/5 source/pure workbook/transport tests PASS; actual HTTP XLSX và FULL_CASE journey chưa chạy |
| QA không cần NG — D08 | [QaService](../../Backend/src/main/java/vn/syp/tms/qa/QaService.java), [QaPanel](../../Frontend/src/app/features/qa/QaPanel.jsx), [QaForm](../../Frontend/src/app/features/qa/QaForm.jsx) | Task6/7B/7C/7C2 reviewed; answer/generation/current permission tests PASS; native/HTTP/UAT chưa chạy |
| PM handoff — D09/E07 | [HandoffService](../../Backend/src/main/java/vn/syp/tms/qa/HandoffService.java), [HandoffPanel](../../Frontend/src/app/features/qa/HandoffPanel.jsx), [ProjectOverview](../../Frontend/src/app/modules/ProjectOverview.jsx) | Task7A/7D/7E reviewed; hash navigation và archived READY guard tests PASS; SQL/performance/journey chưa chạy |
| Lịch sử/thiết bị/FK/upgrade — E09 | [V17](../../Backend/src/main/resources/db/migration/V17__file_work_groups_and_sessions.sql), [V18](../../Backend/src/main/resources/db/migration/V18__qa_work_items.sql), [từ điển F/Q](FQ-DATA-DICTIONARY.md), [native fixture](../../Backend/src/test/java/vn/syp/tms/filework/NativeFileWorkQaMigrationTest.java) | Static DDL và guarded fixture source review; compile PASS, native V16→18/fresh/preservation/checksum chưa chạy |

[Bộ UAT F/Q](../uat/file-work-qa.md) có 38 kịch bản F20/B8/Q10, trạng thái thực hành mặc định NOT_RUN. [Hướng dẫn thao tác](../file-work-qa-guide.md) nêu các bước Admin/PM/Tester/Dev và ba kiểu Excel. [Báo cáo triển khai](../reviews/2026-10-06-fq-implementation.md) ghi lượt chạy cụ thể; không cộng các lượt scoped thành một full-suite giả.
