package vn.syp.tms.admin;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.syp.tms.project.*;
import vn.syp.tms.execution.ExecutionService;
import vn.syp.tms.testcase.TestDocumentService;
import vn.syp.tms.shared.web.BusinessException;

class DeveloperResultsTest {
    private static @org.springframework.lang.NonNull String projectShareSql() {
        String sql="SELECT archived_at IS NOT NULL FROM projects WHERE id=? FOR SHARE";
        eq(sql);return sql;
    }
    private static @org.springframework.lang.NonNull org.springframework.jdbc.core.RowMapper<Boolean> anyBooleanMapper() {
        any(org.springframework.jdbc.core.RowMapper.class);
        return (rs,row)->false;
    }
    @Test void executionAndDocumentResultGuardRunsBeforePersistenceOrReplay() {
        var projects=mock(ProjectService.class);var jdbc=mock(JdbcTemplate.class);var audit=mock(ProjectAudit.class);var json=new ObjectMapper();
        doThrow(new BusinessException(403,"DEV_READ_ONLY_RESULTS","Denied")).when(projects).requireNotDev(1L,"dev");
        var guard=mock(vn.syp.tms.filework.FileWorkGuard.class);
        var execution=new ExecutionService(jdbc,projects,audit,json,guard);
        var documents=new TestDocumentService(jdbc,projects,json);
        when(jdbc.queryForList("SELECT id,archived_at FROM projects WHERE id=? FOR UPDATE",1L)).thenReturn(java.util.List.of(new java.util.HashMap<>(java.util.Map.of("id",1L))));
        assertEquals(403,assertThrows(BusinessException.class,()->execution.record(1,"dev",1,null)).status());
        var order=inOrder(guard,jdbc,projects);
        order.verify(guard).lockIdentity("dev");
        order.verify(jdbc).queryForList("SELECT id,archived_at FROM projects WHERE id=? FOR UPDATE",1L);
        order.verify(projects).requireNotDev(1L,"dev");
        when(jdbc.query(projectShareSql(),anyBooleanMapper(),eq(1L))).thenReturn(java.util.List.of(false));
        assertEquals(403,assertThrows(BusinessException.class,()->documents.updateResult(1L,"dev",1L,1L,null)).status());
        order.verify(jdbc).query(projectShareSql(),anyBooleanMapper(),eq(1L));
        order.verify(projects).requireNotDev(1L,"dev");
        verifyNoMoreInteractions(jdbc);verifyNoInteractions(audit);
    }
}
