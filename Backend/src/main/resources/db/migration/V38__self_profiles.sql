CREATE TABLE identity_profiles (
    user_id VARCHAR(36) NOT NULL PRIMARY KEY,
    email VARCHAR(254),
    phone VARCHAR(30),
    job_title VARCHAR(100),
    department VARCHAR(100),
    avatar MEDIUMBLOB,
    profile_version BIGINT NOT NULL DEFAULT 0,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_identity_profile_user FOREIGN KEY (user_id) REFERENCES identity_users(id)
) ENGINE=InnoDB;
