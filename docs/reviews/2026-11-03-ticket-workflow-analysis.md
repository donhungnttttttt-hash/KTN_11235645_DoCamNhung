# Phân tích luồng Ticket Bug/QA theo sơ đồ ngày 03/11/2026

Trạng thái cập nhật 03/11: người dùng đã duyệt và yêu cầu triển khai (“tooi duyet nen thucj hien di”). Thực hiện theo [kế hoạch](../superpowers/plans/2026-11-03-ticket-workflow.md). Câu hỏi No bug/ID nguồn đang chờ, các phần độc lập tiếp tục. Các chữ “đề xuất” bên dưới ghi lại thiết kế đã trình bày trước phê duyệt; phương án này là cơ sở triển khai. Không commit/push.

## 1. Mục tiêu và quyết định đã có

Người thực hiện kiểm thử phát hiện sai lệch, tạo ticket từ case, giữ đủ bằng chứng để người nhận xử lý và người kiểm thử xác nhận lại. Form, bình luận, phân công, Kanban, thông báo và báo cáo phải thống nhất cùng một luồng.

- Ticket gồm Bug và QA. QA bắt đầu ở **Xác nhận spec**; Bug bắt đầu ở **Chưa xử lý**.
- QA trao đổi với BA/BrSE: xác nhận là lỗi thì chuyển sang Bug; không phải lỗi thì đóng với lý do **Không được hỗ trợ**, theo nhãn trong sơ đồ người dùng.
- Bug chuyển cho đầu mối PM Dev, sau đó phân công người xử lý. Dev xử lý xong là **Đóng – Đã xử lý**, sau đó tester xác nhận.
- **Đóng – Đã xử lý không đồng nghĩa nghiệm thu xong.** Tester xác nhận hết lỗi mới là **Đóng – Đã sửa**.
- Dev không tái hiện được thì chuyển **Chờ xác nhận**. Tester kiểm lại: còn tái hiện thì mở lại Bug; cũng không tái hiện được thì **Đóng – Không thể tái hiện**.
- Còn lỗi sau xử lý: mở lại về **Chưa xử lý**, đúng mũi tên nét đứt trong sơ đồ.
- **Đang xử lý** là trạng thái mở trong sơ đồ, không được đưa thành lý do đóng. Cụm đó trong danh sách gõ ban đầu được đối chiếu theo sơ đồ mới nhất.
- Không khôi phục loại tài khoản Tester/Dev. User thường hợp nhất vẫn giữ nguyên. Người dùng đã xác nhận **BA/BrSE và đầu mối PM Dev có thể được chỉ định cả từ User thường**, không chỉ Admin dự án.
- Thông tin Feature hiện tại vẫn hiển thị theo quyết định trước. Version/bằng chứng của lần phát hiện lỗi cần được phân biệt với thông tin Feature thay đổi về sau.

## 2. Đối chiếu source hiện tại

| Phần | Đã có | Cần thay đổi theo yêu cầu |
| --- | --- | --- |
| Tạo Issue | Bug/QA, Feature/file/case, tiêu đề, mô tả, steps, kỳ vọng, thực tế | Prefix tiêu đề; điều kiện tiên quyết; tần suất; môi trường/thiết bị; version case; người nhận và trạng thái ngay khi tạo |
| Ngữ cảnh case | API lấy title/steps/expected, ID case/revision và link nguồn | Lấy thêm điều kiện tiên quyết và version/ngày thực thi đã lưu của đúng dòng case |
| Trạng thái đầu | Cả Bug/QA được ghi `open` | QA phải vào Xác nhận spec; Bug mặc định Chưa xử lý |
| Phân công | Chỉ quản lý được phân công; người nhận phải là USER | Trách nhiệm BA/BrSE/PM Dev theo dự án; người tạo được chọn đầu mối; các quyền phân công theo từng bước |
| Bình luận | Có ghi chú và lịch sử, kiểm version và chống gửi lặp | Một lần lưu bình luận kèm thay đổi trạng thái/phân công; cập nhật chung, không thành công một phần |
| Chuyển loại | Chưa có lệnh chuyển QA thành Bug trong luồng Feature | Thêm hành động rõ ràng, giữ ID/link/bình luận/lịch sử |
| Kanban | Dùng danh sách 10 trạng thái cũ; đếm các item của trang hiện tại | 9 cột theo tổ hợp loại/trạng thái/lý do đóng; số tổng theo đúng bộ lọc |
| Thông báo | Luồng FeatureIssue tạo/sửa/comment không tạo thông báo cho người nhận | Thông báo nội bộ bền vững sau lưu phân công thành công |
| Báo cáo | Nhiều phép tính dùng `work_item_statuses.terminal` | Xử lý riêng Đóng–Đã xử lý là chờ xác nhận, chưa kết thúc |

