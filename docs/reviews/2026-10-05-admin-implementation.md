# Triển khai khu quản trị hệ thống — 05/10/2026

Người dùng đã duyệt [thiết kế ADMIN](../planning/proposals/2026-10-05-admin-portal.md). Phạm vi A1–A4 trên `system-design`, giữ không gian PM/Tester và dữ liệu hiện tại. Không commit/push trong tác vụ này.

## Kết quả bàn giao

Code A1–A4 đã triển khai và được review độc lập. Review tổng thể phát hiện hai lỗi khi thao tác đồng thời; đã sửa và review lại đạt: quản lý thành viên/phiên bản dự án đọc trạng thái hiện hành, và lưu kết quả tài liệu kiểm tra quyền sau khi lấy khóa dự án. Các đoạn bên dưới giữ bằng chứng theo từng giai đoạn, bao gồm lỗi đã phát hiện và sửa.

Frontend toàn bộ 341/341 test PASS, build PASS. Backend build/package PASS; Eclipse kiểm tra 167 source có 0 lỗi, 0 cảnh báo. Kiểm thử tập trung cho bản sửa cuối: 34 PASS, 5 native SKIP; runner unit 4 PASS. Các test native đồng thời đã được nối vào lệnh chạy schema riêng. Coverage toàn ứng dụng chưa đo lại.

Hồi quy backend cuối: **133/133 PASS trong 30 suite được chọn**, 0 fail/error/skip, đối chiếu XML Surefire mới của đúng 30 suite bằng `scratch/admin-final-test-summary.cjs`. Bộ này gồm unit và MVC, không phải toàn bộ integration backend. Lệnh ghi log qua PowerShell trả mã 1 do stderr native bị ghi thành `NativeCommandError`; không coi mã wrapper là Maven PASS. Các báo cáo test mới đều hoàn tất và không còn failure; package đã PASS riêng. Lỗi fixture `DeveloperResultsTest` ở lượt trước đã được sửa để mô phỏng khóa dự án trước kiểm tra quyền.

MySQL native đã lên V16 sau backup. Preview với backend mới tải đúng dashboard, chi tiết dự án, kho, nhật ký và form báo cáo PM. Đã dừng riêng preview 18080/15173; các tiến trình người dùng 8080/5173 được giữ nguyên. Người dùng cần khởi động lại backend chính để nhận API mới; xem [hướng dẫn thao tác](../admin-guide.md).

Giới hạn còn lại: tài khoản MySQL hiện tại không tạo được schema test riêng (1044). Vì vậy chưa xác nhận fresh migration, mapping/giao dịch đồng thời và các luồng ghi qua integration trên schema riêng; không chạy fixture lên `tms`. Không suy từ unit test hoặc SQL EXPLAIN rằng các kiểm thử này đã PASS. S11 tiếp tục IN_REVIEW cho native/UAT/pilot, không đánh dấu toàn bộ roadmap DONE.

## Tiến độ

| Phần | Trạng thái | Bằng chứng |
| --- | --- | --- |
| A1: layout ADMIN, dashboard, đọc dự án | Code/review hoàn tất; integration riêng chưa chạy | BE7 PASS; FE18 focused PASS/build; fix routing23 PASS; native integration3 SKIPPED |
| A2: quản lý user/dự án và DEV | Code/review hoàn tất; native integration riêng chưa chạy | FE141 PASS; follow-up33 PASS; fix FE10/BE4 PASS; Eclipse151sources0error0warning |
| A3: kho máy và bàn giao | Code/review hoàn tất; native riêng chưa chạy | FE57 PASS + fix9 PASS; BE17 PASS/9native SKIP; Eclipse158sources0error0warning |
| A4: báo cáo PM, nhật ký, nghiệm thu | Code/review hoàn tất; native riêng còn gate | BE14 PASS/9native SKIP; FE tập trung PASS; YAML5 roots/207refs PASS; kết quả cuối bên dưới |

## Môi trường và kiểm chứng

- MySQL native 127.0.0.1:3307, schema `tms`: đọc được, Flyway V13 tại thời điểm bắt đầu.
- Schema `tms_docstest_202610030001` chưa truy cập được. Người dùng yêu cầu tự tạo; lệnh `CREATE DATABASE IF NOT EXISTS` bằng tài khoản migrator trả MySQL **1044 (42000)**, không có quyền. Chưa có bằng chứng integration test/migration trên schema riêng.
- Không chạy fixture ghi/xóa dữ liệu lên `tms`; không bật Docker hoặc dựng server mới.
- Coverage toàn hệ thống chưa đo lại; số đo frontend A1 có phạm vi riêng phía dưới. S11 vẫn IN_REVIEW với UAT/pilot riêng.
- Backup trước migration mới: `var/mysql-native/backups/2026-10-05T09-31-53-192Z-tms.sql`, schemaV13,2,066,590bytes, SHA256 `7ff3ecd3f6df685cdce9cc4818ee5f93cdb64c816e17d8eac9825b9409baf7a6`. Session rows được loại khỏi backup; dữ liệu nguồn chỉ đọc.

