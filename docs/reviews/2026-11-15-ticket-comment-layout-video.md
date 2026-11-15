# Bình luận Ticket gọn và xem trước video — 15/11/2026

## Yêu cầu và thực hiện

- Thiết kế lại khung bình luận theo ảnh tham chiếu: vùng soạn bên trái, trạng thái và thông tin cập nhật bên phải; người phụ trách/ngày bắt đầu, mốc/hạn chót, lý do đóng/số giờ được căn theo hàng. Nút Tôi phụ trách đặt cạnh nhãn; footer tách rõ.
- Theo điều chỉnh cuối của người dùng, thu nhỏ các control cập nhật xuống 34 px, giảm khoảng cách và chiều cao tổng; vùng soạn vẫn rộng hơn các trường dữ liệu. Màn nhỏ xếp dọc và cuộn trong khung.
- Bỏ trường Người xác nhận lại khỏi composer và dòng hiển thị thuộc tính Ticket. Composer không gửi thay đổi verifier. Dữ liệu lịch sử, contract và quy tắc chuyển trạng thái backend chưa bị xóa hay thay đổi.
- Drawer mở rộng chỉ chiếm vùng nội dung bên phải menu và dưới header. Đo kích thước sidebar/header hiện tại bằng ResizeObserver để phù hợp menu thu gọn và viewport.
- Bổ sung video MP4 có controls, playsInline và preload metadata trong bản xem trước nháp và bình luận đã lưu. Giữ đường tải tệp; báo khi trình duyệt không giải mã được video. URL Blob được thu hồi khi unmount; video đã lưu dùng API đính kèm có xác thực hiện tại.

Skill: frontend-patterns. Không thêm dependency, migration hoặc thay đổi dữ liệu dự án.

## Kiểm chứng

- Regression video draft/saved tái hiện FAIL trước khi sửa, PASS sau sửa. Test quản trị xác nhận không có lựa chọn verifier và không gửi verifierUserId; cập nhật các kỳ vọng test cũ về dropdown đã bỏ.
- 169 test PASS trong 20 file: work-items và useDialogFocus. Không đo coverage riêng.
- Vite build PASS, cảnh báo bundle lớn hơn 500 kB vẫn còn.
- Chrome thật: editor khoảng 263 px cao; không tràn ngang trên desktop/mobile 390 px; không có lỗi JavaScript.
- Phóng lớn: menu kết thúc tại x=200, cả drawer và backdrop bắt đầu tại x=200; menu không bị che.
- Chrome phát được MP4 mẫu CC0 960 px, thời lượng 5,055 giây, controls hoạt động. Dùng tệp mẫu MDN tải vào thư mục ignored, không gửi bình luận hay ghi dữ liệu main.
- Saved attachment qua API được kiểm tra bằng test component; chưa phát tệp video cụ thể của người dùng do không có đường dẫn/ID trong yêu cầu.

Bằng chứng ignored: `var/workspace-ui-browser/composer-redesign/` (desktop, expanded-menu-visible, mobile, video-preview, result.json), `composer-final-tests.json`.

## Tham chiếu Figma

Đã đọc file HTML Make người dùng cung cấp và lần theo `saved_resource.html` đến `reference.html`: đây là giao diện chi tiết/bình luận Backlog trong các ảnh tham chiếu. Bản lưu thiếu `backlog.css`; URL tài nguyên preview trả 401, nên không thể xác nhận so khớp từng pixel với CSS gốc. Không kết luận trang công khai bắt buộc đăng nhập.

Đã áp dụng cấu trúc tham chiếu cùng ảnh: khung editor có viền liên tục, toolbar ngăn bằng đường viền, các ô nhập/select có viền xám rõ, nhãn mốc quan trọng nằm trên ô chọn và thẳng hàng với hạn chót. Mũi tên mốc đổi chiều khi mở; giữ chọn nhiều, trạng thái điều kiện và quyền hiện có. Không thêm trường dữ liệu hay chức năng giả từ HTML. Loại bỏ khoảng trắng do danh sách đính kèm rỗng.

Kiểm chứng bổ sung sau khi đối chiếu HTML: 51 test composer/workflow/detail PASS, build PASS; Chrome xác nhận bố cục, video, mobile và mép menu. Không ghi dữ liệu dự án khi kiểm tra.

Chưa commit/push. Backend local và schema V46 giữ nguyên; frontend local nhận thay đổi qua Vite.

