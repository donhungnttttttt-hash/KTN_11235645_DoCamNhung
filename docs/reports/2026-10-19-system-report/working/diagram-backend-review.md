# Review độc lập sơ đồ backend, 19/10/2026

Phạm vi: ảnh PNG `01-context`, `02-architecture`, `03-modules`, `07-data-core`, `08-data-support`; đã mở đủ năm ảnh bằng view_image và đọc `working/build_diagrams.cjs`. Đối chiếu source/migration đã đọc trong backend-review và đọc lại các FK/AI persistence liên quan. Không sửa builder, không render Word, không sử dụng LibreOffice desktop. Đây là đánh giá ảnh độc lập, không chứng minh bố cục từng trang DOCX.

Các skill api-design, domain-modeling, codebase-design, security-review, code-review đã đọc từ pha backend được tiếp tục áp dụng: lần lượt kiểm nhãn giao tiếp; identity/cardinality; kiến trúc/module; scope actor và persistence AI; kiểm mâu thuẫn hình/source. Đầu ra là các nhận xét dưới đây.

## Kết quả kiểm lại sau sửa

Đã mở lại đủ năm PNG bằng view_image, đọc các đoạn builder đã đổi và lấy SHA-256 mới. Kết luận: các vấn đề nội dung và giao cắt chính trong phạm vi năm ảnh đã được xử lý; ảnh hiện hành có thể dùng cho báo cáo ở mức kiểm tra PNG độc lập. Chưa có bằng chứng render từng trang DOCX.

| Finding | Trạng thái mới | Bằng chứng quan sát |
|---|---|---|
| DG-B01 | RESOLVED_PNG | 08: projects nối trực tiếp Note; report có tuyến riêng từ projects. Không còn cạnh Report→Note. |
| DG-B02 | RESOLVED_BY_SCOPE | 08 được thu hẹp thành Issue/Note/report; chat/user/membership chuyển về từ điển dữ liệu. Không còn cạnh chat xuyên history. Đây là giảm phạm vi hình đã được root xác nhận, không xóa nội dung khỏi báo cáo. |
| DG-B03 | RESOLVED_PNG | 02 có cạnh AI→MySQL nhãn Chat/draft; ô MySQL ghi rõ chat/draft. |
| DG-B04 | RESOLVED_PNG | Nhãn có viền trắng nên đường không che nét chữ; cardinality đọc được trong ảnh. Viền trắng khá rõ quanh text trong box là lựa chọn thẩm mỹ, không lỗi nội dung. |
| DG-B05 | RESOLVED_PNG | 07 ghi đủ UNIQUE(project_id,test_case_id,revision_no) trên hai dòng; FK project-scoped giản lược vẫn được nêu trong desc/từ điển. |
| DG-B06 | RESOLVED_PNG | 08: context và history đều nối từ work_items, không còn ngụ ý FK history→context. |
| DG-B07 | RESOLVED_PNG | 01: liên kết AI/Workbook/Redmine không hướng; AI có nhãn ngữ cảnh/trả lời, Workbook nhập/xuất. |
| DG-B08 | RESOLVED_PNG | 02 bỏ nhãn V1–V33 khỏi ô DB; desc tiếp tục nói kiến trúc logic không phải production. Version/profile còn trong văn bản kỹ thuật. |

Không phát hiện sai quan hệ mới cần chặn trong năm ảnh. Nhận xét nhỏ không chặn: 03 vẫn dùng bus có arrow hai phía nên caption phải gọi phân rã chức năng, không gọi đồ thị phụ thuộc service. 07 hai cạnh file→case/row bắt đầu hơi bên trong đáy ô import_batches sau khi tăng chiều cao; không đè chữ, nhưng có thể đưa điểm đầu ra mép đáy để nét sạch hơn. Kiểm tra kích thước chữ thực tế và ngắt trang Word vẫn chưa được thực hiện.

## Phát hiện ở phiên bản đầu — đã được xử lý theo bảng trên

