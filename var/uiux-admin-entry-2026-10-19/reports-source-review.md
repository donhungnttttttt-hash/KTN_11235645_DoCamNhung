# Reports / AI / Admin forms — kiểm tra ngày 19/10/2026

## Phạm vi và mức bằng chứng

Đọc yêu cầu UTF-8 tại attachment `596c2d39-3955-4dc2-b707-228524050552/Pasted text.txt`, hướng dẫn repository và RTK. Ưu tiên lỗi thanh bên Admin ngay sau đăng nhập; các tiêu chí đi kèm là tính nhất quán, phân cấp, phản hồi, đơn giản và khả năng tiếp cận. Không áp dụng các gợi ý marketing trong đoạn tham khảo thành yêu cầu thêm banner/video/palette mới cho TMS.

Agent này không điều khiển browser, không gọi backend, DB, provider hoặc OAuth. `SOURCE_REVIEW` nghĩa là đã đối chiếu source hiện hành; `MOCK_TEST` chỉ chạy React với API/auth giả trong bộ nhớ; `BROWSER_NOT_RUN_BY_THIS_AGENT` không phải bằng chứng browser. Riêng lỗi chat thấp có bằng chứng browser do root thu, được đọc lại từ JSON bên dưới. Không suy nghiệm thu giao diện từ số control hoặc số test.

Sau phần đọc source, root cho phép sửa hẹp lỗi phản hồi nguồn AI, phân cấp nút lưu và lỗi chat ở viewport thấp đã tái hiện trên browser. Sau đó root duyệt thêm guard đóng bốn nhóm form Admin theo baseline riêng, không lưu nháp/mật khẩu ra storage. Các file sửa được liệt kê ở phần source freeze. Không sửa AdminLayout/admin.css hoặc source của owner khác. Không có baseline nội dung trước phiên nên các phát hiện là hành vi source hiện hành, không tự quy là regression mới.

## Skill → công việc → bằng chứng

- `frontend-ui-engineering`: đọc SKILL, dùng tiêu chí hierarchy, trạng thái lỗi/rỗng/chờ, keyboard, viewport và token sản phẩm để kiểm tra form/nút/chat. Dẫn đến RA-02/03 và ma trận bên dưới; không dùng số test để chứng minh responsive.
- `ui-ux-pro-max`: đọc SKILL; chạy truy vấn thực tế `error feedback recovery --domain ux -n 3` qua Python 3.13 đã có trên máy. Kết quả `ux-guidelines.csv`: Error Recovery, Error Feedback, Error Messages. Dùng để kiểm tra thông báo hết lỗi và đường phục hồi RA-01, không tuyên bố đã tra palette hoặc design-system mới.
- `test-driven-development` và `writing-good-tests.md`: test UI thực của provider qua hai lần thay trạng thái xác thực, mock duy nhất API/auth; quan sát RED đúng stale alert trước khi thêm thao tác xóa lỗi ở nhánh thành công. Receipt RED và GREEN ở phần kiểm chứng. Không viết test phản chiếu class/CSS; root kiểm chứng visual thực.

## Phát hiện và xử lý

### RA-01 / P2 — cảnh báo nguồn AI cũ vẫn hiện sau khi đăng nhập lại thành công — FIXED, MOCK_TEST

Source: `Frontend/src/app/features/ai/AiConnections.jsx:29–36`, `:108`; test mới `AiConnections.test.jsx:54–67`.

Tái hiện: lần đọc danh sách nguồn thất bại; Auth chuyển `expired` hoặc `unavailable`; cùng tài khoản xác thực lại; lần đọc mới thành công, model được chọn và UI báo đã cấu hình, nhưng `role=alert` lỗi cũ còn hiện. `refresh()` vốn xóa lỗi, còn nhánh đọc tự động sau xác thực chỉ thay providers/selection. Nguyên nhân độ tin cậy cao; hai test RED thất bại đúng ở kiểm tra alert đã biến mất.

Sửa nhỏ: thêm `setError('')` sau guard response hiện hành (`!aborted` và còn active), trong nhánh tải thành công. Không đổi endpoint, số lần gọi, nguồn/model, probe hoặc cơ chế OAuth. AC: cả `expired` và `unavailable` cùng user tải thành công thì model sẵn sàng và không còn alert cũ; lúc inactive selector không xuất hiện; response tài khoản cũ vẫn bị loại theo test có sẵn.

