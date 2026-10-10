-- Review S03/S10: optimistic concurrency without changing historical migrations.
ALTER TABLE project_memberships ADD COLUMN lock_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE environments ADD COLUMN lock_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE builds ADD COLUMN lock_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE devices ADD COLUMN lock_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN lock_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE milestones ADD COLUMN lock_version BIGINT NOT NULL DEFAULT 0;

-- Each bug retains the additional internal rule version used at creation.
ALTER TABLE rule_versions ADD CONSTRAINT uq_rule_version_project_id UNIQUE (project_id,id);
ALTER TABLE bug_details ADD COLUMN rule_version_id BIGINT;
ALTER TABLE bug_details ADD CONSTRAINT fk_bug_rule_version
    FOREIGN KEY (project_id,rule_version_id) REFERENCES rule_versions(project_id,id);
