# Arena — ma trận nghiệm thu trên luồng hiện tại

Ngày lập: 25/10/2026. [Kế hoạch chính](../superpowers/plans/2026-10-25-arena-followup.md). Người dùng đã chọn giữ Feature/Bug–QA, áp dụng kết luận Arena còn phù hợp.

**Toàn bộ ca dưới đây hiện là `NOT_RUN`.** Đây là tiêu chí tương lai, không phải báo cáo test. Không lấy số PASS cũ, score Arena hoặc exit 0 của suite toàn SKIP làm bằng chứng.

Tái phân tích trên `a45974a`: bổ sung U23–U26 theo thay đổi thành viên/hồ sơ và lỗi AI/blocker mới phát hiện. Các receipt trước đó được tham chiếu làm đầu vào, chưa thay thế chạy cả ma trận trên một baseline. Xem [báo cáo tái phân tích](../reviews/2026-10-25-arena-plan-reanalysis.md).

## Cách ghi receipt

Mỗi lần chạy ghi: `caseId`, `taskId`, source HEAD + hash diff chưa commit, schema + Flyway version/checksum, manifest fixture, browser/build khi có, role/actor giả lập, bước UI/API, expected/actual, ID bản ghi + count/hash trước/sau, command/test-count/skips, evidence path, ngày/người thực hiện, kết luận và người xác nhận UAT. Không lưu token, cookie, mật khẩu hoặc nội dung khách chưa cho phép công bố.

Trạng thái: `NOT_RUN`, `PASS`, `FAIL`, `BLOCKED`, `NOT_APPLICABLE` có lý do. Ghi riêng `automated`, `native`, `browser`, `humanUat`; PASS một lớp không điền hộ lớp khác. Dùng thư mục local `var/arena-followup/<run-id>/` mới cho từng baseline; báo cáo tổng hợp đã khử dữ liệu riêng ở `docs/reviews/2026-10-25-arena-followup.md` sẽ tạo khi thực thi.

## Ca chấp nhận

