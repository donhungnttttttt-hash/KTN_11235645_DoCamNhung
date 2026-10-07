# Từ điển dữ liệu triển khai — MySQL V16

Sinh **chỉ đọc** từ information_schema trên native MySQL của dự án; không truy vấn giá trị dữ liệu nghiệp vụ, hash, session, password hoặc credential. Snapshot UTC: `2026-10-05T17:08:46.856Z`.

Đối chiếu 59 bảng, 560 cột, 139 ràng buộc FK và 269 index/PK/unique. Schema có Flyway V16; đây là cấu trúc triển khai hiện tại, **không chứa** nhóm file/session/QA đề xuất.

Thiết kế và policy: [đặc tả](SYSTEM-SPECIFICATION.md). ERD cũ 56 bảng ở docs/database/erd là snapshot trước V15/V16, không phải schema hiện tại. Quan hệ N:N được biểu diễn qua bảng liên kết; nhiều bảng history/current pointer phục vụ bất biến và truy vấn, không có nghĩa có thể xóa để đơn giản hóa.

`PRI`/`UNI`/`MUL` ở cột là chỉ báo MySQL; định nghĩa đầy đủ của khóa ghép/unique nằm trong bảng index. `NULL / không khai báo` ở Default không tự cho phép null: xem cột Nullable. FK ghép được trình bày theo đúng thứ tự cột. Không suy CASCADE từ bảng FK; SQL migration là nguồn policy UPDATE/DELETE.

## Danh mục

| Bảng | Số cột |
| --- | --- |
| application_info | 4 |
| bug_closure_decisions | 12 |
| bug_coverage_items | 5 |
| bug_coverage_revisions | 9 |
| bug_details | 16 |
| bug_retest_state | 4 |
| bug_verification_attempts | 12 |
| builds | 11 |
| categories | 8 |
| cycle_configurations | 7 |
| cycle_decisions | 9 |
| cycle_statuses | 2 |
| device_allocations | 14 |
| device_assets | 14 |
| devices | 11 |
| environments | 9 |
| execution_attempts | 14 |
| execution_results | 2 |
| flyway_schema_history | 10 |
| foundation_checks | 3 |
| identity_audit | 7 |
| identity_login_buckets | 3 |
| identity_roles | 2 |
| identity_users | 9 |
| import_batches | 15 |
| import_rows | 16 |
| milestones | 10 |
| project_audit | 7 |
| project_counters | 3 |
| project_memberships | 8 |
| project_resources | 9 |
| project_status_reports | 11 |
| projects | 11 |
| redmine_bindings | 17 |
| redmine_delivery_attempts | 11 |
| redmine_outbox | 27 |
| resource_revisions | 9 |
| retest_request_items | 6 |
| retest_requests | 22 |
| rule_versions | 9 |
| rulesets | 8 |
| run_item_assignments | 8 |
| run_items | 11 |
| run_scope_decisions | 7 |
| spring_session | 7 |
| spring_session_attributes | 3 |
| test_case_revisions | 20 |
| test_cases | 8 |
| test_cycles | 11 |
| test_suites | 10 |
| work_item_attachments | 9 |
| work_item_clarifications | 10 |
| work_item_comments | 8 |
| work_item_execution_links | 6 |
| work_item_external_references | 9 |
| work_item_history | 10 |
| work_item_policy_versions | 3 |
| work_item_statuses | 5 |
| work_items | 19 |

## application_info

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | smallint | NO | NULL / không khai báo | PRI | — |
| system_key | varchar(32) | NO | NULL / không khai báo | UNI | — |
| display_name | varchar(100) | NO | NULL / không khai báo | — | — |
| installed_at | datetime(6) | NO | CURRENT_TIMESTAMP(6) | — | DEFAULT_GENERATED |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | id |
| uq_application_system_key | UNIQUE | system_key |

## bug_closure_decisions

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| decision_kind | varchar(20) | NO | NULL / không khai báo | — | — |
| reason | varchar(1000) | NO | NULL / không khai báo | — | — |
| evidence_attachment_id | char(36) | YES | NULL / không khai báo | — | — |
| source_reference | varchar(1000) | NO | NULL / không khai báo | — | — |
| coverage_revision_id | bigint | YES | NULL / không khai báo | — | — |
| round_no | bigint | NO | NULL / không khai báo | — | — |
| build_id | bigint | YES | NULL / không khai báo | — | — |
| decided_by | bigint | NO | NULL / không khai báo | — | — |
| decided_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| ix_closure_history | INDEX | project_id, work_item_id, id |
| PRIMARY | PRIMARY | id |
| project_id | INDEX | project_id, work_item_id, evidence_attachment_id |
| project_id_2 | INDEX | project_id, work_item_id, coverage_revision_id |
| project_id_3 | INDEX | project_id, build_id |
| project_id_4 | INDEX | project_id, decided_by |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| bug_closure_decisions_ibfk_1 | project_id, work_item_id | bug_details | project_id, work_item_id |
| bug_closure_decisions_ibfk_2 | project_id, work_item_id, evidence_attachment_id | work_item_attachments | project_id, work_item_id, id |
| bug_closure_decisions_ibfk_3 | project_id, work_item_id, coverage_revision_id | bug_coverage_revisions | project_id, work_item_id, id |
| bug_closure_decisions_ibfk_4 | project_id, build_id | builds | project_id, id |
| bug_closure_decisions_ibfk_5 | project_id, decided_by | project_memberships | project_id, id |

## bug_coverage_items

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| coverage_revision_id | bigint | NO | NULL / không khai báo | MUL | — |
| run_item_id | bigint | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| coverage_revision_id | UNIQUE | coverage_revision_id, run_item_id |
| PRIMARY | PRIMARY | id |
| project_id | UNIQUE | project_id, work_item_id, coverage_revision_id, id |
| project_id_2 | UNIQUE | project_id, work_item_id, coverage_revision_id, id, run_item_id |
| project_id_3 | INDEX | project_id, run_item_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| bug_coverage_items_ibfk_1 | project_id, work_item_id, coverage_revision_id | bug_coverage_revisions | project_id, work_item_id, id |
| bug_coverage_items_ibfk_2 | project_id, run_item_id | run_items | project_id, id |

## bug_coverage_revisions

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| revision_no | bigint | NO | NULL / không khai báo | — | — |
| round_no | bigint | NO | NULL / không khai báo | — | — |
| build_id | bigint | NO | NULL / không khai báo | — | — |
| reason | varchar(1000) | NO | NULL / không khai báo | — | — |
| created_by | bigint | NO | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | id |
| project_id | UNIQUE | project_id, work_item_id, id |
| project_id_2 | UNIQUE | project_id, work_item_id, revision_no |
| project_id_3 | INDEX | project_id, build_id |
| project_id_4 | INDEX | project_id, created_by |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| bug_coverage_revisions_ibfk_1 | project_id, work_item_id | bug_details | project_id, work_item_id |
| bug_coverage_revisions_ibfk_2 | project_id, build_id | builds | project_id, id |
| bug_coverage_revisions_ibfk_3 | project_id, created_by | project_memberships | project_id, id |

