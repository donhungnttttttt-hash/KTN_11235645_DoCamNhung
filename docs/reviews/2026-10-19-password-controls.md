# Rà soát nút mật khẩu và trạng thái điều khiển — 19/10/2026

## Yêu cầu và phạm vi

Người dùng báo màn đăng nhập có hai biểu tượng mắt và yêu cầu sửa các lỗi điều khiển tương tự. Đã xác nhận thêm: **Google Chrome, xuất hiện sau khi tự gõ mật khẩu**. Sau khi tải lại, người dùng xác nhận **“Hiện chỉ còn một mắt”**. Không coi CSS dành cho Edge là bằng chứng về nguyên nhân ban đầu trên Chrome.

Nhánh làm việc `system-design`, HEAD đầu tác vụ `9ccc73483faddde48d930c9607f2f2f7f6981761`. Giữ nguyên hai nhóm file có sẵn `docs/reports/` và `var/word-report-2026-10-19/` (104 file, baseline SHA-256). Không đổi backend, migration, dữ liệu nghiệp vụ, cấu hình nhà cung cấp hoặc thông tin đăng nhập; không restart, commit/push/merge/deploy trong tác vụ này. Có một lần thử đăng nhập bằng autofill sẵn của Chrome, bị từ chối; không thử đoán lại mật khẩu. Kiểm tra form dự án dùng fixture giả lập, không dùng API ghi thật.

## Kết quả theo vấn đề

| ID | Phát hiện / nguyên nhân | Xử lý và bằng chứng | Trạng thái |
| --- | --- | --- | --- |
| PC-01 | Hai mắt trên Chrome sau tự gõ theo người dùng | Source chỉ có một custom reveal; Chrome điều khiển được ở cả `localhost:5173` và `127.0.0.1:5173` chỉ hiện một mắt, kể cả xóa hết rồi gõ trực tiếp. Người dùng xác nhận sau reload chỉ còn một mắt. Không xác định được nguyên nhân ban đầu; không quy cho extension/Edge hay tuyên bố đã chứng minh sửa dứt điểm mọi Chrome. | KHÔNG CÒN TÁI HIỆN; user xác nhận |
| PC-02 | Login giữ `visible=true` khi gửi và sau lỗi đăng nhập; nút mắt vẫn bật khi input bị khóa | Đặt lại chế độ ẩn khi gửi; khóa mắt cùng request. Giữ autocomplete, mật khẩu không bị thay đổi khi toggle, Enter tại mắt không submit. RED hai lỗi type=text, sau sửa masking vẫn RED một lỗi nút không disabled, cuối cùng GREEN 14 test. | ĐÃ SỬA, test PASS |
| PC-03 | Edge có thể chèn mắt native bên cạnh custom eye | Thêm `::-ms-reveal` **chỉ trong `.auth-password`**, không tác động input tạo tài khoản vốn chỉ có native password. Theo tài liệu Microsoft; chưa chạy Edge. | ĐÃ THÊM CSS; Edge CHƯA KIỂM THỬ |
| PC-04 | PM vẫn mở tạo Tester khi logout còn pending | Khóa action tạo Tester theo `busy`; lỗi logout mở lại action. Test deferred logout kiểm tra không mở dialog khi pending và mở bình thường sau lỗi. | ĐÃ SỬA, test PASS |
| PC-05 | Sửa dự án đưa nút tải version ra cho mọi lỗi; tải thành công lại dùng error/alert | Chỉ cho recovery khi HTTP 409 `VERSION_CONFLICT`; thông báo tải thành công dùng status có focus, giữ nháp và chỉ lưu khi người dùng bấm. Đọc lỗi cho retry; nhãn pending dùng “Đang xử lý…” cho cả đọc/lưu. Bỏ hướng dẫn chọn người nhận máy khỏi validation chung vì form sửa dự án không có trường đó. | ĐÃ SỬA, test/Chrome fixture PASS |
| PC-06 | Note gọi focus trước khi nút mở editor được bật lại, hoặc nút cũ đã mất sau reload | Yêu cầu trả focus sau commit và lượt đọc tương ứng; tìm nút sửa đang tồn tại theo ID, fallback Thêm nếu mất dòng; không giành focus của thao tác khác. | ĐÃ SỬA, test PASS |
| PC-07 | Sổ tay không trả focus sau hủy tài liệu mới và lưu/reload | Theo dõi nút mở hiện hành; trả về Thêm hoặc Thêm phiên bản đúng tài liệu; chờ reload sau lưu, không giành focus. | ĐÃ SỬA, test PASS |
| PC-08 | Probe AI đang GENERATING/timeout nhưng vẫn đổi model/nguồn; nút “Kiểm tra lại” tạo mã mới | Khóa thay nguồn/model/đổi hoặc ngắt kết nối khi kết quả chưa xác định; retry giữ connection, model, body, requestKey. Kết thúc rõ ràng mở khóa. Đối chiếu backend: 422 AI_UNAVAILABLE/AI_INTERRUPTED vẫn có thể xử lý nền, nên giữ request; state FAILED rõ ràng thì mở khóa. | ĐÃ SỬA, test PASS |

