# Prompt Codex — đọc FixReports và thực hiện kế hoạch đã làm rõ

> Đã tổng hợp các quyết định người dùng xác nhận đến ngày 19/10/2026. Đây là prompt dùng để giao tác vụ triển khai, không phải báo cáo đã sửa hệ thống.

Bạn là Codex làm việc tại `D:\DCN\KTN_11235645_DoCamNhung`. Hãy đọc đầy đủ `FixReports.md` cùng `docs/planning/2026-10-19-fixreports-implementation-plan.md`, đối chiếu các quyết định đã chốt rồi thực hiện kế hoạch FR-00–FR-12: source frontend/backend, dữ liệu, UI/UX, kiểm thử, review và tài liệu. Dùng các skill đã cài đúng nhiệm vụ; không thêm nghiệp vụ, nút tạo, màn hình hoặc workflow chỉ vì skill gợi ý.

## 1. Nguồn yêu cầu và cách bắt đầu

Đọc trước:

- `AGENTS.md`, `C:\Users\admin\.codex\RTK.md` và hướng dẫn áp dụng trong các thư mục sẽ sửa.
- `FixReports.md` và `docs/planning/2026-10-19-fixreports-clarification.md`.
- `docs/planning/2026-10-19-fixreports-implementation-plan.md`: đọc toàn bộ phạm vi, ma trận skill, source, phụ thuộc, task FR-00–FR-12, chuyển dữ liệu, nghiệm thu A01–A20 và cách ghi bằng chứng. Đây là kế hoạch triển khai chính.
- `docs/content/spider-plus-project-overview.md`: nội dung Thông tin dự án được viết mới từ tài liệu tham khảo người dùng cung cấp.
- `docs/planning/README.md`, `docs/planning/STATUS.json`, `docs/planning/06-execution-guide.md`, `docs/development-skills.md`.
- Các tài liệu nghiệp vụ/API/database, `tasks/plan.md`, `tasks/todo.md` và source/tests thực tế liên quan.

Các câu trả lời đã chốt trong bản làm rõ bổ sung/thay thế câu mơ hồ của FixReports và quyết định nghiệp vụ cũ tương ứng. Kế hoạch quy định thứ tự thực hiện và kiểm chứng; không dùng đề xuất kỹ thuật trong kế hoạch để thay đổi nghiệp vụ đã chốt. Không áp quy tắc cũ trái với yêu cầu mới. Không coi mô tả đã có trong tài liệu là bằng chứng code/runtime đang đúng.

Kiểm tra nhánh và working tree; làm trên `system-design`, bảo toàn thay đổi có sẵn. Xác định baseline để review cả thay đổi chưa commit và file mới. Giữ React JavaScript + Java/Spring Boot + MySQL/Flyway; không đổi stack theo ví dụ skill. Prefix lệnh shell bằng `rtk`.

Trước khi sửa, trình bày ngắn cách hiểu, các module bị tác động và thứ tự triển khai rồi thực hiện phần đã rõ. Không hỏi lại các quyết định đã chốt, bao gồm Q08/Q19. Với điểm phát sinh thực sự chưa rõ, hỏi bằng tình huống cụ thể và nêu phần bị chặn; tiếp tục phần độc lập đã rõ. Không tự điền quyết định nghiệp vụ bằng phỏng đoán.

## 2. Skill và nhiệm vụ cụ thể

Đọc đúng `SKILL.md` tại các skill root hiện có, thường là `C:\Users\admin\.codex\skills\<tên>\SKILL.md` hoặc `C:\Users\admin\.agents\skills\<tên>\SKILL.md`. Thông báo ngắn skill đang dùng và mục đích. Bảng dưới và mục 3 của kế hoạch là yêu cầu áp dụng theo công việc, không phải danh sách tên để chỉ nhắc lại. Mỗi task phải ghi skill → phần áp dụng → đầu ra/bằng chứng. Chỉ nạp skill đúng giai đoạn; không mở toàn bộ thư viện. Thiếu skill thì báo chính xác tên và phần bị ảnh hưởng, không giả vờ đã dùng hoặc tự cài thêm.

