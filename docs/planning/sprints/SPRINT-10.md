# Sprint 10 — Kiểm thử toàn hệ thống, bảo mật và hiệu năng

Trạng thái theo [STATUS.json](../STATUS.json). Cập nhật 30/09/2026: **IN_REVIEW**, T02/T03 DONE trong phạm vi kiểm chứng kỹ thuật nội bộ; S03 đã DONE nội bộ; T01 còn gate S04/browser/UAT. Xem [review ECC](../../reviews/2026-09-30-sprint-10.md). Ước lượng ban đầu: **5–8 ngày công**, chưa phải lịch cam kết.

## Mục tiêu

Có bộ regression, bằng chứng quyền/dữ liệu/migration và UAT khép kín.

## Phụ thuộc và điều kiện vào

S02–S08; thêm S09 nếu bản phát hành bắt buộc tích hợp hệ thống ngoài. Sprint này bổ sung kiểm thử toàn hệ thống, không thay thế kiểm thử ở từng sprint trước.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không thêm domain mới, không rewrite UI, không tối ưu khi chưa đo.

## Thứ tự task

### S10-T01 — Regression và UAT nghiệp vụ

- **Feature:** Regression và UAT nghiệp vụ
- **Objective:** Chuẩn bị dataset ẩn danh và kịch bản vai trò, chạy toàn chuỗi.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/src/test/; Frontend/src/test/; Frontend/e2e/; docs/uat/; docs/planning/
- **Backend changes:** Bổ sung regression cho lỗi thật được tìm thấy.
- **Frontend changes:** E2E login→import→assign→NG→bug→fix→retest→report; keyboard/responsive.
- **Database changes:** Fresh install + upgrade từ release trước với dữ liệu cũ.
- **API changes:** Contract tests và mismatch list.
- **Business rules:** Khách/BrSE nghiệm thu quy tắc thực tế; fixture demo không thay thế bằng chứng đáp ứng chuẩn khách hàng.
- **Tests / bằng chứng cần có:** Luồng thành công, dữ liệu/quyền không hợp lệ, xung đột 409, thử lại, cập nhật hàng loạt và nhiều dự án; không chỉ kiểm tra build.
- **Dependencies:** S02–S08 và S09 nếu bắt buộc.
- **Risk:** Checklist PASS thiếu evidence, test dựa quá nhiều mock.
- **Definition of Done riêng:** Có liên kết bằng chứng UAT và không còn lỗi critical trong phạm vi; test thất bại tạo task sửa có giới hạn rõ ràng.

### S10-T02 — Bảo mật và dữ liệu

- **Feature:** Bảo mật và dữ liệu
- **Objective:** Kiểm tra quyền và đường dữ liệu nhạy cảm, sửa finding cụ thể.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/**/security/; Backend/**/attachment/; Frontend/src/app/services/api/; docs/security/
- **Backend changes:** Phân quyền tất cả đường đọc/ghi; kiểm tra CSRF/CORS, giới hạn tần suất, SQL có tham số, upload an toàn và che thông tin nhạy cảm trong log.
- **Frontend changes:** Hiển thị nội dung an toàn trước XSS, xử lý hết phiên, không lộ secret trong bundle.
- **Database changes:** Least privilege, retention/archive, credential rotation documented.
- **API changes:** Thống nhất policy 401/403/404 và loại bỏ thông tin nhạy cảm khỏi phản hồi lỗi.
- **Business rules:** Không lưu credential kiểm thử dưới dạng văn bản thuần; khách không đọc được chứng cứ nội bộ.
- **Tests / bằng chứng cần có:** Truy cập sai dự án/IDOR, gọi endpoint trực tiếp, stored XSS, tệp độc hại và rà log.
- **Dependencies:** S10-T01 hoặc chạy song song các test độc lập.
- **Risk:** Kiểm tra bảo mật chung chung nhưng không thử các trường hợp bị cấm hoặc dữ liệu độc hại.
- **Definition of Done riêng:** Finding critical/high đã sửa và kiểm thử lại; rủi ro được chấp nhận phải ghi người quyết định.

### S10-T03 — Hiệu năng và vận hành lỗi