## Các nhóm điều khiển đã đối chiếu

- Auth/Admin: login, tạo tài khoản ADMIN/PM, menu tài khoản, form dự án; trạng thái pending, validation, conflict, feedback.
- Shared/navigation: Header, Sidebar, ProjectSelector, AdminProjectDropdown, SelectionTable, SelectPageCheckbox, TableScroll; so sánh icon riêng với native input/select.
- Testing/Issue/Project: đường route hiện hành trong AppRouter, select của Testing/Feature Issues, editor Note và Sổ tay, các overlay/action liên quan.
- Reports/AI: AiChat, AiConnections, ManagementAnalysis, SafeMarkdown; nguồn/model, nút probe/retry, launcher/fallback, các action theo dòng.
- Không coi mũi tên của **button** ProjectSelector là mũi tên native select bị lặp. FieldSelect cũ đã có `appearance:none`, các caller BoardPage/IssuesPage cũ không phải route hiện hành. Search-clear native và “Xóa bộ lọc trong bảng” có phạm vi khác nhau, không xóa tùy tiện. Không tắt autofill/password manager để che lỗi mắt.

Đây là review source theo nhóm rủi ro và kiểm thử các hành vi đã xác định, **không phải đã bấm mọi nút ở mọi vai trò/trạng thái**. Kiểm kê 1.004 khai báo control của đợt trước không được dùng thay bằng chứng tương tác của đợt này.

## Kiểm chứng

- Auth: RED 2 → RED 1 sau sửa masking → GREEN 14 test, `auth-red.log`, `auth-pending-red.log`, `auth-green.log`.
- Admin: RED 7 → GREEN 7; hồi quy 186/186 test trong 26 file. Một fixture cũ dùng Error thường cho conflict được bổ sung đúng HTTP 409/code; không bỏ assertion. Lần 185/186 trước chỉnh fixture vẫn giữ log.
- Note/Sổ tay: RED 8 → GREEN 22, sau bổ sung biên tổng 25 test tập trung; hồi quy Project 69/69 test trong 8 file. Coverage **chỉ hai component**: statements 94,69%, branches 91,07%, functions 91,30%, lines 100%. Reporter JSON riêng, không ghi đè coverage cũ.
- AI: RED 3 trước sửa pin request; review chéo với backend phát hiện thêm RED 2 cho HTTP 422 còn xử lý nền; GREEN 21. API/provider được giả lập tại biên; không gọi AI thật hoặc phát sinh phí thử.
- Full frontend: **1.133/1.133 test trong 122 file PASS**, exit 0, thời gian 360,35 giây. Sau lượt này chỉ sửa một câu validation chung của AdminProjectForm; chạy lại **21/21 test form/Admin management PASS** và build cuối PASS. Không coi toàn bộ 1.133 test đã chạy lại sau chỉnh câu chữ đó. `frontend-full-result.json`, `admin-final-copy-result.json`, `build-final-result.json` có command/time/exit.
- Build cuối: Vite 6.4.3, 1.701 module, PASS; code nghiệp vụ không đổi sau lần kiểm thử/build cuối. Hash baseline/source và final được lưu, khác biệt sau full suite chỉ là câu validation nói trên.
- Có 2 cảnh báo React act trong test reauth có sẵn ở lượt Admin/Auth; không che hoặc tắt warning. **Full suite cuối không phát sinh các warning này.**
- Chrome thực tế: input trống/tự gõ/ẩn-hiện/Enter trên mắt; ảnh và geometry ở mobile/tablet/desktop. Chỉ reveal chuỗi thử; một lần submit autofill sẵn bị từ chối cho thấy input/mắt khóa trong pending, password xóa và ẩn sau lỗi. Không đọc/lưu mật khẩu thật. Mobile viewport yêu cầu 320, bề rộng document 314 (scrollWidth 314); tablet 768, desktop 1.366 không tràn ngang theo receipt.
- Chrome component fixture với API giả lập: Note Add/Edit → Hủy trả focus đúng trigger; Edit → Lưu → reload trả focus nút mới theo ID/tên mới. Sổ tay Add/Revision → Hủy và Revision → Lưu → reload trả focus đúng. Dự án required-field không hiện recovery; HTTP 409 có recovery; đọc thành công role=status có focus, giữ nháp, không autosave; Hủy → Bỏ bản nháp trả trigger. `component-browser-final-receipt.json` và `project-recovery-final.png`. Fixture ban đầu gắn sai tên phương thức revise và thiếu stylesheet Admin; fetch đã chặn nên không ghi backend. Đã sửa fixture, kiểm lại thành công và lưu ảnh cuối có đủ CSS. Hai file fixture tạm đã rời Frontend, được lưu trong thư mục bằng chứng; tab thử đã đóng.
- Edge, screen reader, thiết bị cảm ứng thật, toàn bộ role×route×state, mọi API ghi, AI/OAuth thật: **NOT_RUN trong đợt này**.

