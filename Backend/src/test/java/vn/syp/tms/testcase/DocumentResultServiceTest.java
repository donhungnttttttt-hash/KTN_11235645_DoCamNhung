package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.lang.NonNull;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.shared.web.BusinessException;

class DocumentResultServiceTest {
    JdbcTemplate jdbc;ProjectService projects;TestDocumentService service;
    String status="UNEXECUTED",lastKey=null,actor=null;long version=0;boolean archived=false,missing=false;
    final String key="12345678-1234-1234-1234-123456789abc";
    // Mockito records the matcher but returns null; supply a non-null placeholder for JdbcTemplate's contract.
    private static @NonNull RowMapper<Object> anyRowMapper() {
        any(RowMapper.class);
        return (rs,rowNumber)->null;
    }
    @BeforeEach void setup() throws Exception {
        jdbc=mock(JdbcTemplate.class);projects=mock(ProjectService.class);service=new TestDocumentService(jdbc,projects,new ObjectMapper());
        when(jdbc.query(Objects.requireNonNull(anyString()),anyRowMapper(),any(Object[].class))).thenAnswer(inv->{
            String sql=inv.getArgument(0);RowMapper<?> mapper=inv.getArgument(1);ResultSet rs=mock(ResultSet.class);
            if(sql.contains("FROM projects")){when(rs.getBoolean(1)).thenReturn(false);}
            else if(sql.contains("FOR UPDATE")) {
                if(missing)return List.of();
                when(rs.getString(1)).thenReturn(status);when(rs.getLong(2)).thenReturn(version);
                when(rs.getString(3)).thenReturn(lastKey);when(rs.getString(4)).thenReturn(actor);when(rs.getBoolean(5)).thenReturn(archived);
            } else {
                when(rs.getLong(1)).thenReturn(9L);when(rs.getString(2)).thenReturn("OK");when(rs.getLong(3)).thenReturn(1L);
                when(rs.getTimestamp(4)).thenReturn(Timestamp.from(Instant.parse("2026-10-04T12:00:00Z")));when(rs.getString(5)).thenReturn("Tester");
            }
            return List.of(mapper.mapRow(rs,0));
        });
    }
    TestDocumentDtos.UpdateResult input(long expected) {return new TestDocumentDtos.UpdateResult("OK",expected,key);}
    @Test void memberWritesWithActorVersionAndAudit() {
        var saved=service.updateResult(1L,"tester",2L,9L,input(0));
        assertThat(saved.status()).isEqualTo("OK");assertThat(saved.version()).isEqualTo(1);
        verify(projects).requireMembership(1L,"tester");
        verify(jdbc).update(Objects.requireNonNull(contains("UPDATE import_rows")),eq("OK"),eq("tester"),eq(key),eq(1L),eq(2L),eq(9L));
        verify(jdbc).update(Objects.requireNonNull(contains("INSERT INTO project_audit")),eq(1L),eq("tester"),eq(9L),eq("RESULT_UNEXECUTED_OK"));
    }
    @Test void replayIsIdempotentAndDoesNotDuplicateHistory() {
        status="OK";version=1;lastKey=key;actor="tester";
        assertThat(service.updateResult(1L,"tester",2L,9L,input(0)).version()).isEqualTo(1);
        verify(jdbc,never()).update(Objects.requireNonNull(anyString()),any(Object[].class));
    }
    @Test void staleVersionCannotOverwriteAnotherResult() {
        version=2;
        assertThatThrownBy(()->service.updateResult(1L,"tester",2L,9L,input(0))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("DOCUMENT_RESULT_CONFLICT"));
        verify(jdbc,never()).update(Objects.requireNonNull(anyString()),any(Object[].class));
    }
    @Test void nonMemberIsRejectedBeforeReadingRows() {
        doThrow(new BusinessException(404,"NOT_FOUND","missing")).when(projects).requireMembership(1L,"outsider");
        assertThatThrownBy(()->service.updateResult(1L,"outsider",2L,9L,input(0))).isInstanceOf(BusinessException.class);
        verify(jdbc,never()).update(Objects.requireNonNull(anyString()),any(Object[].class));
    }
    @Test void projectLockPrecedesAuthorizationAndRevocationRejectsReplay() {
        status="OK";version=1;lastKey=key;actor="tester";
        doAnswer(inv->{
            assertThat(mockingDetails(jdbc).getInvocations()).anySatisfy(call->assertThat(call.getArguments()[0].toString()).contains("FROM projects","FOR SHARE"));
            throw new BusinessException(403,"DEV_READ_ONLY_RESULTS","revoked");
        }).when(projects).requireNotDev(1L,"tester");
        assertThatThrownBy(()->service.updateResult(1L,"tester",2L,9L,input(0))).isInstanceOf(BusinessException.class);
        verify(jdbc,never()).update(Objects.requireNonNull(anyString()),any(Object[].class));
    }
    @Test void otherDocumentOrUncommittedRowIsNotWritable() {
        missing=true;
        assertThatThrownBy(()->service.updateResult(1L,"tester",2L,9L,input(0))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(404));
        verify(jdbc,never()).update(Objects.requireNonNull(anyString()),any(Object[].class));
    }
    @Test void archivedCaseIsNotWritable() {
        archived=true;
        assertThatThrownBy(()->service.updateResult(1L,"tester",2L,9L,input(0))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("ARCHIVED"));
        verify(jdbc,never()).update(Objects.requireNonNull(anyString()),any(Object[].class));
    }
}