## bug_details

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| project_id | bigint | NO | NULL / không khai báo | PRI | — |
| work_item_id | bigint | NO | NULL / không khai báo | PRI | — |
| item_type | varchar(16) | NO | BUG | — | — |
| policy_version | varchar(32) | NO | NULL / không khai báo | MUL | — |
| steps | text | NO | NULL / không khai báo | — | — |
| expected_result | text | NO | NULL / không khai báo | — | — |
| actual_result | text | NO | NULL / không khai báo | — | — |
| build_id | bigint | NO | NULL / không khai báo | — | — |
| environment_id | bigint | NO | NULL / không khai báo | — | — |
| device_id | bigint | NO | NULL / không khai báo | — | — |
| test_case_id | bigint | YES | NULL / không khai báo | — | — |
| revision_id | bigint | YES | NULL / không khai báo | — | — |
| standalone_reason | varchar(1000) | NO | NULL / không khai báo | — | — |
| fixed_build_id | bigint | YES | NULL / không khai báo | — | — |
| context_snapshot | json | NO | NULL / không khai báo | — | — |
| rule_version_id | bigint | YES | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_bug_build | INDEX | project_id, build_id |
| fk_bug_device | INDEX | project_id, device_id |
| fk_bug_env | INDEX | project_id, environment_id |
| fk_bug_fixed_build | INDEX | project_id, fixed_build_id |
| fk_bug_policy | INDEX | policy_version |
| fk_bug_revision | INDEX | project_id, test_case_id, revision_id |
| fk_bug_rule_version | INDEX | project_id, rule_version_id |
| fk_bug_work | INDEX | project_id, work_item_id, item_type |
| PRIMARY | PRIMARY | project_id, work_item_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_bug_build | project_id, build_id | builds | project_id, id |
| fk_bug_device | project_id, device_id | devices | project_id, id |
| fk_bug_env | project_id, environment_id | environments | project_id, id |
| fk_bug_fixed_build | project_id, fixed_build_id | builds | project_id, id |
| fk_bug_policy | policy_version | work_item_policy_versions | code |
| fk_bug_revision | project_id, test_case_id, revision_id | test_case_revisions | project_id, test_case_id, id |
| fk_bug_rule_version | project_id, rule_version_id | rule_versions | project_id, id |
| fk_bug_work | project_id, work_item_id, item_type | work_items | project_id, id, item_type |

## bug_retest_state

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| project_id | bigint | NO | NULL / không khai báo | PRI | — |
| work_item_id | bigint | NO | NULL / không khai báo | PRI | — |
| round_no | bigint | NO | 0 | — | — |
| current_coverage_id | bigint | YES | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | project_id, work_item_id |
| project_id | INDEX | project_id, work_item_id, current_coverage_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| bug_retest_state_ibfk_1 | project_id, work_item_id | bug_details | project_id, work_item_id |
| bug_retest_state_ibfk_2 | project_id, work_item_id, current_coverage_id | bug_coverage_revisions | project_id, work_item_id, id |

## bug_verification_attempts

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| request_id | bigint | NO | NULL / không khai báo | — | — |
| coverage_item_id | bigint | NO | NULL / không khai báo | — | — |
| run_item_id | bigint | NO | NULL / không khai báo | — | — |
| verdict | varchar(8) | NO | NULL / không khai báo | — | — |
| actual_result | text | NO | NULL / không khai báo | — | — |
| evidence_attachment_id | char(36) | YES | NULL / không khai báo | — | — |
| execution_attempt_id | bigint | YES | NULL / không khai báo | — | — |
| verified_by | bigint | NO | NULL / không khai báo | — | — |
| verified_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| ix_verification_latest | INDEX | project_id, work_item_id, coverage_item_id, id |
| PRIMARY | PRIMARY | id |
| project_id | UNIQUE | project_id, request_id, coverage_item_id |
| project_id_2 | INDEX | project_id, work_item_id, request_id, coverage_item_id, run_item_id |
| project_id_3 | INDEX | project_id, work_item_id, evidence_attachment_id |
| project_id_4 | INDEX | project_id, run_item_id, execution_attempt_id |
| project_id_5 | INDEX | project_id, verified_by |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| bug_verification_attempts_ibfk_1 | project_id, work_item_id, request_id, coverage_item_id, run_item_id | retest_request_items | project_id, work_item_id, request_id, coverage_item_id, run_item_id |
| bug_verification_attempts_ibfk_2 | project_id, work_item_id, evidence_attachment_id | work_item_attachments | project_id, work_item_id, id |
| bug_verification_attempts_ibfk_3 | project_id, run_item_id, execution_attempt_id | execution_attempts | project_id, run_item_id, id |
| bug_verification_attempts_ibfk_4 | project_id, verified_by | project_memberships | project_id, id |

## builds

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| version_label | varchar(50) | NO | NULL / không khai báo | — | — |
| build_number | varchar(50) | YES | NULL / không khai báo | — | — |
| platform | varchar(32) | NO | NULL / không khai báo | — | — |
| notes | varchar(500) | YES | NULL / không khai báo | — | — |
| released_at | date | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |
| archived_at | datetime(6) | YES | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| ix_build_released | INDEX | project_id, released_at, id |
| PRIMARY | PRIMARY | id |
| uq_build_project_id | UNIQUE | project_id, id |
| uq_build_project_ver | UNIQUE | project_id, platform, version_label, build_number |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_build_project | project_id | projects | id |

## categories

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| code | varchar(32) | NO | NULL / không khai báo | — | — |
| name | varchar(100) | NO | NULL / không khai báo | — | — |
| active | tinyint(1) | NO | 1 | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | id |
| uq_cat_project_code | UNIQUE | project_id, code |
| uq_cat_project_id | UNIQUE | project_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_cat_project | project_id | projects | id |

## cycle_configurations

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| cycle_id | bigint | NO | NULL / không khai báo | — | — |
| environment_id | bigint | NO | NULL / không khai báo | — | — |
| device_id | bigint | NO | NULL / không khai báo | — | — |
| default_build_id | bigint | NO | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_config_build | INDEX | project_id, default_build_id |
| fk_config_device | INDEX | project_id, device_id |
| fk_config_env | INDEX | project_id, environment_id |
| PRIMARY | PRIMARY | id |
| uq_config_cycle_id | UNIQUE | project_id, cycle_id, id |
| uq_config_scope | UNIQUE | project_id, cycle_id, environment_id, device_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_config_build | project_id, default_build_id | builds | project_id, id |
| fk_config_cycle | project_id, cycle_id | test_cycles | project_id, id |
| fk_config_device | project_id, device_id | devices | project_id, id |
| fk_config_env | project_id, environment_id | environments | project_id, id |

## cycle_decisions

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| cycle_id | bigint | NO | NULL / không khai báo | — | — |
| action | varchar(16) | NO | NULL / không khai báo | — | — |
| reason | varchar(1000) | NO | NULL / không khai báo | — | — |
| outstanding_reason | varchar(2000) | NO | NULL / không khai báo | — | — |
| scope_snapshot | json | NO | NULL / không khai báo | — | — |
| decided_by | bigint | NO | NULL / không khai báo | — | — |
| decided_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_cycle_decision_actor | INDEX | project_id, decided_by |
| ix_cycle_decision_history | INDEX | project_id, cycle_id, id |
| PRIMARY | PRIMARY | id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_cycle_decision_actor | project_id, decided_by | project_memberships | project_id, id |
| fk_cycle_decision_cycle | project_id, cycle_id | test_cycles | project_id, id |

## cycle_statuses

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| code | varchar(16) | NO | NULL / không khai báo | PRI | — |
| label_vi | varchar(50) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | code |

## device_allocations

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| asset_id | bigint | NO | NULL / không khai báo | MUL | — |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| recipient_membership_id | bigint | NO | NULL / không khai báo | — | — |
| assigned_at | datetime(6) | NO | NULL / không khai báo | — | — |
| assigned_by | varchar(36) | NO | NULL / không khai báo | MUL | — |
| expected_return_on | date | YES | NULL / không khai báo | — | — |
| handover_note | varchar(1000) | YES | NULL / không khai báo | — | — |
| returned_at | datetime(6) | YES | NULL / không khai báo | — | — |
| returned_by | varchar(36) | YES | NULL / không khai báo | MUL | — |
| returned_condition | varchar(16) | YES | NULL / không khai báo | — | — |
| return_note | varchar(1000) | YES | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |
| active_asset_id | bigint | YES | NULL / không khai báo | UNI | STORED GENERATED |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| asset_id | INDEX | asset_id |
| assigned_by | INDEX | assigned_by |
| ix_allocation_project | INDEX | project_id, returned_at, id |
| PRIMARY | PRIMARY | id |
| project_id | INDEX | project_id, recipient_membership_id |
| returned_by | INDEX | returned_by |
| uq_allocation_active_asset | UNIQUE | active_asset_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| device_allocations_ibfk_1 | asset_id | device_assets | id |
| device_allocations_ibfk_2 | project_id | projects | id |
| device_allocations_ibfk_3 | project_id, recipient_membership_id | project_memberships | project_id, id |
| device_allocations_ibfk_4 | assigned_by | identity_users | id |
| device_allocations_ibfk_5 | returned_by | identity_users | id |