## Điều chỉnh theo ảnh và yêu cầu thu còn một nửa

- Avatar tròn bên trái là tài khoản đang đăng nhập, tải qua API hồ sơ hiện có; chưa có ảnh/lỗi ảnh thì dùng chữ viết tắt. Không dùng ảnh người được phân công làm avatar người soạn.
- Ba hàng bên phải: Người phụ trách/Ngày bắt đầu; Mốc quan trọng/Hạn chót; Lý do hoàn thành/Dự kiến–Thực tế. Lý do chỉ chọn được khi chuyển Đóng; giữ các lý do và quyền chuyển trạng thái backend hiện hành. Nhãn lý do không lặp tiền tố Đóng. Nút cuối đổi thành Đăng.
- Control 28 px; khung soạn 164 px. Chrome desktop đo toàn khung 296 px, gần một nửa ảnh khoảng 565 px người dùng đưa. QA chuyển Bug đặt cạnh nhãn trạng thái để không chiếm hàng riêng. Giữ viền, upload/preview và khu vực menu.
- 164 test work-items PASS, Vite build PASS (cảnh báo chunk cũ); Chrome desktop/mobile, avatar tài khoản admin, phát MP4 và mép menu PASS. Không đo coverage; không gửi bình luận thử vào dữ liệu main.
- Bằng chứng: `composer-compact-tests.json`, ảnh và `result.json` trong thư mục ignored đã nêu.

### Bổ sung cuối: bỏ mốc và số giờ khỏi bình luận

Theo yêu cầu tiếp theo, avatar căn giữa ô soạn (Chrome đo lệch tâm 1 px); bỏ Mốc quan trọng, Dự kiến và Thực tế khỏi composer. Lý do hoàn thành chuyển lên cùng hàng Hạn chót. Giữ dữ liệu cũ khi lưu ngày/phân công, không xóa mốc hay số giờ đã lưu, không đổi form tạo Ticket. Test composer/workflow PASS, build PASS và Chrome xác nhận trường đã bỏ, avatar giữa ô, khung 286 px, mobile/video/menu không hồi quy. Bằng chứng `composer-hide-fields-tests.json` và thư mục ảnh hiện có.

### Chọn lý do trực tiếp và căn đáy các ô

Dropdown Lý do hoàn thành hiện các lý do trong allowedTransitions ngay cả trước khi chọn Đóng. Chọn một lý do cập nhật bản nháp sang Đóng; vẫn xác nhận trước khi gửi, không mở rộng quyền backend hoặc thêm lý do ngoài nghiệp vụ. Xóa lựa chọn trở về giữ nguyên trạng thái. QA đang chuyển Bug tạm khóa lý do tránh hai hành động xung đột.

Các ô bên phải cao 40 px, hàng cuối ngang đáy thanh đính kèm (Chrome lệch 1 px), tổng khung 287 px. Regression chọn lý do trực tiếp đã tái hiện thất bại trước sửa; sau sửa 165 test work-items PASS, build PASS (cảnh báo chunk cũ). Chrome chọn QA/Không được hỗ trợ đổi bản nháp sang Đóng, không gửi dữ liệu; mobile, avatar, MP4 và menu PASS. Bằng chứng `closure-direct-tests.json`.

### Hiển thị trạng thái hiện tại

Ô Trạng thái mặc định dùng `item.ticketState` để hiển thị đúng Chưa xử lý/Xác nhận spec/Đang xử lý/Chờ xác nhận/Đóng, bỏ nhãn Giữ nguyên trạng thái. Giá trị nội bộ chưa thay đổi vẫn không gửi lệnh chuyển trạng thái khi chỉ đăng bình luận. Năm regression tái hiện FAIL trước sửa; sau sửa 57 test composer/workflow/detail PASS, build PASS. Chrome xác nhận Ticket T11-15-10 hiển thị Chưa xử lý trong control và dropdown, không ghi dữ liệu. Bằng chứng `current-status-tests.json`, `composer-redesign/current-status.png`.

### Bỏ thông báo phụ làm giãn khung

Bỏ dòng chờ tester xác nhận, thông báo cập nhật điều phối và đoạn hướng dẫn thường trực khỏi form bình luận theo yêu cầu. Nội dung xác nhận trước khi lưu, lỗi và trạng thái lưu vẫn hoạt động; payload điều phối/đóng Ticket không thay đổi. Kiểm tra composer/workflow/presentation và build PASS (`composer-no-hints-tests.json`); không ghi dữ liệu dự án. Điều chỉnh kỳ vọng test về lựa chọn Đóng hiện tại và lựa chọn chuyển kết luận Đóng có cùng nhãn sau thay đổi trước đó.

