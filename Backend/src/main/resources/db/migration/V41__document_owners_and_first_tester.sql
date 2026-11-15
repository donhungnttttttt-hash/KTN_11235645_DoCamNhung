-- File ownership is informational and independent of permission to confirm case results.
CREATE TABLE test_document_owners (
 project_id BIGINT NOT NULL, document_id BIGINT NOT NULL, membership_id BIGINT NOT NULL,
 PRIMARY KEY(project_id,document_id,membership_id),
 FOREIGN KEY(project_id,document_id) REFERENCES import_batches(project_id,id),
 FOREIGN KEY(project_id,membership_id) REFERENCES project_memberships(project_id,id)
) ENGINE=InnoDB;
INSERT INTO test_document_owners(project_id,document_id,membership_id)
 SELECT DISTINCT project_id,document_id,assignee_membership_id FROM test_document_assignments WHERE assignee_membership_id IS NOT NULL;

ALTER TABLE test_document_assignments
 ADD assignee_user_id VARCHAR(36), ADD first_tester_user_id VARCHAR(36),
 ADD FOREIGN KEY(assignee_user_id) REFERENCES identity_users(id),
 ADD FOREIGN KEY(first_tester_user_id) REFERENCES identity_users(id);
UPDATE test_document_assignments a
 LEFT JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.assignee_membership_id
 LEFT JOIN project_memberships f ON f.project_id=a.project_id AND f.id=a.first_tester_membership_id
 SET a.assignee_user_id=m.user_id,a.first_tester_user_id=f.user_id;
-- Recover initial result attribution only when no initial tester was recorded.
UPDATE test_document_assignments a JOIN (
 SELECT project_id,entity_id,MIN(id) AS audit_id FROM project_audit
 WHERE entity_type='TEST_DOCUMENT_ROW' AND action LIKE 'RESULT_%' GROUP BY project_id,entity_id
) first_result ON first_result.project_id=a.project_id AND first_result.entity_id=a.row_id
 JOIN project_audit h ON h.id=first_result.audit_id
 SET a.first_tester_user_id=h.actor_id WHERE a.first_tester_user_id IS NULL;

ALTER TABLE test_document_assignment_changes
 ADD previous_user_id VARCHAR(36), ADD new_user_id VARCHAR(36),
 ADD FOREIGN KEY(previous_user_id) REFERENCES identity_users(id), ADD FOREIGN KEY(new_user_id) REFERENCES identity_users(id);
UPDATE test_document_assignment_changes h
 LEFT JOIN project_memberships p ON p.project_id=h.project_id AND p.id=h.previous_membership_id
 LEFT JOIN project_memberships n ON n.project_id=h.project_id AND n.id=h.new_membership_id
 SET h.previous_user_id=p.user_id,h.new_user_id=n.user_id;