Nguồn đã đọc: `FeatureIssueService.java`, `FeatureIssueDtos.java`, `FeatureIssueForm.jsx`, `FeatureIssueDetail.jsx`, `FeatureIssueBoard.jsx`, `work-items/data.js`, `TestDocumentService.java`, `TestDocumentDtos.java`, `AdminOverviewService.java`, `ProjectLifecycleService.java`, migration V7/V18 và contract FixReports. `ActionInboxService` là hàng chờ công việc luồng cũ, không phải thông báo phân công của Feature; không mở lại run/retest đã nghỉ để phục vụ yêu cầu này.

## 3. Hướng thiết kế đề xuất

Ba cách có thể làm:

1. Mã hóa mỗi cột thành một trạng thái riêng: dễ dựng bảng nhưng trộn loại ticket, trạng thái và lý do đóng; dễ lệch bộ lọc/thống kê.
2. **Mở rộng Issue hiện có, tách loại + trạng thái + lý do đóng, suy ra cột và giai đoạn nghiệp vụ**: đề xuất. Giữ ID/lịch sử/liên kết sẵn có và một bộ quy tắc dùng chung.
3. Tạo một hệ thống Ticket mới song song: không cần thiết; tăng nguy cơ hai nơi ghi ticket và đếm khác nhau.

Không thiết kế workflow engine tổng quát hoặc thêm role tài khoản mới. Trạng thái hiển thị theo yêu cầu; ý nghĩa kết thúc được xác định theo tổ hợp trạng thái/lý do, không chỉ chuỗi “Đóng”.

| Cột Kanban theo thứ tự người dùng | Loại | Trạng thái | Lý do đóng | Ý nghĩa báo cáo |
| --- | --- | --- | --- | --- |
| 1. Xác nhận spec | QA | Xác nhận spec | Không có | Đang làm rõ |
| 2. Chưa xử lý | Bug | Chưa xử lý | Không có | Chưa kết thúc |
| 3. Đang xử lý | Bug | Đang xử lý | Không có | Chưa kết thúc |
| 4. Chờ xác nhận | Bug | Chờ xác nhận | Không có | Chờ tester |
| 5. Đóng – Đã xử lý | Bug | Đóng | Đã xử lý | **Chờ tester, chưa nghiệm thu** |
| 6. Đóng – Đã sửa | Bug | Đóng | Đã sửa | Đã kết thúc, xác nhận hết lỗi |
| 7. Đóng – Không thể tái hiện | Bug | Đóng | Không thể tái hiện | Đã kết thúc theo kết quả xác nhận |
| 8. Đóng – Không xử lý | Bug | Đóng | Không xử lý | Đã kết thúc bằng quyết định không xử lý |
| 9. QA – Đóng – Không được hỗ trợ | QA | Đóng | Không được hỗ trợ | QA đã kết thúc |

“Chờ Tester xác nhận lại” trong sơ đồ là bước xử lý, không tự thêm cột thứ 10: ticket ở cột 4 hoặc 5 và có nhãn/người cần xác nhận. Số đang chờ xác nhận bằng tổng cột 4 + 5 theo cùng bộ lọc; số đã sửa chỉ tính cột 6. Các lý do không sửa phải được báo cáo riêng, không gộp vào tỷ lệ đã sửa.

Mỗi ticket thuộc đúng một cột. Tổng số của chín cột phải bằng tổng số ticket phù hợp bộ lọc trong phạm vi người xem. Phân trang/tải thêm thẻ không thay đổi tổng ở đầu cột. Dữ liệu lịch sử chưa ánh xạ được phải có chỗ xem và cảnh báo đối soát, không bị ẩn khỏi tổng một cách âm thầm.

## 4. Form tạo và thông tin ticket

