-- Committed imports are durable, project-scoped test document manifests.
-- mapping_version distinguishes legacy/internal and CUSTOMER_V1 formats.
-- No case/history rewrite; legacy imports can still be reconstructed for export.
ALTER TABLE import_batches
    ADD COLUMN sheet_name VARCHAR(255) NULL,
    ADD COLUMN source_workbook MEDIUMBLOB NULL,
    ADD INDEX ix_ib_documents (project_id, status, id),
    ADD INDEX ix_ib_document_checksum (project_id, file_checksum, status);
