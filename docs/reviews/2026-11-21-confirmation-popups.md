# Popup xác nhận thống nhất

Yêu cầu ngày 21/11/2026: bước xác nhận phải mở popup nhỏ trên màn hình; không chèn khối xác nhận vào trên/dưới nội dung làm thay đổi bố cục. Ảnh cập nhật Ticket là ví dụ, phạm vi áp dụng toàn ứng dụng.

## Thay đổi

- Thêm `ConfirmationDialog` dùng portal vào body, căn giữa, rộng tối đa 460 px, giới hạn chiều cao và cuộn bên trong trên màn hình nhỏ. Tái sử dụng quản lý focus/dialog stack hiện có; Escape/Hủy đóng xác nhận, trả focus, giữ bản nháp; khi đang gửi không cho đóng hoặc gửi lặp.
- Chuyển xác nhận cập nhật Ticket (bao gồm QA tạo Bug riêng), xóa Bug monkey, xóa Note, phê duyệt case, bắt đầu đợt, thao tác phiên/giao lại và chuyển ngữ cảnh bản nháp sang popup.
- Thống nhất popup bỏ bản nháp ở form quản trị, Ticket và trang tạo Ticket; popup xóa version/môi trường và ẩn file.
- Thay browser confirm khi gỡ thành viên, lưu trữ danh mục, công bố quy tắc cũ và bỏ sửa báo cáo bằng popup cùng mẫu. Đổi dự án/đăng xuất/unmount hủy yêu cầu xác nhận đang chờ.
- Lỗi thao tác nằm trong popup đang mở, không nhân đôi thông báo ở phần nền. Giữ kiểm tra quyền, phiên bản, retry và payload hiện có. Không thêm màn hay thay đổi nghiệp vụ backend.
- Những form nghiệp vụ như nhập Excel, ghi kết quả và lưu trữ dự án vốn đã là dialog tiếp tục giữ form phù hợp; đây không phải khối xác nhận inline cần chuyển.

## Kiểm chứng

- Skill áp dụng: `addyosmani-test-driven-development`. Bộ hồi quy 5 ca thất bại trước sửa, gồm Ticket, xóa monkey, Note, bắt đầu đợt và bỏ bản nháp quản trị; sau sửa đều đạt.
- Kiểm tra component bao phủ portal, xác nhận mới gọi API, Hủy giữ bản nháp, Escape, vòng Tab, trả focus, modal lồng nhau, trạng thái busy và hủy khi đổi scope/unmount.
- Bộ hồi quy cuối: 747/747 tests PASS trên components, projects, reports, work-items, testing, admin, test-cases, test-execution và file-work. `git diff --check` PASS.
- Build frontend PASS (2010 modules); còn cảnh báo kích thước bundle hơn 500 kB đã có.
- Chrome riêng: popup desktop 460 × 275 px; chiều cao composer trước/sau đều 261 px. Trên viewport 390 px popup rộng 360 px và không tràn. Hủy/Escape không gửi API; xác nhận gọi đúng một lần. Đọc dữ liệu dự án thật, mock mutation, không ghi dữ liệu nghiệp vụ.
- Bằng chứng local: `var/workspace-ui-browser/confirmation-flows-red.json`, `confirmation-final-tests.json`, `confirmation-recheck.json`, `confirmation-browser.json`, ảnh `confirmation-desktop.png`, `confirmation-mobile.png`, `confirmation-cancel.png`.
- Chưa đo coverage mới. Không chạy lại backend vì tác vụ này chỉ đổi frontend. Chưa commit/push trong tác vụ này; thay đổi QA-copy/V47 từ tác vụ trước được giữ nguyên.
