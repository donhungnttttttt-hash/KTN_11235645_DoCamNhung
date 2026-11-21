-- Preserve the original QA when confirmation creates a distinct Bug.
-- Existing in-place conversions remain unchanged: their earlier history is not reconstructed.
ALTER TABLE work_item_feature_context
 DROP CHECK ck_ticket_closure,
 ADD CONSTRAINT ck_ticket_closure CHECK((ticket_state IS NULL AND closure_reason IS NULL) OR
   (ticket_state IS NOT NULL AND (
     (ticket_state='CLOSED' AND closure_reason IS NOT NULL AND closure_reason IN
       ('PROCESSED','FIXED','CANNOT_REPRODUCE','WONT_FIX','UNSUPPORTED','CONVERTED_TO_BUG')) OR
     (ticket_state IN ('SPEC_CONFIRM','NEW','IN_PROGRESS','WAITING_CONFIRM') AND closure_reason IS NULL))));

CREATE TABLE ticket_qa_bug_links (
 project_id BIGINT NOT NULL, qa_id BIGINT NOT NULL, bug_id BIGINT NOT NULL,
 created_by_user_id VARCHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(project_id,qa_id), UNIQUE KEY uq_ticket_conversion_bug(project_id,bug_id),
 FOREIGN KEY(project_id,qa_id) REFERENCES work_items(project_id,id),
 FOREIGN KEY(project_id,bug_id) REFERENCES work_items(project_id,id),
 FOREIGN KEY(created_by_user_id) REFERENCES identity_users(id),
 CONSTRAINT ck_ticket_conversion_distinct CHECK(qa_id<>bug_id)
) ENGINE=InnoDB;

ALTER TABLE ticket_commands ADD result_work_item_id BIGINT NULL,
 ADD CONSTRAINT fk_ticket_command_result FOREIGN KEY(project_id,result_work_item_id) REFERENCES work_items(project_id,id);
