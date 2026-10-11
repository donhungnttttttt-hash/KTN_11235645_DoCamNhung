-- A file may be split into disjoint case ranges for different Testers in one cycle/configuration.
-- Keep the source lookup/FK index and all unique run/revision pins; historical groups are unchanged.
ALTER TABLE file_work_groups
    ADD INDEX ix_fw_group_source (project_id,document_id,cycle_id,configuration_id),
    DROP INDEX uq_fw_group_source;
