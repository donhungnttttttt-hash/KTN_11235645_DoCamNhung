-- Shared application identity is reference data, not a customer/project seed.
CREATE TABLE application_info (
    id SMALLINT NOT NULL,
    system_key VARCHAR(32) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    installed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uq_application_system_key UNIQUE (system_key),
    CONSTRAINT ck_application_singleton CHECK (id = 1)
) ENGINE=InnoDB;

INSERT INTO application_info (id, system_key, display_name)
VALUES (1, 'SY_PARTNERS_TMS', 'Hệ thống quản lý kiểm thử SY Partners');

-- Local foundation smoke checks only; this is not a test execution or bug table.
CREATE TABLE foundation_checks (
    id VARCHAR(36) NOT NULL,
    message VARCHAR(160) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_foundation_checks_created (created_at, id)
) ENGINE=InnoDB;
