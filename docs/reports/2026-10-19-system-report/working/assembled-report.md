# Lời nói đầu

Hệ thống TMS hỗ trợ quản lý kiểm thử phần mềm trong phạm vi dự án. Trọng tâm hiện hành là tổ chức dữ liệu theo dự án, Feature, file và case; phân công trách nhiệm; ghi kết quả; theo dõi Bug/QA; tổng hợp báo cáo và hỗ trợ tra cứu bằng AI theo quyền. Báo cáo này trình bày bài toán, mô hình nghiệp vụ, kiến trúc và mức độ kiểm chứng của hệ thống tại baseline ngày 19/10/2026.

Báo cáo sử dụng cấu trúc ba chương của tài liệu mẫu, viết lại nội dung theo hệ thống TMS. Các mô tả học viên, cố vấn du học, hồ sơ ứng tuyển, điểm IELTS/SAT, thanh toán và đồng bộ LMS trong mẫu không thuộc phạm vi hệ thống đang khảo sát. Thông tin tác giả, giảng viên và đơn vị trên bìa được dành để người sử dụng bổ sung; không lấy thông tin nhận diện của tài liệu mẫu làm thông tin của dự án.

Mỗi kết luận được phân biệt theo nguồn: yêu cầu đã xác nhận thể hiện hành vi mong muốn; source thể hiện implementation; test và bản ghi runtime thể hiện phạm vi đã được kiểm chứng. Các chức năng legacy còn nằm trong repository nhưng đã ngừng nhận thao tác không được mô tả như chức năng đang sử dụng. Kế hoạch hoàn thành một task không thay cho bằng chứng nghiệm thu.

Phiên bản khảo sát là nhánh system-design, commit 9ccc73483faddde48d930c9607f2f2f7f6981761. Tác vụ biên soạn không sửa sản phẩm, không ghi database, không chạy migration, không khởi động lại dịch vụ và không gửi dữ liệu nghiệp vụ đến dịch vụ AI. Các số liệu kiểm thử trong chương 3 là bằng chứng lịch sử đã đối chiếu, không phải test vừa chạy trong tác vụ viết báo cáo.

Tài liệu mẫu bị cắt phần ZIP. XML nội dung chính và 54 thành phần có CRC đúng đã được đọc, nhưng 35 ảnh tham chiếu chưa được khôi phục đầy đủ. Bản báo cáo TMS sử dụng sơ đồ mới có nguồn chỉnh sửa được. Công cụ render Word quy định hiện thiếu LibreOffice trong runtime Codex Windows, vì vậy chưa xác nhận bố cục tất cả trang; số trang mục lục không được suy từ XML hoặc cache của tài liệu mẫu.

# Chương 1 Tổng quan bối cảnh và đề tài nghiên cứu

## 1.1 Bối cảnh tổ chức và hoạt động kiểm thử

### 1.1.1 Thông tin và phạm vi có căn cứ

Repository mô tả TMS như công cụ nội bộ hỗ trợ nhóm kiểm thử. Tài liệu nghiệp vụ về Spider Plus xác định ba bên: Spider Plus sở hữu sản phẩm, SHIFT cung cấp test case và điều phối nghiệp vụ, SYP thực hiện kiểm thử và ghi nhận vấn đề. Đây là bối cảnh của một dự án được quản lý trong TMS, không đồng nghĩa TMS là sản phẩm Spider Plus hoặc mọi dự án có cùng khách hàng.

Nguồn hiện có không đủ để xác nhận pháp nhân, địa chỉ, năm thành lập, số nhân sự hoặc cơ cấu tổ chức của đơn vị thực tập cho báo cáo này. Vì vậy mục giới thiệu đơn vị và sơ đồ tổ chức doanh nghiệp trong mẫu được giữ vai trò nhưng chưa điền dữ kiện ngoài nguồn. Không dùng mô tả Enlightening để thay thế thông tin SYP hoặc đơn vị thực tập của tác giả.

### 1.1.2 Tổ chức trách nhiệm trong hệ thống

TMS phân biệt vai trò tài khoản và vai trò thành viên dự án. ADMIN quản lý tài khoản, dự án, thành viên và thiết bị, đồng thời có quyền quản trị nghiệp vụ trên các dự án. PM điều phối dự án trong phạm vi được giao. TESTER thực hiện kiểm thử và ghi nhận Issue; DEV xử lý Issue được giao. Tên vai trò này mô tả quyền phần mềm, không phải sơ đồ phòng ban của doanh nghiệp.

Đối với quyền tạo tài khoản, PM chỉ được tạo TESTER nếu ADMIN cấp riêng quyền này. Quyền AI của PM có thể đọc dữ liệu liên dự án theo quyết định đã chốt, nhưng không mở rộng quyền sửa dữ liệu, quản lý Feature hoặc xuất báo cáo của dự án khác. Ranh giới này cần được giữ khi thiết kế Use Case và trình bày ma trận quyền.

### 1.1.3 Sản phẩm và hoạt động liên quan

Spider Plus phục vụ các hạng mục kiểm tra ở công trường, gồm bản vẽ, shiteki, điện, cốt thép và độ rọi. Phạm vi System Test được mô tả cho ứng dụng Flutter trên iPad, iPhone và thiết bị Android; phần Web PC chủ yếu được giữ nguyên. Những dữ kiện này lấy từ nội dung dự án đã được xác nhận, không phải kết quả khảo sát độc lập thị trường hoặc tài liệu khách hàng đã mở kiểm tra.

TMS lưu và trình bày nội dung giới thiệu đúng dự án Spider Plus. Màn Tổng quan vẫn giữ trạng thái công việc và mốc phát hành; chỉ khối Công việc gần đây được thay bằng Thông tin dự án. Không mô tả toàn bộ dashboard đã trở thành trang giới thiệu sản phẩm.

### 1.1.4 Thực trạng dữ liệu và nhu cầu quản lý

Nguồn test case được nhập từ Excel. Khi một workbook được dùng ở nhiều đợt, nhóm cần quản lý từng bản nội dung, phân công, kết quả và Issue độc lập. Người dùng đã yêu cầu nhìn theo file thay vì chọn từng case rời rạc; nhập phạm vi như 1–35; cập nhật Status bằng thao tác trực tiếp; có phản hồi rõ khi lưu, lỗi hoặc xung đột.

Các yêu cầu và báo cáo audit cho thấy rủi ro chính nằm ở liên kết giữa màn hình, quyền và dữ liệu: phân công không được nhầm với người đã thực hiện, kết quả không được tự reset khi đổi người, badge Issue phải theo đúng bản case, và tổng hợp tiến độ phải dùng cùng công thức. Đây là các vấn đề có nguồn từ yêu cầu và source, chưa phải số liệu khảo sát định lượng về năng suất.

### 1.1.5 Quy trình kiểm thử và bàn giao hiện hành

PM hoặc ADMIN tạo Feature, nhập workbook và phân công phạm vi. TESTER có thể tự nhận phần chưa thuộc người khác rồi ghi Status trong file. Bug/QA được tạo từ case để giữ ngữ cảnh; lỗi khám phá có thể là Bug của Feature mà không cần case. DEV xử lý Issue được giao. Việc trao đổi với khách hàng và kiểm thử lại diễn ra ngoài workflow TMS; người dùng cập nhật Status và ghi chú xác nhận trong Issue.

Quy trình bàn giao qua CAT được nêu trong thông tin Spider Plus như một hoạt động bên ngoài. Không có căn cứ để mô tả TMS đã tích hợp CAT hoặc Backlog. Source có adapter Redmine từ mô hình cũ, nhưng không vì thế coi mọi Issue mới đều được tự đồng bộ ra Redmine.

## 1.2 Tổng quan đề tài

### 1.2.1 Dữ liệu vào và kết quả đầu ra

| Nhóm | Dữ liệu vào | Kết quả đầu ra |
|---|---|---|
| Quản trị | Tài khoản, dự án, thành viên, máy và PM nhận | Quyền truy cập, roster và lịch sử bàn giao |
| Kiểm thử | Feature, workbook, nội dung case, phạm vi người phụ trách | File độc lập theo Feature, phân công, Status và lịch sử |
| Theo dõi vấn đề | Nội dung Bug/QA, Feature/case liên quan, DEV được giao | Issue, trạng thái xử lý, bình luận và truy vết |
| Cộng tác | Note và thông tin dự án | Nội dung chung trong phạm vi dự án |
| Tổng hợp | Dữ liệu hiện hành và nội dung biên tập | Chỉ số tiến độ, báo cáo Markdown đã lưu/tải |
| AI | Câu hỏi, phạm vi được chọn và dữ liệu được phép | Trả lời hoặc gợi ý có giới hạn, không tự ghi nghiệp vụ |

### 1.2.2 Mục tiêu và kết quả có thể đánh giá

Mục tiêu chức năng là quản lý được một chuỗi công việc có ngữ cảnh xuyên suốt từ Feature đến case và Issue, đồng thời cung cấp tổng hợp có quyền truy cập phù hợp. Mục tiêu chất lượng có căn cứ gồm kiểm quyền ở backend, giữ dữ liệu khi lưu trữ, phát hiện xung đột khi cập nhật và phản hồi thao tác trên giao diện.

Chưa có nguồn xác nhận KPI tiết kiệm thời gian, SLA phản hồi, quy mô production hoặc tỷ lệ hài lòng. Báo cáo không tự gán các mục tiêu như giảm 50% thời gian hay hỗ trợ hàng nghìn người dùng đồng thời. Những nội dung đó cần được đo trong pilot hoặc UAT riêng.

### 1.2.3 Đối tượng hưởng lợi và giới hạn

| Đối tượng | Nhu cầu và lợi ích | Giới hạn |
|---|---|---|
| ADMIN | Kiểm soát tài khoản, dự án, tài sản và truy vết | Không đọc hộ hội thoại riêng qua API chat; luật toàn vẹn vẫn áp dụng |
| PM | Phân công, theo dõi tiến độ, xử lý thông tin và báo cáo | CRUD theo dự án; AI liên dự án là capability đọc riêng |
| TESTER | Nhận phạm vi, ghi kết quả, tạo Bug/QA, hỏi AI | Không quản lý Feature/file hoặc xuất báo cáo quản trị |
| DEV | Đọc ngữ cảnh và xử lý Issue được giao | Không ghi Status kiểm thử hoặc tự triage toàn dự án |
| Các bên ngoài | Nhận kết quả theo quy trình bàn giao đã thống nhất | Chưa có role khách hàng hoặc tích hợp CAT được chứng minh |

# Chương 2 Phương pháp luận và công cụ thực hiện

## 2.1 Phương pháp phân tích

### 2.1.1 Khái niệm và nguồn yêu cầu

| Thuật ngữ | Định nghĩa | Không đồng nhất với |
|---|---|---|
| Project | Phạm vi công việc, thành viên và dữ liệu | Một Feature hoặc một khách hàng mặc định |
| Feature | Đợt kiểm thử có tên, môi trường và mô tả | Chức năng sản phẩm, execution cycle cũ đang hoạt động |
| Document/file | Bản workbook đã nhập trong một Feature | Một tên file duy nhất xuyên các Feature |
| Case | Nội dung kiểm thử trong đúng bản file, có ID nội bộ và ID nguồn | Dòng Excel vật lý hay chỉ chuỗi tên case |
| Assignment | Trách nhiệm hiện tại đối với phạm vi case | Bằng chứng người đó đã thực hiện kiểm thử |
| Status | Kết quả hiện hành của case | Trạng thái xử lý Bug/QA |
| Issue | Bug hoặc QA gắn Feature, có thể gắn case | Task/Request/Improvement hoặc trạng thái NG tự chuyển thành lỗi |
| Report | Văn bản tổng hợp đã lưu, có phiên bản | Dữ liệu gốc thay đổi khi sửa câu chữ |
| Note | Nội dung chung theo dự án, thành viên đọc | Hội thoại riêng của AI |
| Evidence | Dữ liệu/chứng cứ của thao tác hoặc lần kiểm chứng | Mọi dòng trong kế hoạch hay kết quả test tự khai |

Yêu cầu được phân thành năm lớp: mục tiêu nghiệp vụ, nhu cầu stakeholder, chức năng, chất lượng và chuyển đổi dữ liệu. Quyết định C01–C14 là căn cứ chính cho nghiệp vụ mới. Khi source khác yêu cầu, báo cáo giữ cả hai mô tả và nêu tác động; không sửa sản phẩm để làm cho tài liệu khớp.

