-- Global ADMIN may import without becoming a project member. Keep historical
-- membership attribution; new revisions can also identify the actual account.
ALTER TABLE test_case_revisions
    MODIFY created_by BIGINT NULL,
    ADD COLUMN created_by_user_id VARCHAR(36) NULL,
    ADD CONSTRAINT fk_tcr_identity_author FOREIGN KEY (created_by_user_id) REFERENCES identity_users(id),
    ADD CONSTRAINT ck_tcr_author CHECK (created_by IS NOT NULL OR created_by_user_id IS NOT NULL);
