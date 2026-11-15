# Đánh giá chi phí công sức theo tiến độ test — điều chỉnh 15/11/2026

Trạng thái: thiết kế đề xuất, chưa triển khai. Yêu cầu mới nhất thay thế phương án dashboard hợp đồng/giá trị bàn giao ở `2026-11-15-guest-customer-qcd-proposal.md`.

## Chốt bổ sung: tính theo đầu người và hệ số quản lý

Người dùng chốt tính theo đầu người trong dự án; Admin nhân 5 vì muốn mô phỏng chi phí quản lý cao hơn. Đây là quy ước mô phỏng người dùng chọn, không phải mức lương thật hoặc hệ số chuẩn quốc tế.

- User thường đang hoạt động trong dự án: hệ số chi phí 1.
- Admin dự án (PM) và Admin tổng (ADMIN) là thành viên đang hoạt động của dự án: hệ số 5. Mỗi người chỉ tính một lần; không đếm tất cả Admin tổng toàn hệ thống vào từng dự án.
- Khách (GUEST), thành viên đã bị gỡ/ngừng hoạt động: không tính vào nhân sự thực hiện. Loại Khách là cách diễn giải thiết kế vì đây là người xem, không phải nhân sự cung cấp dịch vụ.
- Với U User thường và M Admin quản lý trong một ngày: đầu người quy đổi = U + 5M. Không gọi đầu người quy đổi là số nhân sự thật.
- Công sức chi phí mô phỏng của kỳ = tổng theo ngày của (U_ngày + 5*M_ngày). Nếu cơ cấu không đổi trong D ngày làm việc: (U + 5M)*D đơn vị công quy đổi.
- Nếu cần quy đổi con số chi phí: nhân tiếp với đơn giá mẫu cơ sở (ví dụ 500 đơn vị chi phí). Không tự chọn đồng tiền, không gắn số này thành lương, hóa đơn hoặc chi phí thực chi.
- Ví dụ 4 User + 1 Admin = 5 người thực, 9 đầu người quy đổi. Trong 2 ngày làm việc = 18 đơn vị công quy đổi; đơn giá mẫu 500 cho ra 9.000 đơn vị chi phí mô phỏng.
- Số người trong dự án được xem như nguồn lực toàn thời gian trong mô hình này; UI/báo cáo phải ghi rõ giả định. Không cần thêm màn Admin khai ngày công hằng ngày. Đó không phải bằng chứng số giờ thực tế đã làm hoặc phân bổ giữa nhiều dự án.
- Lấy snapshot thành viên/hệ số theo ngày để việc thêm/gỡ người không sửa ngầm lịch sử chi phí. Trước khi có snapshot không tự tái dựng cơ cấu quá khứ; demo có lịch sử nhân sự mẫu riêng và nhãn tương ứng.
- Hệ số 5 chỉ áp dụng chi phí. Không nhân mục tiêu case/năng suất cá nhân của Admin lên 5. Kế hoạch case theo ngày giữ độc lập; không tính lại mục tiêu lịch sử chỉ vì danh sách thành viên thay đổi.
- UI ưu tiên tỷ lệ hiệu quả/chênh lệch và chỉ số chi phí mô phỏng; không trả hợp đồng hoặc đơn giá/lương thật cho Khách. Phân biệt ngày công thực (nếu có) với công quy đổi có trọng số để không gây hiểu nhầm.

Phần mô hình/ngày công bên dưới giữ giải thích các đại lượng, nhưng nguồn đầu vào chi phí được thay bằng snapshot đầu người có trọng số theo quyết định này. Ví dụ cũ không có quản lý tương ứng với tất cả hệ số bằng 1.

## Ý định người dùng

Khách cần đánh giá hiệu quả chi phí outsource qua nhân sự/ngày công và sản lượng test so với kế hoạch. Không hiển thị giá trị/nội dung hợp đồng trên web. Ví dụ người dùng: 1 người/ngày tính 500; định mức 50 case/ngày; đến ngày 15 phải đạt 200 case nhưng ngày 14 mới đạt 50 và ngày 15 đạt 100 thì phải cảnh báo chậm và đánh giá ảnh hưởng công sức/chi phí.

## Mô hình đề xuất

- Diễn giải định mức mẫu là 50 case/người/ngày, đi cùng 500 đơn vị chi phí/người/ngày. Đây là giả định mẫu cần thể hiện khi duyệt thiết kế; người dùng chưa chỉ định đồng tiền, chưa coi 500 là JPY/VND/USD hoặc chuẩn quốc tế.
- Kế hoạch là số case lũy kế theo ngày và phạm vi đã xác định. Mỗi ngày có mục tiêu riêng; không suy mục tiêu ngày 14 chỉ từ mục tiêu ngày 15.
- Số thực hiện giữ cách tính đã chốt của hệ thống: case đã test và Status/chất lượng được tách biệt. Không coi NG/P/NA là sản phẩm đạt hoặc nghiệm thu.
- Trong cùng phạm vi kế hoạch, đếm case duy nhất; đổi Status nhiều lần không tăng số case hoàn thành. Nếu muốn tính công retest thì ghi khối lượng/công retest riêng, không cộng ngầm thành case mới.
- Ngày công thực tế hoặc ngày công phân bổ phải có nguồn. Chỉ dùng phân bổ thì ghi “ước tính theo phân bổ”, không gọi là chi phí thực chi. Danh sách thành viên hoặc số ngày đã trôi qua không đủ chứng minh ngày công thực tế.
- Bộ demo sẽ có sẵn định mức, kế hoạch, phân bổ ngày công và kết quả nhất quán để tự tính, không yêu cầu Admin nhập chi phí hằng ngày. Với dữ liệu thật chưa có nguồn ngày công/phân bổ, chỉ đánh giá tiến độ và phần công việc tương đương; đánh dấu chi phí chưa đủ dữ liệu.