| Lớp | Trạng thái | Căn cứ và giới hạn |
|---|---|---|
| Business | Đã rõ mục tiêu | Theo dõi kiểm thử theo file/Feature, giảm thao tác rời rạc, phân biệt kết quả và Issue; chưa có KPI hiệu quả đo tại doanh nghiệp |
| Stakeholder | Đã rõ vai trò nội bộ | ADMIN, PM, TESTER, DEV; không mở tài khoản khách hàng/BrSE từ tài liệu tham khảo |
| Functional | Đã chốt phần cốt lõi | C01–C14, phạm vi R01–R08; implementation và kiểm chứng phải đối chiếu riêng |
| Non-functional | Có căn cứ một phần | Phân quyền phía server, không mất bản nháp khi lỗi, xung đột phiên bản, bàn phím/responsive; SLA tải, quy mô production và UAT chưa được xác nhận |
| Transition | Có quyết định và bằng chứng lịch sử | Giữ workbook/case, bản độc lập theo Feature, Feature dữ liệu cũ chưa phân đợt; ngoại lệ nguồn và case chưa có file vẫn còn |

### 2.1.2 Phương pháp phát triển và mô hình hóa

Đối chiếu được thực hiện qua hành trình UI → request → controller/service → dữ liệu → response → UI. Cách đọc này giúp tránh suy quyền chỉ từ nút ẩn hoặc suy một chức năng hoạt động chỉ vì controller tồn tại. Với database, migration được đọc theo thứ tự cùng các ALTER và truy vấn hiện hành; không chép CREATE ban đầu như schema cuối.

Báo cáo dùng Use Case cho mục tiêu người dùng, User Story/AC cho kết quả có thể nghiệm thu, sơ đồ trình tự cho giao tiếp xuyên tầng, sơ đồ dữ liệu cho quan hệ và sơ đồ trạng thái cho vòng Status thực sự tồn tại. Sơ đồ swimlane chỉ được gọi là mô tả quy trình; không gắn nhãn BPMN nếu không dùng đúng ký pháp. Các kiểm tra INVEST ghi rõ phụ thuộc và phần chưa thể ước lượng, không tự tạo ngày công.

## 2.2 Công nghệ và công cụ

| Thành phần | Cấu hình xác minh trong source | Vai trò |
|---|---|---|
| Frontend | React JavaScript, Vite | Hiển thị, hash route, state, gọi API |
| Backend | Java 21, Spring Boot 3.5.16 | API, quyền, transaction và nghiệp vụ |
| Persistence | Spring Data JPA và JdbcTemplate/store | Truy cập dữ liệu theo từng module |
| Database | MySQL, Flyway V1–V33 trong source | Schema, ràng buộc và migration |
| Workbook | Apache POI 5.5.1 | Đọc/ghi định dạng Excel được hỗ trợ |
| Bảo mật phiên | Spring Security và Spring Session JDBC | Session, CSRF và quyền hiện hành |
| Kiểm thử | JUnit/Spring test, Testcontainers, JaCoCo; Vitest phía frontend | Kiểm thử theo phạm vi; không đồng nghĩa đã dùng Docker cho runtime |
| Quản lý source | Git, nhánh system-design | Baseline, lịch sử và bảo toàn thay đổi |

Các phiên bản trên là khai báo source, không phải phép đo lại tiến trình đang chạy. Mục Supabase trong mẫu được thay bởi MySQL/Flyway. Mô tả Razor Pages, ASP.NET Core, EF Core và SQL Server cũng không phù hợp TMS. Figma và Draw.io không được nêu là công cụ đã tạo toàn bộ giao diện khi thiếu bằng chứng; sơ đồ báo cáo này được dựng cục bộ dưới dạng SVG và PNG từ nguồn có thể chỉnh sửa.

## 2.3 Phương pháp kiểm chứng và độ tin cậy

Kiểm kê bao phủ các module frontend, controller backend, migration và tệp test. Đọc sâu tập trung ở quyền, Feature/file/case, assignment, Status, Issue, báo cáo, Note, thiết bị và AI. Tệp dependency, build, cache và generated được loại khỏi đọc sâu; việc kiểm kê không có nghĩa đã hiểu từng dòng hay bấm mọi nút.

Mức bằng chứng gồm: quyết định đã xác nhận; implementation đã đọc; test code có assertion; báo cáo test lịch sử đã mở; và runtime lịch sử có thời điểm. Tác vụ này không chạy lại test sản phẩm, không đọc metadata DB đang dùng và không thực hiện UAT. Kiểm tra cấu trúc tài liệu và sơ đồ được thực hiện riêng với kiểm chứng ứng dụng.

# Chương 3 Phân tích thiết kế và đánh giá hệ thống TMS

## 3.1 Bài toán và yêu cầu

### 3.1.1 Phạm vi và vấn đề cần giải quyết

Luồng mới quản lý file/case bên trong Feature, thay đường truy cập độc lập và các workflow cycle/retest/file-work cũ. Việc giữ source và bảng lịch sử nhằm bảo toàn dữ liệu, không có nghĩa phải cho người dùng tiếp tục các lệnh cũ. Phân công theo dải case phải được kiểm soát xung đột; cập nhật kết quả và tạo Issue phải đúng identity của file/Feature.

### 3.1.2 Quy trình cải tiến

{{FIG:05-workflow}}

Quy trình ở Hình 1 tách trách nhiệm PM/ADMIN, TESTER và hệ thống. Luồng thay thế là Tester tự nhận phạm vi của mình. Khi trùng case hoặc phiên bản đã thay đổi, hệ thống từ chối ghi đè và yêu cầu người dùng đối chiếu. Hoạt động kiểm thử thực tế và trao đổi retest không được chuyển thành execution workflow mới chỉ để hoàn chỉnh sơ đồ.

### 3.1.3 Yêu cầu chức năng và business rules

| Mã | Nội dung đã chốt | Nguồn |
|---|---|---|
| FR-TMS-01 | Project → Feature → file → case; Feature có tên, môi trường tự do, mô tả | C01/C08 |
| FR-TMS-02 | Bản file/case độc lập giữa Feature, có archive và bảo toàn dữ liệu | C02/C08 |
| FR-TMS-03 | Nhiều Tester/file, phạm vi không trùng; tự nhận phần mình | C03 |
| FR-TMS-04 | Vòng Status năm giá trị; P/NA tính đã test; đổi người không reset | C03/C05/C07 |
| FR-TMS-05 | Chỉ Bug/QA; case Issue đúng ngữ cảnh; Monkey Bug có thể không case | C06/C13 |
| FR-TMS-06 | Danh sách chọn người chưa thuộc dự án; thiết bị bàn giao cho PM | C09 |
| FR-TMS-07 | Note chung; PM/ADMIN ghi, thành viên đọc | C11 |
| FR-TMS-08 | Báo cáo Markdown theo dự án/Feature, sửa văn bản độc lập dữ liệu nguồn | C10 |
| FR-TMS-09 | Chat riêng, chọn phạm vi, quyền dữ liệu trước và sau AI | C04/C10/C11 |
| FR-TMS-10 | Tìm kiếm AND nhiều từ không dấu; nhật ký trọn ngày Việt Nam | C12 |
| FR-TMS-11 | Tổng quan giữ trạng thái/mốc; chỉ thay khối việc gần đây | C14 |

Tiến độ = 100 × (OK + NG + P + NA) / tổng case. Nếu tổng case bằng 0, source trả 0%. Tỷ lệ OK trong source lấy OK / tổng case. Hai số này khác nhau và đều không là nghiệm thu. Ví dụ hai case chưa chạy, một OK, một P và một NA cho tiến độ 60%; không loại NA khỏi mẫu số.

Phân công tối đa một người chịu trách nhiệm hiện hành cho mỗi row, nhưng một file có thể có nhiều người. Hai cột người test đầu tiên và gần nhất không phải giới hạn hai người/file. Source hiện cập nhật thông tin first/latest ngay trong thay đổi phân công, kể cả chưa có kết quả; cần đọc lịch sử actor Status để biết ai thực sự ghi nhận. Đây là khác biệt cần lưu ý so với cách diễn đạt nghiệp vụ “đổi người sau khi đã test”.

### 3.1.4 Yêu cầu chất lượng và chuyển đổi

Hệ thống cần kiểm role, membership, ownership và trạng thái lưu trữ ở backend. Các lệnh có nguy cơ ghi đè dùng version; một số lệnh có requestKey để kiểm thao tác lặp. Đây là các cơ chế cụ thể đã có trong source, không chứng minh mọi lệnh có cùng chính sách idempotency.

Giao diện đã có các nhánh loading, lỗi, retry, pending và giữ nháp ở những luồng được đọc sâu. Các báo cáo audit vẫn giữ giới hạn về IME, touch thật, zoom 200%, screen reader và ma trận UAT theo vai trò/trạng thái. Không biến mong muốn “mượt mà” thành cam kết thời gian đáp ứng chưa đo.

Chuyển đổi V32/V33 tạo Feature từ cycle cũ và bản file/case độc lập; giữ workbook và nội dung case. Kết quả, assignment và lịch sử thực thi cũ không được dựng thành dữ liệu mới giả. Ngoại lệ thiếu workbook và case chưa có file được lưu lại để xử lý có căn cứ.

### 3.1.5 Vai trò và quyền

| Hành động | ADMIN | PM dự án | TESTER dự án | DEV dự án |
|---|---|---|---|---|
| Tạo account | Có | Chỉ PM hệ thống có quyền được cấp, chỉ tạo TESTER | Không | Không |
| Tạo dự án; quản lý thành viên | Có | Không | Không | Không |
| Đọc Feature/file/case và Issue thông thường | Có, không cần membership | Có | Có | Có |
| CRUD/archive/restore Feature; import/hide file; sửa cell nội dung | Có | Có | Không | Không |
| Phân công case | Quản lý các Tester | Quản lý các Tester | Chỉ tự đổi phạm vi mình, không ghi đè người khác | Không |
| Sửa Status | Có | Có | Chỉ row được giao | Không |
| Tạo Bug/QA, kể cả không từ case | Có | Có | Có | Không |
| Sửa nội dung Issue | Có | Có | Chỉ BUG Monkey chính mình tạo | Không |
| Xóa Issue | Chỉ soft-delete Monkey | Chỉ soft-delete Monkey | Monkey chính mình tạo | Không |
| Giao Issue cho DEV | Có | Có | Không | Không |
| Chuyển status Issue | Status hợp lệ theo loại | Như ADMIN | Chỉ Monkey của mình | Chỉ Issue được giao; progress/resolved |
| Comment Issue | Có | Có | Có | Chỉ Issue được giao; comment history cũng giới hạn |
| Note | CRUD | CRUD | Đọc | Đọc |
| Management report summary/lưu/sửa/export | Có | Có | Không | Không |
| Kho máy/bàn giao/thu hồi | Quản lý | Đọc allocation dự án | Đọc allocation dự án | Đọc allocation dự án |
| AI liên dự án | Mọi dự án | Mọi dự án qua AI | Chi tiết trong quyền; ngoài quyền chỉ aggregate an toàn | Như Tester, tác vụ riêng Dev kiểm assignee |
| Chat của tài khoản khác | Không có bypass owner trong API chat | Không | Không | Không |

ADMIN toàn quyền quản trị vẫn phải tuân thủ version, scope identity và luật toàn vẹn; điều đó không cấp quyền đọc hội thoại riêng qua API chat của tài khoản khác. Các hành động riêng với Monkey Bug và DEV được giao phải theo capability thực tế. Việc ẩn nút chỉ là hỗ trợ giao diện, không thay guard server.

### 3.1.6 User Story và Acceptance Criteria

Các story dưới đây diễn đạt lại quyết định đã chốt để bổ sung báo cáo. AC là kết quả nghiệp vụ cần đạt; sự tồn tại của AC không chứng minh đã kiểm thử. Phần INVEST đánh giá ranh giới và khả năng kiểm tra, không tự ước lượng ngày công.

#### US-TMS-01 Tạo Feature

As a PM phụ trách dự án, I want to tạo một Feature với môi trường test cụ thể, So that tôi tập hợp đúng file và Issue của đợt kiểm thử. Scope: tạo Feature trong dự án còn hoạt động; không gồm workflow đóng/mở cycle. Nguồn: C01/C08. Use Case: UC-TMS-01.

- AC1 Given PM thuộc dự án đang hoạt động, tên hợp lệ và môi trường/mô tả nếu có tuân theo giới hạn, When lưu Feature, Then Feature mới thuộc đúng dự án và xuất hiện trong danh sách.
- AC2 Given môi trường là tên server hoặc URL nhập tự do, When lưu Feature hợp lệ, Then không yêu cầu chọn build hoặc máy vật lý để hoàn tất.
- AC3 Given tài khoản TESTER hoặc DEV, When yêu cầu tạo Feature, Then thao tác bị từ chối và không có Feature mới.

#### US-TMS-02 Nhập file độc lập theo Feature