## device_assets

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| asset_code | varchar(64) | NO | NULL / không khai báo | UNI | — |
| type | varchar(16) | NO | NULL / không khai báo | — | — |
| model | varchar(100) | NO | NULL / không khai báo | — | — |
| serial | varchar(100) | YES | NULL / không khai báo | UNI | — |
| os_name | varchar(50) | YES | NULL / không khai báo | — | — |
| os_version | varchar(50) | YES | NULL / không khai báo | — | — |
| condition_code | varchar(16) | NO | AVAILABLE | — | — |
| notes | varchar(1000) | YES | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| created_by | varchar(36) | NO | NULL / không khai báo | MUL | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_by | varchar(36) | NO | NULL / không khai báo | MUL | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| asset_code | UNIQUE | asset_code |
| created_by | INDEX | created_by |
| PRIMARY | PRIMARY | id |
| serial | UNIQUE | serial |
| updated_by | INDEX | updated_by |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| device_assets_ibfk_1 | created_by | identity_users | id |
| device_assets_ibfk_2 | updated_by | identity_users | id |

## devices

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| code | varchar(32) | NO | NULL / không khai báo | — | — |
| name | varchar(100) | NO | NULL / không khai báo | — | — |
| model | varchar(100) | YES | NULL / không khai báo | — | — |
| os_name | varchar(50) | YES | NULL / không khai báo | — | — |
| os_version | varchar(50) | YES | NULL / không khai báo | — | — |
| active | tinyint(1) | NO | 1 | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | id |
| uq_device_project_code | UNIQUE | project_id, code |
| uq_device_project_id | UNIQUE | project_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_device_project | project_id | projects | id |

## environments

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| code | varchar(32) | NO | NULL / không khai báo | — | — |
| name | varchar(100) | NO | NULL / không khai báo | — | — |
| description | varchar(500) | YES | NULL / không khai báo | — | — |
| active | tinyint(1) | NO | 1 | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | id |
| uq_env_project_code | UNIQUE | project_id, code |
| uq_env_project_id | UNIQUE | project_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_env_project | project_id | projects | id |

## execution_attempts

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| run_item_id | bigint | NO | NULL / không khai báo | — | — |
| attempt_no | int | NO | NULL / không khai báo | — | — |
| result_code | varchar(16) | NO | NULL / không khai báo | MUL | — |
| build_id | bigint | NO | NULL / không khai báo | — | — |
| executor_membership_id | bigint | NO | NULL / không khai báo | — | — |
| executed_at | datetime(6) | NO | NULL / không khai báo | — | — |
| actual_result | text | NO | NULL / không khai báo | — | — |
| reason | varchar(1000) | NO | NULL / không khai báo | — | — |
| evidence_reference | varchar(1000) | NO | NULL / không khai báo | — | — |
| context_snapshot | json | NO | NULL / không khai báo | — | — |
| request_key | varchar(64) | NO | NULL / không khai báo | — | — |
| request_checksum | char(64) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_attempt_executor | INDEX | project_id, executor_membership_id |
| fk_attempt_result | INDEX | result_code |
| ix_attempt_build_run | INDEX | project_id, build_id, run_item_id, attempt_no |
| ix_attempt_history | INDEX | project_id, run_item_id, executed_at, id |
| ix_attempt_pending_bug | INDEX | project_id, result_code, id |
| PRIMARY | PRIMARY | id |
| uq_attempt_no | UNIQUE | project_id, run_item_id, attempt_no |
| uq_attempt_request | UNIQUE | project_id, request_key |
| uq_attempt_run_id | UNIQUE | project_id, run_item_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_attempt_build | project_id, build_id | builds | project_id, id |
| fk_attempt_executor | project_id, executor_membership_id | project_memberships | project_id, id |
| fk_attempt_result | result_code | execution_results | code |
| fk_attempt_run | project_id, run_item_id | run_items | project_id, id |

## execution_results

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| code | varchar(16) | NO | NULL / không khai báo | PRI | — |
| label_vi | varchar(50) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | code |

## flyway_schema_history

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| installed_rank | int | NO | NULL / không khai báo | PRI | — |
| version | varchar(50) | YES | NULL / không khai báo | — | — |
| description | varchar(200) | NO | NULL / không khai báo | — | — |
| type | varchar(20) | NO | NULL / không khai báo | — | — |
| script | varchar(1000) | NO | NULL / không khai báo | — | — |
| checksum | int | YES | NULL / không khai báo | — | — |
| installed_by | varchar(100) | NO | NULL / không khai báo | — | — |
| installed_on | timestamp | NO | CURRENT_TIMESTAMP | — | DEFAULT_GENERATED |
| execution_time | int | NO | NULL / không khai báo | — | — |
| success | tinyint(1) | NO | NULL / không khai báo | MUL | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| flyway_schema_history_s_idx | INDEX | success |
| PRIMARY | PRIMARY | installed_rank |

## foundation_checks

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | varchar(36) | NO | NULL / không khai báo | PRI | — |
| message | varchar(160) | NO | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | MUL | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| ix_foundation_checks_created | INDEX | created_at, id |
| PRIMARY | PRIMARY | id |

## identity_audit

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | varchar(36) | NO | NULL / không khai báo | PRI | — |
| actor_id | varchar(36) | YES | NULL / không khai báo | MUL | — |
| subject_id | varchar(36) | YES | NULL / không khai báo | MUL | — |
| event_code | varchar(40) | NO | NULL / không khai báo | — | — |
| request_id | varchar(64) | NO | NULL / không khai báo | — | — |
| occurred_at | datetime(6) | NO | NULL / không khai báo | — | — |
| project_id | bigint | YES | NULL / không khai báo | MUL | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_audit_project | INDEX | project_id |
| fk_identity_audit_actor | INDEX | actor_id |
| ix_identity_audit_subject | INDEX | subject_id, occurred_at |
| PRIMARY | PRIMARY | id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_audit_project | project_id | projects | id |
| fk_identity_audit_actor | actor_id | identity_users | id |
| fk_identity_audit_subject | subject_id | identity_users | id |

## identity_login_buckets

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| bucket_key | char(64) | NO | NULL / không khai báo | PRI | — |
| attempts | int | NO | NULL / không khai báo | — | — |
| expires_at | datetime(6) | NO | NULL / không khai báo | MUL | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| ix_identity_login_expiry | INDEX | expires_at |
| PRIMARY | PRIMARY | bucket_key |

## identity_roles

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| code | varchar(16) | NO | NULL / không khai báo | PRI | — |
| display_name | varchar(80) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | code |

## identity_users

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | varchar(36) | NO | NULL / không khai báo | PRI | — |
| username | varchar(64) | NO | NULL / không khai báo | UNI | — |
| display_name | varchar(100) | NO | NULL / không khai báo | — | — |
| password_hash | varchar(255) | NO | NULL / không khai báo | — | — |
| role_code | varchar(16) | NO | NULL / không khai báo | MUL | — |
| enabled | tinyint(1) | NO | 1 | — | — |
| can_create_users | tinyint(1) | NO | 0 | — | — |
| lock_version | bigint | NO | 0 | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | MUL | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_identity_role | INDEX | role_code |
| ix_identity_users_created | INDEX | created_at, id |
| PRIMARY | PRIMARY | id |
| uq_identity_username | UNIQUE | username |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_identity_role | role_code | identity_roles | code |