| ID | Task / vai trò | Thao tác và kết quả bắt buộc | Bằng chứng tối thiểu | Kết quả |
| --- | --- | --- | --- | --- |
| U01 | AR-00 / người chạy test | Từ chối `tms`, host không loopback, schema sai mẫu, manifest không khớp, sai Flyway/checksum, selector không allowlist trước Maven/mutation; storage phải mới/owned trong run-dir, không kế thừa app storage hay junction thoát phạm vi; suite yêu cầu native không được toàn skip | Node/Java negative tests + trace không connect/mutate; app-storage sentinel giữ nguyên; positive isolated DB+storage receipt | NOT_RUN |
| U02 | AR-01 / ADMIN, PM | Grant → PM reauth → tạo TESTER ngoài Admin; không tạo ADMIN/PM/DEV, không cấp tiếp, không tự membership; double click chỉ một user/audit | FE + HTTP + browser, user/audit count, request count | NOT_RUN |
| U03 | AR-01 / PM | Duplicate username giữ nháp; revoke **commit trước server kiểm quyền create** → phiên cũ bị từ chối, reauth không grant thì entry/dialog biến mất; không gửi lại payload; tài khoản khác không thấy nháp. Request đã được kiểm quyền trước revoke có thể hoàn tất: read-back kết quả, không hứa rollback | 401/403/409 receipt, timeline revoke/authorization, DOM/focus, không thêm user/audit cho request thực sự bị từ chối | NOT_RUN |
| U04 | AR-02 / PM, ADMIN | Create Feature; search/date/newest/oldest/name/archive phân trang thống nhất; khoảng ngày sai không làm mất danh sách/nháp | UI+API filter values/count, timezone boundary | NOT_RUN |
| U05 | AR-02 / PM | Preview → commit workbook → reload; retry không trùng; lỗi ID trống/quá dài, cột mơ hồ/formula không được commit âm thầm | File/hash, preview errors, DB count/history | NOT_RUN |
| U06 | AR-02 / PM, TESTER | Cùng workbook ở A/B có identity/nội dung/Status/phân công độc lập; đổi A không đổi B hay bytes gốc | ID map + before/after hashes + original XLSX hash | NOT_RUN |
| U07 | AR-02 / PM, 2 TESTER | Giao phạm vi rời nhau; tự nhận/sửa phần mình; hai request giành cùng case chỉ một thành công, bên kia409; batch lỗi không ghi một phần | Two-connection native race, assignment/history counts, draft UI | NOT_RUN |
| U08 | AR-02 / TESTER, ADMIN | `UNEXECUTED→OK→NG→P→NA→UNEXECUTED`, không cần run/máy; actor thật lưu history, retry không nhân; former assignee/DEV bị chặn | FE/native, row version/history/request key; không thêm run | NOT_RUN |
| U09 | AR-02/04 / PM | Fixture `[U,U,OK,P,NA]`: 3/5=60% ở file/Feature/analysis; 0 case=0%, tất cả đã test=100%; màu U xám bạc | API/DOM, CSS token, không áp công thức `(OK+NG)/(total-NA)` | NOT_RUN |
| U10 | AR-03 / TESTER, PM, DEV | Issue từ đúng case, badge tính cả closed, deep link giữ Feature/file/row; Monkey Bug quản lý theo quyền, case-linked Issue không xóa | Issue/row IDs, badges, cross-feature negative | NOT_RUN |
| U11 | AR-03 / PM, DEV | PM tạo QA → giao DEV → DEV xử lý/comment → PM đóng có lý do theo allowedStatuses; không đòi answer-confirm/run/retest cũ; stale409/403 giữ nháp; retry comment không trùng | Capabilities + history/comment count + browser | NOT_RUN |
| U12 | AR-02/04 / PM | Original XLSX byte-identical; current XLSX xuất toàn bộ row đã lưu dù đang lọc/trang2; đúng Status/first/latest; import lại vào Feature khác không nhân header, reset theo contract | SHA-256 + POI assertions/counts, không chỉ tên file | NOT_RUN |
| U13 | AR-04 / PM, ADMIN | Lưu/sửa/tải lại/download Markdown đúng văn bản; viết “8” vào report không đổi10 Issues nguồn; stale409 giữ draft; report ngoài project bị chặn dù PM có AI global read | Markdown/hash, source count before/after, role negative | NOT_RUN |
| U14 | AR-04 / PM | AI điền text vào draft rỗng, không autosave; không ghi đè nội dung sửa trong lúc pending; text sửa tay lưu được; toolcall/refusal/incomplete bị từ chối; provider lỗi vẫn cho lưu tay | Mock provider tests; live receipt riêng nếu được chạy; report/source counts | NOT_RUN |
| U15 | AR-04 / 4 role | Preset chat gửi một lần, Enter xóa composer/hiện pending, Shift+Enter/IME không gửi nhầm; project/Feature/all scope đúng quyền trước retrieval; không lộ private chat/key/dự án cấm | UI request count + input/provider context redacted + auth test | NOT_RUN |
| U16 | AR-05 / PM, TESTER | Sổ tay rev1 hai tab: A tạo rev2, B409 không rev3; draft còn; reload chủ động rồi lưu mới. Reader không ghi, revoked/archived không append; HTML chỉ text | revision IDs/content/actor/time, history, browser conflict | NOT_RUN |
| U17 | AR-06/07 / ADMIN | Chỉ còn cycles/retests cũ → checkbox mặc định tắt, lý do bắt buộc; xác nhận → archive; snapshot/history rõ actor/reason/codes/count/fingerprint; không sửa/xóa child | API/UI + decision JSON + child checksum + migration receipt | NOT_RUN |
| U18 | AR-06/07 / ADMIN, PM | Thiết bị/phiên/OPEN_WORK_ITEMS/outbox còn mở vẫn chặn dù checkbox bật; PM403; stale version/fingerprint409 kể cả cùng count khác ID; retry cùng key không trùng; đổi payload/key reuse409; replay sau reopen không archive lần nữa | Native races, exactly-one decision/audit, UI reason/draft/retry | NOT_RUN |
| U19 | AR-08 / PM, reader | Rules nói rõ lịch sử, không khẳng định áp dụng Bug/QA Feature; giữ versions và kiểm quyền công bố cũ; không thêm device/build/answer gate; nội dung cũ đọc được | UI text/accessibility assertions, Rule/Issue regressions | NOT_RUN |
| U20 | AR-03/09 / 4 role | Legacy `/tests/**` có hướng dẫn, old mutations410 không ghi; Feature/document/project archive chặn ghi nhưng giữ đọc lịch sử đúng quyền; không đoán ID chuyển route | API counts/hashes trước/sau, route/browser evidence | NOT_RUN |
| U21 | AR-09 / người vận hành | Evidence cũ download đúng bytes/quyền; missing storage503 không báo thành công; upload/delete cũ410. Backup/restore isolated DB+blob đối chiếu IDs/FK/metadata/hashes; không đụng main | Backup+restore manifest, source/destination proof, hash inventory, errors | NOT_RUN |
| U22 | AR-10 / 4 role | Chuỗi U02→U04–15→U17 chạy cùng baseline/schema; thêm login Admin/workspace return, member/device batch, Note, Kanban/list, keyboard/dialog/pending/error, mobile/zoom | UI action inventory, screenshots/DOM, API IDs, actual device/browser label, người ký riêng | NOT_RUN |
| U23 | AR-01/10 / ADMIN, PM, TESTER, DEV | Loại active member đúng project trước count/page; người dự án khác vẫn thêm được; PM chỉ DEV/TESTER, Admin mọi nhóm; không dropdown hoặc API đổi role; ADMIN làm PM giữ system ADMIN. Kiểm restore role lịch sử, tài khoản bị khóa, concurrent add và partial save | Candidate/list/save HTTP, identity role/membership/audit trước sau, browser footerAction/icon/pending/error; không nhầm quyền tạo user với thêm member | NOT_RUN |
| U24 | AR-01/10 / ADMIN, user bị sửa | Sửa tên hiển thị/username/reset password giữ identity ID/membership/tác giả lịch sử, thu hồi phiên cũ; self-edit và reauth không lộ nháp/giữ quyền cũ; duplicate/stale giữ form | Identity tests/native/browser trên tài khoản disposable, session/auth/version/count; không ghi mật khẩu vào receipt | NOT_RUN |
| U25 | AR-04/10 / người dùng AI | Timeout local phân biệt với HTTP lỗi provider, câu hỏi/nháp giữ nguyên; retry chủ động không tự gọi lặp; kiểm model/profile/config từng máy; muốn tăng timeout phải đồng bộ backend/frontend/turn TTL. GET models200 không được tính inference PASS | Local stub transport/error tests, sanitized timing/code, live synthetic receipt riêng, không secret/dữ liệu dự án; chưa có kết quả thực thi chiến dịch này | NOT_RUN |
| U26 | AR-03/06/07 / ADMIN, PM | Tái hiện Bug Monkey mở đã xóa mềm, Issue mở dưới Feature/file đã ẩn so với OPEN_WORK_ITEMS; chỉ rõ blocker/đường xử lý. Không tự miễn blocker hoặc mở API cũ; chốt semantics trước sửa nếu bế tắc được xác nhận | Before/after Issue/context/status/readiness, HTTP/mutation capability, quyết định nghiệp vụ và regression riêng | NOT_RUN |

