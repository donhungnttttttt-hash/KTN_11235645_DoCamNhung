-- Append-only PM narratives; metrics, deadlines and their history remain independent.
CREATE TABLE project_status_reports (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 project_id BIGINT NOT NULL,
 author_membership_id BIGINT NOT NULL,
 summary VARCHAR(4000) NOT NULL,
 delay_reason VARCHAR(4000) NOT NULL,
 recovery_plan VARCHAR(4000) NOT NULL,
 expected_finish_on DATE,
 request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at DATETIME(6) NOT NULL,
 created_by VARCHAR(36) NOT NULL,
 UNIQUE KEY uq_status_report_request (project_id,request_key),
 INDEX ix_status_report_history (project_id,id),
 FOREIGN KEY (project_id) REFERENCES projects(id),
 FOREIGN KEY (project_id,author_membership_id) REFERENCES project_memberships(project_id,id),
 FOREIGN KEY (created_by) REFERENCES identity_users(id)
) ENGINE=InnoDB;
