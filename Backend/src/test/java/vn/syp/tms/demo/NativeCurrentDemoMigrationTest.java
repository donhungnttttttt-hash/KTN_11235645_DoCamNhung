package vn.syp.tms.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;
import java.util.Set;
import java.util.regex.Pattern;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.testcase.TestCaseWorkbook;
import vn.syp.tms.testcase.TestDocumentService;

/** Direct Flyway/JDBC only: never starts application cleanup jobs or touches the main schema. */
@EnabledIfEnvironmentVariable(named = "TMS_TEST_DEMO_MODE", matches = "fresh|upgrade|release|collision")
class NativeCurrentDemoMigrationTest {
    private static final Pattern URL = Pattern.compile(
        "jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):([0-9]{1,5})/(tms_demo34_test_[a-f0-9]{12})"
            + "(?:\\?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED)?");
    private static final String PROJECTS = "('TMS-DEMO34-MOBILE','TMS-DEMO34-WEB')";
    private static final String DEMO_PASSWORD = "TmsDemo34!2026";
    private static final Set<String> BUG_STATUSES = Set.of("open", "progress", "recheck", "clarify", "ready",
        "planning", "resolved", "unreproducible", "wontfix", "closed");
    private static final Set<String> QA_STATUSES = Set.of("open", "progress", "clarify", "resolved", "recheck", "closed");

