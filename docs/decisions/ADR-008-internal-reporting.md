# ADR-008 — Báo cáo, NA và chốt đợt nội bộ

Ngày: 29/09/2026. Người dùng đã xác nhận cả ba câu hỏi cho Sprint 8 trong hội thoại. Đây là quyết định nghiệp vụ, chưa phải xác nhận implementation hoàn thành.

- Đơn vị đếm là run item (case revision × cấu hình trong đợt), không phải số attempt. Phạm vi áp dụng D = tổng run item T − số NA được PM duyệt N. Tiến độ thực thi = (OK + NG) / D; tỷ lệ đạt = OK / D. P và chờ retest không phải đạt. D = 0 trả tỷ lệ null, UI ghi “Chưa có phạm vi áp dụng”.
- Chỉ PM dự án được loại một run item khỏi phạm vi với lý do (NA). Không sửa/xóa execution trước đó; lưu quyết định và người/thời điểm.
- PM chốt đợt khi không còn Chưa chạy/P trong phạm vi áp dụng, mọi NG đã liên kết bug, và PM ghi nhận tồn đọng. PM mở lại có lý do. Đợt đóng khóa ghi thêm.
- Chỉ thành viên nội bộ xem báo cáo. Chưa mở tài khoản khách hàng.
- Dùng mẫu .xlsx nội bộ trước: tổng hợp và dữ liệu nguồn, bộ lọc, thời điểm số liệu và múi giờ dự án; export cùng definition/scope với màn hình, không tự gửi ra ngoài.
- TMS là nguồn trạng thái bug cho bản nội bộ theo ADR-007. Fix chỉ là dev báo sửa, không tự ghi execution OK. BUG_ONLY giữ nguyên execution trước đó.

Sprint 8 triển khai sau khi kiểm chứng S07. Công thức này không đại diện cho quy tắc báo cáo của khách hàng chưa được cung cấp.
