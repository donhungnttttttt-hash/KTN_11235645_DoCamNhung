package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Connection;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.integration.*;

/** Real permission SQL and queue/worker readback; only the remote boundary is mocked. */
@SpringBootTest(properties="TMS_REDMINE_WORKER_ENABLED=false")
@Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="integration")
class NativeRedminePermissionTest {
    @DynamicPropertySource static void isolatedDatabase(DynamicPropertyRegistry registry)throws Exception {
        NativeWorkflowRepairTest.isolatedDatabase(registry);
    }
    @Autowired DataSource dataSource;
    @Autowired JdbcTemplate db;
    @Autowired ObjectMapper json;
    @Autowired RedmineService redmine;
    @Autowired RedmineWorker worker;
    @MockitoSpyBean RedmineConfiguration config;
    @MockitoBean RedmineClient remote;
    NativeFqFixture f;
    long bug;

    @BeforeEach void fixture()throws Exception {
        Connection c=DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try {f=NativeFqFixture.seed(c,true);}
        finally {DataSourceUtils.releaseConnection(c,dataSource);}
        // Dedicated schema only, rolled back with this test; exclude unrelated queued fixtures.
        db.update("UPDATE redmine_outbox SET status='SUPERSEDED' WHERE active_binding IS NOT NULL");
        bug=Objects.requireNonNull(db.queryForObject("SELECT id FROM work_items WHERE project_id=?",Long.class,f.project));
        var mapping=new RedmineConfiguration.Mapping(1,2,3,Map.of("open",1L,"progress",2L,"recheck",3L,"clarify",4L,"ready",5L,"planning",6L,"resolved",7L,"unreproducible",8L,"wontfix",9L,"closed",10L),Map.of("HIGH",3L,"MEDIUM",2L,"LOW",1L));
        doReturn(true).when(config).configured(f.project);
        doReturn(mapping).when(config).mapping(f.project);
        doReturn(java.net.URI.create("http://127.0.0.1:3080")).when(config).base();
        doReturn(String.format("%064x",f.project)).when(config).instanceHash();
    }
    void queue()throws Exception {
        redmine.queue(f.project,f.pm,bug,new RedmineDtos.Publish(0L,UUID.randomUUID().toString(),"Permission regression",null),false);
        var payload=json.readValue(db.queryForObject("SELECT payload_json FROM redmine_outbox WHERE project_id=?",String.class,f.project),RedminePayload.class);
        when(remote.find(any(),anyString())).thenReturn(List.of());
        when(remote.create(any(),any())).thenReturn(42L);
        when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,payload));
    }
    Map<String,Object> result(){return db.queryForMap("SELECT status,error_code FROM redmine_outbox WHERE project_id=?",f.project);}

    @Test void adminWithInactiveMemberAttributionCanQueueAndWorkerPublishes()throws Exception {
        db.update("UPDATE identity_users SET role_code='ADMIN' WHERE id=?",f.pm);
        db.update("UPDATE project_memberships SET active=FALSE,project_role='MEMBER' WHERE id=?",f.pmMember);
        queue();
        assertThat(worker.runOne()).isTrue();
        assertThat(result()).containsEntry("status","DELIVERED").containsEntry("error_code",null);
        verify(remote,times(1)).create(any(),any());
        assertThat(db.queryForObject("SELECT active FROM project_memberships WHERE id=?",Boolean.class,f.pmMember)).isFalse();
    }
    @Test void activeProjectPmStillPublishes()throws Exception {
        queue();
        assertThat(worker.runOne()).isTrue();
        assertThat(result()).containsEntry("status","DELIVERED");
        verify(remote,times(1)).create(any(),any());
    }
    @ParameterizedTest @ValueSource(strings={"DEV","INACTIVE_PM","NON_PM","DISABLED_ADMIN","ARCHIVED_ADMIN"})
    void currentRevokedAuthorityStopsQueuedDispatchWithoutRemoteCalls(String change)throws Exception {
        queue();
        switch(change) {
            case "DEV" -> db.update("UPDATE identity_users SET role_code='DEV' WHERE id=?",f.pm);
            case "INACTIVE_PM" -> db.update("UPDATE project_memberships SET active=FALSE WHERE id=?",f.pmMember);
            case "NON_PM" -> db.update("UPDATE project_memberships SET project_role='MEMBER' WHERE id=?",f.pmMember);
            case "DISABLED_ADMIN" -> db.update("UPDATE identity_users SET role_code='ADMIN',enabled=FALSE WHERE id=?",f.pm);
            case "ARCHIVED_ADMIN" -> {
                db.update("UPDATE identity_users SET role_code='ADMIN' WHERE id=?",f.pm);
                db.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",f.project);
            }
            default -> throw new IllegalArgumentException(change);
        }
        assertThat(worker.runOne()).isTrue();
        assertThat(result()).containsEntry("status","FAILED").containsEntry("error_code","PUBLISH_PERMISSION_REVOKED");
        verifyNoInteractions(remote);
    }
}
