# Contract triển khai FixReports — 19/10/2026

Đặc tả cục bộ cho FR-01; nguồn nghiệp vụ là FixReports và clarification đã chốt. Dùng lỗi BusinessException/envelope và session/CSRF hiện hành. Không thay stack hoặc cơ chế đăng nhập.

## Đồng bộ source/contract FR-11 ngày 19/10/2026

Đối chiếu source hiện có; không đánh dấu main DB đã apply/cutover, migration/repair hoàn tất hoặc UAT đạt. Các migration additive/repair do owner core và root điều phối, repair đang được chuẩn bị/kiểm chứng riêng; tài liệu không suy số Flyway tiếp theo. Mốc V30 ở phần baseline dưới là lịch sử inventory, không khẳng định trạng thái runtime hiện tại.

| Phần hiện hành | Contract chi tiết |
| --- | --- |
| Feature/import/document/assignment/result | [test-documents](test-documents.md): prefix Feature bắt buộc, rowIds thật, version/requestKey, bản case A/B độc lập |
| Bug/QA/Monkey | [work-items](work-items.md): `/issues`, capability hiện hành, context Feature/file/row; old generic và typed writes nghỉ dùng |
| Legacy HTTP và retained history | [file-work](file-work.md): các mã410, GET lịch sử theo quyền, không đoán mapping ID cũ |
| Management analysis/report | [reporting](reporting.md): PM của dự án/ADMIN; bản Markdown lưu riêng, exact download, preview không autosave |
| AI target/background/owner | [ai-chat](ai-chat.md): projects/features selector theo server policy, PROJECT_CHAT optional Feature, PM AI chỉ đọc các dự án được phân quyền; ADMIN tổng có phạm vi toàn hệ thống |
| Status/progress/quyền | [metrics](../business/metrics.md), [permissions](../business/permissions.md): P/NA tính tested, total gồm NA, USER không management report; GUEST chỉ GET báo cáo của dự án được thêm |

Source đối chiếu: [FeatureController](../../Backend/src/main/java/vn/syp/tms/feature/FeatureController.java), [FeatureIssueController](../../Backend/src/main/java/vn/syp/tms/workitem/FeatureIssueController.java), [ProjectNotesController](../../Backend/src/main/java/vn/syp/tms/notes/ProjectNotesController.java), [ManagementReportController](../../Backend/src/main/java/vn/syp/tms/reporting/ManagementReportController.java), [AiReadScopeController](../../Backend/src/main/java/vn/syp/tms/ai/AiReadScopeController.java), [LegacyTestingWrites](../../Backend/src/main/java/vn/syp/tms/feature/LegacyTestingWrites.java), [FeatureIssueLegacyWrites](../../Backend/src/main/java/vn/syp/tms/workitem/FeatureIssueLegacyWrites.java). Kiểm lại implementation cuối khi root đóng băng source; liên kết tới source không thay bằng chứng chạy HTTP.

Notes giữ `P=/api/v1/projects/{p}/notes`: GET list page0-based,size1–100 → items/totalItems/page/size/totalPages; GET `/{id}`; POST `{title,body}` →201 + Location; PUT `/{id}` `{title,body,expectedVersion}`; DELETE `/{id}?expectedVersion=` →204 soft archive. Title1–200 sau trim, body không trắng tối đa10.000, giữ nguyên text body; không attachment/CMS. Member đọc, PM dự án/ADMIN CRUD; outside/wrong scope404, role403, stale409, thiếu version422. Archived project đọc được, không ghi; ADMIN không membership vẫn dùng identity tác giả thật.

UI: `/board` và `/board/testing` là hai khu vực ngoài, Kanban/list giữ bên trong Bảng trạng thái; Feature→file→case Back/deep link gắn actual projectId, đổi project xóa context sâu cũ trước fetch. `/issues` quản lý Bug/QA và Monkey; `/analysis` chỉ PM dự án/ADMIN; `/settings/notes` thay catalog menu; cấu hình AI trong Chat. Tổng quan chỉ đọc thông tin actual project, copy Spider Plus chỉ match code `SPIDER-PLUS` theo [nội dung được duyệt](../content/spider-plus-project-overview.md), không gán vào demo.

