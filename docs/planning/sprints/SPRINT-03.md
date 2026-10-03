# Sprint 03 — Dự án, danh mục, quy tắc khách hàng và sổ tay

Trạng thái theo [STATUS.json](../STATUS.json). Kế hoạch lập 22/09/2026; chức năng nội bộ đã được bổ sung trong đợt hoàn thiện review 30/09/2026, xem nhật ký cuối file. Ước lượng ban đầu: **5–8 ngày công**, chưa phải lịch cam kết.

## Mục tiêu

Chọn đúng ngữ cảnh dự án; môi trường, bản build, thiết bị và quy tắc không còn là văn bản rời rạc. Ngữ cảnh đợt kiểm thử được nối tiếp khi triển khai cycle ở S05.

## Phụ thuộc và điều kiện vào

S02; mẫu rule bug và quyền cấu hình cần chốt trước publish rule.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không lưu kho mật khẩu, không rule scripting engine, không tự gửi Slack/Notion.

## Thứ tự task

### S03-T01 — Project và catalog

- **Feature:** Project và catalog
- **Objective:** Thiết kế/triển khai project memberships, build/env/device/milestone/category.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/api/openapi.yaml; Backend/**/project/; Backend/**/catalog/; Backend/src/main/resources/db/migration/; Frontend/src/app/features/projects/; Frontend/src/app/components/Header.jsx
- **Backend changes:** Service project-scoped, archive validation, membership permissions.
- **Frontend changes:** Project selector nối API, catalog forms tối thiểu, empty/loading/errors.
- **Database changes:** Migration projects/members/catalog; unique per project, FK và archive.
- **API changes:** Projects/members/catalog endpoints theo inventory.
- **Business rules:** Build/milestone là hai khái niệm khác; không xóa dữ liệu đã được history tham chiếu.
- **Tests / bằng chứng cần có:** Kiểm tra FK và API không cho tham chiếu sai dự án; đổi projectId/ID trực tiếp sang dữ liệu ngoài membership phải bị từ chối; mã trùng, lưu trữ mục đang được tham chiếu, chuyển dự án và migration.
- **Dependencies:** S02.
- **Risk:** Dữ liệu giữa project bị trộn, mock project vẫn hiển thị.
- **Definition of Done riêng:** Hai project tách dữ liệu/quyền; UI dùng catalog thật và tests PASS.

### S03-T02 — Ruleset phiên bản

- **Feature:** Ruleset phiên bản
- **Objective:** Chuẩn hóa các trường bắt buộc và rule tiêu đề theo khách.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/business/bug-rules.md; Backend/**/rules/; Backend/src/main/resources/db/migration/; Frontend/src/app/features/project-settings/
- **Backend changes:** Ruleset version/publish và server validation policy có type an toàn.
- **Frontend changes:** Form cấu hình field required/reference, preview rule, hiển thị version áp dụng.
- **Database changes:** Rule versions immutable, publish audit; không viết SQL động từ rule.
- **API changes:** Rule list/create/publish; DTO exact field constraints.
- **Business rules:** Chưa có rule Nhật thật thì dùng fixture đánh dấu DEMO, không gọi đã đạt chuẩn khách.
- **Tests / bằng chứng cần có:** Quy tắc tiêu đề, thiết bị, môi trường, bản build và bước tái hiện; cấu hình không hợp lệ; phiên bản rule mới không sửa lịch sử cũ.
- **Dependencies:** S03-T01 + khách cung cấp rule/format.
- **Risk:** Hardcode format giả; rule update làm ticket cũ invalid âm thầm.
- **Definition of Done riêng:** Bộ quy tắc có nguồn, phiên bản và người duyệt; kiểm thử rule PASS; dữ liệu minh họa tách khỏi dữ liệu thật.

### S03-T03 — Sổ tay dự án

