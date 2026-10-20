package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.syp.tms.reporting.*;
import vn.syp.tms.shared.web.BusinessException;

class AiManagementReportGeneratorTest {
    final ManagementReportService reports=mock(ManagementReportService.class);
    final AiDraftStore drafts=mock(AiDraftStore.class);
    final AiDraftService generator=mock(AiDraftService.class);
    final AiProviderGateway gateway=mock(AiProviderGateway.class);
    final ObjectMapper json=new ObjectMapper();
    final AiManagementReportGenerator service=new AiManagementReportGenerator(reports,drafts,generator,gateway,json);
    final ManagementReportDtos.Preview input=new ManagementReportDtos.Preview(2L,null,null,"report-request-123");
    AiDraftStore.Draft draft(String state) {
        return new AiDraftStore.Draft(1,7,"pm","PM_PROGRESS_REPORT","project:7:feature:2","v1",state,"test",json.createObjectNode(),null,Instant.now(),Instant.now().plusSeconds(60),null,0);
    }
    void prepare() {
        when(reports.previewContext(7,"pm",2L)).thenReturn(Map.of("project",Map.of("id",7,"name","P"),"feature",Map.of("id",2,"name","Target"),"metrics",Map.of("total",5,"executionPercent",60),"features",List.of(Map.of("id",1,"name","Unrelated","caseCount",99),Map.of("id",2,"name","Target","caseCount",5))));
        when(generator.generate(eq(7L),eq("pm"),any())).thenReturn(draft("PENDING"));
    }
    @Test void optionalFeatureLimitsAllFeatureFactsBeforeProviderAdmissionAndDoesNotSaveAReport() {
        prepare();assertThat(service.preview(7,"pm",input)).containsEntry("state","PENDING").doesNotContainKey("markdown");
        var task=ArgumentCaptor.forClass(AiDraftService.Task.class);verify(generator).generate(eq(7L),eq("pm"),task.capture());
        var facts=task.getValue().data().at("/sources/0/facts");
        assertThat(facts.path("features").size()).isEqualTo(1);
        assertThat(facts.path("features").get(0).path("name").asText()).isEqualTo("Target");
        assertThat(task.getValue().sourceReference()).isEqualTo("project:7:feature:2");
        verify(reports,never()).create(anyLong(),anyString(),any());verify(reports,never()).update(anyLong(),anyString(),anyLong(),any());
    }
    @Test void deniedManagementRightsFailBeforeCacheAndProviderCalls() {
        doThrow(new BusinessException(403,"MANAGEMENT_REPORT_FORBIDDEN","Denied")).when(reports).previewContext(7,"tester",2L);
        assertThatThrownBy(()->service.preview(7,"tester",input)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(drafts,generator,gateway);
    }
    @Test void cachedOwnedRequestDoesNotGenerateAgain() {
        prepare();when(drafts.findRequest(eq(7L),eq("pm"),eq(AiPurpose.PM_PROGRESS_REPORT),eq("project:7:feature:2"),eq(input.requestKey()),any(),eq(true))).thenReturn(draft("PENDING"));
        service.preview(7,"pm",input);verifyNoInteractions(generator);
    }
    @Test void paymentFailureKeepsItsActionableCodeAtTheReportBoundary() {
        prepare();when(gateway.resolve(eq("pm"),any())).thenThrow(new OpenAiResponsesClient.Failure("AI_PAYMENT_REQUIRED"));
        assertThatThrownBy(()->service.preview(7,"pm",input)).isInstanceOfSatisfying(BusinessException.class,error->{
            assertThat(error.status()).isEqualTo(422);assertThat(error.code()).isEqualTo("AI_PAYMENT_REQUIRED");
        });
        verifyNoInteractions(generator);verify(reports,never()).create(anyLong(),anyString(),any());
    }
    @Test void previouslyGeneratedStructuredReportIsStillReadableWithoutAnotherProviderRequest() throws Exception {
        prepare();
        var content=json.readTree("""
            {"answer":{"title":"Báo cáo cũ","summary":"Đã test 3/5 case.",
             "observations":[{"text":"Có 1 case NG.","sourceRefs":["project:7"]}],
             "suggestedActions":[],"missingInformation":["Chưa có hạn nghiệm thu."]},
             "sources":[{"label":"Dự án","ref":"project:7"}]}
            """);
        var old=draft("READY");
        var cached=new AiDraftStore.Draft(old.id(),old.projectId(),old.createdBy(),old.purpose(),old.sourceReference(),"feature-report-v2","READY",old.model(),content,null,old.createdAt(),old.expiresAt(),null,0);
        when(drafts.findRequest(eq(7L),eq("pm"),eq(AiPurpose.PM_PROGRESS_REPORT),eq("project:7:feature:2"),eq(input.requestKey()),any(),eq(true))).thenReturn(cached);
        assertThat((String)service.preview(7,"pm",input).get("markdown"))
            .startsWith("# Báo cáo cũ\n\nĐã test 3/5 case.").contains("- Có 1 case NG.","- Chưa có hạn nghiệm thu.","- Dự án · project:7");
        verifyNoInteractions(generator);
    }
}
