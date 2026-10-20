# Kế hoạch đối chiếu và biên soạn báo cáo

Ngày 19/10/2026. Source khảo sát: system-design, 9ccc73483faddde48d930c9607f2f2f7f6981761. Chỉ tạo tài liệu trong thư mục mới; giữ nguyên ứng dụng và Word gốc. Không chạy migration, ghi DB, restart, commit, push hoặc xuất dữ liệu ra ngoài.

1. Kiểm tra hash, cấu trúc gói Word và khôi phục các entry hoàn chỉnh trên thư mục riêng. Kiểm kê nội dung, bảng, hình, header/footer, textbox, chú thích và thay đổi theo dõi. Ghi riêng những phần không thể xác minh.
2. Đối chiếu mọi module đang hoạt động và các luồng xuyên tầng với yêu cầu đã chốt. Hai review độc lập đọc frontend và backend; đối chiếu phản hồi với source trước khi đưa vào báo cáo.
3. Lập mapping từng đầu mục gốc, glossary, yêu cầu, US/AC, Use Case, quyền, dữ liệu, API và bằng chứng. Phân biệt hiện trạng, thiếu implementation, chưa kiểm chứng và tương lai.
4. Biên soạn nội dung theo cấu trúc gốc có căn cứ; tạo sơ đồ cục bộ có nguồn chỉnh sửa được, tạo DOCX bằng runtime Codex.
5. Kiểm tra cấu trúc DOCX, liên kết, nội dung, bí mật và tính toàn vẹn source. Render và xem từng trang nếu renderer quy định hoạt động. Không tuyên bố hoàn tất trực quan khi thiếu renderer.

## Giới hạn đầu vào đã xác minh

Word 12.527.073 byte, SHA256 61049eb3c19e2a1c0c811ffa620f690e6536f7879f06ff5b4ade780a19af7637. Python zipfile báo BadZipFile. Không có central directory/EOCD; stream bị cắt tại word/media/image7.png. XML nội dung chính vẫn giải nén hoàn chỉnh. Đã đề nghị người dùng gửi bản mở được; tiếp tục phần độc lập.

Runtime Codex 26.1017.11052 có Python3.12.14, Node24.19.0. Manifest Windows ghi libreOfficeVersion=null; không có native LibreOffice trong bundle. Không dùng LibreOffice desktop hoặc tự cài để bỏ qua skill. Đã thử renderer chính thức trên bản gốc và bản cuối với PATH giới hạn runtime: thiếu soffice.exe, không có ảnh trang đầu ra.

## Tiêu chí bàn giao

- Có tài liệu DOCX thật, sơ đồ nhúng và nguồn sơ đồ.
- Mọi đầu mục đọc được có mapping; thành phần thiếu nêu cụ thể.
- Số liệu kiểm thử gắn đúng checkpoint, không nhận lịch sử là vừa chạy.
- Kiểm tra mọi trang render mới được đánh dấu hoàn tất trực quan.
- Hash Word và cây source bảo toàn; không thay đổi trạng thái sprint vì tác vụ tài liệu.

## Trạng thái bàn giao

- Đã xác nhận dùng bản gốc làm mẫu cấu trúc TMS; tác giả bổ sung bìa sau. Đã tạo ba chương, 12 story/37 AC, 11 Use Case, 17 bảng và 10 hình nhúng.
- Đã kiểm kê 927 khối XML gốc, lập 291 dòng đối chiếu. Nội dung ảnh bị mất và bố cục gốc không được đánh dấu đã đọc.
- Đã review độc lập frontend, backend, nội dung Word; sửa findings về quyền, quan hệ sơ đồ, số hình, AC, API, receipt và mapping. Các review nằm cùng thư mục working.
- Đã kiểm CRC/XML, ảnh, bookmark và liên kết nội bộ, placeholder, mẫu bí mật. Đã so hash 745 tệp sản phẩm và Word gốc: không đổi. Không chạy lại test ứng dụng hoặc đo coverage trong tác vụ tài liệu.
- Bản cuối và hồ sơ đối chiếu nằm ở thư mục cha. Nội dung/OOXML đã kiểm; QA bố cục từng trang vẫn NOT_VERIFIED vì renderer được phép thiếu LibreOffice. Không đánh dấu toàn bộ DoD hoàn tất.
- Phần còn lại: bổ sung thông tin bìa có căn cứ; render/xem mọi trang khi có runtime phù hợp; cần bản mẫu nguyên vẹn nếu muốn xác minh ảnh/bố cục gốc. Không commit/push.
