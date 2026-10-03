# Kết quả thực thi kiểm thử — Sprint 05

Phạm vi triển khai theo [ADR-005](../decisions/ADR-005-execution-database.md), [API execution](../api/execution.md) và [thiết kế database](../database/system-design.md).

## Đơn vị dữ liệu

- Một đợt (`test_cycle`) chứa cấu hình môi trường + thiết bị + build mặc định. Một case trong một cấu hình là một `run_item`, giữ revision đã được PM dự án duyệt.
- Mỗi lần ghi kết quả tạo một `execution_attempt`. Kiểm thử lại thêm lần chạy; không ghi đè lần trước và không tự tạo thêm đơn vị scope.
- Khi kích hoạt đợt, phạm vi và revision được khóa. Thêm revision mới trong thư viện không đổi nội dung case của đợt đang chạy.

## Ý nghĩa và điều kiện

| Hiển thị | Dữ liệu | Điều kiện |
| --- | --- | --- |
| Chưa chạy | Chưa có attempt | Không tạo attempt giả để biểu diễn trạng thái này |
| OK — Đạt | `OK` | Người được phân công xác nhận kết quả thực tế đạt trên build đã chọn |
| NG — Không đạt | `NG` | Bắt buộc mô tả kết quả thực tế; lưu ngữ cảnh, đánh dấu chờ liên kết bug trong S05 |
| P — Tạm hoãn | `P` | Bắt buộc lý do; không tự loại khỏi scope hoặc tính là đạt |
| Fix | Không phải verdict | Dev báo đã sửa; tester phải kiểm thử lại. Workflow bug/retest thuộc S06–S07 |
| NA | Chưa triển khai | Chờ quyết định Q08 về quyền đề nghị/duyệt và thay đổi mẫu số |

Chưa tính tỷ lệ hoàn thành chính thức hoặc đóng đợt trước khi chốt Q08. `pendingBug=true` hiện lọc run có kết quả mới nhất NG; các NG trước đó vẫn giữ trong lịch sử khi lần chạy sau OK. Module liên kết bug và quy tắc retest sẽ bổ sung ở S06–S07; ghi OK trong S05 không tự đóng bug ngoài hệ thống.

## Quyền và ngữ cảnh

- Mọi đọc/ghi yêu cầu thành viên đang hoạt động của chính dự án. PM dự án hoặc ADMIN thuộc dự án quản lý cycle và phân công.
- Người ghi attempt phải là người hiện đang được phân công, có membership PM/TESTER hợp lệ, tài khoản enabled và đợt ACTIVE. Quyền quản lý không thay điều kiện được phân công.
- Backend lấy actor từ session, thời điểm từ server UTC. Build, môi trường, thiết bị phải thuộc cùng dự án và còn hoạt động. UI hiển thị thời gian theo timezone của dự án.
- Snapshot giữ thông số và nhãn ngữ cảnh tại thời điểm chạy. Phân công lại không đổi executor cũ. Lịch sử phân công giữ người gán, người trước/sau, lý do và thời điểm.
- `evidenceReference` là tham chiếu văn bản; không phải tệp đã upload hoặc chứng cứ đã được kiểm tra. Upload thật thuộc S06-T03.

## Lưu, thử lại và xung đột

Attempt + latest pointer + audit cùng một transaction. Không có API sửa/xóa attempt. Sửa kết quả nhầm bằng lần chạy mới, ghi lý do để tra cứu.

Client giữ `requestKey` khi thử lại sau mất mạng. Cùng key/payload/actor/run trả kết quả đã lưu; thay nội dung với key cũ nhận 409. `expectedVersion` ngăn ghi từ dữ liệu cũ. Sau 409, giữ bản nháp, tải bản hiện hành và yêu cầu người dùng tự xác nhận lưu lại; không tự gửi bản nháp trên version mới.

Phân công cũng có version và transaction. Sau xung đột, form giữ người định chọn và lý do; tải người đang được giao để đối chiếu, chỉ ghi khi người dùng bấm lưu lại. Lỗi tải lịch sử có nút thử lại riêng, không xóa bản nháp.
