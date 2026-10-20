# Review độc lập nội dung báo cáo TMS đã ghép

Ngày 19/10/2026. Phạm vi: đọc toàn bộ `working/assembled-report.md`, đối chiếu prompt gốc, bản Word đã khôi phục/crosswalk, backend-review, frontend-evidence-review và các nhận xét sơ đồ đã kiểm lại. Kiểm chọn lọc builder để truy nguyên số hình và caption; không sửa nội dung báo cáo hay sản phẩm. Không render Word, không chạy test/runtime/DB. Các finding dưới đây đánh giá nội dung và truy vết, không phải layout.

## Kết luận vòng review

Nội dung cốt lõi đủ để tiếp tục hoàn thiện bản báo cáo TMS: giữ ba chương; phân biệt yêu cầu/source/test/runtime; 12 User Story, 37 AC và 11 Use Case có phạm vi, actor, tiền/hậu điều kiện và ngoại lệ. Không phát hiện claim mới đáng kể về pháp nhân, khảo sát hoặc thành tích không có nguồn. Còn ba điểm truy vết và trạng thái chứng cứ cần xử lý trước khi coi hồ sơ nội dung hoàn tất. Chưa phê duyệt chất lượng trang Word.

## Finding cần xử lý

| ID | Mức | Bằng chứng tại thời điểm đọc | Nhận xét và sửa đề nghị |
| --- | --- | --- | --- |
| FC-01 | Quan trọng | `assembled-report.md:802` Phụ lục A chỉ có 12 dòng mapping gộp; `word-heading-crosswalk.json` W-B0513 và W-B0581 vẫn mang đích biên tập dự kiến | Crosswalk 291 mục giữ được dấu vết gốc, nhưng chưa đồng bộ với cấu trúc đã viết. Ví dụ W-B0513 trỏ 3.2.2 Use Case trong khi 3.2.2 bản cuối là Phân rã chức năng; Use Case tổng quát là 3.2.3. W-B0581 trỏ 3.2.3 đặc tả trong khi đặc tả ở 3.2.4. Cần thêm `finalTarget`/trạng thái xử lý cho mọi mục, giữ nguyên đích dự kiến nếu cần lịch sử. Với mục du học không có tương đương, ghi rõ đã bỏ nội dung miền cũ và chuyển vai trò mục nào; không gán tương đương chức năng giả. Bản đối chiếu bàn giao phải dẫn tới crosswalk cuối hoặc chứa bảng đầy đủ. Không bắt buộc nhồi 291 dòng vào phần chính Word. |
| FC-02 | Quan trọng | `compose_report.py:146` chỉ thay số theo mẫu `Hình (\d+)`; `assembled-report.md:806–817` cột Sơ đồ vẫn số cũ | Sau khi đánh số hình theo lần xuất hiện, số trong Phụ lục A phải thay cùng. Ví dụ dòng bối cảnh đang chỉ sơ đồ 1 nhưng ngữ cảnh là Hình 2; công nghệ đang chỉ 2 nhưng kiến trúc là Hình 5. Cột số rời không được regex đang dùng cập nhật. Dùng ID nguồn hình làm khóa và resolve cùng `figure_numbers` khi ghép bảng; kiểm danh mục hình, caption, đoạn giải thích và ma trận bằng cùng manifest. |
| FC-03 | Trung bình | `assembled-report.md:606` trình bày receipt main-after-proof 7.374 hàng/74 bảng/711 case; `:723` vẫn nói receipt DB/runtime “phải được reviewer backend kiểm riêng” | Trạng thái chứng cứ chưa nhất quán: một đoạn trình bày receipt đã được đối chiếu, đoạn khác giữ lời bàn giao reviewer chưa làm. Nếu root đã đọc receipt, thay dòng 723 bằng đường dẫn receipt trực tiếp, nội dung/điểm thời gian đã kiểm và giới hạn không kiểm runtime mới. Nếu chưa đọc thì hạ claim ở 606 thành báo cáo lịch sử chưa đối chiếu receipt. Không đổi số chỉ dựa STATUS. |

Các số dòng trên là vị trí ở bản đã đọc trước khi root hoàn tất các chỉnh sửa; dùng tên mục và ID finding khi dòng dịch chuyển. Root đã thông báo đang sửa endpoint chuyển trạng thái Issue từ POST transition sang PUT status, khoảng cách chữ trong bảng skill và thứ tự hình; review không mở lại các chỉnh sửa đã có chủ sở hữu.

