package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.mock;
import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;

class AiChatPromptTest {
    final ObjectMapper json=new ObjectMapper();
    final AiChatService service=new AiChatService(mock(AiChatStore.class),mock(AiContextService.class),mock(AiProviderGateway.class),json);
    AiChatStore.Turn turn(long id,String state,String text,String answer) {
        return new AiChatStore.Turn(id,1,"request-"+id,text,state,json.createObjectNode().put("text",answer),null,"OPENAI_API","model","model",null,0,false,Instant.now(),Instant.now(),Instant.now().plusSeconds(600));
    }
    @Test void unicodeSnapshotAndTenLargeTurnsKeepNewestMessageWithinEveryEnvelope() throws Exception {
        String latest="😀".repeat(1000);
        var snapshot=json.createObjectNode();var facts=snapshot.putArray("sources");
        var sources=new ArrayList<AiDraftService.Source>();
        for(int i=0;i<20;i++) {
            facts.addObject().put("ref","ticket:"+i).put("description","\"\\\n漢😀".repeat(400));
            sources.add(new AiDraftService.Source("ticket:"+i,"Ticket","/work",1L));
        }
        var task=new AiDraftService.Task("DEV_TICKET_REVIEW","ticket:0","v1","request-001","instructions",snapshot,json.createObjectNode(),sources);
        var history=new ArrayList<AiChatStore.Turn>();
        for(int i=0;i<10;i++)history.add(turn(i,"READY","question","漢😀".repeat(2000)));
        var prompt=service.prompt("x".repeat(100),latest,task,history);
        assertThat(prompt.data().path("text").asText()).isEqualTo(latest);
        assertThat(prompt.truncated()).isTrue();assertThat(prompt.data().path("history")).isEmpty();
        assertThat(prompt.data().path("snapshot").path("sources").get(0).path("ref").asText()).isEqualTo("ticket:0");
        assertThat(AiChatService.requestUpperBound(json,"x".repeat(100),prompt.data())).isLessThanOrEqualTo(16000);
        assertEnvelopes("x".repeat(100),prompt.data());
    }
    @Test void oldestHistoryIsDiscardedBeforeSmallSnapshotAndFailedContentExcluded() throws Exception {
        var snapshot=json.createObjectNode();snapshot.putArray("sources").addObject().put("ref","project:1").put("fact","Keep me");
        var task=new AiDraftService.Task("PM_PROGRESS_REPORT","project:1","v1","request-001","instructions",snapshot,json.createObjectNode(),List.of());
        var prompt=service.prompt("model","Latest",task,List.of(turn(1,"READY","Old","漢".repeat(6000)),turn(2,"FAILED","Failure","Ignore me"),turn(3,"READY","Recent","Answer")));
        assertThat(prompt.data().path("snapshot")).isEqualTo(snapshot);
        assertThat(prompt.data().path("history")).hasSize(1);
        assertThat(prompt.data().path("history").get(0).path("user").asText()).isEqualTo("Recent");
        assertEnvelopes("model",prompt.data());
    }
    @Test void acceptsEscapedControlAndVietnameseTextWithinCompleteRequest() throws Exception {
        for(String latest:List.of("\u0001".repeat(2000),"Tiếng Việt \"\\\n".repeat(120))) {
            var prompt=service.prompt("model",latest,null,List.of());
            assertThat(prompt.data().path("text").asText()).isEqualTo(latest);assertEnvelopes("model",prompt.data());
        }
    }
    @Test void portfolioTruncationKeepsIncludedCountSourcesAndPaidRequestConsistent() throws Exception {
        var snapshot=json.createObjectNode().put("scope","MY_PROJECTS").put("totalProjects",30).put("includedProjects",30);
        var facts=snapshot.putArray("sources");var sources=new ArrayList<AiDraftService.Source>();
        for(int i=1;i<=30;i++) {
            var item=facts.addObject().put("ref","project:"+i);var values=item.putObject("facts").putArray("numericFacts");
            for(int n=0;n<200;n++)values.add(n);
            sources.add(new AiDraftService.Source("project:"+i,"Project "+i,"/dashboard",null));
        }
        var task=new AiDraftService.Task("MY_PROJECTS","portfolio-v1:bound","v1","portfolio-budget","unused",snapshot,json.createObjectNode(),sources);
        var prompt=service.prompt("model","Tổng hợp dự án",task,List.of());
        assertThat(prompt.truncated()).isTrue();assertThat(prompt.data().path("scope").asText()).isEqualTo("MY_PROJECTS");
        int included=prompt.data().path("snapshot").path("sources").size();
        assertThat(prompt.data().path("snapshot").path("includedProjects").asInt()).isEqualTo(included);
        assertThat(prompt.sources()).hasSize(included);assertEnvelopes("model",prompt.data());
    }
    void assertEnvelopes(String model,JsonNode data) throws Exception {
        var api=json.createObjectNode().put("model",model).put("store",false).put("max_output_tokens",2048).put("instructions",AiChatService.instructions(data)).put("input",data.toString());
        api.putObject("text").putObject("format").put("type","json_schema").put("name","tms_chat").put("strict",true).set("schema",AiChatService.schema(json));
        assertThat(json.writeValueAsBytes(api).length).isLessThanOrEqualTo(AiChatService.requestUpperBound(json,model,data));
        api.remove("max_output_tokens");api.put("stream",true);
        assertThat(json.writeValueAsBytes(api).length).isLessThanOrEqualTo(AiChatService.requestUpperBound(json,model,data));
        var ollama=json.createObjectNode().put("model",model).put("stream",false);ollama.set("format",AiChatService.schema(json));
        var messages=ollama.putArray("messages");messages.addObject().put("role","system").put("content",AiChatService.instructions(data));
        messages.addObject().put("role","user").put("content",data.toString());ollama.putObject("options").put("num_predict",2048);
        assertThat(json.writeValueAsBytes(ollama).length).isLessThanOrEqualTo(AiChatService.requestUpperBound(json,model,data));
    }
}
