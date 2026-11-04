# Arena: điều chỉnh khi triển khai ngày 03/11/2026

Người dùng yêu cầu **“Triển khai phần còn lại của kế hoạch Arena”** sau khi commit `ba2ccb5` đã push lên `origin/system-design`. Đây là quyền triển khai AR-00–AR-11; không phải quyền commit/push tiếp, merge, deploy hoặc ký UAT. Kế hoạch gốc và archive Arena giữ làm căn cứ lịch sử.

## Quyết định hiện hành ưu tiên kế hoạch 25/10

| Nội dung cũ | Áp dụng hiện tại |
| --- | --- |
| TESTER/DEV riêng; PM tạo TESTER | USER hợp cả Tester/Dev. PM được cấp quyền tạo chỉ tạo USER. Kiểm Admin dự án/USER/Khách và hai Admin tổng theo contract đã triển khai. Không khôi phục dropdown vai trò. |
| QA chuyển trạng thái thủ công, không có workflow xác minh | Ticket Bug/QA đã được người dùng duyệt và triển khai V39: trách nhiệm spec/điều phối, người xác nhận, chín cột, comment/thông báo. AR-03 kiểm luồng này; chỉ API run/retest/QA answer cũ vẫn nghỉ. |
| Không thêm notification | Giữ notification Ticket đã được duyệt; không khôi phục inbox hoặc notification cũ. |
| Archive dự kiến V35/V37/V39 | Các số này đã được dùng. Migration archive tiếp theo dự kiến V40, kiểm mọi SQL/Java location trước tạo; giữ V1–V39. |
| Upgrade từ V33/V34 | Bổ sung upgrade core/core+demo V39 lên V40; giữ fresh core/core+demo và các đường nâng từ V33/V34 để chứng minh khả năng cài đặt liên máy. |
| AR-01/profile cần implementation mới | Đã triển khai trong ba2ccb5. Xác minh lại bằng test hiện hành, chỉ sửa khi tái hiện thiếu sót. |
| Kế hoạch chỉ lập tài liệu | Nay được triển khai. S11/FR-12, live provider và human UAT vẫn có gate riêng; không tự đánh dấu hoàn tất. |

## Ranh giới kiểm chứng

- Giữ nhánh `system-design` tại workspace người dùng chỉ định; build, database và storage kiểm thử tách riêng. Không khởi tạo server/container mới hoặc ghi fixture vào `tms`.
- Được chuẩn bị schema rỗng mới trên MySQL native hiện có theo ủy quyền trước; provenance phải ghi nhận việc tạo và migrate thực tế. Không coi schema cũ là disposable. Runner integration không tự provision/migrate/reset.
- USER thường thực hiện việc test và xử lý Ticket theo phân công/trách nhiệm hiện tại. Khách chỉ xem phạm vi báo cáo được phép. Các ca cũ cấm DEV thao tác Status cần đổi thành kiểm người ngoài phạm vi/đã bị thu hồi phân công, không phục hồi ranh giới Tester/Dev.
- Ngoại lệ archive vẫn chỉ cho `UNFINISHED_CYCLES`/`OPEN_RETESTS`, cần Admin tổng xác nhận có lý do và snapshot. Mọi hard blocker giữ nguyên. U26 phải tái hiện trước khi hỏi quyết định về Issue đã xóa mềm hoặc nằm trong Feature/file ẩn; không tự miễn blocker.
- Rules là cấu hình lịch sử. Không gắn rule engine cũ vào Ticket V39 và không sửa policy đã được duyệt.
- Baseline sản phẩm đã có kết quả kiểm thử trước; chiến dịch Arena vẫn chạy các ca hiện hành và ghi bằng chứng riêng. Không sao chép PASS cũ để điền ma trận mới.
- Chỉ chuẩn bị artifact và kiểm thử cô lập trong kế hoạch này; không nâng database/restart backend main như một tác dụng phụ của test. Bàn giao local runtime riêng được xem xét sau khi có kết quả cụ thể.

## Trình tự

AR-00 và chuẩn bị AR-11 → AR-08 → AR-06 → AR-07 → AR-01/02/03/04/05 → AR-09 → AR-10 → AR-11. Nhánh chẩn đoán timeout AR-04 có thể chuẩn bị sớm. Phụ thuộc contract và fixture được chốt trước task sử dụng.

Skill thực thi: `using-superpowers`, `subagent-driven-development` cho task/review; các skill API, bảo mật, TDD, React và kiểm chứng dùng theo bảng phân công kế hoạch gốc, ghi receipt thực tế cho từng task. Quyền giữ workspace và không commit hiện tại ưu tiên bước tạo worktree/commit mặc định trong skill.

## U26 — quyết định người dùng 03/11/2026

Người dùng chọn **giữ nghĩa vụ và cho khôi phục Ticket Monkey đã xóa**; **tiếp tục cho ẩn file và bổ sung khôi phục file**. Không còn chờ lựa chọn nghiệp vụ hai trường hợp này. Giữ OPEN_WORK_ITEMS, không tự đóng Ticket; khôi phục giữ ID/nội dung/Status/lịch sử. Bổ sung task AR-12 trước AR-10 để thực hiện UI/API/quyền/version/retry và kiểm chứng. Các blocker legacy khác/G07 và gate pilot không vì vậy tự hoàn tất.

Quyền khôi phục dùng cùng phạm vi với quyền xóa/ẩn hiện hành: PM dự án/Admin tổng; riêng USER tự tạo Monkey được khôi phục Monkey của mình. Parent project/Feature phải hoạt động, không khôi phục cha ngầm. Đây là lựa chọn kỹ thuật đối xứng quyền hiện có; không đổi loại tài khoản hay phân công.
