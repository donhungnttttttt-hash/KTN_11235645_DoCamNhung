# Bằng chứng kiểm chứng và công cụ lịch sử

Thư mục này chứa các receipt kiểm thử, ảnh UI, biên bản review và mã công cụ dùng trong những đợt phát triển trước. Ngày và phạm vi ở từng báo cáo quyết định cách đọc kết quả: file RED/FAIL hoặc ảnh trước sửa được giữ để đối chiếu, không có nghĩa phiên bản hiện tại vẫn gặp cùng lỗi. Không cộng số test của nhiều lượt chồng nhau thành coverage.

Các script `.cjs`, `.ps1`, Java/fixture trong đây được lưu như mã lịch sử. Chúng có thể yêu cầu môi trường riêng hoặc thực hiện thao tác ghi; **không tự chạy toàn thư mục**, không dùng thay hướng dẫn vận hành hiện hành trong `docs/development.md` và `docs/database/`. Đợt công bố bằng chứng không thực thi lại các script đó.

Đợt bàn giao bổ sung ngày 19/10/2026 giữ nguyên source ứng dụng đã push ở commit `953c588`. [Báo cáo phân loại](../docs/reviews/2026-10-19-evidence-publication.md) và [manifest có hash](evidence-push-2026-10-19/publication-manifest.json) ghi file công bố và file giữ local. `.gitignore` chỉ bỏ qua kết quả coverage chi tiết sinh tự động, runtime/compile output, bản sao tài liệu gốc, metadata vault, snapshot database và những helper chứa thông tin đăng nhập cục bộ; không xóa chúng khỏi máy.

Những đường dẫn đến file thuộc nhóm giữ local chỉ dùng trên máy làm việc, không được bảo đảm mở trên GitHub. Coverage summary, kết quả test và ảnh đã được rà soát được lưu trực tiếp cùng repository. Các file log/binary/data vốn bị ignore trước đợt này không được đưa lên bằng `git add -f`.
