# Phân tích nghiệp vụ TMS phục vụ biên soạn báo cáo

Baseline 9ccc73483faddde48d930c9607f2f2f7f6981761, ngày 19/10/2026. Đây là nội dung phân tích độc lập với lựa chọn mẫu Word. Không phải biên bản nghiệm thu hay quyết định bổ sung tính năng.

## Mục tiêu và ranh giới

TMS tập trung công việc kiểm thử theo dự án, Feature, file và case để người quản lý theo dõi phạm vi phụ trách, kết quả và Bug/QA trong cùng ngữ cảnh. Feature trong hệ thống này biểu thị một đợt kiểm thử, không phải một chức năng của sản phẩm được kiểm thử. Cách dùng thuật ngữ này cần xuất hiện sớm trong báo cáo để tránh người đọc hiểu sai mô hình.

ADMIN quản trị tài khoản, dự án, thành viên và kho thiết bị. PM điều phối công việc trong dự án được giao. TESTER nhận phạm vi case, ghi Status và tạo Issue; DEV đọc thông tin thuộc quyền và xử lý lỗi được giao. Khách hàng, SHIFT và hoạt động bàn giao qua CAT là ngữ cảnh bên ngoài của dự án Spider Plus, không phải các tài khoản hoặc tích hợp TMS đã được chứng minh.

Nghiệp vụ được chốt tại C01–C14 trong `docs/planning/2026-10-19-fixreports-clarification.md`. Mô tả luồng execution/cycle/retest cũ phải được ghi là lịch sử. Không lấy luật cũ yêu cầu build/device/run để phủ quyết môi trường Feature nhập tự do hoặc tạo thêm quy trình retest.

## Phân lớp yêu cầu

| Lớp | Trạng thái | Căn cứ và giới hạn |
|---|---|---|
| Business | Đã rõ mục tiêu | Theo dõi kiểm thử theo file/Feature, giảm thao tác rời rạc, phân biệt kết quả và Issue; chưa có KPI hiệu quả đo tại doanh nghiệp |
| Stakeholder | Đã rõ vai trò nội bộ | ADMIN, PM, TESTER, DEV; không mở tài khoản khách hàng/BrSE từ tài liệu tham khảo |
| Functional | Đã chốt phần cốt lõi | C01–C14, phạm vi R01–R08; implementation và kiểm chứng phải đối chiếu riêng |
| Non-functional | Có căn cứ một phần | Phân quyền phía server, không mất bản nháp khi lỗi, xung đột phiên bản, bàn phím/responsive; SLA tải, quy mô production và UAT chưa được xác nhận |
| Transition | Có quyết định và bằng chứng lịch sử | Giữ workbook/case, bản độc lập theo Feature, Feature dữ liệu cũ chưa phân đợt; ngoại lệ nguồn và case chưa có file vẫn còn |

## Known và Unknown

| Mã | Điều đã biết hoặc còn thiếu | Ảnh hưởng |
|---|---|---|
| K01 | Status theo vòng Unexecuted → OK → NG → P → NA → Unexecuted | Giữ đủ năm trạng thái và không dùng Fix của DEV làm OK |
| K02 | Tiến độ = case khác Unexecuted / tổng case; P và NA đều tính | 100% là mức đã ghi nhận kết quả, không là nghiệm thu hoặc tỷ lệ đạt |
| K03 | Mỗi Feature có nội dung file/case độc lập | Không join Issue theo tên file; không gộp case trùng nội dung giữa Feature |
| K04 | Phân công không reset kết quả, không tạo run | Người phụ trách và người thực tế ghi kết quả là hai khái niệm riêng |
| K05 | ADMIN toàn quyền quản trị; PM liên dự án chỉ có quyền đọc AI đã chốt | Không mở quyền CRUD ngoài phạm vi dự án cho PM; không bỏ luật toàn vẹn dữ liệu cho ADMIN |
| K06 | Báo cáo Markdown lưu văn bản | Sửa báo cáo không sửa số Issue hoặc Status nguồn |
| K07 | Máy bàn giao cho PM; phân lại ngoài phần mềm | Không mô tả Tester phải đứng tên máy để chạy luồng Feature |
| U01 | Người dùng đã xác nhận dùng báo cáo du học làm mẫu cấu trúc cho TMS | Nội dung TMS được viết lại; thông tin bìa do người dùng bổ sung, không giữ tên tác giả/đơn vị mẫu |
| U02 | Word bị cắt ZIP, thiếu 35 ảnh tham chiếu và theme | Không xác minh toàn bộ hình/bố cục/số trang của bản gốc |
| U03 | Runtime Codex Windows không có bundled LibreOffice | Chưa thể đạt kiểm tra trực quan tất cả trang theo skill; không tự cài hoặc dùng desktop LibreOffice |
| U04 | Ngoại lệ ADMIN lưu trữ dự án có lý do đã được duyệt nhưng chưa có implementation | Mô tả là yêu cầu còn thiếu, không hứa nút đã hoạt động |
| U05 | Rules còn dùng điều kiện build/environment/device cũ | Tách hợp đồng legacy khỏi quy trình Feature; không tự chọn luật khách hàng |
| U06 | Chưa có UAT toàn bộ trạng thái/nút, thử thiết bị thật hoặc đánh giá AI dữ liệu nghiệp vụ đầy đủ | Không dùng số unit test hay ảnh vài màn để kết luận toàn hệ thống hoàn tất |

