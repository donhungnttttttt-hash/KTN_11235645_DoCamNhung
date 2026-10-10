package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.shared.web.BusinessException;

/** Requires an isolated, explicitly provisioned schema. Never connects to the application schema. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named="TMS_TEST_DB_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+")
class NativeAdminCurrentReadTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){AdminNativeIntegrationTest.database(r);}
    @Autowired PlatformTransactionManager transactions;
    @Autowired JdbcTemplate jdbc;
    @Autowired IdentityUserRepository users;
    @Autowired AdminProjectService adminProjects;
    @Autowired ProjectService projects;
    String admin,a,b;long project;TransactionTemplate tx;
    @BeforeEach void fixture() {
        tx=new TransactionTemplate(Objects.requireNonNull(transactions));
        tx.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_REPEATABLE_READ);
        String tag=UUID.randomUUID().toString().substring(0,8);
        tx.executeWithoutResult(status->{
            admin=users.saveAndFlush(new IdentityUser("cr.admin."+tag,"Admin","not-a-login","ADMIN")).getId();
            a=users.saveAndFlush(new IdentityUser("cr.a."+tag,"A","not-a-login","PM")).getId();
            b=users.saveAndFlush(new IdentityUser("cr.b."+tag,"B","not-a-login","PM")).getId();
            project=((Number)adminProjects.create(admin,new AdminProjectService.Create(new ProjectDtos.CreateProject("CR"+tag,"Current","","UTC"),List.of(new AdminProjectService.InitialMember(a,"PM"),new AdminProjectService.InitialMember(b,"PM")))).get("id")).longValue();
        });
    }
    @AfterEach void cleanup() {
        tx.executeWithoutResult(status->{
            jdbc.update("DELETE FROM project_audit WHERE project_id=?",project);
            jdbc.update("DELETE FROM project_memberships WHERE project_id=?",project);
            jdbc.update("DELETE FROM projects WHERE id=?",project);
            jdbc.update("DELETE FROM identity_users WHERE id IN (?,?,?)",admin,a,b);
        });
    }
    @Test void distinctPmRemovalCannotUseOldTwoMemberSnapshot() throws Exception {
        staleSnapshotRace(()->projects.removeMember(project,admin,a,0L),()->projects.removeMember(project,admin,b,0L),"LAST_PM");
    }
    @Test void distinctPmDemotionCannotUseOldTwoMemberSnapshot() throws Exception {
        staleSnapshotRace(()->projects.addOrUpdateMember(project,admin,a,new ProjectDtos.SetMember("TESTER",0L)),()->projects.addOrUpdateMember(project,admin,b,new ProjectDtos.SetMember("TESTER",0L)),"LAST_PM");
    }
    @Test void sameProjectVersionCannotOverwriteCommittedPatch() throws Exception {
        staleSnapshotRace(()->adminProjects.update(admin,project,new ProjectDtos.UpdateProject("First",null,null,0L)),()->adminProjects.update(admin,project,new ProjectDtos.UpdateProject("Second",null,null,0L)),"VERSION_CONFLICT");
        assertThat(jdbc.queryForObject("SELECT name FROM projects WHERE id=?",String.class,project)).isEqualTo("First");
    }
    @Test void currentTargetRoleOverridesCachedEntityAndOldSnapshot() throws Exception {
        staleSnapshotRace(()->jdbc.update("UPDATE identity_users SET role_code='DEV' WHERE id=?",b),()->projects.addOrUpdateMember(project,admin,b,new ProjectDtos.SetMember("PM",0L)),"INVALID_ROLE");
    }
    private void staleSnapshotRace(Runnable first,Runnable second,String code) throws Exception {
        var locked=new CountDownLatch(1);var snapshot=new CountDownLatch(1);
        try(var workers=Executors.newFixedThreadPool(2)) {
            var writer=workers.submit(()->tx.executeWithoutResult(status->{
                jdbc.queryForObject("SELECT id FROM projects WHERE id=? FOR UPDATE",Long.class,project);
                first.run();locked.countDown();await(snapshot);
            }));
            var waiter=workers.submit(()->{
                await(locked);
                assertThatThrownBy(()->tx.executeWithoutResult(status->{
                    // Materialize both an old RR snapshot and cached JPA target before the first commit.
                    users.findById(Objects.requireNonNull(b));
                    jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND active=TRUE",Long.class,project);
                    snapshot.countDown();second.run();
                })).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo(code));
            });
            writer.get(15,TimeUnit.SECONDS);waiter.get(15,TimeUnit.SECONDS);
        }
    }
    private static void await(CountDownLatch latch) {
        try {assertThat(latch.await(10,TimeUnit.SECONDS)).isTrue();}
        catch(InterruptedException e){Thread.currentThread().interrupt();throw new AssertionError(e);}
    }
}