### RA-02 / P3 — nút lưu báo cáo chưa có phân cấp chính — FIXED SOURCE, BROWSER_PENDING

Source: `Frontend/src/app/features/reports/ManagementAnalysisPage.jsx:152`; token/style có sẵn `Frontend/src/app/styles/global.css:136–145`.

Nút lưu dùng `cat-btn primary`; source chỉ có treatment `.cat-btn-mint` và `.d-button.primary` giới hạn trong work board, không có treatment `.management-analysis .primary`. Vì vậy lưu giống nút phụ/tải bản đã lưu. Đổi thành `cat-btn cat-btn-mint`, không thay validation/disabled/submit. AC browser: khi hợp lệ nút lưu rõ là hành động chính, tải bản đã lưu là hành động phụ; disabled vẫn đọc được; hover/focus đúng token chung; không đổi màu kết quả kiểm thử.

### RA-03 / P2 — chat cắt textarea/nút gửi ở viewport thấp — FIXED SOURCE, ROOT_BROWSER_RED, GREEN_PENDING

Source ban đầu: `Frontend/src/app/features/ai/ai.css:28–32`; fallback mới `:42–48`.

Root đã tái hiện an toàn trên main 568 × 320, không gửi tin nhắn: panel cao khoảng 304, client 302 nhưng scrollHeight 380; heading 60 + provenance 52,8 + toolbar 111 chiếm phần lớn chiều cao; vùng đọc chỉ 20; composer kết thúc ở y388,8 trong khi panel kết thúc y312. Textarea bị cắt bởi `overflow:hidden`. Đã đọc [JSON trước sửa](chat-short-before.json); [ảnh do root thu](chat-short-before.jpg). Root ghi nhận 320 × 480 vẫn thấy composer trước sửa; không mô tả mọi màn hình hẹp đều lỗi.

Nguyên nhân độ tin cậy cao: các vùng flex không co bên trong panel cố định nhưng tổng chiều cao vượt panel. Fallback CSS chỉ `max-height:400px`: panel chuyển thành block cuộn dọc, heading sticky; transcript giữ vùng cuộn riêng tối thiểu 10rem/tối đa 60dvh; bỏ trần chiều cao composer để toàn bộ control có thể tiếp cận qua cuộn panel. Không thay business component, source/model/scope, send, IME, draft hoặc follow-latest hooks. Tradeoff: ở viewport thấp có hai vùng cuộn; cần kiểm chứng thao tác chạm/keyboard thực. AC root: 568 × 320 cuộn tới được toàn bộ textarea/nút gửi, minimize vẫn thấy; vùng đọc dùng được với nội dung dài; 320 × 480 và desktop không đổi fallback; không tự gửi/probe khi mở hoặc cấu hình.

### RA-04 / P2 — đóng form Admin đang sửa chưa có guard — FIXED, MOCK_TEST

Source lúc đọc: `UserCreateDialog.jsx:20,29`, `AdminProjectForm.jsx:30,38`, `AdminFormDialog.jsx:8,13` trong `Frontend/src/app/features/admin/`.

Tái hiện: nhập tên/tài khoản, dự án, thông tin máy hoặc ghi chú bàn giao; Escape/X/Hủy gọi thẳng `onCancel`/`onClose`, không hỏi bỏ thay đổi. Busy vốn đã có guard ở hook/fieldset/X; không coi đây là bypass thao tác đang lưu. RED thực có 14 FAIL đúng mất form/nội dung/focus và 5 PASS cho clean/busy.

Sửa theo quyền root duyệt: `useAdminFormClose` trong `AdminFormDialog.jsx:6–20`, được cả X/Escape/Hủy sử dụng qua callback cùng nguồn ở bốn caller. Dirty do từng form tự khai báo: tài khoản username/displayName/password/role; dự án code/name/description/timezone và selection members/devices; máy assetCode/type/model/serial/osName/osVersion/conditionCode/notes; bàn giao/thu hồi project/recipient/date/note/condition. Không so DOM, không dùng một cờ touched khiến hoàn tác vẫn bị hỏi, không lưu mật khẩu ra storage/buffer. Bản cuối dùng xác nhận trong app với hai lựa chọn “Tiếp tục soạn” và “Bỏ bản nháp”, nhất quán với work-items; không dùng `window.confirm` trong guard Admin. Trả chính xác về baseline đóng ngay; dirty từ chối đóng giữ form/focus; pending chặn đóng; thành công gọi `onSaved` trực tiếp để hoàn tất, không hỏi bỏ thay đổi vừa lưu. Search/filter không tính dirty.

