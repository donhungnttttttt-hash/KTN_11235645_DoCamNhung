package vn.syp.tms.ai;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Small hourly batches. Expired content is immediately inaccessible even between cleanup runs. */
@Component
public class AiDraftCleanup {
    private final AiDraftStore drafts;
    public AiDraftCleanup(AiDraftStore drafts) { this.drafts = drafts; }

    @Scheduled(cron = "${TMS_AI_DRAFT_CLEANUP_CRON:0 0 * * * *}", zone = "UTC")
    public void purge() { drafts.purgeExpired(); }
}
