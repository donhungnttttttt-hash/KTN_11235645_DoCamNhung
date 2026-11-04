# Lưu trữ và mở lại dự án

Chỉ tài khoản ADMIN đang hoạt động thuộc registry hai Admin tổng được quyết định. Lưu trữ chuyển dự án sang chỉ đọc, không xóa hoặc tự hoàn thành công việc. PM/USER/Khách còn quyền xem vẫn đọc lịch sử và xuất dữ liệu trong phạm vi được phép. Contract hiện hành gồm ngoại lệ luồng cũ AR-06, migration V40; không khôi phục API execution/retest/QA answer đã nghỉ.

## Kiểm tra trước khi lưu trữ

`GET /api/v1/admin/projects/{id}/archive-readiness`

Trả `projectId`, `projectCode`, `projectName`, `version`, `archived`, `archivedAt`, `canArchive`, `canArchiveWithLegacyException`, `legacyExceptionFingerprint`, `canReopen`, `asOf`, `blockers`, `warnings`, `latestDecision`.

Blocker `{code,label,count,exceptionEligible}` chỉ xuất hiện khi count > 0:

| Code | Điều kiện | Ngoại lệ |
| --- | --- | --- |
| `ACTIVE_SESSIONS` | Phiên file `DOING` hoặc `PAUSED` | Không; giữ nghĩa vụ đối soát luồng cũ, không bật lại mutation đã nghỉ |
| `ALLOCATED_DEVICES` | Thiết bị chưa thu hồi | Không; Admin thu hồi theo luồng hiện hành |
| `OPEN_WORK_ITEMS` | `ticket_workflow_metrics.finalized = FALSE`, gồm Ticket chưa kết thúc, CLOSED/PROCESSED chờ xác minh và ordinary work cũ | Không; Ticket xử lý theo trách nhiệm hiện hành, ordinary work cũ cần quyết định riêng |
| `UNFINISHED_CYCLES` | Cycle ACTIVE hoặc DRAFT có run | Có, chỉ khi Admin xác nhận snapshot |
| `OPEN_RETESTS` | Retest OPEN, kể cả bug đã kết thúc | Có, chỉ khi Admin xác nhận snapshot |
| `PENDING_PUBLICATIONS` | Redmine QUEUED/RETRY_WAIT/RUNNING | Không; đối soát tác vụ ngoài hệ thống |

`canArchive` chỉ true khi active và không blocker. `canArchiveWithLegacyException` chỉ true khi active, có ít nhất một legacy blocker và không hard blocker. Fingerprint trả khi có legacy blocker, kể cả lúc hard blocker khiến ngoại lệ chưa dùng được. Draft rỗng được giữ nguyên; server không gán hoàn thành.

`warnings` là cảnh báo không chặn PUBLICATION_REVIEW khi publication mới nhất mỗi binding là FAILED/CONFLICT/UNCERTAIN; không đếm thất bại đã có lượt mới hơn. Mở lại không tự gửi lại Redmine. Cảnh báo milestone trên tổng quan chỉ tính project active; chi tiết vẫn giữ lịch sử cùng `projectArchived`/`projectArchivedAt`.

Ticket đã xóa mềm hoặc nằm trong Feature/file ẩn vẫn chặn. AR-06 không coi xóa/ẩn là hoàn tất nghĩa vụ và không mở rộng ngoại lệ ra Ticket. Feature có endpoint restore; việc phục hồi Bug Monkey đã xóa/file đã ẩn và chính sách xử lý được theo dõi riêng tại U26.

## Quyết định có phiên bản và chống gửi trùng

- `POST /api/v1/admin/projects/{id}/archive`
- `POST /api/v1/admin/projects/{id}/reopen`

Body thường `{expectedVersion,reason,requestKey}`: version >= 0, reason trim dài 1–2000, key khớp `[A-Za-z0-9_-]{8,100}`. Archive có thể thêm `legacyException: {acknowledged:true,snapshotFingerprint:"<64 lowercase hex>"}`. Bỏ trường/null là lệnh thường; object thiếu/sai hoặc gửi object vào reopen trả 422 INVALID_COMMAND. Service cũng validate direct calls. Không nhận IDs/counts/policy do client cung cấp.

Snapshot policy1 dựng server-side bằng locking reads, chứa projectId/projectVersion, cycle `{id,status,version,runIds}` và retest `{id,status,version}`. Sort ID tăng dần, runIds distinct/sort. SHA-256 trên canonical JSON UTF-8 không chứa chính fingerprint, label, asOf hoặc counts. Thứ tự trường cố định được ghi tại [contract FixReports](fixreports-contract.md) và test `LegacyArchiveSnapshotTest`. Snapshot persisted thêm fingerprint và blocker counts; không đổi child.

Digest thường giữ đúng `checksum(List.of(action,expectedVersion,trimmedReason))`; ngoại lệ dùng `checksum(List.of("PROJECT_LIFECYCLE_LEGACY_EXCEPTION_V1",action,expectedVersion,trimmedReason,true,snapshotFingerprint))`. Không fallback sang hash thường. Client giữ key khi retry cùng thao tác; key mới khi sửa payload.

Thứ tự quyết định: current identity/registry lock → project lock → validate → replay actor/hash → version/state → snapshot và mọi blocker → fingerprint/eligibility → project/decision/audit trong một transaction. Retry thành công trả readiness hiện tại HTTP200, không thêm decision/audit và không archive lại sau reopen, kể cả snapshot hiện tại đã đổi. Mở lại chỉ bỏ archived_at, tăng version; không tạo lại phiên, allocation hoặc membership.

Lỗi: 401 identity/registry không hợp lệ; 403 ADMIN_REQUIRED; 404 project không tồn tại; 409 VERSION_CONFLICT, PROJECT_STATE_CONFLICT, IDEMPOTENCY_CONFLICT, LEGACY_BLOCKERS_CHANGED hoặc ARCHIVE_BLOCKED; 422 INVALID_COMMAND. POST vẫn cần CSRF. Preview không phải bảo đảm submit; server đọc lại dưới khóa.

## Lịch sử

`GET /api/v1/admin/projects/{id}/lifecycle-decisions?page=0&size=20`

Page `{items,page,size,totalElements}`, mới nhất trước, size1–100. Mỗi decision và latestDecision gồm `{id,action,reason,actorName,decidedAt,resultVersion,legacyException}`; latestDecision null khi chưa có quyết định. `legacyException` null cho row cũ/lệnh thường/reopen; ngoại lệ trả `{policyVersion,fingerprint,blockers:[{code,count}]}`. Actor/reason/time là thẩm quyền lịch sử. Không trả requestKey, payload hash, session hoặc credential.

## Migration và kiểm chứng

V21 tạo bảng quyết định; V40 chỉ thêm `legacy_exception_snapshot JSON NULL`, giữ bytes V1–V39. Release core không cần demo V34. Matrix gồm fresh core/core+demo, upgrade coreV33/demoV34, core/core+demoV39 lên V40. Migration test có guard/manifest riêng và không chạy trong integration runner. Native current suites dùng schema V40 đã provision và receipt mới; integration runner không migrate/clean/repair/reset. Historical V21 migration test giữ riêng; current service không fallback khi thiếu cột mới.
