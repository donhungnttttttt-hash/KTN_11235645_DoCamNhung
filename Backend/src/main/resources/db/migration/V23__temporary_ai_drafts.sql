-- Temporary generated content only. Never changes assignments, results or tickets.
CREATE TABLE ai_generated_drafts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    purpose VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    source_reference VARCHAR(160) NOT NULL,
    prompt_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    state VARCHAR(16) NOT NULL DEFAULT 'GENERATING',
    model VARCHAR(100) NOT NULL,
    response_id VARCHAR(100),
    content_json JSON,
    edited_text TEXT,
    lock_version BIGINT NOT NULL DEFAULT 0,
    failure_code VARCHAR(64),
    input_tokens INT,
    output_tokens INT,
    created_at DATETIME(6) NOT NULL,
    completed_at DATETIME(6),
    expires_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_ai_draft_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_ai_draft_author FOREIGN KEY (created_by) REFERENCES identity_users(id),
    UNIQUE KEY uq_ai_draft_request (project_id,created_by,request_key),
    INDEX ix_ai_draft_project_time (project_id,created_at,id),
    INDEX ix_ai_draft_expiry (expires_at,id),
    CONSTRAINT ck_ai_draft_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_ai_draft_edit CHECK (lock_version>=0 AND (edited_text IS NULL OR (state='READY' AND CHAR_LENGTH(edited_text)<=12000))),
    CONSTRAINT ck_ai_draft_state CHECK (
        (state='GENERATING' AND content_json IS NULL AND response_id IS NULL AND failure_code IS NULL
            AND completed_at IS NULL AND input_tokens IS NULL AND output_tokens IS NULL)
        OR (state='READY' AND content_json IS NOT NULL AND JSON_TYPE(content_json)='OBJECT'
            AND response_id IS NOT NULL AND failure_code IS NULL AND completed_at IS NOT NULL
            AND input_tokens IS NOT NULL AND input_tokens>=0 AND output_tokens IS NOT NULL AND output_tokens>=0)
        OR (state='FAILED' AND content_json IS NULL AND response_id IS NULL AND failure_code IS NOT NULL
            AND completed_at IS NOT NULL AND input_tokens IS NULL AND output_tokens IS NULL)
    )
) ENGINE=InnoDB;
