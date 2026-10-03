module.exports=[
 {name:'Danh tính & đăng nhập',color:'#4e79a7',tables:['identity_users','identity_roles','identity_audit','identity_login_buckets','SPRING_SESSION','SPRING_SESSION_ATTRIBUTES']},
 {name:'Dự án & cấu hình',color:'#29988b',tables:['projects','project_memberships','environments','builds','devices','categories','milestones','rulesets','rule_versions','project_resources','resource_revisions','project_counters','project_audit']},
 {name:'Thư viện & nhập Excel',color:'#9d6cbc',tables:['test_suites','test_cases','test_case_revisions','import_batches','import_rows']},
 {name:'Thực thi kiểm thử',color:'#3988b1',tables:['test_cycles','cycle_configurations','run_items','execution_attempts','run_item_assignments','run_scope_decisions','cycle_decisions','cycle_statuses','execution_results']},
 {name:'Công việc & bug',color:'#d78142',tables:['work_items','bug_details','work_item_execution_links','work_item_comments','work_item_attachments','work_item_history','work_item_clarifications','work_item_external_references','work_item_statuses','work_item_policy_versions']},
 {name:'Retest & đóng lỗi',color:'#d36380',tables:['bug_retest_state','bug_coverage_revisions','bug_coverage_items','retest_requests','retest_request_items','bug_verification_attempts','bug_closure_decisions']},
 {name:'Tích hợp Redmine',color:'#8b8555',tables:['redmine_bindings','redmine_outbox','redmine_delivery_attempts']},
 {name:'Nền tảng kỹ thuật',color:'#708090',tables:['application_info','foundation_checks','flyway_schema_history']}
];
