# Import đúng 9 cột và giữ ô trống

## Tái hiện

Workbook người dùng chỉ định: `(タブレット)(#標準)テスト仕様書(未同期一覧機能)_VI.xlsx`, 28.694 byte, một sheet, **122 case**, 13 cột nguồn. SHA-256 `727c8b5e3517a54bd1af30a43a4ab277f084f37602fd41f8548da2cb627c7b71`.

Bộ lọc 9 trường đã có, nhưng còn hai vấn đề:

1. `FeatureService.preview` bắt buộc steps/expected/title từng dòng không trống. File thực tế bị chặn vì Các bước test tại dòng Excel 111 (ID 110) và 113 (ID 112) trống.
2. Bộ lọc chạy sau parser đầy đủ; dữ liệu/công thức, tiêu đề Status trùng nghĩa hoặc ô gộp ở các cột dư vẫn có thể làm hỏng import trước khi bị loại bỏ.

## Sửa

- Feature parser chỉ đọc giá trị của ID, No, Đối tượng test, Điều kiện tiên quyết, Các bước test, Quan điểm test, Hạng mục xác nhận, Kết quả mong đợi, Ghi chú thiết kế. Cột dư không tham gia mapping/kiểm tra nội dung case; dòng chỉ có dữ liệu ngoài chín cột không tạo case.
- Giữ ô nội dung trống. ID vẫn cần hợp lệ, duy nhất; giữ giới hạn độ dài và thông báo dòng cụ thể. Không tự điền bước test hoặc kết quả từ cột khác.
- Reader của Feature dùng cùng phép chọn cột để không đưa metadata nguồn trở lại. Status, Version, Issue, Người test vẫn do web quản lý. Dữ liệu Excel có sẵn ở các cột tương ứng không khởi tạo trạng thái/nhân sự web.
- Không đánh giá công thức. Công thức ở cột được chọn vẫn bị từ chối; ở cột bị bỏ qua không nhập vào case. Macro/liên kết ngoài nguy hiểm, giới hạn workbook và quyền dự án giữ kiểm tra hiện có. Luồng đọc lịch sử/thư viện ngoài Feature giữ adapter cũ.
- Export không gọi bộ đọc giá trị công thức ở cột đã bỏ qua; tải file gốc giữ nguyên byte. Giữ tọa độ cột nguồn cho chỉnh sửa, không làm lệch nội dung.
- Theo yêu cầu mới nhất, ô Status **72 × 72 px**; nút Lịch sử Status rộng **72 px**, dùng chung biến CSS, không ngắt chữ Unexecuted thành hai dòng. Nền toàn ô theo trạng thái.

## Kiểm chứng

- RED: test API ô nội dung trống trả 422; test cột dư có công thức bị từ chối trước khi lọc. Các test cũ dùng ô trống làm dữ liệu sai được đổi sang tiêu đề vượt giới hạn, vì ô trống nay hợp lệ.
- **36/36** unit test workbook ở 5 suite PASS.
- **27/27 FeatureIntegrationTest** trên MySQL cô lập PASS, Maven verify/package PASS. Có cả file thật: preview → commit → đọc đủ 122 case → đối chiếu các ô → xuất Excel → tải gốc nguyên byte. Bằng chứng `var/file-owners-20261114/import-final/workbook-acceptance.json` và `receipt.json`.
- Kiểm thử cột dư trùng Status/iPad, công thức, ô gộp và dòng chỉ có dữ liệu ngoài chín cột; vẫn chặn công thức hoặc tiêu đề trùng ở cột được chọn.
- **47/47 frontend test** import và bảng case PASS sau thay hướng dẫn; 510/510 hồi quy trước đó cho phân công/Issue. Vite build cuối PASS; cảnh báo chunk >500 kB còn có.
- JDT 392 source: 0 error, 7 warning ngoài phạm vi tại SystemAdminStartupTest; không thêm warning trong file sửa. `git diff --check` PASS. Không suy ra coverage từ số test; coverage frontend đo ở checkpoint phân công, chưa đo lại toàn hệ thống cho lượt import.

## Runtime

Backend local đã thay bằng artifact đã verify `24b99fdfcf7563e7ed50fc7ffe06b8a31b985d9d4e6df44d9e9a12e4042a42d9`, PID 12804, V41. Health qua proxy **5173 → 8080: UP**. Không thêm migration cho sửa import; không nhập workbook thử vào main.

Số lượng tài khoản/dự án/file/case/phân công giữ nguyên. Main có thêm bốn audit Status lúc 20:08:33–36 giờ Việt Nam: Unexecuted → OK → NG → P → NA trong lúc hệ thống đang được sử dụng. Đây là cập nhật phát sinh sau snapshot migration; giữ nguyên, không hoàn tác. Không dùng chênh lệch này để tuyên bố toàn database bất biến trong cả phiên làm việc.

Chrome vẫn chưa kết nối, nên chưa nghiệm thu hình render trực tiếp. Source và kiểm thử tự động hoàn tất; IN_REVIEW cho visual acceptance. Chưa commit/push.

Skills: prompt-master (prompt đã lưu tại docs/design/2026-11-14-nine-column-import-prompt.md), tdd-workflow, api-design; tiếp tục verification-before-completion. Phạm vi phân công/file/Issue ở báo cáo cùng ngày vẫn được bảo toàn.

## Kiểm tra tiếp theo yêu cầu “continue”

- Xác nhận lại health qua frontend proxy vẫn UP. Đối chiếu source: Status và Lịch sử Status dùng chung kích thước 72 px, màu nền lấy đúng token từng trạng thái.
- Chrome vẫn trả `The browser access host is unavailable`, native pipe cũng chưa kết nối; không có nghiệm thu trình duyệt mới.
- Thử kiểm tra API có đăng nhập bằng đúng ID Admin đang đăng ký trong hệ thống và mật khẩu bootstrap trong cấu hình local vẫn trả 401. Không sửa credential, không tạo tài khoản thử hoặc truy cập session của người dùng. Chưa xác nhận authenticated live smoke; không coi mật khẩu bootstrap là mật khẩu hiện tại của tài khoản.
- Đồng bộ các ghi chú STATUS cũ về runtime/import/Issue với checkpoint hiện tại. Không sửa thêm source ứng dụng, không chạy lại test đã PASS khi không có thay đổi hành vi, không commit/push.