## import_batches

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| file_name | varchar(255) | NO | NULL / không khai báo | — | — |
| file_checksum | varchar(64) | NO | NULL / không khai báo | — | — |
| status | varchar(32) | NO | PREVIEW | — | — |
| mapping_version | varchar(32) | NO | 1.0 | — | — |
| total_rows | int | NO | 0 | — | — |
| valid_rows | int | NO | 0 | — | — |
| error_rows | int | NO | 0 | — | — |
| staged_expires_at | datetime(6) | NO | NULL / không khai báo | — | — |
| committed_at | datetime(6) | YES | NULL / không khai báo | — | — |
| imported_by | varchar(36) | NO | NULL / không khai báo | MUL | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| sheet_name | varchar(255) | YES | NULL / không khai báo | — | — |
| source_workbook | mediumblob | YES | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_ib_user | INDEX | imported_by |
| ix_ib_created | INDEX | project_id, created_at, id |
| ix_ib_document_checksum | INDEX | project_id, file_checksum, status |
| ix_ib_documents | INDEX | project_id, status, id |
| ix_import_dedup | INDEX | project_id, file_checksum, imported_by |
| PRIMARY | PRIMARY | id |
| uq_ib_project_id | UNIQUE | project_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_ib_project | project_id | projects | id |
| fk_ib_user | imported_by | identity_users | id |

## import_rows

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| batch_id | bigint | NO | NULL / không khai báo | MUL | — |
| source_row_number | int | NO | NULL / không khai báo | — | — |
| source_case_key | varchar(64) | YES | NULL / không khai báo | — | — |
| suite_code | varchar(32) | YES | NULL / không khai báo | — | — |
| raw_data_json | json | NO | NULL / không khai báo | — | — |
| error_message | varchar(500) | YES | NULL / không khai báo | — | — |
| is_valid | tinyint(1) | NO | 1 | — | — |
| target_case_id | bigint | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| result_status | varchar(16) | NO | UNEXECUTED | — | — |
| result_version | bigint | NO | 0 | — | — |
| result_updated_at | datetime(6) | YES | NULL / không khai báo | — | — |
| result_updated_by | varchar(36) | YES | NULL / không khai báo | MUL | — |
| result_request_key | varchar(36) | YES | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_ir_batch | INDEX | project_id, batch_id |
| fk_ir_case | INDEX | project_id, target_case_id |
| fk_ir_result_actor | INDEX | result_updated_by |
| PRIMARY | PRIMARY | id |
| uq_ir_batch_row | UNIQUE | batch_id, source_row_number |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_ir_batch | project_id, batch_id | import_batches | project_id, id |
| fk_ir_case | project_id, target_case_id | test_cases | project_id, id |
| fk_ir_result_actor | result_updated_by | identity_users | id |

## milestones

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| code | varchar(32) | NO | NULL / không khai báo | — | — |
| name | varchar(100) | NO | NULL / không khai báo | — | — |
| starts_on | date | YES | NULL / không khai báo | — | — |
| due_on | date | YES | NULL / không khai báo | — | — |
| archived_at | datetime(6) | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| ix_ms_due | INDEX | project_id, due_on, id |
| PRIMARY | PRIMARY | id |
| uq_ms_project_code | UNIQUE | project_id, code |
| uq_ms_project_id | UNIQUE | project_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_ms_project | project_id | projects | id |

## project_audit

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | YES | NULL / không khai báo | MUL | — |
| actor_id | varchar(36) | NO | NULL / không khai báo | MUL | — |
| entity_type | varchar(32) | NO | NULL / không khai báo | — | — |
| entity_id | bigint | NO | NULL / không khai báo | — | — |
| action | varchar(32) | NO | NULL / không khai báo | — | — |
| occurred_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_project_audit_actor | INDEX | actor_id |
| ix_project_audit_history | INDEX | project_id, entity_type, entity_id, id |
| PRIMARY | PRIMARY | id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_project_audit_actor | actor_id | identity_users | id |
| fk_project_audit_project | project_id | projects | id |

## project_counters

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| project_id | bigint | NO | NULL / không khai báo | PRI | — |
| counter_code | varchar(32) | NO | NULL / không khai báo | PRI | — |
| next_value | bigint | NO | 1 | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | project_id, counter_code |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_counter_project | project_id | projects | id |

## project_memberships

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| user_id | varchar(36) | NO | NULL / không khai báo | MUL | — |
| project_role | varchar(16) | NO | MEMBER | — | — |
| active | tinyint(1) | NO | 1 | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| ix_membership_user | INDEX | user_id, active, project_id |
| PRIMARY | PRIMARY | id |
| uq_membership_project_id | UNIQUE | project_id, id |
| uq_membership_project_user | UNIQUE | project_id, user_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_membership_project | project_id | projects | id |
| fk_membership_user | user_id | identity_users | id |

## project_resources

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| code | varchar(32) | NO | NULL / không khai báo | — | — |
| resource_type | varchar(32) | NO | NULL / không khai báo | — | — |
| name | varchar(100) | NO | NULL / không khai báo | — | — |
| current_revision_id | bigint | YES | NULL / không khai báo | — | — |
| archived_at | datetime(6) | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_res_current_revision | INDEX | project_id, id, current_revision_id |
| ix_res_type | INDEX | project_id, resource_type, updated_at, id |
| PRIMARY | PRIMARY | id |
| uq_res_project_code | UNIQUE | project_id, code |
| uq_res_project_id | UNIQUE | project_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_res_current_revision | project_id, id, current_revision_id | resource_revisions | project_id, resource_id, id |
| fk_res_project | project_id | projects | id |

## project_status_reports

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| author_membership_id | bigint | NO | NULL / không khai báo | — | — |
| summary | varchar(4000) | NO | NULL / không khai báo | — | — |
| delay_reason | varchar(4000) | NO | NULL / không khai báo | — | — |
| recovery_plan | varchar(4000) | NO | NULL / không khai báo | — | — |
| expected_finish_on | date | YES | NULL / không khai báo | — | — |
| request_key | varchar(64) | NO | NULL / không khai báo | — | — |
| payload_hash | char(64) | NO | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| created_by | varchar(36) | NO | NULL / không khai báo | MUL | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| created_by | INDEX | created_by |
| ix_status_report_history | INDEX | project_id, id |
| PRIMARY | PRIMARY | id |
| project_id | INDEX | project_id, author_membership_id |
| uq_status_report_request | UNIQUE | project_id, request_key |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| project_status_reports_ibfk_1 | project_id | projects | id |
| project_status_reports_ibfk_2 | project_id, author_membership_id | project_memberships | project_id, id |
| project_status_reports_ibfk_3 | created_by | identity_users | id |

## projects

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| code | varchar(32) | NO | NULL / không khai báo | UNI | — |
| name | varchar(100) | NO | NULL / không khai báo | — | — |
| description | varchar(500) | YES | NULL / không khai báo | — | — |
| timezone | varchar(50) | NO | Asia/Ho_Chi_Minh | — | — |
| archived_at | datetime(6) | YES | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| created_by | varchar(36) | NO | NULL / không khai báo | MUL | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_by | varchar(36) | NO | NULL / không khai báo | MUL | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_projects_created_by | INDEX | created_by |
| fk_projects_updated_by | INDEX | updated_by |
| PRIMARY | PRIMARY | id |
| uq_projects_code | UNIQUE | code |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_projects_created_by | created_by | identity_users | id |
| fk_projects_updated_by | updated_by | identity_users | id |

