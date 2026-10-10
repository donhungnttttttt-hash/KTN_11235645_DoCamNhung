# Công việc và vòng đời bug nội bộ — Sprint 6

## Cập nhật hiệu lực ngày 06/10/2026

Phần S06 bên dưới là nền ban đầu. S07 đã có retest/closure/reopen theo [chính sách retest](retest-policy.md); S08 đã có quyết định NA/chốt đợt. Theo [quyền hiện hành](permissions.md), DEV được xem trong dự án nhưng chỉ bình luận/chứng cứ và chuyển BUG đang được giao còn chưa terminal sang `progress` hoặc `resolved`, có version/lý do; `resolved` cần build đã sửa. Không dùng mã `in_progress`. PM vẫn phân công, chuẩn bị coverage/request và đóng/mở lại bug. Resolve không tự ghi OK hoặc tạo request retest. QA/câu hỏi riêng, closure non-BUG và phân công theo file chưa được triển khai; xem [đối chiếu luồng](../product/TRACEABILITY-UAT.md).

Quyết định đã xác nhận: [ADR-006](../decisions/ADR-006-internal-work-items.md). Một dòng `work_items` là danh tính duy nhất; `bug_details` là subtype BUG có FK cùng dự án, không có kho bug thứ hai.

## Quyền

| Thao tác | Thành viên đang hoạt động | PM dự án |
| --- | --- | --- |
| Xem công việc, bình luận, chứng cứ | Có | Có |
| Tạo bug từ NG hoặc revision case trong dự án | Có | Có |
| Tạo bug chưa có case, kèm lý do | Không | Có |
| Gắn một lần NG vào bug đã có | Có | Có |
| Thêm bình luận INTERNAL, tải chứng cứ | Có | Có |
| Gỡ chứng cứ | Chỉ tệp mình tải | Có |
| Phân công, phân loại, sửa mô tả bug | Không | Có |
| Chuyển trạng thái, batch, xác nhận làm rõ, tham chiếu tracker | Không | Có |

Global ADMIN không có quyền triage nếu membership dự án không phải PM. Người bị gỡ khỏi dự án hoặc bị khóa tài khoản không tiếp tục truy cập. Dự án archive chỉ đọc. Quyền tạo tài khoản vẫn theo S02, độc lập với bảng này.

## Trạng thái và tác động

| Mã | Hiển thị | Được chuyển vào ở S06 |
| --- | --- | --- |
| open | Chưa xử lý | PM + lý do |
| progress | Đang xử lý | PM + lý do |
| recheck | SYP kiểm tra lại | PM + lý do |
| clarify | Xác nhận đặc tả / mức độ | PM + lý do |
| ready | Sẵn sàng xử lý | PM + lý do |
| planning | Lập kế hoạch | PM + lý do |
| resolved | Đã xử lý | PM + lý do + build đã sửa nếu là bug |
| unreproducible | Không tái hiện | Chưa mở; cần quy trình S07 |
| wontfix | Không xử lý | Chưa mở; cần quy trình S07 |
| closed | Hoàn thành | Chưa mở; cần quy trình S07 |

PM được chuyển giữa bảy trạng thái đầu. Gửi cùng trạng thái với version hiện hành là no-op; stale version luôn 409. Form sửa thông tin không ghi status. Batch đi qua cùng policy, một mục lỗi thì toàn bộ transaction/history rollback. Không bao giờ sửa verdict của execution attempt khi chuyển bug sang resolved.

## Tạo và truy vết

- Title, steps, expected/actual, build/environment/device bắt buộc đối với BUG. TASK/REQUEST/IMPROVEMENT vẫn cùng work-item identity.
- Từ NG: server kiểm tra attempt cụ thể, cùng dự án, đúng revision/build/environment/device. Snapshot giữ ngữ cảnh thời điểm thực thi dù catalog đổi tên sau đó.
- Không có attempt: có thể chọn revision case; PM có thể tạo ngoài case với lý do. Backend không suy các trường có cấu trúc từ Markdown.
- Retry tạo có requestKey/checksum và actor; cùng request trả cùng ID, khác nội dung/actor bị 409. Project counter và tạo/link/history cùng transaction.
- Cặp bug/attempt unique; một bug liên quan nhiều lần NG. Bộ lọc “NG chờ liên kết bug” dựa trên latest attempt chưa có link, không dựa trên trạng thái bug.
- Quy tắc nội bộ `INTERNAL_V1` lưu bất biến trên bug. Chưa xác nhận rule khách hàng; không dùng JSON ruleset nháp S03 như rule đã phát hành.

## Chứng cứ và nội dung

Kho tệp `TMS_ATTACHMENT_ROOT`, mặc định `Backend/var/evidence` khi chạy từ Backend. UUID làm tên vật lý, tên gốc chỉ là metadata. Tối đa 20 MiB/tệp, 100 tệp/công việc; giới hạn xử lý ảnh 40 megapixel. PNG/JPG/PDF/MP4 kiểm tra nội dung, không tin MIME client. Nội dung PDF hoạt động thường gặp bị từ chối; đây không phải công cụ quét mã độc.

Mọi download kiểm tra lại membership và owner project/work item; ép tải xuống với attachment, nosniff, CSP sandbox, no-store. Upload chỉ báo thành công sau khi blob và metadata lưu; rollback xóa blob; restart đối soát tệp UUID/temp không có metadata quá 24 giờ. Tệp đang tải và tên không thuộc kho được giữ nguyên. Backup cần gồm cả MySQL và thư mục evidence.

Bình luận lưu text, frontend render text đã escape; chưa cho CUSTOMER visibility hay tài khoản khách. Tham chiếu tracker HTTP(S) nhập tay luôn UNRECONCILED, không gọi mạng bên ngoài. Làm rõ ghi riêng nguồn, người/thời điểm xác nhận và người/thời điểm nhập thực tế.
