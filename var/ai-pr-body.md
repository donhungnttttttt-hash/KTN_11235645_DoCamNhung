Tích hợp TMS từ `system-design` vào `develop`: Admin tiếp nhận/bàn giao dự án; PM nhập và phân công file; Tester thực thi trên thiết bị, báo bug/QA; Dev xử lý, Tester retest và PM theo dõi/đóng công việc. Trợ lý AI bổ sung tác vụ theo từng vai trò và lưu bản nháp tạm để người dùng kiểm tra trước khi sử dụng.

## Phạm vi

- Spring Boot/MySQL + React: session, phân quyền ADMIN/PM/DEV/TESTER, phạm vi dự án, version/xung đột, idempotency và audit.
- Thư viện Excel nhận diện tiêu đề và giữ nguồn; bảng test case khôi phục, lịch sử, tự lưu kết quả tài liệu và xuất dữ liệu đã cập nhật; tải file gốc riêng.
- Phân công file, phiên sử dụng thiết bị, thực thi theo đợt/build, bug/QA, xác minh, retest và danh sách việc cần xử lý. Khu Admin quản lý dự án/user/kho máy và vòng đời dự án.
- Responsive, cuộn, focus/bàn phím, loading/error và đồng bộ menu. Demo local V20/V22 gồm 100 tài khoản bổ sung (3 PM/20 Dev/77 Tester), 120 máy đa dạng, ba dự án và bàn giao; không seed workbook/case/kết quả trong V22.
- AI: Admin rà soát dự án; PM báo cáo/gợi ý phân công; Tester báo cáo cá nhân/hoàn thiện bug; Dev rà soát BUG/QA được giao, tìm ticket cùng dự án. Context và nguồn do backend dựng theo quyền; không nhận prompt tự do hoặc tự ghi nghiệp vụ.
- V23 lưu bản nháp AI theo owner/project, TTL7 ngày, chỉnh sửa/version, giới hạn quota và request idempotency; reauthorize cả khi provider trả kết quả và khi đọc cache. UI có nguồn đối chiếu, bản gốc, lưu chỉnh sửa và lịch sử; sửa chưa lưu giữ qua đổi menu/dự án trong phiên tài khoản.
- PRD, đặc tả, OpenAPI và báo cáo kiểm chứng trong `docs/`. Đây là PR tích hợp toàn nhánh, không chỉ AI hoặc seed demo.

## Database và vận hành

Flyway tự áp dụng core V23 khi backend khởi động; V20/V22 demo chỉ được profile local nạp, release không tự tạo tài khoản demo công khai. Sau pull, cấu hình database đã tồn tại và tài khoản migration trong `.env.mysql.local`; không cần import SQL bằng tay. Thông tin riêng, key, backup/cookie và `var/` không nằm trong PR.

Local đã backup rồi nâng native MySQL3307 lên V23, restart8080 và health200/UP. V23 fresh và V22→V23 đã kiểm chứng trên schema riêng, bảo toàn snapshot/workbook và replay không tạo thay đổi dư. Không dùng clean/repair trên database đang sử dụng.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend toàn bộ 10/10 | 678/678 PASS, 59 files; build PASS |
| Coverage frontend | 84.56% statements / 81.96% branches / 78.21% functions / 83.30% lines |
| AI backend clean unit | 48/48 PASS: transport/errors/bounds/schema, role, UTF-8 budget, quota theo phút |
| AI native MySQL/MockMvc | 18/18 PASS: fresh/upgrade V23, 6 tác vụ/4 role, owner/scope/CSRF, TTL/quota/edit, revoke lúc generate, duplicate race, lọc quyền trước pagination |
| Native runner guard | 11/11 PASS |
| Java diagnostics | 224 source, 0 errors / 0 warnings |
| Contracts | Contract nền PASS; AI 5 paths/6 operations + local refs, có HTTP tests riêng |
| Browser local | Tester/PM/Dev/Admin đăng nhập thật, menu/tác vụ/phạm vi đúng; Tester375/768/1366 và Admin375/1366 không tràn ngang, focus/scroll/empty-state kiểm tra |
| Bằng chứng V22 trước đó | F/Q integration9/9, concurrency5/5, V22 migration1/1, HTTPpreview6kịch bản; xem báo cáo riêng |

Một lần FE chạy đồng thời migration bị timeout test result-grid cũ; chạy lại toàn bộ với2worker PASS, không bỏ test/nới timeout. Test ghi/xóa chỉ trên schema riêng. Không chạy lại toàn bộ backend Testcontainers; coverage native riêng không phải coverage toàn backend.

## Giới hạn

- **AI live chưa nghiệm thu:** kiểm tra generic Responses API trả429 `credit_balance_exhausted / insufficient_quota`. Chưa gửi dữ liệu dự án và không lặp gọi sau lỗi số dư. Cần API credit rồi UAT nội dung/citation theo bốn vai trò; provider mock không chứng minh chất lượng model thật.
- AI chỉ gợi ý, không tự phân công/đổi kết quả/đóng lỗi/công bố tracker. Gợi ý Tester dựa tải việc và thiết bị, chưa có dữ liệu năng lực/lịch nghỉ. Tìm kiếm hiện trong dự án, chưa tìm web/repository. Model nhận ID ứng viên, tên đối chiếu qua nguồn trên UI.
- S11 IN_REVIEW: UAT với workbook khách, Safari/thiết bị thật/bàn phím ảo, load100người và restore trên môi trường đích vẫn là gate riêng.
- JS577.99KB có warning >500KB; MySQL9.7 có cảnh báo ngoài mức Flyway vendor đã kiểm thử, dù fresh/upgrade native PASS. Chưa kết luận production readiness.

## Tài liệu

- [AI: nghiệp vụ và giới hạn](../blob/system-design/docs/product/AI-ASSISTANCE.md)
- [AI: kết quả kiểm chứng và bàn giao](../blob/system-design/docs/reviews/2026-10-09-openai-connection.md)
- [V22: kiểm nghiệm và dữ liệu demo](../blob/system-design/docs/reviews/2026-10-09-verification-demo-v22.md)
- [PRD và đặc tả hệ thống](../blob/system-design/docs/product/README.md)
- [Trạng thái phát triển](../blob/system-design/docs/planning/STATUS.json)
