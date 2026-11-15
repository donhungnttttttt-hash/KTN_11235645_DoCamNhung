# Môi trường và Version của test case

Ngày: 14/11/2026. Nhánh: `system-design`.
Trạng thái hiện tại: người dùng đã duyệt; source đã triển khai và runtime local V42. Nghiệm thu trực quan Chrome còn mở. Xem docs/reviews/2026-11-14-case-environment-version.md; các mô tả “hiện trạng/đề xuất” dưới đây ghi lại thời điểm thiết kế.
Skill: `C:/Users/admin/.codex/skills/brainstorming/SKILL.md`.

## 1. Mục tiêu và quyết định đã chốt

Mỗi case tiếp tục có một Status hiện tại. Môi trường và Version chỉ là thông tin bổ sung; tester chọn lại khi xác nhận trên môi trường khác. Chọn thông tin không tự đổi Status, reset tiến độ, đổi người test ban đầu hoặc tạo bộ kết quả riêng.

Người dùng đã đồng ý thiết kế trong hội thoại: icon người phụ trách/xóa file; xác nhận trước khi xóa; quản lý Version/Môi trường dưới tiêu đề Feature; ô tìm/thêm trên danh sách; cột MT & Ver với hai dropdown; giữ lịch sử, đồng bộ Issue và xuất Excel.

Hai hướng đã đối chiếu:

- **Được chọn:** một kết quả hiện tại, bổ sung môi trường/version và lịch sử thay đổi thông tin. Giữ cách tester làm việc và cách tính tiến độ hiện hành.
- Không chọn: mỗi cặp môi trường/version có kết quả riêng. Đây là ma trận kiểm thử khác nghiệp vụ người dùng yêu cầu.

Các lựa chọn kỹ thuật/chi tiết UX bên dưới là đề xuất cụ thể để người dùng duyệt cùng tài liệu; không phải chức năng đã triển khai.

## 2. Hiện trạng source và vấn đề cần giải quyết

- `TestingFeaturePage.jsx` đặt `FeatureTestVersions` cạnh Nhập Excel; xóa file gọi ẩn trực tiếp, chưa có xác nhận.
- `FeatureTestVersions.jsx` đã có xóa mềm và xác nhận, nhưng ô thêm ở dưới danh sách và mũi tên luôn hướng xuống.
- `DocumentOwners.jsx` chọn nhiều thành viên, lưu độc lập với quyền cập nhật case. Cần giữ nguyên quy tắc này khi đổi trigger thành icon.
- `TestingDocumentPage.jsx` gọi lưu kết quả với Status cũ khi đổi version. `TestDocumentService` ghi audit `RESULT_<before>_<after>`; cần tách cập nhật thông tin khỏi sự kiện đổi Status.
- `test_document_result_executions` lưu snapshot theo `result_version`, yêu cầu version và ngày. Chưa hỗ trợ môi trường độc lập hoặc chỉ chọn môi trường khi Feature chưa có version.
- `testing_features.environment` là mô tả môi trường/server hiện hữu, khác danh mục môi trường mới.
- Issue có môi trường/thiết bị nhập tay và snapshot version; cần giữ khả năng sửa bằng chứng này.
- Export vừa sửa về đúng 13 cột. Import tiếp tục chỉ lấy chín trường nội dung; không nhập môi trường/version/Status từ các cột dư.

## 3. Giao diện Feature và dropdown

### Dưới tiêu đề Feature

Giữ tên, mô tả và môi trường/server cũ. Thêm một hàng gọn gồm hai điều khiển có nhãn rõ **Version** và **Môi trường**, nằm dưới khối tiêu đề, phía trên bộ lọc file. Nhập Excel vẫn là hành động riêng. Không thay tên Feature thành một tiêu đề cố định: “Dữ liệu cũ chưa phân đợt” chỉ là tên Feature trong ảnh.

Hai điều khiển dùng chung mẫu: trigger hiển thị mục vừa chọn/thêm; nhãn vẫn giúp phân biệt hai loại. Mở dropdown: trên cùng là ô tìm/nhập và nút Thêm, bên dưới là danh sách cuộn. Gõ lọc danh sách đồng thời làm tên mục mới; thêm chỉ có ở nơi quản lý danh mục. Chưa có mục: chữ xám “Chưa có version” hoặc “Chưa có môi trường”. Không tìm thấy: trạng thái riêng, vẫn cho thêm tên hợp lệ.