As a PM phụ trách dự án, I want to nhập cùng bộ Excel vào các Feature khác nhau, So that từng đợt giữ nội dung và kết quả riêng. Scope: preview và commit workbook; không chuyển hoặc xóa dữ liệu lịch sử. Nguồn: C02/C08. Use Case: UC-TMS-02.

- AC1 Given workbook hợp lệ và Feature đang hoạt động, When xác nhận nhập sau xem trước, Then file và case được tạo trong Feature đã chọn.
- AC2 Given workbook đã được nhập ở Feature A, When nhập cùng workbook vào Feature B, Then B có bản riêng và việc sửa case ở A không sửa nội dung của B.
- AC3 Given workbook thiếu thông tin case bắt buộc hoặc có ID nguồn trùng không hợp lệ, When yêu cầu nhập, Then hệ thống báo lỗi dữ liệu và không tạo bản nội dung đã xác nhận sai.

#### US-TMS-03 Tự nhận phạm vi case

As a TESTER thuộc dự án, I want to nhận hoặc điều chỉnh phạm vi case của mình trong file, So that nhóm biết tôi chịu trách nhiệm phần nào. Scope: phạm vi của chính người thao tác; không tự lấy phần người khác. Nguồn: C03. Use Case: UC-TMS-03.

- AC1 Given case 1–35 chưa thuộc người khác, When Tester nhận phạm vi 1–35, Then đúng các case tương ứng được giao cho Tester đó.
- AC2 Given một case trong phạm vi đã thuộc Tester khác, When lưu phạm vi bị trùng, Then không ghi đè phân công của người kia và người dùng nhận thông báo xung đột.
- AC3 Given Tester định thay phạm vi của người khác, When lưu thay đổi, Then thao tác bị từ chối và phân công hiện có được giữ.

#### US-TMS-04 Đổi người phụ trách sau kết quả

As a PM phụ trách dự án, I want to thay người phụ trách những case đã có kết quả, So that có người tiếp tục kiểm tra và truy được thay đổi trách nhiệm qua lịch sử. Scope: phân công, hai cột người test và lịch sử; không tạo execution mới. Hai cột là thông tin phân công, người thực ghi Status phải đối chiếu lịch sử kết quả. Nguồn: C03/C07. Use Case: UC-TMS-03.

- AC1 Given case đã có kết quả và người test đầu tiên, When PM đổi người phụ trách hợp lệ, Then kết quả hiện có được giữ và người test lại gần nhất được cập nhật.
- AC2 Given case đã đổi người nhiều lần, When đổi thêm lần nữa, Then giữ người test đầu tiên, cập nhật người test lại gần nhất và giữ lịch sử thay đổi, không phát sinh cột lần 3.
- AC3 Given dữ liệu phân công đã bị người khác thay đổi từ lúc mở form, When lưu bản cũ, Then hệ thống yêu cầu xử lý xung đột và không âm thầm ghi đè.

#### US-TMS-05 Ghi Status của case

As a TESTER đang phụ trách case, I want to thay Status của case bằng một thao tác, So that kết quả kiểm thử và tiến độ phản ánh công việc đã ghi nhận. Scope: Status case trong file đang hoạt động; không tự đổi trạng thái Issue. Nguồn: C05/C07. Use Case: UC-TMS-04.

- AC1 Given case đang Unexecuted và người dùng có quyền ghi, When bấm thay Status và lưu thành công, Then kết quả thành OK và hiển thị phản hồi đã lưu.
- AC2 Given case đang NA, When bấm thay Status, Then kết quả quay về Unexecuted và case không còn được tính là đã test; P/NA trước đó đều thuộc số đã test.
- AC3 Given DEV hoặc Tester không có quyền ghi case, When yêu cầu đổi Status, Then kết quả không thay đổi và hệ thống thông báo từ chối.
- AC4 Given phiên bản kết quả đã thay đổi hoặc yêu cầu lưu lỗi, When người dùng gửi thay đổi trên dữ liệu cũ, Then hệ thống không báo đã lưu, giữ hoặc phục hồi kết quả đã xác nhận và yêu cầu tải lại để đối chiếu.

#### US-TMS-06 Tạo Issue từ case

As a TESTER trong dự án, I want to mở Issue từ case đang kiểm tra, So that lỗi hoặc câu hỏi giữ đúng ngữ cảnh và có thể quay lại đối chiếu. Scope: Bug/QA liên kết đúng case; không tự tạo ở mọi dashboard. Nguồn: C06. Use Case: UC-TMS-05.

- AC1 Given đang mở case thuộc file và Feature cụ thể, When mở form Issue, Then Feature/file/case/các bước/kết quả mong muốn được điền từ đúng case.
- AC2 Given đã lưu Issue thành công, When quay lại case, Then badge phản ánh các Issue liên kết case đó, kể cả Issue đã đóng, không gộp bản case ở Feature khác.
- AC3 Given yêu cầu liên kết case không thuộc Feature đang chọn, When lưu Issue, Then yêu cầu bị từ chối và không tạo liên kết sai.

#### US-TMS-07 Ghi nhận Bug phát hiện ngoài case

As a TESTER đang kiểm thử một Feature, I want to ghi Bug phát hiện bằng kiểm thử khám phá, So that lỗi ngoài bộ case vẫn được theo dõi trong đúng đợt. Scope: Bug thuộc Feature, case không bắt buộc; không thêm loại MONKEY. Nguồn: C13. Use Case: UC-TMS-06.

- AC1 Given Feature hợp lệ trong dự án, When tạo Bug khám phá với mô tả hợp lệ và không chọn case, Then Bug được lưu trong Feature đã chọn.
- AC2 Given tiêu đề không có tiền tố monkey test, When lưu Bug hợp lệ, Then hệ thống vẫn chấp nhận và loại vẫn là Bug.
- AC3 Given Tester định sửa hoặc xóa mềm Bug do người khác tạo mà không có quyền tương ứng, When thực hiện thao tác, Then hệ thống từ chối.

#### US-TMS-08 Lưu Note chung

As a PM phụ trách dự án, I want to lưu Note chung, So that thành viên tra cứu cùng một thông tin làm việc. Scope: nội dung Note, không thêm đính kèm/phê duyệt. Nguồn: C11. Use Case: UC-TMS-07.

- AC1 Given PM có quyền trong dự án, When lưu Note hợp lệ, Then thành viên dự án đọc được nội dung đã lưu.
- AC2 Given Note đã bị chỉnh sửa sau lúc PM mở, When lưu bản cũ, Then không âm thầm ghi đè thay đổi mới.
- AC3 Given TESTER hoặc DEV đọc được Note, When yêu cầu sửa Note, Then hệ thống từ chối quyền ghi.

#### US-TMS-09 Lưu văn bản báo cáo

As a PM được phép xem phân tích dự án, I want to sửa và lưu báo cáo Markdown, So that lần xem và tải sau phản ánh bản báo cáo đã biên tập. Scope: văn bản báo cáo của dự án hoặc Feature; không ghi lại dữ liệu gốc. Nguồn: C10. Use Case: UC-TMS-08.

- AC1 Given báo cáo hợp lệ trong phạm vi quyền, When lưu nội dung đã sửa, Then mở lại và tải báo cáo cho cùng nội dung đã lưu.
- AC2 Given báo cáo có câu 10 lỗi, When sửa văn bản thành 8 lỗi và lưu, Then báo cáo thể hiện 8 lỗi nhưng dữ liệu Issue nguồn giữ nguyên.
- AC3 Given tài khoản TESTER hoặc DEV, When yêu cầu tạo hoặc xuất báo cáo quản trị, Then hệ thống từ chối kể cả truy cập trực tiếp.

#### US-TMS-10 Hỏi AI trong phạm vi được phép

As a TESTER thuộc dự án, I want to hỏi AI về case hoặc Issue được phép đọc, So that tôi có thêm thông tin hỗ trợ công việc. Scope: chat riêng và ngữ cảnh đã được cấp quyền, không dùng câu trả lời để tự phân công. Nguồn: C04/C10/C11. Use Case: UC-TMS-09.

- AC1 Given người dùng có quyền đọc case của dự án, When hỏi về case đó, Then ngữ cảnh riêng cấp cho AI chỉ chứa dữ liệu được phép và phần trả lời cần nói rõ khi không đủ nguồn cho kết luận; chất lượng ngữ nghĩa được kiểm chứng riêng.
- AC2 Given không chọn riêng dự án, When hỏi thông tin công việc, Then hệ thống xác định phạm vi theo quyền hiện hành; không khẳng định đã đọc mọi ô của mọi file khi ngữ cảnh bị giới hạn.
- AC3 Given TESTER yêu cầu thông tin riêng của dự án ngoài quyền hoặc báo cáo quản trị hàng loạt, When gửi câu hỏi, Then hệ thống từ chối phần không được phép và không cung cấp dữ liệu riêng đó.

#### US-TMS-11 Bàn giao máy cho PM

As an ADMIN quản lý kho máy, I want to bàn giao máy đã chọn cho PM, So that trách nhiệm nhận thiết bị của dự án được ghi nhận. Scope: kho máy và PM nhận, không quản lý PM phân lại cho thành viên. Nguồn: C09. Use Case: UC-TMS-10.

- AC1 Given các máy đã chọn còn sẵn sàng và một PM nhận hợp lệ, When xác nhận bàn giao cả lô, Then hệ thống lưu rõ tất cả máy đã chọn được bàn giao cho cùng PM đó.
- AC2 Given một máy đã không còn sẵn sàng khi lưu, When xác nhận lựa chọn cũ, Then có phản hồi kết quả/xung đột cụ thể và không báo toàn bộ thành công sai.
- AC3 Given người nhận là TESTER hoặc DEV, When yêu cầu bàn giao theo luồng này, Then thao tác bị từ chối.

#### US-TMS-12 Xem nhật ký theo ngày Việt Nam

As an ADMIN rà soát hoạt động, I want to tìm nhật ký bằng nhiều từ và khoảng ngày, So that truy được thao tác phù hợp mà không cần nhớ nguyên văn. Scope: bộ lọc nhật ký, không thay múi giờ hoặc xóa sự kiện. Nguồn: C12. Use Case: UC-TMS-11.

- AC1 Given nhật ký có các từ cần tìm trên người/dự án/đối tượng/thao tác, When tìm nhiều từ không dấu khác thứ tự, Then kết quả khớp đủ các từ, không phụ thuộc hoa thường hoặc dấu.
- AC2 Given chọn ngày kết thúc tại Việt Nam, When lọc nhật ký, Then khoảng tìm bao gồm hết ngày đó theo Asia/Ho_Chi_Minh.
- AC3 Given tài khoản không có quyền xem nhật ký quản trị, When yêu cầu truy cập dữ liệu, Then hệ thống từ chối.

#### Kiểm tra INVEST

| Story | I | N | V | E | S | T |
|---|---|---|---|---|---|---|
| 01 | Dự án tồn tại là tiền điều kiện | Không khóa cách thiết kế form | Tập hợp đúng đợt | Cần nhóm xác nhận effort | Một thao tác tạo | AC1–3 |
| 02 | Dùng Feature có sẵn | Không chốt công nghệ parser trong AC | Độc lập dữ liệu giữa đợt | Có contract, chưa ước lượng | Preview/commit là một hành trình; có thể tách UI nếu cần | AC1–3 |
| 03 | Dùng file có sẵn | Dải nhập hoặc chọn case không khóa pixel | Rõ trách nhiệm | Có quy tắc trùng phạm vi | Một lệnh nhận/điều chỉnh | AC1–3 |
| 04 | Dùng case có kết quả | Không chốt storage | Giữ truy vết | Có rule hai cột | Tách riêng khỏi nhận lần đầu | AC1–3 |
| 05 | Assignment là tiền điều kiện | Không khóa renderer | Ghi nhận tiến độ | Công thức rõ | Một cập nhật kết quả | AC1–4 |
| 06 | Case là tiền điều kiện | Không khóa bố cục form | Giữ ngữ cảnh lỗi | Có fields nguồn | Tạo và quay lại một hành trình | AC1–3 |
| 07 | Feature là tiền điều kiện | Không ép tiền tố tiêu đề | Theo dõi lỗi ngoài case | Quyền đã chốt | Một Bug khám phá | AC1–3 |
| 08 | Membership là tiền điều kiện | Không khóa editor | Cùng thông tin chung | Rule quyền rõ | Tập trung lưu Note | AC1–3 |
| 09 | Báo cáo có sẵn | Không khóa editor | Bản tải nhất quán | Có contract | Tách khỏi sinh AI | AC1–3 |
| 10 | Quyền/ngữ cảnh là tiền điều kiện | Không khóa model | Hỗ trợ công việc | Chất lượng model cần đánh giá riêng | Cần tách đánh giá AI thành công việc kiểm chứng | AC1–3; chưa chứng minh mọi câu hỏi tự nhiên |
| 11 | Máy/PM có sẵn | Không khóa bố cục chọn | Rõ người nhận | Rule bàn giao rõ | Một đợt bàn giao | AC1–3 |
| 12 | Nhật ký có sẵn | Không khóa công cụ tìm | Truy vết được | Semantics đã chốt | Một thao tác tìm | AC1–3 |

