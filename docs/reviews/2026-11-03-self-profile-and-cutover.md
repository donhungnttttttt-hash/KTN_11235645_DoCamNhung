# Hồ sơ cá nhân và hoàn tất chuyển đổi — 03/11/2026

## Bổ sung giao diện nút tài khoản — 03/11

- Theo yêu cầu mới, nút dùng chung chỉ hiển thị avatar tròn 36px, nằm trong vùng bấm 40px (44px trên màn nhỏ/cảm ứng). Bỏ tên và mũi tên cạnh avatar; tên vẫn có trong menu, tooltip và nhãn hỗ trợ đọc màn hình. Chưa có ảnh thì dùng chữ viết tắt.
- Chỉ sửa `AccountMenu.jsx` và `auth.css` trong source sản phẩm; giữ mở hồ sơ, menu và quyền hiện có. Không sửa backend, dữ liệu hoặc khởi động lại backend.
- Kiểm chứng mới: 53/53 test trong 9 file liên quan PASS, build PASS, `git diff --check` PASS. Cảnh báo bundle >500 kB có sẵn còn tồn tại; không đo lại coverage cho chỉnh sửa giao diện nhỏ này. Không có script lint/typecheck riêng.
- Chrome riêng: màn Admin và không gian dự án, mỗi màn ở 1440px/375px, xác nhận kích thước tròn/không viền hộp; bấm và Enter mở menu, Escape đóng và trả focus, mở/đóng hồ sơ đều PASS. Không có page error, không ghi dữ liệu hồ sơ vào main. Đã xem ảnh desktop/màn nhỏ. Bằng chứng riêng: `.superpowers/sdd/2026-11-02-unified-user-access/chrome-avatar-trigger.json` và `avatar-trigger-*.png`.
- Skill **frontend-patterns** → component chung, avatar thay thế và nhãn truy cập → hai file trên; **verification-loop** → build, 53 test hiện có, Chrome và review diff → kết quả trên. Không commit/push.

**Hoàn tất trên localhost:5173, backend 8080 health UP, Flyway V38.** Hai Admin tổng `admin`/`admin2` đăng nhập và mở hồ sơ thành công. Đã cập nhật hệ thống local; chưa commit/push/merge hoặc triển khai từ xa. Các bằng chứng U01–U10 trước đó tại [báo cáo phân quyền](2026-11-02-unified-user-access.md).

## Rà soát lại theo yêu cầu người dùng — 03/11, sau lần nghiệm thu đầu

Đã rà lại phạm vi được duyệt, sửa các phát hiện và kiểm chứng trên bản chạy mới. Backend hiện **PID 26660**, Flyway vẫn **V38**. Hai tài khoản `admin`/`admin2` đã đăng nhập và mở/đóng hồ sơ trên main bằng Chrome riêng; không ghi hồ sơ giả vào main. Các PID/kết quả 32 test bên dưới là checkpoint nghiệm thu đầu.

### Standards — review độc lập

- **Đã sửa:** giao dịch đổi tên commit trước khi principal mới được lưu có thể khiến request đồng thời trả401 và xóa phiên hiện tại. Native test dùng latch tái hiện đúng lỗi trước sửa. Nay cập nhật đúng phiên hiện tại cùng transaction hồ sơ; filter chỉ nhận lại principal đã lưu nếu cùng session/user và đúng version hiện hành. Không tự tạo lại phiên đã xóa, không nhận quyền từ context cũ. Phiên khác vẫn hết hạn.
- **Đã sửa:** action hồ sơ/avatar và thiết lập Admin mới thiếu nhãn nhật ký. Bổ sung nhãn tiếng Việt; API audit tìm được sự kiện hồ sơ theo nhãn và không trả email/điện thoại/chức danh.
- **Đã sửa:** hướng dẫn phát triển còn ghi V11/PM tạo Tester. Đã cập nhật mô hình V38/USER và chỉ rõ luồng cũ đã nghỉ.

### Spec — review độc lập

