# Review lưu kết quả tài liệu, xuất Excel và kết nối chức năng

Nhánh `system-design`, ngày 04/10/2026. Phạm vi mở rộng S11 theo yêu cầu điều tra toàn bộ kết nối UI/API/database, ưu tiên lỗi xuất Excel. S11 vẫn IN_REVIEW; không coi rà soát code hoặc mock tests là nghiệm thu mọi luồng trên môi trường thật.

## Quyết định đã được người dùng chọn

Mỗi lần bấm iPad tự lưu kết quả **tài liệu** và người sửa/thời gian/lịch sử. Xuất Excel dùng bản cập nhật; tải file gốc giữ nguyên. Kết quả đợt/build, NG liên kết bug, NA do PM và retest vẫn quản lý riêng. Chu kỳ `Unexecuted → OK → P → NG → Fixed → NA → Unexecuted`, màu và thao tác không mở form dưới bảng được giữ.

## Phát hiện và sửa

| Phát hiện | Cách xử lý / bằng chứng |
| --- | --- |
| P1: ResultCycleButton chỉ thay state React; không có API ghi, export đọc dữ liệu nguồn | V13 bổ sung 5 cột vào import_rows; PUT có version, requestKey, transaction và audit. UI xếp hàng theo dòng, phục hồi/đối chiếu khi lỗi; export đọc trạng thái đã lưu |
| P1: UI trộn kết quả đợt được chọn với lựa chọn trong bộ nhớ, khác dữ liệu export | Grid và export dùng cùng kết quả tài liệu; history execution mở riêng. Không nới quyền execution để giải quyết lỗi tài liệu |
| P2: Danh sách tài liệu đếm sourceCounts nên không phản ánh kết quả web | Bổ sung resultCounts và cập nhật actor/time mới nhất; thư viện và tổng quan tài liệu hiển thị bản cập nhật |
| P2: Bấm milestone gửi tên; board bỏ qua query, API lọc theo ID | Overview trả id, điều hướng truyền id và board đưa vào query API. Test RED → GREEN |
| P2: Hạn phát hành luôn ghi “Chưa đặt” dù đã có due_on | Overview trả dueOn, UI định dạng ngày đã lưu. Test RED → GREEN |
| P2: Bộ lọc bình luận/thay đổi trạng thái trong tổng quan không có nguồn dữ liệu tương ứng | Nguồn hiện tại là 30 công việc mới nhất; nhãn thể hiện đúng và bỏ bộ lọc không được hỗ trợ trong màn active |
| P2: Manifest backup luôn ghi schemaVersion 11 | Native backup lấy version từ Flyway. VM test mock IO tái hiện 11≠13 trước sửa và PASS sau sửa. Legacy chưa đo trả null, không bịa version |
| Contract tài liệu chỉ có Markdown, thiếu OpenAPI | Bổ sung đủ 5 endpoint GET/PUT/export/history và DTO, liên kết main OpenAPI; structural checker đạt 109 operations |

Nội dung case đã có addRevision + currentCells overlay trước tác vụ này; không kết luận toàn bộ export luôn trả nguyên BLOB. Lỗi chính nằm ở trạng thái chưa được lưu. Các cột phụ, M/N không tiêu đề và người test nguồn chưa có thao tác chỉnh sửa vẫn giữ nguyên như quyết định import trước đó. Các lần bấm chỉ ở bộ nhớ trước V13 không có dữ liệu để phục hồi.

## Kiểm kê các luồng active

Đối chiếu AppRouter, modules/features, services/api và controller/service tương ứng; không dùng các trang prototype không còn trong route active để kết luận hệ thống đang ghi dữ liệu giả.

