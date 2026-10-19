# Tài liệu test từ Excel

## FixReports — Feature/file độc lập ngày 19/10/2026

Đây là contract source mới, ưu tiên so với mô tả import/run/Fixed/duyệt/lần2 bên dưới. [Contract chung](fixreports-contract.md), [quyền](../business/permissions.md), [metrics](../business/metrics.md). Chưa đồng nghĩa migration/repair đã áp dụng vào main DB hay UAT đạt.

Prefix `P=/api/v1/projects/{projectId}`. Actor từ session; ghi cần CSRF, scope cùng dự án và phiên bản. Member đọc, PM dự án/ADMIN quản lý Feature/import/nội dung; ADMIN không cần membership. Môi trường/server của Feature là text tự do, không bắt buộc catalog build/device/cycle.

| Method/path sau P | Input/kết quả |
| --- | --- |
| GET/POST `/features`; GET/PUT `/features/{f}` | Create `{name,environment,description,requestKey:UUID}`; update thêm expectedVersion, không requestKey; list page/size/keyword/archived với items/totalItems/page/size/totalPages |
| POST `/features/{f}/archive` hoặc `/restore` | `{expectedVersion,requestKey:UUID}`; giữ dữ liệu, không hard delete |
| GET `/features/{f}/documents` | page/size/keyword; fileName/sheetName, caseCount/testedCaseCount/progressPercent, assignees |
| POST `/features/{f}/import-previews`; GET `/features/{f}/import-previews/{id}`; POST `/features/{f}/import-previews/{id}/commit` | Multipart file và preview/commit hiện có trong đúng Feature; commit dùng ID response, không đoán từ tên/checksum |
| POST `/features/{f}/documents/{d}/archive` | `{expectedVersion,requestKey:UUID}`; ẩn file khỏi danh sách hoạt động, giữ case/Issue/workbook/lịch sử cần giữ |
| GET `/test-documents/{d}`; GET `/test-documents/{d}/export?original=false` hoặc `original=true` | Chi tiết và XLSX của đúng bản Feature-owned; original=true giữ bytes nguồn |
| PUT `/test-documents/{d}/rows/{r}/cells/{column}` | Sửa nội dung/overlay theo quyền PM/ADMIN, expectedVersion và expectedRevisionId; không ghi raw workbook |
| PUT `/test-documents/{d}/rows/{r}/result` | `{status,expectedVersion,requestKey:UUID}`; chỉ UNEXECUTED/OK/NG/P/NA; result-history GET giữ actor/time/version |
| GET/PUT `/test-documents/{d}/assignments` | PUT `{expectedVersion,requestKey:UUID,changes:[{assigneeMembershipId,rowIds:[]}]}`; một transaction; dùng rowId thật, range UI phải resolve ra các row của file |
| GET `/test-documents/{d}/assignment-history?before=0` | Lịch sử phân công, actor và first/latest tester; không thêm cột người test thứ3 |

Cùng file Excel được import ở Feature A/B thành các bản case/revision/row/edits **độc lập**. Không lấy ID nguồn hiển thị hay tên file làm identity liên Feature. PM/ADMIN quản lý phạm vi; Tester tự nhận/sửa phần mình nhưng overlap hoặc version cũ phải bị chặn, không ghi đè người khác. Ghi Status cần trách nhiệm hiện hành hoặc PM/ADMIN; DEV chỉ đọc. Đổi người được giao không reset Status. tested=OK+NG+P+NA; total gồm NA; file rỗng0/0 hiển thị chưa có case.

