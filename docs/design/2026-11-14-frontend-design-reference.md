# Hai mẫu giao diện cần giữ từ feature/Fontend-design

Ngày ghi nhận: 14/11/2026. Phạm vi: đọc source, đối chiếu hai ảnh người dùng cung cấp và lưu tham chiếu để cải tiến `system-design` ở lượt triển khai sau.

## 1. Nguồn và quyết định của người dùng

- Nhánh mẫu: `feature/Fontend-design`, commit `bd7e482fef262e4361862e3d8f5d9853004cba3e` (`feat: integrate work item screens and sidebar navigation`).
- Nhánh đích tại lúc đối chiếu: `system-design`, commit `daab8feabd851d1002eded24ae13303efbbca710`.
- Hai mẫu được người dùng chọn: **bảng test case kiểu spreadsheet** và **Chi tiết công việc**. Đây là hướng thiết kế ưu tiên cho các màn tương ứng khi chuyển sang nhánh đích.
- Đã hoàn tất ghi nhận tham chiếu; **chưa triển khai thay đổi giao diện** trong lượt này. Không merge/cherry-pick nhánh mẫu, không thay API, dữ liệu hoặc quyền.
- Hai ảnh nằm trong hội thoại ngày 14/11; chưa xuất thành file ảnh trong repository. Các số đo dưới đây lấy từ source, không phải phép đo pixel của ảnh hay kết quả kiểm tra trình duyệt.

**Điểm cốt lõi cần nhớ:** bảng thực thi cần gọn, rộng, rõ ô và dễ thao tác; trang đọc chi tiết cần có phân cấp chữ và khoảng trắng thoáng giữa từng mục. Không áp dụng một mật độ duy nhất cho cả hai.

## 2. Mẫu A — Bảng test case kiểu spreadsheet

### Source tham chiếu ở commit bd7e482

| File | Vai trò |
| --- | --- |
| `Frontend/src/app/pages/TestRunnerGridPage.jsx` | Header riêng, toolbar, bảng, chọn/sửa ô, resize cột, nhóm trạng thái |
| `Frontend/src/app/layouts/MainLayout.jsx` | Route `/tests/:specId` bỏ shell chung để dành toàn chiều rộng cho bảng |
| `Frontend/src/app/routes/AppRouter.jsx` | Điều hướng đến runner mẫu |
| `Frontend/src/app/styles/global.css` | Font, màu, bảng, control nhỏ; được import từ `Frontend/src/main.jsx` |

### Thiết kế cần tái sử dụng

1. **Header một hàng gọn**: nút quay lại ở trái, nhãn định danh và tên file/spec kế tiếp; ngữ cảnh dự án/người dùng ở phải. Nền xanh đậm `#00382B`. Khi quay lại phải trở về đúng danh sách file của Feature và dự án đang mở.
2. **Bảng chiếm phần chính của màn hình**: không chèn các khối thống kê lớn hay menu cấp cha lặp lại phía trên. Mẫu dùng header riêng và không có sidebar toàn cục trong runner.
3. **Dòng ngữ cảnh mỏng**: tab thiết bị bên trái; thông tin case/cột đang chọn bên phải. Trạng thái chọn phải phản ánh đúng ô thực sự đang thao tác.
4. **Toolbar gọn, nhóm rõ**: định dạng ở trái, lọc/reset/trợ giúp ở phải. Các nút cùng chiều cao, có khoảng cách đều; không tạo các thẻ lớn bao quanh từng control.
5. **Lưới có đường kẻ mảnh**: nền trắng, đầu bảng xám rất nhạt, chữ nhiều dòng căn trên, nội dung dài xuống dòng trong cột. Độ rộng phân theo nội dung: ID hẹp, bước thực hiện/kết quả kỳ vọng rộng.
6. **Ô đang chọn nổi rõ**: viền teal 2px phía trong và nền nhẹ; không làm toàn bảng đậm màu. Source có kéo thay đổi chiều rộng cột và cuộn ngang.
7. **Nhóm trạng thái cân đối**: giá trị chính đặt giữa cột, các tác vụ liên quan nằm gọn phía dưới. Giữ nhãn chữ cùng màu trạng thái để người dùng không phải suy đoán bằng màu.
8. **Đường quay lại rõ** và nhóm thao tác nhất quán; ưu tiên không gian dữ liệu thay vì nhiều lớp banner.

