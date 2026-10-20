package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.*;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import vn.syp.tms.reporting.*;

/** Real provider adapters and report/draft services; only persistence/access are fixture boundaries. */
class AiManagementReportTextTest {
    final ObjectMapper json=new ObjectMapper();
    final AiDraftStore drafts=mock(AiDraftStore.class);
    final ManagementReportService reports=mock(ManagementReportService.class);
    final AtomicReference<JsonNode> sent=new AtomicReference<>();
    HttpServer server;
    AiManagementReportGenerator report;
    AiProviderGateway gateway;
    OpenAiResponsesClient api;
    final String markdown="# Tình hình dự án\n\nĐã kiểm thử 3/5 case.\n\n| OK | NG | P | NA | Chưa chạy |\n|---|---|---|---|---|\n| 2 | 1 | 0 | 0 | 2 |\n\n## Đề xuất\n\n- Kiểm tra lại case NG.\n\nChưa có dữ liệu hạn nghiệm thu.\n";

    @BeforeEach void setup() throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);server.start();
        String base="http://127.0.0.1:"+server.getAddress().getPort()+"/";
        var config=new OpenAiConfiguration(true,"fixture-only-key","test-model",3,2048,20);
        var local=new LocalAiConfiguration(false,"","","","","",true,base);
        api=new OpenAiResponsesClient(config,json,HttpClient.newHttpClient(),URI.create(base+"responses"));
        var connections=mock(ChatGptConnectionService.class);
        var chatSelection=new AiProviderGateway.ResolvedSelection("CHATGPT","test-model","fixture-connection",1);
        when(connections.resolve("pm","test-model",true)).thenReturn(chatSelection);
        when(connections.token("pm",chatSelection)).thenReturn("fixture-only-token");
        when(connections.withCurrent(eq("pm"),eq(chatSelection),any())).thenAnswer(call->((java.util.function.Supplier<?>)call.getArgument(2)).get());
        gateway=new AiProviderGateway(config,local,mock(LocalAiAccess.class),api,new OllamaClient(local,json),connections,new ChatGptPlanClient(json,URI.create(base)));
        report=new AiManagementReportGenerator(reports,drafts,new AiDraftService(drafts,api,json,gateway),gateway,json);
        when(reports.previewContext(7,"pm",null)).thenReturn(Map.of("project",Map.of("id",7,"name","Fixture"),"metrics",Map.of("total",5,"tested",3),"features",List.of()));
        when(drafts.reserve(eq(7L),eq("pm"),any())).thenReturn(new AiDraftStore.Reservation(9,true));
        when(drafts.complete(eq(7L),eq("pm"),eq(9L),any())).thenAnswer(call->draft("READY",((OpenAiResponsesClient.Output)call.getArgument(3)).value(),null));
        when(drafts.get(7,"pm",9)).thenReturn(draft("FAILED",null,"AI_INVALID_RESPONSE"));
    }
    @AfterEach void stop(){server.stop(0);}
    AiDraftStore.Draft draft(String state,JsonNode content,String failure) {
        return new AiDraftStore.Draft(9,7,"pm","PM_PROGRESS_REPORT","project:7","fixture",state,"test-model",content,failure,Instant.now(),Instant.now().plusSeconds(60),null,0);
    }
    JsonNode response(String text) {
        var root=json.createObjectNode().put("id","resp_fixture").put("model","test-model").put("status","completed");
        root.putObject("usage").put("input_tokens",20).put("output_tokens",30);
        root.putArray("output").addObject().put("type","message").put("role","assistant").putArray("content").addObject().put("type","output_text").put("text",text);
        return root;
    }
    void respond(String provider,JsonNode root) {
        server.createContext("/",exchange->{
            String body=new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8);
            if(!body.isBlank())sent.set(json.readTree(body));
            String wire;
            if(exchange.getRequestURI().getPath().equals("/api/tags"))wire="{\"models\":[{\"name\":\"test-model\"}]}";
            else if(provider.equals("CHATGPT"))wire="data: "+json.createObjectNode().put("type","response.completed").set("response",root)+"\n\n";
            else if(provider.equals("OLLAMA")){
                var result=json.createObjectNode().put("done",true).put("model","test-model").put("prompt_eval_count",20).put("eval_count",30);
                var message=result.putObject("message").put("role","assistant").put("content",root.at("/output/0/content/0/text").asText());
                if(root.has("tool_calls"))message.set("tool_calls",root.path("tool_calls"));wire=result.toString();
            } else wire=root.toString();
            byte[] bytes=wire.getBytes(StandardCharsets.UTF_8);exchange.sendResponseHeaders(200,bytes.length);try(var out=exchange.getResponseBody()){out.write(bytes);}
        });
    }
    Map<String,Object> preview(String provider) {return report.preview(7,"pm",new ManagementReportDtos.Preview(null,provider,"test-model","report-text-key"));}

    @ParameterizedTest @ValueSource(strings={"OPENAI_API","CHATGPT","OLLAMA"})
    void completedPlainMarkdownBecomesEditableTextWithoutJsonStructureOrSavingBusinessReport(String provider) {
        respond(provider,response(markdown));
        assertThat(preview(provider)).containsEntry("state","READY").containsEntry("markdown",markdown);
        if(provider.equals("OLLAMA"))assertThat(sent.get().has("format")).isFalse();
        else {
            assertThat(sent.get().at("/text/format/type").asText()).isEqualTo("text");
            assertThat(sent.get().path("tool_choice").asText()).isEqualTo("none");
            assertThat(sent.get().path("tools").isArray()).isTrue();
            assertThat(sent.get().path("tools").isEmpty()).isTrue();
        }
        verify(reports,never()).create(anyLong(),anyString(),any());verify(reports,never()).update(anyLong(),anyString(),anyLong(),any());
        verify(drafts,never()).markFailed(anyLong(),anyString(),anyLong(),anyString());
    }
    @ParameterizedTest @ValueSource(strings={"", "   \n\t", "oversized"})
    void emptyOrOversizedTextNeverBecomesReady(String text) {
        respond("OPENAI_API",response(text.equals("oversized")?"x".repeat(12001):text));
        assertThat(preview("OPENAI_API")).containsEntry("state","FAILED").doesNotContainKey("markdown");
        verify(drafts,never()).complete(anyLong(),anyString(),anyLong(),any());
    }
    @Test void reportTextDoesNotRelaxStructuredTasksUsingTheSameProgressReportPurpose() {
        respond("OPENAI_API",response(markdown));
        var task=new AiDraftService.Task("PM_PROGRESS_REPORT","project:7","role-ai-v1","report-text-key","Return structured facts",json.createObjectNode(),AiDraftContent.schema(List.of(),json),List.of())
            .withSelection(new AiProviderGateway.ResolvedSelection("OPENAI_API","test-model",null,0));
        assertThat(new AiDraftService(drafts,api,json,gateway).generate(7,"pm",task).state()).isEqualTo("FAILED");
        verify(drafts,never()).complete(anyLong(),anyString(),anyLong(),any());
    }
    @Test void incompleteTextStillFailsWithoutReturningPartialMarkdown() {
        var root=(com.fasterxml.jackson.databind.node.ObjectNode)response(markdown);root.put("status","incomplete");respond("OPENAI_API",root);
        assertThat(preview("OPENAI_API")).containsEntry("state","FAILED").doesNotContainKey("markdown");
        verify(drafts).markFailed(7,"pm",9,"AI_INCOMPLETE_RESPONSE");verify(drafts,never()).complete(anyLong(),anyString(),anyLong(),any());
    }
    @Test void refusalStillFailsWithoutReturningText() {
        var root=(com.fasterxml.jackson.databind.node.ObjectNode)response(markdown);
        ((com.fasterxml.jackson.databind.node.ObjectNode)root.at("/output/0/content/0")).put("type","refusal");respond("OPENAI_API",root);
        assertThat(preview("OPENAI_API")).containsEntry("state","FAILED").doesNotContainKey("markdown");
        verify(drafts).markFailed(7,"pm",9,"AI_REFUSED");verify(drafts,never()).complete(anyLong(),anyString(),anyLong(),any());
    }
    @ParameterizedTest @ValueSource(booleans={false,true})
    void unexpectedFunctionCallCannotBecomeReportTextEvenIfProviderClaimsCompleted(boolean alongsideText) {
        var root=(com.fasterxml.jackson.databind.node.ObjectNode)response(markdown);
        var output=alongsideText?(com.fasterxml.jackson.databind.node.ArrayNode)root.path("output"):root.putArray("output");
        output.addObject().put("type","function_call").put("name","exec").put("arguments","{\"command\":\"fixture-never-run\"}");
        respond("OPENAI_API",root);
        assertThat(preview("OPENAI_API")).containsEntry("state","FAILED").doesNotContainKey("markdown");
        verify(drafts).markFailed(7,"pm",9,"AI_INVALID_RESPONSE");verify(drafts,never()).complete(anyLong(),anyString(),anyLong(),any());
    }
    @Test void ollamaTextAlongsideUnexpectedToolCallIsRejected() {
        var root=(com.fasterxml.jackson.databind.node.ObjectNode)response(markdown);
        root.putArray("tool_calls").addObject().putObject("function").put("name","exec").putObject("arguments").put("command","fixture-never-run");
        respond("OLLAMA",root);
        assertThat(preview("OLLAMA")).containsEntry("state","FAILED").doesNotContainKey("markdown");
        verify(drafts).markFailed(7,"pm",9,"AI_INVALID_RESPONSE");verify(drafts,never()).complete(anyLong(),anyString(),anyLong(),any());
    }
    @Test void textAtCharacterLimitRemainsEditableVerbatim() {
        String boundary="x".repeat(12000);respond("OPENAI_API",response(boundary));
        assertThat(preview("OPENAI_API")).containsEntry("state","READY").containsEntry("markdown",boundary);
    }
    @Test void escapedTextCannotExceedTemporaryStorageBudgetOnLargerStreamingTransport() {
        respond("CHATGPT",response("\u0001".repeat(12000)));
        assertThat(preview("CHATGPT")).containsEntry("state","FAILED").doesNotContainKey("markdown");
        verify(drafts).markFailed(7,"pm",9,"AI_INVALID_RESPONSE");verify(drafts,never()).complete(anyLong(),anyString(),anyLong(),any());
    }
    @ParameterizedTest @ValueSource(strings={"OPENAI_API","CHATGPT"})
    void completedReportTextPartsAreJoinedInProviderOrderWithoutInventingSeparators(String provider) {
        var root=response("# Báo cáo\n\nĐã kiểm thử ");
        ((com.fasterxml.jackson.databind.node.ArrayNode)root.at("/output/0/content")).addObject().put("type","output_text").put("text","3/5 case.\n");
        respond(provider,root);
        assertThat(preview(provider)).containsEntry("state","READY").containsEntry("markdown","# Báo cáo\n\nĐã kiểm thử 3/5 case.\n");
    }
    @Test void structuredOutputStillRejectsAmbiguousMultipleTextParts() {
        var root=response("{\"ok\":");
        ((com.fasterxml.jackson.databind.node.ArrayNode)root.at("/output/0/content")).addObject().put("type","output_text").put("text","true}");
        respond("OPENAI_API",root);
        assertThatThrownBy(()->api.generate("Structured data only",json.createObjectNode(),"schema",json.createObjectNode())).hasMessage("AI_INVALID_RESPONSE");
    }
}
