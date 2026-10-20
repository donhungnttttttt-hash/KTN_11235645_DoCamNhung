# Review độc lập sơ đồ và user story — Frontend/nghiệp vụ

Ngày: 19/10/2026. Reviewer: agent `doc_frontend_review`. Baseline source: `9ccc73483faddde48d930c9607f2f2f7f6981761`. Phạm vi: đọc source, đọc `working/build_diagrams.cjs` và `working/business-analysis.md`, xem trực tiếp bằng image viewer đủ năm PNG 04/05/06/09/10. Không sửa diagram code, không chạy UI/test/build, không render Word. Kết luận hình ảnh chỉ áp dụng PNG tại lần xem; chưa xác nhận khả năng đọc sau khi thu nhỏ trong DOCX/PDF. Các line dưới đây là line đã đọc ở phiên bản trước chỉnh theo review.

## Kết luận cần xử lý trước khi chèn vào báo cáo

### D04-01 — Trung bình: use case gộp động từ làm sai cách đọc quyền

Trong `04-use-cases.png`, ellipse “Đọc / lưu Note” nối TESTER/DEV; ellipse “Tạo và xử lý Bug / QA” nối DEV. Người đọc dễ hiểu các actor có toàn bộ hành vi của ellipse. Chú thích association chỉ là tham gia chưa đủ giải quyết sự mơ hồ này.

- Evidence diagram: `working/build_diagrams.cjs:31–34`.
- Evidence nghiệp vụ: `docs/business/permissions.md:13–16`: DEV không tạo Bug/QA; TESTER/DEV chỉ đọc Note. DEV xử lý Issue được giao theo capability.
- Sửa đề nghị: tách “Đọc Note” và “Quản lý Note”; tách “Tạo Bug/QA” và “Xử lý Issue theo quyền”. Dùng association cụ thể theo actor, giữ điều kiện chi tiết trong bảng quyền. Không hiểu ADMIN toàn quyền là đọc private chat của người khác (`permissions.md:20`).

### D04-02 — Trung bình: đường ADMIN không kết thúc ở use case

Polyline ADMIN kết thúc lơ lửng ở phía dưới ellipse cuối (tọa độ đích trong hình khoảng 325,780); mũi tên đó không biểu diễn association UML hợp lệ tới các ca còn lại. Câu “ADMIN còn có quyền quản lý các ca còn lại” là chú thích, không thay quan hệ sơ đồ.

- Evidence: ảnh 04 đã xem; `working/build_diagrams.cjs:32–34`.
- Sửa đề nghị: nối ADMIN bằng association thực tới các use case cần thể hiện, hoặc chia hình/nhóm use case để tránh quá nhiều đường. Bỏ mũi tên không có đích; không dùng actor generalization nếu dẫn tới kế thừa sai giới hạn chat riêng.

### D05-01 — Trung bình: đường luồng xuyên hộp và thiếu nhánh tự nhận

Trong `05-workflow.png`, đường PM→TMS ở y=300 xuyên qua hộp TESTER “Hoặc tự nhận phạm vi của mình” (x400–700,y260–345), chồng lên nội dung và làm quan hệ khó hiểu. Hộp tự nhận chỉ có đường ra, chưa có nhánh vào từ sau nhập file; luồng hiện dễ bị đọc là phải PM phân công trước.

- Evidence: `working/build_diagrams.cjs:36`; ảnh 05.
- Sửa đề nghị: sau file sẵn sàng, thể hiện hai nhánh thay thế “PM phân công” / “TESTER tự nhận phần mình” cùng hội tụ vào kiểm quyền/phạm vi/version; đi đường bên ngoài hộp, không cắt text. Đây là swimlane minh họa, không gắn nhãn BPMN chuẩn.
- Source: `Frontend/src/app/features/testing/TestingDocumentPage.jsx:55`; `docs/business/permissions.md:11`.

### D05-02 — Nhẹ: tiến độ cần độc lập với tạo Issue

Luồng hiện đặt tiến độ sau nhánh Issue dù Issue đã ghi “nếu cần”. Nên có đường Status đã lưu→tiến độ trực tiếp, và một nhánh tùy chọn từ case→Issue, để không suy ra cần tạo Issue mới tính tiến độ hoặc NG tự tạo Issue.

- Source: `TestingDocumentPage.jsx:41` tính tested bằng Status khác `UNEXECUTED`; `:70–72` nút Status và action Issue riêng biệt.
- Quy tắc cần giữ: P/NA tính đã test; không đòi execution/run/máy/cycle; Issue không tự sinh từ NG.

### D06-01 — Nhẹ: nhãn DB trộn kiểm quyền với thao tác dữ liệu

`06-sequence-status.png` đọc rõ, lifeline/đường trả về và thứ tự success path hợp lý. Tuy nhiên thông điệp service→MySQL “Lock row / quyền / phiên bản” khiến quyền trông như do DB xử lý.

