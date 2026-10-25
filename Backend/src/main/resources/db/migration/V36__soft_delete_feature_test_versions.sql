-- Hide deleted versions from future selection without changing execution history.
ALTER TABLE feature_test_versions
 ADD COLUMN deleted_at DATETIME(6) NULL,
 ADD COLUMN deleted_by VARCHAR(36) NULL,
 ADD CONSTRAINT fk_test_version_deleted_by FOREIGN KEY(deleted_by) REFERENCES identity_users(id),
 ADD COLUMN active_name VARCHAR(255) GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN name ELSE NULL END) STORED,
 DROP INDEX uq_test_version_name,
 ADD UNIQUE KEY uq_test_version_active_name(project_id,feature_id,active_name);
