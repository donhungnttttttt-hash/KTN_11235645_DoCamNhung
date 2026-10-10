# Lưu trữ và mở lại dự án

Quyết định ngày 08/10/2026: người dùng giao chọn quy tắc phù hợp khách hàng. Chỉ ADMIN đang hoạt động được quyết định. Lưu trữ là chuyển dự án sang chế độ chỉ đọc, không phải xóa hoặc tự hoàn thành công việc. PM/Tester/Dev còn membership vẫn được xem lịch sử và xuất dữ liệu theo quyền hiện có.

## Kiểm tra trước khi lưu trữ

`GET /api/v1/admin/projects/{id}/archive-readiness`

Trả về `projectId`, `projectCode`, `projectName`, `version`, `archived`, `archivedAt`, `canArchive`, `canReopen`, `asOf`, `blockers`, `warnings`, `latestDecision`.

Mỗi blocker có `{code, label, count}`; chỉ trả các loại có số lượng lớn hơn 0:

| Code | Điều kiện | Hướng xử lý |
| --- | --- | --- |
| `ACTIVE_SESSIONS` | Phiên file `DOING` hoặc `PAUSED` | Tester hoàn tất hoặc PM hủy phiên với lý do theo luồng hiện có |
| `ALLOCATED_DEVICES` | Thiết bị bàn giao chưa có thời điểm thu hồi | Admin nhận lại thiết bị |
| `OPEN_WORK_ITEMS` | Công việc có trạng thái chưa kết thúc trong danh mục, bao gồm bug và QA | PM/Tester/Dev xử lý theo từng luồng; không bỏ qua retest hoặc xác nhận QA |
| `UNFINISHED_CYCLES` | Đợt `ACTIVE`, hoặc `DRAFT` đã có run item | PM xử lý và chốt đợt theo các điều kiện hiện có |
| `OPEN_RETESTS` | Bất kỳ yêu cầu retest còn `OPEN`, kể cả dữ liệu cũ có bug đã kết thúc | Xử lý retest trước khi lưu trữ |
| `PENDING_PUBLICATIONS` | Redmine `QUEUED`, `RETRY_WAIT` hoặc `RUNNING` | Chờ/khắc phục lần gửi để không cắt ngang tác vụ ngoài hệ thống |

Đợt nháp rỗng được giữ nguyên khi lưu trữ vì chưa chứa công việc thực thi. Hệ thống không gán nháp đó thành hoàn tất. Lỗi gửi Redmine đã dừng (`FAILED`, `CONFLICT`, `UNCERTAIN`) không được tính là tác vụ đang gửi; lịch sử vẫn giữ và Admin có thể mở lại dự án để xử lý tiếp. Không tự gửi lại khi mở lại dự án.

Cảnh báo cần xử lý trên tổng quan (`attention.overdueMilestones`, `overdueMilestoneCount`, `insufficientMilestoneData`) chỉ tính dự án chưa lưu trữ. Chi tiết dự án vẫn giữ mốc và số liệu lịch sử, kể cả đợt nháp rỗng quá hạn; mỗi mốc có `projectArchived` và `projectArchivedAt` để hiển thị ngữ cảnh đã lưu trữ, không tự đổi trạng thái lịch sử.

`warnings` trả cảnh báo không chặn `{code: PUBLICATION_REVIEW, label, count}` khi bản công bố mới nhất của một binding là `FAILED`, `CONFLICT` hoặc `UNCERTAIN`. Người dùng được nhắc kiểm tra trước khi lưu trữ; muốn đối chiếu sau đó phải mở lại dự án. Không đếm thất bại lịch sử đã có lượt mới hơn thành công.

`latestDecision` là `null` khi chưa có quyết định; nếu có, trả `{id, action, reason, actorName, decidedAt, resultVersion}`.

## Quyết định có phiên bản và chống gửi trùng

- `POST /api/v1/admin/projects/{id}/archive`
- `POST /api/v1/admin/projects/{id}/reopen`

Body: `{expectedVersion, reason, requestKey}`. Phiên bản không âm; lý do sau bỏ khoảng trắng đầu/cuối dài 1–2000 ký tự; khóa khớp `[A-Za-z0-9_-]{8,100}`. Client giữ nguyên khóa khi thử lại cùng thao tác, tạo khóa mới khi người dùng sửa nội dung hoặc chấp nhận phiên bản mới.

Trả HTTP 200 với readiness hiện tại. Gửi lại khóa đã thành công với cùng actor, action, expectedVersion và lý do đã chuẩn hóa không tạo thêm audit/quyết định. Một lệnh lưu trữ cũ thử lại sau khi dự án đã mở lại trả trạng thái hiện tại, không lưu trữ lại. Dùng khóa cũ cho nội dung hoặc người khác trả 409 `IDEMPOTENCY_CONFLICT`.

Mỗi lần thành công tăng `projects.lock_version`, cập nhật `updated_at/updated_by`, ghi `project_lifecycle_decisions` có lý do và ghi `project_audit` với `PROJECT/ARCHIVE` hoặc `PROJECT/REOPEN`. Mở lại chỉ bỏ `archived_at`; không bàn giao thiết bị, tạo lại phiên hoặc gán lại thành viên.

Các lỗi chính: 401 tài khoản không hoạt động; 403 `ADMIN_REQUIRED`; 404 dự án không tồn tại; 409 `VERSION_CONFLICT`, `PROJECT_STATE_CONFLICT`, `ARCHIVE_BLOCKED`, `IDEMPOTENCY_CONFLICT`; 422 input không hợp lệ. POST vẫn yêu cầu CSRF của phiên hiện có.

Readiness là thông tin tại thời điểm đọc. POST kiểm tra lại trong cùng transaction khóa identity hiện hành → project → dữ liệu phụ thuộc, dùng khóa chung với các writer dự án. Không có tham số bỏ qua blocker.

## Lịch sử

`GET /api/v1/admin/projects/{id}/lifecycle-decisions?page=0&size=20`

Page `{items, page, size, totalElements}`, sắp xếp quyết định mới nhất trước; size 1–100. `items` dùng các trường công khai như `latestDecision`. Không trả request key, payload hash, session hoặc thông tin xác thực.

## Migration và kiểm chứng

V21 thêm duy nhất bảng quyết định; không sửa nội dung case/Excel hay dữ liệu lịch sử. Migration demo V20 giữ ở location demo hiện có. Native integration chạy trên schema riêng ở V21 qua mode `lifecycle-integration`; mode F/Q `integration` vẫn bắt buộc V19 và không được nâng cấp ngầm.