    @Test void completeLocalDemoIsSafeForItsRequestedMigrationPath() throws Exception {
        Environment environment = Environment.fromVariables();
        try (Connection connection = environment.connect()) {
            assertThat(scalar(connection, "SELECT GET_LOCK(CONCAT('demo34:',DATABASE()),0)")).isEqualTo(1);
            try {
                assertThat(scalar(connection, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()"))
                    .as("Every mode requires a newly provisioned empty test schema; this test never cleans a schema")
                    .isZero();
                assertThat(scalar(connection, "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema=DATABASE()")).isZero();
                assertThat(scalar(connection, "SELECT COUNT(*) FROM information_schema.events WHERE event_schema=DATABASE()")).isZero();
                switch (environment.mode()) {
                    case "fresh" -> fresh(connection, environment);
                    case "upgrade" -> upgrade(connection, environment);
                    case "release" -> release(connection, environment);
                    case "collision" -> collision(connection, environment);
                    default -> throw new IllegalStateException("Unsupported demo test mode");
                }
            } finally {
                scalar(connection, "SELECT RELEASE_LOCK(CONCAT('demo34:',DATABASE()))");
            }
        }
    }

    private static void fresh(Connection connection, Environment environment) throws Exception {
        assertThat(environment.flyway(null, true).migrate().migrationsExecuted).isEqualTo(34);
        verifyDemo(connection);
        verifyNoPrivateOrLegacyData(connection);
        verifyRepeatPreservesEdits(connection, environment);
    }

    private static void upgrade(Connection connection, Environment environment) throws Exception {
        assertThat(environment.flyway("33", true).migrate().migrationsExecuted).isEqualTo(33);
        update(connection, "UPDATE identity_users SET display_name='Existing user changed their profile', "
            + "password_hash='existing-user-owned-hash', enabled=FALSE WHERE username='syp.lab.tester01'");
        update(connection, "UPDATE device_assets SET notes='Existing asset edited by its owner' WHERE asset_code='SYP-LAB-22-IPAD-01'");
        update(connection, "INSERT INTO projects(code,name,description,created_at,created_by,updated_at,updated_by) "
            + "SELECT 'TEST-PRESERVE-34','Existing independent project','Must remain unchanged',UTC_TIMESTAMP(6),id,UTC_TIMESTAMP(6),id "
            + "FROM identity_users WHERE username='syp.demo.admin'");
        Map<String, Map<String, Long>> before = snapshot(connection);
        assertThat(environment.flyway(null, true).migrate().migrationsExecuted).isEqualTo(1);
        assertPreserved(before, snapshot(connection), false);
        verifyDemo(connection);
        verifyNoPrivateOrLegacyData(connection);
        verifyRepeatPreservesEdits(connection, environment);
    }

    private static void release(Connection connection, Environment environment) throws Exception {
        var flyway = environment.flyway(null, false);
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(31);
        flyway.validate();
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("33");
        assertThat(flyway.info().pending()).isEmpty();
        assertThat(scalar(connection, "SELECT COUNT(*) FROM identity_users")).isZero();
        assertThat(scalar(connection, "SELECT COUNT(*) FROM projects")).isZero();
        assertThat(scalar(connection, "SELECT COUNT(*) FROM device_assets")).isZero();
        assertThat(scalar(connection, "SELECT COUNT(*) FROM flyway_schema_history WHERE version IN ('20','22','34')")).isZero();
        assertThat(flyway.migrate().migrationsExecuted).isZero();
    }

    private static void collision(Connection connection, Environment environment) throws Exception {
        assertThat(environment.flyway("33", true).migrate().migrationsExecuted).isEqualTo(33);
        // Unique serial collision occurs after users and project graphs have been inserted.
        update(connection, "INSERT INTO device_assets(asset_code,type,model,serial,condition_code,notes,created_at,created_by,updated_at,updated_by) "
            + "SELECT 'SENTINEL-DEVICE','IPAD','Existing unrelated device','DEMO34-IPAD-01','AVAILABLE','Preserve this device',"
            + "UTC_TIMESTAMP(6),id,UTC_TIMESTAMP(6),id FROM identity_users WHERE username='syp.demo.admin'");
        Map<String, Map<String, Long>> before = snapshot(connection);
        assertThatThrownBy(() -> environment.flyway(null, true).migrate()).isInstanceOf(FlywayException.class)
            .hasRootCauseInstanceOf(java.sql.SQLIntegrityConstraintViolationException.class)
            .hasStackTraceContaining("Duplicate entry 'DEMO34-IPAD-01'");
        assertPreserved(before, snapshot(connection), true);
        assertThat(scalar(connection, "SELECT COUNT(*) FROM identity_users WHERE username LIKE 'syp.demo34.%'")).isZero();
        assertThat(scalar(connection, "SELECT COUNT(*) FROM projects WHERE code IN " + PROJECTS)).isZero();
        assertThat(scalar(connection, "SELECT COUNT(*) FROM device_assets WHERE asset_code='SENTINEL-DEVICE' "
            + "AND serial='DEMO34-IPAD-01' AND notes='Preserve this device'")).isEqualTo(1);
    }

    private static void verifyDemo(Connection connection) throws Exception {
        assertThat(scalar(connection, "SELECT COUNT(*) FROM identity_users WHERE username LIKE 'syp.demo34.%'")).isEqualTo(6);
        for (var role : Map.of("ADMIN", 1, "PM", 1, "DEV", 2, "TESTER", 2).entrySet()) {
            assertThat(scalar(connection, "SELECT COUNT(*) FROM identity_users WHERE username LIKE 'syp.demo34.%' AND role_code=?", role.getKey()))
                .as("Demo role %s", role.getKey()).isEqualTo(role.getValue().longValue());
        }
        Set<String> hashes = new HashSet<>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                "SELECT username,password_hash,enabled FROM identity_users WHERE username LIKE 'syp.demo34.%'")) {
            while (rows.next()) {
                String hash = Objects.requireNonNull(rows.getString(2));
                assertThat(rows.getBoolean(3)).isTrue();
                assertThat(hash.startsWith("{pbkdf2-v5_8}")).as("Encoded demo password prefix").isTrue();
                assertThat(Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8().matches(DEMO_PASSWORD,
                    hash.substring("{pbkdf2-v5_8}".length()))).as("Published demo password authenticates %s", rows.getString(1)).isTrue();
                hashes.add(hash);
            }
        }
        assertThat(hashes.size()).as("Every account has a different password salt").isEqualTo(6);
        assertThat(scalar(connection, "SELECT COUNT(*) FROM projects WHERE code IN " + PROJECTS)).isEqualTo(2);
        for (var table : Map.of("testing_features", 4, "import_batches", 8, "import_rows", 80,
                "test_cases", 80, "test_case_revisions", 80, "test_document_assignments", 80,
                "test_document_assignment_changes", 120, "project_notes", 4, "project_management_reports", 4).entrySet()) {
            assertThat(scopedCount(connection, table.getKey(), "")).as(table.getKey()).isEqualTo(table.getValue().longValue());
        }
        assertThat(scopedCount(connection, "testing_features", "AND t.archived_at IS NULL")).isEqualTo(4);
        assertThat(scopedCount(connection, "import_batches", "AND t.status='COMMITTED' AND t.feature_id IS NOT NULL AND t.archived_at IS NULL "
            + "AND t.total_rows=10 AND t.valid_rows=10 AND t.error_rows=0 AND t.source_workbook IS NOT NULL")).isEqualTo(8);
        assertThat(scalar(connection, "SELECT COUNT(*) FROM import_rows r JOIN projects p ON p.id=r.project_id "
            + "JOIN test_cases c ON c.project_id=r.project_id AND c.id=r.target_case_id "
            + "JOIN test_case_revisions rev ON rev.project_id=c.project_id AND rev.id=c.current_revision_id AND rev.test_case_id=c.id "
            + "WHERE p.code IN " + PROJECTS + " AND r.owning_document_id=r.batch_id AND c.owning_document_id=r.batch_id "
            + "AND r.is_valid=TRUE AND CHAR_LENGTH(TRIM(rev.title_vi))>0")).isEqualTo(80);
        for (var status : Map.of("OK", 30, "NG", 10, "P", 6, "NA", 8, "UNEXECUTED", 26).entrySet()) {
            assertThat(scopedCount(connection, "import_rows", "AND t.result_status='" + status.getKey() + "'"))
                .as("Demo result %s", status.getKey()).isEqualTo(status.getValue().longValue());
        }
        assertThat(scopedCount(connection, "import_rows", "AND t.result_status<>'UNEXECUTED' AND t.result_updated_by IS NOT NULL "
            + "AND t.result_updated_at IS NOT NULL AND t.result_version>0")).isEqualTo(54);
        assertThat(scopedCount(connection, "test_document_assignments", "AND t.first_tester_membership_id IS NOT NULL")).isEqualTo(80);
        assertThat(scopedCount(connection, "test_document_assignments", "AND t.latest_tester_membership_id IS NOT NULL")).isEqualTo(40);
        assertThat(scalar(connection, "SELECT COUNT(*) FROM test_document_assignments a JOIN projects p ON p.id=a.project_id "
            + "JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.latest_tester_membership_id "
            + "JOIN identity_users u ON u.id=m.user_id WHERE p.code IN " + PROJECTS + " AND u.username='syp.demo34.tester02'")).isEqualTo(40);
        assertThat(scalar(connection, "SELECT COUNT(*) FROM test_document_assignments a JOIN projects p ON p.id=a.project_id "
            + "JOIN project_memberships first_m ON first_m.project_id=a.project_id AND first_m.id=a.first_tester_membership_id "
            + "JOIN identity_users first_u ON first_u.id=first_m.user_id "
            + "JOIN project_memberships current_m ON current_m.project_id=a.project_id AND current_m.id=a.assignee_membership_id "
            + "WHERE p.code IN " + PROJECTS + " AND first_u.username='syp.demo34.tester01' AND first_m.active=TRUE "
            + "AND current_m.active=TRUE AND current_m.project_role='TESTER' "
            + "AND a.assignee_membership_id=COALESCE(a.latest_tester_membership_id,a.first_tester_membership_id)")).isEqualTo(80);
        assertThat(scalar(connection, "SELECT COUNT(*) FROM import_rows r JOIN projects p ON p.id=r.project_id "
            + "JOIN test_document_assignments a ON a.project_id=r.project_id AND a.row_id=r.id "
            + "JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.assignee_membership_id "
            + "WHERE p.code IN " + PROJECTS + " AND r.result_status<>'UNEXECUTED' AND r.result_updated_by=m.user_id")).isEqualTo(54);
        verifyIssues(connection);
        verifyInventory(connection);
        verifyWorkbooksAndExports(connection);
        assertThat(scopedCount(connection, "project_notes", "AND CHAR_LENGTH(TRIM(t.title))>0 AND CHAR_LENGTH(TRIM(t.body))>0")).isEqualTo(4);
        assertThat(scopedCount(connection, "project_management_reports", "AND CHAR_LENGTH(TRIM(t.title))>0 AND CHAR_LENGTH(TRIM(t.markdown))>0")).isEqualTo(4);
        assertThat(scalar(connection, "SELECT COUNT(*) FROM project_resources r JOIN projects p ON p.id=r.project_id "
            + "JOIN resource_revisions v ON v.project_id=r.project_id AND v.resource_id=r.id AND v.id=r.current_revision_id "
            + "WHERE p.code IN " + PROJECTS + " AND r.resource_type='GUIDE' AND v.visibility='INTERNAL' "
            + "AND CHAR_LENGTH(TRIM(v.content_html))>0 AND v.content_html NOT REGEXP '<[^>]*>'")).isEqualTo(2);
        for (String code : List.of("TMS-DEMO34-MOBILE", "TMS-DEMO34-WEB")) {
            assertThat(scalar(connection, "SELECT COUNT(*) FROM milestones m JOIN projects p ON p.id=m.project_id WHERE p.code=? AND m.due_on<CURRENT_DATE", code)).isPositive();
            assertThat(scalar(connection, "SELECT COUNT(*) FROM milestones m JOIN projects p ON p.id=m.project_id WHERE p.code=? AND m.due_on>CURRENT_DATE", code)).isPositive();
            assertThat(scalar(connection, "SELECT COUNT(*) FROM project_memberships m JOIN projects p ON p.id=m.project_id "
                + "WHERE p.code=? AND m.project_role='PM' AND m.active=TRUE", code)).isPositive();
        }
    }