### Chấm màu trạng thái theo Kanban

Thêm chấm tròn 10 px trước tên trạng thái trong control và popup. Màu lấy trực tiếp từ `ticketColumns`; trạng thái Đóng dùng màu của lý do đóng đang chọn/đã lưu. UnifiedSelect hỗ trợ màu tùy chọn, các dropdown khác giữ hành vi cũ. Test màu lựa chọn/giá trị và màu Đã sửa PASS; tổng 179 test work-items/select PASS, build PASS (cảnh báo chunk cũ). Chrome xác nhận NEW xám và IN_PROGRESS xanh ở cả popup/control, không gửi dữ liệu. Bằng chứng `status-color-tests.json`, `composer-redesign/status-dropdown-colors.png`, `composer-redesign/status-selected-color.png`. Không đo coverage.
# Chỉnh sửa Ticket trực tiếp tại nội dung — 15/11/2026

- Theo yêu cầu mới, nút **Chỉnh sửa** chuyển tiêu đề, hiện tượng/nội dung, bước thực hiện, kết quả, điều kiện tiên quyết và thông tin kiểm thử thành trường nhập ngay tại vị trí đọc. Lưu/Hủy đặt cạnh tiêu đề; bỏ form sửa riêng và nút bút chì trùng phía dưới.
- Giữ nguyên quyền sửa, validation, version gửi lên API, bản nháp khi lưu lỗi và đối chiếu nội dung máy chủ khi có thay đổi đồng thời. Không thay đổi nguồn phát hiện đã lưu hoặc luồng bình luận.
- Skill đã áp dụng: frontend-patterns. Test hành vi vị trí trường nhập/hủy tái hiện lỗi trước sửa; 171 test work-items PASS. Build PASS (cảnh báo chunk-size hiện có); chưa đo coverage.
- Chrome riêng: kiểm tra sửa tại chỗ, liên kết form, hủy/mở lại và màn hẹp 390 px PASS. Chỉ sửa bản nháp, không ghi dữ liệu dự án. Ảnh: `var/workspace-ui-browser/composer-redesign/inline-edit-{desktop,metadata,mobile}.png`.
- Chưa commit/push.

# Gộp Ghi chú bổ sung — 15/11/2026

- Gộp nội dung và thông tin kiểm thử/nguồn phát hiện vào một khung trắng. Bỏ phần thu gọn riêng; đổi tên thành **Ghi chú bổ sung** và hiển thị luôn.
- Theo ảnh mẫu: hai cột nhãn–giá trị, đường kẻ từng dòng, tên người phụ trách có avatar chữ viết tắt; nội dung dài dùng toàn hàng. Màn nhỏ chuyển một cột. Chỉ trình bày dữ liệu hiện có, không thêm trường nghiệp vụ từ ảnh mẫu.
- Giữ tên/mô tả/môi trường Đợt kiểm thử hiện tại, nguồn lúc phát hiện, liên kết file/case, metadata và khả năng sửa tại chỗ. Không đổi API/schema/dữ liệu.
- Skills: frontend-patterns, verification-loop. 171 test work-items PASS; build PASS với cảnh báo chunk-size hiện có; coverage chưa đo. Chrome riêng xác nhận cùng khung, hai cột, sửa môi trường/hủy, chiều rộng 390 px; không ghi dữ liệu dự án.
- Bằng chứng: `var/workspace-ui-browser/supplementary-tests.json`, `supplementary-live.cjs`, ảnh `composer-redesign/supplementary-desktop.png` và `supplementary-mobile.png` (ảnh phần tử trong vùng cuộn có thể bị thanh bình luận cố định che một phần).
- Chưa commit/push.

# Thu gọn đúng nghiệp vụ — 15/11/2026

- Theo phản hồi, bỏ Thời gian dự kiến, Thời gian thực tế và Mốc quan trọng khỏi Ghi chú bổ sung vì đã được yêu cầu bỏ trước đó. Bỏ Trạng thái/Loại Ticket trùng đầu trang; chỉ hiện Lý do hoàn thành khi có dữ liệu. Giữ ngày bắt đầu/hạn chót và dữ liệu kiểm thử đang sử dụng.
- Không xóa dữ liệu đã lưu hoặc đổi API. 45 test chi tiết/workflow PASS, build PASS (cảnh báo chunk-size cũ), Chrome desktop/mobile PASS; chưa đo coverage. Chưa commit/push.

