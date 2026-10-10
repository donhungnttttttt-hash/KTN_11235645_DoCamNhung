ALTER TABLE builds ADD COLUMN archived_at DATETIME(6) NULL;

CREATE TABLE project_audit (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(32) NOT NULL,
    occurred_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_project_audit_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_project_audit_actor FOREIGN KEY (actor_id) REFERENCES identity_users(id),
    INDEX ix_project_audit_history (project_id, entity_type, entity_id, id)
) ENGINE=InnoDB;

CREATE INDEX ix_import_dedup ON import_batches (project_id, file_checksum, imported_by);
