# Import Excel: đếm test case thực và giữ nội dung ô — 15/11/2026

## Yêu cầu và nguyên nhân

File `(タブレット)(#標準)テスト仕様書(ブック機能)_VI.xlsx` có 89 test case, hàng tiêu đề và dữ liệu đến dòng 90. XML worksheet có dimension `A1:N643`, bao gồm các dòng trống được định dạng. Bộ đọc cũ dùng `getLastRowNum()` để kiểm tra 500 nên từ chối nhầm file này. 500 không phải số lần xuống dòng trong một ô.

Người dùng yêu cầu không giới hạn nội dung ô. Phát hiện thêm trần 8.000 ký tự trong parser/DTO/editor, 255 ký tự cho tiêu đề, và cột MySQL TEXT/VARCHAR không đủ cho nội dung dài. Đây là lỗi riêng cần sửa xuyên suốt, không chỉ thay thông báo.

Skill áp dụng: systematic-debugging, test-driven-development, verification-before-completion. Giữ các thay đổi dở dang đã duyệt trên `system-design`; không commit/push.

## Thay đổi

- Chỉ đếm dòng có dữ liệu trong các cột được nhập; bỏ dòng trống/định dạng và dữ liệu nằm hoàn toàn trong cột bị loại. Giới hạn 500 test case thực vẫn được giữ; 500 nhận, 501 từ chối. Giữ số dòng nguồn để sửa/xuất đúng case.
- Feature vẫn chỉ nhập ID, No, Đối tượng test, Điều kiện tiên quyết, Các bước test, Quan điểm test, Hạng mục xác nhận, Kết quả mong đợi, Ghi chú thiết kế. Các cột của web tiếp tục độc lập. File gốc giữ nguyên byte.
- Bỏ trần 255/8.000 ký tự của nội dung test case ở parser, validation và các màn sửa nội dung/phiên bản. Giữ ràng buộc định danh, kích thước file và kiểm tra định dạng workbook.
- V43 mở rộng nội dung revision, ô sửa, lịch sử ô và đối tượng test trong nguồn Ticket thành LONGTEXT. Không sửa các migration đã áp dụng.
- Kiểm thử Unicode dài phát hiện MySQL lỗi 1038 khi sắp xếp JSON lớn: commit dùng chỉ mục thứ tự dòng nguồn; tổng hợp kết quả không sắp xếp payload và xử lý hòa thời điểm bằng ID; chi tiết sắp xếp các tham chiếu dòng trong Java. Không tăng cấu hình server để che lỗi.

## Kiểm chứng

- RED trước sửa: parser từ chối dòng định dạng cuối, ô dài; editor còn maxlength. Các hồi quy tương ứng PASS sau sửa.
- 48 unit test parser/context/assignment PASS: `var/context-unit.log`; RED giữ ở `var/book-unit-red.log`.
- Chính file người dùng đã qua preview → commit → read → export trên schema MySQL riêng: **89 case, 9 trường, file gốc nguyên byte**, SHA256 `8321c27264534d0d2ae8d4cc5d0a388f73f58324bf0d1c44f7943f3f2cb84735`. Receipt cuối: `var/file-owners-20261114/book-final2/workbook-acceptance.json`.
- 34/34 `FeatureIntegrationTest` PASS, không skip; ô Unicode 28.000 ký tự/7.000 lần xuống dòng qua import, sửa revision, sửa ghi chú, lịch sử, export. Fixture dùng nội dung biến thiên để không kích hoạt chống ZIP bomb; không tắt bảo vệ POI.
- Fresh V43 và nâng V42 → V43 PASS trên schema cô lập. Nâng cấp giữ revision, ghi chú, lịch sử, Status, context; thử ghi/đọc 40.000 ký tự Unicode và migrate lại 0 thay đổi. `var/file-owners-20261114/target-book-upgrade/migration.log`.
- Frontend: 1.399 test/152 file PASS; sau khi bỏ maxlength còn sót ở màn sửa phiên bản, chạy lại 21 test liên quan PASS và production build PASS. `var/book-frontend-full.log`, `var/book-revision-green.log`, `var/book-final-build.log`.
- Không đo lại coverage. Excel XLSX vẫn có giới hạn kỹ thuật của định dạng; không cắt ngắn nội dung để xuất. Không tuyên bố dữ liệu vô hạn về dung lượng.

## Local và giới hạn

- Đã sao lưu trước nâng database: `var/mysql-native/backups/2026-11-15T04-59-45-998Z-tms.sql` (không kèm dòng phiên đăng nhập).
- Local V42 → V43, backend đã khởi động. Snapshot trước/sau giữ số bản ghi, phân bố Status và fingerprint nội dung revision/ô/lịch sử; không nhập file thử vào database nghiệp vụ.
- Artifact cuối từ lần chạy 34/34 test `book-final2`: SHA256 `19492c2c3b2802e33481093b282afafeadb5df3f71a1f50aefceb1b17d268559`, đã nạp vào backend local. HTTP health UP, đăng nhập và đọc file/danh sách qua proxy 5173 → 8080 thành công; receipt `var/file-owners-20261114/book-live-read.json`. Không ghi dữ liệu nghiệp vụ trong smoke.
- JDT 395 source, 0 error; còn 7 cảnh báo có sẵn ở `SystemAdminStartupTest`, không có cảnh báo mới từ lần sửa này. Không tuyên bố toàn workspace sạch Problems. `git diff --check` PASS.
- Chrome native pipe chưa khả dụng ở lần kiểm tra trước; không coi kiểm thử API/component là nghiệm thu giao diện Chrome. Người dùng tải lại trang và nhập lại file gốc.
