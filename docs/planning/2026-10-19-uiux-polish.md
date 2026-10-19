# Rà sâu và hoàn thiện UI/UX — 19/10/2026

Yêu cầu mới mở rộng lượt rà trước: kiểm tra chi tiết thành phần, trạng thái hiển thị/ẩn, chữ, màu, đường viền, ô nhập và các nút; sửa điểm đã rõ và làm tương tác mềm mại hơn. Không đổi nghiệp vụ, quyền, vòng Status hay bộ năm màu kết quả người dùng đã chọn. Chỉ thay khối công việc gần đây trong Tổng quan bằng thông tin dự án; giữ trạng thái và mốc phát hành.

## Hợp đồng thiết kế

- Giữ khung TMS màu teal, font Inter và mật độ bảng hiện có; màn làm việc ưu tiên đọc và thao tác dữ liệu. Không dùng hero, gradient, scroll reveal hoặc animation theo từng hàng.
- Góc điều khiển 8px, panel 12px; đường phân nhóm nhẹ, ranh giới ô nhập đủ rõ. Chữ phụ phải dễ đọc; trạng thái có chữ/số, không chỉ màu.
- Hover/pressed/focus có phản hồi ổn định, không dịch nút khỏi vị trí. Chuyển động nhỏ: 140ms cho điều khiển, 200ms cho disclosure, 240ms cho lớp nội dung/hộp thoại. Không chờ animation để cho phép bấm; không trì hoãn mount/unmount hoặc kết quả server.
- Tôn trọng `prefers-reduced-motion`; không can thiệp wheel, pinch zoom hoặc chặn cuộn tự nhiên. Không tạo hiệu ứng trên toàn bảng hay phần tử cha chứa overlay fixed.
- Bàn phím: có lối bỏ qua menu, focus vùng nội dung sau đổi màn, giữ focus khi đổi bộ lọc; hộp thoại giữ/trả focus và nhả scroll lock khi khóa phiên đăng nhập. Portal không vượt qua trạng thái hidden/inert của xác thực.
- Mọi request có trạng thái đang xử lý/lỗi/thử lại phù hợp; lỗi không được biến thành số 0 hoặc báo lưu thành công. Giữ nháp đúng tài khoản/dự án và đối chiếu phiên bản trước retry.

Skill UIPro đã được đọc. `python`, `python3`, `py` không nằm trên PATH; dùng Python có sẵn tại đường dẫn cài đặt, không cài mới. Hai kết quả `--design-system` đề xuất bố cục marketing không phù hợp nên không áp dụng. Giữ hệ thống thiết kế TMS đã chốt và dùng kết quả domain `Reduced Motion`/`Excessive Motion` cùng hướng dẫn focus React; không áp khuyến nghị React19 lên stack React18 một cách máy móc.

## Thứ tự và checklist

- [x] Chụp baseline hash, kiểm tra nhánh/thay đổi cũ; chia ba nhóm source độc lập, root giữ browser/shared.
- [x] Đọc skill và đối chiếu audit 92 mục với source hiện hành.
- [x] Rà Auth/Admin/General: button/form/table/filter/permission/empty/error/loading/dirty/conflict; sửa và ghi ledger.
- [x] Rà Feature/file/case/Issue: overlay, grid, preview/import, assignment/history, bộ lọc/đường dẫn/focus; sửa và ghi ledger.
- [x] Rà Reports/AI: scope/presets/composer/history/provider, Markdown/editor/draft/feedback; sửa và ghi ledger.
- [x] Hoàn thiện shared shell, keyboard, control tokens, màu chữ và chuyển động có reduced motion.
- [ ] Browser toàn ma trận: đã smoke bốn role và viewport đại diện 320/390/768/1024/1440; còn state/error/permission/AT/IME/zoom/reduced-motion đầy đủ. Xem browser-matrix.md trong thư mục bằng chứng, không đánh dấu toàn bộ PASS.
- [x] Chạy kiểm thử toàn frontend/build, review diff và bảo toàn baseline; ghi coverage đo hay chưa đo.
- [x] Cập nhật báo cáo, ma trận fixed/open/NOT_RUN và STATUS; không gọi toàn hệ thống hoàn hảo từ số test PASS.

## Bảo toàn và kiểm chứng

Mọi thay đổi cũ giữ nguyên trên `system-design`. Dữ liệu main chỉ đọc; thao tác kiểm thử nghiệp vụ chỉ ở fixture đã có khi cần, không gửi dữ liệu dự án sang AI, không cấp quyền mới chỉ để thử. Không backend/migration/restart/cài dependency, không commit/push/merge/deploy.

TDD cho thay đổi hành vi; CSS trang trí kiểm bằng browser thay vì test khẳng định một giá trị style. Kết quả dưới `var/uiux-polish-2026-10-19/`. AST inventory bao gồm cả code điều kiện/prototype, không được coi là danh sách nút đã bấm. Giữ các receipt FAIL và giải thích hồi quy thật trước khi đánh dấu hoàn tất.

Checkpoint cuối: xem [báo cáo](../reviews/2026-10-19-uiux-polish.md) và `uiuxPolish20261019` trong STATUS. Source/review/kiểm thử đã ghi bằng chứng; UAT và residual còn mở.