## redmine_bindings

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| correlation_marker | char(36) | NO | NULL / không khai báo | UNI | — |
| instance_hash | char(64) | NO | NULL / không khai báo | MUL | — |
| configuration_json | json | NO | NULL / không khai báo | — | — |
| external_issue_id | bigint | YES | NULL / không khai báo | — | — |
| create_attempted | tinyint(1) | NO | 0 | — | — |
| delivered_source_version | bigint | YES | NULL / không khai báo | — | — |
| delivered_fingerprint | char(64) | YES | NULL / không khai báo | — | — |
| delivered_payload | json | YES | NULL / không khai báo | — | — |
| observed_fingerprint | char(64) | YES | NULL / không khai báo | — | — |
| observed_payload | json | YES | NULL / không khai báo | — | — |
| observed_at | datetime(6) | YES | NULL / không khai báo | — | — |
| created_by | bigint | NO | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_redmine_binding_actor | INDEX | project_id, created_by |
| PRIMARY | PRIMARY | id |
| uq_redmine_binding_scope | UNIQUE | project_id, work_item_id, id |
| uq_redmine_binding_work | UNIQUE | project_id, work_item_id |
| uq_redmine_marker | UNIQUE | correlation_marker |
| uq_redmine_remote | UNIQUE | instance_hash, external_issue_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_redmine_binding_actor | project_id, created_by | project_memberships | project_id, id |
| fk_redmine_binding_work | project_id, work_item_id | work_items | project_id, id |

## redmine_delivery_attempts

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| outbox_id | bigint | NO | NULL / không khai báo | — | — |
| attempt_no | int | NO | NULL / không khai báo | — | — |
| lease_key | char(36) | NO | NULL / không khai báo | — | — |
| outcome | varchar(24) | NO | NULL / không khai báo | — | — |
| error_code | varchar(64) | YES | NULL / không khai báo | — | — |
| http_status | smallint | YES | NULL / không khai báo | — | — |
| actor_membership_id | bigint | NO | NULL / không khai báo | — | — |
| reason | varchar(1000) | NO | NULL / không khai báo | — | — |
| occurred_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_redmine_attempt_actor | INDEX | project_id, actor_membership_id |
| ix_redmine_attempt_history | INDEX | project_id, outbox_id, id |
| PRIMARY | PRIMARY | id |
| uq_redmine_attempt | UNIQUE | project_id, outbox_id, lease_key |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_redmine_attempt_actor | project_id, actor_membership_id | project_memberships | project_id, id |
| fk_redmine_attempt_job | project_id, outbox_id | redmine_outbox | project_id, id |

## redmine_outbox

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| binding_id | bigint | NO | NULL / không khai báo | — | — |
| operation | varchar(16) | NO | NULL / không khai báo | — | — |
| status | varchar(20) | NO | QUEUED | MUL | — |
| source_version | bigint | NO | NULL / không khai báo | — | — |
| payload_json | json | NO | NULL / không khai báo | — | — |
| payload_checksum | char(64) | NO | NULL / không khai báo | — | — |
| expected_remote_fingerprint | char(64) | YES | NULL / không khai báo | — | — |
| request_key | varchar(100) | NO | NULL / không khai báo | — | — |
| request_checksum | char(64) | NO | NULL / không khai báo | — | — |
| reason | varchar(1000) | NO | NULL / không khai báo | — | — |
| created_by | bigint | NO | NULL / không khai báo | — | — |
| dispatch_by | bigint | NO | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |
| attempt_count | int | NO | 0 | — | — |
| max_attempts | int | NO | 5 | — | — |
| next_attempt_at | datetime(6) | NO | NULL / không khai báo | — | — |
| lease_key | char(36) | YES | NULL / không khai báo | — | — |
| lease_until | datetime(6) | YES | NULL / không khai báo | — | — |
| reconcile_only | tinyint(1) | NO | 0 | — | — |
| error_code | varchar(64) | YES | NULL / không khai báo | — | — |
| http_status | smallint | YES | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |
| active_binding | bigint | YES | NULL / không khai báo | UNI | STORED GENERATED |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_redmine_outbox_actor | INDEX | project_id, created_by |
| fk_redmine_outbox_binding | INDEX | project_id, work_item_id, binding_id |
| fk_redmine_outbox_dispatch_actor | INDEX | project_id, dispatch_by |
| ix_redmine_dispatch | INDEX | status, next_attempt_at, id |
| ix_redmine_expired_lease | INDEX | status, lease_until, id |
| ix_redmine_work_history | INDEX | project_id, work_item_id, id |
| PRIMARY | PRIMARY | id |
| uq_redmine_active | UNIQUE | active_binding |
| uq_redmine_outbox_scope | UNIQUE | project_id, id |
| uq_redmine_request | UNIQUE | project_id, request_key |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_redmine_outbox_actor | project_id, created_by | project_memberships | project_id, id |
| fk_redmine_outbox_binding | project_id, work_item_id, binding_id | redmine_bindings | project_id, work_item_id, id |
| fk_redmine_outbox_dispatch_actor | project_id, dispatch_by | project_memberships | project_id, id |

## resource_revisions

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| resource_id | bigint | NO | NULL / không khai báo | — | — |
| revision_no | int | NO | NULL / không khai báo | — | — |
| content_html | text | NO | NULL / không khai báo | — | — |
| visibility | varchar(16) | NO | INTERNAL | — | — |
| edited_by | bigint | NO | NULL / không khai báo | — | — |
| published_at | datetime(6) | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_rr_edited_by | INDEX | project_id, edited_by |
| PRIMARY | PRIMARY | id |
| uq_rr_resource_id | UNIQUE | project_id, resource_id, id |
| uq_rr_resource_no | UNIQUE | project_id, resource_id, revision_no |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_rr_edited_by | project_id, edited_by | project_memberships | project_id, id |
| fk_rr_resource | project_id, resource_id | project_resources | project_id, id |

## retest_request_items

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| project_id | bigint | NO | NULL / không khai báo | PRI | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| coverage_revision_id | bigint | NO | NULL / không khai báo | — | — |
| request_id | bigint | NO | NULL / không khai báo | PRI | — |
| coverage_item_id | bigint | NO | NULL / không khai báo | PRI | — |
| run_item_id | bigint | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | project_id, request_id, coverage_item_id |
| project_id | UNIQUE | project_id, work_item_id, request_id, coverage_item_id, run_item_id |
| project_id_2 | INDEX | project_id, work_item_id, coverage_revision_id, request_id |
| project_id_3 | INDEX | project_id, work_item_id, coverage_revision_id, coverage_item_id, run_item_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| retest_request_items_ibfk_1 | project_id, work_item_id, coverage_revision_id, request_id | retest_requests | project_id, work_item_id, coverage_revision_id, id |
| retest_request_items_ibfk_2 | project_id, work_item_id, coverage_revision_id, coverage_item_id, run_item_id | bug_coverage_items | project_id, work_item_id, coverage_revision_id, id, run_item_id |

