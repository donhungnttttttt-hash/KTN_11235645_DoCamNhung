# Cổng theo dõi dự án dành cho Khách — khảo sát 15/11/2026

Trạng thái: đang thiết kế, chưa triển khai. Tài liệu này ghi kết quả đối chiếu và quyết định nghiệp vụ, chưa phải đặc tả đã duyệt.

## Mục tiêu người dùng

Thay màn Khách trống, đơn sơ bằng dashboard có menu, biểu đồ tiến độ, chi phí, nhân sự và sức khỏe dự án. Khi phát hiện rủi ro, AI đề xuất hướng xử lý để khách theo dõi minh bạch và tin tưởng tiến độ. Báo cáo AI phải đọc được ngay trên web với định dạng như Markdown Preview trong ảnh người dùng gửi.

## Đã xác nhận

- Chốt mới nhất về chi phí mô phỏng: lấy đầu người trong dự án, User thường hệ số 1, Admin quản lý hệ số 5; không coi hệ số chi phí là năng suất test. Chi tiết cách đếm và snapshot theo ngày trong [mô hình công sức/chi phí](2026-11-15-guest-effort-cost-proposal.md).

- Yêu cầu chi phí hiện hành: đánh giá công sức theo định mức ví dụ 500/người/ngày và 50 case/ngày, đối chiếu mục tiêu case lũy kế theo ngày; không hiển thị hợp đồng vì thông tin nhạy cảm. Thay thế đề xuất hợp đồng trước đó; xem [mô hình công sức/chi phí](2026-11-15-guest-effort-cost-proposal.md). Cần phân biệt ngày công thực tế với phân bổ/giả định và không tự chọn đơn vị tiền.

- Điều chỉnh mới nhất 15/11: không yêu cầu Admin dự án nhập chi phí theo kỳ. Người dùng muốn giá trị hợp đồng có sẵn và nhờ chuẩn bị dữ liệu mẫu nhất quán để minh họa đánh giá theo phương pháp quốc tế. Giá trị thật chưa được cung cấp; không gán số mẫu thành hợp đồng thật của các dự án hiện có.
- Điều chỉnh mới nhất 15/11: cảnh báo/đề xuất AI ngắn tự hiện bằng chữ đỏ đậm cỡ gọn dưới biểu đồ khi có rủi ro, đồng thời thông báo Admin dự án. Đề xuất phân biệt cảnh báo tự động với báo cáo chính thức; giữ bước duyệt báo cáo chính thức theo quyết định trước, cần thể hiện rõ trong đặc tả để người dùng kiểm tra.
- Giữ mô hình tài khoản hiện tại: USER hợp nhất Tester/Dev; Khách chỉ đọc các dự án được thêm vào.

## Đối chiếu code

- `GuestWorkspace.jsx` chỉ có header, bộ chọn dự án, tài khoản và `ReadOnlyProjectReports`.
- `GuestReportView.summary` chỉ trả project id/code/name, metrics và asOf/timeZone. `GuestRequestAuthorization` giới hạn GET reporting-projects/management-reports. Muốn mở rộng phải bổ sung projection/API dành riêng cho Khách, kiểm tra membership ở backend; không mở toàn bộ workspace.
- Có dữ liệu Feature/file/case, Status, Ticket Bug/QA, phân công, thành viên và lịch sử thay đổi. `FeatureFacts` có thống kê nhưng không được trả nguyên snapshot nội bộ cho Khách. Phân công hiện tại có `assignee_user_id`/người test đầu tiên, cần đối chiếu khi tổng hợp nhân sự; không suy số case thành năng lực cá nhân hay phần trăm sử dụng nhân lực.
- Có mốc dự án (`milestones`) và logic deadline cho Ticket có liên kết. Không đồng nhất các mốc đó với kế hoạch tiến độ test toàn dự án. Chưa có dữ liệu ngân sách/chi phí hoặc baseline tiến độ test theo kỳ.
- AI hiện có luồng tạo bản nháp báo cáo quản lý. Báo cáo lưu hiện được Khách đọc ngay; chưa có bước công bố/duyệt AI riêng. Cần định nghĩa bản nháp, bản công bố, sửa sau công bố và thu hồi.
- `SafeMarkdown.jsx` hiện hỗ trợ heading/list/code/link nhưng không phân tích bold/emphasis/table/quote; heading bị cộng hai cấp. Đây là nguyên nhân dấu `**` còn hiện trong ảnh và tiêu đề chưa nổi bật. Cần sửa bộ hiển thị dùng chung, bảo toàn nguyên văn báo cáo lưu và tải xuống, tiếp tục chặn HTML/link nguy hiểm.
- Đã có Chart.js/react-chartjs-2 trong frontend; chưa cần quyết định thêm thư viện biểu đồ.

