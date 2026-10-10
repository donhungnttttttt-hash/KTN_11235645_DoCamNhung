package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.shared.web.BusinessException;

/** Future use-case handlers supply server-owned prompts/schemas and already scoped source data. */
@Service
public class AiDraftService {
    public record Source(String ref, String label, String path, Long version) {}
    public record Task(String purpose, String sourceReference, String promptVersion, String requestKey,
                       String instructions, JsonNode data, JsonNode schema, List<Source> sources,
                       AiProviderGateway.ResolvedSelection selection) {
        public Task(String purpose,String sourceReference,String promptVersion,String requestKey,String instructions,JsonNode data,JsonNode schema,List<Source> sources) {
            this(purpose,sourceReference,promptVersion,requestKey,instructions,data,schema,sources,null);
        }
        public Task withSelection(AiProviderGateway.ResolvedSelection value){return new Task(purpose,sourceReference,promptVersion,requestKey,instructions,data,schema,sources,value);}
    }
    private final AiDraftStore store;
    private final OpenAiResponsesClient client;
    private final ObjectMapper json;
    private final AiProviderGateway gateway;

    public AiDraftService(AiDraftStore store, OpenAiResponsesClient client, ObjectMapper json) {
        this.store = store;
        this.client = client;
        this.json = json;
        this.gateway = null;
    }
    @org.springframework.beans.factory.annotation.Autowired
    public AiDraftService(AiDraftStore store,OpenAiResponsesClient client,ObjectMapper json,AiProviderGateway gateway) {
        this.store=store;this.client=client;this.json=json;this.gateway=gateway;
    }

    // Reserve/save use their own short transactions; no database locks during the paid API request.
    @Transactional(propagation = Propagation.NEVER)
    public AiDraftStore.Draft generate(long projectId, String actor, Task task) {
        var session=task.selection()==null?null:gateway.captureSession(actor);
        var reserved = store.reserve(projectId, actor, task);
        if (!reserved.created()) return store.get(projectId, actor, reserved.id());
        OpenAiResponsesClient.Output output;
        try {
            if(task.selection()!=null)gateway.verifySession(session);
            output = task.selection()==null?client.generate(task.instructions(), task.data(), "tms_draft", task.schema()):
                    gateway.generate(actor,task.selection(),task.instructions(),task.data(),"tms_draft",task.schema());
            output = new OpenAiResponsesClient.Output(AiDraftContent.validateAndWrap(output.value(), task.sources(), json),
                    output.responseId(), output.model(), output.inputTokens(), output.outputTokens());
        } catch (OpenAiResponsesClient.Failure failure) {
            store.markFailed(projectId, actor, reserved.id(), failure.code());
            return store.get(projectId, actor, reserved.id());
        } catch (BusinessException permissionOrSessionChanged) {
            store.markFailed(projectId, actor, reserved.id(), "AI_CONTEXT_CHANGED");
            throw permissionOrSessionChanged;
        }
        try {
            final var completed=output;
            return task.selection()==null?store.complete(projectId, actor, reserved.id(), output):
                    gateway.withCurrent(actor,task.selection(),()->{
                        gateway.verifySession(session);
                        return store.complete(projectId,actor,reserved.id(),completed);
                    });
        } catch (OpenAiResponsesClient.Failure connectionChanged) {
            store.markFailed(projectId,actor,reserved.id(),connectionChanged.code());
            return store.get(projectId,actor,reserved.id());
        } catch (BusinessException permissionOrExpiryChanged) {
            store.markFailed(projectId, actor, reserved.id(), "AI_CONTEXT_CHANGED");
            throw permissionOrExpiryChanged;
        }
    }
}
