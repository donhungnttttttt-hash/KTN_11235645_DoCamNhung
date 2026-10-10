# API contract dự kiến

Ngày: 22/09/2026. **DRAFT cho API nghiệp vụ S03 trở đi.** S01 có health/diagnostic local; S02 có identity nội bộ theo [ADR-002](../decisions/ADR-002-internal-auth.md). Contract thực tế ở [OpenAPI](../api/openapi.yaml) và [identity](../api/identity.md). Inventory còn lại là thiết kế cho các sprint tiếp theo; không coi JSON nghiệp vụ dưới đây là đã được khách hàng duyệt.

## Quy ước

- Prefix `/api/v1`. Ký hiệu `P` trong bảng nghĩa là `/api/v1/projects/{projectId}`.
- ID API là chuỗi opaque; mã hiển thị như `SFLUTTER-6071` tách khỏi PK. Không sinh mã bằng max ID ở trình duyệt.
- Server lấy actor từ session, không tin `userId`/role do client gửi. Mọi ID con phải thuộc project trên URL. Client không tự quyết transition.
- Phương án nền tảng: session cookie HttpOnly, Secure ở HTTPS, CSRF cho mutation; S02 chốt ADR, không tự thêm JWT/SSO hoặc lưu token vào localStorage.
- Timestamp ISO-8601 UTC; trường chỉ có ngày dùng `YYYY-MM-DD`. Báo cáo ngày dùng timezone cấu hình project, không ngầm dùng ngày UTC.
- Phân trang `page=0&size=20` (giới hạn tối đa dự kiến 100, chốt theo tải). Response `{items, page, size, totalElements}`. Sort theo whitelist và thêm ID để ổn định; lọc có project/cycle/type/status/build/assignee/keyword. Không tải toàn bộ database để lọc frontend.
- Mutation đối tượng có revision gửi `expectedVersion`; stale write trả 409, không ghi đè. POST có thể lặp do retry (execution/bug/import/retest/external send) dùng `Idempotency-Key`, scope actor + project + operation, hash payload; lặp cùng payload trả cùng kết quả, khác payload trả 409. Chính sách lưu key được chốt S01/S05.
- 400: request sai kiểu; 401: chưa đăng nhập; 403: không đủ quyền; 404: không tồn tại/ngoài project theo chính sách chống lộ dữ liệu; 409: version/transition/idempotency conflict; 413: upload quá lớn; 415: loại file không hỗ trợ; 422: vi phạm quy tắc nghiệp vụ; 429: giới hạn truy cập; 500/503: lỗi hệ thống/tạm thời. OpenAPI phải chỉ rõ những mã thực sự áp dụng cho từng operation.
- Error: `{code, message, fieldErrors:[{field,code,message}], requestId}`. Thông báo hiển thị tiếng Việt, code ổn định. Không trả stack trace, thông tin kết nối hoặc secret.

## Inventory theo sprint

Quyền bên dưới là tên dự kiến để làm contract; ma trận quyền cần xác nhận ở S02. `read` luôn có nghĩa là đọc trong project mình được cấp quyền. Transaction ghi phải kèm audit, read dùng projection có project scope.

Các hàng gộp GET với POST/PATCH chỉ nhằm rút gọn inventory: **GET cho member/customer có quyền đọc đúng scope; quyền editor/admin ghi trong hàng áp dụng cho mutation**, không bắt người xem phải có quyền sửa. OpenAPI tách từng method và permission. Mọi comment/evidence/handbook còn phải kiểm tra visibility ngoài project membership.

