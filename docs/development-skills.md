# Dùng skill trong các sprint

Áp dụng từ 29/09/2026 theo yêu cầu của người dùng. Mục tiêu là để yêu cầu “tiếp tục Sprint X” tự đi kèm cách phân tích, triển khai và kiểm chứng nhất quán.

## Bộ skill đang cài

Máy phát triển đã cài 39 skill dành cho Codex từ `.agents/skills` của [ECC](https://github.com/affaan-m/ECC/tree/d3b8a3e908904e242ed2dbe66af62cca71131419/.agents/skills), tại commit `d3b8a3e908904e242ed2dbe66af62cca71131419`. Bản cài nằm trong thư mục `skills` của Codex; manifest cục bộ là `.ecc-install.json` (39 skill, 88 file đã đối chiếu checksum). Đây là cấu hình của máy; clone repo sang máy khác không tự cài skill.

Không cần kích hoạt cả bộ cho mọi việc. Chỉ đọc và áp dụng skill liên quan; báo rõ nếu máy hiện tại thiếu skill cần dùng. Không tự cài hook, MCP hoặc đổi cấu hình Codex chỉ vì có hướng dẫn mẫu trong ECC.

## Chọn theo công việc

| Công việc | Skill | Đầu ra cần có |
| --- | --- | --- |
| Phân tích chức năng nhiều tầng | `product-capability` khi cần | Actor, điều kiện bất biến, phụ thuộc, quyết định còn mở; đối chiếu task hiện hành |
| Thiết kế/review API | `api-design` | Contract, validation, quyền theo dự án, phân trang, lỗi, version/idempotency |
| Giao diện React | `frontend-patterns` | Component/state rõ; loading/empty/error/retry; giữ bản nháp và chặn response cũ |
| Thêm/sửa hành vi | `tdd-workflow` | Test hành vi trước, quan sát FAIL, sửa rồi PASS; regression đúng rủi ro |
| API, xác thực, quyền, dữ liệu nhập | `security-review` | Quyền ở server, project scope, CSRF/session, validation, an toàn SQL và bí mật |
| Kiểm tra chất lượng code tổng quát | `coding-standards` khi cần | Naming, độ rõ ràng, kiểm soát độ phức tạp phù hợp Java/JavaScript |
| Test hành trình web tự động | `e2e-testing` khi viết/sửa Playwright | Luồng người dùng quan trọng, fixture độc lập, bằng chứng thực thi |
| Chốt kết quả task/sprint | `verification-loop` | Test/build/review và báo cáo PASS/FAIL/NOT_RUN, giới hạn còn lại |
| API thư viện chưa chắc chắn | `documentation-lookup` khi cần | Tra tài liệu chính thức đúng phiên bản và ghi nguồn |

`backend-patterns` dành cho Node/Express/Next.js; chỉ sử dụng nội dung thực sự phù hợp, không đổi backend Spring Boot. `everything-claude-code` mô tả quy ước repo ECC, không thay thế quy ước của TMS. Các skill nội dung, marketing, media không nằm trong quy trình mặc định của dự án.

## Quy trình mỗi task

1. Đọc `STATUS.json`, sprint đang được yêu cầu, rule và code liên quan. Chọn skill, đọc đúng `SKILL.md`, thông báo mục đích sử dụng.
2. Đối chiếu contract/domain/schema trước khi sửa. Migration mới tiếp nối phiên bản hiện có; không sửa migration đã áp dụng. Kiểm tra FK, unique, index, transaction và nâng cấp bảo toàn dữ liệu.
3. Với thay đổi hành vi, viết test quan sát kết quả người dùng/API, tái hiện lỗi hoặc yêu cầu mới rồi sửa. Dùng Vitest/Testing Library ở FE, JUnit/Spring Boot/Testcontainers MySQL ở BE. Không sao chép lệnh Jest/Bun từ ví dụ nếu dự án không dùng chúng.
4. Kiểm tra các đường lỗi có liên quan: 401/403/404/409, sai dự án, retry, concurrency, rollback. Giao diện chỉ báo thành công sau phản hồi server.
5. Chạy kiểm chứng đúng phần thay đổi. Ghi lệnh, ngày, kết quả, phạm vi, coverage thực đo và thiếu sót. Mục tiêu của `tdd-workflow` là coverage tối thiểu 80%; khi chưa có báo cáo phải ghi `NOT_MEASURED`, không tuyên bố đã đạt. Không viết test chỉ để tăng số liệu.
6. Review diff, quyền/bảo mật, tính toàn vẹn dữ liệu, tình huống lỗi và giao diện sau implementation. Sửa lỗi phát hiện rồi chạy lại kiểm chứng bị ảnh hưởng. Ghi rõ review tự thực hiện; không gọi là review độc lập khi không có người/agent khác.
7. Cập nhật nhật ký/review và STATUS; chỉ DONE khi đạt DoD. Việc chưa đạt vẫn có next action rõ ràng. Theo ủy quyền 29/09/2026, tiếp tục tuần tự sprint sau khi chốt bằng chứng sprint trước; không gom các sprint thành một đợt chưa kiểm soát. Không suy ra quyền commit/push/merge/deploy.

Lệnh kiểm chứng hiện có và điều kiện môi trường xem [quy trình sprint](planning/06-execution-guide.md). FE có `rtk proxy npm run test:coverage` dùng V8, xuất HTML/JSON trong `Frontend/coverage/` (được ignore), theo [tài liệu Vitest](https://vitest.dev/guide/coverage.html). Phạm vi gồm toàn bộ `src` JS/JSX, trừ test/setup và bootstrap cũ `src/index.js` không được `index.html` sử dụng; bootstrap hiện hành `src/main.jsx` vẫn được đo. Không loại màn prototype chỉ vì ít test. Báo cáo coverage hiện là baseline, chưa có gate tự động 80% cho toàn repo.

Repo chưa có lệnh lint/typecheck riêng cho React JavaScript: ghi NOT_CONFIGURED, không ghi PASS cho lệnh không tồn tại. Backend đã có JaCoCo trong `mvnw verify`; FE có gate coverage riêng S05/S06 cho module đang triển khai. Báo cáo phạm vi gate riêng và baseline toàn repo, không đồng nhất hai kết quả. Kiểm tra thao tác trên trình duyệt và test tự động phải được ghi riêng.

S07 bổ sung `npm run test:retest:coverage` (FE) và `scripts/Check-BackendCoverage.ps1 -Package vn/syp/tms/retest` sau backend verify. Cả hai trả mã lỗi khi module thấp hơn 80%; không thay scope để che vùng chưa kiểm thử. Gate module không thay baseline toàn repo hoặc review nghiệp vụ.

Người dùng nhắc lại ngày 29/09/2026: áp dụng đủ quy trình ECC. Báo cáo mỗi sprint phải có phân tích/contract, RED→GREEN, review code, security, build, tests/coverage, migration fresh+upgrade, hành trình web, tài liệu/status và giới hạn kiểm tra. Không bỏ qua bước chỉ vì các unit test đã xanh; cũng không cài hook/MCP không liên quan.

## Giữ các quyết định đã chốt

- ADMIN hoặc PM được ADMIN cấp riêng mới được tạo tài khoản; PM được cấp chỉ tạo TESTER. Quyền PM của dự án kiểm tra riêng với role toàn hệ thống.
- Chỉ PM của dự án phê duyệt phiên bản test case. Fix là dev báo đã sửa, tester phải kiểm thử lại; chưa tự chuyển thành OK.
- Rule chưa chốt phải liên kết Q-ID trong kế hoạch. Skill không thay thế câu trả lời nghiệp vụ.
- Skill không tự mở sprint kế tiếp, commit/push/merge/deploy, hoặc thêm màn chẩn đoán hệ thống trên web.

## Ghi bằng chứng áp dụng

Trong nhật ký task/review ghi ngắn: **skill → phần đã áp dụng → lệnh/bằng chứng → giới hạn/next action**. Việc cài đủ skill chỉ chứng minh cài đặt thành công; mức độ áp dụng được đánh giá từ thay đổi và kiểm chứng thực tế.

S08 bổ sung `npm run test:reporting:coverage`; gate BE `scripts/Check-BackendCoverage.ps1 -Package vn/syp/tms/reporting` và `-Package vn/syp/tms/cycle`. Dùng cùng bằng chứng full suite, migration upgrade và browser; báo rõ gate module >=80% không chứng minh toàn repo >=80%.

S10 bổ sung `npm run test:hardening:coverage`; đợt hoàn thiện review mở rộng scope thành sáu component cấu hình dự án và shared dialog focus hook, ghi rõ trong config. `scripts/Test-Backend.ps1` tránh DEBUG/TRACE thừa kế; `scripts/Check-BackendAdvisories.cjs` kiểm tra dependency runtime Maven đã resolve. Scanner lỗi mạng/input không hợp lệ phải báo chưa hoàn tất, không ghi 0 finding; không suppress để che finding. Bài đo tải/restore và giới hạn mẫu được ghi riêng trong [review S10](reviews/2026-09-30-sprint-10.md), phần cấu hình/V11 tại [review hoàn thiện](reviews/2026-09-30-review-completion.md); không dùng benchmark laptop làm SLA hoặc dùng test HTTP thay browser/UAT.