- **Feature:** Hiệu năng và vận hành lỗi
- **Objective:** Đo dataset/latency mục tiêu, tối ưu query và xác nhận backup recovery.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/**/reporting/; Backend/src/main/resources/db/migration/; compose.yaml; docs/operations/; docs/performance/
- **Backend changes:** EXPLAIN, kiểm tra N+1 và phân trang; giới hạn jobs/pools; health/log/metrics; số benchmark phải từ phép đo thật.
- **Frontend changes:** Chỉ thêm phân trang/virtualization cho grid lớn khi phép đo cho thấy cần; hủy request và tải lại hợp lý.
- **Database changes:** Index mới có lý do; thực hành backup/restore vào DB riêng; diễn tập sửa bằng migration tiếp theo.
- **API changes:** Timeout, giới hạn tần suất/kích thước và contract tác vụ bất đồng bộ nếu cần điều chỉnh.
- **Business rules:** Chốt mục tiêu tải trước khi đo; atomic DDL không thay thế kế hoạch restore.
- **Tests / bằng chứng cần có:** Chạy tải bằng dataset ẩn danh với quy mô ghi rõ; migration thất bại và phục hồi; log có requestId.
- **Dependencies:** S10-T01; có môi trường đo/restore.
- **Risk:** Phép đo trên laptop bị coi là SLA production; restore chưa được thử.
- **Definition of Done riêng:** Báo cáo số đo, môi trường, giới hạn và bằng chứng restore; không cam kết SLA khi chưa có căn cứ.

## Demo và nghiệm thu sprint

Chạy bộ test từ import tới retest/report, ma trận quyền và fresh/upgrade database trên môi trường sạch.

- [ ] Các task trong phạm vi đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [x] Không task bị chặn hoặc kiểm tra chưa chạy bị ghi thành DONE.
- [x] Phần sửa được kiểm tra contract/API/database/UI. Đợt hoàn thiện review bổ sung V11 cho cấu hình; fresh/upgrade V11 PASS.
- [x] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [x] Chưa mở S11 khi gate S10 chưa hoàn tất.

## Nhật ký thực hiện

Nhật ký và bằng chứng chi tiết ở review liên kết phía trên; không coi bản nội bộ là nghiệm thu khách hàng.

30/09/2026 — T01/T02/T03 IN_PROGRESS. Nhánh feature/sprint-10-hardening base develop 3355cfc; giữ tree chưa commit. Áp dụng ECC: phân tích → test RED khi tìm lỗi → sửa → review code/security → verify/coverage → docs. Dataset đo riêng giả định 10.000 lượt/1.000 bug/20 concurrent; không SLA. Không thêm domain hoặc sửa V1–V10; giữ gate UAT/rule khách và S03/S04.

30/09/2026 — T01 IN_REVIEW; T02/T03 DONE phạm vi kỹ thuật nội bộ. Sửa timezone/catalog validation, route archive và response cũ của FE, lỗi filter khi DB quá tải; tối ưu report theo EXPLAIN. Vá 4 nhóm dependency/12 advisory, scan lại 94 runtime packages không còn finding. FE157 tests/build; BE159 tests/verify, HTTP toàn chuỗi và restore PASS; probe cuối 2 tests/300 requests PASS, P95 report 1.910 ms. Runtime local đã restart với Tomcat 10.1.60, MySQL 8.4.8/Flyway V10/10. Whole-app coverage chưa đạt 80% mọi chỉ số; keyboard/mobile/browser upload/UAT và mục S03/S04 vẫn mở. Không commit/push/merge/deploy; S11 PLANNED.

30/09/2026 — Theo yêu cầu review cho hoàn thiện, mở rộng T01 để sửa các phần S03/S04 còn thiếu. Có V11 (version cấu hình + rule snapshot), UI settings thực, validation/concurrency/audit, lịch sử sổ tay và focus dialog. [Review mới](../../reviews/2026-09-30-review-completion.md) ghi bằng chứng cuối và các gate còn lại; không tự ký UAT hoặc mở pilot.

Kết quả review cuối: 171 BE tests/verify, 181 FE tests/build PASS; settings/focus gate 33 tests PASS; S03 DONE nội bộ. S04-T03/S10-T01 vẫn IN_REVIEW vì browser đầy đủ và UAT chưa đủ bằng chứng.