Không có story nào được tự ghi DONE qua bảng này. Quyền ADMIN xác nhận ngoại lệ lưu trữ dự án còn thiếu implementation được giữ trong danh sách hạn chế; không trộn vào hành trình đang hoạt động.

## 3.2 Mô hình hóa và kiến trúc

### 3.2.1 Ngữ cảnh hệ thống

{{FIG:01-context}}

Hình 2 mô tả người dùng nội bộ, dữ liệu Excel và các adapter AI/Redmine. AI nhận ngữ cảnh sau kiểm quyền; kết quả là nội dung hỗ trợ. CAT, SHIFT và Backlog là bối cảnh làm việc bên ngoài, chưa có căn cứ coi chúng là endpoint tích hợp của TMS.

### 3.2.2 Phân rã chức năng

{{FIG:03-modules}}

Nhóm kiểm thử, cộng tác và tổng hợp dùng chung identity dự án nhưng có quyền khác nhau. Backend vẫn chứa package legacy; chúng được phân loại riêng trong bản đồ source. Một controller còn trong source không đủ chứng minh lệnh ghi của nó đang mở.

### 3.2.3 Use Case tổng quát

{{FIG:04-use-cases}}

Các association trong sơ đồ chỉ thể hiện vai trò tham gia, không cấp toàn bộ CRUD cho vai trò đó. TESTER tham gia đọc Note nhưng không lưu Note; DEV tham gia Issue trong phạm vi được giao; PM xem báo cáo theo dự án. Ma trận ở mục 3.1.5 và đặc tả dưới đây là căn cứ về điều kiện chi tiết.

### 3.2.4 Đặc tả Use Case

#### UC-TMS-01 Tạo Feature

Actor: PM của dự án hoặc ADMIN. Mục tiêu: tạo feature. Liên kết: US-TMS-01.

Trigger: Chọn tạo Feature trong Quản lý kiểm thử.

Tiền điều kiện: Dự án đang hoạt động; tài khoản có quyền quản lý.

Luồng chính: Nhập tên và môi trường/mô tả phù hợp; lưu; hệ thống kiểm quyền và dữ liệu; Feature được tạo trong đúng dự án.

Luồng thay thế và ngoại lệ: Tên không hợp lệ: từ chối và giữ thông tin để sửa. Sai quyền hoặc dự án lưu trữ: không tạo. RequestKey dùng cho nội dung khác: xung đột.

Hậu điều kiện: Feature mới có identity và metadata; không sinh cycle/run.

Quy tắc và nguồn: C01/C08; FeatureService.create; FeatureController.

#### UC-TMS-02 Nhập workbook vào Feature

Actor: PM của dự án hoặc ADMIN. Mục tiêu: nhập workbook vào feature. Liên kết: US-TMS-02.

Trigger: Chọn nhập Excel trong Feature.

Tiền điều kiện: Feature/dự án còn hoạt động; người thao tác có quyền import.

Luồng chính: Chọn workbook; xem preview và lỗi; xác nhận bản hợp lệ; hệ thống tạo file/case/revision độc lập và trả summary.

Luồng thay thế và ngoại lệ: Sai format, thiếu trường hoặc ID nguồn trùng: báo lỗi. Preview hết hạn: yêu cầu nhập lại. Không phải người tạo preview: từ chối. Batch nhiều file có thể có thành công một phần.

Hậu điều kiện: File COMMITTED thuộc đúng Feature; workbook nguồn giữ riêng với nội dung hiện hành.

Quy tắc và nguồn: C02/C08; FeatureService.preview/getPreview/commit; TestCaseWorkbook.

#### UC-TMS-03 Phân công và tự nhận case

Actor: PM/ADMIN hoặc TESTER cho chính mình. Mục tiêu: phân công và tự nhận case. Liên kết: US-TMS-03, US-TMS-04.

Trigger: Mở form phân công từ file.

Tiền điều kiện: File/Feature/dự án đang hoạt động; Tester đích đang hoạt động trong dự án.

Luồng chính: Chọn người và dải case; hệ thống ánh xạ sang row đúng file; kiểm version và overlap; lưu trách nhiệm cùng lịch sử.

Luồng thay thế và ngoại lệ: Tester đổi người khác: từ chối. Dải ngoài file hoặc trùng phạm vi: không ghi đè. Version cũ: giữ lựa chọn và yêu cầu đối chiếu.

Hậu điều kiện: Assignment thay đổi; Status không reset, không tạo run; first/latest là thông tin phân công.

Quy tắc và nguồn: C03/C07; AssignmentPlan.apply; FeatureService.assign.

#### UC-TMS-04 Ghi kết quả Status

Actor: TESTER đang phụ trách hoặc PM/ADMIN. Mục tiêu: ghi kết quả status. Liên kết: US-TMS-05.

Trigger: Bấm nút Status của row.

Tiền điều kiện: Ngữ cảnh còn hoạt động, người dùng có quyền và version kết quả phù hợp.

Luồng chính: UI chọn giá trị kế tiếp; gửi yêu cầu; backend kiểm quyền/scope/version; cập nhật kết quả và audit; UI xác nhận đã lưu.

Luồng thay thế và ngoại lệ: 401: xác thực lại. 403: không ghi. 409: không đè phiên bản mới. Lỗi mạng: không báo đã lưu; tải lại/đối chiếu trước thao tác tiếp.

Hậu điều kiện: Status và tiến độ thay đổi khi lưu thành công; Issue không tự đổi.

Quy tắc và nguồn: C05/C07; FeatureService.updateResult; TestDocumentService.updateResult; useDocumentResults.

#### UC-TMS-05 Tạo Issue từ case

Actor: TESTER, PM hoặc ADMIN thuộc phạm vi quyền. Mục tiêu: tạo issue từ case. Liên kết: US-TMS-06.

Trigger: Bấm Issue tại case.

Tiền điều kiện: Feature/file/case liên kết hợp lệ, còn quyền tạo.

Luồng chính: Đọc context server; chọn BUG/QA; bổ sung thông tin bắt buộc; lưu; quay lại case và cập nhật badge.

Luồng thay thế và ngoại lệ: Sai quan hệ Feature/file/row: từ chối. BUG thiếu steps/expected/actual hoặc QA thiếu description: báo lỗi. Gửi lặp cùng khóa/nội dung theo contract không sinh Issue trùng.

Hậu điều kiện: Issue liên kết đúng bản case, history có actor; badge bao gồm cả Issue đã đóng.

Quy tắc và nguồn: C06; FeatureIssueService.source/create/validate; CaseIssueAction.

#### UC-TMS-06 Ghi nhận Bug khám phá

Actor: TESTER, PM hoặc ADMIN. Mục tiêu: ghi nhận bug khám phá. Liên kết: US-TMS-07.

Trigger: Tạo lỗi khám phá ở Quản lý lỗi.

Tiền điều kiện: Feature hợp lệ thuộc dự án người dùng được phép.

Luồng chính: Chọn đúng Feature; nhập Bug và ngữ cảnh; case tùy chọn; lưu và mở chi tiết.

Luồng thay thế và ngoại lệ: Không có Feature hợp lệ: từ chối. Loại khác BUG với monkey: từ chối. Tester sửa/xóa monkey người khác: từ chối.

Hậu điều kiện: Bug trong Feature, không bắt buộc case; không có loại MONKEY riêng.

Quy tắc và nguồn: C13; FeatureIssueService; FeatureIssueForm.

#### UC-TMS-07 Lưu Note chung

Actor: PM hoặc ADMIN. Mục tiêu: lưu note chung. Liên kết: US-TMS-08.

Trigger: Tạo hoặc sửa Note dự án.

Tiền điều kiện: Dự án hoạt động; người dùng có quyền ghi.

Luồng chính: Nhập title/body; lưu; hệ thống kiểm dữ liệu và version; thành viên đọc bản đã lưu.

Luồng thay thế và ngoại lệ: Title/body sai giới hạn: báo lỗi. Version cũ: so sánh bản mới rồi lưu lại có chủ đích. TESTER/DEV ghi: từ chối.

Hậu điều kiện: Nội dung Note đã lưu có version; không có attachment/approval workflow.

Quy tắc và nguồn: C11; ProjectNotesService; ProjectNotes.

#### UC-TMS-08 Biên tập và tải báo cáo

Actor: PM của dự án hoặc ADMIN. Mục tiêu: biên tập và tải báo cáo. Liên kết: US-TMS-09.

Trigger: Mở Tổng hợp và Phân tích.

Tiền điều kiện: Có quyền báo cáo quản trị; phạm vi dự án/Feature hợp lệ.

Luồng chính: Đọc số liệu; tạo/chọn báo cáo; sửa Markdown; lưu; xem hoặc tải nội dung đã lưu. Nếu dùng AI, xem proposal rồi chủ động đưa vào bản soạn và lưu.

Luồng thay thế và ngoại lệ: TESTER/DEV hoặc PM ngoài quyền dự án: từ chối. Version cũ: không ghi đè. Tải khi còn nháp không biến nháp thành bản đã lưu.

Hậu điều kiện: Văn bản báo cáo thay đổi; case/Issue/Status nguồn giữ nguyên.

Quy tắc và nguồn: C10; ManagementReportService.create/update; ManagementAnalysisPage.

#### UC-TMS-09 Hỏi chatbot theo phạm vi

Actor: ADMIN, PM, TESTER, DEV. Mục tiêu: hỏi chatbot theo phạm vi. Liên kết: US-TMS-10.

Trigger: Nhập câu hỏi hoặc chọn preset.

Tiền điều kiện: Đã đăng nhập; provider/model và ngữ cảnh hợp lệ theo capability.

Luồng chính: Chọn toàn bộ phạm vi được phép hoặc riêng dự án/Feature; gửi; kiểm quyền/ngữ cảnh; gọi provider; kiểm output và quyền lại; lưu lượt chat riêng và hiển thị.

Luồng thay thế và ngoại lệ: Provider lỗi: phản hồi và retry theo requestKey. Quyền thay đổi: không dùng scope cũ. Yêu cầu báo cáo hàng loạt từ worker: từ chối. Thiếu dữ liệu: không bịa lịch sử.

Hậu điều kiện: Có trả lời hợp lệ hoặc lỗi rõ; không tự phân công hay sửa nghiệp vụ.

Quy tắc và nguồn: C04/C10/C11; AiPortfolioContext; AiChatService; AiChatStore.

#### UC-TMS-10 Bàn giao thiết bị cho PM

Actor: ADMIN. Mục tiêu: bàn giao thiết bị cho pm. Liên kết: US-TMS-11.

Trigger: Chọn máy và PM nhận ở khu quản trị.

Tiền điều kiện: Máy sẵn sàng; PM hoạt động trong dự án; version hiện hành.

Luồng chính: Chọn lô máy; chọn cùng PM nhận; nhập thông tin bàn giao; xác nhận; lưu allocation/lịch sử và phản hồi.

Luồng thay thế và ngoại lệ: Máy không còn sẵn sàng hoặc version thay đổi: báo xung đột. Người nhận không là PM hợp lệ: từ chối. Không phân lại từ PM cho member trong TMS.

Hậu điều kiện: Máy có allocation mở cho PM; tránh bàn giao kép bằng constraint và transaction.

Quy tắc và nguồn: C09; DeviceInventoryService; InitialDevicePicker.

#### UC-TMS-11 Tra cứu nhật ký

Actor: ADMIN. Mục tiêu: tra cứu nhật ký. Liên kết: US-TMS-12.

Trigger: Mở Nhật ký và nhập bộ lọc.

Tiền điều kiện: Phiên có quyền xem nhật ký quản trị.

Luồng chính: Chọn dự án nếu cần; nhập nhiều từ và ngày; server tìm AND không dấu/hoa thường; hiển thị trang kết quả.

Luồng thay thế và ngoại lệ: Ngày hoặc phân trang không hợp lệ: báo lỗi. Không có kết quả: trạng thái rỗng. Không quyền: từ chối.

Hậu điều kiện: Hiển thị dữ liệu thuộc bộ lọc; ngày cuối gồm trọn ngày Việt Nam; không sửa sự kiện.

Quy tắc và nguồn: C12; AdminAuditService; MultiWordSearch; AdminAudit.

### 3.2.5 Kiến trúc và tổ chức source

{{FIG:02-architecture}}

