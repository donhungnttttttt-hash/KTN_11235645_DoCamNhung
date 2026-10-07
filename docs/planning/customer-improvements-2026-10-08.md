# Cải tiến trải nghiệm khách hàng — 08/10/2026

Người dùng yêu cầu triển khai sau [đánh giá khách hàng](../reviews/2026-10-08-demanding-customer-assessment.md). Nhánh `system-design`; giữ phân quyền và ba nguồn Excel đã duyệt.

## Đợt triển khai đang làm

1. IMPLEMENTED_VERIFIED — Checklist chuẩn bị giao file từ dữ liệu server; liên kết tới đúng bước. Chỉ là tổng quan điều kiện, preview vẫn kiểm chứng phạm vi cụ thể.
2. IMPLEMENTED_VERIFIED — Backend bổ sung tên môi trường/thiết bị/build; frontend trình bày phiên theo ngôn ngữ nghiệp vụ.
3. IMPLEMENTED_VERIFIED — Chế độ từng case trên màn nhỏ, dùng cùng lệnh lưu/quyền/history; giữ bảng desktop và lựa chọn qua lưu/làm mới.
4. IMPLEMENTED_VERIFIED — Tìm dự án theo từ khóa server, giữ đúng lựa chọn khi phân trang/tìm kiếm.
5. IMPLEMENTED_VERIFIED — Hộp việc FILE/QA/BUG/RETEST và tổng hợp cho PM, đọc live/polling. Chưa là thông báo có lịch sử sự kiện/đã đọc; không gửi ra ngoài.
6. IMPLEMENTED_VERIFIED — Rà lại phạm vi xuất Excel, tên bản cập nhật, tình huống lưu lỗi/xung đột và hồi quy trên DB riêng.
7. WAITING_BUSINESS_DECISION — Kết thúc dự án: đã hỏi quy tắc xử lý việc tồn; không tự suy luật closure cho REQUEST/TASK/IMPROVEMENT.
8. VERIFIED_WITH_LIMITS — Kiểm chứng kỹ thuật và bàn giao ở [báo cáo](../reviews/2026-10-08-customer-improvements.md); UAT khách hàng/thiết bị thật và NFR production vẫn riêng, không tự ký nghiệm thu.

## Contract bổ sung

`GET /api/v1/projects/{projectId}/file-work-groups/preparation`: đọc hiện hành, chỉ PM dự án; cùng kiểm tra tài khoản/session/membership như file-work. Trả `asOf`, `archived`, `counts` gồm tài liệu import hoàn tất, case nguồn có phiên bản đã duyệt, Tester hợp lệ, đợt nháp có cấu hình còn dùng được, máy được cấp và nhóm đã giao. Không tải blob, không ghi dữ liệu, không tự duyệt/activate/cấp quyền. Phân biệt đợt sẵn sàng giao với khả năng thực thi phiên trên máy cụ thể.

Group list/detail/execution bổ sung `environmentName`, `deviceName`, `selectedBuildLabel`; giữ ID và tên snapshot ở lịch sử. Đây là field bổ sung, không đổi quyền hoặc cấu trúc dữ liệu lưu.

Tìm dự án dùng `keyword` hiện có của Admin API, native select có tìm kiếm có nhãn, reset trang khi submit; phản hồi cũ không được thay kết quả mới hoặc đổi lựa chọn.

## Kiểm chứng

Viết test hành vi RED trước implementation; FE Vitest, BE JUnit/native rollback trên schema riêng V19. Không ghi fixture vào `tms`. Chạy hồi quy lưu/export đúng build và quyền, build, browser responsive theo điều kiện môi trường. Ghi coverage thực đo riêng; không suy coverage từ số PASS.

Skills: `api-design`, `security-review`, `frontend-patterns`, `ui-ux-pro-max`, `tdd-workflow`, `verification-loop`, `ponytail`. `prompt-master` đã đọc, không chuyển yêu cầu triển khai thành tác vụ tạo prompt. Python CLI của UI skill không có trong PATH; dùng hướng dẫn responsive/touch/accessibility của skill làm fallback, không coi là kết quả tra cứu thành công.
