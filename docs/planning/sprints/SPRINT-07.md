# Sprint 07 — Kiểm thử lại, đóng/mở lại lỗi và nhất quán dữ liệu

Trạng thái theo [STATUS.json](../STATUS.json). **DONE phạm vi nội bộ ngày 29/09/2026**, triển khai trên nhánh `feature/sprint-07-retest`, base `develop` 3355cfc, giữ các thay đổi S01–S06 chưa commit. Quyết định tại [ADR-007](../../decisions/ADR-007-internal-retest.md), bằng chứng [review S07](../../reviews/2026-09-29-sprint-07.md).

## Mục tiêu

Tester retest đúng bản sửa và ghi nhận kết quả xác minh bug có lịch sử. Chỉ lần chạy lại toàn bộ case mới cập nhật kết quả thực thi mới nhất; việc đóng bug phải đủ coverage và tuân theo nguồn trạng thái được chốt tại Q01.

## Phụ thuộc và điều kiện vào

S06; chốt multi-case/multi-bug closure coverage, pending/Fix/NA semantics và quyền đóng/reopen.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không bulk đổi mọi case liên quan thành OK; không coi không tái hiện là đã sửa; không tự sửa kết quả cũ.

## Thứ tự task

### S07-T01 — Chính sách retest và đối chiếu

- **Feature:** Chính sách retest và đối chiếu
- **Objective:** Chốt guard cho nhiều case/bug/cấu hình, phân biệt phạm vi xác minh bug và chạy lại toàn case; thiết kế contract và truy vết.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/business/retest-policy.md; docs/api/openapi.yaml; Backend/**/retest/; docs/planning/decisions/
- **Backend changes:** Domain policy về điều kiện đóng, đóng do không tái hiện và mở lại; coverage có phiên bản chứa toàn bộ run item/cấu hình bắt buộc, không đếm trùng.
- **Frontend changes:** Chọn đúng run items và verificationScope; hiển thị bug khác còn mở, coverage còn thiếu và phân biệt đã xác minh nội bộ với đã đóng ở nguồn có thẩm quyền.
- **Database changes:** Thiết kế bug verification, coverage revision và liên kết scope riêng với execution attempt; giữ lịch sử bất biến.
- **API changes:** RetestRequest/response với verificationScope `BUG_ONLY` hoặc `FULL_CASE`, traceability và lỗi không đủ coverage; mỗi request chỉ thuộc một tổ hợp build/môi trường/thiết bị.
- **Business rules:** Dev báo đã xử lý chỉ mở đường retest. `BUG_ONLY` chỉ xác minh bug, không đổi kết quả full-case NG đang có; `FULL_CASE` mới tạo execution attempt và đổi kết quả full-case mới nhất. Đánh giá đóng trên toàn coverage hiện hành, kết hợp verification hợp lệ đã lưu và kết quả mới, không chỉ subset trong request. Nếu tracker ngoài là nguồn chính theo Q01, đã xác minh nội bộ chưa đồng nghĩa đã đóng cho đến khi có acknowledgment hợp lệ.
- **Tests / bằng chứng cần có:** Bảng tình huống cho một/nhiều case, nhiều bug, nhiều cấu hình, mở lại và không tái hiện; `BUG_ONLY` PASS không đổi case NG; coverage đủ nhờ nhiều request hợp lệ; kết quả cũ bị thay thế không được dùng bù; phân biệt xác minh nội bộ và đóng ở tracker ngoài.
- **Dependencies:** S06 và quyết định về phạm vi case phải kiểm tra trước khi đóng.
- **Risk:** Tự suy đoán mọi case phải OK hoặc cho phép người không có quyền đóng bug.
- **Definition of Done riêng:** Quy tắc/decision được ghi, API kết quả lỗi không mơ hồ.

### S07-T02 — Transaction retest backend

- **Feature:** Transaction retest backend
- **Objective:** Ghi verification, tổng hợp coverage và xử lý đề nghị đóng trong cùng transaction; chỉ ghi execution attempt/kết quả mới nhất khi verificationScope là `FULL_CASE`.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/**/retest/; Backend/**/execution/; Backend/**/workitem/; Backend/src/main/resources/db/migration/; Backend/src/test/
- **Backend changes:** Application service điều phối kiểm tra version bug/coverage và các khóa cần thiết theo thứ tự; tổng hợp kết quả cũ và mới còn hợp lệ; retry/idempotency. Đóng nội bộ hoặc ghi đang chờ đóng theo Q01; không chờ HTTP tracker ngoài trong transaction.
- **Frontend changes:** N/A — T03 nối.
- **Database changes:** Migration coverage/verification/liên kết/index nếu cần; không sửa NG cũ. Chỉ chuẩn bị điểm tích hợp cho S09, không ghi vào bảng outbox chưa tồn tại.
- **API changes:** Retest submit/reopen action, traceability/inconsistency queries.
- **Business rules:** Nếu yêu cầu đóng bug chưa đủ điều kiện thì từ chối toàn bộ request theo contract; có thể gửi lại chỉ để lưu verification. Không dùng PASS ở build cũ, coverage cũ hoặc trước lần FAIL/mở lại làm căn cứ đóng. Lỗi gửi ra hệ thống ngoài sau này không rollback dữ liệu nội bộ đã commit; thiếu acknowledgment hợp lệ không được báo authoritative status đã đóng.
- **Tests / bằng chứng cần có:** Gây lỗi giữa transaction, mở lại đồng thời, nhiều issue/nhiều run/cấu hình, gửi lại request, sai verificationScope và quyền đọc. Kiểm tra `BUG_ONLY` không đổi latest full-case; `FULL_CASE` cập nhật đúng; coverage tích lũy nhiều request, subset chưa đủ bị từ chối; acknowledgment cũ hoặc thiếu không đóng sai.
- **Dependencies:** S07-T01.
- **Risk:** Chỉ commit một phần; cập nhật đồng thời làm đóng nhầm; đếm sai do quan hệ N:N.
- **Definition of Done riêng:** Transaction/concurrency integration MySQL PASS, lịch sử NG vẫn nguyên.