- **Đã sửa:** Chrome báo HTML pattern ID không hợp lệ vì dấu gạch ngang; có thể bỏ qua kiểm tra ID. Test Chrome RED xác nhận `a!` bị coi hợp lệ; GREEN xác nhận ID sai bị chặn trước POST, ID hợp lệ được chấp nhận, giữ bản nháp. Căn lại cùng lỗi trong form sửa ID/mã dự án và component mã đợt cũ; không mở lại API đã nghỉ.
- **Đã sửa:** spec/plan/report còn câu hiện tại “chưa triển khai/chưa cutover”. Đã cập nhật trạng thái hiện hành và đánh dấu checkpoint cũ là lịch sử.

Hai review không phát hiện thêm thiếu sót quan trọng về mô hình quyền. Sau sửa, reviewer Standards kiểm lại atomicity, serializer, thứ tự khóa và thu hồi phiên, không còn phát hiện chặn; kết quả chạy do người triển khai kiểm chứng riêng.

| Kiểm chứng cuối | Kết quả |
| --- | --- |
| Frontend toàn bộ | **1.255/1.255 PASS**, build PASS; cảnh báo bundle >500 kB có sẵn còn tồn tại |
| Backend nhóm liên quan | **44/44 PASS, 0 skip**, Maven verify/package PASS; gồm phiên đồng thời, principal đã tải cũ, rollback cả profile/session, lock/reset/delegation, HTTP identity/Guest/journey, audit |
| Java diagnostics | **363 source, 0 error/0 warning** |
| Chrome hồ sơ | Cả bốn loại tài khoản lưu text, upload/xóa avatar, reload PASS; bổ sung Admin/User 375px, focus/dirty-close, hết phiên ẩn portal, cùng người đăng nhập lại giữ nháp và lưu tiếp PASS; ảnh đã xem |
| Main và migration | Health UP; admin/admin2 smoke PASS; hash **43 artifact migration/demo** trong jar cũ/mới giống hệt, không thêm/sửa/chạy migration dữ liệu |
| Nguồn build | 243 file `src/main` khớp bản build; jar SHA-256 `b4c9ac888fd2ca1b71ee39c8d6c0d527ca3cafaf876e45a338b2a53325e30e8d` |

Coverage đo trong nhóm backend cuối: `SessionAccountFilter` dòng21/21, nhánh9/10; `SelfProfileService` dòng26/26, nhánh20/26; `CurrentSessionIdentity` dòng20/20, nhánh16/24. Đây không phải coverage toàn backend và không tuyên bố mọi nhánh đạt80%. Frontend không có lệnh lint/typecheck riêng (NOT_CONFIGURED).

Lượt chọn thêm `IdentityIntegrationTest` cũ thất bại do không có Docker; **không tính suite đó PASS**. Nhóm HTTP/MySQL native tương ứng ở trên đã chạy không skip. Lượt Chrome kiểm hết phiên ban đầu dùng locator ID trùng với input hồ sơ đang ẩn; sửa script chọn textbox đang hiển thị rồi chạy PASS, không sửa sản phẩm để khớp script.

Runtime main báo cảnh báo tương thích có sẵn giữa Flyway hiện tại và MySQL 9.7. Lần khởi động cuối validate37 migration thành công, schema38 đã mới nhất, không cần migration; đợt sửa này không nâng dependency hoặc server database.

Artifact Git-ignored: `reaudit-session-red.log`, `reaudit-native-final.log`, `reaudit-native-reports/`, `reaudit-native-jacoco.xml`, `reaudit-fe-final.json`, `reaudit-summary.json`, `chrome-reaudit-id-red/green.json`, `chrome-reaudit-profile.json`, `chrome-profile.json`, `chrome-main-profile.json`, `reaudit-runtime-prepared.json`. Hai server test đã được dừng sau kiểm chứng; main tiếp tục chạy. Không commit/push.

