# Tài liệu test và Excel khách hàng

Được người dùng duyệt toàn bộ phương án và giao tự phân tích/triển khai ngày 03/10/2026. Không yêu cầu thêm gate phê duyệt chung. Thực hiện trong working tree hiện tại có các sprint chưa commit; không commit/push/merge/deploy. Đây là mở rộng S04 trong quá trình hoàn thiện S11.

## Mục tiêu

Nhập workbook khách thành tài liệu mang đúng tên file; mở tên để xem bảng case giống cấu trúc Excel và bố cục prototype cũ, xuất lại được dữ liệu thật. Giao diện tiếng Việt, giữ sidebar/theme hiện có. Các case/suite/cycle hiện tại vẫn dùng được.

## Luồng giao diện

- `/tests` mặc định hiển thị danh sách tài liệu: tên, số dòng, thống kê kết quả nguồn, cập nhật bởi/lúc. Công cụ nhập Excel, tìm kiếm, phân trang. Kết quả nguồn ghi rõ là từ Excel, không gọi là tiến độ TMS.
- Giữ chế độ xem tất cả case/nhóm để truy cập dữ liệu đã tạo thủ công và bộ lọc hiện tại.
- `/tests/documents/{id}` mở đúng tài liệu thuộc dự án đang chọn, không đụng route cycle cũ. Bảng lưới có đủ cột nguồn, cố định hàng tiêu đề/ID, cuộn ngang, tìm nội dung, mở chi tiết/phiên bản case. Hiển thị tên file và sheet, nút quay lại/tải gốc/xuất Excel/đợt kiểm thử.
- Chi tiết case tiếp tục qua CaseDetailModal và revision API. B/C/D/G/K được đồng bộ với title/precondition/steps/expected/sourceReference hiện có; cột bổ sung giữ nguyên nguồn và chỉ đọc. Khi sửa case, bảng và export lấy phiên bản mới nhất. Phê duyệt vẫn chỉ PM dự án.
- Import preview cho biết mẫu, sheet, tổng dòng, ID nguồn, lỗi từng dòng. Commit thành công mở tài liệu. Tệp đã nhập có đường mở lại thay vì tạo trùng.

## Dữ liệu và phạm vi mẫu

- Hỗ trợ đồng thời mẫu nội bộ TestCases (11 cột) và mẫu khách đã cung cấp: một sheet tên bất kỳ, A:L đúng 12 tiêu đề đã khảo sát, M/N có thể không có tiêu đề; giữ mọi ô A:N, ID số hoặc chuỗi, Unicode/xuống dòng.
- Giới hạn hiện có: .xlsx ≤5 MiB, ≤500 dòng dữ liệu, ≤200 ZIP entries, ≤20 MiB giải nén, ≤8000 ký tự mỗi ô. Không macro, formula, external workbook links, ô gộp hoặc sheet phụ. Không tự diễn dịch một định dạng chưa được hỗ trợ; trả lỗi tiếng Việt rõ ràng.
- Giữ đủ 155 dòng, kể cả 3 dòng chuẩn bị/quy trình chung. Chúng không tự thành NA hoặc được tự đưa vào đợt chạy. PM vẫn lựa chọn/phê duyệt case để lập đợt.
- Cột I/J/K/L và M/N là dữ liệu nguồn. Không tự tạo execution/bug/user từ trạng thái, tên tester hoặc ID Redmine. Fixed vẫn có nghĩa chờ retest trong nghiệp vụ TMS.
- Mã nội bộ của case khách là `XLSX-{batchId}-{rowNumber}`; ID nguồn giữ nguyên ở import_rows. Hai file đều chứa ID1 không xung đột. Chống nhập lặp cùng checksum trong dự án cho mẫu khách; preview riêng tư, tài liệu COMMITTED đọc theo quyền thành viên.
- Tái sử dụng import_batches COMMITTED làm danh tính tài liệu nhập; import_rows là quan hệ 1-n từ tài liệu tới case hiện có. V12 thêm sheet_name, source_workbook MEDIUMBLOB. Dùng mapping_version hiện có để nhận diện CUSTOMER_V1/INTERNAL_V1; giá trị 1.0 cũ được đọc là mẫu nội bộ. Không tạo bảng mới hoặc cột nhận diện mẫu trùng chức năng; không sửa migration cũ. Bản COMMITTED được giữ bền vững, thời hạn 24h chỉ cho PREVIEW.
- Dữ liệu file gốc tối đa5MiB nằm trong MySQL để backup cùng dữ liệu. Danh sách dùng projection SQL không đọc BLOB. Raw cells trong import_rows giữ mapping đầy đủ; case/revision là nguồn nội dung đã sửa. Metadata người cập nhật/ngày cập nhật lấy từ revision/case hoặc thời điểm commit, không giả mạo tên tester từ Excel.
- Workbook nội bộ đã nhập trước V12 vẫn xuất hiện trong danh sách. Nếu không có binary gốc, tạo workbook nội bộ từ các dòng import + phiên bản hiện tại; UI không hiện tải gốc như đã có.

