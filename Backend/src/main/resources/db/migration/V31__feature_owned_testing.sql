-- FR02/03 additive schema. Existing graph and workbook bytes remain untouched.
CREATE TABLE testing_features (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL,
 name VARCHAR(255) NOT NULL, environment VARCHAR(1000) NOT NULL DEFAULT '', description VARCHAR(4000) NOT NULL DEFAULT '',
 archived_at DATETIME(6), lock_version BIGINT NOT NULL DEFAULT 0,
 migration_key VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin, source_cycle_id BIGINT,
 created_by VARCHAR(36) NOT NULL, updated_by VARCHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_feature_scope(project_id,id), UNIQUE KEY uq_feature_migration(project_id,migration_key),
 FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(project_id,source_cycle_id) REFERENCES test_cycles(project_id,id),
 FOREIGN KEY(created_by) REFERENCES identity_users(id), FOREIGN KEY(updated_by) REFERENCES identity_users(id),
 CHECK(CHAR_LENGTH(TRIM(name))>0 AND lock_version>=0), INDEX ix_feature_list(project_id,archived_at,id)
) ENGINE=InnoDB;
ALTER TABLE import_batches ADD feature_id BIGINT NULL, ADD archived_at DATETIME(6), ADD lock_version BIGINT NOT NULL DEFAULT 0, ADD source_batch_id BIGINT,
 ADD CONSTRAINT uq_document_feature UNIQUE(project_id,feature_id,id), ADD CONSTRAINT uq_document_clone UNIQUE(feature_id,source_batch_id),
 ADD CONSTRAINT fk_document_feature FOREIGN KEY(project_id,feature_id) REFERENCES testing_features(project_id,id),
 ADD CONSTRAINT fk_document_source FOREIGN KEY(project_id,source_batch_id) REFERENCES import_batches(project_id,id),
 ADD INDEX ix_feature_documents(project_id,feature_id,status,archived_at,id);
ALTER TABLE test_cases ADD owning_document_id BIGINT,
 ADD CONSTRAINT uq_case_document UNIQUE(project_id,owning_document_id,id),
 ADD CONSTRAINT fk_case_document FOREIGN KEY(project_id,owning_document_id) REFERENCES import_batches(project_id,id);
ALTER TABLE import_rows ADD owning_document_id BIGINT, ADD source_import_row_id BIGINT,
 ADD CONSTRAINT ck_row_owner CHECK(owning_document_id IS NULL OR owning_document_id=batch_id),
 ADD CONSTRAINT uq_row_clone UNIQUE(batch_id,source_import_row_id), ADD CONSTRAINT uq_row_document_scope UNIQUE(project_id,batch_id,id),
 ADD CONSTRAINT fk_row_owned_case FOREIGN KEY(project_id,owning_document_id,target_case_id) REFERENCES test_cases(project_id,owning_document_id,id);
