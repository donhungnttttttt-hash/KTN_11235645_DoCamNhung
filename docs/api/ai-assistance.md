# Trợ lý AI và bản nháp tạm

Máy đọc: [OpenAPI 3.0](ai-assistance.openapi.json). Hướng dẫn và phạm vi nghiệp vụ: [Trợ lý theo vai trò](../product/AI-ASSISTANCE.md).

Các endpoint dùng session/CSRF hiện có, base `/api/v1/projects/{projectId}/ai-drafts`. Backend luôn kiểm tra tài khoản đang hoạt động, version phiên, project và vai trò hiện hành. Admin chỉ có tác vụ Admin; không trở thành PM. Bản nháp chỉ người tạo được đọc/sửa; quyền AI không cấp thêm quyền nghiệp vụ.

| Method/path | Contract |
| --- | --- |
| GET `/metadata` | `{role, enabled, archived, retentionDays, purposes:[{code,label,target}]}`; `enabled` cho biết đã bật và có khóa, không khẳng định còn API credit |
| GET `/targets?purpose=...&q=...` | `{items:[{id,label}],hasMore}` tối đa 50; từ khóa tối đa 80 ký tự. Chỉ file/ticket hợp lệ cho tác vụ |
| POST base | `{purpose,targetId?,requestKey}`; requestKey 8–64 `[A-Za-z0-9_-]`. Trả Draft đã lưu (READY/FAILED) hoặc yêu cầu đã có (có thể GENERATING); cùng key/intent không gọi lại. Không nhận prompt tùy ý |
| GET base `?before=0` | Danh sách tối đa 50 bản nháp của chính actor còn hạn, ID giảm dần; before là ID cuối trang trước |
| GET `/{id}` | Draft còn hạn của actor với vai trò hiện hành |
| PUT `/{id}/text` | `{text,expectedVersion}`, text tối đa 12000 ký tự; chỉ READY, không thay JSON gốc từ AI |

Draft: `id,projectId,createdBy,purpose,sourceReference,promptVersion,state,model,content,failureCode,createdAt,expiresAt,editedText,version`. `content` khi READY là `{answer,sources}`. Answer gồm `title`, `summary`, `observations[]`, `suggestedActions[]`, `missingInformation[]`. Hai mảng nhận xét/hành động gồm `{text,sourceRefs[]}`; nguồn do backend cung cấp `{ref,label,path,version}`. Link là route nội bộ do server tạo, không dùng URL từ model.

GENERATION là lời gọi đồng bộ giới hạn 20 giây mặc định; transaction reserve và complete tách khỏi thời gian gọi mạng. UI dùng timeout 35 giây, giữ requestKey khi timeout; kiểm tra lại cùng yêu cầu để lấy bản đã lưu. Mỗi lần tạo mới chủ động dùng key mới. Một key đã FAILED không tự retry provider. TTL 7 ngày mặc định; hết hạn API detail trả 404, idempotency có thể trả 410 cho bản hết hạn chưa dọn. Nội dung bị xóa theo batch 500/giờ. Cleanup cũng xóa khóa idempotency đã hết thời hạn.

Yêu cầu còn GENERATING sau 2 phút được chuyển FAILED/AI_INTERRUPTED khi đọc lại. Giới hạn provider timeout là 30 giây; cơ chế này xử lý process bị dừng hoặc chết trước khi lưu. Dự án archived không được tạo/sửa, vẫn đọc bản còn hạn. Disabled không tạo reservation mới hoặc tiêu quota; bản cũ vẫn đọc được.

401 phiên không hợp lệ; 403 sai tác vụ/role; 404 sai project/owner/ID; 409 archived, request conflict hoặc version conflict; 422 input/target không hợp lệ; 429 quota nội bộ. Provider error trở thành Draft FAILED với mã `AI_QUOTA_EXHAUSTED`, `AI_RATE_LIMITED`, `AI_AUTH_FAILED`, `AI_UNAVAILABLE`, `AI_INCOMPLETE_RESPONSE`, `AI_REFUSED`, `AI_INVALID_RESPONSE`…; không trả raw provider message. Lỗi database vẫn là lỗi HTTP, không báo đã lưu.

Tác vụ: ADMIN_PROJECT_REVIEW; PM_PROGRESS_REPORT; PM_ASSIGNMENT_SUGGESTION (file group); TESTER_WORK_REPORT; TESTER_BUG_DRAFT (bug của tester); DEV_TICKET_REVIEW (BUG/QA được giao). Context là snapshot có giới hạn của dữ liệu backend; không bao gồm credentials, toàn bộ workbook hay lịch sử không liên quan. Đầu ra không tự thực hiện phân công, tạo/sửa ticket, đổi kết quả hoặc gửi thông báo. PM/Test/Dev có thể chỉnh/sao chép sang thao tác nghiệp vụ hiện có.
