package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.*;
import java.net.URI;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class ChatGptPlanClient {
    private final ProviderHttp http;private final URI api;
    @org.springframework.beans.factory.annotation.Autowired
    public ChatGptPlanClient(ObjectMapper json){this(json,URI.create("https://api.openai.com/v1/"));}
    ChatGptPlanClient(ObjectMapper json,URI api){http=new ProviderHttp(json);this.api=api;}
    List<AiProviderGateway.Model> models(String token) {
        var root=http.read(http.request(api.resolve("models"),"GET",token,null,null,65536));
        if(!root.path("models").isArray())throw new OpenAiResponsesClient.Failure("AI_INVALID_RESPONSE");
        var models=new ArrayList<AiProviderGateway.Model>();
        for(var item:root.path("models"))if("list".equals(item.path("visibility").asText())) {
            String id=item.path("slug").asText();AiProviderGateway.validateModel(id);
            String label=item.path("display_name").asText(id);if(label.length()>120)label=id;
            models.add(new AiProviderGateway.Model(id,label));if(models.size()>=100)break;
        }return List.copyOf(models);
    }
    OpenAiResponsesClient.Output generate(String token,String model,String instructions,JsonNode data,String schemaName,JsonNode schema) {
        var request=http.json.createObjectNode().put("model",model).put("store",false).put("stream",true).put("instructions",instructions).put("input",data.toString());
        request.putObject("text").putObject("format").put("type","json_schema").put("name",schemaName).put("strict",true).set("schema",schema);
        byte[] body=http.bytes(request);if(body.length>16000)throw new OpenAiResponsesClient.Failure("AI_INPUT_TOO_LARGE");
        return new ChatGptSse(http.json).parse(http.request(api.resolve("responses"),"POST",token,"application/json",body,1048576));
    }
}
