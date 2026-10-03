# Sprint 08 — Tiến độ, dashboard và báo cáo từ dữ liệu thật

Trạng thái theo [STATUS.json](../STATUS.json). **DONE nội bộ ngày 30/09/2026**, nhánh `feature/sprint-08-reporting` base develop 3355cfc, giữ working tree S01–S07 chưa commit. Người dùng đã chốt [ADR-008](../../decisions/ADR-008-internal-reporting.md); S07 đã DONE nội bộ và có review. Ước lượng ban đầu: **5–8 ngày công**, chưa phải lịch cam kết.

## Mục tiêu

Tổng quan, Tiến độ, Phân tích dùng cùng dữ liệu thật và export XLSX có nguồn đối chiếu. Chỉ thành viên nội bộ theo quyết định người dùng; chưa mở customer view.

## Phụ thuộc và điều kiện vào

S07; chốt công thức tỷ lệ OK/NG/P/Fix/NA, scope/build và ngày báo cáo.

Đọc [discovery](../01-discovery.md), [business rules](../02-business-rules.md), [API](../05-api-contract.md), [database](../04-database-and-migrations.md) và [quy trình thực hiện](../06-execution-guide.md). Kiểm tra điều kiện tiên quyết bằng code và kết quả kiểm thử thực tế; không tự làm các sprint tiền nhiệm nếu chưa hoàn thành.

## Ngoài phạm vi

Không hứa dự đoán release chính xác, không sync Notion tự động, không KPI nhập tay song song.

## Thứ tự task

### S08-T00 — NA và chốt/mở lại đợt theo Q08

- **Mục tiêu:** hoàn thiện phần NA/chốt đợt hoãn từ S05, theo câu trả lời người dùng tại ADR-008, trước khi tính mẫu số báo cáo.
- **Backend/database:** V9 bổ sung quyết định phạm vi NA có reason/PM/time, không xóa run hoặc sửa attempt; chốt cycle khi không còn Chưa chạy/P trong scope áp dụng, NG đã liên kết bug, PM ghi nhận tồn đọng. Cycle đóng khóa ghi; PM mở lại có lý do. Version/project lock, lịch sử bất biến.
- **Frontend/API:** thao tác PM trên runner/cycle, trạng thái NA tách execution cũ, chốt/mở lại có lý do và thông báo điều kiện thiếu. Không cho Tester thực hiện bằng request trực tiếp.
- **Kiểm chứng:** TDD quyền, cross-project, stale version, NA giữ history, điều kiện chốt/rollback, chặn ghi vào cycle đóng và mở lại; fresh/upgrade MySQL; UI flow.
- **DoD:** FE/BE/MySQL/API nhất quán, tests/build/ECC review PASS, có bằng chứng trước DONE. Đây là phạm vi được người dùng mở rộng rõ ràng ngày 29/09/2026, không suy từ metric.

### S08-T01 — Metric definitions và API tổng hợp

- **Feature:** Metric definitions và API tổng hợp
- **Objective:** Chốt mẫu số, đơn vị đếm không trùng, múi giờ/thời điểm số liệu (asOf) và dữ liệu tổng hợp trả cho UI.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** docs/business/metrics.md; docs/api/openapi.yaml; Backend/**/reporting/; Backend/src/test/
- **Backend changes:** Read queries thống nhất source, permissions/filter; ngày theo project.
- **Frontend changes:** Xác định thông báo khi trống/chưa đủ dữ liệu và hiển thị rõ phạm vi số liệu.
- **Database changes:** Index theo query plan; chỉ thêm view/projection khi có lý do, không tự thêm bảng bộ đếm.
- **API changes:** Overview/progress/quality; metricDefinitionVersion/asOf/scope.
- **Business rules:** Phân biệt số công việc, số bug không trùng, kết quả mới nhất theo run item và số lần thực thi; quy định rõ kết quả khi mẫu số bằng 0.
- **Tests / bằng chứng cần có:** Fixture có nhiều lần chạy, quan hệ N:N, nhiều build, bug mở lại, NA/P và thời điểm chuyển ngày; đối chiếu API với truy vấn SQL.
- **Dependencies:** S07 + metric approval.
- **Risk:** Công thức nhìn hợp lý nhưng sai quy tắc khách hàng; đếm trùng sau khi join.
- **Definition of Done riêng:** Metric truth tables và contract tests PASS; mỗi con số truy về nguồn.

### S08-T02 — Nối các dashboard/report UI

