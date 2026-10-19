# Làm rõ FixReports trước khi viết prompt triển khai

Ngày cập nhật: 19/10/2026.

Trạng thái: ĐÃ CHỐT CÁC NỘI DUNG ĐƯỢC HỎI. Tài liệu này ghi nhận quyết định để viết prompt Codex; không phải bằng chứng đã triển khai hoặc kiểm thử hệ thống.

Bộ tài liệu giao việc: [kế hoạch triển khai FR-00–FR-12](2026-10-19-fixreports-implementation-plan.md) và [prompt Codex đọc báo cáo/kế hoạch rồi thực hiện](../prompts/2026-10-19-fixreports-codex-prompt.md). Bản làm rõ này là nguồn quyết định nghiệp vụ, kế hoạch là nguồn thứ tự công việc và nghiệm thu.

Nguồn: [FixReports.md](../../FixReports.md), review source ngày 18/10 và các câu trả lời trực tiếp của người dùng ngày 19/10/2026. Quyết định mới trong trao đổi được ưu tiên so với đề xuất ban đầu. Câu hỏi chưa trả lời vẫn là chưa chốt; không biến gợi ý thành quy tắc đã duyệt.

## Các quyết định đã xác nhận

### C01. Luồng quản lý kiểm thử mới

- Quản lý kiểm thử trở thành tab con của Bảng công việc.
- Mở tab này sẽ thấy ngay danh sách Feature của dự án, có tạo/xem/sửa/xóa Feature.
- Mở một Feature sẽ thấy các file test case, tương tự màn Thư viện test case hiện tại.
- Mở file sẽ vào chi tiết các case.
- Feature được người dùng mô tả là một đợt kiểm thử, không phải một chức năng sản phẩm; có tên, môi trường test/server và mô tả theo FixReports.
- Bỏ các phần cũ của Quản lý kiểm thử: Đợt kiểm thử, Kiểm thử lại, Công việc theo file và cách truy cập thư viện độc lập cũ; tổ chức lại theo luồng mới. Quy trình retest được người dùng xác nhận là bên ngoài, xem C07.
- Quyết định về luồng không bắt buộc một lựa chọn bảng/khóa/identity cụ thể trong database; thiết kế kỹ thuật phải dựa vào các nghiệp vụ đã chốt và source thực tế.

### C02. Chuyển dữ liệu cũ

- Người dùng chấp nhận thay đổi cấu trúc dữ liệu kiểm thử cũ vì đang làm lại luồng.
- Chỉ yêu cầu giữ dữ liệu file test case và nội dung case. Kết quả, người đã test, lịch sử sửa và issue liên quan không nằm trong phần được yêu cầu giữ khi chuyển dữ liệu kiểm thử cũ.
- Tạo Feature theo các đợt kiểm thử cũ rồi đưa file test case vào.
- Mỗi Feature có bản import/nội dung file riêng. Excel trùng nội dung giữa các Feature được phép; không dùng checksum cấp dự án để chặn nhu cầu này. Không dùng chung nội dung khiến sửa case ở một Feature làm thay đổi Feature khác.
- File dùng ở nhiều đợt cũ cần được đưa thành bản độc lập trong các Feature tương ứng theo nguyên tắc trên, có đối chiếu mapping và số lượng khi triển khai.
- Người dùng giao AI tự chọn cách hợp lý với file cũ chưa thuộc đợt nào. Quyết định trong phạm vi được giao: gom vào Feature “Dữ liệu cũ chưa phân đợt” của đúng dự án, ghi rõ nguồn chuyển đổi, không tự gán vào một đợt có ý nghĩa nghiệp vụ khác.
- Đây là yêu cầu cho phương án chuyển dữ liệu trong prompt tương lai, không phải yêu cầu chạy xóa/migration ở lượt làm rõ này. Không suy ra yêu cầu xóa dữ liệu ngoài phạm vi như tài khoản, dự án hoặc cấu hình AI.

### C03. Phân công theo file và phạm vi case