| Nhóm | Skill | Dùng để làm gì |
| --- | --- | --- |
| Matt Pocock | `grill-with-docs` cùng `grilling`, `domain-modeling` | Làm rõ điểm chưa chốt, định nghĩa Feature/file/case/issue/người phụ trách và lưu quyết định; không phỏng vấn lại các câu đã trả lời. |
| Matt Pocock | `codebase-design` | Đối chiếu ranh giới module/state/identity và ảnh hưởng tới API/database trước khi tổ chức lại luồng. |
| Matt Pocock | `to-spec` | Chuyển yêu cầu đã xác nhận thành đặc tả cục bộ có actor, quyền, hành vi và nghiệm thu; không đăng issue tracker. |
| Matt Pocock | `implement` | Workflow triển khai chính theo các phần có đầu ra kiểm chứng được; không tự commit theo mặc định của skill. |
| Matt Pocock | `tdd` | Chủ trì test hành vi RED → GREEN từng phần nhỏ; test qua UI/public API và database tích hợp khi cần. |
| Matt Pocock | `code-review` | Review đúng đặc tả và chuẩn repo, gồm diff chưa commit/file mới; refactor có căn cứ ở bước review rồi chạy lại test bị ảnh hưởng. |
| Matt Pocock | `handoff` | Lưu quyết định, tiến độ, bằng chứng và phần còn lại khi đổi phiên/agent hoặc bàn giao. |
| Superpowers | `using-superpowers` | Chọn và áp dụng đúng skill, không mở rộng phạm vi sản phẩm. |
| Superpowers | `brainstorming` | So sánh phương án kỹ thuật/UX khi có lựa chọn đáng kể; không thêm một vòng duyệt chung cho quyết định đã chốt. |
| Superpowers | `writing-plans` | Chia đặc tả thành phần việc theo phụ thuộc, file bị tác động và kiểm chứng; dùng hệ kế hoạch hiện có, không tạo roadmap song song. |
| Superpowers | `systematic-debugging` | Tái hiện và xác định nguyên nhân lỗi/test fail, phân biệt bug với thay đổi nghiệp vụ chủ đích. |
| Superpowers | `test-driven-development` | Bổ sung kỷ luật quan sát test FAIL trước khi sửa cho cùng vòng TDD, không tạo test/quy trình trùng với `tdd`. |
| Superpowers | `requesting-code-review`, `receiving-code-review` | Giao review có đặc tả/baseline/diff/bằng chứng; kiểm tra finding trước khi sửa. |
| Superpowers | `verification-before-completion` | Chỉ báo hoàn tất khi có bằng chứng mới, đúng phạm vi thay đổi cuối cùng. |
| Backend/API | `api-design` | Contract Feature/file/phân công/Issue/Note/report/search; validation, pagination, lỗi và concurrency. |
| Backend/security | `security-review` | Quyền phía server, phạm vi dự án/Feature/case, AI liên dự án, import, Markdown, secret và truy cập dữ liệu. |
| Chuyển đổi | `deprecation-and-migration` | Thay luồng cũ, mapping dữ liệu, giữ file/nội dung, bỏ phụ thuộc cũ có chủ đích và kiểm thử chuyển đổi. |
| Frontend | `frontend-patterns` | React JS state/router/query, giữ nháp, xử lý loading/empty/error/retry, chặn response cũ và quay lại đúng case. |
| Frontend/UI | `frontend-ui-engineering` | HTML semantic, focus, keyboard/touch, responsive, bảng dữ liệu và badge/preview dùng được không cần chuột. |
| UI/UX | `impeccable` | Thiết kế ứng dụng quản trị ở chế độ Operate: điều hướng, mật độ bảng, phân cấp thông tin, trạng thái và hoàn thiện UI. |
| UI/UX | `ui-ux-pro-max` | Tham khảo có mục tiêu cho bảng/tiến độ/dashboard/form; không đổi phong cách toàn ứng dụng hoặc thêm chức năng ngoài yêu cầu. |
| Kiểm thử | `e2e-testing` | Hành trình Feature → import → phân công → case → Issue → quay lại; quyền, báo cáo và tìm kiếm. |
| Kiểm chứng | `verification-loop` | Build/test/coverage/security/diff và PASS/FAIL/NOT_RUN; dùng chung bằng chứng với verification của Superpowers. |

Áp dụng `coding-standards`/`code-simplification` khi chỉnh code liên quan. Dùng `subagent-driven-development` hoặc `dispatching-parallel-agents` khi có việc độc lập đáng giao; tối đa ba agent phụ, phân quyền sở hữu file rõ, một agent chịu trách nhiệm tổng hợp và một người điều khiển browser tại một thời điểm.