# Phạm vi Ghi chú bổ sung chốt cuối — 15/11/2026

- Chỉ giữ thông tin kiểm thử và nguồn phát hiện: tên/môi trường/mô tả Đợt kiểm thử, version/ngày thực hiện/đối tượng, case tham chiếu/file, tần suất và môi trường/thiết bị phát hiện. Giao diện tham khảo cấu trúc mẫu, không lấy thêm các trường quản lý từ mẫu.
- Bỏ Mức ưu tiên, Người phụ trách, Ngày bắt đầu, Hạn chót, Lý do hoàn thành khỏi khối này. Các trường đã bỏ trước đó tiếp tục không hiển thị. API sửa nội dung không gửi lại ưu tiên đang ẩn; dữ liệu backend được giữ nguyên.
- 171 test work-items PASS, build PASS (cảnh báo chunk-size cũ), Chrome riêng kiểm tra danh sách trường đã bỏ, bố cục hai cột, sửa/hủy môi trường và mobile PASS. Coverage chưa đo; chưa commit/push.



## Bỏ màn Monkey đã xóa theo yêu cầu cuối — 15/11/2026

- Yêu cầu mới thay thế phần chỉnh bộ lọc bên dưới: gỡ hoàn toàn màn Monkey đã xóa, dropdown Hiển thị lỗi, cột/nút khôi phục và nút dẫn từ Thêm lỗi.
- Đường dẫn cũ `/issues?deleted=true` mở Thêm lỗi. `/board/list?deleted=true` chỉ đọc Ticket đang hoạt động. Không xóa dữ liệu hoặc sửa API/backend.
- Thay kiểm tra màn khôi phục đã bỏ bằng kiểm tra đường dẫn cũ và danh sách hiện tại. 168 work-items tests PASS; build PASS với cảnh báo bundle hiện có; diff check PASS. Chrome xác nhận đường dẫn cũ và mở danh sách Ticket bình thường, không ghi dữ liệu. Coverage chưa đo. Chưa commit/push.

## Bộ lọc Monkey đã xóa — 15/11/2026 (đã được thay thế bằng yêu cầu bỏ màn)

- Đưa Hiển thị lỗi vào cùng hàng bộ lọc Đợt kiểm thử/Loại/Trạng thái/Tìm ticket; dùng cùng chiều cao, viền và khoảng cách nhãn. Mobile tự xuống hàng.
- 21 FeatureIssuesPage tests PASS, build PASS. Chrome desktop/mobile xác nhận nhãn không dính dropdown và control cao 44 px; không ghi dữ liệu. Ảnh: var/workspace-ui-browser/composer-redesign/deleted-filter.png.

## Thống nhất form tạo Ticket và nguồn phát hiện — 15/11/2026

- Dùng chung IssueContentEditor cho trang Thêm lỗi và modal tạo từ case; hiển thị trực tiếp các trường, bỏ các tab nội dung riêng. Monkey tiếp tục nhập thủ công.
- Chỉ giữ một dropdown Trạng thái ban đầu cạnh Loại Ticket, thay dòng trạng thái dạng chữ. Giữ nguyên trạng thái/quyền do API cung cấp.
- Đưa Version lúc phát hiện vào nhóm 2 × 2 với Tần suất tái hiện, Môi trường phát hiện và Thiết bị phát hiện; bỏ khung Nguồn lúc phát hiện riêng. Version của case vẫn chỉ đọc từ nguồn, Monkey nhập thủ công.
- Đổi Đầu mối tiếp nhận và placeholder thành Người phụ trách/Chọn người phụ trách; giữ nguyên danh sách đủ quyền và payload phân công.
- Skills: frontend-patterns, verification-loop. 171 test work-items PASS; build PASS (cảnh báo kích thước bundle hiện có); git diff --check PASS. Coverage chưa đo.
- Chrome riêng: xác nhận bố cục, metadata 2 × 2, tên trường, bản nháp Monkey/hủy và chiều rộng mobile; không ghi dữ liệu dự án. Prefill/payload của case được kiểm tra bằng component tests. Ảnh: var/workspace-ui-browser/composer-redesign/monkey-shared-fields.png.
- Chưa commit/push trong tác vụ này.
