# API kiểm thử lại nội bộ — S07

[OpenAPI](retest.openapi.json), [chính sách](../business/retest-policy.md), [quyết định](../decisions/ADR-007-internal-retest.md).

Mọi endpoint thuộc `/api/v1/projects/{projectId}`. Session/CSRF theo API hiện có; project membership active bắt buộc. ADMIN toàn hệ thống không thay quyền PM dự án. Project archive chỉ đọc.

| Endpoint | Hành vi |
| --- | --- |
| GET `work-items/{id}/retest` | Current coverage, số đạt/tổng, tối đa 50 request/quyết định gần nhất và 100 bug khác còn mở cùng nguồn chạy |
| GET `retest-candidates?page&keyword` | Run items của đợt active, 50/trang; bước xác nhận còn kiểm tra revision duyệt, catalog và thành viên active |
| POST `work-items/{id}/retest-coverage` | PM xác nhận toàn phạm vi, tối đa 100 run items unique, reason và expectedVersion. Bug resolved/fixed build bắt buộc. Response 201 summary |
| POST `work-items/{id}/retest-requests` | PM chọn subset từ coverage hiện hành, một môi trường/thiết bị/người chạy; build lấy từ bản sửa của bug. 201 request |
| GET `retest-requests?page&mine&status` | Hàng chờ, mặc định mine=true, status không truyền là tất cả, 50/trang |
| GET `retest-requests/{id}` | Case/step/expected, ngữ cảnh chụp khi tạo, kết quả và quyền submit hiện hành |
| POST `retest-requests/{id}/results` | Người được phân công nộp toàn bộ mục của request. PASS/FAIL + actualResult, tùy chọn evidence của bug. 200 request |
| POST `work-items/{id}/closure` | PM: FIXED đủ current coverage; UNREPRODUCIBLE/WONTFIX cần chứng cứ/nguồn/lý do. 200 summary |
| POST `work-items/{id}/reopen` | PM mở terminal có reason, về progress; vô hiệu kết quả cũ. 200 summary |

`expectedVersion` kiểm tra phiên bản bug (coverage/request/closure/reopen) hoặc request (submit); submit còn có `expectedBugVersion` và `expectedRunVersion` từng mục. Không tự retry version mới; trả 409, giao diện giữ draft và người dùng đối chiếu bản hiện hành. RequestKey ASCII tối đa 64 ký tự; create/submit cùng key + actor + payload trả bản ghi đã lưu; khác nội dung trả `IDEMPOTENCY_CONFLICT`.

BUG_ONLY chỉ thêm verification. FULL_CASE thêm execution attempt bằng service S05, giữ kết quả cũ; nếu FAIL tự liên kết attempt NG mới với chính bug để không báo thiếu liên kết giả. Một FAIL vô hiệu hóa toàn vòng, đưa bug về progress và hủy request đang mở. Một PASS không đóng bug hoặc đổi trạng thái bug khác.

Kết quả của nhiều request cùng coverage/current build được tích lũy. Mỗi coverage item lấy verification mới nhất; coverage cũ không bù cho mục thiếu. `canClose` là độ sẵn sàng nghiệp vụ, không cấp quyền. `closeBug=true` chỉ dành cho PM được phân công; cần closureReason. Nếu thiếu coverage, rollback cả verification, execution mới, history và versions.

Các mã lỗi chính: 403 `PROJECT_PM_REQUIRED`, `NOT_ASSIGNED`; 404 `NOT_FOUND` cho dữ liệu khác project; 409 `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `STALE_COVERAGE`, `STALE_RETEST`, `ASSIGNMENT_CHANGED`, `BUG_NOT_RESOLVED`, `ARCHIVED`; 422 `COVERAGE_INCOMPLETE`, `DUPLICATE_SCOPE`, `INCOMPLETE_REQUEST`, `CONFIGURATION_MISMATCH`, `ASSIGNEE_MISMATCH`, `EVIDENCE_REQUIRED`, `REOPEN_REQUIRED`, `TERMINAL_REQUIRED`. Gỡ evidence đã dùng trả 409 `EVIDENCE_IN_USE`. Validation DTO trả 422 theo error envelope chung.

Danh sách request trong summary giới hạn 50; toàn bộ request/kết quả cũ truy cập qua hàng chờ phân trang và detail. Audit thay đổi đầy đủ dùng work-item history phân trang. Không có HTTP tracker trong transaction; Redmine/Backlog vẫn chưa đối soát.
