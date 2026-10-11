# Rà soát UI, popup và danh sách lựa chọn — 10/10/2026

## Yêu cầu được duyệt

Người dùng yêu cầu sửa form tạo dự án đang hẹp, dài và nằm chen trong trang; rà soát các màn hình/popup/responsive. Bổ sung trong lúc triển khai: các danh sách chọn nhiều phải có bộ lọc, tách cột **Ô chọn | Tên**, đặt **Chọn tất cả** phía trên tiêu đề và dùng cỡ chữ gọn, dễ đọc.

Nhánh `system-design`. Không commit/push/merge/deploy. Không thay đổi quy tắc phân quyền, số lượng tài nguyên hay payload nghiệp vụ trong phần UI này. Các sửa đổi Admin import Excel/V26 có trước được giữ nguyên và theo dõi riêng.

## Thiết kế thực hiện

1. Form quản trị dùng dialog có tiêu đề/đóng cố định, phần nội dung cuộn riêng, nút lưu/hủy dễ tiếp cận. Tạo dự án rộng tối đa 1080px; thông tin chung và hai nhóm thành viên/thiết bị chia cột trên desktop, xếp dọc trên mobile.
2. `SelectionTable` dùng chung cho thành viên, máy ban đầu, revision trong công việc theo file, phạm vi đợt test và coverage retest. Bộ lọc gồm tìm kiếm và trạng thái tất cả/đã chọn/chưa chọn; tài khoản thêm lọc vai trò qua API có sẵn. Các danh sách phân trang phía server giữ tìm kiếm hiện hành.
3. Chọn tất cả chỉ tác động các dòng hợp lệ đang hiển thị. Không tự chọn toàn bộ database. Lọc/chuyển trang không xóa lựa chọn đã có. Các trường vai trò, người nhận, ngày trả và ghi chú bàn giao đã nhập được giữ khi lọc.
4. Bảng công việc giữ bộ lọc nghiệp vụ và các cột hiện hành; bổ sung chọn toàn bộ dòng công việc hợp lệ trên trang. QA không được đưa vào thao tác hàng loạt vốn chỉ dành cho công việc thường.
5. Bảng chọn dùng chữ 12px, thông tin phụ xuống dòng, tiêu đề cố định và vùng cuộn giới hạn. Vùng bấm checkbox rộng hơn hình checkbox; mobile có mục tiêu bấm 44px. Bảng dữ liệu nhiều cột tiếp tục cuộn ngang trong vùng riêng.
6. Sửa dùng Escape/Tab khi chat AI không modal đang mở; khóa cuộn trang nền và trả focus khi đóng dialog. Điều chỉnh giới hạn chiều cao popup test case/công việc, menu tài khoản và reduced motion.
7. Theo phản hồi tiếp: gom tìm kiếm, vai trò và hiển thị vào cùng một thanh lọc; desktop cao36px, tìm kiếm tối đa260px trong bộ chọn, tên nhãn ngắn. Mobile giữ44px và tự xuống dòng. Áp dụng kích thước gọn cho user/thiết bị/audit, tìm dự án, công việc, file, báo cáo, thư viện và tìm ticket AI. Sửa hàng lọc file bị lệch do pager và đổi nhãn liên kết QA sang ngôn ngữ nghiệp vụ.

## Tiêu chí và trạng thái

| Tiêu chí | Bằng chứng | Trạng thái |
| --- | --- | --- |
| Form tạo dự án là modal vừa viewport | Test hành vi + Chrome desktop/mobile | Đạt local |
| Bộ lọc, cột chọn/tên và chọn tất cả | Component test + chọn 6 PM trên UI | Đạt local |
| Giữ lựa chọn và bản nháp qua bộ lọc/phân trang | Member/device integration tests | Đạt local |
| Không chọn dòng không hợp lệ | SelectionTable test + regression nghiệp vụ | Đạt local |
| Escape, focus, khóa cuộn nền | Dialog/hook tests | Đạt local |
| Không tràn ngang toàn trang ở các route đã kiểm tra | Chrome viewport measurements | Đạt trong phạm vi báo cáo |
| Hồi quy frontend/build | 736 test; build PASS; 4 test PASS sau chỉnh bố cục cuối | Đạt local |
| Safari, thiết bị cảm ứng thật, tất cả tổ hợp dữ liệu/role | Chưa chạy | Chưa nghiệm thu |

Xem [báo cáo kiểm chứng](../reviews/2026-10-10-ui-dialog-selection-audit.md). Phần triển khai local hoàn thành; S11 vẫn IN_REVIEW và không suy từ kết quả này rằng toàn bộ sản phẩm đã hết mọi lỗi UI.