AC test đã đạt: bốn nhóm form × Escape/X/Hủy, pristine/reverted, selection thành viên, pending và success, focus return sau chấp thuận. Xác nhận focus mặc định “Tiếp tục soạn”; parent inert/aria-hidden khi xác nhận mở; overlay xác nhận là sibling ngoài section form để tránh transform animation làm sai containing block. Escape ở xác nhận chỉ đóng xác nhận và trở về draft. Picker lồng: Escape đầu chỉ đóng picker, Escape sau hỏi bỏ nháp. Khóa auth đóng lời xác nhận và giữ form; xác thực lại cùng user phục hồi text, không tạo hai focus trap đồng thời. Root báo Chrome thực tại 320 × 568 đã xác nhận focus ban đầu ở “Tiếp tục soạn”, click tiếp tục giữ draft, Escape chỉ đóng xác nhận/giữ draft; agent này không điều khiển browser. Chưa gán browser PASS cho explicit discard hoặc mọi form/viewport chỉ từ smoke này. Không mở rộng sang lifecycle dialog riêng hoặc chặn navigation toàn app; root đã chốt loại lifecycle khỏi patch này. Test tích hợp lifecycle được cập nhật để tiếp tục soạn vẫn khóa lưu trữ; explicit discard mới mở lại thao tác lưu trữ.

### Thanh bên Admin — HANDOFF, ROOT_CONFIRMED

Source lúc đọc `admin.css:3` đặt `align-self:start` trên sidebar trong grid, không có min-height/stretch; rail nền chỉ cao theo menu/footer trong khi hàng grid tiếp tục tới cuối viewport. Đã gửi root; root xác nhận geometry và giao Admin owner sửa. Agent này không thay source Admin và không nhận đã kiểm chứng bản sửa của owner. Bắt buộc nghiệm thu cold login Admin, không chỉ điều hướng vào Admin từ workspace đang mở.

### RA-05 / P2 — focus rơi về body sau xác nhận bỏ nháp — FIXED, MOCK_TEST + ROOT_BROWSER_GREEN

Root tái hiện hai lần không có HMR xen giữa: vào Người dùng → Tạo tài khoản → nhập `focus-draft` → Escape → Bỏ bản nháp. Dialog đã đóng hết nhưng focus là BODY; form pristine → Hủy trả focus đúng nút Tạo tài khoản. Đã đọc [bằng chứng browser trước sửa](admin-discard-focus-before.json). Đây là regression của xác nhận trong app vừa thêm, không phải backlog cũ; test jsdom trước đó chưa mô phỏng đầy đủ hành vi inert của browser.

Nguyên nhân: parent được inert trước lúc effect focus của dialog con chạy. Chrome blur field hiện hành về body và không cho focus trở lại node đang inert; dialog con vì vậy ghi body làm nơi quay lại. Cleanup hiện có không nối được node body vào chuỗi opener của parent. Test RED mới giả lập đúng cả hai đặc tính native inert (blur khi bật và chặn focus node đang inert), giữ phần quản lý dialog/focus thật. Cả ba đường Tiếp tục soạn/Escape/Bỏ bản nháp đều FAIL ở focus BODY. Mô phỏng chỉ blur ban đầu đã PASS giả vì React khôi phục selection trong jsdom; đã bổ sung đặc tính chặn focus inert trước khi sửa sản phẩm, không lấy lần PASS đó làm RED.

Sửa nhỏ: `useAdminFormClose` chụp `document.activeElement` vào ref trước khi set state mở xác nhận; `AdminFormDialog` truyền ref đó cho tham số tùy chọn thứ tư của `useDialogFocus`. Hook lấy node được chụp làm `entry.previous`, còn callers khác giữ default cũ. Khi tiếp tục/Escape trả focus field/nút trước xác nhận; khi bỏ cả form, cleanup chuỗi opener hiện có chuyển node trong parent sang nút mở form. Không timer, không đoán nút bằng selector, không bypass điều kiện node còn kết nối/ẩn/inert đã có ở hook. Overlay vẫn sibling ngoài section form.

