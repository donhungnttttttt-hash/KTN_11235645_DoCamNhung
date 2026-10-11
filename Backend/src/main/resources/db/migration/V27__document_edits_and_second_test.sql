ALTER TABLE import_rows ADD CONSTRAINT uq_ir_project_id UNIQUE(project_id,id);
ALTER TABLE import_rows ADD CONSTRAINT uq_ir_project_case UNIQUE(project_id,id,target_case_id);
ALTER TABLE run_items ADD CONSTRAINT uq_run_project_case UNIQUE(project_id,id,test_case_id);

CREATE TABLE test_document_cell_edits (
    project_id BIGINT NOT NULL,
    row_id BIGINT NOT NULL,
    column_index INT NOT NULL,
    cell_value TEXT NOT NULL,
    lock_version BIGINT NOT NULL,
    PRIMARY KEY(project_id,row_id,column_index),
    CONSTRAINT fk_doc_cell_row FOREIGN KEY(project_id,row_id) REFERENCES import_rows(project_id,id),
    CONSTRAINT ck_doc_cell_column CHECK(column_index BETWEEN 0 AND 63),
    CONSTRAINT ck_doc_cell_version CHECK(lock_version>0)
) ENGINE=InnoDB;

CREATE TABLE test_document_cell_changes (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    row_id BIGINT NOT NULL,
    column_index INT NOT NULL,
    before_value TEXT NOT NULL,
    after_value TEXT NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    changed_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_doc_change_row FOREIGN KEY(project_id,row_id) REFERENCES import_rows(project_id,id),
    CONSTRAINT fk_doc_change_actor FOREIGN KEY(actor_id) REFERENCES identity_users(id),
    INDEX ix_doc_changes(project_id,row_id,column_index,id)
) ENGINE=InnoDB;

CREATE TABLE test_document_retests (
    project_id BIGINT NOT NULL,
    row_id BIGINT NOT NULL,
    test_case_id BIGINT NOT NULL,
    run_item_id BIGINT NOT NULL,
    note VARCHAR(2000) NOT NULL DEFAULT '',
    lock_version BIGINT NOT NULL DEFAULT 1,
    PRIMARY KEY(project_id,row_id),
    CONSTRAINT uq_doc_retest_run UNIQUE(project_id,run_item_id),
    CONSTRAINT fk_doc_retest_row FOREIGN KEY(project_id,row_id,test_case_id) REFERENCES import_rows(project_id,id,target_case_id),
    CONSTRAINT fk_doc_retest_run FOREIGN KEY(project_id,run_item_id,test_case_id) REFERENCES run_items(project_id,id,test_case_id),
    CONSTRAINT ck_doc_retest_version CHECK(lock_version>0)
) ENGINE=InnoDB;
