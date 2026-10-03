-- Sprint 03: Dự án, danh mục, quy tắc và sổ tay
-- Tất cả bảng nghiệp vụ mang project_id; API và repository luôn kiểm tra membership.
-- Composite unique (project_id, id) cho phép FK ghép ngăn liên kết nhầm giữa hai dự án.

-- ===== S03-T01: Projects & Memberships =====

CREATE TABLE projects (
    id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    archived_at DATETIME(6),
    lock_version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    updated_by VARCHAR(36) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_projects_code UNIQUE (code),
    CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES identity_users(id),
    CONSTRAINT fk_projects_updated_by FOREIGN KEY (updated_by) REFERENCES identity_users(id)
) ENGINE=InnoDB;

CREATE TABLE project_memberships (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    project_role VARCHAR(16) NOT NULL DEFAULT 'MEMBER',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_membership_project_user UNIQUE (project_id, user_id),
    CONSTRAINT uq_membership_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_membership_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES identity_users(id),
    INDEX ix_membership_user (user_id, active, project_id)
) ENGINE=InnoDB;

CREATE TABLE project_counters (
    project_id BIGINT NOT NULL,
    counter_code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    next_value BIGINT NOT NULL DEFAULT 1,
    PRIMARY KEY (project_id, counter_code),
    CONSTRAINT fk_counter_project FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

-- ===== S03-T01: Catalog tables =====

CREATE TABLE environments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_env_project_code UNIQUE (project_id, code),
    CONSTRAINT uq_env_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_env_project FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE builds (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    version_label VARCHAR(50) NOT NULL,
    build_number VARCHAR(50),
    platform VARCHAR(32) NOT NULL,
    notes VARCHAR(500),
    released_at DATE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_build_project_ver UNIQUE (project_id, platform, version_label, build_number),
    CONSTRAINT uq_build_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_build_project FOREIGN KEY (project_id) REFERENCES projects(id),
    INDEX ix_build_released (project_id, released_at, id)
) ENGINE=InnoDB;

CREATE TABLE devices (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    os_name VARCHAR(50),
    os_version VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_device_project_code UNIQUE (project_id, code),
    CONSTRAINT uq_device_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_device_project FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE categories (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_cat_project_code UNIQUE (project_id, code),
    CONSTRAINT uq_cat_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_cat_project FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE milestones (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    starts_on DATE,
    due_on DATE,
    archived_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_ms_project_code UNIQUE (project_id, code),
    CONSTRAINT uq_ms_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_ms_project FOREIGN KEY (project_id) REFERENCES projects(id),
    INDEX ix_ms_due (project_id, due_on, id)
) ENGINE=InnoDB;

-- ===== S03-T02: Rulesets =====

CREATE TABLE rulesets (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    active_version_id BIGINT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_ruleset_project_code UNIQUE (project_id, code),
    CONSTRAINT uq_ruleset_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_ruleset_project FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB;

CREATE TABLE rule_versions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    ruleset_id BIGINT NOT NULL,
    version_no INT NOT NULL,
    content_json JSON NOT NULL,
    published_at DATETIME(6),
    published_by BIGINT,
    created_at DATETIME(6) NOT NULL,
    created_by BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_rv_ruleset_no UNIQUE (project_id, ruleset_id, version_no),
    CONSTRAINT uq_rv_ruleset_id UNIQUE (project_id, ruleset_id, id),
    CONSTRAINT fk_rv_ruleset FOREIGN KEY (project_id, ruleset_id)
        REFERENCES rulesets(project_id, id),
    CONSTRAINT fk_rv_published_by FOREIGN KEY (project_id, published_by)
        REFERENCES project_memberships(project_id, id),
    CONSTRAINT fk_rv_created_by FOREIGN KEY (project_id, created_by)
        REFERENCES project_memberships(project_id, id)
) ENGINE=InnoDB;

-- Circular FK: rulesets.active_version_id → rule_versions ensuring version belongs to same ruleset
ALTER TABLE rulesets ADD CONSTRAINT fk_ruleset_active_version
    FOREIGN KEY (project_id, id, active_version_id)
    REFERENCES rule_versions(project_id, ruleset_id, id);

-- ===== S03-T03: Handbook / Project resources =====

CREATE TABLE project_resources (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    code VARCHAR(32) NOT NULL,
    resource_type VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    current_revision_id BIGINT,
    archived_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_res_project_code UNIQUE (project_id, code),
    CONSTRAINT uq_res_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_res_project FOREIGN KEY (project_id) REFERENCES projects(id),
    INDEX ix_res_type (project_id, resource_type, updated_at, id)
) ENGINE=InnoDB;

CREATE TABLE resource_revisions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    resource_id BIGINT NOT NULL,
    revision_no INT NOT NULL,
    content_html TEXT NOT NULL,
    visibility VARCHAR(16) NOT NULL DEFAULT 'INTERNAL',
    edited_by BIGINT NOT NULL,
    published_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_rr_resource_no UNIQUE (project_id, resource_id, revision_no),
    CONSTRAINT uq_rr_resource_id UNIQUE (project_id, resource_id, id),
    CONSTRAINT fk_rr_resource FOREIGN KEY (project_id, resource_id)
        REFERENCES project_resources(project_id, id),
    CONSTRAINT fk_rr_edited_by FOREIGN KEY (project_id, edited_by)
        REFERENCES project_memberships(project_id, id)
) ENGINE=InnoDB;

-- Circular FK: project_resources.current_revision_id → resource_revisions
ALTER TABLE project_resources ADD CONSTRAINT fk_res_current_revision
    FOREIGN KEY (project_id, id, current_revision_id)
    REFERENCES resource_revisions(project_id, resource_id, id);

-- ===== Extend identity_audit with optional project scope =====
ALTER TABLE identity_audit ADD COLUMN project_id BIGINT;
ALTER TABLE identity_audit ADD CONSTRAINT fk_audit_project
    FOREIGN KEY (project_id) REFERENCES projects(id);