- Một file có thể có nhiều người phụ trách. Người dùng nêu một hoặc hai người; chưa xác nhận giới hạn cứng tối đa hai người.
- Mỗi người có phạm vi case mình đảm nhận; sau phân công, cột người test trong chi tiết file được tự điền theo case tương ứng.
- Tester được tự nhận cả file chưa có người và file đã có người.
- Các Tester tự điều chỉnh phạm vi của mình. Ví dụ được người dùng chốt: A sửa thành case 1–40 thì B làm case 41–60; A có thể chọn ranh giới khác và B điều chỉnh tương ứng.
- Không có yêu cầu tự chia case hoặc tự chuyển phần trùng sang người mới.
- Ví dụ xác nhận phạm vi cuối cùng tách nhau; thao tác lưu cần bảo đảm tính nhất quán. Không tự cho phép chồng lấn hoặc tự ghi đè phân công từ ví dụ này.
- Đổi người khi case đã có kết quả thì thêm/điền cột người test lần 2; không cần tạo lượt test mới. Không reset kết quả hoặc tạo execution/run mới chỉ vì thay phân công.
- Giữ hai cột: người test đầu tiên và người test lại gần nhất. Khi tiếp tục đổi người, cập nhật người test lại gần nhất; có lịch sử các lần thay đổi. Không sinh cột lần 3, lần 4 theo số lần đổi người.
- Không dùng việc tự điền người được giao để bịa người thực tế đã thực hiện hoặc lịch sử kinh nghiệm.

### C04. AI và quyền dữ liệu liên dự án

| Vai trò | Dữ liệu dự án được giao | Dữ liệu dự án ngoài phạm vi được giao |
| --- | --- | --- |
| ADMIN | Được dùng qua AI theo quyền quản trị | Được yêu cầu xem/trích xuất qua AI |
| PM | Được dùng qua AI | Được yêu cầu xem/trích xuất qua AI, kể cả dự án không tham gia |
| TESTER | Được AI hỗ trợ với thông tin, tài liệu và issue của dự án được giao, trong quyền hiện có | Chỉ dùng kinh nghiệm tổng hợp để hỗ trợ; không tiết lộ tên dự án, tên người, nội dung case/issue, số liệu riêng hoặc tài liệu của dự án ngoài quyền |
| DEV | Được AI hỗ trợ với thông tin, tài liệu và issue của dự án được giao, trong quyền hiện có | Cùng giới hạn như TESTER |

- AI dùng dữ liệu toàn hệ thống làm cơ sở hỗ trợ; chọn dự án/Feature xác định đối tượng nhận phân tích/gợi ý.
- Quyền mới được xác nhận cho việc khai thác qua AI; không tự mở thêm quyền sửa dữ liệu hay quyền mọi màn hình/API khác cho PM.
- AI chỉ gợi ý phân công để tham khảo; PM phân công hoặc Tester tự nhận.
- Căn cứ gợi ý theo FixReports: lịch sử thực hiện case/file, số lần kiểm thử, kinh nghiệm ở Feature khác, khối lượng/độ khó của file và phân bố người phụ trách. Không tự thêm hồ sơ chấm điểm năng lực hoặc ngưỡng kinh nghiệm chưa được yêu cầu. Phần AI nhận định phải phân biệt với dữ kiện có thật.
- Vì chuyển đổi cũ chỉ giữ file/nội dung, AI có thể thiếu lịch sử kinh nghiệm sau chuyển đổi. Phải nói rõ thiếu dữ liệu, dùng phần dữ liệu còn có hoặc phát sinh sau đó; không bịa lịch sử hay suy người giỏi chỉ từ tên. Khi thiếu cơ sở, đưa gợi ý phân bổ hợp lý để người dùng quyết định như FixReports yêu cầu.
- Giới hạn của TESTER/DEV đối với dự án ngoài quyền không được áp nhầm để che tài liệu/issue họ được phép xem trong dự án được giao.
- Prompt triển khai phải yêu cầu kiểm soát dữ liệu trước khi cung cấp cho AI và khi trả kết quả, không chỉ trông vào lời nhắc model. Cách thực hiện cụ thể sẽ được thiết kế sau khi chốt yêu cầu.

### C05. Status và tiến độ

