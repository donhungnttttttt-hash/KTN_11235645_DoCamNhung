-- S06 internal policy approved in ADR-006. Existing migrations remain immutable.
CREATE TABLE work_item_statuses (
    code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    label_vi VARCHAR(80) NOT NULL,
    color CHAR(7) CHARACTER SET ascii NOT NULL,
    sort_order INT NOT NULL,
    terminal BOOLEAN NOT NULL
) ENGINE=InnoDB;
INSERT INTO work_item_statuses VALUES
('open','Chưa xử lý','#ed807d',0,FALSE),('progress','Đang xử lý','#5185bc',1,FALSE),
('recheck','SYP kiểm tra lại','#e97443',2,FALSE),('clarify','Xác nhận đặc tả / mức độ','#e97443',3,FALSE),
('ready','Sẵn sàng xử lý','#dc79a0',4,FALSE),('planning','Lập kế hoạch','#449db5',5,FALSE),
('resolved','Đã xử lý','#5aafa3',6,FALSE),('unreproducible','Không tái hiện','#9bb143',7,TRUE),
('wontfix','Không xử lý','#9bb143',8,TRUE),('closed','Hoàn thành','#9bb143',9,TRUE);

CREATE TABLE work_item_policy_versions (
    code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    definition_json JSON NOT NULL
) ENGINE=InnoDB;
INSERT INTO work_item_policy_versions VALUES ('INTERNAL_V1','Quy tắc bug nội bộ v1',
    '{"decision":"ADR-006","required":["title","steps","expectedResult","actualResult","buildId","environmentId","deviceId"],"standalone":"PROJECT_PM_WITH_REASON","triage":"PROJECT_PM","closureEnabled":false}');

CREATE TABLE work_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    item_no BIGINT NOT NULL,
    item_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    item_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    status_code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'open',
    priority_code VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    category_id BIGINT,
    milestone_id BIGINT,
    assignee_membership_id BIGINT,
    lock_version BIGINT NOT NULL DEFAULT 0,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    CONSTRAINT uq_work_project_id UNIQUE(project_id,id),
    CONSTRAINT uq_work_project_id_type UNIQUE(project_id,id,item_type),
    CONSTRAINT uq_work_number UNIQUE(project_id,item_no),
    CONSTRAINT uq_work_key UNIQUE(item_key),
    CONSTRAINT uq_work_request UNIQUE(project_id,request_key),
    CONSTRAINT fk_work_project FOREIGN KEY(project_id) REFERENCES projects(id),
    CONSTRAINT fk_work_status FOREIGN KEY(status_code) REFERENCES work_item_statuses(code),
    CONSTRAINT fk_work_category FOREIGN KEY(project_id,category_id) REFERENCES categories(project_id,id),
    CONSTRAINT fk_work_milestone FOREIGN KEY(project_id,milestone_id) REFERENCES milestones(project_id,id),
    CONSTRAINT fk_work_assignee FOREIGN KEY(project_id,assignee_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT fk_work_creator FOREIGN KEY(project_id,created_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT fk_work_editor FOREIGN KEY(project_id,updated_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_work_type CHECK(item_type IN ('BUG','REQUEST','TASK','IMPROVEMENT')),
    CONSTRAINT ck_work_priority CHECK(priority_code IN ('HIGH','MEDIUM','LOW')),
    CONSTRAINT ck_work_version CHECK(lock_version>=0 AND item_no>0),
    INDEX ix_work_board(project_id,status_code,updated_at,id),
    INDEX ix_work_type(project_id,item_type,updated_at,id),
    INDEX ix_work_assignee(project_id,assignee_membership_id,id)
) ENGINE=InnoDB;

CREATE TABLE bug_details (
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    item_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'BUG',
    policy_version VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    steps TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    actual_result TEXT NOT NULL,
    build_id BIGINT NOT NULL,
    environment_id BIGINT NOT NULL,
    device_id BIGINT NOT NULL,
    test_case_id BIGINT,
    revision_id BIGINT,
    standalone_reason VARCHAR(1000) NOT NULL,
    fixed_build_id BIGINT,
    context_snapshot JSON NOT NULL,
    PRIMARY KEY(project_id,work_item_id),
    CONSTRAINT fk_bug_work FOREIGN KEY(project_id,work_item_id,item_type) REFERENCES work_items(project_id,id,item_type),
    CONSTRAINT fk_bug_policy FOREIGN KEY(policy_version) REFERENCES work_item_policy_versions(code),
    CONSTRAINT fk_bug_build FOREIGN KEY(project_id,build_id) REFERENCES builds(project_id,id),
    CONSTRAINT fk_bug_fixed_build FOREIGN KEY(project_id,fixed_build_id) REFERENCES builds(project_id,id),
    CONSTRAINT fk_bug_env FOREIGN KEY(project_id,environment_id) REFERENCES environments(project_id,id),
    CONSTRAINT fk_bug_device FOREIGN KEY(project_id,device_id) REFERENCES devices(project_id,id),
    CONSTRAINT fk_bug_revision FOREIGN KEY(project_id,test_case_id,revision_id) REFERENCES test_case_revisions(project_id,test_case_id,id),
    CONSTRAINT ck_bug_type CHECK(item_type='BUG'),
    CONSTRAINT ck_bug_text CHECK(CHAR_LENGTH(TRIM(steps))>0 AND CHAR_LENGTH(TRIM(expected_result))>0 AND CHAR_LENGTH(TRIM(actual_result))>0),
    CONSTRAINT ck_bug_source CHECK((test_case_id IS NOT NULL AND revision_id IS NOT NULL) OR (test_case_id IS NULL AND revision_id IS NULL AND CHAR_LENGTH(TRIM(standalone_reason))>0))
) ENGINE=InnoDB;

CREATE TABLE work_item_execution_links (
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    run_item_id BIGINT NOT NULL,
    attempt_id BIGINT NOT NULL,
    linked_by BIGINT NOT NULL,
    linked_at DATETIME(6) NOT NULL,
    PRIMARY KEY(project_id,work_item_id,attempt_id),
    CONSTRAINT fk_work_link_bug FOREIGN KEY(project_id,work_item_id) REFERENCES bug_details(project_id,work_item_id),
    CONSTRAINT fk_work_link_attempt FOREIGN KEY(project_id,run_item_id,attempt_id) REFERENCES execution_attempts(project_id,run_item_id,id),
    CONSTRAINT fk_work_link_actor FOREIGN KEY(project_id,linked_by) REFERENCES project_memberships(project_id,id),
    INDEX ix_work_link_attempt(project_id,attempt_id,work_item_id)
) ENGINE=InnoDB;

CREATE TABLE work_item_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    event_type VARCHAR(32) NOT NULL,
    from_status VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin,
    to_status VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin,
    reason VARCHAR(1000) NOT NULL,
    details_json JSON NOT NULL,
    actor_membership_id BIGINT NOT NULL,
    occurred_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_work_history_item FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id),
    CONSTRAINT fk_work_history_actor FOREIGN KEY(project_id,actor_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT fk_work_history_from FOREIGN KEY(from_status) REFERENCES work_item_statuses(code),
    CONSTRAINT fk_work_history_to FOREIGN KEY(to_status) REFERENCES work_item_statuses(code),
    INDEX ix_work_history(project_id,work_item_id,id)
) ENGINE=InnoDB;

CREATE TABLE work_item_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    visibility VARCHAR(16) NOT NULL DEFAULT 'INTERNAL',
    author_membership_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    CONSTRAINT uq_comment_request UNIQUE(project_id,work_item_id,request_key),
    CONSTRAINT fk_comment_work FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id),
    CONSTRAINT fk_comment_actor FOREIGN KEY(project_id,author_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_comment_internal CHECK(visibility='INTERNAL'),
    INDEX ix_comment_history(project_id,work_item_id,id)
) ENGINE=InnoDB;

