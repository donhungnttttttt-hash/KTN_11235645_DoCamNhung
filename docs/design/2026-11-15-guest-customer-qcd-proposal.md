# Đề xuất cổng Khách theo góc nhìn bên đặt hàng Nhật — 15/11/2026

**Đã thay đổi phạm vi chi phí theo yêu cầu mới nhất:** không hiển thị hợp đồng/giá trị/hoá đơn; đánh giá định mức 500/người/ngày và 50 case/người/ngày so với kế hoạch thực hiện. Phần hợp đồng và bộ mẫu JPY bên dưới chỉ còn là lịch sử đề xuất, không triển khai. Xem [thiết kế hiện hành về công sức/chi phí](2026-11-15-guest-effort-cost-proposal.md).

Đây là thiết kế đề xuất, chưa phải implementation hoặc chứng nhận tuân thủ tiêu chuẩn. Tiếp nối khảo sát GuestWorkspace; các quyết định mới nhất của người dùng thay thế phương án Admin nhập chi phí và duyệt mọi dòng cảnh báo AI trước đây.

## Câu hỏi dashboard phải trả lời

1. Hạng mục nào đã được bàn giao/nghiệm thu, tiến độ có bám kế hoạch không?
2. Phần mềm đã được kiểm thử đến đâu; còn lỗi nào có thể ảnh hưởng bàn giao?
3. Giá trị hợp đồng và thay đổi được duyệt là bao nhiêu; tình hình thanh toán thế nào; có yêu cầu phát sinh nào chưa quyết định?
4. Ai đang phụ trách, việc xử lý tiếp theo là gì, khi nào cần phản hồi từ phía khách?
5. Nhận xét dựa trên dữ liệu nào và cập nhật lúc nào?

Đây là định hướng thiết kế cho bên đặt hàng, không khẳng định mọi khách hàng Nhật có cùng yêu cầu. Giao diện vẫn theo ngôn ngữ ứng dụng; chưa tự mở phạm vi dịch toàn hệ thống sang tiếng Nhật.

## Cơ sở tham khảo và giới hạn

- ISO 21508:2026: hướng dẫn EVM kết hợp phạm vi, tiến độ, chi phí. Bản 2026 thay bản 2018. Nguồn ISO/TC258: https://committee.iso.org/sites/tc258/home/news/content-left-area/news-and-updates/revised-standard-for-ISO-21508.html
- PMI giải thích PV (giá trị công việc theo kế hoạch), EV (giá trị công việc hoàn thành được xác định khách quan), AC (chi phí thực tế), CPI=EV/AC và SPI=EV/PV: https://www.pmi.org/learning/library/make-earned-value-work-project-6001
- IPA Nhật khuyến khích quản lý định lượng chất lượng/chi phí/thời hạn và đối chiếu thực tế với kế hoạch; cung cấp dữ liệu tham khảo và phương pháp làm rõ tình trạng dự án: https://www.ipa.go.jp/archive/publish/wp-sd/wp-sd.html và https://www.ipa.go.jp/digital/kaihatsu/link/development.html
- IPA cũng mô tả phạm vi dữ liệu/đơn vị công và lưu ý khi dùng benchmark: https://www.ipa.go.jp/archive/publish/wp-sd/qa.html

Chỉ tham khảo phương pháp, chưa kiểm toán tuân thủ hoặc đọc toàn văn tiêu chuẩn trả phí. Không gắn nhãn “đạt ISO”, “đạt chuẩn Nhật”, không gọi ngưỡng màu tự chọn là ngưỡng quốc tế. Không dùng số liệu trung bình lịch sử khác loại dự án để phán quyết giá hợp đồng hiện tại là đắt/rẻ.

## Chi phí: hợp đồng có sẵn, không tạo màn nhập hàng kỳ cho Admin

