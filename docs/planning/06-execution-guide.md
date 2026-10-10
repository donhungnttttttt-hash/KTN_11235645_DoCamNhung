# Cách thực hiện một sprint

Ngày lập: 22/09/2026. Đây là quy trình phát triển, chưa phải bằng chứng triển khai.

## Lệnh người dùng có thể dùng

| Yêu cầu | Cách xử lý |
| --- | --- |
| `Làm Sprint 1` | Mở SPRINT-01, đọc phụ thuộc, làm task S01 theo thứ tự; không tự làm S02 |
| `Làm task S06-T02` | Chỉ làm task đó và phần phụ thuộc đã có; báo thiếu prerequisite nếu có |
| `Tiếp tục sprint đang làm` | Đọc activeSprint + task chưa DONE trong STATUS.json và nhật ký của sprint |
| `Kiểm tra Sprint 5 đã xong chưa` | Đối chiếu checklist với code và kết quả kiểm tra; không tự thêm chức năng |
| `Lập lại kế hoạch Sprint 9` | Cập nhật phạm vi/dependency/risks, không tự bắt đầu integration |

Nếu chưa có activeSprint, thông báo sprint gần nhất đang dở hoặc đề xuất sprint đầu tiên đủ điều kiện; không đoán rồi triển khai cả lộ trình. Số sprint là mã phạm vi cố định, không phải lời hứa về ngày hoàn thành.

## Trước khi bắt đầu

1. Đọc AGENTS.md, STATUS.json, file sprint, discovery, business rules và API/database phần liên quan.
2. Kiểm tra nhánh, working tree, thay đổi mới, references và dependency. Không ghi đè code người dùng.
3. Khi bắt đầu S01, đã xác nhận `develop` chứa frontend tại merge commit `3355cfc` và tạo nhánh `feature/sprint-01-foundation`. Đây là bằng chứng tại thời điểm đó; lần sau vẫn kiểm tra code cần dùng trên develop và working tree trước khi tạo nhánh, không tự merge nếu chưa được yêu cầu.
4. Khi người dùng yêu cầu triển khai sprint, đặt activeSprint về mã đó, status IN_PROGRESS và task đầu tiên IN_PROGRESS. Không đổi trạng thái chỉ vì đọc tài liệu.
5. Trình bày ngắn mục tiêu và đầu ra trong phạm vi sprint. Câu hỏi chưa rõ chỉ chặn task phụ thuộc, không chặn công việc độc lập đã được phép.

## Vòng làm việc của mỗi task

Requirement → Business rule → Domain → Database/migration → API contract → Backend + tests → Frontend + states/tests → Integration → Review → Tài liệu.

Từ 29/09/2026, chủ động chọn skill theo [hướng dẫn áp dụng ECC](../development-skills.md) trong mỗi vòng làm việc. Đọc skill trước khi dùng, ghi skill và bằng chứng vào nhật ký; áp dụng theo stack hiện có và scope sprint. Khi sửa hành vi, dùng test tái hiện trước rồi sửa; khi kết thúc, dùng `verification-loop` và ghi rõ kiểm tra chưa chạy/coverage chưa đo.

- Có thể ghi N/A cho tầng không liên quan, kèm lý do; không tạo lớp hoặc migration rỗng để đủ checklist.
- Contract được cập nhật trước implementation của feature; không đợi làm xong backend rồi để UI đoán field.
- Chỉ ghi trạng thái người dùng đã thao tác thành công trên server. Hiển thị loading/error/retry và 401/403/404/409 khi phù hợp.
- Dữ liệu mẫu tách profile; không dùng mock fallback để che API lỗi trong chế độ thật.
- Các thay đổi database theo [kế hoạch Flyway](04-database-and-migrations.md). Không sửa migration đã áp dụng ở môi trường dùng chung.
- Mỗi lần làm xong cập nhật task: kết quả, đường dẫn file, lệnh test/build + PASS/FAIL/NOT_RUN, blocker, next action. Ghi commit nếu thực sự đã commit.
- Nếu phải làm task của sprint khác, ghi lý do và phạm vi; không âm thầm mở rộng. Nếu chỉ phát hiện lỗi không liên quan, đưa vào backlog.

## Trạng thái chuẩn

| Trạng thái | Nghĩa |
| --- | --- |
| PLANNED | Đã có mô tả, chưa bắt đầu |
| IN_PROGRESS | Có công việc triển khai đang làm |
| IN_REVIEW | Đã có đầu ra chờ kiểm tra hoặc quyết định được ghi rõ |
| BLOCKED | Task không thể tiến thêm do một điều kiện được nêu cụ thể |
| DONE | Đạt đủ tiêu chí, có bằng chứng |

STATUS.json là nguồn trạng thái công việc phát triển. File sprint là nguồn scope/checklist và nhật ký. Nếu mâu thuẫn, kiểm tra bằng chứng trong code rồi cập nhật cả hai; không dùng ngày cũ để suy đoán DONE.

## Definition of Ready

