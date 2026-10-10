-- Schema snapshot V11 for MySQL Workbench reverse engineering. No row data.
-- DO NOT run this against the application database; use Flyway for installation/upgrades.

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SPRING_SESSION` (
  `PRIMARY_ID` char(36) NOT NULL,
  `SESSION_ID` char(36) NOT NULL,
  `CREATION_TIME` bigint NOT NULL,
  `LAST_ACCESS_TIME` bigint NOT NULL,
  `MAX_INACTIVE_INTERVAL` int NOT NULL,
  `EXPIRY_TIME` bigint NOT NULL,
  `PRINCIPAL_NAME` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`PRIMARY_ID`),
  UNIQUE KEY `SPRING_SESSION_IX1` (`SESSION_ID`),
  KEY `SPRING_SESSION_IX2` (`EXPIRY_TIME`),
  KEY `SPRING_SESSION_IX3` (`PRINCIPAL_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SPRING_SESSION_ATTRIBUTES` (
  `SESSION_PRIMARY_ID` char(36) NOT NULL,
  `ATTRIBUTE_NAME` varchar(200) NOT NULL,
  `ATTRIBUTE_BYTES` blob NOT NULL,
  PRIMARY KEY (`SESSION_PRIMARY_ID`,`ATTRIBUTE_NAME`),
  CONSTRAINT `SPRING_SESSION_ATTRIBUTES_FK` FOREIGN KEY (`SESSION_PRIMARY_ID`) REFERENCES `SPRING_SESSION` (`PRIMARY_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_info` (
  `id` smallint NOT NULL,
  `system_key` varchar(32) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `installed_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_application_system_key` (`system_key`),
  CONSTRAINT `ck_application_singleton` CHECK ((`id` = 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_closure_decisions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `decision_kind` varchar(20) NOT NULL,
  `reason` varchar(1000) NOT NULL,
  `evidence_attachment_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `source_reference` varchar(1000) NOT NULL,
  `coverage_revision_id` bigint DEFAULT NULL,
  `round_no` bigint NOT NULL,
  `build_id` bigint DEFAULT NULL,
  `decided_by` bigint NOT NULL,
  `decided_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`,`work_item_id`,`evidence_attachment_id`),
  KEY `project_id_2` (`project_id`,`work_item_id`,`coverage_revision_id`),
  KEY `project_id_3` (`project_id`,`build_id`),
  KEY `project_id_4` (`project_id`,`decided_by`),
  KEY `ix_closure_history` (`project_id`,`work_item_id`,`id`),
  CONSTRAINT `bug_closure_decisions_ibfk_1` FOREIGN KEY (`project_id`, `work_item_id`) REFERENCES `bug_details` (`project_id`, `work_item_id`),
  CONSTRAINT `bug_closure_decisions_ibfk_2` FOREIGN KEY (`project_id`, `work_item_id`, `evidence_attachment_id`) REFERENCES `work_item_attachments` (`project_id`, `work_item_id`, `id`),
  CONSTRAINT `bug_closure_decisions_ibfk_3` FOREIGN KEY (`project_id`, `work_item_id`, `coverage_revision_id`) REFERENCES `bug_coverage_revisions` (`project_id`, `work_item_id`, `id`),
  CONSTRAINT `bug_closure_decisions_ibfk_4` FOREIGN KEY (`project_id`, `build_id`) REFERENCES `builds` (`project_id`, `id`),
  CONSTRAINT `bug_closure_decisions_ibfk_5` FOREIGN KEY (`project_id`, `decided_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `bug_closure_decisions_chk_1` CHECK ((`decision_kind` in (_utf8mb4'FIXED',_utf8mb4'UNREPRODUCIBLE',_utf8mb4'WONTFIX',_utf8mb4'REOPEN'))),
  CONSTRAINT `bug_closure_decisions_chk_2` CHECK ((char_length(trim(`reason`)) > 0)),
  CONSTRAINT `bug_closure_decisions_chk_3` CHECK (((`decision_kind` not in (_utf8mb4'UNREPRODUCIBLE',_utf8mb4'WONTFIX')) or ((`evidence_attachment_id` is not null) and (char_length(trim(`source_reference`)) > 0))))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_coverage_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `coverage_revision_id` bigint NOT NULL,
  `run_item_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coverage_revision_id` (`coverage_revision_id`,`run_item_id`),
  UNIQUE KEY `project_id` (`project_id`,`work_item_id`,`coverage_revision_id`,`id`),
  UNIQUE KEY `project_id_2` (`project_id`,`work_item_id`,`coverage_revision_id`,`id`,`run_item_id`),
  KEY `project_id_3` (`project_id`,`run_item_id`),
  CONSTRAINT `bug_coverage_items_ibfk_1` FOREIGN KEY (`project_id`, `work_item_id`, `coverage_revision_id`) REFERENCES `bug_coverage_revisions` (`project_id`, `work_item_id`, `id`),
  CONSTRAINT `bug_coverage_items_ibfk_2` FOREIGN KEY (`project_id`, `run_item_id`) REFERENCES `run_items` (`project_id`, `id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_coverage_revisions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `revision_no` bigint NOT NULL,
  `round_no` bigint NOT NULL,
  `build_id` bigint NOT NULL,
  `reason` varchar(1000) NOT NULL,
  `created_by` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`,`work_item_id`,`id`),
  UNIQUE KEY `project_id_2` (`project_id`,`work_item_id`,`revision_no`),
  KEY `project_id_3` (`project_id`,`build_id`),
  KEY `project_id_4` (`project_id`,`created_by`),
  CONSTRAINT `bug_coverage_revisions_ibfk_1` FOREIGN KEY (`project_id`, `work_item_id`) REFERENCES `bug_details` (`project_id`, `work_item_id`),
  CONSTRAINT `bug_coverage_revisions_ibfk_2` FOREIGN KEY (`project_id`, `build_id`) REFERENCES `builds` (`project_id`, `id`),
  CONSTRAINT `bug_coverage_revisions_ibfk_3` FOREIGN KEY (`project_id`, `created_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `bug_coverage_revisions_chk_1` CHECK (((`revision_no` > 0) and (`round_no` > 0) and (char_length(trim(`reason`)) > 0)))
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_details` (
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `item_type` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'BUG',
  `policy_version` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `steps` text NOT NULL,
  `expected_result` text NOT NULL,
  `actual_result` text NOT NULL,
  `build_id` bigint NOT NULL,
  `environment_id` bigint NOT NULL,
  `device_id` bigint NOT NULL,
  `test_case_id` bigint DEFAULT NULL,
  `revision_id` bigint DEFAULT NULL,
  `standalone_reason` varchar(1000) NOT NULL,
  `fixed_build_id` bigint DEFAULT NULL,
  `context_snapshot` json NOT NULL,
  `rule_version_id` bigint DEFAULT NULL,
  PRIMARY KEY (`project_id`,`work_item_id`),
  KEY `fk_bug_work` (`project_id`,`work_item_id`,`item_type`),
  KEY `fk_bug_policy` (`policy_version`),
  KEY `fk_bug_build` (`project_id`,`build_id`),
  KEY `fk_bug_fixed_build` (`project_id`,`fixed_build_id`),
  KEY `fk_bug_env` (`project_id`,`environment_id`),
  KEY `fk_bug_device` (`project_id`,`device_id`),
  KEY `fk_bug_revision` (`project_id`,`test_case_id`,`revision_id`),
  KEY `fk_bug_rule_version` (`project_id`,`rule_version_id`),
  CONSTRAINT `fk_bug_build` FOREIGN KEY (`project_id`, `build_id`) REFERENCES `builds` (`project_id`, `id`),
  CONSTRAINT `fk_bug_device` FOREIGN KEY (`project_id`, `device_id`) REFERENCES `devices` (`project_id`, `id`),
  CONSTRAINT `fk_bug_env` FOREIGN KEY (`project_id`, `environment_id`) REFERENCES `environments` (`project_id`, `id`),
  CONSTRAINT `fk_bug_fixed_build` FOREIGN KEY (`project_id`, `fixed_build_id`) REFERENCES `builds` (`project_id`, `id`),
  CONSTRAINT `fk_bug_policy` FOREIGN KEY (`policy_version`) REFERENCES `work_item_policy_versions` (`code`),
  CONSTRAINT `fk_bug_revision` FOREIGN KEY (`project_id`, `test_case_id`, `revision_id`) REFERENCES `test_case_revisions` (`project_id`, `test_case_id`, `id`),
  CONSTRAINT `fk_bug_rule_version` FOREIGN KEY (`project_id`, `rule_version_id`) REFERENCES `rule_versions` (`project_id`, `id`),
  CONSTRAINT `fk_bug_work` FOREIGN KEY (`project_id`, `work_item_id`, `item_type`) REFERENCES `work_items` (`project_id`, `id`, `item_type`),
  CONSTRAINT `ck_bug_source` CHECK ((((`test_case_id` is not null) and (`revision_id` is not null)) or ((`test_case_id` is null) and (`revision_id` is null) and (char_length(trim(`standalone_reason`)) > 0)))),
  CONSTRAINT `ck_bug_text` CHECK (((char_length(trim(`steps`)) > 0) and (char_length(trim(`expected_result`)) > 0) and (char_length(trim(`actual_result`)) > 0))),
  CONSTRAINT `ck_bug_type` CHECK ((`item_type` = _ascii'BUG'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_retest_state` (
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `round_no` bigint NOT NULL DEFAULT '0',
  `current_coverage_id` bigint DEFAULT NULL,
  PRIMARY KEY (`project_id`,`work_item_id`),
  KEY `project_id` (`project_id`,`work_item_id`,`current_coverage_id`),
  CONSTRAINT `bug_retest_state_ibfk_1` FOREIGN KEY (`project_id`, `work_item_id`) REFERENCES `bug_details` (`project_id`, `work_item_id`),
  CONSTRAINT `bug_retest_state_ibfk_2` FOREIGN KEY (`project_id`, `work_item_id`, `current_coverage_id`) REFERENCES `bug_coverage_revisions` (`project_id`, `work_item_id`, `id`),
  CONSTRAINT `bug_retest_state_chk_1` CHECK ((`round_no` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_verification_attempts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `request_id` bigint NOT NULL,
  `coverage_item_id` bigint NOT NULL,
  `run_item_id` bigint NOT NULL,
  `verdict` varchar(8) NOT NULL,
  `actual_result` text NOT NULL,
  `evidence_attachment_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `execution_attempt_id` bigint DEFAULT NULL,
  `verified_by` bigint NOT NULL,
  `verified_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`,`request_id`,`coverage_item_id`),
  KEY `project_id_2` (`project_id`,`work_item_id`,`request_id`,`coverage_item_id`,`run_item_id`),
  KEY `project_id_3` (`project_id`,`work_item_id`,`evidence_attachment_id`),
  KEY `project_id_4` (`project_id`,`run_item_id`,`execution_attempt_id`),
  KEY `project_id_5` (`project_id`,`verified_by`),
  KEY `ix_verification_latest` (`project_id`,`work_item_id`,`coverage_item_id`,`id`),
  CONSTRAINT `bug_verification_attempts_ibfk_1` FOREIGN KEY (`project_id`, `work_item_id`, `request_id`, `coverage_item_id`, `run_item_id`) REFERENCES `retest_request_items` (`project_id`, `work_item_id`, `request_id`, `coverage_item_id`, `run_item_id`),
  CONSTRAINT `bug_verification_attempts_ibfk_2` FOREIGN KEY (`project_id`, `work_item_id`, `evidence_attachment_id`) REFERENCES `work_item_attachments` (`project_id`, `work_item_id`, `id`),
  CONSTRAINT `bug_verification_attempts_ibfk_3` FOREIGN KEY (`project_id`, `run_item_id`, `execution_attempt_id`) REFERENCES `execution_attempts` (`project_id`, `run_item_id`, `id`),
  CONSTRAINT `bug_verification_attempts_ibfk_4` FOREIGN KEY (`project_id`, `verified_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `bug_verification_attempts_chk_1` CHECK ((`verdict` in (_utf8mb4'PASS',_utf8mb4'FAIL'))),
  CONSTRAINT `bug_verification_attempts_chk_2` CHECK ((char_length(trim(`actual_result`)) > 0))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `builds` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `version_label` varchar(50) NOT NULL,
  `build_number` varchar(50) DEFAULT NULL,
  `platform` varchar(32) NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `released_at` date DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `archived_at` datetime(6) DEFAULT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_build_project_id` (`project_id`,`id`),
  UNIQUE KEY `uq_build_project_ver` (`project_id`,`platform`,`version_label`,`build_number`),
  KEY `ix_build_released` (`project_id`,`released_at`,`id`),
  CONSTRAINT `fk_build_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `code` varchar(32) NOT NULL,
  `name` varchar(100) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cat_project_code` (`project_id`,`code`),
  UNIQUE KEY `uq_cat_project_id` (`project_id`,`id`),
  CONSTRAINT `fk_cat_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cycle_configurations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `cycle_id` bigint NOT NULL,
  `environment_id` bigint NOT NULL,
  `device_id` bigint NOT NULL,
  `default_build_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_config_scope` (`project_id`,`cycle_id`,`environment_id`,`device_id`),
  UNIQUE KEY `uq_config_cycle_id` (`project_id`,`cycle_id`,`id`),
  KEY `fk_config_env` (`project_id`,`environment_id`),
  KEY `fk_config_device` (`project_id`,`device_id`),
  KEY `fk_config_build` (`project_id`,`default_build_id`),
  CONSTRAINT `fk_config_build` FOREIGN KEY (`project_id`, `default_build_id`) REFERENCES `builds` (`project_id`, `id`),
  CONSTRAINT `fk_config_cycle` FOREIGN KEY (`project_id`, `cycle_id`) REFERENCES `test_cycles` (`project_id`, `id`),
  CONSTRAINT `fk_config_device` FOREIGN KEY (`project_id`, `device_id`) REFERENCES `devices` (`project_id`, `id`),
  CONSTRAINT `fk_config_env` FOREIGN KEY (`project_id`, `environment_id`) REFERENCES `environments` (`project_id`, `id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cycle_decisions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `cycle_id` bigint NOT NULL,
  `action` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reason` varchar(1000) NOT NULL,
  `outstanding_reason` varchar(2000) NOT NULL,
  `scope_snapshot` json NOT NULL,
  `decided_by` bigint NOT NULL,
  `decided_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_cycle_decision_actor` (`project_id`,`decided_by`),
  KEY `ix_cycle_decision_history` (`project_id`,`cycle_id`,`id`),
  CONSTRAINT `fk_cycle_decision_actor` FOREIGN KEY (`project_id`, `decided_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_cycle_decision_cycle` FOREIGN KEY (`project_id`, `cycle_id`) REFERENCES `test_cycles` (`project_id`, `id`),
  CONSTRAINT `ck_cycle_decision_action` CHECK ((`action` in (_utf8mb4'CLOSE',_utf8mb4'REOPEN'))),
  CONSTRAINT `ck_cycle_decision_reason` CHECK ((char_length(trim(`reason`)) > 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cycle_statuses` (
  `code` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `label_vi` varchar(50) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `code` varchar(32) NOT NULL,
  `name` varchar(100) NOT NULL,
  `model` varchar(100) DEFAULT NULL,
  `os_name` varchar(50) DEFAULT NULL,
  `os_version` varchar(50) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_device_project_code` (`project_id`,`code`),
  UNIQUE KEY `uq_device_project_id` (`project_id`,`id`),
  CONSTRAINT `fk_device_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `environments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `code` varchar(32) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_env_project_code` (`project_id`,`code`),
  UNIQUE KEY `uq_env_project_id` (`project_id`,`id`),
  CONSTRAINT `fk_env_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `execution_attempts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `run_item_id` bigint NOT NULL,
  `attempt_no` int NOT NULL,
  `result_code` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `build_id` bigint NOT NULL,
  `executor_membership_id` bigint NOT NULL,
  `executed_at` datetime(6) NOT NULL,
  `actual_result` text NOT NULL,
  `reason` varchar(1000) NOT NULL,
  `evidence_reference` varchar(1000) NOT NULL,
  `context_snapshot` json NOT NULL,
  `request_key` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_checksum` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attempt_no` (`project_id`,`run_item_id`,`attempt_no`),
  UNIQUE KEY `uq_attempt_run_id` (`project_id`,`run_item_id`,`id`),
  UNIQUE KEY `uq_attempt_request` (`project_id`,`request_key`),
  KEY `fk_attempt_result` (`result_code`),
  KEY `fk_attempt_executor` (`project_id`,`executor_membership_id`),
  KEY `ix_attempt_pending_bug` (`project_id`,`result_code`,`id`),
  KEY `ix_attempt_history` (`project_id`,`run_item_id`,`executed_at`,`id`),
  KEY `ix_attempt_build_run` (`project_id`,`build_id`,`run_item_id`,`attempt_no`),
  CONSTRAINT `fk_attempt_build` FOREIGN KEY (`project_id`, `build_id`) REFERENCES `builds` (`project_id`, `id`),
  CONSTRAINT `fk_attempt_executor` FOREIGN KEY (`project_id`, `executor_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_attempt_result` FOREIGN KEY (`result_code`) REFERENCES `execution_results` (`code`),
  CONSTRAINT `fk_attempt_run` FOREIGN KEY (`project_id`, `run_item_id`) REFERENCES `run_items` (`project_id`, `id`),
  CONSTRAINT `ck_attempt_actual` CHECK (((`result_code` <> _ascii'NG') or (char_length(trim(`actual_result`)) > 0))),
  CONSTRAINT `ck_attempt_no` CHECK ((`attempt_no` > 0)),
  CONSTRAINT `ck_attempt_reason` CHECK (((`result_code` <> _ascii'P') or (char_length(trim(`reason`)) > 0)))
) ENGINE=InnoDB AUTO_INCREMENT=189 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `execution_results` (
  `code` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `label_vi` varchar(50) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flyway_schema_history` (
  `installed_rank` int NOT NULL,
  `version` varchar(50) DEFAULT NULL,
  `description` varchar(200) NOT NULL,
  `type` varchar(20) NOT NULL,
  `script` varchar(1000) NOT NULL,
  `checksum` int DEFAULT NULL,
  `installed_by` varchar(100) NOT NULL,
  `installed_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `execution_time` int NOT NULL,
  `success` tinyint(1) NOT NULL,
  PRIMARY KEY (`installed_rank`),
  KEY `flyway_schema_history_s_idx` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `foundation_checks` (
  `id` varchar(36) NOT NULL,
  `message` varchar(160) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_foundation_checks_created` (`created_at`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `identity_audit` (
  `id` varchar(36) NOT NULL,
  `actor_id` varchar(36) DEFAULT NULL,
  `subject_id` varchar(36) DEFAULT NULL,
  `event_code` varchar(40) NOT NULL,
  `request_id` varchar(64) NOT NULL,
  `occurred_at` datetime(6) NOT NULL,
  `project_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_identity_audit_actor` (`actor_id`),
  KEY `ix_identity_audit_subject` (`subject_id`,`occurred_at`),
  KEY `fk_audit_project` (`project_id`),
  CONSTRAINT `fk_audit_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_identity_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `identity_users` (`id`),
  CONSTRAINT `fk_identity_audit_subject` FOREIGN KEY (`subject_id`) REFERENCES `identity_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `identity_login_buckets` (
  `bucket_key` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `attempts` int NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  PRIMARY KEY (`bucket_key`),
  KEY `ix_identity_login_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `identity_roles` (
  `code` varchar(16) NOT NULL,
  `display_name` varchar(80) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `identity_users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_code` varchar(16) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `can_create_users` tinyint(1) NOT NULL DEFAULT '0',
  `lock_version` bigint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_identity_username` (`username`),
  KEY `fk_identity_role` (`role_code`),
  KEY `ix_identity_users_created` (`created_at`,`id`),
  CONSTRAINT `fk_identity_role` FOREIGN KEY (`role_code`) REFERENCES `identity_roles` (`code`),
  CONSTRAINT `ck_identity_delegation` CHECK (((`role_code` = _utf8mb4'PM') or (`can_create_users` = false)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_batches` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_checksum` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'PREVIEW',
  `mapping_version` varchar(32) NOT NULL DEFAULT '1.0',
  `total_rows` int NOT NULL DEFAULT '0',
  `valid_rows` int NOT NULL DEFAULT '0',
  `error_rows` int NOT NULL DEFAULT '0',
  `staged_expires_at` datetime(6) NOT NULL,
  `committed_at` datetime(6) DEFAULT NULL,
  `imported_by` varchar(36) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ib_project_id` (`project_id`,`id`),
  KEY `fk_ib_user` (`imported_by`),
  KEY `ix_ib_created` (`project_id`,`created_at`,`id`),
  KEY `ix_import_dedup` (`project_id`,`file_checksum`,`imported_by`),
  CONSTRAINT `fk_ib_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_ib_user` FOREIGN KEY (`imported_by`) REFERENCES `identity_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_rows` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `batch_id` bigint NOT NULL,
  `source_row_number` int NOT NULL,
  `source_case_key` varchar(64) DEFAULT NULL,
  `suite_code` varchar(32) DEFAULT NULL,
  `raw_data_json` json NOT NULL,
  `error_message` varchar(500) DEFAULT NULL,
  `is_valid` tinyint(1) NOT NULL DEFAULT '1',
  `target_case_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ir_batch_row` (`batch_id`,`source_row_number`),
  KEY `fk_ir_batch` (`project_id`,`batch_id`),
  KEY `fk_ir_case` (`project_id`,`target_case_id`),
  CONSTRAINT `fk_ir_batch` FOREIGN KEY (`project_id`, `batch_id`) REFERENCES `import_batches` (`project_id`, `id`),
  CONSTRAINT `fk_ir_case` FOREIGN KEY (`project_id`, `target_case_id`) REFERENCES `test_cases` (`project_id`, `id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `milestones` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `code` varchar(32) NOT NULL,
  `name` varchar(100) NOT NULL,
  `starts_on` date DEFAULT NULL,
  `due_on` date DEFAULT NULL,
  `archived_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ms_project_code` (`project_id`,`code`),
  UNIQUE KEY `uq_ms_project_id` (`project_id`,`id`),
  KEY `ix_ms_due` (`project_id`,`due_on`,`id`),
  CONSTRAINT `fk_ms_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_audit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `actor_id` varchar(36) NOT NULL,
  `entity_type` varchar(32) NOT NULL,
  `entity_id` bigint NOT NULL,
  `action` varchar(32) NOT NULL,
  `occurred_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_project_audit_actor` (`actor_id`),
  KEY `ix_project_audit_history` (`project_id`,`entity_type`,`entity_id`,`id`),
  CONSTRAINT `fk_project_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `identity_users` (`id`),
  CONSTRAINT `fk_project_audit_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=950 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_counters` (
  `project_id` bigint NOT NULL,
  `counter_code` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `next_value` bigint NOT NULL DEFAULT '1',
  PRIMARY KEY (`project_id`,`counter_code`),
  CONSTRAINT `fk_counter_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_memberships` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `project_role` varchar(16) NOT NULL DEFAULT 'MEMBER',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_membership_project_user` (`project_id`,`user_id`),
  UNIQUE KEY `uq_membership_project_id` (`project_id`,`id`),
  KEY `ix_membership_user` (`user_id`,`active`,`project_id`),
  CONSTRAINT `fk_membership_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_membership_user` FOREIGN KEY (`user_id`) REFERENCES `identity_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_resources` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `code` varchar(32) NOT NULL,
  `resource_type` varchar(32) NOT NULL,
  `name` varchar(100) NOT NULL,
  `current_revision_id` bigint DEFAULT NULL,
  `archived_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_res_project_code` (`project_id`,`code`),
  UNIQUE KEY `uq_res_project_id` (`project_id`,`id`),
  KEY `ix_res_type` (`project_id`,`resource_type`,`updated_at`,`id`),
  KEY `fk_res_current_revision` (`project_id`,`id`,`current_revision_id`),
  CONSTRAINT `fk_res_current_revision` FOREIGN KEY (`project_id`, `id`, `current_revision_id`) REFERENCES `resource_revisions` (`project_id`, `resource_id`, `id`),
  CONSTRAINT `fk_res_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `timezone` varchar(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  `archived_at` datetime(6) DEFAULT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  `created_by` varchar(36) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `updated_by` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_projects_code` (`code`),
  KEY `fk_projects_created_by` (`created_by`),
  KEY `fk_projects_updated_by` (`updated_by`),
  CONSTRAINT `fk_projects_created_by` FOREIGN KEY (`created_by`) REFERENCES `identity_users` (`id`),
  CONSTRAINT `fk_projects_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `identity_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `redmine_bindings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `correlation_marker` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `instance_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `configuration_json` json NOT NULL,
  `external_issue_id` bigint DEFAULT NULL,
  `create_attempted` tinyint(1) NOT NULL DEFAULT '0',
  `delivered_source_version` bigint DEFAULT NULL,
  `delivered_fingerprint` char(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `delivered_payload` json DEFAULT NULL,
  `observed_fingerprint` char(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `observed_payload` json DEFAULT NULL,
  `observed_at` datetime(6) DEFAULT NULL,
  `created_by` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_redmine_binding_work` (`project_id`,`work_item_id`),
  UNIQUE KEY `uq_redmine_binding_scope` (`project_id`,`work_item_id`,`id`),
  UNIQUE KEY `uq_redmine_marker` (`correlation_marker`),
  UNIQUE KEY `uq_redmine_remote` (`instance_hash`,`external_issue_id`),
  KEY `fk_redmine_binding_actor` (`project_id`,`created_by`),
  CONSTRAINT `fk_redmine_binding_actor` FOREIGN KEY (`project_id`, `created_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_redmine_binding_work` FOREIGN KEY (`project_id`, `work_item_id`) REFERENCES `work_items` (`project_id`, `id`),
  CONSTRAINT `ck_redmine_create_attempted` CHECK ((`create_attempted` in (0,1))),
  CONSTRAINT `ck_redmine_remote_id` CHECK (((`external_issue_id` is null) or (`external_issue_id` > 0)))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `redmine_delivery_attempts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `outbox_id` bigint NOT NULL,
  `attempt_no` int NOT NULL,
  `lease_key` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `outcome` varchar(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `error_code` varchar(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `http_status` smallint DEFAULT NULL,
  `actor_membership_id` bigint NOT NULL,
  `reason` varchar(1000) NOT NULL,
  `occurred_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_redmine_attempt` (`project_id`,`outbox_id`,`lease_key`),
  KEY `fk_redmine_attempt_actor` (`project_id`,`actor_membership_id`),
  KEY `ix_redmine_attempt_history` (`project_id`,`outbox_id`,`id`),
  CONSTRAINT `fk_redmine_attempt_actor` FOREIGN KEY (`project_id`, `actor_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_redmine_attempt_job` FOREIGN KEY (`project_id`, `outbox_id`) REFERENCES `redmine_outbox` (`project_id`, `id`),
  CONSTRAINT `ck_redmine_attempt_no` CHECK ((`attempt_no` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `redmine_outbox` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `binding_id` bigint NOT NULL,
  `operation` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` varchar(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'QUEUED',
  `source_version` bigint NOT NULL,
  `payload_json` json NOT NULL,
  `payload_checksum` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `expected_remote_fingerprint` char(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `request_key` varchar(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_checksum` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reason` varchar(1000) NOT NULL,
  `created_by` bigint NOT NULL,
  `dispatch_by` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `attempt_count` int NOT NULL DEFAULT '0',
  `max_attempts` int NOT NULL DEFAULT '5',
  `next_attempt_at` datetime(6) NOT NULL,
  `lease_key` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `lease_until` datetime(6) DEFAULT NULL,
  `reconcile_only` tinyint(1) NOT NULL DEFAULT '0',
  `error_code` varchar(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `http_status` smallint DEFAULT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  `active_binding` bigint GENERATED ALWAYS AS ((case when (`status` in (_ascii'QUEUED',_ascii'RUNNING',_ascii'RETRY_WAIT',_ascii'UNCERTAIN',_ascii'CONFLICT')) then `binding_id` else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_redmine_request` (`project_id`,`request_key`),
  UNIQUE KEY `uq_redmine_outbox_scope` (`project_id`,`id`),
  UNIQUE KEY `uq_redmine_active` (`active_binding`),
  KEY `fk_redmine_outbox_binding` (`project_id`,`work_item_id`,`binding_id`),
  KEY `fk_redmine_outbox_actor` (`project_id`,`created_by`),
  KEY `fk_redmine_outbox_dispatch_actor` (`project_id`,`dispatch_by`),
  KEY `ix_redmine_dispatch` (`status`,`next_attempt_at`,`id`),
  KEY `ix_redmine_expired_lease` (`status`,`lease_until`,`id`),
  KEY `ix_redmine_work_history` (`project_id`,`work_item_id`,`id`),
  CONSTRAINT `fk_redmine_outbox_actor` FOREIGN KEY (`project_id`, `created_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_redmine_outbox_binding` FOREIGN KEY (`project_id`, `work_item_id`, `binding_id`) REFERENCES `redmine_bindings` (`project_id`, `work_item_id`, `id`),
  CONSTRAINT `fk_redmine_outbox_dispatch_actor` FOREIGN KEY (`project_id`, `dispatch_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `ck_redmine_attempt_count` CHECK (((`attempt_count` >= 0) and (`max_attempts` > 0))),
  CONSTRAINT `ck_redmine_delivery_status` CHECK ((`status` in (_utf8mb4'QUEUED',_utf8mb4'RUNNING',_utf8mb4'RETRY_WAIT',_utf8mb4'UNCERTAIN',_utf8mb4'DELIVERED',_utf8mb4'FAILED',_utf8mb4'CONFLICT',_utf8mb4'SUPERSEDED'))),
  CONSTRAINT `ck_redmine_operation` CHECK ((`operation` in (_utf8mb4'PUBLISH',_utf8mb4'RECONCILE'))),
  CONSTRAINT `ck_redmine_reason` CHECK ((char_length(trim(`reason`)) > 0)),
  CONSTRAINT `ck_redmine_reconcile` CHECK ((`reconcile_only` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource_revisions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `resource_id` bigint NOT NULL,
  `revision_no` int NOT NULL,
  `content_html` text NOT NULL,
  `visibility` varchar(16) NOT NULL DEFAULT 'INTERNAL',
  `edited_by` bigint NOT NULL,
  `published_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rr_resource_no` (`project_id`,`resource_id`,`revision_no`),
  UNIQUE KEY `uq_rr_resource_id` (`project_id`,`resource_id`,`id`),
  KEY `fk_rr_edited_by` (`project_id`,`edited_by`),
  CONSTRAINT `fk_rr_edited_by` FOREIGN KEY (`project_id`, `edited_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_rr_resource` FOREIGN KEY (`project_id`, `resource_id`) REFERENCES `project_resources` (`project_id`, `id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `retest_request_items` (
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `coverage_revision_id` bigint NOT NULL,
  `request_id` bigint NOT NULL,
  `coverage_item_id` bigint NOT NULL,
  `run_item_id` bigint NOT NULL,
  PRIMARY KEY (`project_id`,`request_id`,`coverage_item_id`),
  UNIQUE KEY `project_id` (`project_id`,`work_item_id`,`request_id`,`coverage_item_id`,`run_item_id`),
  KEY `project_id_2` (`project_id`,`work_item_id`,`coverage_revision_id`,`request_id`),
  KEY `project_id_3` (`project_id`,`work_item_id`,`coverage_revision_id`,`coverage_item_id`,`run_item_id`),
  CONSTRAINT `retest_request_items_ibfk_1` FOREIGN KEY (`project_id`, `work_item_id`, `coverage_revision_id`, `request_id`) REFERENCES `retest_requests` (`project_id`, `work_item_id`, `coverage_revision_id`, `id`),
  CONSTRAINT `retest_request_items_ibfk_2` FOREIGN KEY (`project_id`, `work_item_id`, `coverage_revision_id`, `coverage_item_id`, `run_item_id`) REFERENCES `bug_coverage_items` (`project_id`, `work_item_id`, `coverage_revision_id`, `id`, `run_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `retest_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `coverage_revision_id` bigint NOT NULL,
  `round_no` bigint NOT NULL,
  `build_id` bigint NOT NULL,
  `environment_id` bigint NOT NULL,
  `device_id` bigint NOT NULL,
  `verification_scope` varchar(16) NOT NULL,
  `assignee_membership_id` bigint NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'OPEN',
  `lock_version` bigint NOT NULL DEFAULT '0',
  `reason` varchar(1000) NOT NULL,
  `created_by` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `request_key` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `context_snapshot` json NOT NULL,
  `request_checksum` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `submit_request_key` varchar(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `submit_checksum` char(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `submitted_by` bigint DEFAULT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`,`id`),
  UNIQUE KEY `project_id_2` (`project_id`,`work_item_id`,`coverage_revision_id`,`id`),
  UNIQUE KEY `project_id_3` (`project_id`,`request_key`),
  KEY `project_id_4` (`project_id`,`build_id`),
  KEY `project_id_5` (`project_id`,`environment_id`),
  KEY `project_id_6` (`project_id`,`device_id`),
  KEY `project_id_7` (`project_id`,`assignee_membership_id`),
  KEY `project_id_8` (`project_id`,`created_by`),
  KEY `project_id_9` (`project_id`,`submitted_by`),
  KEY `ix_retest_queue` (`project_id`,`status`,`assignee_membership_id`,`id`),
  KEY `ix_retest_bug` (`project_id`,`work_item_id`,`id`),
  CONSTRAINT `retest_requests_ibfk_1` FOREIGN KEY (`project_id`, `work_item_id`, `coverage_revision_id`) REFERENCES `bug_coverage_revisions` (`project_id`, `work_item_id`, `id`),
  CONSTRAINT `retest_requests_ibfk_2` FOREIGN KEY (`project_id`, `build_id`) REFERENCES `builds` (`project_id`, `id`),
  CONSTRAINT `retest_requests_ibfk_3` FOREIGN KEY (`project_id`, `environment_id`) REFERENCES `environments` (`project_id`, `id`),
  CONSTRAINT `retest_requests_ibfk_4` FOREIGN KEY (`project_id`, `device_id`) REFERENCES `devices` (`project_id`, `id`),
  CONSTRAINT `retest_requests_ibfk_5` FOREIGN KEY (`project_id`, `assignee_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `retest_requests_ibfk_6` FOREIGN KEY (`project_id`, `created_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `retest_requests_ibfk_7` FOREIGN KEY (`project_id`, `submitted_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `retest_requests_chk_1` CHECK ((`verification_scope` in (_utf8mb4'BUG_ONLY',_utf8mb4'FULL_CASE'))),
  CONSTRAINT `retest_requests_chk_2` CHECK ((`status` in (_utf8mb4'OPEN',_utf8mb4'SUBMITTED',_utf8mb4'CANCELLED'))),
  CONSTRAINT `retest_requests_chk_3` CHECK (((`round_no` > 0) and (`lock_version` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rule_versions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `ruleset_id` bigint NOT NULL,
  `version_no` int NOT NULL,
  `content_json` json NOT NULL,
  `published_at` datetime(6) DEFAULT NULL,
  `published_by` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rv_ruleset_no` (`project_id`,`ruleset_id`,`version_no`),
  UNIQUE KEY `uq_rv_ruleset_id` (`project_id`,`ruleset_id`,`id`),
  UNIQUE KEY `uq_rule_version_project_id` (`project_id`,`id`),
  KEY `fk_rv_published_by` (`project_id`,`published_by`),
  KEY `fk_rv_created_by` (`project_id`,`created_by`),
  CONSTRAINT `fk_rv_created_by` FOREIGN KEY (`project_id`, `created_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_rv_published_by` FOREIGN KEY (`project_id`, `published_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_rv_ruleset` FOREIGN KEY (`project_id`, `ruleset_id`) REFERENCES `rulesets` (`project_id`, `id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rulesets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `code` varchar(32) NOT NULL,
  `name` varchar(100) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `active_version_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ruleset_project_code` (`project_id`,`code`),
  UNIQUE KEY `uq_ruleset_project_id` (`project_id`,`id`),
  KEY `fk_ruleset_active_version` (`project_id`,`id`,`active_version_id`),
  CONSTRAINT `fk_ruleset_active_version` FOREIGN KEY (`project_id`, `id`, `active_version_id`) REFERENCES `rule_versions` (`project_id`, `ruleset_id`, `id`),
  CONSTRAINT `fk_ruleset_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `run_item_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `run_item_id` bigint NOT NULL,
  `previous_membership_id` bigint DEFAULT NULL,
  `assignee_membership_id` bigint NOT NULL,
  `assigned_by` bigint NOT NULL,
  `reason` varchar(500) NOT NULL,
  `assigned_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_assignment_previous` (`project_id`,`previous_membership_id`),
  KEY `fk_assignment_target` (`project_id`,`assignee_membership_id`),
  KEY `fk_assignment_actor` (`project_id`,`assigned_by`),
  KEY `ix_assignment_history` (`project_id`,`run_item_id`,`id`),
  CONSTRAINT `fk_assignment_actor` FOREIGN KEY (`project_id`, `assigned_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_assignment_previous` FOREIGN KEY (`project_id`, `previous_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_assignment_run` FOREIGN KEY (`project_id`, `run_item_id`) REFERENCES `run_items` (`project_id`, `id`),
  CONSTRAINT `fk_assignment_target` FOREIGN KEY (`project_id`, `assignee_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`)
) ENGINE=InnoDB AUTO_INCREMENT=243 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `run_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `cycle_id` bigint NOT NULL,
  `configuration_id` bigint NOT NULL,
  `test_case_id` bigint NOT NULL,
  `revision_id` bigint NOT NULL,
  `assignee_membership_id` bigint NOT NULL,
  `latest_attempt_id` bigint DEFAULT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  `scope_decision_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_run_scope` (`project_id`,`cycle_id`,`configuration_id`,`test_case_id`),
  UNIQUE KEY `uq_run_project_id` (`project_id`,`id`),
  KEY `fk_run_revision` (`project_id`,`test_case_id`,`revision_id`),
  KEY `fk_run_assignee` (`project_id`,`assignee_membership_id`),
  KEY `ix_run_assignee` (`project_id`,`cycle_id`,`assignee_membership_id`,`id`),
  KEY `fk_run_latest_attempt` (`project_id`,`id`,`latest_attempt_id`),
  KEY `fk_run_scope_decision` (`project_id`,`id`,`scope_decision_id`),
  CONSTRAINT `fk_run_assignee` FOREIGN KEY (`project_id`, `assignee_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_run_config` FOREIGN KEY (`project_id`, `cycle_id`, `configuration_id`) REFERENCES `cycle_configurations` (`project_id`, `cycle_id`, `id`),
  CONSTRAINT `fk_run_latest_attempt` FOREIGN KEY (`project_id`, `id`, `latest_attempt_id`) REFERENCES `execution_attempts` (`project_id`, `run_item_id`, `id`),
  CONSTRAINT `fk_run_revision` FOREIGN KEY (`project_id`, `test_case_id`, `revision_id`) REFERENCES `test_case_revisions` (`project_id`, `test_case_id`, `id`),
  CONSTRAINT `fk_run_scope_decision` FOREIGN KEY (`project_id`, `id`, `scope_decision_id`) REFERENCES `run_scope_decisions` (`project_id`, `run_item_id`, `id`),
  CONSTRAINT `ck_run_version` CHECK ((`lock_version` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=242 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `run_scope_decisions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `run_item_id` bigint NOT NULL,
  `excluded` tinyint(1) NOT NULL,
  `reason` varchar(1000) NOT NULL,
  `decided_by` bigint NOT NULL,
  `decided_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_scope_decision_run` (`project_id`,`run_item_id`,`id`),
  KEY `fk_scope_decision_actor` (`project_id`,`decided_by`),
  CONSTRAINT `fk_scope_decision_actor` FOREIGN KEY (`project_id`, `decided_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_scope_decision_run` FOREIGN KEY (`project_id`, `run_item_id`) REFERENCES `run_items` (`project_id`, `id`),
  CONSTRAINT `ck_scope_decision_excluded` CHECK ((`excluded` in (0,1))),
  CONSTRAINT `ck_scope_decision_reason` CHECK ((char_length(trim(`reason`)) > 0))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_case_revisions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `test_case_id` bigint NOT NULL,
  `revision_no` int NOT NULL,
  `title_vi` varchar(255) NOT NULL,
  `preconditions_vi` text,
  `steps_vi` text NOT NULL,
  `expected_vi` text NOT NULL,
  `title_jp` varchar(255) DEFAULT NULL,
  `preconditions_jp` text,
  `steps_jp` text,
  `expected_jp` text,
  `source_reference` varchar(255) DEFAULT NULL,
  `translator_membership_id` bigint DEFAULT NULL,
  `reviewer_membership_id` bigint DEFAULT NULL,
  `approved_at` datetime(6) DEFAULT NULL,
  `approved_by` bigint DEFAULT NULL,
  `checksum` varchar(64) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tcr_case_revision_no` (`project_id`,`test_case_id`,`revision_no`),
  UNIQUE KEY `uq_tcr_case_id` (`project_id`,`test_case_id`,`id`),
  KEY `fk_tcr_translator` (`project_id`,`translator_membership_id`),
  KEY `fk_tcr_reviewer` (`project_id`,`reviewer_membership_id`),
  KEY `fk_tcr_approved_by` (`project_id`,`approved_by`),
  KEY `fk_tcr_created_by` (`project_id`,`created_by`),
  CONSTRAINT `fk_tcr_approved_by` FOREIGN KEY (`project_id`, `approved_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_tcr_case` FOREIGN KEY (`project_id`, `test_case_id`) REFERENCES `test_cases` (`project_id`, `id`),
  CONSTRAINT `fk_tcr_created_by` FOREIGN KEY (`project_id`, `created_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_tcr_reviewer` FOREIGN KEY (`project_id`, `reviewer_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_tcr_translator` FOREIGN KEY (`project_id`, `translator_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`)
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_cases` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `case_no` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `suite_id` bigint NOT NULL,
  `current_revision_id` bigint DEFAULT NULL,
  `archived_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tc_project_case_no` (`project_id`,`case_no`),
  UNIQUE KEY `uq_tc_project_id` (`project_id`,`id`),
  KEY `ix_tc_suite` (`project_id`,`suite_id`,`id`),
  KEY `fk_tc_current_revision` (`project_id`,`id`,`current_revision_id`),
  CONSTRAINT `fk_tc_current_revision` FOREIGN KEY (`project_id`, `id`, `current_revision_id`) REFERENCES `test_case_revisions` (`project_id`, `test_case_id`, `id`),
  CONSTRAINT `fk_tc_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_tc_suite` FOREIGN KEY (`project_id`, `suite_id`) REFERENCES `test_suites` (`project_id`, `id`)
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_cycles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `code` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `milestone_id` bigint DEFAULT NULL,
  `status_code` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'DRAFT',
  `lock_version` bigint NOT NULL DEFAULT '0',
  `activated_at` datetime(6) DEFAULT NULL,
  `activated_by` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cycle_code` (`project_id`,`code`),
  UNIQUE KEY `uq_cycle_project_id` (`project_id`,`id`),
  KEY `fk_cycle_status` (`status_code`),
  KEY `fk_cycle_milestone` (`project_id`,`milestone_id`),
  KEY `fk_cycle_creator` (`project_id`,`created_by`),
  KEY `fk_cycle_activator` (`project_id`,`activated_by`),
  KEY `ix_cycles_status` (`project_id`,`status_code`,`id`),
  CONSTRAINT `fk_cycle_activator` FOREIGN KEY (`project_id`, `activated_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_cycle_creator` FOREIGN KEY (`project_id`, `created_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_cycle_milestone` FOREIGN KEY (`project_id`, `milestone_id`) REFERENCES `milestones` (`project_id`, `id`),
  CONSTRAINT `fk_cycle_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_cycle_status` FOREIGN KEY (`status_code`) REFERENCES `cycle_statuses` (`code`),
  CONSTRAINT `ck_cycle_activation` CHECK ((((`status_code` = _utf8mb4'DRAFT') and (`activated_at` is null) and (`activated_by` is null)) or ((`status_code` in (_utf8mb4'ACTIVE',_utf8mb4'CLOSED')) and (`activated_at` is not null) and (`activated_by` is not null)))),
  CONSTRAINT `ck_cycle_version` CHECK ((`lock_version` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_suites` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `code` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `parent_id` bigint DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `archived_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ts_project_code` (`project_id`,`code`),
  UNIQUE KEY `uq_ts_project_id` (`project_id`,`id`),
  KEY `ix_ts_parent` (`project_id`,`parent_id`,`sort_order`,`id`),
  CONSTRAINT `fk_ts_parent` FOREIGN KEY (`project_id`, `parent_id`) REFERENCES `test_suites` (`project_id`, `id`),
  CONSTRAINT `fk_ts_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_item_attachments` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `media_type` varchar(100) NOT NULL,
  `byte_size` bigint NOT NULL,
  `sha256` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `uploaded_by` bigint NOT NULL,
  `uploaded_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attachment_bug` (`project_id`,`work_item_id`,`id`),
  KEY `fk_attachment_actor` (`project_id`,`uploaded_by`),
  KEY `ix_attachment_work` (`project_id`,`work_item_id`,`uploaded_at`,`id`),
  CONSTRAINT `fk_attachment_actor` FOREIGN KEY (`project_id`, `uploaded_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_attachment_work` FOREIGN KEY (`project_id`, `work_item_id`) REFERENCES `work_items` (`project_id`, `id`),
  CONSTRAINT `ck_attachment_size` CHECK (((`byte_size` > 0) and (`byte_size` <= 20971520))),
  CONSTRAINT `ck_attachment_type` CHECK ((`media_type` in (_utf8mb4'image/png',_utf8mb4'image/jpeg',_utf8mb4'application/pdf',_utf8mb4'video/mp4')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_item_clarifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `source_kind` varchar(16) NOT NULL,
  `source_reference` varchar(1000) NOT NULL,
  `confirmed_by` varchar(100) NOT NULL,
  `confirmed_at` datetime(6) NOT NULL,
  `conclusion` text NOT NULL,
  `recorded_by` bigint NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_clarification_actor` (`project_id`,`recorded_by`),
  KEY `ix_clarification_work` (`project_id`,`work_item_id`,`id`),
  CONSTRAINT `fk_clarification_actor` FOREIGN KEY (`project_id`, `recorded_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_clarification_work` FOREIGN KEY (`project_id`, `work_item_id`) REFERENCES `work_items` (`project_id`, `id`),
  CONSTRAINT `ck_clarification_source` CHECK ((`source_kind` in (_utf8mb4'BRSE',_utf8mb4'SHIFT',_utf8mb4'CUSTOMER',_utf8mb4'INTERNAL')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_item_comments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `body` text NOT NULL,
  `visibility` varchar(16) NOT NULL DEFAULT 'INTERNAL',
  `author_membership_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `request_key` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_comment_request` (`project_id`,`work_item_id`,`request_key`),
  KEY `fk_comment_actor` (`project_id`,`author_membership_id`),
  KEY `ix_comment_history` (`project_id`,`work_item_id`,`id`),
  CONSTRAINT `fk_comment_actor` FOREIGN KEY (`project_id`, `author_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_comment_work` FOREIGN KEY (`project_id`, `work_item_id`) REFERENCES `work_items` (`project_id`, `id`),
  CONSTRAINT `ck_comment_internal` CHECK ((`visibility` = _utf8mb4'INTERNAL'))
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_item_execution_links` (
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `run_item_id` bigint NOT NULL,
  `attempt_id` bigint NOT NULL,
  `linked_by` bigint NOT NULL,
  `linked_at` datetime(6) NOT NULL,
  PRIMARY KEY (`project_id`,`work_item_id`,`attempt_id`),
  KEY `fk_work_link_attempt` (`project_id`,`run_item_id`,`attempt_id`),
  KEY `fk_work_link_actor` (`project_id`,`linked_by`),
  KEY `ix_work_link_attempt` (`project_id`,`attempt_id`,`work_item_id`),
  CONSTRAINT `fk_work_link_actor` FOREIGN KEY (`project_id`, `linked_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_work_link_attempt` FOREIGN KEY (`project_id`, `run_item_id`, `attempt_id`) REFERENCES `execution_attempts` (`project_id`, `run_item_id`, `id`),
  CONSTRAINT `fk_work_link_bug` FOREIGN KEY (`project_id`, `work_item_id`) REFERENCES `bug_details` (`project_id`, `work_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_item_external_references` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `provider` varchar(32) NOT NULL,
  `external_id` varchar(100) NOT NULL,
  `external_url` varchar(2048) NOT NULL,
  `reconciliation_status` varchar(32) NOT NULL DEFAULT 'UNRECONCILED',
  `recorded_by` bigint NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_external_reference` (`project_id`,`provider`,`external_id`),
  KEY `fk_external_work` (`project_id`,`work_item_id`),
  KEY `fk_external_actor` (`project_id`,`recorded_by`),
  CONSTRAINT `fk_external_actor` FOREIGN KEY (`project_id`, `recorded_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_external_work` FOREIGN KEY (`project_id`, `work_item_id`) REFERENCES `work_items` (`project_id`, `id`),
  CONSTRAINT `ck_external_unreconciled` CHECK ((`reconciliation_status` = _utf8mb4'UNRECONCILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_item_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `work_item_id` bigint NOT NULL,
  `event_type` varchar(32) NOT NULL,
  `from_status` varchar(32) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `to_status` varchar(32) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `reason` varchar(1000) NOT NULL,
  `details_json` json NOT NULL,
  `actor_membership_id` bigint NOT NULL,
  `occurred_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_work_history_actor` (`project_id`,`actor_membership_id`),
  KEY `fk_work_history_from` (`from_status`),
  KEY `fk_work_history_to` (`to_status`),
  KEY `ix_work_history` (`project_id`,`work_item_id`,`id`),
  CONSTRAINT `fk_work_history_actor` FOREIGN KEY (`project_id`, `actor_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_work_history_from` FOREIGN KEY (`from_status`) REFERENCES `work_item_statuses` (`code`),
  CONSTRAINT `fk_work_history_item` FOREIGN KEY (`project_id`, `work_item_id`) REFERENCES `work_items` (`project_id`, `id`),
  CONSTRAINT `fk_work_history_to` FOREIGN KEY (`to_status`) REFERENCES `work_item_statuses` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=186 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_item_policy_versions` (
  `code` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` varchar(100) NOT NULL,
  `definition_json` json NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_item_statuses` (
  `code` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `label_vi` varchar(80) NOT NULL,
  `color` char(7) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `sort_order` int NOT NULL,
  `terminal` tinyint(1) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `project_id` bigint NOT NULL,
  `item_no` bigint NOT NULL,
  `item_key` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `item_type` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` varchar(300) NOT NULL,
  `description` text NOT NULL,
  `status_code` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'open',
  `priority_code` varchar(16) NOT NULL DEFAULT 'MEDIUM',
  `category_id` bigint DEFAULT NULL,
  `milestone_id` bigint DEFAULT NULL,
  `assignee_membership_id` bigint DEFAULT NULL,
  `lock_version` bigint NOT NULL DEFAULT '0',
  `created_by` bigint NOT NULL,
  `updated_by` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `request_key` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_checksum` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_work_project_id` (`project_id`,`id`),
  UNIQUE KEY `uq_work_project_id_type` (`project_id`,`id`,`item_type`),
  UNIQUE KEY `uq_work_number` (`project_id`,`item_no`),
  UNIQUE KEY `uq_work_key` (`item_key`),
  UNIQUE KEY `uq_work_request` (`project_id`,`request_key`),
  KEY `fk_work_status` (`status_code`),
  KEY `fk_work_category` (`project_id`,`category_id`),
  KEY `fk_work_milestone` (`project_id`,`milestone_id`),
  KEY `fk_work_creator` (`project_id`,`created_by`),
  KEY `fk_work_editor` (`project_id`,`updated_by`),
  KEY `ix_work_board` (`project_id`,`status_code`,`updated_at`,`id`),
  KEY `ix_work_type` (`project_id`,`item_type`,`updated_at`,`id`),
  KEY `ix_work_assignee` (`project_id`,`assignee_membership_id`,`id`),
  CONSTRAINT `fk_work_assignee` FOREIGN KEY (`project_id`, `assignee_membership_id`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_work_category` FOREIGN KEY (`project_id`, `category_id`) REFERENCES `categories` (`project_id`, `id`),
  CONSTRAINT `fk_work_creator` FOREIGN KEY (`project_id`, `created_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_work_editor` FOREIGN KEY (`project_id`, `updated_by`) REFERENCES `project_memberships` (`project_id`, `id`),
  CONSTRAINT `fk_work_milestone` FOREIGN KEY (`project_id`, `milestone_id`) REFERENCES `milestones` (`project_id`, `id`),
  CONSTRAINT `fk_work_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_work_status` FOREIGN KEY (`status_code`) REFERENCES `work_item_statuses` (`code`),
  CONSTRAINT `ck_work_priority` CHECK ((`priority_code` in (_utf8mb4'HIGH',_utf8mb4'MEDIUM',_utf8mb4'LOW'))),
  CONSTRAINT `ck_work_type` CHECK ((`item_type` in (_utf8mb4'BUG',_utf8mb4'REQUEST',_utf8mb4'TASK',_utf8mb4'IMPROVEMENT'))),
  CONSTRAINT `ck_work_version` CHECK (((`lock_version` >= 0) and (`item_no` > 0)))
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

