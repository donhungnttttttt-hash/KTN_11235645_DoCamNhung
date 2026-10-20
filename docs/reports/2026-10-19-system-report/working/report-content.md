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

{{GLOSSARY}}

Yêu cầu được phân thành năm lớp: mục tiêu nghiệp vụ, nhu cầu stakeholder, chức năng, chất lượng và chuyển đổi dữ liệu. Quyết định C01–C14 là căn cứ chính cho nghiệp vụ mới. Khi source khác yêu cầu, báo cáo giữ cả hai mô tả và nêu tác động; không sửa sản phẩm để làm cho tài liệu khớp.

{{REQUIREMENT_LAYERS}}

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

Quy trình ở Hình 5 tách trách nhiệm PM/ADMIN, TESTER và hệ thống. Luồng thay thế là Tester tự nhận phạm vi của mình. Khi trùng case hoặc phiên bản đã thay đổi, hệ thống từ chối ghi đè và yêu cầu người dùng đối chiếu. Hoạt động kiểm thử thực tế và trao đổi retest không được chuyển thành execution workflow mới chỉ để hoàn chỉnh sơ đồ.

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

{{PERMISSIONS}}

ADMIN toàn quyền quản trị vẫn phải tuân thủ version, scope identity và luật toàn vẹn; điều đó không cấp quyền đọc hội thoại riêng qua API chat của tài khoản khác. Các hành động riêng với Monkey Bug và DEV được giao phải theo capability thực tế. Việc ẩn nút chỉ là hỗ trợ giao diện, không thay guard server.

### 3.1.6 User Story và Acceptance Criteria

{{STORIES}}

## 3.2 Mô hình hóa và kiến trúc

### 3.2.1 Ngữ cảnh hệ thống

{{FIG:01-context}}

Hình 1 mô tả người dùng nội bộ, dữ liệu Excel và các adapter AI/Redmine. AI nhận ngữ cảnh sau kiểm quyền; kết quả là nội dung hỗ trợ. CAT, SHIFT và Backlog là bối cảnh làm việc bên ngoài, chưa có căn cứ coi chúng là endpoint tích hợp của TMS.

### 3.2.2 Phân rã chức năng

{{FIG:03-modules}}

Nhóm kiểm thử, cộng tác và tổng hợp dùng chung identity dự án nhưng có quyền khác nhau. Backend vẫn chứa package legacy; chúng được phân loại riêng trong bản đồ source. Một controller còn trong source không đủ chứng minh lệnh ghi của nó đang mở.

### 3.2.3 Use Case tổng quát

{{FIG:04-use-cases}}

Các association trong sơ đồ chỉ thể hiện vai trò tham gia, không cấp toàn bộ CRUD cho vai trò đó. TESTER tham gia đọc Note nhưng không lưu Note; DEV tham gia Issue trong phạm vi được giao; PM xem báo cáo theo dự án. Ma trận ở mục 3.1.5 và đặc tả dưới đây là căn cứ về điều kiện chi tiết.

### 3.2.4 Đặc tả Use Case

{{USE_CASES}}

### 3.2.5 Kiến trúc và tổ chức source

{{FIG:02-architecture}}

Kiến trúc là một backend Spring Boot tổ chức theo package chức năng, không phải microservices. Frontend gọi API JSON, sử dụng cookie phiên và CSRF. Backend phối hợp JPA cho một số phần và JdbcTemplate/store cho nhiều nghiệp vụ. MySQL giữ dữ liệu nghiệp vụ, audit, phiên và chat; Flyway quản lý schema. Hình 2 mô tả thành phần logic, không xác nhận một cấu hình production hay topology nhiều máy.

{{BACKEND_MODULES}}

### 3.2.6 Trình tự thao tác xuyên tầng

{{FIG:06-sequence-status}}

Khi ghi Status, frontend tính giá trị tiếp theo và gửi cùng version/requestKey. Backend kiểm tài khoản, dự án, Feature/file và quyền trên row, khóa dữ liệu cần thiết rồi cập nhật kết quả/audit. Giao diện chỉ báo đã lưu sau response thành công. Lỗi quyền hoặc xung đột trả phản hồi và không tự ghi tiếp; trạng thái pending trên giao diện không phải bằng chứng database đã lưu.

Import có hai bước preview và commit. Preview đọc workbook, kiểm ID nguồn và nội dung bắt buộc, lưu bản tạm hết hạn 24 giờ. Commit của đúng người nhập tạo suite, case/revision độc lập và assignment rỗng trong Feature. Gọi lại commit với preview đã committed trả summary, không sinh bản thứ hai. Giới hạn parser source là .xlsx 5 MiB và 500 dòng; đây không phải chứng minh mọi workbook khách hàng đã được thử bằng browser.

Phân công gửi rowIds thực cùng membershipId và version file. PM có thể đổi nhiều người trong một transaction; Tester chỉ đổi phạm vi của mình. AssignmentPlan từ chối row ngoài file hoặc trùng owner, từ chối phạm vi đè người khác. Kết quả Status không bị reset và không có execution run mới.

