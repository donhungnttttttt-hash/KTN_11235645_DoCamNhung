# Từ điển mở rộng F/Q — V17/V18 theo mã nguồn

Ngày 06/10/2026. Bổ sung cho [từ điển baseline V16](DATA-DICTIONARY.md); đây là schema từ migration source, không phải snapshot database đã chạy. Database native đang dùng vẫn được xác nhận V16; V17/V18 fresh/upgrade/FK/race/preservation chưa kiểm chứng trên schema riêng. Không trộn số bảng dự kiến với số bảng thực tế.

## V17__file_work_groups_and_sessions.sql

Nguồn: [migration](../../Backend/src/main/resources/db/migration/V17__file_work_groups_and_sessions.sql).

### file_work_groups

Danh tính phạm vi một file/cycle/configuration, version và actor cập nhật. Không lưu assignee hay verdict cạnh tranh run.

| Thuộc tính | Khai báo source |
| --- | --- |
| `id` | `BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY` |
| `project_id` | `BIGINT NOT NULL` |
| `document_id` | `BIGINT NOT NULL` |
| `cycle_id` | `BIGINT NOT NULL` |
| `configuration_id` | `BIGINT NOT NULL` |
| `lock_version` | `BIGINT NOT NULL DEFAULT 0` |
| `created_by` | `BIGINT NOT NULL` |
| `created_at` | `DATETIME(6) NOT NULL` |
| `updated_by` | `BIGINT NOT NULL` |
| `updated_at` | `DATETIME(6) NOT NULL` |
| `request_key` | `VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` |
| `request_checksum` | `CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` |

Khóa và ràng buộc:

- `CONSTRAINT uq_fw_group_project UNIQUE(project_id,id)`
- `CONSTRAINT uq_fw_group_source UNIQUE(project_id,document_id,cycle_id,configuration_id)`
- `CONSTRAINT uq_fw_group_context UNIQUE(project_id,id,document_id,cycle_id,configuration_id)`
- `CONSTRAINT uq_fw_group_document UNIQUE(project_id,id,document_id)`
- `CONSTRAINT uq_fw_group_request UNIQUE(project_id,request_key)`
- `CONSTRAINT fk_fw_group_document FOREIGN KEY(project_id,document_id) REFERENCES import_batches(project_id,id)`
- `CONSTRAINT fk_fw_group_config FOREIGN KEY(project_id,cycle_id,configuration_id) REFERENCES cycle_configurations(project_id,cycle_id,id)`
- `CONSTRAINT fk_fw_group_creator FOREIGN KEY(project_id,created_by) REFERENCES project_memberships(project_id,id)`
- `CONSTRAINT fk_fw_group_editor FOREIGN KEY(project_id,updated_by) REFERENCES project_memberships(project_id,id)`
- `CONSTRAINT ck_fw_group_version CHECK(lock_version>=0)`
- `INDEX ix_fw_group_cycle(project_id,cycle_id,id)`

### file_work_group_items

Bảng trung gian pin chính xác dòng import, run, case, revision và cấu hình cùng project; mỗi run thuộc tối đa một group.

| Thuộc tính | Khai báo source |
| --- | --- |
| `project_id` | `BIGINT NOT NULL` |
| `group_id` | `BIGINT NOT NULL` |
| `document_id` | `BIGINT NOT NULL` |
| `cycle_id` | `BIGINT NOT NULL` |
| `configuration_id` | `BIGINT NOT NULL` |
| `import_row_id` | `BIGINT NOT NULL` |
| `run_item_id` | `BIGINT NOT NULL` |
| `test_case_id` | `BIGINT NOT NULL` |
| `revision_id` | `BIGINT NOT NULL` |

Khóa và ràng buộc:

- `PRIMARY KEY(project_id,group_id,run_item_id)`
- `CONSTRAINT uq_fw_item_run UNIQUE(project_id,run_item_id)`
- `CONSTRAINT uq_fw_item_source UNIQUE(project_id,group_id,import_row_id)`
- `CONSTRAINT fk_fw_item_group FOREIGN KEY(project_id,group_id,document_id,cycle_id,configuration_id) REFERENCES file_work_groups(project_id,id,document_id,cycle_id,configuration_id)`
- `CONSTRAINT fk_fw_item_source FOREIGN KEY(project_id,document_id,import_row_id,test_case_id) REFERENCES import_rows(project_id,batch_id,id,target_case_id)`
- `CONSTRAINT fk_fw_item_run_pin FOREIGN KEY(project_id,cycle_id,configuration_id,run_item_id,test_case_id,revision_id) REFERENCES run_items(project_id,cycle_id,configuration_id,id,test_case_id,revision_id)`

