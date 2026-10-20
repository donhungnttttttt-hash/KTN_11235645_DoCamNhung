# Đối chiếu và bàn giao báo cáo TMS

Ngày khảo sát: 19/10/2026. Baseline: nhánh `system-design`, commit `9ccc73483faddde48d930c9607f2f2f7f6981761`. Đây là tác vụ phân tích và biên soạn tài liệu; không sửa sản phẩm để làm cho mô tả khớp, không chạy migration, ghi database, restart, commit, push hoặc xuất tài liệu lên dịch vụ ngoài.

## 1. File bàn giao và trạng thái

| Đầu ra | Nội dung và trạng thái |
|---|---|
| [Báo cáo Word](Bao-cao-phan-tich-he-thong-TMS.docx) | DOCX thực tế, ba chương, 12 User Story/37 AC, 11 Use Case, 17 bảng, 10 sơ đồ nhúng. Đã kiểm tra nội dung và OOXML; chưa kiểm tra trực quan từng trang. |
| [Nguồn và ảnh sơ đồ](So-do-TMS-nguon-va-anh.zip) | 10 SVG chỉnh sửa được, 10 PNG đã nhúng, manifest và script tạo sơ đồ cục bộ. |
| [Đối chiếu chi tiết CSV](Doi-chieu-tung-muc.csv) / [JSON](Doi-chieu-tung-muc.json) | 291 mục với nội dung gốc, phần giữ, vấn đề, nguồn cần đối chiếu, hướng xử lý và mục đích đến thực tế. CSV có UTF-8 BOM để đọc tiếng Việt trong Excel. |
| [Kết quả kiểm tra](Kiem-chung-tai-lieu.json) | Hash bản cuối, CRC/XML, liên kết, ảnh, kiểm tra bảo toàn source và các mục chưa xác minh. |

Người dùng đã xác nhận dùng “Bản gốc.docx” làm **mẫu cấu trúc cho TMS**, sẽ tự bổ sung thông tin bìa. Bản Word mới có các trường bìa để trống có nhãn; tiêu đề mô tả hiện tại chưa được coi là tên đề tài chính thức đã duyệt.

## 2. Giữ, viết lại và bổ sung so với bản gốc

| Nhóm của mẫu | Xử lý trong bản TMS | Căn cứ |
|---|---|---|
| Bìa và thông tin nhận diện | Giữ các trường cần điền; không chuyển tên tác giả, người hướng dẫn hoặc đơn vị của mẫu sang TMS. | Quyết định của người dùng; tránh gán nhầm danh tính. |
| Phần đầu | Giữ lời nói đầu, mục lục, danh mục bảng/hình và từ viết tắt. Mục lục điều hướng bằng liên kết nội bộ; chưa ghi số trang chưa được render xác nhận. | Cấu trúc OOXML đọc được; giới hạn renderer. |
| Chương 1: đơn vị và đề tài | Giữ vai trò của chương; thay miền du học bằng bối cảnh kiểm thử, Spider Plus, stakeholder, phạm vi, dữ liệu vào/ra và mục tiêu có căn cứ. Thông tin pháp lý/cơ cấu đơn vị thực tập chưa có nguồn được nêu là chưa biết. | Nội dung dự án Spider Plus, quyết định nghiệp vụ và source hiện hành. |
| Chương 2: phương pháp và công cụ | Viết lại theo React JavaScript, Java/Spring Boot, MySQL/Flyway, phân lớp yêu cầu và phương pháp kiểm chứng. | Manifest, cấu hình mẫu, code, migration, skill BA. Không giữ stack không thuộc TMS từ mẫu. |
| Chương 3: phân tích và thiết kế | Giữ chức năng phân tích–thiết kế–hiện thực–kiểm chứng; bổ sung quyền, US/AC, Use Case, module, hành trình xuyên tầng, API, mô hình dữ liệu, UI, AI và giới hạn. Sửa thứ tự/số mục trùng của mẫu. | Clarification C01–C14; controller/service/store/router; review độc lập. |
| Chức năng miền du học | Không chuyển thanh toán, đặt lịch tư vấn hoặc LMS thành chức năng TMS. Ghi phạm vi loại trừ; chỉ thay bằng chức năng TMS khi có nguồn. | Đối chiếu nghiệp vụ đã chốt và implementation. |
| Bảng và sơ đồ mẫu | Đối chiếu từng bảng/caption; tạo bảng và sơ đồ TMS mới có căn cứ. Không gọi ảnh gốc thiếu hoặc không đọc được là đã xác minh. | Inventory, schema/API và source SVG/PNG. |
| Kiểm thử và kết luận | Thay kết quả của đề tài cũ bằng bằng chứng TMS đúng checkpoint, phân biệt source, test lịch sử và việc chưa được kiểm chứng. | Receipt lịch sử, hash nguồn, trạng thái review. |
| Tài liệu tham khảo/phụ lục | Dùng nguồn thật S01–S14; thêm ma trận truy vết, phạm vi đọc và bảng skill → việc dùng → bằng chứng. | File và symbol khảo sát, hồ sơ review kèm theo. |

