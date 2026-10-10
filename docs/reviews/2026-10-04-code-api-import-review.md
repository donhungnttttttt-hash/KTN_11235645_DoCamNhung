# Rà soát code, API và trải nghiệm nhập Excel — 04/10/2026

Nhánh làm việc: `system-design`. Người dùng yêu cầu rà soát, cải tiến và push. Tiếp nối hai đợt [review chức năng](2026-10-04-functionality-ui-review.md) và [review UI/UX](2026-10-04-ui-ux-audit.md); không thay sidebar, màn bảng test case hoặc quyền nghiệp vụ đã duyệt.

## Phát hiện đã sửa

| Mức | Vấn đề | Cách sửa và bằng chứng |
| --- | --- | --- |
| P1 | Parser từ chối mọi ô gộp, kể cả ô trình bày không làm thay đổi case. | Mẫu khách cho phép gộp ngang một dòng ngoài các cột ID/nội dung revision, chỉ sang cột không có tiêu đề và không chứa dữ liệu. Mẫu nội bộ vẫn không gộp ô. Vùng không hợp lệ báo địa chỉ Excel cụ thể. Có kiểm thử gộp ID/nội dung/header/nhiều dòng, che giá trị và che cột có tên. |
| P2 | JSON lỗi ở response 401 làm mất trạng thái HTTP và không phát sự kiện hết phiên. | Xử lý hết phiên theo status trước đọc body; giữ HTTP status/requestId khi body lỗi; JSON thành công nhưng sai định dạng báo INVALID_RESPONSE. Không tự gửi lại thao tác ghi. |
| P2 | Timeout tải file kết thúc ngay khi nhận header, chưa chờ body. | Await toàn bộ blob trong phạm vi timeout/cancel; kiểm thử body bị treo báo TIMEOUT. |
| P2 | Sai HTTP method, media type hoặc thiếu multipart part bị catch-all thành 500. | Trả 405 kèm Allow, 415 hoặc 400 theo contract ApiError; thông báo không chứa payload nội bộ. MockMvc kiểm chứng. |
| P2 | Đổi bước preview làm mất focus; khó tìm dòng lỗi giữa nhiều dòng; gửi file rỗng lên server. | Hai bước nhập rõ ràng; focus vào tiêu đề preview; lọc chỉ dòng lỗi; chặn file rỗng; vùng bảng cuộn riêng và truy cập bằng bàn phím. Giữ bản xem trước khi commit lỗi và khóa thao tác khi đang gửi. |
| P3 | Hướng dẫn dày đặc, tiêu đề cột bị xuống dòng giữa chữ. | Đưa quy tắc chi tiết vào disclosure, giữ hướng dẫn bắt buộc ở ngoài; header không ngắt chữ, bảng có chiều rộng tối thiểu và cuộn ngang trên mobile. |

## Phạm vi rà soát

- Đối chiếu router/sidebar, component/API và các luồng đã kiểm tra trong hai báo cáo trước: tổng quan, công việc, bug, test case/tài liệu, đợt kiểm thử, retest, báo cáo, cài đặt.
- Quét source FE/BE cho TODO/FIXME, HTML trực tiếp, alert, localStorage, wheel/preventDefault; xem xét API client chung và lifecycle hộp thoại. Không có kết luận rằng quét chuỗi chứng minh toàn bộ code an toàn.
- Đọc SecurityConfig/IdentityService: session/CSRF, thu hồi phiên, quyền tạo tài khoản ADMIN hoặc PM được cấp riêng; PM chỉ tạo TESTER. Đối chiếu kiểm tra membership/project, transaction/locking trong execution và luồng tài liệu. Không mở thêm quyền.
- Đối chiếu controller chứng cứ/báo cáo, tải xuống attachment/no-store, parser giới hạn archive/formula/macro/hyperlink và giữ nguồn. Không đưa nội dung workbook/credential vào log hay repository.
- Kiểm tra contract script: 104 operation S03–S10, schema refs/path parameters và liên kết tài liệu. Đây không thay thế kiểm tra HTTP/integration toàn bộ endpoint.