- Đổi nhãn cột iPad thành Status; giữ vòng trạng thái Unexecuted → OK → NG → P → NA → Unexecuted.
- Đã test là mọi trạng thái khác Unexecuted, bao gồm OK, NG, P và NA.
- Tiến độ file = số case có Status khác Unexecuted / tổng case của file. NA nằm trong cả tử số và mẫu số; P cũng được tính đã test.
- Đây là quy tắc mới đã chốt, khác công thức thực thi cũ (OK + NG)/(tổng − NA). Prompt phải yêu cầu các số liệu của luồng mới nhất quán với quy tắc mới, không tiếp tục dùng công thức cũ do tái sử dụng code.
- Quy tắc khi tổng case bằng 0 phải được xử lý hợp lệ trong kỹ thuật; không bịa trạng thái hoàn thành từ phép chia không xác định.
- Nút phía dưới Status chuyển thành Issue theo C06. Không hiểu yêu cầu thay nút là bỏ khả năng sửa nội dung các ô case khác.

### C06. Issue từ case

- Bấm Issue mở form tạo, tự điền Feature tương ứng, tên file, case, các bước thực hiện và kết quả mong muốn.
- Tester tự điền các trường còn lại; chỉ được chọn Bug hoặc QA.
- Người dùng xác nhận chỉ giữ Bug/QA trên toàn hệ thống, gồm Bảng công việc, form và bộ lọc; bỏ Task/Công việc, Request/Yêu cầu, Improvement/Cải tiến khỏi luồng đang sử dụng. Contract/validation và các nơi tổng hợp phải được rà nhất quán. Không tự chuyển dữ liệu loại cũ thành Bug/QA bằng mapping chưa có căn cứ.
- Người dùng nhấn mạnh chỉ đặt chức năng tạo ở nơi cần thiết, không thêm nút “Thêm công việc” bừa ở các bảng. Các điểm tạo có căn cứ trong yêu cầu là nút Issue tại case và chức năng lỗi monkey test tại Quản lý lỗi. Không tự nhân bản điểm tạo trên các dashboard/bảng khác.
- Lưu xong quay về đúng case của file/Feature đang thao tác, cập nhật badge như FixReports mô tả.
- Badge đếm tất cả issue gắn với đúng case đó, không chỉ issue chưa đóng. Không gom theo tên file/nội dung tương tự để đưa issue của bản case thuộc Feature khác vào badge.
- Di chuột vào badge xem danh sách issue và mở chi tiết từng issue theo FixReports; thiết kế triển khai cần có thao tác tương đương bằng bàn phím/chạm.

### C07. Kiểm thử lại

- Trao đổi DEV/khách hàng và xác minh lại là quy trình bên ngoài; người dùng yêu cầu không đưa quy trình đó thành workflow code mới.
- Người dùng tự test lại, cập nhật Status và thêm ghi chú ở issue rằng đã xác nhận kiểm thử lại.
- Không tạo lượt test mới chỉ vì đổi người; dùng thông tin người test lần 2 theo C03.
- Khi bỏ luồng kiểm thử lại cũ, phải rà các điều kiện backend để thao tác được phép trong luồng mới không tiếp tục bị chặn vì thiếu retest request/coverage/run cũ. Không vì thế bỏ kiểm tra quyền, project/Feature/case scope hoặc xung đột phiên bản.
- Chưa tự đặt thêm trạng thái issue, điều kiện chuyển trạng thái hoặc quyền sửa/xóa ngoài yêu cầu đã chốt.

### C08. Quyền Feature/file, lưu trữ và môi trường