AC MOCK_TEST: 3 đường hành động đều trả focus đúng khi native inert được mô phỏng, safe initial focus không đổi; shared hook, picker lồng và dialog trên drawer không regression. Root đã thu [Chrome GREEN tại 320 × 568](admin-discard-focus-after.json): Tiếp tục soạn → INPUT còn `focus-draft`; Escape → cùng INPUT/nội dung; Bỏ bản nháp → 0 dialog và BUTTON Tạo tài khoản nhận focus. Agent đọc lại JSON, không điều khiển browser và không suy sang mọi viewport.

### RA-06 / P2 — nút phục hồi phiên bản xuất hiện cho lỗi nhập liệu, tải thành công lại báo lỗi — FIXED, MOCK_TEST, ROOT_BROWSER_GREEN_PENDING

Root thao tác Bàn giao máy trên main, không nhập trường nào rồi xác nhận: form chặn đúng “Chọn dự án nhận máy trước khi bàn giao.” nhưng đồng thời hiện “Tải phiên bản hiện hành, giữ bản nháp”. Đây là local validation, không có POST; tải phiên bản máy không sửa được thiếu dự án. Source cả `DeviceAllocationDialog` và `DeviceAssetForm` đều dùng error bất kỳ để hiện nút; reload thành công cũng đưa câu “Đã tải phiên bản hiện hành…” vào `role=alert` màu lỗi. Đọc whole files và đối chiếu mã backend thật tại `Backend/src/main/java/vn/syp/tms/admin/DeviceInventoryService.java:36–70`; không gọi backend.

Sửa điều kiện theo lỗi thật của máy chủ: allocation chỉ hiện reload sau status 409 với `VERSION_CONFLICT`, `ASSET_UNAVAILABLE`, `ALREADY_RETURNED`; asset edit với `VERSION_CONFLICT`, `ASSET_ALLOCATED`. Không hiện cho thiếu dữ liệu tại client, 422, 401/403, lỗi mạng của save hoặc `ARCHIVED` của dự án. Không đổi API, payload, quyền, trạng thái nghiệp vụ hoặc tự gửi lại save. Sau conflict, GET đối chiếu lỗi mạng vẫn giữ nút và toàn bộ draft để người dùng thử lại; GET thành công bỏ nút phục hồi, giữ draft/version mới và báo `role=status`. Nhánh máy không sẵn sàng/lượt đã thu hồi vẫn là cảnh báo `role=alert`, không giả thành công.

Vì nút GET biến mất sau khi đối chiếu thành công, thêm focus vào thông báo status: allocation dùng feedback ref sẵn có, asset dùng notice ref. Hai assertion focus RED đã bắt đúng thiếu focus trước khi sửa. Test dùng `ApiError` thật/structured code; fixture inventory cũ chỉ `new Error('Conflict')` được bổ sung status 409/code VERSION_CONFLICT để khớp contract. Không nới điều kiện theo substring thông báo.

AC MOCK_TEST: thiếu project và invalid field không hiện reload; các lỗi không liên quan không hiện reload; conflict → GET fail → GET success vẫn giữ nhập, thành công là status nhận focus, không còn alert; lần lưu chủ động sau đó dùng expectedVersion mới. Browser root sau sửa là gate riêng.

## Cascade / route CSS

Entry import eager `Frontend/src/AppEntry.jsx:2,7,9–10`, `Frontend/src/app/layouts/MainLayout.jsx:6`, `Frontend/src/main.jsx:4`; route import `AppRouter.jsx:3` → `AnalysisPage.jsx:2` → ManagementAnalysis. Vì vậy việc route chưa mở không đảm bảo CSS route đó chưa tải.

Đã đọc toàn bộ `ai.css`, `management-analysis.css`, `reports.css`, `admin.css`, `status-reports.css`; đối chiếu global tokens/form/button rules. Không tìm được selector Reports/AI kiểu bare `nav`, `aside`, `.sidebar` áp vào Admin rail. Các rule AI nhắm header chỉ là `.app-header/.admin-header .ai-chat-launcher`; management CSS dùng namespace riêng hoặc `.safe-markdown`. Không kết luận toàn bộ app không có contamination chỉ từ tập file này. Root kiểm tra import order/computed styles ở navigation/shared.

`AiAssistantPage`/`AdminAiPage` vẫn còn source/tests nhưng route `/ai` và `/admin/ai` đi `RetiredAiEntry` (`AppRouter.jsx:54`, `AdminApp.jsx:24`); không coi form tác vụ cũ là màn active hoặc tìm lỗi ở đó rồi gán cho chat mới. `reports.css` cũng thuộc report cũ; Analysis hiện dùng `ManagementAnalysisPage`.

