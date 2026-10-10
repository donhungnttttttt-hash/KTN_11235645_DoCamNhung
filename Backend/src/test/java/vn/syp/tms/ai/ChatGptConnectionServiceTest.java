package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.*;
import java.net.URI;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpSession;
import vn.syp.tms.identity.SessionPrincipal;

class ChatGptConnectionServiceTest {
    final ObjectMapper json=new ObjectMapper();final LocalAiAccess access=mock(LocalAiAccess.class);
    final ChatGptCredentialVault vault=mock(ChatGptCredentialVault.class);final ChatGptOAuthClient oauth=mock(ChatGptOAuthClient.class);final ChatGptPlanClient client=mock(ChatGptPlanClient.class);
    final LocalAiConfiguration config=new LocalAiConfiguration(true,"owner","urn:uuid:12345678-1234-1234-1234-123456789012","C:/test-vault","","127.0.0.1",false,"http://127.0.0.1:11434");
    ChatGptConnectionService service;final MockHttpSession session=new MockHttpSession();
    @BeforeEach void setup(){when(access.requireLocal("owner")).thenReturn(session);when(access.current("owner")).thenReturn(new SessionPrincipal("owner",1));service=new ChatGptConnectionService(config,access,vault,oauth,client,json);}
    @AfterEach void close(){service.close();}
    Map<String,String> authorize() {
        var a=service.start("owner",false);var params=ChatGptConnectionService.query(URI.create(a.authorizationUrl()).getRawQuery());
        assertThat(params.get("redirect_uri")).startsWith("http://127.0.0.1:").endsWith("/auth/callback");assertThat(params.get("code_challenge_method")).isEqualTo("S256");assertThat(params.get("client_id")).isEqualTo("dynamic_agent_client");
        when(oauth.exchange(anyString(),anyString(),anyString(),anyString())).thenReturn(tokens());
        when(oauth.validate(any(),anyString(),anyString(),isNull())).thenReturn(json.createObjectNode().put("sub","subject").put("email","n@example.com"));
        params.put("attemptId",a.attemptId());params.put("code","test-code");params.put("client_id","oaiapp_test");return params;
    }
    JsonNode tokens(){return json.createObjectNode().put("access_token","secret-access").put("refresh_token","secret-refresh").put("id_token","secret-id").put("token_type","Bearer").put("expires_in",3600).put("scope",ChatGptOAuthClient.SCOPES);}
    @Test void wrongStateDoesNotExchangeAndReplayIsRejectedAfterSuccess() {
        var p=authorize();String id=p.get("attemptId"),state=p.get("state");p.put("state","wrong");assertThatThrownBy(()->service.completeCallback(id,p)).hasMessage("AI_AUTH_FAILED");verifyNoInteractions(oauth);
        p.put("state",state);service.completeCallback(id,p);assertThat(service.connection("owner").state()).isEqualTo("UNVERIFIED");
        verify(oauth).exchange(eq("oaiapp_test"),eq("test-code"),argThat(v->ChatGptConnectionService.challenge(v).equals(p.get("code_challenge"))),eq(p.get("redirect_uri")));
        assertThatThrownBy(()->service.completeCallback(id,p)).hasMessage("AI_AUTH_FAILED");verify(oauth,times(1)).exchange(anyString(),anyString(),anyString(),anyString());
        assertThat(service.connection("owner").toString()).doesNotContain("secret");
    }
    @Test void cancellationPreventsCallbackAndCrossOwnerAttemptRead(){var p=authorize();assertThatThrownBy(()->service.attempt("other",p.get("attemptId"))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);service.cancel("owner",p.get("attemptId"));assertThatThrownBy(()->service.completeCallback(p.get("attemptId"),p)).hasMessage("AI_AUTH_FAILED");verifyNoInteractions(oauth);}
    @Test void logoutAndMissingIssuedClientPreventTokenExchange(){var p=authorize();doThrow(new IllegalStateException()).when(access).verifySession(any(),any());assertThatThrownBy(()->service.completeCallback(p.get("attemptId"),p)).hasMessage("AI_AUTH_FAILED");verifyNoInteractions(oauth);}
    @Test void probeReadinessAndDeduplicationSurviveServiceRestart() {
        var p=authorize();service.completeCallback(p.get("attemptId"),p);String id=service.connection("owner").id();
        when(client.models(anyString())).thenReturn(List.of(new AiProviderGateway.Model("test","Test")));service.models("owner",id);
        var value=json.createObjectNode().put("title","Test").put("summary","Connected");value.putArray("observations");value.putArray("suggestedActions");value.putArray("missingInformation");
        when(client.generate(anyString(),anyString(),anyString(),any(),anyString(),any())).thenReturn(new OpenAiResponsesClient.Output(value,"resp_test","test",1,1));
        assertThat(service.probe("owner",id,"test","probe-key1").state()).isEqualTo("READY");assertThat(service.connection("owner").verifiedModel()).isEqualTo("test");
        assertThat(service.probe("owner",id,"test","probe-key1").state()).isEqualTo("READY");verify(client,times(1)).generate(anyString(),anyString(),anyString(),any(),anyString(),any());
        var capture=org.mockito.ArgumentCaptor.forClass(JsonNode.class);verify(vault,atLeastOnce()).write(capture.capture());when(vault.read()).thenReturn(capture.getValue().deepCopy());
        var restarted=new ChatGptConnectionService(config,access,vault,oauth,client,json);assertThat(restarted.probe("owner",id,"test","probe-key1").state()).isEqualTo("READY");restarted.close();
        assertThatThrownBy(()->service.probe("owner",id,"other-model","probe-key1")).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
    }
    @Test void disconnectFencesOldSelectionAndReportsRemoteRevocationFailure(){var p=authorize();service.completeCallback(p.get("attemptId"),p);var c=service.connection("owner");var selection=new AiProviderGateway.ResolvedSelection("CHATGPT","test",c.id(),c.version());assertThat(service.disconnect("owner",c.id(),c.version()).remoteRevoked()).isFalse();assertThatThrownBy(()->service.withCurrent("owner",selection,()->"persisted")).hasMessage("AI_CONNECT_REQUIRED");}
    @Test void replacingConnectionDuringProbeCannotVerifyNewConnection() {
        var p=authorize();service.completeCallback(p.get("attemptId"),p);String id=service.connection("owner").id();
        when(client.models(anyString())).thenReturn(List.of(new AiProviderGateway.Model("test","Test")));service.models("owner",id);
        when(client.generate(anyString(),anyString(),anyString(),any(),anyString(),any())).thenAnswer(call->{
            var attempt=service.start("owner",true);var params=ChatGptConnectionService.query(URI.create(attempt.authorizationUrl()).getRawQuery());params.put("code","new-code");params.put("client_id","oaiapp_new");service.completeCallback(attempt.attemptId(),params);
            var value=json.createObjectNode().put("title","Test").put("summary","Connected");value.putArray("observations");value.putArray("suggestedActions");value.putArray("missingInformation");
            return new OpenAiResponsesClient.Output(value,"resp_test","test",1,1);
        });
        assertThat(service.probe("owner",id,"test","probe-race-key").failureCode()).isEqualTo("AI_CONNECTION_CHANGED");assertThat(service.connection("owner").state()).isEqualTo("UNVERIFIED");
    }
    @Test void dailyProbeLimitAndInterruptedKeysRemainAfterRestart() {
        var prior=json.createObjectNode();var probes=prior.putArray("probes");
        for(int i=0;i<5;i++)probes.addObject().put("requestKey","probe-key"+i).put("model","test").put("connectionId","conn").put("date",java.time.LocalDate.now(java.time.ZoneOffset.UTC).toString()).put("state","GENERATING");
        prior.put("id","conn").put("version",1).put("accessToken","test-token").put("expiresAt",Instant.now().plusSeconds(1000).getEpochSecond()).put("scopes",ChatGptOAuthClient.SCOPES);
        when(vault.read()).thenReturn(prior);service.close();service=new ChatGptConnectionService(config,access,vault,oauth,client,json);
        assertThat(service.probe("owner","conn","test","probe-key0").failureCode()).isEqualTo("AI_INTERRUPTED");
        when(client.models(anyString())).thenReturn(List.of(new AiProviderGateway.Model("test","Test")));service.models("owner","conn");
        assertThatThrownBy(()->service.probe("owner","conn","test","new-probe-key")).isInstanceOfSatisfying(vn.syp.tms.shared.web.BusinessException.class,e->assertThat(e.code()).isEqualTo("AI_PROBE_LIMIT"));verify(client,never()).generate(anyString(),anyString(),anyString(),any(),anyString(),any());
    }
    @Test void duplicateCallbackParametersAndMissingIssuedClientAreRejected(){assertThatThrownBy(()->ChatGptConnectionService.query("state=first&state=second")).isInstanceOf(IllegalArgumentException.class);var p=authorize();p.remove("client_id");assertThatThrownBy(()->service.completeCallback(p.get("attemptId"),p)).hasMessage("AI_AUTH_FAILED");verifyNoInteractions(oauth);}
}