## Hướng đề xuất để duyệt

Hai hướng: mở rộng một trang báo cáo tổng hợp (ít thay đổi điều hướng nhưng khó theo dõi khi nhiều chỉ số); hoặc cổng Khách có sáu mục (phù hợp mục tiêu người dùng, cần API/quyền và nguồn dữ liệu mới). Đề xuất cổng Khách.

Menu: Tổng quan; Tiến độ & chất lượng; Chi phí; Nhân sự; Sức khỏe & đề xuất AI; Báo cáo.

Tổng quan: tên/mã dự án, quản lý, thời điểm số liệu, thẻ KPI, biểu đồ Status, diễn biến theo kỳ, mốc sắp tới/quá hạn, chi phí kế hoạch/thực tế, tóm tắt đội ngũ và đề xuất đã duyệt. Tông xanh teal đồng bộ hệ thống, thẻ trắng, khoảng cách gọn và bố cục thích ứng màn hình.

Tiến độ kiểm thử tiếp tục dùng quy tắc đã chốt (OK+NG+P+NA)/tổng; tách tỷ lệ đạt khỏi đã test. Đồ thị phải thể hiện phạm vi/mẫu số thay đổi. Không dựng lịch sử quá khứ khi dữ liệu không đủ; bổ sung snapshot từ thời điểm triển khai.

Giá trị hợp đồng là mốc thương mại, không tự đồng nhất với chi phí thực tế của nhà cung cấp hoặc ngân sách chi phí EVM. Hướng sửa mới và bộ dữ liệu minh họa: [góc nhìn khách hàng/QCD](2026-11-15-guest-customer-qcd-proposal.md). Thiếu số liệu hiển thị chưa cập nhật, không tự thay bằng 0.

Sức khỏe cần các thành phần tiến độ, chất lượng, chi phí và nguồn lực; trạng thái phải có nguyên nhân/căn cứ/thời điểm. Ngưỡng và baseline cần được thể hiện trong đặc tả để duyệt, không tự gán điểm 0–100 hoặc kết luận chậm chỉ từ tiến độ thấp.

AI đọc đúng snapshot đã được phép chia sẻ, đưa vấn đề/căn cứ/đề xuất/thiếu thông tin. Cảnh báo ngắn tự động theo yêu cầu mới; báo cáo chính thức có bước Admin chỉnh sửa và công bố. Bản đã duyệt giữ thời điểm/người duyệt và nguồn số liệu; dữ liệu thay đổi phải báo cũ. AI lỗi không chặn dashboard và không tự đổi nghiệp vụ.

Báo cáo có danh sách theo kỳ, nội dung như bài viết: heading, bold, italic, danh sách, bảng, quote, link; giữ chế độ tải Markdown. Giao diện sáng theo ứng dụng, không bắt buộc đổi toàn màn sang nền tối như editor trong ảnh. Hỗ trợ đọc báo cáo cũ mà không chạy AI lại.

## Việc tiếp theo

Trình bày thiết kế cho người dùng; chốt ngưỡng/baseline và luồng công bố trong đặc tả, rồi lập kế hoạch thực hiện. Chưa sửa source sản phẩm, migration, runtime hoặc commit/push ở tác vụ này. Skill đang dùng: brainstorming (phạm vi architectural).
