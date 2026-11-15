# Danh sách dự án: giao diện và lọc ngày tạo

## Phạm vi đã thực hiện

- Bỏ khung **Phạm vi dự án** khỏi trang danh sách Admin. URL cũ có `projectId` không âm thầm giới hạn danh sách; bộ chọn trong trang chi tiết vẫn dùng để chuyển dự án.
- Tiêu đề, nút tạo dự án, hàng tìm kiếm/bộ lọc và bảng được bố trí lại. Mã, tên, ngày tạo tách rõ; tiến độ có thanh, trạng thái có nhãn màu, PM dài giới hạn hai dòng với tooltip.
- **Mới nhất** mặc định, có **Cũ nhất**; lọc **Từ ngày – Đến ngày** theo ngày tạo tại Việt Nam, hai đầu được tính trọn ngày. Có xóa bộ lọc, khoảng ngày không hợp lệ, loading/error/retry/empty; đổi bộ lọc đưa về trang đầu.
- Giữ các số liệu PM, thành viên, tổng case, tiến độ, tỷ lệ OK, Bug mở, mốc quá hạn và máy đang giữ; không tạo/xóa/chỉnh dữ liệu nghiệp vụ.

## Contract

`GET /api/v1/admin/projects` bổ sung:

| Tham số | Quy tắc |
| --- | --- |
| `sort` | `newest`, `oldest`, `id`; mặc định `id` để giữ tương thích các bộ chọn khác. Trang danh sách luôn gửi `newest` lúc mở. |
| `createdFrom` | ISO date, từ 00:00 Asia/Ho_Chi_Minh của ngày này, inclusive. |
| `createdTo` | ISO date, trước 00:00 ngày kế tiếp, exclusive. |

Ngày được quy đổi về UTC trước truy vấn. Lọc diễn ra trước COUNT/LIMIT/OFFSET. Thứ tự có ID phụ để phân trang ổn định khi trùng ngày/giờ. Sort không hợp lệ hoặc từ ngày lớn hơn đến ngày trả 422. Quyền Admin giữ nguyên. Response bổ sung `createdAt`; không thay schema/Flyway.

## Kiểm chứng

- Red: hai kiểm tra frontend và hai kiểm tra native thất bại trước implementation do thiếu sort/date và lọc theo ngày chưa có.
- Green: **233/233 test, 30 file** frontend Admin; **14/14 test backend** gồm AdminProjectFiltersNativeTest (2), AdminOverviewServiceTest (9), AdminOverviewTabletNativeTest (3). Native dùng schema cô lập qua `Test-UnifiedAccessNative.cjs`.
- Native kiểm tra biên ngày UTC+7, cùng ngày, chỉ từ/đến, thứ tự hai chiều, phân trang/count, tie-break ID, quyền và khoảng ngày sai.
- `npm run build` PASS. Cảnh báo chunk JS >500kB có sẵn, không phải lỗi build. Không đo coverage mới.
- Chrome thật chạy headless: đăng nhập, mở URL có scope cũ vẫn đủ **12 dự án**, đối chiếu thứ tự API/UI; ngày **15/11/2026** có **1 dự án**; tìm không có kết quả, xóa lọc, mở form tạo (không lưu) đều PASS. Desktop 1440px hàng lọc thẳng hàng; mobile 390px không tràn ngang; không lỗi JavaScript.
- Đã xem ảnh desktop/mobile; sửa CSS kế thừa `max-width:450px` để khung bộ lọc bao đủ cả hàng.
- Local backend đã nạp artifact kiểm chứng tại `var/workspace-ui-browser/projects-runtime`, health UP, Flyway V46 giữ nguyên. Không migration hoặc ghi dữ liệu mẫu vào main.

Skill: frontend-patterns (áp dụng từ phiên làm việc hiện tại). Không commit/push trong tác vụ này.

Bằng chứng cục bộ (ignored): `var/workspace-ui-browser/projects-list-live.cjs`, `projects-runtime/projects-desktop.png`, `projects-runtime/projects-mobile.png`, log Maven tại `Backend/target/unified-access-verification/last-test.log`.

## Bổ sung nhãn phân trang

Đổi Người trước/Người sau và Máy trước/Máy sau thành Trang trước/Trang sau trong MemberPicker, InitialDevicePicker và ProjectDevices. 26 kiểm thử phân trang/quản lý/hộp thoại hiện có PASS; giữ nguyên hành vi. Không đo coverage mới, không commit/push.
