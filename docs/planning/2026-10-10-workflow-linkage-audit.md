# Rà soát liên kết dữ liệu và UI công việc theo file

Yêu cầu 10/10/2026: tìm kiếm ngay trong dropdown dự án, bộ lọc gọn cùng hàng, phân trang không vỡ, phóng to ticket, và giải thích/sửa tình trạng file đã nhập không hiện trong công việc theo file. Phạm vi mở rộng gồm đối chiếu source/API/MySQL cho chuỗi tài liệu → case → phân công → thực thi → BUG/QA/retest → báo cáo.

Nhánh `system-design`; không commit/push/merge/deploy. Giữ dữ liệu đang sử dụng. Kiểm thử có ghi dùng schema MySQL native riêng, không reset `tms`.

- [x] Tái hiện bằng kiểm thử hành vi dropdown, modal và tài liệu nguồn trước phân công.
- [x] Đối chiếu API 8080 và database: DEMO-PILOT có 4 tài liệu/252 case nguồn nhưng 0 nhóm file được giao.
- [x] Hiển thị tài liệu nguồn trong màn công việc; nối xem tài liệu và PM giao file chọn sẵn đúng nguồn; giữ kiểm soát quyền hiện hành.
- [x] Gộp bộ lọc; ẩn pager đợt chỉ có một trang; pager nhiều trang gọn, giữ nhãn trợ năng.
- [x] Thêm phóng to/thu nhỏ ticket, không remount nội dung.
- [x] Audit toàn bộ FK và các kiểm tra liên kết nghiệp vụ; bổ sung script chỉ đọc có thể chạy lại.
- [x] Chạy integration import/FQ trên V26 và concurrency, kiểm tra browser desktop/mobile.
- [x] Ghi bằng chứng và giới hạn tại [báo cáo review](../reviews/2026-10-10-workflow-linkage-review.md).

Không tự biến import thành phân công: đợt, cấu hình và Tester là các quyết định của PM. Không gắn dữ liệu demo cũ vào file mới chỉ để làm đầy màn hình. S11 vẫn IN_REVIEW cho UAT thật.
