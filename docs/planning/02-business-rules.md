# Nghiệp vụ, quy tắc và truy vết yêu cầu

Ngày lập: 22/09/2026. Trạng thái: **kế hoạch; chưa phải đặc tả đã được khách hàng duyệt**. Tài liệu này không cho phép triển khai đồng thời toàn bộ backlog.

**Quyết định S02 đã xác nhận (22/09/2026):** chỉ tài khoản nội bộ, chưa mở cho khách. Chỉ Admin hoặc PM được Admin cấp quyền được tạo tài khoản; Tester không được phép. S02 giới hạn PM được cấp chỉ tạo Tester, không tạo Admin/PM hoặc cấp tiếp quyền. Quyền dự án tách sang S03. Đây là bổ sung mới nhất, ưu tiên hơn ma trận đề xuất bên dưới; [ADR-002](../decisions/ADR-002-internal-auth.md), [ma trận thực thi](../business/permissions.md).

## 1. Căn cứ và mức độ chắc chắn

| Mã nguồn | Căn cứ | Cách sử dụng |
| --- | --- | --- |
| SRC-01 | Attachment bắt đầu bằng “mỗi bug sẽ được add lên redmine”, gồm khảo sát quy trình và phạm vi khóa luận | Nguồn chính về vấn đề và quy trình thực tế |
| SRC-02 | Attachment “MASTER SOFTWARE DEVELOPMENT PROMPT” | Ràng buộc React, Java/Spring Boot, MySQL, API contract, migration, kiểm thử và làm việc theo giai đoạn |
| SRC-03 | Các yêu cầu giao diện trong hội thoại; `Frontend/src/app/features/work-items/data.js` | Bằng chứng về 10 trạng thái đang hiển thị; không chứng minh quyền và điều kiện chuyển trạng thái |
| SRC-04 | `Frontend/src/app/pages/TestRunnerGridPage.jsx`, `Frontend/src/app/modules/CatHandbook.jsx` | Bằng chứng về prototype kết quả kiểm thử và sổ tay; nội dung chưa được mặc định là rule chính thức của khách hàng |

- **XN – đã xác định:** yêu cầu được nói rõ trong SRC-01/SRC-02 hoặc yêu cầu trực tiếp của người dùng.
- **ĐX – đề xuất:** thiết kế giúp thực hiện yêu cầu; phải review ở sprint liên quan trước khi mã hóa thành ràng buộc.
- **CQ – cần quyết định:** thiếu thông tin hoặc các nguồn không thống nhất; tham chiếu Q-ID ở cuối tài liệu.

Các tên quyền, mã lỗi, tên entity, lifecycle và công thức dưới đây là đặc tả mục tiêu **ĐX** trừ khi được đánh dấu XN. Không coi số liệu mẫu, tên thành viên mẫu hoặc hành vi click trong prototype là quy tắc nghiệp vụ đã duyệt.

## 2. Phạm vi và quy trình hiện tại

Hệ thống phục vụ quản lý **kiểm thử thủ công**, tiếp nhận test case, phân công, ghi nhận kết quả, chuẩn hóa bug, kiểm tra lại sau sửa và báo cáo tiến độ của dự án SPIDERPLUS/Flutter. Không mở rộng thành hệ thống phát triển phần mềm, quản lý source code hoặc nền tảng DevOps. Việc triển khai chính ứng dụng TMS vẫn cần cấu hình vận hành ở S11.

Quy trình khảo sát:

1. Khách hàng/SHIFT xây dựng đặc tả và test case tiếng Nhật. SY Partners tiếp nhận qua SHIFT.
2. BrSE dùng công cụ dịch có hỗ trợ AI để tạo bản tiếng Việt; file Excel được chia sẻ qua SharePoint.
3. PM thống nhất đợt kiểm thử, điều kiện/môi trường/phiên bản, phân công tester trên bảng theo dõi.
4. Tester chạy đúng phạm vi được giao, ghi người chạy, phiên bản và kết quả; lỗi phải liên kết test case.
5. Bug được ghi nhận lên Redmine theo quy tắc khách hàng. BrSE trao đổi qua Slack với SHIFT/khách hàng để xác nhận đặc tả, bug và hướng xử lý. SY Partners không tự chốt nghiệp vụ chưa rõ.
6. Dev tái hiện; nếu thiếu điều kiện thì hỏi lại tester. Nếu tái hiện được thì sửa, ghi phiên bản đã sửa và chuyển tester kiểm tra lại.
7. Tester kiểm tra đúng bản sửa. Thành công mới xác nhận kết quả và đóng lỗi theo quyền; thất bại tiếp tục xử lý. Không tái hiện được sau kiểm tra thì cần ghi nhận điều kiện, thông báo khách hàng và đóng theo lý do riêng.
8. Thành viên hoặc PM tổng hợp Excel/Redmine lên Notion; đây là nguồn sai lệch do phải cập nhật nhiều nơi.

**Hướng giải quyết:** lưu dữ liệu kiểm thử và truy vết tập trung; bắt buộc dữ liệu bug theo rule có phiên bản; dùng chung nguồn dữ liệu giữa bảng công việc và quản lý lỗi; báo cáo từ các bản ghi đã lưu. Đồng bộ với hệ thống bên ngoài chỉ triển khai sau khi có chính sách rõ ràng.

## 3. Ma trận vấn đề → rule → tính năng → nghiệm thu

