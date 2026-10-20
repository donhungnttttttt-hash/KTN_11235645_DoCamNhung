package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.*;
import java.nio.charset.StandardCharsets;

/** Deltas are never returned as success. Only the complete terminal response is accepted. */
class ChatGptSse {
    private final ProviderHttp codec;
    ChatGptSse(ObjectMapper json){codec=new ProviderHttp(json);}
    OpenAiResponsesClient.Output parse(byte[] bytes) {
        return parse(bytes,false);
    }
    OpenAiResponsesClient.Output parse(byte[] bytes,boolean textOutput) {
        if(bytes.length>1048576)throw failure();
        String stream=new String(bytes,StandardCharsets.UTF_8).replace("\r\n","\n");
        if(!stream.endsWith("\n\n"))throw failure();
        JsonNode completed=null;
        for(String event:stream.split("\n\n")) {
            StringBuilder data=new StringBuilder();
            for(String line:event.split("\n"))if(line.startsWith("data:")){if(!data.isEmpty())data.append('\n');data.append(line.substring(5).stripLeading());}
            if(data.isEmpty())continue;
            if(data.toString().equals("[DONE]"))continue;
            if(completed!=null)throw failure();
            var root=codec.read(data.toString().getBytes(StandardCharsets.UTF_8));
            String type=root.path("type").asText();
            if (type.equals("error") || type.equals("response.failed")) {
                JsonNode error = type.equals("response.failed") ? root.path("response").path("error") :
                        root.has("error") ? root.path("error") : root;
                String code = ProviderHttp.structuredError(error);
                throw new OpenAiResponsesClient.Failure(code == null ? "AI_INCOMPLETE_RESPONSE" : code);
            }
            if(type.equals("response.incomplete")||type.contains("refusal"))throw failure();
            if(type.equals("response.completed"))completed=root.path("response");
        }
        if(completed==null)throw failure();
        return OpenAiResponsesClient.parseOutput(completed,codec.json,textOutput);
    }
    private OpenAiResponsesClient.Failure failure(){return new OpenAiResponsesClient.Failure("AI_INCOMPLETE_RESPONSE");}
}
