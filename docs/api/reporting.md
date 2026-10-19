# API đợt và báo cáo nội bộ — S08

## FixReports — phân tích và báo cáo quản lý ngày 19/10/2026

Contract hiện hành trong source dùng `P=/api/v1/projects/{projectId}/management-reports`; chỉ PM **của chính dự án** hoặc ADMIN, kể cả ADMIN không membership. Tester/DEV bị403, PM ngoài scope404; quyền AI đọc toàn hệ thống không mở quyền CRUD/xem API management-reports ngoài membership. [Contract chung](fixreports-contract.md), [metrics Feature](../business/metrics.md), [quyền](../business/permissions.md). Session, CSRF cho ghi, version và archive guard giữ hiện hành. Không xác nhận migration main DB/UAT từ source này.

| Method/path sau P | Contract |
| --- | --- |
| GET `/summary?featureId=` | Bỏ tham số cho toàn dự án; trả project{id,code,name,description},feature hoặc null,metrics{total,tested,ok,ng,pending,na,notRun,executionPercent},features,issues{type,status,total}[],asOf,timeZone=`Asia/Ho_Chi_Minh` |
| GET `/?page=0&size=20` | items/totalItems/page/size/totalPages; đúng scope, size1–100 |
| GET `/{id}` | id/projectId/featureId/title/markdown/version/createdAt/updatedAt |
| POST `/` | `{featureId?,title,markdown}`;201; không nhận draftId như liên kết sống với AI |
| PUT `/{id}` | `{title,markdown,expectedVersion}`;409 version cũ; chỉ sửa báo cáo |
| GET `/{id}/download` | bytes UTF8 `text/markdown` **đúng văn bản đã lưu**, attachment filename an toàn, private/no-store |
| POST `/preview` | `{featureId?,provider?,model?,requestKey}` → state READY/FAILED/GENERATING,draftId,failureCode,markdown khi READY; chưa lưu báo cáo |

Feature tùy chọn là target thật của report; server kiểm Feature thuộc project và đang hoạt động. metrics không dựa cycle/build/NA exclusion: tested=OK+NG+P+NA, denominator gồm NA, total0 cho progress0. Danh sách Feature có environment/caseCount/testedCaseCount/progressPercent; Issue counts gồm Bug/QA theo scope. Dữ liệu cũ bị reset không được bịa lịch sử người test hoặc kết luận nghiệm thu.

AI preview kiểm quyền trước cache/provider, dùng nguồn/mô hình hiện có; inference có giới hạn30s, client35s. Khi kết quả chưa chắc chắn/pending, lặp lại **cùng requestKey và provider/model/Feature**; thay nội dung scope/nguồn cần request mới. Preview giữ draft riêng, không autosave/overwrite buffer. UI cho áp dụng gợi ý rồi sửa/lưu rõ ràng. Provider facts giới hạn20 Feature và10kB; chọn Feature lọc trước limit. Nội dung nguồn là untrusted data, không lời lệnh; không gửi secret/private chat.

Saved report lưu độc lập trong project_management_reports, không có TTL/FK tới AI draft/chat. Cleanup draft/chat không được xóa bản đã lưu. Markdown giữ nguyên text khi save/update/download; HTML không chạy trong UI (escaped React renderer, link chỉ HTTP(S)). Sửa “10 lỗi” thành “8 lỗi” không sửa Issue10, case Status, phân công hoặc lịch sử. Xung đột/mạng lỗi giữ bản đang soạn; tải xuống lấy bản server đã lưu, không giả lưu bản editor chưa submit.

`GET /reports/summary` và `/reports/export.xlsx` cũ kiểm quyền management rồi410 `USE_FEATURE_REPORTS`; không tiếp tục expose totals cho Tester/DEV. `/analysis` tiếp nhận tiến độ/biểu đồ Feature và báo cáo, menu progress độc lập bị bỏ. Các mô tả S08/internal-v1 bên dưới là lịch sử, không công thức hoặc API hiện hành của Feature. Native persistence/cleanup và browser có bằng chứng riêng, không suy từ test API mock.

### Bổ sung 19/10/2026 — R01/R03/R07: status-report cũ chỉ đọc

`POST /api/v1/projects/{projectId}/status-reports` kiểm identity và quyền PM của chính dự án/ADMIN rồi trả410 `USE_FEATURE_REPORTS`, không kiểm narrative cũ, replay hay ghi báo cáo/membership. Session và CSRF vẫn áp dụng. Tester/DEV bị403, PM ngoài dự án404; quyền AI toàn cục không thay các quyền này.

`GET /api/v1/projects/{projectId}/status-reports?page=0&size=20` giữ lịch sử tác giả/nội dung và milestone metadata, trả `reports,milestones,canPost:false`; chỉ PM dự án/ADMIN. `GET /api/v1/admin/projects/{projectId}/status-reports` vẫn ADMIN-only. Composer cũ được thay bằng CTA tới Tổng hợp & Phân tích trong đúng dự án; Tester/DEV không fetch lịch sử quản lý. Đây là luồng khác với `management-reports` lưu Markdown mới ở trên. [Quyền](../business/permissions.md), [KPI Admin hiện hành](../business/metrics.md).

## Lịch sử S08 trước FixReports