## Hành vi cũ được thay thế có chủ đích

| Yêu cầu Arena trên `caf075a` | Cách nghiệm thu hiện tại |
| --- | --- |
| DRAFT/activate/frozen scope/NG→fixed build→coverage/retest | U05–11 và U20; không mở lại retired writes. Giữ dữ liệu legacy ngoài giao diện mới |
| NA invalidates coverage, CLOSE có outstandingReason, REOPEN cycle | U08–09; mutation legacy410; U17–18 chỉ quyết định project archive, không tự hoàn tất cycle/retest |
| Rules V1/V2 áp dụng BUG cũ | Bảo toàn version/pin lịch sử và unit regression; U19 nói đúng phạm vi. Không ép FeatureIssue pin RuleService |
| REQUEST/TASK/IMPROVEMENT và inbox | U18 kiểm còn blocker; G07 cho xử lý tồn đọng nếu có. Không thêm UI/notification/type cũ |
| Execution/group Excel và report Excel cũ | Ghi rõ route còn read được/410 ở receipt U20; U12–13 chỉ chứng nhận các artifact hiện hành |
| Upload/delete attachment theo QA cũ | U21 kiểm410 + bảo toàn đọc/restore; chức năng đính kèm Feature Issue mới là scope riêng, không ngầm thêm |

