# Issue: thông tin Feature hiện tại — 25/10/2026

## Phạm vi đã hoàn tất

Người dùng chốt **luôn hiển thị thông tin Feature hiện tại**, không giữ bản chụp tại thời điểm tạo Issue.

- Chi tiết Issue có khối riêng: tên Feature, môi trường/server, mô tả Feature. Trường rỗng có thông báo rõ; nội dung nhiều dòng được giữ và tự xuống dòng; hiển thị plain text.
- Giữ liên kết mở Feature, file và case. Thông tin Feature tách biệt với nội dung riêng của Issue.
- Mở lại hoặc bấm “Tải lại Issue” lấy dữ liệu Feature mới nhất. Không polling; việc sửa Feature trong một cửa sổ khác chưa tự cập nhật một Issue đang mở cho đến khi tải lại.
- API thêm `featureEnvironment`, `featureDescription` từ join `testing_features` cùng project đang có. Không thêm query hoặc migration; không sửa snapshot lịch sử, input cập nhật Issue, version hay quyền.
- Áp dụng Bug, QA và Bug monkey qua component chi tiết chung.

## Skill → cách dùng → bằng chứng

| Skill | Cách áp dụng | Bằng chứng |
| --- | --- | --- |
| `tdd-workflow` | Viết test hành vi trước implementation frontend/backend; kiểm tra sửa Feature và đọc lại Issue | RED: 3 FE test thiếu region, 2 native test thiếu field. GREEN: kết quả dưới đây |
| `frontend-patterns` | Tái sử dụng state/fetch/reload hiện có; semantic section/dl; text không HTML; CSS responsive theo vùng chứa | Test reload giữ nháp, escape text, placeholder; Chrome thực tế |
| `verification-loop` | Kiểm chứng source, build, MySQL riêng, Chrome và đối chiếu dữ liệu sau restart | Maven/Vitest/Vite/JDT và fingerprint bên dưới |

## Kiểm chứng

- Frontend nhóm `src/app/features/work-items`: **89/89**, 12 file PASS. Sau khi bổ sung thêm trường hợp field thiếu, chạy lại riêng `FeatureIssueDetail.test.jsx`: **22/22 PASS**. Không suy là đã chạy lại toàn bộ frontend.
- Coverage riêng `FeatureIssueDetail.jsx`: statements **94.11%**, branches **80.06%**, functions **88.73%**, lines **94.79%**. Không phải coverage toàn hệ thống.
- Backend `FeatureIssueContextNativeTest,FeatureIssueServiceTest`: **5/5 PASS**, Maven `verify`/package PASS. Hai native test chạy MySQL schema riêng `tms_userstest_72a0be8b2b7e`, fixture trong transaction rollback, không ghi main.
- Native test cho Bug/QA xác nhận dữ liệu mới sau khi sửa Feature; thông tin rỗng; `description`, `version`, `updatedAt` và lịch sử Issue giữ nguyên; không đọc Issue bằng project khác.
- Vite build PASS; còn cảnh báo chunk JS khoảng **514.77 kB**. Không thay đổi chia bundle trong tác vụ này.
- Eclipse/JDT: **330 source, 0 error, 0 warning**.
- Chrome trên `127.0.0.1:5173`: mở Issue `DEMO-REVIEW-0930-2` từ Quản lý lỗi, thấy Feature **Test 25 tháng 10**, environment **idec-test100**, mô tả **Sử dụng .test ST app Duolingo**; bấm tải lại thành công. Đã xem screenshot trực tiếp; lần lưu screenshot bổ sung bị timeout nên không có artifact ảnh được xác nhận trên đĩa.
- Runtime 8080 đã khởi động từ artifact kiểm chứng, health UP; giữ Flyway target **33**, không áp dụng V34 demo. Fingerprint trước/sau giữ nguyên **118 identity_users, 144 project_memberships, 33 flyway_schema_history**. Không tạo/sửa Issue hoặc Feature trên main trong kiểm thử Chrome.
- `git diff --check`: PASS.
- `node scripts/Check-Contracts.cjs`: PASS (STATUS JSON, routes/DTO và liên kết tài liệu; kiểm tra cấu trúc, không thay HTTP test).

