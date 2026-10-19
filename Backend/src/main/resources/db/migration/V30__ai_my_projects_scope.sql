-- Preserve General/Project conversations; allow server-bound multi-project scope.
ALTER TABLE ai_chat_threads
    DROP CHECK ck_ai_chat_scope,
    ADD CONSTRAINT ck_ai_chat_scope CHECK (
        (project_id IS NULL AND purpose IS NULL AND target_id IS NULL AND source_reference IS NULL)
        OR (project_id IS NOT NULL AND purpose IS NOT NULL AND purpose<>'MY_PROJECTS' AND source_reference IS NOT NULL)
        OR (project_id IS NULL AND purpose='MY_PROJECTS' AND target_id IS NULL
            AND source_reference IS NOT NULL AND REGEXP_LIKE(source_reference,'^portfolio-v1:[0-9a-f]{64}$','c'))
    );
