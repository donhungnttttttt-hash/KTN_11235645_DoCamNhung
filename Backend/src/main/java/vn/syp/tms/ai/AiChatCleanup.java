package vn.syp.tms.ai;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AiChatCleanup {
    private final AiChatStore chats;
    public AiChatCleanup(AiChatStore chats){this.chats=chats;}
    @Scheduled(cron="${TMS_AI_CHAT_CLEANUP_CRON:0 10 * * * *}",zone="UTC")
    public void purge(){chats.purgeExpired();}
}