## Thuật ngữ dùng nhất quán

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

## User Story và Acceptance Criteria

Các story dưới đây diễn đạt lại quyết định đã chốt để bổ sung báo cáo. AC là kết quả nghiệp vụ cần đạt; sự tồn tại của AC không chứng minh đã kiểm thử. Phần INVEST đánh giá ranh giới và khả năng kiểm tra, không tự ước lượng ngày công.

### US-TMS-01 Tạo Feature

As a PM phụ trách dự án, I want to tạo một Feature với môi trường test cụ thể, So that tôi tập hợp đúng file và Issue của đợt kiểm thử. Scope: tạo Feature trong dự án còn hoạt động; không gồm workflow đóng/mở cycle. Nguồn: C01/C08. Use Case: UC-TMS-01.

- AC1 Given PM thuộc dự án đang hoạt động, tên hợp lệ và môi trường/mô tả nếu có tuân theo giới hạn, When lưu Feature, Then Feature mới thuộc đúng dự án và xuất hiện trong danh sách.
- AC2 Given môi trường là tên server hoặc URL nhập tự do, When lưu Feature hợp lệ, Then không yêu cầu chọn build hoặc máy vật lý để hoàn tất.
- AC3 Given tài khoản TESTER hoặc DEV, When yêu cầu tạo Feature, Then thao tác bị từ chối và không có Feature mới.

### US-TMS-02 Nhập file độc lập theo Feature

As a PM phụ trách dự án, I want to nhập cùng bộ Excel vào các Feature khác nhau, So that từng đợt giữ nội dung và kết quả riêng. Scope: preview và commit workbook; không chuyển hoặc xóa dữ liệu lịch sử. Nguồn: C02/C08. Use Case: UC-TMS-02.

- AC1 Given workbook hợp lệ và Feature đang hoạt động, When xác nhận nhập sau xem trước, Then file và case được tạo trong Feature đã chọn.
- AC2 Given workbook đã được nhập ở Feature A, When nhập cùng workbook vào Feature B, Then B có bản riêng và việc sửa case ở A không sửa nội dung của B.
- AC3 Given workbook thiếu thông tin case bắt buộc hoặc có ID nguồn trùng không hợp lệ, When yêu cầu nhập, Then hệ thống báo lỗi dữ liệu và không tạo bản nội dung đã xác nhận sai.

### US-TMS-03 Tự nhận phạm vi case

As a TESTER thuộc dự án, I want to nhận hoặc điều chỉnh phạm vi case của mình trong file, So that nhóm biết tôi chịu trách nhiệm phần nào. Scope: phạm vi của chính người thao tác; không tự lấy phần người khác. Nguồn: C03. Use Case: UC-TMS-03.

- AC1 Given case 1–35 chưa thuộc người khác, When Tester nhận phạm vi 1–35, Then đúng các case tương ứng được giao cho Tester đó.
- AC2 Given một case trong phạm vi đã thuộc Tester khác, When lưu phạm vi bị trùng, Then không ghi đè phân công của người kia và người dùng nhận thông báo xung đột.
- AC3 Given Tester định thay phạm vi của người khác, When lưu thay đổi, Then thao tác bị từ chối và phân công hiện có được giữ.

### US-TMS-04 Đổi người phụ trách sau kết quả

As a PM phụ trách dự án, I want to thay người phụ trách những case đã có kết quả, So that có người tiếp tục kiểm tra và truy được thay đổi trách nhiệm qua lịch sử. Scope: phân công, hai cột người test và lịch sử; không tạo execution mới. Hai cột là thông tin phân công, người thực ghi Status phải đối chiếu lịch sử kết quả. Nguồn: C03/C07. Use Case: UC-TMS-03.