`backend-patterns` đang cài có ví dụ Node/Express/Next.js; chỉ lấy nguyên tắc phù hợp nếu cần, không coi đây là skill Spring Boot. Không bịa tên skill Java/MySQL chưa cài. Tài liệu chính thức đúng phiên bản là nguồn bổ sung khi API chưa rõ; không tự cài MCP/hook/toolchain. Các mục `audit`, `critique`, `clarify`, `harden`, `polish` của Impeccable là reference/subcommand, không nhất thiết là skill độc lập.

## 3. Yêu cầu chức năng đã chốt

### R01. Điều hướng và màn tổng quan

- Quản lý kiểm thử là tab con của Bảng công việc, mở trực tiếp danh sách Feature của dự án.
- Đổi nhãn Bảng Kanban sang tên tiếng Việt phù hợp, đề xuất “Bảng trạng thái”. Giữ hai cách xem bảng/danh sách bên trong; thay mục Danh sách độc lập bên ngoài bằng Quản lý kiểm thử.
- Bỏ nhóm Quản lý kiểm thử độc lập và các phần cũ: Thư viện test case độc lập, Đợt kiểm thử, Kiểm thử lại, Công việc theo file. Thay bằng luồng Feature/file/case, không chỉ giấu menu rồi để workflow cũ tiếp tục cản người dùng.
- Bỏ mục Quản lý tiến độ ngoài menu; đưa chức năng quản lý tiến độ vào Tổng hợp & Phân tích.
- Đổi Cài đặt dự án thành Thông tin chung; giữ các tab con khác, thay Danh mục bằng Note.
- Bỏ mục Trợ lý AI khỏi menu; giữ chatbot và khả năng cấu hình theo R08.
- Tổng quan bỏ Việc cần xử lý và Công việc tạo gần đây, thay bằng Thông tin dự án theo bản viết mới `docs/content/spider-plus-project-overview.md`: giới thiệu Spider Plus; mục tiêu/phạm vi System Test ứng dụng Flutter; các bên Spider Plus/SHIFT/SYP; tài liệu đầu vào; kết quả/bàn giao. Trình bày ngắn, dễ đọc trên giao diện; không dán toàn bộ tài liệu nguồn hoặc thay bằng bảng metadata đơn thuần.
- Nội dung Spider Plus chỉ gắn với đúng dự án tương ứng. Đối chiếu identity trước khi ghi dữ liệu; không hardcode nội dung này cho mọi dự án hoặc gán ngẫu nhiên nếu chưa xác định được dự án. Giữ đây là khối nội dung đọc, không tự thêm CMS/form nghiệp vụ mới.
- Liên kết tài liệu lấy từ bản nội dung được cung cấp; không coi chúng là bằng chứng đã kiểm tra tài liệu đích. Thông tin CAT/SHIFT/Backlog và nghiệm thu là ngữ cảnh tham khảo, không tự xây tích hợp mới, thay Redmine, thêm ký duyệt/phê duyệt NA hoặc đổi quy tắc Status. P/NA vẫn tính đã test; 100% tiến độ không phải chứng nhận nghiệm thu.
- Rà các liên kết cũ để không điều hướng tới màn đã bỏ; bảo toàn ngữ cảnh dự án và dùng ánh xạ hợp lệ, không redirect tùy tiện sang dữ liệu khác.

### R02. Feature và file test case

- Feature là một đợt kiểm thử thuộc dự án, gồm tên, môi trường test nhập tự do (tên/URL) và mô tả ngắn. Không tự thêm vòng đời/phê duyệt/trường nhập ngoài yêu cầu.
- PM/Admin được tạo, sửa, xóa Feature và import/xóa file. PM vẫn trong phạm vi dự án quản lý; quyền đọc liên dự án qua AI không cấp quyền CRUD ngoài dự án.
- Xóa Feature là lưu trữ/ẩn, giữ dữ liệu và có thể khôi phục; không xóa dây chuyền file/case/issue. Cung cấp thao tác xóa/ẩn file cho PM/Admin theo yêu cầu bảo toàn dữ liệu; không suy thành quyền xóa cứng hoặc tự thêm luồng khôi phục file riêng.
- Mở Feature thấy danh sách file như thư viện hiện có; import Excel ngay trong Feature. Mỗi Feature có bản nội dung/kết quả/phân công độc lập. Cùng Excel ở nhiều Feature được phép; sửa Feature A không làm thay đổi B.
- Tái sử dụng khả năng nhập và bảng chi tiết đang có phù hợp với luồng mới. Không yêu cầu người dùng tạo cycle/configuration/build/device/run qua các màn cũ để có thể làm việc.
- Danh sách file có tên, người phụ trách kèm phạm vi case và tiến độ số case đã test/tổng case bằng thanh ngang. Có cách xem tiến độ nhiều Feature. Chỉ thêm cột cần thiết cho yêu cầu, không mở rộng thành dashboard mới ngoài phạm vi.