- PM và ADMIN được tạo/sửa/xóa Feature và import/xóa file. Backend enforce quyền; TESTER/DEV không có các quyền quản lý này chỉ vì nhìn thấy màn.
- Giữ project scope cho quyền quản lý; quyền AI liên dự án của PM ở C04 không tự biến thành quyền CRUD Feature/file ngoài dự án của PM.
- Xóa Feature là lưu trữ/ẩn khỏi danh sách đang sử dụng, dữ liệu còn và có thể khôi phục. Không xóa dây chuyền file/case/issue khi người dùng chọn xóa Feature.
- Môi trường test của Feature nhập tự do (tên/URL); không ép người dùng chọn tổ hợp danh mục environment/build/device cũ để tạo Feature hoặc dùng luồng mới.
- Các trường Feature có căn cứ hiện tại: tên, môi trường test, mô tả. Không tự thêm workflow trạng thái hoặc trường nghiệp vụ ngoài yêu cầu để lấp khoảng trống của đặc tả.
- Cách xóa file cần tuân theo yêu cầu giữ dữ liệu khi xóa; không thực hiện xóa cứng dựa riêng vào việc đã được cấp quyền thao tác xóa. Không đổi thiết kế cất giữ máy vật lý vì môi trường Feature nhập tự do.

### C09. Danh sách thành viên và bàn giao thiết bị

- “Thành viên chưa bàn giao” được người dùng chốt là người chưa thuộc bất kỳ dự án nào. Danh sách chọn thành viên ở màn Admin liên quan chỉ hiện nhóm người này, không phải chỉ loại người đã thuộc dự án đang chọn hoặc lọc theo người chưa nhận máy.
- Đây là yêu cầu lọc danh sách chọn; không tự suy thành yêu cầu phá các membership cũ hoặc thêm ràng buộc unique toàn hệ thống khiến các membership hiện có mất hiệu lực.
- Bàn giao máy chỉ chọn PM làm người nhận; ghi nhận rõ PM nhận những thiết bị nào và các thông tin bàn giao cần thiết đã có.
- Admin giao các máy được chọn cho một PM theo luồng ban đầu. PM tự quản lý/phân phối nội bộ bên ngoài phần mềm; người dùng nói rõ không đưa hoạt động phân lại cho member vào code.
- Không tạo UI/API mới cho PM chia máy/thu hồi/chuyển máy giữa member. Không bắt buộc Tester phải có allocation máy đứng tên mình để dùng luồng kiểm thử mới, vì phần mềm chỉ theo dõi PM nhận máy.
- Rà các nơi đang hiện hoặc phụ thuộc người giữ máy cấp member; cập nhật theo mô hình PM nhận máy. Không xóa định danh thiết bị hoặc bỏ thông tin bàn giao cho PM.

### C10. Báo cáo Markdown và giới hạn truy cập

- Người dùng chấp nhận nội dung đề xuất: thông tin dự án/Feature, tiến độ theo quy tắc mới, phân bố Status, Bug/QA, vấn đề cần chú ý và nhận xét/đề xuất của AI có căn cứ.
- Phạm vi tạo báo cáo chọn dự án và tùy chọn Feature; không chọn Feature thì báo cáo toàn dự án. Có xem trước và tải Markdown như FixReports.
- Báo cáo được chỉnh sửa và lưu, lần mở/tải tiếp theo phải phản ánh nội dung đã lưu. Người dùng diễn đạt “data sẽ lại lưu theo báo cáo mới được sửa”.
- Người dùng xác nhận báo cáo chỉ là văn bản; sửa rồi lưu cập nhật nội dung báo cáo, không thay dữ liệu nghiệp vụ gốc. Ví dụ sửa “10 lỗi” thành “8 lỗi” thì bản lưu/xem trước/tải có 8, còn danh sách issue và Status case giữ nguyên. Không hỏi lại điều này.
- TESTER/DEV không được xem màn Tổng hợp & Phân tích hoặc xuất báo cáo này; vẫn được hỏi chatbot về dự án được giao.
- Người dùng chấp nhận định nghĩa quyền cụ thể: được giải thích case, hỏi thông tin issue/phần việc trong phạm vi được xem; không được yêu cầu báo cáo quản trị toàn dự án, phân tích tổng hợp như màn Tổng hợp & Phân tích hoặc trích xuất dữ liệu hàng loạt. Khi bị chặn, trả thông báo không có quyền truy cập dữ liệu/chức năng đó.
- Giới hạn áp dụng ở backend và đường lấy dữ liệu/AI/export tương ứng, không chỉ ẩn menu hoặc nhờ model tự quyết câu hỏi nào là “sâu”. Thông tin công việc như tiến độ file trong phạm vi được xem không tự biến thành báo cáo quản trị bị cấm.