## Kiểm chứng

- RED→GREEN: parser ô gộp, 3 tình huống API client, handler HTTP và 2 hành vi preview; giữ regression hiện có.
- Frontend toàn bộ: **276/276 test, 33 file PASS**, build PASS. Không thêm dependency.
- Coverage toàn FE: statements 79,78%, branches 73,03%, functions 71,55%, lines 75,34%. Chưa đạt 80% toàn ứng dụng.
- Coverage ImportExcelDialog: 93,58% statements / 83,87% branches / 92,85% functions / 100% lines; API client: 94,23% / 93,10% / 100% / 100%.
- Backend: **76/76 test, 16 class PASS**, Maven verify/JAR PASS. Phạm vi không cần database: workbook/export, HTTP handler, cấu hình, session filter, rule, attachment content, reporting limit, Redmine client/scheduler/config và history. Không chạy lại bộ integration ghi/xóa dữ liệu.
- Eclipse Java diagnostics: **136 source, 0 error, 0 warning**. Maven/Mockito vẫn có thông báo runtime về dynamic agent, không phải lỗi source.
- JaCoCo CustomerWorkbook: 96/98 lines, 90/106 branches. TestCaseWorkbook: 72/75 lines, 58/80 branches. Coverage handler toàn class còn thấp do nhiều nhánh handler cũ chưa nằm trong suite này; không suy ra coverage toàn backend đạt 80%.
- Workbook khách `スケール`: parse/export/reparse **57 dòng** khớp source cells/type/style, 10 hyperlink, 19 style; kiểm tra lại 30 merged ranges được giữ. Các trường bắt buộc không thiếu. File nguồn/round-trip chỉ ở máy local, không commit.
- Khởi động lại backend bằng cấu hình native: MySQL3307/tms, health 200 UP, không migration mới vì không đổi schema.
- Browser thực: preview workbook trên dự án demo trả **57 hợp lệ / 0 lỗi**; focus vào tiêu đề mới. Mobile390×844: trang không tràn ngang (390/390), dialog374px, bảng cuộn riêng620px; PageDown cuộn vùng bảng, Escape đóng và trả focus về Nhập Excel. Chỉ tạo preview, chưa commit thêm case vào dự án demo.
- Sau tinh chỉnh header, focused 32/32 tests và build PASS; git diff --check, contract check, đối chiếu 518 file với 9 giá trị bí mật local (không có match) PASS.
- Ảnh local: `output/playwright/2026-10-04-import-preview-desktop.png`, `output/playwright/2026-10-04-import-preview-mobile.png` (ignore).

## Việc còn lại và giới hạn

- S11 giữ **IN_REVIEW**: fresh/upgrade/integration trên schema native độc lập, UAT PM/Tester, pilot và môi trường đích vẫn là gate chưa đóng.
- Ô gộp chứa nhiều case hoặc đè cột nghiệp vụ vẫn bị chặn có địa chỉ; không tự suy diễn dữ liệu. Đây là giới hạn có chủ đích, không phải hỗ trợ mọi workbook Excel.
- `TestCaseService` còn truy vấn revision/count theo từng case/nhóm ở một số đường đọc. Cần đo với dữ liệu lớn và kiểm thử schema độc lập trước đổi query; chưa có bằng chứng SLA bị vi phạm, chưa tuyên bố đã tối ưu toàn bộ backend.
- Không chứng nhận hệ thống hết mọi lỗi, coverage toàn hệ thống đạt chuẩn hoặc sẵn sàng production. Không merge/deploy.

## Skill áp dụng

Đọc các skill người dùng chỉ định: prompt-master, backend-patterns, api-and-interface-design, api-design, ui-ux-pro-max, ui-styling, ponytail; cùng ECC tdd-workflow và verification-loop. Áp dụng contract lỗi nhất quán, giữ transaction/quyền, phản hồi loading/error, focus/keyboard/responsive, tận dụng thư viện POI/helper hiện có. prompt-master không biến yêu cầu sửa code thành việc chỉ viết prompt. Không đổi stack, không thêm framework/cache/abstraction không cần thiết.
