# Tái phân tích kế hoạch Arena sau pull — 25/10/2026

## Kết luận

Giữ hướng của kế hoạch: áp dụng kết luận Arena còn phù hợp lên **Feature → file → phân công → Status → Bug/QA → báo cáo Markdown**. Không thực hiện nguyên bản đánh giá trên `caf075a`, không xây lại run/retest/inbox cũ. Kế hoạch AR-00–AR-11 chưa được triển khai như một chiến dịch; cần cập nhật baseline, migration, quyền thành viên, kiểm chứng hồ sơ và lỗi AI thực tế trước khi bắt đầu.

Tác vụ này chỉ đọc source/tài liệu/lịch sử Git và sửa tài liệu kế hoạch. Không chạy test sản phẩm/build/browser, không kết nối database/provider, không migration/restart, không commit/push. Các số kiểm chứng trước được ghi rõ là bằng chứng lịch sử. Không kết luận source hiện tại hoàn toàn đúng chỉ từ đọc tĩnh.

## 1. Ba mốc phải phân biệt

| Mốc | Ý nghĩa |
| --- | --- |
| `caf075a` | Code Arena a016 đã khảo sát; báo cáo mô tả nhiều workflow đã nghỉ. Điểm91–87,5 là điểm báo cáo, không phải mức hoàn thiện ứng dụng. |
| `cde58ad` | Baseline kế hoạch Arena ban đầu; đã nhận diện F6 có implementation và F3/F4/F5/F7 nhiều phần thuộc lịch sử. |
| `a45974a` | Baseline tái phân tích sau pull hiện tại. Từ cde58ad có96 file sản phẩm/test/script thay đổi; có V34 demo, hồ sơ tài khoản, quy tắc thành viên và icon mới. |

Source profile local có core+demo tới V34; profile release dùng core, không đòi V34 demo. Trạng thái database và cấu hình thực tế khác nhau giữa các máy: báo cáo startup được pull từ máy khác không chứng minh runtime máy này. Khi triển khai phải ghi riêng source commit, migrations locations/checksum, backend artifact/profile, frontend API đích và fixture.

## 2. Phần kế hoạch nên giữ

1. Truy vết F1–F7 và các nhánh bổ sung thay vì xóa bỏ kết luận không phù hợp mà không giải thích.
2. Kiểm chứng chức năng đã có trước; chỉ sửa khi tái hiện lỗi. Không viết lại form PM tạo TESTER hoặc tạo thêm workflow QA.
3. Native database và kho attachment tách khỏi main; chặn target sai trước mutation, kiểm số test thực chạy và không coi toàn SKIP là PASS.
4. Archive ngoại lệ có lý do, snapshot, version, audit, idempotency; không sửa hoặc tự đóng child, không bỏ blocker thiết bị/công việc/outbox.
5. Tách bằng chứng unit/frontend/native/browser/live/human UAT. Không tự đóng S11/FR-12 hoặc ký pilot.
6. Giữ lịch sử, bản gốc XLSX, contract Status/P/NA, phân quyền AI khác CRUD và rule khách chưa chốt.

## 3. Các điều chỉnh bắt buộc