| Sprint | Method / endpoint | Mục đích, DTO chính | Quyền và validation trọng yếu | Transaction / kết quả |
| --- | --- | --- | --- | --- |
| S01 | GET `/actuator/health` | Readiness tối thiểu, không lộ cấu hình | Public liveness tối thiểu; chi tiết hạn chế | Read, 200/503; không phải business API |
| S02 | GET `/api/v1/auth/csrf` | Lấy CSRF token cho client cookie-session | Không expose session secret | Read; 200 |
| S02 | POST `/api/v1/auth/login` | LoginRequest username/password | Kiểm tra credential, rate limit, thông báo lỗi không tiết lộ account | Session rotate; 200/401/429 |
| S02 | POST `/api/v1/auth/logout` | Hủy session | Session + CSRF | 204 |
| S02 | GET `/api/v1/me` | Profile/roles/permissions, chưa có membership | Authenticated | Read; 200/401 |
| S02 | GET/POST `/api/v1/users` | List / tạo tài khoản nội bộ | GET Admin; POST Admin hoặc PM được cấp (PM chỉ tạo Tester); không trả hash | Read / create + audit; 200/201/403/409 |
| S02 | PATCH `/api/v1/users/{userId}` | Enable/disable, cấp/thu hồi quyền tạo user của PM | Chỉ Admin; expectedVersion, không tự khóa | Update + revoke session khi thay đổi; 200/403/409 |
| S03 | GET/POST `/api/v1/projects` | ProjectSummary / ProjectCreate | Danh sách theo membership; create quyền riêng | Read / create; 200/201 |
| S03 | GET/PATCH `P` | ProjectDetail / Update | Project admin; code immutable khi đã dùng, expectedVersion | Read / update + audit |
| S03 | GET/PUT `P/members/{userId}` | Membership/role bindings | PM/Admin được phép; không tự nâng quyền, kiểm tra member tồn tại | Update + audit; 200/403/409 |
| S03 | GET/POST/PATCH `P/catalogs/{kind}[/{id}]` | Build, environment, device, milestone, category | Whitelist kind; mã unique project; archive thay xóa reference đã dùng | CRUD có giới hạn + audit; từng operation tách riêng trong OpenAPI |
| S03 | GET/POST `P/bug-rule-versions` | Required fields, title format, rule reference, version | PM/BrSE có quyền cấu hình; không thực thi script tùy ý | Immutable version; publish action riêng; 200/201/422 |
| S03 | POST `P/bug-rule-versions/{id}/publish` | Áp dụng rule mới cho ticket mới | Actor có quyền; rule đã review; expectedVersion | Publish + audit, giữ version cũ; 200/409 |
| S03 | GET/POST/PATCH `P/handbook[/{id}]` | Hướng dẫn, link, visibility | Project editor; sanitize; không lưu password/token trong bài | Revision + audit; quyền read nội bộ/khách khác nhau |
| S04 | GET/POST `P/test-suites` | Suite tree / metadata | Case editor, parent cùng project | Read / create + audit |
| S04 | GET/POST `P/test-cases` | Search / CaseDraft | Project + suite; source reference, original/translation metadata | Create draft + audit; 201/422 |
| S04 | GET/POST `P/test-cases/{id}/revisions` | Lịch sử / revision mới | Revision hiện hữu immutable; không sửa nội dung khách đã duyệt tại chỗ | Append revision; 201/409 |
| S04 | POST `P/test-cases/{id}/revisions/{revisionId}/approve` | Duyệt bản dùng cho test | Vai trò có quyền theo Q về owner; không tự duyệt thay khách | Audit approval; 200/403/409 |
| S04 | POST `P/test-cases/{id}/archive` | Ngừng chọn case cho run mới | Case editor; expectedVersion; giữ mọi revision/run cũ | Archive + audit; 200/409 |
| S04 | POST `P/import-previews` | File + mapping → preview lỗi từng dòng | Case import; giới hạn size/type/rows, nguồn mẫu được xác nhận | Stage có TTL; chưa ghi case thật; 201/413/415/422 |
| S04 | POST `P/import-previews/{id}/commit` | Import đã review | Same project, preview chưa hết hạn, idempotency | All-or-nothing trong giới hạn MVP; job nếu tải lớn; 201/409 |
| S05 | GET/POST `P/test-cycles` | Cycle + build/environment/phạm vi | PM; dates/catalogs cùng project | Create snapshot scope + audit |
| S05 | POST `P/test-cycles/{id}/activate` | Chốt case revision, tạo run items | Revision đã approved; cấu hình execution đầy đủ | Atomic activate; 200/409/422 |
| S05 | POST `P/test-cycles/{id}/transitions` | Hoàn tất/hủy/mở lại cycle theo policy đã chốt | PM; action, expectedVersion, reason; kiểm tra scope và kết quả | State + audit; 200/409/422; chưa chốt policy thì chưa expose action |
| S05 | GET `P/test-cycles/{id}/run-items` | Lưới thực thi phân trang | Member/customer theo scope; stable filter/sort | Read projection |
| S05 | PUT `P/run-items/{id}/assignment` | Gán tester | PM; tester đang là member, expectedVersion | Update + audit; 200/409 |
| S05 | POST `P/run-items/{id}/attempts` | ExecutionAttemptRequest | Tester được phân công/quyền thay thế; build/environment/device, actual result | Append + update latest pointer + audit; 201/409/422 |
| S05 | GET `P/run-items/{id}/attempts` | Lịch sử lần chạy bất biến | Read scope | Read; không trả mock history |
| S06 | GET/POST `P/work-items` | List/kanban / CreateWorkItem | Type=BUG thêm rule validation + linked execution; standalone bug theo quyết định | Create item/details/links/history/audit atomic; 201 |
| S06 | GET/PATCH `P/work-items/{id}` | Detail / edit fields | Field whitelist, permission, expectedVersion; không PATCH status trực tiếp | Update + audit; 200/409/422 |
| S06 | GET `P/work-items/{id}/available-transitions` | Action/target/required fields | Server tính theo actor + rule + state | Read; UI dùng cả form/kanban/batch |
| S06 | POST `P/work-items/{id}/transitions` | TransitionRequest | Action, reason, expectedVersion, confirmation/fixed build tùy action | State + history + audit; closure by retest ở S07 |
| S06 | POST `P/work-items/{id}/clarifications` | Câu hỏi và quyết định spec từ BrSE | Người được cấp quyền ghi nguồn/actor/time; không tự gửi Slack | Append record + audit; 201 |
| S06 | POST `P/work-items/{id}/execution-links` | Gắn bug đã có vào attempt NG | BUG_LINK; attempt cùng project; lý do và idempotency; không tạo bug mới | Link unique + audit; 201/409/422 |
| S06 | POST `P/work-items/{id}/external-references` | Ghi mã/URL tracker ngoài có sẵn | BUG_LINK_EXTERNAL; provider/reference có validation; chưa phải sync | Metadata + audit; 201/409; không fetch URL tùy ý |
| S06 | GET/POST `P/work-items/{id}/comments` | CommentRequest + visibility | Author/visibility theo project; sanitize | Append + audit; 200/201 |
| S06 | POST `P/attachments` | File evidence | Upload permission; limit, MIME/magic bytes, tên an toàn | Stage file + metadata; gắn owner xác nhận; 201 |
| S06 | GET `P/attachments/{id}/content` | Download evidence | Kiểm tra quyền đối tượng sở hữu; không chỉ biết URL là tải được | Stream; 200/403/404 |
| S06 | POST `P/work-item-batches/transitions` | Batch action + versions | Cùng policy từng item; giới hạn batch | MVP atomic all-or-nothing để rõ outcome; 200/409/422 |
| S07 | POST `P/work-items/{id}/retests` | RetestRequest | Tester, fixed build/điều kiện + scope đầy đủ theo policy | Verification; chỉ FULL_CASE mới ghi execution; closure khi đủ điều kiện/authority + audit atomic; 201/409/422 |
| S07 | GET `P/traceability` | Case revision ↔ attempt ↔ bug ↔ external reference | Quyền read; filter cycle/build | Read projection, distinct counts |
| S07 | GET `P/inconsistencies` | Cảnh báo missing bug / closure chưa đủ verify | PM/QA scope | Read; không tự chữa dữ liệu |
| S08 | GET `P/overview` | Status counts, activity, milestone | Read + visibility nội bộ/khách | Read tổng hợp cùng nguồn; có asOf, scope, metricDefinitionVersion |
| S08 | GET `P/test-cycles/{id}/progress` | Tiến độ theo thành viên/ngày/build | Read; timezone + policy đếm rõ | Projection; không lấy số nhập tay |
| S08 | GET `P/reports/quality` | Open bugs, severity, retest, trend | Report permission; cùng scope dashboard | Read; dữ liệu thiếu trả unavailable, không bịa forecast |
| S08 | POST `P/report-exports` | Scope + format | Export permission; audit, cap dung lượng | Snapshot + file; không gửi Notion/Slack |
| S09 | GET `P/integrations/redmine`, GET `P/work-items/{id}/redmine` | Mapping không bí mật và trạng thái/snapshot/lịch sử | Thành viên dự án | Contract thực thi: [redmine.md](../api/redmine.md) |
| S09 | POST `P/work-items/{id}/redmine-deliveries`, `.../redmine-reconciliations` | Công bố snapshot hoặc đối chiếu | PM dự án, CSRF/version/request key/reason | Outbox commit → 202, không tự sửa TMS từ remote |
| S09 | POST `P/redmine-deliveries/{id}/retry` | Thử lại lỗi đã xác định | PM, version/reason, audit | Không phát lại CREATE chưa rõ kết quả |

