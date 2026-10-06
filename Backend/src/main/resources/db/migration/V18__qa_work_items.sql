-- QA shares work-item identity/counter/status/history. Existing BUG rules stay intact.
ALTER TABLE work_items DROP CHECK ck_work_type;
ALTER TABLE work_items ADD CONSTRAINT ck_work_type CHECK(item_type IN ('BUG','REQUEST','TASK','IMPROVEMENT','QA')),
    ADD CONSTRAINT ck_work_qa_status CHECK(item_type<>'QA' OR status_code IN ('open','progress','clarify','resolved','recheck','closed'));

CREATE TABLE qa_details (
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    item_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'QA',
    question TEXT NOT NULL,
    document_id BIGINT,
    group_id BIGINT,
    run_item_id BIGINT,
    test_case_id BIGINT,
    revision_id BIGINT,
    context_snapshot JSON NOT NULL,
    generation BIGINT NOT NULL DEFAULT 0,
    current_answer_id BIGINT,
    current_confirmation_id BIGINT,
    PRIMARY KEY(project_id,work_item_id),
    CONSTRAINT fk_qa_work_type FOREIGN KEY(project_id,work_item_id,item_type) REFERENCES work_items(project_id,id,item_type),
    CONSTRAINT fk_qa_document FOREIGN KEY(project_id,document_id) REFERENCES import_batches(project_id,id),
    CONSTRAINT fk_qa_group FOREIGN KEY(project_id,group_id) REFERENCES file_work_groups(project_id,id),
    CONSTRAINT fk_qa_group_document FOREIGN KEY(project_id,group_id,document_id) REFERENCES file_work_groups(project_id,id,document_id),
    CONSTRAINT fk_qa_run FOREIGN KEY(project_id,run_item_id) REFERENCES run_items(project_id,id),
    CONSTRAINT fk_qa_group_run FOREIGN KEY(project_id,group_id,run_item_id) REFERENCES file_work_group_items(project_id,group_id,run_item_id),
    CONSTRAINT fk_qa_revision FOREIGN KEY(project_id,test_case_id,revision_id) REFERENCES test_case_revisions(project_id,test_case_id,id),
    CONSTRAINT ck_qa_type CHECK(item_type='QA'),
    CONSTRAINT ck_qa_question CHECK(CHAR_LENGTH(TRIM(question))>0),
    CONSTRAINT ck_qa_revision_pair CHECK((test_case_id IS NULL AND revision_id IS NULL) OR (test_case_id IS NOT NULL AND revision_id IS NOT NULL)),
    CONSTRAINT ck_qa_generation CHECK(generation>=0),
    CONSTRAINT ck_qa_confirmation_pointer CHECK(current_confirmation_id IS NULL OR current_answer_id IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE qa_answers (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    generation BIGINT NOT NULL,
    answer_version BIGINT NOT NULL,
    body TEXT NOT NULL,
    basis_reference VARCHAR(1000) NOT NULL,
    author_membership_id BIGINT NOT NULL,
    answered_at DATETIME(6) NOT NULL,
    CONSTRAINT uq_qa_answer_version UNIQUE(project_id,work_item_id,answer_version),
    CONSTRAINT uq_qa_answer_generation UNIQUE(project_id,work_item_id,generation,id),
    CONSTRAINT fk_qa_answer_detail FOREIGN KEY(project_id,work_item_id) REFERENCES qa_details(project_id,work_item_id),
    CONSTRAINT fk_qa_answer_author FOREIGN KEY(project_id,author_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_qa_answer_version CHECK(answer_version>0 AND generation>=0),
    CONSTRAINT ck_qa_answer_body CHECK(CHAR_LENGTH(TRIM(body))>0),
    INDEX ix_qa_answer_history(project_id,work_item_id,id)
) ENGINE=InnoDB;

CREATE TABLE qa_confirmations (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    generation BIGINT NOT NULL,
    answer_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    confirmed_by BIGINT NOT NULL,
    confirmed_at DATETIME(6) NOT NULL,
    CONSTRAINT uq_qa_confirmation_answer UNIQUE(project_id,work_item_id,generation,answer_id),
    CONSTRAINT uq_qa_confirmation_pointer UNIQUE(project_id,work_item_id,generation,answer_id,id),
    CONSTRAINT fk_qa_confirmation_answer FOREIGN KEY(project_id,work_item_id,generation,answer_id) REFERENCES qa_answers(project_id,work_item_id,generation,id),
    CONSTRAINT fk_qa_confirmation_actor FOREIGN KEY(project_id,confirmed_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_qa_confirmation_body CHECK(CHAR_LENGTH(TRIM(body))>0),
    INDEX ix_qa_confirmation_history(project_id,work_item_id,id)
) ENGINE=InnoDB;

ALTER TABLE qa_details
    ADD CONSTRAINT fk_qa_current_answer FOREIGN KEY(project_id,work_item_id,generation,current_answer_id) REFERENCES qa_answers(project_id,work_item_id,generation,id),
    ADD CONSTRAINT fk_qa_current_confirmation FOREIGN KEY(project_id,work_item_id,generation,current_answer_id,current_confirmation_id) REFERENCES qa_confirmations(project_id,work_item_id,generation,answer_id,id);

CREATE TABLE qa_commands (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    work_item_id BIGINT NOT NULL,
    action VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    actor_membership_id BIGINT NOT NULL,
    request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    response_json JSON NOT NULL,
    occurred_at DATETIME(6) NOT NULL,
    CONSTRAINT uq_qa_command_request UNIQUE(project_id,request_key),
    CONSTRAINT fk_qa_command_item FOREIGN KEY(project_id,work_item_id) REFERENCES qa_details(project_id,work_item_id),
    CONSTRAINT fk_qa_command_actor FOREIGN KEY(project_id,actor_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_qa_command_action CHECK(action IN ('CREATE','ASSIGN','START','REQUEST_INFO','PROVIDE_INFO','ANSWER','CONFIRM','CLOSE','REOPEN')),
    INDEX ix_qa_command_history(project_id,work_item_id,id)
) ENGINE=InnoDB;