- Chuẩn bị dữ liệu demo có nhãn, lưu thành dữ liệu dự án thay vì hard-code một con số cho mọi khách.
- Dùng giả định hợp đồng trọn gói JPY cho bộ demo. Đây chưa phải xác nhận loại hợp đồng thật.
- Giá trị hợp đồng gốc; thay đổi đã phê duyệt; tổng giá trị hiện hành; giá trị đã xuất hóa đơn/đã thanh toán/còn phải thanh toán theo chứng từ; phát sinh đang đề xuất được tách riêng.
- So sánh giá trị bàn giao theo kế hoạch với giá trị đã nghiệm thu, dựa trên trọng số hạng mục được định nghĩa trước. Gọi đúng tên “tiến độ bàn giao theo giá trị hợp đồng”; không đặt tên CPI/SPI nếu không đủ mô hình EVM.
- Hợp đồng không phải chi phí nội bộ nhà cung cấp. Không suy chi phí thực tế từ số case đã test, số ngày trôi qua hoặc số nhân sự. Thanh toán cũng không mặc định là AC. Khi chỉ có giá hợp đồng, không thể kết luận vượt chi phí, biên lợi nhuận hoặc dự báo EAC.
- Chỉ bật chỉ số EVM khi có baseline ngân sách theo công việc, phương pháp ghi nhận EV và AC cùng phạm vi/đơn vị tiền có nguồn. Đầu vào thiếu hoặc mẫu số bằng 0: chưa đủ dữ liệu, không dựng số.
- Khi triển khai với hợp đồng thật, cần nguồn cấu hình/import/đồng bộ được xác định; không coi seed demo là nguồn hợp đồng thật và không tự trích xuất hợp đồng chưa được cung cấp.

### Một bộ mẫu nhất quán để minh họa (chưa ghi database)

Tại 15/11/2026: hợp đồng gốc 10.000.000 JPY; thay đổi được duyệt 500.000; tổng hiện hành 10.500.000. Đã xuất hóa đơn 3.500.000, đã thanh toán 3.000.000; còn 500.000 trên hóa đơn. Yêu cầu phát sinh 400.000 chưa duyệt, không cộng vào tổng hiện hành.

Hạng mục có trọng số 20/20/30/30% (tổng 100%). Hạn 15/10, 31/10, 10/11, 31/12; hai hạng mục đầu đã nghiệm thu, hạng mục thứ ba còn mở. Kế hoạch lũy kế 70%, nghiệm thu 40%, chênh 30 điểm phần trăm; giá trị tương ứng 7.350.000/4.200.000 JPY. Mốc thứ ba quá hạn 5 ngày tại thời điểm mẫu. Đây là chênh lệch bàn giao, không phải mất tiền hoặc chi phí vượt ngân sách.

Tạo thêm tình huống bình thường, cảnh báo, thiếu dữ liệu, dữ liệu cũ và AI lỗi. Seed chỉ vào phạm vi demo được đánh dấu; không đổi Status/nhân sự/số liệu nghiệp vụ hiện có để tạo biểu đồ đẹp. Không trộn lịch sử tài chính giả định với kết quả thật mà thiếu nhãn mô phỏng. Giá trị mẫu trên là giả định do thiết kế chọn, không phải benchmark thị trường.

## Các biểu đồ đối chiếu

| Nhóm | Đối chiếu | Diễn giải |
| --- | --- | --- |
| Bàn giao | Kế hoạch và nghiệm thu theo kỳ | Nêu mốc trễ, phạm vi và trọng số; không lấy % test làm % dự án |
| Kiểm thử | Tổng phạm vi, đã test, OK/NG/P/NA/Unexecuted | Giữ công thức đã chốt; thể hiện phạm vi thay đổi |
| Bug/QA | Mới phát hiện, đã xác minh kết thúc, đang tồn | “Đóng–Đã xử lý” còn chờ xác minh không được tính hết nghĩa vụ |
| Hợp đồng | Gốc, thay đổi duyệt, hóa đơn, thanh toán, nghiệm thu | Chênh lệch thương mại không đồng nghĩa CPI |
| Nhân sự | Người/nhóm phụ trách file, case, Ticket | Phân công, người test đầu tiên và người đổi Status là các khái niệm khác nhau; không suy hiệu suất từ số lần thao tác |

Thiếu lịch sử thì biểu đồ bắt đầu từ thời điểm có dữ liệu. Sức khỏe hiển thị các thành phần Q/C/D và nguồn lực thay vì điểm 0–100 khó giải thích. Đỏ/cam/xanh/xám phải có nhãn và nguyên nhân; 0% test khi chưa đến kế hoạch không tự là đỏ. Chất lượng chưa đủ bằng chứng không được mặc định là tốt.

## Cảnh báo AI dưới biểu đồ và thông báo

