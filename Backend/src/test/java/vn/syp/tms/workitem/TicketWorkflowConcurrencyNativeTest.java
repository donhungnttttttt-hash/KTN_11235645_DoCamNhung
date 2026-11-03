package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.support.UnifiedTestingFixtures;

/** Deterministic actor-B SHARE -> actor-A project UPDATE -> B comment/A assignment interleaving. */
class TicketWorkflowConcurrencyNativeTest extends UnifiedTestingFixtures {
    @Autowired FeatureIssueService issues;
    @Autowired IdentityService identity;
    @Autowired PlatformTransactionManager transactions;
    @MockitoSpyBean WorkItemStore store;
    @BeforeEach void prepare()throws Exception{testingFixture();}
    private record Outcome(Object value,Exception error) {}
    private Outcome attempt(Callable<?> action){try{return new Outcome(action.call(),null);}catch(Exception error){return new Outcome(null,error);}}
    private static void await(CountDownLatch latch){try{if(!latch.await(12,TimeUnit.SECONDS))throw new IllegalStateException("Ticket lock test barrier timed out");}catch(InterruptedException error){Thread.currentThread().interrupt();throw new IllegalStateException(error);}}
    @ParameterizedTest @ValueSource(strings={"assignment","verifier"})
    void recipientCommentAndManagerMutationDoNotUpgradeRecipientIdentityLock(String mutation)throws Exception{
        long contact=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,p,admin.getId()));
        var ticket=issues.create(p,admin.getId(),new FeatureIssueDtos.Create("BUG",f,d,row,false,"Concurrent","Evidence","Steps","Expected","Actual",UUID.randomUUID(),"","Always","Test","Desktop",contact,null,null,null,null,null));
        long id=((Number)ticket.get("id")).longValue();
        var bIdentity=new CountDownLatch(1);var aProject=new CountDownLatch(1);var bProjectAttempt=new CountDownLatch(1);
        doAnswer(call->{
            String sql=call.getArgument(0),thread=Thread.currentThread().getName();
            if(sql.contains("FROM projects WHERE id=?")&&sql.endsWith("FOR UPDATE")){
                if(thread.equals("ticket-lock-B")){bProjectAttempt.countDown();return call.callRealMethod();}
                if(thread.equals("ticket-lock-A")){Object result=call.callRealMethod();aProject.countDown();await(bProjectAttempt);return result;}
            }
            return call.callRealMethod();
        }).when(store).row(Objects.requireNonNull(anyString()),any(Object[].class));
        try(var pool=Executors.newFixedThreadPool(2)){
            var b=pool.submit(()->{Thread.currentThread().setName("ticket-lock-B");return attempt(()->new TransactionTemplate(Objects.requireNonNull(transactions)).execute(status->{
                identity.lockCurrent(worker.getId());bIdentity.countDown();await(aProject);
                return issues.comment(p,worker.getId(),id,new FeatureIssueDtos.Comment("Concurrent recipient comment",0L,UUID.randomUUID()));
            }));});
            await(bIdentity);
            var a=pool.submit(()->{Thread.currentThread().setName("ticket-lock-A");return attempt(()->issues.action(p,admin.getId(),id,new FeatureIssueDtos.Action("Assign concurrently",null,null,"assignment".equals(mutation)?member:null,"verifier".equals(mutation)?worker.getId():null,false,0L,UUID.randomUUID())));});
            var first=a.get(20,TimeUnit.SECONDS);var second=b.get(20,TimeUnit.SECONDS);
            assertThat(first.error()).as("A must commit; deadlocks map to HTTP 503").isNull();
            assertThat(second.error()).as("B must receive ordinary optimistic conflict, not a deadlock/HTTP 503").isInstanceOfSatisfying(BusinessException.class,error->assertThat(error.code()).isEqualTo("VERSION_CONFLICT"));
            assertThat(issues.get(p,admin.getId(),id)).containsEntry("version",1L);
            assertThat(issues.comments(p,admin.getId(),id)).hasSize(1);
        } finally {reset(store);}
    }
}