- Evidence: `working/build_diagrams.cjs:42–43`.
- Source call chain đã xác minh: `Frontend/src/app/features/test-cases/useDocumentResults.js:20–33` → `Backend/src/main/java/vn/syp/tms/testcase/TestDocumentController.java:29–33` → `Backend/src/main/java/vn/syp/tms/feature/FeatureService.java:200–206` → `Backend/src/main/java/vn/syp/tms/testcase/TestDocumentService.java:59–85`.
- Sửa đề nghị: DB “Đọc/khóa row và version hiện tại”; backend self-call/note “Kiểm quyền, scope, version, requestKey”. Caption ghi rõ đây là nhánh lưu thành công; 401/403/409 và optimistic update/rollback mô tả bằng văn bản hoặc hình riêng. Không cần thêm mọi lớp controller vào hình tổng quan.
- Service thực sự kiểm assignment và valid status ở `FeatureService:201–205`; kiểm replay/version ở `TestDocumentService:75–78`; update kết quả+actor+audit ở `:79–84`. UI tạm đổi trước response rồi phục hồi khi lỗi (`useDocumentResults:23,31–33`), vì vậy không mô tả mỗi cú bấm là chắc chắn đã lưu.

### D09 — Đạt trong phạm vi ảnh/source đã đọc

`09-status.png` thể hiện đúng vòng bấm `Unexecuted → OK → NG → P → NA → Unexecuted`, có ghi đây là UI cycle và backend không bắt buộc từng cạnh. Nhãn rõ, không bị cắt. Không phát hiện sai nghiệp vụ trong phạm vi này.

- Source: `Frontend/src/app/features/test-cases/ResultCycleButton.jsx:3–14`; `FeatureService.java:205` chỉ validate tập status.
- Giữ phân biệt với one-way sync Result/Fixed legacy; không gọi hình là lifecycle Bug/QA hay full backend state machine.

### D10-01 — Trung bình: thiếu màn Quản lý lỗi độc lập và vị trí chat toàn shell

`10-navigation.png` hiện chỉ gộp Issue bên dưới case. Cần thêm “Quản lý lỗi /issues” là màn độc lập để thể hiện đường tạo Bug monkey không cần case. Chat hiện chỉ nối từ workspace nhưng được mount cho cả ADMIN shell. Workspace nên ghi PM/TESTER/DEV mặc định; ADMIN mở theo lựa chọn, có đường từ Admin vào workspace.

- Source: `Frontend/src/app/components/Sidebar.jsx:10–25` có `/issues`, `/settings/members`; `Frontend/src/app/routes/AppRouter.jsx:47–48` xác nhận Quản lý lỗi và điểm tạo monkey; `Frontend/src/AppEntry.jsx:20–49` Admin opt-in và mặc định `/admin`; `:56` AiChat ở ngoài RoleApp nên dùng cả hai shell.
- Sửa đề nghị: thêm box `/issues`; gắn chat vào authenticated shell hoặc nối cả Admin/workspace. Ghi “Thành viên” trong nhóm Thông tin chung nếu muốn dùng hình làm inventory toàn route. Giữ footer `/tests/*` retired và `/progress` alias có guard PM/ADMIN (`AppRouter:43,49–51`).
- Đây là sơ đồ điều hướng mức nhóm, không screenshot UI; chữ/màu hiện đọc tốt ở PNG gốc.

## Review user story / acceptance criteria

Tài liệu BA đã phân biệt AC mong muốn với test đã chạy và không đánh dấu toàn bộ story DONE; giữ cách phân biệt này. Các điểm sau cần chỉnh câu cho đúng contract, không phải kết quả test FAIL mới:

| ID | Nhận xét và đề nghị | Evidence |
|---|---|---|
| BA01 | US01 AC1, `business-analysis.md:64`, “nhập đủ tên/môi trường/mô tả” dễ hiểu cả ba bắt buộc có chữ. Đổi “tên hợp lệ; môi trường/mô tả nếu có tuân theo giới hạn”. Payload vẫn phải có environment/description không null nhưng cho phép chuỗi rỗng. | `Frontend/src/app/features/testing/FeatureForm.jsx:13,20–22`; `Backend/src/main/java/vn/syp/tms/feature/FeatureDtos.java:8–11`: chỉ name `@NotBlank`, hai trường còn lại `@NotNull @Size`. |
| BA04 | US04 value/AC, `:86–89`, dùng “người đã test trước đó” cần phân biệt người được phân công với người thực ghi Status. Đề nghị value “truy được thay đổi người phụ trách và người ghi kết quả qua lịch sử tương ứng”; AC dùng tên cột UI nhưng nói rõ là projection phân công. | `TestingDocumentPage.jsx:59` hiển thị trực tiếp “Hai cột người test thể hiện phân công; người ghi kết quả có trong lịch sử.” |
| BA05 | US05 AC1 `:96` thêm “khi lưu thành công” trước phản hồi đã lưu; bổ sung hoặc dẫn tới AC lỗi mạng/version: phục hồi trạng thái đã xác nhận, thông báo và yêu cầu tải lại. Không đồng nhất optimistic UI với persistence. | `useDocumentResults.js:23–33`; `TestingDocumentPage.jsx:42–43,60`. |
| BA11 | US11 AC1 `:144` nên nêu cả lô máy đã chọn bàn giao cho **cùng một PM**, tránh “PM nhận tương ứng” được hiểu chọn từng người khác nhau. | `Frontend/src/app/features/admin/InitialDevicePicker.jsx:17–19`; `AdminProjectForm.jsx:30` chặn hơn một recipient trong batch ban đầu. |
| BA10 | US10 AC1 `:136`, “AI có thể sử dụng” chưa dễ kiểm nghiệm. Nên định nghĩa observable permission/context boundary và thiếu nguồn được thông báo; không hứa chất lượng câu trả lời hay khẳng định đã đọc toàn bộ file. | Giới hạn đã ghi đúng trong AC2; `docs/business/permissions.md:20`. Chất lượng runtime AI chưa được kiểm chứng trong đợt báo cáo. |

