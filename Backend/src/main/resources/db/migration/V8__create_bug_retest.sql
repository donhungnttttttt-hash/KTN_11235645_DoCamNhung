-- ADR-007: append-only verification; BUG_ONLY never changes execution results.
ALTER TABLE work_item_attachments ADD CONSTRAINT uq_attachment_bug UNIQUE(project_id,work_item_id,id);

CREATE TABLE bug_coverage_revisions (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL,
 revision_no BIGINT NOT NULL, round_no BIGINT NOT NULL, build_id BIGINT NOT NULL,
 reason VARCHAR(1000) NOT NULL, created_by BIGINT NOT NULL, created_at DATETIME(6) NOT NULL,
 UNIQUE(project_id,work_item_id,id), UNIQUE(project_id,work_item_id,revision_no),
 FOREIGN KEY(project_id,work_item_id) REFERENCES bug_details(project_id,work_item_id),
 FOREIGN KEY(project_id,build_id) REFERENCES builds(project_id,id),
 FOREIGN KEY(project_id,created_by) REFERENCES project_memberships(project_id,id),
 CHECK(revision_no>0 AND round_no>0 AND CHAR_LENGTH(TRIM(reason))>0)
) ENGINE=InnoDB;

CREATE TABLE bug_retest_state (
 project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL, round_no BIGINT NOT NULL DEFAULT 0,
 current_coverage_id BIGINT,
 PRIMARY KEY(project_id,work_item_id),
 FOREIGN KEY(project_id,work_item_id) REFERENCES bug_details(project_id,work_item_id),
 FOREIGN KEY(project_id,work_item_id,current_coverage_id) REFERENCES bug_coverage_revisions(project_id,work_item_id,id),
 CHECK(round_no>=0)
) ENGINE=InnoDB;
INSERT INTO bug_retest_state(project_id,work_item_id) SELECT project_id,work_item_id FROM bug_details;

CREATE TABLE bug_coverage_items (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL, coverage_revision_id BIGINT NOT NULL, run_item_id BIGINT NOT NULL,
 UNIQUE(coverage_revision_id,run_item_id), UNIQUE(project_id,work_item_id,coverage_revision_id,id),
 UNIQUE(project_id,work_item_id,coverage_revision_id,id,run_item_id),
 FOREIGN KEY(project_id,work_item_id,coverage_revision_id) REFERENCES bug_coverage_revisions(project_id,work_item_id,id),
 FOREIGN KEY(project_id,run_item_id) REFERENCES run_items(project_id,id)
) ENGINE=InnoDB;

CREATE TABLE retest_requests (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL, coverage_revision_id BIGINT NOT NULL,
 round_no BIGINT NOT NULL, build_id BIGINT NOT NULL, environment_id BIGINT NOT NULL, device_id BIGINT NOT NULL,
 verification_scope VARCHAR(16) NOT NULL, assignee_membership_id BIGINT NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'OPEN', lock_version BIGINT NOT NULL DEFAULT 0,
 reason VARCHAR(1000) NOT NULL, created_by BIGINT NOT NULL, created_at DATETIME(6) NOT NULL,
 request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 context_snapshot JSON NOT NULL,
 request_checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 submit_request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin,
 submit_checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin, submitted_by BIGINT, submitted_at DATETIME(6),
 UNIQUE(project_id,id), UNIQUE(project_id,work_item_id,coverage_revision_id,id), UNIQUE(project_id,request_key),
 FOREIGN KEY(project_id,work_item_id,coverage_revision_id) REFERENCES bug_coverage_revisions(project_id,work_item_id,id),
 FOREIGN KEY(project_id,build_id) REFERENCES builds(project_id,id),
 FOREIGN KEY(project_id,environment_id) REFERENCES environments(project_id,id),
 FOREIGN KEY(project_id,device_id) REFERENCES devices(project_id,id),
 FOREIGN KEY(project_id,assignee_membership_id) REFERENCES project_memberships(project_id,id),
 FOREIGN KEY(project_id,created_by) REFERENCES project_memberships(project_id,id),
 FOREIGN KEY(project_id,submitted_by) REFERENCES project_memberships(project_id,id),
 CHECK(verification_scope IN ('BUG_ONLY','FULL_CASE')), CHECK(status IN ('OPEN','SUBMITTED','CANCELLED')),
 CHECK(round_no>0 AND lock_version>=0),
 INDEX ix_retest_queue(project_id,status,assignee_membership_id,id),
 INDEX ix_retest_bug(project_id,work_item_id,id)
) ENGINE=InnoDB;

