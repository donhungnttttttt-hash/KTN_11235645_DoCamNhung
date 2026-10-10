# Thu gọn bảng kho thiết bị — 10/10/2026

Theo yêu cầu giảm chữ và làm bảng gọn, giới hạn thay đổi tại bảng kho thiết bị Admin và dòng đếm kết quả. Chữ bảng/nút 12px, khoảng đệm hàng 10px; bỏ lặp mã tài sản trong chữ nút Sửa/Bàn giao/Thu hồi. Accessible name và tooltip vẫn chứa mã máy đầy đủ. Cột có độ rộng ổn định, nội dung dài xuống dòng; vùng bảng có tên và cuộn được bằng bàn phím. Nút desktop cao 32px, màn nhỏ hoặc thiết bị cảm ứng giữ ít nhất 44px. Không đổi API, dữ liệu hay phân quyền.

Skill: `ui-ux-pro-max`, áp dụng hướng dẫn trực tiếp về typography, vùng bấm, nhãn accessible và responsive. Công cụ tìm hướng dẫn Python không chạy được vì python/python3/py không có trong PATH; không coi đó là kết quả tra cứu thành công.

Kiểm tra:

- Trước sửa Chrome: chữ bảng/nút 13px, nút 44px, hàng đầu 85.30px. Sau sửa cùng viewport: chữ 12px, nút 32px, hàng đầu 61px.
- Chrome tại 1366px: bảng 1104px; tại 1024px: bảng/vùng chứa 788px, không tràn trang.
- Tại 375px: trang 369px, vùng bảng 337px, bảng 760px cuộn riêng; nút 44px. Focus vùng bảng và ArrowRight cuộn ngang 40px. Đã khôi phục viewport mặc định.
- Bấm Sửa mở đúng mã máy; Hủy trả focus về nút gốc, không ghi dữ liệu.
- `rtk proxy npm.cmd test -- src/app/features/admin/inventory.test.jsx src/app/features/admin/device-editor-focus.test.jsx`: 13/13 PASS. Cập nhật selector test hiện có theo accessible name; không thêm test mô phỏng CSS.
- `rtk proxy npm.cmd run build`: PASS, cảnh báo bundle >500kB hiện hữu (583.30kB JS).
- Không chạy lại backend/full suite hoặc đo coverage cho thay đổi trình bày này. Một lần chụp ảnh ở 1024px bị timeout; số đo DOM responsive thành công, ảnh desktop đã kiểm tra. S11 vẫn IN_REVIEW.