- Dòng ngắn 1–2 câu ngay dưới biểu đồ, chữ đậm đỏ khi rủi ro cao, kèm icon/nhãn mức độ và nút xem căn cứ. Cỡ chữ gọn nhưng đọc được; không dùng riêng màu để truyền đạt.
- Bộ tính chỉ số xác định số liệu/ngưỡng; AI diễn giải và đề xuất. Chỉ số không do mô hình ngôn ngữ tự tính hoặc tự viết đè.
- Ví dụ hoàn toàn từ bộ mẫu: “Mốc bàn giao quá hạn 5 ngày; nghiệm thu đạt 40% so với kế hoạch 70%. Đề xuất PM xác nhận kế hoạch phục hồi cho hạng mục 3.” Không suy nguyên nhân thiếu người nếu không có dữ liệu.
- Cảnh báo tự hiện theo yêu cầu mới, ghi rõ “Gợi ý AI tự động”. Tự gửi thông báo trong ứng dụng cho các Admin dự án đang hoạt động thuộc đúng dự án. Người có quyền ADMIN tổng nhưng làm PM ở dự án phải được tính đúng theo trách nhiệm; không gửi tất cả tài khoản toàn hệ thống.
- Chỉ thông báo khi phát hiện mới, tăng mức rủi ro hoặc tái xuất hiện sau khi khắc phục; không gửi lại mỗi lần tải trang. Lưu event/dedup/outbox và trạng thái đã xem/đang xử lý/đã khắc phục; đánh dấu đã xem không xóa rủi ro còn tồn.
- Snapshot có thời điểm và phiên bản; dữ liệu thay đổi thì kết quả AI cũ bị đánh dấu. AI timeout/lỗi không chặn biểu đồ hoặc cảnh báo định lượng; không trình bày văn bản dự phòng theo quy tắc là kết quả AI.
- Nguồn AI chỉ chứa thông tin đã được phép chia sẻ với Khách; không truy cập chat riêng, dữ liệu dự án khác, chi phí lương hoặc kết luận năng lực cá nhân. Đây là tính năng sẽ được triển khai, chưa gửi thông báo thật trong giai đoạn thiết kế.

## Báo cáo AI dành cho khách

Nội dung báo cáo phải trả lời đầy đủ:

1. Tóm tắt điều hành: tình trạng hiện tại, thay đổi so kỳ trước, quyết định cần khách phản hồi.
2. Phạm vi hợp đồng, kỳ báo cáo và thời điểm snapshot; phân biệt dữ liệu mẫu/thật.
3. Kế hoạch và bàn giao: số liệu, mốc chậm, phần chưa nghiệm thu.
4. Chất lượng: phạm vi kiểm thử, kết quả, Bug/QA còn nghĩa vụ, giới hạn bằng chứng.
5. Hợp đồng/tài chính: giá trị gốc/điều chỉnh, thanh toán, phát sinh; ghi rõ chỉ số chi phí nào chưa đủ dữ liệu.
6. Nhân sự và đầu mối xử lý trong phạm vi dự án; không chấm năng lực tự động.
7. Rủi ro, ảnh hưởng và hành động đề xuất; tách người phụ trách/hạn đã xác nhận với người/hạn mới chỉ đề xuất.
8. Nguồn đối chiếu và dữ liệu thiếu/cũ; không kết luận nguyên nhân hoặc cam kết ngày hoàn thành khi chưa có chứng cứ.

AI tự tạo bản nháp khi có rủi ro hoặc khi được yêu cầu; Admin dự án chỉnh sửa/duyệt bản chính thức trước khi công bố cho Khách theo quyết định đã có. Cảnh báo tự động dưới biểu đồ không phải báo cáo đã duyệt. Báo cáo lưu giữ snapshot gốc; muốn cập nhật thì tạo phiên bản mới, không đổi ngầm bản đã công bố.

Trình bày trên web như Markdown Preview: heading, bold/italic, bảng, danh sách, quote, link an toàn; có mục lục và metadata kỳ/người duyệt/thời điểm; tải Markdown giữ nội dung. Không sửa số liệu lịch sử trong báo cáo cũ chỉ vì công thức hoặc dữ liệu hiện tại thay đổi.

## Phần source chịu ảnh hưởng và bước tiếp theo

- GuestWorkspace/menu/report renderer; API projection giới hạn Khách và kiểm tra membership/avatar.
- Nguồn hợp đồng/baseline/bàn giao/demo, snapshot theo thời gian, bộ tính chỉ số và rule có phiên bản.
- AI snapshot + cảnh báo, cơ chế công bố báo cáo và thông báo dự án. Notification hiện tại gắn Ticket; cần mở rộng có kiểm soát, không tạo Ticket giả để gửi cảnh báo dashboard.
- Kiểm thử công thức, dữ liệu thiếu/thay đổi phạm vi, trùng thông báo, stale AI, quyền khác dự án/thu hồi thành viên, luồng duyệt và Markdown an toàn.

Chưa triển khai source, chưa migration hoặc commit/push. Cần duyệt thiết kế cụ thể rồi hoàn thiện đặc tả/implementation plan theo skill brainstorming; thay đổi nguồn chi phí của người dùng đã được ghi nhận, không hỏi lại phương án Admin nhập hàng kỳ.