Skill → áp dụng → bằng chứng: **code-review** → hai review Standards/Spec độc lập và review lại fix session → các phát hiện đã đóng ở trên; **systematic-debugging + tdd-workflow** → tái hiện pattern/race trước sửa, test rollback/revocation → RED rồi GREEN; **browser-testing-with-devtools** → Chrome riêng qua Playwright CLI theo yêu cầu người dùng → ảnh, network và hành vi ở trên; **verification-loop** → hồi quy/build/JDT/hash jar/migration/main smoke → bảng kiểm chứng.

## Phần người dùng sử dụng

Bấm tên tài khoản ở góc phải → **Thông tin cá nhân**. Áp dụng cho Admin tổng, Admin dự án, User thường và Khách:

- Xem ID đăng nhập, loại tài khoản, ngày tạo; ID và loại tài khoản chỉ đọc.
- Sửa tên, email, số điện thoại, chức danh, phòng ban. Chỉ tên bắt buộc.
- Chọn PNG/JPEG ≤2 MiB, tối đa4096px mỗi chiều; server kiểm tra nội dung, chuẩn hóa ≤512px, loại metadata. Có xóa avatar và phản hồi lưu thành công.
- Upload ảnh giữ nguyên nháp thông tin chưa lưu. Lỗi không xóa nháp; xung đột409 chặn ghi đè; đóng khi có nháp phải xác nhận.
- Đổi tên cập nhật header, phiên đang lưu vẫn đăng nhập. Các phiên khác hết hiệu lực khi tên đổi, nhất quán cơ chế accountVersion; không thay quyền. Avatar/thông tin liên hệ dùng version hồ sơ riêng.
- Khách được sửa hồ sơ của chính mình, vẫn không được gọi API nội bộ, ghi dự án hoặc dùng AI. Các trường liên hệ không xuất hiện trong API người khác.

Contract: [mô tả và quy tắc](../api/self-profile.md), [OpenAPI](../api/self-profile.yaml).

## Kiểm chứng

| Phạm vi | Bằng chứng |
| --- | --- |
| TDD backend | 5 test HTTP mới thất bại trước implementation, sau đó PASS; mở rộng thêm concurrent save và account-version conflict |
| Backend cuối | 32/32, 0 skip: profile7, image2, migration5, Guest reporting3, identity controller13, policy2; Maven verify PASS |
| Migration | Fresh core/demo; V37→V38 giữ nguyên tài khoản/history; V36→latest giữ dữ liệu; cố ý dữ liệu membership sai bị từ chối ở V37 (dòng ERROR dự kiến của test) |
| Frontend | 1.255/1.255 trong toàn bộ suite, chạy cuối maxWorkers2; build PASS, còn cảnh báo chunk >500 kB có sẵn |
| Kiểm tập trung | Nhóm profile/navigation/login 27 test PASS, bao gồm 4 test form hồ sơ; không cộng các lần chạy chồng nhau |
| Java diagnostics | 360 source, 0 error/0 warning |
| Contract/diff | Check-Contracts PASS (cấu trúc, không phải validator OpenAPI đầy đủ); git diff --check PASS |
| Chrome riêng | Chrome156.0.8078.74 headless, không điều khiển desktop/user profile; bốn loại tài khoản lưu text, upload/delete avatar, reload, giữ ID/role, giữ session hiện tại và nháp; desktop1440 và Guest375px |
| Chrome mạng | Không uncaught page error hoặc HTTP lỗi bất thường sau đăng nhập. `/me`401 trước đăng nhập và favicon404 là kết quả dự kiến, được phân biệt trong log |
| Main smoke | admin/admin2 login → Tổng quan → menu → hồ sơ → đóng, không lưu dữ liệu giả vào main; health200/UP |

Lượt full frontend đầu có một assertion thứ tự Tab cũ (nay có thêm Thông tin cá nhân) và ba test bị quá thời gian trong lúc nhiều build chạy đồng thời. Sửa assertion, cập nhật hai mock AuthProvider của navigation để đúng contract đầy đủ, chạy lại toàn bộ với hai worker đạt1255/1255. Lỗi selector ở script Chrome được sửa; không sửa sản phẩm để khớp selector sai.

