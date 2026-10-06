-- Physical inventory is independent of logical test configurations.
ALTER TABLE project_audit MODIFY project_id BIGINT NULL;
CREATE TABLE device_assets (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 asset_code VARCHAR(64) NOT NULL UNIQUE,
 type VARCHAR(16) NOT NULL,
 model VARCHAR(100) NOT NULL,
 serial VARCHAR(100) NULL UNIQUE,
 os_name VARCHAR(50), os_version VARCHAR(50),
 condition_code VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE',
 notes VARCHAR(1000), lock_version BIGINT NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL, created_by VARCHAR(36) NOT NULL,
 updated_at DATETIME(6) NOT NULL, updated_by VARCHAR(36) NOT NULL,
 CONSTRAINT ck_asset_type CHECK (type IN ('IPAD','IPHONE','ANDROID','OTHER')),
 CONSTRAINT ck_asset_condition CHECK (condition_code IN ('AVAILABLE','MAINTENANCE','RETIRED')),
 FOREIGN KEY (created_by) REFERENCES identity_users(id),
 FOREIGN KEY (updated_by) REFERENCES identity_users(id)
) ENGINE=InnoDB;
CREATE TABLE device_allocations (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 asset_id BIGINT NOT NULL, project_id BIGINT NOT NULL,
 recipient_membership_id BIGINT NOT NULL,
 assigned_at DATETIME(6) NOT NULL, assigned_by VARCHAR(36) NOT NULL,
 expected_return_on DATE, handover_note VARCHAR(1000),
 returned_at DATETIME(6), returned_by VARCHAR(36),
 returned_condition VARCHAR(16), return_note VARCHAR(1000),
 lock_version BIGINT NOT NULL DEFAULT 0,
 active_asset_id BIGINT GENERATED ALWAYS AS (CASE WHEN returned_at IS NULL THEN asset_id ELSE NULL END) STORED,
 UNIQUE KEY uq_allocation_active_asset (active_asset_id),
 INDEX ix_allocation_project (project_id,returned_at,id),
 CONSTRAINT ck_allocation_return CHECK ((returned_at IS NULL AND returned_by IS NULL AND returned_condition IS NULL) OR (returned_at IS NOT NULL AND returned_by IS NOT NULL AND returned_condition IS NOT NULL)),
 CONSTRAINT ck_return_condition CHECK (returned_condition IN ('AVAILABLE','MAINTENANCE','RETIRED')),
 FOREIGN KEY (asset_id) REFERENCES device_assets(id),
 FOREIGN KEY (project_id) REFERENCES projects(id),
 FOREIGN KEY (project_id,recipient_membership_id) REFERENCES project_memberships(project_id,id),
 FOREIGN KEY (assigned_by) REFERENCES identity_users(id),
 FOREIGN KEY (returned_by) REFERENCES identity_users(id)
) ENGINE=InnoDB;
