# Đối chiếu tài liệu KL.zip với hệ thống TMS

Ngày: **17/10/2026 — Asia/Saigon**. Source đối chiếu: `system-design`, commit `caf075af7231f207259b6a62808bff5c8445f6af`. Đây là báo cáo đọc tài liệu và đối chiếu source; không phải đợt kiểm thử runtime hoặc nghiệm thu hệ thống.

## 1. Kết luận chính

**Bộ tài liệu chưa mô tả chính xác hệ thống đang có.** Bản `Chương 3 (hoàn chỉnh).docx` tiến bộ rõ về bố cục và độ chi tiết so với bản nháp, nhưng đang trộn ba lớp: quy trình công ty ban đầu, thiết kế hệ thống mong muốn và chức năng đã triển khai. Những sai lệch lớn nằm ở kiến trúc công nghệ, tài khoản/quyền, vòng đời đợt, QA, retest/đóng bug và công thức báo cáo. Không nên dùng nguyên bản này làm đặc tả “đã cài đặt” hoặc hướng dẫn triển khai source hiện tại.

Không phải nội dung nào khác code cũng sai về nghiệp vụ. Tài khoản khách hàng, vai trò BrSE và vòng hỏi đáp với phía Nhật đã có trong ý tưởng ban đầu; chúng có giá trị, nhưng **chưa được hiện thực đầy đủ trong phiên bản nội bộ hiện hành**. Ngược lại, một số chi tiết như bắt buộc đóng bug tự động hoặc ngưỡng SLA 8/24 giờ không thể coi là quy tắc khách hàng đã duyệt chỉ vì được viết thành BR trong Word.

Phần mạnh nhất có thể giữ là cách nêu vấn đề dữ liệu phân tán, truy vết người/build/thiết bị, quản lý phiên bản và liên kết test–bug. Phần cần viết lại trước là **mục 3.3, 3.5 và các quy tắc trọng tâm của UC_01–UC_11**. Việc đổi vài tên bảng hoặc thay chữ Supabase bằng MySQL sẽ không đủ.

## 2. Phạm vi đọc và cách xác định bằng chứng

Nguồn gốc: `C:/Users/admin/Downloads/KL.zip`. Bản gốc không được chỉnh sửa. [Inventory/hash](../../var/kl-review-2026-10-17/archive-inventory.json), [chỉ mục 5 file Word](../../var/kl-review-2026-10-17/document-index.json), [văn bản trích](../../var/kl-review-2026-10-17/text/), [nhãn/kết nối 22 sơ đồ](../../var/kl-review-2026-10-17/diagrams.json), [schema source](../../var/kl-review-2026-10-17/source-schema.json).

Đọc nội dung phân tích/quy trình, 14 bảng UC, 25 bảng dữ liệu và phần giao diện/triển khai của bản hoàn chỉnh; đối chiếu phần chung với hai bản cũ và đọc toàn bộ ghi chép quy trình. Với `Bản gốc.docx`, kiểm tra danh tính đề tài, cấu trúc, các mục thiết kế/công nghệ liên quan để xác định vai trò tài liệu mẫu; không dùng nó như nguồn xác nhận nghiệp vụ TMS và không tuyên bố đã thẩm định toàn bộ nghiên cứu du học.

Mã `D3-Pxxxx` là số đoạn XML trong bản hoàn chỉnh; `D3-Txxx` là bảng trích xuất. **Đây không phải số trang Word.** Báo cáo ưu tiên kèm mục/UC/tên trường để tìm bằng chức năng Find. Không xác nhận phân trang, font khi in hay đường nối thực tế bị chồng chỉ từ source XML. Browser không cho mở `file://` SVG trong lần này; không tìm cách vượt hạn chế, không coi nhãn/geometry là ảnh đã kiểm thị giác.

Thứ tự đối chiếu: quyết định người dùng mới nhất → code/contract hiện hành → migration → trạng thái/bằng chứng kiểm chứng. Tài liệu trong repository có mục lịch sử; ví dụ giới hạn ADMIN cũ đã bị quyết định 10/10 thay thế. `docs/deployment.md` còn mốc schema V12 nên cũng không được chép nguyên mốc đó làm hiện trạng V29.

### 2.1. Trong ZIP có những gì?

| Mã | File | Nội dung và trạng thái |
| --- | --- | --- |
| D1 | `Bản gốc.docx` | Khóa luận về quản lý hành trình du học tại Enlightening; 2484 đoạn, 40 bảng, 72 media. Là tài liệu tham khảo bố cục, **không mô tả TMS của chúng ta**. |
| D2 | `Chương 3 (backup trước khi sửa).docx` | Bản đề cương có bìa/phần đầu/Chương 1, khung Chương 2 và Chương 3 chưa hoàn thiện; 323 đoạn, 1 bảng, 13 media. |
| D3 | `Chương 3 (hoàn chỉnh).docx` | Bản mở rộng 2272 đoạn, 46 bảng, 13 media; có 12 nhóm UC với 14 UC trọng tâm, 25 bảng dữ liệu và phần triển khai. Vẫn là bản thảo chưa khớp source. |
| D4 | `Chương 3.docx` | **Trùng byte với D2**, cùng SHA-256 `EFE4BF8B…6467DB7`; không phải bản hoàn chỉnh mới. |
| D5 | `QUy trình.docx` | 33 đoạn ghi chép thực tế/ý tưởng ban đầu; rất có giá trị cho khảo sát, còn văn phong ghi chú và ý chưa chốt. |
| Sơ đồ | `diagrams/` | 22 file drawio +22 SVG, tương ứng Hình 3.1–3.22; 1 file hướng dẫn. 9 ảnh UI 3.23–3.31 chưa có trong ZIP. |

Cả gói có **50 file và 2 thư mục**. 257 đoạn đầu của D2 và D3 giống hệt về văn bản; 13 media của D2/D3 cũng trùng byte. Vì vậy bản mới chỉ phát triển phần sau, chưa xử lý các lỗi sẵn có ở phần đầu.

## 3. Tài liệu đang được viết theo cách nào?

### 3.1. Những điểm viết tốt hơn bản cũ

1. **Có mạch vấn đề → quy trình → yêu cầu → mô hình → UC → CSDL → giao diện → triển khai.** Bản cũ chủ yếu là tiêu đề/ghi chú; bản mới đã làm phần lớn khung phân tích.
2. **UC có cấu trúc dễ kiểm tra:** tác nhân, kích hoạt, tiền/hậu điều kiện, luồng chính, luồng thay thế và BR. Cách trình bày này tốt hơn mô tả bằng các đoạn văn chung chung.
3. **Tách QA khỏi BUG.** Đây là tiến bộ so với việc coi mọi câu hỏi là lỗi; phù hợp nhu cầu thật trong D5 và việc hệ thống hiện có loại QA riêng.
4. **Tách phiên bản nội dung và lịch sử thực thi.** `test_case_version` và `test_execution` thể hiện nhận thức đúng rằng sửa nội dung không được viết lại kết quả lịch sử.
5. **Nêu đủ ngữ cảnh tái hiện:** môi trường, thiết bị, build, bước tái hiện, mong đợi/thực tế. Đây là đúng hướng với vấn đề ticket thiếu thông tin.
6. **Phân biệt lỗi từ case và lỗi ngoài case.** Ý tưởng đúng; cần sửa quyền và cách liên kết theo phiên bản nội bộ đang có.
7. **Có ngoại lệ, rollback, lưu nháp và lịch sử.** Giá trị ở việc nghĩ đến thất bại; cần bổ sung conflict/version/idempotency thực tế thay vì chỉ mô tả lỗi nhập liệu.
8. **Có file sơ đồ chỉnh sửa được.**22 cặp drawio/SVG hữu ích cho bảo trì tài liệu, không chỉ cung cấp ảnh phẳng.

Không nên bỏ bản hoàn chỉnh để quay về bản cũ. Nên dùng nó làm nền biên tập, thay các giả định sai và phân loại rõ phần đề xuất.

### 3.2. Hạn chế trong cách viết

- Dùng nhiều câu xác quyết “hệ thống thực hiện/không cho phép/luôn…” cho chức năng chưa có hoặc quy tắc chưa chốt.
- Mô tả cả tác nghiệp công ty, hành vi ứng dụng và hành động chuyên môn như dịch/sửa lỗi trong cùng một luồng mà chưa chỉ rõ bước nào nằm ngoài phần mềm.
- Chưa có ma trận yêu cầu → màn hình → API → bảng → test/bằng chứng. Tài liệu có nhiều chi tiết nhưng thiếu đường kiểm chứng các chi tiết đó.
- Dùng “test case” để chỉ cả định nghĩa, revision, run, kết quả hiện hành và phân công. Chính sự nhập nhằng này dẫn tới nhiều lỗi thiết kế.
- Các đoạn về ưu thế thương mại, hiệu năng và nghiệm thu thiếu điều kiện đo/nguồn. Số liệu và ý tưởng dự kiến cần được gắn nhãn thay vì viết như kết quả đã có.

## 4. Các sai lệch trọng yếu với hệ thống hiện tại

Ưu tiên dưới đây là **ưu tiên sửa tài liệu**, không phải khẳng định có sự cố bảo mật đang xảy ra. “Sai hiện trạng” nghĩa là không thể dùng câu đó để mô tả source hiện tại; một số nội dung vẫn có thể giữ ở chương định hướng.

### F01 — Sai nền tảng công nghệ và mô hình triển khai — ưu tiên cao nhất

**Ở đâu:** D3 mục 3.5, T045, P2179/P2242–P2245; DB dùng `uuid/jsonb/timestamptz`.

