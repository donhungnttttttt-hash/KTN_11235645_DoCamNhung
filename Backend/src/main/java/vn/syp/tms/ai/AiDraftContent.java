package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;

/** Validate structured advice separately from editable report prose before storing a temporary draft. */
final class AiDraftContent {
    private AiDraftContent() {}
    enum InvalidReason { ROOT_SHAPE, TITLE_TEXT, SUMMARY_TEXT, ITEM_LIST, ITEM_SHAPE, ITEM_TEXT, CITATION_LIST, CITATION_REF, MISSING_INFORMATION_LIST, MISSING_INFORMATION_TEXT, REPORT_TEXT, REPORT_SIZE }
    static final class InvalidContent extends OpenAiResponsesClient.Failure {
        private final InvalidReason reason;
        InvalidContent(InvalidReason reason) {super("AI_INVALID_RESPONSE");this.reason=reason;}
        InvalidReason reason() {return reason;}
    }
    static JsonNode validateAndWrap(JsonNode answer, List<AiDraftService.Source> sources, ObjectMapper json) {
        exact(answer,Set.of("title","summary","observations","suggestedActions","missingInformation"),InvalidReason.ROOT_SHAPE);
        text(answer.path("title"),160,InvalidReason.TITLE_TEXT);text(answer.path("summary"),1600,InvalidReason.SUMMARY_TEXT);
        var refs=new HashSet<>(sources.stream().map(source->Objects.requireNonNull(source).ref()).toList());
        for(String key:List.of("observations","suggestedActions")) {
            var items=answer.path(key);array(items,8,InvalidReason.ITEM_LIST);
            for(var item:items) {
                exact(item,Set.of("text","sourceRefs"),InvalidReason.ITEM_SHAPE);text(item.path("text"),1000,InvalidReason.ITEM_TEXT);
                var citations=item.path("sourceRefs");array(citations,20,InvalidReason.CITATION_LIST);
                if(citations.isEmpty())throw invalid(InvalidReason.CITATION_LIST);
                for(var ref:citations)if(!ref.isTextual()||!refs.contains(ref.asText()))throw invalid(InvalidReason.CITATION_REF);
            }
        }
        array(answer.path("missingInformation"),10,InvalidReason.MISSING_INFORMATION_LIST);
        for(var missing:answer.path("missingInformation"))text(missing,500,InvalidReason.MISSING_INFORMATION_TEXT);
        var value=json.createObjectNode();value.set("answer",answer.deepCopy());value.set("sources",json.valueToTree(sources));
        return value;
    }
    /** Report prose is editable text, not a structured action or a source of metric mutations. */
    static JsonNode validateAndWrapMarkdown(JsonNode answer,List<AiDraftService.Source> sources,ObjectMapper json) {
        if(answer==null)throw invalid(InvalidReason.REPORT_TEXT);
        text(answer,12000,InvalidReason.REPORT_TEXT);
        var value=json.createObjectNode().put("markdown",answer.asText());value.set("sources",json.valueToTree(sources));
        try {if(json.writeValueAsBytes(value).length>65536)throw invalid(InvalidReason.REPORT_SIZE);}
        catch(java.io.IOException encoding){throw invalid(InvalidReason.REPORT_TEXT);}
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
    /** Mirror the validator in instructions too: compatible gateways may ignore text.format.schema.
     * Keep optional schema keywords out of the common wire format used by older/fine-tuned models. */
    static String outputInstructions(List<AiDraftService.Source> sources,ObjectMapper json) {
        ObjectNode bounds=(ObjectNode)schema(sources,json);
        boundedText(bounds.at("/properties/title"),160);
        boundedText(bounds.at("/properties/summary"),1600);
        for(String key:List.of("observations","suggestedActions")) {
            ((ObjectNode)bounds.at("/properties/"+key)).put("maxItems",8);
            boundedText(bounds.at("/properties/"+key+"/items/properties/text"),1000);
            ((ObjectNode)bounds.at("/properties/"+key+"/items/properties/sourceRefs")).put("minItems",1).put("maxItems",20);
        }
        ((ObjectNode)bounds.at("/properties/missingInformation")).put("maxItems",10);
        boundedText(bounds.at("/properties/missingInformation/items"),500);
        return " Return exactly one JSON object with the five fields title, summary, observations, suggestedActions, missingInformation. "
            +"Do not wrap it in answer, content or markdown, and do not emit Markdown fences. "
            +"All text values must be nonblank. Every observation and suggested action must contain text and a nonempty sourceRefs array using only the enum references below. "
            +"Empty lists are allowed when no supported observation/action or missing information exists. Do not invent fields, sources or URLs. "
            +"RESPONSE_JSON_SCHEMA: "+bounds;
    }
    private static void boundedText(JsonNode node,int max) {
        ((ObjectNode)node).put("minLength",1).put("maxLength",max).put("description","Nonblank text; stay within the character limit.");
    }
    private static void exact(JsonNode node,Set<String> names,InvalidReason reason) {
        if(node==null||!node.isObject()||node.size()!=names.size())throw invalid(reason);
        for(String name:names)if(!node.has(name))throw invalid(reason);
    }
    private static void array(JsonNode node,int max,InvalidReason reason) { if(!node.isArray()||node.size()>max)throw invalid(reason); }
    private static void text(JsonNode node,int max,InvalidReason reason) { if(!node.isTextual()||node.asText().isBlank()||node.asText().length()>max)throw invalid(reason); }
    private static InvalidContent invalid(InvalidReason reason) { return new InvalidContent(reason); }
}