Coverage mới: **SelfProfileDialog** dòng90,32%, nhánh82,85%, statement89,28%, function85,18% (4 test). Ba lớp controller/service/image: dòng51/52, nhánh38/52; đây là nhóm kiểm tra tập trung, không phải coverage toàn backend. Coverage toàn hệ thống của đợt U10 xem báo cáo riêng; không suy ra từ số test PASS.

## Dữ liệu và runtime

U01–U10 đã chuyển main V36→V37: UUID/created_at tài khoản và81 bảng nghiệp vụ giữ nguyên; registry hai Admin, khóa handover.admin, không seed V34. Password dùng giá trị đã được người dùng chỉ định qua file riêng bị Git ignore.

Trước V38 dừng riêng8080, lấy backup mới:

- `var/mysql-native/backups/2026-11-02T18-06-50-353Z-tms.sql` (timestamp UTC).
- SHA-256 `bea5208e1cf313c1c80fe74e4acddb19c1af263d0dfe2a10127329531a976d48`.
- Restore vào `tms_accesscopy_299f066257f8`:89 bảng không gồm session data khớp, thử V38 thành công.
- Main áp dụng đúng V38, đối chiếu **88 bảng cũ** và Flyway history/checksum nguyên vẹn; bảng identity_profiles mới rỗng trước mở dịch vụ. Không tạo hồ sơ giả trong main.
- Backend8080 PID12364 chạy jar đã kiểm chứng SHA-256 `7a3a7e31653ce7537a2423902bf4dea24d494a8c6e992eebffb91c8c41ab0838`; không sửa migration V1–V37. Arena archive chuyển số dự kiếnV39, chưa triển khai Arena.
- `.env.mysql.local` giữ credentials/AI, tắt bootstrap sau provision. Local dùng core + hai SQL demo V20/V22 đã áp dụng, bỏ ignore-ignored rộng cũ. Các bản SQL tương ứng ở `var/mysql-native/legacy-demo-v20-v22`; không đưa demo V34 vào main.

Artifact riêng trong `.superpowers/sdd/2026-11-02-unified-user-access/`: profile-native-red/final.log, profile-native-reports, profile-native-jacoco.xml, profile-fe-final.json, profile-fe-coverage, chrome-profile.json, profile-*.png, profile-cutover.json, chrome-main-profile.json, main-*-profile-v38.png. Không publish credential/provision input. Quét mẫu key/mật khẩu đã chỉ định trong diff+file mới không có hit; không tuyên bố quét mọi loại bí mật.

## Skill → áp dụng → kết quả

| Skill | Áp dụng | Kết quả |
| --- | --- | --- |
| using-superpowers, brainstorming | Kế thừa phần tài khoản đã có, chốt phạm vi cá nhân và giới hạn ID/role với người dùng | Quyết định và contract self-profile |
| api-design, backend-patterns | API riêng của chủ tài khoản; transaction/locking/version; xử lý ảnh có giới hạn | SelfProfileController/Service/Dtos, AvatarImage, V38 |
| tdd-workflow, security-review | Test thất bại trước code; CSRF, ID/role spoof, Guest, stale/concurrent và ảnh không hợp lệ | Native profile7/image2 và hồi quy32 PASS |
| frontend-patterns | Form chung, loading/retry, giữ nháp, upload độc lập, callback cập nhật header, focus/đóng | Profile tests4 + fullFE1255 PASS |
| browser-testing-with-devtools | Kiểm Chrome riêng bằng Playwright CLI theo yêu cầu không điều khiển desktop | 4 persona và main read/login PASS, ảnh đã xem |
| verification-loop | Build/JDT/coverage/review diff, backup/restore, kiểm source khớp jar, cutover và smoke | V38 UP, dữ liệu cũ giữ nguyên |

Giới hạn: nghiệm thu đúng luồng phân quyền/hồ sơ đã nêu, không tuyên bố mọi nút trong toàn hệ thống hoặc mọi trình duyệt đều được kiểm lại. Không gọi AI thật, không commit/push và không thay trạng thái nghiệm thu riêng của S11/FR-12/Arena.