| Trường | Đề xuất cách dùng |
| --- | --- |
| Loại ticket | Bug/QA; thay loại trước khi lưu sẽ đổi trạng thái mặc định và tập người nhận, giữ phần nội dung đã nhập |
| Tiêu đề | Sinh prefix `[Đối tượng test][Tên file][Mã tham chiếu case]`, người tạo viết thêm phần mô tả. Hiện preview đầy đủ; không dùng tên Feature thay đối tượng test nếu hai trường khác nhau |
| Nội dung | Bốn vùng riêng: Điều kiện tiên quyết, Các bước thực hiện, Kết quả thực tế, Kết quả kỳ vọng. Điền từ case khi nguồn có dữ liệu; được chỉnh sửa. Phần mô tả/câu hỏi QA hiện có được giữ |
| Tần suất | Nhập tay, ví dụ `3/5 lần`, `Luôn xảy ra`, `Không ổn định`; không tự sinh tỷ lệ khi không có dữ liệu |
| Case tham chiếu | Link vào đúng dự án/Feature/file/dòng case, được sinh từ ID nội bộ; vẫn kiểm quyền khi mở |
| Môi trường và thiết bị | Hai ô nhập tay để rõ server/OS và thiết bị. Hiển thị môi trường Feature bên cạnh để tham khảo, không tự coi đó là môi trường thực tế |
| Version | Lấy version **đã ghi trên đúng case**, không lấy version dropdown đầu file hoặc bản mới nhất theo ngày tạo ticket |
| Ngày thực hiện | Hiển thị ngày thực thi tương ứng với version của case, khác ngày tạo ticket |
| Phân công cho | Ban đầu chưa chọn, người tạo chọn người nhận hợp lệ. QA chọn BA/BrSE, Bug chọn đầu mối PM Dev của dự án |
| Trạng thái | QA mặc định Xác nhận spec; Bug mặc định Chưa xử lý. Theo yêu cầu, Bug có thể chọn trạng thái khác nếu người thao tác được phép; chọn Đóng bắt buộc lý do hợp lệ |

Mã ticket riêng tiếp tục được hệ thống sinh duy nhất theo dự án, không dùng chung với No/ID case. Một case có thể sinh nhiều ticket khác nhau; không đặt unique theo case.

Đề xuất lưu bản chụp nội dung, version và ngày thực hiện lúc tạo ticket. Case được test sang version mới sau đó không tự viết lại version phát hiện lỗi của ticket cũ. Thông tin Feature hiện tại vẫn đọc trực tiếp như đã chốt. Nếu cần ghi bản đã sửa/test lại, ghi riêng trong lần cập nhật/bình luận, không ghi đè bản phát hiện.

Case thiếu dữ liệu thì hiển thị thiếu, không tự chế kết quả thực tế hoặc gán version mới nhất. Bộ trường bắt buộc của Bug và QA cần phân biệt: QA có thể là câu hỏi đặc tả chưa có kết quả thực tế/tần suất. Bug bắt buộc thực tế/kỳ vọng/steps/môi trường/thiết bị/tần suất; QA bắt buộc câu hỏi, ngữ cảnh và người nhận. Phương án validation này thuộc phân tích đã được người dùng duyệt triển khai.

## 5. Người tham gia và quyền

“Tester”, “Dev”, “BA/BrSE”, “PM Dev” ở đây là vai trò trong công việc. Không đổi `USER` thành các loại tài khoản cũ và không tự cấp toàn quyền PM cho User được chỉ định làm đầu mối.

Đề xuất trong cấu hình dự án có hai nhóm trách nhiệm: **Tiếp nhận/xác nhận spec (BA/BrSE)** và **Điều phối xử lý Bug (PM Dev)**. Admin dự án/Admin tổng quản lý danh sách; người được chọn phải là thành viên đang hoạt động và được phép thao tác. Danh sách có thể gồm User thường theo xác nhận mới của người dùng. Guest vẫn chỉ xem báo cáo, không tham gia xử lý/bình luận nội bộ.

Ma trận dưới đây là đề xuất để duyệt, không mặc định mọi User đều sửa mọi ticket:

| Người trong luồng | Thao tác đề xuất |
| --- | --- |
| Người phát hiện/tạo ticket | Tạo, sửa nội dung được phép, chọn đầu mối lúc tạo; mặc định là người xác nhận lại |
| BA/BrSE được giao QA | Trao đổi; chuyển QA thành Bug kèm chọn đầu mối PM Dev; đóng QA không được hỗ trợ kèm giải thích |
| Đầu mối PM Dev | Phân công/chuyển giao cho người xử lý Bug thuộc dự án; quyết định không xử lý kèm lý do |
| Người xử lý Bug | Chuyển Đang xử lý; chuyển Đóng–Đã xử lý nếu đã xử lý; chuyển Chờ xác nhận nếu không tái hiện được |
| Người xác nhận lại | Đóng–Đã sửa, Đóng–Không thể tái hiện hoặc mở lại Chưa xử lý theo kết quả kiểm tra |
| User/đầu mối/quản lý khác trong dự án | Được bình luận; không tự có quyền thay trạng thái/phân công chỉ vì được bình luận |
| Admin dự án/Admin tổng | Điều phối và xử lý thay theo quyền quản lý, mọi thay đổi được ghi lịch sử |

