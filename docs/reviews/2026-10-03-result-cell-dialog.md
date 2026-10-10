# Ô kết quả phải phản hồi ngay khi bấm

## Lỗi và sửa

Người dùng phản ánh bấm ô iPad/OK không đổi trạng thái. Luồng trước chỉ mở thanh chọn đợt/cấu hình ở đầu bảng; khi thiếu scope, thông báo cũng chỉ nằm ở thanh này. Case đang xem từ Excel chưa có run trong đợt được chọn. Sau chọn một đợt không chứa case, pending bị xóa nên đổi sang đợt khác cũng không mở form.

Sửa trên system-design: bấm ô luôn có hộp thoại ngay. Nếu có run phù hợp, mở AttemptDialog; nếu thiếu context/scope, hộp thoại cho chọn đợt/cấu hình, hiển thị lỗi hoặc hướng dẫn và nút thiết lập đợt/phân công. Giữ case đang thao tác khi đổi lựa chọn, không dùng context cũ trong lúc tải đợt mới. Đóng/Escape hủy pending để response trễ không tự mở lại. Chỉnh màu tiêu đề trên nền xanh cho dễ đọc.

Không tự duyệt hàng loạt case, tạo run hoặc gán quyền. Giữ quy tắc PM duyệt/phạm vi/phân công và assigned tester ghi kết quả. Các số OK/NG từ Excel vẫn là dữ liệu nguồn, không tự đổi thành lần thực thi. Chưa khôi phục kiểu click xoay vòng trạng thái giả của prototype.

## Kiểm chứng

- tdd-workflow: hai regression tests RED trước sửa; GREEN sau sửa. Phát hiện/sửa thêm race khi pending bị xử lý bằng context đợt trước.
- Focused DocumentExecution: 11/11 PASS; coverage statements91.37%, branches85%, functions80.55%, lines94.23% (riêng file).
- Build PASS; full regression **248/248 tests (29 file) PASS**, git diff --check PASS.
- Browser native: document4/case2 bấm ô OK hiện hộp thoại; chọn đợt Sprint5 cho thông báo thiếu phạm vi ngay trong hộp thoại. Không sửa dữ liệu khách.
- Demo project4/document5/run242: ô kết quả mở form, OK→P lưu attempt2, reload ô vẫn P; mở lại đổi OK lưu attempt3, lịch sử giữ cả 3 lần với người/build/thời gian. Ảnh local `output/playwright/result-context-dialog.jpg` và `result-change-saved.jpg`.
- Không đổi backend/migration; frontend dev có thay đổi trực tiếp. Giữ thay đổi sửa cuộn trước đó, không commit/push trong tác vụ này. S11 IN_REVIEW theo gate UAT/pilot đang mở.