CREATE TABLE work_item_external_references (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    provider VARCHAR(32) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    external_url VARCHAR(2048) NOT NULL,
    reconciliation_status VARCHAR(32) NOT NULL DEFAULT 'UNRECONCILED',
    recorded_by BIGINT NOT NULL,
    recorded_at DATETIME(6) NOT NULL,
    CONSTRAINT uq_external_reference UNIQUE(project_id,provider,external_id),
    CONSTRAINT fk_external_work FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id),
    CONSTRAINT fk_external_actor FOREIGN KEY(project_id,recorded_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_external_unreconciled CHECK(reconciliation_status='UNRECONCILED')
) ENGINE=InnoDB;

CREATE TABLE work_item_clarifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    source_kind VARCHAR(16) NOT NULL,
    source_reference VARCHAR(1000) NOT NULL,
    confirmed_by VARCHAR(100) NOT NULL,
    confirmed_at DATETIME(6) NOT NULL,
    conclusion TEXT NOT NULL,
    recorded_by BIGINT NOT NULL,
    recorded_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_clarification_work FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id),
    CONSTRAINT fk_clarification_actor FOREIGN KEY(project_id,recorded_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_clarification_source CHECK(source_kind IN ('BRSE','SHIFT','CUSTOMER','INTERNAL')),
    INDEX ix_clarification_work(project_id,work_item_id,id)
) ENGINE=InnoDB;

CREATE TABLE work_item_attachments (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    media_type VARCHAR(100) NOT NULL,
    byte_size BIGINT NOT NULL,
    sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    uploaded_by BIGINT NOT NULL,
    uploaded_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_attachment_work FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id),
    CONSTRAINT fk_attachment_actor FOREIGN KEY(project_id,uploaded_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_attachment_size CHECK(byte_size>0 AND byte_size<=20971520),
    CONSTRAINT ck_attachment_type CHECK(media_type IN ('image/png','image/jpeg','application/pdf','video/mp4')),
    INDEX ix_attachment_work(project_id,work_item_id,uploaded_at,id)
) ENGINE=InnoDB;