### C11. Note và giữ chatbot

- Note chung của dự án: PM/ADMIN được CRUD; các member khác chỉ xem/đọc. Giữ project scope, không suy quyền đọc Note riêng của dự án ngoài phạm vi từ quyền AI liên dự án.
- Chỉ thực hiện Note chung theo yêu cầu, không tự thêm đính kèm, hệ phân quyền riêng hoặc workflow phê duyệt Note.
- Bỏ mục Trợ lý AI ở thanh menu, giữ chatbot riêng đang dùng và khả năng cấu hình để AI tiếp tục hoạt động.
- Không hỏi lại có giữ chatbot hay không: người dùng đã nhấn mạnh phải giữ. Việc bỏ mục menu không phải xóa dịch vụ/chat history/provider/model/kết nối.
- Phương án bố trí trong phạm vi yêu cầu: bỏ mục Trợ lý AI ở menu Admin/workspace; nút “Cấu hình AI” trong toolbar chat mở panel tái sử dụng `AiSourceSelector` trong `AiConnections.jsx`. Không mở thêm mục AI chính trên thanh menu hoặc phát triển lại màn cấu hình không cần thiết.
- Nguồn đối chiếu: `Frontend/src/app/features/ai/AiConnections.jsx:20,62,80`, `AiChat.jsx:154,155,173`; backend `AiProviderGateway.java:56`, `AiProviderController.java:17`, `LocalAiAccess.java:40`, `OpenAiConfiguration.java:21`.
- Giữ khả năng cấu hình theo tài khoản/provider do backend trả về, không tự đặt mọi cấu hình thành ADMIN-only. Kết nối ChatGPT cá nhân giữ điều kiện local owner/localhost; key/endpoint hệ thống vẫn server-side, không thêm form làm lộ secret.
- Đổi nguồn/model áp dụng cho hội thoại mới theo cơ chế hiện có, không đổi ngầm hội thoại đang gửi hoặc lịch sử đã ghim provider/model/phạm vi. Giữ bản nháp và lịch sử riêng của người dùng.

### C12. Tìm kiếm và nhật ký

- Người dùng chấp nhận phương án: tìm theo nhiều từ, không phân biệt hoa/thường hoặc dấu tiếng Việt, không cần đúng thứ tự nhưng phải khớp đủ các từ đã nhập (AND).
- Áp dụng nhất quán các ô tìm kiếm liên quan trong phạm vi FixReports; không làm bộ tìm kiếm mới không liên quan hoặc chỉ lọc trang hiện tại khi dữ liệu được phân trang ở server.
- Nhật ký bỏ bộ chọn Loại sự kiện, thay bằng tìm từ trên người thực hiện/dự án/đối tượng/thao tác.
- Giữ bộ lọc Từ ngày–Đến ngày, bỏ bộ chọn múi giờ, cố định giờ Việt Nam (Asia/Ho_Chi_Minh). Ngày kết thúc bao gồm trọn ngày theo múi giờ này; kiểm tra cả query backend và hiển thị.

### C13. Lỗi monkey test

- Là Bug thuộc đúng Feature của lần kiểm thử phát hiện lỗi, không gán sang Feature khác. Không bắt buộc có case vì kiểm thử khám phá có thể phát hiện lỗi ngoài case đã viết.
- Có thể ghi “monkey test” hoặc nội dung tương tự trong tiêu đề tự do; không bắt buộc tiền tố và không tạo loại issue MONKEY mới ngoài Bug/QA.
- Người dùng đồng ý: Tester tạo/sửa/xóa mềm lỗi mình tạo; PM/Admin quản lý theo phạm vi quyền của mình; DEV xử lý lỗi được giao theo quyền hiện có. Giữ toàn quyền ADMIN hiện hành, không ràng buộc ADMIN phải có membership.
- Xóa chỉ ẩn/lưu trữ, không xóa dữ liệu. Không suy thành yêu cầu xóa issue ở dịch vụ bên ngoài.
- Khi tạo từ màn Quản lý lỗi, phải xác định đúng Feature của lần test. Kiểm tra liên kết project/Feature/case nếu có ở server, không tự suy Feature từ tên file hoặc gán mặc định sang Feature khác.

