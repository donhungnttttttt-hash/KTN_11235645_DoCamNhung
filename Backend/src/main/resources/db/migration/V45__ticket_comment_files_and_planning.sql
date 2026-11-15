ALTER TABLE work_item_feature_context
 ADD COLUMN start_on DATE NULL,
 ADD COLUMN due_on DATE NULL,
 ADD COLUMN estimated_hours DECIMAL(10,2) NULL,
 ADD COLUMN actual_hours DECIMAL(10,2) NULL,
 ADD CONSTRAINT ck_ticket_dates CHECK(due_on IS NULL OR start_on IS NULL OR due_on >= start_on),
 ADD CONSTRAINT ck_ticket_effort CHECK((estimated_hours IS NULL OR estimated_hours >= 0) AND (actual_hours IS NULL OR actual_hours >= 0));

CREATE TABLE ticket_milestones (
 project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL, milestone_id BIGINT NOT NULL,
 PRIMARY KEY(project_id,work_item_id,milestone_id),
 FOREIGN KEY(project_id,work_item_id) REFERENCES work_items(project_id,id),
 FOREIGN KEY(project_id,milestone_id) REFERENCES milestones(project_id,id)
) ENGINE=InnoDB;
INSERT INTO ticket_milestones(project_id,work_item_id,milestone_id)
 SELECT w.project_id,w.id,w.milestone_id FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id WHERE w.milestone_id IS NOT NULL;

ALTER TABLE work_item_feature_history ADD UNIQUE KEY uq_ticket_history_scope(project_id,work_item_id,id);
CREATE TABLE ticket_comment_attachments (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 project_id BIGINT NOT NULL, work_item_id BIGINT NOT NULL, history_id BIGINT NOT NULL,
 original_name VARCHAR(255) NOT NULL, media_type VARCHAR(100) NOT NULL,
 byte_size BIGINT NOT NULL, sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 uploaded_by_user_id VARCHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL,
 FOREIGN KEY(project_id,work_item_id,history_id) REFERENCES work_item_feature_history(project_id,work_item_id,id),
 FOREIGN KEY(uploaded_by_user_id) REFERENCES identity_users(id),
 CONSTRAINT ck_ticket_file_size CHECK(byte_size>0 AND byte_size<=20971520),
 INDEX ix_ticket_comment_files(project_id,work_item_id,history_id)
) ENGINE=InnoDB;
