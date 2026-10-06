# Tài liệu sản phẩm TMS

**Cập nhật 06/10/2026:** người dùng đã duyệt toàn bộ thiết kế F01–F05/Q01–Q03 (“mình duyệt hết”). Implementation có trong working tree theo [kế hoạch F/Q](../../tasks/plan.md) và [danh sách việc](../../tasks/todo.md); [PRD mục16](PRD.md#16-checkpoint-implementation-fq) và [báo cáo triển khai](../reviews/2026-10-06-fq-implementation.md) mô tả checkpoint hiện hành. Số liệu/nhận xét baseline V16 phía dưới giữ làm lịch sử audit; phê duyệt và source không đồng nghĩa đã nghiệm thu native/HTTP/UAT.

**Source gate cuối: APPROVED** sau một wave sửa và scoped re-review;612 frontend/394 offline backend tests PASS, JDT191nguồn0lỗi/0cảnh báo, build/package PASS. [Review cuối](../reviews/2026-10-06-fq-final-review.md) giữ cả findings ban đầu và kết quả xử lý. Native V17/V18/SQL/race/HTTP/UAT/pilot còn mở, S11 giữ IN_REVIEW; không commit/push/merge/deploy trong tác vụ này.

Bản đối chiếu ngày **06/10/2026**, nhánh `system-design`, source gồm thay đổi ADMIN A1–A4 chưa commit. Database native được đọc lúc `2026-10-05T17:03:34Z`: Flyway V16 thành công, 59 bảng trong schema (gồm bảng hạ tầng như Flyway/session). Đây là đặc tả hệ thống hiện hữu và yêu cầu mở rộng, không phải chứng nhận nghiệm thu production.

## Đọc theo mục đích

| Tài liệu | Dùng để làm gì |
| --- | --- |
| [PRD](PRD.md) | Mục tiêu, người dùng, phạm vi, yêu cầu chức năng, trải nghiệm, tiêu chí thành công và ưu tiên sản phẩm |
| [Đặc tả hệ thống](SYSTEM-SPECIFICATION.md) | Luồng, quyền, trạng thái, dữ liệu, API, giao dịch, an toàn, vận hành và thiết kế bổ sung cần review |
| [Truy vết và UAT](TRACEABILITY-UAT.md) | Đối chiếu yêu cầu → code/API/test; kịch bản kiểm tra theo đúng vòng đời dự án, bug và retest |
| [Từ điển dữ liệu](DATA-DICTIONARY.md) | 59 bảng/560 cột, PK/index/139 FK của schema V16, metadata chỉ đọc, không chứa dữ liệu hoặc credential |
| [Schema mở rộng F/Q](FQ-DATA-DICTIONARY.md) | 9 bảng mới/98 thuộc tính và 32 FK V17/V18 theo source; chưa phải snapshot native đã áp |
| [Tiến độ triển khai F/Q](../reviews/2026-10-06-fq-implementation.md) | Gate mã nguồn/test/review của thiết kế đã duyệt, và native/HTTP/UAT còn mở |
| [Hướng dẫn luồng theo file và QA](../file-work-qa-guide.md) | Các bước Admin → PM → Tester → Dev → Tester → PM, cùng cách chọn đúng bản Excel |
| [Kiểm chứng MySQL/Flyway F/Q](../database/file-work-qa-verification.md) | Schema test riêng, runner guarded và quy trình cập nhật database sử dụng sau kiểm chứng |
| [Báo cáo kiểm tra](../reviews/2026-10-06-system-workflow-review.md) | Lỗi đã sửa, kết quả chạy kiểm tra và giới hạn của lượt làm này |

## Quy ước bắt buộc

- **HIỆN CÓ**: đã tìm thấy đường code phù hợp; chỉ được ghi **ĐÃ KIỂM THỬ** trong phạm vi có bằng chứng chạy. Audit source không thay kiểm thử tích hợp hoặc UAT.
- **MỘT PHẦN**: có nền tảng nhưng thiếu mắt xích của luồng mới.
- **CHƯA CÓ**: chưa tìm thấy implementation cho hành vi được nêu.
- **ĐỀ XUẤT — CHỜ DUYỆT**: thiết kế cho capability mới; chưa phải API đang chạy, migration hay nghiệp vụ đã được xác nhận.
- Không lấy test PASS của module khác, seed demo hoặc ảnh màn hình cũ để kết luận luồng mới đã hoàn chỉnh. Coverage toàn hệ thống chưa đo trong lượt này.

Quyết định mới đã duyệt của người dùng và ADR có hiệu lực được ưu tiên hơn tài liệu sprint lịch sử. [Permissions](../business/permissions.md), [metrics](../business/metrics.md) và các [contract API](../api/openapi.yaml) mô tả implementation hiện hành. F/Q đã được duyệt và đang triển khai; các đề xuất khác vẫn phải được đối chiếu quyền/phạm vi trước implementation. Giữ quyết định đã chốt về kết quả tài liệu Excel độc lập kết quả đợt.

[Planning](../planning/README.md) tiếp tục là sổ trạng thái phát triển; S11 còn `IN_REVIEW`. Các tài liệu planning nền tháng 09 giữ nguyên giá trị lịch sử, không được dùng để suy rằng backend/API hiện tại chưa tồn tại. Không tự merge vào `develop`, push hoặc triển khai production từ việc viết tài liệu này.

## Baseline trước triển khai F/Q

Hệ thống đã có ADMIN tạo dự án/nhân sự/kho máy, PM nhập và duyệt case, phân công lượt case, Tester ghi execution, quản lý bug, Dev xử lý bug được giao, retest, báo cáo và lịch sử. Luồng **quản lý công việc theo file** còn thiếu nhóm phân công, danh sách file của tôi, phiên đang làm và máy vật lý thực tế. QA hỏi/đáp riêng và xuất file theo một ngữ cảnh execution cũng chưa có. Những phần đó được đặc tả riêng, không gọi là hoàn thành.
