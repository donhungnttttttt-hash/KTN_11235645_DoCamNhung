# Tài liệu test từ Excel

Ngày 03/10/2026. Mở rộng S04 trong S11 theo [thiết kế đã duyệt](../superpowers/specs/2026-10-03-test-documents-design.md). Code đã triển khai; bằng chứng và gate database tại [báo cáo](../reviews/2026-10-03-test-documents.md).

## Luồng nhập

`POST /api/v1/projects/{projectId}/import-previews` nhận multipart `file`; `POST /import-previews/{id}/commit` xác nhận. Giữ session/CSRF và quyền PM hoặc ADMIN **là thành viên dự án**. TESTER chỉ đọc tài liệu đã nhập. Preview riêng người tải; ngoại lệ bản CUSTOMER_V1 đã COMMITTED cho phép người có quyền nhập cùng dự án mở lại.

Preview thêm `format` (`CUSTOMER_V1` hoặc `INTERNAL_V1`) và `sheetName` cạnh metadata/rows hiện có. Khi commit, ID trả về là ID tài liệu cần mở; có thể khác ID preview nếu một người khác vừa nhập cùng checksum. Client phải dùng ID trả về. Bản PREVIEW hết hạn sau 24 giờ; COMMITTED là tài liệu bền vững.

Mẫu khách nhận diện theo tiêu đề, không phụ thuộc vị trí cột. Bắt buộc `ID`, `Đối tượng test`, `Các bước test`, `Kết quả mong đợi`. Chuẩn hóa dấu, hoa/thường, khoảng trắng và ký hiệu; chấp nhận `Điều kiện tiên quyết`/`Điều kiện tiền đề`, `Hạng mục xác nhận`/`Mục xác nhận`. Hai cột trùng nghĩa bị từ chối để tránh lấy nhầm dữ liệu. Cột `No` và các cột không nhận diện vẫn lưu nguyên nguồn, không đưa vào thống kê kết quả. Ô đối tượng test trống kế thừa đối tượng của dòng dữ liệu trước; nếu chưa có đối tượng trước đó thì validation vẫn báo thiếu. Ô nguồn và export giữ trống đến khi revision thực sự thay đổi tiêu đề.

Giới hạn: một sheet, tiêu đề ở hàng đầu, ≤500 dòng, ≤64 cột dữ liệu, ≤5 MiB; không công thức/macro/ô gộp/external workbook links. Hyperlink chỉ HTTP/HTTPS/mailto hoặc nội bộ sheet. Kết quả cũ không tạo execution, NA, bug hoặc tài khoản. Mỗi file tạo nhóm `XLSX-{batchId}`, case `XLSX-{batchId}-{rowNumber}`; ID nguồn giữ riêng. Cùng checksum khách trong cùng dự án không tạo trùng. Mẫu nội bộ TestCases tiếp tục yêu cầu mã nhóm đã có và mã case chưa tồn tại. Mẫu tải xuống mới dùng tiêu đề khách với cột No; tên file `test-cases-template.xlsx`.

## Đọc và xuất

Mọi endpoint dưới đây yêu cầu session và membership dự án. Không trả preview chưa commit, không trả dữ liệu dự án khác. Tham số `id` là ID import batch, không phải cycle ID.

| Method / path (sau `/api/v1/projects/{projectId}`) | Kết quả |
| --- | --- |
| GET `/test-documents?page=0&size=20&keyword=` | `{items,totalItems,page,pageSize,totalPages}`; page 0–100000, size 1–100, keyword ≤255 ký tự, tìm tên file dạng literal |
| GET `/test-documents/{id}` | `{document,headers,rows,columns}`; tối đa 500 dòng nguồn |
| GET `/test-documents/{id}/export?original=false` | XLSX theo phiên bản hiện tại |
| GET `/test-documents/{id}/export?original=true` | Nguyên bytes nguồn; 404 nếu bản nhập cũ không lưu binary |

Summary gồm `id, projectId, fileName, sheetName, format, totalRows, caseCount, createdAt, updatedAt, updatedBy, hasSourceFile, sourceCounts`. List dùng SQL projection, không tải BLOB. `sourceCounts` đếm cột có tiêu đề iPad khi nhập, các khóa `OK, Fixed, NG, Pending, NA, -, OTHER`; cột không tiêu đề không được tính. Dữ liệu import cũ thiếu mapping dùng vị trí I như trước. Đây **không phải tiến độ TMS**. `updatedAt/updatedBy` dùng phiên bản case mới nhất sau commit hoặc actor/thời điểm commit.

Row gồm `rowNumber, sourceId, caseId, caseNo, revisionId, approved, archived, cells, sourceCells`. `cells` có cùng chiều rộng với `headers` (khách 14–64, tối thiểu 14 để tương thích tài liệu cũ; nội bộ 11); `sourceCells` là dữ liệu ban đầu. `columns` ánh xạ tên trường sang chỉ số cột bắt đầu từ 0: sourceId, titleVi, preconditionsVi, stepsVi, viewpoint, confirmation, expectedVi, designNote, result, executionNote, sourceReference, tester. Các trường tùy chọn không có tiêu đề sẽ không có khóa. Mapping cũng được lưu trong JSON import row (`sourceColumns`), không cần migration mới. Các trường nội dung case được cập nhật theo revision tại đúng cột đã nhận diện; các cột bổ sung chỉ đọc. `headers` giữ tiêu đề nguồn kể cả cột rỗng; nhãn thay thế trên UI không sửa workbook.

Export giữ sheet/style/kích thước/hyperlink của ô không đổi; chỉ cập nhật ô mapped có nội dung mới, gỡ hyperlink cũ của ô đổi và ghi kiểu chuỗi kể cả bắt đầu bằng `=`. Bản import cũ không lưu file gốc được dựng lại thành mẫu TestCases từ import rows + revision hiện tại. Response dùng UTF-8 Content-Disposition và `Cache-Control: private, no-store`.

Lỗi theo contract chung: 401 chưa đăng nhập; 403 không được nhập; 404 không tìm thấy hoặc ngoài dự án; 409 dữ liệu tài liệu không hợp lệ/commit xung đột; 422 workbook hoặc bộ lọc sai. Không đưa nội dung nguồn hay credential vào thông báo lỗi.
