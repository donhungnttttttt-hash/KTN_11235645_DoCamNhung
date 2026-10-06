-- MySQL 9.7 can skip the shorter answer FK when it shares the nullable
-- confirmation pointer index. Give the answer FK a distinct column order.
-- Adding the replacement FK validates all existing rows before the old FK is
-- removed. Invalid historical pointers abort migration; no data is repaired.
ALTER TABLE qa_answers
    ADD CONSTRAINT uq_qa_answer_pointer_order UNIQUE(id,project_id,work_item_id,generation);

ALTER TABLE qa_details
    ADD CONSTRAINT fk_qa_current_answer_exact
        FOREIGN KEY(current_answer_id,project_id,work_item_id,generation)
        REFERENCES qa_answers(id,project_id,work_item_id,generation);

ALTER TABLE qa_details DROP FOREIGN KEY fk_qa_current_answer;

-- The group FK has the same nullable-prefix exposure through group/document
-- and group/run indexes when both optional context fields are NULL.
ALTER TABLE file_work_groups
    ADD CONSTRAINT uq_fw_group_pointer_order UNIQUE(id,project_id);

ALTER TABLE qa_details
    ADD CONSTRAINT fk_qa_group_exact
        FOREIGN KEY(group_id,project_id) REFERENCES file_work_groups(id,project_id);

ALTER TABLE qa_details DROP FOREIGN KEY fk_qa_group;
