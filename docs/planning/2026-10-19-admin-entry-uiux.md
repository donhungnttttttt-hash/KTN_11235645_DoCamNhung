# Kiểm tra UI/UX từ lần đăng nhập Admin — 19/10/2026

Yêu cầu tiếp theo của người dùng: menu trái ngay sau đăng nhập Admin tổng còn lỗi nặng; rà kỹ tính nhất quán, phân cấp, phản hồi, sự đơn giản, khả năng truy cập và bố cục của toàn hệ thống. Tiếp tục trên `system-design`, bảo toàn thay đổi có sẵn, không commit/push/backend/migration. Tài liệu tham khảo về marketing/video/emoji là gợi ý chung, không phải yêu cầu thêm nội dung không phục vụ nghiệp vụ TMS.

## Cách hiểu và thiết kế trước sửa

- Điểm bắt đầu phải là đăng nhập ADMIN → `/admin`, không thay bằng Tổng quan dự án `/dashboard`. Hai khung có implementation khác nhau.
- Khung Admin: header theo chiều cao nội dung; menu và vùng làm việc chiếm chiều cao còn lại. Menu dài cuộn độc lập; nội dung dài không làm nền menu kết thúc giữa trang. Thu gọn desktop vẫn giữ tên truy cập; mobile mở một drawer dọc với đủ sáu mục, đóng bằng Escape/nền/mục điều hướng. Giữ focus, chặn tương tác nền, không đổi quyền.
- Giữ thiết kế TMS, dữ liệu và năm màu kết quả. Áp dụng token và cấu trúc có sẵn, không thêm thư viện animation hoặc đổi bố cục nghiệp vụ chỉ để làm đẹp.
- Kiểm tra màu focus trên cả nền menu đậm và mục đang chọn sáng. Kiểm tra mọi mục Admin qua click; nội dung từng route được kiểm thêm ở viewport thấp/hẹp và trạng thái mở form/đóng/hủy, không ghi dữ liệu nghiệp vụ main.
- Ngoài menu: kiểm selector CSS xuyên module, bảng ngang còn định danh case, ô dài ở chế độ chỉ đọc, phản hồi lỗi/thử lại và hierarchy nút lưu. Lỗi có bằng chứng được sửa với test trước; giả thuyết chưa tái hiện được ghi rõ.

## Bằng chứng và tiêu chí

Evidence: `var/uiux-admin-entry-2026-10-19/`. Baseline đầu lượt 3.374 file. Root điều khiển Chrome; ba reviewer độc lập rà Admin, Testing/Issue/Project, Reports/AI. Không suy số control hay số test thành “mọi góc giao diện đã PASS”.

- [x] Đọc yêu cầu và tái hiện từ đăng nhập main: sidebar 388 px kết thúc ở y465, main cao 3.289 px.
- [x] Đọc skill `frontend-ui-engineering`, `ui-ux-pro-max`, `systematic-debugging`, TDD và verification; query focus-not-obscured, kiểm fit với web React.
- [x] Sửa khung Admin, kiểm desktop/collapse/mobile/short-height và focus/scroll.
- [x] Sửa focus menu dự án và kiểm màu khi active/inactive/submenu.
- [x] Rà xuyên module, ghi từng finding đã xác nhận/chưa xác nhận; sửa lỗi độc lập được giao. Chi tiết và khoảng trống giữ tại ba ledger trong báo cáo.
- [x] Chrome: lần đăng nhập đầu, sáu link Admin gồm sang workspace và quay về, mở/hủy bốn nhóm form, Tab/Shift+Tab/Escape ở viewport mobile. Không đồng nghĩa đã kiểm bàn phím ảo trên điện thoại.
- [x] Tái hiện và sửa thêm popup dự án bị che ở viewport thấp; guard nháp trong app; chuỗi focus khi parent inert; hướng dẫn tải lại không liên quan trong form thiết bị.
- [x] Đo lại bảng case, cột ID sticky và chat ở viewport thấp; giữ receipt thất bại trước sửa.
- [x] Chạy regression và build trên source đã chốt: 1100/1100 test, 120 file, build exit 0; hash 320 file giữ nguyên. Coverage chưa đo mới.
- [x] Cập nhật [báo cáo](../reviews/2026-10-19-admin-entry-uiux.md)/STATUS, giới hạn còn lại và ảnh trước/sau.

Các gate còn mở, không đổi thành DONE từ kết quả test tự động:

- [ ] Toàn bộ tổ hợp role × route × loading/error/empty/dirty/pending/conflict, API ghi thật và UAT từng button.
- [ ] Bàn phím ảo/IME, chạm trên thiết bị thật, zoom 200%, screen reader và kiểm hệ điều hành bật giảm chuyển động.
- [ ] Upload/download/clipboard và AI/OAuth thật; không tự gửi dữ liệu dự án để lấy bằng chứng.
- [ ] UX-002 (ngoại lệ lưu trữ legacy đã được Admin cho phép về chính sách), UX-011 (contract Rules) và các tồn đọng theo [báo cáo polish](../reviews/2026-10-19-uiux-polish.md). Không thuộc bản sửa frontend này; FR-12/S11 vẫn IN_REVIEW.

Chrome hiện có zoom của origin làm viewport yêu cầu và CSS viewport khác nhau; mọi số đo phải lấy `innerWidth/innerHeight`, không ghi kích thước yêu cầu là bằng chứng thực tế. Không sửa preference zoom vĩnh viễn của người dùng để che lỗi.