| BR-ID / mức | Vấn đề và quy tắc mục tiêu | Tính năng / sprint | Tiêu chí nghiệm thu có thể kiểm chứng |
| --- | --- | --- | --- |
| BR-01 XN | Dữ liệu phải thuộc dự án, người dùng chỉ được truy cập dự án trong phạm vi quyền | Thành viên, RBAC; S02–S03 | Đổi project ID trong request không xem/sửa được dữ liệu dự án khác; backend kiểm tra cả quyền và phạm vi |
| BR-02 XN + CQ | Bug phải tuân thủ bộ quy tắc khách hàng; danh sách trường và định dạng chính xác cần Q02 | Rule có phiên bản; S03, biểu mẫu S06 | Rule thiếu trường bắt buộc trả lỗi theo từng trường; lưu rule version đã dùng khi gửi bug; rule mới không âm thầm viết lại bug cũ |
| BR-03 XN | Mỗi bug phải đủ thông tin để tái hiện: tiêu đề, phiên bản, môi trường, thiết bị, bước tái hiện và liên kết case khi phát sinh từ case | Bug + danh mục; S03/S06 | API từ chối gửi bug thiếu dữ liệu bắt buộc dù bỏ qua frontend; không chỉ kiểm tra phần mô tả có chữ “Thiết bị” |
| BR-04 XN + CQ | Nguồn case là khách/SHIFT; BrSE chuyển ngữ. Bản dịch không được thay thế mất bản gốc | Case revision JP/VI, import preview; S04 | Xem được nguồn file, mã case nguồn, revision, bản Nhật và Việt; sửa bản dịch không mất bản gốc; không tự gửi dữ liệu khách sang AI |
| BR-05 XN | Quyết định nghiệp vụ chưa rõ cần qua BrSE/SHIFT/khách, phải lưu được câu hỏi, phản hồi và người xác nhận | Triage, liên kết quyết định; S06 | Ticket chưa rõ spec không được ghi nhận là đã xác nhận chỉ bởi thao tác kéo thả; lịch sử chỉ ra căn cứ quyết định |
| BR-06 XN | Đợt kiểm thử phải xác định phạm vi, người được giao, điều kiện và phiên bản | Test cycle, run item, assignment; S05 | Một case chạy ở hai đợt/thiết bị có hai mục thực thi phân biệt; chuyển người được giao giữ lịch sử người thực thi cũ |
| BR-07 XN | Mỗi lần chạy lưu người thực hiện, thời gian, case revision, kết quả, phiên bản, môi trường và thiết bị | Execution attempt; S05 | Hai lần chạy NG rồi OK tạo hai bản ghi truy vết; lần OK không xóa bằng chứng NG |
| BR-08 XN + ĐX | Kết quả NG phải được xử lý truy vết tới bug hoặc yêu cầu làm rõ có lý do; không tự tạo bug trùng cho mỗi lần chạy | Execution–bug links; S06 | NG chưa gắn bug được hiển thị rõ là cần xử lý; có thể gắn bug đã tồn tại; chốt hoàn tất phạm vi kiểm thử phải kiểm tra các NG chưa xử lý |
| BR-09 XN | Dev sửa xong không có nghĩa tester đã kiểm tra thành công | Bug resolved + retest queue; S06–S07 | Chuyển sang “Đã xử lý” không đổi execution NG thành OK và không đóng lỗi; Fix là tín hiệu chờ retest theo xác nhận 28/09/2026 |
| BR-10 XN + CQ | Tester retest đúng bản sửa; chỉ thành công mới được xác nhận đạt và đóng lỗi “Đã khắc phục” theo chính sách duyệt | Retest + closure; S07 | Thiếu lần retest đạt hoặc sai phiên bản thì từ chối đóng theo lý do đã sửa; có thể ghi retest fail và mở lại xử lý |
| BR-11 XN | “Không tái hiện” và “Không xử lý” là lý do kết thúc khác “Đã khắc phục”; không đồng nghĩa case đạt | Terminal decisions; S07 | Có lý do/căn cứ, người quyết định và điều kiện kiểm tra; không tự biến case liên quan thành OK |
| BR-12 ĐX | Không ghi đè lịch sử, tránh mất cập nhật khi nhiều người sửa | Audit, optimistic concurrency; S01/S05–S07 | Hai người sửa cùng revision: request cũ bị conflict; lần thay đổi được chấp nhận có actor, before/after, thời gian; request lỗi không tạo lịch sử thành công |
| BR-13 XN + ĐX | Bằng chứng phải gắn đúng case/lần chạy/bug; quyền truy cập dự án áp dụng cả tệp | Evidence metadata + upload/download; S06 | Không lấy tệp dự án khác bằng ID/URL; tệp lỗi tải lên không được báo đã đính kèm; giữ provenance khi một bằng chứng liên kết nhiều đối tượng |
| BR-14 XN + CQ | Mỗi bug phải xuất hiện trên hệ thống khách yêu cầu; Redmine hay Backlog, chiều đồng bộ và nguồn chính cần chốt | External reference trước; adapter S09 nếu được duyệt | Có provider, external ID/URL, lần đối soát, trạng thái lỗi đồng bộ; retry không tạo ticket trùng; chưa sync không hiển thị “đã đồng bộ” |
| BR-15 XN + ĐX | Tiến độ tổng hợp từ kết quả thực thi; không lấy bộ đếm UI hay số dòng của trang hiện tại | Reports/dashboard; S08 | Cùng bộ lọc cho cùng số liệu ở bảng và biểu đồ; chạy lại một case không tăng số case đã hoàn thành; hiển thị thời điểm tổng hợp |
| BR-16 XN + CQ | Khách xem được tiến độ nhưng nội dung nội bộ phải tách quyền | Customer view; S02/S08 | Báo cáo khách không trả nội dung nội bộ qua payload/export/evidence; kiểm tra bằng tài khoản khách ở backend |
| BR-17 XN + ĐX | Quy tắc, hướng dẫn, liên kết môi trường tập trung; thông tin tài khoản không được biến thành kho mật khẩu plaintext | Handbook; S03 | Có phiên bản/người cập nhật; chỉ lưu mô tả và tham chiếu kho bí mật cho tài khoản; mật khẩu/token không nằm trong database nội dung, log, file seed hoặc repository |
| BR-18 ĐX | Kanban/Danh sách và Quản lý lỗi dùng chung work item; bug là loại “Lỗi” | Canonical work items; S06 | Cập nhật một bug ở Kanban phản ánh ở màn lỗi; KPI bug không đếm “Yêu cầu”, “Cải tiến”, “Công việc” như bug |
| BR-19 XN + CQ | Báo cáo hỗ trợ dự báo release, không đảm bảo ngày phát hành chính xác | Milestone/progress; S08 | Phân biệt ngày kế hoạch và dự báo; thiếu dữ liệu tốc độ/phạm vi thì hiển thị chưa đủ dữ liệu, không tự tạo ngày chắc chắn |
| BR-20 ĐX | Số liệu khách cần nhất quán, cùng phạm vi/mốc thời gian và phiên bản quy tắc tính | Report snapshot/export; S08 | Báo cáo lưu filter, cut-off, công thức, timezone; số liệu lịch sử không tự đổi vì sửa nhãn hoặc mẫu dashboard |