## Contract chi tiết cho các use case rủi ro

### Tạo bug từ lần chạy NG — S06

`POST P/work-items`, authenticated, quyền `BUG_CREATE`, `Idempotency-Key` bắt buộc theo đề xuất.

```json
{
  "type": "BUG",
  "title": "[Xuất báo cáo] Không xuất được ảnh chỉ dẫn sang PDF",
  "ruleVersionId": "rule-v3",
  "sourceAttemptIds": ["attempt-42"],
  "environmentId": "env-1",
  "buildId": "build-160",
  "deviceId": "device-3",
  "steps": ["Mở bản vẽ có ảnh chỉ dẫn", "Chọn xuất PDF"],
  "expectedResult": "PDF chứa các ảnh đã chọn",
  "actualResult": "PDF thiếu ảnh",
  "severityCode": "TO_BE_CONFIRMED",
  "attachmentIds": ["attachment-7"]
}
```

`TO_BE_CONFIRMED` minh họa vị trí severity, **không phải enum sẽ cho phép trên API**. Severity list/title regex/evidence-required theo rule khách ở S03, không hardcode từ ví dụ. Ảnh/thiết bị là reference metadata phải snapshot để lịch sử không đổi theo catalog.

Validate title/steps/expected/actual, catalog và source attempts cùng project, rule version còn hợp lệ, attachment đã upload và được actor dùng. Nếu standalone bug được phép phải có source/context và lý do theo rule riêng. 201 trả `{id,key,type,status,version,ruleVersionId,sourceAttemptIds,createdAt}`. 422 trả fieldErrors; 409 khi idempotency collision. Không gọi Redmine trong transaction này.

