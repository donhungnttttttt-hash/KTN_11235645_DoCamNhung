-- Content limits must not truncate imported Excel text or later cell revisions.
-- Case/source identifiers keep their existing identity constraints.
ALTER TABLE test_case_revisions
 MODIFY title_vi LONGTEXT NOT NULL,
 MODIFY preconditions_vi LONGTEXT NULL,
 MODIFY steps_vi LONGTEXT NOT NULL,
 MODIFY expected_vi LONGTEXT NOT NULL,
 MODIFY title_jp LONGTEXT NULL,
 MODIFY preconditions_jp LONGTEXT NULL,
 MODIFY steps_jp LONGTEXT NULL,
 MODIFY expected_jp LONGTEXT NULL,
 MODIFY source_reference LONGTEXT NULL;

ALTER TABLE test_document_cell_edits MODIFY cell_value LONGTEXT NOT NULL;
ALTER TABLE test_document_cell_changes
 MODIFY before_value LONGTEXT NOT NULL,
 MODIFY after_value LONGTEXT NOT NULL;

-- Preserve the full test object when a case becomes a Ticket's evidence.
ALTER TABLE work_item_feature_context MODIFY test_object LONGTEXT NULL;
