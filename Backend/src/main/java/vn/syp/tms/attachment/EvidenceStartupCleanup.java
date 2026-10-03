package vn.syp.tms.attachment;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class EvidenceStartupCleanup {
    private final EvidenceService service;
    public EvidenceStartupCleanup(EvidenceService service) { this.service=service; }
    @EventListener(ApplicationReadyEvent.class)
    public void reconcile() { service.reconcileOrphans(); }
}