| ID / mức | Phát hiện và bằng chứng | Điều chỉnh |
| --- | --- | --- |
| AP-01 / chặn triển khai migration | AR-06 dự kiến `V34__project_archive_legacy_exception.sql`, nhưng `Backend/src/main/java/db/demo/V34__complete_local_demo.java` đã tồn tại. Trùng version khi local resolve cả hai locations. | Dự kiến V37, kiểm lại số tại thời điểm thực thi. Matrix fresh core/core+demo, upgrade coreV33 và localV34 lên schema mới; giữ checksum/data cũ, không đưa demo vào release. |
| AP-02 / thiếu tiêu chí quyền hiện hành | `ProjectService.addOrUpdateMember`, `AdminProjectService.memberCandidates` và `MemberPicker` nay cố định role, PM thêm DEV/TESTER, ADMIN làm PM nhưng vẫn system ADMIN. Kế hoạch cũ chỉ nói member trong U22 chung. | Bổ sung U23 với exclusion trước pagination, privacy ngoài dự án, role immutability, restore legacy role, khóa tài khoản, race/partial save. Không làm lại code bf3971c. |
| AP-03 / thiếu liên thông identity/session | `IdentityService.update/resetPassword` và AuthProvider/AuthBoundary đã thay đổi; mọi sửa account thực tế làm hết hiệu lực phiên. | Bổ sung U24 vào AR-01/10: identity/membership/history giữ nguyên, self-edit/reauth, nháp, duplicate/version. Không chỉ test đường PM tạo TESTER. |
| AP-04 / AI đã có sự cố quan sát được | Trước lượt này: thread11 FAILED AI_UNAVAILABLE sau30,0542s; catalog Caheo200, model có mặt; synthetic tối thiểu timeout30,013s. User báo cả hai máy. Backend max30s, FE35s, interrupted turn2phút. | Đưa nhánh chẩn đoán AR-04 lên sớm. Phân biệt timeout/HTTP/provider/config, giữ manual report và retry chủ động. Không tự tăng một biến timeout, đổi provider hoặc kết luận hết tiền/quá tải. |
| AP-05 / rủi ro blocker không còn thao tác được | `FeatureIssueService.remove` chỉ đặt context.deleted_at; list loại deleted/archived. `ProjectLifecycleService.readiness` vẫn đếm tất cả work_items nonterminal. FeatureService.archive/hideDocument không yêu cầu Issue kết thúc; Issue mutation chặn context archived. | U26 tái hiện trước sửa; G07 bao gồm cả Issue mới bị ẩn/xóa mềm, không chỉ legacy. Quyết định nghĩa vụ sau xóa/ẩn chưa chốt, không mở rộng exception cycles/retests một cách ngầm định. |
| AP-06 / công cụ test chưa có đầu vào đủ rõ | AR-00 có guard chặt nhưng receipt/provision prerequisite và cách reuse native tests mới cần rõ hơn; FeatureIntegrationTest còn khóa schema cũ cụ thể. UserProfileNativeTest có guard khác và auto-Flyway, không thể đưa nguyên vào runner no-migration. | Ghi cách chuẩn bị target mới trên native server hiện có, storage riêng, receipt source; tái dùng assertion phù hợp, tránh framework quá lớn. Tách build khỏi thư mục IDE khi cần. Native chưa chạy không thể DONE toàn task. |
| AP-07 / tuyên bố cấu hình cần sửa | Hướng dẫn vừa thêm nói Maven trực tiếp không đọc .env.mysql.local, nhưng `application-local.yml` đã có optional spring.config.import từ file. | Đính chính theo profile, working directory, TMS_LOCAL_CONFIG_FILE và overrides. Git không đồng bộ key vẫn đúng; metadata model không chứng minh inference. |
| AP-08 / giới hạn UI chưa được kiểm chứng lại | Commit a45974a đổi các nút Sửa/Thu hồi thành icon và vị trí thêm member/device, giữ policy mới. Báo cáo remote ghi frontend1.221 PASS/build, nhưng chưa nghiệm thu hình ảnh toàn màn. | AR-10 kiểm aria-label/title, vùng bấm, keyboard, focus, pending/error, footerAction/responsive; không đổi lại UI theo ảnh hoặc expectation cũ. |

AP-05 là rủi ro **có căn cứ source**, chưa phải bug runtime đã chạy thử trong lượt này. Nếu quyết định vẫn giữ blocker sau soft-delete thì cần đường tra cứu/đối soát thật; không được chỉ làm người dùng thấy bảng trống và nút archive bị khóa mà không giải thích. Nếu muốn bỏ blocker, phải xác nhận ý nghĩa nghiệp vụ, giữ lịch sử và race tests. Không cần hỏi lại ngoại lệ cycles/retests đã chốt.

## 4. Trạng thái từng task sau đối chiếu

| Task | Nhận định hiện tại | Việc tiếp theo |
| --- | --- | --- |
| AR-00 | Runner/guard chung theo plan chưa có; có công cụ native riêng và fixture/test nguồn. | Baseline a45974a + migration profile + target/storage/receipt; offline tests không cần chờ native. |
| AR-01 | PM tạo TESTER đã có. Thành viên/hồ sơ đã thêm và có receipt riêng, chưa có UAT Arena thống nhất. | Reuse, kiểm U02/U03/U23/U24; không tạo form trùng. |
| AR-02 | Implementation Feature/file/Status/import/export hiện hữu. | Xác minh độc lập hai Feature, phân công/race, công thức, XLSX thật và filters. |
| AR-03 | Bug/QA mới và interceptor legacy410 hiện hữu. | Kiểm capability/comment/replay và U26; không mở lại answer-confirm/retest. |
| AR-04 | Báo cáo Markdown đã có; AI hiện tái hiện timeout ở lượt trước. | Tách xử lý lỗi timeout/cấu hình khỏi kiểm số liệu toàn chuỗi; live chưa đạt phải ghi riêng. |
| AR-05 | Sổ tay revision/history hiện hữu. | Native hai connection + browser hai tab, phiên thu quyền và archived. |
| AR-06 | Command archive vẫn chỉ3field, readiness chưa có legacyException. Đây là thay đổi thật chưa triển khai. | Contract/snapshot/V37 + tests; hard blocker/U26 không được bỏ qua. |
| AR-07 | UI archive chưa có xác nhận ngoại lệ; hướng dẫn cycles/retest vẫn theo luồng cũ. | Sau contract AR-06, làm opt-in/reason/history/retry; không sửa bằng cách chỉ bật nút. |
| AR-08 | RulesPanel vẫn ghi “Đang áp dụng”/“cho bug mới”; FeatureIssueService không dùng RuleService. | Sửa copy đúng phạm vi lịch sử như đã lập; không gắn rule engine vào Feature mới. |
| AR-09 | Có thiết kế bảo toàn/restore; chưa có receipt restore chiến dịch này. | Snapshot DB+blob cùng thời điểm, target riêng, hashes/FK; đo nhưng không hứa RPO/RTO chưa chốt. |
| AR-10 | Full regression/browser cuối chưa chạy trên cùng baseline Arena. | Chạy U01–U26, đủ trạng thái của control và lỗi liên module, giữ báo cáo test từng lớp. |
| AR-11 | Gate khách còn mở; nội bộ không phải chờ tất cả gate mới làm được. | Theo dõi xuyên quá trình, chỉ ký kết luận kỹ thuật theo bằng chứng; human UAT riêng. |