### Chuyển trạng thái — S06/S07

Request `{action, expectedVersion, reason, fixedBuildId, confirmationId}` với field tùy action. Server kiểm tra actor/current-state/preconditions/ruleset trước khi ghi. Drag/drop chỉ gửi action rồi hiển thị kết quả hoặc trả card về vị trí cũ khi bị từ chối. Không tin target state từ UI.

Hoàn thành đã verify không được dùng API PATCH hoặc bulk để vượt điều kiện retest. Kết thúc “không tái hiện/không xử lý” dùng điều kiện và quyền riêng, không tự tạo kết quả OK.

### Ghi retest — S07

**Đã chốt nội bộ:** contract triển khai tại [retest.md](../api/retest.md) và [retest.openapi.json](../api/retest.openapi.json). PM xác nhận coverage trước, tạo request cho một cấu hình/người chạy; Tester submit theo request ID, PM closure/reopen riêng. Truy vết/cảnh báo ở `GET work-items/{id}/retest`, request detail và execution history, không tạo endpoint trùng chỉ để giữ tên trong blueprint. `closeBug` là tên thực tế của đề nghị đóng nguyên tử. TMS authority nội bộ theo ADR-007; các đoạn dưới là mô hình phân tích ban đầu.

Request dự thảo `{expectedVersion, fixedBuildId, environmentId, deviceId, results:[{runItemId,expectedRunItemVersion,verificationScope,result,actualResult,evidenceIds}], closureRequested, reason}`. Một request chỉ cho **một cấu hình build/environment/device**. `verificationScope` phân biệt `BUG_ONLY` và `FULL_CASE`; enum cuối cùng chốt trong OpenAPI S07. Server tổng hợp bằng chứng hợp lệ từ các request trước và hiện tại trên **toàn bộ phạm vi case/cấu hình bắt buộc**, không chỉ các item client gửi lên. Một iPad đạt không chứng minh iPhone đạt.