## retest_requests

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| coverage_revision_id | bigint | NO | NULL / không khai báo | — | — |
| round_no | bigint | NO | NULL / không khai báo | — | — |
| build_id | bigint | NO | NULL / không khai báo | — | — |
| environment_id | bigint | NO | NULL / không khai báo | — | — |
| device_id | bigint | NO | NULL / không khai báo | — | — |
| verification_scope | varchar(16) | NO | NULL / không khai báo | — | — |
| assignee_membership_id | bigint | NO | NULL / không khai báo | — | — |
| status | varchar(16) | NO | OPEN | — | — |
| lock_version | bigint | NO | 0 | — | — |
| reason | varchar(1000) | NO | NULL / không khai báo | — | — |
| created_by | bigint | NO | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| request_key | varchar(64) | NO | NULL / không khai báo | — | — |
| context_snapshot | json | NO | NULL / không khai báo | — | — |
| request_checksum | char(64) | NO | NULL / không khai báo | — | — |
| submit_request_key | varchar(64) | YES | NULL / không khai báo | — | — |
| submit_checksum | char(64) | YES | NULL / không khai báo | — | — |
| submitted_by | bigint | YES | NULL / không khai báo | — | — |
| submitted_at | datetime(6) | YES | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| ix_retest_bug | INDEX | project_id, work_item_id, id |
| ix_retest_queue | INDEX | project_id, status, assignee_membership_id, id |
| PRIMARY | PRIMARY | id |
| project_id | UNIQUE | project_id, id |
| project_id_2 | UNIQUE | project_id, work_item_id, coverage_revision_id, id |
| project_id_3 | UNIQUE | project_id, request_key |
| project_id_4 | INDEX | project_id, build_id |
| project_id_5 | INDEX | project_id, environment_id |
| project_id_6 | INDEX | project_id, device_id |
| project_id_7 | INDEX | project_id, assignee_membership_id |
| project_id_8 | INDEX | project_id, created_by |
| project_id_9 | INDEX | project_id, submitted_by |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| retest_requests_ibfk_1 | project_id, work_item_id, coverage_revision_id | bug_coverage_revisions | project_id, work_item_id, id |
| retest_requests_ibfk_2 | project_id, build_id | builds | project_id, id |
| retest_requests_ibfk_3 | project_id, environment_id | environments | project_id, id |
| retest_requests_ibfk_4 | project_id, device_id | devices | project_id, id |
| retest_requests_ibfk_5 | project_id, assignee_membership_id | project_memberships | project_id, id |
| retest_requests_ibfk_6 | project_id, created_by | project_memberships | project_id, id |
| retest_requests_ibfk_7 | project_id, submitted_by | project_memberships | project_id, id |

## rule_versions

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| ruleset_id | bigint | NO | NULL / không khai báo | — | — |
| version_no | int | NO | NULL / không khai báo | — | — |
| content_json | json | NO | NULL / không khai báo | — | — |
| published_at | datetime(6) | YES | NULL / không khai báo | — | — |
| published_by | bigint | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| created_by | bigint | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_rv_created_by | INDEX | project_id, created_by |
| fk_rv_published_by | INDEX | project_id, published_by |
| PRIMARY | PRIMARY | id |
| uq_rule_version_project_id | UNIQUE | project_id, id |
| uq_rv_ruleset_id | UNIQUE | project_id, ruleset_id, id |
| uq_rv_ruleset_no | UNIQUE | project_id, ruleset_id, version_no |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_rv_created_by | project_id, created_by | project_memberships | project_id, id |
| fk_rv_published_by | project_id, published_by | project_memberships | project_id, id |
| fk_rv_ruleset | project_id, ruleset_id | rulesets | project_id, id |

## rulesets

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| code | varchar(32) | NO | NULL / không khai báo | — | — |
| name | varchar(100) | NO | NULL / không khai báo | — | — |
| active | tinyint(1) | NO | 1 | — | — |
| active_version_id | bigint | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_ruleset_active_version | INDEX | project_id, id, active_version_id |
| PRIMARY | PRIMARY | id |
| uq_ruleset_project_code | UNIQUE | project_id, code |
| uq_ruleset_project_id | UNIQUE | project_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_ruleset_active_version | project_id, id, active_version_id | rule_versions | project_id, ruleset_id, id |
| fk_ruleset_project | project_id | projects | id |

## run_item_assignments

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| run_item_id | bigint | NO | NULL / không khai báo | — | — |
| previous_membership_id | bigint | YES | NULL / không khai báo | — | — |
| assignee_membership_id | bigint | NO | NULL / không khai báo | — | — |
| assigned_by | bigint | NO | NULL / không khai báo | — | — |
| reason | varchar(500) | NO | NULL / không khai báo | — | — |
| assigned_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_assignment_actor | INDEX | project_id, assigned_by |
| fk_assignment_previous | INDEX | project_id, previous_membership_id |
| fk_assignment_target | INDEX | project_id, assignee_membership_id |
| ix_assignment_history | INDEX | project_id, run_item_id, id |
| PRIMARY | PRIMARY | id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_assignment_actor | project_id, assigned_by | project_memberships | project_id, id |
| fk_assignment_previous | project_id, previous_membership_id | project_memberships | project_id, id |
| fk_assignment_run | project_id, run_item_id | run_items | project_id, id |
| fk_assignment_target | project_id, assignee_membership_id | project_memberships | project_id, id |

## run_items

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| cycle_id | bigint | NO | NULL / không khai báo | — | — |
| configuration_id | bigint | NO | NULL / không khai báo | — | — |
| test_case_id | bigint | NO | NULL / không khai báo | — | — |
| revision_id | bigint | NO | NULL / không khai báo | — | — |
| assignee_membership_id | bigint | NO | NULL / không khai báo | — | — |
| latest_attempt_id | bigint | YES | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| scope_decision_id | bigint | YES | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_run_assignee | INDEX | project_id, assignee_membership_id |
| fk_run_latest_attempt | INDEX | project_id, id, latest_attempt_id |
| fk_run_revision | INDEX | project_id, test_case_id, revision_id |
| fk_run_scope_decision | INDEX | project_id, id, scope_decision_id |
| ix_run_assignee | INDEX | project_id, cycle_id, assignee_membership_id, id |
| PRIMARY | PRIMARY | id |
| uq_run_project_id | UNIQUE | project_id, id |
| uq_run_scope | UNIQUE | project_id, cycle_id, configuration_id, test_case_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_run_assignee | project_id, assignee_membership_id | project_memberships | project_id, id |
| fk_run_config | project_id, cycle_id, configuration_id | cycle_configurations | project_id, cycle_id, id |
| fk_run_latest_attempt | project_id, id, latest_attempt_id | execution_attempts | project_id, run_item_id, id |
| fk_run_revision | project_id, test_case_id, revision_id | test_case_revisions | project_id, test_case_id, id |
| fk_run_scope_decision | project_id, id, scope_decision_id | run_scope_decisions | project_id, run_item_id, id |

## run_scope_decisions

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| run_item_id | bigint | NO | NULL / không khai báo | — | — |
| excluded | tinyint(1) | NO | NULL / không khai báo | — | — |
| reason | varchar(1000) | NO | NULL / không khai báo | — | — |
| decided_by | bigint | NO | NULL / không khai báo | — | — |
| decided_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_scope_decision_actor | INDEX | project_id, decided_by |
| PRIMARY | PRIMARY | id |
| uq_scope_decision_run | UNIQUE | project_id, run_item_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_scope_decision_actor | project_id, decided_by | project_memberships | project_id, id |
| fk_scope_decision_run | project_id, run_item_id | run_items | project_id, id |

## spring_session

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| PRIMARY_ID | char(36) | NO | NULL / không khai báo | PRI | — |
| SESSION_ID | char(36) | NO | NULL / không khai báo | UNI | — |
| CREATION_TIME | bigint | NO | NULL / không khai báo | — | — |
| LAST_ACCESS_TIME | bigint | NO | NULL / không khai báo | — | — |
| MAX_INACTIVE_INTERVAL | int | NO | NULL / không khai báo | — | — |
| EXPIRY_TIME | bigint | NO | NULL / không khai báo | MUL | — |
| PRINCIPAL_NAME | varchar(100) | YES | NULL / không khai báo | MUL | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | PRIMARY_ID |
| SPRING_SESSION_IX1 | UNIQUE | SESSION_ID |
| SPRING_SESSION_IX2 | INDEX | EXPIRY_TIME |
| SPRING_SESSION_IX3 | INDEX | PRINCIPAL_NAME |

