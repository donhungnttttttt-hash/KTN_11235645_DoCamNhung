# Đánh giá sản phẩm từ khách hàng khó tính — 08/10/2026

## Phạm vi và kết luận

Theo yêu cầu đưa ra ít nhất năm cải tiến, đối chiếu source hiện tại trên `system-design`, PRD mục 17 và báo cáo kiểm chứng gần nhất. Đây là đánh giá và đề xuất nghiệm thu; không phải triển khai tính năng, chạy lại UAT hoặc xác nhận lỗi runtime mới.

Luồng Admin → PM → Tester → Dev → retest → PM đã có implementation và bằng chứng kiểm thử được ghi riêng. Điểm yếu còn lại là số bước người dùng phải nhớ, ngôn ngữ kỹ thuật trên màn nghiệp vụ, bàn giao công việc và bằng chứng đủ để vận hành rộng. Không kết luận hệ thống thiếu toàn bộ chức năng đã có, cũng không dùng số test PASS để suy ra khách hàng đã nghiệm thu.

P0: điều kiện cần chứng minh trước vận hành rộng. P1: ưu tiên cải thiện trải nghiệm trong đợt tiếp theo. Các tiêu chí dưới đây là đề xuất của lần review, chưa phải quy tắc khách hàng mới được phê duyệt.

## 1. Chuẩn bị dự án có hướng dẫn — P1, bổ sung

**Yêu cầu khách hàng:** PM nhận dự án phải biết thiếu gì để giao việc ngay, không tự ghi nhớ đường đi qua nhiều menu.

**Hiện tại:** nhập tài liệu, duyệt revision, tạo đợt/cấu hình và giao file nằm ở các luồng riêng. Đã có hướng dẫn từng màn; chưa có checklist chung theo dữ liệu thật.

**Đề xuất:** bảng chuẩn bị hiển thị PM, thành viên, máy, file/case đã duyệt, đợt/cấu hình/build và phân công. Mỗi mục thiếu có liên kết tới đúng màn và giải thích người có quyền xử lý.

**Nghiệm thu:** thay đổi một điều kiện thì checklist cập nhật từ dữ liệu server; PM mới hoàn tất một lần giao file mà không cần người phát triển chỉ menu. Không tự duyệt case, cấp quyền hay coi máy vật lý là điều kiện bắt buộc của thao tác mà backend không yêu cầu.

## 2. Nơi làm việc tập trung cho Tester — P1, cải thiện

**Yêu cầu khách hàng:** mở vào phải biết làm file nào, trên máy/build nào, việc tiếp theo là gì.

**Hiện tại:** đã có My work, phiên và kết quả chính thức. `FileWorkPage.jsx`/`FileWorkDetail.jsx` còn dùng mã cấu hình, môi trường, thiết bị; chi tiết phiên trình bày JSON.

**Đề xuất:** ưu tiên tên dễ đọc, file đang làm, phiên đang dở, retest chờ và nút tiếp tục đúng ngữ cảnh. Mã kỹ thuật chỉ là thông tin phụ; hiển thị lịch sử phiên bằng nhãn nghiệp vụ.

**Nghiệm thu:** người dùng xác định đúng file, build, thiết bị và người phụ trách mà không tra ID; quay lại file vẫn thấy dữ liệu phiên đã lưu. Không cho Dev thực thi test và không trộn annotation với kết quả đợt.

## 3. Hộp việc cần xử lý và nhắc bàn giao — P1, bổ sung

**Yêu cầu khách hàng:** Dev trả lời hoặc báo sửa xong thì Tester phải biết, không phải kiểm tra từng màn hoặc nhắc nhau ngoài hệ thống.

**Hiện tại:** BUG/QA và lịch sử có sẵn; chưa có thông báo trong ứng dụng. Dashboard tải theo snapshot.

**Đề xuất:** hộp việc gồm file mới được giao, QA cần trả lời/xác nhận và retest cần thực hiện; liên kết tới đúng đối tượng, phân biệt chưa đọc với chưa xử lý.

**Nghiệm thu:** sự kiện đến đúng người, tải lại không tạo trùng, đã đọc không tự hoàn thành công việc; thu hồi quyền thì không còn mở được dữ liệu. Phải chốt danh sách sự kiện, người nhận và độ trễ; không mặc định gửi email hoặc công bố ra tracker ngoài.

## 4. Responsive theo thao tác thực tế — P1, cải thiện

**Yêu cầu khách hàng:** trên tablet phải đọc bước test, ghi kết quả và tạo bug thuận tiện; không liên tục kéo ngang để tìm nút.

**Hiện tại:** đã sửa nhiều lỗi control/spacing và kiểm tra các kích thước Chrome. Bảng file-work vẫn `min-width:900px`, cuộn hai chiều; chưa có bằng chứng thao tác cảm ứng thật.