Không có generic Task create, run/session/start/end hoặc retest tự động cho luồng mới. Public legacy writes có410; old `/reports` kiểm quyền quản lý trước410, không lộ totals cho worker. GET lịch sử và dữ liệu giữ lại không chứng minh quyền ghi. Sửa report10→8 chỉ sửa stored Markdown; Issue vẫn10; cleanup AI draft/chat không được xóa saved report. A01–A20/native/browser/live AI được ghi bằng chứng riêng tại kế hoạch do root sở hữu, không suy từ test mock.

Bổ sung AR-08 ngày 03/11/2026: Rules tại `/settings/rules` lưu cấu hình nội bộ `INTERNAL_DEMO` của luồng báo lỗi cũ. Phiên bản được công bố và lịch sử ở đây không áp dụng bộ quy tắc này cho Bug/QA trong Feature/Ticket V39; `FeatureIssueService` không gọi `RuleService`. Giữ nguyên API/DTO, quyền đọc/ghi hiện hành, tạo bản nháp, công bố với `expectedActiveVersionId` và lịch sử V1/V2 đã pin, không hồi tố dữ liệu cũ. Payload cấu hình cũ vẫn giữ đủ bảy `requiredFields` (`title`, `steps`, `expectedResult`, `actualResult`, `buildId`, `environmentId`, `deviceId`) theo `InternalRulePolicy`; đây không phải điều kiện tạo Issue hiện hành. AR-08 chỉ đổi cách diễn đạt trên UI, không thêm rule engine vào Ticket hoặc đưa toàn bộ API Rules về chỉ đọc.

## Ranh giới và lựa chọn

Chọn mở rộng additive Feature + tái sử dụng import/document/workbook/cell editor. Không tái sử dụng cycle/run/session làm điều kiện ghi của luồng mới. So với một kho JSON/parser mới, cách này giữ đúng current revision và cell overlays; so với đổi tên cycle, nó loại được các ràng buộc build/device/lifecycle không còn đúng.

Owner migration mới duy nhất: agent core, root duyệt contract và tích hợp. Các nhóm khác gửi yêu cầu DDL, không tự cấp số Flyway. V30 là mức nguồn và main DB đọc được lúc baseline. Không sửa migration đã áp dụng.

## Identity, dữ liệu và transaction

- `testing_features`: project, tên, môi trường/server text, mô tả, archive, version, identity actor; provenance cycle hoặc orphan để replay an toàn.
- `import_batches.feature_id`: sở hữu Feature; archive/version theo file. Luồng hoạt động mới chỉ thấy bản Feature-owned.
- Mỗi bản file có case/revision/row/edits riêng; owning document ở case hoặc constraint tương đương chống chia sẻ mutable case. Số case nguồn là nhãn hiển thị, không phải identity liên Feature.
- Phân công khóa file rồi các row theo thứ tự; version file dùng chung thay đổi range; mỗi row có tối đa một assignee hiện tại. Lưu first/latest và history actor riêng. Thay range của mình không đổi range người khác. Status dùng row version/request key hiện có, không tạo run.
- Xóa Feature là archive có restore; xóa file là ẩn giữ nội dung và liên kết. Không cleanup legacy graph trong bước clone.
- Migration map UNION group/retest/direct-run theo cycle, dedup configuration, clone trọn file cho từng Feature. Orphan đúng project; empty cycle vẫn có Feature. Giữ workbook bytes, raw cells, current revision và cell edits; reset riêng Status/phân công theo quyết định. Missing/corrupt/ambiguous vào exception manifest, không bịa dữ liệu.

## Giao diện công khai và lỗi

Prefix API `/api/v1/projects/{projectId}`. List dùng page 0-based, size giới hạn theo repo, items/totalItems/page/size/totalPages; query và count cùng predicate. AND token search không dấu/hoa/thứ tự, ký tự `%`/`_` là literal.

