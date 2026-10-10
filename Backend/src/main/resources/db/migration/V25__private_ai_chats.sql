-- Private, temporary conversation state. No credentials and no business writes.
CREATE TABLE ai_chat_threads (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_by VARCHAR(36) NOT NULL,
    project_id BIGINT,
    purpose VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin,
    target_id BIGINT,
    source_reference VARCHAR(160),
    provider VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    model VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    created_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    UNIQUE KEY uq_ai_chat_owner (id,created_by),
    INDEX ix_ai_chat_owner_time (created_by,id),
    INDEX ix_ai_chat_expiry (expires_at,id),
    CONSTRAINT fk_ai_chat_owner FOREIGN KEY (created_by) REFERENCES identity_users(id),
    CONSTRAINT fk_ai_chat_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT ck_ai_chat_scope CHECK ((project_id IS NULL AND purpose IS NULL AND target_id IS NULL AND source_reference IS NULL)
        OR (project_id IS NOT NULL AND purpose IS NOT NULL AND source_reference IS NOT NULL)),
    CONSTRAINT ck_ai_chat_provider CHECK (provider IN ('OPENAI_API','CHATGPT','OLLAMA')),
    CONSTRAINT ck_ai_chat_expiry CHECK (expires_at>created_at)
) ENGINE=InnoDB;

CREATE TABLE ai_chat_turns (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    thread_id BIGINT NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_text TEXT NOT NULL,
    state VARCHAR(16) NOT NULL DEFAULT 'GENERATING',
    content_json JSON,
    sources_json JSON NOT NULL,
    context_truncated BOOLEAN NOT NULL,
    failure_code VARCHAR(64),
    provider VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    requested_model VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    connection_id VARCHAR(36),
    connection_version BIGINT NOT NULL DEFAULT 0,
    response_id VARCHAR(100),
    input_tokens INT,
    output_tokens INT,
    created_at DATETIME(6) NOT NULL,
    completed_at DATETIME(6),
    expires_at DATETIME(6) NOT NULL,
    UNIQUE KEY uq_ai_chat_request (created_by,request_key),
    INDEX ix_ai_chat_turn_thread (thread_id,id),
    INDEX ix_ai_chat_turn_daily (created_by,created_at),
    INDEX ix_ai_chat_turn_pending (state,created_at),
    CONSTRAINT fk_ai_chat_turn_owner FOREIGN KEY (thread_id,created_by) REFERENCES ai_chat_threads(id,created_by) ON DELETE CASCADE,
    CONSTRAINT ck_ai_chat_text CHECK (CHAR_LENGTH(user_text) BETWEEN 1 AND 2000),
    CONSTRAINT ck_ai_chat_turn_expiry CHECK (expires_at>created_at),
    CONSTRAINT ck_ai_chat_sources CHECK (JSON_TYPE(sources_json)='ARRAY'),
    CONSTRAINT ck_ai_chat_turn_provider CHECK (provider IN ('OPENAI_API','CHATGPT','OLLAMA')),
    CONSTRAINT ck_ai_chat_turn_state CHECK (
        (state='GENERATING' AND content_json IS NULL AND failure_code IS NULL AND completed_at IS NULL AND response_id IS NULL AND model IS NULL AND input_tokens IS NULL AND output_tokens IS NULL)
        OR (state='FAILED' AND content_json IS NULL AND failure_code IS NOT NULL AND completed_at IS NOT NULL AND response_id IS NULL AND model IS NULL AND input_tokens IS NULL AND output_tokens IS NULL)
        OR (state='READY' AND content_json IS NOT NULL AND JSON_TYPE(content_json)='OBJECT' AND failure_code IS NULL
            AND completed_at IS NOT NULL AND response_id IS NOT NULL AND model IS NOT NULL
            AND (input_tokens IS NULL OR input_tokens>=0) AND (output_tokens IS NULL OR output_tokens>=0)))
) ENGINE=InnoDB;

-- Cross-instance admission mutex. Locked only during short reservation transactions.
CREATE TABLE ai_chat_admission (id INT NOT NULL PRIMARY KEY, CONSTRAINT ck_ai_chat_admission CHECK (id=1)) ENGINE=InnoDB;
INSERT INTO ai_chat_admission(id) VALUES(1);