### file_work_sessions

Phiên thực hiện trên allocation/máy/build cố định, trạng thái và thời gian; unique generated keys bảo vệ một máy và một group DOING.

| Thuộc tính | Khai báo source |
| --- | --- |
| `id` | `BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY` |
| `project_id` | `BIGINT NOT NULL` |
| `group_id` | `BIGINT NOT NULL` |
| `executor_membership_id` | `BIGINT NOT NULL` |
| `allocation_id` | `BIGINT NOT NULL` |
| `asset_id` | `BIGINT NOT NULL` |
| `build_id` | `BIGINT NOT NULL` |
| `state` | `VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` |
| `lock_version` | `BIGINT NOT NULL DEFAULT 0` |
| `context_snapshot` | `JSON NOT NULL` |
| `started_at` | `DATETIME(6) NOT NULL` |
| `last_transition_at` | `DATETIME(6) NOT NULL` |
| `ended_at` | `DATETIME(6)` |
| `active_asset_id` | `BIGINT GENERATED ALWAYS AS (CASE WHEN state='DOING' THEN asset_id ELSE NULL END) STORED` |
| `active_group_id` | `BIGINT GENERATED ALWAYS AS (CASE WHEN state='DOING' THEN group_id ELSE NULL END) STORED` |

Khóa và ràng buộc:

- `CONSTRAINT uq_fw_session_project UNIQUE(project_id,id)`
- `CONSTRAINT uq_fw_session_group UNIQUE(project_id,group_id,id)`
- `CONSTRAINT uq_fw_session_executor UNIQUE(project_id,id,executor_membership_id)`
- `CONSTRAINT uq_fw_session_asset_doing UNIQUE(active_asset_id)`
- `CONSTRAINT uq_fw_session_group_doing UNIQUE(project_id,active_group_id)`
- `CONSTRAINT fk_fw_session_group FOREIGN KEY(project_id,group_id) REFERENCES file_work_groups(project_id,id)`
- `CONSTRAINT fk_fw_session_allocation FOREIGN KEY(project_id,allocation_id,asset_id,executor_membership_id) REFERENCES device_allocations(project_id,id,asset_id,recipient_membership_id)`
- `CONSTRAINT fk_fw_session_build FOREIGN KEY(project_id,build_id) REFERENCES builds(project_id,id)`
- `CONSTRAINT ck_fw_session_state CHECK(state IN ('DOING','PAUSED','COMPLETED','CANCELLED'))`
- `CONSTRAINT ck_fw_session_version CHECK(lock_version>=0)`
- `CONSTRAINT ck_fw_session_end CHECK((state IN ('DOING','PAUSED') AND ended_at IS NULL) OR (state IN ('COMPLETED','CANCELLED') AND ended_at IS NOT NULL))`
- `CONSTRAINT ck_fw_session_time CHECK(last_transition_at>=started_at AND (ended_at IS NULL OR ended_at>=started_at))`
- `INDEX ix_fw_session_history(project_id,group_id,id)`
- `INDEX ix_fw_session_executor(project_id,executor_membership_id,state,id)`

### file_work_commands

Request key/checksum/action/actor và response thành công để replay chính xác; không thay authority trạng thái phiên.

| Thuộc tính | Khai báo source |
| --- | --- |
| `id` | `BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY` |
| `project_id` | `BIGINT NOT NULL` |
| `group_id` | `BIGINT NOT NULL` |
| `session_id` | `BIGINT` |
| `action` | `VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` |
| `actor_membership_id` | `BIGINT NOT NULL` |
| `request_key` | `VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` |
| `request_checksum` | `CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` |
| `response_json` | `JSON NOT NULL` |
| `occurred_at` | `DATETIME(6) NOT NULL` |

Khóa và ràng buộc:

- `CONSTRAINT uq_fw_command_request UNIQUE(project_id,request_key)`
- `CONSTRAINT fk_fw_command_group FOREIGN KEY(project_id,group_id) REFERENCES file_work_groups(project_id,id)`
- `CONSTRAINT fk_fw_command_session FOREIGN KEY(project_id,group_id,session_id) REFERENCES file_work_sessions(project_id,group_id,id)`
- `CONSTRAINT fk_fw_command_actor FOREIGN KEY(project_id,actor_membership_id) REFERENCES project_memberships(project_id,id)`
- `CONSTRAINT ck_fw_command_action CHECK(action IN ('CREATE','ASSIGN','START','PAUSE','RESUME','COMPLETE','CANCEL'))`
- `INDEX ix_fw_command_group(project_id,group_id,id)`

### file_work_history

Lịch sử append-only của giao file và phiên, version/lý do/actor/time; không chứa verdict thứ hai.

| Thuộc tính | Khai báo source |
| --- | --- |
| `id` | `BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY` |
| `project_id` | `BIGINT NOT NULL` |
| `group_id` | `BIGINT NOT NULL` |
| `session_id` | `BIGINT` |
| `action` | `VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` |
| `from_state` | `VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin` |
| `to_state` | `VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin` |
| `group_version` | `BIGINT NOT NULL` |
| `session_version` | `BIGINT` |
| `reason` | `VARCHAR(1000) NOT NULL` |
| `details_json` | `JSON NOT NULL` |
| `actor_membership_id` | `BIGINT NOT NULL` |
| `occurred_at` | `DATETIME(6) NOT NULL` |

Khóa và ràng buộc:

- `CONSTRAINT fk_fw_history_group FOREIGN KEY(project_id,group_id) REFERENCES file_work_groups(project_id,id)`
- `CONSTRAINT fk_fw_history_session FOREIGN KEY(project_id,group_id,session_id) REFERENCES file_work_sessions(project_id,group_id,id)`
- `CONSTRAINT fk_fw_history_actor FOREIGN KEY(project_id,actor_membership_id) REFERENCES project_memberships(project_id,id)`
- `CONSTRAINT ck_fw_history_action CHECK(action IN ('CREATE','ASSIGN','START','PAUSE','RESUME','COMPLETE','CANCEL'))`
- `CONSTRAINT ck_fw_history_from CHECK(from_state IS NULL OR from_state IN ('READY','DOING','PAUSED','COMPLETED','CANCELLED'))`
- `CONSTRAINT ck_fw_history_to CHECK(to_state IS NULL OR to_state IN ('READY','DOING','PAUSED','COMPLETED','CANCELLED'))`
- `CONSTRAINT ck_fw_history_version CHECK(group_version>=0 AND (session_version IS NULL OR session_version>=0))`
- `INDEX ix_fw_history_group(project_id,group_id,id)`

## V18__qa_work_items.sql

Nguồn: [migration](../../Backend/src/main/resources/db/migration/V18__qa_work_items.sql).

### qa_details

Subtype QA cùng work-item identity, question/context bất biến, generation và pointer câu trả lời/xác nhận hiện hành. Status/assignee/version ở work_items.

| Thuộc tính | Khai báo source |
| --- | --- |
| `project_id` | `BIGINT NOT NULL` |
| `work_item_id` | `BIGINT NOT NULL` |
| `item_type` | `VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'QA'` |
| `question` | `TEXT NOT NULL` |
| `document_id` | `BIGINT` |
| `group_id` | `BIGINT` |
| `run_item_id` | `BIGINT` |
| `test_case_id` | `BIGINT` |
| `revision_id` | `BIGINT` |
| `context_snapshot` | `JSON NOT NULL` |
| `generation` | `BIGINT NOT NULL DEFAULT 0` |
| `current_answer_id` | `BIGINT` |
| `current_confirmation_id` | `BIGINT` |

Khóa và ràng buộc:

- `PRIMARY KEY(project_id,work_item_id)`
- `CONSTRAINT fk_qa_work_type FOREIGN KEY(project_id,work_item_id,item_type) REFERENCES work_items(project_id,id,item_type)`
- `CONSTRAINT fk_qa_document FOREIGN KEY(project_id,document_id) REFERENCES import_batches(project_id,id)`
- `CONSTRAINT fk_qa_group FOREIGN KEY(project_id,group_id) REFERENCES file_work_groups(project_id,id)`
- `CONSTRAINT fk_qa_group_document FOREIGN KEY(project_id,group_id,document_id) REFERENCES file_work_groups(project_id,id,document_id)`
- `CONSTRAINT fk_qa_run FOREIGN KEY(project_id,run_item_id) REFERENCES run_items(project_id,id)`
- `CONSTRAINT fk_qa_group_run FOREIGN KEY(project_id,group_id,run_item_id) REFERENCES file_work_group_items(project_id,group_id,run_item_id)`
- `CONSTRAINT fk_qa_revision FOREIGN KEY(project_id,test_case_id,revision_id) REFERENCES test_case_revisions(project_id,test_case_id,id)`
- `CONSTRAINT ck_qa_type CHECK(item_type='QA')`
- `CONSTRAINT ck_qa_question CHECK(CHAR_LENGTH(TRIM(question))>0)`
- `CONSTRAINT ck_qa_revision_pair CHECK((test_case_id IS NULL AND revision_id IS NULL) OR (test_case_id IS NOT NULL AND revision_id IS NOT NULL))`
- `CONSTRAINT ck_qa_generation CHECK(generation>=0)`
- `CONSTRAINT ck_qa_confirmation_pointer CHECK(current_confirmation_id IS NULL OR current_answer_id IS NOT NULL)`

### qa_answers

Câu trả lời Dev bất biến theo generation/version, nội dung và nguồn căn cứ; không biến comment thành answer.

| Thuộc tính | Khai báo source |
| --- | --- |
| `id` | `BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY` |
| `project_id` | `BIGINT NOT NULL` |
| `work_item_id` | `BIGINT NOT NULL` |
| `generation` | `BIGINT NOT NULL` |
| `answer_version` | `BIGINT NOT NULL` |
| `body` | `TEXT NOT NULL` |
| `basis_reference` | `VARCHAR(1000) NOT NULL` |
| `author_membership_id` | `BIGINT NOT NULL` |
| `answered_at` | `DATETIME(6) NOT NULL` |

Khóa và ràng buộc:

- `CONSTRAINT uq_qa_answer_version UNIQUE(project_id,work_item_id,answer_version)`
- `CONSTRAINT uq_qa_answer_generation UNIQUE(project_id,work_item_id,generation,id)`
- `CONSTRAINT fk_qa_answer_detail FOREIGN KEY(project_id,work_item_id) REFERENCES qa_details(project_id,work_item_id)`
- `CONSTRAINT fk_qa_answer_author FOREIGN KEY(project_id,author_membership_id) REFERENCES project_memberships(project_id,id)`
- `CONSTRAINT ck_qa_answer_version CHECK(answer_version>0 AND generation>=0)`
- `CONSTRAINT ck_qa_answer_body CHECK(CHAR_LENGTH(TRIM(body))>0)`
- `INDEX ix_qa_answer_history(project_id,work_item_id,id)`

### qa_confirmations

Xác nhận Tester bất biến gắn đúng QA/generation/answer, không tự sinh khi PM đóng ngoại lệ.

| Thuộc tính | Khai báo source |
| --- | --- |
| `id` | `BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY` |
| `project_id` | `BIGINT NOT NULL` |
| `work_item_id` | `BIGINT NOT NULL` |
| `generation` | `BIGINT NOT NULL` |
| `answer_id` | `BIGINT NOT NULL` |
| `body` | `TEXT NOT NULL` |
| `confirmed_by` | `BIGINT NOT NULL` |
| `confirmed_at` | `DATETIME(6) NOT NULL` |

Khóa và ràng buộc:

- `CONSTRAINT uq_qa_confirmation_answer UNIQUE(project_id,work_item_id,generation,answer_id)`
- `CONSTRAINT uq_qa_confirmation_pointer UNIQUE(project_id,work_item_id,generation,answer_id,id)`
- `CONSTRAINT fk_qa_confirmation_answer FOREIGN KEY(project_id,work_item_id,generation,answer_id) REFERENCES qa_answers(project_id,work_item_id,generation,id)`
- `CONSTRAINT fk_qa_confirmation_actor FOREIGN KEY(project_id,confirmed_by) REFERENCES project_memberships(project_id,id)`
- `CONSTRAINT ck_qa_confirmation_body CHECK(CHAR_LENGTH(TRIM(body))>0)`
- `INDEX ix_qa_confirmation_history(project_id,work_item_id,id)`