    private static void verifyIssues(Connection connection) throws Exception {
        assertThat(scopedCount(connection, "work_items", "")).isEqualTo(32);
        assertThat(scopedCount(connection, "work_item_feature_context", "AND t.deleted_at IS NULL")).isEqualTo(32);
        assertThat(scopedCount(connection, "bug_details", "")).isEqualTo(20);
        assertThat(scopedCount(connection, "qa_details", "")).isEqualTo(12);
        assertThat(scalar(connection, "SELECT COUNT(DISTINCT h.work_item_id) FROM work_item_feature_history h JOIN projects p ON p.id=h.project_id "
            + "WHERE p.code IN " + PROJECTS)).isEqualTo(32);
        for (String code : List.of("TMS-DEMO34-MOBILE", "TMS-DEMO34-WEB")) {
            for (var type : Map.of("BUG", BUG_STATUSES, "QA", QA_STATUSES).entrySet()) {
                Set<String> states = new HashSet<>();
                try (var statement = connection.prepareStatement("SELECT w.status_code FROM work_items w JOIN projects p ON p.id=w.project_id WHERE p.code=? AND w.item_type=?")) {
                    statement.setString(1, code);
                    statement.setString(2, type.getKey());
                    try (var rows = statement.executeQuery()) { while (rows.next()) states.add(rows.getString(1)); }
                }
                assertThat(states).as("%s %s statuses", code, type.getKey()).isEqualTo(type.getValue());
            }
            assertThat(scalar(connection, "SELECT COUNT(*) FROM work_item_feature_context c JOIN projects p ON p.id=c.project_id "
                + "WHERE p.code=? AND c.monkey=TRUE AND c.row_id IS NULL", code)).isPositive();
        }
        assertThat(scalar(connection, "SELECT COUNT(*) FROM work_item_feature_context x JOIN projects p ON p.id=x.project_id "
            + "LEFT JOIN import_rows r ON r.project_id=x.project_id AND r.batch_id=x.document_id AND r.id=x.row_id "
            + "LEFT JOIN import_batches b ON b.project_id=x.project_id AND b.id=x.document_id AND b.feature_id=x.feature_id "
            + "WHERE p.code IN " + PROJECTS + " AND (x.row_id IS NOT NULL AND r.id IS NULL OR x.document_id IS NOT NULL AND b.id IS NULL)")).isZero();
    }

