CREATE TABLE feature_test_environments (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL, feature_id BIGINT NOT NULL,
 name VARCHAR(255) NOT NULL, created_by VARCHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL,
 deleted_by VARCHAR(36) NULL, deleted_at DATETIME(6) NULL,
 active_name VARCHAR(255) GENERATED ALWAYS AS (IF(deleted_at IS NULL,name,NULL)) STORED,
 UNIQUE KEY uq_environment_scope(project_id,feature_id,id),
 UNIQUE KEY uq_environment_active(project_id,feature_id,active_name),
 FOREIGN KEY(project_id,feature_id) REFERENCES testing_features(project_id,id),
 FOREIGN KEY(created_by) REFERENCES identity_users(id), FOREIGN KEY(deleted_by) REFERENCES identity_users(id),
 CHECK(CHAR_LENGTH(TRIM(name))>0)
) ENGINE=InnoDB;
CREATE TABLE test_document_case_contexts (
 project_id BIGINT NOT NULL, feature_id BIGINT NOT NULL, document_id BIGINT NOT NULL, row_id BIGINT NOT NULL,
 test_version_id BIGINT NULL, environment_id BIGINT NULL, context_version BIGINT NOT NULL DEFAULT 0,
 PRIMARY KEY(project_id,row_id),
 FOREIGN KEY(project_id,feature_id,document_id) REFERENCES import_batches(project_id,feature_id,id),
 FOREIGN KEY(project_id,document_id,row_id) REFERENCES import_rows(project_id,batch_id,id),
 FOREIGN KEY(project_id,feature_id,test_version_id) REFERENCES feature_test_versions(project_id,feature_id,id),
 FOREIGN KEY(project_id,feature_id,environment_id) REFERENCES feature_test_environments(project_id,feature_id,id)
) ENGINE=InnoDB;
INSERT INTO test_document_case_contexts(project_id,feature_id,document_id,row_id,test_version_id)
 SELECT e.project_id,e.feature_id,e.document_id,e.row_id,e.test_version_id FROM test_document_result_executions e
 JOIN import_rows r ON r.project_id=e.project_id AND r.id=e.row_id AND r.result_version=e.result_version;
CREATE TABLE test_document_context_changes (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL, row_id BIGINT NOT NULL,
 actor_id VARCHAR(36) NOT NULL, request_key CHAR(36) NOT NULL, payload LONGTEXT NOT NULL,
 response_json LONGTEXT NOT NULL, before_json LONGTEXT NOT NULL, audit_id BIGINT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_context_request(project_id,actor_id,request_key),
 UNIQUE KEY uq_context_audit(audit_id),
 FOREIGN KEY(project_id,row_id) REFERENCES test_document_case_contexts(project_id,row_id),
 FOREIGN KEY(actor_id) REFERENCES identity_users(id), FOREIGN KEY(audit_id) REFERENCES project_audit(id)
) ENGINE=InnoDB;
ALTER TABLE test_document_result_executions MODIFY test_version_id BIGINT NULL,
 ADD environment_id BIGINT NULL,
 ADD FOREIGN KEY(project_id,feature_id,environment_id) REFERENCES feature_test_environments(project_id,feature_id,id);
