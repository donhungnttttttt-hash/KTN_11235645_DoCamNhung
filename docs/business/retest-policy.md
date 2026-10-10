# Chính sách retest nội bộ — Sprint 7

## Khả năng

PM chuẩn bị phạm vi xác minh toàn bộ bug đã sửa; Tester được phân công kiểm thử trên đúng build/cấu hình và lưu kết quả có lịch sử. PM có thể đóng sau khi đủ PASS hoặc mở lại có lý do. Quyết định được xác nhận tại [ADR-007](../decisions/ADR-007-internal-retest.md).

## Ràng buộc

- Một bug giữ nguyên canonical ID. Coverage là danh sách run item trong dự án, không rút gọn theo những mục vừa gửi trong một request.
- Coverage mới có số phiên bản, reason, actor và build; tối đa 100 mục để giữ transaction hữu hạn. Chỉ chuẩn bị khi bug Đã xử lý và có fixed build. PM có thể xác nhận lại scope nếu sửa hoặc thêm liên kết nguồn.
- Một request chỉ chứa mục cùng môi trường/thiết bị/build/người thực hiện. Người thực hiện phải khớp phân công run item, còn active và có project role TESTER hoặc PM.
- BUG_ONLY PASS/FAIL không đổi latest execution. FULL_CASE gọi cùng service ghi execution của S05, tạo attempt OK/NG mới, giữ attempt cũ và liên kết chứng cứ.
- Chỉ kết quả trong current coverage/round/build được tính. FAIL làm bug về Đang xử lý, hủy request đang mở và vô hiệu hóa kết quả vòng cũ. Resolve build mới, sửa nội dung tái hiện, thêm liên kết hoặc reopen cũng yêu cầu xác nhận lại coverage.
- Nhiều request cùng vòng có thể tích lũy PASS. Không tự đóng; chỉ PM gọi closure. Nếu submit kèm đóng không đủ coverage, rollback cả verification/attempt/history.
- Ba terminal đi qua closure riêng; generic transition/batch không đi vòng qua điều kiện. Từ terminal chỉ mở lại bằng reopen có reason; không cho sửa coverage hay thêm NG làm thay đổi trạng thái đóng âm thầm.
- Không tái hiện/Không xử lý cần reason, evidence của chính bug và nguồn xác nhận. Chứng cứ đã làm căn cứ phải được giữ; không cho xóa metadata/blob qua API gỡ tệp thông thường.
- Lỗi 409 giữ draft. Idempotency key/checksum/actor gắn với request/results, project lock trước mọi read/write có cạnh tranh. FK nghiệp vụ cùng project; blob không đưa vào transaction SQL.

## Contract triển khai

| Tác vụ | Giao diện/API dự kiến | Quyền |
| --- | --- | --- |
| Truy vết và scope/kết quả/history | GET work-items/{id}/retest | Thành viên dự án |
| Xác nhận coverage revision | POST work-items/{id}/retest-coverage | PM |
| Tạo yêu cầu theo cấu hình | POST work-items/{id}/retest-requests | PM |
| Hàng chờ cá nhân/dự án | GET retest-requests | Thành viên, lọc mine |
| Chi tiết yêu cầu | GET retest-requests/{id} | Thành viên |
| Ghi kết quả | POST retest-requests/{id}/results | Người được phân công; closeBug chỉ PM |
| Đóng lỗi | POST work-items/{id}/closure | PM, kiểm tra đủ coverage hoặc căn cứ ngoại lệ |
| Mở lại | POST work-items/{id}/reopen | PM |

UI đặt trong chi tiết bug và mục Kiểm thử lại thuộc Quản lý kiểm thử. Hiển thị case/cấu hình/build, phạm vi BUG_ONLY/FULL_CASE, tiến độ coverage, người thực hiện và cảnh báo bug khác còn mở. Mọi view đọc cùng source; chữ trên web tiếng Việt, không đưa schema/version kỹ thuật vào luồng thao tác.

## Dữ liệu

V8 đã triển khai: bug_retest_state (current round/pointer), bug_coverage_revisions, bug_coverage_items, retest_requests, retest_request_items, bug_verification_attempts, bug_closure_decisions. Mọi history bất biến qua API; current pointer để truy vấn nhanh, không ghi đè lịch sử. FULL_CASE FAIL tự liên kết attempt NG mới với bug, không tạo hàng chờ thiếu liên kết giả. Cảnh báo bug khác xét cả nguồn NG và các run trong coverage hiện hành.

## Ngoài phạm vi và câu hỏi

Chưa có khách hàng/acknowledgment tracker tự động. TMS chỉ là authority của bản nội bộ đã chốt; S09 cần quyết định riêng trước đưa trạng thái ra tracker. Q08 NA/đóng cycle và báo cáo S08 đã chốt bản nội bộ tại [ADR-008](../decisions/ADR-008-internal-reporting.md), triển khai ở S08. Không coi verification PASS là phê duyệt mọi bug khác của cùng case.

## Bàn giao

Đủ quyết định để triển khai S07 theo ADR-007. Viết negative tests trước: sai actor/project/build/scope, partial coverage, dữ liệu stale, nhiều request/config, FAIL/reopen, atomic rollback và giữ execution NG cho BUG_ONLY. Chỉ DONE sau MySQL migration và UI/E2E kiểm chứng.