Tạo Issue lấy context từ server theo Feature/document/row. Sau khi lưu, UI quay về case và đọc lại badge. Badge tính mọi Issue liên kết case, không chỉ Issue còn mở. Tên file giống nhau ở Feature khác không phải căn cứ gom Issue.

### 3.2.7 Trạng thái và vòng đời

{{FIG:09-status}}

Hình 9 là vòng bấm trên giao diện. Backend nhận một trạng thái thuộc tập hợp năm giá trị và kiểm quyền/version; không ép mọi client đi qua từng cạnh trong vòng. NG không tự sinh Bug và resolved của DEV không tự biến case thành OK.

Feature và file dùng archive để ẩn dữ liệu, không xóa dây chuyền case/Issue. Feature có thao tác restore; file hide không được mô tả thành chức năng restore file nếu UI/contract chưa cung cấp. Issue có danh mục trạng thái theo loại; source kiểm allowed target statuses và capability, không áp một đồ thị cạnh legacy bắt buộc. DEV đang được giao chỉ được chuyển progress/resolved trong phạm vi source cho phép.

## 3.3 Thiết kế dữ liệu

### 3.3.1 Mô hình dữ liệu và quan hệ

{{FIG:07-data-core}}

Project có nhiều Feature; mỗi file mới thuộc một Feature; file có các row và case độc lập. Row chứa Status hiện hành, case liên kết revision nội dung. Assignment liên kết row và membership của đúng dự án. Các cột nullable của graph cũ không làm mất ràng buộc của graph mới; khóa ngoại tổng hợp có project/file scope cần được giữ khi mô tả vật lý.

{{FIG:08-data-support}}

Issue dùng work_items với Feature context riêng. Note và báo cáo thuộc project, báo cáo có thể thêm Feature. Chat thuộc tài khoản và turn cùng owner, được mô tả trong từ điển dữ liệu. Sơ đồ 7–8 chỉ thể hiện miền đang dùng và khóa chính; bảng lịch sử cycle/run/retest/Redmine vẫn tồn tại trong schema và được kiểm kê trong hồ sơ kèm theo.

### 3.3.2 Từ điển dữ liệu và ràng buộc

{{DATA_DICTIONARY}}

Các index quan trọng gồm ix_feature_list, ix_feature_documents, ix_document_owner, ix_feature_issues, ix_case_issues, ix_management_reports và ix_project_notes_list. Chúng phục vụ truy vấn theo dự án, trạng thái lưu trữ, file, người phụ trách hoặc thứ tự cập nhật. Chưa có EXPLAIN/benchmark mới trong tác vụ này; không coi sự tồn tại của index là bằng chứng đạt SLA.

Kiểm kê source có 85 câu CREATE TABLE qua 33 migration, không tính flyway_schema_history. Đây là số bảng được khai báo trong source, không phải số bảng vừa đo trên server. V20/V22 ở khu vực demo; V32/V33 là Java migration. Schema cuối phải đọc cùng ALTER, không dừng ở V4/V7. Toàn bộ DDL và controller inventory được lưu trong hồ sơ đối chiếu để truy vết.

### 3.3.3 Bảo toàn và nguồn gốc dữ liệu

source_batch_id và source_import_row_id giữ nguồn chuyển đổi; khóa unique giúp tránh copy lặp. Migration tạo bản case hiện hành riêng, giữ revision/cell overlay cần thiết và lưu mapping cũ–mới. Không lấy số thay đổi Status làm số lần chạy kiểm thử vật lý hoặc điểm năng lực cá nhân.

Receipt main-after-proof lịch sử ghi V30→V33, kiểm 7.374 hàng cũ giữ nguyên trong 74 bảng ngoài session, 10 bản file/711 case và 120 case chưa thuộc file giữ trong graph cũ. Một nguồn thiếu workbook được giữ ngoại lệ. Số liệu này mô tả lần chuyển đổi đã ghi nhận; không có phép đọc metadata mới trong lượt biên soạn.

## 3.4 Giao diện API và hành trình người dùng

### 3.4.1 Điều hướng và giao diện theo vai trò

{{FIG:10-navigation}}

ADMIN đăng nhập vào khu quản trị; lựa chọn vào workspace là hành động riêng. Người dùng workspace chọn dự án và đi tới Tổng quan, Bảng công việc, Quản lý lỗi, Thông tin chung hoặc Phân tích theo quyền. Chat nổi vẫn có ở shell; menu trang AI cũ đã bỏ. Cấu hình nguồn/model được mở trong chat, không đồng nghĩa loại bỏ backend provider hoặc lịch sử riêng.

{{FRONTEND_MODULES}}

### 3.4.2 Trạng thái giao diện và khả năng phục hồi

Các luồng chính có pending, error và đọc lại khi xung đột. Note cho đối chiếu bản mới; assignment giữ lựa chọn và version mới nhưng chưa trình bày đầy đủ toàn bộ phạm vi của người khác trong bước đối chiếu. Khi hết phiên, cơ chế reauth cùng người dùng giữ nháp; không tự phát lại mọi lệnh ghi hoặc yêu cầu AI có chi phí.

