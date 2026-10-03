# Sửa con lăn chuột trên các vùng cuộn

Nhánh `system-design`, 03/10/2026. Yêu cầu: con lăn không cuộn được tại nhiều màn hình/hộp thoại.

## Nguyên nhân và sửa

App khởi tạo Lenis tại window với smoothWheel=true, allowNestedScroll mặc định false. Listener gọi preventDefault cho wheel trên vùng lồng nhau không có data-lenis-prevent, chuyển điều khiển sang cuộn trang gốc. Bảng/hộp thoại có overflow riêng vì thế mất cuộn mặc định. Một số màn đã có ngoại lệ data-lenis-prevent nên không bị đồng đều.

Gỡ hook Lenis toàn ứng dụng, dependency và CSS/class Lenis trên index.html; dùng cuộn mặc định của trình duyệt cho trang, bảng, sidebar và modal. Giữ nguyên bố cục, dữ liệu, quyền và các thao tác bàn phím. Không thêm listener wheel mới hoặc ngoại lệ theo từng màn. Các thuộc tính data-lenis-prevent cũ còn lại không chặn cuộn khi không có Lenis.

## Bằng chứng

- Dùng tdd-workflow: 6 test RED tái hiện wheel.defaultPrevented=true qua App thật/Lenis thật (chỉ mock nội dung API); sau sửa GREEN. Bổ sung hai trường hợp mở URL mặc định/legacy: 8/8 PASS.
- Test bao gồm trang, dialog, bảng hai chiều, sidebar, đổi route, StrictMode/remount và Ctrl+wheel. Coverage riêng App.jsx 100% statements/branches/functions/lines, không suy ra coverage toàn app.
- Regression final: **246/246 tests, 29 file PASS**; build PASS (1666 modules); git diff --check PASS.
- Browser native bằng thao tác scroll thực của CUA, không gán scrollTop bằng JavaScript: bảng document4 có scrollHeight12403/clientHeight348, top0→708; cuộn ngang left0→867.2. Dialog chi tiết top0→446.4; modal phiên bản (không có ngoại lệ Lenis) top0→344.8. Trang thư viện #/tests/cases top0→335.2, scrollHeight950/clientHeight614. HTML sau reload không còn class Lenis.
- Ảnh kiểm chứng local: output/playwright/native-wheel-dialog.jpg. Không sửa kết quả test case hoặc database trong lần kiểm tra.

Frontend dev đang phục vụ code mới; tải lại trang để loại listener của phiên trước. Backend không đổi, không cần restart. S11 vẫn IN_REVIEW theo gate UAT/pilot cũ. Không commit/push trong yêu cầu sửa này.