Tài liệu chỉ Supabase/PostgreSQL 15+, Supabase Auth/Storage/RLS, Node.js và frontend ở edge. Source hiện dùng **React JavaScript/Vite/Tailwind/Lucide ở frontend; Java 21/Spring Boot 3.5.16 ở backend; MySQL/Flyway; Spring Security và Spring Session JDBC**. Backend sở hữu API, transaction và quyền. Node là công cụ frontend, không thay JVM backend.

**Bằng chứng:** [pom: 7](../../Backend/pom.xml#L7), [pom: 15](../../Backend/pom.xml#L15), [pom: 31](../../Backend/pom.xml#L31), [Frontend package](../../Frontend/package.json), [SecurityConfig](../../Backend/src/main/java/vn/syp/tms/config/SecurityConfig.java), [Workbench/native](../database/mysql-workbench.md).

**Cần sửa:** viết lại mục 3.5 theo kiến trúc đang triển khai, tách local và release; mô tả bootstrap ADMIN, Flyway, backend/JAR, frontend tĩnh, same-origin `/api`, evidence storage, secret và backup. Không thực thi DDL 25 bảng vào một Supabase mới để “chạy hệ thống này”.

### F02 — Thiếu ADMIN và mô tả sai quyền PM/Khách hàng/BrSE — cao

**Ở đâu:** P0317/P0447–P0487, UC_01, các sơ đồ 3.7–3.9 và bảng `role`.

Tài liệu xác định 5 vai trò Khách hàng/BrSE/PM/Tester/Dev, giao PM quản trị tài khoản và cấp khách hàng. Hiện có **4 vai trò hệ thống ADMIN/PM/TESTER/DEV**, cùng membership theo dự án; chưa có đăng nhập CUSTOMER/BRSE. ADMIN tổng toàn quyền nghiệp vụ theo quyết định 10/10, không cần membership; guard dữ liệu/version/project/archive vẫn áp dụng. Quản lý membership và máy thuộc quản trị tổng. PM chỉ tạo TESTER khi được ADMIN cấp riêng, không tự cấp tài khoản khách/ADMIN/PM hoặc quản lý toàn bộ tài khoản.

Các từ `CUSTOMER/BRSE/SHIFT` trong nguồn xác nhận không biến chúng thành role đăng nhập. Có chỗ ghi nhận kết luận nhận từ bên ngoài, khác với khách trực tiếp đăng nhập phê duyệt.

**Bằng chứng:** [IdentityDtos: 16](../../Backend/src/main/java/vn/syp/tms/identity/IdentityDtos.java#L16), [IdentityService: 29](../../Backend/src/main/java/vn/syp/tms/identity/IdentityService.java#L29), [quyền hiện hành](../business/permissions.md), [ProjectService](../../Backend/src/main/java/vn/syp/tms/project/ProjectService.java), [clarification DTO: 35](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemDtos.java#L35).

**Cần sửa:** sơ đồ hiện trạng dùng ADMIN/PM/TESTER/DEV; actor khách/BrSE thuộc sơ đồ nghiệp vụ tổ chức hoặc sơ đồ đề xuất mở rộng, ghi rõ chưa triển khai. Không xóa khỏi khảo sát thực tế chỉ vì source hiện chưa có.

### F03 — Đăng nhập và chính sách tài khoản có nhiều chi tiết được đặt thêm — cao

**Ở đâu:** UC_01/T003, P0315–P0316, P2137, bảng `app_user`.

- Hiện đăng nhập bằng **username**, không phải email.
- Login sai, tài khoản disabled hoặc không tồn tại trả lỗi xác thực chung; tài liệu lại có nhánh thông báo riêng tài khoản disabled.
- Chưa có luồng reset qua email, đổi mật khẩu bắt buộc lần đầu hoặc mật khẩu tạm 72 giờ như mô tả.
- Throttle hiện là tối đa 5 request/user và 30 request/IP trong cửa sổ 60 giây; không phải 5 lần sai liên tiếp rồi khóa 15 phút.
- Timeout 30 phút là **default có cấu hình**, phần này có căn cứ; HTTPS là yêu cầu triển khai, không chứng minh local HTTP hiện đã mã hóa.

**Bằng chứng:** [Login DTO: 9](../../Backend/src/main/java/vn/syp/tms/identity/IdentityDtos.java#L9), [AuthController: 33](../../Backend/src/main/java/vn/syp/tms/identity/AuthController.java#L33), [IdentityService.authenticate](../../Backend/src/main/java/vn/syp/tms/identity/IdentityService.java#L38), [LoginThrottle: 19](../../Backend/src/main/java/vn/syp/tms/identity/LoginThrottle.java#L19), [application.yml: 8](../../Backend/src/main/resources/application.yml#L8), [form đăng nhập](../../Frontend/src/app/features/auth/AuthBoundary.jsx).

**Cần sửa:** mô tả đúng implementation; các tính năng reset/password rotation nếu muốn giữ phải thành yêu cầu mở rộng, có thiết kế và tiêu chí riêng.

### F04 — Vòng đời đợt và quyền chốt đợt khác code — cao

**Ở đâu:** P0328, UC_02/UC_04, P0308–P0309 và 3.1/3.5/3.9.

Tài liệu đưa 5 trạng thái Khởi tạo → Sẵn sàng phân công → Đang thực thi → Chờ nghiệm thu → Đã nghiệm thu, tự kích hoạt sau phân công và khách hàng nghiệm thu. Hiện là **DRAFT → ACTIVE → CLOSED**, có lệnh activate riêng, chốt/mở lại do PM hoặc ADMIN. Tạo scope/phân công không tự activate.

Chốt đợt hiện chặn Chưa chạy/P và NG chưa gắn bug; nếu còn NG/open bug/open retest cần ghi nhận tồn đọng. Không đồng nghĩa phải được khách hàng phán định mọi tồn đọng trước khi chốt. **Chốt đợt nội bộ khác nghiệm thu khách hàng, khác archive dự án, khác đóng bug.**

**Bằng chứng:** [ExecutionService.activate: 122](../../Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java#L122), [CycleDecisionService: 51](../../Backend/src/main/java/vn/syp/tms/cycle/CycleDecisionService.java#L51), [ADR-008](../decisions/ADR-008-internal-reporting.md), [quyết định archive](../planning/project-lifecycle-2026-10-08.md).

### F05 — Sai thứ tự và phạm vi thư viện/import — cao

**Ở đâu:** P0273–P0277, UC_02/UC_03, bảng `test_case_file.test_cycle_id`.

Tài liệu gắn file/case ngay với một cycle; có đoạn khách tải file vào cycle trước khi PM tạo cycle, còn UC_03 lại yêu cầu cycle có trước. Hiện file nhập vào **thư viện của dự án**, lưu nguồn/preview/rows; sau đó revision được duyệt mới đưa vào scope của cycle/configuration. Một thư viện case dùng lại qua nhiều đợt và nhiều cấu hình, không chỉ là tài sản riêng của một đợt.

**Bằng chứng:** [TestCaseService.preview/commit](../../Backend/src/main/java/vn/syp/tms/testcase/TestCaseService.java#L308), [ImportController](../../Backend/src/main/java/vn/syp/tms/testcase/ImportController.java), [ExecutionService.addScope: 106](../../Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java#L106), [V4](../../Backend/src/main/resources/db/migration/V4__create_test_case_library.sql).

**Cần sửa:** vẽ rõ nhập thư viện → xem/duyệt revision → tạo cycle/config → chọn phạm vi/phân công → activate. Việc tiếp nhận khách hàng là bước nghiệp vụ ngoài hệ thống ở bản nội bộ.

### F06 — Quy tắc import mâu thuẫn và thiếu giới hạn thật — cao

**Ở đâu:** P0274 so với BR_03-1; UC_03 nhánh 5a; P0434.

P0274 nói tất cả dòng hợp lệ mới nhập; BR_03-1 lại bỏ qua dòng sai, nhập dòng đúng. Code hiện **không commit batch còn bất kỳ dòng lỗi nào**; nhập nguyên tử, preview có hạn và thuộc người tạo. Không có lựa chọn tự tạo revision mới từ dòng trùng như nhánh 5a nêu; source hướng sang chi tiết case để tạo revision.

Giới hạn nguồn hiện có: `.xlsx`, 5 MiB, 500 dòng dữ liệu, 8.000 ký tự/ô và một sheet thuộc mẫu hỗ trợ; xử lý preview/commit bằng request, không phải hàng đợi import nền tùy quy mô. Tên “mẫu khách” trong code là mapping cụ thể, không chứng minh nhận mọi Excel khách hàng.

**Bằng chứng:** [TestCaseService: 370](../../Backend/src/main/java/vn/syp/tms/testcase/TestCaseService.java#L370), [TestCaseWorkbook: 15](../../Backend/src/main/java/vn/syp/tms/testcase/TestCaseWorkbook.java#L15).

### F07 — Nhầm ID toàn cục với mã case theo dự án — vừa/cao

**Ở đâu:** BR_03-2 và `test_case.test_case_code`.

ID nội bộ duy nhất không có nghĩa `case_no` hiển thị phải duy nhất toàn hệ thống. Hiện unique là **`(project_id,case_no)`**; file mẫu khách có mã sinh dạng `XLSX-<batch>-<row>` và giữ source key riêng. Các trường tiếng Nhật có hỗ trợ nhưng không phải mọi trường Nhật đều bắt buộc như tài liệu khẳng định.

**Bằng chứng:** [V4: 37](../../Backend/src/main/resources/db/migration/V4__create_test_case_library.sql#L37), [TestCaseService: 389](../../Backend/src/main/java/vn/syp/tms/testcase/TestCaseService.java#L389), [TestCaseDtos](../../Backend/src/main/java/vn/syp/tms/testcase/TestCaseDtos.java).

### F08 — Thiếu đơn vị run và cấu hình trong phân công — cao

**Ở đâu:** BR_04-1, bảng `assignment`, `cycle_environment`, `cycle_scope`.

Đơn vị đúng là **case revision × cycle × configuration**, không phải chỉ case × cycle. Cùng một case có thể được giao A ở iPad và B ở cấu hình khác; cách nói “đúng một người trong một đợt” làm mất tình huống này. Cấu hình gồm môi trường + thiết bị logic + default build; run pin revision đã duyệt. Thay revision thư viện không được sửa ngầm nội dung run cũ.

Tài liệu chưa mô tả đầy đủ giao theo file/khoảng ID như `1-35`, nhóm file, chia người, cảnh báo mixed-assignee và lịch sử giao lại mà hệ thống đã có.

**Bằng chứng:** [V6: 40](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql#L40), [V6: 56](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql#L56), [ExecutionService.addScope](../../Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java#L106), [CaseRangePicker](../../Frontend/src/app/features/file-work/CaseRangePicker.jsx), [V29](../../Backend/src/main/resources/db/migration/V29__split_file_assignments.sql).

### F09 — Bỏ sót kho máy, bàn giao và phiên thực thi file — cao

**Ở đâu:** mô hình environment gộp thiết bị vào một dòng, 3.3/3.4 không có phân hệ tương ứng.

Hệ thống hiện phân biệt **môi trường, thiết bị logic, máy vật lý, allocation cho dự án/người nhận và session thực thi**. Run thuộc nhóm file phải có phiên phù hợp; một máy không đồng thời DOING ở hai nơi. Thu hồi máy/mất quyền/reassign ảnh hưởng quyền ghi và resume. Chỉ mô tả `device_name/os_version` không bao phủ bài toán người dùng đã yêu cầu.

**Bằng chứng:** [V15](../../Backend/src/main/resources/db/migration/V15__create_device_inventory.sql), [V17](../../Backend/src/main/resources/db/migration/V17__file_work_groups_and_sessions.sql), [FileWorkSessionService](../../Backend/src/main/java/vn/syp/tms/filework/FileWorkSessionService.java), [ExecutionService: 214](../../Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java#L214), [đặc tả 14.2](../product/SYSTEM-SPECIFICATION.md#142).

### F10 — Chặn NG trước khi có bug không phải hành vi hiện tại — cao

**Ở đâu:** P0283/P0351, BR_05-3, UC_05/UC_06, sequence 3.20.

Code cho lưu NG có mô tả thực tế, rồi cung cấp trạng thái **NG chờ liên kết bug**. Tạo bug từ thực thi cần attempt NG cụ thể. Nếu vừa giữ code này vừa áp dụng mô tả “có bug mới được lưu NG” thì tạo vòng phụ thuộc: cần NG để tạo bug nhưng cần bug để tạo NG.

**Luồng hiện tại:** lưu NG → tạo/liên kết bug đúng attempt → theo dõi/khắc phục; chặn hoàn tất file/chốt đợt khi NG hiện hành thiếu liên kết. Một endpoint gộp ghi NG+tạo bug nguyên tử có thể là thiết kế khác, nhưng chưa phải endpoint hiện hành và phải được thiết kế rõ.

**Bằng chứng:** [ExecutionService: 43](../../Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java#L43), [record: 229](../../Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java#L229), [WorkItemService: 163](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemService.java#L163), [ng: 334](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemService.java#L334), [CycleDecisionService: 59](../../Backend/src/main/java/vn/syp/tms/cycle/CycleDecisionService.java#L59).

### F11 — Chặn mọi OK khi bất kỳ bug còn mở là mô tả sai — cao

**Ở đâu:** P0283/P0352, BR_05-4/BR_10-3, UI ghi kết quả.

Kết quả một lần chạy và vòng đời bug là hai lớp khác nhau. Source không áp dụng blanket guard “case có bug mở thì không được ghi OK” tại `recordCanonical`. Một run/build mới có thể OK trong khi bug còn chờ xác minh phạm vi khác hoặc chờ PM quyết định đóng. Điều đó **không tự là lỗi đồng bộ**.

Phải đối chiếu run/config/build, phạm vi retest và quyết định đóng, không suy từ một trạng thái case toàn cục. Không đánh OK vì Dev báo fixed và cũng không buộc đổi mọi OK thành NG vì một bug chưa đóng.

**Bằng chứng:** [ExecutionService: 205–242](../../Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java#L205), [ADR-007](../decisions/ADR-007-internal-retest.md).

### F12 — Retest đạt không mặc nhiên đóng bug và đổi mọi case thành OK — cao nhất về nghiệp vụ

**Ở đâu:** P0305/P0370/P0937, UC_10/T012 và Hình 3.5/3.16/3.21.

Tài liệu coi Tester xác nhận đạt là transaction đóng bug + đổi case nguồn thành OK. Hiện **Tester ghi kết quả; PM/ADMIN quyết định đóng** sau khi toàn bộ coverage hiện hành PASS đúng build/vòng. Có tùy chọn ghi kết quả rồi đóng cùng transaction cho người có quyền PM, không phải tự động với mọi Tester.

Phân biệt **BUG_ONLY** (chỉ xác minh bug) và **FULL_CASE** (ghi thêm attempt thực thi đúng run). Đóng bug không tự đổi execution. Retest FAIL đưa bug về `progress` và làm vòng/phạm vi cũ không còn hiệu lực; không ghi đè lịch sử. Cũng không chỉ mặc định “người tạo bug” là người retest: người được PM giao mới là authority.

**Bằng chứng:** [RetestService: 188](../../Backend/src/main/java/vn/syp/tms/retest/RetestService.java#L188), [submit: 192](../../Backend/src/main/java/vn/syp/tms/retest/RetestService.java#L192), [FULL_CASE: 203](../../Backend/src/main/java/vn/syp/tms/retest/RetestService.java#L203), [close: 221](../../Backend/src/main/java/vn/syp/tms/retest/RetestService.java#L221), [ADR-007](../decisions/ADR-007-internal-retest.md).

### F13 — Quy tắc “build bằng hoặc mới hơn” chưa đúng cơ chế retest — cao

**Ở đâu:** BR_10-1, bảng `app_version.sequence_no`, sequence 3.21.

Retest hiện pin **đúng fixed build, coverage revision và round** của request, không chọn tùy ý một version “lớn hơn”. Version label cũng không đủ chứng minh build ở nhánh/nền tảng khác chứa bản sửa. Tài liệu đang mô tả một cơ chế so sánh thứ tự build chưa có trong implementation này.

**Bằng chứng:** [RetestService: 191](../../Backend/src/main/java/vn/syp/tms/retest/RetestService.java#L191), [request snapshot: 153](../../Backend/src/main/java/vn/syp/tms/retest/RetestService.java#L153).

### F14 — Gộp trạng thái định nghĩa case, kết quả tài liệu và kết quả thực thi — cao

**Ở đâu:** bảng `test_case.current_result/current_status`, `test_execution.result`, các mục trạng thái case.

Tài liệu chỉ xoay quanh đạt/không đạt/chưa thực thi, thiếu **P, NA và mô hình NOT_RUN**. Source thực thi có OK/NG/P; NOT_RUN là chưa có attempt; NA là quyết định loại scope của PM. Bảng tài liệu còn có vòng bấm riêng **Unexecuted → OK → NG → P → NA → Unexecuted**.

Quyết định 11/10: **lần ghi thực thi mới nhất của case cập nhật cột iPad một chiều; sửa trực tiếp cột iPad không đổi run/đợt**. Đây là projection được chọn có chủ ý, không biến `test_cases` thành nơi lưu một verdict có hiệu lực cho mọi đợt/cấu hình. Tài liệu cần mô tả cả giới hạn ngữ cảnh của cột iPad.

**Bằng chứng:** [V6: 9](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql#L9), [CycleDecisionService.scope](../../Backend/src/main/java/vn/syp/tms/cycle/CycleDecisionService.java#L27), [ResultCycleButton](../../Frontend/src/app/features/test-cases/ResultCycleButton.jsx), [ExecutionService: 245](../../Backend/src/main/java/vn/syp/tms/execution/ExecutionService.java#L245), [quyết định 11/10](../planning/2026-10-11-execution-document-results.md).

### F15 — Thiếu phân công test lần 2 và nhầm với xác minh bug — cao

**Ở đâu:** UC_04/UC_10 và mô hình dữ liệu không có liên kết tương đương.

PM/ADMIN hiện giao test lần 2 tại tài liệu, liên kết tới run thật trong cycle/config; có người nhận và Ghi chú 2. **Test lần 2 của case không đồng nghĩa retest một BUG** và không tự đổi trạng thái BUG. Mục này là yêu cầu trực tiếp của người dùng, không thể bỏ qua khi gọi tài liệu là mô tả hệ thống hiện hữu.

**Bằng chứng:** [V27: 31](../../Backend/src/main/resources/db/migration/V27__document_edits_and_second_test.sql#L31), [DocumentSecondTestDialog](../../Frontend/src/app/features/test-cases/DocumentSecondTestDialog.jsx), [TestDocumentEditingService](../../Backend/src/main/java/vn/syp/tms/testcase/TestDocumentEditingService.java).

### F16 — Luồng QA đang mô tả một sản phẩm khác với QA nội bộ — cao

**Ở đâu:** UC_07/T009, Hình 3.3/3.14, bảng `qa_ticket`.

Tài liệu đưa tuyến BrSE → khách, SLA 8/24 giờ và tự khóa/mở case theo trả lời. QA hiện là work item riêng: **Tester/PM tạo → PM giao DEV → DEV xác minh/yêu cầu bổ sung/trả lời → Tester tạo câu hỏi xác nhận đúng answer/version → PM kết thúc**, có ADMIN override và ngoại lệ có lý do. Answer/confirmation/generation được pin, không chỉ một cột `answer` bị thay.

Không có trạng thái execution “chờ xác nhận nghiệp vụ” tự động loại khỏi NOT_RUN chỉ vì QA tồn tại. Đây có thể là đề xuất tương lai, không được tự đưa vào công thức KPI hiện tại.

**Bằng chứng:** [QaService: 188](../../Backend/src/main/java/vn/syp/tms/qa/QaService.java#L188), [quyền: 230](../../Backend/src/main/java/vn/syp/tms/qa/QaService.java#L230), [contract QA](../api/qa.md), [V18](../../Backend/src/main/resources/db/migration/V18__qa_work_items.sql).

### F17 — Quyền bug độc lập, liên kết và trường bắt buộc chưa khớp — cao

**Ở đâu:** UC_06, BR_06-1/BR_06-3, UC_09.

- Tài liệu cho Tester tạo bug độc lập; hiện quyền này là **PM/ADMIN và phải có lý do** theo ADR-006. Đây là chênh giữa ý tưởng ban đầu và bản nội bộ đã chọn, không nên giấu bằng cách chỉ đổi câu chữ.
- Có source khởi tạo và có tập liên kết nhiều attempt/coverage. Một FK `test_case_id` không đại diện đầy đủ quan hệ này.
- Bộ trường tối thiểu hiện enforce title/steps/expected/actual/build/environment/device. Không tìm thấy cơ chế lưu bug buộc có tệp attachment ngay tại cùng lệnh create như Word nói. Attachment là bước riêng; không nên suy FK thành ràng buộc “ít nhất một file”.
- Developer báo `resolved` cần fixed build; xử lý không tái hiện/không xử lý là quyết định có reason/evidence/source của PM, không phải Tester được tự đóng bằng 3 nhãn nguyên nhân vừa đặt.

**Bằng chứng:** [WorkItemService: 145](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemService.java#L145), [InternalRulePolicy: 11](../../Backend/src/main/java/vn/syp/tms/rules/InternalRulePolicy.java#L11), [links V7: 93](../../Backend/src/main/resources/db/migration/V7__create_work_items.sql#L93), [RetestService: 221](../../Backend/src/main/java/vn/syp/tms/retest/RetestService.java#L221), [ADR-006](../decisions/ADR-006-internal-work-items.md).

### F18 — Sai công thức và đơn vị KPI — cao

**Ở đâu:** BR_11-2/BR_11-3, UC_11 và thiết kế báo cáo.

Code đếm **run item**, không đếm mỗi case một lần hoặc cộng mọi attempt. Công thức hiện hành:

```text
D = tổng run item − run item NA
Tiến độ thực thi = (OK + NG) / D
Tỷ lệ đạt = OK / D
Chưa chạy = D − OK − NG − P
D = 0 ⇒ tỷ lệ null, không hiển thị 0% như kết quả đã đo
```

Tài liệu lại tính tỷ lệ đạt trên số case có kết quả. Ví dụ T=100, NA=10, OK=30, NG=10, P=5: tỷ lệ đạt hiện hành **33,33%**; theo mô tả Word sẽ là **75%** nếu “có kết quả” được hiểu là OK+NG. Hai tỷ lệ có thể đều hữu ích nhưng tên, mẫu số và mục đích khác nhau; không được gọi là cùng một KPI. QA chờ giải đáp không tự thêm một nhóm trừ khỏi D.

**Bằng chứng:** [ReportMetrics: 17](../../Backend/src/main/java/vn/syp/tms/reporting/ReportMetrics.java#L17), [ReportsPage: 63](../../Frontend/src/app/features/reports/ReportsPage.jsx#L63), [ADR-008](../decisions/ADR-008-internal-reporting.md).

### F19 — “Realtime”, dự báo, SLA và notification đang được viết quá mức — vừa/cao

**Ở đâu:** P0382–P0404, 3.4.2/3.4.6/3.4.8 và bảng `notification`.

Có tổng hợp dữ liệu thật, bộ lọc/build và timestamp `asOf`; điều đó không chứng minh có push realtime liên tục, dự báo ngày release, cảnh báo SLA hay inbox thông báo cho 5 role. Reporting hiện có thống kê tiến độ/chất lượng và chuỗi ngày về **attempt thực thi**, không đồng nghĩa đã có đủ biểu đồ bug mới/đóng, tỷ lệ BrSE tự giải đáp hoặc SLA từng tuyến như Word.

Không tìm thấy bảng/API notification inbox hoặc scheduler SLA 8/24 giờ trong các module đã đối chiếu. Callback `notify`/toast UI không phải hệ thống thông báo cho người nhận. Phân biệt nhu cầu tốt với chức năng đã có; ghi cơ chế làm mới và phạm vi đo thực tế.

**Bằng chứng:** [ReportingService: 50](../../Backend/src/main/java/vn/syp/tms/reporting/ReportingService.java#L50), [daily: 125](../../Backend/src/main/java/vn/syp/tms/reporting/ReportingService.java#L125), [ReportingController](../../Backend/src/main/java/vn/syp/tms/reporting/ReportingController.java), [ReportsPage: 61](../../Frontend/src/app/features/reports/ReportsPage.jsx#L61), [75 bảng source](../../var/kl-review-2026-10-17/source-schema.json).

### F20 — Có hỗ trợ nội dung Nhật không có nghĩa UI toàn bộ song ngữ — vừa/cao

**Ở đâu:** P0416–P0417/P2133/P2169.

Test case có trường nội dung VI/JP và giao diện đối chiếu; dữ liệu Unicode được hỗ trợ. Nhưng UI hiện là tiếng Việt, chưa có bộ chuyển giao diện VI/JA và portal mặc định tiếng Nhật cho khách. Ticket/QA cũng không có đủ cặp trường dịch như tài liệu mô tả. Không nên dùng ảnh màn hình tiếng Việt để chứng minh tính năng switch ngôn ngữ.

**Bằng chứng:** [CreateCaseDialog](../../Frontend/src/app/features/test-cases/CreateCaseDialog.jsx), [CaseDetailModal](../../Frontend/src/app/features/test-cases/CaseDetailModal.jsx), [AuthBoundary](../../Frontend/src/app/features/auth/AuthBoundary.jsx), [QaDtos](../../Backend/src/main/java/vn/syp/tms/qa/QaDtos.java), [WorkItemDtos](../../Backend/src/main/java/vn/syp/tms/workitem/WorkItemDtos.java).

### F21 — Quy tắc có version là đúng; engine cấu hình mọi thứ là chưa có — vừa/cao

**Ở đâu:** BR_06-4/UC_12 và P0438–P0439.

Code đã có ruleset, draft version và publish; không nên kết luận toàn bộ quản lý quy tắc chưa làm. Tuy nhiên policy hiện chỉ chấp nhận **INTERNAL_DEMO/INTERNAL_V1**, tập trường tối thiểu được allowlist. Không phải engine cho khách tự thêm mọi trường, mọi trạng thái hoặc role mới mà không sửa code. Bộ quy tắc khách hàng chưa được tự nhận đã xác nhận.

**Bằng chứng:** [RuleService: 47](../../Backend/src/main/java/vn/syp/tms/rules/RuleService.java#L47), [draft: 61](../../Backend/src/main/java/vn/syp/tms/rules/RuleService.java#L61), [publish: 80](../../Backend/src/main/java/vn/syp/tms/rules/RuleService.java#L80), [InternalRulePolicy](../../Backend/src/main/java/vn/syp/tms/rules/InternalRulePolicy.java).

### F22 — Thiếu vai trò thực tế của Redmine và các phân hệ đã có — vừa/cao

Tài liệu nói thay các công cụ rời rạc nhưng chưa giải thích phạm vi tích hợp Redmine hiện hành: TMS là nguồn trạng thái nội bộ, có binding/outbox/retry/reconcile, không mặc định đã thay tracker khách hoặc đồng bộ hai chiều được khách nghiệm thu. Comment hiện `INTERNAL`; không phải hội thoại khách cùng đọc.

Đồng thời thiếu quản trị tổng/kho máy, dự án/membership/build catalog, file-work/session, test lần 2, typed QA, vòng đời/archive dự án, TASK/REQUEST/IMPROVEMENT, bảng Kanban/list theo nguồn chung và phần AI/chat đang có trong source. Nếu khóa luận chủ động loại AI ra khỏi phạm vi nghiên cứu thì được, nhưng phải nói rõ phạm vi, không vẽ một DSD25 bảng rồi gọi là toàn bộ source.

**Bằng chứng:** [RedmineService](../../Backend/src/main/java/vn/syp/tms/integration/RedmineService.java), [V10](../../Backend/src/main/resources/db/migration/V10__create_redmine_outbox.sql), [comment INTERNAL V7: 137](../../Backend/src/main/resources/db/migration/V7__create_work_items.sql#L137), [routeInfo: 21](../../Frontend/src/app/routes/routeInfo.js#L21), [schema AI V23–V25](../../Backend/src/main/resources/db/migration/V25__private_ai_chats.sql), [nguồn sản phẩm](../product/README.md).

### F23 — Thiếu hành vi conflict, retry, quyền và bản nháp mới sửa — vừa/cao

UC mới có nhánh thiếu dữ liệu nhưng chưa đủ cho thao tác thật: 401/403, 409 version conflict, request key chống lặp, source/run/revision đổi, quyền bị thu hồi, archive/cycle closed và tài nguyên không còn dùng được. Không thể mô tả “bấm lại” như tự động dùng quyền/token cũ.

Các sửa gần nhất giữ draft khi 409, yêu cầu đối chiếu dữ liệu hiện hành rồi chủ động lưu; khóa ghi khi đọc chi tiết đang chờ/lỗi; giữ selection xuyên trang và phản hồi sau API success. Đây là hành vi quan trọng nên đưa vào UC/thiết kế UI hoặc tiêu chí nghiệm thu, thay vì chỉ liệt kê màn hình đẹp.

**Bằng chứng:** [audit 16/10](2026-10-16-workflow-audit.md), [UI/UX 17/10](2026-10-17-uiux-refinement.md), [DocumentCellEditor](../../Frontend/src/app/features/test-cases/DocumentCellEditor.jsx), [WorkItemDetail](../../Frontend/src/app/features/work-items/WorkItemDetail.jsx).

### F24 — Các con số phi chức năng chưa có căn cứ nghiệm thu — vừa

**Ở đâu:** 3 giây, 8/24 giờ, cấu hình 2 core/4–8 GB/50 GB/200 GB/100 Mbps, backup 7 bản.

Các con số này có thể dùng làm **mục tiêu đề xuất**, nhưng cần tác giả/khách xác nhận, workload/concurrency, số lượng case/attachment, p95/p99, môi trường đo, retention/RPO/RTO. Chưa có bằng chứng từ source rằng chúng là cấu hình đã đo hoặc đáp ứng được trên production. Mức phân giải tối thiểu 1366×768 cũng cần nói là khuyến nghị cho bảng rộng, không tự phủ nhận các màn nhỏ đang hỗ trợ.

**Cần sửa:** thêm bảng NFR với cột mục tiêu/nguồn/cách đo/trạng thái; không đưa số đo mặc định vào phần “kết quả đạt được”. Đợt này không chạy benchmark hay xác minh vận hành production.

## 5. CSDL: 25 bảng này có phải database của chúng ta không?

**Không phải lược đồ vật lý của source hiện tại.** Quét tĩnh migration hiện hành có 75 lệnh `CREATE TABLE`, gồm cả bảng hạ tầng, session và AI; metadata Flyway không nằm trong số 75 này. Audit trước ghi 76 bảng tại môi trường được kiểm, nhưng đó là bằng chứng lịch sử, không phải introspection mới trong đợt đọc ZIP. Migration source mới nhất là V29.

Số 25 tự nó không phải lỗi: sơ đồ khái niệm có thể giản lược còn 25 thực thể. Lỗi là tài liệu trình bày 25 bảng cùng kiểu dữ liệu PostgreSQL như **CSDL cài đặt**, rồi hướng dẫn chạy script đó để triển khai hệ thống hiện hữu, mà không có mapping hoặc nêu ranh giới giản lược.

### 5.1. Đối chiếu từng bảng trong tài liệu

| Bảng tài liệu | Đối tượng/bảng source liên quan | Cần điều chỉnh |
| --- | --- | --- |
| `project` | `projects`, `project_counters`, lifecycle decisions | Không chỉ đổi tên: quyền quản trị, timezone, archive/version và counter cần được mô tả. |
| `app_user` | `identity_users`, Spring Session, login buckets | Username và 4 role nội bộ; không có tập cột email/customer/temp-password như Word. |
| `role` | `identity_roles`, guard/policy trong code | Không có 5 role như Word, không phải bộ quyền JSON cho phép tự thêm role bất kỳ. |
| `user_project_role` | `project_memberships` | Phân biệt role hệ thống/role dự án, active/version và quyền ADMIN không cần membership. |
| `function_group` | `test_suites`; `categories` phục vụ phân loại công việc | Hai khái niệm không tự đồng nhất; phải chọn đúng nhóm đang nói tới. |
| `app_version` | `builds` | Build có platform/version label/build number; không hiện thực so sánh version chung bằng `sequence_no` như tài liệu. |
| `environment` | `environments`, `devices`, `device_assets`, `device_allocations` | Đang gộp môi trường, thiết bị logic và máy vật lý; cần tách và mô tả allocation. |
| `test_cycle` | `test_cycles`, `cycle_statuses`, `cycle_decisions` | 3 trạng thái nội bộ, quyền PM/ADMIN; không có customer approval mặc định. |
| `cycle_environment` | `cycle_configurations` | Cấu hình là environment+device+default build; thiếu build sẽ không pin đủ ngữ cảnh. |
| `cycle_scope` | `run_items` | Scope là run pin revision/config, không chỉ danh sách function group. |
| `assignment` | assignee của `run_items`, `run_item_assignments`, nhóm file | Lịch sử khác trạng thái hiện hành; khóa phân công phải gồm config. |
| `test_case_file` | `import_batches`, `import_rows`, workbook nguồn được giữ | Thuộc thư viện dự án; preview/commit, source key, mapping/checksum; không nhất thiết thuộc duy nhất một cycle. |
| `test_case` | `test_cases` | Không phải nơi lưu một verdict chính thức chung cho mọi cấu hình/đợt. |
| `test_case_version` | `test_case_revisions` | Cần approval và pin revision; trường gốc JP hỗ trợ nhưng không có mọi điều kiện bắt buộc như Word. |
| `test_execution` | `execution_attempts` + `run_items` + session file | Thiếu run/config/version/request key; phải phân biệt OK/NG/P, NA và NOT_RUN. |
| `bug_ticket` | `work_items`, `bug_details`, `work_item_execution_links` và retest state | Tách danh tính/status chung, subtype và nhiều liên kết attempt; không chỉ một case FK. |
| `bug_status_history` | `work_item_history`, `bug_closure_decisions` | Có lịch sử event/quyết định/coverage/round/build; không chỉ cặp status. |
| `qa_ticket` | `work_items`, `qa_details`, `qa_answers`, `qa_confirmations`, `qa_commands` | Cần generation/answer pin/xác nhận/lệnh typed; không dùng một cột answer thay lịch sử. |
| `comment` | `work_item_comments` | Owner work item có FK, visibility INTERNAL; khác owner đa hình và nội dung dịch/customer trong Word. |
| `attachment` | `work_item_attachments`, reference trong execution/retest | Không phải `target_id` tự do cho mọi thực thể; cần owner/FK/ACL và giới hạn file. |
| `project_rule` | `rulesets` | Ruleset nội bộ có active version, chưa phải mọi rule khách được cấu hình tùy ý. |
| `project_rule_version` | `rule_versions` | Có draft/publish thật; cần mô tả đúng schema, quyền và allowlist policy. |
| `shared_document` | `project_resources`, `resource_revisions` | Sổ tay/tài nguyên có phiên bản/quyền; không có nguyên thiết kế cycle viewpoint/document portal như Word. |
| `notification` | Chưa tìm thấy bảng/API inbox tương ứng trong source đã kiểm | Chuyển sang thiết kế mở rộng; đừng lấy toast làm minh chứng. |
| `audit_log` | `identity_audit`, `project_audit`, `work_item_history`, `file_work_history`… | Audit phân theo domain; phải giữ đúng actor/context, không mô tả một bảng duy nhất nếu code không dùng nó. |

**Các nhóm bị bỏ sót đáng kể:** session/auth; file-work group/items/session/commands/history; physical assets/allocations; chỉnh sửa ô tài liệu/kết quả tài liệu/phân công lần 2; retest coverage/revision/request/verification/closure; Redmine outbox/binding/attempts; lifecycle dự án; AI draft/chat. Có thể đưa chi tiết phụ trợ xuống phụ lục, nhưng phải nêu lược đồ trong chương là bản rút gọn và chỉ rõ phần loại ra.

### 5.2. Ngay trong thiết kế 25 bảng cũng còn thiếu ràng buộc

1. **FK đơn lẻ không bảo đảm cùng dự án.** `assignment` có cycle/case/user; `test_execution` có case/revision/cycle/environment; `bug_ticket` có source_execution/case/build. Từng FK tồn tại riêng không đủ chứng minh tất cả cùng project và revision thuộc case đã khai báo. Cần composite FK hoặc cơ chế kiểm tương đương được chỉ rõ. Source thực tế lặp `project_id` ở các quan hệ quan trọng.
2. **Chưa bảo đảm một phân công active đúng scope.** `is_active` là cờ, không thay unique constraint. Chưa có config trong khóa; cũng chưa quy định hai request đồng thời cùng tạo active assignment được giải quyết thế nào.
3. **`current_result/current_status/confirmed_version_id` trên case dễ sai ngữ cảnh.** Một case chạy OK ở buildA/iPad không tự làm mọi run/buildB/Android đạt. Nếu giữ projection tổng hợp phải nêu nguồn, phạm vi và luật cập nhật.
4. **Owner đa hình thiếu FK đến chủ thể.** `comment`, `attachment`, `notification`, `audit_log` dùng `target_type+target_id`; Word không chỉ ra cách chặn orphan/sai project/loại không hợp lệ. RLS được nhắc chung không thay các bất biến này. Không kết luận mọi owner đa hình đều sai, nhưng thiết kế đang thiếu cơ chế bảo vệ cụ thể.
5. **Chưa có optimistic version/idempotency trong các lệnh cần thiết.** Cần biết sửa/phân công/ghi kết quả/retetst đồng thời hoặc retry sau timeout có ghi đè/tạo trùng không. `previous_assignee_id` không giải quyết concurrency.
6. **Miền dữ liệu chưa nhất quán với use case.** `test_execution.result` chỉ đạt/không đạt; không có P/NA như nghiệp vụ hiện hành. `sequence_no` dùng so build mà chưa nêu unique/quan hệ dòng phát hành. Các cột status cần tập giá trị và transition được kiểm soát.
7. **Cờ active/confidential không tự tạo policy.** Phải nêu ai được thấy tài khoản kiểm thử/tài liệu, ai được đổi trạng thái, history có được chỉnh không và request nào kiểm lại quyền hiện hành. Không dùng “không xóa vật lý” để thay toàn bộ thiết kế lưu vết.

Nguồn kiểm chứng chính: [V5 integrity](../../Backend/src/main/resources/db/migration/V5__review_project_integrity.sql), [V6 run/attempt](../../Backend/src/main/resources/db/migration/V6__create_test_execution.sql), [V7 links](../../Backend/src/main/resources/db/migration/V7__create_work_items.sql), [V18 QA](../../Backend/src/main/resources/db/migration/V18__qa_work_items.sql), [V27](../../Backend/src/main/resources/db/migration/V27__document_edits_and_second_test.sql).

## 6. Đánh giá từng use case

“Giữ” dưới đây nghĩa là giữ mục tiêu/cấu trúc rồi sửa chi tiết; không đồng nghĩa đã nghiệm thu mọi nhánh.

| UC | Đánh giá | Việc cần sửa chính |
| --- | --- | --- |
| UC_01 Đăng nhập | Có phần đúng, nhiều nhánh chưa có | Username, 4 role+membership, lỗi chung/throttle thật; bỏ xác quyết email-reset/72 h/15 phút nếu viết hiện trạng. |
| UC_02 Khởi tạo đợt | Mục tiêu đúng; vòng đời sai | DRAFT/config/scope/activate tách riêng; PM/ADMIN; không customer request/approval hoặc tài liệu viewpoint bắt buộc khi source chưa có. |
| UC_03 Nhập Excel | Đúng hướng preview/validate; quy tắc sai | Import cấp project, batch atomic, format/size/row limit, ownership/expiry; không skip lỗi hoặc tạo revision từ dòng trùng ngay trong import. |
| UC_04 Phân công | Giữ, bổ sung nhiều | Run/config/revision, giao file/khoảng case/chia người, không autoactivate; bỏ ngưỡng workload tự đặt hoặc ghi là đề xuất. |
| UC_05 Ghi kết quả | Giữ và viết lại guard | OK/NG/P, actual/reason, session/máy đúng context; NG chờ link; không blanket OK/open-bug; 401/403/409/nháp/retry. |
| UC_06 Tạo bug | Có source và standalone là đúng ý | Source là NG attempt, PM/ADMIN standalone+reason; không tự ghi NG lại sau create; trường bắt buộc thực tế; không bịa duplicate-similarity engine. |
| UC_07 QA | Giá trị nghiệp vụ tốt, chưa khớp hiện trạng | Tách bản nội bộ PM/DEV/Tester khỏi tuyến BrSE/Customer đề xuất; answer/generation/confirm/PM close; không tự block verdict/KPI. |
| UC_08 Khách xác nhận bug | Chưa có actor trực tiếp trong bản hiện hành | Mô tả recorded external clarification hoặc chuyển use case này sang phạm vi mở rộng. Không giả định có CUSTOMER login. |
| UC_09 Dev xử lý | Giữ bước tái hiện/fixed build | Dev đang được giao, quyền/state/version thật; PM kết thúc ngoại lệ; không tự thêm 3 nguyên nhân đóng thành policy bắt buộc. Tác nhân phụ Tester cần nêu nếu giữ luồng 9–10. |
| UC_10 Xác nhận lại | Cần viết lại nghiệp vụ trọng tâm | Coverage/round/build exact, assignee, BUG_ONLY/FULL_CASE, PM closure và không tự đóng mọi bug/OK mọi case. |
| UC_11 Theo dõi tiến độ | Có tổng hợp/export đúng hướng | Run-item denominator/NA/P/null, asOf/build/zone; gắn nhãn chưa có cho customer portal, forecast/SLA và biểu đồ được đặt thêm. |
| UC_12 Quy tắc | Một phần đã làm thật | Giữ draft/version/publish, mô tả INTERNAL_DEMO và quyền PM/ADMIN; không nhận config mọi field/status/role đã có. |
| UC_13 Trao đổi | Có comment/evidence trong source | INTERNAL, typed QA ownership, cursor/limit, dữ liệu an toàn; không giả định bản dịch/customer notification/ACL tham chiếu đã làm. |
| UC_14 Lịch sử | Mục tiêu phù hợp | Lịch sử theo domain và context, pagination/quyền; không khẳng định mọi read history đều sinh audit truy cập nếu chưa có code. |

**UC còn thiếu nếu mục tiêu là mô tả source:** quản trị tổng/tài khoản được ủy quyền; tạo dự án/membership; kho máy/bàn giao/thu hồi; danh mục build/env/device; duyệt revision; start/pause/resume/complete/cancel file; phân công test lần 2; NA/chốt/mở lại; archive/reopen dự án; Redmine publish/retry/reconcile. Có thể gom theo mục tiêu người dùng để tránh một UC cho mỗi nút. AI có thể để chương/phụ lục riêng hoặc ghi rõ ngoài phạm vi khóa luận.

## 7. Đánh giá 22 sơ đồ

Đã đọc nhãn, mũi nối và style XML của 22 drawio, đối chiếu với nội dung Word. Không xác nhận hình đã được chèn vào Word hoặc chất lượng in; thực tế 31 placeholder vẫn tồn tại. Một số sơ đồ mô tả thiết kế mong muốn hợp lý, nhưng **không phải sơ đồ as-built của commit đang xét**.

| Hình | Nội dung | Nhận định / sửa trọng tâm |
| --- | --- | --- |
| 3.1 | BPMN tiếp nhận/khởi tạo | Actor khách/BrSE và Sẵn sàng phân công chưa khớp; sửa thứ tự tiếp nhận–thư viện–cycle; vòng sửa file đang dùng nét đứt. |
| 3.2 | BPMN phân công/thực thi | Có phân nhánh QA/bug là tốt; thiếu run/config/máy/session; đang tự chuyển case sang chờ QA, thiếu P/NA. |
| 3.3 | BPMN QA | Giữ như sơ đồ đề xuất tuyến BrSE/khách; hiện trạng phải vẽ typed QA PM–Dev–Tester, không tự mở case. |
| 3.4 | BPMN xác nhận/xử lý bug | Có bước rà soát/tái hiện; thiếu nhánh hoãn phiên bản sau và kết thúc không tái hiện theo UC; không phải mọi bug đều qua CUSTOMER trong app. |
| 3.5 | BPMN retest/nghiệm thu | Sai quyền tự đóng, sai ≥build, khách nghiệm thu; đường FAIL quay về khai báo build sửa cũng chưa thể hiện đủ bước Dev xử lý lại. |
| 3.6 | BFD | 8 nhóm phân rã dễ hiểu; nhiều lá là mục tiêu đề xuất, thiếu admin/máy/file-session/lần 2/Redmine; cần legend phạm vi. |
| 3.7 | UC tổng quát | 5 actor thiếu ADMIN. Văn bản nói kế thừa actor trừu tượng, nhưng hình tổng quát không thể hiện actor/quan hệ đó. Không bắt buộc phải vẽ mọi quan hệ ở một hình nếu giải thích mức giản lược. |
| 3.8 | UC tài khoản | Reset/email/customer và PM quản trị không khớp; thay quyền/tác nhân theo hiện trạng. |
| 3.9 | UC đợt | Đổi customer approval sang lệnh PM/ADMIN; thêm activate/NA/chốt/mở lại thực tế. |
| 3.10 | UC case | Import/sửa/version/export là đúng nhóm; thiếu duyệt revision, quyền ADMIN/PM và source workbook/edit/lần 2. |
| 3.11 | UC phân công | Thêm config/range/file/second-test; workload cảnh báo cần cơ chế/tiêu chí hoặc nhãn đề xuất. |
| 3.12 | UC kết quả | Quan hệ include gắn chứng cứ với toàn use case cần làm rõ điều kiện; chính quy tắc consistency đang khác code, không chỉ sửa hình. |
| 3.13 | UC bug | Có hai nguồn là tốt; quyền standalone/source NG, fields/evidence và khách/BrSE cần sửa. |
| 3.14 | UC hỏi đáp | Tách rõ sơ đồ đề xuất với QA hiện tại; bổ sung answer/confirmation/PM closure vào hiện trạng. |
| 3.15 | UC xử lý lỗi | Giữ Dev tái hiện/fixed build; mô tả PM closure ngoại lệ, actor phụ, guard assigned/state. Include khai báo build phải gắn đúng nhánh báo sửa. |
| 3.16 | UC retest | Thay auto-sync verdict/closure bằng coverage + kết quả + quyết định PM; hướng extend tạo bug mới tới retest **không bị đảo** trong file đã đọc. |
| 3.17 | UC báo cáo | Customer access/forecast chưa có; phải ghi công thức/run scope/asOf. |
| 3.18 | UC quy tắc | Có version đúng; “quản lý” quá rộng nếu include tạo version cho cả đọc/vô hiệu. Tìm kiếm toàn văn/customer rule cần chỉ rõ phần chưa có. |
| 3.19 | UC thông báo/truy vết | Audit/comment có thật; inbox/SLA/bản dịch chưa chứng minh. Truy vết bug chỉ áp dụng đối tượng có link, không mặc nhiên mọi QA độc lập. |
| 3.20 | Sequence tạo bug | Sai transaction createbug+ghiNG nếu gọi là as-built. Cần backend controller/service, auth/context/idempotency/version; audit thuộc transaction ghi. |
| 3.21 | Sequence retest | Transaction 4 thao tác và ≥build khác implementation. Phải phân nhánh BUG_ONLY/FULL_CASE, PASS/FAIL, optional PM close, rollback và stale coverage/version. |
| 3.22 | DSD | 25 node/27 edge, đã giản lược nhiều FK và không thể hiện cardinality rõ bằng crow-foot/1-N. Có thể làm tổng quan đề xuất; không thay ERD vật lý hiện hành. |

### 7.1. Những điểm ký pháp cần chỉnh

**BPMN:** hướng dẫn dùng “nét đứt đỏ = quay lui” là quy ước tự đặt. Sequence Flow của BPMN vẫn dùng nét liền, kể cả đường quay lại; Message Flow là quan hệ khác. Trong source sơ đồ, Hình 3.1 có cạnh `e126`, Hình 3.4 có cạnh `e133`, Hình 3.5 có các cạnh `e125`/`e129` dùng `dashed=1` cho rework, nên cần đổi hoặc gọi rõ đây là flowchart swimlane với quy ước riêng, không gọi là BPMN chuẩn. Cũng cần xác định khách hàng là participant/pool riêng hay lane của một process đang giản lược; không kết luận mọi đường qua lane đều sai, vì sequence flow được đi qua lane trong cùng pool. [OMG BPMN](https://www.omg.org/spec/BPMN/2.0/PDF), [quy tắc flow của OMG](https://www.omg.org/bpmn/Samples/Elements/SequenceFlowRules.htm).

**Use case:** nhiều hình là nhóm chức năng được đưa vào ellipse hơn là mục tiêu người dùng cụ thể; BFD đã đảm nhận vai trò phân rã chức năng. Có thể dùng hình tổng quan ở mức package, rồi các UC cụ thể ở hình con. `include` nên biểu diễn hành vi được dùng trong luồng cơ bản tại điểm bao gồm; `extend` cần điều kiện/extension point khi cần. Không thay toàn bộ include thành extend máy móc; ví dụ hướng include import→validate và sửa→version đang đúng hướng. [Hướng dẫn UML của Sparx Systems](https://news.sparxsystems.com/resources/tutorials/uml/use-case-model.html).

**Sequence:** các bước “không hợp lệ” và “mở transaction/ghi” cần nằm trong nhánh `alt/else` có điều kiện, thay vì một chuỗi đánh số có vẻ bước lỗi rồi vẫn ghi. Đây là yêu cầu làm rõ ngữ nghĩa trong bản chỉnh; chưa xác nhận bố cục hình in. Không để “màn hình” sở hữu quyền/transaction thay cho backend trong sơ đồ thiết kế triển khai.

**DSD:** giản lược FK để dễ nhìn được chấp nhận nếu ghi rõ mức lược đồ và có bảng quan hệ đầy đủ ở phụ lục. Hướng dẫn nói bỏ các FK tới app_user, nhưng Word chưa gắn nhãn “DSD rút gọn”. Các đường không có cardinality và nhãn PK/FK làm người đọc khó kiểm tra 1-1/1-N/N-N. Nên tách ERD theo identity/project, test/run/file-session, work-item/QA/retest và integration.

## 8. Mâu thuẫn nội bộ và lỗi biên tập

Các lỗi sau tồn tại ngay cả khi chưa đối chiếu code:

| Mục / vị trí | Vấn đề | Sửa thế nào |
| --- | --- | --- |
| P0274 vs BR_03-1 | Import tất cả hợp lệ mới nhận vs skip dòng lỗi | Chọn một policy. Với source hiện tại là atomic toàn batch. |
| P0273/P0275 vs UC_02/03 | Khách upload vào đợt rồi PM mới tạo, trong khi UC import cần đợt có trước | Tách tiếp nhận ngoài hệ thống, import thư viện và tạo scope. |
| UC_07 | Hậu điều kiện còn “Chờ xử lý tuyến 1”, nhưng luồng chính đã trả lời xong/mở lại case | Tách Create QA và Resolve QA hoặc viết hậu điều kiện theo đích use case. |
| UC_11 | Tiền điều kiện phải có lượt thực thi, nhưng nhánh thay thế xử lý 0 lượt | Bỏ điều kiện đó hoặc ghi điều kiện đủ để xem dữ liệu rỗng. |
| P0268/BR_06-3 | Nói mọi lỗi có case nguồn trong khi có bug độc lập | Đổi thành lỗi từ execution có link nguồn; standalone có reason/nhóm chức năng theo policy. |
| P0267 | Gọi 5 giai đoạn “tuần tự” trong khi QA là nhánh điều kiện và bug/retest có vòng lặp | Mô tả pha/nhánh song song, có đường quay lại, không bắt mọi case qua cả 5 pha. |
| P0132 vs P0160 | 300 nhân sự Việt Nam vs khoảng 200 | Kiểm lại nguồn/ngày, không tự chọn một số. Chưa xác minh thông tin công ty thực tế trong đợt này. |
| P0106/P0107 | Còn “chuyển đổi số trong giáo dục”, “tư vấn du học”, “cố vấn”, “xử lý hồ sơ” | Viết lại phương pháp khảo sát cho kiểm thử/PM/Tester/Dev/BrSE. Đây là nội dung ngoài đề tài còn sót, không chỉ lỗi chính tả. |
| P0170/P0193 | “như ,”; “6 giai đoạn… …giai đoạn”, nhiều lỗi gõ | Hoàn thiện câu/số giai đoạn, liên kết ảnh khảo sát và nguồn tương ứng. |
| P0103 | `10//2026` | Sửa tháng/năm theo thời gian khảo sát thật. |
| D3 phần đầu | Bìa ghi ĐỀ CƯƠNG CHI TIẾT, các mốc 8/2026 và 9/2026; tên file chỉ Chương 3 nhưng chứa phần đầu/Chương 1 | Chốt loại bản nộp và ngày; tách file/chương hoặc đặt tên đúng phạm vi. |
| P0053–P0084 | TOC còn Supabase, mục 3.2 đánh số cũ, 3.4/3.5 ở trang 29 theo bản cũ | Cập nhật field TOC sau khi hoàn thiện nội dung; không lấy số trang cache làm trang hiện hành. |
| P0257 | Chương 2 chỉ có tiêu đề trước Chương 3 | Nếu nộp bản đầy đủ phải bổ sung; nếu tệp trích Chương 3 thì bỏ khung rỗng khỏi bản trích. |
| P2250–P2253 | Kết luận mới là các nhãn chờ điền | Viết kết quả thực tế/giới hạn/hướng phát triển; không lấy số test làm chữ ký UAT. |
| 67 đoạn trong bảng | Chứa ký tự `\n` nguyên văn; ví dụ D3-P0598 | Thay bằng ngắt dòng/đoạn thật trong Word. Đây là ký tự trong `w:t`, không chỉ cách JSON hiển thị. |
| 31 placeholder | 22 sơ đồ và 9 ảnh UI chưa được nhúng; toàn bộ ảnh sẵn có nằm trước Chương 3 | Chèn sơ đồ đúng bản sau khi sửa nghiệp vụ; chụp UI thật đúng vai trò/trạng thái. Không cần dựng ảnh customer portal chưa có để khớp văn bản. |
| Guide chèn hình | Chỉ `Chương 3.docx`, nhưng file đó chính là bản cũ trùng backup; placeholder ở bản “hoàn chỉnh” | Sửa đích trong hướng dẫn, quy ước một bản chính. Không làm theo hướng dẫn với nhầm file. |
| Caption dùng Heading 4/5 | Có thể làm lẫn outline/TOC với nội dung chương nếu TOC không giới hạn cấp | Nên dùng caption/SEQ và cross-reference theo mẫu khoa. Không gọi style hiện tại là sai bắt buộc khi chưa có quy định/mẫu nghiệm thu. |
| Hình 3.24 | Tiêu đề mục nói tổng quan dự án, caption lại tổng quan đợt | Xác định màn/phạm vi rồi thống nhất tiêu đề, ảnh, mô tả và filter. |

### 8.1. Chất lượng lập luận và nguồn tham khảo

P0263 khẳng định TestRail/Zephyr/qTest chưa hỗ trợ tùy biến hoặc truy vết theo nhu cầu, nhưng chưa đưa khảo sát tính năng/phiên bản/chi phí. Không nên xây lý do phát triển bằng một khẳng định bao trùm như vậy. **TestRail có custom fields cho case/result và trạng thái tùy chỉnh; Zephyr có custom fields cho execution/step.** Điều này đủ để bác cách viết “không có khả năng tùy biến” chung chung, nhưng không chứng minh các sản phẩm đó đáp ứng toàn bộ quy trình của công ty. [TestRail](https://support.testrail.com/hc/en-us/articles/7373850291220-Configuring-custom-fields), [Zephyr](https://support.smartbear.com/zephyr-squad-cloud-v1/docs/en/configure-zephyr-squad-cloud/global-custom-fields.html).

Cách viết tốt hơn: công ty cần đánh giá mức phù hợp với mẫu Excel cụ thể, quy tắc nội bộ, quản lý máy/file, workflow QA/retest, chi phí và triển khai; khóa luận xây prototype nội bộ để nghiên cứu bài toán đó. Nếu muốn kết luận ưu thế chi phí/hiệu suất, cần bảng so sánh có nguồn và phép đo.

Danh mục tài liệu đã có sách UML/kỹ nghệ/ISTQB là điểm tốt. Tuy nhiên tên miền tổng quát như trang chủ công ty/Redmine chưa đủ chỉ ra dữ kiện đang được dẫn ở đoạn nào. Cần chỉ nguồn cụ thể cho quy mô/cơ cấu/ISO, khảo sát quy trình nội bộ và tính năng đối thủ; thêm ngày truy cập, phiên bản, trích dẫn trong thân bài theo quy định trường. Chưa có bằng chứng để kết luận gian lận hay xác minh mọi nguồn trong D1; báo cáo chỉ chỉ ra dấu vết nội dung ngoài đề tài và khoảng trống chứng cứ.

## 9. Nội dung nào có thể tốt hơn hệ thống hiện nay?

Những ý tưởng sau có giá trị, nhưng cần giữ ở trạng thái **đề xuất**, không tự biến thành policy đã chốt hoặc yêu cầu sửa code trong tác vụ này:

| Ý tưởng trong tài liệu | Giá trị có thể mang lại | Điều kiện trước khi đưa vào hệ thống |
| --- | --- | --- |
| BrSE/khách trực tiếp xử lý QA và xác nhận nghiệp vụ | Giảm vòng truyền đạt SYP–SHIFT–khách, gần vấn đề gốc trong D5 hơn QA nội bộ hiện tại | Chốt actor/ownership, quyền ngoại bộ, dự án, bản dịch, evidence và nguồn kết luận; không đổi ngầm luồng PM–Dev hiện có. |
| Kho QA đã giải đáp và nguồn tham chiếu | Giảm hỏi trùng, tận dụng câu trả lời cũ | Search/ACL/version; câu trả lời cũ không tự trở thành phê duyệt mới. |
| Tài liệu quan điểm kiểm thử gắn đợt | Tester có căn cứ thống nhất gần nơi thao tác | Chốt có bắt buộc để activate hay chỉ tham khảo; version của tài liệu và quyền công bố. |
| SLA/nhắc hạn/inbox | Nhận biết trách nhiệm/chậm xử lý rõ hơn | Khách xác nhận 8/24 giờ hay giá trị khác; giờ làm việc/múi giờ/ngày nghỉ, pause khi chờ ai, kênh nhận và chống spam. |
| Portal khách/VI–JA | Khách đọc dữ liệu minh bạch, ít chuyển ngữ thủ công | Mô hình dữ liệu nhạy cảm/visibility, i18n UI, account lifecycle, kiểm chứng thật với khách. |
| Cảnh báo tải công việc | PM chia file/case hợp lý | Số case không đồng nghĩa effort; chốt cách tính, giới hạn cảnh báo, dữ liệu đo và quyền override. |
| Gợi ý bug nghi trùng | Giảm ticket lặp | Similarity không tự merge/đóng; cần ngưỡng, giải thích và đánh giá sai dương/sai âm. |
| Nguyên nhân không tái hiện có cấu trúc | Dữ liệu phân tích chất lượng tái hiện tốt hơn ghi chú rời rạc | Taxonomy được duyệt; vẫn có lý do/evidence/nguồn và quyền PM/ADMIN, không tự thêm quyền Tester đóng. |
| Chạy song song/đối chiếu dữ liệu trước cutover | Giảm rủi ro khi chuyển công cụ, dễ tìm sai lệch | Xác định nguồn authority, bộ dữ liệu test/khách được phép, tiêu chí so khớp, không nhập/ghi vào DB sử dụng tùy tiện. |

Tài liệu **không tốt hơn** ở những chỗ đơn giản hóa thành auto-OK/auto-close, verdict chung trên case, hoặc gộp máy/môi trường. Source hiện có các cơ chế bảo vệ ngữ cảnh, coverage, phiên thực thi, concurrency và actor attribution rõ hơn mô hình 25 bảng này. Hướng tốt là đưa những bất biến thực tế đó vào tài liệu, đồng thời giữ ý tưởng đối ngoại ở roadmap.

## 10. Đề xuất cấu trúc bản sửa

### 10.1. Tách ba lớp nội dung

1. **As-is của công ty:** dùng D5 làm nguồn khảo sát, mô tả Excel/SharePoint–Redmine–Notion–Teams/Slack, vai trò BrSE/SHIFT/khách và các bằng chứng được phép. Đây không phải use case đăng nhập hiện hành.
2. **Phiên bản TMS đã triển khai:** nguồn là source/decision hiện hành; 4 role nội bộ, thư viện/revision, cycle/config/run/attempt, file/máy/session, BUG/QA/retest/closure, report, tài nguyên/quy tắc, integration và trạng thái kiểm chứng.
3. **Định hướng mở rộng:** portal khách/BrSE, VI–JA toàn UI, SLA/inbox, search tri thức và các ý tưởng chưa có. Có đánh giá lợi ích/điều kiện, không sử dụng thì hiện tại.

### 10.2. Thứ tự sửa có hiệu quả

| Thứ tự | Phần cần sửa | Tiêu chí hoàn thành |
| --- | --- | --- |
| 1 | Chốt phạm vi và actor/quyền | ADMIN/PM/TESTER/DEV rõ; khách/BrSE phân loại đúng; không bỏ các quyết định mới 10–11/10. |
| 2 | Thuật ngữ + state machine | Phân biệt case/revision/run/attempt/file session/xác minh BUG/test lần 2; cycle và BUG/QA state khớp. |
| 3 | UC_02–UC_11 +2 sequence | Không vòng phụ thuộc NG–bug; đúng quyền PM closure, đúng build/coverage, KPI, source identity, lỗi/retry. |
| 4 | ERD +từ điển dữ liệu | Lược đồ thật hoặc rõ nhãn conceptual; có mapping, PK/FK/cardinality/project scope/uniques/version; không cònPGđược viết làMySQL. |
| 5 | Kiến trúc/triển khai 3.5 | Có Java/Spring/MySQL/Flyway/evidence/session; tách local/release; không Supabase setup để chạy source này. |
| 6 | Màn hình và nghiệp vụ còn thiếu | Chọn ảnh thật từ app đúng vai trò/trạng thái; không dựng bằng ảnh mock rồi gọi UAT. |
| 7 | NFR/kiểm chứng/kết quả | Mục tiêu vs phép đo vs chưa kiểm; 884 FE/552 BE là bằng chứng lịch sử có phạm vi, không nghiệm thu sản phẩm toàn hệ thống. |
| 8 | Biên tập Word cuối | Một bản chính, hết placeholder/`\n`/nội dung du học; TOC/caption/cross-reference được cập nhật, kiểm bản PDF xuất. |

### 10.3. Đoạn mô tả có thể dùng làm nền viết lại

> Phiên bản được cài đặt trong phạm vi khóa luận là hệ thống quản lý kiểm thử nội bộ sử dụng React ở phía giao diện, Spring Boot ở phía máy chủ và MySQL với Flyway để quản lý cấu trúc dữ liệu. Người dùng làm việc theo quyền hệ thống ADMIN, PM, TESTER hoặc DEV và phạm vi dự án tương ứng. Test case được quản lý tại thư viện dự án theo phiên bản nội dung; các phiên bản đã duyệt được đưa vào từng cấu hình của đợt để hình thành lượt kiểm thử được phân công. Kết quả thực thi được lưu thành lịch sử độc lập theo người thực hiện, build và ngữ cảnh. Lỗi phát sinh liên kết tới lần chạy cụ thể; việc xác minh bản sửa và quyết định đóng lỗi tuân theo phạm vi và quyền đã quy định. Các chức năng dành cho khách hàng và kỹ sư cầu nối được phân biệt là định hướng mở rộng nếu chưa triển khai trong phiên bản này.

Đoạn trên là gợi ý mô tả phạm vi; không thay thế ma trận quyền/state/contract chi tiết và không khẳng định hệ thống đã đạt UAT.

## 11. Kiểm chứng, giới hạn và bàn giao

| Hạng mục | Trạng thái trong đợt đọc tài liệu |
| --- | --- |
| Kiểm kê ZIP/hash/bản trùng | Đã kiểm bằng metadata và SHA-256. |
| Trích DOCX | 5 file được trích XML tĩnh, không chạy macro hoặc nội dung nhúng. 14 UC/25 bảng của bản hoàn chỉnh được đối chiếu; bản mẫu ngoài đề tài kiểm tra ở mức liên quan. |
| Sơ đồ | 22 drawio được phân tích nhãn/kết nối/style; 44 file drawio/SVG có trong gói. Không render thành Word/PDF để nghiệm thu thị giác. |
| Source/API/migration | Đối chiếu read-only theo các đường dẫn trong báo cáo; 75 CREATE TABLE tĩnh. Không xác nhận lược đồ live bằng lượt quét source. |
| Nguồn online | Tra nguồn chính thức cho tuyên bố tính năng công cụ và quy tắc ký pháp. Không tra/khẳng định toàn bộ dữ kiện công ty hoặc mọi nguồn trong khóa luận. |
| Test/build/runtime | **NOT_RUN** trong đợt này vì chỉ review tài liệu; không dùng kết quả 872/884/552 trước đó làm lượt test mới. |
| Database sử dụng | Không kết nối/ghi/seed/reset trong đợt này. |
| Tài liệu gốc/source nghiệp vụ | Không chỉnh sửa. Chỉ tạo báo cáo, checklist và artifact đọc tài liệu. |
| Commit/push/merge/deploy | Không thực hiện cho tác vụ review mới; quyền commit/push vừa qua đã dùng cho đợt trước. |

Skill áp dụng: `using-superpowers` để chọn workflow phù hợp; `article-writing` để viết báo cáo có bằng chứng. Đã xem `code-review` nhưng không chạy workflow review branch/issue vì tác vụ này là review tài liệu; không dựng tracker hoặc agent review ngoài phạm vi. Không cần brainstorm lại nghiệp vụ đã chốt hay thay source để hợp thức hóa tài liệu.

Artifact cuối và kết quả bảo toàn file nằm trong [verification.json](../../var/kl-review-2026-10-17/verification.json). Bản Word gốc và ZIP được giữ nguyên; báo cáo này là đầu ra để quyết định sửa tài liệu, không tự động cho phép triển khai các tính năng còn thiếu.
