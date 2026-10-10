package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import org.junit.jupiter.api.Test;

class AiDraftContentTest {
    private final ObjectMapper json=new ObjectMapper();
    private final List<AiDraftService.Source> sources=List.of(new AiDraftService.Source("S1","Ticket số 1","/board/issue/1",1L));
    private ObjectNode answer() {
        var node=json.createObjectNode().put("title","Bản nháp").put("summary","Cần xác minh");
        node.putArray("observations").addObject().put("text","Ticket thiếu bước tái hiện").putArray("sourceRefs").add("S1");
        node.putArray("suggestedActions");node.putArray("missingInformation").add("Cần bước tái hiện");
        return node;
    }
    @Test void retainsValidAnswerAndServerOwnedReferences() {
        var result=AiDraftContent.validateAndWrap(answer(),sources,json);
        assertThat(result.path("answer").path("title").asText()).isEqualTo("Bản nháp");
        assertThat(result.path("sources").get(0).path("ref").asText()).isEqualTo("S1");
    }
    @Test void inventedCitationCannotBecomeReadyDraft() {
        var node=answer();((ObjectNode)node.path("observations").get(0)).putArray("sourceRefs").add("OTHER_PROJECT");
        assertThatThrownBy(()->AiDraftContent.validateAndWrap(node,sources,json)).hasMessage("AI_INVALID_RESPONSE");
    }
    @Test void unsupportedShapeAndExcessiveOutputAreRejected() {
        assertThatThrownBy(()->AiDraftContent.validateAndWrap(json.createObjectNode().put("summary","Only this"),sources,json)).hasMessage("AI_INVALID_RESPONSE");
        var node=answer().put("summary","x".repeat(1601));
        assertThatThrownBy(()->AiDraftContent.validateAndWrap(node,sources,json)).hasMessage("AI_INVALID_RESPONSE");
    }
    @Test void modelCannotSupplyItsOwnSourceUrlOrExtraActionFields() {
        var node=answer();node.put("url","https://untrusted.example");
        assertThatThrownBy(()->AiDraftContent.validateAndWrap(node,sources,json)).hasMessage("AI_INVALID_RESPONSE");
    }
}