| Interface | Input / output chính | Quyền và lỗi |
| --- | --- | --- |
| `GET/POST /features`, `GET/PUT /features/{id}` | name, environment, description; id/projectId/version/archive/progress | Member đọc; PM dự án/ADMIN ghi; wrong scope 404, forbidden 403, validation 422, stale 409 |
| Archive/restore Feature | expectedVersion | PM/ADMIN; không hard delete |
| Feature documents + import preview/commit | featureId bắt buộc trên đường mới; parser hiện có; file/progress/tester ranges | PM/ADMIN import/hide; cùng workbook ở Feature khác hợp lệ |
| Document detail/cell/result/export | Giữ rowId/caseId/revision/version; Status mới và assignment riêng | Active scope; cell editing theo quyền; Status USER được phân công hoặc PM/ADMIN; version/idempotency conflict 409 |
| Document assignments | membershipId, ranges, expectedVersion | PM/ADMIN quản lý; USER chỉ phần mình; overlap/out-of-range 422/409; một transaction |
| `/issues` | BUG/QA, featureId, documentId/rowId tùy context, title/details; monkey flag, version/requestKey | Case context kiểm server; USER tạo/sửa monkey của mình và xử lý Issue được giao; PM/ADMIN quản lý; soft-delete; không NG/build/device/retest gate |
| `/notes` | title/body, expectedVersion; saved identity/time/version | PM/ADMIN CRUD, member đọc; scope 404, role 403, stale 409 |
| `/management-reports` | project + optional Feature, Markdown text/version | PM dự án/ADMIN read/create/edit/export; USER 403; GUEST có membership hợp lệ được GET summary/list/detail/download với DTO riêng, không ghi; tách TTL chat/draft; không ghi ngược nghiệp vụ |

Giữ schema issue/work-item hiện có nếu mở rộng được: context Feature/file/row và identity author rõ; các required build/env/device cũ được bỏ cho Issue mới. Không giả mapping loại lịch sử sang BUG/QA; API tạo loại cũ bị chặn. Lối mới không gọi state machine retest/QA cũ như điều kiện bắt buộc.

Chốt bổ sung 25/10/2026: chi tiết Issue hiển thị **Feature hiện tại**, không chụp thông tin tại thời điểm tạo Issue. Response Issue có `featureName`, `featureEnvironment`, `featureDescription`, đọc trực tiếp từ Feature cùng dự án. Mở lại hoặc “Tải lại Issue” lấy giá trị mới nhất; không polling. Hai trường môi trường/mô tả có thể rỗng; UI ghi rõ chưa có thông tin. Đổi Feature không sửa nội dung, version hay lịch sử Issue. Không thêm migration hoặc đưa hai trường này vào payload sửa Issue/history snapshot.

Bổ sung cùng ngày cho **Tạo Issue từ case**: `GET /issues/context` cũng trả `featureName`, `featureEnvironment`, `featureDescription` hiện tại. Form hiển thị khối Feature trước các ô nhập Bug/QA, dùng chung component với chi tiết Issue. Mô tả Feature chỉ đọc, không chép vào `description` của Issue và không gửi lại trong payload tạo Issue. Giữ nguyên kiểm tra project/Feature/file/row và cơ chế tải lại khi lấy context thất bại.

## Quyền AI và metrics dùng chung

- ADMIN đã đăng ký được AI đọc liên dự án; PM chỉ đọc dự án có membership hợp lệ và không có thêm quyền CRUD. Secret và chat riêng luôn ngoài context.

### Phân biệt thời gian chờ AI — Arena 03/11/2026

`AI_TIMEOUT` chỉ biểu thị deadline tại client/server khi chờ nguồn AI, gồm request/transport timeout thực sự. HTTP408 hoặc HTTP5xx do provider trả vẫn dùng `AI_UNAVAILABLE`; không suy local timeout chỉ từ HTTP status. HTTP402 giữ lỗi hạn mức/thanh toán theo mapping nguồn; auth401/403, dữ liệu sai, refusal hoặc incomplete giữ mã riêng hiện có. Chỉ mã lỗi an toàn được trả/lưu; không đưa raw provider body, prompt hoặc key vào log.

Chat giữ tin nhắn đã gửi và cho phép người dùng chủ động gửi lại; gợi ý báo cáo giữ nội dung đang soạn để có thể sửa/lưu thủ công. Không tự retry inference, tự ghi báo cáo hoặc ghi đè nháp bằng phản hồi đến muộn. Thay đổi này không tăng timeout cấu hình, đổi model hay coi metadata nguồn sẵn sàng là inference thành công. Kết quả live theo thời điểm được ghi riêng trong [hướng dẫn Caheo](../operations/caheo-new-machine.md).
- USER chỉ truy xuất chi tiết case/Issue/công việc trong quyền; management analysis/report/bulk export bị chặn tại API/capability. Ngoài quyền chỉ context kinh nghiệm đã tổng hợp, không tên/identity/raw tài liệu/số liệu riêng. Lọc trước retrieval/model và kiểm output/citation.
- Project/Feature đã chọn là target; background policy độc lập. Kết quả trải nghiệm dựa trên actor thực tế sau migration, không dùng source tester làm bằng chứng mới.
- tested = count(Status != UNEXECUTED), total gồm NA; 2U+OK+P+NA = 3/5 = 60%; total0 cho tiến độ0 với nhãn chưa có case. Các consumer đọc cùng identity và công thức, không đếm theo số assignee.
- Cấu hình AI trong chat dùng provider UI hiện có, per-account; thread/in-flight đã pin không thay nguồn/model/scope.