### Số đo tham khảo, không phải yêu cầu sao chép cứng

| Thành phần | Source mẫu |
| --- | --- |
| Font | Inter, fallback font hệ điều hành; body 12px/1.4 |
| Control `.cat-input`, `.cat-select`, `.cat-btn` | Cao 28px, chữ 11px, góc 2px, viền `#D7DCDC` |
| Bảng | `table-fixed`, border collapse; chữ từng ô thường 10–11px |
| Cột ID / đối tượng / điều kiện / bước / kỳ vọng | 55 / 130 / 280 / 320 / 270 CSS px ban đầu |
| Cột iPad | 95px; ô trạng thái 56×48px, nhóm phụ cùng rộng 56px |
| Bề mặt / đường kẻ chung | `#FFFFFF`, `#FAFAFA`, `#D9DEDE`, `#E5E8E8` |
| Màu nhấn | `#20B7A6`; hover `#199C8D`; nền nhẹ `#EBF8F6` |

Khi triển khai phải cân theo font/token hiện hành và zoom của người dùng. Chữ 9–11px trong prototype không mặc nhiên trở thành chuẩn toàn hệ thống. Chưa xác nhận sticky header/frozen columns trong runner mẫu; không ghi các hành vi đó là đã kiểm chứng từ ảnh.

## 3. Mẫu B — Chi tiết công việc

### Source tham chiếu ở commit bd7e482

| File / component | Vai trò |
| --- | --- |
| `Frontend/src/app/features/work-items/IssueForm.jsx` → `IssueDetailPage` | Đúng bố cục phần chi tiết trong ảnh thứ hai |
| `Frontend/src/app/features/work-items/components.jsx` | Avatar, TypeBadge, StatusBadge, MarkdownView, Modal |
| `Frontend/src/app/features/work-items/work-items.css` | Khoảng trắng, phân cấp chữ, phần mô tả và bình luận |
| `Frontend/src/app/styles/work-board.css` | Override của màn dashboard, drawer và chế độ toàn trang |
| `Frontend/src/app/pages/WorkBoardPage.jsx` | Mở “Chi tiết công việc” và chuyển sang toàn trang |

`WorkBoardPage` import `work-items.css` rồi `work-board.css`; cần đọc cả hai để tránh lấy nhầm CSS nền làm kích thước cuối cùng.

### Thiết kế cần tái sử dụng

1. **Dòng nhận diện trên cùng**: nhãn loại ticket, mã ticket màu nhấn và nhãn trạng thái đặt cạnh nhau. Màu chỉ chiếm diện tích nhỏ ở badge.
2. **Tiêu đề riêng, in đậm và lớn hơn nội dung**: được xuống dòng, tách khỏi metadata và đường kẻ; không ghép mã, tên, trạng thái vào một dòng chữ cùng trọng lượng.
3. **Khung nội dung trắng, viền mảnh, bo góc nhẹ**: padding đủ thoáng. Avatar tròn + tên người tạo đậm + ngày tạo màu phụ ở đầu khung.
4. **Từng mục nội dung rõ ràng**: Mô tả vấn đề → Điều kiện tiên quyết (nếu có) → Các bước tái hiện → Kết quả thực tế → Kết quả mong đợi. Heading đậm, có đường phân cách nhạt phía dưới; nội dung cách heading; khoảng cách giữa các mục lớn hơn giữa các dòng.
5. **Dễ đọc văn bản dài**: giữ xuống dòng, bước đánh số, link và chữ tiếng Nhật; hạn chế bóng đổ/khung lồng nhiều tầng. Không ép dữ liệu đọc thành các ô input khi chưa bật sửa.
6. **Bình luận sau nội dung chính**: từng bình luận có avatar, tác giả, thời gian; phần soạn bình luận và thay đổi trạng thái/phân công phân nhóm rõ. Mẫu có hai cột trên màn rộng, một cột khi hẹp.
7. **Chi tiết có thể mở rộng**: source có drawer bên phải và nút “Mở trang chi tiết”; `?detail=full` ẩn bảng/list nền. Đây là khả năng của mẫu, chưa phải quyết định đổi toàn bộ navigation hiện tại.

