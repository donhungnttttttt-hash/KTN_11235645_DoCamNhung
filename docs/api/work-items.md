# API công việc — S06

Contract máy đọc: [work-items.openapi.json](work-items.openapi.json), được tham chiếu từ [openapi.yaml](openapi.yaml). Policy: [defect-lifecycle](../business/defect-lifecycle.md), [ADR-006](../decisions/ADR-006-internal-work-items.md).

Base: `/api/v1/projects/{projectId}/work-items`. Cookie session cùng origin; mọi mutation cần CSRF từ `/api/v1/auth/csrf`. Actor lấy từ session. Global ADMIN không tự có quyền project PM. 404 khi ngoài dự án, 403 khi thiếu quyền thao tác, 409 khi version/request key xung đột, 422 khi rule không hợp lệ. Tất cả datetime trả UTC ISO với `Z`.

| Method/path từ base | Nội dung / kết quả |
| --- | --- |
| GET `/` | `items,totalItems,page,size,totalPages`; page từ 0, size 1–100. Filter type/status/keyword/assignee/category/milestone; mã và tiêu đề tìm Unicode |
| GET `/metadata` | 10 status/color/terminal, 4 type, membershipId, canTriage, policyVersion |
| GET `/overview` | 30 công việc tạo gần đây; counts trạng thái/milestone trên toàn dự án, không tính từ trang danh sách |
| GET `/sources/{attemptId}` | Ngữ cảnh có cấu trúc của một NG cùng dự án để tạo bug |
| POST `/` | Tạo; 201 WorkItem; type/title/requestKey, thêm các trường bắt buộc của BUG. Mã server sinh, trạng thái open. Retry cùng payload/actor trả cùng ID |
| GET `/{id}` | Chi tiết cùng canonical ID, allowedTransitions, execution links, externalReferences, clarifications |
| PUT `/{id}` | PM sửa nội dung/phân loại/phân công; reason + expectedVersion. Không ghi status qua endpoint này |
| POST `/{id}/transitions` | PM; status/reason/expectedVersion; resolved BUG cần fixedBuildId. Ba trạng thái kết thúc bị khóa |
| POST `/batch-transitions` | PM; items{id,expectedVersion}, status/reason/fixedBuildId; tối đa100, không trùng ID, rollback toàn bộ nếu có lỗi |
| POST `/{id}/execution-links` | attemptId NG + expectedVersion. Cặp trùng trả hiện trạng, không tạo link/history trùng |
| GET `/{id}/history?before=0` | 50 event mới nhất; dùng ID cuối làm before để lấy cũ hơn |
| GET `/{id}/comments?before=0` | 50 comment mới nhất, cùng cách phân trang history |
| POST `/{id}/comments` | body, visibility=INTERNAL, requestKey; 201{id}; retry cùng nội dung/actor không trùng |
| PUT `/{id}/external-reference` | PM; provider/externalId/url/expectedVersion; luôn UNRECONCILED, không thực hiện HTTP ngoài |
| POST `/{id}/clarifications` | PM; sourceKind/sourceReference/confirmedBy/confirmedAt/conclusion/expectedVersion. Không cho thời điểm xác nhận tương lai |
| GET `/{id}/attachments` | Metadata các tệp thuộc công việc |
| POST `/{id}/attachments` | Multipart field file, tối đa20MiB; 201 metadata sau khi lưu. Cùng người/file hash/tên/công việc được deduplicate |
| GET `/{id}/attachments/{attachmentId}/content` | Tải đúng owner/project; attachment + nosniff + no-store + sandbox |
| DELETE `/{id}/attachments/{attachmentId}` | Người tải hoặc PM; 204; metadata commit trước xóa blob, orphan được dọn khi restart |

`WorkItem.id` là BIGINT server; `key` là mã hiển thị `${projectCode}-${counter}`. UI không cấp số và không ghép hai mock store. Domain BUG giữ `policyVersion=INTERNAL_V1`; đây không phải rule khách hàng đã nghiệm thu. Comment/nội dung đều render text đã escape, không thực thi HTML.

Chứng cứ không nhận raw filesystem path, không công bố storage key. File API có 413/422 cho cap/type, 503 STORAGE_UNAVAILABLE khi I/O thất bại. Multipart toàn app 20MiB; Excel vẫn bị giới hạn5MiB tại parser riêng. Tệp ảnh có giới hạn xử lý40MP và mỗi công việc tối đa100tệp để bảo vệ tài nguyên.

Lưu ý vận hành: backup cả MySQL và `TMS_ATTACHMENT_ROOT`; kiểm tra DB/Flyway qua terminal. Bộ kiểm tra nội dung không thay antivirus. S07 chịu trách nhiệm retest/closure, S09 mới có provider/outbox và đối soát thực tế.

Review 30/09/2026: metadata bổ sung `titlePrefix` cho form tạo bug; chi tiết trả `ruleVersionId` nullable để truy vết bản INTERNAL_DEMO tại thời điểm tạo. Không thay `policyVersion=INTERNAL_V1`; chỉnh bug cũ dùng đúng snapshot đã lưu. Xem [contract settings](project-settings.md).

## Nội dung history UPDATE từ 03/10/2026

Event/actor/time/reason và phân trang giữ nguyên. Payload lưu trong `details_json` của event UPDATE mới có `formatVersion: 2`, `before` và `after`:

- Hai phía giữ title, description, priority, categoryId, milestoneId, assigneeMembershipId; các ID nullable được giữ nguyên NULL.
- `before.version` và `after.expectedVersion` là version trước thao tác (dùng kiểm tra concurrency), không phải version sau bump.
- Chỉ BUG có thêm steps, expectedResult, actualResult. `after` dùng giá trị text đã chuẩn hóa giống SQL ghi thật; không ghi trường BUG bị bỏ qua khi cập nhật TASK/REQUEST/IMPROVEMENT.
- Không sao chép links, externalReferences, clarifications, contextSnapshot, allowedTransitions hoặc field hiển thị mới vào mỗi event. Các dữ liệu đó có bản ghi/luồng history riêng; reason đã nằm ở event.

Payload cũ không có formatVersion vẫn được trả nguyên trạng; không backfill hoặc xóa lịch sử cũ. Những loại event khác (TRANSITION, CLARIFICATION, RETEST...) giữ định dạng hiện có. Đây là định dạng nội dung audit có version, không đổi input PUT hay nội dung WorkItem trả về.