Không ghi đè attempt NG cũ. Retest chỉ xác nhận một bug (`BUG_ONLY`) ghi bug-verification riêng, không tự biến kết quả toàn case thành OK. Chỉ lần chạy lại toàn bộ expected result (`FULL_CASE`) mới tạo kết luận case mới; xét các blocker liên quan theo policy đã chốt. Transaction ghi bằng chứng/attempt phù hợp, cập nhật latest conclusion nếu đủ điều kiện, đóng local bug khi coverage đáp ứng và thêm history/audit. Nếu yêu cầu close chưa đủ điều kiện, trả 422 và rollback toàn bộ request; UI cho phép gửi lại kết quả với `closureRequested=false`, nêu rõ chưa lưu ở lần thất bại. Stale version trả 409, không đóng nhầm bug vừa bị reopen. S07 phải chốt UX và kiểm thử rollback/retry.

Nếu Redmine/Backlog được xác nhận là nguồn trạng thái chính, `localVerified`/quyết định đóng ở TMS và `externalStatus` là hai dữ kiện riêng: chưa có acknowledgement thì hiển thị chờ đồng bộ/conflict, không báo workflow của khách đã đóng. Q01 phải chốt authority trước khi dùng thật; outbox không tự biến TMS thành nguồn chính.

### Đọc tiến độ — S08

Response phải nêu `scope={projectId,cycleId,buildIds,timezone}`, `asOf`, `metricDefinitionVersion`, counts và denominator. Phân biệt **số run item có kết quả mới nhất**, **số lần thực thi**, **số bug distinct**. Ba đại lượng không thay thế nhau; join N:N phải tránh nhân đôi bug. Xử lý zero denominator bằng null/0 theo contract, không NaN. Không gom tất cả work item thành bug.

## Tài liệu sẽ tạo trong triển khai

S01 tạo `docs/api/openapi.yaml` với conventions/health, S02+ bổ sung từng feature. Validation/schema enum/permission/HTTP status/transaction, example request/response và negative examples là đầu ra bắt buộc của task contract. S01–S02 chọn cách kiểm tra contract trong CI; backend tests phải đối chiếu contract, frontend API clients tập trung ở `Frontend/src/app/services/api/`. Không sinh toàn bộ endpoint ngay khi đọc file này.

## Contract S08 đã triển khai

Các endpoint dự kiến S08 trong bảng trên được hợp nhất thành `GET P/reports/summary` (cycleId/buildId/page) và `GET P/reports/export.xlsx`. Cả ba màn dùng cùng summary/metricDefinitionVersion/asOf/timezone và dữ liệu nguồn. NA: GET/POST `P/run-items/{id}/scope-decisions`; chốt/mở đợt: GET/POST `P/test-cycles/{id}/decisions`. Không thêm export job bất đồng bộ. Xem [contract chính xác](../api/reporting.md) và [OpenAPI S08](../api/reporting.openapi.json); JSON có schema request, permission/error và caps.
