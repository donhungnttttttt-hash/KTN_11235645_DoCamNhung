# Chrome — UI/UX polish 19/10/2026

Chỉ thao tác trên localhost:5173 và bản preview cô lập 127.0.0.1:5174. Bốn vai trò dùng tài khoản fixture có sẵn; không cấp quyền, không lưu form, không đổi Status/Issue, không gọi AI/OAuth/probe. Đăng nhập/đăng xuất có tạo sự kiện audit; không khẳng định database không hề có ghi kỹ thuật. Khi kiểm tra dọn dẹp cuối, main ở trạng thái chưa đăng nhập. Viewport đã được đặt lại, các tài khoản fixture đã đăng xuất.

| Vai trò / màn / hành trình | Kết quả quan sát | Bằng chứng / giới hạn |
|---|---|---|
| Main ADMIN / Tổng quan | Có thông tin dự án, trạng thái công việc và mốc phát hành; không thay toàn màn | main-overview-polished-default.json/.jpg; quan sát đầu lượt, không đại diện mọi form trên main |
| PM / Tổng quan 1440 px | Giữ đúng ba phần; 6 Issue và 17% từ fixture | pm-overview-1440.json/.jpg |
| PM / rời báo cáo rồi quay lại | Nội dung thử trong editor được phục hồi; sau đó đã xóa nội dung thử khỏi editor, không lưu | pm-report-draft-restored-1440.json/.jpg; chưa kiểm hai người sửa gặp 409 hoặc đăng nhập lại trên browser |
| PM / danh sách Issue, monkey 1440 px | Bộ lọc/danh sách/phân trang và form hiện đầy đủ; Escape → tiếp tục soạn giữ nội dung nháp | pm-issues-list-1440.json/.jpg; pm-monkey-form-1440.json/.jpg |
| PM / monkey 390 px, lần quan sát đầu | FAIL: chiều rộng trang 458 px, header/footer ngoài viewport | pm-monkey-draft-390.json/.jpg được giữ; chưa kết luận chắc nguyên nhân công cụ/cache |
| PM / monkey 390 px, tải mới cuối lượt | PASS giới hạn về kích thước/vị trí: x = 8/y = 8, rộng 368.8 px, cao 828 px; body cao 758 px/scrollHeight 934 px; chiều rộng trang 385 ≤ 390 px; đúng quy tắc mobile và CSS Vite mới | pm-monkey-390-final-metrics.json; pm-monkey-390-final.jpg; không tái hiện lỗi quan sát cũ |
| PM / monkey 390 px, footer/Tab | Lưu và Hủy nằm trong vùng cuộn; Tab cuối quay về nút đóng; Shift+Tab từ Hủy đến Lưu cho thấy rõ footer | pm-monkey-390-footer.jpg; không bấm lưu |
| PM / monkey 320 × 568, 768 × 1024, 1024 × 768 | Panel nằm trong viewport, phần nội dung có giới hạn; không tràn trang ở ba kích thước | modal-responsive-final.json; chỉ kiểm entry monkey |
| PM / sửa và Hủy Note | Focus vào tiêu đề, các thao tác khác bị khóa, Hủy đóng editor | pm-note-editor-final.txt; không lưu hoặc tạo lỗi 409 thật |
| PM / tài khoản chưa được cấp quyền | Không có mục tạo Tester khi thiếu capability | pm-account-no-grant.txt; nhánh được cấp quyền chỉ có test component |
| PM / Chat 320 × 568 | Mở được phạm vi; toolbar xuống hai cột; ô soạn và nút gửi trong viewport. Có giải thích nguồn chưa sẵn sàng, gửi bị khóa | pm-chat-scope-320.jpg; không gửi tin/preset/probe, chưa cuộn tin cũ thật |
| TESTER / Note | Chỉ đọc; không có tạo/sửa/xóa hoặc mục Analysis ở menu bên | tester-note-readonly.txt |
| TESTER / Feature/file/bảng case | Mở Feature → file → 5 case; case 1–3 có quyền, case 4–5 chưa phân công bị khóa Status; chỉ có phạm vi tự phân công | tester-feature-grid.txt; không bấm Status |
| TESTER / lịch sử phân công | Có người thao tác, case 1–3, chưa phân công → Tester và thời gian; đóng được | tester-assignment-history.txt; chưa kiểm trang cũ hơn/lỗi/rỗng |
| TESTER / case 1 → tiếp case 2 → đóng | Chi tiết hiện case 2/P; đóng trả focus về nút case 2, chiều rộng trang 1030 ≤ 1036 px | tester-case-next-close-focus.json; chưa đi qua trang thật |
| TESTER / bàn phím trên badge Issue | ArrowDown mở preview và focus Issue đầu, có nút Tạo Issue | tester-issue-preview-keyboard.txt; chưa kiểm mọi tổ hợp Tab/cập nhật vị trí |
| TESTER / tạo Issue từ ô, 390 px | Đúng Feature/file/case, tự điền bước thực hiện/kết quả mong đợi; portal x = 8/y = 8/cao 828 px trong viewport | tester-case-issue-390.jpg/.json; đóng mà không lưu |
| DEV / bảng case | Mọi Status bị khóa; không có tự nhận phân công, vẫn có lối xem/lịch sử | dev-grid-readonly.txt |
| DEV / Issue được giao | Đọc được ưu tiên Cao; chỉ được chuyển sang Đã xử lý; Lưu/Ghi chú bị khóa khi trống; liên kết Feature đúng | dev-issue-expanded.txt; không lưu chuyển trạng thái/ghi chú |
| DEV / phóng to Issue và lịch sử | Phóng to toàn viewport, header/nút đóng hiện, nội dung cuộn; tải được lịch sử | dev-issue-expanded.jpg; thay đổi kích thước các phần con ở mọi entry còn PARTIAL |
| ADMIN / Tổng quan | Dữ liệu Tổng quan/API hiển thị, giữ năm màu kết quả | admin-overview-final.txt; không đo hiệu năng |
| ADMIN / tạo tài khoản 320 px | Có bốn vai trò, hướng dẫn, nhãn, ô nhập, footer Lưu/Hủy; Hủy đóng được | admin-user-create.txt; admin-user-create-320.jpg; không tạo tài khoản |
| ADMIN / bộ lọc thiết bị | Lọc Sẵn sàng trả 0 máy và thông báo rỗng; không lặp trạng thái đang tải | admin-devices-empty-filter.txt; fixture có hai máy đều đang bàn giao, không thu hồi để thử |
| ADMIN / audit | Đọc được sự kiện; có bộ lọc ngày/dự án/tìm kiếm; sự kiện auth mới đúng vai trò | admin-audit-final.txt; không thay cài đặt |
| ADMIN / Tổng quan dự án 1440/320 px | Giữ thông tin/trạng thái/mốc phát hành; ở 320 px, chiều rộng trang 314 ≤ 320 px, ba vùng nội dung rộng 294.4 px | overview-final-1440.jpg; overview-final-320.json |

Ảnh đã được xem trực tiếp, không chỉ tạo file. Truy vấn sai tên heading chính xác (ví dụ Note so với Note·project) được đối chiếu snapshot, không ghi thành lỗi sản phẩm. Công cụ có những lần timeout/kết nối lại; không suy ra nút vô hiệu từ timeout đó. `pm-report-route-transition.*` là quan sát trung gian trước khi route dựng xong, không dùng làm ảnh cuối.

**NOT_RUN/PARTIAL:** chưa bấm hết 997 điều khiển hoặc mọi tổ hợp quyền × viewport × lỗi × tải dữ liệu. Chưa kiểm thao tác chạm/IME/trình đọc màn hình, zoom 200%, giả lập giảm chuyển động ở hệ điều hành, mất mạng khi ghi/401/409 thật, upload/download thật, xuất bản/lưu trữ/cấp quyền/xóa/AI thật. Source và test giả lập không thay thế UAT trên browser. Không chứng nhận WCAG hay hiệu năng từ những ảnh trên.