## Seams kiểm chứng đã có trong kế hoạch được người dùng yêu cầu

Public HTTP/API: role/scope/transaction/concurrency/persistence (A01–08,11–19). React UI: hành vi button/form/router/draft/error/focus (A07,09–13,17–20). Migration trên schema cô lập: workbook/current-content/FK/mapping/restore (A02–03,19). Browser fixture và HTTP thật được báo riêng. Không dùng test mock thay bằng chứng migration hoặc live AI.

## Bổ sung đối chiếu source 19/10/2026 — R01/R02/R03/R07/R08

- KPI Admin hiện hành là `feature-cases-v1`, từ Status của case thuộc file/Feature hoạt động; Bug counters chỉ từ Issue context hoạt động. Milestone chỉ tính BUG/QA được liên kết rõ, không dùng cycle/Task cũ làm cảnh báo mới. [Định nghĩa metrics](../business/metrics.md).
- Legacy `POST /api/v1/projects/{p}/status-reports` trả410 `USE_FEATURE_REPORTS` sau quyền PM dự án/ADMIN; lịch sử GET giữ tác giả/nội dung, `canPost:false`, không cho USER/GUEST hoặc PM ngoài scope. [Chi tiết API và Admin-only history](reporting.md).
- Current export/import lại hỗ trợ mẫu khách và đúng mẫu nội bộ11/14 cột, tái sử dụng ba cột Status/first/latest thay vì nhân thêm. Import vào Feature mới giữ bytes nguồn và reset Status/phân công mới, không tạo lịch sử tester từ ô nhập. [Contract export roundtrip](test-documents.md).

Đây là đối chiếu source đã đóng băng và contract; kết quả browser, MySQL cô lập, live AI, main DB và UAT là các bằng chứng riêng, không suy từ đoạn này.

## Mapping nội dung dự án

Chưa có Spider Plus trong inventory baseline. Người dùng ngày 19/10 đã cho phép bổ sung; dùng mã riêng `SPIDER-PLUS`, tạo qua giao diện nghiệp vụ được phép, không đổi tên/gắn copy vào demo. Nội dung theo `docs/content/spider-plus-project-overview.md`. Không restart runtime hoặc tự apply migration vào main DB.
# Bổ sung version test — 25/10/2026

- `GET /api/v1/projects/{p}/features/{f}/test-versions`: người có quyền đọc dự án; trả `[{id,name,createdAt}]`, mới nhất trước.
- `POST .../test-versions`: PM/Admin quản lý Feature đang hoạt động; body `{name,requestKey}`; trả 201, idempotent theo requestKey. Tên không trống, tối đa 255 ký tự, duy nhất trong các version chưa xóa của Feature; không có sửa tên version.
- `DELETE .../test-versions/{versionId}`: cùng quyền quản lý, yêu cầu CSRF; trả 204, gọi lặp lại không phát sinh thêm audit. V36 ghi `deleted_at/deleted_by`, không xóa cứng. GET và gợi ý version chỉ gồm bản chưa xóa. Kết quả hiện tại, lịch sử và Excel vẫn giữ tên/ngày cũ; ghi kết quả mới với ID đã xóa trả 422 `TEST_VERSION_DELETED`, replay của lệnh đã thành công vẫn hợp lệ. Có thể tạo lại cùng tên bằng ID mới. Không có endpoint khôi phục trong phạm vi này.
- `GET /api/v1/projects/{p}/test-documents/{d}` của Feature bổ sung `testVersions`; mỗi row có `testVersionId,testVersionName,executedOn` nếu đã ghi metadata. Không suy diễn version cho dữ liệu cũ.
- `PUT .../rows/{row}/result` nhận thêm `testVersionId,executedOn` (ISO `YYYY-MM-DD`), gửi cùng nhau; version phải thuộc đúng project/Feature. Feature đã có version thì bắt buộc chọn; Feature chưa cấu hình vẫn tương thích ghi Status cũ.
- Đổi Status lưu metadata chỉ cho row được ghi. Đổi dropdown ở row gửi Status hiện tại, version được chọn và giữ ngày thực hiện đã lưu (row chưa có ngày dùng ngày đang chọn ở toolbar). Không đổi Status/tiến độ của case hoặc các case khác. Lịch sử ghi một bản mới, kể cả Status trước/sau giống nhau.
- `expectedVersion` chống ghi đè khi sửa đồng thời; replay cùng requestKey/actor/status/version/date không nhân đôi lịch sử; payload khác bị 409. Quyền sửa tuân theo phân công case hiện hành; USER không được phân công không được ghi.
- UI gợi ý version có ngày tạo theo Asia/Ho_Chi_Minh gần nhất không sau ngày thực hiện, cùng ngày chọn createdAt/id mới nhất. Người dùng chọn lại được. Đổi toolbar không ghi database.
- Lịch sử và Excel hiện hành thêm Version test/Ngày thực hiện; cột ghi chú thực thi gốc được giữ riêng, tải file gốc không thay đổi.
# Ngoại lệ lưu trữ luồng cũ (Arena AR-06, V40)

