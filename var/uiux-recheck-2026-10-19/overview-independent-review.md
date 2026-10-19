# Checkpoint review độc lập — Tổng quan dự án

Ngày 19/10/2026. **SOURCE_REVIEW / BROWSER_NOT_RUN / HTTP_NOT_RUN / DB_NOT_RUN**. Chỉ đọc source và ghi tài liệu này; không sửa sản phẩm, gọi API, chạy backend hay đổi runtime. Root là người duy nhất kiểm tra trình duyệt. Không chạy lại test đã PASS khi chưa có thay đổi hay nghi vấn mới cần tái hiện.

## Kết luận

Không tìm thấy lỗi nguồn đủ bằng chứng để chặn bản sửa này. Bố cục giữ Thông tin dự án ở cột trái, Trạng thái công việc và Mốc phát hành ở cột phải; dưới 960px chuyển thành một cột theo thứ tự thông tin trước. Việc phục hồi hai phần bên phải bám Feature Bug/QA hiện hành và metadata mốc phát hành, không gọi lại overview/handoff/retest cũ. Kết luận này không thay thế kiểm tra hiển thị, focus và bàn phím thực tế của root.

## Skill → công việc → bằng chứng

Áp dụng lại các SKILL.md đã đọc trong audit của cùng phiên: `frontend-patterns` (vòng đời effect, state theo project, lỗi và retry), `frontend-ui-engineering`/`ui-ux-pro-max` (bố cục, heading, responsive, bàn phím), `code-review` (đọc toàn bộ component và truy contract thay vì chỉ xem diff), `api-design`/`security-review` (phạm vi dữ liệu đọc và quyền phía server). Không dùng skill để đề xuất lại palette hoặc bố cục ngoài yêu cầu.

| Kiểm tra | Bằng chứng nguồn | Nhận xét |
|---|---|---|
| Phạm vi thay đổi Tổng quan | `Frontend/src/app/modules/ProjectOverview.jsx:68`, `:70`, `:71`, `:72`; `Frontend/src/app/styles/project-overview.css:32`, `:222` | Khối thông tin thay chỗ nội dung công việc gần đây; hai phần trạng thái/mốc vẫn hiện. CSS riêng có specificity cao hơn các breakpoint chung của work-items; không còn ép aside lên trước ở mobile. |
| Nội dung và heading | `Frontend/src/app/features/projects/ProjectInformation.jsx:5`, `:7`, `:9`, `:11`, `:16`; `Frontend/src/app/features/projects/project-information.css:3`, `:10`, `:16` | Nội dung SPIDER-PLUS gắn code chính xác; dự án khác dùng mô tả literal hoặc empty state. H1 → H2 khu vực → H3 nội dung. Link tài liệu có tên, focus style, rel an toàn; không kiểm tra URL bên ngoài. |
| Số lượng đúng contract | `ProjectOverview.jsx:19`, `:20`, `:21`, `:22`, `:35`, `:46`; `Frontend/src/app/services/api/featureIssues.js:9`; `Backend/src/main/java/vn/syp/tms/workitem/FeatureIssueService.java:80`, `:85`, `:91`, `:93` | Mỗi trạng thái đọc trang 0 size 1, dùng `totalItems` server thay vì số item trang hay số demo. Truy vấn chỉ tính Feature-context Bug/QA chưa xóa, Feature/file chưa lưu trữ. Tỷ lệ ghi rõ Issue ở trạng thái Hoàn thành (`closed`), không giả định mọi trạng thái kết thúc đều là closed. |
| Phân quyền | `ProjectOverview.jsx:64`, `:65`, `:66`, `:67`; `FeatureIssueService.java:50`, `:56`, `:57`, `:58`; `Backend/src/main/java/vn/syp/tms/catalog/CatalogService.java:192`, `:193` | Loading/lỗi project không để lại nội dung dự án cũ. Hai API đều enforce quyền đọc ở server; ADMIN không cần membership, người khác cần phạm vi project được phép. Không mở thêm thao tác ghi hay management report cho TESTER/DEV. |
| Chuyển project và response trễ | `ProjectOverview.jsx:16`, `:24`, `:25`, `:26`, `:29`, `:31`, `:32`, `:33`, `:72` | Summary remount theo ID; status GET nhận abort signal và không commit sau abort. Catalog chưa nhận signal qua API hiện có nhưng current guard chặn commit cũ. Không thấy rò dữ liệu project trước do response trễ. |
| Loading/lỗi/retry tách phần | `ProjectOverview.jsx:13`, `:14`, `:42`, `:43`, `:55`, `:56` | Lỗi status không chặn thông tin/milestone; retry mỗi phần có revision riêng. Khi retry, data cũ bị thay bằng loading. Không giả empty khi request lỗi. |
| Liên kết trạng thái | `ProjectOverview.jsx:48`; `Frontend/src/app/features/work-items/FeatureIssuesPage.jsx:11`, `:13`, `:18`, `:22`; `Frontend/src/app/pages/WorkBoardPage.jsx:17` | CTA truyền projectId hiện tại cùng status; trang danh sách đọc đúng bộ lọc và keyed theo project. Link không dựa vào project được chọn trước đó trong storage. |
| Mốc phát hành | `ProjectOverview.jsx:30`, `:31`, `:54`, `:57`, `:58`; `CatalogService.java:194`, `:195` | Hiện mốc chưa archived và ngày hạn hoặc trạng thái chưa đặt hạn. Article đọc metadata, không giả tiến độ Issue/milestone, không có CTA lọc không được hỗ trợ. |