Thêm thành công đóng dropdown, hiện tên mới và cập nhật danh sách. Thêm thất bại giữ nội dung đã nhập và thông báo tại chỗ. Chọn mục ở đây chỉ chọn để hiển thị/quản lý, không áp dụng hàng loạt vào case.

Mỗi mục có icon thùng rác xuất hiện khi hover hoặc focus, vẫn dùng được trên cảm ứng. Xóa mở xác nhận; Hủy không gửi API. Xác nhận chỉ ẩn khỏi lựa chọn mới. Mục đã dùng vẫn đọc được trong kết quả/lịch sử và được đánh dấu “đã xóa” khi cần.

### File và người phụ trách

- Tên người phụ trách vẫn hiển thị; icon người dùng mở dropdown nhiều lựa chọn, tìm thành viên ở đầu danh sách, giữ nút Lưu và xử lý conflict hiện tại.
- Icon thùng rác thay nút “Xóa khỏi danh sách”. Popup nêu tên file và giải thích ẩn khỏi danh sách, có thể khôi phục. Không xóa dữ liệu case/Issue hoặc coi nghĩa vụ Ticket là kết thúc.
- Danh sách file đã ẩn giữ hành động khôi phục, có nhãn hỗ trợ truy cập. Quyền hiện hữu vẫn áp dụng.
- Mọi icon có tooltip và tên truy cập; trạng thái đang lưu ngăn gửi lặp.

### Quy tắc dropdown xuyên giao diện

Rà soát toàn bộ dropdown ứng dụng để thống nhất mũi tên mở/đóng và vị trí ô tìm/thêm nếu có, không chỉ hai dropdown mới. Danh sách dài dùng tìm kiếm ở trên; bộ lọc ít lựa chọn không cần ô tìm. Chỉ danh mục được phép tạo mới mới có nút Thêm; không thêm quyền tạo user/Status từ một ô chọn.

Dùng thành phần chọn dùng chung có trạng thái mở rõ ràng thay vì suy đoán trạng thái popup của native select. Áp dụng theo từng nhóm, giữ nguyên giá trị, callback, validation và quyền của từng màn. Hỗ trợ bàn phím, Escape, click ngoài, focus trở lại trigger, nhãn và trạng thái chọn. Menu không bị cắt bởi bảng cuộn; phạm vi này không đổi quy tắc Issue preview luôn ở bên phải.

## 4. MT & Ver trên bảng case

### Bổ sung từ ảnh lỗi Status

Ưu tiên sửa khoảng trống bất thường giữa ô Status và nút Lịch sử Status trong cùng cụm. Hai nút căn cùng trục, Status vuông 72 × 72 CSS px, nút lịch sử rộng 72 px; khoảng cách giữa hai nút cố định 6 px, không giãn theo chiều cao dòng nội dung. Không ép mọi dòng case thấp xuống hoặc cắt nội dung dài để che khoảng trống. Màu nền phủ toàn ô theo Status, Unexecuted xám bạc, chữ không bị cắt. Kiểm tra computed layout thực tế trước khi kết luận nguyên nhân; ảnh nhỏ chưa đủ chứng minh quy tắc CSS nào gây lỗi.

### Thông tin thực thi

Cột **Version test** đổi thành **MT & Ver**, vẫn chỉ một cột. Bên trong có hai dropdown nhỏ được gắn nhãn **Môi trường** và **Version**, cùng thông tin ngày thực hiện đã có. Không bổ sung hai cột Excel mới.