### S07-T03 — UI retest và cảnh báo sai lệch

- **Feature:** UI retest và cảnh báo sai lệch
- **Objective:** Thực hiện flow có hướng dẫn và trạng thái chờ rõ.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Frontend/src/app/features/retest/; Frontend/src/app/features/work-items/IssueForm.jsx; Frontend/src/app/pages/TestRunnerGridPage.jsx; Frontend/src/app/modules/ProjectOverview.jsx
- **Backend changes:** Response projections, inconsistency read API.
- **Frontend changes:** Form retest chọn `BUG_ONLY`/`FULL_CASE`, bản build đã sửa, thiết bị, môi trường, chứng cứ và kết quả. Hiển thị toàn coverage và phần còn thiếu; xử lý xung đột, giữ bản nháp để thử lại, liên kết lịch sử case và cảnh báo chưa liên kết bug. Phân biệt đã xác minh nội bộ/đang chờ đóng/đã đóng ở nguồn có thẩm quyền.
- **Database changes:** N/A ngoài T02.
- **API changes:** Retest/traceability clients; cùng workitem cache invalidation.
- **Business rules:** Không tự ghi OK vì ticket closed; phân biệt closure reason.
- **Tests / bằng chứng cần có:** E2E Dev sửa → retest thất bại → mở lại → retest đạt ở từng cấu hình → đóng khi đủ coverage; `BUG_ONLY` PASS vẫn giữ case NG; `FULL_CASE` cập nhật kết quả case; tải lại cả ba view, lỗi mạng và trạng thái chờ xác nhận đóng từ tracker ngoài.
- **Dependencies:** S07-T02.
- **Risk:** Người dùng hiểu nhầm trạng thái submit thất bại là đã lưu.
- **Definition of Done riêng:** End-to-end luồng quan trọng PASS, cảnh báo có hành động xử lý rõ.

## Demo và nghiệm thu sprint

Retest `BUG_ONLY` PASS tạo verification và audit nhưng không đổi case NG. Retest `FULL_CASE` tạo attempt mới; các request theo từng cấu hình cộng đủ coverage mới đủ điều kiện đề nghị đóng. Nếu tracker ngoài là nguồn chính, hiển thị chờ đóng cho đến khi có acknowledgment hợp lệ. FAIL/mở lại đúng; lỗi DB giữa luồng không để dữ liệu nửa chừng.

- [x] Các task trong phạm vi đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [x] Không task bị chặn hoặc kiểm tra chưa chạy bị ghi thành DONE.
- [x] API/database/UI liên quan khớp nhau; migration kiểm tra fresh + upgrade.
- [x] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [x] Chỉ chuyển tiếp S08 sau kiểm chứng S07, theo ủy quyền tiếp tục tuần tự của người dùng; nghiệp vụ S08 tại ADR-008.

## Nhật ký thực hiện

29/09/2026 — T01 DONE: chốt PM toàn coverage, Tester được phân công, PM đóng/mở lại có căn cứ, TMS authority nội bộ. Policy, 9 operations OpenAPI/API docs; `Check-Contracts.cjs` PASS 56 operations tổng S04–S07. Không giả định acknowledgment tracker thật.

29/09/2026 — T02/T03 IN_PROGRESS: V8 gồm 7 bảng, backend transaction/idempotency/guards, UI chi tiết bug và hàng chờ `/tests/retests`. RED đầu: API chưa có trả 404 thay vì 403; GREEN sau triển khai. Review phát hiện cảnh báo thiếu bug cùng run khi bug ban đầu chưa có case; thêm test RED rồi sửa truy vấn coverage. Full backend 76 PASS, test retest mở rộng đang kiểm chứng; FE full 115 PASS, gate S07 13 PASS trên 80%. Local đã backup và nâng V8, 50 bảng ứng dụng, readiness PASS. Browser đang thử luồng PM → Tester → PM; chưa đánh dấu T02/T03 DONE trước bằng chứng cuối.

ECC áp dụng: product-capability → policy/constraints; api-design → contract/version/idempotency; tdd-workflow → RED/GREEN + MySQL/Vitest; frontend-patterns → loading/retry/draft; security-review → project PM/assignee/CSRF/FK/evidence; coding-standards → review code; verification-loop → build/coverage/upgrade/UI/docs. Review tự thực hiện, không gọi là review độc lập. Không commit/push/merge/deploy.

29/09/2026 — T02/T03 DONE: backend full 76 PASS, final retest 15 PASS; gate backend package S07 96.94% instruction / 80.47% branch / 100% line/method. FE full 115 PASS, build PASS, module S07 gate 13 PASS. Browser dùng PM và Tester riêng: FAIL về progress → coverage mới → BUG_ONLY PASS → PM close giữ NG #5 → PM reopen vô hiệu scope → coverage/request FULL_CASE mới → PASS tạo OK #6, reload giữ NG #5. SQL xác nhận cùng canonical bug và 50 bảng ứng dụng. Baseline toàn FE vẫn dưới 80%, lint/typecheck JS chưa cấu hình, các giới hạn được ghi trong review. Không có provider sync/UAT khách hàng.
