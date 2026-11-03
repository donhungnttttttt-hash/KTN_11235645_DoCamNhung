-- Additive ticket workflow. Retired work-item workflows and original status history stay intact.
ALTER TABLE work_item_feature_context
 ADD ticket_state VARCHAR(32), ADD closure_reason VARCHAR(32),
 ADD coordinator_membership_id BIGINT, ADD verifier_user_id VARCHAR(36),
 ADD preconditions TEXT, ADD frequency VARCHAR(1000), ADD environment VARCHAR(1000), ADD device VARCHAR(1000),
 ADD test_version_id BIGINT, ADD test_version_name VARCHAR(255), ADD executed_on DATE,
 ADD test_object VARCHAR(1000), ADD case_reference VARCHAR(255),
 ADD CONSTRAINT fk_ticket_coordinator FOREIGN KEY(project_id,coordinator_membership_id) REFERENCES project_memberships(project_id,id),
 ADD CONSTRAINT fk_ticket_verifier FOREIGN KEY(verifier_user_id) REFERENCES identity_users(id),
 ADD CONSTRAINT ck_ticket_state CHECK(ticket_state IS NULL OR ticket_state IN ('SPEC_CONFIRM','NEW','IN_PROGRESS','WAITING_CONFIRM','CLOSED')),
 ADD CONSTRAINT ck_ticket_closure CHECK((ticket_state IS NULL AND closure_reason IS NULL) OR
   (ticket_state IS NOT NULL AND (
     (ticket_state='CLOSED' AND closure_reason IS NOT NULL AND closure_reason IN ('PROCESSED','FIXED','CANNOT_REPRODUCE','WONT_FIX','UNSUPPORTED')) OR
     (ticket_state IN ('SPEC_CONFIRM','NEW','IN_PROGRESS','WAITING_CONFIRM') AND closure_reason IS NULL)))),
 ADD INDEX ix_ticket_board(project_id,ticket_state,closure_reason,deleted_at);

UPDATE work_item_feature_context x JOIN work_items w ON w.project_id=x.project_id AND w.id=x.work_item_id
 SET x.verifier_user_id=x.created_by_user_id,
 x.ticket_state=CASE
 WHEN w.item_type='QA' AND w.status_code IN ('open','clarify') THEN 'SPEC_CONFIRM'
 WHEN w.item_type='BUG' AND w.status_code='open' THEN 'NEW'
 WHEN w.item_type='BUG' AND w.status_code='progress' THEN 'IN_PROGRESS'
 WHEN w.item_type='BUG' AND w.status_code='recheck' THEN 'WAITING_CONFIRM'
 WHEN w.item_type='BUG' AND w.status_code IN ('resolved','unreproducible','wontfix') THEN 'CLOSED' END,
 x.closure_reason=CASE WHEN w.item_type='BUG' THEN CASE w.status_code
 WHEN 'resolved' THEN 'PROCESSED' WHEN 'unreproducible' THEN 'CANNOT_REPRODUCE' WHEN 'wontfix' THEN 'WONT_FIX' END END;
-- No backfill from current case/version: that would invent historical discovery evidence.

-- Converted Feature QA retains its original detail/answers/confirmation references.
-- Only that row clears the old QA-type discriminator; identity remains mandatory.
ALTER TABLE qa_details MODIFY item_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT 'QA',
 ADD CONSTRAINT fk_qa_work_identity FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id);
-- QA questions can become Bugs before reproduction evidence is known. Preserve absence.
ALTER TABLE bug_details ADD converted_from_qa BOOLEAN NOT NULL DEFAULT FALSE,
 DROP CHECK ck_bug_text,
 ADD CONSTRAINT ck_bug_text CHECK(converted_from_qa=TRUE OR
   (CHAR_LENGTH(TRIM(steps))>0 AND CHAR_LENGTH(TRIM(expected_result))>0 AND CHAR_LENGTH(TRIM(actual_result))>0));

CREATE TABLE ticket_responsibilities (
 project_id BIGINT NOT NULL, membership_id BIGINT NOT NULL,
 spec_reviewer BOOLEAN NOT NULL DEFAULT FALSE, bug_coordinator BOOLEAN NOT NULL DEFAULT FALSE,
 lock_version BIGINT NOT NULL DEFAULT 0,
 PRIMARY KEY(project_id,membership_id),
 FOREIGN KEY(project_id,membership_id) REFERENCES project_memberships(project_id,id), CHECK(lock_version>=0)
) ENGINE=InnoDB;

CREATE TABLE ticket_commands (
 project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL, request_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_user_id VARCHAR(36) NOT NULL, request_checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 history_id BIGINT NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(project_id,work_item_id,request_key),
 FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id),
 FOREIGN KEY(actor_user_id) REFERENCES identity_users(id), FOREIGN KEY(history_id) REFERENCES work_item_feature_history(id)
) ENGINE=InnoDB;

CREATE TABLE ticket_notifications (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL,
 recipient_user_id VARCHAR(36) NOT NULL, actor_user_id VARCHAR(36) NOT NULL,
 message VARCHAR(1000) NOT NULL, created_at DATETIME(6) NOT NULL, read_at DATETIME(6),
 FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id),
 FOREIGN KEY(recipient_user_id) REFERENCES identity_users(id), FOREIGN KEY(actor_user_id) REFERENCES identity_users(id),
 INDEX ix_ticket_notices(recipient_user_id,read_at,id)
) ENGINE=InnoDB;

CREATE VIEW ticket_workflow_metrics AS
 SELECT w.project_id,w.id AS work_item_id,
 CASE WHEN x.ticket_state IS NULL THEN s.terminal ELSE
   x.ticket_state='CLOSED' AND x.closure_reason<>'PROCESSED' END AS finalized,
 CASE WHEN x.work_item_id IS NULL THEN w.status_code='resolved'
   WHEN x.ticket_state IS NULL THEN w.status_code IN ('resolved','recheck')
   ELSE x.ticket_state='WAITING_CONFIRM' OR (x.ticket_state='CLOSED' AND x.closure_reason='PROCESSED') END AS awaiting_verification,
 x.work_item_id IS NOT NULL AND x.ticket_state IS NULL AS legacy_workflow,
 x.ticket_state='CLOSED' AND x.closure_reason='FIXED' AS fixed
 FROM work_items w JOIN work_item_statuses s ON s.code=w.status_code
 LEFT JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id;
