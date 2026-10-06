-- F/Q approved 2026-10-06. Additive: no historical attempt/source/annotation rewrite.
-- Extra candidate keys express exact source/run/allocation identity, not new authority.
ALTER TABLE import_rows ADD CONSTRAINT uq_ir_file_source UNIQUE(project_id,batch_id,id,target_case_id);
ALTER TABLE run_items ADD CONSTRAINT uq_run_file_pin UNIQUE(project_id,cycle_id,configuration_id,id,test_case_id,revision_id);
ALTER TABLE device_allocations ADD CONSTRAINT uq_allocation_session_context UNIQUE(project_id,id,asset_id,recipient_membership_id);

CREATE TABLE file_work_groups (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    document_id BIGINT NOT NULL,
    cycle_id BIGINT NOT NULL,
    configuration_id BIGINT NOT NULL,
    lock_version BIGINT NOT NULL DEFAULT 0,
    created_by BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_by BIGINT NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    CONSTRAINT uq_fw_group_project UNIQUE(project_id,id),
    CONSTRAINT uq_fw_group_source UNIQUE(project_id,document_id,cycle_id,configuration_id),
    CONSTRAINT uq_fw_group_context UNIQUE(project_id,id,document_id,cycle_id,configuration_id),
    CONSTRAINT uq_fw_group_document UNIQUE(project_id,id,document_id),
    CONSTRAINT uq_fw_group_request UNIQUE(project_id,request_key),
    CONSTRAINT fk_fw_group_document FOREIGN KEY(project_id,document_id) REFERENCES import_batches(project_id,id),
    CONSTRAINT fk_fw_group_config FOREIGN KEY(project_id,cycle_id,configuration_id) REFERENCES cycle_configurations(project_id,cycle_id,id),
    CONSTRAINT fk_fw_group_creator FOREIGN KEY(project_id,created_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT fk_fw_group_editor FOREIGN KEY(project_id,updated_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_fw_group_version CHECK(lock_version>=0),
    INDEX ix_fw_group_cycle(project_id,cycle_id,id)
) ENGINE=InnoDB;

-- Assignee and revision remain canonical on run_items. No competing group assignee.
CREATE TABLE file_work_group_items (
    project_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    document_id BIGINT NOT NULL,
    cycle_id BIGINT NOT NULL,
    configuration_id BIGINT NOT NULL,
    import_row_id BIGINT NOT NULL,
    run_item_id BIGINT NOT NULL,
    test_case_id BIGINT NOT NULL,
    revision_id BIGINT NOT NULL,
    PRIMARY KEY(project_id,group_id,run_item_id),
    CONSTRAINT uq_fw_item_run UNIQUE(project_id,run_item_id),
    CONSTRAINT uq_fw_item_source UNIQUE(project_id,group_id,import_row_id),
    CONSTRAINT fk_fw_item_group FOREIGN KEY(project_id,group_id,document_id,cycle_id,configuration_id) REFERENCES file_work_groups(project_id,id,document_id,cycle_id,configuration_id),
    CONSTRAINT fk_fw_item_source FOREIGN KEY(project_id,document_id,import_row_id,test_case_id) REFERENCES import_rows(project_id,batch_id,id,target_case_id),
    CONSTRAINT fk_fw_item_run_pin FOREIGN KEY(project_id,cycle_id,configuration_id,run_item_id,test_case_id,revision_id) REFERENCES run_items(project_id,cycle_id,configuration_id,id,test_case_id,revision_id)
) ENGINE=InnoDB;

CREATE TABLE file_work_sessions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    executor_membership_id BIGINT NOT NULL,
    allocation_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,
    build_id BIGINT NOT NULL,
    state VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    lock_version BIGINT NOT NULL DEFAULT 0,
    context_snapshot JSON NOT NULL,
    started_at DATETIME(6) NOT NULL,
    last_transition_at DATETIME(6) NOT NULL,
    ended_at DATETIME(6),
    active_asset_id BIGINT GENERATED ALWAYS AS (CASE WHEN state='DOING' THEN asset_id ELSE NULL END) STORED,
    active_group_id BIGINT GENERATED ALWAYS AS (CASE WHEN state='DOING' THEN group_id ELSE NULL END) STORED,
    CONSTRAINT uq_fw_session_project UNIQUE(project_id,id),
    CONSTRAINT uq_fw_session_group UNIQUE(project_id,group_id,id),
    CONSTRAINT uq_fw_session_executor UNIQUE(project_id,id,executor_membership_id),
    CONSTRAINT uq_fw_session_asset_doing UNIQUE(active_asset_id),
    CONSTRAINT uq_fw_session_group_doing UNIQUE(project_id,active_group_id),
    CONSTRAINT fk_fw_session_group FOREIGN KEY(project_id,group_id) REFERENCES file_work_groups(project_id,id),
    CONSTRAINT fk_fw_session_allocation FOREIGN KEY(project_id,allocation_id,asset_id,executor_membership_id) REFERENCES device_allocations(project_id,id,asset_id,recipient_membership_id),
    CONSTRAINT fk_fw_session_build FOREIGN KEY(project_id,build_id) REFERENCES builds(project_id,id),
    CONSTRAINT ck_fw_session_state CHECK(state IN ('DOING','PAUSED','COMPLETED','CANCELLED')),
    CONSTRAINT ck_fw_session_version CHECK(lock_version>=0),
    CONSTRAINT ck_fw_session_end CHECK((state IN ('DOING','PAUSED') AND ended_at IS NULL) OR (state IN ('COMPLETED','CANCELLED') AND ended_at IS NOT NULL)),
    CONSTRAINT ck_fw_session_time CHECK(last_transition_at>=started_at AND (ended_at IS NULL OR ended_at>=started_at)),
    INDEX ix_fw_session_history(project_id,group_id,id),
    INDEX ix_fw_session_executor(project_id,executor_membership_id,state,id)
) ENGINE=InnoDB;

-- Commands store the successful response for exact replay; failed commands roll back.
CREATE TABLE file_work_commands (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    session_id BIGINT,
    action VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    actor_membership_id BIGINT NOT NULL,
    request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    response_json JSON NOT NULL,
    occurred_at DATETIME(6) NOT NULL,
    CONSTRAINT uq_fw_command_request UNIQUE(project_id,request_key),
    CONSTRAINT fk_fw_command_group FOREIGN KEY(project_id,group_id) REFERENCES file_work_groups(project_id,id),
    CONSTRAINT fk_fw_command_session FOREIGN KEY(project_id,group_id,session_id) REFERENCES file_work_sessions(project_id,group_id,id),
    CONSTRAINT fk_fw_command_actor FOREIGN KEY(project_id,actor_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_fw_command_action CHECK(action IN ('CREATE','ASSIGN','START','PAUSE','RESUME','COMPLETE','CANCEL')),
    INDEX ix_fw_command_group(project_id,group_id,id)
) ENGINE=InnoDB;

CREATE TABLE file_work_history (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    session_id BIGINT,
    action VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    from_state VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin,
    to_state VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin,
    group_version BIGINT NOT NULL,
    session_version BIGINT,
    reason VARCHAR(1000) NOT NULL,
    details_json JSON NOT NULL,
    actor_membership_id BIGINT NOT NULL,
    occurred_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_fw_history_group FOREIGN KEY(project_id,group_id) REFERENCES file_work_groups(project_id,id),
    CONSTRAINT fk_fw_history_session FOREIGN KEY(project_id,group_id,session_id) REFERENCES file_work_sessions(project_id,group_id,id),
    CONSTRAINT fk_fw_history_actor FOREIGN KEY(project_id,actor_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_fw_history_action CHECK(action IN ('CREATE','ASSIGN','START','PAUSE','RESUME','COMPLETE','CANCEL')),
    CONSTRAINT ck_fw_history_from CHECK(from_state IS NULL OR from_state IN ('READY','DOING','PAUSED','COMPLETED','CANCELLED')),
    CONSTRAINT ck_fw_history_to CHECK(to_state IS NULL OR to_state IN ('READY','DOING','PAUSED','COMPLETED','CANCELLED')),
    CONSTRAINT ck_fw_history_version CHECK(group_version>=0 AND (session_version IS NULL OR session_version>=0)),
    INDEX ix_fw_history_group(project_id,group_id,id)
) ENGINE=InnoDB;

-- NULL remains valid for every historical and canonical FULL_CASE retest attempt.
ALTER TABLE execution_attempts ADD COLUMN file_work_session_id BIGINT NULL,
    ADD CONSTRAINT fk_attempt_file_session FOREIGN KEY(project_id,file_work_session_id,executor_membership_id) REFERENCES file_work_sessions(project_id,id,executor_membership_id),
    ADD INDEX ix_attempt_file_session(project_id,file_work_session_id,run_item_id,id);
