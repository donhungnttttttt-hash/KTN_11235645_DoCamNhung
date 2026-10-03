# Import Excel theo tiêu đề — 03/10/2026

Phạm vi S04 trong đợt review S11. Người dùng yêu cầu nhận diện cột theo tên, đổi mẫu tải xuống theo workbook khách; đã chốt kế thừa đối tượng test từ dòng trước nhưng giữ ô nguồn trống. Hoàn thiện phần import trước khi tiếp tục khôi phục giao diện cũ theo yêu cầu mới nhất.

## Thay đổi

- Nhận diện tên cột sau chuẩn hóa dấu, khoảng trắng, hoa/thường và ký hiệu. Hỗ trợ hai cách gọi điều kiện tiên quyết/tiền đề và hạng mục/mục xác nhận; không phụ thuộc thứ tự.
- Bắt buộc ID, đối tượng test, bước test, kết quả mong đợi. Không đoán khi hai cột cùng nghĩa. Cột No, cột phụ và cột không tiêu đề giữ nguyên nguồn; tối đa 64 cột.
- Lưu mapping trong JSON import row hiện có. API detail trả columns; lọc kết quả, ID mở chi tiết và export dùng mapping thay vì vị trí cố định.
- Trường title trống kế thừa giá trị của dòng dữ liệu trước. Export giữ nguồn trống nếu revision chưa đổi tiêu đề. Dòng đầu chưa có title để kế thừa vẫn phải bổ sung.
- Mẫu tải xuống dùng tiêu đề khách, có No. Mẫu nội bộ cũ và tài liệu đã nhập trước đó vẫn tương thích.
- Không thêm bảng/migration: native vẫn V12, mapping nằm trong JSON đã có. Giữ giới hạn upload, chống công thức/macro/link không hợp lệ, quyền và transaction import hiện có.

## Kiểm chứng

- RED → GREEN: parser không nhận cột đổi thứ tự/alias, tiêu đề trùng, title trống; frontend lọc kết quả và mở ID ở vị trí mới.
- Backend CustomerWorkbookTest 9 + DocumentWorkbookTest 6 + TestCaseWorkbookTest 5 = 20 PASS; Maven verify/package PASS. Java diagnostics 136 source: 0 error, 0 warning.
- Frontend 225 tests/27 files PASS; build PASS. Scoped coverage TestDocumentPage + ImportExcelDialog: statements 94.62%, branches 82.74%, functions 92.45%, lines 99.19%. Không suy coverage toàn ứng dụng hoặc backend từ số test.
- Browser thật: file 図面メモ nhập 128 dòng, preview 0 lỗi, commit thành document 4 trong dự án Demo thư viện kiểm thử. Case ID 10 kế thừa title; ô nguồn C11 vẫn trống. Lọc Fixed trả 6 dòng; NG 4, OK 110, Pending 8 theo cột iPad đã nhận diện.
- API template 200, filename test-cases-template.xlsx; đọc lại workbook xác nhận đúng 13 tiêu đề khách. API original/current export 200.
- So sánh file thật: bản gốc giống bytes; bản hiện tại giữ toàn bộ 128×14 giá trị/kiểu/style/hyperlink. C11 là chuỗi rỗng trong cả nguồn và export (không phải null). File cũ 155×14 cũng round-trip giữ nội dung và 39 hyperlink.
- Screenshot local: output/playwright/header-import-preview.jpg và header-import-document.jpg (không đưa nội dung khách vào fixture của Git).

## Giới hạn và việc tiếp theo

- Chỉ hỗ trợ một sheet, tiêu đề hàng đầu, không ô gộp/công thức, 500 dòng/64 cột/5 MiB; không nhận mọi định dạng Excel tùy ý.
- Chưa chạy lại integration permission/concurrency/fresh migration trên schema native riêng vì chưa có quyền tạo schema; không chạy fixture ghi/xóa trên tms. Coverage backend API/service chưa đo cho thay đổi này. UAT còn mở.
- Kết quả Excel vẫn là dữ liệu nguồn. Phần nút ba gạch, lịch sử và ghi kết quả trực tiếp trên màn chi tiết là yêu cầu kế tiếp, chưa được tính vào các test trên.
- Skills dùng: ponytail (tái sử dụng tối thiểu), brainstorming (phạm vi/quy tắc kế thừa đã duyệt), ui-ux-pro-max/frontend-ui-engineering/ui-styling (giữ thiết kế và thông báo import). prompt-master được đọc nhưng không áp dụng vì không có bài toán thiết kế prompt. Quy trình ECC: test hành vi RED/GREEN, review input/source preservation, build/diagnostics/coverage và browser/API thật. Không commit/push/merge/deploy.
