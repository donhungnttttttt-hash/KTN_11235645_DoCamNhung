# Hoàn thiện review S03/S04 trong S10 — 30/09/2026

Yêu cầu: giải thích các mục IN_REVIEW và thực hiện phần còn thiếu. IN_REVIEW nghĩa là đã có đầu ra nhưng chưa đủ kiểm chứng hoặc còn quyết định được ghi rõ; không đồng nghĩa đã hoàn tất. Giữ nhánh `feature/sprint-10-hardening`, không commit/push/merge/deploy. Phạm vi mở rộng S10-T01 là hoàn thiện các mục S03/S04 đã được người dùng yêu cầu, không mở S11.

## Phát hiện và thay đổi

| Phát hiện thực tế | Cách xử lý |
| --- | --- |
| Nút tạo/sửa danh mục, quản lý thành viên và màn settings thiếu hành vi đầy đủ | Nối API thật cho năm catalog, thông tin chung và thành viên; thêm loading/error/retry/readonly. Tra username chính xác để thêm tài khoản đã có; không cấp quyền tạo tài khoản hệ thống từ vai trò dự án. |
| Cập nhật catalog/membership có thể ghi đè từ màn hình cũ; mutation thiếu audit | V11 bổ sung version, yêu cầu expectedVersion; khóa theo project, audit cùng transaction. Chặn PM cuối, lưu trữ mềm giữ FK/lịch sử. Test hai cập nhật đồng thời chỉ một thành công. |
| DTO chưa bám giới hạn schema; build trùng khi số build null/rỗng; không xóa được ngày tùy chọn | Ràng buộc độ dài/không trắng, kiểm tra mã trùng và thứ tự ngày. `clearDates` thể hiện rõ yêu cầu xóa ngày; validation thất bại rollback toàn bộ. |
| Quy tắc chưa có UI/history/validation an toàn hoặc gắn phiên bản với bug | Dùng route thực tế `/bug-rule-versions`, cấu hình typed `INTERNAL_DEMO`, nguồn quy tắc và tiền tố tùy chọn; không script/regex, không giảm trường bắt buộc ADR-006. Công bố cần version hiện hành. Bug mới chụp rule_version_id; sửa bug dùng bản đã chụp, bug cũ không bị áp rule mới. |
| Sổ tay chưa lưu/đọc/lịch sử qua UI; visibility và HTML chưa được giới hạn | Sổ tay trong Cài đặt dự án, chỉ INTERNAL, lưu revision bất biến có actor/time, chặn ghi đè từ bản cũ. Nội dung hiển thị văn bản thuần; không thực thi HTML hoặc tự mở liên kết. |
| Dialog test case/import thiếu quản lý focus | Focus vào dialog, giữ Tab/Shift+Tab trong dialog, Escape và khôi phục focus; khóa đóng khi đang gửi. Bổ sung aria và bố cục có vùng cuộn giữ nút thao tác. |
| Contract/tài liệu còn mô tả V10 và S03 chưa triển khai | Thêm contract 37 thao tác settings; cập nhật API, schema V11, sprint và trạng thái theo kết quả kiểm chứng. |

V11 chỉ thêm cột/version/FK/index, không thêm bảng. Tổng vẫn 55 bảng ứng dụng và một bảng Flyway. Backup local trước V11 144486 byte trong thư mục bị ignore; không đưa dump vào Git. V1–V11 đã áp dụng giữ nguyên; migration sản phẩm kế tiếp V12. Migration V12 gây lỗi trong recovery test chỉ tồn tại trong thư mục test tạm.

## Quy trình ECC và bằng chứng

Đã áp dụng `tdd-workflow`, `frontend-patterns`, `security-review`, `verification-loop`; review code/API/schema và quyền theo dự án. Đây là tự review có kiểm thử, không tuyên bố có reviewer độc lập.