| Nhóm | Kết nối hiện có | Mức kiểm chứng trong đợt này |
| --- | --- | --- |
| Đăng nhập/session/CSRF/tài khoản | auth + identity API; DB user/session/throttle; quyền tạo ADMIN/PM được cấp riêng | Login native, CSRF 403; FE regression và BE security tests; không tạo/đổi quyền tài khoản thật |
| Tổng quan / bảng / danh sách / công việc | workItems API, work_items và history/comments; filter/save/edit | Sửa milestone ID/deadline, loại bộ lọc giả; FE tests; không thực hiện mọi chuyển trạng thái bug thật |
| Thư viện / import / revision / duyệt | testCases API, import_batches/import_rows/cases/revisions | Parser/export unit tests; preview/commit integration đã có nhưng chưa chạy lại trên schema riêng |
| Kết quả tài liệu / Excel / lịch sử | API mới + import_rows/project_audit | Browser native bấm đủ vòng, reload, download Excel, lịch sử và kiểm tra mã hash nguồn; API negative/replay smoke |
| Đợt / phân công / kết quả / chứng cứ | execution API + run items/attempts; evidence API có membership | FE regression; trace code, không chạy test tạo/xóa execution trên tms |
| Bug / retest / đóng lỗi | workItems/retest API; bug state/coverage/verification/closure | FE regression, rule tests; giữ điều kiện PM/retest; chưa nghiệm thu mọi vòng đời ngoài demo |
| Tiến độ / báo cáo Excel | reporting API đọc dữ liệu execution theo filter | FE regression + reporting limit tests; không trộn resultCounts tài liệu vào metric execution |
| Cài đặt / catalog / thành viên / rules / handbook | API writes thật, version/audit | FE regression + catalog/rule/timezone tests; không sửa hàng loạt cấu hình đang dùng |
| Redmine | API/outbox/client/scheduler, phụ thuộc cấu hình máy chủ | Client/config/scheduler tests; không gửi ticket tới Redmine khách, kết nối thật còn gate môi trường |

## Kiểm chứng

- Frontend: **290/290 tests, 36 files PASS**; build PASS. Thay đổi dòng thời gian header được kiểm tra cùng nhóm tài liệu.
- Coverage đo cho ba file TestDocumentPage/useDocumentResults/DocumentResultHistory: **93.18% statements, 84.73% branches, 88.69% functions, 97.56% lines**. Không phải coverage toàn hệ thống; ResultCycleButton không nằm trong báo cáo coverage cuối dù có tests PASS.
- Backend: **82/82 tests, 17 classes PASS**, Maven verify/package PASS; sau chỉnh SQL deadline kiểm tra lại WorkItemHistoryTest 3/3 và package PASS. Bộ này không chạy Testcontainers hay native integration ghi dữ liệu.
- Native: backup `var/mysql-native/backups/2026-10-04T14-52-28-035Z-tms.sql`; Flyway V13 success, vẫn **56 bảng**, không sửa V1–V12. Manifest backup cũ ghi 11 là lỗi metadata đã sửa trong script; trạng thái trước migration thực tế là V12.
- Chrome project4/document5 `Demo-khoi-phuc-test-case.xlsx`: Unexecuted→OK→P→NG, reload giữ NG, file tải bằng nút Xuất Excel có **J2=NG**; nút Tải file gốc có J2 trống, SHA-256 khớp source_workbook. Sau đó Fixed→NA→Unexecuted để trả trạng thái demo về ban đầu; lịch sử lưu đầy đủ.
- Native API: replay không tăng version/lịch sử; stale version **409**, enum sai **422**, thiếu CSRF **403**, project/row lệch **404**; hash file gốc khớp. Overview native trả milestone id/dueOn. FE tests xác nhận các click tài liệu không gọi API ghi execution.
- Test frontend kiểm tra bấm nhanh, version tuần tự, khóa export đang lưu, lỗi/rollback/reload, không thêm form/hàng phụ, lọc từng dòng; history retry và phân trang.
- Đã bổ sung integration test thật cho persist/reload/export/original/history/isolation nhưng **chưa chạy**: migrator bị từ chối tạo `tms_docstest_202610030001`. Không trỏ suite đó vào tms; không tạo Docker thay thế.
- Ảnh: `output/playwright/document-result-history.png`. File tải demo ở Downloads chỉ là bằng chứng local, không commit.

## Skill và review độ phức tạp

Đã đọc và áp dụng brainstorming (chốt ý nghĩa kết quả), api-design/api-and-interface-design (contract/version/CSRF/lỗi), backend-patterns (transaction/authorization), ponytail (reuse và giới hạn phạm vi), ponytail-review (độ phức tạp), cùng TDD/verification. prompt-master đã đọc nhưng dành cho viết prompt, không dùng để tự đổi nghiệp vụ.

Không thêm thư viện, không thêm bảng result/history riêng; dùng import_rows và project_audit hiện có. Chỉ tách hook hàng đợi và dialog lịch sử để tránh phình thêm grid. Không gỡ validation hoặc lịch sử chỉ để giảm dòng code. OpenAPI tăng do trước đó chưa mô tả các endpoint tài liệu; không phải tầng runtime mới. Không có refactor phức tạp bổ sung cần triển khai trong phạm vi này.

## Giới hạn còn lại

Full native integration trên schema riêng, đồng thời nhiều client ở mức tải thực, UAT khách/Redmine và pilot vẫn chưa được nghiệm thu. Kiểm chứng lần này không phải cam kết mọi chức năng không còn lỗi. S11 giữ IN_REVIEW; không commit/push/merge trong tác vụ này.
