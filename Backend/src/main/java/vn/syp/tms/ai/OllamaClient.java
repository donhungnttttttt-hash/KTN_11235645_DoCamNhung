package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class OllamaClient {
    private final LocalAiConfiguration config;
    private final ProviderHttp http;
    public OllamaClient(LocalAiConfiguration config,ObjectMapper json){this.config=config;http=new ProviderHttp(json);}
    public List<AiProviderGateway.Model> models() {
        if(!config.ollamaEnabled)throw new OpenAiResponsesClient.Failure("AI_DISABLED");
        var root=http.read(http.request(config.ollama.resolve("/api/tags"),"GET",null,null,null,65536));
        if(!root.path("models").isArray())throw new OpenAiResponsesClient.Failure("AI_INVALID_RESPONSE");
        var result=new ArrayList<AiProviderGateway.Model>();
        for(var item:root.path("models")) {String model=item.path("name").asText();AiProviderGateway.validateModel(model);result.add(new AiProviderGateway.Model(model,model));if(result.size()>100)break;}
        return List.copyOf(result);
    }
    public OpenAiResponsesClient.Output generate(String model,String instructions,JsonNode data,JsonNode schema) {
        return generate(model,instructions,data,schema,false);
    }
    public OpenAiResponsesClient.Output generateText(String model,String instructions,JsonNode data) {
        return generate(model,instructions,data,null,true);
    }
    private OpenAiResponsesClient.Output generate(String model,String instructions,JsonNode data,JsonNode schema,boolean textOutput) {
        if(!config.ollamaEnabled)throw new OpenAiResponsesClient.Failure("AI_DISABLED");
        var payload=http.json.createObjectNode().put("model",model).put("stream",false);
        if(!textOutput)payload.set("format",schema);
        var messages=payload.putArray("messages");messages.addObject().put("role","system").put("content",instructions);
        messages.addObject().put("role","user").put("content",data.toString());
        payload.putObject("options").put("num_predict",2048);
        byte[] body=http.bytes(payload);if(body.length>16000)throw new OpenAiResponsesClient.Failure("AI_INPUT_TOO_LARGE");
        var root=http.read(http.request(config.ollama.resolve("/api/chat"),"POST",null,"application/json",body,65536));
        var toolCalls=root.path("message").path("tool_calls");
        if(textOutput&&!toolCalls.isMissingNode()&&!toolCalls.isNull()&&(!toolCalls.isArray()||!toolCalls.isEmpty()))
            throw new OpenAiResponsesClient.Failure("AI_INVALID_RESPONSE");
        if(!root.path("done").asBoolean()||"length".equals(root.path("done_reason").asText())||!"assistant".equals(root.path("message").path("role").asText())
                ||!root.path("message").path("content").isTextual()||!model.equals(root.path("model").asText())
                ||!root.path("prompt_eval_count").isIntegralNumber()||!root.path("eval_count").isIntegralNumber()
                ||!root.path("prompt_eval_count").canConvertToInt()||!root.path("eval_count").canConvertToInt()
                ||root.path("prompt_eval_count").asInt()<0||root.path("eval_count").asInt()<0)
            throw new OpenAiResponsesClient.Failure("AI_INVALID_RESPONSE");
        var content=root.path("message").path("content");
        return new OpenAiResponsesClient.Output(textOutput?content:http.read(content.asText().getBytes(java.nio.charset.StandardCharsets.UTF_8)),
                "ollama_"+UUID.randomUUID(),model,root.path("prompt_eval_count").asInt(),root.path("eval_count").asInt());
    }
}