- **Feature:** Sổ tay dự án
- **Objective:** Tập trung quy tắc, lưu ý và nguồn đặc tả theo quyền.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/**/handbook/; Backend/src/main/resources/db/migration/; Frontend/src/app/modules/CatHandbook.jsx; Frontend/src/app/features/handbook/
- **Backend changes:** Version nội dung, visibility, sanitize, audit; tài khoản chỉ ghi hướng dẫn/reference tới nơi quản lý secret.
- **Frontend changes:** Gắn sổ tay trong phần project/kiểm thử đang có, giữ sáu top menu.
- **Database changes:** Handbook revisions + visibility; không bảng password plaintext.
- **API changes:** Read/write handbook, error/permissions.
- **Business rules:** Thông tin internal không xuất customer; không lấy AI làm nguồn xác nhận spec.
- **Tests / bằng chứng cần có:** Hiển thị nội dung an toàn trước XSS, lịch sử chỉnh sửa, khách hàng không đọc được nội dung nội bộ và kiểm tra liên kết hợp lệ.
- **Dependencies:** S03-T01.
- **Risk:** Rò rỉ credential qua hướng dẫn, thay đổi menu quá phạm vi.
- **Definition of Done riêng:** Nội dung thật lưu/reload được, quyền và revision test PASS.

## Demo và nghiệm thu sprint

Admin tạo dự án; PM hoặc Admin là thành viên quản lý danh mục, thành viên và công bố quy tắc nội bộ DEMO. Quyền tạo tài khoản hệ thống không thay đổi. Người xem chỉ đọc được sổ tay được phép; đổi URL sang dự án ngoài quyền phải bị từ chối.

- [x] Các task đạt DoD trong phạm vi nội bộ; rule khách hàng vẫn có gate riêng.
- [x] Không ghi browser/UAT chưa chạy thành PASS.
- [x] API/database/UI khớp nhau; migration V11 fresh + upgrade PASS.
- [x] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [x] Giữ phạm vi review đã được yêu cầu; chưa mở S11 khi gate S10 chưa đủ.

## Nhật ký thực hiện

Các mốc review bên dưới giữ nguyên theo thời điểm; mục cuối là trạng thái mới nhất.

## Review 28/09/2026

Mở lại IN_REVIEW, không chấp nhận kết luận DONE chỉ từ compile. Đã sửa nền dùng chung cho S04: active membership, chặn ADMIN ngoài dự án, tạo project có updated_by, trả version mới, bảo vệ PM cuối, scope/soft archive builds, quét nested repositories.

Còn lại theo task:
- T01: nối đầy đủ nút thêm/sửa/gỡ thành viên, optimistic concurrency/audit các mutation catalog/membership, validation catalog, kiểm thử các màn settings.
- T02: đối chiếu lại contract client/controller (đợt 30/09 xác nhận route thực tế là `/bug-rule-versions`), UI/version validation/audit và kiểm thử. Q02 chưa có rule khách chính thức, không tự publish rule khách.
- T03: nối sổ tay với API, xác định nội dung/visibility nội bộ an toàn, kiểm thử render không thực thi HTML và version/audit.

Chi tiết: [báo cáo review](../../reviews/2026-09-28-sprints.md). Hoàn thiện các mục này trước nghiệm thu S03/S05.

## Hoàn thiện review 30/09/2026

Đã nối UI thông tin/thành viên/năm catalog; giới hạn input theo schema, version và audit các mutation; bảo vệ PM cuối và không nâng quyền hệ thống. Ruleset nội bộ DEMO có typed policy, nguồn, draft/publish/history và snapshot trên bug mới; không áp hồi tố. Sổ tay lưu revision INTERNAL và render văn bản thuần. V11 bổ sung lock_version và FK rule cùng project, giữ V1–V10.

Demo qua **Cài đặt dự án** (`#/settings`), dự án riêng DEMO-REVIEW-0930. Bằng chứng, coverage, trạng thái cuối và hạn chế tại [review hoàn thiện](../../reviews/2026-09-30-review-completion.md). Rule khách hàng thật vẫn là gate S00/S11; mẫu DEMO không thay thế xác nhận khách. Không commit/push/merge.

Kết luận: T01/T02/T03 DONE nội bộ sau full 171 BE tests/verify và 181 FE tests/build PASS; fresh/upgrade V11 và demo browser đã kiểm chứng. Chưa nghiệm thu rule khách hoặc pilot.
