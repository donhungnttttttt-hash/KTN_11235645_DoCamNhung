# Tổng quan, Kanban và giao diện Ticket — 15/11/2026

## Phạm vi đã triển khai

- Tổng quan dự án: Giới thiệu (Bối cảnh, Nội dung công việc, Thông tin khách hàng), Tài liệu input, Tài liệu output, Tiêu chí hoàn thành. Nội dung mẫu cho T11-15 dựa trên bốn Feature đã nhập; tiêu chí là đề xuất chưa xác nhận nghiệm thu. Không tạo liên kết khách hàng hoặc kết luận nghiệm thu giả. Dự án SPIDER-PLUS giữ nội dung đã có.
- Kanban: cột gọn, chấm màu và số lượng từ máy chủ, thẻ có loại/key/tiêu đề/Feature/avatar/người phụ trách. Tải độc lập cả chín cột, phân trang và thử lại riêng, giữ các thẻ đã tải nếu tải thêm lỗi. Thao tác chuyển trạng thái nằm trong menu thẻ; kéo thả vẫn qua quyền và bước xác nhận hiện hành.
- Chi tiết Issue: tiêu đề nổi bật, nhãn loại/trạng thái có màu, người tạo và nội dung chia mục. Thông tin Feature hiện tại và bản lưu lúc phát hiện vẫn giữ riêng. Thanh bình luận nằm cuối màn: ban đầu thu gọn, bấm mới mở nội dung và thuộc tính; hỗ trợ xem trước và thu gọn giữ bản nháp. Mở từ bảng công việc mặc định toàn màn hình.
- Menu Quản lý lỗi đổi thành Thêm lỗi. Trang tạo riêng có nguồn case hoặc Monkey, chọn Feature/file/case, lấy nội dung/môi trường/version từ API context, chỉnh nội dung theo từng mục và xem trước. Danh sách vẫn ở Bảng công việc; khôi phục Monkey đã xóa vẫn truy cập được.

Áp dụng bố cục mẫu vào các trường và workflow được hệ thống hỗ trợ. Không thêm các điều khiển không có dữ liệu lưu như ước lượng/thực tế, mốc hoặc ngày bắt đầu/hạn chót riêng của Ticket. Không đổi trạng thái, quyền hoặc dữ liệu hiện có. Thay đổi này chỉ là frontend, không cần migration/restart backend. Main vẫn V44.

## Kiểm chứng

- Viết kiểm thử hành vi thất bại trước khi sửa; bổ sung tám ca hồi quy cho giao diện, tải từng cột, retry phân trang, nguồn case, xem trước, payload lưu và kiểm tra nội dung bắt buộc.
- Toàn bộ frontend: **155 file / 1.414 test PASS**, chạy với `--maxWorkers=2 --testTimeout=15000 --coverage`. Lần chạy coverage song song trước có một ca timeout 5 giây; ca đó chạy riêng 11/11 PASS, lần chạy toàn bộ có giới hạn worker nêu trên đều PASS.
- Coverage đo trên chín file của phần việc: lines **93,19%**, statements **88,36%**, functions **78,45%**, branches **86,77%**. Đây không phải coverage toàn repository. Báo cáo tại `var/workspace-ui-coverage/coverage-summary.json`.
- Sau dọn code tạo Monkey cũ không còn được gọi và chỉ giữ nút thêm nhanh ở cột Chưa xử lý: chạy lại bốn file liên quan, **47/47 PASS**.
- Vite production build PASS (1.996 modules); còn cảnh báo bundle JS lớn hơn 500 kB. `git diff --check` PASS.
- Chrome cài trên máy, phiên headless riêng ở 1600×1000 và 390×844: xem Tổng quan, Kanban, Thêm lỗi, chọn case, mở/thu bình luận và kiểm tra responsive. Không có lỗi JavaScript hoặc API sau đăng nhập. Chiều rộng tài liệu ở viewport 390 là 384 px, không tràn ngang toàn trang. Bảng Kanban vẫn cuộn ngang có chủ đích.
- Kiểm tra Chrome dùng dữ liệu dự án 13 đang có, không gửi tạo Ticket hoặc cập nhật trạng thái vào database chính. Lưu mới được kiểm bằng API mock trong test; không tuyên bố đã nghiệm thu thao tác ghi mới end-to-end trên main.
- Ảnh và script kiểm tra cục bộ trong `var/workspace-ui-browser/` (được ignore): overview, board, create-filled, detail-collapsed, detail-expanded và các bản mobile. CUA không kết nối được pipe Chrome; fallback Playwright mở Chrome riêng, không điều khiển desktop/profile cá nhân.

## Giới hạn và bàn giao

- Bản nháp được giữ khi thu gọn bình luận, khi lỗi lưu và trong bước xác nhận bỏ nguồn ở trang tạo. Rời trang bằng menu điều hướng nội bộ chưa có cơ chế lưu bản nháp toàn cục.
- Màn hình theo bố cục tham chiếu và nghiệp vụ hiện tại; không tuyên bố giống từng pixel hoặc có các thuộc tính backend chưa hỗ trợ.
- Skill đã áp dụng: frontend-patterns, tdd-workflow; đọc computer-use và browser-testing-with-devtools khi xác định cách nghiệm thu Chrome.
- Giữ nguyên các thay đổi chưa commit từ các tác vụ trước. Chưa commit/push trong tác vụ này.
