# Version test theo Feature và từng case — 25/10/2026

## Xóa version bằng icon và xác nhận — hoàn tất

Quyết định người dùng: version đã dùng được ẩn khỏi danh sách chọn, giữ version trong kết quả và lịch sử cũ. Rê chuột/focus vào dòng hiện icon thùng rác; thiết bị không hỗ trợ hover luôn hiện icon. Bấm icon mở hộp xác nhận Xóa/Hủy, focus mặc định Hủy. Hủy/Escape không gửi lệnh; đang xóa khóa thao tác lặp/đóng. Lỗi giữ hộp xác nhận và version để thử lại; thành công bỏ dòng, xóa nhãn chọn nếu cần và báo thành công. Hộp xác nhận có CSS overlay riêng, không phụ thuộc selector `.testing-page`.

Backend DELETE trả204, PM/Admin quản lý Feature hoạt động; kiểm CSRF, scope và archived state. Migration mới V36 thêm deleted_at/by và unique tên đang hoạt động; không sửa V35. Lệnh xóa lặp không thêm audit. Không cho dùng ID đã xóa trong kết quả mới, nhưng replay kết quả cũ được giữ. Dropdown case vẫn hiện tên version cũ với “(đã xóa)” dưới dạng option disabled, không nhảy sang version khác. History/Excel giữ dữ liệu cũ. Có thể thêm lại cùng tên với ID mới.

| Skill đã dùng | Áp dụng | Bằng chứng |
| --- | --- | --- |
| tdd-workflow | Test hành vi trước sửa UI/API | 2 test UI thiếu icon RED; 2 native test DELETE trả404 RED; test dropdown case hiện nhầm version RED; tất cả GREEN sau sửa |
| frontend-patterns | Dropdown state, khóa thao tác, lỗi/retry, focus trap và trả focus | 45/45 test nhóm testing PASS; Hủy trả focus về icon trên Chrome |
| api-design | DELETE idempotent204, quản lý quyền/scope, soft delete và contract | 23/23 backend PASS, gồm9 native; tests giữ lịch sử/export/replay, từ chối version đã xóa/quyền/CSRF/sai Feature/Feature lưu trữ |
| verification-loop | Build, Java diagnostics, native DB và UI thực | Build PASS (cảnh báo chunk>500kB cũ); JDT331 nguồn,0errors/0warnings; contract structural PASS |

Chrome localhost Feature17: icon40×40, opacity0 mặc định và1 khi focus; hộp xác nhận fixed440px nằm trọn giữa viewport, hit-test không bị che, focus Hủy. Hủy giữ đủ4 version thật. Không xác nhận xóa dữ liệu người dùng trên main; nhánh xóa thành công kiểm chứng bằng frontend mock + API/MySQL test riêng. Công cụ screenshot đã timeout ở lượt trước; lần này kiểm vị trí bằng DOM/CSS, không tuyên bố kiểm ảnh.

Runtime local8080 đã nâng V35→V36, PID27052, health UP. Backup trước đổi: `var/mysql-native/backups/2026-10-25T11-35-18-001Z-tms.sql`. Fingerprint cột cũ trước/sau bằng nhau cho8bảng: users118, memberships144, Features17, import_rows1887, import_batches27, audit2264, versions4, execution metadata1. Không chạy V34 demo. Giữ cảnh báo Flyway về MySQL9.7 chưa được hãng kiểm chứng. Chưa đo coverage mới; không commit/push. Arena archive dự kiến chuyển V37 để tránh trùng version.

## UI mới nhất: dropdown danh sách và thêm ngay tại chỗ

Yêu cầu mới thay popup bằng dropdown gắn với nút trên màn Feature. Mở dropdown đọc danh sách hiện hành; rỗng hiển thị chữ xám “Chưa có version”, lỗi đọc có Thử lại và không giả làm danh sách trống. Bên dưới là ô “Nhập version mới” và nút Thêm nằm ngang. POST thành công đóng dropdown, nhãn nút thành tên vừa tạo; mở lại đọc danh sách mới và vẫn có ô thêm. Chọn một version đã có chỉ đổi nhãn cục bộ, không sửa kết quả case hoặc version trong các file.

Giữ nháp/requestKey khi thêm lỗi; khóa thao tác đóng/lựa chọn khi POST đang chờ; Esc/click ngoài/Tab ra ngoài đóng dropdown. Không portal/modal/nền che; giữ hai nút Version/Nhập Excel ngang nhau. Bỏ CSS popup không còn dùng.

Skill tdd-workflow: bốn test dropdown RED trước sửa, năm test component PASS sau; frontend-patterns: tải danh sách khi mở, hủy kết quả đọc stale khi đóng, phản hồi lỗi và quản lý focus; verification-loop: 42/42 test nhóm testing và build PASS (warning bundle cũ). Chưa đo coverage mới. Không đổi backend/migration, không commit/push.