### A1: bằng chứng đã thực chạy

- FE A1 (AppEntry/admin components/shared/API): 18 tests PASS, coverage đã đo 95.41% statements, 93.24% branches, 89.28% functions, 97.50% lines tại lần kiểm tra trước fix review. Không suy ra coverage toàn ứng dụng.
- BE: 4 service + 3 security tests PASS; 3 native integration tests SKIPPED do schema test chưa có. Build/package PASS. Backend coverage chưa đo cho A1.
- Full FE: lượt đầu 298/298 PASS; lượt sau 306 PASS và 1 test tài liệu cũ timeout khi chạy nhiều workload; rerun riêng 23/23 test tài liệu PASS. Không đổi timeout/test để che lỗi; sẽ chạy regression cuối khi hoàn tất các phần.
- Native read-only: truy vấn tổng hợp dự án/mốc chạy đúng trên V13, 4 dự án/3 mốc.
- Preview riêng cổng 18080/15173 dùng bản sao JAR, Flyway/bootstrap/Redmine tắt; giữ tiến trình người dùng 8080/5173. Login admin.local mặc định ADMIN; dashboard 4 dự án/9 user duy nhất/162 trên194 lượt áp dụng/26 bug mở. Phạm vi DEMO-PILOT:6 người,160 trên192 lượt,24 bug mở. Header đã bỏ selector theo yêu cầu mới; selector ở tab Dự án.
- Browser chi tiết dự án: viewport1440/1024/768/390/320 không tràn tài liệu; điều khiển mobile44px. Keyboard skip-link giữ nguyên hash và focus main. Console không có error trong tab kiểm chứng. Ảnh: `output/playwright/2026-10-05-admin-a1-desktop.png`, `output/playwright/2026-10-05-admin-a1-mobile.png`.
- Review độc lập A1: không thấy lỗi aggregate/guard; phát hiện ADMIN đăng nhập sau PM trên hash cũ có thể vào workspace thay vì admin. Đã sửa lựa chọn workspace theo identity; RED4→GREEN23 tests routing/auth. Review lại đúng phần sửa: APPROVED, không có finding mới; native integration vẫn là gate riêng chưa PASS.

### Điều chỉnh đã chốt trong khi triển khai

ADMIN tổng tạo dự án và phân bổ PM/Tester/Dev, chọn máy ban đầu; không đặt quota số lượng. PM nhận dự án để điều hành. DEV xem case/kết quả và xử lý bug được giao, cập nhật lý do/build sửa; không ghi kết quả test/tài liệu/retest hoặc đóng lỗi. Selector của ADMIN chỉ nằm trong tab Dự án, không trên header. A2–A4 đã áp dụng quyết định này.

## Skills

Áp dụng prompt-master để hiểu phạm vi (tác vụ phát triển, không thay bằng sinh prompt); thiết kế brainstorming đã được duyệt. Dùng subagent-driven-development để triển khai/review từng phần; api-design và security-review cho contract/quyền/CSRF/version; frontend-patterns và ui-ux-pro-max cho React/responsive/trạng thái; ponytail giữ stack và tái sử dụng cơ chế hiện có. Kiểm thử hành vi theo RED→GREEN, ghi kết quả thực chạy khi hoàn thành.

UI skill search: tìm được Python313 ngoài PATH, chạy `--design-system` và tìm hẹp `analytics dashboard --domain product`; kết quả phù hợp Analytics Dashboard, so sánh/drill-down/data-dense. Giữ palette teal/font đã chốt; bỏ đề xuất landing marketing và React19 Actions vì ứng dụng dùng React18.

## Công cụ kiểm thử native

`rtk proxy node scripts/Test-AdminNative.cjs` chọn schema test riêng, không tạo server/reset/schema dùng thật. Kiểm tra guard: 3/3 Node tests PASS (schema sản xuất/tên sai/host ngoài loopback/credential thiếu đều bị chặn); RED ban đầu vì chưa có module. Lần chạy native dừng trước Maven do chưa có quyền trên schema test.

### A2: kiểm chứng bổ sung của parent

- Eclipse151sources:0errors/0warnings sau follow-up. Backend preview18080 được khởi động lại từ JAR copy A2; không dừng8080/5173 của người dùng.
- Browser ADMIN: Users trả9 người gồm người chưa có dự án; chọn DEMO-PILOT bằng tên còn6 người, URL/scope không lan sang tab Dự án. Form tạo dự án chọn PM cập nhật đúng1người/1PM; hủy không tạo dữ liệu. Viewport320px không tràn trang, controls44px. Chỉ đăng nhập/đọc/mở-hủy form, chưa kiểm chứng live CRUD vì không có schema fixture riêng.

