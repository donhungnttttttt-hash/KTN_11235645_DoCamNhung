# Tiêu chí nghiệm thu từ góc nhìn khách hàng khó tính

Ngày 08/10/2026, sau commit `b56a0c9`. Người dùng yêu cầu chất lượng sử dụng lâu dài, không chấp nhận hệ thống chỉ đủ trình diễn. Đây là đánh giá của người phát triển trong vai khách hàng, chưa phải chữ ký nghiệm thu của khách hàng thật.

## Kết luận

**Chưa ký nghiệm thu toàn sản phẩm cho sử dụng thật.** Các cải tiến đã kiểm chứng có giá trị, nhưng chưa có đủ bằng chứng cho hiệu quả làm việc của bốn vai trò, thiết bị thật và vận hành môi trường đích. Không đồng nghĩa toàn bộ chức năng đang lỗi. Phân biệt rõ lỗi tái hiện được, thiếu chức năng và thiếu bằng chứng.

## Các yêu cầu chất lượng

| Ưu tiên | Yêu cầu của khách hàng | Bằng chứng và điểm còn thiếu | Điều kiện chấp nhận |
| --- | --- | --- | --- |
| Bắt buộc | Ghi kết quả và xuất Excel đáng tin | Kiểm thử lưu/export và bảo toàn nguồn đã có; màn tài liệu và execution là hai nguồn có chủ đích. Chưa có đối chiếu UAT bộ mẫu của khách hàng theo toàn bộ luồng. | Từ import tới thay kết quả, tải lại trang, mở lịch sử và xuất đúng loại: đối chiếu từng case, build, người thực hiện, ô trống/kế thừa; không sai hoặc thiếu dữ liệu trong tập nghiệm thu. Lỗi lưu phải ngăn xuất như đã lưu thành công. |
| Bắt buộc | Hoàn thành công việc bằng giao diện | Có các test kỹ thuật theo vai trò và checklist. Chưa có biên bản người dùng tự hoàn thành trọn luồng. | Admin tạo/giao dự án; PM import/phân công; Tester nhận máy/test/tạo QA hoặc bug; Dev xử lý; Tester retest; PM theo dõi và kết thúc. Không cần SQL, sửa dữ liệu tay hoặc người phát triển can thiệp giữa chừng. |
| Cao | Không bỏ sót việc khi chuyển màn | `ActionInbox.jsx` polling mỗi 60 giây khi màn đang mở và tab visible. Chưa có sự kiện đã đọc/chưa đọc lưu bền hoặc nhắc việc xuyên màn. Đây là khoảng trống chức năng, không gọi polling là lỗi. | Người nhận biết có việc mới từ các màn nghiệp vụ, mở đúng việc/dự án, không nhận sự kiện của người khác; trạng thái đã đọc tồn tại qua đăng nhập lại. Thiết kế thông báo trong app riêng, chưa bao gồm email/Slack hoặc tự tạo SLA. |
| Bắt buộc | Mất mạng hoặc hai người sửa không làm mất công | Lưu/xung đột/idempotency đã có các test theo phạm vi; chưa nghiệm thu trọn chuỗi bằng trình duyệt và thiết bị thật. | Kiểm tra mất mạng trước/sau ghi, gửi lặp, hết phiên, đổi quyền và hai tab: không ghi trùng, không báo thành công sai, không ghi đè im lặng; giữ nội dung chưa lưu và chỉ rõ cách xử lý. Không yêu cầu tự đồng bộ offline khi chưa thiết kế. |
| Bắt buộc | Giao diện sử dụng được cả ca làm việc | Viewport Chrome và các hồi quy focus đã kiểm chứng. Chưa kiểm tra cảm ứng, bàn phím ảo và các trình duyệt mục tiêu trên máy thật. | Các màn quan trọng với tên dài, lỗi validation, dữ liệu rỗng/nhiều: không che nút, cắt nhãn hoặc tràn toàn trang; cuộn bảng đúng vùng, focus ổn định, zoom 200% dùng được, thao tác bàn phím/cảm ứng hoàn thành được. |
| Cao | PM đọc số liệu để ra quyết định | Dashboard và loại trừ dự án lưu trữ đã có test. Chưa có đo thời gian PM tìm được việc đang tắc trong pilot. | Cùng dự án/đợt/build/thời điểm phải đối chiếu được từ tổng hợp xuống từng việc; xác định được việc chờ ai và hành động tiếp theo. Dữ liệu chưa đủ không được trình bày như tiến độ đã xác định. Không mặc định đòi dự báo AI. |
| Bắt buộc trước production | Chạy ổn định và phục hồi được | Có backup/restore và load test local lịch sử; chưa đại diện dữ liệu V21 và môi trường đích. Bundle chính 560,23 kB là tín hiệu cần đo, chưa chứng minh ứng dụng chậm. | Đo p95 tải trang/API với quy mô và mức đồng thời được ghi rõ; diễn tập phục hồi V21 gồm DB và file/chứng cứ, đối chiếu hash/liên kết/quyền, ghi thời gian và dữ liệu có thể mất. Ngưỡng SLA/RPO/RTO production cần được xác định theo môi trường thật. |
| Bắt buộc bàn giao | Người tiếp nhận biết chính xác đang dùng bản nào | `docs/evaluation.md` còn ghi V11 và coverage cũ như hiện trạng; đã sửa trong lần đánh giá này, giữ riêng bằng chứng lịch sử. | Tài liệu chạy, quyền, hạn chế, migration, test và báo cáo phải chỉ rõ phiên bản/phạm vi; không gọi đã xong khi còn cần thao tác ngoài sản phẩm. |

## Quy tắc kết thúc từng cải tiến

1. Có tình huống và kết quả mong đợi tái lập được. Lỗi hành vi phải có RED trước sửa và kiểm tra hồi quy sau sửa.
2. Kiểm chứng cả UI, API và dữ liệu khi thay đổi đi qua ba lớp; không chỉ chứng minh nút bấm hoặc HTTP 200.
3. Không còn lỗi chặn luồng, mất dữ liệu, sai quyền, sai số liệu hoặc trạng thái thành công giả trong phạm vi đã kiểm tra. Mục chưa kiểm tra ghi chưa kiểm tra.
4. Bằng chứng gồm đầu vào, kết quả, phiên bản và môi trường. Không cộng test chồng lặp, không coi tỷ lệ coverage là điểm chất lượng sản phẩm.
5. Giữ danh sách tồn đọng có ưu tiên. Tính năng mới giải quyết vấn đề thực tế; không thêm dashboard, cấu hình hoặc thông báo chỉ để tăng số chức năng.

## Phạm vi lần đánh giá này

Đã đọc lại source inbox/phạm vi export, báo cáo kiểm chứng hiện hành, STATUS và tài liệu đánh giá; phát hiện và sửa tài liệu hiện trạng bị cũ. Không chạy lại toàn bộ test, không tuyên bố tìm thấy lỗi mất dữ liệu hoặc lỗi hiệu năng mới. Không thay đổi nghiệp vụ hay code runtime trong lần chốt tiêu chí này. S11 tiếp tục IN_REVIEW.

Skill: đọc `prompt-master` nhưng không áp dụng quy trình tạo prompt vì yêu cầu là đánh giá sản phẩm; dùng các trục correctness/readability/architecture/security/performance của `code-review-and-quality` để phân loại bằng chứng. Đây không phải báo cáo review toàn bộ source hoặc mutation test mới.