Chrome Feature17: đọc được các version có sẵn (`3`, `2`, `android 1`); dropdown absolute, nằm trong viewport, cách đáy nút8px; ô nhập và Thêm cùng hàng/cách8px, hit-test xác nhận input không bị che. Chọn version cũ đổi nhãn/đóng dropdown; mở lại vẫn có ô thêm rỗng. Không POST version thử vào main. Nhánh empty và thêm mới/đóng/đổi nhãn/mở lại/retry được kiểm thử tự động bằng API mock; backend tạo version đã được native test ở phần trước.

## Điều chỉnh UI theo phản hồi tiếp theo

Màn Feature chỉ giữ nút **Thêm version test**, cạnh **Nhập Excel**. Đã bỏ khung mô tả/danh sách version dưới bảng; bấm nút mở popup nhập tên với Lưu/Hủy/Đóng. Popup dùng focus trap chung, Esc để đóng và trả focus về nút mở; khóa đóng khi đang lưu, giữ nháp và requestKey khi thử lại. Không tải danh sách version ở màn này; dropdown trong file vẫn tải và dùng version hiện hành. Không thay backend/database.

Skill frontend-patterns/tdd-workflow/verification-loop tiếp tục áp dụng: 3 test popup RED trước sửa; nhóm testing 40/40 PASS sau sửa, build PASS (cảnh báo bundle cũ). Chrome xác nhận màn Feature chỉ còn nút cạnh Nhập Excel, mở popup đúng tên, tự focus input, Save disabled khi rỗng; không ghi version thử vào main.

Theo phản hồi tiếp theo, Version test/Ngày thực hiện được đưa vào cùng hàng tiến độ và hai nút Phân công case/Lịch sử phân công. Màn hẹp cho xuống hàng, tránh ép các điều khiển tràn ngang. Giữ nguyên hành vi lưu version/ngày từng case; frontend40/40 và build kiểm tra lại đạt.

Tinh chỉnh tiếp: gom Version/ngày và hai nút phân công thành một nhóm căn phải; dropdown180px, ngày140px, cao40px trên desktop, gap8px và nhãn12px. Thiết bị cảm ứng giữ vùng bấm44px; màn hẹp xuống hàng. 10/10 test TestingDocumentPage và build PASS; chỉ đổi bố cục/kích thước, không backend/database.

Sửa tiếp hàng nút Feature: CSS flex trước đó chỉ áp dụng cho `.testing-document`, nên nhóm ở Feature bị xếp dọc. Đã thêm layout riêng cho nhóm nút ở tiêu đề Feature: hàng ngang, gap12px, canh đầu, nhãn không bẻ dòng; giữ padding/margin24px của header. Footer popup Lưu/Hủy cũng có flex/gap12px. Build PASS; thay đổi CSS không đổi chức năng.

Chrome đo DOM thực tế sau sửa: cả hai nút có cùng y230.70px, cùng chiều cao36px tại viewport hiện hành; khoảng cách ngang12px, `sameRow=true`. Không ghi dữ liệu main.

## Sửa popup rơi xuống cuối trang

Người dùng phát hiện lỗi sau chuyển sang portal. Nguyên nhân: `.testing-page .ex-modal` không khớp popup ở document.body; kiểm tra accessibility trước đó chỉ chứng minh có dialog, chưa chứng minh vị trí đúng. Chrome tái hiện trước sửa: overlay `position:static`, dialog x0/y806.4 và không nằm trọn viewport2048×972.

Đã dùng `.testing-version-overlay` riêng có fixed/inset0/z-index1000/flex căn giữa, đồng thời bổ sung style độc lập cho header/form/input để không phụ thuộc ancestor trang. Sau sửa đo Chrome: position fixed, dialog520×253.2 tại x761.33/y359.80; nằm trọn viewport, lớp nền bắt hit-test góc màn hình, input44px. Sai số tâm so với innerWidth khoảng2.67px do viewport/scrollbar/zoom, dialog căn giữa theo overlay. 3/3 test popup và build PASS; screenshot vẫn timeoutCDP5s, không có ảnh bằng chứng. Không thay backend/dữ liệu.

## Quyết định và phạm vi

Người dùng cho phép nhiều version trong ngày; gợi ý version được tạo gần nhất tính đến ngày thực hiện, mặc định ngày hiện tại theo Việt Nam. Version tạo ở màn file của Feature. Toolbar file chọn version/ngày cho lần đổi Status; chỉ case được ghi mới nhận metadata.