## spring_session_attributes

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| SESSION_PRIMARY_ID | char(36) | NO | NULL / không khai báo | PRI | — |
| ATTRIBUTE_NAME | varchar(200) | NO | NULL / không khai báo | PRI | — |
| ATTRIBUTE_BYTES | blob | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | SESSION_PRIMARY_ID, ATTRIBUTE_NAME |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| SPRING_SESSION_ATTRIBUTES_FK | SESSION_PRIMARY_ID | spring_session | PRIMARY_ID |

## test_case_revisions

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| test_case_id | bigint | NO | NULL / không khai báo | — | — |
| revision_no | int | NO | NULL / không khai báo | — | — |
| title_vi | varchar(255) | NO | NULL / không khai báo | — | — |
| preconditions_vi | text | YES | NULL / không khai báo | — | — |
| steps_vi | text | NO | NULL / không khai báo | — | — |
| expected_vi | text | NO | NULL / không khai báo | — | — |
| title_jp | varchar(255) | YES | NULL / không khai báo | — | — |
| preconditions_jp | text | YES | NULL / không khai báo | — | — |
| steps_jp | text | YES | NULL / không khai báo | — | — |
| expected_jp | text | YES | NULL / không khai báo | — | — |
| source_reference | varchar(255) | YES | NULL / không khai báo | — | — |
| translator_membership_id | bigint | YES | NULL / không khai báo | — | — |
| reviewer_membership_id | bigint | YES | NULL / không khai báo | — | — |
| approved_at | datetime(6) | YES | NULL / không khai báo | — | — |
| approved_by | bigint | YES | NULL / không khai báo | — | — |
| checksum | varchar(64) | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| created_by | bigint | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_tcr_approved_by | INDEX | project_id, approved_by |
| fk_tcr_created_by | INDEX | project_id, created_by |
| fk_tcr_reviewer | INDEX | project_id, reviewer_membership_id |
| fk_tcr_translator | INDEX | project_id, translator_membership_id |
| PRIMARY | PRIMARY | id |
| uq_tcr_case_id | UNIQUE | project_id, test_case_id, id |
| uq_tcr_case_revision_no | UNIQUE | project_id, test_case_id, revision_no |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_tcr_approved_by | project_id, approved_by | project_memberships | project_id, id |
| fk_tcr_case | project_id, test_case_id | test_cases | project_id, id |
| fk_tcr_created_by | project_id, created_by | project_memberships | project_id, id |
| fk_tcr_reviewer | project_id, reviewer_membership_id | project_memberships | project_id, id |
| fk_tcr_translator | project_id, translator_membership_id | project_memberships | project_id, id |

## test_cases

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| case_no | varchar(32) | NO | NULL / không khai báo | — | — |
| suite_id | bigint | NO | NULL / không khai báo | — | — |
| current_revision_id | bigint | YES | NULL / không khai báo | — | — |
| archived_at | datetime(6) | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_tc_current_revision | INDEX | project_id, id, current_revision_id |
| ix_tc_suite | INDEX | project_id, suite_id, id |
| PRIMARY | PRIMARY | id |
| uq_tc_project_case_no | UNIQUE | project_id, case_no |
| uq_tc_project_id | UNIQUE | project_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_tc_current_revision | project_id, id, current_revision_id | test_case_revisions | project_id, test_case_id, id |
| fk_tc_project | project_id | projects | id |
| fk_tc_suite | project_id, suite_id | test_suites | project_id, id |

## test_cycles

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| code | varchar(32) | NO | NULL / không khai báo | — | — |
| name | varchar(100) | NO | NULL / không khai báo | — | — |
| milestone_id | bigint | YES | NULL / không khai báo | — | — |
| status_code | varchar(16) | NO | DRAFT | MUL | — |
| lock_version | bigint | NO | 0 | — | — |
| activated_at | datetime(6) | YES | NULL / không khai báo | — | — |
| activated_by | bigint | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| created_by | bigint | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_cycle_activator | INDEX | project_id, activated_by |
| fk_cycle_creator | INDEX | project_id, created_by |
| fk_cycle_milestone | INDEX | project_id, milestone_id |
| fk_cycle_status | INDEX | status_code |
| ix_cycles_status | INDEX | project_id, status_code, id |
| PRIMARY | PRIMARY | id |
| uq_cycle_code | UNIQUE | project_id, code |
| uq_cycle_project_id | UNIQUE | project_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_cycle_activator | project_id, activated_by | project_memberships | project_id, id |
| fk_cycle_creator | project_id, created_by | project_memberships | project_id, id |
| fk_cycle_milestone | project_id, milestone_id | milestones | project_id, id |
| fk_cycle_project | project_id | projects | id |
| fk_cycle_status | status_code | cycle_statuses | code |

## test_suites

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| code | varchar(32) | NO | NULL / không khai báo | — | — |
| name | varchar(100) | NO | NULL / không khai báo | — | — |
| description | varchar(500) | YES | NULL / không khai báo | — | — |
| parent_id | bigint | YES | NULL / không khai báo | — | — |
| sort_order | int | NO | 0 | — | — |
| archived_at | datetime(6) | YES | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| ix_ts_parent | INDEX | project_id, parent_id, sort_order, id |
| PRIMARY | PRIMARY | id |
| uq_ts_project_code | UNIQUE | project_id, code |
| uq_ts_project_id | UNIQUE | project_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_ts_parent | project_id, parent_id | test_suites | project_id, id |
| fk_ts_project | project_id | projects | id |

## work_item_attachments

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | char(36) | NO | NULL / không khai báo | PRI | — |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| original_name | varchar(255) | NO | NULL / không khai báo | — | — |
| media_type | varchar(100) | NO | NULL / không khai báo | — | — |
| byte_size | bigint | NO | NULL / không khai báo | — | — |
| sha256 | char(64) | NO | NULL / không khai báo | — | — |
| uploaded_by | bigint | NO | NULL / không khai báo | — | — |
| uploaded_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_attachment_actor | INDEX | project_id, uploaded_by |
| ix_attachment_work | INDEX | project_id, work_item_id, uploaded_at, id |
| PRIMARY | PRIMARY | id |
| uq_attachment_bug | UNIQUE | project_id, work_item_id, id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_attachment_actor | project_id, uploaded_by | project_memberships | project_id, id |
| fk_attachment_work | project_id, work_item_id | work_items | project_id, id |

## work_item_clarifications

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| source_kind | varchar(16) | NO | NULL / không khai báo | — | — |
| source_reference | varchar(1000) | NO | NULL / không khai báo | — | — |
| confirmed_by | varchar(100) | NO | NULL / không khai báo | — | — |
| confirmed_at | datetime(6) | NO | NULL / không khai báo | — | — |
| conclusion | text | NO | NULL / không khai báo | — | — |
| recorded_by | bigint | NO | NULL / không khai báo | — | — |
| recorded_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_clarification_actor | INDEX | project_id, recorded_by |
| ix_clarification_work | INDEX | project_id, work_item_id, id |
| PRIMARY | PRIMARY | id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_clarification_actor | project_id, recorded_by | project_memberships | project_id, id |
| fk_clarification_work | project_id, work_item_id | work_items | project_id, id |

## work_item_comments

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| body | text | NO | NULL / không khai báo | — | — |
| visibility | varchar(16) | NO | INTERNAL | — | — |
| author_membership_id | bigint | NO | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| request_key | varchar(64) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_comment_actor | INDEX | project_id, author_membership_id |
| ix_comment_history | INDEX | project_id, work_item_id, id |
| PRIMARY | PRIMARY | id |
| uq_comment_request | UNIQUE | project_id, work_item_id, request_key |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_comment_actor | project_id, author_membership_id | project_memberships | project_id, id |
| fk_comment_work | project_id, work_item_id | work_items | project_id, id |

