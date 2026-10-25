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
| AI target/background/owner | [ai-chat](ai-chat.md): projects/features selector theo server policy, PROJECT_CHAT optional Feature, PM AI global read không thành CRUD |
| Status/progress/quyền | [metrics](../business/metrics.md), [permissions](../business/permissions.md): P/NA tính tested, total gồm NA, Tester/DEV không management report |

Source đối chiếu: [FeatureController](../../Backend/src/main/java/vn/syp/tms/feature/FeatureController.java), [FeatureIssueController](../../Backend/src/main/java/vn/syp/tms/workitem/FeatureIssueController.java), [ProjectNotesController](../../Backend/src/main/java/vn/syp/tms/notes/ProjectNotesController.java), [ManagementReportController](../../Backend/src/main/java/vn/syp/tms/reporting/ManagementReportController.java), [AiReadScopeController](../../Backend/src/main/java/vn/syp/tms/ai/AiReadScopeController.java), [LegacyTestingWrites](../../Backend/src/main/java/vn/syp/tms/feature/LegacyTestingWrites.java), [FeatureIssueLegacyWrites](../../Backend/src/main/java/vn/syp/tms/workitem/FeatureIssueLegacyWrites.java). Kiểm lại implementation cuối khi root đóng băng source; liên kết tới source không thay bằng chứng chạy HTTP.

Notes giữ `P=/api/v1/projects/{p}/notes`: GET list page0-based,size1–100 → items/totalItems/page/size/totalPages; GET `/{id}`; POST `{title,body}` →201 + Location; PUT `/{id}` `{title,body,expectedVersion}`; DELETE `/{id}?expectedVersion=` →204 soft archive. Title1–200 sau trim, body không trắng tối đa10.000, giữ nguyên text body; không attachment/CMS. Member đọc, PM dự án/ADMIN CRUD; outside/wrong scope404, role403, stale409, thiếu version422. Archived project đọc được, không ghi; ADMIN không membership vẫn dùng identity tác giả thật.

UI: `/board` và `/board/testing` là hai khu vực ngoài, Kanban/list giữ bên trong Bảng trạng thái; Feature→file→case Back/deep link gắn actual projectId, đổi project xóa context sâu cũ trước fetch. `/issues` quản lý Bug/QA và Monkey; `/analysis` chỉ PM dự án/ADMIN; `/settings/notes` thay catalog menu; cấu hình AI trong Chat. Tổng quan chỉ đọc thông tin actual project, copy Spider Plus chỉ match code `SPIDER-PLUS` theo [nội dung được duyệt](../content/spider-plus-project-overview.md), không gán vào demo.

Không có generic Task create, run/session/start/end hoặc retest tự động cho luồng mới. Public legacy writes có410; old `/reports` kiểm quyền quản lý trước410, không lộ totals cho worker. GET lịch sử và dữ liệu giữ lại không chứng minh quyền ghi. Sửa report10→8 chỉ sửa stored Markdown; Issue vẫn10; cleanup AI draft/chat không được xóa saved report. A01–A20/native/browser/live AI được ghi bằng chứng riêng tại kế hoạch do root sở hữu, không suy từ test mock.

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
| Document detail/cell/result/export | Giữ rowId/caseId/revision/version; Status mới và assignment riêng | Active scope; cell editing theo quyền; Status Tester trách nhiệm hoặc PM/ADMIN; version/idempotency conflict 409 |
| Document assignments | membershipId, ranges, expectedVersion | PM/ADMIN quản lý; Tester chỉ phần mình; overlap/out-of-range 422/409; một transaction |
| `/issues` | BUG/QA, featureId, documentId/rowId tùy context, title/details; monkey flag, version/requestKey | Case context kiểm server; monkey Tester own CRUD, PM/ADMIN quản lý, DEV xử lý được giao; soft-delete; không NG/build/device/retest gate |
| `/notes` | title/body, expectedVersion; saved identity/time/version | PM/ADMIN CRUD, member đọc; scope 404, role 403, stale 409 |
| `/management-reports` | project + optional Feature, Markdown text/version | PM dự án/ADMIN read/create/edit/export; Tester/DEV 403; tách TTL chat/draft; không ghi ngược nghiệp vụ |

