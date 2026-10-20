# Thanh tiến độ kiểm thử dùng chung — 19/10/2026

## Phạm vi và giao diện

- Ba file sản phẩm/test: `TestProgress.jsx`, `test-progress.css`, `TestProgress.test.jsx` trong `Frontend/src/app/components`.
- Export có tên `TestProgress({ tested, total, label = 'Tiến độ kiểm thử' })`.
- `tested` và `total` nhận số; giá trị không hữu hạn/âm về 0, số lẻ làm tròn xuống. Component không tính lại ý nghĩa trạng thái case; caller cung cấp số đã tổng hợp.
- Nội dung: `3/5 case · 60%`; phần trăm làm tròn xuống. 199/200 là 99%; 1/128 là 0%. Chiều rộng thanh giữ tỷ lệ thực để vẫn thể hiện tiến độ nhỏ.
- Chỉ hoàn thành khi tổng lớn hơn 0 và số đã test đạt/vượt tổng. 0/0 hiển thị `Chưa có case`, không nhận màu hoàn thành.
- ARIA: `progressbar`, tên từ `label`, min=0, max=tổng hoặc 1 nếu rỗng, now=số đã test chặn trong khoảng 0–tổng, valuetext chứa số đếm thực tế và phần trăm. Số đã test vượt tổng vẫn hiển thị nguyên số đã nhận để không che dữ liệu không nhất quán.
- CSS riêng: `.test-progress`, `.is-complete`, `.is-empty`; cam qua `--color-progress-incomplete` (fallback #d97706), xanh qua `--color-progress-complete` (#147e75), nền qua `--color-progress-track` (#e7eeec). Không đổi token màu kết quả của hệ thống. Có hỗ trợ reduced motion.

## Skill → cách dùng → bằng chứng

- `frontend-ui-engineering`: tách trình bày khỏi dữ liệu, token ngữ nghĩa, thông tin không phụ thuộc riêng màu, nhãn cho trình đọc màn hình → JSX/CSS có ARIA theo số case và chữ số đi kèm.
- `test-driven-development` + `writing-good-tests`: test hành vi trước, scaffold export trả null để thu lỗi hành vi thay vì lỗi import; sau đó viết triển khai tối thiểu → `red.log` có 8 test thất bại do chưa có progressbar; `green.log` có 8/8 đạt.
- `verification-before-completion`: chạy test trên mã cuối, đọc số test và exit code → `result.json` exitCode=0. Không suy coverage từ số test.

## Kiểm chứng và giới hạn

- Lệnh từ root: `rtk proxy node ...` gọi `node_modules/vitest/vitest.mjs run src/app/components/TestProgress.test.jsx --maxWorkers=1` với cwd `Frontend`.
- RED: 8 thất bại; GREEN: 8 đạt, 1 file, 1,18 giây.
- Test bao phủ nhãn/tỷ lệ/ARIA, 199/200→200/200, 0/0, số vượt tổng, âm, Infinity và NaN.
- Full suite/build và kiểm chứng Chrome/responsive do root thực hiện sau khi tích hợp. Chưa đo coverage. Chưa tự kiểm chứng màu CSS trên trình duyệt.
- Không chỉnh backend, dữ liệu, API, routing, global CSS; không commit/push.