Kiến trúc là một backend Spring Boot tổ chức theo package chức năng, không phải microservices. Frontend gọi API JSON, sử dụng cookie phiên và CSRF. Backend phối hợp JPA cho một số phần và JdbcTemplate/store cho nhiều nghiệp vụ. MySQL giữ dữ liệu nghiệp vụ, audit, phiên và chat; Flyway quản lý schema. Hình 5 mô tả thành phần logic, không xác nhận một cấu hình production hay topology nhiều máy.

| Package / controller chính | Vai trò hiện hành và dữ liệu | Mức đọc |
|---|---|---|
| identity: AuthController, UserController | Login/logout/me, tài khoản, phân quyền tạo user; identity_users, session, audit | Sâu |
| project: ProjectController | Dự án, thành viên, kiểm quyền project; Admin quản lý roster | Sâu |
| admin: AdminController, AdminManagementController, AdminAuditController | Tổng quan, danh sách quản trị, quản lý project/user, audit | Kiểm kê/controller, source policy chọn lọc |
| admin: DeviceInventoryController, ProjectLifecycleController | Kho máy, bàn giao/thu hồi, archive/reopen project | Sâu |
| admin: ProjectStatusReportController | GET lịch sử; POST status report cũ bị retire, không phải report hiện hành | Đối chiếu contract/controller |
| feature: FeatureController | Feature, file/import, archive, phân công theo row | Sâu |
| testcase: TestDocumentController, TestDocumentEditingController | Đọc file, sửa cell/revision, Status/history/export; chuyển Feature-owned writes qua FeatureService | Sâu |
| testcase: ImportController, TestCaseController, TestSuiteController | API legacy giữ đọc; writes retire có ngoại lệ addRevision của case thuộc file mới | Sâu interceptor + selected service |
| workitem: FeatureIssueController | `/issues`: Bug/QA/Monkey, status, comment, history | Sâu |
| notes: ProjectNotesController | Notes title/body; member đọc, PM/Admin quản lý | Sâu |
| reporting: ManagementReportController/PreviewController | Summary theo nguồn mới, lưu/sửa/download Markdown; preview AI tách lưu | Sâu service, controller |
| ai: AiChatController, AiDraftController, AiProviderController, AiReadScopeController | Chat/draft, provider account, project/Feature selector | Sâu policy/context/chat; adapter inventory |
| catalog: CatalogController | Environment/build/logical device/category/milestone legacy/settings API còn source | Controller/policy inventory; không suy còn menu độc lập |
| handbook: HandbookController | Resource và revisions dự án | Controller inventory |
| rules: RuleController | Ruleset/version/publish còn source; Rules contract/UI còn điểm chưa chốt | Controller + planning |
| integration: RedmineController | Cấu hình/state/outbox/history có code; command dưới `/work-items/**` bị interceptor chặn | Controller/path + selected service |
| attachment: EvidenceController | Attachment legacy có read/download; command dưới `/work-items/**` bị retire | Controller/path + selected service |
| execution/cycle/retest/filework/qa/workitem cũ | ExecutionController, CycleDecisionController, RetestController, FileWorkController, FileWorkSessionController, FileWorkExecutionController, ActionInboxController, QaController, HandoffController, WorkItemController | Retained graph/history. Không đưa Start/End/Retest/generic Task vào use case ghi của luồng mới |
| foundation/config/shared/release | Local health/foundation checks, cấu hình security/error, search/validation, công cụ migration release | Hạ tầng, không phải màn nghiệp vụ |

### 3.2.6 Trình tự thao tác xuyên tầng

{{FIG:06-sequence-status}}

Khi ghi Status, frontend tính giá trị tiếp theo và gửi cùng version/requestKey. Backend kiểm tài khoản, dự án, Feature/file và quyền trên row, khóa dữ liệu cần thiết rồi cập nhật kết quả/audit. Giao diện chỉ báo đã lưu sau response thành công. Lỗi quyền hoặc xung đột trả phản hồi và không tự ghi tiếp; trạng thái pending trên giao diện không phải bằng chứng database đã lưu.

Import có hai bước preview và commit. Preview đọc workbook, kiểm ID nguồn và nội dung bắt buộc, lưu bản tạm hết hạn 24 giờ. Commit của đúng người nhập tạo suite, case/revision độc lập và assignment rỗng trong Feature. Gọi lại commit với preview đã committed trả summary, không sinh bản thứ hai. Giới hạn parser source là .xlsx 5 MiB và 500 dòng; đây không phải chứng minh mọi workbook khách hàng đã được thử bằng browser.

Phân công gửi rowIds thực cùng membershipId và version file. PM có thể đổi nhiều người trong một transaction; Tester chỉ đổi phạm vi của mình. AssignmentPlan từ chối row ngoài file hoặc trùng owner, từ chối phạm vi đè người khác. Kết quả Status không bị reset và không có execution run mới.

Tạo Issue lấy context từ server theo Feature/document/row. Sau khi lưu, UI quay về case và đọc lại badge. Badge tính mọi Issue liên kết case, không chỉ Issue còn mở. Tên file giống nhau ở Feature khác không phải căn cứ gom Issue.

### 3.2.7 Trạng thái và vòng đời

{{FIG:09-status}}

Hình 7 là vòng bấm trên giao diện. Backend nhận một trạng thái thuộc tập hợp năm giá trị và kiểm quyền/version; không ép mọi client đi qua từng cạnh trong vòng. NG không tự sinh Bug và resolved của DEV không tự biến case thành OK.

Feature và file dùng archive để ẩn dữ liệu, không xóa dây chuyền case/Issue. Feature có thao tác restore; file hide không được mô tả thành chức năng restore file nếu UI/contract chưa cung cấp. Issue có danh mục trạng thái theo loại; source kiểm allowed target statuses và capability, không áp một đồ thị cạnh legacy bắt buộc. DEV đang được giao chỉ được chuyển progress/resolved trong phạm vi source cho phép.

## 3.3 Thiết kế dữ liệu

### 3.3.1 Mô hình dữ liệu và quan hệ

{{FIG:07-data-core}}

Project có nhiều Feature; mỗi file mới thuộc một Feature; file có các row và case độc lập. Row chứa Status hiện hành, case liên kết revision nội dung. Assignment liên kết row và membership của đúng dự án. Các cột nullable của graph cũ không làm mất ràng buộc của graph mới; khóa ngoại tổng hợp có project/file scope cần được giữ khi mô tả vật lý.

{{FIG:08-data-support}}

Issue dùng work_items với Feature context riêng. Note và báo cáo thuộc project, báo cáo có thể thêm Feature. Chat thuộc tài khoản và turn cùng owner, được mô tả trong từ điển dữ liệu. Các sơ đồ dữ liệu chỉ thể hiện miền đang dùng và khóa chính; bảng lịch sử cycle/run/retest/Redmine vẫn tồn tại trong schema và được kiểm kê trong hồ sơ kèm theo.

### 3.3.2 Từ điển dữ liệu và ràng buộc

| Quan hệ / cardinality | PK/FK, nullable và ràng buộc quan trọng | Nguồn |
|---|---|---|
| User N–N Project qua membership | identity_users PK id VARCHAR36; membership PK id, unique(project_id,user_id), project/user FK; membership role+active+version | V2; V3:25; V11 |
| Project 1–N Feature | Feature PK id; FK project; unique(project_id,id), unique(project_id,migration_key); migration_key/source_cycle nullable; archive nullable, version≥0 | V31:2 |
| Feature 1–N file | import_batches PK id; feature_id nullable cho legacy/preview; FK(project_id,feature_id); unique(feature_id,source_batch_id) chống replay clone; source_batch_id nullable self FK | V4:84; V12; V31:13 |
| File 1–N row | row PK id; batch FK; unique(batch_id,source_row_number); owning_document nullable cho legacy, CHECK owner null hoặc bằng batch; unique(batch_id,source_import_row_id) | V4:105; V31:21 |
| File 1–N case mới | test_cases PK id; owning_document FK; composite unique(project_id,owning_document_id,id). Row→case FK tổng hợp cùng document. Không cho một row file mới nối case owned file khác | V31:18,21 |
| Suite 1–N case; case 1–N revision | case_no unique trong project; suite FK; revision unique(project,case,revision_no); case current_revision nullable FK(project,id,current_revision)→revision(project,case,id) | V4:6,27,46,78 |
| Row 0–1 assignment record; record có 0–1 assignee | PK(project_id,row_id); FK(project,document,row)→import_rows; assignee/first/latest nullable FK membership cùng project. Commit tạo record cho mỗi row mới | V31:25 |
| Row 1–N assignment changes | PK id; row composite FK; previous/new nullable; actor identity NOT NULL; document_version/request_key; index(project,document,id) | V31:35 |
| Row 0–N cell overlays/history | cell_edits PK(project,row,column), version; cell_changes có id/actor/before/after/time | V27:5,17 |
| Row Status | result_status NOT NULL mặc định UNEXECUTED, CHECK 5 trạng thái; result_version≥0; result_updated_by nullable identity FK và requestKey | V13:3 |
| Project 1–N testing_commands | PK id, unique(project,request_key), checksum/actor/action/response_json; required Feature, optional document composite FK đúng Feature | V31:44 |
| Work item 0–1 Feature context | context PK(project,work_item), Feature FK; document,row nullable; row cần document CHECK; scope Feature/file/row bằng composite FK; creator identity NOT NULL | V31:66 |
| Issue 1–N Feature history | PK id; FK project/workitem, actor identity; before/after JSON; index(project,workitem,id) | V31:76 |
| Work item core | PK id; unique item_key, (project,item_no), (project,request_key); status FK; priority HIGH/MEDIUM/LOW; assignee nullable; created_by/updated_by legacy membership nullable sau V31 | V7:24; V18; V31:64 |
| Bug/QA details | Work-item-associated detail; build/env/device đã nullable cho Bug mới; QA giữ legacy answer pointer nhưng Feature Issue không yêu cầu answer workflow | V7:64; V18:6; V31:65 |
| Project 1–N management report | PK id; project FK; Feature nullable composite FK; creator/editor identity; version; index(project,updated_at,id) | V31:82 |
| Project 1–N Note | PK id; project/creator/editor FK; archive nullable; index(project,archived_at,updated_at,id) | V31:90 |
| Asset 1–N allocation lịch sử; ≤1 allocation mở | Asset unique asset_code, serial nullable unique; allocation generated active_asset_id=asset_id khi returned_at NULL, unique chặn bàn giao kép; recipient FK(project,membership) | V15:3,19 |
| User 1–N chat; chat 1–N turn | thread unique(id,created_by); turn FK(thread_id,created_by)→thread ON DELETE CASCADE; unique(created_by,request_key); indexes owner/expiry/pending; state CHECK GENERATING/READY/FAILED | V25:2,24 |

Các index quan trọng gồm ix_feature_list, ix_feature_documents, ix_document_owner, ix_feature_issues, ix_case_issues, ix_management_reports và ix_project_notes_list. Chúng phục vụ truy vấn theo dự án, trạng thái lưu trữ, file, người phụ trách hoặc thứ tự cập nhật. Chưa có EXPLAIN/benchmark mới trong tác vụ này; không coi sự tồn tại của index là bằng chứng đạt SLA.

Kiểm kê source có 85 câu CREATE TABLE qua 33 migration, không tính flyway_schema_history. Đây là số bảng được khai báo trong source, không phải số bảng vừa đo trên server. V20/V22 ở khu vực demo; V32/V33 là Java migration. Schema cuối phải đọc cùng ALTER, không dừng ở V4/V7. Toàn bộ DDL và controller inventory được lưu trong hồ sơ đối chiếu để truy vết.

### 3.3.3 Bảo toàn và nguồn gốc dữ liệu

source_batch_id và source_import_row_id giữ nguồn chuyển đổi; khóa unique giúp tránh copy lặp. Migration tạo bản case hiện hành riêng, giữ revision/cell overlay cần thiết và lưu mapping cũ–mới. Không lấy số thay đổi Status làm số lần chạy kiểm thử vật lý hoặc điểm năng lực cá nhân.

Receipt main-after-proof lịch sử ghi V30→V33, kiểm 7.374 hàng cũ giữ nguyên trong 74 bảng ngoài session, 10 bản file/711 case và 120 case chưa thuộc file giữ trong graph cũ. Một nguồn thiếu workbook được giữ ngoại lệ. Số liệu này mô tả lần chuyển đổi đã ghi nhận; không có phép đọc metadata mới trong lượt biên soạn.

Các đường dẫn Java rút gọn trong chương này tính từ Backend/src/main/java/vn/syp/tms; đường dẫn UI tính từ Frontend/src/app, trừ App/AppEntry trong Frontend/src. Số dòng là điểm dẫn ở baseline đã khảo sát, không thay việc đọc toàn bộ symbol.

## 3.4 Giao diện API và hành trình người dùng

### 3.4.1 Điều hướng và giao diện theo vai trò

{{FIG:10-navigation}}