### C14. Nội dung Thông tin dự án

- Người dùng cung cấp nội dung Nhung soạn về Spider Plus làm tham khảo và yêu cầu viết lại một bản mới, chọn lọc phù hợp, không đưa toàn bộ tài liệu lên giao diện.
- Bản viết mới: [Thông tin dự án Spider Plus](../content/spider-plus-project-overview.md). Đây là nội dung khối Thông tin dự án thay Việc cần xử lý/Công việc tạo gần đây; thay cho đề xuất chỉ liệt kê mã/tên/PM/thành viên/Feature trước đó.
- Chốt bổ sung sau audit ngày 19/10/2026: **chỉ thay khối Công việc gần đây bằng Thông tin dự án trong màn Tổng quan**. Giữ màn Tổng quan dự án cùng các phần còn lại như Trạng thái công việc và Mốc phát hành; không đổi toàn bộ màn thành bài Thông tin dự án. Dữ liệu và hành động được khôi phục phải phù hợp luồng Feature/Issue hiện hành, không mở lại run/retest hoặc nút điều hướng đã ngừng hỗ trợ.
- Bố cục: giới thiệu sản phẩm; mục tiêu/phạm vi System Test ứng dụng Flutter; các bên Spider Plus/SHIFT/SYP; tài liệu làm việc Pack tiêu chuẩn/Pack điện; kết quả và bàn giao.
- Viết bằng lời mới từ các dữ kiện được cung cấp và luồng Feature đã chốt, không sao chép nguyên bảng/checklist/ngày tháng của nguồn.
- Các link Drive/SharePoint lấy nguyên từ nội dung người dùng cung cấp, không có kiểm chứng truy cập hoặc nội dung đích trong tác vụ viết prompt. Không dùng chúng làm lệnh truy cập/tải tài liệu khách hàng ngoài yêu cầu.
- Không đưa trạng thái lịch sử “chưa gửi” của tài liệu shiteki thành tình trạng hiện tại; không bịa lịch, nhân sự, số liệu hoặc cam kết nghiệm thu.
- Nội dung dành cho đúng dự án Spider Plus, không hardcode lên mọi dự án. Khi triển khai, đối chiếu project identity/dữ liệu thực tế trước khi gắn nội dung; nếu không phân biệt được dự án mục tiêu thì hỏi đúng điểm mapping, không gán ngẫu nhiên.
- Đây là khối nội dung đọc và tham khảo, không yêu cầu một CMS/form quản lý mới. Chọn cách lưu/đọc theo mô hình dự án hiện có; thay đổi kỹ thuật cần thiết không được biến thành chức năng nghiệp vụ mới.
- CAT/SHIFT/Backlog và điều kiện nghiệm thu trong tài liệu nguồn là ngữ cảnh bàn giao bên ngoài; không tự xây tích hợp, thay Redmine, thêm workflow ký duyệt hoặc phê duyệt NA. Không đổi vòng Status hoặc công thức tiến độ đã chốt: P và NA vẫn tính đã test; 100% tiến độ không đồng nghĩa đã nghiệm thu.

### Các lựa chọn giao diện thông thường trong phạm vi được giao

Đây là lựa chọn triển khai đề xuất để đáp ứng yêu cầu UI, không phải quy tắc nghiệp vụ mới:

- Giảm hiển thị vai trò trùng ở Admin bằng cách giữ bảng có Tổng/Hoạt động, bỏ biểu đồ lặp cùng số liệu; giữ thông tin khác không trùng.
- Cố định menu bên Admin khi cuộn nội dung, bảo đảm menu dài vẫn cuộn được và dùng được ở viewport nhỏ.
- Việt hóa “Bảng Kanban” thành “Bảng trạng thái”; giữ chuyển đổi bảng/danh sách bên trong, thay mục Danh sách độc lập bên ngoài bằng Quản lý kiểm thử.
- Khối Thông tin dự án dùng bản viết mới tại C14; chỉ bổ sung cách trình bày phù hợp với giao diện đang có, không nhân bản toàn bộ tài liệu nguồn.