**Đề xuất:** giữ bảng Excel trên desktop, thêm chế độ xem từng case trên màn hẹp; đặt hành động theo case gần nội dung, giữ ngữ cảnh khi mở lịch sử/bug. Dùng cùng chuẩn control, nhãn và khoảng cách giữa các màn.

**Nghiệm thu:** tại 375px và tablet 768px, hoàn tất đọc case → ghi kết quả → mở lịch sử bằng chạm; không bị bàn phím ảo che nút, không mất vị trí khi quay lại. Kiểm tra cả tên dài, dữ liệu rỗng, lỗi và tải chậm; không chỉ ảnh đẹp ở dữ liệu demo.

## 5. PM thấy việc cần can thiệp — P1, cải thiện

**Yêu cầu khách hàng:** dashboard phải giúp biết hôm nay cần xử lý điều gì và ai chịu trách nhiệm.

**Hiện tại:** đã có tiến độ chính thức, bug mở, retest chờ, mốc kế hoạch và báo cáo. Cần gom thành hàng đợi hành động và thể hiện tuổi dữ liệu rõ hơn.

**Đề xuất:** tổng hợp file chưa được giao, việc quá hạn có kế hoạch, QA/retest đang chờ và thiếu thiết bị; mở trực tiếp danh sách nguồn theo cùng bộ lọc. Hiển thị thời điểm cập nhật và cách tải lại.

**Nghiệm thu:** mỗi số tổng đối chiếu được với danh sách chi tiết; không đếm trùng, không cộng kết quả tham khảo Excel vào thực thi; thiếu hạn thì ghi chưa đủ dữ liệu thay vì suy đoán trễ. Không tự đánh giá năng suất cá nhân từ số case đơn thuần.

## 6. Xuất Excel phải đủ tin cậy để gửi khách — P0, củng cố nghiệm thu

**Yêu cầu khách hàng:** trước khi tải phải biết file chứa dữ liệu gì, của dự án/đợt/build nào và tới thời điểm nào.

**Hiện tại:** đã có ba nguồn riêng: file gốc, bản cập nhật tài liệu và kết quả thực thi. Không có bằng chứng mới trong lần review này rằng exporter đang xuất sai.

**Đề xuất:** làm rõ lựa chọn/phạm vi trước khi xuất, dùng tên file dễ phân biệt và trình bày nguồn/thời điểm xuất phù hợp với template đã chốt. Nếu có dữ liệu chưa lưu thì xử lý rõ trước khi xuất.

**Nghiệm thu:** sửa → nhận xác nhận lưu → tải lại trang → xuất → mở Excel và đối chiếu giá trị, người test, build, số case; file gốc không đổi. Kiểm tra cả trường hợp lỗi lưu, đổi build và dữ liệu nguồn có cột bổ sung. Không thay đổi authority hoặc template âm thầm.

## 7. Tìm dữ liệu khi quy mô tăng — P1, cải thiện

**Yêu cầu khách hàng:** tìm đúng dự án/file/thiết bị mà không phải lần qua nhiều trang lựa chọn.

**Hiện tại:** bộ chọn dùng `api.projects({page,size:100})`, chưa tìm dự án theo từ khóa trên server tại thành phần này. Đã sửa tên dài, giữ lựa chọn khi phân trang và xóa lọc file đúng phạm vi.

**Đề xuất:** tìm dự án theo tên/mã, trạng thái tìm kiếm rõ, lựa chọn gần đây; lưu các bộ lọc thường dùng nếu thực tế pilot cần. Giữ phạm vi dự án và quyền khi chuyển màn/quay lại.

**Nghiệm thu:** bộ dữ liệu 300 dự án có tên gần giống/tên dài vẫn chọn đúng dự án ngoài trang đầu bằng từ khóa; không lộ dự án ngoài quyền, không gắn tên cũ vào ID mới. Phản hồi cũ không ghi đè tìm kiếm mới.

## 8. Kết thúc dự án có điều kiện và bàn giao — P1, cần chốt nghiệp vụ

**Yêu cầu khách hàng:** dự án phải có cách kết thúc rõ, trả máy, chốt việc tồn và tra cứu hồ sơ sau này.

**Hiện tại:** có bảo vệ đối tượng archived, nhưng chưa có lệnh quản trị archive/unarchive dự án hoàn chỉnh. Quy tắc closure cho REQUEST/TASK/IMPROVEMENT chưa được chốt đủ; không lấy quy tắc BUG/QA áp sang.

**Đề xuất:** kiểm tra trước khi kết thúc, liệt kê phiên đang làm, máy chưa thu hồi và ticket còn mở; lập hồ sơ bàn giao có người xác nhận. Cho mở lại theo quyền nếu nghiệp vụ chấp thuận.

