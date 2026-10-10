-- S05: immutable scope/revisions, assignment history and append-only attempts.
-- Existing V1-V5 are deliberately unchanged. No demo data or credentials.
CREATE TABLE cycle_statuses (
    code VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    label_vi VARCHAR(50) NOT NULL
) ENGINE=InnoDB;
INSERT INTO cycle_statuses VALUES ('DRAFT','Bản nháp'),('ACTIVE','Đang thực hiện');

CREATE TABLE execution_results (
    code VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    label_vi VARCHAR(50) NOT NULL
) ENGINE=InnoDB;
-- NOT_RUN is absence of an attempt; Fix is a bug signal, never a test verdict.
INSERT INTO execution_results VALUES ('OK','Đạt'),('NG','Không đạt'),('P','Tạm hoãn');

CREATE TABLE test_cycles (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    name VARCHAR(100) NOT NULL,
    milestone_id BIGINT,
    status_code VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'DRAFT',
    lock_version BIGINT NOT NULL DEFAULT 0,
    activated_at DATETIME(6),
    activated_by BIGINT,
    created_at DATETIME(6) NOT NULL,
    created_by BIGINT NOT NULL,
    CONSTRAINT uq_cycle_code UNIQUE(project_id,code),
    CONSTRAINT uq_cycle_project_id UNIQUE(project_id,id),
    CONSTRAINT fk_cycle_project FOREIGN KEY(project_id) REFERENCES projects(id),
    CONSTRAINT fk_cycle_status FOREIGN KEY(status_code) REFERENCES cycle_statuses(code),
    CONSTRAINT fk_cycle_milestone FOREIGN KEY(project_id,milestone_id) REFERENCES milestones(project_id,id),
    CONSTRAINT fk_cycle_creator FOREIGN KEY(project_id,created_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT fk_cycle_activator FOREIGN KEY(project_id,activated_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_cycle_activation CHECK ((status_code='DRAFT' AND activated_at IS NULL AND activated_by IS NULL) OR (status_code='ACTIVE' AND activated_at IS NOT NULL AND activated_by IS NOT NULL)),
    CONSTRAINT ck_cycle_version CHECK(lock_version>=0),
    INDEX ix_cycles_status(project_id,status_code,id)
) ENGINE=InnoDB;

CREATE TABLE cycle_configurations (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    cycle_id BIGINT NOT NULL,
    environment_id BIGINT NOT NULL,
    device_id BIGINT NOT NULL,
    default_build_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT uq_config_scope UNIQUE(project_id,cycle_id,environment_id,device_id),
    CONSTRAINT uq_config_cycle_id UNIQUE(project_id,cycle_id,id),
    CONSTRAINT fk_config_cycle FOREIGN KEY(project_id,cycle_id) REFERENCES test_cycles(project_id,id),
    CONSTRAINT fk_config_env FOREIGN KEY(project_id,environment_id) REFERENCES environments(project_id,id),
    CONSTRAINT fk_config_device FOREIGN KEY(project_id,device_id) REFERENCES devices(project_id,id),
    CONSTRAINT fk_config_build FOREIGN KEY(project_id,default_build_id) REFERENCES builds(project_id,id)
) ENGINE=InnoDB;

CREATE TABLE run_items (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    cycle_id BIGINT NOT NULL,
    configuration_id BIGINT NOT NULL,
    test_case_id BIGINT NOT NULL,
    revision_id BIGINT NOT NULL,
    assignee_membership_id BIGINT NOT NULL,
    latest_attempt_id BIGINT,
    lock_version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT uq_run_scope UNIQUE(project_id,cycle_id,configuration_id,test_case_id),
    CONSTRAINT uq_run_project_id UNIQUE(project_id,id),
    CONSTRAINT fk_run_config FOREIGN KEY(project_id,cycle_id,configuration_id) REFERENCES cycle_configurations(project_id,cycle_id,id),
    CONSTRAINT fk_run_revision FOREIGN KEY(project_id,test_case_id,revision_id) REFERENCES test_case_revisions(project_id,test_case_id,id),
    CONSTRAINT fk_run_assignee FOREIGN KEY(project_id,assignee_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_run_version CHECK(lock_version>=0),
    INDEX ix_run_assignee(project_id,cycle_id,assignee_membership_id,id)
) ENGINE=InnoDB;

CREATE TABLE run_item_assignments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    run_item_id BIGINT NOT NULL,
    previous_membership_id BIGINT,
    assignee_membership_id BIGINT NOT NULL,
    assigned_by BIGINT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    assigned_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_assignment_run FOREIGN KEY(project_id,run_item_id) REFERENCES run_items(project_id,id),
    CONSTRAINT fk_assignment_previous FOREIGN KEY(project_id,previous_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT fk_assignment_target FOREIGN KEY(project_id,assignee_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT fk_assignment_actor FOREIGN KEY(project_id,assigned_by) REFERENCES project_memberships(project_id,id),
    INDEX ix_assignment_history(project_id,run_item_id,id)
) ENGINE=InnoDB;

CREATE TABLE execution_attempts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    run_item_id BIGINT NOT NULL,
    attempt_no INT NOT NULL,
    result_code VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    build_id BIGINT NOT NULL,
    executor_membership_id BIGINT NOT NULL,
    executed_at DATETIME(6) NOT NULL,
    actual_result TEXT NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    evidence_reference VARCHAR(1000) NOT NULL,
    context_snapshot JSON NOT NULL,
    request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    CONSTRAINT uq_attempt_no UNIQUE(project_id,run_item_id,attempt_no),
    CONSTRAINT uq_attempt_run_id UNIQUE(project_id,run_item_id,id),
    CONSTRAINT uq_attempt_request UNIQUE(project_id,request_key),
    CONSTRAINT fk_attempt_run FOREIGN KEY(project_id,run_item_id) REFERENCES run_items(project_id,id),
    CONSTRAINT fk_attempt_result FOREIGN KEY(result_code) REFERENCES execution_results(code),
    CONSTRAINT fk_attempt_build FOREIGN KEY(project_id,build_id) REFERENCES builds(project_id,id),
    CONSTRAINT fk_attempt_executor FOREIGN KEY(project_id,executor_membership_id) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_attempt_no CHECK(attempt_no>0),
    CONSTRAINT ck_attempt_actual CHECK(result_code<>'NG' OR CHAR_LENGTH(TRIM(actual_result))>0),
    CONSTRAINT ck_attempt_reason CHECK(result_code<>'P' OR CHAR_LENGTH(TRIM(reason))>0),
    INDEX ix_attempt_pending_bug(project_id,result_code,id),
    INDEX ix_attempt_history(project_id,run_item_id,executed_at,id)
) ENGINE=InnoDB;

ALTER TABLE run_items ADD CONSTRAINT fk_run_latest_attempt
    FOREIGN KEY(project_id,id,latest_attempt_id) REFERENCES execution_attempts(project_id,run_item_id,id);