Không đổi các task thành DONE trong STATUS chỉ vì đã tìm thấy code/test nguồn hoặc có receipt ở một tác vụ khác.

## 5. Thứ tự đề xuất

1. **Chốt baseline và đầu vào kiểm chứng — AR-00 + chuẩn bị AR-11.** Đúng nguồn/schema/profile, danh sách migrations, test target và storage; không rebuild cả hạ tầng để chạy một test.
2. **Xử lý vấn đề có tác động hiện tại:** nhánh timeout/cấu hình AR-04 và copy Rules AR-08; kiểm lại thành viên/hồ sơ AR-01. Những phần offline này độc lập với data fixture toàn chuỗi.
3. **Lưu trữ có ngoại lệ — AR-06 rồi AR-07.** Đây là phần bổ sung nghiệp vụ rõ nhất, phải có migration/race/replay và giữ hard blockers. U26 cần điều tra để quyết định riêng nếu có bế tắc.
4. **Kiểm chứng luồng chính — AR-02→AR-03→phần số liệu AR-04; AR-05 độc lập.** Dùng một bộ fixture có IDs/hashes và bốn role; không tự tạo run cũ để làm test mới.
5. **Khôi phục và nghiệm thu cuối — AR-09→AR-10→AR-11.** Đủ26ca và7gate, ghi thiếu môi trường/live/human cụ thể. Không gọi là pilot ready khi còn gate cần người xác nhận.

Không cần đặt thời hạn giả; ưu tiên này dựa trên lỗi quan sát được, phạm vi đổi dữ liệu và phụ thuộc. AR-04 không phải chờ AR-03 để điều tra timeout, nhưng phần so sánh report/tổng hợp vẫn cần fixture AR-02/03.

## 6. Điều gì đã chốt, điều gì chưa?

**Đã chốt, không hỏi lại:** Feature/Bug–QA; vòng Status và P/NA; ADMIN authority; ADMIN làm PM giữ role hệ thống; PM thêm DEV/TESTER; không đổi membership role; báo cáo là text; AI scope; ngoại lệ archive cycles/retests có lý do; bảo toàn dữ liệu/lịch sử.

**Chưa chốt hoặc cần bằng chứng trước khi hỏi:** nghĩa vụ blocker sau soft-delete/ẩn context (U26), ngưỡng timeout phù hợp sau đo, mẫu Excel/người nghiệm thu khách, Redmine mapping/quyền live, retention evidence, quy mô/RPO/RTO và người ký pilot. Không biến các câu hỏi khách thành blocker toàn bộ sửa nội bộ.

## 7. Tài liệu cập nhật và giới hạn

Đã cập nhật kế hoạch chính, hai subplan, ma trận U01–U26, STATUS/README; giữ nguyên archive Arena gốc. Đính chính một đoạn hướng dẫn Caheo về profile local. Không sửa Backend/Frontend/scripts sản phẩm.

Skill: `brainstorming` → phân biệt quyết định đã chốt với khoảng trống cần làm rõ; `writing-plans` → rà file/interface/test/phụ thuộc, bổ sung task assertions và tự review. Không gọi việc đọc skill là đã chạy test. Các lệnh rà Git/source và kiểm liên kết tài liệu không thay thế kiểm chứng nghiệp vụ. Coverage chưa đo mới; live/DB/browser không chạy trong lượt này.
