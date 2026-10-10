package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.syp.tms.workitem.WorkItemStore.number;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.syp.tms.qa.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.*;

/** Real commits; unique owned fixtures retained as evidence in the explicitly isolated V19 schema. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="integration")
class NativeFileWorkQaConcurrencyTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r)throws Exception {
        NativeFileWorkQaIntegrationTest.isolatedDatabaseBeforeSpring(r);
        r.add("spring.datasource.hikari.connection-init-sql",()->"SET SESSION innodb_lock_wait_timeout=5");
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @Autowired WorkItemService work;
    @Autowired QaService qa;
    @MockitoSpyBean FileWorkGuard guard;
    NativeFqFixture f;
    TransactionTemplate tx;
    @BeforeEach void fixture()throws Exception {
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        tx=new TransactionTemplate(Objects.requireNonNull(transactions));tx.setTimeout(12);
        try(var c=NativeFqDatabase.connect()){c.setAutoCommit(false);f=NativeFqFixture.seed(c,false);c.commit();}
    }
    @Test void identityShareWhileWaitingForProjectDoesNotDeadlockJoinedQaNames()throws Exception {
        long id=createQa();var projectHeld=new CountDownLatch(1);var identityHeld=new CountDownLatch(1);
        afterIdentity(f.tester,identityHeld,null);
        race(()->tx.executeWithoutResult(s->{
            qa.authorize(f.project,f.pm,false);projectHeld.countDown();await(identityHeld);
            assertThat(qa.detail(f.project,f.pm,id).item().creatorName()).isEqualTo("TESTER");
        }),()->{await(projectHeld);assertThat(qa.detail(f.project,f.tester,id).item().id()).isEqualTo(id);});
    }
    @Test void committedBugStatusAndVersionRejectStaleCommandWithoutLostUpdate()throws Exception {
        long id=createBug();
        committedRace(()->work.transition(f.project,f.pm,id,new WorkItemDtos.Transition("progress","First writer",null,0L)),
            ()->expectCode(()->work.transition(f.project,f.dev,id,new WorkItemDtos.Transition("resolved","Stale",f.build,0L)),"VERSION_CONFLICT"));
        assertThat(work.get(f.project,f.pm,id)).containsEntry("status","progress").containsEntry("version",1L);
        assertThat(count("work_item_history")).isEqualTo(2);
    }
    @Test void committedBugReassignmentRevokesPreviousDeveloperCommentAuthority()throws Exception {
        long id=createBug();
        committedRace(()->work.update(f.project,f.pm,id,new WorkItemDtos.Update("Native bug","","MEDIUM",null,null,f.dev2Member,"Steps","Expected","Observed","Reassign",0L)),
            ()->expectCode(()->work.comment(f.project,f.dev,id,new WorkItemDtos.Comment("Old owner","INTERNAL","old-owner-comment")),"FORBIDDEN"));
        assertThat(work.get(f.project,f.pm,id)).containsEntry("assigneeMembershipId",f.dev2Member).containsEntry("version",1L);
        assertThat(count("work_item_comments")).isZero();
    }
    @Test void concurrentExactQaCommentReplayCommitsOneCommentAndSameId()throws Exception {
        long id=createQa();var identityHeld=new CountDownLatch(2);var start=new CountDownLatch(1);
        afterIdentity(f.tester,identityHeld,start);
        var input=new WorkItemDtos.Comment("Concurrent answer discussion","INTERNAL","same-comment-key");
        var pool=Executors.newFixedThreadPool(2);
        Future<Object> a=pool.submit(()->work.comment(f.project,f.tester,id,input));
        Future<Object> b=pool.submit(()->work.comment(f.project,f.tester,id,input));
        try {await(identityHeld);start.countDown();assertThat(a.get(15,TimeUnit.SECONDS)).isEqualTo(b.get(15,TimeUnit.SECONDS));}
        finally {start.countDown();stop(pool,a,b);}
        assertThat(count("work_item_comments")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND entity_type='WORK_ITEM_COMMENT'",Long.class,f.project)).isEqualTo(1);
    }
    @Test void independentCommandsCommitAndFailedBatchRollsBackEarlierWrites()throws Exception {
        long first=createBug(),second=createBug();
        // A new physical JDBC connection sees both service commits with no outer test transaction.
        try(var c=NativeFqDatabase.connect()) {assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM work_items WHERE project_id=?",f.project)).isEqualTo(2);}
        var before=snapshot();
        expectCode(()->work.batch(f.project,f.pm,new WorkItemDtos.Batch(List.of(new WorkItemDtos.BatchEntry(first,0L),new WorkItemDtos.BatchEntry(second,99L)),"progress","Atomic batch",null)),"VERSION_CONFLICT");
        assertThat(snapshot()).isEqualTo(before);
        assertThat(work.get(f.project,f.pm,first)).containsEntry("status","open").containsEntry("version",0L);
    }
    private long createQa() {return qa.create(f.project,f.tester,new QaDtos.Create("Native QA","Expected?","MEDIUM",null,null,null,null,null,null,"qa-"+UUID.randomUUID())).item().id();}
    private long createBug() {return number(work.create(f.project,f.pm,new WorkItemDtos.Create("BUG","Native bug","","MEDIUM",null,null,f.devMember,"Steps","Expected","Observed",f.build,f.environment,f.device,null,null,"Native concurrency fixture","bug-"+UUID.randomUUID())),"id");}
    private long count(String table) {return Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE project_id=?",Long.class,f.project));}
    private List<List<Map<String,Object>>> snapshot() {
        return List.of("work_items","bug_details","work_item_history","project_counters","project_audit").stream()
            .map(t->jdbc.queryForList("SELECT * FROM "+t+" WHERE project_id=? ORDER BY 1,2",f.project)).toList();
    }
    private void committedRace(Runnable first,Runnable second)throws Exception {
        var writerDone=new CountDownLatch(1);var waiterIdentity=new CountDownLatch(1);var committed=new CountDownLatch(1);
        afterIdentity(f.dev,waiterIdentity,committed);
        race(()->{tx.executeWithoutResult(s->{first.run();writerDone.countDown();await(waiterIdentity);});committed.countDown();},
            ()->{await(writerDone);second.run();});
    }
    // Only observes a real completed identity SHARE lock. All SQL and service methods remain real.
    private void afterIdentity(String actor,CountDownLatch reached,CountDownLatch release) {
        doAnswer(invocation->{Object account=invocation.callRealMethod();reached.countDown();if(release!=null)await(release);return account;}).when(guard).lockIdentity(actor);
    }
    private static void expectCode(Runnable action,String code) {assertThatThrownBy(action::run).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo(code));}
    private static void race(Runnable first,Runnable second)throws Exception {
        var pool=Executors.newFixedThreadPool(2);var a=pool.submit(first);var b=pool.submit(second);
        try {a.get(18,TimeUnit.SECONDS);b.get(18,TimeUnit.SECONDS);}finally {stop(pool,a,b);}
    }
    private static void stop(ExecutorService pool,Future<?> a,Future<?> b)throws InterruptedException {
        a.cancel(true);b.cancel(true);pool.shutdownNow();assertThat(pool.awaitTermination(15,TimeUnit.SECONDS)).isTrue();
    }
    private static void await(CountDownLatch latch) {
        try {assertThat(latch.await(10,TimeUnit.SECONDS)).as("Deterministic race rendezvous").isTrue();}
        catch(InterruptedException e){Thread.currentThread().interrupt();throw new AssertionError(e);}
    }
}
