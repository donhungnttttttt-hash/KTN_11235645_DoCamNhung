-- Admin archive/reopen keeps the project and all child history in place.
-- Separate durable decisions preserve the reason and fence network retries.
CREATE TABLE project_lifecycle_decisions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    action VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    reason VARCHAR(2000) NOT NULL,
    expected_version BIGINT NOT NULL,
    result_version BIGINT NOT NULL,
    request_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    decided_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_project_lifecycle_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_project_lifecycle_actor FOREIGN KEY (actor_id) REFERENCES identity_users(id),
    CONSTRAINT uq_project_lifecycle_request UNIQUE(project_id, request_key),
    CONSTRAINT uq_project_lifecycle_version UNIQUE(project_id, result_version),
    CONSTRAINT ck_project_lifecycle_action CHECK(action IN ('ARCHIVE','REOPEN')),
    CONSTRAINT ck_project_lifecycle_reason CHECK(CHAR_LENGTH(TRIM(reason)) > 0),
    CONSTRAINT ck_project_lifecycle_version CHECK(expected_version >= 0 AND result_version = expected_version + 1),
    INDEX ix_project_lifecycle_history(project_id,id)
) ENGINE=InnoDB;
