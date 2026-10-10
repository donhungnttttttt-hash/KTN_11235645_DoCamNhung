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
    @Test void failedInitialExchangeRetainsIssuedClientAcrossRestartWithoutActivatingIdentity() {
        var p=authorize();when(oauth.exchange(anyString(),anyString(),anyString(),anyString())).thenThrow(new OpenAiResponsesClient.Failure("AI_OAUTH_INVALID_GRANT"));
        assertThatThrownBy(()->service.completeCallback(p.get("attemptId"),p)).hasMessage("AI_OAUTH_INVALID_GRANT");
        var capture=org.mockito.ArgumentCaptor.forClass(JsonNode.class);verify(vault,atLeastOnce()).write(capture.capture());
        when(vault.read()).thenReturn(capture.getValue().deepCopy());service.close();service=new ChatGptConnectionService(config,access,vault,oauth,client,json);
        var next=service.start("owner",false);var params=ChatGptConnectionService.query(URI.create(next.authorizationUrl()).getRawQuery());
        assertThat(params.get("client_id")).isEqualTo("oaiapp_test");assertThat(params.get("state")).isNotEqualTo(p.get("state"));assertThat(params.get("nonce")).isNotEqualTo(p.get("nonce"));assertThat(params.get("code_challenge")).isNotEqualTo(p.get("code_challenge"));
        assertThat(service.connection("owner").state()).isEqualTo("DISCONNECTED");
    }
    @Test void temporaryRefreshFailurePreservesVerificationAndTerminalFailureStopsFurtherRefresh() {
        loadVerifiedExpired();when(oauth.refresh(anyString(),anyString())).thenThrow(new OpenAiResponsesClient.Failure("AI_UNAVAILABLE"));
        assertThatThrownBy(()->service.models("owner","conn")).hasMessage("AI_UNAVAILABLE");
        assertThat(service.connection("owner").state()).isEqualTo("VERIFIED");
        assertThat(service.connection("owner").failureCode()).isEqualTo("AI_UNAVAILABLE");
        doThrow(new OpenAiResponsesClient.Failure("AI_OAUTH_INVALID_GRANT")).when(oauth).refresh(anyString(),anyString());
        assertThatThrownBy(()->service.models("owner","conn")).hasMessage("AI_RECONNECT_REQUIRED");
        assertThat(service.connection("owner").state()).isEqualTo("RECONNECT_REQUIRED");
        assertThatThrownBy(()->service.models("owner","conn")).hasMessage("AI_RECONNECT_REQUIRED");verify(oauth,times(2)).refresh(anyString(),anyString());
    }
    void loadVerifiedExpired() {
        var prior=json.createObjectNode().put("id","conn").put("version",1).put("clientId","oaiapp_test").put("subject","subject")
                .put("accessToken","expired-access").put("refreshToken","old-refresh").put("idToken","old-id").put("expiresAt",1)
                .put("scopes",ChatGptOAuthClient.SCOPES).put("verifiedModel","test").put("verifiedAt",Instant.now().toString());
        when(vault.read()).thenReturn(prior);service.close();service=new ChatGptConnectionService(config,access,vault,oauth,client,json);
    }
    @Test void validationOutageAfterRotatingRefreshDurablyRequiresReconnectWithoutTokenReuse() throws Exception {
        loadVerifiedExpired();
        when(oauth.refresh("oaiapp_test", "old-refresh")).thenReturn(tokens());
        when(oauth.validate(any(), anyString(), isNull(), anyString()))
                .thenThrow(new OpenAiResponsesClient.Failure("AI_UNAVAILABLE"));
        assertThatThrownBy(() -> service.models("owner", "conn")).hasMessage("AI_RECONNECT_REQUIRED");
        assertThat(service.connection("owner").state()).isEqualTo("RECONNECT_REQUIRED");
        var capture = org.mockito.ArgumentCaptor.forClass(JsonNode.class);
        verify(vault).write(capture.capture());
        assertThat(capture.getValue().hasNonNull("refreshToken")).isFalse();
        when(vault.read()).thenReturn(capture.getValue().deepCopy());
        service.close(); service = new ChatGptConnectionService(config, access, vault, oauth, client, json);
        assertThatThrownBy(() -> service.models("owner", "conn")).hasMessage("AI_RECONNECT_REQUIRED");
        verify(oauth, times(1)).refresh("oaiapp_test", "old-refresh");
        verifyNoInteractions(client);
    }
    @Test void validationFailureSettlementRetriesLocallyAndRespectsDisconnectFence() throws Exception {
        loadVerifiedExpired();when(oauth.refresh(anyString(),anyString())).thenReturn(tokens());
        when(oauth.validate(any(),anyString(),isNull(),anyString())).thenThrow(new OpenAiResponsesClient.Failure("AI_UNAVAILABLE"));
        doThrow(new OpenAiResponsesClient.Failure("AI_CREDENTIAL_STORE_FAILED")).doNothing().when(vault).write(any());
        assertThatThrownBy(()->service.models("owner","conn")).hasMessage("AI_CREDENTIAL_STORE_FAILED");
        assertThatThrownBy(()->service.models("owner","conn")).hasMessage("AI_BUSY");
        awaitSettled();assertThat(service.connection("owner").state()).isEqualTo("RECONNECT_REQUIRED");
        verify(oauth,times(1)).refresh(anyString(),anyString());
        loadVerifiedExpired();
        doAnswer(call->{
            service.disconnect("owner","conn",1);throw new OpenAiResponsesClient.Failure("AI_UNAVAILABLE");
        }).when(oauth).validate(any(),anyString(),isNull(),anyString());
        assertThatThrownBy(()->service.models("owner","conn")).hasMessage("AI_RECONNECT_REQUIRED");
        assertThat(service.connection("owner").state()).isEqualTo("DISCONNECTED");
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans={true,false})
    void tokenExpiryStaysAtReceiptTimeAcrossValidationAndPersistenceRetry(boolean refreshing) throws Exception {
        if(refreshing)loadVerifiedExpired();
        var receipt=Instant.parse("2026-10-10T00:00:00Z");
        var clock=mock(java.time.Clock.class);var now=new java.util.concurrent.atomic.AtomicReference<>(receipt);
        when(clock.instant()).thenAnswer(call->now.get());
        service.close();service=new ChatGptConnectionService(config,access,vault,oauth,client,json,clock);
        Map<String,String> params=refreshing?null:authorize();
        when(oauth.refresh(anyString(),anyString())).thenReturn(tokens());
        when(oauth.validate(any(),anyString(),any(),any())).thenAnswer(call->{
            now.set(receipt.plusSeconds(120));return json.createObjectNode().put("sub","subject");
        });
        var expiries=new java.util.concurrent.CopyOnWriteArrayList<Long>();
        doAnswer(call->{
            JsonNode next=call.getArgument(0);
            if(next.hasNonNull("accessToken")) {
                expiries.add(next.path("expiresAt").asLong());
                if(expiries.size()==1){now.set(receipt.plusSeconds(7200));throw new OpenAiResponsesClient.Failure("AI_CREDENTIAL_STORE_FAILED");}
            }
            return null;
        }).when(vault).write(any());
        assertThatThrownBy(()->{
            if(refreshing)service.models("owner","conn");else service.completeCallback(params.get("attemptId"),params);
        }).hasMessage("AI_CREDENTIAL_STORE_FAILED");
        awaitSettled();
        assertThat(expiries).containsExactly(receipt.plusSeconds(3600).getEpochSecond(),receipt.plusSeconds(3600).getEpochSecond());
        if(refreshing)verify(oauth,times(1)).refresh(anyString(),anyString());
        else verify(oauth,times(1)).exchange(anyString(),anyString(),anyString(),anyString());
    }
    @Test void explicitPlanPermissionUsesSavedClientAndConsentButNormalReconnectDoesNot() {
        var p=authorize();var identityOnly=(com.fasterxml.jackson.databind.node.ObjectNode)tokens();identityOnly.put("scope","openid profile email offline_access");
        when(oauth.exchange(anyString(),anyString(),anyString(),anyString())).thenReturn(identityOnly);service.completeCallback(p.get("attemptId"),p);
        assertThat(service.connection("owner").state()).isEqualTo("MISSING_PERMISSION");
        assertThatThrownBy(()->service.token("owner",new AiProviderGateway.ResolvedSelection("CHATGPT","test",service.connection("owner").id(),1))).hasMessage("AI_PERMISSION_DENIED");
        var normal=service.start("owner",false);var ordinary=ChatGptConnectionService.query(URI.create(normal.authorizationUrl()).getRawQuery());
        assertThat(ordinary).containsEntry("client_id","oaiapp_test").doesNotContainKey("prompt");service.cancel("owner",normal.attemptId());
        var explicit=service.start("owner",false,true);var consent=ChatGptConnectionService.query(URI.create(explicit.authorizationUrl()).getRawQuery());
        assertThat(consent).containsEntry("client_id","oaiapp_test").containsEntry("prompt","consent").containsEntry("scope",ChatGptOAuthClient.SCOPES)
                .doesNotContainKeys("agent_name_hint","force_reconsent");
    }
    @Test void refreshInFlightDoesNotBlockInferenceOrDisconnectAndCannotRestoreClearedCredentials() throws Exception {
        loadVerifiedExpired();var entered=new java.util.concurrent.CountDownLatch(1);var release=new java.util.concurrent.CountDownLatch(1);
        when(oauth.refresh(anyString(),anyString())).thenAnswer(call->{entered.countDown();assertThat(release.await(3,java.util.concurrent.TimeUnit.SECONDS)).isTrue();return tokens();});
        try(var threads=java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var pending=threads.submit(()->service.models("owner","conn"));assertThat(entered.await(1,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            var selection=new AiProviderGateway.ResolvedSelection("CHATGPT","test","conn",1);
            var gateway=new AiProviderGateway(new OpenAiConfiguration(false,"","api-model",20,100,10),config,access,
                    mock(OpenAiResponsesClient.class),mock(OllamaClient.class),service,client);
            var rejected=threads.submit(()->catchThrowable(()->gateway.generate("owner",selection,"facts",json.createObjectNode(),"test",json.createObjectNode())));
            assertThat(rejected.get(1,java.util.concurrent.TimeUnit.SECONDS)).hasMessage("AI_BUSY");
            var disconnected=threads.submit(()->service.disconnect("owner","conn",1));
            assertThat(disconnected.get(1,java.util.concurrent.TimeUnit.SECONDS).disconnected()).isTrue();
            release.countDown();assertThatThrownBy(()->pending.get(1,java.util.concurrent.TimeUnit.SECONDS)).hasCauseInstanceOf(OpenAiResponsesClient.Failure.class);
            assertThat(service.connection("owner").state()).isEqualTo("DISCONNECTED");verify(client,never()).models(anyString());verify(oauth,times(1)).refresh(anyString(),anyString());
            verify(client,never()).generate(anyString(),anyString(),anyString(),any(),anyString(),any());
        }finally{release.countDown();}
    }
    @Test void successfulRotatingRefreshIsStoredAndNotRepeatedForFollowingCatalogRead() {
        loadVerifiedExpired();when(oauth.refresh("oaiapp_test","old-refresh")).thenReturn(tokens());when(client.models("secret-access")).thenReturn(List.of(new AiProviderGateway.Model("test","Test")));
        assertThat(service.models("owner","conn")).hasSize(1);assertThat(service.models("owner","conn")).hasSize(1);verify(oauth,times(1)).refresh(anyString(),anyString());
        var capture=org.mockito.ArgumentCaptor.forClass(JsonNode.class);verify(vault,atLeastOnce()).write(capture.capture());
        assertThat(capture.getValue().path("refreshToken").asText()).isEqualTo("secret-refresh");assertThat(service.connection("owner").state()).isEqualTo("VERIFIED");
    }
    @Test void shortCompletionFenceContentionFailsFastInsteadOfWaitingBehindDatabaseWork() throws Exception {
        loadVerifiedExpired();var selection=new AiProviderGateway.ResolvedSelection("CHATGPT","test","conn",1);
        var entered=new java.util.concurrent.CountDownLatch(1);var release=new java.util.concurrent.CountDownLatch(1);
        try(var threads=java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var saving=threads.submit(()->service.withCurrent("owner",selection,()->{
                entered.countDown();try{release.await(3,java.util.concurrent.TimeUnit.SECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();}return "saved";
            }));
            assertThat(entered.await(1,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            var conflicting=threads.submit(()->catchThrowable(()->service.disconnect("owner","conn",1)));
            assertThat(conflicting.get(1,java.util.concurrent.TimeUnit.SECONDS)).hasMessage("AI_BUSY");
            release.countDown();assertThat(saving.get(1,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo("saved");
        }finally{release.countDown();}
    }
    private java.util.concurrent.locks.ReentrantLock stateFence() throws Exception {
        var field = ChatGptConnectionService.class.getDeclaredField("stateLock");
        field.setAccessible(true);
        return (java.util.concurrent.locks.ReentrantLock) field.get(service);
    }
    private void await(java.util.concurrent.CountDownLatch latch) throws InterruptedException {
        assertThat(latch.await(3, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
    }
    @Test void terminalRefreshSettlesDespiteContentionAndSurvivesRestart() throws Exception {
        loadVerifiedExpired();
        var entered = new java.util.concurrent.CountDownLatch(1);
        var returned = new java.util.concurrent.CountDownLatch(1);
        when(oauth.refresh(anyString(), anyString())).thenAnswer(call -> {
            entered.countDown(); await(returned);
            throw new OpenAiResponsesClient.Failure("AI_OAUTH_INVALID_GRANT");
        });
        try (var threads = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var result = threads.submit(() -> catchThrowable(() -> service.models("owner", "conn")));
            await(entered);
            var fence = stateFence(); fence.lock();
            try { returned.countDown(); Thread.sleep(150); assertThat(result.isDone()).isFalse(); }
            finally { fence.unlock(); }
            assertThat(result.get(2, java.util.concurrent.TimeUnit.SECONDS)).hasMessage("AI_RECONNECT_REQUIRED");
        }
        var capture = org.mockito.ArgumentCaptor.forClass(JsonNode.class);
        verify(vault, atLeastOnce()).write(capture.capture());
        assertThat(capture.getValue().hasNonNull("refreshToken")).isFalse();
        when(vault.read()).thenReturn(capture.getValue().deepCopy());
        service.close(); service = new ChatGptConnectionService(config, access, vault, oauth, client, json);
        assertThat(service.connection("owner").state()).isEqualTo("RECONNECT_REQUIRED");
        assertThatThrownBy(() -> service.models("owner", "conn")).hasMessage("AI_RECONNECT_REQUIRED");
        verify(oauth, times(1)).refresh(anyString(), anyString());
    }
    @Test void rotatingRefreshWaitsForSettlementWithoutReusingConsumedToken() throws Exception {
        loadVerifiedExpired();
        var entered = new java.util.concurrent.CountDownLatch(1);
        var returned = new java.util.concurrent.CountDownLatch(1);
        when(oauth.refresh(anyString(), anyString())).thenAnswer(call -> {
            entered.countDown(); await(returned); return tokens();
        });
        when(client.models("secret-access")).thenReturn(List.of(new AiProviderGateway.Model("test", "Test")));
        try (var threads = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var result = threads.submit(() -> service.models("owner", "conn"));
            await(entered);
            var fence = stateFence(); fence.lock();
            try { returned.countDown(); Thread.sleep(150); assertThat(result.isDone()).isFalse(); }
            finally { fence.unlock(); }
            assertThat(result.get(2, java.util.concurrent.TimeUnit.SECONDS)).hasSize(1);
        }
        assertThat(service.models("owner", "conn")).hasSize(1);
        verify(oauth, times(1)).refresh("oaiapp_test", "old-refresh");
        var capture = org.mockito.ArgumentCaptor.forClass(JsonNode.class);
        verify(vault, atLeastOnce()).write(capture.capture());
        assertThat(capture.getValue().path("refreshToken").asText()).isEqualTo("secret-refresh");
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {true, false})
    void completedProbeSettlesOnceAfterFenceContention(boolean success) throws Exception {
        var params = authorize(); service.completeCallback(params.get("attemptId"), params);
        String id = service.connection("owner").id();
        when(client.models(anyString())).thenReturn(List.of(new AiProviderGateway.Model("test", "Test")));
        service.models("owner", id);
        var entered = new java.util.concurrent.CountDownLatch(1);
        var returned = new java.util.concurrent.CountDownLatch(1);
        when(client.generate(anyString(), anyString(), anyString(), any(), anyString(), any())).thenAnswer(call -> {
            entered.countDown(); await(returned);
            if (!success) throw new OpenAiResponsesClient.Failure("AI_UNAVAILABLE");
            var value = json.createObjectNode().put("title", "Test").put("summary", "Connected");
            value.putArray("observations"); value.putArray("suggestedActions"); value.putArray("missingInformation");
            return new OpenAiResponsesClient.Output(value, "resp_test", "test", 1, 1);
        });
        try (var threads = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var result = threads.submit(() -> service.probe("owner", id, "test", "probe-settlement"));
            await(entered);
            var fence = stateFence(); fence.lock();
            try { returned.countDown(); Thread.sleep(150); assertThat(result.isDone()).isFalse(); }
            finally { fence.unlock(); }
            assertThat(result.get(2, java.util.concurrent.TimeUnit.SECONDS).state()).isEqualTo(success ? "READY" : "FAILED");
        }
        assertThat(service.probe("owner", id, "test", "probe-settlement").state()).isEqualTo(success ? "READY" : "FAILED");
        assertThat(service.connection("owner").state()).isEqualTo(success ? "VERIFIED" : "UNVERIFIED");
        verify(client, times(1)).generate(anyString(), anyString(), anyString(), any(), anyString(), any());
        var capture = org.mockito.ArgumentCaptor.forClass(JsonNode.class);
        verify(vault, atLeastOnce()).write(capture.capture());
        assertThat(capture.getValue().path("probes")).hasSize(1);
    }
    @Test void failedCallbackSettlesAttemptAfterFenceContention() throws Exception {
        var params = authorize();
        var entered = new java.util.concurrent.CountDownLatch(1);
        var returned = new java.util.concurrent.CountDownLatch(1);
        when(oauth.exchange(anyString(), anyString(), anyString(), anyString())).thenAnswer(call -> {
            entered.countDown(); await(returned); throw new OpenAiResponsesClient.Failure("AI_OAUTH_INVALID_GRANT");
        });
        try (var threads = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var result = threads.submit(() -> catchThrowable(() -> service.completeCallback(params.get("attemptId"), params)));
            await(entered);
            var fence = stateFence(); fence.lock();
            try { returned.countDown(); Thread.sleep(150); assertThat(result.isDone()).isFalse(); }
            finally { fence.unlock(); }
            assertThat(result.get(2, java.util.concurrent.TimeUnit.SECONDS)).hasMessage("AI_OAUTH_INVALID_GRANT");
        }
        assertThat(service.attempt("owner", params.get("attemptId")).state()).isEqualTo("FAILED");
    }
    private void awaitSettled() throws Exception {
        var field = ChatGptConnectionService.class.getDeclaredField("pendingSettlements");
        field.setAccessible(true);
        var pending = (java.util.concurrent.atomic.AtomicInteger) field.get(service);
        long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(3);
        while (pending.get() != 0 && System.nanoTime() < deadline) Thread.sleep(5);
        assertThat(pending.get()).isZero();
    }
    @Test void rotatingOutcomeSurvivesCallerDeadlineAndBlocksAdmissionUntilPersisted() throws Exception {
        loadVerifiedExpired();
        var entered = new java.util.concurrent.CountDownLatch(1);
        var returned = new java.util.concurrent.CountDownLatch(1);
        when(oauth.refresh(anyString(), anyString())).thenAnswer(call -> {
            entered.countDown(); await(returned); return tokens();
        });
        when(client.models("secret-access")).thenReturn(List.of(new AiProviderGateway.Model("test", "Test")));
        try (var threads = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var result = threads.submit(() -> catchThrowable(() -> ProviderHttp.bounded(1, () -> service.models("owner", "conn"))));
            await(entered);
            var fence = stateFence(); fence.lock();
            try {
                returned.countDown();
                assertThat(result.get(2, java.util.concurrent.TimeUnit.SECONDS)).hasMessage("AI_UNAVAILABLE");
                assertThatThrownBy(() -> service.models("owner", "conn")).hasMessage("AI_BUSY");
                verify(oauth, times(1)).refresh(anyString(), anyString());
            } finally { fence.unlock(); }
        }
        awaitSettled();
        assertThat(service.models("owner", "conn")).hasSize(1);
        verify(oauth, times(1)).refresh("oaiapp_test", "old-refresh");
        var capture = org.mockito.ArgumentCaptor.forClass(JsonNode.class);
        verify(vault, atLeastOnce()).write(capture.capture());
        assertThat(capture.getValue().path("refreshToken").asText()).isEqualTo("secret-refresh");
    }
    @Test void localVaultFailureRetainsRotatedOutcomeAndRetriesOnlyPersistence() throws Exception {
        loadVerifiedExpired();
        when(oauth.refresh(anyString(), anyString())).thenReturn(tokens());
        when(client.models("secret-access")).thenReturn(List.of(new AiProviderGateway.Model("test", "Test")));
        doThrow(new OpenAiResponsesClient.Failure("AI_CREDENTIAL_STORE_FAILED")).doNothing().when(vault).write(any());
        assertThatThrownBy(() -> service.models("owner", "conn")).hasMessage("AI_CREDENTIAL_STORE_FAILED");
        assertThatThrownBy(() -> service.models("owner", "conn")).hasMessage("AI_BUSY");
        awaitSettled();
        assertThat(service.models("owner", "conn")).hasSize(1);
        verify(oauth, times(1)).refresh("oaiapp_test", "old-refresh");
        verify(vault, times(2)).write(any());
    }
    @Test void successfulCallbackChecksSessionAgainWhenContendedSettlementRuns() throws Exception {
        var params = authorize();
        var entered = new java.util.concurrent.CountDownLatch(1);
        var returned = new java.util.concurrent.CountDownLatch(1);
        when(oauth.validate(any(), anyString(), anyString(), isNull())).thenAnswer(call -> {
            entered.countDown(); await(returned); return json.createObjectNode().put("sub", "subject");
        });
        try (var threads = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var result = threads.submit(() -> catchThrowable(() -> service.completeCallback(params.get("attemptId"), params)));
            await(entered);
            var fence = stateFence(); fence.lock();
            try {
                returned.countDown(); Thread.sleep(150);
                assertThat(result.isDone()).isFalse();
                doThrow(new IllegalStateException("signed out")).when(access).verifySession(any(), any());
            } finally { fence.unlock(); }
            assertThat(result.get(2, java.util.concurrent.TimeUnit.SECONDS)).hasMessage("AI_AUTH_FAILED");
        }
        doNothing().when(access).verifySession(any(), any());
        assertThat(service.attempt("owner", params.get("attemptId")).state()).isEqualTo("FAILED");
        assertThat(service.connection("owner").state()).isEqualTo("DISCONNECTED");
    }
    @Test void callbackPersistenceRetryDoesNotPrematurelyFailItsAttempt() throws Exception {
        var params = authorize();
        doNothing().doThrow(new OpenAiResponsesClient.Failure("AI_CREDENTIAL_STORE_FAILED")).doNothing()
                .when(vault).write(any());
        assertThatThrownBy(() -> service.completeCallback(params.get("attemptId"), params))
                .hasMessage("AI_CREDENTIAL_STORE_FAILED");
        awaitSettled();
        assertThat(service.attempt("owner", params.get("attemptId")).state()).isEqualTo("AUTHORIZED");
        assertThat(service.connection("owner").state()).isEqualTo("UNVERIFIED");
        verify(oauth, times(1)).exchange(anyString(), anyString(), anyString(), anyString());
        verify(vault, times(3)).write(any());
    }
}