- RED: bốn kiểm tra settings ban đầu thất bại vì validation/concurrency/visibility/rule policy; kiểm tra rule áp vào bug trả 201 thay vì 422; FE không tìm thấy form tạo danh mục. Test phát hiện nút Hủy còn hoạt động trong lúc lưu nhóm, đã sửa đồng bộ các dialog liên quan. Đã sửa và kiểm tra lại GREEN.
- Backend: **171/171 test PASS**, không bỏ qua; Maven verify BUILD SUCCESS. Lần trước 170 test có một lỗi kỳ vọng V10 trong diagnostic; đã sửa sang V11 và chạy lại toàn bộ. Fresh/upgrade/checksum, 9 SettingsReviewTest và 4 SystemJourneyTest PASS trong full suite. Sau đó thêm bốn kịch bản nhánh lỗi/legacy, chạy targeted 29 test PASS (13 SettingsReviewTest + policy/catalog/timezone/library); không thay code production backend sau full suite. Đã tách rate-limit fixture giữa các kịch bản sau khi bắt được 429 do dùng chung IP kiểm thử. Recovery V11 đối chiếu 54 bảng và một chứng cứ, hai lần restore thành công; nguồn không đổi.
- Frontend: 181/181 test, 25 file PASS; build PASS. Gate settings + shared dialog hook: 33 test PASS, statements 94.16%, branches 89.62%, functions 90.62%, lines 96.34%. Gate chỉ áp dụng phạm vi file trong `vitest.hardening.config.js`, không phải toàn app. Whole-app coverage lần đo trước thay đổi cuối vẫn dưới 80% mọi chỉ số.
- Kiểm thử mới bao phủ phiên bản cũ/ghi đồng thời, quyền TESTER/PM/admin ngoài dự án, bảo vệ PM cuối, xóa ngày, lưu trữ, input quá dài, JSON không hợp lệ, XSS văn bản, lịch sử và audit. Giữ các regression HTTP từ Excel đến phân công–NG–bug–retest–đóng–báo cáo.
- Chrome thật trên dự án riêng `DEMO-REVIEW-0930`: tạo dự án; thêm tài khoản TESTER đã có; tạo/sửa môi trường; tạo sổ tay v1 rồi v2 và đọc lại lịch sử; tạo ruleset và bản nháp; tạo nhóm AUTH, đọc lại số nhóm và focus quay về nút Tạo nhóm. Chưa kiểm chứng nút công bố bằng browser, đã kiểm chứng qua HTTP.
- Chrome: mở dialog Excel, focus ban đầu ở nút Đóng, chưa chọn file thì hiển thị lỗi tiếng Việt, đóng dialog trở về thư viện. Không tính đây là E2E upload hoàn chỉnh.

Coverage backend sau **29 kiểm thử bổ sung** (không gộp giả với báo cáo full 171):

| Package | Instruction | Branch | Line | Method | Gate 80% |
| --- | ---: | ---: | ---: | ---: | --- |
| project | 95.24% | 90.54% | 96.67% | 93.59% | PASS |
| catalog | 96.93% | 97.32% | 99.33% | 92.57% | PASS |
| rules | 94.35% | 88.16% | 98.58% | 89.71% | PASS |
| handbook | 94.92% | 87.50% | 96.43% | 89.09% | PASS |

Lệnh: `scripts/Check-BackendCoverage.ps1 -Package vn/syp/tms/<package>`. Báo cáo full và targeted được giữ riêng trong scratch bị ignore. Cũng đã sửa fixture trùng project bổ sung timezone hợp lệ để đúng nhánh kiểm tra mã trùng. Test UI tài liệu lưu trữ đã tái hiện nút thêm revision còn hiện và được sửa GREEN. Backend local khởi động lại sau kiểm chứng; `Check-System.ps1` PASS MySQL 8.4.8, Flyway V11/11, không thêm diagnostic lên web.

## Kết luận trạng thái

S03-T01/T02/T03 và S03 **DONE trong phạm vi nội bộ**. Bộ quy tắc khách hàng/production chưa được xác nhận; giữ gate riêng, không gọi DEMO là chuẩn khách. S04-T01/T02 và S10-T02/T03 giữ DONE như trước; S04-T03/S10-T01 còn IN_REVIEW theo các mục dưới.

## Phần chưa thể ghi DONE

1. **S04-T03:** cần hoàn tất chọn file XLSX → preview → commit → reload trên Chrome. Công cụ trước đó bị chặn quyền truy cập file local; đã hỏi người dùng bật quyền extension hoặc tự chạy kịch bản. HTTP multipart/transaction và RTL đã kiểm tra, không thay thế bước browser này.
2. **S10-T01:** chưa có kết quả keyboard/mobile toàn chuỗi, chưa có người nghiệm thu/lịch/ký UAT nội bộ. Các kiểm tra focus bằng RTL và desktop nêu trên chỉ là một phần.
3. **S00-T03:** quyết định dành cho khách hàng/production vẫn chưa chốt hết. ADR nội bộ đã cho phép triển khai; không tự nhận bộ DEMO là rule khách.

Không tự ký UAT hoặc miễn các gate này. S11 giữ PLANNED. Xem [kịch bản nghiệm thu](../uat/sprint-10-internal.md), [contract settings](../api/project-settings.md), [database](../database/README.md) và [STATUS](../planning/STATUS.json).

Kiểm tra cuối: `Check-Contracts.cjs` PASS 104 operations/40 tài liệu; `git diff --check` PASS; secret scan PASS trên 1513 source không bị ignore và bundle. Không đổi dependency trong đợt review này. Lint/typecheck FE: NOT_CONFIGURED (React JavaScript), không ghi PASS cho lệnh chưa có.
