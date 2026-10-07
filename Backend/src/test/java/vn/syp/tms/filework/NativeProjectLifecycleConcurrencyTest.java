package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static vn.syp.tms.workitem.WorkItemStore.number;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.transaction.*;
import org.springframework.transaction.support.TransactionTemplate;
import vn.syp.tms.admin.*;
import vn.syp.tms.execution.*;
import vn.syp.tms.identity.IdentityUserRepository;
import vn.syp.tms.project.ProjectRepository;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

/** Committed concurrent fixtures on the verified dedicated V21 schema, removed by exact IDs only. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="lifecycle-integration")
class NativeProjectLifecycleConcurrencyTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r)throws Exception {NativeProjectLifecycleIntegrationTest.database(r);}
    @Autowired PlatformTransactionManager manager;@Autowired JdbcTemplate jdbc;@Autowired WorkItemStore db;
    @Autowired ProjectLifecycleService lifecycle;@Autowired DeviceInventoryService inventory;@Autowired ExecutionService execution;
    @Autowired ProjectRepository projects;@Autowired IdentityUserRepository users;
    TransactionTemplate tx;String admin,pm;long project,member,asset;
    @BeforeEach void fixture() {
        tx=new TransactionTemplate(Objects.requireNonNull(manager));tx.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        admin=UUID.randomUUID().toString();pm=UUID.randomUUID().toString();
        tx.executeWithoutResult(s->{
            jdbc.update("INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES(?,?,'Lifecycle Admin','not-a-login','ADMIN',UTC_TIMESTAMP(6)),(?,?,'Lifecycle PM','not-a-login','PM',UTC_TIMESTAMP(6))",admin,"lc."+admin,pm,"lc."+pm);
            project=db.insert("INSERT INTO projects(code,name,created_at,created_by,updated_at,updated_by) VALUES(?,'Concurrent lifecycle',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)","LC"+admin.substring(0,12),admin,admin);
            member=db.insert("INSERT INTO project_memberships(project_id,user_id,project_role,created_at,updated_at) VALUES(?,?,'PM',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",project,pm);
            asset=number(inventory.create(admin,new DeviceInventoryDtos.Asset("LC"+admin,"IPAD","iPad",null,"iPadOS","18","AVAILABLE","",null)),"id");
        });
    }
    @AfterEach void removeOnlyOwnFixture() {
        tx.executeWithoutResult(s->{
            jdbc.update("DELETE FROM project_audit WHERE actor_id IN (?,?)",admin,pm);
            jdbc.update("DELETE FROM project_lifecycle_decisions WHERE project_id=?",project);
            jdbc.update("DELETE FROM device_allocations WHERE project_id=?",project);
            jdbc.update("DELETE FROM test_cycles WHERE project_id=?",project);
            jdbc.update("DELETE FROM project_memberships WHERE project_id=?",project);
            jdbc.update("DELETE FROM projects WHERE id=?",project);
            jdbc.update("DELETE FROM device_assets WHERE id=?",asset);
            jdbc.update("DELETE FROM identity_users WHERE id IN (?,?)",admin,pm);
        });
    }
    private ProjectLifecycleService.Command command(String key){return new ProjectLifecycleService.Command(0L,"Accepted delivery",key);}
    @Test void committedAllocationBlocksArchiveEvenWithOldRepeatableReadSnapshot()throws Exception {
        race(()->inventory.assign(admin,new DeviceInventoryDtos.Assign(asset,project,pm,null,"Issued",0L)),
            ()->lifecycle.decide(admin,project,command("race-allocation"),true),"ARCHIVE_BLOCKED",false);
        assertThat(jdbc.queryForObject("SELECT archived_at FROM projects WHERE id=?",Object.class,project)).isNull();
    }
    @Test void committedArchiveBlocksCycleCreationEvenWithCachedActiveProject()throws Exception {
        race(()->lifecycle.decide(admin,project,command("race-archive-first"),true),
            ()->execution.create(project,pm,new ExecutionDtos.CreateCycle("NEW","New cycle",null)),"ARCHIVED",false);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM test_cycles WHERE project_id=?",Long.class,project)).isZero();
    }
    @Test void committedArchiveBlocksNewDeviceAllocation()throws Exception {
        race(()->lifecycle.decide(admin,project,command("race-device-after"),true),
            ()->inventory.assign(admin,new DeviceInventoryDtos.Assign(asset,project,pm,null,"Too late",0L)),"ARCHIVED",false);
    }
    @Test void committedReopenAllowsCycleCreationDespiteCachedArchivedProject()throws Exception {
        lifecycle.decide(admin,project,command("archive-before-reopen"),true);
        race(()->lifecycle.decide(admin,project,new ProjectLifecycleService.Command(1L,"Follow-up accepted","race-reopen-first"),false),
            ()->execution.create(project,pm,new ExecutionDtos.CreateCycle("AFTER_REOPEN","Follow-up cycle",null)),null,false);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM test_cycles WHERE project_id=? AND code='AFTER_REOPEN'",Long.class,project)).isEqualTo(1);
    }
    @Test void sameRequestKeyReplaysOnceWhileDifferentKeyRequiresFreshVersion()throws Exception {
        race(()->lifecycle.decide(admin,project,command("same-key-concurrent"),true),
            ()->lifecycle.decide(admin,project,command("same-key-concurrent"),true),null,false);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_lifecycle_decisions WHERE project_id=?",Long.class,project)).isEqualTo(1);
        assertThatThrownBy(()->lifecycle.decide(admin,project,command("different-key"),true))
            .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("VERSION_CONFLICT"));
    }
    @Test void revokedAdminCannotUseCachedAccountToArchive()throws Exception {
        race(()->jdbc.update("UPDATE identity_users SET role_code='PM' WHERE id=?",admin),
            ()->lifecycle.decide(admin,project,command("revoked-admin"),true),"ADMIN_REQUIRED",true);
        assertThat(jdbc.queryForObject("SELECT archived_at FROM projects WHERE id=?",Object.class,project)).isNull();
    }
    private void race(Runnable first,Runnable second,String code,boolean identityLock)throws Exception {
        var locked=new CountDownLatch(1);var snapshot=new CountDownLatch(1);
        try(var workers=Executors.newFixedThreadPool(2)) {
            var writer=workers.submit(()->tx.executeWithoutResult(s->{
                if(identityLock)jdbc.queryForObject("SELECT id FROM identity_users WHERE id=? FOR UPDATE",String.class,admin);
                else jdbc.queryForObject("SELECT id FROM projects WHERE id=? FOR UPDATE",Long.class,project);
                first.run();locked.countDown();await(snapshot);
            }));
            var waiter=workers.submit(()->{
                await(locked);
                var operation=(org.assertj.core.api.ThrowableAssert.ThrowingCallable)()->tx.executeWithoutResult(s->{
                    projects.findById(project);users.findById(Objects.requireNonNull(admin));
                    jdbc.queryForObject("SELECT COUNT(*) FROM projects WHERE id=?",Long.class,project);
                    snapshot.countDown();second.run();
                });
                if(code==null)assertThatCode(operation).doesNotThrowAnyException();
                else assertThatThrownBy(operation).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo(code));
            });
            writer.get(20,TimeUnit.SECONDS);waiter.get(20,TimeUnit.SECONDS);
        }
    }
    private static void await(CountDownLatch latch){try{assertThat(latch.await(12,TimeUnit.SECONDS)).isTrue();}catch(InterruptedException e){Thread.currentThread().interrupt();throw new AssertionError(e);}}
}