### R03. Phân công, người test và Status

- Một file có thể có nhiều Tester, mỗi người đảm nhận phạm vi case rõ ràng. PM phân công; Tester tự nhận cả file chưa có người và file đã có người.
- Tester tự điều chỉnh dải case của mình; PM/Admin phân công theo quyền: A nhận 1–40 thì B nhận 41–60. Không tự chia hoặc tự chuyển phần trùng. Backend kiểm ownership, phạm vi hợp lệ, không chồng lấn và xung đột cập nhật; Tester không được ghi đè phân công của người khác.
- Tự điền cột người test cho các case được phân công. Không nhầm người được giao với tác giả thực tế đã ghi một kết quả khi lưu lịch sử hoặc tạo dữ liệu kinh nghiệm AI.
- Đổi người sau khi case có kết quả: không tạo lượt test/run mới hoặc reset Status. Giữ hai cột người test đầu tiên/người test lại gần nhất; cập nhật người gần nhất khi đổi tiếp, có lịch sử. Không sinh cột lần 3, lần 4.
- Đổi nhãn iPad thành Status. Giữ vòng Unexecuted → OK → NG → P → NA → Unexecuted và cơ chế lưu kết quả có phản hồi rõ ràng.
- Đã test = mọi case có Status khác Unexecuted. Tiến độ = đã test/tổng case; P và NA đều tính ở tử số, NA không bị loại khỏi mẫu số. Mỗi case tính một lần trong phạm vi Feature/file đó.
- Rà và thay công thức cũ ở các phép tổng hợp liên quan; không tái sử dụng `(OK + NG)/(tổng − NA)` cho luồng mới. Với file rỗng, hiển thị hợp lệ, không NaN/Infinity hoặc tự coi hoàn thành.

### R04. Issue và Quản lý lỗi

- Toàn hệ thống chỉ giữ Bug/QA trong luồng sử dụng; bỏ Task/Công việc, Request/Yêu cầu, Improvement/Cải tiến khỏi form, bộ lọc và đường tạo liên quan. Không tự đổi dữ liệu loại cũ thành Bug/QA bằng mapping bịa ra.
- Không đặt thêm nút “Thêm công việc” ở các bảng không cần tạo. Hai điểm tạo có trong yêu cầu là Issue tại case và lỗi monkey test tại Quản lý lỗi.
- Nút dưới Status đổi thành Issue. Mở form tự điền đúng Feature, file, case, bước thực hiện, kết quả mong muốn; Tester điền phần còn lại và chọn Bug/QA.
- Lưu thành công trở về đúng case, giữ trang/bộ lọc/vị trí xem phù hợp và cập nhật badge. Lỗi lưu giữ nháp và không tăng số giả.
- Badge đếm tất cả issue gắn đúng bản case, gồm đã đóng. Không tính lẫn case cùng tên/nội dung ở Feature khác. Preview danh sách khi hover, đồng thời dùng được bằng bàn phím/chạm; chọn issue mở chi tiết.
- Quản lý lỗi hiển thị lỗi trong dự án, lọc theo Feature/tên; không chọn Feature thì xem toàn dự án theo quyền.
- Monkey là Bug thuộc đúng Feature của lần test phát hiện lỗi, không gán sang Feature khác và không bắt buộc có case. Người dùng có thể ghi “monkey test” trong tiêu đề tự do; không bắt buộc tiền tố, không tạo loại issue hoặc workflow MONKEY mới.
- Với lỗi monkey: Tester tạo/sửa/xóa mềm lỗi mình tạo; PM/Admin quản lý theo phạm vi quyền hiện có; DEV xử lý lỗi được giao. Xóa chỉ ẩn/lưu trữ, không xóa dữ liệu và không tự xóa issue trên dịch vụ bên ngoài. Backend kiểm ownership và liên kết project/Feature/case nếu có; giữ toàn quyền ADMIN hiện hành.
- Không code quy trình retest/trao đổi DEV/khách hàng bên ngoài. Người dùng tự cập nhật Status và ghi chú issue sau kiểm thử lại. Rà điều kiện retest request/coverage/run cũ đang cản hành vi mới, nhưng giữ quyền, validation và kiểm soát cập nhật đồng thời. Không thêm state machine hoặc tự đóng issue khi case chuyển OK.

