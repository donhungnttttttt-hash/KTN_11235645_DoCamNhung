# Kết quả thực thi kiểm thử — Sprint 05

Phạm vi triển khai theo [ADR-005](../decisions/ADR-005-execution-database.md), [API execution](../api/execution.md) và [thiết kế database](../database/system-design.md).

## Bổ sung công việc theo file — 06/10/2026

Theo thiết kế F/Q đã duyệt, các run đã thuộc nhóm file phải ghi qua phiên thực thi được guard tại server; endpoint ghi lượt cũ từ chối bypass nhóm bằng `FILE_SESSION_REQUIRED`. Một attempt theo file giữ link phiên và snapshot máy vật lý đã sử dụng, cùng revision/build đã cố định. Retest FULL_CASE vẫn đi qua đường ghi chính thức riêng với provenance rõ ràng, không tạo phiên máy giả; BUG_ONLY không ghi attempt. Xem [contract theo file](../api/file-work.md), [hướng dẫn](../file-work-qa-guide.md) và [trạng thái kiểm chứng](../reviews/2026-10-06-fq-implementation.md).

Kết thúc phiên chỉ kết thúc việc thực thi: hết Chưa chạy/P và NG hiện hành có BUG liên kết. Không tự đóng bug, kết luận dự án đạt hay thay điều kiện PM chốt đợt. Kết quả tài liệu/source Excel độc lập với execution; xuất execution theo file dùng revision được giao và kết quả của build được chọn, không trả lại nguyên file nhập như thể là báo cáo hiện hành. Native/FK/race/UAT là gate riêng, không suy từ source hoặc mock test PASS.

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
| NA | Quyết định loại run item khỏi phạm vi | PM quyết định có lý do/version và lịch sử; không sửa/xóa attempt cũ, giảm mẫu số báo cáo |

ADR-008 đã chốt quy tắc nội bộ và S08 đã triển khai tỷ lệ thực thi/đạt, NA, chốt/mở lại đợt. Xem [định nghĩa số liệu](metrics.md) và [API báo cáo](../api/reporting.md). `pendingBug=true` lọc run có kết quả mới nhất NG chưa liên kết bug; các NG trước đó vẫn giữ trong lịch sử khi lần chạy sau OK. S06–S07 đã có liên kết bug và retest; ghi OK không tự đóng bug. Kết quả tài liệu Excel V13 vẫn độc lập với execution và không được tính vào tỷ lệ đợt.

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