| ID | Mức | Hình / bằng chứng | Nhận xét và đề nghị |
|---|---|---|---|
| DG-B01 | Cần sửa nội dung | 08-data-support; builder `route([[1060,190],[1090,190],[1090,455],[1080,455]])`; V31:90–96 | Cạnh tới `project_notes` bắt đầu ở mép trên bên phải ô `project_management_reports`, không nối `projects`. Dù desc nói Project→Note, hình thực tế gợi Report sở hữu Note. Source `fk_project_notes_project` là project_id→projects(id), không có FK từ Note tới report. Vẽ tuyến trực tiếp từ projects vòng ngoài tới Note, ghi 1→0..N, tránh đi qua/chạm ô report. |
| DG-B02 | Cần sửa bố cục | 08-data-support; builder `line(340,677,760,677,'Thread 1 → 0..N')`; view_image | Cạnh thread→turn đi xuyên ô work_item_feature_history; label Thread đè lên tên/FK của history. Dễ đọc thành history liên kết chat, vốn không có FK đó. Chuyển quan hệ chat xuống hàng riêng hoặc đi đường vòng dưới các ô với khoảng trống đủ cho nhãn. FK đúng tại V25:51 là (thread_id,created_by)→ai_chat_threads(id,created_by). |
| DG-B03 | Cần bổ sung kiến trúc | 02-architecture | Nhánh AI chỉ nối provider, không nối MySQL. Chat/draft source có dữ liệu riêng lưu MySQL (`AiChatStore.java:82,153`, `AiDraftStore.java:73`), nên sơ đồ hiện tại dễ tạo ấn tượng AI stateless. Thêm cạnh AI/integration→MySQL hoặc cạnh backend→MySQL chung; nhãn chat/draft tạm, không ghi nghiệp vụ. Có thể giữ vòng đời TTL ở chú thích thay vì thêm chi tiết khó đọc. |
| DG-B04 | Cần sửa legibility | 01/02/07/08 | Các nhãn cạnh đặt tại chính đường kẻ khiến chữ bị xuyên: 01 “Ngữ cảnh được phép”, “Theo endpoint còn mở”; 02 “JSON / cookie phiên / CSRF”; 07/08 các cardinality thẳng đứng và hai cạnh chéo của file. Đặt nhãn lệch bên cạnh đường hoặc nền trắng có padding. Không chỉ tăng độ phân giải vì đường vẫn đi qua chữ. |
| DG-B05 | Nên sửa ký pháp khóa | 07-data-core | `UNIQUE(case,revision_no)` là nhãn rút gọn, không phải cột SQL chính xác. V4:68 là UNIQUE(project_id,test_case_id,revision_no). Dù desc nói khóa chọn lọc, một ô đã dùng PK/FK/UNIQUE nên ưu tiên đúng tên cột (chia hai dòng hoặc đặt trong bảng chú thích). Tương tự `FK feature_id` cần chú thích FK thực tế(project_id,feature_id), như manifest đã có. |
| DG-B06 | Nên làm rõ quan hệ | 08-data-support | Cạnh đi thẳng context→history gợi FK history tham chiếu context. V31:76–80: history FK(project_id,work_item_id) trực tiếp work_items; context cũng FK trực tiếp work_items. Nếu gọi ER vật lý thì nối history từ work_items; nếu giữ logical link thì ghi rõ “lịch sử của cùng Issue; FK tới work_items” và dùng nét phụ thuộc khác. |
| DG-B07 | Nên sửa luồng dữ liệu | 01-context | Workbook ghi “Nhập và xuất” nhưng mũi tên chỉ TMS→Workbook; AI cũng chỉ outbound trong khi nhận output. Với context interaction diagram một liên kết không hướng là đủ, hoặc dùng hai đầu/nhãn nhập↔xuất. Không gọi hình này là DFD chuẩn nếu không biểu diễn đúng dữ liệu vào/ra. |
| DG-B08 | Nên nêu trong caption | 02-architecture | “Flyway V1–V33” là phạm vi migration source; V20/V22 chỉ db/demo trong local profile, V32/V33 Java. Caption nên ghi source logical architecture, không runtime production và không hàm ý profile nào cũng chạy demo. Không cần đưa tất cả version vào ô nếu làm chữ nhỏ. |