Màn Kanban đếm theo trang dữ liệu đang hiển thị và có nhãn phạm vi; không nên diễn giải con số đó là tổng Issue toàn hệ thống. Bản đồ màn hình trong báo cáo là tài liệu phân tích source, không thay ảnh chụp runtime và không chứng minh mọi control đã được thao tác.

### 3.4.3 Contract API quan trọng

{{API_TABLE}}

Request ghi cần CSRF và session hợp lệ. Lỗi thường gặp gồm 401 chưa xác thực, 403 sai quyền/CSRF, 404 không có dữ liệu trong phạm vi, 409 xung đột version hoặc idempotency, 410 preview hết hạn/luồng cũ đã nghỉ và 422 dữ liệu không hợp lệ. Mã cụ thể phụ thuộc endpoint; không ép một schema lỗi chung không có trong source.

Phân trang cũng khác nhau: Feature trả pageSize, Notes và báo cáo trả size; lịch sử assignment dùng nextBefore. Người dùng API cần theo từng contract, không lấy một ví dụ làm envelope thống nhất cho toàn hệ thống.

### 3.4.4 AI và tích hợp

{{AI_CONTENT}}

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

{{TEST_EVIDENCE}}

Test frontend dùng mock có giá trị kiểm state và contract phía UI, nhưng không tự chứng minh FK/transaction database. Test native có phạm vi riêng; không cộng các suite chạy lặp thành tổng số test duy nhất. Coverage ở checkpoint trước không được gán cho source cuối nếu chưa đo lại. Không dùng số file/controller/control để thay tỷ lệ bấm nút hoặc UAT.

### 3.5.4 Hạn chế và hướng hoàn thiện

{{LIMITATIONS}}

Hướng hoàn thiện trước hết là xử lý các khoảng trống đã có căn cứ: ngoại lệ lưu trữ dự án legacy có lý do; đồng bộ contract Rules; kiểm chứng tính nhất quán count khi ẩn file; và bổ sung UAT theo role/state/thiết bị. Đánh giá chất lượng AI cần dữ liệu và tiêu chí nghiệp vụ thật trong phạm vi được phép. Các nội dung này là công việc tiếp theo, không được mô tả là tính năng đã hoàn tất.

# Kết luận

TMS hiện có implementation cho quản lý kiểm thử theo Feature/file/case, phân công theo phạm vi, Status, Bug/QA, Note, báo cáo Markdown và chat AI có giới hạn quyền. Cấu trúc báo cáo mẫu được giữ ở cấp chương và mục tiêu phân tích, còn toàn bộ nghiệp vụ du học được thay bằng mô hình thực tế của TMS.

Đối chiếu cho thấy cần phân biệt rõ mô hình hiện hành với code và dữ liệu legacy. Quyền ADMIN, ngoại lệ AI của PM, công thức P/NA và tính độc lập của báo cáo văn bản là những nội dung có thể bị mô tả sai nếu chỉ dùng tài liệu cũ. Các bằng chứng lịch sử hỗ trợ kết luận trong phạm vi đã chạy; FR-12/S11 vẫn IN_REVIEW và chưa có căn cứ nghiệm thu toàn bộ nút, trạng thái hoặc production.

Bản tài liệu đã có cấu trúc phân tích và sơ đồ nguồn để tiếp tục hoàn thiện. Thông tin bìa, dữ kiện đơn vị thực tập và kiểm tra trực quan toàn bộ trang Word còn cần bổ sung/xác minh trước khi dùng như bản nộp chính thức. Không thay những phần thiếu bằng tên người, thành tích hoặc số liệu giả.

# Tài liệu tham khảo và nguồn đối chiếu

{{REFERENCES}}

# Phụ lục A Ma trận truy vết

Ma trận dưới đây tổng hợp các miền nghiệp vụ. Hồ sơ đi kèm Doi-chieu-tung-muc.csv và Doi-chieu-tung-muc.json đối chiếu chi tiết 291 đầu mục, bảng, caption và trường nhận diện của bản gốc. Cột finalTarget trỏ tới tên mục thực tế trong báo cáo này; vị trí W-B là thứ tự khối XML, không phải số trang. Tệp Doi-chieu-va-ban-giao.md giải thích cách dùng và giới hạn của hồ sơ.

{{TRACEABILITY}}

# Phụ lục B Phạm vi source và phương pháp review

Frontend được kiểm kê166 tệp JS/JSX ngoài test/setup, import closure tĩnh103 tệp. Backend được kiểm kê40 controller,33 migration và133 tệp Java dưới thư mục test. Đọc sâu các luồng nêu ở chương3; phần CSS toàn bộ, helper/dialog nội bộ, service legacy và mọi assertion không được tuyên bố đã review từng dòng. Danh sách file và mức đọc chi tiết nằm trong hồ sơ kèm theo.

Các thư mục dependency/build/cache/generated, credential và dữ liệu ngoài repository không thuộc đọc sâu. Không truy cập link Drive/SharePoint khách hàng. Kết quả inventory là phạm vi phân tích source; không phải số màn hình độc lập hay số nút đã bấm. Hai review độc lập frontend/backend được kiểm tra lại ở các nhận xét trọng yếu trước khi đưa vào nội dung.

{{SKILLS}}