### Số đo tham khảo

| Thành phần | Source mẫu |
| --- | --- |
| Dòng badge/mã/trạng thái | Gap 12px; margin trên 24px, dưới 12px |
| Tiêu đề | CSS nền 21px/600, margin dưới 20px; override dashboard 17px |
| Khung mô tả | Padding 24px 30px; viền 1px `#BBB`, góc 3px |
| Avatar người tạo / bình luận | 36px / 34px, hình tròn |
| Nội dung Markdown | 13px, line-height 1.8, wrap khi quá dài |
| Heading mục | 15px/600; margin 16px 0 8px; padding dưới 5px; viền `#DDD` |
| Form bình luận | Hai cột `minmax(0,1fr) 390px`, gap 24px; còn 285px phía phải ở breakpoint 1150px, một cột dưới 850px |
| Drawer | Rộng theo `min(780px,88vw)`, cao 100dvh; dưới 640px rộng 100% |

Khoảng trắng trong ảnh còn chịu ảnh hưởng của các dòng rỗng trong nội dung demo (`MarkdownView` chuyển dòng rỗng thành paragraph). Khi áp dụng, dùng margin/gap có chủ đích, không thêm dòng rỗng giả để tạo layout. Trật tự heading phải phù hợp cấu trúc trang thực tế.

## 4. Ánh xạ sang source đang chạy ở system-design

| Phần cần áp dụng sau | Điểm vào hiện hành | Yêu cầu giữ |
| --- | --- | --- |
| Bảng case trong Feature | `Frontend/src/app/features/testing/TestingDocumentPage.jsx` | `projectId/featureId/documentId`, tìm/lọc/phân trang, API lưu thực, quyền theo case |
| CSS bảng/toolbar | `Frontend/src/app/features/testing/testing.css`, `Frontend/src/app/features/test-cases/test-documents.css` | Scope selector trong màn tương ứng, tránh làm lệch toàn hệ thống |
| Version và ngày thực hiện | `TestingDocumentPage.jsx`, `FeatureTestVersions.jsx`, `TestingFeaturePage.jsx` trong `features/testing` | Dropdown đầu bảng + version từng case; chỉ case được ghi mới cập nhật; lịch sử của version ẩn vẫn giữ |
| Chi tiết Ticket Bug/QA | `Frontend/src/app/features/work-items/FeatureIssueDetail.jsx`, `feature-issues.css` | Dữ liệu thật, nguồn case, ngữ cảnh Feature hiện tại, bằng chứng version/ngày lúc phát hiện, lịch sử |
| Bình luận/trạng thái/người phụ trách | `Frontend/src/app/features/work-items/TicketActionComposer.jsx` | Transition/closure/assignment được server cho phép, xác nhận, giữ nháp và lỗi/retry |
| Điểm mở chi tiết | `FeatureIssuesPage.jsx`, `CaseIssueAction.jsx`, shared `components.jsx` | Quay lại/focus và ngữ cảnh route; giữ luồng mở từ Kanban/list/case |

**Không nhầm file:** `TestRunnerGridPage.jsx`, `TestDocumentPage.jsx` hoặc `IssueForm.jsx` vẫn có thể tồn tại trên nhánh đích nhưng không vì thế mà là màn nghiệp vụ đang dùng. `AppRouter.jsx` hiện dẫn bảng Feature vào `TestingDocumentPage`; `/tests/...` là đường đã nghỉ. `WorkItemDetail.jsx` thuộc luồng khác, không tự coi là đích thay thế Ticket Bug/QA.

## 5. Giới hạn khi đem thiết kế sang

