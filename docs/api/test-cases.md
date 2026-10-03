# API thư viện test case — Sprint 04

Contract thực thi ngày 28/09/2026, theo [ADR-004](../decisions/ADR-004-test-case-import-and-approval.md). Schema máy đọc: [test-cases.openapi.json](test-cases.openapi.json).

Prefix `/api/v1/projects/{projectId}`. Mọi API cần session; request ghi cần `X-CSRF-TOKEN`. Đọc: membership đang hoạt động. Ghi suite/case/import: PM dự án hoặc ADMIN có membership. Duyệt: **chỉ PM dự án**, kể cả khi tài khoản là ADMIN hệ thống. Không phải thành viên hoặc đã bị gỡ: 404; thành viên thiếu quyền: 403. Không có tài khoản khách hàng.

| Method / path | Input / output |
| --- | --- |
| GET `/test-suites` | Mảng nhóm đang hoạt động, có `caseCount` |
| POST `/test-suites` | `code`, `name`, `description?`, `parentId?`, `sortOrder?` → nhóm |
| PATCH `/test-suites/{id}` | Đổi tên, mô tả, nhóm cha, thứ tự; chặn cha khác dự án/chu trình |
| DELETE `/test-suites/{id}` | Lưu trữ nhóm không còn case/nhóm con hoạt động → 204 |
| GET `/test-cases` | `page=0`, `size=20` (1–100), `keyword`, `suiteId?` → `{items,totalItems,page,pageSize,totalPages}` |
| POST `/test-cases` | `caseNo`, `suiteId`, nội dung VI/JP → chi tiết case |
| GET `/test-cases/{id}` | Identity ổn định, `currentRevision`, lịch sử `revisions` |
| POST `/test-cases/{id}/revisions` | Nội dung mới + **`expectedCurrentRevisionId`** → revision mới; stale → 409 |
| GET `/test-cases/{id}/revisions/{revisionId}` | Nội dung đầy đủ của revision bất kỳ trong đúng case/dự án |
| POST `/test-cases/{id}/revisions/{revisionId}/approve` | Không body; lưu người/thời điểm duyệt một lần; gọi lại giữ nguyên |
| POST `/test-cases/{id}/archive` | Lưu trữ, bảo toàn revision → 204 |
| GET `/import-previews/template` | Binary `.xlsx`, header attachment |
| POST `/import-previews` | **multipart/form-data**, field `file` → preview; không nhận JSON/CSV |
| GET `/import-previews/{id}` | Chủ phiên nhập xem batch và lỗi theo dòng |
| POST `/import-previews/{id}/commit` | Chủ phiên nhập xác nhận toàn bộ; lỗi → rollback; gọi lại → cùng kết quả |

Nội dung: `titleVi` (bắt buộc, 255), `preconditionsVi?`, `stepsVi` (bắt buộc), `expectedVi` (bắt buộc); `titleJp?` (255), `preconditionsJp?`, `stepsJp?`, `expectedJp?`, `sourceReference?` (255). Các trường nội dung dài tối đa 8.000 ký tự UTF-16. Mã case/nhóm gồm 1–32 ký tự ASCII chữ/số/`_`/`-`, ký tự đầu là chữ hoặc số. Tên nhóm tối đa 100 ký tự.

Preview: `{id,projectId,fileName,status,totalRows,validRows,errorRows,rows}`. Mỗi dòng gồm `rowNumber` (số dòng Excel gốc), `sourceCaseKey`, `suiteCode`, `titleVi`, `valid`, `errorMessage`.
Commit trả `{id,projectId,fileName,fileChecksum,status,totalRows,validRows,errorRows,stagedExpiresAt,committedAt,createdAt}`. `fileChecksum` là SHA-256 nội dung file; mapping nội bộ v1.0. Cùng file/cùng người nhập/cùng dự án trả lại batch đã commit hoặc preview hợp lệ còn hạn. Không tự tạo nhóm hoặc ghi đè case.

422: workbook/cột/dòng lỗi; 413: file >5 MiB; 410: staging quá 24 giờ; 409: dữ liệu thay đổi, mã xuất hiện sau preview hoặc nhóm đã lưu trữ. Import tối đa 500 dòng, một sheet `TestCases`, không công thức/macro/ô gộp/liên kết ngoài. Dòng trống bỏ qua nhưng giữ số dòng Excel khi báo lỗi.

Giao dịch ghi được khóa theo dự án; nội dung revision chỉ thêm mới, approval không sửa nội dung; mutation case/revision/import ghi `project_audit` cùng transaction. Cấu hình quyền tạo tài khoản S02 độc lập hoàn toàn với role dự án.
