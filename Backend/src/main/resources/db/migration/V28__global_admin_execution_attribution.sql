-- An administrator can execute with a project's allocated asset or operate an
-- existing session. Keep the actual executor distinct from the asset recipient
-- and session starter, while retaining every project/asset/session relationship.
ALTER TABLE device_allocations
    ADD CONSTRAINT uq_allocation_project_asset UNIQUE(project_id,id,asset_id);

ALTER TABLE file_work_sessions
    DROP FOREIGN KEY fk_fw_session_allocation,
    ADD CONSTRAINT fk_fw_session_asset_allocation FOREIGN KEY(project_id,allocation_id,asset_id)
        REFERENCES device_allocations(project_id,id,asset_id),
    ADD CONSTRAINT fk_fw_session_executor FOREIGN KEY(project_id,executor_membership_id)
        REFERENCES project_memberships(project_id,id);

ALTER TABLE execution_attempts
    DROP FOREIGN KEY fk_attempt_file_session,
    ADD CONSTRAINT fk_attempt_file_session_project FOREIGN KEY(project_id,file_work_session_id)
        REFERENCES file_work_sessions(project_id,id);
