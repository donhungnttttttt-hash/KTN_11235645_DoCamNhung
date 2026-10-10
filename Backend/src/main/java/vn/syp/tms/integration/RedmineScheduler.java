package vn.syp.tms.integration;

import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration @EnableScheduling
@ConditionalOnExpression("${TMS_REDMINE_ENABLED:false} && ${TMS_REDMINE_WORKER_ENABLED:true}")
public class RedmineScheduler {
    private final RedmineWorker worker;
    public RedmineScheduler(RedmineWorker worker){this.worker=worker;}
    @Scheduled(fixedDelayString="${TMS_REDMINE_POLL_MS:3000}",initialDelayString="${TMS_REDMINE_POLL_MS:3000}")
    public void dispatch() {
        try{worker.runOne();}catch(RuntimeException e){LoggerFactory.getLogger(RedmineScheduler.class).warn("Redmine dispatch interrupted; persisted lease will be reconciled. Inspect local database availability.");}
    }
}
