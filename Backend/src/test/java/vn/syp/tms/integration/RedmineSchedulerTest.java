package vn.syp.tms.integration;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
class RedmineSchedulerTest {
    @Test void dispatchSurvivesAWorkerFailureSoFutureTicksCanRecoverTheLease() {
        var worker=mock(RedmineWorker.class);when(worker.runOne()).thenThrow(new IllegalStateException("private cause")).thenReturn(true);
        var scheduler=new RedmineScheduler(worker);
        assertThatCode(scheduler::dispatch).doesNotThrowAnyException();scheduler.dispatch();verify(worker,times(2)).runOne();
    }
}
