package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Explicit opt-in: one request with two entirely synthetic projects, no database or real user data. */
@EnabledIfEnvironmentVariable(named="TMS_AI_PORTFOLIO_LIVE_TEST",matches="true")
class AiPortfolioLiveConnectionTest {
    @Test void providerAnswersUsingThePortfolioEnvelope() throws Exception {
        var settings=new Properties();String file=System.getenv("TMS_OPENAI_TEST_CONFIG_FILE");
        if(file!=null&&!file.isBlank())try(var reader=Files.newBufferedReader(Path.of(file),StandardCharsets.UTF_8)){settings.load(reader);}
        var config=new OpenAiConfiguration(true,setting(settings,"OPENAI_API_KEY",""),setting(settings,"TMS_OPENAI_MODEL","gpt-4.1-mini"),30,1536,1,setting(settings,"TMS_OPENAI_BASE_URL","https://api.openai.com/v1"));
        var json=new ObjectMapper();var data=json.createObjectNode().put("scope","MY_PROJECTS").put("totalProjects",2).put("includedProjects",2).put("truncated",false).put("asOf","2026-10-18T00:00:00Z");
        var facts=data.putArray("sources");
        facts.addObject().put("ref","project:1").putObject("facts").put("code","SYNTHETIC-A").put("name","Dự án giả lập A").set("execution",json.valueToTree(vn.syp.tms.reporting.ReportMetrics.counts(4,0,2,1,1)));
        facts.addObject().put("ref","project:2").putObject("facts").put("code","SYNTHETIC-B").put("name","Dự án giả lập B").set("execution",json.valueToTree(vn.syp.tms.reporting.ReportMetrics.counts(5,1,0,0,1)));
        var task=new AiDraftService.Task("MY_PROJECTS","synthetic-only","portfolio-v1","synthetic-request","unused",data,AiChatService.schema(json),List.of(new AiDraftService.Source("project:1","Synthetic A","/dashboard",null),new AiDraftService.Source("project:2","Synthetic B","/dashboard",null)));
        var prompt=new AiChatService(null,null,null,json).prompt(config.model(),"Tóm tắt tiến độ hai dự án trong snapshot, nêu mã dự án và số liệu đã được cung cấp.",task,List.of());
        try {
            var output=new OpenAiResponsesClient(config,json).generate(AiChatService.instructions(prompt.data()),prompt.data(),"tms_chat",AiChatService.schema(json));
            AiChatService.validateOutput(output);
            assertThat(output.value().path("text").asText()).contains("SYNTHETIC-A","SYNTHETIC-B");
            System.out.println("Portfolio live PASS; inputTokens="+output.inputTokens()+", outputTokens="+output.outputTokens()+". Synthetic projects only; no database or real project data.");
        } catch(OpenAiResponsesClient.Failure failure){fail("Portfolio live failed: "+failure.code()+". No key or payload logged.");}
    }
    private String setting(Properties p,String name,String fallback){String value=System.getenv(name);return value==null?p.getProperty(name,fallback):value;}
}
