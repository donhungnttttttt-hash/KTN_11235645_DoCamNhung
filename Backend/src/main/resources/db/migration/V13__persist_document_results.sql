-- Workbook results are annotations on the committed document, not execution attempts.
-- Keep raw_data_json and source_workbook immutable for original downloads.
ALTER TABLE import_rows
    ADD COLUMN result_status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'UNEXECUTED',
    ADD COLUMN result_version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN result_updated_at DATETIME(6) NULL,
    ADD COLUMN result_updated_by VARCHAR(36) NULL,
    ADD COLUMN result_request_key VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD CONSTRAINT ck_ir_result_status CHECK (result_status IN ('UNEXECUTED','OK','P','NG','FIXED','NA')),
    ADD CONSTRAINT ck_ir_result_version CHECK (result_version >= 0),
    ADD CONSTRAINT fk_ir_result_actor FOREIGN KEY (result_updated_by) REFERENCES identity_users(id);
-- Reuse project_audit's project/entity/id index for the result change history.
