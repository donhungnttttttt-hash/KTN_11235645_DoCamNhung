# API thực thi kiểm thử — S05

Base `/api/v1/projects/{projectId}`, session + CSRF giống S02. Đọc/ghi cho ADMIN toàn hệ thống hoặc membership active theo quyền tương ứng. ADMIN được quản lý đợt, phân công, ghi kết quả thay người được giao; vẫn cần đúng trạng thái, version, scope và context. Lịch sử lưu Admin thực hiện, không đổi assignee. Ngoài dự án nhận 404, thiếu quyền 403; sai body 422, xung đột version hoặc request key 409. ID domain là số nguyên như API hiện có; không sử dụng số vượt giới hạn an toàn JavaScript.

| Method/path | Input / kết quả | Quyền |
| --- | --- | --- |
| GET /test-cycles?page=0&size=20 | Page cycle | Thành viên |
| POST /test-cycles | code (ASCII 1–32), name (1–100), milestoneId tùy chọn → cycle | PM dự án hoặc ADMIN toàn hệ thống |
| GET /test-cycles/{id} | Cycle: id/code/name/statusCode/version/milestoneId/activatedAt/runCount | Thành viên |
| GET /test-cycles/{id}/configurations | Danh sách id/environmentId/deviceId/buildId và tên | Thành viên |
| POST /test-cycles/{id}/configurations | environmentId, deviceId, buildId, expectedVersion → cycle mới | Quản lý; DRAFT |
| POST /test-cycles/{id}/scope | configurationId, revisionIds (1–100), assigneeMembershipId, expectedVersion → cycle mới | Quản lý; DRAFT; atomic |
| POST /test-cycles/{id}/activate | expectedVersion → cycle; gọi lại ACTIVE trả cùng cycle | Quản lý |
| GET /test-cycles/{id}/run-items?page=0&size=50&mine=false&pendingBug=false | Page run item | Thành viên |
| GET /run-items/{id} | Nội dung VI của revision pinned, cấu hình, người được gán, version, latestAttemptId/resultCode | Thành viên |
| PUT /run-items/{id}/assignment | assigneeMembershipId, reason (1–500), expectedVersion → run item mới | Quản lý |
| GET /run-items/{id}/assignments | Lịch sử gán trước/sau, actor, lý do và thời điểm | Thành viên |
| GET /run-items/{id}/attempts?page=0&size=20 | Page attempt mới nhất trước | Thành viên |
| POST /run-items/{id}/attempts | resultCode (OK/NG/P), buildId, actualResult (≤8000), reason (≤1000), evidenceReference (≤1000), requestKey (ASCII 8–64), expectedVersion → attempt đã lưu | Người được phân công hoặc ADMIN, cycle ACTIVE |

Page: `{items,totalItems,page,pageSize,totalPages}`; page ≥0, size 1–100. Run item chứa caseNo/titleVi/preconditionsVi/stepsVi/expectedVi/revisionNo/revisionId, assigneeMembershipId/assigneeName/assigneeUserId, environmentName/deviceName/defaultBuildId. UI lấy phiên bản mới từ server trước mỗi lần chạy kế tiếp.

Attempt chứa id/runItemId/attemptNo/resultCode/buildId/executorMembershipId/executorName/executedAt/actualResult/reason/evidenceReference/contextSnapshot. Snapshot JSON bất biến lưu build/environment/device/executor/revisionId tại thời điểm ghi; actor và thời gian lấy từ server. Không có PATCH/DELETE attempt. Sửa nhầm bằng attempt mới, ghi lý do để đối chiếu lịch sử.

`activatedAt`, `assignedAt`, `executedAt` trả ISO-8601 có UTC offset `Z`, ví dụ `2026-09-29T02:33:14.123456Z`; giá trị chưa có là null. DATETIME trong MySQL lưu UTC và được đổi thành Instant khi tạo projection API. Client định dạng theo timezone dự án, không hiểu chuỗi giờ không offset theo múi giờ trình duyệt.

Request key được giữ khi retry sau lỗi mạng. Cùng project/key/actor/run/nội dung trả attempt cũ, kể cả expectedVersion cũ; khác nội dung trả IDEMPOTENCY_CONFLICT. Khi 409 do stale version, UI giữ bản nháp, tải lại bản hiện hành và yêu cầu người dùng bấm lưu lại sau đối chiếu. Không tự replay một kết quả cũ với version mới.

Từ yêu cầu 11/10/2026, mỗi attempt mới đồng thời cập nhật kết quả tài liệu của các dòng import đã commit thuộc đúng dự án/case. Lần ghi thực thi mới nhất thắng, kể cả khác đợt/cấu hình; tăng `result_version` và lưu lịch sử thay đổi tài liệu cùng transaction. Replay request cũ không cập nhật lại tài liệu. Sửa trực tiếp kết quả tài liệu không ghi attempt hoặc sửa kết quả run. Workbook/ô nguồn giữ nguyên; không backfill dữ liệu cũ. Xem [quy tắc đồng bộ](../planning/2026-10-11-execution-document-results.md).

NG yêu cầu actualResult; P yêu cầu reason. NOT_RUN là chưa có attempt. Fix không phải verdict. NA và chốt/mở lại đợt đã triển khai ở S08 theo ADR-008; xem [API báo cáo và quyết định phạm vi](reporting.md). `pendingBug` là các run có kết quả mới nhất NG chưa liên kết bug; attempt NG cũ vẫn còn lịch sử. `evidenceReference` của execution là tham chiếu dạng văn bản; upload chứng cứ của ticket thuộc [API công việc](work-items.md).

Giới hạn kỹ thuật S05: tối đa 50 cấu hình và 500 run items/cycle. Scope và cấu hình không đổi sau activate; thêm phạm vi bằng cycle mới. Mọi FK cùng project, revision thuộc đúng case, latest attempt thuộc đúng run; phân công lại không đổi executor lịch sử.
