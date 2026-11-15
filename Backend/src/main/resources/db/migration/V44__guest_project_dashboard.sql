-- Reporting-only observations: no fictional staffing history or contractual amounts.
CREATE TABLE project_dashboard_days (
 project_id BIGINT NOT NULL, observed_on DATE NOT NULL, users_count INT NOT NULL, managers_count INT NOT NULL,
 total_cases BIGINT NOT NULL, tested_cases BIGINT NOT NULL, ok_cases BIGINT NOT NULL, ng_cases BIGINT NOT NULL,
 planned_cases BIGINT NOT NULL, baseline_tested_cases BIGINT NOT NULL, scope_key CHAR(64) NOT NULL, modeled_cost BIGINT NOT NULL, captured_at DATETIME(6) NOT NULL,
 PRIMARY KEY(project_id,observed_on), FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;
CREATE TABLE project_dashboard_risks (
 project_id BIGINT NOT NULL, risk_key VARCHAR(32) NOT NULL, severity VARCHAR(24) NOT NULL,
 evidence VARCHAR(1000) NOT NULL, facts_key CHAR(64) NOT NULL, revision BIGINT NOT NULL DEFAULT 1,
 ai_text TEXT, ai_state VARCHAR(24) NOT NULL DEFAULT 'PENDING', ai_at DATETIME(6), updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY(project_id,risk_key), FOREIGN KEY(project_id) REFERENCES projects(id)
) ENGINE=InnoDB;
CREATE TABLE project_health_notifications (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL, recipient_user_id VARCHAR(36) NOT NULL,
 risk_key VARCHAR(32) NOT NULL, risk_revision BIGINT NOT NULL, message VARCHAR(1000) NOT NULL,
 created_at DATETIME(6) NOT NULL, read_at DATETIME(6),
 UNIQUE KEY uq_health_notice(project_id,recipient_user_id,risk_key,risk_revision),
 FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(recipient_user_id) REFERENCES identity_users(id)
) ENGINE=InnoDB;
ALTER TABLE project_management_reports ADD published_title VARCHAR(255), ADD published_markdown MEDIUMTEXT,
 ADD published_at DATETIME(6), ADD published_version BIGINT;
-- Saved reports were already customer-visible; preserve their existing publication.
UPDATE project_management_reports SET published_title=title,published_markdown=markdown,published_at=updated_at,published_version=lock_version;
