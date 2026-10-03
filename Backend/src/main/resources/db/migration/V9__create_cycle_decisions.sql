-- S08: append-only scope/closure decisions; existing attempts and retest evidence are preserved.
INSERT INTO cycle_statuses VALUES ('CLOSED','Đã chốt');
ALTER TABLE test_cycles DROP CHECK ck_cycle_activation;
ALTER TABLE test_cycles ADD CONSTRAINT ck_cycle_activation CHECK (
    (status_code='DRAFT' AND activated_at IS NULL AND activated_by IS NULL)
    OR (status_code IN ('ACTIVE','CLOSED') AND activated_at IS NOT NULL AND activated_by IS NOT NULL)
);

CREATE TABLE run_scope_decisions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    run_item_id BIGINT NOT NULL,
    excluded BOOLEAN NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    decided_by BIGINT NOT NULL,
    decided_at DATETIME(6) NOT NULL,
    CONSTRAINT uq_scope_decision_run UNIQUE(project_id,run_item_id,id),
    CONSTRAINT fk_scope_decision_run FOREIGN KEY(project_id,run_item_id) REFERENCES run_items(project_id,id),
    CONSTRAINT fk_scope_decision_actor FOREIGN KEY(project_id,decided_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_scope_decision_reason CHECK(CHAR_LENGTH(TRIM(reason))>0),
    CONSTRAINT ck_scope_decision_excluded CHECK(excluded IN (0,1))
) ENGINE=InnoDB;
ALTER TABLE run_items ADD COLUMN scope_decision_id BIGINT NULL,
    ADD CONSTRAINT fk_run_scope_decision FOREIGN KEY(project_id,id,scope_decision_id) REFERENCES run_scope_decisions(project_id,run_item_id,id);

CREATE TABLE cycle_decisions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    cycle_id BIGINT NOT NULL,
    action VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    outstanding_reason VARCHAR(2000) NOT NULL,
    scope_snapshot JSON NOT NULL,
    decided_by BIGINT NOT NULL,
    decided_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_cycle_decision_cycle FOREIGN KEY(project_id,cycle_id) REFERENCES test_cycles(project_id,id),
    CONSTRAINT fk_cycle_decision_actor FOREIGN KEY(project_id,decided_by) REFERENCES project_memberships(project_id,id),
    CONSTRAINT ck_cycle_decision_action CHECK(action IN ('CLOSE','REOPEN')),
    CONSTRAINT ck_cycle_decision_reason CHECK(CHAR_LENGTH(TRIM(reason))>0),
    INDEX ix_cycle_decision_history(project_id,cycle_id,id)
) ENGINE=InnoDB;
CREATE INDEX ix_attempt_build_run ON execution_attempts(project_id,build_id,run_item_id,attempt_no);
