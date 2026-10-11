package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Upgrade only the caller's isolated native test schema; never the application schema. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_DB_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+")
class NativeAdminAuthorityMigrationTest {
    @Test void upgradesAttributionWithoutChangingExistingRows() throws Exception {
        try(var c=NativeFqDatabase.connect()) {
            long sessions=NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM file_work_sessions");
            long attempts=NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM execution_attempts");
            NativeFqDatabase.flyway("28").migrate();
            NativeFqDatabase.flyway("28").validate();
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM file_work_sessions")).isEqualTo(sessions);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM execution_attempts")).isEqualTo(attempts);
            assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM execution_attempts a LEFT JOIN file_work_sessions s ON s.project_id=a.project_id AND s.id=a.file_work_session_id WHERE a.file_work_session_id IS NOT NULL AND s.id IS NULL")).isZero();
        }
    }
}
