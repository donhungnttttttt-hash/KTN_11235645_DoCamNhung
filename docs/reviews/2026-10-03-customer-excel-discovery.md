# Khảo sát Excel khách và khôi phục luồng tài liệu test

Ngày: 03/10/2026. Trạng thái: **khảo sát, chưa triển khai hoặc duyệt thiết kế**.

**Cập nhật sau khảo sát:** người dùng đã duyệt toàn bộ và giao chủ động phân tích/triển khai. Đề xuất giữ kết quả cũ làm dữ liệu nguồn được áp dụng, M/N giữ nguyên theo câu trả lời trước đó. Các dòng bên dưới ghi lại tình trạng lúc khảo sát; kết quả triển khai và việc còn chờ nằm ở [báo cáo tiếp nối](2026-10-03-test-documents.md).

## Yêu cầu và quyết định đã xác nhận

- Người dùng cung cấp workbook `(タブレット)(#指摘管理)テスト仕様書(アイコン表示絞り込み)_VI.xlsx` tại thư mục `D:\DCN\Flutter Test 20260521\Pack shiteki` và ảnh danh sách tài liệu CAT.
- Import phải tạo một mục theo tên file; bấm tên mở bảng test case. Export phải hỗ trợ cấu trúc file đã cung cấp, không chỉ tải mẫu nội bộ.
- Tìm lại bố cục màn hình test case cũ và nối với dữ liệu thật; giữ giao diện tiếng Việt và menu con đã thống nhất.
- Người dùng xác nhận giữ hai cột M/N chưa có tiêu đề dưới dạng dữ liệu nguồn khi import/export, chưa tính vào tiến độ.
- Cách tiếp nhận kết quả cũ tại cột I đang hỏi: đề xuất hiển thị dữ liệu Excel riêng, chưa tạo execution history nếu thiếu đợt/build/phân công. Chưa coi đề xuất này là quyết định đã duyệt.

## Bằng chứng workbook

Đọc trực tiếp ZIP/XML, không thực thi công thức hoặc mở URL trong workbook. File nguồn không bị sửa; dữ liệu trích xuất đầy đủ nằm trong scratch được bỏ qua bởi Git.

- 40.504 byte; một sheet hiển thị tên `タブレット`, vùng dữ liệu A1:N156.
- 155 dòng dữ liệu, ID số 1–155, không trùng; header tại dòng 1.
- Không có ô gộp, công thức, ảnh hoặc external workbook links. Có **39 hyperlink**, một vùng conditional formatting, 33 cell styles và bộ lọc A1:L156.
- Cố định hàng đầu; chiều rộng cột, chiều cao hàng, xuống dòng và màu có trong file nguồn.
- Cột A:L lần lượt: ID; Đối tượng test; Điều kiện tiên quyết; Các bước test; Quan điểm test; Hạng mục xác nhận; Kết quả mong đợi; Ghi chú thiết kế; iPad*; Ghi chú thực thi&; ID redmine; Người test.
- Cột M/N có dữ liệu nhưng tiêu đề rỗng. M có cả trạng thái, tên và ghi chú; không thể suy diễn thành một trường kết quả thống nhất.
- Ba dòng đầu là nội dung chuẩn bị/quy trình chung và có giá trị `-` tại cột I. Giữ nguyên các dòng này; chưa tự loại khỏi tài liệu hoặc chuyển thành NA.
- Giá trị cột I: `OK` 124, `Ok` 1, `Fixed` 10, `NG` 3, `NA` 13, `Pending` 1, `-` 3. Đây là giá trị trong nguồn, không phải thống kê đã được xác minh trong TMS.

## Nguyên nhân và code liên quan

`Backend/src/main/java/vn/syp/tms/testcase/TestCaseWorkbook.java` hiện chỉ nhận một sheet tên `TestCases`, 11 cột của mẫu nội bộ, tất cả ô phải là chuỗi. Vì vậy file khách bị chặn ngay ở tên sheet; chỉ đổi tên sheet vẫn tiếp tục lỗi tên cột và ID dạng số.

`TestCaseService` yêu cầu suite code có sẵn và caseNo duy nhất trong dự án. ID 1–155 của file nguồn không đủ làm mã toàn dự án khi nhập nhiều file. Các trường quan điểm/hạng mục xác nhận/ghi chú thiết kế/kết quả nguồn chưa có mapping nội bộ đầy đủ.

`import_batches` và `import_rows` hiện là staging/audit, preview thuộc riêng người tải, hết hạn sau 24 giờ; bản COMMITTED được giữ và dùng chống nhập lặp. Không thể đưa nguyên endpoint preview lên làm danh sách tài liệu chung vì khác quyền và vòng đời. Cần chốt cách biểu diễn tài liệu bền vững, tái sử dụng test case/revision hiện có.

`Frontend/src/app/services/api/testCases.js` có tải mẫu nội bộ, preview và commit, chưa có endpoint export nội dung tài liệu test thực tế. Export báo cáo Sprint 8 là chức năng khác.

## Màn hình cũ vẫn khôi phục được từ Git

Tại HEAD `3355cfc` (nhánh hiện tại `feature/sprint-11-pilot`):

- `Frontend/src/app/pages/TestSpecsPage.jsx`: danh sách test specification, bấm tên mở `/tests/{no}`. Các dòng và số liệu lấy từ props dữ liệu mẫu.
- `Frontend/src/app/pages/TestRunnerGridPage.jsx`: lưới ID/đối tượng/điều kiện/bước/quan điểm/hạng mục/kết quả mong đợi/ghi chú, kết quả iPad, chi tiết và lịch sử. Dữ liệu, trạng thái và một số nút dùng local state/mock.
- Working tree hiện tại: `/tests` là thư viện case dùng API; TestRunnerGridPage là adapter sang ExecutionRunnerPage theo cycle ID. Bố cục danh sách file và lưới nguồn không còn ở luồng này.
- Thay đổi menu con mới nhất không xóa các màn hình này; sự thay thế đã có trong quá trình chuyển mẫu UI sang nghiệp vụ có API.

Khôi phục bố cục không đồng nghĩa khôi phục mock fallback, tự đổi trạng thái khi bấm ô hoặc số tiến độ 100% hardcoded. Route tài liệu mới cần phân biệt với `/tests/cycles/{id}` và alias `/tests/{id}` hiện có.

## Phạm vi bước tiếp theo

Hoàn thiện thiết kế luồng danh sách tài liệu → bảng case và import/export theo mẫu đã đọc; trình người dùng xem. Tái sử dụng case/revision/quyền dự án, giữ case cũ và bộ nhập mẫu nội bộ. Chốt dữ liệu kết quả nguồn trước khi thiết kế cập nhật execution.

Tiêu chí kiểm chứng khi triển khai: đọc đủ dữ liệu A:N; giữ ID/thứ tự/Unicode/xuống dòng/hyperlink; hai file đều có ID1 không xung đột; nhập lại không nhân bản; chỉ project member đọc/export; preview/commit giữ quyền; export rồi đọc lại so sánh dữ liệu và phần định dạng hỗ trợ; browser upload → tên file → lưới → tải xuống → mở lại. Không chạy test ghi/xóa lên schema tms đang dùng.

Skill đã dùng: using-superpowers, brainstorming (phân loại Architectural), spreadsheets cho đọc file. Lần này chỉ khảo sát workbook/code/Git, chưa sửa code ứng dụng/schema, chưa chạy test/build hoặc đo coverage, chưa commit/push/deploy. S04/S11 giữ IN_REVIEW; khảo sát này không chứng minh tính năng đã sửa xong.
