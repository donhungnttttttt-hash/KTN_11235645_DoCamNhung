package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.Test;

class AiContextBudgetTest {
    @Test void maximumUnicodeTicketIsTrimmedToTheActualTransportBudget() throws Exception {
        var json=new ObjectMapper();var config=new OpenAiConfiguration(true,"fake","gpt-4.1-mini",20,1536,20);
        var sources=new ArrayList<AiDraftService.Source>();var facts=new ArrayList<Map<String,Object>>();
        for(int n=0;n<4;n++) {
            String ref="ticket:"+(n+1);sources.add(new AiDraftService.Source(ref,"長い名前","/board/issue/"+(n+1),0L));
            facts.add(Map.of("ref",ref,"facts",Map.of("description","再現条件\\\"\n".repeat(1600),"actual","実行結果".repeat(600))));
        }
        var task=AiContextService.boundedTask(config,json,AiPurpose.DEV_TICKET_REVIEW,"ticket:1","bounded-test",sources,facts);
        assertThat(OpenAiResponsesClient.requestBytes(config,json,task.instructions(),task.data(),"tms_draft",task.schema()).length).isLessThanOrEqualTo(16000);
        assertThat(task.data().path("truncated").asBoolean()).isTrue();
        assertThat(task.sources()).isNotEmpty();assertThat(task.data().path("sources").size()).isEqualTo(task.sources().size());
        assertThat(task.data().path("sources").get(0).path("ref").asText()).isEqualTo("ticket:1");
    }
}