## 4. Domain và ranh giới trách nhiệm

Các aggregate/tên bảng chính thức được chốt cùng thiết kế cơ sở dữ liệu; đây là mô hình logic.

| Domain / entity | Trạng thái hoặc thuộc tính trọng yếu | Validation và quyền | Giao dịch / ngoại lệ |
| --- | --- | --- | --- |
| Project, Membership | Hoạt động/lưu trữ là ĐX; membership theo dự án | PM quản lý thành viên theo quyền; user không tự nâng vai trò | Cập nhật membership + audit; không xóa lịch sử khi thu hồi quyền |
| ProjectRule, RuleRevision | Nháp/được công bố/ngừng dùng là ĐX | Quy tắc đã công bố có version bất biến; chỉ PM/BrSE được phân quyền mới công bố | Publish revision + active pointer cùng giao dịch; cấu hình sai không thay rule đang dùng |
| Environment, Device, AppVersion, Milestone | Danh mục hoạt động/ngừng dùng | Thuộc dự án; không nhầm version phát sinh, version sửa và mốc phát hành | Archive thay vì xóa danh mục đã có tham chiếu; chọn danh mục dự án khác trả lỗi |
| TestSuite, TestCase, CaseRevision, Translation | Bản gốc, bản dịch, nguồn và revision; lifecycle ở mục 6 | Không sửa nội dung revision đã được dùng trong run; nguồn khách có provenance | Import theo batch đã kiểm tra; ghi nhận dòng lỗi; không báo import thành công một phần như toàn bộ |
| TestCycle, RunItem, Assignment | Chuẩn bị/đang chạy/đóng là ĐX; tổ hợp case revision + cấu hình chạy | Người được giao phải là thành viên hợp lệ; phạm vi không lẫn đợt | Tạo phạm vi + assignment trong giao dịch; xung đột unique theo cấu hình đã chọn |
| ExecutionAttempt | Kết quả, người thực thi, thời gian, môi trường/thiết bị/version; lịch sử nối tiếp | Backend xác thực actor, trạng thái đợt, quyền thực thi và rule kết quả | Attempt + liên kết/audit cùng giao dịch; idempotency tránh ghi trùng khi retry |
| WorkItem / Bug | Type, 10 nhãn UI, thông tin triage; không trộn trạng thái gửi với trạng thái xử lý | Rule theo loại; bug có validation và closure policy riêng | Chuyển trạng thái + audit + outbox nếu có; thất bại giữ trạng thái trước |
| ExecutionBugLink, Retest | Quan hệ nhiều–nhiều có provenance; retest nhắm bug và phạm vi xác nhận | Không ghép link khác dự án; case có thể liên quan nhiều bug | Retest đạt + closure hợp lệ + audit/outbox trong một giao dịch local; không chờ remote commit |
| Evidence, Comment, Decision | Chủ sở hữu, phạm vi nội bộ/khách, file metadata hoặc nguồn liên kết | Không công khai theo URL đoán được; quyết định có actor và căn cứ | Tệp không ở cùng transaction MySQL: có trạng thái tải lên và dọn tệp mồ côi có kiểm soát |
| ExternalIssueReference, SyncJob | Chưa gửi/đang chờ/đã đồng bộ/lỗi/xung đột là trạng thái tích hợp, không phải bug status | Quản lý cấu hình riêng; token chỉ ở backend/kho secret | Unique provider + external ID; mapping/đối soát/retry; remote lỗi không giả vờ rollback remote |
| ProgressSnapshot, Activity/Audit | Số liệu theo scope/cut-off; audit không sửa tùy ý | Khách chỉ thấy dữ liệu được phép; audit nghiệp vụ khác log kỹ thuật | Backend tổng hợp thống nhất; từ chối filter truy cập ngoài phạm vi |

## 5. Vòng đời lỗi

### 5.1 Mười trạng thái giao diện hiện có

