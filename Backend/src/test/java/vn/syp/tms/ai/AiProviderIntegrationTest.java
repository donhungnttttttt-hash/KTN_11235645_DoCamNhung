package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;

class AiProviderIntegrationTest {
    final ObjectMapper json=new ObjectMapper();HttpServer server;String base;AtomicReference<String> request=new AtomicReference<>();
    @BeforeEach void start()throws Exception{server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);base="http://127.0.0.1:"+server.getAddress().getPort();server.start();}
    @AfterEach void stop(){server.stop(0);}
    void response(String path,int status,String body){server.createContext(path,e->{request.set(new String(e.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));byte[] bytes=body.getBytes(StandardCharsets.UTF_8);e.sendResponseHeaders(status,bytes.length);try(var out=e.getResponseBody()){out.write(bytes);}});}
    LocalAiConfiguration config(){return new LocalAiConfiguration(false,"","","","","",true,base);}
    @Test void ollamaCatalogAndStructuredNonstreamInferenceUseInstalledModel()throws Exception {
        response("/api/tags",200,"{\"models\":[{\"name\":\"qwen3:8b\"}]}");
        response("/api/chat",200,"{\"model\":\"qwen3:8b\",\"done\":true,\"message\":{\"role\":\"assistant\",\"content\":\"{\\\"answer\\\":\\\"ok\\\"}\"},\"prompt_eval_count\":3,\"eval_count\":2}");
        var client=new OllamaClient(config(),json);assertThat(client.models()).extracting(AiProviderGateway.Model::id).containsExactly("qwen3:8b");
        var output=client.generate("qwen3:8b","Only facts",json.createObjectNode(),json.createObjectNode().put("type","object"));
        assertThat(output.value().path("answer").asText()).isEqualTo("ok");var sent=json.readTree(request.get());assertThat(sent.path("stream").asBoolean()).isFalse();assertThat(sent.path("format").path("type").asText()).isEqualTo("object");
    }
    @Test void ollamaDoesNotAcceptPartialOrMismatchedModelResponses(){response("/api/chat",200,"{\"done\":false,\"model\":\"qwen3:8b\",\"message\":{\"role\":\"assistant\",\"content\":\"{}\"}}");assertThatThrownBy(()->new OllamaClient(config(),json).generate("qwen3:8b","facts",json.createObjectNode(),json.createObjectNode())).hasMessage("AI_INVALID_RESPONSE");}
    @Test void chatgptCompletedStreamAndPayloadRespectOfficialRoute()throws Exception {
        var root=json.createObjectNode().put("id","resp_test").put("model","model-test").put("status","completed");
        root.putObject("usage").put("input_tokens",1).put("output_tokens",2);root.putArray("output").addObject().put("type","message").put("role","assistant").putArray("content").addObject().put("type","output_text").put("text","{\"answer\":\"ok\"}");
        response("/responses",200,"data: "+json.createObjectNode().put("type","response.completed").set("response",root)+"\n\n");
        var output=new ChatGptPlanClient(json,URI.create(base+"/")).generate("test-token","model-test","facts",json.createObjectNode(),"schema",json.createObjectNode());
        assertThat(output.value().path("answer").asText()).isEqualTo("ok");var sent=json.readTree(request.get());assertThat(sent.path("stream").asBoolean()).isTrue();assertThat(sent.path("store").asBoolean()).isFalse();assertThat(sent.has("max_output_tokens")).isFalse();
    }
    @Test void partialThenFailureNeverSucceeds(){response("/responses",200,"data: {\"type\":\"response.output_text.delta\",\"delta\":\"partial\"}\n\ndata: {\"type\":\"response.failed\"}\n\n");assertThatThrownBy(()->new ChatGptPlanClient(json,URI.create(base+"/")).generate("test-token","test","facts",json.createObjectNode(),"schema",json.createObjectNode())).hasMessage("AI_INCOMPLETE_RESPONSE");}
    @Test void oversizedResponseFailsWithoutLeakingBody(){response("/api/tags",200,"secret".repeat(12000));assertThatThrownBy(()->new OllamaClient(config(),json).models()).hasMessage("AI_UNAVAILABLE");}
    @Test void redirectsNeverForwardTokens(){response("/responses",302,"secret-token");assertThatThrownBy(()->new ChatGptPlanClient(json,URI.create(base+"/")).generate("test-token","test","facts",json.createObjectNode(),"schema",json.createObjectNode())).hasMessage("AI_REQUEST_REJECTED");}
    @Test void missingUsageCannotBecomeFabricatedZero(){response("/api/chat",200,"{\"model\":\"qwen3:8b\",\"done\":true,\"message\":{\"role\":\"assistant\",\"content\":\"{}\"}}");assertThatThrownBy(()->new OllamaClient(config(),json).generate("qwen3:8b","facts",json.createObjectNode(),json.createObjectNode())).hasMessage("AI_INVALID_RESPONSE");}
}
