-- Additive execution metadata. Preserve imported notes and all old results/audit rows.
CREATE TABLE feature_test_versions (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 project_id BIGINT NOT NULL, feature_id BIGINT NOT NULL,
 name VARCHAR(255) NOT NULL, created_by VARCHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_test_version_scope(project_id,feature_id,id),
 UNIQUE KEY uq_test_version_name(project_id,feature_id,name),
 FOREIGN KEY(project_id,feature_id) REFERENCES testing_features(project_id,id),
 FOREIGN KEY(created_by) REFERENCES identity_users(id),
 CHECK(CHAR_LENGTH(TRIM(name))>0)
) ENGINE=InnoDB;
CREATE TABLE test_document_result_executions (
 project_id BIGINT NOT NULL, feature_id BIGINT NOT NULL, document_id BIGINT NOT NULL, row_id BIGINT NOT NULL,
 result_version BIGINT NOT NULL, test_version_id BIGINT NOT NULL, executed_on DATE NOT NULL, audit_id BIGINT NOT NULL,
 PRIMARY KEY(project_id,row_id,result_version), UNIQUE KEY uq_result_execution_audit(audit_id),
 FOREIGN KEY(project_id,feature_id,document_id) REFERENCES import_batches(project_id,feature_id,id),
 FOREIGN KEY(project_id,document_id,row_id) REFERENCES import_rows(project_id,batch_id,id),
 FOREIGN KEY(project_id,feature_id,test_version_id) REFERENCES feature_test_versions(project_id,feature_id,id),
 FOREIGN KEY(audit_id) REFERENCES project_audit(id), CHECK(result_version>0)
) ENGINE=InnoDB;