ADMIN đăng nhập vào khu quản trị; lựa chọn vào workspace là hành động riêng. Người dùng workspace chọn dự án và đi tới Tổng quan, Bảng công việc, Quản lý lỗi, Thông tin chung hoặc Phân tích theo quyền. Chat nổi vẫn có ở shell; menu trang AI cũ đã bỏ. Cấu hình nguồn/model được mở trong chat, không đồng nghĩa loại bỏ backend provider hoặc lịch sử riêng.

| Module/màn | Đường truy cập và actor | Chức năng/input/output chính | Nguồn đã đối chiếu |
|---|---|---|---|
| Đăng nhập/khóa phiên | AuthBoundary trước mọi app | username/password → login; loading, anonymous, expired, unavailable; xác thực lại giữ nháp cùng user | `features/auth/AuthBoundary.jsx:7–60`, `AuthProvider.jsx:12–93` |
| Chọn không gian theo vai trò | ADMIN mặc định `/admin`; workspace opt-in `workspace=1`; vai trò khác vào workspace | Tránh chọn workspace của user trước trở thành mặc định user sau | `AppEntry.jsx:20–56` |
| Menu/tài khoản/chọn dự án | Header/Sidebar/AccountMenu, không phải trang độc lập | Menu responsive, project context; PM được cấp `users:create` mở form tạo TESTER | `components/Sidebar.jsx:10–25,39–89`; `auth/AccountMenu.jsx:15–38`; `projects/ProjectProvider.jsx:20–75` |
| Tổng quan dự án | `/dashboard`, người đọc dự án | Thông tin dự án + số Bug/QA theo trạng thái + mốc phát hành | `pages/DashboardPage.jsx:5`; `modules/ProjectOverview.jsx:12–74` |
| Bảng trạng thái | `/board`, `/board/list`, `/board/issue/:id` | Kanban/danh sách, filter Feature/type/status/keyword; mở detail, đề xuất chuyển trạng thái qua bước xác nhận | `pages/WorkBoardPage.jsx:9–17`; `work-items/FeatureIssuesPage.jsx:18–54` |
| Quản lý kiểm thử – Feature | `/board/testing?projectId=...` | Danh sách/phân trang/search; PM dự án/ADMIN tạo/sửa/archive/restore; member đọc | `testing/TestingFeaturesPage.jsx:13–34` |
| File trong Feature | `/board/testing/features/:featureId` | Môi trường/mô tả, file/progress/assignee, import Excel, ẩn file; Feature archived chỉ đọc | `testing/TestingFeaturePage.jsx:11–29` |
| Case trong file | `/board/testing/features/:featureId/documents/:documentId`, optional `caseId` | Bảng case/search/Status/pagination/detail, sửa ô, phân công/tự nhận, history, Issue, export original/current | `testing/TestingDocumentPage.jsx:18–81` |
| Import Excel | Dialog từ file list | 1–20 `.xlsx`; kiểm client 5 MiB/file không rỗng; preview rồi commit từng file; giữ partial success | `test-cases/ImportExcelDialog.jsx:8–10,37–94,127–138`; `services/api/features.js:17–18` |
| Phân công/history | Dialog trong case page | Khoảng thứ tự case → rowIds, chọn Tester hoặc self; expectedVersion, requestKey; lịch sử người thay đổi | `testing/DocumentAssignments.jsx:8–31`; `DocumentAssignmentHistory.jsx` được kiểm kê, test history được đọc tên |
| Status/history | Nút/overlay trong case page | Vòng Unexecuted/OK/NG/P/NA; actor history, người đầu tiên/gần nhất là phân công | `ResultCycleButton.jsx:3–14`; `useDocumentResults.js:5–38`; `TestingDocumentPage.jsx:59–80` |
| Issue từ case | Nút Issue, popup và modal ngay tại row | GET count/list đúng Feature/document/row; tạo BUG/QA có prefill server; giữ vị trí case | `work-items/CaseIssueAction.jsx:10–56`; `FeatureIssueForm.jsx:6–47` |
| Quản lý lỗi/monkey | `/issues` | Bug/QA list, filter, tạo monkey Bug chọn đúng Feature, có thể không case | `FeatureIssuesPage.jsx:20–54`; `FeatureIssueForm.jsx:23,39` |
| Chi tiết Issue | `/board/issue/:id` hoặc modal case | Nội dung, DEV assignee, priority, status/reason, comments/history, soft-delete monkey, source deep-link | `FeatureIssueDetail.jsx:19–176` |
| Tổng hợp & Phân tích | `/analysis`; `/progress` alias còn hoạt động, PM dự án/ADMIN | Status metrics, so sánh Feature, Bug/QA; soạn/lưu/xem/tải Markdown; AI preview | `AppRouter.jsx:49–51`; `reports/ManagementAnalysisPage.jsx:20–166` |
| Thông tin chung | `/settings` | Đọc/sửa tên, mô tả, timezone (manager), code read-only | `projects/ProjectSettingsPage.jsx:14–65` |
| Thành viên/thiết bị dự án | `/settings/members` | Thành viên chỉ đọc trong workspace; ADMIN link sang quản trị và bổ sung/thu hồi máy; PM nhận máy, phân phối ngoài phần mềm | `ProjectSettingsPage.jsx:27`; `projects/ProjectDevices.jsx:7–14` |
| Note | `/settings/notes` | PM/ADMIN CRUD note chung; member đọc; version conflict compare, soft deletion | `projects/ProjectNotes.jsx:7–85` |
| Quy tắc báo lỗi | `/settings/rules` | Nội bộ DEMO, draft/publish/history; contract legacy còn mở | `projects/RulesPanel.jsx:5–47` |
| Sổ tay dự án | `/settings/handbook` | Guide/spec/account reference, nội dung và revision history; PM/ADMIN tạo revision | `projects/HandbookPanel.jsx:5–58` |
| Tổng quan hệ thống | `/admin` | KPI các dự án/tài khoản/Status/bug/kho máy, bảng và mục cần chú ý, scope dự án | `admin/AdminDashboard.jsx:6–40` |
| Quản lý dự án | `/admin/projects`, `/admin/projects/:id` | List/create/edit, chọn thành viên chưa thuộc dự án nào, thêm/gỡ/đổi role, readiness/archive/reopen/history, máy | `admin/AdminProjects.jsx:7–22`; `AdminProjectDetail.jsx:12–48`; `AdminProjectForm.jsx:9–39`; `AdminProjectLifecycle.jsx:15–88` |
| Tài khoản | `/admin/users` | Tạo ADMIN/PM/TESTER/DEV, khóa/mở, cấp/thu hồi PM tạo TESTER, search/filter | `admin/AdminUsers.jsx:9–17`; `UserCreateDialog.jsx:7–30` |
| Kho thiết bị | `/admin/devices` | Asset list/edit, AVAILABLE handover, ALLOCATED return; allocation history; PM recipient | `admin/AdminDevices.jsx:8–33`; `DeviceAllocationDialog.jsx:8–18` |
| Nhật ký | `/admin/audit` | Search + project/from/to, Asia/Ho_Chi_Minh trọn ngày kết thúc; không type/timezone selector | `admin/AdminAudit.jsx:8–19` |
| Báo cáo tiến độ cũ | Section trong `/admin/projects/:id` | GET lịch sử, không POST từ UI; dẫn tới report mới | `admin/ProjectStatusReports.jsx:8–29` |
| Chat AI/cấu hình | Chat launcher toàn app, không menu trang AI | Phạm vi project/Feature, riêng chủ hội thoại, provider/model/history/new, gửi/retry/copy; config trong toolbar | `AppEntry.jsx:56`; `ai/AiChat.jsx:14–217`; `AiConnections.jsx:12–109` |
| NotFound/retirement notices | Route sai, route đã nghỉ | Thông báo và hướng điều hướng; không đoán mapping ID cũ → Feature | `AppRouter.jsx:29,43–56`; `routeInfo.js:8–16`; `RetiredAiEntry.jsx` kiểm kê qua import |

### 3.4.2 Trạng thái giao diện và khả năng phục hồi

Các luồng chính có pending, error và đọc lại khi xung đột. Note cho đối chiếu bản mới; assignment giữ lựa chọn và version mới nhưng chưa trình bày đầy đủ toàn bộ phạm vi của người khác trong bước đối chiếu. Khi hết phiên, cơ chế reauth cùng người dùng giữ nháp; không tự phát lại mọi lệnh ghi hoặc yêu cầu AI có chi phí.

Màn Kanban đếm theo trang dữ liệu đang hiển thị và có nhãn phạm vi; không nên diễn giải con số đó là tổng Issue toàn hệ thống. Bản đồ màn hình trong báo cáo là tài liệu phân tích source, không thay ảnh chụp runtime và không chứng minh mọi control đã được thao tác.

### 3.4.3 Contract API quan trọng

| API (tiền tố /api/v1) | Input và kết quả | Quyền và kiểm soát chính |
|---|---|---|
| POST /auth/login; GET /auth/me; POST /auth/logout | Xác thực, thông tin tài khoản, kết thúc phiên | Session/CSRF/rate limit theo identity; không JWT client |
| GET/POST /projects/{p}/features; PUT /features/{f} trong project | List hoặc name/environment/description; entity, metrics, version | Đọc theo project; ghi PM/ADMIN; expectedVersion khi sửa |
| POST /projects/{p}/features/{f}/archive hoặc /restore | expectedVersion, requestKey | Lưu trữ mềm, replay kiểm actor/action/payload |
| POST /projects/{p}/features/{f}/import-previews; POST /import-previews/{d}/commit trong Feature | Multipart preview, sau đó commit | PM/ADMIN, đúng người tạo preview, hết hạn24h |
| GET /projects/{p}/test-documents/{d} | File, rows, assignments, capabilities | Read scope; version/resultVersion riêng |
| PUT /projects/{p}/test-documents/{d}/assignments | changes membership/rowIds, expectedVersion, requestKey | Tester chỉ self; không overlap; transaction |
| PUT /projects/{p}/test-documents/{d}/rows/{r}/result | status, expectedVersion, requestKey → result mới | Row owner hoặc PM/ADMIN; replay gần nhất; 409 conflict |
| GET/POST /projects/{p}/issues; GET /issues/context trong project | Bộ lọc hoặc Feature/document/row và nội dung Bug/QA | Context đúng project/Feature; requestKey khi tạo |
| PUT /projects/{p}/issues/{id}; PUT /issues/{id}/status trong project | Nội dung hoặc status/reason/version | Capability theo role/assignee/type; không dùng retest gate cũ |
| GET/POST /projects/{p}/notes; PUT/DELETE /notes/{id} trong project | Title/body, version; soft archive | Member đọc; PM/ADMIN ghi |
| GET /projects/{p}/management-reports/summary; POST /management-reports trong project | Scope optionalFeature hoặc Markdown đã soạn | PM dự án/ADMIN; văn bản không ghi ngược dữ liệu nguồn |
| PUT /projects/{p}/management-reports/{id}; GET /{id}/download trong collection | Version và Markdown; download UTF-8 bản lưu | Kiểm quyền trước đọc/ghi; 409 khi version cũ |
| POST /ai/chats; POST /ai/chats/{id}/messages | Provider/model/purpose/target; text/requestKey | Owner riêng, scope fingerprint, output validation |


Request ghi cần CSRF và session hợp lệ. Lỗi thường gặp gồm 401 chưa xác thực, 403 sai quyền/CSRF, 404 không có dữ liệu trong phạm vi, 409 xung đột version hoặc idempotency, 410 preview hết hạn/luồng cũ đã nghỉ và 422 dữ liệu không hợp lệ. Mã cụ thể phụ thuộc endpoint; không ép một schema lỗi chung không có trong source.

Phân trang cũng khác nhau: Feature trả pageSize, Notes và báo cáo trả size; lịch sử assignment dùng nextBefore. Người dùng API cần theo từng contract, không lấy một ví dụ làm envelope thống nhất cho toàn hệ thống.

### 3.4.4 AI và tích hợp

`AiPortfolioContext.current:56` dùng role hệ thống: ADMIN/PM có danh sách mọi project; người khác chỉ membership active. Scope reference hash gồm role/grants/membership version; PROJECT_CHAT thêm project và optional Feature. Scope và owner được kiểm lại khi đọc cache/history, reserve và complete (`AiChatStore.java:40,46,86,140,157`). Thay quyền không tiếp tục dùng scope cũ như một cấp quyền vĩnh viễn.

Target project/Feature xác định đối tượng trả lời; background lấy những project người hỏi được AI phép đọc. Worker chỉ có bounded ordinary readable details, personal progress, không nhận execution management aggregates/workload/experience actors. Ngoài quyền chỉ whitelist câu kinh nghiệm tổng quát, không identity/tên/số lượng riêng; query yêu cầu ít nhất 5 actor và 2 project để bật aggregate (`FeatureFacts.safeExperienceOutside:89`). Đây là ngưỡng kỹ thuật đang triển khai, không phải tiêu chí đánh giá năng lực đã được khách hàng xác nhận.