- A2 scoped review sửa3finding (quyền sau khóa giao dịch, bản nháp theo đúng dự án, null-membervalidation) đã APPROVED. Flyway native V13→V14 PASS sau backup 2026-10-05T15-52-13-700Z-tms.sql (2,066,800bytes, SHA256189528409ad92efce3fb0f852b1b83552cd0ebbfecc65c572f3a0eb4e23bf758). Đếm lại13bảng nghiệp vụ giống trước; chỉ bổ sung roleDEV, không seedfixture. Fresh/upgrade trên schema riêng chưa chạy.

### A3: native/browser đã thực chạy

- V14→V15 PASS sau backup 2026-10-05T16-09-13-264Z-tms.sql,2,066,941bytes,SHA256d29c0ce68bc44447889e55886a068c77e960154d2d37f46e2f4f32ea90c5bc6e. MySQL xác nhận2bảngphysical, uniqueactiveasset và nullableglobalprojectaudit đúngDDL. Kho0máy/0lượt;13bảngnghiệpvụ cũ đếm không đổi. Đây là upgrade đang dùng, không phải kiểm chứng fresh/fixture/concurrency.
- Scoped review sửa stale completion làm đóng editor mới, RED3→GREEN9test; re-review APPROVED. Native tests9SKIPPED rõ.
- PreviewA3 đọc kho/lịch sử/lọcproject/chi tiếtproject đúng0máy, không cóconsoleerror trongtab. Mở/hủyformnhậpmáy khôngghi dữliệu. Browser390px khôngtràn; phát hiệncheckboxphóng40px vàinput40px thayvì44mobile, giaoA4sửaCSS rồikiểmtralại.

### A4: kết quả trước nghiệm thu cuối

- Đã có báo cáo PM bất biến, kiểm tra quyền hiện hành và idempotency; dùng chung cách tính quá hạn theo múi giờ. Nhật ký chỉ trả trường công khai, hỗ trợ lọc ngày/múi giờ/dự án. Dashboard đọc số máy thật, liên kết mở bộ lọc cục bộ.
- Build FE/BE PASS; Eclipse 166 sources, 0 lỗi và 0 cảnh báo. BE tập trung 14 PASS, 9 native SKIP; FE tập trung 55 PASS rồi 9 test hồi quy liên quan PASS. Công cụ native/demo 10 PASS. Coverage A4 chưa đo.
- Review phát hiện YAML overview bị hỏng và hai bộ test cũ chưa cập nhật luồng tạo dự án/phân quyền PM; đang sửa trước nghiệm thu. Full FE ban đầu 339 PASS/1 FAIL; BE chọn lọc 123 PASS/3 FAIL, đều được giữ làm bằng chứng RED, chưa coi bộ regression đã PASS.
- Browser kiểm tra lại kho trên mobile 390px: không tràn ngang trang; input/select/button 44px, checkbox 18px trong nhãn 44px. Ảnh output/playwright/2026-10-05-admin-devices-mobile.png.

### Nghiệm thu V16 và trình duyệt

- V15→V16 PASS sau backup 2026-10-05T16-27-11-490Z-tms.sql (2,071,077 bytes; SHA256 b58fc944006f6923892c78d14965c20a0cfd3f2e9f8eaa9dc22fc6630077fae3). Đã xác nhận Flyway16, 0 báo cáo/0 tài sản/0 bàn giao, 13 bảng nghiệp vụ cũ giữ nguyên số dòng. Không tạo fixture nghiệp vụ.
- Preview riêng backend18080/frontend15173: dashboard, dự án, kho và audit tải thành công; nhật ký All1505 sự kiện, DEMO-PILOT901; liên kết dự án mở bộ lọc đúng project3, vào tab Dự án mặc định All. Chi tiết dự án có số máy thực và báo cáo PM rỗng đúng; không còn placeholder chưa triển khai. Form báo cáo trong Quản lý tiến độ hiển thị cho admin có membershipPM. Chỉ đọc/mở form, không gửi báo cáo thử.
- Dashboard viewport1440/1024/768/390/320 đều không tràn ngang toàn trang; header không có selector. Browser console không có error trong lượt này. Ảnh desktop/mobile/report ở output/playwright/2026-10-05-admin-final-desktop.png, admin-final-mobile.png, admin-pm-report.png.
- A4 re-review APPROVED sau sửa3 finding. YAML5 roots +207 tham chiếu parse/resolution PASS, không phải full OpenAPI validator. Review toàn thay đổi phát hiện thêm current-read/authorization race ở quản lý thành viên và lưu kết quả tài liệu; đang sửa, chưa đánh dấu hoàn tất nghiệm thu.

- Full FE sau sửa test tương thích: 341/341 PASS, 43 files. Các truy vấn mới đọc trạng thái identity/project/membership và FOR UPDATE OF m đã EXPLAIN thành công trên MySQL native; đây là kiểm tra cú pháp/kế hoạch, không thay thế bằng chứng giao dịch đồng thời hoặc mapping JPA.
