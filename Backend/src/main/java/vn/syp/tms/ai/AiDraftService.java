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
                       String instructions, JsonNode data, JsonNode schema, List<Source> sources) {}
    private final AiDraftStore store;
    private final OpenAiResponsesClient client;
    private final ObjectMapper json;

    public AiDraftService(AiDraftStore store, OpenAiResponsesClient client, ObjectMapper json) {
        this.store = store;
        this.client = client;
        this.json = json;
    }

    // Reserve/save use their own short transactions; no database locks during the paid API request.
    @Transactional(propagation = Propagation.NEVER)
    public AiDraftStore.Draft generate(long projectId, String actor, Task task) {
        var reserved = store.reserve(projectId, actor, task);
        if (!reserved.created()) return store.get(projectId, actor, reserved.id());
        OpenAiResponsesClient.Output output;
        try {
            output = client.generate(task.instructions(), task.data(), "tms_draft", task.schema());
            output = new OpenAiResponsesClient.Output(AiDraftContent.validateAndWrap(output.value(), task.sources(), json),
                    output.responseId(), output.model(), output.inputTokens(), output.outputTokens());
        } catch (OpenAiResponsesClient.Failure failure) {
            store.markFailed(projectId, actor, reserved.id(), failure.code());
            return store.get(projectId, actor, reserved.id());
        }
        try {
            return store.complete(projectId, actor, reserved.id(), output);
        } catch (BusinessException permissionOrExpiryChanged) {
            store.markFailed(projectId, actor, reserved.id(), "AI_CONTEXT_CHANGED");
            throw permissionOrExpiryChanged;
        }
    }
}