Snapshot tối đa 30 project, 10 file metadata, 3 file có tên được hỏi, 5 case/Issue, 10 audit gần nhất mỗi case, tối đa 20 actor/workload cho management. Có truncated/limitations và giảm history/context khi vượt request bytes. Không có bằng chứng vector database/RAG bao phủ mọi cell; không viết “AI đọc toàn bộ dữ liệu chính xác tức thời” (`AiPortfolioContext.java:16,114`; `FeatureFacts.java:16,66`; `AiChatService.java:113`).

AI lấy actor thực tế trong audit, source-import audit có nhãn MIGRATED_SOURCE; recordedChanges là số thay Status, không phải số lần thực thi vật lý hay competence score. first/latest assignment hoặc tester text trong Excel không dùng làm chứng minh kinh nghiệm. Suggestion không gọi assign/CRUD.

`AiChatService.send:35` chuẩn bị context, pin provider/model, reserve request, gọi gateway ngoài DB transaction, validate output, kiểm session/connection rồi complete. Output phải JSON một trường text ≤12.000 ký tự; reference dạng project/document/ticket/feature/member/milestone:ID phải trong sources allowlist (`AiChatService.java:88,102`). Đây là kiểm định cấu trúc và reference nhận dạng, không phải bộ chứng minh semantic toàn bộ ngôn ngữ tự nhiên; chưa kết luận mọi leakage/hallucination bị chặn. Không thực hiện live provider call trong review này.

Source có OPENAI_API, CHATGPT và OLLAMA qua gateway. Metadata cấu hình sẵn sàng không phải bằng chứng model đang trả lời đúng. Luồng mới không cho AI tự phân công; PM hoặc Tester thực hiện hành động qua chức năng nghiệp vụ có guard riêng. Gợi ý hoặc báo cáo AI cần được con người xem và lưu rõ ràng.

Các endpoint Redmine cũ dưới work-items bị chặn ghi bởi interceptor của luồng Feature. Tuy nhiên route retry delivery ngoài pattern đó còn có source callable theo policy của RedmineService. Báo cáo vì vậy không khẳng định tích hợp đã bị xóa hoàn toàn, cũng không khẳng định live Redmine đang hoạt động cho Issue mới.

### 3.4.5 Xác thực và kiểm soát dữ liệu

Backend dùng password encoder PBKDF2 qua DelegatingPasswordEncoder, phiên HTTP lưu JDBC và CSRF. Cookie TMS_SESSION có HttpOnly và SameSite Strict; Secure phụ thuộc cấu hình, không thể tuyên bố luôn HTTPS/Secure khi chưa khảo sát deployment. Các thay đổi khóa tài khoản hoặc quyền tạo tài khoản thu hồi phiên theo source.

Quyền được kiểm trước thao tác, trước replay ở các lệnh tương ứng và khi hoàn tất lượt chat. ID gửi từ client không cấp quyền. Các khóa ngoại tổng hợp hỗ trợ ngăn nối khác dự án; kiểm service còn cần để áp dụng role, archive và ownership. Những nhận xét này là review source có phạm vi, không phải chứng nhận an toàn toàn diện hay pentest production.

## 3.5 Cài đặt và kiểm chứng

### 3.5.1 Điều kiện môi trường

Source dùng Java 21, Node/npm theo cấu hình frontend và MySQL native. Docker không là điều kiện bắt buộc chạy ứng dụng; Testcontainers là công cụ kiểm thử riêng. Không lấy bảng phần cứng của mẫu du học làm mức cấu hình tối thiểu cho TMS. Chưa có benchmark xác nhận CPU, RAM hay số người dùng đồng thời tối thiểu.

### 3.5.2 Cấu hình và triển khai có kiểm soát

Backend mặc định bind localhost:8080, local MySQL cấu hình cổng3307; frontend trong các bằng chứng dùng5173. Đây là cấu hình phát triển và checkpoint lịch sử, không là địa chỉ production. JPA ddl-auto validate, SQL init never, Flyway validate-on-migrate và clean-disabled là các cấu hình source có vai trò bảo vệ schema.

Trình tự vận hành cần theo hướng dẫn repository: chuẩn bị credential ở nơi riêng, kiểm database mục tiêu và backup, dùng migration được duyệt, chạy backend/frontend, kiểm health/API đúng phiên bản và thử hành trình theo vai trò. Không đưa credential vào báo cáo hoặc cung cấp lệnh phá dữ liệu. Lượt biên soạn không thực hiện các bước vận hành này.

### 3.5.3 Bằng chứng kiểm thử và giới hạn

| Evidence | Nội dung được kiểm | Cách dùng đúng |
|---|---|---|
| `var/uiux-admin-entry-2026-10-19/frontend-verified-final-tests.json` | JSON success=true; 1100 total/passed; failed/pending/todo=0; `testResults.length=120`; numTotalTestSuites=160 | 1100 test trong 120 file. Không nhầm 160 suite metadata thành 160 file. Không phải lượt test mới của tác vụ Word |
| `var/uiux-admin-entry-2026-10-19/build-verified-final.json` | exitCode=0, 1701 modules, 9.17s, JS488.03kB gzip141.76, CSS188.40kB gzip33.58 | Build local lịch sử, không production deploy/performance SLA |
| `var/uiux-admin-entry-2026-10-19/final-validation.json` | capturedAt 2026-10-19T04:56:49.138Z; 320 source/config files stable trước/sau build/test; changed/missing/added=[]; coverage NOT_MEASURED_THIS_TURN; allButtonsPassed=false | Stable snapshot của lượt đó; không bằng đọc tất cả source hoặc coverage final |
| `docs/reviews/2026-10-19-admin-entry-uiux.md` | Các nhóm layout/focus/draft/read-recovery; receipt full đầu1080 PASS/1 FAIL, checkpoint1085 rồi final1100; browser có phạm vi riêng | Giữ cả lịch sử fail; không cộng các lượt chồng nhau hoặc xóa NOT_RUN |
| `docs/reviews/2026-10-19-uiux-polish.md:173` | Coverage checkpoint1047/115 files: S87.02/B83.4/F81.37/L87.74; source có delta trong lượt coverage | Không gán những % này cho final1100 hoặc UAT |
| `docs/planning/2026-10-19-fixreports-implementation-plan.md` checkpoint cuối + cutover | Tài liệu ghi mainV30→33,12GET200, bảo toàn7374row cũ (trừ session), browser có scope, migration exceptions | Đã đọc trực tiếp main-after-proof.json và main-runtime-final.json trong var/fixreports-main-cutover-2026-10-19: xác nhận các số liệu bảo toàn và health tại thời điểm receipt; không kiểm tra database/runtime mới trong tác vụ này |
| `docs/planning/STATUS.json` | activeSprint S11; uiuxAdminEntry cuối; FR12/S11 IN_REVIEW | Trạng thái quản lý; không tự chứng minh DoD |

Test frontend dùng mock có giá trị kiểm state và contract phía UI, nhưng không tự chứng minh FK/transaction database. Test native có phạm vi riêng; không cộng các suite chạy lặp thành tổng số test duy nhất. Coverage ở checkpoint trước không được gán cho source cuối nếu chưa đo lại. Không dùng số file/controller/control để thay tỷ lệ bấm nút hoặc UAT.

### 3.5.4 Hạn chế và hướng hoàn thiện

| ID | Nhận xét có bằng chứng | Ảnh hưởng tới báo cáo |
|---|---|---|
| BE-R01 | `FeatureService.java:237` trả `pageSize`, Notes/management report trả `size`; FixReports tổng quát viết size | Ghi contract từng endpoint; không đưa một schema pagination chung sai |
| BE-R02 | `ManagementReportService.java:39` query issues không join/filter document.archived_at; FeatureFacts workByStatus và FeatureIssueService.list có loại document đã ẩn | Source inconsistency: khi hide file có thể lệch count Issue giữa summary và danh sách; chưa tái hiện runtime lượt này, không trình bày metrics mọi màn luôn đồng nhất |
| BE-R03 | `ProjectLifecycleService.java:33` vẫn dùng blocker legacy sessions/cycles/retests/all work_items. Ngoại lệ ADMIN legacy đã được duyệt trong planning nhưng chưa có Command flag/nhánh override | Đánh dấu yêu cầu đã chốt/chưa implement, không vẽ archive luôn thành công sau chuyển Feature |
| BE-R04 | `FeatureService.java:194` latest assignment đổi kể cả chưa có kết quả; audit RESULT lưu actor thực riêng | Không gọi first/latest “người thực tế test lần 1/lần 2” hoặc dùng cột để thống kê kinh nghiệm |
| BE-R05 | `FeatureIssueService.java:107,157` dựa allowed target statuses, không bắt cạnh chuyển trạng thái hoặc NG/retest closure | Sơ đồ state phải mô tả đúng tập trạng thái/quyền; không tái sử dụng state machine legacy |
| BE-R06 | V7 policy seed INTERNAL_V1 chứa required build/environment/device/closureEnabled false; FeatureIssueService mới không theo gate đó và V31 cho nullable | Ghi seed/legacy khác behavior mới; không chép required fields từ V7 thành rule Bug hiện hành |
| BE-R07 | `AiChatService.java:102` regex reference allowlist chỉ nhận dạng một số mẫu; snapshot có giới hạn | Không tuyên bố AI được kiểm chứng semantic toàn diện hay mọi cell đều retrieval; live/UAT còn riêng |
| BE-R08 | README/contract có checkpoint “main V30 chưa restart” cùng STATUS lịch sử sau cutover V33 và publication | Ghi timestamp/checkpoint, dùng bằng chứng mới nhất nếu báo runtime; việc đọc source V33 không chứng minh server hiện đang V33 |
| BE-R09 | Catalog/Handbook/Rules/legacy controller còn nguồn, writes một số bị interceptor retire; frontend có thể đã bỏ menu | Phân biệt module code, API callable và màn điều hướng hiện hành; frontend review quyết định UI, không suy từ tên controller |

| Mã | Điều đã biết / nguồn | Điều còn thiếu hoặc ảnh hưởng tới báo cáo | Phân loại |
|---|---|---|---|
| FE-K01 | ADMIN toàn quyền không membership, `permissions.md:18`, `projectAccess.js:1–12` | Mục lịch sử “Admin observer chỉ đọc” ở cùng tài liệu đã bị thay thế; không dùng làm quyền hiện hành | Quyết định + implementation |
| FE-K02 | Retest ngoài phần mềm, C07; router `/tests/*` retired | Source legacy, test legacy và DB cũ vẫn tồn tại; không đưa workflow retest/run thành use case mới | Ranh giới mô hình |
| FE-K03 | C05 Status/P/NA; file 0% khi rỗng | Tiến độ 100% không chứng minh nghiệm thu, không dựng KPI/SLA | Đã chốt |
| FE-K04 | C04 AI PM liên dự án | Không kéo theo quyền CRUD/report ngoài project; TESTER/DEV không report management/bulk, nhưng vẫn đọc case/issue được giao | Đã chốt, enforcement backend riêng |
| FE-K05 | C10 report chỉ text, test 10→8 tại `ManagementAnalysisPage.test.jsx:176–179` | Đừng viết chỉnh báo cáo sửa số lỗi trong DB | Source + test mock lịch sử |
| FE-K06 | C14:147 chỉ thay block recent-work; overview source giữ status/milestones | Không thay cả overview thành bài giới thiệu; content SPIDER-PLUS match code chính xác (`ProjectInformation.jsx:9`) | Đã chốt + source |
| FE-K07 | C03 không hard limit hai người/file; form cho nhiều scopes | Không dựng business rule “tối đa hai Tester”; hai cột khác hai người tối đa | Đã chốt |
| FE-K08 | C09 unassigned picker và PM handover | Không suy mỗi user chỉ được membership một project hoặc PM chia máy qua phần mềm | Đã chốt |
| FE-O01 | UX-002 OPEN, `AdminProjectLifecycle.jsx:59` blockers phải rỗng | Chính sách ADMIN ngoại lệ legacy có lý do đã được chấp thuận, chưa có workflow thực thi; không viết đã giải quyết archive mọi dự án | Yêu cầu đã có, implementation còn thiếu |
| FE-O02 | UX-011 OPEN; `RulesPanel.jsx:5,24,30,34` còn build/environment/device/run DEMO | Contract/copy chưa đồng bộ mô hình Feature mới. Không dùng Rules DEMO như quy tắc chính thức khách hàng hoặc điều kiện Status mới | Mâu thuẫn hiện hành đã được ghi nhận |
| FE-O03 | `ProjectStatusReports.jsx:21` link `#/analysis?projectId=...`; `AppEntry.jsx:44–48` ADMIN chưa opt-in bị chuyển admin | Có khả năng đường từ history trong admin về analysis thiếu workspace=1. Chỉ suy luận source, chưa tái hiện, cần check trước mô tả link chạy thành công | Rủi ro seam chưa xác nhận runtime |
| FE-O04 | `ProjectDataProvider` còn legacy reads dù bảng mới Feature API | Không nói mọi API legacy đã bị bỏ; chưa đo request cost/race toàn app | Phụ thuộc source đã thấy |
| FE-O05 | Assignment conflict chỉ lấy latest.version, không trình full latest scopes | UX đối chiếu còn hạn chế; server overlap validation không thể suy từ form | Limitation source |
| FE-O06 | Report cuối ghi UAT/IME/touch/zoom200/screen-reader/live/upload/download chưa đủ | Không lấy 1100 test hoặc 1004 control declaration làm “mọi button hoạt động” | Evidence gap |
| FE-O07 | C02 chỉ giữ file/nội dung khi chuyển đổi, không bảo lưu kết quả/người/lịch sử/issue vào graph mới | AI phải nói thiếu kinh nghiệm khi không có history; không suy assigned name là năng lực hoặc lịch sử test | Giới hạn dữ liệu |
| FE-O08 | Link Google Drive/SharePoint trong ProjectInformation là nguồn người dùng đưa, C14:150 | Chưa truy cập/kiểm nội dung đích; CAT/SHIFT/Backlog là bối cảnh bên ngoài, không bằng tích hợp phần mềm | Chưa kiểm nguồn ngoài |