Không cần duyệt case/chạy đợt/run/session/build/máy trước ghi của luồng mới; không tự tạo execution/retest. Import/đọc/export vẫn giữ giới hạn parser, bytes nguồn và overlay an toàn đã có. [Public legacy writes](file-work.md#fixreports--ngừng-ghi-luồng-cũ-ngày-19102026) trả410; không gọi endpoint import thiếu Feature để lách đường mới. Migration/repair được owner theo dõi riêng, chưa gán số phiên bản hoặc xác nhận runtime tại đây.

### Bổ sung 19/10/2026 — R02/R03/R08: export và import lại

Với file thuộc Feature, current export dùng revision/overlay/Status hiện hành, thay cột kết quả bằng `Status`, tái sử dụng hoặc thêm đúng hai cột `Người test đầu tiên` và `Người test lại gần nhất`. Các tên này phản ánh lịch sử phân công, không thay actor ghi Status. Export lặp không nối thêm các cột trùng. `original=true` luôn trả nguyên bytes đã nhập của chính bản file đó.

Parser nhận current export mẫu khách theo alias tiêu đề đã hỗ trợ; mẫu nội bộ nhận đúng11 cột gốc hoặc14 cột gồm11 cột gốc + ba tiêu đề export trên theo đúng thứ tự. Không mở parser cho cột tùy ý. Import current export vào Feature khác tạo bản case độc lập với Status `UNEXECUTED`, phân công/lịch sử mới trống; dữ liệu tester/Status nguồn không tự trở thành actor audit, kinh nghiệm AI hay phân công mới. Bản nguồn và bytes workbook nguồn vẫn được giữ. [Quyền và metrics chung](fixreports-contract.md).

## Lịch sử trước FixReports

Các format/parser/export và bằng chứng lịch sử dưới đây được giữ; điều kiện run/cycle, Fixed, đồng bộ attempt và quota theo đợt không còn là contract cho bản Feature mới.

Ngày 03/10/2026. Mở rộng S04 trong S11 theo [thiết kế đã duyệt](../superpowers/specs/2026-10-03-test-documents-design.md). Code đã triển khai; bằng chứng và gate database tại [báo cáo](../reviews/2026-10-03-test-documents.md).

## Luồng nhập

`POST /api/v1/projects/{projectId}/import-previews` nhận multipart `file`; `POST /import-previews/{id}/commit` xác nhận. Giữ session/CSRF và quyền PM hoặc ADMIN **là thành viên dự án**. TESTER được đọc và sửa kết quả tài liệu đã nhập theo bổ sung V13 bên dưới, không được import hoặc duyệt revision. Preview riêng người tải; ngoại lệ bản CUSTOMER_V1 đã COMMITTED cho phép người có quyền nhập cùng dự án mở lại.

Preview thêm `format` (`CUSTOMER_V1` hoặc `INTERNAL_V1`) và `sheetName` cạnh metadata/rows hiện có. Khi commit, ID trả về là ID tài liệu cần mở; có thể khác ID preview nếu một người khác vừa nhập cùng checksum. Client phải dùng ID trả về. Bản PREVIEW hết hạn sau 24 giờ; COMMITTED là tài liệu bền vững.

Mẫu khách nhận diện theo tiêu đề, không phụ thuộc vị trí cột. Bắt buộc `ID`, `Đối tượng test`, `Các bước test`, `Kết quả mong đợi`. Chuẩn hóa dấu, hoa/thường, khoảng trắng và ký hiệu; chấp nhận `Điều kiện tiên quyết`/`Điều kiện tiền đề`, `Hạng mục xác nhận`/`Mục xác nhận`. Hai cột trùng nghĩa bị từ chối để tránh lấy nhầm dữ liệu. Cột `No` và các cột không nhận diện vẫn lưu nguyên nguồn, không đưa vào thống kê kết quả. Ô đối tượng test trống kế thừa đối tượng của dòng dữ liệu trước; nếu chưa có đối tượng trước đó thì validation vẫn báo thiếu. Ô nguồn và export giữ trống đến khi revision thực sự thay đổi tiêu đề.

Giới hạn: một sheet, tiêu đề ở hàng đầu, ≤500 dòng, ≤64 cột dữ liệu, ≤5 MiB; không công thức/macro/external workbook links. Hyperlink chỉ HTTP/HTTPS/mailto hoặc nội bộ sheet. Kết quả cũ không tạo execution, NA, bug hoặc tài khoản. Mỗi file tạo nhóm `XLSX-{batchId}`, case `XLSX-{batchId}-{rowNumber}`; ID nguồn giữ riêng. Cùng checksum khách trong cùng dự án không tạo trùng. Mẫu nội bộ TestCases tiếp tục yêu cầu mã nhóm đã có và mã case chưa tồn tại. Mẫu tải xuống mới dùng tiêu đề khách với cột No; tên file `test-cases-template.xlsx`.

Ô gộp (04/10/2026): chỉ nhận gộp ngang một dòng dữ liệu ở cột trình bày, sang cột không có tiêu đề và dữ liệu. Không gộp ID, tiêu đề case, tiền điều kiện, bước test, kết quả mong đợi hoặc tham chiếu nguồn; không gộp header/nhiều dòng. Lỗi nêu địa chỉ vùng ô. Source/export giữ vùng gộp hợp lệ. Mẫu TestCases nội bộ vẫn không hỗ trợ ô gộp.

## Đọc và xuất

**Cập nhật đã duyệt 04/10/2026 — V13:** thành viên dự án đang hoạt động được ghi kết quả **tài liệu**; TESTER vẫn không có quyền import hoặc duyệt revision. Sửa kết quả tài liệu không ghi execution/bug/retest. **Bổ sung 11/10/2026:** mỗi lần thực thi mới cập nhật kết quả tài liệu một chiều theo case; lần ghi mới nhất thắng, kể cả khác đợt/cấu hình. Tăng version và ghi lịch sử trong cùng transaction; replay attempt không ghi đè chỉnh sửa mới hơn. Không backfill lịch sử cũ. `sourceCounts` bên dưới vẫn là dữ liệu nguồn bất biến; UI thư viện dùng `resultCounts` của bản cập nhật.

| Method / path (sau `/api/v1/projects/{projectId}`) | Contract mới |
| --- | --- |
| PUT `/test-documents/{id}/rows/{rowId}/result` | JSON `{status,expectedVersion,requestKey}`; session + CSRF; status `UNEXECUTED,OK,P,NG,FIXED,NA`, version ≥0, requestKey UUID |
| GET `/test-documents/{id}/rows/{rowId}/result-history?before=0` | Tối đa 50 bản ghi mới nhất, `{id,before,after,occurredAt,actor}`; trang tiếp dùng ID cuối làm cursor |

PUT trả `{rowId,status,version,updatedAt,updatedBy}`. Khóa dòng, ghi trạng thái/version/actor/time và project_audit trong một transaction; 409 khi version cũ hoặc project/case đã archive, 404 nếu row không thuộc tài liệu COMMITTED của dự án. Replay ngay cùng key/body/actor/expectedVersion trả cùng kết quả, không tăng version hoặc thêm lịch sử. Key cũ sau thay đổi khác trả 409. Input sai trả 422. Quyền tạo tài khoản và quy tắc kết quả đợt không thay đổi.

Row bổ sung `rowId,resultStatus,resultVersion,resultUpdatedAt,resultUpdatedBy`. Mặc định `UNEXECUTED`, không tự lấy kết quả nguồn làm kết quả mới. `cells` và export `original=false` đặt trạng thái đã lưu vào đúng cột mapping `result`; tên hiển thị/export `Unexecuted`, `Fixed`, các trạng thái khác giữ mã. Nội dung case lấy revision hiện tại; cột phụ/M/N/người test nguồn chưa có thao tác chỉnh sửa thì giữ nguồn. Không sửa raw_data_json/source_workbook. Summary bổ sung `resultCounts` theo mã enum; updatedAt/updatedBy lấy cập nhật mới nhất giữa revision và kết quả tài liệu.

Frontend xếp hàng ghi riêng từng dòng, giữ thứ tự khi bấm nhanh; không mở form dưới bảng. Export bị khóa trong lúc lưu hoặc khi chưa giải quyết lỗi. Lỗi/xung đột hiển thị rõ, tải lại để đối chiếu. Lịch sử tài liệu có nút mở riêng lịch sử/chứng cứ đợt kiểm thử. OpenAPI trong `test-cases.openapi.json`, liên kết từ `openapi.yaml`.

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