## Ledger control/state của phần active đã đọc

| Surface | Vai trò / điều kiện | Control, trạng thái và liên kết đã đối chiếu source | Phần còn cần browser |
|---|---|---|---|
| Tổng hợp & Phân tích | ADMIN; PM của dự án; DEV/Tester bị chặn; archived chỉ đọc/tải | Scope Feature; tải lại số liệu; summary loading/error/empty; bảng Feature/Bug/QA với TableScroll; phân trang report; mở report; mới; title/Markdown; lưu; tải bản lưu; preview Markdown; AI preview/proposal | Chữ dài, phân cấp lưu, bảng ở zoom/reflow, focus sau lỗi và điểm cuộn tới editor |
| Draft report | Cùng tài khoản/project; buffer trong phiên | Route return; newly-mounted locked gate; same-user reauth; version revalidation/conflict/read retry; 403 thật giữ deny; 401 phục hồi bằng read; không replay save/paid preview | Không giả auto-save: refresh/tab close mất buffer; thông báo và warning thực; hành trình browser không tạo dữ liệu |
| Chat entry / compose | 4 role, chỉ nguồn/scope được phép | Header launcher; open/minimize/Escape; free text/IME/Enter vs Shift+Enter; draft vẫn sửa khi pending; send disabled khi rỗng/not ready/read failure; outgoing/UNKNOWN/retry giữ key; error/notice nằm composer | RA-03 thấp/ngang, bàn phím ảo/safe area, keyboard tới nút, không che close/composer |
| Chat scope/history/messages | Owner-keyed; project/Feature có quyền; archived chỉ đọc | Scope switches tạo hội thoại mới giữ text; Feature loading/retry; history/current; older history/messages; read retry khi reopen; transient giữ cache; 401/403/404 deny; sources/copy | Long provider/model/project/title/answer; scroll anchor khi load older và follow-latest; copy feedback/AT |
| AI configuration trong chat | Owner active; chưa/chờ/đã kết nối; model exact-ready | Source/model selects; readiness; details; refresh; model catalog error/empty; authorize/fallback chính thức; cancel; probe có cảnh báo hạn mức và key; disconnect; account switch | Chỉ dùng mocked state cho OAuth/probe/saves; không gọi provider thật để đo UI; error/ready không mâu thuẫn (RA-01) |
| Admin form styling / history | ADMIN; PM được cấp tạo TESTER qua entry riêng | Dialog header/body/actions, field labels/help, required/validation, busy/disabled/error focus; dirty-close RA-04 và nested picker đã test; PM không được list users/admin; status-report history chỉ đọc và link analysis | Xác nhận trong app/focus/zoom browser; agent này không chạy thao tác tạo tài khoản |

## Ma trận nghiệm thu rộng: hành trình × trạng thái × tiêu chí

Mỗi dòng phải ghi role/URL/viewport/zoom/input, dữ liệu fixture hoặc dữ liệu đọc, trạng thái cụ thể, hành động, expected/actual, screenshot + geometry/computed style nếu là layout, test receipt nếu là state và owner. Chỉ PASS sau đúng bằng chứng của dòng; `NOT_RUN`/`BLOCKED` giữ riêng. Không cộng số control/test thành phần trăm chất lượng.

