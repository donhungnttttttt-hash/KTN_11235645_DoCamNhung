-- Sprint 04: Bộ test case, phiên bản và nhập Excel
-- Quản lý suite, test case, revision bất biến và staging import theo project_id.

-- ===== Test Suites (Nhóm test case) =====

CREATE TABLE test_suites (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    parent_id BIGINT,
    sort_order INT NOT NULL DEFAULT 0,
    archived_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_ts_project_code UNIQUE (project_id, code),
    CONSTRAINT uq_ts_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_ts_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_ts_parent FOREIGN KEY (project_id, parent_id) REFERENCES test_suites(project_id, id),
    INDEX ix_ts_parent (project_id, parent_id, sort_order, id)
) ENGINE=InnoDB;

-- ===== Test Cases (Danh tính test case) =====

CREATE TABLE test_cases (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    case_no VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    suite_id BIGINT NOT NULL,
    current_revision_id BIGINT,
    archived_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_tc_project_case_no UNIQUE (project_id, case_no),
    CONSTRAINT uq_tc_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_tc_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_tc_suite FOREIGN KEY (project_id, suite_id) REFERENCES test_suites(project_id, id),
    INDEX ix_tc_suite (project_id, suite_id, id)
) ENGINE=InnoDB;

-- ===== Test Case Revisions (Nội dung bất biến theo phiên bản) =====

CREATE TABLE test_case_revisions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    test_case_id BIGINT NOT NULL,
    revision_no INT NOT NULL,
    title_vi VARCHAR(255) NOT NULL,
    preconditions_vi TEXT,
    steps_vi TEXT NOT NULL,
    expected_vi TEXT NOT NULL,
    title_jp VARCHAR(255),
    preconditions_jp TEXT,
    steps_jp TEXT,
    expected_jp TEXT,
    source_reference VARCHAR(255),
    translator_membership_id BIGINT,
    reviewer_membership_id BIGINT,
    approved_at DATETIME(6),
    approved_by BIGINT,
    checksum VARCHAR(64),
    created_at DATETIME(6) NOT NULL,
    created_by BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_tcr_case_revision_no UNIQUE (project_id, test_case_id, revision_no),
    CONSTRAINT uq_tcr_case_id UNIQUE (project_id, test_case_id, id),
    CONSTRAINT fk_tcr_case FOREIGN KEY (project_id, test_case_id) REFERENCES test_cases(project_id, id),
    CONSTRAINT fk_tcr_translator FOREIGN KEY (project_id, translator_membership_id) REFERENCES project_memberships(project_id, id),
    CONSTRAINT fk_tcr_reviewer FOREIGN KEY (project_id, reviewer_membership_id) REFERENCES project_memberships(project_id, id),
    CONSTRAINT fk_tcr_approved_by FOREIGN KEY (project_id, approved_by) REFERENCES project_memberships(project_id, id),
    CONSTRAINT fk_tcr_created_by FOREIGN KEY (project_id, created_by) REFERENCES project_memberships(project_id, id)
) ENGINE=InnoDB;

-- Circular FK: test_cases.current_revision_id -> test_case_revisions
ALTER TABLE test_cases ADD CONSTRAINT fk_tc_current_revision
    FOREIGN KEY (project_id, id, current_revision_id)
    REFERENCES test_case_revisions(project_id, test_case_id, id);

-- ===== Import Batches & Rows (Staging nhập Excel) =====

CREATE TABLE import_batches (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_checksum VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PREVIEW',
    mapping_version VARCHAR(32) NOT NULL DEFAULT '1.0',
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    error_rows INT NOT NULL DEFAULT 0,
    staged_expires_at DATETIME(6) NOT NULL,
    committed_at DATETIME(6),
    imported_by VARCHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_ib_project_id UNIQUE (project_id, id),
    CONSTRAINT fk_ib_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_ib_user FOREIGN KEY (imported_by) REFERENCES identity_users(id),
    INDEX ix_ib_created (project_id, created_at, id)
) ENGINE=InnoDB;

CREATE TABLE import_rows (
    id BIGINT NOT NULL AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    batch_id BIGINT NOT NULL,
    source_row_number INT NOT NULL,
    source_case_key VARCHAR(64),
    suite_code VARCHAR(32),
    raw_data_json JSON NOT NULL,
    error_message VARCHAR(500),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    target_case_id BIGINT,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_ir_batch_row UNIQUE (batch_id, source_row_number),
    CONSTRAINT fk_ir_batch FOREIGN KEY (project_id, batch_id) REFERENCES import_batches(project_id, id),
    CONSTRAINT fk_ir_case FOREIGN KEY (project_id, target_case_id) REFERENCES test_cases(project_id, id)
) ENGINE=InnoDB;