Các tham chiếu rút gọn `ProjectOverview.jsx`, `FeatureIssueService.java`, `CatalogService.java` trong bảng dùng cùng đường dẫn đầy đủ đã nêu ở hàng trước.

## Tradeoff và giới hạn chưa phải lỗi đã xác nhận

- Mỗi lần mount/retry status có 10 GET song song theo catalog trạng thái, mỗi GET tối đa một item trả về; catalog milestone thêm một GET. Số request không tăng theo số trang Issue và không bulk đọc toàn bộ Issue. Tuy vậy mỗi list vẫn thực hiện COUNT và SELECT server: chưa đo latency/query cost, không gọi đây là performance PASS hoặc lỗi hiệu năng đã chứng minh.
- Mười response có transaction riêng, không tạo một snapshot nguyên tử. Issue đổi trạng thái đúng lúc tải có thể làm tổng tạm lệch giữa các thời điểm đọc. Chưa có yêu cầu snapshot nhất quán và chưa có bằng chứng tác động thực tế; không mở rộng task này sang backend summary endpoint.
- `Promise.all` cố ý không hiển thị số liệu một phần nếu một trạng thái lỗi. Phần thông tin và milestone vẫn hoạt động; retry status có thể tạo lại 10 request, request cũ bị abort khi effect cleanup. Không có thao tác ghi hoặc nguy cơ tạo dữ liệu trùng từ retry này.
- Ở <=960px, `project-overview.css:229` giới hạn milestone panel 235px và cho cuộn. Với danh sách dài, root nên kiểm tra khả năng đọc mốc cuối bằng bàn phím trên browser hỗ trợ; markup mới chỉ có article, không có `tabIndex` riêng (`ProjectOverview.jsx:58`). Chưa xác nhận lỗi vì hành vi tự focus vùng cuộn phụ thuộc browser; không tính đây là finding đã tái hiện.

## Bằng chứng test và phần còn thiếu

Root báo **RED 5 → GREEN 10** cho các suite overview/permissions. Reviewer đọc cả `ProjectOverview.test.jsx`, `ProjectOverview.permissions.test.jsx`, `ProjectOverview.layout.test.jsx`; không nhận kết quả đó là lượt chạy độc lập của mình. Năm test layout dùng API giả lập và kiểm bố cục theo role/heading, count server thay demo, status URL, lỗi/retry status độc lập, empty state, catalog response cũ khi đổi project.

Test mang tên “does not show status or milestone responses…” (`ProjectOverview.layout.test.jsx:58`) chỉ chủ động trì hoãn catalog ở dòng60; không trì hoãn status hoặc assert abort signal. Source có cơ chế bảo vệ status, nhưng receipt hiện có không chứng minh riêng race đó. Milestone lỗi/retry, archived milestone, totalItems không hợp lệ và focus/scroll thực tế cũng chưa được test riêng trong năm test này. Không suy ra coverage từ tổng 10 PASS.

Đề nghị kiểm tra trình duyệt của root: desktop/mobile giữ thứ tự đúng; chọn status mở đúng project/filter; Tab/Enter CTA và link tài liệu; danh sách milestone dài cuộn tới cuối. Các trạng thái lỗi/race cần mock có kiểm soát nếu kiểm thêm, không tạo dữ liệu hay gọi provider để thử.
