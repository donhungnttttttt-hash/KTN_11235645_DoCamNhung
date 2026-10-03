# Sprint 00 — Khảo sát, kiến trúc và chốt phạm vi

Trạng thái theo [STATUS.json](../STATUS.json). Kế hoạch lập 22/09/2026; chưa triển khai trừ các task tài liệu được ghi DONE. Ước lượng ban đầu: **2–4 ngày công**, chưa phải lịch cam kết.

## Mục tiêu

Có kế hoạch có thể thực thi từng sprint, phân biệt code đã có với chức năng thật chưa làm.

## Phụ thuộc và điều kiện vào

Không; baseline code bd7e482 và hai tài liệu nguồn.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không viết backend, không tạo migration thật, không thay giao diện, không chạy triển khai.

## Thứ tự task

### S00-T01 — Khảo sát hiện trạng

- **Feature:** Khảo sát hiện trạng
- **Objective:** Đối chiếu toàn bộ runtime và legacy với nghiệp vụ.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/planning/01-discovery.md
- **Backend changes:** Không thay đổi; ghi nhận Backend chỉ là placeholder.
- **Frontend changes:** Không thay đổi; lập import graph, dữ liệu mẫu và các chỗ cần nối API.
- **Database changes:** Ghi nhận chưa có DB/schema.
- **API changes:** Ghi nhận chưa có API.
- **Business rules:** Không gọi prototype là chức năng nghiệp vụ hoàn chỉnh.
- **Tests / bằng chứng cần có:** Kiểm tra path/import và mỗi nhận định có bằng chứng source.
- **Dependencies:** Không.
- **Risk:** Dùng số liệu mock làm kết luận nghiệp vụ.
- **Definition of Done riêng:** Discovery 18 mục có phân loại KEEP/EXTEND/REFACTOR; không sửa source.

### S00-T02 — Lập kế hoạch có trạng thái

- **Feature:** Lập kế hoạch có trạng thái
- **Objective:** Tạo kế hoạch tổng thể, các task theo sprint, hướng dẫn, bản nháp API/DB và cơ chế tiếp tục công việc.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** AGENTS.md; README.md; docs/planning/**
- **Backend changes:** Chỉ mô tả kiến trúc Spring Boot.
- **Frontend changes:** Giữ 6 menu tiếng Việt và submenu đã thống nhất.
- **Database changes:** Lập schema/migration blueprint; không áp dụng SQL.
- **API changes:** Lập inventory và quy tắc contract.
- **Business rules:** Một yêu cầu sprint chỉ mở phạm vi sprint đó.
- **Tests / bằng chứng cần có:** Kiểm tra links, ID, dependencies, STATUS.json và coverage yêu cầu.
- **Dependencies:** S00-T01.
- **Risk:** Kế hoạch quá lớn, phụ thuộc vòng hoặc vô tình triển khai tất cả.
- **Definition of Done riêng:** Mỗi sprint có mục tiêu, phạm vi và phần loại trừ, task, kiểm thử, demo, DoD và trạng thái thực tế.

### S00-T03 — Ghi quyết định nghiệp vụ theo gate

- **Feature:** Ghi quyết định nghiệp vụ theo gate
- **Objective:** Ghi câu trả lời cho vấn đề còn mở trước khi làm task bị ảnh hưởng; không yêu cầu chốt tất cả câu hỏi mới được dựng nền tảng.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/planning/02-business-rules.md; docs/planning/decisions/; docs/planning/STATUS.json
- **Backend changes:** Chốt vai trò, nguồn trạng thái và use case trước domain tương ứng.
- **Frontend changes:** Xác nhận giữ UI; phân biệt result với bug status.
- **Database changes:** Chốt retention/source of truth và scope qua từng gate.
- **API changes:** Chốt mapping provider và lỗi nghiệp vụ khi tới feature.
- **Business rules:** Không tự thêm 2 trạng thái để đủ 12; không tự duyệt spec khách.
- **Tests / bằng chứng cần có:** Đối chiếu câu trả lời với BR, sprint, API/DB proposal.
- **Dependencies:** S00-T01, S00-T02; người dùng cho quyết định cần thiết.
- **Risk:** Câu hỏi còn mở bị coi như đã được xác nhận.
- **Definition of Done riêng:** Mỗi quyết định có người xác nhận/ngày/phạm vi; task bị chặn ghi Q-ID cụ thể.

## Demo và nghiệm thu sprint

Đọc discovery, chọn một task bất kỳ và xác định được files, rule, test, phụ thuộc.

- [ ] Các task trong phạm vi đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [ ] Không task bị chặn hoặc kiểm tra chưa chạy bị ghi thành DONE.
- [ ] API/database/UI liên quan khớp nhau; migration kiểm tra fresh + upgrade nếu có.
- [ ] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [ ] Chưa tự triển khai sprint kế tiếp.

## Nhật ký thực hiện

Chưa có nhật ký implementation. Khi làm, thêm entry với: ngày, Task ID, trạng thái trước/sau, files, kiểm tra và PASS/FAIL/NOT_RUN, quyết định/Q-ID, rủi ro còn lại, việc tiếp theo, commit nếu có. Với S00, bằng chứng khảo sát/tài liệu nằm trong STATUS.json; các rule cần khách xác nhận vẫn còn mở.

30/09/2026 — Review T03: các quyết định nội bộ được xác nhận tại ADR-004–009 đã có implementation/tests tương ứng. T03 IN_REVIEW vì rule/mapping khách, môi trường pilot, retention và UAT còn cần người xác nhận. Không chặn lại S03 nội bộ đã đủ quyết định; không tự đóng các câu hỏi production.
