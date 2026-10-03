# Quyết định nhập và duyệt test case

Ngày: 28/09/2026. Nguồn: câu trả lời trực tiếp của người dùng.

- Sprint 4 dùng mẫu `.xlsx` nội bộ, có file mẫu tải xuống. Không coi đây là mẫu của khách hàng.
- Chỉ thành viên đang hoạt động với vai trò **PM trong chính dự án** được duyệt revision. Quyền ADMIN toàn hệ thống không tự mang quyền duyệt.
- Sprint 5: **Fix = dev báo đã sửa, tester kiểm thử lại**. Không tự chuyển thành Pass.

## Contract nhập nội bộ v1

`GET /api/v1/projects/{projectId}/import-previews/template` tải workbook mẫu.
`POST /api/v1/projects/{projectId}/import-previews` nhận multipart field `file` (.xlsx), cần CSRF.
`GET /.../{batchId}` xem lỗi theo dòng; `POST /.../{batchId}/commit` xác nhận.

Sheet `TestCases`, 11 cột cố định: `caseNo`, `suiteCode`, `titleVi`, `preconditionsVi`, `stepsVi`, `expectedVi`, `titleJp`, `preconditionsJp`, `stepsJp`, `expectedJp`, `sourceReference`.
Tiếng Nhật và tham chiếu là tùy chọn; giữ nguyên xuống dòng và Unicode. Mã nhóm phải tồn tại, đang hoạt động trong dự án.
Giới hạn kỹ thuật: 5 MiB, 500 dòng, không công thức, macro, ô gộp, liên kết ngoài. Bản xem trước tồn tại 24 giờ.
Nhập mới không ghi đè mã case đã tồn tại: báo lỗi để người dùng tạo revision có chủ đích. Một dòng lỗi chặn toàn bộ commit. Cùng nội dung file trong cùng dự án và cùng người nhập trả lại batch còn hiệu lực hoặc đã commit; commit lặp không tạo thêm case/revision.

Phê duyệt không sửa nội dung revision, không đổi người/thời điểm duyệt khi gọi lại. Tạo revision mới cần ID revision hiện tại để phát hiện sửa đồng thời; bản cũ vẫn đọc được.

Phụ thuộc đọc XLSX: [Apache POI 5.5.1](https://poi.apache.org/download.cgi), theo [hướng dẫn giới hạn tài nguyên](https://poi.apache.org/security.html). Các giới hạn parser được kiểm tra trên server, không chỉ ở trình duyệt.