## Phần đã phù hợp

- Bìa và đơn vị: lời nói đầu, 1.1.1 và kết luận nói rõ chưa có thông tin tác giả/giảng viên/pháp nhân để điền. Spider Plus/SHIFT/SYP được xác định là bối cảnh một dự án, không bị biến thành sơ đồ pháp nhân hay dữ kiện mọi dự án. Không giữ tên Nguyễn Thị Huyền hoặc Enlightening làm tác giả/đơn vị TMS.
- Khảo sát và kết quả: không sao chép lịch khảo sát 15/06–30/08/2026, số học sinh/du học sinh, thành tích triển khai hay kết quả phỏng vấn từ mẫu. KPI/SLA/hiệu quả định lượng và UAT được phân biệt với mục tiêu và bằng chứng kỹ thuật. Kết luận không tự đánh S11/FR-12 DONE.
- Nghiệp vụ: Feature là đợt; file/case độc lập giữa Feature; phân công không là bằng chứng đã thực hiện; đổi người không tạo run/reset; P/NA tính đã test; Issue chỉ Bug/QA; Monkey Bug có thể không case; retest bên ngoài. Báo cáo văn bản tách dữ liệu nguồn. ADMIN không có bypass đọc hội thoại riêng. Quyền AI liên dự án của PM không mở CRUD/report ngoài dự án.
- AI: bounded context, ngưỡng aggregate và giới hạn semantic được trình bày như implementation kỹ thuật; không tạo competence score hoặc giả lịch sử từ assignee. Metadata/provider readiness không được coi là live proof.
- Kiến trúc/dữ liệu: React JavaScript–Spring Boot–MySQL/Flyway thay stack du học; monolith theo package, phối hợp JPA/JdbcTemplate; source migrations khác runtime DB. Graph legacy giữ lịch sử nhưng không được đưa thành workflow ghi mới.
- Sơ đồ: manifest Hình nguồn 04 đã mô tả TESTER chỉ tự nhận; Hình nguồn 06 có caption nhánh ghi Status thành công; Hình nguồn 09 là vòng UI, không ép cạnh backend; Hình nguồn 08 đã thu hẹp Issue/Note/report, chat vẫn có từ điển dữ liệu. Không gọi swimlane tự vẽ là BPMN chuẩn hoặc kiến trúc logic là deployment production. Reviewer sơ đồ FE/BE đã ghi kết quả xem lại PNG; lượt này không tự nâng mức xác nhận lên layout Word.
- Use Case/AC: AC nêu lưu thành công và lỗi version/mạng, phạm vi self và cùng PM nhận cả lô; actor DEV không được gán quyền ghi Status; AI không tự thực hiện lệnh. Mỗi UC liên kết User Story; AC được định danh trong phạm vi Story. Không coi AC được viết là test PASS.

## Góp ý không chặn nội dung

1. Phần 3.5.3 nên bổ sung một đoạn ngắn về các assertion backend đã đọc trong AssignmentPlanTest, ManagementReportServiceTest và FeatureProgressContractTest, với nhãn rõ “test code đã đọc, không chạy mới”. Điều này giúp người đọc thấy evidence backend cụ thể thay vì chỉ có receipt frontend và cutover. Không thêm số PASS backend khi chưa mở report tương ứng.
2. Các phát hiện BE-R/FE-O đã trình bày rõ nguồn và giới hạn. Có thể giữ trong phụ lục thay vì phần chính nếu cần giảm mật độ báo cáo, miễn phần hạn chế vẫn nêu những tác động nghiệp vụ đáng kể và giữ liên kết truy vết.
3. Danh mục nguồn dùng đường dẫn source rút gọn có chú giải base path. Bản đối chiếu bàn giao nên có link tới inventory/backend/frontend review để độc giả tìm được tệp và mức đọc, không chỉ ghi chung “hồ sơ kèm theo”.

## Điều kiện đóng review