## Giới hạn và bàn giao

Không chạy lại toàn bộ regression/backend hoặc UAT mọi quyền/thiết bị. Test native sửa Feature chạy qua service thật và MySQL; Chrome đọc API thật trên dữ liệu có sẵn, không thực hiện sửa Feature trên main. CSS thích ứng theo vùng chứa đã triển khai nhưng chưa kiểm tra viewport điện thoại riêng trong lượt này.

Giữ nguyên các thay đổi tài liệu Arena có sẵn. Không commit/push/merge. S11/FR-12 vẫn IN_REVIEW; kết quả ở đây chỉ đóng phạm vi bổ sung Feature vào chi tiết Issue.

Artifact cục bộ (ignored): `Backend/target/user-profile-verification/issue-context-backend.log`, `issue-context-backend/target/surefire-reports`, `Frontend/coverage/issue-context`, `Backend/target/java-diagnostics`.

## Bổ sung form Tạo Issue từ case — cùng ngày

Người dùng chỉ ra form tạo chưa có thông tin này. Phần chi tiết trước đó đã làm đúng nhưng bỏ sót form tạo dùng API `/issues/context` riêng.

- API context trả thêm môi trường và mô tả Feature hiện tại từ truy vấn Feature đã có, giữ kiểm tra phạm vi case/file/project.
- Tách `IssueFeatureContext` dùng chung cho chi tiết và form tạo từ case. Hiển thị tên, môi trường/server, mô tả trước ô chọn Bug/QA; tên file và số case vẫn có nhãn riêng.
- Mô tả Feature chỉ đọc, không điền vào mô tả/câu hỏi Issue và không gửi trong payload tạo. Không thêm migration, polling hoặc thay logic lưu.
- `tdd-workflow`: RED một FE test thiếu khối thông tin, một MySQL native test thiếu `featureEnvironment`; GREEN sau sửa. `frontend-patterns`: component dùng chung, semantic section/dl, responsive và plain text. `verification-loop`: kiểm tra các bước dưới và ghi rõ giới hạn.
- **91/91 frontend** trong 12 file work-items PASS. **6/6 backend** (3 native + 3 service) PASS, Maven verify/package PASS. Native test nhập workbook vào schema test riêng, xác nhận context cập nhật sau khi sửa Feature và giữ nguyên nội dung case; fixture rollback.
- Vite build PASS, cảnh báo chunk 514.84 kB. JDT **330 source, 0 error, 0 warning**.
- Coverage gộp riêng `FeatureIssueForm.jsx` + `IssueFeatureContext.jsx`: statements94.11%, branches80.43%, functions89.47%, lines93.75%; không phải toàn frontend. Form riêng branch79.06%; component thông tin dùng chung 100%.
- Chrome: mở Feature17/file27, bấm Issue ở case1; accessibility tree xác nhận đầy đủ tên **Test 25 tháng 10**, environment **idec-test100**, mô tả **Sử dụng .test ST app Duolingo**, ô mô tả Issue còn rỗng. Không bấm lưu Issue trên main. Chụp ảnh Chrome bị timeout; không khẳng định đã kiểm tra bố cục bằng screenshot trong lượt bổ sung.
- Backend8080 chạy artifact `issue-create-context-backend`, healthUP, giữ Flyway target33. Fingerprint 118 users/144 memberships/33 migrations nguyên vẹn sau restart. Không commit/push. Không sửa luồng tạo monkey không gắn case trong lượt bổ sung này.
- Bằng chứng local: `Backend/target/user-profile-verification/issue-create-context-backend.log`, `issue-create-context-backend/target/surefire-reports`, `Frontend/coverage/issue-create-context`.