Giữ nguyên bốn endpoint Admin tổng: `GET /api/v1/admin/projects/{id}/archive-readiness`, `POST .../archive`, `POST .../reopen`, `GET .../lifecycle-decisions`. Service đọc khóa tài khoản hiện hành và registry hai Admin trước khóa project; PM/USER/Khách không có quyền quyết định.

Lệnh thường vẫn là `{expectedVersion, reason, requestKey}`. `expectedVersion >= 0`, reason trim rồi dài 1–2000, requestKey khớp `[A-Za-z0-9_-]{8,100}`. Archive nhận thêm tùy chọn `legacyException: {acknowledged: true, snapshotFingerprint: "<64 lowercase hex>"}`. Bỏ trường hoặc null là lệnh thường; object thiếu/sai trường và mọi object ngoại lệ gửi vào reopen trả 422 `INVALID_COMMAND`. Server không nhận ID/count/policy do client chọn.

Readiness bổ sung `blockers[].exceptionEligible`, `canArchiveWithLegacyException`, `legacyExceptionFingerprint`. `canArchive` chỉ true khi project active và không blocker. Chỉ `UNFINISHED_CYCLES` (ACTIVE hoặc DRAFT có run) và `OPEN_RETESTS` được miễn; fingerprint có khi tồn tại ít nhất một blocker thuộc hai loại này. Ngoại lệ chỉ khả dụng khi active, có legacy blocker và không hard blocker. `ACTIVE_SESSIONS`, `ALLOCATED_DEVICES`, `OPEN_WORK_ITEMS`, `PENDING_PUBLICATIONS` luôn chặn. Ticket dùng `ticket_workflow_metrics.finalized`, nên CLOSED/PROCESSED đang chờ xác minh vẫn chặn; hidden/deleted context không được miễn.

Snapshot policy 1 gồm projectId/projectVersion, cycles `{id,status,version,runIds}` và retests `{id,status,version}` từ locking reads. Canonical JSON UTF-8 có thứ tự field `policyVersion,projectId,projectVersion,cycles,retests`; mỗi cycle có `id,status,version,runIds`, mỗi retest có `id,status,version`; ID tăng dần, runIds distinct tăng dần. SHA-256 lowercase hex không gồm label, asOf, counts hoặc fingerprint. JSON lưu thêm fingerprint và blockers `{code,count}`; `project_lifecycle_decisions.legacy_exception_snapshot` nullable. Các row cũ/lệnh thường/reopen giữ null. Project, decision, snapshot và audit ghi trong cùng transaction, không sửa child.

Digest thường giữ nguyên `checksum(List.of(action, expectedVersion, trimmedReason))`. Digest ngoại lệ là `checksum(List.of("PROJECT_LIFECYCLE_LEGACY_EXCEPTION_V1", action, expectedVersion, trimmedReason, true, snapshotFingerprint))`; không fallback sang digest thường. Replay kiểm actor/hash trước version/state/freshness; replay thành công trả trạng thái hiện tại, không archive lại sau reopen. Cùng requestKey khác actor/payload: 409 `IDEMPOTENCY_CONFLICT`; version cũ: 409 `VERSION_CONFLICT`; snapshot thay đổi: 409 `LEGACY_BLOCKERS_CHANGED`; hard blocker hoặc không đủ điều kiện ngoại lệ: 409 `ARCHIVE_BLOCKED`.