| ID hiện tại | Nhãn tiếng Việt | Ý nghĩa đề xuất | Kết thúc? |
| --- | --- | --- | --- |
| `open` | Chưa xử lý | Đã ghi nhận, chưa bắt đầu | Không |
| `progress` | Đang xử lý | Đang tái hiện/sửa | Không |
| `recheck` | SYP kiểm tra lại | Cần đội tester làm rõ hoặc xác nhận lại | Không |
| `clarify` | Xác nhận đặc tả / mức độ | Chờ căn cứ spec/độ nghiêm trọng từ đầu mối | Không |
| `ready` | Sẵn sàng xử lý | Đủ điều kiện để dev nhận | Không |
| `planning` | Lập kế hoạch | Chưa xếp vào đợt xử lý | Không |
| `resolved` | Đã xử lý | Dev báo sửa xong, chờ tester retest | Không |
| `unreproducible` | Không tái hiện | Kết thúc theo quyết định không tái hiện | Có, khác đã sửa |
| `wontfix` | Không xử lý | Kết thúc theo quyết định không sửa | Có, khác đã sửa |
| `closed` | Hoàn thành | Kết thúc; lý do và policy phải chốt | Có |

Hiện chỉ có bằng chứng cho **10** trạng thái. Không thêm hai trạng thái để đủ con số 12. Nếu cần lưu bug chưa đủ thông tin, dùng lifecycle hồ sơ `draft/submitted` riêng (ĐX), không tăng số cột Kanban hay coi hai trạng thái đó là workflow khách hàng. Không tái dùng enum của execution cho bug. Nhãn backend và mapping Redmine phải chốt ở Q01/Q03.

### 5.2 Chuyển trạng thái đề xuất để review ở S06–S07

Mỗi lệnh yêu cầu membership, permission, expected revision và audit. Mọi lệnh không nằm trong policy được duyệt phải bị backend từ chối; kéo thả không vượt qua precondition. Role dưới đây là đề xuất, chưa khẳng định quy trình duyệt chính thức.

| Hiện tại → hành động → tiếp theo | Actor / quyền đề xuất | Điều kiện trước | Tác động và thất bại |
| --- | --- | --- | --- |
| Hồ sơ nháp → gửi → `open` | Tester / `BUG_SUBMIT` | Đủ rule version, dữ liệu tái hiện và provenance | Lưu bug + audit; thiếu field trả validation, vẫn nháp |
| `open`/`ready`/`progress` → hỏi rõ → `clarify` | Tester/Dev/BrSE / `BUG_REQUEST_CLARIFICATION` | Câu hỏi, đầu mối và căn cứ | Ghi decision thread; thiếu câu hỏi từ chối |
| `clarify` → xác nhận → `ready` | BrSE / `BUG_CONFIRM_SPEC` | Có phản hồi khách/SHIFT và kết luận được lưu | Audit nguồn quyết định; chưa có căn cứ giữ `clarify` |
| `open` → xác nhận đủ điều kiện → `ready` | BrSE/PM / `BUG_TRIAGE` | Đã rõ là bug, đủ rule và hướng xử lý | Không bắt buộc vòng hỏi lại nếu đã có đặc tả rõ; thiếu dữ liệu từ chối |
| `open`/`ready`/`clarify` → hoãn có kế hoạch → `planning` | PM / `BUG_PLAN` | Lý do hoãn và phạm vi/mốc dự kiến nếu biết | Không tính hoàn thành; lý do trống từ chối |
| `planning` → đưa vào xử lý → `ready` | PM/BrSE / `BUG_TRIAGE` | Đủ spec, cập nhật mốc và người nhận | Audit; không tự đặt fixed version |
| `ready` → nhận việc → `progress` | Dev / `BUG_START` | Người nhận hợp lệ, đủ điều kiện tái hiện | Ghi assignee; không cho user ngoài dự án nhận |
| `progress` → yêu cầu kiểm tra lại → `recheck` | Dev / `BUG_REQUEST_RECHECK` | Ghi version/môi trường đã thử, câu hỏi hoặc kết quả không tái hiện | Không đóng bug; thiếu điều kiện đã thử từ chối |
| `recheck` → xác nhận còn lỗi → `ready` | Tester / `BUG_RECHECK` | Có lần kiểm tra và bằng chứng | Giữ lịch sử; không giả lập pass |
| `progress` → báo đã sửa → `resolved` | Dev / `BUG_RESOLVE` | Fixed version, mô tả sửa và căn cứ theo rule | Tạo nhu cầu retest; không đổi kết quả case; thiếu fixed version từ chối |
| `resolved` → retest fail → `ready` | Tester / `BUG_RETEST` | Lần chạy mới đúng phạm vi xác nhận và version | Lưu NG + audit; lỗi lưu dữ liệu rollback local |
| `resolved` → retest pass và đóng đã sửa → `closed` | Tester hoặc người duyệt theo Q04 / `BUG_CLOSE_FIXED` | Retest đạt đúng fixed version; đủ phạm vi ở Q05; lý do “Đã khắc phục” | Một giao dịch local: kết quả mới + closure + audit/outbox; thiếu điều kiện từ chối toàn bộ |
| `recheck` → quyết định không tái hiện → `unreproducible` | Tester + đầu mối duyệt theo Q04 / `BUG_CLOSE_NO_REPRO` | Điều kiện thử được xác nhận, ghi kết quả và việc thông báo khách | Không đặt OK cho case; thiếu căn cứ không đóng |
| `open`/`clarify`/`planning` → quyết định không sửa → `wontfix` | PM/BrSE theo Q04 / `BUG_CLOSE_WONTFIX` | Lý do, căn cứ/phê duyệt khách theo rule | Không coi đã sửa; chưa có quyết định từ chối |
| Bất kỳ trạng thái kết thúc → mở lại → `open` | Tester/BrSE/PM theo Q04 / `BUG_REOPEN` | Lý do, version/môi trường tái xuất hiện, bằng chứng | Bảo toàn closure trước đó; thống kê mở theo trạng thái mới; yêu cầu cũ conflict |