### R05. Admin và thiết bị

- Tổng quan Admin bỏ một hiển thị vai trò trùng. Ưu tiên giữ bảng có Tổng/Hoạt động và bỏ biểu đồ cùng số liệu; không xóa phần thông tin khác không trùng.
- Danh sách chọn thành viên chỉ hiện người chưa thuộc bất kỳ dự án nào; bỏ danh sách phụ dưới phần chọn nếu gây trùng theo FixReports. Không diễn giải thành chưa nhận máy hoặc chưa thuộc riêng dự án đang chọn. Không phá membership cũ vì quy tắc lọc mới.
- Bàn giao thiết bị chỉ chọn PM, ghi rõ một PM nhận các máy nào và thông tin bàn giao cần thiết. PM quản lý/phân phối nội bộ bên ngoài phần mềm; không tạo UI/API phân máy cho member.
- Bỏ hiển thị/phụ thuộc việc từng member đang giữ máy trong luồng mới. Không yêu cầu allocation đứng tên Tester để họ thực hiện case; không bỏ thông tin thiết bị đã giao cho PM.
- Cố định menu Admin khi cuộn phần nội dung; menu dài và màn hình nhỏ vẫn truy cập được.

### R06. Tìm kiếm và nhật ký

- Tìm theo nhiều từ: AND, không phân biệt hoa/thường/dấu tiếng Việt, không cần đúng thứ tự. Áp dụng nhất quán các ô tìm kiếm liên quan của yêu cầu; truy vấn và tổng số/phân trang phải khớp, không chỉ lọc dữ liệu của trang hiện tại.
- Nhật ký bỏ bộ chọn Loại sự kiện, thay bằng tìm theo người thực hiện/dự án/đối tượng/thao tác.
- Giữ Từ ngày–Đến ngày; bỏ selector múi giờ, cố định Asia/Ho_Chi_Minh. Hiển thị và biên truy vấn cùng múi giờ, bao gồm trọn ngày kết thúc.
- Kiểm tra tiếng Việt/Unicode, chuỗi rỗng và ký tự đặc biệt theo contract; không tự coi `%`/`_` người dùng nhập là quyền thay cấu trúc truy vấn.

### R07. Tổng hợp & Phân tích, báo cáo và Note

- Cải thiện UI dashboard sức khỏe dự án, giữ chức năng liên quan và đưa quản lý tiến độ vào trong màn này. Công thức tiến độ theo R03.
- PM/Admin dùng chức năng báo cáo; TESTER/DEV không xem màn, tạo/xem/xuất báo cáo quản trị tương ứng. Enforce ở server/API, không chỉ ẩn menu.
- AI tạo báo cáo Markdown: chọn dự án, tùy chọn Feature; không chọn Feature thì toàn dự án. Nội dung: thông tin dự án/Feature, tiến độ, phân bố Status, Bug/QA, vấn đề cần chú ý, nhận xét/đề xuất có căn cứ và phần thiếu dữ liệu.
- Có preview, sửa văn bản, lưu và tải. Mở/tải lại phải đúng bản đã lưu; cleanup/TTL của nháp hoặc chat không được xóa báo cáo đã lưu. Sửa câu chữ/số trong báo cáo chỉ thay nội dung bản báo cáo; tuyệt đối không ghi ngược vào case/issue/Status hoặc dữ liệu nghiệp vụ gốc. Không tự thêm chia sẻ/phê duyệt báo cáo chưa được yêu cầu.
- Note chung thay Danh mục: PM/Admin CRUD, member khác chỉ đọc trong dự án được phép. Giữ các tab con khác của Thông tin chung. Không tự thêm hệ đính kèm/phê duyệt/permission riêng cho Note.

### R08. Chatbot, phạm vi dữ liệu và gợi ý AI