## Kết quả làm rõ các câu hỏi

Mã Q giữ theo review đầu tiên để đối chiếu câu trả lời. Q08 và Q19 đã nhận câu trả lời cuối; không còn câu hỏi đang chờ trong danh sách này. Khi triển khai chỉ hỏi điểm phát sinh thực sự chưa được quyết định, không mở lại các quyết định đã có.

| Mã | Trạng thái | Quyết định và phạm vi |
| --- | --- | --- |
| Q01 | ĐÃ CHỐT | Luồng Feature; PM/ADMIN CRUD và import/xóa file; Feature xóa mềm có khôi phục; trường tên/môi trường/mô tả. Không tự tạo workflow trạng thái Feature. |
| Q02 | ĐÃ CHỐT | Mỗi Feature có bản import/nội dung độc lập, trùng Excel giữa Feature được phép. File cũ chưa có đợt: người dùng giao tự quyết hợp lý; dùng Feature “Dữ liệu cũ chưa phân đợt” trong đúng dự án. |
| Q03 | ĐÃ CHỐT CỐT LÕI | Môi trường Feature nhập tên/URL tự do, không bắt buộc chọn bộ danh mục build/device/environment. Không tự phát triển thêm hệ quản lý cấu hình thay thế. |
| Q04 | ĐÃ CHỐT | Nhiều người/file, tự nhận, tự sửa dải case; đổi người sau kết quả không tạo lượt mới; giữ hai cột người đầu tiên/người test lại gần nhất, có lịch sử. |
| Q05 | ĐÃ CHỐT | Giữ vòng Status; đã test = khác Unexecuted, gồm P và NA; tổng case gồm NA. Màn xem nhiều Feature dùng tiến độ theo quy tắc này, không cần tự thêm chỉ số kinh doanh chưa yêu cầu. |
| Q06 | ĐÃ CHỐT | Form tự điền ngữ cảnh/steps/expected; chỉ Bug/QA toàn hệ thống; badge tất cả issue đúng case. Điểm tạo bám case/monkey theo yêu cầu, không nhân bản nút tạo ở các bảng khác. |
| Q07 | ĐÃ CHỐT | Retest là quy trình bên ngoài, không code workflow đó; người dùng tự cập nhật Status và ghi chú issue. Rà bỏ ràng buộc luồng retest cũ ngăn hành vi mới, giữ kiểm tra quyền và tính toàn vẹn. |
| Q08 | ĐÃ CHỐT | Monkey Bug thuộc đúng Feature của lần test, không bắt buộc case; có thể ghi monkey test trong tiêu đề, không thêm loại issue. Tester CRUD mềm lỗi mình, PM/ADMIN theo quyền hiện có, DEV xử lý lỗi được giao; xóa chỉ ẩn. |
| Q09 | ĐÃ CHỐT | Phân quyền AI theo C04. Không hỏi lại quyền PM/Admin truy xuất dự án ngoài membership hoặc giới hạn thông tin liên dự án của TESTER/DEV. |
| Q10 | ĐỦ PHẠM VI THEO FIXREPORTS | AI dùng lịch sử/kinh nghiệm/khối lượng/độ khó làm cơ sở đề xuất, nói rõ thiếu dữ liệu và phần suy luận; không tự thêm hệ chấm điểm năng lực. Khi thiếu lịch sử sau chuyển đổi không được bịa kinh nghiệm; phân biệt bản case và nguồn file để tránh gán nhầm người từng test. |
| Q11 | ĐÃ CHỐT | TESTER/DEV được hỏi case/issue/phần việc trong quyền; không xem/tạo/xuất báo cáo quản trị, phân tích tổng hợp hoặc trích xuất hàng loạt. Không để model tự đoán “sâu”. |
| Q12 | ĐÃ CHỐT | Nội dung theo C10; chỉnh sửa/lưu văn bản báo cáo, xem trước/tải đúng bản lưu; không thay dữ liệu nghiệp vụ gốc. |
| Q13 | ĐÃ CHỐT MỤC TIÊU | Bỏ mục menu Trợ lý AI, giữ chatbot và cấu hình để hoạt động; tái sử dụng quyền/cấu hình hiện có, bố trí đường vào từ chat. |
| Q14 | ĐÃ CHỐT | PM/ADMIN CRUD Note chung, member khác chỉ đọc. Không tự thêm chức năng phụ chưa yêu cầu. |
| Q15 | ĐÃ CHỐT | Danh sách chọn chỉ hiện người chưa thuộc bất kỳ dự án nào; không hiểu thành chưa nhận máy hoặc chưa thuộc riêng dự án đang chọn. |
| Q16 | ĐÃ CHỐT | Bàn giao chỉ cho PM, lưu rõ máy và thông tin bàn giao; PM quản lý/phân lại bên ngoài, không code chức năng phân máy cho member. |
| Q17 | ĐÃ CHỐT | Nhiều từ AND, không phân biệt hoa/thường/dấu, không cần đúng thứ tự. |
| Q18 | ĐÃ CHỐT | Nhật ký tìm theo người/dự án/đối tượng/thao tác, giữ Từ ngày–Đến ngày, cố định giờ Việt Nam và bỏ selector múi giờ. |
| Q19 | ĐÃ CHỐT | Viết mới nội dung Thông tin dự án dựa trên tài liệu Nhung về Spider Plus; dùng bản chọn lọc C14, không chỉ liệt kê metadata và không dán toàn bộ nguồn. Nhãn Kanban, giảm trùng vai trò và menu cố định là lựa chọn UI thông thường nêu trên. |

