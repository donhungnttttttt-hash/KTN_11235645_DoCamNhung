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
import org.springframework.transaction.*;
import org.springframework.transaction.support.TransactionTemplate;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

/** Committed UUID-owned fixtures retained in isolated target for evidence; no broad cleanup. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE",matches="integration")
class NativeCurrentProjectLifecycleConcurrencyTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){vn.syp.tms.support.CurrentWorkflowDatabaseGuard.configure(r);}
    @Autowired PlatformTransactionManager manager;@Autowired JdbcTemplate jdbc;@Autowired WorkItemStore db;@Autowired ProjectLifecycleService lifecycle;
    @Autowired DeviceInventoryService inventory;
    TransactionTemplate tx;String admin,pm;long project,member,cycle;
    @BeforeEach void fixture() {
        tx=new TransactionTemplate(manager);tx.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        tx.executeWithoutResult(s->{
            var existing=jdbc.queryForList("SELECT user_id FROM system_admin_registry WHERE slot=1",String.class);
            if(existing.isEmpty()){admin=user("ADMIN");jdbc.update("INSERT INTO system_admin_registry(slot,user_id) VALUES(1,?)",admin);}else admin=existing.getFirst();
            pm=user("PM");project=db.insert("INSERT INTO projects(code,name,created_at,created_by,updated_at,updated_by) VALUES(?,'AR06 concurrent',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)","AR"+pm.substring(0,12),admin,admin);
            member=db.insert("INSERT INTO project_memberships(project_id,user_id,project_role,created_at,updated_at) VALUES(?,?,'PM',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",project,pm);
            cycle=cycle("FIRST");
        });
    }
    String user(String role){String id=UUID.randomUUID().toString();jdbc.update("INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES(?,?,'AR06 race','not-login',?,UTC_TIMESTAMP(6))",id,"ar06."+id,role);return id;}
    long cycle(String code){return db.insert("INSERT INTO test_cycles(project_id,code,name,status_code,created_at,created_by,activated_at,activated_by) VALUES(?,?,'Legacy cycle','ACTIVE',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)",project,code,member,member);}
    ProjectLifecycleService.Command command(String key){return new ProjectLifecycleService.Command(0L,"Accepted legacy history",key,new ProjectLifecycleService.LegacyException(true,(String)lifecycle.readiness(admin,project).get("legacyExceptionFingerprint")));}
    @Test void sameCountReplacementInvalidatesPreview()throws Exception {
        var command=command("replacement-key");
        race(()->{jdbc.update("UPDATE test_cycles SET status_code='CLOSED',lock_version=lock_version+1 WHERE id=?",cycle);cycle("REPLACEMENT");},()->lifecycle.decide(admin,project,command,true),"LEGACY_BLOCKERS_CHANGED",false);
        unchanged();
    }
    @Test void hardBlockerCommittedAfterPreviewStillBlocksArchive()throws Exception {
        var command=command("hard-after-preview");
        race(()->db.insert("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,1,?,'TASK','Pending ordinary task','Required work',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'race-work',REPEAT('b',64))",project,"AR06-"+project,member,member),()->lifecycle.decide(admin,project,command,true),"ARCHIVE_BLOCKED",false);
        unchanged();
    }
    @Test void committedArchiveBlocksNewDeviceAllocationDespiteOldSnapshot()throws Exception {
        jdbc.update("UPDATE test_cycles SET status_code='CLOSED' WHERE id=?",cycle);
        long asset=WorkItemStore.number(inventory.create(admin,new DeviceInventoryDtos.Asset("AR06-"+UUID.randomUUID(),"IPAD","Archive boundary",null,"iPadOS","18","AVAILABLE","",null)),"id");
        var archive=new ProjectLifecycleService.Command(0L,"Accepted delivery","archive-before-allocation");
        race(()->lifecycle.decide(admin,project,archive,true),
            ()->inventory.assign(admin,new DeviceInventoryDtos.Assign(asset,project,pm,null,"Too late",0L)),"ARCHIVED",false);
        assertThat(jdbc.queryForObject("SELECT archived_at FROM projects WHERE id=?",Object.class,project)).isNotNull();
        assertThat(count("device_allocations")).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM device_allocations WHERE asset_id=?",Long.class,asset)).isZero();
        assertThat(jdbc.queryForObject("SELECT lock_version FROM device_assets WHERE id=?",Long.class,asset)).isZero();
        assertThat(count("project_lifecycle_decisions")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND action='ASSIGN'",Long.class,project)).isZero();
    }
    @Test void adminRevocationBeforeSubmitBlocksArchive()throws Exception {
        var command=command("revoked-before-submit");
        try{race(()->jdbc.update("UPDATE identity_users SET role_code='PM' WHERE id=?",admin),()->lifecycle.decide(admin,project,command,true),"ADMIN_REQUIRED",true);unchanged();}
        finally{jdbc.update("UPDATE identity_users SET role_code='ADMIN' WHERE id=?",admin);}
    }
    @Test void concurrentArchiveRequestsHaveOneWinner()throws Exception {
        var first=command("winner-first");var second=command("winner-second");
        race(()->lifecycle.decide(admin,project,first,true),()->lifecycle.decide(admin,project,second,true),"VERSION_CONFLICT",false);
        assertThat(count("project_lifecycle_decisions")).isEqualTo(1);assertThat(count("project_audit")).isEqualTo(1);
    }
    @Test void sameRequestKeyReplaysOnce()throws Exception {
        var command=command("same-key-concurrent");race(()->lifecycle.decide(admin,project,command,true),()->lifecycle.decide(admin,project,command,true),null,false);
        assertThat(count("project_lifecycle_decisions")).isEqualTo(1);assertThat(count("project_audit")).isEqualTo(1);
    }
    @Test void rollsBackDecisionAndProjectTogether() {
        var command=command("rollback-everything");
        assertThatThrownBy(()->tx.executeWithoutResult(s->{lifecycle.decide(admin,project,command,true);throw new IllegalStateException("Injected failure after audit");})).isInstanceOf(IllegalStateException.class);
        unchanged();assertThat(count("project_audit")).isZero();
        assertThat(lifecycle.decide(admin,project,command,true)).containsEntry("archived",true);assertThat(count("project_lifecycle_decisions")).isEqualTo(1);
    }
    long count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE project_id=?",Long.class,project);}
    void unchanged(){assertThat(jdbc.queryForObject("SELECT archived_at FROM projects WHERE id=?",Object.class,project)).isNull();assertThat(count("project_lifecycle_decisions")).isZero();}
    void race(Runnable first,Runnable second,String code,boolean identity)throws Exception {
        var locked=new CountDownLatch(1);var snapshot=new CountDownLatch(1);
        try(var workers=Executors.newFixedThreadPool(2)) {
            var writer=workers.submit(()->tx.executeWithoutResult(s->{
                if(identity)jdbc.queryForObject("SELECT id FROM identity_users WHERE id=? FOR UPDATE",String.class,admin);else jdbc.queryForObject("SELECT id FROM projects WHERE id=? FOR UPDATE",Long.class,project);
                first.run();locked.countDown();await(snapshot);
            }));
            var waiter=workers.submit(()->{await(locked);org.assertj.core.api.ThrowableAssert.ThrowingCallable action=()->tx.executeWithoutResult(s->{jdbc.queryForObject("SELECT COUNT(*) FROM projects WHERE id=?",Long.class,project);snapshot.countDown();second.run();});if(code==null)assertThatCode(action).doesNotThrowAnyException();else assertThatThrownBy(action).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo(code));});
            writer.get(25,TimeUnit.SECONDS);waiter.get(25,TimeUnit.SECONDS);
        }
    }
    static void await(CountDownLatch latch){try{assertThat(latch.await(15,TimeUnit.SECONDS)).isTrue();}catch(InterruptedException e){Thread.currentThread().interrupt();throw new AssertionError(e);}}
}