- Giữ mô hình USER/Admin dự án/Khách/Admin tổng và kiểm tra quyền hiện hành; không khôi phục vai trò cũ từ prototype.
- Giữ workflow Ticket đã chốt và chín cột; nhãn “Sẵn sàng xử lý” trong ảnh mẫu không tự trở thành trạng thái mới. Quyết định còn mở về phân công Ticket trong `STATUS.json` không được giải quyết bằng suy đoán giao diện.
- Giữ bộ Status case đang dùng `UNEXECUTED/OK/NG/P/NA`; không thêm `Fix` chỉ vì runner mẫu có vòng chuyển đó. **Unexecuted tiếp tục xám bạc `#C0C0C0`**, dùng token hiện hành `--color-result-not-run`/`--color-result-not-run-text`.
- Source mẫu có tên công ty/dự án/người dùng viết cứng, dữ liệu demo, đổi trạng thái bằng local state và nút còn dùng `alert`/thông báo xem thử. Chỉ lấy bố cục; các thao tác trên nhánh đích phải dùng API, trạng thái lưu/lỗi và dữ liệu thật.
- Nút định dạng, đính kèm hoặc sửa trực tiếp chỉ xuất hiện khi có luồng lưu và quyền tương ứng. Không sao chép nút hình thức rồi báo thành công khi chưa lưu server.
- Không thay bộ dựng nội dung hiện hành bằng `MarkdownView` mẫu chỉ tách dòng; giữ xử lý nội dung/link an toàn. Không thay toàn bộ global CSS để làm hai màn giống mẫu.
- Dùng button có nhãn và focus bàn phím cho status/menu; resize phải có cách thao tác bàn phím. Source mẫu có `div` click nên không sao chép nguyên khả năng tương tác đó.

## 6. Trình tự sử dụng tài liệu khi triển khai

1. Đọc lại source nhánh đích và các quyết định mới hơn checkpoint trên; tách phần trình bày khỏi state/API hiện hành.
2. Áp dụng khung bảng rộng + header/toolbar gọn cho `TestingDocumentPage`; giữ version/ngày cùng phía với phân công và lịch sử phân công, đủ whitespace.
3. Áp dụng dòng nhận diện, tiêu đề, avatar và các section đọc cho `FeatureIssueDetail`; metadata nguồn/Feature không được mất khi đổi layout.
4. Bố trí lại composer/trạng thái/người phụ trách trong component hiện có, theo quyền/transition thực tế; kiểm tra drawer và chế độ mở rộng nếu triển khai.
5. Kiểm tra desktop, tablet, màn hẹp; tên file/tiêu đề dài, văn bản nhiều dòng, cuộn ngang, focus, menu không bị cắt. Kiểm tra loading/empty/error/retry/permission, bảo toàn nháp, version theo case, lịch sử, quay lại đúng nguồn.

Các bước này là hướng áp dụng tiếp theo, **chưa được đánh dấu đã thực hiện**.

## 7. Skill và bằng chứng của lượt ghi nhận

| Skill | Dùng cho việc gì | Kết quả |
| --- | --- | --- |
| `frontend-ui-engineering` (`C:/Users/admin/.codex/skills/frontend-ui-engineering/SKILL.md`) | Đọc thiết kế từ tham chiếu: hierarchy, mật độ, control, spacing, responsive; phân biệt mẫu trình bày và luồng sản phẩm | Hai mô tả thiết kế ở mục 2–3, bản đồ source mục 4 và giới hạn bảo toàn mục 5 |

- Đã đọc source ở commit nhánh mẫu bằng `git show`, đối chiếu route/component/style với `system-design` và hai ảnh người dùng cung cấp.
- Chỉ thay tài liệu trong lượt này. Không chạy build/test nghiệp vụ, không mở phiên Chrome kiểm thử mới; chưa đo contrast, responsive thực tế hoặc coverage.
- Việc “đã ghi nhận thiết kế” không có nghĩa các nút trên prototype đã được nghiệm thu hay giao diện đã được đưa sang nhánh đích.
