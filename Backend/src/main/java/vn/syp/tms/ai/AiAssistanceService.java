package vn.syp.tms.ai;

import static vn.syp.tms.workitem.WorkItemStore.fail;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiAssistanceService {
    private final AiContextService context;
    private final AiDraftService generator;
    private final AiDraftStore drafts;
    public AiAssistanceService(AiContextService context,AiDraftService generator,AiDraftStore drafts) {
        this.context=context;this.generator=generator;this.drafts=drafts;
    }
    @Transactional(propagation=Propagation.NEVER)
    public AiDraftStore.Draft generate(long p,String actor,String purposeCode,Long target,String key) {
        var purpose=AiPurpose.parse(purposeCode);AiContextService.validateTarget(purpose,target);
        if(key==null||!key.matches("[A-Za-z0-9_-]{8,64}"))fail(422,"AI_INVALID_INPUT","Mã yêu cầu AI không hợp lệ.");
        // Intent is stable across retries, while source facts may have changed since the first request.
        var previous=drafts.findRequest(p,actor,purpose,AiContextService.source(p,purpose,target),key);
        if(previous!=null)return previous;
        if(!context.metadata(p,actor).enabled())fail(503,"AI_DISABLED","AI chưa được bật hoặc chưa cấu hình khóa kết nối.");
        return generator.generate(p,actor,context.prepare(p,actor,purpose,target,key));
    }
}