Bổ sung sau: cột Version test có dropdown cho từng case để sửa riêng version. Giữ nguyên Status và ngày đã lưu; nếu case chưa có ngày thì dùng ngày toolbar. Không cập nhật hàng loạt, không xóa ghi chú import cũ, không đổi phân công. Lần sửa được lưu lịch sử, chống mất cập nhật bằng expectedVersion. Version chỉ tạo, chưa có sửa/xóa.

Feature chưa có version vẫn giữ tương thích luồng ghi Status cũ và có thông báo cần tạo version. Khi đã cấu hình ít nhất một version, API bắt buộc gửi version/ngày. Dữ liệu cũ không được gán version giả.

## Thay đổi

- Flyway V35: bảng feature_test_versions và test_document_result_executions; bổ sung FK theo project/Feature/document/row và liên kết audit. Không sửa migration cũ hoặc raw notes.
- API tạo/đọc version; metadata gắn với result_version của row; lịch sử và xuất Excel nhất quán.
- React: quản lý version ở Feature; gợi ý theo ngày; dropdown từng case; phản hồi lỗi, khóa ghi khi chưa xác nhận, giữ version đã lưu nếu request lỗi. Ghi chú import cũ vẫn mở xem được.
- Không thực hiện Arena; số migration archive Arena dự kiến chuyển thành V36 vì V35 đã dùng.

## Skill → mục đích → bằng chứng

| Skill | Áp dụng | Bằng chứng |
| --- | --- | --- |
| brainstorming | Chốt nhiều version/ngày, gợi ý gần nhất và cập nhật theo từng case | Các trả lời xác nhận của người dùng; quy tắc phía trên |
| tdd-workflow | Viết test thất bại trước implementation | FE thiếu label/dropdown; native endpoint trả 404 trước khi thêm API |
| frontend-patterns | State cục bộ, cập nhật sau server xác nhận, serial queue, cleanup | TestingDocumentPage, FeatureTestVersions, useDocumentResults và test retry/conflict |
| verification-loop | Native DB cô lập, hồi quy frontend, build, JDT, contract và Chrome | Kết quả bên dưới |

## Kiểm chứng hoàn tất trong phạm vi

- Frontend: 246/246 test ở 35 file liên quan PASS; sau thêm test lỗi sửa version, 12/12 test hai component chính PASS.
- Frontend build PASS; cảnh báo bundle >500 kB có sẵn.
- Backend: 21/21 PASS, gồm 4 TestVersionsNativeTest, 3 FeatureIssueContextNativeTest, 8 DocumentResultServiceTest và 6 DocumentWorkbookTest. 7 native chạy trên schema riêng, transaction rollback. Các lần RED/compile/mock lỗi đã sửa; lần verify/package cuối PASS.
- Eclipse/JDT: 331 source, 0 error/0 warning. Sau lần test backend cuối chỉ bọc thêm null-contract trong assertion unit test; không đổi code sản phẩm.
- Contract structural PASS; coverage của thay đổi này chưa đo.
- Main: backup trước nâng cấp `var/mysql-native/backups/2026-10-25T11-03-00-656Z-tms.sql`. V35 áp dụng thành công; backend8080 PID27964 chạy artifact đầy đủ đã verify, health UP.
- Main có V20/V22 demo cũ. Thử core-only dừng ở validation (chưa migration); lần áp dụng dùng artifact tạm chỉ loại class seed V34, giữ hash mọi file khác; sau V35 đã khởi động lại bằng artifact đầy đủ. `.env.mysql.local` (ignored, không đưa secrets lên Git) giữ core+demo và `spring.flyway.ignore-migration-patterns=*:ignored`, out-of-order=false, để bỏ seed V34 thấp hơn schema hiện tại khi khởi động lại. Không sửa checksum/historical migration, không repair/xóa lịch sử.
- Dữ liệu trước/sau cùng SHA-256: 118 identity_users, 144 project_memberships, 17 testing_features, 1.887 import_rows, 27 import_batches, 2.263 project_audit. Hai bảng mới chưa có dữ liệu main; không đưa fixture test vào main.
- Chrome127.0.0.1:5173 xác nhận Feature17/file27: toolbar Version test/Ngày thực hiện25/10; cột Version test/dropdown mỗi case; ghi chú cũ có disclosure; Feature có form tên version, Save disabled khi rỗng, focus đúng. Không submit ghi dữ liệu main. Screenshot CDP timeout5s; chưa xác nhận ảnh chụp/responsive của thay đổi, không tuyên bố UAT đầy đủ.
- Chưa chạy lại toàn bộ test của hệ thống hoặc đo coverage mới; đã kiểm tra nhóm bị ảnh hưởng. Fresh core+demoV34→V35 trên máy khác chưa chạy trong đợt này; native/core upgrade và main giữ dữ liệu đã kiểm chứng.
- Không commit/push. S11/FR-12 giữ IN_REVIEW.