    private static void verifyInventory(Connection connection) throws Exception {
        assertThat(scalar(connection, "SELECT COUNT(*) FROM device_assets WHERE asset_code LIKE 'TMS-DEMO34-%'")).isEqualTo(6);
        for (String type : List.of("IPAD", "IPHONE", "ANDROID")) {
            assertThat(scalar(connection, "SELECT COUNT(*) FROM device_assets WHERE asset_code LIKE 'TMS-DEMO34-%' AND type=?", type)).isEqualTo(2);
        }
        assertThat(scalar(connection, "SELECT COUNT(*) FROM device_allocations a JOIN device_assets d ON d.id=a.asset_id "
            + "JOIN project_memberships m ON m.project_id=a.project_id AND m.id=a.recipient_membership_id "
            + "WHERE d.asset_code LIKE 'TMS-DEMO34-%' AND a.returned_at IS NULL AND m.active=TRUE AND m.project_role='TESTER'")).isEqualTo(4);
        assertThat(scalar(connection, "SELECT COUNT(*) FROM device_assets d WHERE d.asset_code LIKE 'TMS-DEMO34-%' AND d.condition_code='AVAILABLE' "
            + "AND NOT EXISTS(SELECT 1 FROM device_allocations a WHERE a.asset_id=d.id AND a.returned_at IS NULL)")).isEqualTo(2);
    }