Cần giữ người xác nhận riêng với người đang xử lý. Khi Dev bàn giao, ticket phải đến đúng người cần kiểm lại và phát thông báo. Nếu người tạo đã rời dự án/bị khóa, quản lý chọn người xác nhận thay; không giao cho tài khoản không hoạt động.

## 6. Luồng và lưu thay đổi

- QA: Xác nhận spec → trao đổi bằng bình luận, không đổi trạng thái chỉ vì có bình luận → xác nhận là lỗi thì chuyển cùng ticket thành Bug/Chưa xử lý và chọn đầu mối PM Dev; hoặc đóng QA/Không được hỗ trợ kèm giải thích.
- Chuyển QA thành Bug giữ mã ticket, URL, case, người tạo, thời gian và toàn bộ bình luận. Ghi sự kiện đổi loại riêng; không xóa QA rồi âm thầm tạo ticket trùng.
- Bug: Chưa xử lý → phân công người xử lý → Đang xử lý → Đóng/Đã xử lý → người xác nhận kiểm lại → Đóng/Đã sửa hoặc mở lại Chưa xử lý.
- Nhánh không tái hiện: Đang xử lý → Chờ xác nhận → tester kiểm lại → Đóng/Không thể tái hiện hoặc Chưa xử lý nếu tái hiện được.
- Không xử lý: đóng với lý do Không xử lý, có giải thích quyết định. Sơ đồ không nối rõ nhánh này; quyền quyết định của đầu mối/quản lý trong mục 5 là đề xuất.
- Mở lại phải ghi lịch sử và xóa lý do đóng ở trạng thái hiện tại, không xóa lý do/bằng chứng cũ khỏi lịch sử. Đề xuất giữ đầu mối PM Dev để phân công lại theo sơ đồ.
- Tạo/cập nhật ticket không tự đổi NG/OK của case. Người kiểm thử ghi kết quả case theo luồng hiện hành; tránh đóng một ticket làm tất cả ticket/case liên quan bị coi là đạt.

Trên màn hình, phần trên là nội dung ticket và nút **Chỉnh sửa / Lưu / Hủy**. Phần dưới là lịch sử trao đổi. Ô soạn comment nằm bên trái; các dropdown **Trạng thái**, **Phân công cho**, **Lý do đóng** nằm bên phải khi có quyền. Màn nhỏ chuyển thành một cột có nhãn đầy đủ.

Dropdown mặc định giữ giá trị hiện tại; bình luận thường không làm mất người nhận hay đổi trạng thái. Khi chọn Đóng mới hiện lý do đóng; tập lý do phụ thuộc Bug/QA và quyền ở bước đang làm. QA đổi thành Bug có hành động riêng “Xác nhận là Bug”, tránh đổi loại vô tình trong một comment.

Một lần lưu comment + trạng thái + phân công phải là một giao dịch: tất cả thành công hoặc tất cả giữ nguyên. Hệ thống ghi rõ ai đổi, trước/sau, lúc nào, kèm bình luận và giữ bản nháp khi lỗi. Dùng kiểm version hiện có để báo xung đột, không ghi đè phần người khác vừa sửa. Gửi lại sau lỗi mạng không tạo bình luận/ticket/thông báo trùng.

Kéo thả Kanban mở bước xác nhận cùng quy tắc này. Kéo vào cột đóng điền trước lý do tương ứng nhưng vẫn kiểm quyền, dữ liệu và lưu thành công trước khi chuyển thẻ.

## 7. Thông báo nội bộ

Đề xuất thêm thông báo trong ứng dụng cho người vừa được giao/được yêu cầu xác nhận, có mã/tiêu đề ticket, người giao, thời điểm, link và trạng thái đã đọc. Chỉ ghi thông báo sau khi giao dịch thành công; không thông báo mỗi lần đọc/reload hoặc bình luận không đổi người nhận. Phân công lại thì người mới nhận thông báo mới.

Không mặc định gửi email/chat ngoài. Một tài khoản vừa là người tạo vừa là người nhận không cần tự thông báo cho chính mình. Nội dung và link thông báo vẫn kiểm quyền hiện tại khi xem, nhất là sau khi thành viên rời dự án. Dữ liệu thông báo lưu trong DB, không chỉ toast biến mất sau reload.

## 8. Tác động và dữ liệu cũ