- Hiểu mục tiêu, actor, dữ liệu vào/ra và business rule của task.
- Phụ thuộc cần thiết đã có; những câu hỏi chặn task đã được giải quyết, hoặc task chỉ tạo nền tảng không phụ thuộc câu trả lời.
- Biết file/module sẽ sửa, cách kiểm chứng, và rủi ro thay đổi database/API.
- Yêu cầu người dùng hiện tại bao phủ task. Không cần phê duyệt lại một thay đổi kỹ thuật thông thường đã nằm trong sprint được yêu cầu.

## Definition of Done dùng chung

- [ ] Requirement, rule và quyết định được ghi lại; không còn giả định nghiệp vụ bị giấu.
- [ ] Domain, contract, schema/migration có review cho phần thay đổi; N/A có lý do.
- [ ] Backend enforce validation/quyền/project scope/transition; frontend chỉ hỗ trợ UX.
- [ ] Transaction, idempotency/concurrency, error response và audit đáp ứng rủi ro của task.
- [ ] Màn hình có loading, empty, success và các trạng thái lỗi liên quan; không mất dữ liệu nhập khi lỗi.
- [ ] Test nghiệp vụ và các regression liên quan PASS; build/compile PASS.
- [ ] Migration kiểm tra fresh database + upgrade từ bản trước khi có schema change.
- [ ] Không có lỗi critical còn mở trong phạm vi; giới hạn còn lại được mô tả trung thực.
- [ ] Tài liệu, STATUS.json, nhật ký task cập nhật; bằng chứng không chứa bí mật hoặc dữ liệu khách thật.

Từ S01, chạy `rtk proxy npm test` và `rtk proxy npm run build` trong Frontend; backend từ gốc repo dùng `rtk proxy powershell -NoProfile -File scripts/Test-Backend.ps1` với Docker đang hoạt động. Script chạy Maven verify và tắt DEBUG/TRACE kế thừa, khôi phục biến môi trường sau khi chạy; có thể truyền `-Tests` để chọn suite. Cấu hình và phiên bản tại [development.md](../development.md). Không báo đã chạy kiểm tra chưa thực hiện; không cài/chạy môi trường nếu tác vụ chỉ yêu cầu lập kế hoạch.

Cập nhật 01/10: runtime ưu tiên MySQL native theo yêu cầu người dùng. Bộ integration test Testcontainers nói trên vẫn là công cụ riêng; không yêu cầu người dùng bật Docker để chạy app, không tự tạo môi trường container mới khi native chưa có credential và không chạy test có ghi/xóa lên schema đang sử dụng. Xem [Workbench/native](../database/mysql-workbench.md).

Khi cần đánh giá coverage FE, chạy `rtk proxy npm run test:coverage` trong Frontend; báo cáo gồm cả file chưa được test, không dùng số test để thay coverage. Gate riêng S05: `npm run test:execution:coverage`; S06: `npm run test:work-items:coverage`; S07: `npm run test:retest:coverage`; S08: `npm run test:reporting:coverage`; S09: `npm run test:integration:coverage`, yêu cầu >=80% ở bốn chỉ số trong phạm vi file đã công bố trong config; không suy toàn app đạt mức này. Backend JaCoCo ghi báo cáo sau `verify`; kiểm tra gate package bằng `rtk proxy powershell -NoProfile -File scripts/Check-BackendCoverage.ps1 -Package vn/syp/tms/retest`. Kiểm tra cấu trúc contract S03–S10 và các liên kết tài liệu bằng `rtk proxy node scripts/Check-Contracts.cjs` tại gốc repo; đây không phải trình xác thực đầy đủ chuẩn OpenAPI.

## Kết thúc sprint

Ghi: task DONE, task chưa xong và lý do, demo path, test evidence, migration mới, quyết định còn lại. Chuyển sprint kế tiếp theo quyền tiếp tục bên dưới. Commit/push/merge/deploy theo yêu cầu riêng của người dùng, không tự xem đó là điều kiện cần để báo phần code đã xong.

**Cập nhật quyền thực hiện ngày 29/09/2026:** người dùng đã yêu cầu “luôn làm tiếp các sprint sau đó”. Sau khi ghi nghiệm thu một sprint, tiếp tục đọc và triển khai sprint kế tiếp đủ điều kiện, không kết thúc chỉ để xin lại quyền bắt đầu. Chờ câu trả lời khi thiếu quyết định nghiệp vụ bắt buộc, đồng thời tiến hành phần độc lập. Quyền tiếp tục không đồng nghĩa quyền tự commit/push/merge/deploy hoặc tự xác nhận rule khách hàng, UAT hay kết quả kiểm thử chưa chạy.

## Change control và ước lượng

Ước lượng trong sprint là ngày công tập trung, chưa tính thời gian đợi khách, tài khoản, môi trường và sửa do thay đổi đặc tả. Sau S01–S02 đo năng lực thực tế rồi chia task lớn hoặc tách sprint. Không tăng phạm vi để lấp đầy thời gian. Hoãn tính năng cần quyết định bằng cách ghi blocker và liên kết Q-ID; không bỏ kiểm thử để giữ lịch.
