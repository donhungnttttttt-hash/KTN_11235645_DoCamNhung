# Bảng case theo mẫu spreadsheet và cột Issue riêng

## Phạm vi và trạng thái

Người dùng yêu cầu sửa bảng case, tách Issue thành cột riêng và hiện danh sách cạnh phải nút khi hover hoặc click. Hai ảnh trong yêu cầu mới trông giống nhau; đã thông báo dùng mẫu `feature/Fontend-design` ghi nhận tại [tài liệu tham chiếu](../design/2026-11-14-frontend-design-reference.md) làm chuẩn bố cục, giữ luồng Feature hiện hành.

**Source và kiểm tra tự động đã hoàn tất; trạng thái IN_REVIEW vì chưa nghiệm thu trực tiếp trên Chrome.** Không thay màn Chi tiết công việc trong lượt này. Không commit/push, migration, restart hoặc ghi dữ liệu nghiệp vụ.

## Thay đổi

- `TestingDocumentPage.jsx`: Issue là cột riêng ngay sau Status; Status giữ nút đổi kết quả và lịch sử. Context project/Feature/file/case truyền vào Issue không đổi.
- `TestingGridColumns.jsx`: độ rộng riêng theo nội dung (ID/No hẹp; điều kiện/bước/kỳ vọng rộng), chỉnh bằng kéo chuột hoặc phím trái/phải; Home/End giới hạn kích thước, bấm đúp đặt lại. Kích thước chỉ là trạng thái hiển thị của lần mở file, không ghi vào case/API.
- `testing-spreadsheet.css`: header xanh đậm, control gọn, toolbar phân nhóm, bảng rộng với đường kẻ nhẹ; cột có kích thước rõ thay cho chia đều. Version/ngày vẫn cùng phía với phân công/lịch sử; vùng focus rõ; Status và Issue căn giữa cột, căn trên theo hàng. CSS giới hạn trong màn bảng case; màn hẹp cho toolbar xuống dòng và bảng cuộn ngang.
- `CaseIssueAction.jsx`: hover/focus/click mở danh sách sát phải nút, khoảng cách 8px, căn theo mép trên. Nếu thiếu chỗ phía phải thì chuyển trái, giới hạn trong viewport; tính lại vị trí sau tải dữ liệu, khi cuộn/resize. Popup dùng portal ngoài bảng để không bị vùng cuộn cắt.
- `Issue (0)` cũng mở danh sách rỗng; người dùng bấm “Tạo Issue từ case” bên trong để mở form. Giữ thao tác bàn phím, Escape, click ngoài, chuyển con trỏ từ nút sang popup, quay lại focus sau đóng form, lỗi/retry và quyền tạo Issue.
- Giữ API lưu Status/version, lịch sử, phân công, lọc, phân trang, export và quyền hiện hành. Unexecuted tiếp tục dùng token xám bạc đã chốt.

Không đưa các nút demo chưa có API lưu (ví dụ toolbar định dạng của prototype) vào màn thật. Không sao chép dữ liệu/tên người dùng viết cứng từ nhánh mẫu. Vì chưa đối chiếu trình duyệt nên chưa khẳng định giống ảnh từng pixel hoặc đạt toàn bộ tiêu chí responsive/contrast.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| RED trước sửa | 7 test thất bại / 15 đạt: thiếu cột Issue, thiếu resize, click rỗng mở form, vị trí preview phía dưới; các test form cũ đã chuyển sang bước tạo riêng |
| GREEN tập trung | 70/70 test trong TestingDocumentPage, CaseIssueAction và qa-glue đạt sau sửa |
| Hồi quy + coverage cuối | **398/398 test, 41 file đạt**, `--maxWorkers=4`; không skip |
| Build frontend | PASS, 1.728 module; còn cảnh báo bundle >500 kB |
| Git whitespace | `git diff --check` PASS |
| Chrome trực tiếp | NOT_VERIFIED: `cua.createBrowserTab("chrome", "http://localhost:5173", ...)` và `cua.listBrowsers()` đều trả `The browser access host is unavailable` |

Lần hồi quy đầu chạy đồng thời với build có 1 test chạm timeout 5 giây (giữ nháp Issue), 397 test đạt. Đã chạy lại đầy đủ cùng phạm vi với 4 worker, không đổi assertion hoặc tăng timeout: 398/398 đạt. Không lấy kết quả lần lỗi làm bằng chứng đạt.

Coverage đo bằng V8, **chỉ ba component sửa**, không đại diện toàn hệ thống:

| Component | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| TestingDocumentPage | 81,87% | 84,81% | 76% | 88,33% |
| TestingGridColumns | 100% | 100% | 100% | 100% |
| CaseIssueAction | 90,4% | 81,44% | 82,5% | 95,34% |
| Tổng phạm vi | **87,35%** | **84,48%** | **80,15%** | **92,56%** |

Lệnh hồi quy cuối (từ `Frontend`):

```powershell
rtk proxy npm test -- --reporter=dot --maxWorkers=4 src/app/features/testing src/app/features/work-items src/app/features/qa src/app/routes src/app/layouts --coverage --coverage.include=src/app/features/testing/TestingDocumentPage.jsx --coverage.include=src/app/features/testing/TestingGridColumns.jsx --coverage.include=src/app/features/work-items/CaseIssueAction.jsx --coverage.reporter=text --coverage.reporter=json-summary --coverage.reportsDirectory=../var/testing-spreadsheet-20261114/coverage
rtk proxy npm run build
```

Bản coverage máy local: `var/testing-spreadsheet-20261114/coverage/coverage-summary.json` (đã ignore output sinh tự động).

## Skill → công việc → bằng chứng

- `frontend-ui-engineering`: áp dụng hai nhóm mật độ trong tham chiếu, riêng lượt này chỉnh spreadsheet; CSS scoped, resize bàn phím, popup không bị clipping → source và tests liên quan. Browser finish gate chưa đạt do công cụ không kết nối.
- `tdd-workflow`: viết kiểm tra hành vi mới trước sửa, giữ kiểm tra version/lưu lỗi/quyền/nháp → RED, GREEN, hồi quy và coverage nêu trên.
- `verification-before-completion`: chạy build/test mới và kiểm tra diff; công bố timeout lần đầu và giới hạn Chrome, không suy ra UI đã nghiệm thu từ test PASS.

## Việc còn lại để nghiệm thu giao diện

- [ ] Kiểm tra trực tiếp desktop, tablet, mobile và zoom: toolbar không che bảng, không tràn trang; chỉ bảng cuộn ngang.
- [ ] Xem hình render với tên file/nội dung dài; xác nhận mật độ và kích thước chữ đúng ý người dùng.
- [ ] Hover/click Issue ở giữa và sát mép, cuộn bảng, di chuyển sang popup, mở/đóng detail/create bằng bàn phím trên Chrome thật.

Các thay đổi backend/IDE và báo cáo Admin 500 có sẵn được giữ nguyên; không được tính là công việc của lượt này. Không thay quyết định phân công Ticket đang chờ làm rõ trong kế hoạch.
