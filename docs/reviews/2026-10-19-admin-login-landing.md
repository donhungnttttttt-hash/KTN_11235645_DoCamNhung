# Admin đăng nhập mới bị đưa vào không gian dự án — 19/10/2026

## Nguyên nhân và phạm vi

Người dùng đăng nhập Admin tổng nhưng vào màn dự án. Trước đó chỉ kiểm tra sự tồn tại của route `/admin` là chưa đủ: màn Admin vẫn có, nhưng trạng thái điều hướng sau đăng nhập bị sai.

`RoleApp` dùng query `workspace=1` và ref `workspaceIdentity` để giữ lựa chọn không gian dự án. Ref nằm ngoài `AuthBoundary`, vì vậy logout/login **cùng tài khoản** vẫn giữ lựa chọn cũ. Khi mở sẵn URL workspace mà chưa đăng nhập, `RoleApp` chỉ mount sau login và lại lấy lựa chọn từ query cũ. Hai đường này đưa Admin mới đăng nhập vào dự án.

Bản sửa chỉ thay `Frontend/src/AppEntry.jsx`: khi trạng thái xác thực là `anonymous`, đặt lựa chọn về `{id:null,optedIn:false}`. Không dùng `null`, vì `null` sẽ khiến `RoleApp` khởi tạo lại từ URL. Không đổi quyền, API, backend, mật khẩu, schema hoặc dữ liệu nghiệp vụ.

## Hành vi sau sửa

- Đăng nhập Admin mới từ URL workspace cũ → `#/admin`, **Tổng quan hệ thống**.
- Đăng xuất rồi đăng nhập lại cùng Admin → không kế thừa lựa chọn workspace cũ.
- Đăng nhập sai rồi thử lại đúng → vẫn vào Admin.
- Đang đăng nhập hợp lệ, chủ động mở Không gian dự án rồi tải lại → giữ màn dự án.
- Hết phiên, đăng nhập lại cùng tài khoản → giữ workspace để không bỏ bản nháp đang làm.
- PM/Tester/Dev vẫn vào không gian dự án; quyền truy cập Admin không thay đổi.
- Các đường dẫn rõ ràng sẵn có trong khu Admin như `#/admin/projects` vẫn được giữ. Bản sửa xử lý việc kế thừa workspace sau login, không xóa deep link Admin.

## Kiểm chứng và giới hạn

- TDD trước sửa: 3 lỗi đúng kỳ vọng / 8 test. Ba lỗi là login mới từ query cũ, logout/login cùng Admin, và login sai rồi thử lại. Không lỗi setup hoặc import.
- Sau sửa: **38/38 test trong 3 file PASS**, gồm 8 test mới với AppEntry/AuthProvider/AuthBoundary/RoleApp thật, các test routing và auth hiện có. API được giả lập; chat không liên quan được tách khỏi bộ test này.
- Build: **PASS**, exit 0, Vite 6.4.3, 1.701 module. Toàn bộ frontend: **1.141/1.141 test trong 123 file PASS**, exit 0, 364,45 giây; không có lỗi hoặc warning trong log cuối. Các receipt `frontend-full-result.json` và `build-result.json` ghi thời gian và lệnh thực tế.
- Chrome thật trên `127.0.0.1:5173`: tái hiện login `syp.demo.admin` vào workspace trước sửa; sau logout/login đã vào `#/admin`, heading **Tổng quan hệ thống**. Chuyển sang workspace và tải lại giữ đúng workspace. Đã kiểm thêm logout → tải lại hoàn toàn URL workspace khi anonymous → login: cũng vào `#/admin`; bằng chứng `admin-after-anonymous-reload.json`. Đã đăng xuất phiên do tôi mở và đóng tab kiểm thử; không đổi viewport.
- Trên browser chỉ đọc màn hình và đăng nhập/đăng xuất tài khoản demo. Các thao tác xác thực có audit kỹ thuật; không thực hiện ghi dữ liệu nghiệp vụ. Reauthentication do hết phiên được kiểm bằng test, chưa ép hết phiên trên browser.
- Không đo coverage mới; không dùng số test để suy ra coverage hoặc nghiệm thu mọi trạng thái toàn hệ thống.

## Skill → mục đích → bằng chứng

| Skill | Dùng cho việc gì | Bằng chứng |
| --- | --- | --- |
| `systematic-debugging` | Lần theo URL, ref, mount/unmount và auth status; phân biệt fresh login với reauthentication | Hai đường lỗi gốc được tái hiện bằng test; lỗi chính tái hiện trên Chrome |
| `test-driven-development`, `writing-good-tests` | Viết test hành vi trước sửa, giữ entry/auth/router thật | `landing-red.log` có 3 lỗi; `landing-green.log` có 38 test đạt |
| `verification-before-completion` | Đối chiếu diff, test, build, review độc lập và browser | Receipt có thời gian/exit code; không coi route còn tồn tại là login đã đúng |
| `computer-use` | Thao tác Chrome bằng CUA và lưu ảnh trước/sau | `workspace-after-original-login.png`, `admin-after-login.png`, `admin-after-login.json` |

Đã đọc SKILL.md tại `C:/Users/admin/.codex/skills/<tên>/SKILL.md`; computer-use tại plugin bundle `computer-use/26.1013.40934/skills/computer-use/SKILL.md`. Reviewer độc lập đọc bản sửa và test, không phát hiện vấn đề cần chặn; reviewer không tự chạy test hoặc browser.

Bằng chứng: [var/admin-login-landing-2026-10-19](../../var/admin-login-landing-2026-10-19/). `preservation-result.json` đối chiếu checkpoint trước: chỉ AppEntry thay đổi trong các file sản phẩm đã theo dõi; các sửa chữa trước, hai test mới của lượt trước và 104 file báo cáo có sẵn giữ nguyên. Test mới của lượt này được bổ sung riêng. Không commit/push/merge/deploy, restart hoặc migration. S11/FR-12 vẫn IN_REVIEW.

Checklist:

- [x] Tái hiện lỗi bằng test trước sửa và trên Chrome thật.
- [x] Sửa luồng anonymous, giữ authenticated reload và expired reauthentication.
- [x] 38 test liên quan, toàn bộ 1.141 test frontend và build đạt.
- [x] Review độc lập, bảo toàn thay đổi cũ và đóng phiên kiểm thử.
- [x] Cập nhật kế hoạch và bằng chứng.
- [ ] Browser reauthentication hết phiên và mọi tổ hợp vai trò/trạng thái; không coi chúng đã được kiểm trực tiếp trong lượt này.