### qa_commands

Replay lệnh QA thành công theo key/checksum/action/actor/resource; current role/source guards vẫn được kiểm tra trước replay.

| Thuộc tính | Khai báo source |
| --- | --- |
| `id` | `BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY` |
| `project_id` | `BIGINT NOT NULL` |
| `work_item_id` | `BIGINT NOT NULL` |
| `action` | `VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` |
| `actor_membership_id` | `BIGINT NOT NULL` |
| `request_key` | `VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` |
| `request_checksum` | `CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` |
| `response_json` | `JSON NOT NULL` |
| `occurred_at` | `DATETIME(6) NOT NULL` |

Khóa và ràng buộc:

- `CONSTRAINT uq_qa_command_request UNIQUE(project_id,request_key)`
- `CONSTRAINT fk_qa_command_item FOREIGN KEY(project_id,work_item_id) REFERENCES qa_details(project_id,work_item_id)`
- `CONSTRAINT fk_qa_command_actor FOREIGN KEY(project_id,actor_membership_id) REFERENCES project_memberships(project_id,id)`
- `CONSTRAINT ck_qa_command_action CHECK(action IN ('CREATE','ASSIGN','START','REQUEST_INFO','PROVIDE_INFO','ANSWER','CONFIRM','CLOSE','REOPEN'))`
- `INDEX ix_qa_command_history(project_id,work_item_id,id)`

## Thay đổi trên bảng nền và authority

- `execution_attempts.file_work_session_id`: BIGINT nullable, composite FK gồm project/session/executor. Lần chạy cũ và FULL_CASE retest giữ NULL; không backfill thiết bị hay phiên giả. Index phục vụ truy vết phiên/run.
- `import_rows`, `run_items`, `device_allocations`: thêm candidate UNIQUE composite để FK pin identity đầy đủ. Đây là khóa bảo vệ nguồn/cấu hình/recipient cùng project, không tạo thêm authority assignee hoặc allocation.
- `work_items.item_type`: CHECK thêm QA; CHECK riêng chỉ cho QA dùng open/progress/clarify/resolved/recheck/closed. Không thay trạng thái BUG cũ, không rewrite work-item cũ.
- `qa_details.current_answer_id/current_confirmation_id`: FK composite bảo vệ cùng QA/generation/answer. Service clear pointer trước khi tăng generation; lịch sử answer/confirmation giữ nguyên. Version confirmation được đọc từ answer đã tham chiếu, không có cột version cạnh tranh.

## Quan hệ và kiểm soát cập nhật

Project/document/configuration → groups; group → items/sessions/commands/history là các quan hệ 1–n qua FK. `file_work_group_items` là bảng trung gian tường minh, pin run và dòng nguồn; một run có tối đa một group. Work item QA → subtype là 1–1; QA → answers/confirmations/commands là 1–n. Cặp pointer hiện hành chỉ chọn một phần tử lịch sử đúng generation, không thay lịch sử. Mọi FK project composite ngăn tham chiếu lẫn dự án; unique DOING asset mang phạm vi toàn hệ thống, unique DOING group theo project.

Không gắn updated_at/updated_by giả cho hàng bất biến: session có last_transition_at, người thực hiện cố định và history actor; answers có author/answered_at, confirmations có confirmed_by/confirmed_at, commands/history có actor/occurred_at. Group có created/updated actors và timestamps; QA dùng audit/version của work_items nền. Bảng liên kết bất biến được tạo trong transaction và kiểm tra qua command/history.

Database CHECK/FK/unique không thay guard nghiệp vụ: account/session/member hiện hành, role/assignment, nguồn active/approved, cycle/build/thiết bị được phép, expected versions, source-state và checksum vẫn kiểm tra ở service. Idempotency response là snapshot lịch sử; UI refetch dữ liệu hiện hành sau replay. Máy/allocation/build của phiên không đổi khi resume. Kết quả tài liệu, canonical attempt và xác minh BUG vẫn tách biệt.

Tổng source mở rộng: 9 bảng mới, 98 thuộc tính bảng mới, 32 FK mới kể cả ALTER; không phải số liệu database live. Xem [file-work contract](../api/file-work.md), [QA contract](../api/qa.md) và [báo cáo triển khai](../reviews/2026-10-06-fq-implementation.md).
