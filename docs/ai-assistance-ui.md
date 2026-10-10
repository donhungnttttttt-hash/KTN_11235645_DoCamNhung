# Nguồn AI và hội thoại riêng

Giao diện dùng chung lựa chọn nguồn/model cho màn Trợ lý AI và hội thoại mới. Chọn nguồn ở phía trên Tác vụ AI; kết nối cũng có thể mở khi chưa chọn dự án qua **Kết nối và hạn mức** hoặc **Chat AI → Nguồn / phạm vi**. Lựa chọn được giữ trong phiên của đúng tài khoản TMS; đăng xuất hoặc đổi tài khoản xóa bộ nhớ giao diện. Không có token AI lưu trong browser storage.

- **API của hệ thống** dùng cấu hình và thanh toán API riêng. Thông tin cấu hình không chứng minh kết nối live đã được kiểm tra.
- **ChatGPT cá nhân** chỉ dùng bởi tài khoản TMS được cấu hình trên máy local. Kết nối mở cửa sổ đăng nhập chính thức qua server; nếu popup bị chặn, dùng liên kết chính thức trong panel. Đã xác nhận danh tính, đã cấp quyền gói và đã kiểm chứng model là ba trạng thái riêng. Khi thiếu quyền gói, chọn **Cấp quyền dùng gói ChatGPT** để dùng lại registration đã cấp. Probe là thao tác chủ động có dùng hạn mức; đổi model cần kiểm chứng đúng model đó.
- **Ollama local** cần server phản hồi danh sách và có model cài sẵn. Cài Ollama/model bằng công cụ chính thức, sau đó tải lại nguồn. TMS không tự tạo server hoặc tải model.

Nguồn/model chưa sẵn sàng vẫn được giữ và được giải thích; giao diện không tự chuyển nguồn hoặc gửi lại yêu cầu có tính phí. Thông báo giới hạn gói ChatGPT chỉ nói về hạn mức của ứng dụng, không suy ra toàn bộ gói hết credit. Quota API và giới hạn chat theo tài khoản TMS được giải thích riêng.

**Chat AI** là panel nổi duy nhất trên các trang đã đăng nhập, kể cả Admin. **Trao đổi chung** không gửi dữ liệu dự án. Nếu cần ngữ cảnh công việc, mở **Nguồn / phạm vi**, chọn dự án được phép, tác vụ và file/ticket mà server cấp. Khi bắt đầu hội thoại, nguồn/model/phạm vi được cố định và luôn hiển thị ở đầu panel. Đổi lựa chọn chung chỉ tác động đến phân tích hoặc hội thoại mới; chọn **Mới** để bắt đầu phạm vi khác. Tác vụ và nguồn chỉ giúp AI đọc ngữ cảnh; chat không sửa dữ liệu nghiệp vụ.

Enter gửi, Shift+Enter xuống dòng; Enter trong lúc IME đang soạn không gửi. Thu nhỏ hoặc Escape giữ tin nhắn chưa gửi và trả focus về launcher; Escape trên dropdown không đóng chat. Có thể tiếp tục soạn khi AI bận. Composer giới hạn 2000 ký tự, luôn nằm bên dưới vùng nội dung cuộn. Trên màn hình nhỏ, cấu hình được đóng/mở riêng để giữ chỗ cho nội dung và composer. Chat nằm dưới lớp modal nghiệp vụ.

**Kiểm tra yêu cầu chat** hoặc **Kiểm tra lại yêu cầu** dùng lại chính mã và nội dung đã gửi sau timeout/pending, kể cả khi provider đã ngắt kết nối. Không tự tạo mã mới. Yêu cầu FAILED giữ câu hỏi để người dùng kiểm tra; một lần gửi mới do người dùng chủ động mới tạo mã khác. READY mới có nút sao chép câu trả lời. Nội dung/model/nguồn được hiển thị dạng text, không chạy markup từ AI. Khi server rút gọn ngữ cảnh, panel hiển thị thông báo.

Hội thoại riêng lưu tạm bảy ngày. Lịch sử chỉ đọc lại khi server xác nhận quyền hiện tại; nguồn bị thu hồi hoặc hết hạn sẽ bị khóa và nội dung cũ được xóa khỏi màn hình. Dự án lưu trữ và file-group thuộc đợt đã đóng vẫn có lịch sử được phép đọc; tạo/gửi mới cần nguồn đang hoạt động. Ngắt kết nối AI không xóa lịch sử còn quyền đọc. Khi phiên cùng tài khoản hết hạn, chat đóng và nội dung không còn truy cập được; bản soạn chưa gửi giữ trong bộ nhớ để đăng nhập lại, còn lịch sử được kiểm tra quyền lại khi mở.

Contract và thiết lập server: [AI providers](api/ai-providers.md), [private chat](api/ai-chat.md). OAuth thật, model Ollama native và chất lượng model cần nghiệm thu vận hành riêng; test tự động chỉ dùng phản hồi giả lập.