## Skill đã dùng → mục đích → bằng chứng

| Skill | Áp dụng | Bằng chứng |
| --- | --- | --- |
| `systematic-debugging` | PC-01–08: phân biệt custom/native, lần theo pending/focus/error và backend settlement | Tái hiện RED, source/caller review, ghi rõ Chrome chưa tái hiện |
| `frontend-ui-engineering` | Native control, semantic label, focus sau render, responsive và giữ contract giao diện | Scoped CSS, aria-controls, status/alert, ảnh Chrome/geometry |
| `test-driven-development` + `writing-good-tests` | PC-02,04–08: test hành vi trước sửa, mock đúng biên API | RED/GREEN logs, deferred request/read, không test tìm chuỗi CSS làm bằng chứng native |
| `verification-before-completion` | Tách test/build/source review/browser và giới hạn | 1.133 test frontend, 21 test cuối và build; receipts mới, kiểm SHA-256, mục chưa kiểm chứng |
| `computer-use` | Kiểm UI bằng Chrome qua CUA | Ảnh localhost/127.0.0.1, viewport tạm và reset, không điều khiển browser bằng shell |

SKILL.md được đọc tại `C:/Users/admin/.codex/skills/<tên>/SKILL.md`; computer-use tại plugin bundle `computer-use/26.1013.40934/skills/computer-use/SKILL.md`. Không suy rằng chỉ đọc skill là đã nghiệm thu sản phẩm.

## Tài liệu tham chiếu và bằng chứng

- [Microsoft: password reveal control](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/password-reveal): Edge chèn reveal control native và hỗ trợ scope `::-ms-reveal`. Đây không phải bằng chứng về cấu hình Chrome của người dùng.
- [Chromium password input](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/html/forms/password_input_type.cc), [runtime feature](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/platform/runtime_enabled_features.json5): cơ chế native phụ thuộc feature của trình duyệt; không suy rằng đang bật trên máy hiện tại.
- [Thư mục bằng chứng](../../var/password-controls-2026-10-19/): baseline/checkpoint, logs RED/GREEN, build/full suite, ảnh và geometry không chứa mật khẩu thật.

S11/FR-12 giữ **IN_REVIEW**. Các mục UAT/UX-002/UX-011 đã mở ở báo cáo trước không tự được đóng bởi tác vụ này.

Checklist bàn giao:

- [x] 6 nhóm lỗi hành vi có RED/GREEN và review chéo.
- [x] Toàn bộ test frontend; test form và build sau sửa câu chữ cuối.
- [x] Chrome các kịch bản nêu trên.
- [x] Bảo toàn 104 file có sẵn và backend; bằng chứng `final-preservation-result.json`.
- [x] Dọn fixture khỏi Frontend.
- [ ] Edge native.
- [ ] Mọi tổ hợp vai trò, màn hình, trạng thái và UAT tổng thể.