Phạm vi source cần sửa: contract và DTO; context case; validate/quyền/assignment/transition/comment của FeatureIssueService; cấu hình trách nhiệm theo dự án; form tạo/sửa, timeline bình luận, Kanban/bộ lọc/đếm tổng; báo cáo Admin/dự án/AI; kiểm tra ticket chưa kết thúc khi lưu trữ dự án; thông báo và bộ kiểm thử liên quan.

Cần migration **mới** cho dữ liệu bổ sung và ánh xạ workflow; không sửa V1–V38. Số migration phải được chọn lại từ source tại thời điểm triển khai, tránh trùng với Arena đang có kế hoạch. Không thay toàn bộ bảng trạng thái dùng chung mà chưa xét lịch sử/luồng đã nghỉ.

Trước khi ánh xạ ticket cũ phải thống kê theo loại/trạng thái và bằng chứng. Có thể ánh xạ chắc chắn một số nhãn tương đương, nhưng `closed` cũ không đủ để biết “Đã sửa” hay “Đã xử lý”; `resolved` cũ là trạng thái chưa kết thúc. Không tự coi mọi ticket cũ là tester đã xác nhận. Các trường hợp không xác định cần danh sách đối soát, giữ mã/trạng thái/lịch sử cũ để truy nguyên.

Đóng–Đã xử lý phải tiếp tục tính vào việc chưa nghiệm thu và điều kiện đối soát khi lưu trữ dự án. Giữ quyết định ngoại lệ lưu trữ có lý do của Admin đã được chốt trước; không bỏ blocker vì nhìn thấy chữ “Đóng”.

## 9. Quyết định và điểm còn cần làm rõ

1. **“No bug – ID bug trong test case”** là cột No/ID của case đang có, hay một cột mã Bug riêng trong Excel? Không đồng nhất mã case với mã ticket khi chưa rõ. Prefix trong mục 4 hiện là đề xuất nếu đó là ID case.
2. Ma trận quyền/người xác nhận mặc định và nhóm trách nhiệm theo dự án trong mục 5 được duyệt cùng yêu cầu triển khai; USER được chỉ định không có thêm toàn quyền PM.
3. Bộ trường bắt buộc khác nhau giữa Bug/QA được duyệt; thiếu version lịch sử hiển thị rõ, không tự gán version mới nhất.
4. Giữ Bug monkey không có case, nhập bằng chứng/version thủ công và không giả link/version; thuộc phạm vi đã duyệt.

## 10. Kiểm chứng cần có khi triển khai

- QA tạo đúng trạng thái/người nhận; User được chỉ định BA/BrSE xử lý được nhưng không có toàn quyền PM; người ngoài dự án và Guest bị chặn cả API.
- Bug tạo đúng mặc định; trạng thái khác lúc tạo tuân cùng quyền và lý do đóng; không có tổ hợp loại/trạng thái/lý do không hợp lệ.
- Copy đúng dữ liệu và version của từng case, bao gồm hai case cùng file nhưng khác version; snapshot không đổi khi nguồn test lại.
- QA → Bug giữ cùng ID/URL/lịch sử, đổi đúng người nhận và chỉ tạo một thông báo.
- Hai nhánh Dev xử lý xong/không tái hiện; tester xác nhận hết lỗi/không tái hiện/mở lại; Đang xử lý không thể là lý do đóng.
- Bình luận độc lập và bình luận kèm thay đổi, lưu lỗi/timeout/gửi lại/xung đột version không mất nháp hoặc tạo trùng.
- Chín cột, filter và pagination; đếm tổng từ toàn bộ tập phù hợp. Cột 4+5 là chờ xác nhận; cột 5 không tính vào nghiệm thu cuối; báo cáo/AI/archive dùng cùng định nghĩa.
- Dropdown trách nhiệm rỗng/người bị khóa/rời dự án có phản hồi rõ; không lặng lẽ gán người khác.
- Migration trên bản sao, giữ ID/lịch sử và migration cũ; trường hợp ánh xạ chưa rõ không biến mất hoặc bị tự xác nhận.

Skill → việc dùng → bằng chứng: **brainstorming** → phân loại thay đổi kiến trúc nghiệp vụ, đối chiếu source/sơ đồ, làm rõ Đã xử lý/Đã sửa và trách nhiệm User → mục 1–6; **api-design** → phân biệt tài nguyên, quyền, xung đột/idempotency và dữ liệu liên kết → mục 2, 4–8. Chưa chạy test sản phẩm mới vì chưa triển khai; các mục nghiệm thu trên là kế hoạch, không phải kết quả PASS.
