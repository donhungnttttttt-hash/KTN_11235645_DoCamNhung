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
    private final AiProviderGateway gateway;
    public AiAssistanceService(AiContextService context,AiDraftService generator,AiDraftStore drafts) {
        this.context=context;this.generator=generator;this.drafts=drafts;this.gateway=null;
    }
    @org.springframework.beans.factory.annotation.Autowired
    public AiAssistanceService(AiContextService context,AiDraftService generator,AiDraftStore drafts,AiProviderGateway gateway) {
        this.context=context;this.generator=generator;this.drafts=drafts;this.gateway=gateway;
    }
    @Transactional(propagation=Propagation.NEVER)
    public AiDraftStore.Draft generate(long p,String actor,String purposeCode,Long target,String key,AiProviderGateway.Selection requested) {
        if(gateway==null)return generate(p,actor,purposeCode,target,key);
        var purpose=AiPurpose.parse(purposeCode);AiContextService.validateTarget(purpose,target);
        if(key==null||!key.matches("[A-Za-z0-9_-]{8,64}"))fail(422,"AI_INVALID_INPUT","Invalid AI request key.");
        try {
            var selection=gateway.normalize(requested);
            var previous=drafts.findRequest(p,actor,purpose,AiContextService.source(p,purpose,target),key,selection,requested==null||requested.model()==null);
            if(previous!=null)return previous;
            // Source authorization precedes model-list or inference traffic.
            var task=context.prepare(p,actor,purpose,target,key);
            return generator.generate(p,actor,task.withSelection(gateway.resolve(actor,selection)));
        }catch(OpenAiResponsesClient.Failure failure){throw new vn.syp.tms.shared.web.BusinessException(422,failure.code(),"AI provider request could not be completed.");}
    }
    @Transactional(propagation=Propagation.NEVER)
    public AiDraftStore.Draft generate(long p,String actor,String purposeCode,Long target,String key) {
        if(gateway!=null)return generate(p,actor,purposeCode,target,key,null);
        var purpose=AiPurpose.parse(purposeCode);AiContextService.validateTarget(purpose,target);
        if(key==null||!key.matches("[A-Za-z0-9_-]{8,64}"))fail(422,"AI_INVALID_INPUT","Mã yêu cầu AI không hợp lệ.");
        // Intent is stable across retries, while source facts may have changed since the first request.
        var previous=drafts.findRequest(p,actor,purpose,AiContextService.source(p,purpose,target),key);
        if(previous!=null)return previous;
        if(!context.metadata(p,actor).enabled())fail(503,"AI_DISABLED","AI chưa được bật hoặc chưa cấu hình khóa kết nối.");
        return generator.generate(p,actor,context.prepare(p,actor,purpose,target,key));
    }
}