Các chuyển khác (trùng bug, không hợp lệ, hủy, trả lại assignee) phải được chốt thêm ở Q03, không mặc định cho phép. Bộ `closureReasons` đang có năm nhãn chỉ là dữ liệu UI; cần kiểm tra tương thích status/reason. Quy tắc loại công việc khác bug được thiết kế riêng, không ép “Yêu cầu” phải có bước tái hiện lỗi.

## 6. Case, đợt chạy và kết quả thực thi

### 6.1 Lifecycle đề xuất

| Đối tượng / hiện tại | Hành động / actor | Preconditions → tiếp theo | Tác động / failure |
| --- | --- | --- | --- |
| Import được xem trước | PM/BrSE xác nhận import | Đã map cột, đối soát nguồn/mã/revision, xử lý dòng lỗi → case revision nháp | Lưu provenance + báo cáo import; không âm thầm bỏ dòng |
| Case revision nháp | BrSE/QA được cấp quyền duyệt bản dịch | Có bản gốc, trường bắt buộc, giải quyết điểm dịch chưa rõ → sẵn sàng dùng | Ghi người duyệt; thiếu nguồn giữ nháp |
| Case revision sẵn sàng dùng | Người có quyền cập nhật | Thay nội dung → revision nháp mới | Run đang dùng giữ revision cũ; không rewrite execution lịch sử |
| Case đang dùng | PM lưu trữ | Không chọn cho phạm vi mới → lưu trữ | Các run/link cũ vẫn đọc được; không cascade delete |
| Cycle chuẩn bị | PM mở đợt | Có phạm vi, case revision đã duyệt, điều kiện, phân công → đang chạy | Tạo snapshot phạm vi; thiếu điều kiện từ chối |
| Cycle đang chạy | PM chốt đợt | Đã xử lý kết quả chưa quyết định, tồn đọng được duyệt, báo cáo theo Q08 → đóng | Khóa ghi thêm mặc định; điều kiện chưa đủ từ chối |
| Cycle đóng | PM mở lại có lý do | Quyền và policy cho phép → đang chạy | Audit lý do; không xóa báo cáo đã chốt |

### 6.2 Kết quả trong prototype và ý nghĩa cần giữ

`TestRunnerGridPage.jsx` đang cho chuyển vòng `Unexecuted → OK → NG → P → Fix → NA`. Đây là tương tác mẫu, **không phải state machine để áp dụng vào backend**.

| Mã UI | Ý nghĩa mục tiêu | Điều kiện khi ghi |
| --- | --- | --- |
| `Unexecuted` | Run item chưa có kết quả | Trạng thái ban đầu suy ra từ chưa có attempt hợp lệ; không xóa lần chạy cũ để “chưa chạy” |
| `OK` | Lần chạy đáp ứng expected result | Người chạy, case revision, version/môi trường/thiết bị và evidence theo rule |
| `NG` | Kết quả không khớp expected result | Actual result và evidence; có link bug/clarification hoặc được đánh dấu đang chờ liên kết |
| `P` | Chưa thể kết luận do thiếu điều kiện/blocker | Lý do + blocker/QA tham chiếu; không coi đạt |
| `Fix` | **Đã chốt 28/09/2026: dev báo đã sửa, tester cần kiểm thử lại** | Chưa phải Pass/OK; giữ kết quả attempt trước, tạo nhu cầu retest và lưu fixed version. S05 triển khai theo ADR-004 |
| `NA` | Không áp dụng trong phạm vi này | Lý do/phê duyệt thay đổi phạm vi; không coi là kiểm thử thành công |

Ghi kết quả là tạo `ExecutionAttempt`, không ghi đè nguồn case. Retest là attempt mới có mục tiêu `retest`, liên kết bug và fixed version. Không bắt buộc đi qua chuỗi click ở prototype: một lần chạy có thể ra OK/NG/P/NA ngay nếu thỏa rule tương ứng.

Nhiều bug cùng liên kết một case không có nghĩa đóng một bug sẽ đổi case thành đạt. Nhiều case liên kết một bug không có nghĩa một case pass đủ đóng toàn bộ bug. Phạm vi cần retest và điều kiện đóng được chốt ở Q05. Đồng bộ external không được tự sinh execution OK; Fix chỉ là thông tin chờ tester kiểm thử lại.

## 7. Quyền truy cập dự thảo

Quyền áp dụng theo dự án, được backend cưỡng chế. Có thể một người có nhiều vai trò; “admin hệ thống” không mặc định thay khách chốt nghiệp vụ.