Trong CSV/JSON, `finalTarget` là mục thực tế của bản TMS. `target` trong JSON giữ phương án biên tập vòng đầu để truy vết, không dùng làm mục đích đến cuối. Mã `W-Bxxxx` là vị trí khối trong XML gốc, **không phải số trang**. Các mục miền cũ không có chức năng tương đương được ghi rõ là loại khỏi phạm vi, không có nghĩa đã triển khai chức năng thay thế.

## 3. Những điểm nghiệp vụ được làm rõ trong báo cáo

- Feature là đơn vị nhóm đợt kiểm thử theo luồng hiện hành; phân biệt Feature, file, case, phân công, Status, Issue và nội dung báo cáo. Không lấy workflow thực thi cũ làm mô tả mặc định của luồng mới.
- Phân công phạm vi case là phân công trách nhiệm. “Người test đầu/cuối” không tự chứng minh người thực tế đã ghi kết quả; audit và quyền ghi cần đọc riêng. ADMIN có phạm vi toàn hệ thống; PM/TESTER/DEV có quyền tương ứng được backend kiểm tra.
- Status có năm giá trị; vòng bấm trên UI không phải tập cạnh chuyển trạng thái bắt buộc ở backend. Công thức tiến độ có P/NA, mẫu số và trường hợp rỗng được nêu rõ; tiến độ 100% không đồng nghĩa UAT đạt.
- Issue gồm BUG/QA; Issue từ case, monkey và quyền cập nhật của DEV được phân biệt. Endpoint/tích hợp legacy còn trong source không được mô tả thành tính năng đã sẵn sàng ở runtime.
- Báo cáo quản lý lưu nội dung văn bản; không làm thay đổi dữ liệu issue/case nguồn. Chat AI có phạm vi quyền và dữ liệu được giới hạn/lấy mẫu; không khẳng định AI đọc mọi ô dữ liệu hay bảo đảm mọi câu trả lời đúng.
- Ngoại lệ lưu trữ dự án của ADMIN với lý do đã được yêu cầu nhưng còn thiếu implementation; các điểm đang IN_REVIEW và mâu thuẫn còn mở được giữ trong phần hạn chế.

## 4. Kiểm kê bản gốc và giới hạn phục hồi

File gốc có 12.527.073 byte; SHA-256 `61049eb3c19e2a1c0c811ffa620f690e6536f7879f06ff5b4ade780a19af7637`. Chẩn đoán xác định gói ZIP bị cắt, thiếu central directory/EOCD và dừng trong một phần ảnh. Không ghi đè hoặc sửa file gốc.

Đã khôi phục riêng 54 entry hoàn chỉnh, kiểm CRC; đọc đầy đủ XML nội dung chính với 927 khối thân tài liệu, 2.484 paragraph tính cả bảng/textbox, 40 bảng, 76 drawing, một textbox và năm section. Hồ sơ đối chiếu có 291 mục, bao gồm 66 caption hình. Trong XML chính không có tham chiếu comment/footnote/endnote hoặc tracked insertion/deletion; điều đó không chứng minh các phần sau đoạn bị cắt không tồn tại.

Thiếu 35 ảnh được tham chiếu cùng một số thành phần gói, trong đó có theme. Nội dung chữ nằm trong các ảnh thiếu và bố cục trang gốc chưa thể xác minh. Số trang cache trong mục lục gốc không được dùng làm vị trí đã xác nhận. [Review bản gốc](working/word-original-review.md) ghi chi tiết phạm vi đọc và hướng xử lý.

## 5. Phạm vi source và bằng chứng

Đã kiểm kê frontend/backend/database/API/quyền/tích hợp/AI/tests/cấu hình và tài liệu; đọc sâu các hành trình cốt lõi. Không tuyên bố đọc từng dòng toàn repository hoặc bấm mọi button. Frontend có 166 tệp JS/JSX ngoài test/setup trong inventory; import closure tĩnh 103 tệp không có nghĩa mọi component đều được render. Backend có 40 controller, 33 migration và 133 tệp Java test được kiểm kê; 85 câu CREATE TABLE trong source không phải số bảng runtime vừa đếm.

Dependency, build, cache và generated được loại khỏi đọc sâu khi không cần thiết. Không đưa credential/config bí mật vào báo cáo. Phạm vi, symbol, API và giới hạn đọc chi tiết nằm tại:

- [Review frontend và bằng chứng](working/frontend-evidence-review.md), [bản đồ frontend](working/frontend-module-map.json).
- [Review backend](working/backend-review.md), [inventory schema](working/backend-schema-inventory.json).
- [Phân tích nghiệp vụ, User Story và AC](working/business-analysis.md).
- [Review nội dung cuối](working/final-content-review.md), [review sơ đồ backend](working/diagram-backend-review.md), [review sơ đồ frontend](working/diagram-frontend-review.md).