Contract: [reporting.openapi.json](reporting.openapi.json). Nghiệp vụ: [metrics.md](../business/metrics.md), [ADR-008](../decisions/ADR-008-internal-reporting.md).

S10 tối ưu cách đọc: tổng hợp theo đợt/người phụ trách bằng SQL, chi tiết `source` phân trang trong DB (50 dòng). Tổng số, công thức, bộ lọc build/NA và cap 10.000 lượt giữ nguyên; trang ngoài phạm vi trả mảng rỗng và tổng số đúng. Export vẫn đọc snapshot tối đa 5.000 lượt để ghi đủ workbook. Tất cả truy vấn trong một transaction repeatable-read, không cache lẫn project/quyền.

Prefix `/api/v1/projects/{projectId}`. Session bắt buộc; đọc cho thành viên dự án đang active, ghi quyết định chỉ PM dự án. ADMIN toàn cục không thay PM. Ghi cần CSRF, reason và optimistic version. HTTP 200 trả tài nguyên hiện hành hoặc trang dữ liệu; 401 chưa đăng nhập, 403 sai quyền/CSRF, 404 sai dự án/tài nguyên, 409 xung đột hoặc điều kiện đợt chưa đạt, 422 dữ liệu đầu vào/giới hạn không hợp lệ.

| Method | Path | Nội dung |
| --- | --- | --- |
| POST | `/run-items/{id}/scope-decisions` | `{excluded, reason, expectedVersion}`; trả run có `excluded`, `scopeReason`, version mới; không ghi execution NA |
| GET | `/run-items/{id}/scope-decisions?page=0` | Lịch sử quyết định, 50/trang, actor/time/reason |
| POST | `/test-cycles/{id}/decisions` | `{action: CLOSE hoặc REOPEN, reason, outstandingReason?, expectedVersion}`; trả cycle |
| GET | `/test-cycles/{id}/decisions?page=0` | Lịch sử, snapshot điều kiện chốt, actor/time/reason; 50/trang |
| GET | `/reports/summary?cycleId=&buildId=&page=0` | Metric chung cho tổng quan/tiến độ/phân tích, nguồn 50 dòng/trang |
| GET | `/reports/export.xlsx?cycleId=&buildId=` | XLSX cùng definition/filter, thời điểm xuất riêng, ghi audit; tải xuống nội bộ |

Query không có bộ lọc thì **bỏ tham số**, không gửi chuỗi rỗng hoặc 0. Cycle/build phải thuộc dự án; có thể xem build đã lưu trữ. Chọn đợt nháp trả phạm vi rỗng. Không có bộ lọc lấy các đợt ACTIVE/CLOSED. `page` từ 0. Mỗi bản báo cáo giới hạn 10.000 run và 10.000 bug liên quan; export tối đa 5.000 run. Vượt giới hạn trả `REPORT_LIMIT`, không cắt nguồn âm thầm; lọc đợt để thu hẹp. Transaction timeout 30 giây; chưa phải chứng nhận tải production.

Response summary: `metricDefinitionVersion`, `asOf` (UTC ISO), `timeZone`, `project`, `filters`, `metrics`, `byCycle`, `byAssignee`, `daily` (14 ngày theo múi giờ dự án), `bugs` duy nhất, `source` có items/totalItems/page/size/totalPages. `source.resultCode` giữ kết quả gốc khi NA; `excluded` quyết định có tính vào mẫu số hay không. Rate là phần trăm, làm tròn 2 chữ số, null khi D=0.

Bug liên quan bao gồm liên kết execution hoặc phạm vi retest hiện hành do PM thêm, không nhân đôi bởi N:N. Lọc build chỉ tác động kết quả execution, không che bug của build khác; UI/Excel ghi rõ “mọi build”. Nhóm theo người phân công hiện hành là scope hiện tại; `daily` đếm attempt theo người thực hiện tại lần chạy, gồm NA sau này. Snapshot dùng MySQL REPEATABLE READ; `asOf` đánh dấu snapshot hiện tại, không hỗ trợ time travel.

NA làm hết hiệu lực coverage của bug chưa đóng chứa run đó; hủy yêu cầu retest OPEN và bump version bug. Đóng đợt giữ yêu cầu để đọc nhưng `canSubmit=false`, `cycleActive=false`; mở lại cho phép tiếp tục khi các điều kiện S07 vẫn đúng. `activate` không được dùng để mở lại CLOSED. Đóng có NG chưa gắn bug trả `UNLINKED_NG`; còn Chưa chạy/P trả `UNSETTLED_RUNS`; thiếu ghi nhận tồn đọng trả `REQUIRED_FIELD`. Không tự biến NG thành OK khi retest BUG_ONLY hoặc đóng bug.

Excel có các sheet Tổng hợp, Nguồn thực thi, Lỗi liên quan, Tiến độ theo đợt, Thực thi theo ngày. Header tiếng Việt, freeze/filter, nội dung người dùng ghi bằng cell kiểu STRING; không gọi `setCellFormula`. Xem [tài liệu Apache POI chính thức](https://poi.apache.org/components/spreadsheet/quick-guide.html). Không truyền password/token hoặc nội dung chứng cứ vào tệp. Báo cáo không được tự gửi đi.