- Chọn môi trường hoặc version lưu ngay cho đúng case, không thay trường còn lại, Status, người test ban đầu hoặc ngày thực hiện đã lưu.
- Case chưa test vẫn chọn được thông tin; không được tính là đã test hay gán người test chỉ vì chọn dropdown.
- Môi trường độc lập với version: có thể chọn khi chưa tạo version. Dữ liệu cũ thiếu môi trường được hiển thị “Chưa ghi môi trường”, không tự đoán.
- Chọn lại cùng giá trị không tạo ghi lịch sử thừa. Đổi thông tin thực sự có audit riêng, người thực hiện và thời điểm.
- Khi đổi Status, snapshot ghi thông tin đang áp dụng và ngày thực hiện; Status vẫn theo thao tác chủ động của tester.
- Toolbar giữ Version/Ngày theo hành vi đã chốt; thêm lựa chọn Môi trường tùy chọn cùng nhóm gọn. Chọn trên toolbar chỉ chuẩn bị cho lần ghi Status tiếp theo, không sửa các hàng ngay. Không chọn môi trường toolbar thì giữ môi trường hiện tại của case; chọn rõ một môi trường toolbar thì lần ghi Status tiếp theo dùng lựa chọn đó. Version toolbar tiếp tục áp dụng khi ghi Status như hiện hành.
- Khi chỉ sửa thông tin của case chưa có ngày thực hiện, không tự gán ngày test. Ngày sẽ được ghi khi thực hiện test.
- Thành viên có quyền cập nhật case vẫn thao tác được khi không là người phụ trách file; Khách/chế độ lưu trữ vẫn chỉ đọc.

## 5. Lưu trữ, API và đồng thời

Danh mục môi trường thuộc Feature, cùng cách phân quyền quản lý với version. Tên được trim, không rỗng, giới hạn 255 ký tự; dùng quy tắc so sánh/duy nhất nhất quán với version hiện tại. Môi trường có định danh ổn định, tác giả/ngày tạo và xóa mềm. Không sửa/đổi tên danh mục trong phạm vi này.

Tách **thông tin hiện tại của case** khỏi **snapshot của lần ghi kết quả**:

- Bản ghi thông tin hiện tại theo project/document/row, chứa environment ID và version ID nullable, lock version, người/thời điểm cập nhật. Không chứa Status riêng.
- Snapshot lần ghi Status chứa môi trường/version/ngày của lần đó; bổ sung environment nullable, cho phép version nullable để hỗ trợ chỉ có môi trường. Snapshot cũ không bị cập nhật khi người dùng đổi dropdown.
- Audit cập nhật thông tin ghi giá trị trước/sau với loại sự kiện riêng. Lịch sử hiện rõ “Đổi môi trường/version”, không giả thành “OK → OK”. Lịch sử Status vẫn giữ đầy đủ người và thời điểm chuyển trạng thái thực tế.
- Lịch sử hiển thị được tên danh mục đã xóa mềm; không join lọc mất bản ghi cũ.

API danh mục môi trường có list/create/soft-delete theo scope project/Feature, tương ứng version. API cập nhật thông tin case riêng, nhận trường thay đổi và expected context version + request key. Không cho endpoint này thay Status. Trường bỏ qua giữ nguyên; client không gửi null để vô tình xóa trường khác.

Luồng đổi Status dùng cùng dữ liệu thông tin hiện tại, khóa và kiểm tra phiên bản trong transaction; client gửi expected context version khi có lựa chọn context. Hai người cập nhật đồng thời phải nhận conflict rõ ràng, không ghi đè âm thầm. Sử dụng thứ tự khóa thống nhất giữa cập nhật thông tin, kết quả và xóa danh mục. Request key lặp với cùng payload trả kết quả trước, payload khác bị từ chối.

Backend xác minh Feature/document/row và lựa chọn đều cùng project/Feature; kiểm tra quyền và lưu trữ. Mục đã xóa không được chọn mới; mục đang gắn với case được giữ khi chỉ đổi trường khác hoặc ghi Status, không ép người dùng sửa bằng chứng cũ. Không phát sinh quyền mới từ điều khiển giao diện.

## 6. Migration và giữ dữ liệu

Thêm migration Flyway mới sau phiên bản cao nhất lúc triển khai (source hiện có V41); không chỉnh checksum migration cũ. Tạo danh mục và context hiện tại; bổ sung environment cho execution snapshot và các ràng buộc project/Feature/row.

Backfill version hiện tại theo đúng execution khớp `import_rows.result_version`, tương ứng cách web đang đọc; không lấy một bản ghi lịch sử cũ để gán vào kết quả mới hơn. Case không có execution giữ version trống. Môi trường mới để trống. Không chuyển tự động chuỗi `testing_features.environment` thành danh mục, không thay nội dung môi trường của Issue hiện có.

Giữ Status, ngày thực hiện cũ, người test ban đầu, phân công, lịch sử, tài khoản, số case và file gốc. Migration và test ghi dữ liệu chạy trên database cô lập. Cutover runtime chỉ sau kiểm chứng và backup theo quy trình dự án; chưa thực hiện ở giai đoạn thiết kế này.