| Nhóm hành động | Admin hệ thống | PM/QA lead dự án | BrSE | Tester | Dev | Khách |
| --- | --- | --- | --- | --- | --- | --- |
| Tài khoản, cấu hình nền tảng | Có | Không | Không | Không | Không | Không |
| Thành viên/quyền dự án | Theo quản trị | Có trong phạm vi được giao | Không mặc định | Không | Không | Không |
| Rule, handbook, danh mục | Cấu hình kỹ thuật | Quản lý | Soạn/xác nhận rule theo phân quyền | Đọc | Đọc | Chỉ phần công khai |
| Nguồn case/bản dịch | Không mặc định sửa nội dung | Quản lý nhập/phạm vi | Nhập/dịch theo quyền; phê duyệt chỉ PM theo ADR-004 | Đọc; phản hồi | Đọc theo nhu cầu | Xem nguồn được công bố |
| Cycle/phân công | Không mặc định | Có | Đọc | Xem phần được giao | Đọc theo quyền | Tiến độ được công bố |
| Ghi execution | Không mặc định | Có nếu được cấp quyền thực thi | Không mặc định | Trong phạm vi được giao | Không mặc định | Không |
| Tạo bug, comment, bằng chứng | Không mặc định | Có | Có | Có | Theo quyền | Xem/comment nếu duyệt ở Q09 |
| Chốt spec/triage | Không | Theo rule | Đại diện ghi quyết định từ SHIFT/khách | Đề nghị | Đề nghị | Quyền quyết định trực tiếp cần Q09 |
| Start/resolve | Không | Điều phối | Không mặc định | Không mặc định | Có | Không |
| Retest/đóng lỗi | Không | Theo Q04 | Theo Q04 | Theo Q04 | Không tự đóng “đã sửa” | Theo Q09 |
| Dashboard/export | Phạm vi được cấp | Nội bộ dự án | Nội bộ dự án | Theo phạm vi | Theo phạm vi | Bản khách đã lọc nội dung |
| Cấu hình external/retry | Có quyền chuyên biệt | Theo quyền | Theo quyền | Không mặc định | Không mặc định | Không |

Khách không được xem token tích hợp, tài khoản kiểm thử, comment nội bộ, audit kỹ thuật hoặc bằng chứng nội bộ. Chỉ ẩn nút ở frontend là chưa đủ. “Nội bộ/khách” phải được xét khi trả DTO, xuất file và cấp quyền tải evidence. Mặc định một comment/evidence mới là nội bộ cho đến khi có quy tắc công bố (ĐX, Q09).

## 8. Định nghĩa tiến độ và dữ liệu truy vết

### 8.1 Phân biệt đơn vị đếm

- **Case:** kịch bản/revision nghiệp vụ.
- **Run item:** một case revision được đặt trong một cycle và cấu hình chạy cần hoàn tất. Cùng case chạy iPad và iPhone có thể là hai run item nếu phạm vi yêu cầu; không gộp tùy ý.
- **Attempt:** một lần thực thi. Chạy lại không làm tăng tổng số run item.
- **Bug:** work item loại “Lỗi”, đếm distinct bug ID. Nhiều link case không nhân số bug.
- **Khối lượng cá nhân hôm nay:** số attempt thực hiện và số run item đã hoàn tất là hai số khác nhau. Assignment hiện tại không được đổi tên người đã chạy trong lịch sử.

### 8.2 Công thức dự thảo cần chốt ở Q08

Trong cùng project/cycle/cấu hình/cut-off, lấy kết quả hợp lệ mới nhất của từng run item. Gọi `T` là số run item thuộc phạm vi, `N` là số NA được duyệt, `U` là chưa chạy, `P` là đang chờ, `F` là NG, `A` là OK. Theo quyết định Q06, Fix chỉ có nghĩa dev báo đã sửa và đang chờ tester kiểm thử lại, không được tính vào `A`. Khi retest đạt, ghi attempt mới có kết quả OK và giữ nguyên lịch sử attempt trước đó; các công thức dưới đây vẫn là đề xuất cần chốt ở Q08.

- Mẫu số áp dụng đề xuất `D = T - N`; hiển thị `T` và `N` riêng để không che việc giảm phạm vi.
- Tiến độ đã có kết quả kết luận đề xuất `(A + F) / D`; đang chờ không là kết luận. Nhãn phải nói rõ đây là tiến độ thực thi, không phải tỷ lệ đạt.
- Tỷ lệ đạt đề xuất `A / D`. Có thể cung cấp thêm `A / (A + F)` nhưng phải đặt tên khác và ghi rõ mẫu số.
- `D = 0` hiển thị “Không có phạm vi áp dụng”, không chia cho 0 hoặc giả định 100%.
- Bug còn mở: distinct bug không thuộc nhóm terminal đã duyệt; “đã xử lý/chờ retest” vẫn là mở. Tách số đã khắc phục, không tái hiện và không xử lý.
- Hoàn tất milestone không tự suy ra chỉ từ phần trăm bug đóng; cần kết quả run item và các quyết định tồn đọng được duyệt.

S08 phải kiểm tra nhất quán giữa tổng, bộ lọc, danh sách drill-down, xuất báo cáo và thay đổi dữ liệu đồng thời. Số `count` mẫu trong `data.js`, số liệu mock kiểm thử và phần trăm hoạt động Kanban không được dùng làm KPI thực tế.

### 8.3 Truy vết bắt buộc và chính sách external

Chuỗi cần truy được: **nguồn Nhật/revision → bản dịch Việt/reviewer → case revision → cycle/run item/assignment → execution attempt → bug + evidence → fixed version → retest attempt → quyết định kết thúc → báo cáo**. Mỗi link thuộc đúng dự án và có actor/thời gian; external ID tách biệt ID nội bộ.

TMS được đề xuất là nguồn chính cho case/execution nội bộ. Đối với bug, SRC-01 yêu cầu Redmine nhưng UI/sổ tay đề cập Backlog: chưa thể quyết định TMS hay tracker ngoài sở hữu trạng thái cuối. Mặc định giai đoạn trước S09 chỉ lưu external reference và báo trạng thái chưa đối soát, không tự gửi/sửa ticket thật. Không tự gửi Slack/email trong kế hoạch này.