| ID / hành trình bắt buộc | Tiêu chí và AC quan sát được | Bằng chứng tối thiểu / owner |
|---|---|---|
| AM-01 Fresh login ADMIN → Admin tổng quan | Nhận diện Admin/active menu rõ; rail liền mạch; nội dung cân với rail; không bị CSS workspace làm sai; skip link tới main | Screenshot + box rect/computed style ngay lần render đầu ở desktop và mobile; root/Admin |
| AM-02 ADMIN → workspace → Admin → Back/Forward/reload | Context/active item/heading nhất quán, không đổi project hoặc mất vai trò; import order không đổi layout; username dài không đẩy nút khỏi màn | Chuỗi URL + ảnh ở từng shell, cùng role/project; root |
| AM-03 PM/Tester/Dev login và deep link được/không được phép | Chỉ hiện menu/action có quyền; deny giải thích và có đường quay lại; không lộ nháp tài khoản khác | Bốn role riêng, deep link/permission change + locked session fixture; root/owner |
| AM-04 Lists + filter + pagination + empty/error | Scope và tổng số đúng; clear/search/page cho phản hồi gần control; lỗi không giả rỗng; retry giữ truy vấn; chữ dài không phá hàng | Một hành trình dữ liệu có/rỗng/filtered-empty/loading/fail/retry mỗi loại list; owner theo module |
| AM-05 Create/edit + invalid + dirty + pending + fail/success | Label/help/required rõ; focus tới lỗi; disabled có lý do; double click không hai mutation; dirty-close quyết định rõ; save fail giữ nhập; success có phản hồi và nơi dữ liệu xuất hiện | Component RED/GREEN có deferred API; browser form chưa submit hoặc fixture; Admin/testing/report owner |
| AM-06 Report read → edit → route return → same-user reauth | Giữ text đúng account/project; quyền và version kiểm tra lại trước save; không tự ghi; 403 thật không mở editor; download nói rõ bản server | Mock auth/version/race tests + browser read/keyboard; Reports/root |
| AM-07 Chat entry → scope/history/config → compose | Đọc được provenance, nút chính/phụ rõ, trạng thái expanded/current rõ; không tự gửi từ mở UI; Enter/IME không gửi nhầm; lỗi có recovery | Mock send/IME/errors + browser không Send/OAuth/probe; Reports/root |
| AM-08 Chat thấp 568 × 320, hẹp 320 × 480, desktop | Toàn bộ control reachable, close không mất, không cắt composer, vùng đọc có không gian/scroll; không chỉ thử width mà bỏ height | JSON trước/sau + screenshot + keyboard/scroll, đọc nội dung dài bằng fixture; root |
| AM-09 Modal/drawer/nested picker | Title/close/submit luôn reachable; Tab đúng modal top; Escape child trước parent; focus return; background không interactive; locked auth không lộ portal | Mock nested/auth tests + keyboard browser/geometry; shared/Admin/testing |
| AM-10 Reflow/zoom/text dài | 320 CSS px và zoom 200% không mất nội dung/action; chỉ bảng dữ liệu được cuộn ngang có nhãn; error/toast không che thao tác; touch target phù hợp | Actual viewport/zoom, overflow/rect + ảnh; không suy từ CSS media query; root |
| AM-11 Palette/type/border/hierarchy | Token đúng vai trò; title/section/body/helper có thứ bậc; một hành động chính mỗi nhóm; status có chữ/icon ngoài màu; giữ màu kết quả user chốt | Computed styles + contrast của cặp thực tế, ảnh enabled/hover/focus/disabled/error/current; root và owner |
| AM-12 Keyboard/accessibility/motion | Tên truy cập và focus thấy được; error/status được announce; không focus vùng ẩn; reduced motion được tôn trọng; scroll không khóa wheel/touch | Keyboard actual + mock focus tests; AT/reduced-motion ghi PASS hoặc NOT_RUN riêng; root |

Các viewport là mẫu có chủ đích để bắt layout/height/breakpoint, không phải lời khẳng định đã kiểm mọi thiết bị. Các trạng thái lỗi/quyền/mutation dùng fixture in-memory; không tạo tài khoản hoặc gọi model trả phí để minh họa tiêu chí.

## Receipt và source freeze

