# Đánh giá hiện trạng và kế hoạch đo pilot

Phạm vi hiện tại là TMS nội bộ React/Java/MySQL. Sprint 11 đã chuẩn bị gói chạy, demo và hướng dẫn; chưa có baseline thời gian người dùng hoặc buổi UAT được ký. Không kết luận tiết kiệm thời gian hay hiệu quả với khách hàng chỉ từ số test tự động. Local ngày09/10/2026 đã lên V22 (core V21), thêm100user/120máy và kiểm nghiệm theo [review V22](reviews/2026-10-09-verification-demo-v22.md); [đánh giá lần hai](reviews/2026-10-08-customer-reassessment.md) giữ phạm vi V21. Các số liệu demo V11 phía dưới là bằng chứng lịch sử, không phải snapshot hiện tại.

## Bằng chứng demo S11 tại thời điểm V11

- Bộ demo 120 case/240 lượt/72 công việc được tạo qua API, có actor, revision, context, audit và retest. [Nguồn số liệu](uat/demo-dataset.json).
- Database V11, 55 bảng ứng dụng cộng Flyway. [Audit số lượng và FK](uat/database-audit.json); bảng vận hành phát sinh theo thao tác thật, không nạp giả để tăng hàng.
- Công thức báo cáo đối chiếu trên bộ demo: 192 lượt áp dụng, 132 OK, 28 NG → thực thi 83,33%, đạt 68,75%. Đây là kiểm tra số học/dữ liệu, không phải thành tích chất lượng sản phẩm.
- Regression, fresh/upgrade, DML-only runtime, security và recovery có phạm vi tại [review S11](reviews/2026-09-30-sprint-11.md). Các hạn chế được giữ mở.

## Đo trước/sau với cùng bộ tình huống

| Chỉ số | Baseline cần thu | Pilot cần thu | Trạng thái |
| --- | --- | --- | --- |
| Ticket thiếu trường bắt buộc | Số ticket thiếu / tổng ticket theo quy trình cũ | Cùng bộ tình huống, tính cả lỗi validation người dùng phải sửa | Chưa đo người dùng |
| Thời gian ghi bug | Từ bắt đầu nhập tới khi được tiếp nhận | Đo median/p95, ghi số mẫu, vai trò và mức quen công cụ | Chưa đo |
| Thời gian retest | Từ nhận yêu cầu tới lưu kết quả và đối chiếu | Tách thời gian thao tác và thời gian chờ build | Chưa đo |
| Chênh lệch báo cáo | Đếm thủ công cùng snapshot/phạm vi | So với báo cáo TMS/Excel cùng filter/timezone | Demo số học đạt; pilot chưa đo |
| Số thao tác đồng bộ tracker | Số lần nhập lại/đối chiếu thủ công | Đếm trên sandbox/binding đã cho phép | Demo S11 không đồng bộ; chưa đo |

Ghi tối thiểu người thực hiện, thời điểm, artifact/schema, tập dữ liệu, số lần thử, lỗi và cách xử lý. Không lấy dữ liệu giả lập hoặc kết quả load test làm mẫu baseline con người. Khả năng dự báo ngày phát hành, dữ liệu thời gian thực hay SLA cần phép đo và điều kiện riêng, chưa được chứng nhận ở đây.

## Việc còn lại trước bàn giao sử dụng thật

Hoàn tất nghiệm thu trọn luồng browser Excel/keyboard/mobile với bốn vai trò, môi trường/TLS/backup ngoài máy, retention và mapping/quyền tracker khách. Các kiểm tra local đã có không thay nghiệm thu môi trường thật. Coverage frontend09/10:85,13%statements,82,30%branches,78,75%functions,83,42%lines;665/665testPASS. Số đo và giới hạn có tại review V22. Không dùng coverage thay bằng chứng thao tác, đối chiếu dữ liệu hoặc khả năng phục hồi.

Áp dụng [tiêu chí nghiệm thu từ góc nhìn khách hàng](reviews/2026-10-08-customer-quality-gates.md). Kết luận hiện tại: chưa đủ bằng chứng để ký nghiệm thu toàn sản phẩm sử dụng thật; những phần đã kiểm chứng vẫn được ghi nhận đúng phạm vi.