## Xuất Excel

- Tải gốc: trả nguyên bytes đã nhập nếu có.
- Xuất hiện tại: mở bản gốc bằng Apache POI, chỉ thay ô đã sửa ở các cột mapped; giữ tên sheet, ID, cột chưa map, xuống dòng, độ rộng/chiều cao, style, hyperlink và conditional format của các ô không đổi. Ô mapped đổi giá trị gỡ hyperlink cũ nếu không còn phù hợp. Không đánh giá công thức.
- Kết quả nguồn không bị ghi đè bằng kết quả TMS. Báo cáo theo đợt kiểm thử tiếp tục dùng export Sprint 8 hiện có.
- Kiểm chứng round-trip bằng so sánh dữ liệu, style và hyperlink; không cam kết mọi phần mở rộng Excel mà POI không hỗ trợ giống byte-for-byte. Chỉ tải gốc đảm bảo byte-for-byte.

## API

Giữ `/api/v1/projects/{projectId}/import-previews` và commit, thêm format/sheetName vào preview; ID batch cũng là document ID sau commit.

- GET `/api/v1/projects/{projectId}/test-documents?page=0&size=20&keyword=` trả `{items,totalItems,page,pageSize,totalPages}`.
- GET `/api/v1/projects/{projectId}/test-documents/{id}` trả metadata, headers, rows.
- GET `/api/v1/projects/{projectId}/test-documents/{id}/export?original=false` trả XLSX, UTF-8 filename, private/no-store.
- Document summary: id,projectId,fileName,sheetName,format,totalRows,caseCount,createdAt,updatedAt,updatedBy,hasSourceFile,sourceCounts (`OK`, `Fixed`, `NG`, `Pending`, `NA`, `-`, `OTHER`). Không xuất BLOB trong JSON.
- Detail: `{document: summary, headers: string[], rows: [{rowNumber,sourceId,caseId,caseNo,revisionId,approved,archived,cells:string[],sourceCells:string[]}]}`. Customer luôn14 ô; internal11 ô. API detail giới hạn theo500 dòng/file.
- Require membership đọc/export; require PM/Admin thành viên import; preview riêng người tải, ngoại lệ COMMITTED mẫu khách có thể mở lại bởi PM/Admin cùng dự án. Không lộ preview khác người hay project khác. Input size/page/id/keyword có validation; lỗi dùng BusinessException hiện có.

## Kiểm chứng

Unit parser/export: mẫu tổng hợp không chứa nội dung khách, sốID, nhiều dòng, M/N, duplicate source ID, sai header, formula, merges, zip/row limits, giữ internal. Dùng file khách thật đọc local riêng để xác minh155 dòng và round-trip, không commit file khách.

Integration MySQL native schema test riêng: V11→V12 và fresh; preview→commit→list→detail→export; rollback/lặp nhập, hai file ID1, quyền Tester/PM/người ngoài, legacy import, current revision. Không test ghi/xóa trên tms. Frontend test luồng file→case, import lỗi/commit/already imported, request race/project switch/Back/reload. Build, test liên quan, browser với mẫu tổng hợp; kiểm chứng file thật không tự nhập vào dự án thật khi chưa chọn dự án đích.