## Gate pilot và quyết định thực sự còn thiếu

Đây là đầu việc thu thập khi chuẩn bị pilot, **không hỏi lại mọi câu ngay trong lượt lập kế hoạch**. Người phụ trách cụ thể chưa được chỉ định thì để trạng thái chờ, không gán tên giả.

| Gate | Nội dung cần xác nhận và ví dụ cần có | Người/đầu mối phải xác nhận | Chặn việc gì | Trạng thái |
| --- | --- | --- | --- | --- |
| G01 | File Excel khách chuẩn, cột/ID/giới hạn mẫu và một mẫu bị từ chối; ai duyệt round-trip | PM + đại diện khách | Nghiệm thu import/export khách; không chặn mẫu nội bộ | OPEN |
| G02 | Tracker authority, mapping status/priority/user, dự án đích, quyền publish/đính kèm, retry/conflict live | Chủ hệ thống Redmine + PM | Live sync/publication khách; không chặn kiểm quyền/mock | OPEN |
| G03 | Rule/closure khách khác nội bộ ở đâu; ví dụ hợp lệ/không hợp lệ. Nếu muốn policy mới trên Feature Issue phải có spec riêng | PM + người quyết định nghiệp vụ khách | Thay policy/workflow hiện hành; không khôi phục rule/run chỉ vì Arena cũ | OPEN |
| G04 | Retention/quyền công bố evidence, storage đích, người quản lý backup; bản nào được sao chép/restore | Chủ dữ liệu + vận hành | Dùng dữ liệu thật/publication/restore đích thật; không chặn fixture synthetic | OPEN |
| G05 | Số project/Feature/case/file size/user đồng thời, mục tiêu latency và RPO/RTO cụ thể | PM + vận hành | Kết luận đạt tải/khôi phục và thay limits; không lấy5.000/10.000run làm scale mới | OPEN |
| G06 | Danh sách ADMIN/PM/TESTER/DEV tham gia, môi trường, tiêu chí chấp nhận và người ký; provider/model live được phép với bộ dữ liệu nào | Chủ sản phẩm + đại diện người dùng | Pilot ready/UAT signoff; không chặn thực thi automated/synthetic được phép | OPEN |
| G07 | Nếu còn legacy `OPEN_WORK_ITEMS`, sessions/outbox hoặc Issue mới đã xóa mềm/thuộc Feature-file ẩn mà không có đường xử lý (U26): xác định ID/trạng thái/đường khôi phục rồi chốt đối soát cụ thể; không tự nới archive exception | ADMIN + chủ sản phẩm | Archive những dự án bị blocker này; không chặn exception chỉ cycles/retests hoặc task độc lập | CONDITIONAL |

Mỗi gate khi chốt bổ sung ngày, người quyết định, văn bản/source, ví dụ và tác động task. Không đổi `OPEN` thành `APPROVED` chỉ vì người dùng đồng ý giữ luồng Feature.