## work_item_execution_links

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| project_id | bigint | NO | NULL / không khai báo | PRI | — |
| work_item_id | bigint | NO | NULL / không khai báo | PRI | — |
| run_item_id | bigint | NO | NULL / không khai báo | — | — |
| attempt_id | bigint | NO | NULL / không khai báo | PRI | — |
| linked_by | bigint | NO | NULL / không khai báo | — | — |
| linked_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_work_link_actor | INDEX | project_id, linked_by |
| fk_work_link_attempt | INDEX | project_id, run_item_id, attempt_id |
| ix_work_link_attempt | INDEX | project_id, attempt_id, work_item_id |
| PRIMARY | PRIMARY | project_id, work_item_id, attempt_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_work_link_actor | project_id, linked_by | project_memberships | project_id, id |
| fk_work_link_attempt | project_id, run_item_id, attempt_id | execution_attempts | project_id, run_item_id, id |
| fk_work_link_bug | project_id, work_item_id | bug_details | project_id, work_item_id |

## work_item_external_references

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| provider | varchar(32) | NO | NULL / không khai báo | — | — |
| external_id | varchar(100) | NO | NULL / không khai báo | — | — |
| external_url | varchar(2048) | NO | NULL / không khai báo | — | — |
| reconciliation_status | varchar(32) | NO | UNRECONCILED | — | — |
| recorded_by | bigint | NO | NULL / không khai báo | — | — |
| recorded_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_external_actor | INDEX | project_id, recorded_by |
| fk_external_work | INDEX | project_id, work_item_id |
| PRIMARY | PRIMARY | id |
| uq_external_reference | UNIQUE | project_id, provider, external_id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_external_actor | project_id, recorded_by | project_memberships | project_id, id |
| fk_external_work | project_id, work_item_id | work_items | project_id, id |

## work_item_history

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| work_item_id | bigint | NO | NULL / không khai báo | — | — |
| event_type | varchar(32) | NO | NULL / không khai báo | — | — |
| from_status | varchar(32) | YES | NULL / không khai báo | MUL | — |
| to_status | varchar(32) | YES | NULL / không khai báo | MUL | — |
| reason | varchar(1000) | NO | NULL / không khai báo | — | — |
| details_json | json | NO | NULL / không khai báo | — | — |
| actor_membership_id | bigint | NO | NULL / không khai báo | — | — |
| occurred_at | datetime(6) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_work_history_actor | INDEX | project_id, actor_membership_id |
| fk_work_history_from | INDEX | from_status |
| fk_work_history_to | INDEX | to_status |
| ix_work_history | INDEX | project_id, work_item_id, id |
| PRIMARY | PRIMARY | id |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_work_history_actor | project_id, actor_membership_id | project_memberships | project_id, id |
| fk_work_history_from | from_status | work_item_statuses | code |
| fk_work_history_item | project_id, work_item_id | work_items | project_id, id |
| fk_work_history_to | to_status | work_item_statuses | code |

## work_item_policy_versions

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| code | varchar(32) | NO | NULL / không khai báo | PRI | — |
| name | varchar(100) | NO | NULL / không khai báo | — | — |
| definition_json | json | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | code |

## work_item_statuses

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| code | varchar(32) | NO | NULL / không khai báo | PRI | — |
| label_vi | varchar(80) | NO | NULL / không khai báo | — | — |
| color | char(7) | NO | NULL / không khai báo | — | — |
| sort_order | int | NO | NULL / không khai báo | — | — |
| terminal | tinyint(1) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| PRIMARY | PRIMARY | code |

## work_items

Engine: InnoDB; collation: utf8mb4_0900_ai_ci.

| Cột | Kiểu | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| id | bigint | NO | NULL / không khai báo | PRI | auto_increment |
| project_id | bigint | NO | NULL / không khai báo | MUL | — |
| item_no | bigint | NO | NULL / không khai báo | — | — |
| item_key | varchar(64) | NO | NULL / không khai báo | UNI | — |
| item_type | varchar(16) | NO | NULL / không khai báo | — | — |
| title | varchar(300) | NO | NULL / không khai báo | — | — |
| description | text | NO | NULL / không khai báo | — | — |
| status_code | varchar(32) | NO | open | MUL | — |
| priority_code | varchar(16) | NO | MEDIUM | — | — |
| category_id | bigint | YES | NULL / không khai báo | — | — |
| milestone_id | bigint | YES | NULL / không khai báo | — | — |
| assignee_membership_id | bigint | YES | NULL / không khai báo | — | — |
| lock_version | bigint | NO | 0 | — | — |
| created_by | bigint | NO | NULL / không khai báo | — | — |
| updated_by | bigint | NO | NULL / không khai báo | — | — |
| created_at | datetime(6) | NO | NULL / không khai báo | — | — |
| updated_at | datetime(6) | NO | NULL / không khai báo | — | — |
| request_key | varchar(64) | NO | NULL / không khai báo | — | — |
| request_checksum | char(64) | NO | NULL / không khai báo | — | — |

| Index / constraint | Loại | Cột theo thứ tự |
| --- | --- | --- |
| fk_work_category | INDEX | project_id, category_id |
| fk_work_creator | INDEX | project_id, created_by |
| fk_work_editor | INDEX | project_id, updated_by |
| fk_work_milestone | INDEX | project_id, milestone_id |
| fk_work_status | INDEX | status_code |
| ix_work_assignee | INDEX | project_id, assignee_membership_id, id |
| ix_work_board | INDEX | project_id, status_code, updated_at, id |
| ix_work_type | INDEX | project_id, item_type, updated_at, id |
| PRIMARY | PRIMARY | id |
| uq_work_key | UNIQUE | item_key |
| uq_work_number | UNIQUE | project_id, item_no |
| uq_work_project_id | UNIQUE | project_id, id |
| uq_work_project_id_type | UNIQUE | project_id, id, item_type |
| uq_work_request | UNIQUE | project_id, request_key |

| FK | Cột nguồn | Bảng đích | Cột đích |
| --- | --- | --- | --- |
| fk_work_assignee | project_id, assignee_membership_id | project_memberships | project_id, id |
| fk_work_category | project_id, category_id | categories | project_id, id |
| fk_work_creator | project_id, created_by | project_memberships | project_id, id |
| fk_work_editor | project_id, updated_by | project_memberships | project_id, id |
| fk_work_milestone | project_id, milestone_id | milestones | project_id, id |
| fk_work_project | project_id | projects | id |
| fk_work_status | status_code | work_item_statuses | code |

## Bổ sung V21 — quyết định vòng đời dự án

Bảng project_lifecycle_decisions (không thay projects.archived_at):

| Cột | Ý nghĩa / ràng buộc |
| --- | --- |
| id | BIGINT tự tăng, khóa chính |
| project_id | FK projects.id; phạm vi lệnh và lịch sử |
| action | ASCII phân biệt hoa thường, ARCHIVE hoặc REOPEN |
| reason | VARCHAR(2000), không trống sau trim; lý do người thực hiện |
| expected_version | Phiên bản dự án khi xác nhận, không âm |
| result_version | expected_version + 1; unique cùng project_id |
| request_key | ASCII VARCHAR(100), unique cùng project_id; service kiểm tra 8–100 ký tự chữ/số/gạch dưới/gạch ngang |
| payload_hash | SHA-256 của action/version/lý do chuẩn hóa; kiểm tra retry |
| actor_id | FK identity_users.id; tài khoản ADMIN hiện hành lúc lệnh được nhận |
| decided_at | DATETIME(6) UTC, thời điểm quyết định |

Chỉ thêm bản ghi; không endpoint sửa/xóa quyết định. GET history không trả request_key hoặc payload_hash. Dự án tăng lock_version và ghi project_audit trong cùng transaction. Lệnh lặp cùng actor/payload trả trạng thái hiện hành; lệnh khác dùng lại key bị 409. Archive không xóa dòng ở bảng nghiệp vụ con.