- **Feature:** Nối các dashboard/report UI
- **Objective:** Thay số mẫu và biểu đồ tĩnh bằng dữ liệu API trong cùng phạm vi.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Frontend/src/app/modules/ProjectOverview.jsx; Frontend/src/app/modules/TestingOverview.jsx; Frontend/src/app/modules/KpiSummaryBar.jsx; Frontend/src/app/pages/ProgressPage.jsx; Frontend/src/app/pages/AnalysisPage.jsx; Frontend/src/app/features/work-items/HomePage.jsx
- **Backend changes:** Tối ưu projection phục vụ UI, paging activity feed.
- **Frontend changes:** Trạng thái tải/trống/thử lại và phạm vi dành cho khách; lọc build/cycle, làm mới có asOf; giữ sáu mục menu, font và màu hiện có.
- **Database changes:** N/A ngoài indexes được đo.
- **API changes:** Reporting clients tập trung.
- **Business rules:** Không realtime giả: refetch/invalidate sau mutation; polling có chỉ rõ freshness, WebSocket ngoài scope.
- **Tests / bằng chứng cần có:** E2E ghi execution → dashboard thay đổi đúng; số lượng theo bộ lọc khớp giữa các view; khách không xem được dữ liệu nội bộ; build.
- **Dependencies:** S08-T01.
- **Risk:** Một widget còn lấy mock, cache cũ gây sai báo cáo.
- **Definition of Done riêng:** Không còn KPI mock trong chế độ thật; đối chiếu một dataset cho mọi view PASS.

### S08-T03 — Xuất báo cáo và truy xuất nguồn

- **Feature:** Xuất báo cáo và truy xuất nguồn
- **Objective:** Snapshot báo cáo kèm phạm vi và thời điểm để đối chiếu.
- **Files affected (đường dẫn dự kiến, tương đối từ repo):** Backend/**/reporting/; Frontend/src/app/features/reports/; docs/reports/
- **Backend changes:** Export safe CSV/XLSX theo mẫu đã chốt, audit permission/size/time cap.
- **Frontend changes:** Trạng thái tải xuống/thử lại và dữ liệu nguồn; không tự gửi ra bên ngoài.
- **Database changes:** Snapshot metadata nếu cần audit; migration chỉ khi có nhu cầu rõ.
- **API changes:** Report export request/status/download nếu asynchronous.
- **Business rules:** Export và màn hình phải cùng definition/scope; chống formula injection.
- **Tests / bằng chứng cần có:** Tổng trong tệp xuất khớp API, Unicode, escape nội dung ô, quyền tải xuống và giới hạn kích thước.
- **Dependencies:** S08-T01/T02 + template report.
- **Risk:** Chèn công thức Excel, khách nhìn thấy cột nội bộ, tác vụ xuất quá lớn.
- **Definition of Done riêng:** Tệp xuất kiểm tra được và totals khớp; giới hạn/không có forecast được mô tả.

## Demo và nghiệm thu sprint

Một execution/retest làm đổi đúng số liệu liên quan; số bug không tăng chỉ vì nhiều case cùng liên kết tới bug đó.

- [x] Các task trong phạm vi đạt DoD riêng và [DoD chung](../06-execution-guide.md).
- [x] Không task bị chặn hoặc kiểm tra chưa chạy bị ghi thành DONE.
- [x] API/database/UI liên quan khớp nhau; migration kiểm tra fresh + upgrade nếu có.
- [x] Nhật ký, STATUS.json, docs và các quyết định được cập nhật.
- [x] Chốt bằng chứng S08 trước khi chuyển S09 theo quyền tiếp tục tuần tự.

## Nhật ký thực hiện

29/09/2026 — bắt đầu S08 sau kiểm chứng S07; ADR-008 chốt cả ba quyết định. Thêm T00 hoàn thiện NA/chốt/mở đợt trước metric. Áp dụng đủ ECC như [quy trình skill](../../development-skills.md); chưa có implementation/kiểm chứng S08 để báo DONE. Không commit/push/merge/deploy.

30/09/2026 — S08-T00/T01/T02/T03 DONE theo ADR-008. Xem [review ECC và bằng chứng](../../reviews/2026-09-30-sprint-08.md): FE 134 tests/build, BE full 96 trước review cuối + targeted 27/22 sau sửa, gate module >=80%, V9 fresh/upgrade/local, browser PM/Tester và Excel tải thực tế khớp số liệu. V1–V9 bất biến; 52 bảng ứng dụng. Tiếp tục S09 Redmine sandbox theo ADR-009; chưa commit/push/merge/deploy.