S09 chỉ triển khai provider đã được chọn, có quyền API và mapping được duyệt. Dùng outbox/retry/idempotency và báo conflict thay vì last-write-wins âm thầm. Thành công local và thành công remote là hai kết quả phân biệt. Nếu “mọi bug phải lên tracker khách hàng” là điều kiện pilot, S09 là **release gate**, không được gọi S08 là hoàn tất sản phẩm để dùng thật. Không triển khai tích hợp đồng thời Redmine, Backlog, Notion, SharePoint và Slack chỉ vì các công cụ được nhắc trong khảo sát.

## 9. Câu hỏi cần quyết định theo từng gate

**Cập nhật 29/09/2026:** Q04/Q05 và phần authority nội bộ của Q01 đã chốt tại [ADR-007](../decisions/ADR-007-internal-retest.md): PM xác định toàn coverage, Tester được phân công ghi kết quả, FAIL về xử lý; chỉ PM đóng/mở lại có reason và căn cứ ngoại lệ; TMS là authority bản nội bộ. Q08 nội bộ đã chốt [ADR-008](../decisions/ADR-008-internal-reporting.md): mẫu số run item trừ NA, phân biệt thực thi/đạt, PM NA/chốt/mở đợt. Q09 tiếp tục chưa mở khách; mẫu xuất XLSX S08 dùng nội bộ. Các lựa chọn khách/provider/retention ở bảng dưới vẫn cần quyết định riêng, không suy rộng các chốt nội bộ.

Các câu hỏi dưới đây không chặn việc lập kế hoạch hoặc nền tảng kỹ thuật. Mỗi câu chỉ chặn hành vi phụ thuộc nó ở sprint ghi rõ; không tự trả lời thay khách hàng. Khi chốt, ghi quyết định, người chốt, ngày và cập nhật BR/contract/test liên quan.

| Q-ID / Question | Why it matters / Affected modules | Possible options | Current assumption | Blocking stage |
| --- | --- | --- | --- | --- |
| Q01. Tracker thật là Redmine hay Backlog; hệ thống nào sở hữu bug và trạng thái? | Hai nguồn mâu thuẫn; ảnh hưởng ID, workflow, mapping, báo cáo | Redmine chính; Backlog chính; TMS chính và chỉ liên kết; policy theo dự án | Không sync thật; TMS giữ case/execution, bug có external reference | Chốt kiến trúc S00; chặn hợp đồng sync và S09/pilot nếu external bắt buộc |
| Q02. Bộ rule chính thức hiện tại gồm những field/format/điều kiện evidence nào? | Validation sai sẽ loại ticket hợp lệ hoặc vẫn cho thiếu thông tin; bug form, schema, rule engine | Mẫu khách theo dự án; mẫu theo loại bug; rule cố định một dự án | Danh sách tối thiểu BR-03, chưa tự đặt regex/giới hạn dung lượng/định dạng tiêu đề | Chặn công bố rule S03 và gửi bug thật S06 |
| Q03. Có đúng 10 trạng thái không; ánh xạ terminal/reason, lỗi trùng/không hợp lệ và reopen ra sao? | Ảnh chỉ xác nhận 10; backend/API/board/external mapping | Giữ10; nhận enum chính thức khác; mapping riêng provider | Giữ10 nhãn UI; mọi transition là draft; draft/submitted riêng | Chặn migration workflow và state policy chính thức S06 |
| Q04. Ai được đóng bug/reopen; không tái hiện cần khách đồng ý hay chỉ thông báo? | Tránh dev tự đóng và sai trách nhiệm; RBAC, retest, audit | Tester được đóng; QA lead duyệt; BrSE ghi phê duyệt khách | Dev không tự đóng đã sửa; closure policy cần review | Chặn quyền closure S07; định khung quyền ở S02 |
| Q05. Một bug ảnh hưởng nhiều case/thiết bị: retest nào đủ để đóng? | Quan hệ N-N; tránh một pass phủ nhận các NG còn lại | Toàn bộ phạm vi ảnh hưởng; tập đại diện được QA duyệt; policy riêng từng bug | Không auto-pass tất cả case; lưu phạm vi retest cụ thể | Chặn atomic closure S07 |
| Q06. Ý nghĩa Fix | **Đã chốt 28/09/2026**: dev báo đã sửa, tester kiểm thử lại | Fix không phải kết quả kiểm thử đạt | Bảo toàn attempt trước; chưa cộng vào Pass, không tự đóng bug | Áp dụng contract S05 theo ADR-004; KPI S08 cần tách chờ retest |
| Q07. Ai duyệt case và mẫu Excel? | **Chốt nội bộ 28/09/2026**: chỉ PM dự án duyệt revision; dùng mẫu xlsx nội bộ trước | Giữ VI/JP, nguồn, revision bất biến; mẫu khách hàng chưa được cung cấp | Tải mẫu nội bộ 11 cột, preview, commit toàn bộ theo ADR-004 | S04 nội bộ đã đủ quyết định; import mẫu khách hàng vẫn cần mapping riêng |
| Q08. Đơn vị tiến độ, NA/P/Fix, cut-off, timezone và tiêu chí chốt đợt/release? | Khác mẫu số tạo báo cáo không khớp; cycle closure, KPI, export | Theo case; theo cấu hình/run item; đã chạy vs đạt tách biệt | Theo run item, formula mục8 là đề xuất; không hứa ngày release | Chặn chốt cycle S05 và KPI nghiệm thu S08 |
| Q09. Khách đăng nhập trực tiếp hay chỉ nhận báo cáo; được xem/comment/phê duyệt gì? | Có nguy cơ lộ dữ liệu nội bộ; RBAC, DTO, evidence/export | Tài khoản khách read-only; có quyền nhận xét; chỉ báo cáo được công bố | Read-only dữ liệu công bố, comment/evidence mới mặc định nội bộ | Chặn thiết kế customer quyền S02 và customer view S08 |
| Q10. Phải đồng bộ tự động ngay pilot hay link/export thủ công được chấp nhận? | Xác định S09 bắt buộc hay có thể hoãn; phạm vi MVP/release | Chỉ reference; xuất/import; tạo một chiều; sync trạng thái có đối soát | Chưa có API credential và quyền ghi; không giả định được tạo remote | Chặn S09 và release gate S11 theo lựa chọn |
| Q11. Chính sách evidence: loại file, dung lượng, lưu ở đâu, lưu bao lâu, quyền công bố? | Metadata/file storage và bảo mật; thiếu rule sẽ khó di chuyển dữ liệu | Object storage riêng; SharePoint link có quyền; kết hợp | Không lưu credential hoặc đường link công khai tùy tiện; metadata tách file | Chặn upload production S06; retention chốt trước S11 |
| Q12. Có cần quản lý tài khoản kiểm thử trong app hay chỉ liên kết nơi cấp phát? | Yêu cầu tập trung thông tin không đồng nghĩa lưu mật khẩu; handbook/security | Chỉ metadata + vault reference; tích hợp vault được duyệt | Không lưu plaintext mật khẩu/token vào nội dung handbook/DB/repo | Chặn tính năng truy xuất bí mật, không chặn handbook S03 |
| Q13. “Tạo ticket bug cho Dev” sau xác nhận là ticket thứ hai hay cập nhật ticket ban đầu? | Tránh đếm đôi và làm sai traceability; work item/external mapping | Một ticket qua triage; hai ticket liên kết QA–Dev | Một canonical bug, external links có vai trò; chưa tự tạo ticket thứ hai | Chặn workflow chuẩn S06 và mapping S09 |
| Q14. Quy mô dự án/dữ liệu, kiểu triển khai, số người đồng thời và yêu cầu lưu lịch sử? | Giới hạn import/pagination, hiệu năng, backup và triển khai | Một dự án pilot; nhiều dự án cùng tổ chức; tenant riêng | Hỗ trợ phạm vi project từ đầu; không xây SaaS multi-tenant chưa được yêu cầu | Chặn tiêu chí tải S10 và vận hành S11 |

