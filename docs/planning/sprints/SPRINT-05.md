# Sprint 05 — Đợt kiểm thử, phân công và ghi nhận thực thi

Trạng thái theo [STATUS.json](../STATUS.json). Kế hoạch lập 22/09/2026; đã triển khai trên `feature/sprint-05-execution`, bằng chứng và phần review còn lại ở nhật ký bên dưới. Ước lượng ban đầu: **6–9 ngày công**, chưa phải lịch cam kết.

## Mục tiêu

Mỗi lần kiểm thử ghi đúng người thực hiện, bản build, môi trường, thiết bị và phiên bản case; dữ liệu được lưu bền vững.

## Phụ thuộc và điều kiện vào

S04; chốt ý nghĩa kết quả OK/NG/P/Fix/NA và chính sách tính scope.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Chưa tự đóng bug; chưa giả vờ NG đã được gửi Redmine; không hoàn thiện dashboard ở sprint này.

## Thứ tự task

### S05-T00 — Rà soát thiết kế database (phạm vi bổ sung theo yêu cầu 28/09/2026)

- Đối chiếu V1–V5 với toàn bộ luồng nghiệp vụ, lập inventory schema thực tế và ERD/domain relationships.
- Phân biệt phần còn thiếu và phần chỉ thiếu tài liệu, không tạo lại identity/session/audit.
- Bổ sung V6 execution theo ADR-005; các bảng bug/evidence/retest/integration có task S06–S09 và gate nghiệp vụ.
- DoD: tài liệu khớp DDL, mỗi bảng có scope/FK/unique/vòng đời/truy vấn; fresh + upgrade và constraint tests PASS.

### S05-T01 — Cycle và phân công

- **Feature:** Cycle và phân công
- **Objective:** Chốt contract/domain snapshot và backend cycle/run items.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/api/openapi.yaml; Backend/**/execution/; Backend/src/main/resources/db/migration/; Frontend/src/app/features/test-cycles/
- **Backend changes:** Cycle draft/activate/scope snapshot, member assignment và optimistic locking.
- **Frontend changes:** Chọn cycle/build; gán người có quyền; xem scope frozen.
- **Database changes:** Cycles/run_items/assignments; FK tới case revision được chọn.
- **API changes:** Cycle/create/activate/runitems/assignment endpoints.
- **Business rules:** Không dùng tháng/file Excel làm identity; một run item là đơn vị scope, nhiều attempts.
- **Tests / bằng chứng cần có:** Kích hoạt lặp, phiên bản case không hợp lệ, cập nhật phân công từ dữ liệu cũ, tham chiếu sai dự án và bản build đã lưu trữ.
- **Dependencies:** S04 + quyền phân công.
- **Risk:** Cycle scope đổi khiến tỷ lệ hoàn thành không còn ý nghĩa.
- **Definition of Done riêng:** Snapshot/assignment tests PASS, contract mô tả sửa scope có version.

### S05-T02 — Execution attempts

- **Feature:** Execution attempts
- **Objective:** Lưu lần chạy bất biến và latest result có kiểm soát.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/**/execution/; Backend/src/main/resources/db/migration/; docs/business/execution-results.md
- **Backend changes:** Append attempts, actor từ auth, version snapshots, validate result/reasons, idempotency/transaction/audit.
- **Frontend changes:** N/A — T03 nối grid.
- **Database changes:** Attempt history/latest pointer; race-safe concurrency; index lịch sử có lý do.
- **API changes:** POST/GET cho run items và attempts; expectedVersion và phản hồi 409 khi xung đột.
- **Business rules:** NG cần kết quả thực tế và ngữ cảnh kiểm thử; NG ở S05 được đánh dấu chờ liên kết bug, không làm mất kết quả đã ghi; không coi đây là workflow hoàn chỉnh trước S06.
- **Tests / bằng chứng cần có:** Gửi lại cùng yêu cầu, hai tester cập nhật đồng thời, thiếu môi trường/bản build/thiết bị, rollback và lịch sử không bị sửa.
- **Dependencies:** S05-T01 + semantics result được chốt.
- **Risk:** Xoay status bằng click làm sai kết quả; ghi đè lịch sử.
- **Definition of Done riêng:** Kiểm thử các điều kiện bất biến và cập nhật đồng thời PASS; có truy vấn NG đang chờ liên kết bug.

### S05-T03 — Nối runner và lỗi trạng thái