Hướng hoàn thiện trước hết là xử lý các khoảng trống đã có căn cứ: ngoại lệ lưu trữ dự án legacy có lý do; đồng bộ contract Rules; kiểm chứng tính nhất quán count khi ẩn file; và bổ sung UAT theo role/state/thiết bị. Đánh giá chất lượng AI cần dữ liệu và tiêu chí nghiệp vụ thật trong phạm vi được phép. Các nội dung này là công việc tiếp theo, không được mô tả là tính năng đã hoàn tất.

# Kết luận

TMS hiện có implementation cho quản lý kiểm thử theo Feature/file/case, phân công theo phạm vi, Status, Bug/QA, Note, báo cáo Markdown và chat AI có giới hạn quyền. Cấu trúc báo cáo mẫu được giữ ở cấp chương và mục tiêu phân tích, còn toàn bộ nghiệp vụ du học được thay bằng mô hình thực tế của TMS.

Đối chiếu cho thấy cần phân biệt rõ mô hình hiện hành với code và dữ liệu legacy. Quyền ADMIN, ngoại lệ AI của PM, công thức P/NA và tính độc lập của báo cáo văn bản là những nội dung có thể bị mô tả sai nếu chỉ dùng tài liệu cũ. Các bằng chứng lịch sử hỗ trợ kết luận trong phạm vi đã chạy; FR-12/S11 vẫn IN_REVIEW và chưa có căn cứ nghiệm thu toàn bộ nút, trạng thái hoặc production.

Bản tài liệu đã có cấu trúc phân tích và sơ đồ nguồn để tiếp tục hoàn thiện. Thông tin bìa, dữ kiện đơn vị thực tập và kiểm tra trực quan toàn bộ trang Word còn cần bổ sung/xác minh trước khi dùng như bản nộp chính thức. Không thay những phần thiếu bằng tên người, thành tích hoặc số liệu giả.

# Tài liệu tham khảo và nguồn đối chiếu

[S01] AGENTS.md; docs/planning/README.md; docs/planning/STATUS.json; docs/planning/06-execution-guide.md. Quy trình và checkpoint quản lý dự án.

[S02] FixReports.md; docs/planning/2026-10-19-fixreports-clarification.md. Quyết định C01–C14, gồm đính chính phạm vi Tổng quan.

[S03] docs/planning/2026-10-19-fixreports-implementation-plan.md; docs/api/fixreports-contract.md. Phạm vi triển khai và hợp đồng; đọc cùng source khi khác nhau.

[S04] docs/content/spider-plus-project-overview.md. Nội dung dự án đã xác nhận; không truy cập các link khách hàng để lấy thêm dữ kiện.

[S05] Frontend/src/app/routes/AppRouter.jsx; Frontend/src/AppEntry.jsx; Frontend/src/app/features/testing; work-items; reports; projects; ai; admin. Router, màn và hành trình UI.

[S06] Backend/src/main/java/vn/syp/tms/feature/FeatureService.java; AssignmentPlan.java; testcase/TestDocumentService.java; TestDocumentEditingService.java; workitem/FeatureIssueService.java. Luồng nghiệp vụ kiểm thử.

[S07] Backend/src/main/java/vn/syp/tms/identity/IdentityService.java; config/SecurityConfig.java; project/ProjectService.java; admin/DeviceInventoryService.java; ProjectLifecycleService.java. Quyền, phiên và quản trị.

[S08] Backend/src/main/java/vn/syp/tms/reporting/ManagementReportService.java; ReportMetrics.java; notes/ProjectNotesService.java; ai/AiPortfolioContext.java; FeatureFacts.java; AiChatService.java; AiChatStore.java. Tổng hợp, Notes và AI.

[S09] Backend/src/main/resources/db/migration; Backend/src/main/resources/db/demo; Backend/src/main/java/db/migration. Schema V1–V33 và chuyển đổi dữ liệu.

[S10] var/uiux-admin-entry-2026-10-19/frontend-verified-final-tests.json; build-verified-final.json; final-validation.json. Receipt frontend lịch sử ngày19/10/2026.

[S11] var/fixreports-main-cutover-2026-10-19/main-after-proof.json; main-runtime-final.json. Chuyển đổi và health lịch sử, không phải kiểm tra runtime mới.

[S12] docs/reviews/2026-10-19-admin-entry-uiux.md; 2026-10-19-uiux-polish.md; 2026-10-19-uiux-system-audit.md; 2026-10-19-fixreports-implementation-review.md. Báo cáo kiểm chứng và giới hạn.

[S13] Bản gốc.docx do người dùng cung cấp, SHA256 61049eb3c19e2a1c0c811ffa620f690e6536f7879f06ff5b4ade780a19af7637. Chỉ dùng làm mẫu cấu trúc theo xác nhận; gói bị cắt nên không làm bằng chứng về hệ thống TMS.

[S14] Skill ask-why-ba và user-story-ac-writer, bộ hướng dẫn của Phúc NT/BA Zone trên máy. Dùng phương pháp phân lớp yêu cầu, INVEST và Given–When–Then; tác giả skill không phải tác giả dự án.


# Phụ lục A Ma trận truy vết

Ma trận dưới đây tổng hợp các miền nghiệp vụ. Hồ sơ đi kèm Doi-chieu-tung-muc.csv và Doi-chieu-tung-muc.json đối chiếu chi tiết 291 đầu mục, bảng, caption và trường nhận diện của bản gốc. Cột finalTarget trỏ tới tên mục thực tế trong báo cáo này; vị trí W-B là thứ tự khối XML, không phải số trang. Tệp Doi-chieu-va-ban-giao.md giải thích cách dùng và giới hạn của hồ sơ.

| Mục gốc / mục mới | Quyết định và US/UC | Source / schema | Sơ đồ | Bằng chứng và kết luận |
|---|---|---|---|---|
| 1.1 / 1.1 | C14, bối cảnh dự án | ProjectInformation; nội dung Spider Plus | 2 | Có nguồn dự án; cơ cấu đơn vị thực tập chưa cung cấp |
| 1.2 / 1.2 | C01–C14, phạm vi TMS | Module map frontend/backend | 3 | Implementation có phạm vi; không KPI giả |
| 2.1–2.2 / 2.1–2.3 | Thuật ngữ và phương pháp | pom, package, application mẫu | 5 | Source stack, không runtime mới |
| 3.1 / 3.1 | C01/02/08, US01/02, UC01/02 | FeatureService, V31–33 | 1, 8 | Source + test history; upload browser còn gate |
| 3.2 UC / 3.1.6 và3.2.4 | C03, US03/04, UC03 | AssignmentPlan, assignment tables | 4, 1, 8 | Assertion và native lịch sử; actor khác assignee |
| 3.2 sequence / 3.2.6 | C05/07, US05, UC04 | Result update, import_rows, audit | 6, 7 | Source và FE mock; không UAT mọi trạng thái |
| 3.2 UC / 3.2.4 | C06/13, US06/07, UC05/06 | FeatureIssueService, context/history | 4, 9 | Scope đúng case; không typedQA legacy |
| 3.4 / 3.4 | C09/11/12, US08/11/12 | Notes, assets, audit | 9, 10 | Quyền/source; rollout runtime riêng |
| 3.4 báo cáo / 3.4.3–4 | C10, US09, UC08 | ManagementReportService | 9 | Chỉ lưu text; count hidden-file cần kiểm |
| Gợi ý / 3.4.4 | C04/11, US10, UC09 | Portfolio/FeatureFacts/ChatStore | 2, 5 | Bounded context; chưa semantic/UAT toàn diện |
| 3.3 / 3.3 | C02, schema | V1–V33,85CREATE TABLE | 8, 9 | Source schema; receipt main lịch sử riêng |
| 3.5/kết luận / 3.5/kết luận | FR12/S11 còn review | Receipt test/build/cutover | 5 | Không biến checkpoint thành production UAT |


# Phụ lục B Phạm vi source và phương pháp review

Frontend được kiểm kê166 tệp JS/JSX ngoài test/setup, import closure tĩnh103 tệp. Backend được kiểm kê40 controller,33 migration và133 tệp Java dưới thư mục test. Đọc sâu các luồng nêu ở chương3; phần CSS toàn bộ, helper/dialog nội bộ, service legacy và mọi assertion không được tuyên bố đã review từng dòng. Danh sách file và mức đọc chi tiết nằm trong hồ sơ kèm theo.

Các thư mục dependency/build/cache/generated, credential và dữ liệu ngoài repository không thuộc đọc sâu. Không truy cập link Drive/SharePoint khách hàng. Kết quả inventory là phạm vi phân tích source; không phải số màn hình độc lập hay số nút đã bấm. Hai review độc lập frontend/backend được kiểm tra lại ở các nhận xét trọng yếu trước khi đưa vào nội dung.

| Skill | Áp dụng | Bằng chứng đầu ra |
|---|---|---|
| ask-why-ba | Phân lớp yêu cầu, Known/Unknown, chỉ hỏi chỗ thiếu | business-analysis.md; câu hỏi xác nhận mẫu/bìa |
| user-story-ac-writer | Refine 12 story, 37 AC, kiểm INVEST | Mục 3.1.6; không tự ước lượng hoặc đánh DONE |
| documents | Đọc OOXML, styles/caption/link, tạo DOCX và chẩn đoán render | Inventory, artifact.md, builder; render chưa đạt |
| grill-with-docs và grilling | Đối chiếu quyết định/source trước kết luận | Review frontend; không hỏi lại C01–C14 |
| domain-modeling | Thuật ngữ, ownership, cardinality | Glossary và sơ đồ dữ liệu |
| codebase-design | Package, router, service/store, legacy | Bản đồ module và kiến trúc |
| api-design | Contract, version, replay, error, pagination | Mục 3.4.3; nhận xét envelope khác nhau |
| security-review | Role, scope, session, CSRF, upload, AI | Ma trận quyền, giới hạn kiểm chứng |
| frontend-patterns | Route, state, async, capability | Review frontend và hành trình UI |
| documentation-and-adrs | Provenance, quyết định, lịch sử | Nguồn S01–S14, không bịa ADR mới |
| code-review | Mô tả source và sơ đồ đúng spec | Review độc lập frontend, backend và Word |
| using-superpowers | Chọn skill theo giai đoạn | Kế hoạch và hồ sơ skill |
| writing-plans | Đầu vào/đầu ra, phụ thuộc, DoD | working/plan.md |
| systematic-debugging | Tái hiện BadZipFile, CRC từng entry, thiếu renderer | Chẩn đoán file cắt và runtime manifest |
| requesting-code-review | Giao review độc lập rõ phạm vi | Ba nhánh review, không sửa sản phẩm |
| receiving-code-review | Kiểm finding trước sửa tài liệu | Sửa quyền, đường nối, AC; xem lại PNG |
| verification-before-completion | Chỉ kết luận có bằng chứng | Hash source/Word, OOXML, ảnh riêng; trang Word chưa kiểm |
| verification-loop | Kiểm nội dung/link/diff/secret theo tác vụ | Báo cáo kiểm chứng; không chạy test ứng dụng |
| handoff | Lưu trạng thái và phần còn lại | Handoff ở TEMP, tham chiếu hồ sơ hiện có |

