# Bình luận Ticket: đính kèm và thuộc tính kế hoạch

Yêu cầu ngày 15/11/2026: bỏ nút thêm ở Kanban; việc tạo Ticket ở màn **Thêm lỗi**. Bình luận hỗ trợ tệp/ảnh, xem trước ảnh và bổ sung các trường theo mẫu Backlog đã cung cấp.

## Thực hiện

- Kanban không còn dấu `+` tạo Ticket. Giữ màn Thêm lỗi và các thao tác chuyển trạng thái hiện có.
- Ô bình luận ban đầu thu gọn; mở khi bấm. Thanh công cụ có đính kèm, in đậm, in nghiêng và danh sách. Có thể dán ảnh từ clipboard.
- Xem trước thay vùng soạn bằng Markdown và ảnh đính kèm. Bản nháp cho bỏ từng tệp; lỗi gửi giữ nguyên nội dung/tệp và mã yêu cầu để thử lại.
- Sau khi gửi, tệp gắn với đúng bản ghi bình luận. Ảnh PNG/JPEG hiển thị thumbnail, mở lớn bằng hộp xem ảnh; các tệp khác tải xuống.
- Bổ sung Ngày bắt đầu, Hạn chót, Mốc quan trọng (nhiều mốc), Dự kiến/Thực tế (giờ), Tôi phụ trách. Trạng thái, lý do đóng, người phụ trách, người xác nhận tiếp tục theo quyền và quy trình Ticket hiện có.
- Thuộc tính kế hoạch lưu thật, có phiên bản và lịch sử. Chỉ quản lý hoặc người tạo có quyền sửa kế hoạch; người có quyền bình luận vẫn gửi bình luận/tệp được.
- Mốc phải thuộc dự án, đang hoạt động hoặc đã gắn từ trước; không tự tạo role hay đổi role tài khoản.

## API và dữ liệu

- `POST /api/v1/projects/{projectId}/issues/{id}/actions-with-files`: multipart với JSON part `action` và một hoặc nhiều part `files`.
- `GET /api/v1/projects/{projectId}/issues/{id}/attachments/{uuid}`: kiểm tra quyền và phạm vi dự án/Ticket; tải qua phiên đăng nhập.
- API actions JSON cũ giữ nguyên; `planning` là trường tùy chọn. Gửi planning là cập nhật đầy đủ tập trường kế hoạch; bỏ trường này giữ nguyên dữ liệu cũ.
- V45 chỉ bổ sung schema: ngày/giờ trên context, quan hệ nhiều mốc, metadata tệp gắn với history. Mốc cũ được giữ bằng chuyển quan hệ hiện có. Không sửa migration cũ.
- Bình luận, trạng thái, kế hoạch, metadata tệp và thông báo cùng giao dịch. Retry cùng mã và cùng nội dung không tạo trùng; đổi nội dung/tệp với cùng mã trả 409. Lỗi ghi tệp rollback giao dịch và dọn tệp đã ghi.
- Tối đa 10 tệp, tổng 20 MiB. PNG/JPEG/PDF/MP4 kiểm tra nội dung theo bộ kiểm tra hiện có; TXT/LOG/CSV/JSON phải UTF-8; ZIP/XLSX/DOCX kiểm tra chữ ký ZIP và chỉ tải xuống. Không phải dịch vụ quét mã độc. HTML/SVG không được hiển thị inline.
- Response tải tệp có `nosniff`, CSP sandbox và no-store. Khách hoặc người ngoài dự án không đọc được tệp Ticket.

## Lưu trữ / sao lưu

`TMS_TICKET_ATTACHMENT_ROOT` cấu hình thư mục tệp; mặc định `./var/ticket-comments` tương đối với thư mục chạy backend. Bản local chạy từ Backend nên dùng **Backend/var/ticket-comments**. Khi chuyển máy/khôi phục phải sao chép cả thư mục này cùng database và các thư mục evidence hiện có. `scripts/Backup-Database.cjs` là bản sao SQL, không sao chép blob. Không đưa nội dung tệp vào Git. Khi process bị dừng đột ngột trước commit có thể còn tệp không có metadata; không xóa hàng loạt tệp ngoài đối chiếu database.

## Kiểm chứng

Skills: frontend-patterns, tdd-workflow, verification-loop; Chrome được kiểm tra bằng Playwright trong profile riêng.

- Red trước sửa: frontend 3 test thất bại; backend 2 test thất bại đúng hành vi (route upload 404; ngày chưa được lưu), sau khi sửa lỗi fixture ban đầu.
- Native MySQL riêng: **25/25 PASS**, không skip — TicketComposerNativeTest (7), TicketWorkflowNativeTest (14), TicketInitialStateNativeTest (4). Kiểm tra lưu/tải PNG, file-only, replay, đổi tệp khi replay, tệp lỗi không lưu bình luận/kế hoạch, ngày sai, mốc sai, quyền sửa kế hoạch và quyền tải tệp.
- Frontend toàn bộ **1.431 test / 157 file PASS**. Sau chỉnh preview trong vùng editor, kiểm tra lại 13 test liên quan PASS. API test kiểm tra multipart/CSRF/download.
- Production build PASS. Cảnh báo kích thước bundle hiện có còn tồn tại. `git diff --check` PASS.
- Chrome thật 1600×1000 và 390×844: không nút thêm ở Kanban, composer thu gọn/mở, đủ các trường, ảnh preview decode thành công, không JS/API error, không tràn ngang. Trên main chỉ xem và thao tác bản nháp, không đăng bình luận thử.
- Không đo riêng coverage mới; không suy ra coverage từ số test PASS.

## Bản đang chạy

- Sao lưu trước cập nhật: `var/mysql-native/backups/2026-11-15T07-31-52-545Z-tms.sql` (V44).
- Backend local 8080 đã lên **V45**, frontend Vite 5173 dùng source mới.
- Artifact SHA-256: `fa083d4dfec873cefc1efdc70a47fdbaedee9f4e8064ab1f7ccc65719d3878c8`.
- Snapshot trước/sau: 120 tài khoản, 12 dự án, 21 Feature, 44 file, 4025 import rows, 41 context Ticket; số lượng và phân bố status không đổi. Fingerprint nội dung test case/cell edits/cell changes không đổi.
- Bằng chứng local: `var/workspace-ui-browser/ticket-runtime/`, `ticket-browser-result.json`, `ticket-expanded.png`, `ticket-mobile.png`.
- Chưa commit/push trong tác vụ này. Không tuyên bố tương đương toàn bộ sản phẩm Backlog; phần xử lý ở đây theo các trường và ảnh tham chiếu đã thống nhất.
