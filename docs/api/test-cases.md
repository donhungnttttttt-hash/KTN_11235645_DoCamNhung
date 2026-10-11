# API thư viện test case — Sprint 04

Contract thực thi ngày 28/09/2026, theo [ADR-004](../decisions/ADR-004-test-case-import-and-approval.md). Schema máy đọc: [test-cases.openapi.json](test-cases.openapi.json).

Prefix `/api/v1/projects/{projectId}`. Mọi API cần session; request ghi cần `X-CSRF-TOKEN`. Đọc: membership đang hoạt động hoặc ADMIN. **Cập nhật 10/10/2026: ADMIN toàn hệ thống được tạo/sửa/duyệt case, phân công và nhập Excel không cần membership**, theo quyết định Admin toàn quyền. PM giữ quyền trong dự án mình quản lý. Dự án lưu trữ chặn ghi (409). Ngoài phạm vi dự án: 404; thành viên thiếu quyền: 403. Preview chưa commit vẫn riêng cho người tạo. Không có tài khoản khách hàng.

Giao diện cho chọn tối đa 20 file một lượt, mỗi file .xlsx tối đa 5 MiB. Client gọi API hiện có tuần tự cho từng file; preview không tự commit. Xác nhận nhập các file hợp lệ, hiển thị lỗi/thành công riêng; không rollback file khác đã nhập, không tự gửi lại file thành công. Có thể thay file lỗi và thử lại. Idempotency theo checksum/commit tiếp tục áp dụng như cũ; không thêm endpoint batch hoặc tăng kích thước multipart.

Revision/RevisionSummary bổ sung `createdByUserId` (identity ID, nullable cho dữ liệu cũ). `createdBy` giữ nghĩa membership ID, nay nullable cho Admin import không có membership. V26 giữ nguyên trường lịch sử và yêu cầu ít nhất một nguồn định danh người tạo. Nhật ký import dùng identity thực.

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

422: workbook/cột/dòng lỗi; 413: file >5 MiB; 410: staging quá 24 giờ; 409: dữ liệu thay đổi, mã xuất hiện sau preview hoặc nhóm đã lưu trữ. Với mẫu nội bộ, import tối đa 500 dòng, một sheet `TestCases`, không công thức/macro/ô gộp/liên kết ngoài. Dòng trống bỏ qua nhưng giữ số dòng Excel khi báo lỗi.

Giao dịch ghi được khóa theo dự án; nội dung revision chỉ thêm mới, approval không sửa nội dung; mutation case/revision/import ghi `project_audit` cùng transaction. Cấu hình quyền tạo tài khoản S02 độc lập hoàn toàn với role dự án.

Mẫu khách hàng và quy tắc ô gộp theo [contract tài liệu test](test-documents.md). HTTP transport trả 400 khi thiếu file/part, 405 khi sai method (kèm Allow), 415 khi media type không được hỗ trợ; không biến các lỗi này thành 500.
# Cập nhật bảng tài liệu ngày 10/10/2026

- `PUT /api/v1/projects/{projectId}/test-documents/{id}/rows/{rowId}/cells/{column}`: `value`, `expectedVersion`, `expectedRevisionId`. PM hoặc ADMIN có membership được sửa; mã định danh/kết quả dùng thao tác riêng. Nội dung chuẩn của case tạo revision chưa duyệt, các ô bổ sung dùng overlay có phiên bản. `GET .../cells/{column}/history` trả 50 thay đổi gần nhất. Giữ nguyên workbook nguồn.
- `PUT .../rows/{rowId}/second-test`: PM chọn `cycleId`, `configurationId`, `assigneeMembershipId`, `note`, `expectedRevisionId`, `expectedCycleVersion`, `expectedVersion=0`. Case phải được duyệt, đợt phải DRAFT, người nhận phải là Tester đang hoạt động. Tạo run thật và khóa ngoại tới đúng case/dòng tài liệu/dự án. Cập nhật phân công dùng thêm `expectedRunVersion`; không đổi đợt/cấu hình đã gắn.
- `GET` chi tiết tài liệu bổ sung `cellVersions` và `secondTests` (người nhận, run/cycle/configuration, phiên bản, ghi chú, kết quả mới nhất). Sau khi PM bắt đầu đợt, Tester được giao ghi kết quả qua API execution hiện có. Từ yêu cầu 11/10/2026, lần thực thi mới nhất của case cập nhật kết quả tài liệu một chiều; sửa trực tiếp tài liệu không đổi run. `secondTests.resultCode` vẫn là kết quả riêng của lượt được giao. Workbook nguồn luôn giữ nguyên.
- Export cập nhật gồm nội dung đã sửa; nếu có phân công lần 2, thêm tên Tester, ghi chú, đợt và kết quả vào cuối sheet. Download `original=true` giữ byte nguồn. Các cột nguồn có nội dung luôn được giữ.

## Duyệt nhiều case trong file (11/10/2026)

`POST /projects/{projectId}/test-documents/{id}/approvals` nhận `{rows:[{rowId,expectedRevisionId}]}` từ 1–500 dòng. ADMIN/current PM, session và CSRF bắt buộc. Validate toàn bộ cùng document/project, revision hiện hành, chưa lưu trữ và không trùng trước khi duyệt trong một transaction. Trả `{approvedCount}`; stale trả VERSION_CONFLICT, dòng khác file trả NOT_FOUND. Duyệt lại revision đã duyệt không tạo approval trùng. Không tự giao việc hoặc đổi trạng thái đợt.