## Skill và giới hạn

- `frontend-patterns`: đối chiếu route, provider placement, controlled Status UI, pending/error rollback; evidence AppEntry/AppRouter/useDocumentResults nêu trên.
- `documentation-and-adrs`: kiểm lời khẳng định sơ đồ với code, tách sơ đồ hiện trạng khỏi quyết định/nhánh legacy, giữ traceability.
- `grill-with-docs` + `grilling/domain-modeling`: kiểm actor, context boundary, thuật ngữ người được phân công/người ghi Status và optional Issue. Không tự đổi rule hoặc tạo câu hỏi lại cho quyết định đã chốt.
- `code-review`: findings cụ thể theo hình/line, severity về tính đúng của tài liệu; không đánh đồng source inspection với runtime pass.

Đây là review vòng đầu. Cần xem lại PNG được sửa trước khi tuyên bố các finding đã đóng. Không có phát hiện nào được ghi là đã sửa trong file này.

## Vòng 2 — xem lại năm PNG sau chỉnh sửa

Đã mở lại trực tiếp đủ `04-use-cases.png`, `05-workflow.png`, `06-sequence-status.png`, `09-status.png`, `10-navigation.png` sau khi tác giả sửa và render. Kết quả sau đây thay trạng thái vòng đầu đối với các finding hình; chưa kiểm BA chỉnh sửa hoặc layout Word.

| Finding | Kết quả vòng 2 |
|---|---|
| D04-01 | Đã xử lý sự nhầm quyền ghi Note/tạo Issue của DEV: tạo Bug/QA tách khỏi xử lý Issue được giao; đọc Note/AI tách khỏi quản lý Note/báo cáo. TESTER/DEV không nối tới ellipse quản lý Note; DEV không nối tạo Bug/QA. |
| D04-02 | Đã bỏ đường ADMIN lơ lửng, association thực nối ellipse. Tiêu đề “các Use Case tiêu biểu” phù hợp việc sơ đồ không biểu diễn mọi quyền. Các đường chéo bên trái còn giao nhau nhưng không đè text/ellipse và theo dõi được ở PNG gốc. |
| D05-01 | Đã sửa: hai nhánh PM phân công và TESTER tự nhận từ file hợp lệ, cùng tới kiểm quyền/version/phạm vi; đường PM đi vòng không xuyên hộp. |
| D05-02 | Đã sửa: Status→lưu Status/tổng hợp tiến độ là nhánh trực tiếp; Issue có nhãn “Tùy chọn”; footer nói rõ tiến độ không phụ thuộc có Issue. |
| D06-01 | Đã sửa: DB đọc/khóa row/version, kiểm quyền/scope/version được ghi ở service. Đường success/return và nhãn đọc rõ. Hình vẫn cần caption “nhánh thành công” như manifest; không suy ra có đầy đủ exception/optimistic sequence. |
| D09 | Tiếp tục đạt: đúng vòng UI, có nhãn backend nhận tập hợp hợp lệ, không đồng nhất Bug/QA hoặc tự tạo Issue khi NG. |
| D10-01 | Đã sửa: `/issues` độc lập và Bug khám phá không cần case; chat từ shell sau đăng nhập có cả hai không gian; workspace ghi PM/TESTER/DEV và ADMIN chủ động mở; nhóm thông tin có Thành viên; alias/retirement giữ đúng. |

Góp ý nhỏ còn lại cho caption hình 04: ellipse “Phân công phạm vi” nối TESTER nên có dòng “TESTER chỉ tự nhận/sửa phần mình, không ghi đè người khác; PM/ADMIN quản lý phân công”. Điều này giữ sơ đồ tiêu biểu gọn và tránh hiểu association TESTER là quyền phân công cả file. ADMIN có các quyền đọc/AI và xử lý Issue theo bảng quyền dù không được nối đầy đủ trong hình tiêu biểu. Đây là giới hạn biểu diễn cần nói trong caption, không phát hiện sai implementation.

Không còn finding hình mức trung bình chưa xử lý trong năm PNG đã xem. Chưa xác nhận readability khi chèn DOCX/PDF, chưa kiểm chứng tương tác UI và chưa chạy test mới. Các góp ý BA01/04/05/11/10 vẫn chờ kiểm tra phiên bản BA sau sửa.