V31 trong bảng = `Backend/src/main/resources/db/migration/V31__feature_owned_testing.sql`; V25 = `Backend/src/main/resources/db/migration/V25__private_ai_chats.sql`; V4 = `Backend/src/main/resources/db/migration/V4__create_test_case_library.sql`. Các tệp AI ở `Backend/src/main/java/vn/syp/tms/ai/`.

## Phần đã phù hợp với source ở phiên bản đầu

- 01 dùng bốn role thực ADMIN/PM/TESTER/DEV và phạm vi Project→Feature→file→case; Redmine được ghi legacy/adapter còn source, không vẽ khách/BrSE hay SHIFT/CAT là tích hợp đã triển khai. Tuy nhiên nhãn TESTER/DEV là nhóm actor tổng quát; ma trận quyền bên cạnh phải nói Dev không ghi Status.
- 02 mô tả Spring Boot monolith, JPA hoặc JdbcTemplate/store, session cookie+CSRF, MySQL/Flyway; không gán Supabase/JWT/microservices không có trong code. Provider không tự ghi nghiệp vụ là đúng giới hạn.
- 03 là phân rã chức năng dễ đọc, không có text overflow. Sáu nhóm bao phủ phạm vi hiện hành; không biến run/session/retest legacy thành workflow mới. Đường bus có mũi tên hai phía có thể được đọc là dependency giữa nhóm; nếu caption chỉ là cây phân rã, nên dùng nhánh không hướng/junction nhỏ nhưng đây không phải lỗi dữ liệu.
- 07 chuỗi Project1→NFeature→Nfile, file→Ncase/row, case→Nrevision, row→0..1assignment phù hợp. Nullable feature_id cho legacy và nullable target_case_id được thể hiện. Row→case ghi cùng file đúng constraint V31, nhưng vẫn cần ghi FK composite ở từ điển vì hình giản lược. Đây là ER logic chọn lọc, không toàn bộ85bảng.
- 08 role hệ thống/user khác membership, work_item có0..1Feature context (do legacy không context), report optionalFeature và chat owner scope là phù hợp. Không có căn cứ biến chat owner thành ADMIN xem mọi chat.

## Đánh giá trình bày phiên bản đầu và giới hạn

Các ảnh PNG rõ, chữ Việt hiển thị đúng và màu có độ tương phản phù hợp khi xem độc lập. 01/02/03 phần text trong box không thấy bị cắt. 07 `source_workbook` sát đáy ô import_batches, nên thêm khoảng trống. 08 có hai lỗi giao cắt nghiêm trọng đã nêu. Khi scale vào bề ngang trang Word, kích thước chữ có thể nhỏ hơn mức xem ảnh; chưa có render DOCX nên chưa xác nhận font-size hữu hiệu, ngắt trang hoặc caption. Review chỉ nghiệm thu ảnh ở thời điểm đọc, cần xem lại PNG sau root sửa.

## Hash ảnh hiện hành đã kiểm lại

| Ảnh | SHA-256 |
|---|---|
| 01-context.png | E63821ACAB0ABF7B13DCE9F94A9FBE8DC7169158E9B3592D8D25C9F1574B12DA |
| 02-architecture.png | FC75703EDEBE65314B6F7A4693A14B1DEA493D08D033AD121D9AA157F3F6DCA6 |
| 03-modules.png | 45EC8C5AB8D7C2D0568FCFA5CE99BBDF412A0AD29081B0C5C29B9D6BAAE4773B |
| 07-data-core.png | 0A5F25E70D4CDAA6FF69C0390988850DD3675C5628C6B261D5B1F1793905D42A |
| 08-data-support.png | CF5D7DB7A28AF0978AD1897DCF5A04679F00DB2B5183C9492A7497FCA0F7BE5B |