    private static void verifyWorkbooksAndExports(Connection connection) throws Exception {
        var access = mock(ProjectService.class);
        var service = new TestDocumentService(new JdbcTemplate(new SingleConnectionDataSource(Objects.requireNonNull(connection), true)), access, new ObjectMapper());
        String actor;
        try (var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT id FROM identity_users WHERE username='syp.demo34.admin'")) {
            assertThat(rows.next()).isTrue();
            actor = Objects.requireNonNull(rows.getString(1));
        }
        Map<String, String> testerNames = new HashMap<>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                "SELECT username,display_name FROM identity_users WHERE username IN ('syp.demo34.tester01','syp.demo34.tester02')")) {
            while (rows.next()) testerNames.put(rows.getString(1), rows.getString(2));
        }
        List<WorkbookSource> sources = new ArrayList<>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT b.project_id,b.id,b.file_name,b.file_checksum,b.source_workbook "
                + "FROM import_batches b JOIN projects p ON p.id=b.project_id WHERE p.code IN " + PROJECTS)) {
            while (rows.next()) sources.add(new WorkbookSource(rows.getLong(1), rows.getLong(2), rows.getString(3), rows.getString(4), rows.getBytes(5)));
        }
        for (WorkbookSource source : sources) {
            var parsed = new TestCaseWorkbook().parse(new MockMultipartFile("file", source.name(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", source.bytes()));
            assertThat(parsed.rows()).hasSize(10);
            assertThat(parsed.checksum()).isEqualTo(source.checksum());
            assertThat(service.export(source.project(), actor, source.document(), true).bytes()).isEqualTo(source.bytes());
            var detail = service.get(source.project(), actor, source.document());
            assertThat(detail.rows()).hasSize(10);
            for (var row : detail.rows()) {
                var history = service.resultHistory(source.project(), actor, source.document(), row.rowId(), 0);
                if ("UNEXECUTED".equals(row.resultStatus())) assertThat(history).isEmpty();
                else {
                    assertThat(history).hasSize(1);
                    assertThat(history.getFirst().before()).isEqualTo("UNEXECUTED");
                    assertThat(history.getFirst().after()).isEqualTo(row.resultStatus());
                    assertThat(history.getFirst().actor()).isEqualTo(row.resultUpdatedBy());
                }
            }
            var exported = service.export(source.project(), actor, source.document(), false);
            assertThat(new TestCaseWorkbook().parse(new MockMultipartFile("file", exported.fileName(), "application/octet-stream", exported.bytes())).rows()).hasSize(10);
            try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(exported.bytes()))) {
                var sheet = workbook.getSheetAt(0);
                var formatter = new DataFormatter(java.util.Locale.ROOT);
                int statusColumn = -1;
                for (var cell : sheet.getRow(0)) if ("Status".equals(cell.getStringCellValue())) statusColumn = cell.getColumnIndex();
                assertThat(statusColumn).as("Feature export contains status column").isGreaterThanOrEqualTo(0);
                for (var row : detail.rows()) {
                    String expected = "UNEXECUTED".equals(row.resultStatus()) ? "Unexecuted" : row.resultStatus();
                    var exportedRow = sheet.getRow(row.rowNumber() - 1);
                    assertThat(formatter.formatCellValue(exportedRow.getCell(statusColumn))).isEqualTo(expected);
                    assertThat(formatter.formatCellValue(exportedRow.getCell(statusColumn + 1))).isEqualTo(testerNames.get("syp.demo34.tester01"));
                    String latest = row.rowNumber() % 2 == 0 ? "" : testerNames.get("syp.demo34.tester02");
                    assertThat(formatter.formatCellValue(exportedRow.getCell(statusColumn + 2))).isEqualTo(latest);
                }
            }
            verify(access, org.mockito.Mockito.atLeastOnce()).requireReadAccess(source.project(), actor);
        }
    }

    private record WorkbookSource(long project, long document, String name, String checksum, byte[] bytes) {}

    private static void verifyNoPrivateOrLegacyData(Connection connection) throws Exception {
        for (String table : List.of("ai_generated_drafts", "ai_chat_threads", "ai_chat_turns", "SPRING_SESSION",
                "SPRING_SESSION_ATTRIBUTES", "identity_login_buckets", "execution_attempts", "file_work_groups",
                "redmine_bindings", "redmine_outbox", "redmine_delivery_attempts")) {
            assertThat(scalar(connection, "SELECT COUNT(*) FROM `" + table + "`")).as("No private or retired data in " + table).isZero();
        }
    }

    private static void verifyRepeatPreservesEdits(Connection connection, Environment environment) throws Exception {
        update(connection, "UPDATE identity_users SET password_hash='user-selected-new-password-hash',enabled=FALSE WHERE username='syp.demo34.tester01'");
        update(connection, "UPDATE device_assets SET notes='User edited this demo asset' WHERE asset_code='TMS-DEMO34-IPAD-01'");
        update(connection, "UPDATE project_notes n JOIN projects p ON p.id=n.project_id SET n.body='User edited the demo note' WHERE p.code IN " + PROJECTS);
        Map<String, Map<String, Long>> before = snapshot(connection);
        var flyway = environment.flyway(null, true);
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        flyway.validate();
        assertPreserved(before, snapshot(connection), true);
    }

    /** Hashes all values, including BLOB bytes, so assertion diagnostics never print credentials or documents. */
    private static Map<String, Map<String, Long>> snapshot(Connection connection) throws Exception {
        List<String> tables = new ArrayList<>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name")) {
            while (rows.next()) {
                String table = Objects.requireNonNull(rows.getString(1));
                if (!table.matches("[A-Za-z][A-Za-z0-9_]*")) throw new IllegalStateException("Unexpected table identifier");
                if (!table.equals("flyway_schema_history")) tables.add(table);
            }
        }
        Map<String, Map<String, Long>> snapshot = new LinkedHashMap<>();
        for (String table : tables) {
            Map<String, Long> hashes = new HashMap<>();
            try (var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT * FROM `" + table + "`")) {
                int count = rows.getMetaData().getColumnCount();
                while (rows.next()) {
                    MessageDigest digest = MessageDigest.getInstance("SHA-256");
                    for (int column = 1; column <= count; column++) {
                        byte[] value = rows.getBytes(column);
                        digest.update(ByteBuffer.allocate(4).putInt(value == null ? -1 : value.length).array());
                        if (value != null) digest.update(value);
                    }
                    hashes.merge(HexFormat.of().formatHex(digest.digest()), 1L,
                        (previous, increment) -> Objects.requireNonNull(previous) + Objects.requireNonNull(increment));
                }
            }
            snapshot.put(table, hashes);
        }
        return snapshot;
    }

    private static void assertPreserved(Map<String, Map<String, Long>> before, Map<String, Map<String, Long>> after, boolean exact) {
        assertThat(after.keySet()).containsAll(before.keySet());
        for (var table : before.entrySet()) {
            Map<String, Long> current = after.get(table.getKey());
            if (exact) assertThat(current).as("All rows remain unchanged in %s", table.getKey()).isEqualTo(table.getValue());
            else for (var row : table.getValue().entrySet()) {
                assertThat(current.getOrDefault(row.getKey(), 0L)).as("Existing row preserved in %s", table.getKey()).isGreaterThanOrEqualTo(row.getValue());
            }
        }
    }

    private static long scopedCount(Connection connection, String table, String filter) throws Exception {
        return scalar(connection, "SELECT COUNT(*) FROM " + table + " t JOIN projects p ON p.id=t.project_id WHERE p.code IN " + PROJECTS + " " + filter);
    }

    private static void update(Connection connection, String sql) throws Exception {
        try (var statement = connection.createStatement()) { assertThat(statement.executeUpdate(sql)).isPositive(); }
    }

    private static long scalar(Connection connection, String sql) throws Exception {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(sql)) {
            assertThat(rows.next()).isTrue();
            return rows.getLong(1);
        }
    }

    private static long scalar(Connection connection, String sql, String argument) throws Exception {
        try (var statement = connection.prepareStatement(sql)) {
            statement.setString(1, argument);
            try (var rows = statement.executeQuery()) {
                assertThat(rows.next()).isTrue();
                return rows.getLong(1);
            }
        }
    }

    private record Environment(String url, String user, String password, String mode, String schema) {
        static Environment fromVariables() {
            String url = required("TMS_TEST_DEMO_URL");
            var match = URL.matcher(url);
            if (!match.matches() || Integer.parseInt(match.group(1)) < 1 || Integer.parseInt(match.group(1)) > 65535) {
                throw new IllegalStateException("Native demo test requires its dedicated loopback test schema");
            }
            String mode = required("TMS_TEST_DEMO_MODE");
            if (!mode.matches("fresh|upgrade|release|collision")) throw new IllegalStateException("Unknown demo test mode");
            return new Environment(url, required("TMS_TEST_DEMO_USER"), required("TMS_TEST_DEMO_PASSWORD"), mode, match.group(2));
        }

        private static String required(String name) {
            String value = System.getenv(name);
            if (value == null || value.isBlank()) throw new IllegalStateException("Missing " + name);
            return value;
        }

        Connection connect() throws Exception {
            Properties properties = new Properties();
            properties.setProperty("user", user);
            properties.setProperty("password", password);
            properties.setProperty("connectTimeout", "5000");
            properties.setProperty("socketTimeout", "120000");
            Connection connection = DriverManager.getConnection(url, properties);
            try (var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT DATABASE()")) {
                if (!rows.next() || !Objects.equals(schema, rows.getString(1))) {
                    connection.close();
                    throw new IllegalStateException("Unexpected demo test schema");
                }
            }
            return connection;
        }

        Flyway flyway(String target, boolean includeDemo) {
            var configuration = Flyway.configure().dataSource(url, user, password)
                .locations(includeDemo ? new String[]{"classpath:db/migration", "classpath:db/demo"}
                    : new String[]{"classpath:db/migration"})
                .cleanDisabled(true).baselineOnMigrate(false).validateOnMigrate(true).outOfOrder(false);
            if (target != null) configuration.target(target);
            return configuration.load();
        }
    }
}