## 7. Issue, Excel và các nơi đọc dữ liệu

Tạo Issue từ case lấy môi trường hiện tại làm gợi ý ban đầu và version hiện tại theo context case. Người tạo vẫn sửa môi trường và thiết bị theo bằng chứng thực tế. Không tự gán môi trường thành thiết bị. Lưu Issue giữ snapshot/bằng chứng đã xác nhận; đổi dropdown case sau đó không sửa ngược Issue. Phần mô tả Feature hiện tại trong Issue vẫn cập nhật như yêu cầu đã chốt trước đây.

Xuất Excel giữ đúng 13 cột: chín trường nội dung + **MT & Ver**, Status, Issue, Người test. Ô MT & Ver ghi môi trường, version và ngày thực hiện bằng các dòng có nhãn, bỏ dòng chưa có dữ liệu. Status, Issue và người test lấy dữ liệu hiện tại đúng scope; tải file gốc vẫn nguyên byte.

Import giữ đúng chín trường đã duyệt, không đọc cột MT & Ver hay dữ liệu thực thi từ Excel. Rà soát chi tiết case, tìm kiếm/nhãn cột, lịch sử, API trả kết quả, cache sau lưu và các đường xuất để không còn phụ thuộc sai vào nhãn “Version test” dùng làm định danh cột.

## 8. Xử lý lỗi và tiêu chí nghiệm thu

Dropdown có loading, empty, tìm không thấy, lỗi tải/thêm/xóa và thử lại. Không đóng mất nháp khi lỗi. Xác nhận xóa giữ nguyên trạng thái khi Hủy; tránh gửi kép. Conflict giữ giá trị nháp để người dùng biết thao tác nào chưa lưu, tải dữ liệu mới trước khi gửi lại.

Kiểm chứng cần có trước khi đánh dấu hoàn tất:

1. Test thất bại tái hiện đổi version đang đi qua Status; sửa để context-only giữ Status, tiến độ, ngày và người test.
2. Hai dropdown độc lập, môi trường không cần version; dữ liệu cũ và mục đã xóa đọc được.
3. Context snapshot của lần test không bị đổi ngược; lịch sử phân biệt thao tác; đồng thời và retry không mất dữ liệu.
4. Quyền quản lý danh mục, quyền cập nhật case, Khách, archive và phạm vi chéo project/Feature được enforce backend.
5. Xóa file/version/môi trường cần xác nhận; Hủy không gọi API; xóa mềm giữ dữ liệu và khả năng khôi phục file.
6. Issue gợi ý đúng, cho sửa, không bị cập nhật ngược; export 13 cột, Unicode/ngày đúng; import chín trường và tải gốc không đổi.
7. Component tests cho thứ tự ô nhập/danh sách, tìm/thêm, icon, mũi tên, focus, bàn phím và menu trong bảng cuộn; hồi quy các dropdown đã chuyển. Kiểm tra browser Status 72 × 72, lịch sử rộng 72, gap 6 px trên dòng ngắn/dài và sau cuộn/resize; không suy layout từ jsdom.
8. MySQL native cô lập: fresh migration + upgrade từ V41; đối chiếu giữ dữ liệu, chạy lại không backfill lặp.
9. Build frontend/backend, diagnostics và coverage phạm vi thay đổi; báo số đo thực tế, không suy từ số test.
10. Nghiệm thu Chrome các màn Feature, case, Issue, dropdown khác đã sửa và file Excel tải xuống. Công cụ không kết nối thì ghi rõ phần chưa kiểm chứng, không báo đã đạt giao diện.

## 9. Ranh giới và bước tiếp theo

Không làm ma trận kết quả theo môi trường/version; không đổi workflow Ticket, quyền tài khoản, nội dung import chín cột, người test ban đầu hoặc rule Issue preview. Không bổ sung dashboard tiến độ theo môi trường trong yêu cầu này.

Tài liệu đã tự rà soát tính nhất quán, thiếu mục, bảo toàn dữ liệu và phạm vi. Chờ người dùng duyệt bản viết này; sau đó dùng writing-plans lập kế hoạch theo module và kiểm chứng cụ thể. Không commit/push hoặc chuyển runtime trong bước viết thiết kế.
