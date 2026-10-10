package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Provider JSON never becomes a draft until its shape and citations match server-owned sources. */
final class AiDraftContent {
    private AiDraftContent() {}
    static JsonNode validateAndWrap(JsonNode answer, List<AiDraftService.Source> sources, ObjectMapper json) {
        exact(answer,Set.of("title","summary","observations","suggestedActions","missingInformation"));
        text(answer.path("title"),160);text(answer.path("summary"),1600);
        var refs=new HashSet<>(sources.stream().map(source->Objects.requireNonNull(source).ref()).toList());
        for(String key:List.of("observations","suggestedActions")) {
            var items=answer.path(key);array(items,8);
            for(var item:items) {
                exact(item,Set.of("text","sourceRefs"));text(item.path("text"),1000);
                var citations=item.path("sourceRefs");array(citations,20);
                if(citations.isEmpty())throw invalid();
                for(var ref:citations)if(!ref.isTextual()||!refs.contains(ref.asText()))throw invalid();
            }
        }
        array(answer.path("missingInformation"),10);
        for(var missing:answer.path("missingInformation"))text(missing,500);
        var value=json.createObjectNode();value.set("answer",answer.deepCopy());value.set("sources",json.valueToTree(sources));
        return value;
    }
    static JsonNode schema(List<AiDraftService.Source> sources,ObjectMapper json) {
        var text=Map.of("type","string");
        var refs=Map.of("type","array","items",Map.of("type","string","enum",sources.stream().map(source->Objects.requireNonNull(source).ref()).toList()));
        var item=Map.of("type","object","properties",Map.of("text",text,"sourceRefs",refs),"required",List.of("text","sourceRefs"),"additionalProperties",false);
        return json.valueToTree(Map.of("type","object","properties",Map.of("title",text,"summary",text,
                "observations",Map.of("type","array","items",item),"suggestedActions",Map.of("type","array","items",item),
                "missingInformation",Map.of("type","array","items",text)),
                "required",List.of("title","summary","observations","suggestedActions","missingInformation"),"additionalProperties",false));
    }
    private static void exact(JsonNode node,Set<String> names) {
        if(node==null||!node.isObject()||node.size()!=names.size())throw invalid();
        for(String name:names)if(!node.has(name))throw invalid();
    }
    private static void array(JsonNode node,int max) { if(!node.isArray()||node.size()>max)throw invalid(); }
    private static void text(JsonNode node,int max) { if(!node.isTextual()||node.asText().isBlank()||node.asText().length()>max)throw invalid(); }
    private static OpenAiResponsesClient.Failure invalid() { return new OpenAiResponsesClient.Failure("AI_INVALID_RESPONSE"); }
}