- FC-01: mọi entry crosswalk có đích cuối hợp lệ hoặc trạng thái không có tương đương kèm lý do; số mục cuối được đối chiếu với heading thực tế và bản đối chiếu bàn giao dẫn được tới dữ liệu này.
- FC-02: các số hình trong ma trận bằng đúng manifest theo appearance; không chỉ kiểm caption/đoạn văn.
- FC-03: trạng thái “đã đối chiếu receipt” hoặc “chưa đối chiếu” thống nhất ở 3.3.3, 3.5.3 và nguồn S11; giữ giới hạn runtime lịch sử.
- Sau sửa chỉ cần đọc lại các vùng thay đổi và kiểm cấu trúc liên kết; không cần chạy lại test sản phẩm hoặc mở rộng sang sửa ứng dụng. Gate render Word vẫn mở độc lập.

Skill áp dụng tiếp: documents cho nội dung/caption/phạm vi render; code-review cho finding có nguồn và đối chiếu yêu cầu. Không tạo subagent mới ở lượt này. File này là báo cáo reviewer, không phải chứng nhận bản Word cuối đã đạt.

## Kiểm lại có trọng tâm sau sửa

Đã đọc lại Phụ lục A, mục 3.3.3/3.5.3, hai tệp `Doi-chieu-tung-muc.json`/`.csv`, thứ tự FIG trong assembled và builder các danh mục đầu tài liệu. Đồng thời đã đọc trực tiếp `main-after-proof.json` và `main-runtime-final.json`; không gọi database/runtime.

| Finding | Kết quả kiểm lại | Bằng chứng |
| --- | --- | --- |
| FC-01 | Đã sửa phần chính; còn các đích nhỏ cần đồng bộ | JSON/CSV đều 291 entry; finalTarget và finalDisposition khớp toàn bộ, không mismatch. W-B0513 đúng 3.2.3 Use Case tổng quát, W-B0581 đúng 3.2.4 Đặc tả Use Case. Các đích chương/mục đều tồn tại; các đích kết hợp được hiểu theo từng tên mục. Bìa, mục lục, danh mục, từ viết tắt được builder tạo ngoài assembled. Tuy nhiên W-B0510/B0512 BFD nên trỏ 3.2.2 Phân rã chức năng thay vì 3.2.1 Ngữ cảnh. W-B0582/B0585 về xác thực/đăng nhập cần dẫn 3.4.1/3.4.3/3.4.5 vì bộ 11 UC ở 3.2.4 không có UC đăng nhập. Tệp hướng dẫn Doi-chieu-va-ban-giao.md được Phụ lục A nhắc nhưng chưa tồn tại tại lần kiểm này. |
| FC-02 | CLOSED | Thứ tự xuất hiện: workflow1, context2, modules3, Use Case4, architecture5, sequence6, Status7, data-core8, data-support9, navigation10. Mười hai dòng ma trận đã dùng đúng số theo manifest này, gồm các ví dụ sai ở vòng trước. |
| FC-03 | CLOSED | Dòng evidence đã nói đã đọc trực tiếp receipt, cùng giới hạn không kiểm runtime mới. Reviewer kiểm receipt: pre/post30/33, preservedTables74, oldRowsVerifiedIdentical7374, cloneCount10, cloneRowsVerified711, unfiledCasesRetained120, một MISSING_WORKBOOK; runtime receipt ngày 19/10/2026 02:09:27 UTC, health UP, startupErrors0. Nội dung 3.3.3/3.5.3/S11 thống nhất ở mức bằng chứng lịch sử. |

Các đích đã xử lý không có tương đương, ví dụ W-B0471 thanh toán và W-B0619 LMS, có finalDisposition rõ là loại nội dung miền du học, không phát triển thêm tính năng. Đây là cách xử lý phù hợp yêu cầu giữ dấu vết mẫu. Sau sửa các đích nhỏ và có tệp bàn giao thực tế, FC-01 có thể đóng bằng kiểm chọn lọc, không cần lặp toàn bộ review. Chất lượng trang Word vẫn chưa được xác nhận.


## Đóng FC-01 — kiểm tra của người tổng hợp sau review

Đã sửa W-B0510/W-B0512 sang 3.2.2 Phân rã chức năng; W-B0582/W-B0585 sang các mục 3.4.1/3.4.3/3.4.5 tương ứng UI, contract và xác thực. CSV/JSON đã được tạo lại từ finalizer. Doi-chieu-va-ban-giao.md đã tồn tại, mọi liên kết file trong đó được kiểm tra tồn tại. verify_delivery.py kiểm các điều kiện này và hash DOCX khớp receipt. FC-01 đóng ở mức nội dung/truy vết; không thay đổi gate NOT_VERIFIED của kiểm tra từng trang Word.