- AC1 Given case đã có kết quả và người test đầu tiên, When PM đổi người phụ trách hợp lệ, Then kết quả hiện có được giữ và người test lại gần nhất được cập nhật.
- AC2 Given case đã đổi người nhiều lần, When đổi thêm lần nữa, Then giữ người test đầu tiên, cập nhật người test lại gần nhất và giữ lịch sử thay đổi, không phát sinh cột lần 3.
- AC3 Given dữ liệu phân công đã bị người khác thay đổi từ lúc mở form, When lưu bản cũ, Then hệ thống yêu cầu xử lý xung đột và không âm thầm ghi đè.

### US-TMS-05 Ghi Status của case

As a TESTER đang phụ trách case, I want to thay Status của case bằng một thao tác, So that kết quả kiểm thử và tiến độ phản ánh công việc đã ghi nhận. Scope: Status case trong file đang hoạt động; không tự đổi trạng thái Issue. Nguồn: C05/C07. Use Case: UC-TMS-04.

- AC1 Given case đang Unexecuted và người dùng có quyền ghi, When bấm thay Status và lưu thành công, Then kết quả thành OK và hiển thị phản hồi đã lưu.
- AC2 Given case đang NA, When bấm thay Status, Then kết quả quay về Unexecuted và case không còn được tính là đã test; P/NA trước đó đều thuộc số đã test.
- AC3 Given DEV hoặc Tester không có quyền ghi case, When yêu cầu đổi Status, Then kết quả không thay đổi và hệ thống thông báo từ chối.
- AC4 Given phiên bản kết quả đã thay đổi hoặc yêu cầu lưu lỗi, When người dùng gửi thay đổi trên dữ liệu cũ, Then hệ thống không báo đã lưu, giữ hoặc phục hồi kết quả đã xác nhận và yêu cầu tải lại để đối chiếu.

### US-TMS-06 Tạo Issue từ case

As a TESTER trong dự án, I want to mở Issue từ case đang kiểm tra, So that lỗi hoặc câu hỏi giữ đúng ngữ cảnh và có thể quay lại đối chiếu. Scope: Bug/QA liên kết đúng case; không tự tạo ở mọi dashboard. Nguồn: C06. Use Case: UC-TMS-05.

- AC1 Given đang mở case thuộc file và Feature cụ thể, When mở form Issue, Then Feature/file/case/các bước/kết quả mong muốn được điền từ đúng case.
- AC2 Given đã lưu Issue thành công, When quay lại case, Then badge phản ánh các Issue liên kết case đó, kể cả Issue đã đóng, không gộp bản case ở Feature khác.
- AC3 Given yêu cầu liên kết case không thuộc Feature đang chọn, When lưu Issue, Then yêu cầu bị từ chối và không tạo liên kết sai.

### US-TMS-07 Ghi nhận Bug phát hiện ngoài case

As a TESTER đang kiểm thử một Feature, I want to ghi Bug phát hiện bằng kiểm thử khám phá, So that lỗi ngoài bộ case vẫn được theo dõi trong đúng đợt. Scope: Bug thuộc Feature, case không bắt buộc; không thêm loại MONKEY. Nguồn: C13. Use Case: UC-TMS-06.

- AC1 Given Feature hợp lệ trong dự án, When tạo Bug khám phá với mô tả hợp lệ và không chọn case, Then Bug được lưu trong Feature đã chọn.
- AC2 Given tiêu đề không có tiền tố monkey test, When lưu Bug hợp lệ, Then hệ thống vẫn chấp nhận và loại vẫn là Bug.
- AC3 Given Tester định sửa hoặc xóa mềm Bug do người khác tạo mà không có quyền tương ứng, When thực hiện thao tác, Then hệ thống từ chối.

### US-TMS-08 Lưu Note chung

As a PM phụ trách dự án, I want to lưu Note chung, So that thành viên tra cứu cùng một thông tin làm việc. Scope: nội dung Note, không thêm đính kèm/phê duyệt. Nguồn: C11. Use Case: UC-TMS-07.

- AC1 Given PM có quyền trong dự án, When lưu Note hợp lệ, Then thành viên dự án đọc được nội dung đã lưu.
- AC2 Given Note đã bị chỉnh sửa sau lúc PM mở, When lưu bản cũ, Then không âm thầm ghi đè thay đổi mới.
- AC3 Given TESTER hoặc DEV đọc được Note, When yêu cầu sửa Note, Then hệ thống từ chối quyền ghi.

