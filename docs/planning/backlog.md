# Backlog ngoài phạm vi sprint đang được yêu cầu

Các mục này không được tự kéo vào S01–S11. Muốn thực hiện phải có phạm vi/task và quyết định phù hợp.

| ID | Mục | Vì sao để sau / điều kiện mở |
| --- | --- | --- |
| BL-01 | Dịch case/review bug bằng AI | Cần quyền xử lý dữ liệu khách, người review, đánh giá độ đúng; bản dịch không tự thành spec được duyệt |
| BL-02 | Gửi thông báo Slack/email | Chọn provider, recipient/visibility, quyền gửi và chống lặp; hiện chỉ lưu reference quyết định |
| BL-03 | Đồng bộ Notion/SharePoint hai chiều | Chỉ mở sau khi chốt ownership/idempotency/conflict; báo cáo xuất file đáp ứng bước đầu |
| BL-04 | Adapter Backlog thứ hai | Chỉ cần nếu Q01 chọn Backlog hoặc khách có nhiều provider; không làm đồng thời hai adapter vì ảnh mẫu |
| BL-05 | Forecast release nâng cao | Cần lịch sử đủ, scope ổn định và đánh giá sai số; không hứa ngày chính xác |
| BL-06 | SSO, multi-tenant SaaS, microservices | Chưa có nhu cầu xác nhận; giữ project scope và modular monolith |
| BL-07 | Chuyển toàn bộ frontend sang TypeScript | Hiện JavaScript; đánh giá lợi ích/phạm vi riêng, không rewrite trong sprint nghiệp vụ |
| BL-08 | Dọn legacy/CSS/dependency chưa dùng | Sau reference audit + visual regression; có thể task maintenance riêng, không làm mất runtime hiện tại |
| BL-09 | Offline execution, realtime WebSocket, test automation runner | Phạm vi chính là manual test trực tuyến; cần bài toán conflict/runner riêng |
| BL-10 | Kho tài khoản/mật khẩu kiểm thử | Handbook chỉ metadata/reference; vault integration cần quyết định và thiết kế quyền riêng |
| BL-11 | Bổ sung coverage toàn frontend | Review S11 đo 72,65% statement/66,94% branch/64,73% function/65,55% line; thiếu provider/router và màn legacy. Ưu tiên kiểm tra luồng thực tế, không bỏ file khỏi denominator để nâng tỷ lệ. Chia task maintenance sau khi chốt phạm vi; chưa đánh dấu gate toàn app đạt |

Khi phát hiện việc mới: ghi ID, business value, bằng chứng, module bị ảnh hưởng, độ ưu tiên, ước lượng và sprint đề xuất; không tự coi backlog là scope đã được giao.

## Review database 03/10/2026

Yêu cầu rà soát/cải tiến hiện tại đã bao phủ việc giảm JSON lặp trong lịch sử UPDATE (đã sửa và unit test). Các mục cần DDL/chính sách dữ liệu bên dưới chưa được thực thi; [bằng chứng và phân tích](../reviews/2026-10-03-database-complexity.md).

| ID | Mục | Ưu tiên / điều kiện và tác động |
| --- | --- | --- |
| BL-12 | Ngừng lưu diagnostic và loại foundation_checks | P2; cần kiểm tra backend/native fresh+upgrade, endpoint/scripts và dữ liệu đã có. Không xóa application_info vì khóa bootstrap. Maintenance, ước lượng 1 ngày sau khi có môi trường test độc lập |
| BL-13 | Retention cho Excel preview và log vận hành | P2; chốt thời hạn xóa/purge payload/giữ metadata, batch size và backup. TTL 24h hiện là hạn commit, không tự coi là quyền xóa. Bảo toàn retry COMMITTED/audit/idempotency. Maintenance, ước lượng 1–2 ngày sau khi chốt chính sách |
| BL-14 | Đo index/query trên MySQL native | P2; 249 index chưa thấy duplicate theo tên/thứ tự cột, nhưng cần kích thước/EXPLAIN và workload thật trước DDL. Không drop UNIQUE(project_id,id) dùng cho FK ghép. Ước lượng 1 ngày khi có kết nối |
| BL-15 | Rà semantics policy nền và lợi ích gộp retest state | P3; policy JSON nền không là engine, khác rule theo dự án. Gộp bug_retest_state giảm 1 bảng nhưng cần FK/backfill/regression cycle/report/retest. Ước lượng phân tích 0,5–1 ngày, chưa ước lượng implementation trước quyết định |