- RED: [ai-provider-recovery-red.json](ai-provider-recovery-red.json): 2 FAIL đúng stale alert (expired/unavailable), exit 1; không phải setup/import error.
- GREEN đầu: [reports-ai-green.json](reports-ai-green.json): 56/56, 3 file, exit 0.
- GREEN sau CSS: [reports-ai-final.json](reports-ai-final.json): 113/113, 4 file, 0 skip, exit 0: AiChat 57 + AiConnections 11 + ManagementAnalysis 38 + ReportDraftProvider 7. API/auth đều mock; không đo coverage mới, không khẳng định browser từ test này.
- Admin dirty-close RED: [admin-dirty-close-red.json](admin-dirty-close-red.json): 14 FAIL đúng thiếu guard, 5 PASS clean/busy. [GREEN](admin-dirty-close-green.json): 19/19.
- Admin regression ban đầu [admin-forms-regression.json](admin-forms-regression.json): 66 PASS/1 FAIL ở test picker cũ, vì test còn đợi đóng ngay form dirty và jsdom chưa mock native confirm. Cập nhật test theo hành vi mới: picker Escape không hỏi; parent Escape từ chối giữ nhập; explicit accept mới đóng/focus return. [Final GREEN](admin-forms-regression-green.json): 67/67, 7 file, 0 skip, exit 0, không còn lỗi jsdom confirm. Không bỏ test hoặc mock confirm toàn app.
- Các receipt native-confirm ở trên là checkpoint trước lần cải tiến xác nhận trong app, không phải source cuối. In-app RED [admin-inapp-discard-red.json](admin-inapp-discard-red.json): 16 FAIL do chưa có dialog/lựa chọn trong app, 5 PASS. [Focused GREEN](admin-inapp-discard-green.json): 25/25, 3 file, exit 0. [Final related regression](admin-inapp-regression.json): 85/85, 10 file, 0 skip, exit 0; gồm auth retained draft, thứ tự dialog trên drawer, lifecycle integration; không còn stack jsdom confirm trong output GREEN.
- Đã đọc full suite đầu của root [frontend-final-tests.json](frontend-final-tests.json): 1080 PASS/1 FAIL/1081, 119 file, exit 1. Test duy nhất FAIL `does not allow lifecycle changes to discard an open project edit` còn đợi Hủy đóng ngay form dirty. Đã cập nhật bằng hành vi thật (Tiếp tục soạn giữ nháp/khóa lifecycle, Bỏ bản nháp mới đóng/mở lifecycle), test PASS trong 25 và 85 ở trên. Root cần full suite cuối trên source mới; không trình bày lượt đầu là toàn bộ PASS.
- Focus inert RED [admin-inert-focus-red.json](admin-inert-focus-red.json): 3 FAIL đúng BODY focus, exit 1. [GREEN](admin-inert-focus-green.json): 33/33, 4 file, 0 skip, exit 0; gồm Admin dirty-close 23, nested picker 1, shared focus hook 7, MainLayout dialog order 2. Không đo coverage mới. Full suite session 16220 là checkpoint trước RA-05; root chạy lại sau khi các owner freeze mới.
- Device recovery RED [device-error-recovery-red.json](device-error-recovery-red.json): 12 FAIL đúng nút reload không liên quan/thành công vẫn alert. Focus RED [device-reload-focus-red.json](device-reload-focus-red.json): 2 FAIL trước khi status nhận focus. [Final GREEN](device-error-recovery-final.json): 61/61, 5 file, 0 skip, exit 0; gồm inventory, action audit, dirty-close với inert blur và nested picker. Source đóng băng lại sau RA-06, root kiểm chứng full suite/build trên checkpoint mới.
- Root chạy full suite/build của toàn cây sau khi các owner freeze; không chạy trùng full suite trong child. Root phải ghi receipt mới riêng. Build/full suite không thay thế AM-01/08/10.

SHA-256 source freeze của agent:

| File | SHA-256 |
|---|---|
| `Frontend/src/app/features/ai/AiConnections.jsx` | `2e67580e9b72347e64f8f4f3bc9d0558f3cc17632df1f28f051d39e37f3b1288` |
| `Frontend/src/app/features/ai/AiConnections.test.jsx` | `c18739e5b447e20913d4087a396d4cad3f065bfe88b5ce2b93f4ebdd19285391` |
| `Frontend/src/app/features/ai/ai.css` | `5f49929f5c812b969a485562e3e9d01f5e9e706d8ad924253c229c23daaafd5f` |
| `Frontend/src/app/features/reports/ManagementAnalysisPage.jsx` | `3474f49f26ab06e24201ab3f9084d9426adc2eb52eb3b04de2a616464110f733` |
| `Frontend/src/app/features/admin/AdminFormDialog.jsx` | `40b47b249f8eef5c9b2665762407f93cc21ed9d57435e20e000ec7839c4f8396` |
| `Frontend/src/app/features/admin/UserCreateDialog.jsx` | `93c9b253f3165ab002f847a7a8091730b1c8db1d1c7d5069091842b64fa1a533` |
| `Frontend/src/app/features/admin/AdminProjectForm.jsx` | `ac47df1aba16ade59b8eebb29dd96e118be0996aa1f25a51b0fcc7a4db4ba4f0` |
| `Frontend/src/app/features/admin/DeviceAssetForm.jsx` | `6115ad49e63c8ce3a88104ce3741e3dae5cfe4f4f5d9f92a6bd4f52df94a9544` |
| `Frontend/src/app/features/admin/DeviceAllocationDialog.jsx` | `04627486dd91f57433692ba7646ee5b384a1ea724bf3d0253d3ab8bbe4909d54` |
| `Frontend/src/app/features/admin/admin-dirty-close.test.jsx` | `164450761a491a694c444ea337616dd5882fedc480d45080a1dfcd252903c7ee` |
| `Frontend/src/app/features/admin/nested-project-picker.test.jsx` | `14b37abc00c457d8645c5487c5eeb5cd2cf4e083afa48f7361875a3fa8220104` |
| `Frontend/src/app/features/admin/AdminProjectLifecycle.integration.test.jsx` | `56aba75802923227b9ce4943e989260bdb1024e743bd4c103453fe854f5a8119` |
| `Frontend/src/app/hooks/useDialogFocus.js` | `2886ad7f5fc70362c7b2bf198131fab00f60f636b8579d9041a8577e2f885e9e` |
| `Frontend/src/app/features/admin/device-error-recovery.test.jsx` | `6c36bd855c32726360b10ffdad400e1029ff8e79db2fe1e282fd93999c9e266c` |
| `Frontend/src/app/features/admin/inventory.test.jsx` | `fabf92ea5e937e35d5b235c96fdfef5a13ddbeac5d42ab1c538369c7f4602e56` |

