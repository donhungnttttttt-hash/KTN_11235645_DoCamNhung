# Công bố bằng chứng còn lại, giữ nguyên code — 19/10/2026

Người dùng yêu cầu kiểm tra và push hơn 2.000 file còn hiện trong Git, đồng thời yêu cầu không ảnh hưởng code. Commit source trước đó là `953c588e614076c1c5a32a4c803671474f03e418` trên `system-design`. Đợt này chỉ bổ sung artifact lịch sử, `.gitignore` và tài liệu bàn giao; không sửa source ứng dụng, không chạy lại các script lịch sử, không migration/restart/merge/deploy.

## Phân loại đầy đủ

Kiểm kê đầu lượt ghi **2.348 file / 327.757.398 byte**, gồm một helper kiểm kê vừa tạo. Tất cả file đã được hash trước khi phân loại. [Manifest](../../var/evidence-push-2026-10-19/publication-manifest.json) ghi từng đường dẫn, dung lượng, SHA-256 và lý do giữ local.

- **Công bố 902 file / 37.629.210 byte**: receipt test/build, summary coverage, ảnh UI, biên bản review, fixture và mã công cụ lịch sử đã rà soát. Kết quả RED/FAIL, ảnh trước sửa và ảnh chụp thất bại vẫn giữ đúng nhãn; không sửa chúng thành PASS.
- **Giữ nguyên tại máy 1.446 file** thuộc các nhóm dưới; thêm rule ignore tương ứng để chúng không hiện lẫn với source. Không xóa hoặc di chuyển file gốc.
- Manifest công bố, README thư mục, báo cáo này và các cập nhật tài liệu/ignore là metadata mới ngoài 902 artifact ban đầu.

| Nhóm giữ local | File | Lý do |
| --- | ---: | --- |
| Coverage chi tiết sinh tự động | 1.219 | HTML, nguồn được đánh dấu coverage, JS/CSS đi kèm và XML JaCoCo/coverage; giữ summary và receipt kết quả test riêng. |
| Runtime/compile/machine output | 34 | Hai JAR khoảng 83 MB mỗi file, class, args, PID, stderr, exec và NUL manifest. |
| Tài liệu gốc/giải nén | 172 | Nội dung đầy đủ, hình và sơ đồ trích từ KL.zip; báo cáo đối chiếu được lưu riêng trong docs. |
| Bản sao trước sửa/format | 8 | Bản sao `.before` và báo cáo trước định dạng; không phải source đang chạy. |
| Snapshot DB, provisioning và metadata vault | 5 | Một SQL snapshot, một SQL cấp quyền schema test và ba file thông tin vault/ACL cục bộ. SQL provisioning không được xác định có mật khẩu literal; vẫn là cấu hình cục bộ. |
| Helper chứa credential literal | 6 | Script cũ dùng thông tin đăng nhập ghi trực tiếp khi gọi HTTP login hoặc cấu hình DB; không in giá trị trong báo cáo. |
| Patch tập hợp tạm | 1 | `baseline.patch`; mẫu password tìm thấy thuộc test context, không được gọi là credential thật đã xác nhận. |
| Helper kiểm kê đầu lượt | 1 | Công cụ chuẩn bị bàn giao, không thuộc bằng chứng sản phẩm. Các work file mới của chính đợt này cũng được ignore. |

Các file vốn đã bị ignore trước đợt này không được thêm cưỡng bức. Những file `var/` đã tracked từ trước vẫn giữ nguyên; rule ignore không tự xóa lịch sử hoặc bỏ tracking của chúng.

## Rà soát trước khi công bố

Quét văn bản tìm private key, provider/GitHub/AWS token, JWT, bearer/cookie, URL chứa credential và field secret literal. Ba reviewer độc lập đọc nhóm được giao, không chạy script hoặc ghi dữ liệu nghiệp vụ. Sáu helper có credential thật được giữ local theo đường dẫn cụ thể trong manifest. Các ứng viên test-context/schema fingerprint được phân biệt với secret thật; không dùng một regex hit làm kết luận rò rỉ.

XML test có kiểm thêm thuộc tính `name/value`: reviewer đọc 56 file và 2.715 thuộc tính, không phát hiện credential khác. Những JSON lớn về database chứa schema, ID/count/hash được phân biệt với SQL dump. Các ảnh login/config/account và sáu ảnh AI/palette được kiểm trực quan ở nhóm có khả năng hiển thị credential; không có secret hiển thị trong các ảnh này. Không tuyên bố đã OCR/kiểm trực quan lại mọi pixel của toàn bộ ảnh lịch sử.

Skill `code-review` dùng cho rà độc lập và phân loại bằng chứng; `verification-before-completion` dùng cho allowlist, hash, đối chiếu source tree và xác nhận remote. Đợt này không thay hành vi nên không chạy lại test ứng dụng. Kết quả 1.100 test frontend/build ở lượt trước vẫn là checkpoint của cùng source, không gọi thành một lượt test mới.

## Bảo toàn source và dữ liệu

Giữ nguyên tree Git của ba thư mục so với commit `953c588`:

| Thư mục | Git tree trước bàn giao |
| --- | --- |
| Backend | `ca75058d5f1e878ff8830e9e2afa2354004a0e55` |
| Frontend | `8e7b36ebd576de0c586777f8240601dce4a987e6` |
| scripts | `549f62e4c8cde0663a0ff45937f2c87a825de239` |

Stage bằng danh sách đường dẫn cụ thể; không `git add .`, không force-add file đã loại, không force-push. Kiểm lại hash toàn bộ 2.348 file gốc, source working tree và nội dung index trước commit; sau push đối chiếu HEAD với `origin/system-design`. Các receipt, script và ảnh lịch sử được giữ nguyên byte trong working tree; Git có thể chuẩn hóa LF/CRLF như cấu hình repository hiện có. Không sửa artifact lịch sử chỉ để loại cảnh báo khoảng trắng.

Các đường dẫn artifact thuộc nhóm đã công bố sẽ mở được cùng repository; đường dẫn đến nhóm giữ local vẫn chỉ dùng trên máy làm việc. [README var](../../var/README.md) giải thích cách đọc và giới hạn sử dụng script lịch sử. Trạng thái FR-12/S11 vẫn IN_REVIEW; công bố bằng chứng không đóng các khoảng trống UAT đã ghi.