CREATE TABLE retest_request_items (
 project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL, coverage_revision_id BIGINT NOT NULL,
 request_id BIGINT NOT NULL, coverage_item_id BIGINT NOT NULL, run_item_id BIGINT NOT NULL,
 PRIMARY KEY(project_id,request_id,coverage_item_id),
 UNIQUE(project_id,work_item_id,request_id,coverage_item_id,run_item_id),
 FOREIGN KEY(project_id,work_item_id,coverage_revision_id,request_id) REFERENCES retest_requests(project_id,work_item_id,coverage_revision_id,id),
 FOREIGN KEY(project_id,work_item_id,coverage_revision_id,coverage_item_id,run_item_id) REFERENCES bug_coverage_items(project_id,work_item_id,coverage_revision_id,id,run_item_id)
) ENGINE=InnoDB;

CREATE TABLE bug_verification_attempts (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL, request_id BIGINT NOT NULL,
 coverage_item_id BIGINT NOT NULL, run_item_id BIGINT NOT NULL,
 verdict VARCHAR(8) NOT NULL, actual_result TEXT NOT NULL,
 evidence_attachment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
 execution_attempt_id BIGINT, verified_by BIGINT NOT NULL, verified_at DATETIME(6) NOT NULL,
 UNIQUE(project_id,request_id,coverage_item_id),
 FOREIGN KEY(project_id,work_item_id,request_id,coverage_item_id,run_item_id) REFERENCES retest_request_items(project_id,work_item_id,request_id,coverage_item_id,run_item_id),
 FOREIGN KEY(project_id,work_item_id,evidence_attachment_id) REFERENCES work_item_attachments(project_id,work_item_id,id),
 FOREIGN KEY(project_id,run_item_id,execution_attempt_id) REFERENCES execution_attempts(project_id,run_item_id,id),
 FOREIGN KEY(project_id,verified_by) REFERENCES project_memberships(project_id,id),
 CHECK(verdict IN ('PASS','FAIL')), CHECK(CHAR_LENGTH(TRIM(actual_result))>0),
 INDEX ix_verification_latest(project_id,work_item_id,coverage_item_id,id)
) ENGINE=InnoDB;

CREATE TABLE bug_closure_decisions (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL,
 decision_kind VARCHAR(20) NOT NULL, reason VARCHAR(1000) NOT NULL,
 evidence_attachment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin, source_reference VARCHAR(1000) NOT NULL,
 coverage_revision_id BIGINT, round_no BIGINT NOT NULL, build_id BIGINT,
 decided_by BIGINT NOT NULL, decided_at DATETIME(6) NOT NULL,
 FOREIGN KEY(project_id,work_item_id) REFERENCES bug_details(project_id,work_item_id),
 FOREIGN KEY(project_id,work_item_id,evidence_attachment_id) REFERENCES work_item_attachments(project_id,work_item_id,id),
 FOREIGN KEY(project_id,work_item_id,coverage_revision_id) REFERENCES bug_coverage_revisions(project_id,work_item_id,id),
 FOREIGN KEY(project_id,build_id) REFERENCES builds(project_id,id),
 FOREIGN KEY(project_id,decided_by) REFERENCES project_memberships(project_id,id),
 CHECK(decision_kind IN ('FIXED','UNREPRODUCIBLE','WONTFIX','REOPEN')),
 CHECK(CHAR_LENGTH(TRIM(reason))>0),
 CHECK(decision_kind NOT IN ('UNREPRODUCIBLE','WONTFIX') OR (evidence_attachment_id IS NOT NULL AND CHAR_LENGTH(TRIM(source_reference))>0)),
 INDEX ix_closure_history(project_id,work_item_id,id)
) ENGINE=InnoDB;