## Công thức và ví dụ tại ngày 15

Đặt R=50 case/người/ngày, U=500 đơn vị/người/ngày, P=200 case kế hoạch lũy kế, A=100 case thực hiện lũy kế.

- Mức đạt kế hoạch = A/P = 50%.
- Thiếu so kế hoạch = P-A = 100 case.
- Công chuẩn cho kế hoạch = P/R = 4 ngày công.
- Công chuẩn tương đương phần đã làm = A/R = 2 ngày công.
- Chi phí định mức của kế hoạch = P/R*U = 2.000 đơn vị.
- Chi phí định mức tương đương phần đã làm = A/R*U = 1.000 đơn vị.
- Công chuẩn còn cần để bắt kịp mốc hiện tại = (P-A)/R = 2 ngày công, tương đương 1.000 đơn vị theo định mức. Đây không phải số tiền chắc chắn phát sinh; chưa biết kế hoạch/phạm vi các ngày sau và nguồn lực còn lại.

Nếu dữ liệu bổ sung cho biết đã dùng hoặc phân bổ 4 ngày công trong cùng kỳ/phạm vi, chi phí thực tế/ước tính tương ứng = 4*500 = 2.000. Hiệu suất so định mức = (A/R)/4 = 50%. Chênh lệch chi phí so khối lượng đã thực hiện = 2.000-1.000 = 1.000. Chỉ dùng nhãn “ước tính” nếu 4 ngày công là phân bổ thay vì thực tế.

Không được kết luận từ 100/200 case rằng thực tế đã chi 2.000. Không biến 2 ngày công thành 2 ngày lịch nếu chưa biết nhân sự khả dụng/lịch làm việc. Dự báo hoàn thành hoặc tổng chi phí cần nguồn lực, năng suất quan sát và giả định ổn định có ghi rõ.

## Giao diện Khách

- Không có mục giá trị hợp đồng, nội dung hợp đồng, thanh toán/hóa đơn trong phạm vi dashboard này.
- Thay mục “Chi phí” bằng “Hiệu quả công sức & chi phí” hoặc nhãn ngắn tương đương.
- Biểu đồ đường kế hoạch case lũy kế vs thực hiện; biểu đồ công chuẩn vs ngày công sử dụng/phân bổ; chỉ số hiệu suất và chênh lệch theo tỷ lệ.
- Đề xuất khách mặc định xem tỷ lệ, mức cảnh báo và ngày công tương đương; giữ đơn giá/định mức tiền ở cấu hình nội bộ. Không chỉ ẩn trường trên UI: projection/API Khách không trả nội dung hợp đồng hoặc đơn giá nội bộ. Các tỷ lệ vẫn có thể biểu đạt hiệu quả mà không công khai số tiền nhạy cảm.
- Khách vẫn xem tên/avatar/trách nhiệm dự án, không thấy lương hoặc đơn giá từng người.
- Giá trị 0 phải phân biệt với chưa có dữ liệu; mẫu số 0 không tạo tỷ lệ giả.

## AI và cảnh báo

Cảnh báo tiến độ tự hiện dưới biểu đồ: “Đến ngày 15 đã thực hiện 100/200 case theo kế hoạch, còn thiếu 100 case. Đề xuất rà soát công việc bị chặn và bố trí nguồn lực cho mốc đang chậm.”

Chỉ khi có dữ liệu 4 ngày công: “Hiệu suất ước tính bằng 50% định mức với 4 ngày công đã phân bổ.” Ghi rõ ước tính/nguồn số liệu. Không tự kết luận thiếu người, nhân sự yếu hoặc thất thoát tiền.

Tiếp tục yêu cầu dòng đỏ đậm gọn dưới biểu đồ, tự thông báo trong ứng dụng cho Admin đúng dự án, chống gửi trùng, giữ căn cứ/thời điểm và trạng thái xử lý. Báo cáo AI tổng hợp giải thích tiến độ, công sức, giả định, chất lượng và hành động; báo cáo chính thức vẫn theo luồng duyệt đã chốt, khác cảnh báo ngắn tự động.

## Tiêu chuẩn và dữ liệu mẫu

Phương pháp so sánh kế hoạch–thực tế–công sức có thể tham khảo quản lý định lượng/EVM đã nghiên cứu, nhưng định mức 50/500 là dữ liệu do người dùng minh họa, không phải chuẩn quốc tế hay benchmark ngành. Không đặt tên CPI/SPI hoặc tuyên bố tuân thủ ISO khi chưa đủ định nghĩa/phạm vi đầu vào.

Bộ dữ liệu demo cần có tình huống đúng kế hoạch, chậm, thay đổi phạm vi, thiếu ngày công, dữ liệu cũ, retest và AI lỗi. Không sửa kết quả nghiệp vụ đang có để làm biểu đồ; không trộn số phân bổ mẫu với dữ liệu thật mà không ghi nhãn.