Giữ schema issue/work-item hiện có nếu mở rộng được: context Feature/file/row và identity author rõ; các required build/env/device cũ được bỏ cho Issue mới. Không giả mapping loại lịch sử sang BUG/QA; API tạo loại cũ bị chặn. Lối mới không gọi state machine retest/QA cũ như điều kiện bắt buộc.

Chốt bổ sung 25/10/2026: chi tiết Issue hiển thị **Feature hiện tại**, không chụp thông tin tại thời điểm tạo Issue. Response Issue có `featureName`, `featureEnvironment`, `featureDescription`, đọc trực tiếp từ Feature cùng dự án. Mở lại hoặc “Tải lại Issue” lấy giá trị mới nhất; không polling. Hai trường môi trường/mô tả có thể rỗng; UI ghi rõ chưa có thông tin. Đổi Feature không sửa nội dung, version hay lịch sử Issue. Không thêm migration hoặc đưa hai trường này vào payload sửa Issue/history snapshot.

Bổ sung cùng ngày cho **Tạo Issue từ case**: `GET /issues/context` cũng trả `featureName`, `featureEnvironment`, `featureDescription` hiện tại. Form hiển thị khối Feature trước các ô nhập Bug/QA, dùng chung component với chi tiết Issue. Mô tả Feature chỉ đọc, không chép vào `description` của Issue và không gửi lại trong payload tạo Issue. Giữ nguyên kiểm tra project/Feature/file/row và cơ chế tải lại khi lấy context thất bại.

## Quyền AI và metrics dùng chung

- PM và ADMIN được AI đọc liên dự án kể cả không membership; PM không có thêm quyền CRUD. Secret và chat riêng luôn ngoài context.
- Tester/DEV chỉ truy xuất chi tiết case/Issue/công việc trong quyền; management analysis/report/bulk export bị chặn tại API/capability. Ngoài quyền chỉ context kinh nghiệm đã tổng hợp, không tên/identity/raw tài liệu/số liệu riêng. Lọc trước retrieval/model và kiểm output/citation.
- Project/Feature đã chọn là target; background policy độc lập. Kết quả trải nghiệm dựa trên actor thực tế sau migration, không dùng source tester làm bằng chứng mới.
- tested = count(Status != UNEXECUTED), total gồm NA; 2U+OK+P+NA = 3/5 = 60%; total0 cho tiến độ0 với nhãn chưa có case. Các consumer đọc cùng identity và công thức, không đếm theo số assignee.
- Cấu hình AI trong chat dùng provider UI hiện có, per-account; thread/in-flight đã pin không thay nguồn/model/scope.

## Seams kiểm chứng đã có trong kế hoạch được người dùng yêu cầu

Public HTTP/API: role/scope/transaction/concurrency/persistence (A01–08,11–19). React UI: hành vi button/form/router/draft/error/focus (A07,09–13,17–20). Migration trên schema cô lập: workbook/current-content/FK/mapping/restore (A02–03,19). Browser fixture và HTTP thật được báo riêng. Không dùng test mock thay bằng chứng migration hoặc live AI.

## Bổ sung đối chiếu source 19/10/2026 — R01/R02/R03/R07/R08

- KPI Admin hiện hành là `feature-cases-v1`, từ Status của case thuộc file/Feature hoạt động; Bug counters chỉ từ Issue context hoạt động. Milestone chỉ tính BUG/QA được liên kết rõ, không dùng cycle/Task cũ làm cảnh báo mới. [Định nghĩa metrics](../business/metrics.md).
- Legacy `POST /api/v1/projects/{p}/status-reports` trả410 `USE_FEATURE_REPORTS` sau quyền PM dự án/ADMIN; lịch sử GET giữ tác giả/nội dung, `canPost:false`, không cho Tester/DEV hoặc PM ngoài scope. [Chi tiết API và Admin-only history](reporting.md).
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
- `expectedVersion` chống ghi đè khi sửa đồng thời; replay cùng requestKey/actor/status/version/date không nhân đôi lịch sử; payload khác bị 409. Quyền sửa tuân theo phân công case hiện hành; DEV/không được phân công không được ghi.
- UI gợi ý version có ngày tạo theo Asia/Ho_Chi_Minh gần nhất không sau ngày thực hiện, cùng ngày chọn createdAt/id mới nhất. Người dùng chọn lại được. Đổi toolbar không ghi database.
- Lịch sử và Excel hiện hành thêm Version test/Ngày thực hiện; cột ghi chú thực thi gốc được giữ riêng, tải file gốc không thay đổi.