History/latestDecision thêm `legacyException: null | {policyVersion, fingerprint, blockers:[{code,count}]}`. Giữ actorName/reason/decidedAt có sẵn làm thẩm quyền lịch sử; không công bố requestKey, payload hash hoặc credential. Không thay nghiệp vụ Ticket ẩn/xóa mềm trong AR-06; đường xử lý U26 được ghi riêng sau kiểm chứng runtime.

## Khôi phục Monkey và file đã ẩn — Arena AR-12, quyết định U26 ngày 03/11/2026

- `GET /api/v1/projects/{p}/issues?deleted=true` trả riêng Monkey đã xóa mềm, theo bộ lọc/phân trang hiện có, kể cả khi Feature đã lưu trữ. Mặc định `deleted=false` giữ danh sách hoạt động; `/issues/board` luôn dùng context hoạt động, không thêm cột đã xóa. Bản ghi trả `deletedAt`, `version`, `canRestore`, `restoreBlockedReason`; các capability ghi đều false khi đã xóa. Quyền đọc Issue giữ nguyên; GUEST không mở route nghiệp vụ Issue.
- `POST /api/v1/projects/{p}/issues/{id}/restore`, body `{expectedVersion, requestKey}` (version nguyên không âm, requestKey UUID), trả 200 Issue hoạt động. Chỉ PM dự án, Admin tổng hiện hành hoặc USER tạo chính Monkey đó được khôi phục. Giữ ID/key, context, nội dung, Status/kết luận, phân công/người xác nhận, comment và lịch sử; tăng version một lần và thêm đúng một history `RESTORE`, một audit `WORK_ITEM/RESTORE`, một ticket command. Ticket không phải Monkey không được khôi phục qua endpoint này.
- `GET /api/v1/projects/{p}/features/{f}/documents?archived=true` trả riêng file đã ẩn, áp dụng scope/keyword/archived trước COUNT/LIMIT/OFFSET. Mặc định active-only. Mỗi bản ghi có `archivedAt`, `version`, `canRestore`, `restoreBlockedReason`. Quyền đọc file hiện hành giữ nguyên.
- `POST /api/v1/projects/{p}/features/{f}/documents/{d}/restore` dùng cùng body version/requestKey, trả 200 `{id,featureId,version,archived:false,archivedAt:null,...}`. Chỉ PM dự án/Admin tổng được gọi. Chỉ bỏ `archived_at`, tăng lock version và ghi command `DOCUMENT_RESTORE` cùng audit `TEST_DOCUMENT/RESTORE`; không sửa bytes nguồn, case/row/document ID, kết quả/version/ngày thực hiện, phân công, lịch sử hoặc liên kết Ticket. File hoạt động đóng góp lại vào list/metrics/board theo visibility hiện có.
- Cả hai lệnh yêu cầu CSRF, tài khoản/membership còn hiệu lực, dự án và Feature hoạt động, khóa project trước dữ liệu con. Parent lưu trữ trả 409 `ARCHIVED`; UI hiển thị lý do và đường khôi phục project/Feature riêng, không tự khôi phục cha. ID sai project/Feature trả 404 hoặc lỗi quyền hiện có; USER không được khôi phục file/Monkey của người khác. Stale version trả 409 `VERSION_CONFLICT`; trạng thái đã hoạt động với requestKey mới trả 409 `NOT_DELETED`/`NOT_ARCHIVED`.
- Replay cùng requestKey/actor/payload không ghi lại lịch sử, audit hoặc version, kể cả sau một lần xóa/ẩn tiếp theo; không phục hồi lại do retry cũ. Cả Monkey và file restore replay trả version/trạng thái ẩn/xóa hiện tại (có thể đã bị xóa/ẩn lại); UI đọc lại danh sách để đối chiếu. Cùng key đổi payload/actor trả 409 `IDEMPOTENCY_CONFLICT`. Không có retry ghi tự động; thao tác lỗi chỉ hiện lỗi, nút tải lại chỉ GET.
- Xóa Monkey/ẩn file vẫn được phép khi còn Ticket mở, và **không kết thúc nghĩa vụ**. `OPEN_WORK_ITEMS` vẫn chặn archive theo `ticket_workflow_metrics.finalized`, không miễn context đã xóa/ẩn. Không đổi ngoại lệ legacy, không purge, không migration mới, không phục hồi mutation legacy.