CREATE TABLE test_document_assignments (
 project_id BIGINT NOT NULL, document_id BIGINT NOT NULL, row_id BIGINT NOT NULL,
 assignee_membership_id BIGINT, first_tester_membership_id BIGINT, latest_tester_membership_id BIGINT,
 PRIMARY KEY(project_id,row_id),
 FOREIGN KEY(project_id,document_id,row_id) REFERENCES import_rows(project_id,batch_id,id),
 FOREIGN KEY(project_id,assignee_membership_id) REFERENCES project_memberships(project_id,id),
 FOREIGN KEY(project_id,first_tester_membership_id) REFERENCES project_memberships(project_id,id),
 FOREIGN KEY(project_id,latest_tester_membership_id) REFERENCES project_memberships(project_id,id),
 INDEX ix_document_owner(project_id,document_id,assignee_membership_id,row_id)
) ENGINE=InnoDB;
CREATE TABLE test_document_assignment_changes (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL, document_id BIGINT NOT NULL, row_id BIGINT NOT NULL,
 previous_membership_id BIGINT, new_membership_id BIGINT, actor_id VARCHAR(36) NOT NULL,
 changed_at DATETIME(6) NOT NULL, document_version BIGINT NOT NULL, request_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 FOREIGN KEY(project_id,document_id,row_id) REFERENCES import_rows(project_id,batch_id,id),
 FOREIGN KEY(project_id,previous_membership_id) REFERENCES project_memberships(project_id,id),
 FOREIGN KEY(project_id,new_membership_id) REFERENCES project_memberships(project_id,id), FOREIGN KEY(actor_id) REFERENCES identity_users(id),
 INDEX ix_assignment_changes(project_id,document_id,id)
) ENGINE=InnoDB;
CREATE TABLE testing_commands (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL, feature_id BIGINT NOT NULL, document_id BIGINT,
 actor_id VARCHAR(36) NOT NULL, request_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, action VARCHAR(32) NOT NULL,
 response_json JSON NOT NULL, created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_testing_command(project_id,request_key), FOREIGN KEY(project_id,feature_id) REFERENCES testing_features(project_id,id),
 FOREIGN KEY(project_id,feature_id,document_id) REFERENCES import_batches(project_id,feature_id,id), FOREIGN KEY(actor_id) REFERENCES identity_users(id)
) ENGINE=InnoDB;
CREATE TABLE testing_migration_case_map (
 project_id BIGINT NOT NULL, feature_id BIGINT NOT NULL, document_id BIGINT NOT NULL,
 old_case_id BIGINT NOT NULL, old_revision_id BIGINT NOT NULL, new_case_id BIGINT NOT NULL, new_revision_id BIGINT NOT NULL,
 PRIMARY KEY(project_id,document_id,old_case_id), FOREIGN KEY(project_id,feature_id,document_id) REFERENCES import_batches(project_id,feature_id,id),
 FOREIGN KEY(project_id,new_case_id,new_revision_id) REFERENCES test_case_revisions(project_id,test_case_id,id)
) ENGINE=InnoDB;
CREATE TABLE testing_migration_exceptions (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL, source_batch_id BIGINT, code VARCHAR(64) NOT NULL,
 details VARCHAR(1000) NOT NULL, created_at DATETIME(6) NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

-- Shared FR04 schema: old rows retain their values, new issues need no legacy execution context.
ALTER TABLE work_items MODIFY created_by BIGINT NULL, MODIFY updated_by BIGINT NULL;
ALTER TABLE bug_details MODIFY build_id BIGINT NULL, MODIFY environment_id BIGINT NULL, MODIFY device_id BIGINT NULL;
CREATE TABLE work_item_feature_context (
 project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL, feature_id BIGINT NOT NULL, document_id BIGINT, row_id BIGINT,
 monkey BOOLEAN NOT NULL DEFAULT FALSE, deleted_at DATETIME(6), created_by_user_id VARCHAR(36) NOT NULL,
 PRIMARY KEY(project_id,work_item_id), FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id),
 FOREIGN KEY(project_id,feature_id) REFERENCES testing_features(project_id,id),
 FOREIGN KEY(project_id,feature_id,document_id) REFERENCES import_batches(project_id,feature_id,id),
 FOREIGN KEY(project_id,document_id,row_id) REFERENCES import_rows(project_id,batch_id,id),
 FOREIGN KEY(created_by_user_id) REFERENCES identity_users(id), CHECK(row_id IS NULL OR document_id IS NOT NULL),
 INDEX ix_feature_issues(project_id,feature_id,deleted_at,work_item_id), INDEX ix_case_issues(project_id,row_id,deleted_at,work_item_id)
) ENGINE=InnoDB;
CREATE TABLE work_item_feature_history (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL,
 event_type VARCHAR(64) NOT NULL, before_json JSON, after_json JSON, actor_user_id VARCHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL,
 FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id), FOREIGN KEY(actor_user_id) REFERENCES identity_users(id),
 INDEX ix_feature_issue_history(project_id,work_item_id,id)
) ENGINE=InnoDB;
CREATE TABLE project_management_reports (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL, feature_id BIGINT, title VARCHAR(255) NOT NULL,
 markdown MEDIUMTEXT NOT NULL, lock_version BIGINT NOT NULL DEFAULT 0,
 created_by_user_id VARCHAR(36) NOT NULL, updated_by_user_id VARCHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(project_id,feature_id) REFERENCES testing_features(project_id,id),
 FOREIGN KEY(created_by_user_id) REFERENCES identity_users(id), FOREIGN KEY(updated_by_user_id) REFERENCES identity_users(id),
 INDEX ix_management_reports(project_id,updated_at,id)
) ENGINE=InnoDB;
CREATE TABLE project_notes (
 id BIGINT NOT NULL AUTO_INCREMENT, project_id BIGINT NOT NULL, title VARCHAR(200) NOT NULL, body TEXT NOT NULL,
 lock_version BIGINT NOT NULL DEFAULT 0, created_by VARCHAR(36) NOT NULL, updated_by VARCHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL, archived_at DATETIME(6), PRIMARY KEY(id),
 CONSTRAINT fk_project_notes_project FOREIGN KEY(project_id) REFERENCES projects(id),
 CONSTRAINT fk_project_notes_creator FOREIGN KEY(created_by) REFERENCES identity_users(id),
 CONSTRAINT fk_project_notes_editor FOREIGN KEY(updated_by) REFERENCES identity_users(id),
 INDEX ix_project_notes_list(project_id,archived_at,updated_at,id)
) ENGINE=InnoDB;