## Chưa được kết luận PASS

Browser GREEN RA-02/03/06, keyboard/touch hai vùng cuộn ở chat thấp, các form/viewport khác ngoài smoke Admin 320 × 568 và ba đường focus đã kiểm ở RA-04/05, lifecycle dirty-close (ngoài patch được duyệt), AT/zoom/mobile keyboard thực. Root báo đã kiểm giữ/bỏ nháp cả bốn nhóm form Admin ở mobile 320 × 568, opener project/account nhận focus; đây vẫn là phạm vi smoke cụ thể, không thay AT/zoom/mobile keyboard. Không sửa/đổi nghiệp vụ provider, backend, data, scopes/presets, palette kết quả hoặc nhánh làm việc; không commit/push.

## Follow-up xác nhận bỏ thay đổi — quyết định và giới hạn bằng chứng

Root báo lượt full suite session 41655 đã in stack `window.confirm` chưa được mock; receipt hoàn tất sau đó có 1080 PASS/1 FAIL như ghi trên. Agent không chạy song song một full suite khác. Root đã cho phép focused RED maxWorkers1 khi lượt tổng gần kết thúc; bộ test này không ghi dữ liệu thực.

Root cũng báo thao tác Escape trên form tạo tài khoản dirty ở 320 × 568 làm lệnh CUA Input bị chờ; lần `getJsDialog` sau trả không có dialog và DOM snapshot vẫn chờ. Đây là giới hạn kiểm chứng hiện tại, chưa chứng minh người dùng thật không thể chọn xác nhận. `window.confirm` là lời gọi đồng bộ, tạm dừng JS của page khi browser trình bày hộp xác nhận. Không thay sản phẩm chỉ để bỏ cảnh báo jsdom hoặc làm automation dễ hơn.

Đối chiếu pattern có sẵn: `Frontend/src/app/features/work-items/components.jsx:209–237` dùng hộp xác nhận trong app với hai lựa chọn “Tiếp tục soạn” và “Bỏ bản nháp”, cùng stack `useDialogFocus`. Root đã duyệt và agent đã triển khai bản tương tự trong Admin vì nhãn hành động rõ, cùng kiểu giao diện, hỗ trợ responsive/focus/ẩn khi auth bị khóa; không phải chỉ để tránh timeout công cụ. Không import module work-items vào Admin. Dùng `AdminFormDialog` riêng làm confirmation con, overlay sibling, giữ baseline bốn caller, không persist dữ liệu/mật khẩu. Đã có RED/GREEN trên các nút thật, nested Escape, focus return, busy và hidden-auth; kết quả cuối 85/85 liên quan, source freeze đã gửi root. Browser bản cuối và full suite mới của root còn gate riêng.

Cập nhật handoff trước RA-05: root báo smoke Chrome 320 × 568 đạt đúng ba thao tác RA-04 nêu trên và build PASS trong 7,13 giây. Sau đó browser kiểm tra sâu phát hiện focus BODY như RA-05, nên không nhận đã PASS toàn bộ focus return từ smoke trước. Full suite session 16220 thuộc checkpoint trước sửa RA-05; source và test mới đã freeze lại, root kiểm chứng tổng thể/browser sau đó. Chưa ghi kết quả full PASS tại đây khi chưa có receipt hoàn tất mới.
