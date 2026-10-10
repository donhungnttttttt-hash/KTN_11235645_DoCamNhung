# API đợt và báo cáo nội bộ — S08

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