## Skill được chỉ định trong prompt

Đã đối chiếu file SKILL.md cài trên máy trong lượt review 18/10. Khi triển khai phải đọc skill thực tế, dùng theo giai đoạn; không coi danh sách sau là bằng chứng đã thực hiện review/test.

- Matt Pocock: `grill-with-docs`, `domain-modeling` cho làm rõ/thuật ngữ; `codebase-design`, `to-spec` cho thiết kế/đặc tả; `implement`, `tdd`, `code-review` cho triển khai/kiểm thử/review; `handoff` khi bàn giao.
- Superpowers: `using-superpowers`, `brainstorming` khi cần so sánh phương án, `writing-plans`, `systematic-debugging`, `test-driven-development`, `requesting-code-review`, `receiving-code-review`, `verification-before-completion`.
- Backend/contract/chuyển đổi: `api-design`, `security-review`, `deprecation-and-migration`, áp dụng cho Java/Spring Boot/MySQL/Flyway hiện có. `backend-patterns` cài trên máy có ví dụ Node/Express/Next.js; không dùng làm lý do đổi stack.
- Frontend/UI/UX: `frontend-patterns`, `frontend-ui-engineering`, `impeccable`, `ui-ux-pro-max` khi cần tham khảo thiết kế cụ thể.
- Kiểm chứng: `e2e-testing`, `verification-loop`; cùng dùng bằng chứng với workflow TDD/verification chính, tránh kiểm thử lặp chỉ vì có nhiều skill.
- Spec/plan lưu cục bộ theo quy ước repo. Các bước mặc định commit/issue trong skill không tạo quyền commit/push/merge/deploy/PR/issue ngoài tác vụ.

## Phạm vi công việc hiện tại

- Chỉ đọc source/tài liệu, review cách hiểu, ghi quyết định, viết nội dung giới thiệu và hoàn thiện prompt.
- Chưa sửa source nghiệp vụ, chạy app/test, thay quyền AI thực tế hoặc chạy migration/xóa dữ liệu.
- Không thay STATUS.json hoặc trạng thái sprint chỉ vì có tài liệu làm rõ.
- Prompt cuối phải phân biệt: quyết định đã chốt, đề xuất đang đợi trả lời, tiêu chí nghiệm thu và bằng chứng thực chạy. Không khóa toàn bộ backend/schema ở trạng thái giữ nguyên vì yêu cầu có thay đổi domain, quyền và dữ liệu.
- Đầu ra: [prompt Codex](../prompts/2026-10-19-fixreports-codex-prompt.md) và [nội dung Thông tin dự án viết mới](../content/spider-plus-project-overview.md). Chưa thực thi các chỉ dẫn triển khai nằm trong prompt.