### US-TMS-09 Lưu văn bản báo cáo

As a PM được phép xem phân tích dự án, I want to sửa và lưu báo cáo Markdown, So that lần xem và tải sau phản ánh bản báo cáo đã biên tập. Scope: văn bản báo cáo của dự án hoặc Feature; không ghi lại dữ liệu gốc. Nguồn: C10. Use Case: UC-TMS-08.

- AC1 Given báo cáo hợp lệ trong phạm vi quyền, When lưu nội dung đã sửa, Then mở lại và tải báo cáo cho cùng nội dung đã lưu.
- AC2 Given báo cáo có câu 10 lỗi, When sửa văn bản thành 8 lỗi và lưu, Then báo cáo thể hiện 8 lỗi nhưng dữ liệu Issue nguồn giữ nguyên.
- AC3 Given tài khoản TESTER hoặc DEV, When yêu cầu tạo hoặc xuất báo cáo quản trị, Then hệ thống từ chối kể cả truy cập trực tiếp.

### US-TMS-10 Hỏi AI trong phạm vi được phép

As a TESTER thuộc dự án, I want to hỏi AI về case hoặc Issue được phép đọc, So that tôi có thêm thông tin hỗ trợ công việc. Scope: chat riêng và ngữ cảnh đã được cấp quyền, không dùng câu trả lời để tự phân công. Nguồn: C04/C10/C11. Use Case: UC-TMS-09.

- AC1 Given người dùng có quyền đọc case của dự án, When hỏi về case đó, Then ngữ cảnh riêng cấp cho AI chỉ chứa dữ liệu được phép và phần trả lời cần nói rõ khi không đủ nguồn cho kết luận; chất lượng ngữ nghĩa được kiểm chứng riêng.
- AC2 Given không chọn riêng dự án, When hỏi thông tin công việc, Then hệ thống xác định phạm vi theo quyền hiện hành; không khẳng định đã đọc mọi ô của mọi file khi ngữ cảnh bị giới hạn.
- AC3 Given TESTER yêu cầu thông tin riêng của dự án ngoài quyền hoặc báo cáo quản trị hàng loạt, When gửi câu hỏi, Then hệ thống từ chối phần không được phép và không cung cấp dữ liệu riêng đó.

### US-TMS-11 Bàn giao máy cho PM

As an ADMIN quản lý kho máy, I want to bàn giao máy đã chọn cho PM, So that trách nhiệm nhận thiết bị của dự án được ghi nhận. Scope: kho máy và PM nhận, không quản lý PM phân lại cho thành viên. Nguồn: C09. Use Case: UC-TMS-10.

- AC1 Given các máy đã chọn còn sẵn sàng và một PM nhận hợp lệ, When xác nhận bàn giao cả lô, Then hệ thống lưu rõ tất cả máy đã chọn được bàn giao cho cùng PM đó.
- AC2 Given một máy đã không còn sẵn sàng khi lưu, When xác nhận lựa chọn cũ, Then có phản hồi kết quả/xung đột cụ thể và không báo toàn bộ thành công sai.
- AC3 Given người nhận là TESTER hoặc DEV, When yêu cầu bàn giao theo luồng này, Then thao tác bị từ chối.

### US-TMS-12 Xem nhật ký theo ngày Việt Nam

As an ADMIN rà soát hoạt động, I want to tìm nhật ký bằng nhiều từ và khoảng ngày, So that truy được thao tác phù hợp mà không cần nhớ nguyên văn. Scope: bộ lọc nhật ký, không thay múi giờ hoặc xóa sự kiện. Nguồn: C12. Use Case: UC-TMS-11.

- AC1 Given nhật ký có các từ cần tìm trên người/dự án/đối tượng/thao tác, When tìm nhiều từ không dấu khác thứ tự, Then kết quả khớp đủ các từ, không phụ thuộc hoa thường hoặc dấu.
- AC2 Given chọn ngày kết thúc tại Việt Nam, When lọc nhật ký, Then khoảng tìm bao gồm hết ngày đó theo Asia/Ho_Chi_Minh.
- AC3 Given tài khoản không có quyền xem nhật ký quản trị, When yêu cầu truy cập dữ liệu, Then hệ thống từ chối.

## Kiểm tra INVEST

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