Receipt frontend lịch sử ghi **1.100 test PASS trong 120 file**; build receipt có exit code 0. Đã so hash 320/320 file frontend trong receipt với source hiện hành và chúng khớp. Đây vẫn là bằng chứng của lượt chạy trước, không phải test vừa chạy trong tác vụ viết báo cáo. Không gán coverage checkpoint cũ cho bộ 1.100 test, không suy coverage từ số test PASS và không gọi local test là UAT.

Receipt database/runtime đã được đọc trực tiếp từ `var/fixreports-main-cutover-2026-10-19/main-after-proof.json` và `main-runtime-final.json`: V30→V33, bảo toàn 7.374 row cũ trên 74 bảng được đối chiếu (hai bảng session loại trừ), health UP tại thời điểm receipt. Không truy vấn/ghi database mới để xác nhận trạng thái hiện tại trong tác vụ này.

Kiểm tra cuối tài liệu đạt CRC, parse 17 XML/relationship parts, 104 bookmark và 80 liên kết nội bộ không có đích thiếu, đủ 10 ảnh nhúng, không còn placeholder biên soạn. Quét mẫu token/private key/credential assignment không có khớp trong nội dung DOCX; đây là kiểm tra theo mẫu, không phải chứng minh tuyệt đối. Hash **745 tệp sản phẩm được bảo vệ** khớp baseline; file Word gốc cũng không đổi.

## 6. Bộ sơ đồ

Số tiền tố của tên file là mã ổn định; số hình trong Word theo thứ tự xuất hiện:

| Số hình Word | Nguồn SVG và ảnh PNG cùng tên | Nội dung |
|---|---|---|
| 1 | `05-workflow` | Quy trình phân công và ghi nhận kiểm thử |
| 2 | `01-context` | Ngữ cảnh hệ thống |
| 3 | `03-modules` | Phân rã chức năng |
| 4 | `04-use-cases` | Use Case tiêu biểu theo vai trò |
| 5 | `02-architecture` | Kiến trúc ứng dụng hiện hành |
| 6 | `06-sequence-status` | Trình tự ghi Status thành công |
| 7 | `09-status` | Vòng Status trên giao diện |
| 8 | `07-data-core` | Quan hệ dữ liệu kiểm thử cốt lõi |
| 9 | `08-data-support` | Quan hệ Issue, Note và báo cáo |
| 10 | `10-navigation` | Điều hướng màn hình hiện hành |

Mười PNG đã được review riêng và sửa các nhận xét về quyền, quan hệ, nhánh xử lý và đường nối. Điều này **không thay thế** việc xem ảnh từng trang Word sau khi nhúng. ERD là mô hình logic có khóa/cardinality chọn lọc, kèm từ điển dữ liệu; không thu nhỏ toàn bộ schema vào một hình. Kiến trúc không được gọi là deployment production; không có bằng chứng đủ để vẽ topology production.

## 7. Skill đã dùng và phần còn lại

Phụ lục B trong Word ghi từng skill, mục đích và đầu ra; các review độc lập cũng ghi skill đã đọc và dùng. Các nhóm gồm BA (`ask-why-ba`, `user-story-ac-writer`), Word (`documents`), phân tích source (`grill-with-docs`, `domain-modeling`, `codebase-design`, `api-design`, `security-review`, `frontend-patterns`, `documentation-and-adrs`, `code-review`), kế hoạch/review/kiểm chứng (`using-superpowers`, `writing-plans`, `systematic-debugging`, `requesting-code-review`, `receiving-code-review`, `verification-before-completion`, `verification-loop`, `handoff`). Không coi việc có skill trên đĩa là bằng chứng đã kiểm thử.

**Chưa hoàn tất ba điểm:**

1. Tác giả bổ sung bìa, tên đề tài chính thức, giảng viên và dữ kiện đơn vị thực tập có căn cứ. Không điền dữ liệu của mẫu cũ.
2. Runtime Codex được yêu cầu có `libreOfficeVersion=null`; render bản cuối thất bại vì thiếu `soffice.exe`. Theo [SKILL.md của documents](C:/Users/admin/.codex/plugins/cache/openai-primary-runtime/documents/26.1017.11052/skills/documents/SKILL.md), “never use the user's installed desktop LibreOffice even if the bundled version fails.” Vì vậy không dùng LibreOffice desktop hoặc tự cài công cụ thay thế. Log tại `var/word-report-2026-10-19/final-render.log`. **Chưa kiểm tra bố cục từng trang, ngắt trang, độ đọc được của bảng/hình ở kích thước in; không tuyên bố báo cáo đã hoàn tất toàn bộ QA.**
3. Nếu cần xác minh đầy đủ ảnh/bố cục của mẫu gốc, cần bản DOCX nguyên vẹn. Phần cấu trúc và nội dung TMS có thể sử dụng ngay; giới hạn này không làm thay đổi kết quả đọc source.

Mở Word và bổ sung bìa không tự đóng hạng mục kiểm chứng. Khi có renderer được phép, cần render bản cuối, xem tất cả các trang, chỉnh vùng bị lỗi và render lại; cập nhật hash/receipt sau mọi thay đổi.