**Nghiệm thu:** không âm thầm đóng ticket, kết thúc phiên hay thu hồi máy; mọi ngoại lệ có người chịu trách nhiệm, lý do và lịch sử. Cần chốt quyền đóng/mở lại, các blocker và ngoại lệ trước implementation.

## 9. Khi lỗi xảy ra, người dùng biết dữ liệu đang ở đâu — P0, củng cố nghiệm thu

**Yêu cầu khách hàng:** mất mạng hoặc hai người sửa cùng lúc không được khiến tôi tưởng đã lưu thành công.

**Hiện tại:** đã có xử lý lỗi, giữ dữ liệu nhập, version/idempotency và kiểm thử tính nhất quán ở các luồng. Đây là yêu cầu kiểm chứng trải nghiệm xuyên suốt, không kết luận toàn hệ thống đang mất dữ liệu.

**Đề xuất:** thống nhất đang lưu/đã lưu/lưu thất bại; lỗi xung đột có hướng xử lý và giữ nội dung chưa gửi. Lý do thao tác bị chặn phải gắn với người/bước có thể xử lý.

**Nghiệm thu:** mô phỏng timeout sau khi server đã ghi, double-click, hai phiên sửa đồng thời và phiên đăng nhập hết hạn; không tạo bản ghi trùng, không báo thành công giả, người dùng phục hồi được thao tác. Không bổ sung offline queue hoặc ghi đè tự động khi chưa có chính sách giải quyết xung đột.

## 10. Chứng minh dùng được trước nghiệm thu — P0, điều kiện bàn giao

**Yêu cầu khách hàng:** bốn vai trò phải tự hoàn thành một dự án mẫu thực tế mà không có người phát triển ngồi hướng dẫn.

**Hiện tại:** có kiểm thử FE/BE/native/HTTP và browser theo phạm vi đã ghi; UAT/pilot thực tế, trình duyệt ngoài Chrome, cảm ứng thật và NFR production chưa được nghiệm thu đầy đủ.

**Đề xuất:** kịch bản từ tạo dự án đến bàn giao, có lỗi mạng, dữ liệu dài, tìm kiếm, QA/BUG và retest; ghi điểm cần trợ giúp, thao tác sai, thời gian chờ. Thử phục hồi backup trên môi trường cách ly trước vận hành thật.

**Nghiệm thu:** đối chiếu kết quả theo vai trò, không còn lỗi chặn luồng trong phạm vi; lưu bằng chứng và giới hạn. Chốt tập trình duyệt/thiết bị, quy mô dữ liệu/tải đồng thời, độ trễ chấp nhận và RPO/RTO trước kiểm thử vận hành; không hứa “không còn bất kỳ lỗi nào”.

## Ràng buộc và thứ tự thực hiện

- Giữ phân quyền Admin/PM/Tester/Dev hiện hành; PM không được tự nhận quyền quản trị tổng.
- Một máy vật lý chỉ được cấp cho một dự án tại một thời điểm; số người/máy chọn ban đầu không trở thành hạn mức.
- Giữ phân biệt kết quả nguồn Excel, annotation tài liệu và execution đúng build; không đổi mô hình chỉ để làm giao diện đơn giản hơn.
- Nhóm ưu tiên trải nghiệm: 1–4, đi kèm gate 6/9. Tiếp theo 5/7. Mục 8 cần chốt nghiệp vụ; mục 10 là điều kiện nghiệm thu thực tế xuyên suốt.
- Đây là yêu cầu đánh giá. Không triển khai, migration, commit hoặc push trong lần review này; không đổi sprint sang DONE.

## Nguồn và phương pháp

- [PRD checkpoint hiện hành](../product/PRD.md#17-checkpoint-hiện-hành-native-v20-và-trải-nghiệm-đa-kích-thước).
- [Đánh giá và sửa bộ chọn/phạm vi](2026-10-07-project-scope-customer-followup.md).
- [Source thực thi file](../../Frontend/src/app/features/file-work/FileWorkDetail.jsx), [danh sách/giao file](../../Frontend/src/app/features/file-work/FileWorkPage.jsx), [CSS bảng](../../Frontend/src/app/features/file-work/file-work.css), [bộ chọn dự án](../../Frontend/src/app/features/admin/AdminUserProjectFilter.jsx).
- Đọc `prompt-master` theo yêu cầu; skill chỉ chuyên tạo prompt nên không chuyển yêu cầu đánh giá thành một prompt. Áp dụng `product-capability` để tách capability, ràng buộc, tiêu chí và quyết định còn mở.
- Kiểm chứng đợt này: đọc source/tài liệu và Git status. Không chạy test ứng dụng, không đo hiệu năng/coverage, không gọi kết quả kiểm thử cũ là bằng chứng chạy mới.
