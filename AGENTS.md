# Hướng dẫn làm việc trong repository

@C:\Users\admin\.codex\RTK.md

## Kế hoạch phát triển và giới hạn sprint

- Từ yêu cầu ngày 03/10/2026, nhánh làm việc tiếp tục là `system-design`, tập hợp code và tài liệu các sprint hiện có cùng màn test case khôi phục. Không tự chuyển lại nhánh sprint cũ. `develop` vẫn là nhánh tích hợp; chưa mặc định đã merge hoặc push.

- Trước khi làm việc, đọc `docs/planning/README.md`, `docs/planning/STATUS.json` và `docs/planning/06-execution-guide.md`.
- Khi người dùng nói “làm Sprint X”, mở đúng `docs/planning/sprints/SPRINT-XX.md`; chỉ thực hiện các task của sprint đó. “Tiếp tục sprint” nghĩa là tiếp tục `activeSprint` và task chưa hoàn thành trong STATUS.json, không làm lại phần DONE.
- Yêu cầu thực hiện một sprint là đủ để bắt đầu phần việc đã rõ. Không hỏi lại phê duyệt chung; chỉ hỏi về quyết định nghiệp vụ còn thiếu thực sự chặn task, đồng thời tiếp tục các task độc lập đã được phép.
- Không tự chạy sprint kế tiếp, không gom toàn bộ roadmap vào một lần triển khai. Yêu cầu mở rộng phạm vi của người dùng được ưu tiên; ghi lại thay đổi trong kế hoạch.
- Người dùng đã mở rộng phạm vi ngày 29/09/2026: “bắt đầu đi, và hãy luôn làm tiếp các sprint sau đó nhé”. Được tiếp tục tuần tự từ S07 trở đi, kiểm chứng và cập nhật từng sprint trước khi chuyển tiếp; không hỏi lại quyền bắt đầu mỗi sprint. Chỉ chờ các quyết định nghiệp vụ/điều kiện bên ngoài thực sự cần thiết, làm tiếp phần độc lập; giữ giới hạn commit/push/merge/deploy như dưới. Xem `executionPolicy` trong STATUS.json.
- Phân tích nghiệp vụ, đối chiếu code/API/database trước khi sửa. Giữ giao diện đã thống nhất, refactor từng phần; không đánh đồng thiếu implementation với sai kiến trúc.
- Frontend React hiện dùng JavaScript. Backend mục tiêu Java/Spring Boot; MySQL + Flyway quản lý schema. Không triển khai backend hoặc migration chỉ vì đang viết tài liệu kế hoạch.
- Yêu cầu 01/10/2026: ưu tiên MySQL Server cài trực tiếp và MySQL Workbench; Docker không là điều kiện chạy ứng dụng. Xem docs/database/mysql-workbench.md. Không tự tạo thêm container/server khi native chưa có credential. Giữ dữ liệu cũ, không coi cấu hình native đã chuẩn bị là đã cutover; Testcontainers/Redmine sandbox hiện có là công cụ riêng, không chạy test ghi/xóa lên database sử dụng.
- Kiểm tra sức khỏe backend/MySQL/Flyway được theo dõi bằng terminal, log và công cụ phát triển. Không đưa tab, màn kiểm tra hệ thống hoặc form lưu dữ liệu thử lên giao diện web nghiệp vụ.
- Không tự bịa rule của khách hàng, trạng thái, quyền, mẫu import hoặc mapping Redmine. Xem câu hỏi còn mở tại `docs/planning/02-business-rules.md`.
- Quyền tạo tài khoản đã chốt S02: chỉ ADMIN hoặc PM được ADMIN cấp riêng; TESTER không có quyền. PM được cấp trong S02 chỉ tạo TESTER, không tạo ADMIN/PM hoặc cấp quyền tiếp. Backend phải enforce; xem `docs/business/permissions.md`. Chưa mở tài khoản khách hàng.
- Cập nhật trạng thái task, bằng chứng kiểm tra và việc còn lại sau mỗi lần làm. Chỉ đánh dấu DONE khi đạt Definition of Done; thiếu môi trường kiểm tra phải báo rõ.
- Không tự commit/push/merge/deploy chỉ vì hoàn thành sprint; thực hiện khi được người dùng yêu cầu hoặc đã cho phép trong tác vụ đang làm. Nhánh tích hợp là `develop`; không mặc định feature branch đã được merge.

Kế hoạch là bộ nhớ dùng chung của dự án. Luôn đối chiếu lại với code và yêu cầu mới nhất, không coi các đề xuất chưa xác nhận là nghiệp vụ đã chốt.

## Áp dụng skill khi phát triển

- Theo yêu cầu ngày 29/09/2026, chủ động chọn các skill ECC phù hợp với task, theo [hướng dẫn skill](docs/development-skills.md). Không cần người dùng nhắc lại tên skill ở mỗi sprint.
- Đọc `SKILL.md` của skill được chọn trước khi dùng; thông báo ngắn tên skill và mục đích. Ưu tiên `api-design` cho contract, `frontend-patterns` cho React, `tdd-workflow` cho thay đổi hành vi, `security-review` cho API/quyền/input, `verification-loop` khi kiểm chứng kết quả.
- Áp dụng theo stack thực tế React JavaScript + Spring Boot + MySQL/Flyway. Ví dụ Node/Next/Supabase trong skill không phải yêu cầu đổi kiến trúc. Quyết định nghiệp vụ và phạm vi sprint đã chốt vẫn là nguồn chính.
- Với sửa lỗi, tái hiện bằng test hành vi thất bại trước khi sửa; sau đó chạy kiểm tra phù hợp. Ghi rõ coverage đã đo hay chưa đo, không suy ra coverage từ số test PASS.
- Lưu skill đã dùng, kiểm tra và việc còn lại trong nhật ký sprint/báo cáo review. Không coi cài skill là đã thực hiện review hoặc kiểm thử.