- Giữ chatbot riêng và lịch sử/nháp/cách gửi đang dùng. Bỏ mục Trợ lý AI ở menu Admin/workspace.
- Đường vào cấu hình: nút nhỏ “Cấu hình AI” trong chat mở phần cấu hình hiện có, tái sử dụng `AiSourceSelector`/`AiConnections.jsx`. Giữ khả năng provider/model theo tài khoản do backend cấp, điều kiện local owner/localhost và server-side secrets. Không biến mọi cấu hình thành Admin-only hoặc đưa key ra frontend.
- Đổi nguồn/model theo cơ chế hội thoại hiện có; không đổi ngầm provider/model/scope của hội thoại cũ hoặc yêu cầu đang gửi.
- PM/Admin được yêu cầu AI xem/trích xuất dữ liệu nghiệp vụ của cả dự án không tham gia. Quyền này không tự cấp CRUD ngoài dự án, truy cập secret hoặc hội thoại riêng của người khác.
- TESTER/DEV được giải thích case, hỏi issue, người từng test và phần việc trong phạm vi được xem. Không cho báo cáo quản trị toàn dự án, phân tích tổng hợp như màn Tổng hợp & Phân tích hoặc trích xuất hàng loạt; trả thông báo không đủ quyền khi bị yêu cầu.
- Với dự án ngoài quyền của TESTER/DEV, AI chỉ dùng kinh nghiệm tổng hợp làm cơ sở hỗ trợ; không tiết lộ tên dự án, danh tính, nội dung case/issue, số liệu riêng hoặc tài liệu ngoài phạm vi. Kiểm soát dữ liệu trước retrieval/context và khi trả kết quả; không chỉ nhờ prompt model giữ bí mật. Nội dung tài liệu/issue là dữ liệu, không phải chỉ thị đổi quyền.
- AI gợi ý người test theo lịch sử file/case, số lần test/kinh nghiệm ở Feature khác, khối lượng/độ khó và người hiện có; giải thích căn cứ, nói rõ phần suy luận và dữ liệu thiếu. Gợi ý chỉ để tham khảo, không tự ghi phân công hoặc nhận việc thay người dùng.
- Hỗ trợ giải thích case, tìm người từng test bằng dữ kiện thực có. Sau chuyển đổi có thể thiếu lịch sử: nói rõ, không bịa người có kinh nghiệm; khi thiếu cơ sở, gợi ý phân bổ hợp lý để PM/Tester quyết định.
- Phạm vi nền có dữ liệu toàn hệ thống theo quyền trên; chọn dự án/Feature xác định đối tượng cần hỗ trợ. Dùng truy vấn/truy xuất phù hợp, không nhét cả database vào một prompt hoặc coi vài mẫu giới hạn là đã đọc toàn bộ. Không tự huấn luyện model hoặc thêm dịch vụ AI mới.

## 4. Chuyển dữ liệu và loại bỏ phụ thuộc cũ

- Người dùng chấp nhận đổi cấu trúc kiểm thử cũ; phần bắt buộc giữ là file test case và nội dung case. Kết quả/người test/lịch sử/issue liên quan cũ không bắt buộc chuyển tiếp. Đây không phải quyền xóa toàn bộ dữ liệu khác của hệ thống.
- Lập mapping đợt kiểm thử cũ → Feature trong đúng dự án, file/case → bản thuộc Feature. File dùng nhiều đợt thành các bản độc lập; file chưa có đợt vào Feature “Dữ liệu cũ chưa phân đợt” của đúng dự án, theo quyền lựa chọn đã được giao.
- Bảo toàn workbook và đầy đủ nội dung case hiện hành cần giữ; đối chiếu số lượng, nguồn, nội dung và project scope. Không chỉ giữ Excel gốc rồi làm mất nội dung case đã sửa. Mapping chưa chứng minh giữ đủ dữ liệu thì chưa áp dụng chuyển đổi phần đó.
- Rà các phụ thuộc cycle/configuration/run/file-work/retest/device allocation cũ ở frontend, API, DB, KPI, export và AI. Tái sử dụng phần phù hợp; không nhân đôi mô hình nghiệp vụ hoặc giữ điều kiện cũ khiến luồng mới không sử dụng được.
- Viết migration tiếp nối phiên bản thực tế, không sửa migration đã áp dụng. Kiểm tra fresh database và upgrade trên dữ liệu cô lập, khả năng khôi phục, tính nhất quán FK/unique/index/transaction và chạy lại không tạo dữ liệu chuyển đổi trùng khi áp dụng cơ chế đó.
- Tách xóa/lưu trữ trong vận hành mới khỏi việc chuyển đổi dữ liệu cũ. Xóa Feature mới là lưu trữ có khôi phục; không lấy quyền chuyển đổi cũ để xóa cứng Feature đang vận hành.
- Trước khi áp dụng chuyển đổi gây mất dữ liệu trên database đang dùng, phải có mapping, danh sách dữ liệu giữ/bỏ, backup và phương án khôi phục cụ thể để người dùng review. Không chạy fixture ghi/xóa lên database sử dụng. Tiếp tục phần source/migration/test cô lập trong phạm vi đã được phép.

## 5. Cách triển khai và kiểm chứng