## 10. Bộ kịch bản nghiệm thu nghiệp vụ tối thiểu

**Quyết định nội bộ S06 ngày 29/09/2026:** người dùng đã chốt phần nội bộ của Q02/Q03/Q04/Q11/Q13 tại [ADR-006](../decisions/ADR-006-internal-work-items.md): 10 trạng thái, một bug canonical, trường tối thiểu và ngoại lệ PM có lý do, chỉ PM triage bảy trạng thái chưa kết thúc, resolved cần build; evidence máy chủ PNG/JPG/PDF/MP4 tối đa 20 MiB. Ba trạng thái kết thúc chờ S07. Các câu hỏi về rule khách, nguồn trạng thái tracker, retention/công bố evidence vẫn còn mở; không coi xác nhận nội bộ là duyệt production cho khách hàng.

1. **Rule thiếu thông tin:** tester gửi bug không có thiết bị/phiên bản bắt buộc; backend trả lỗi trường, không tạo ticket đã gửi hoặc yêu cầu đồng bộ.
2. **Nguồn và bản dịch:** sửa expected result bản Việt tạo revision mới, run cũ tiếp tục truy được Nhật/Việt và reviewer đã dùng.
3. **NG có truy vết:** ghi NG, gắn bug cũ hoặc tạo bug mới, thấy cùng liên kết ở case/attempt/bug; không tạo bản sao bug chỉ để có link.
4. **Dev resolve:** Dev nhập fixed version, bug sang “Đã xử lý”; case vẫn giữ NG trước đó, hiện hàng chờ retest.
5. **Retest thành công:** tester ghi attempt đạt đúng phạm vi/version, closure hợp lệ; mọi bản ghi local nhất quán và audit đủ. Retry request không tạo attempt/closure trùng.
6. **Retest thất bại:** attempt mới NG, bug trở lại xử lý; lần resolve cũ vẫn xem được, báo cáo không đếm case đạt.
7. **Đóng không tái hiện:** có điều kiện kiểm tra/lý do/căn cứ; bug được phân loại riêng và không tự ghi case OK.
8. **Nhiều liên kết:** một case nhiều bug hoặc một bug nhiều case; không đóng/đánh đạt theo suy luận một-một.
9. **Cập nhật cạnh tranh:** hai tester/PM sửa cùng revision; người sau nhận conflict, không ghi đè không báo.
10. **Báo cáo và quyền:** Kanban/ticket list/bug KPI/drill-down cùng dữ liệu trong cùng phạm vi; khách không nhận field/file nội bộ.
11. **External thất bại:** remote timeout sau tạo ticket; retry/đối soát không tạo ticket thứ hai, UI nêu chưa xác nhận đồng bộ.
12. **Lịch sử:** chuyển assignee, archive danh mục/case hoặc đổi rule không làm mất dữ liệu người chạy, version và lý do đóng của bản ghi cũ.

Các kịch bản được đưa vào sprint sở hữu tính năng; chúng không phải yêu cầu chạy toàn bộ công việc ngay trong một lần thực hiện.
