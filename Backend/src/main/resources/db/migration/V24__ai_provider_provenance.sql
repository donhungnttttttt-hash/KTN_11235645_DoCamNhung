-- Provider selection is part of the draft request identity. Credentials stay outside MySQL.
ALTER TABLE ai_generated_drafts
    ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'OPENAI_API',
    ADD COLUMN connection_id VARCHAR(36) NULL,
    ADD COLUMN connection_version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN requested_model VARCHAR(100) NULL,
    ADD CONSTRAINT chk_ai_draft_provider CHECK (provider IN ('OPENAI_API','CHATGPT','OLLAMA'));

-- Existing model may be a resolved snapshot rather than the requested alias.
-- NULL preserves legacy retries with omitted model; new requests always record the alias.