Một workflow chính: đối chiếu yêu cầu → domain/contract/chuyển dữ liệu → triển khai theo phần → kiểm thử → review → cập nhật tài liệu. Dùng skill hỗ trợ từng bước, không chạy nhiều workflow cạnh tranh.

1. Lập ma trận R-ID → UI/API/domain/schema → quyền → tiêu chí nghiệm thu → test → trạng thái. Chốt contract cần thay trước implementation tương ứng; tầng không liên quan ghi N/A có lý do.
2. Thực hiện FR-00–FR-12 theo dependency tại mục 5–6 của kế hoạch. Dùng cùng checklist/trạng thái, không lập roadmap thứ hai. Có thể chia nhỏ bước kỹ thuật trong task khi cần nhưng giữ R-ID, scope, contract và DoD; hoàn tất checkpoint trước task phụ thuộc. Không tự mở thêm yêu cầu ngoài FixReports.
3. Với thay đổi hành vi, có test mô tả yêu cầu mới hoặc tái hiện bug và quan sát FAIL trước khi sửa. Các bề mặt kiểm thử được yêu cầu trong prompt này: tương tác UI công khai; HTTP/public API cho quyền, validation và trạng thái; migration/database tích hợp cô lập cho bảo toàn dữ liệu và transaction. Ghi rõ phần được kiểm tra và giới hạn; không cần xin phê duyệt lại từng test tại các bề mặt này. Chỉnh CSS/copy thuần túy dùng kiểm tra trực quan phù hợp, không viết test chỉ lặp implementation.
4. UI giữ thiết kế ứng dụng đang có, gọn và dễ đọc. Có loading/empty/error/retry, giữ nháp khi lỗi, tránh double submit, bảo toàn ngữ cảnh khi tạo issue và xử lý 401/403/404/409 phù hợp. Không thêm màn chẩn đoán backend/database vào giao diện nghiệp vụ.
5. Chạy targeted tests trong khi sửa, suite/build phù hợp khi chốt. Đọc package/scripts và môi trường hiện tại để chọn lệnh, không sao chép test command từ ví dụ skill khác stack.
6. Trong `Frontend`, các lệnh hiện có để đối chiếu gồm `rtk proxy npm test -- --maxWorkers=2`, `rtk proxy npm run build`, và `rtk proxy npm run test:coverage -- --maxWorkers=2` khi đo coverage. Dùng đúng đường dẫn `Frontend` trên Windows.
7. Backend dùng wrapper/scripts hiện có như `scripts/Test-Backend.ps1` với suite phù hợp và điều kiện môi trường thực tế; không bắt buộc bật Docker để app chạy, không tự tạo container/server vì thiếu credential native. Native tests ghi dữ liệu chỉ ở môi trường cô lập được phép. Chạy kiểm tra contract nếu thay contract; structural check không thay HTTP integration.
8. Kiểm tra browser các luồng chính và viewport phù hợp, tối thiểu mobile/tablet/desktop nếu làm responsive. Kiểm tra focus/keyboard/touch alternative cho badge/preview, overflow, nhãn và trạng thái lưu. Ảnh trước/sau cùng route/viewport/dữ liệu/vai trò; xem ảnh thật, không chỉ lưu file rồi tuyên bố UI đạt.
9. Tách bằng chứng unit, fixture browser, API tích hợp, native và live AI. Thiếu môi trường thì ghi NOT_RUN cùng điều kiện cần, không dùng mock làm bằng chứng tích hợp thật. Live provider chỉ dùng dữ liệu kiểm thử phù hợp và quyền thực tế; không tự gửi dữ liệu dự án thật để thử.
10. Review độc lập phần đáng kể: đúng yêu cầu, backend authorization, dữ liệu/migration, code quality, hành vi hồi quy và UI. Sửa finding có căn cứ rồi chạy lại kiểm chứng bị ảnh hưởng; không lặp vô hạn hoặc sửa phần không liên quan.

### Các ví dụ nghiệm thu bắt buộc