- **Feature:** Nối runner và lỗi trạng thái
- **Objective:** Thay vòng STATUS_CYCLE bằng hành động ghi kết quả rõ ràng, tách component/hook.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Frontend/src/app/pages/TestRunnerGridPage.jsx; Frontend/src/app/features/test-execution/; Frontend/src/app/services/api/
- **Backend changes:** Execution projection/filter theo assignment, loại API không đúng quyền.
- **Frontend changes:** Form ghi kết quả và xác nhận ngữ cảnh; trường tham chiếu chứng cứ; trạng thái lưu, đang tải, lỗi, thử lại, xung đột và lịch sử. Giữ thao tác bảng hữu ích; upload tệp thật thuộc S06-T03.
- **Database changes:** N/A ngoài T01/T02.
- **API changes:** Execution client, draft chỉ trạng thái nhập; thành công dựa response.
- **Business rules:** Không hiển thị đã lưu khi yêu cầu thất bại do mạng; không tự ghi OK khi Dev báo đã sửa.
- **Tests / bằng chứng cần có:** E2E tester được phân công → ghi NG → tải lại → thêm lần chạy thứ hai; phản hồi 409 giữ bản nháp; phản hồi 403; build.
- **Dependencies:** S05-T02.
- **Risk:** Tách component grid lớn làm mất định dạng/đổi độ rộng cột; các lần tự lưu ghi đè nhau.
- **Definition of Done riêng:** Runner dùng dữ liệu thật, test/lịch sử đúng; chức năng prototype chưa nối được đánh dấu rõ.

## Demo và nghiệm thu sprint

PM phân công; tester ghi NG; reload vẫn giữ; lần chạy sau thêm history thay vì ghi đè lần cũ.

- [ ] Các task trong phạm vi đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [ ] Không task bị chặn hoặc kiểm tra chưa chạy bị ghi thành DONE.
- [ ] API/database/UI liên quan khớp nhau; migration kiểm tra fresh + upgrade nếu có.
- [ ] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [ ] Chưa tự triển khai sprint kế tiếp.

## Nhật ký thực hiện

### 28–29/09/2026 — S05-T00/T01/T02/T03

- Database: inventory V1–V6, ERD và kế hoạch bảng S06–S09 tại [system-design](../../database/system-design.md); V6 thêm 7 bảng, không tạo trùng identity/session/audit. Giữ migration đã áp dụng; [ADR-005](../../decisions/ADR-005-execution-database.md).
- Backend: `execution/ExecutionService`, controller và DTO; cycle DRAFT/ACTIVE, cấu hình, scope theo revision đã duyệt, assignment history, attempt append-only, latest pointer, retry/idempotency và 409. Catalog writes dùng khóa dự án cùng thứ tự với execution.
- Frontend: thư viện liên kết sang `#/tests/cycles`; runner và các dialog dùng API thật, giữ bản nháp khi lỗi, không tự coi Fix là OK; legacy runner được thay bằng adapter. Đã ghi NG, reload và thêm lần chạy OK trên demo local, vẫn giữ NG cũ.
- Contract/nghiệp vụ: [API execution](../../api/execution.md), [quy tắc kết quả](../../business/execution-results.md), [ma trận quyền](../../business/permissions.md). Q08 vẫn mở cho NA/đóng đợt.
- Áp dụng ECC: `api-design` đối chiếu 13 API execution; `security-review` rà quyền/project scope/CSRF/parameterized SQL; `frontend-patterns` tách AssignmentDialog và ngăn response cũ; `tdd-workflow` tái hiện 3 lỗi phân công rồi sửa, thêm test tải lại thất bại và test thời gian UTC; `verification-loop` chạy test/build/kiểm tra tài liệu và ghi coverage thực tế.
- Quy trình skill được lưu tại [hướng dẫn ECC](../../development-skills.md), AGENTS.md và execution guide. Không áp dụng 39 skill đồng loạt hoặc đổi stack theo ví dụ trong skill.
- Kiểm tra chi tiết, kết quả cuối và việc tiếp theo xem [review 29/09](../../reviews/2026-09-29-sprint-05.md). Chưa commit/push/merge; không triển khai S06 trong lần này.

## Quyết định cập nhật 28/09/2026

Người dùng đã chốt: **Fix = dev báo đã sửa, tester kiểm thử lại**, chưa phải OK/Pass. Xem [ADR-004](../../decisions/ADR-004-test-case-import-and-approval.md). Không dùng vòng click trong prototype làm state machine. Người dùng đã yêu cầu mở S05 và bổ sung review database. Prerequisite thư viện/case approval/membership/catalog đã có kiểm thử; các mục review S03/S04 không bị đánh dấu DONE. Q08 còn chặn đóng đợt và NA; không chặn cycle DRAFT/ACTIVE, phân công và OK/NG/P.

### 29/09/2026 — Hoàn tất review S05

T00–T03 DONE theo phạm vi ADR-005. 48 BE tests + 60 FE tests + build PASS; coverage execution FE/API và BE đều đạt gate80; browser PM→Tester→NG→reload→OK giữ lịch sử PASS. Chi tiết tại [review](../../reviews/2026-09-29-sprint-05.md). Q08 chưa chốt vẫn theo dõi, không tự thêm NA/đóng đợt. Người dùng cho phép tiếp tục S06.