- Hai Feature import cùng Excel có bản riêng; sửa nội dung/Status/phân công ở A không đổi B. Lưu trữ/khôi phục Feature không làm mất file/case/issue.
- A nhận 1–40, B nhận 41–60; phạm vi trùng không âm thầm ghi đè. Đổi người sau kết quả giữ Status, cập nhật người test lại gần nhất và lịch sử, không tạo run/cột lần 3.
- Năm case gồm hai Unexecuted, một OK, một P, một NA: tiến độ đúng **3/5 = 60%**. Không dùng công thức cũ hoặc nhân số case theo số người.
- Issue tạo từ case được điền đúng ngữ cảnh; lưu trở về đúng case, badge gồm cả issue đóng và không tính lẫn Feature khác. Không có đường tạo Task/Request/Improvement còn hoạt động trong luồng mới.
- Monkey Bug không có case vẫn tạo được trong đúng Feature; không gán ngầm sang Feature khác. Tester không sửa/xóa mềm lỗi của người khác qua API; PM/Admin/DEV theo quyền đã chốt; lưu trữ giữ dữ liệu.
- TESTER/DEV hỏi case/issue được phép thành công, yêu cầu báo cáo quản trị/bulk export bị từ chối; dự án ngoài quyền không lọt chi tiết. PM/Admin có thể dùng AI truy vấn dự án không tham gia; quyền AI không tự cấp thêm quyền ghi. PM giữ project scope, ADMIN giữ quyền quản trị hiện hành.
- Sửa báo cáo “10 lỗi” thành “8 lỗi”, lưu rồi mở/tải thấy 8; dữ liệu issue gốc vẫn giữ 10. Preview/render Markdown không thực thi nội dung không tin cậy.
- Tìm “NHUNG cam” khớp “Cẩm Nhung”, nhưng chỉ một từ khớp thì không đạt. Nhật ký đúng biên ngày Việt Nam và tìm được các trường đã chốt.
- Chỉ PM được chọn nhận máy; không cần phân lại máy cho Tester trên phần mềm để thực hiện case. Chỉ PM/Admin quản lý Feature/file/Note; member khác đọc Note, không gọi trực tiếp API để sửa được.
- Thông tin Spider Plus hiển thị đúng dự án và dùng bản viết mới; dự án khác không nhận nhầm nội dung. Nội dung tham khảo về bàn giao không làm thay đổi công thức tiến độ, quyền đổi Status hoặc tự mở tích hợp CAT/Backlog.

## 6. Phạm vi hành động và bàn giao

Được đọc/sửa source, contract, tài liệu, migration và tests trực tiếp liên quan theo yêu cầu đã chốt. Không dừng ở mockup, audit hoặc danh sách đề xuất khi phần đã rõ còn có thể thực hiện. Khi cần dịch vụ để kiểm thử, kiểm tra runtime/quyền hiện tại, sử dụng môi trường phù hợp; không tự restart dịch vụ đang được sử dụng hoặc chạy script lịch sử trong `var/` mà chưa đọc và xác định phạm vi.

Không tự commit/push/merge/deploy, tạo PR/issue bên ngoài, cài hook/MCP, đổi toolchain hoặc thêm dependency lớn chỉ vì skill có bước mặc định. Không ghi đè thay đổi của người dùng. Không tự gọi UAT đạt hoặc đóng S11 chỉ vì tests local PASS.

Cập nhật trực tiếp checklist và ledger FR trong `docs/planning/2026-10-19-fixreports-implementation-plan.md`, cùng task/review theo quy ước repo khi thực sự triển khai; ghi rõ thay đổi phạm vi do FixReports. Giữ trạng thái toàn dự án phản ánh đúng phần còn lại; không coi PLANNED trong kế hoạch là việc đã làm. Báo cáo cuối gồm:

- Các FR-ID/R-ID và tiêu chí A01–A20 hoàn tất/chưa hoàn tất, kèm thay đổi người dùng nhìn thấy.
- File chính đã đổi, contract/migration và phạm vi dữ liệu bị tác động.
- Skill → phần áp dụng thực tế → bằng chứng.
- Lệnh, kết quả, phạm vi test/build/browser/coverage; PASS/FAIL/NOT_RUN/NOT_CONFIGURED/NOT_MEASURED đúng thực tế. Không suy coverage từ số test PASS.
- Các giới hạn, blocker, quyết định còn thiếu và bước tiếp theo; không tuyên bố hệ thống hoàn toàn không lỗi hoặc mọi vai trò/mọi trạng thái đều đã được kiểm tra.

Bắt đầu bằng đọc các nguồn, đối chiếu source và trình bày ngắn cách hiểu cùng thứ tự task. Sau đó thực hiện phần đã rõ trong kế hoạch; không dừng ở bản tóm tắt hoặc hỏi lại quyền bắt đầu chung. Chỉ hỏi quyết định nghiệp vụ mới thực sự thiếu và giữ phần phụ thuộc chờ câu trả lời, đồng thời làm tiếp phần độc lập.
