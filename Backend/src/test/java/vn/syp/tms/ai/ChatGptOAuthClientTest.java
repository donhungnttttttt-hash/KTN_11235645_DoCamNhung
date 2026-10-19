package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.*;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;

/** OAuth adapter uses an isolated loopback issuer fixture; runtime issuer remains fixed. */
class ChatGptOAuthClientTest {
    final ObjectMapper json=new ObjectMapper();
    HttpServer server;
    ChatGptOAuthClient oauth;
    String base;
    final AtomicReference<Map<String,String>> received=new AtomicReference<>();

    @BeforeEach void start() throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        base="http://127.0.0.1:"+server.getAddress().getPort();server.start();oauth=new ChatGptOAuthClient(json,URI.create(base));
    }
    @AfterEach void stop(){server.stop(0);}
    void reply(String path,int status,String body) {
        server.createContext(path,exchange->{
            if("POST".equals(exchange.getRequestMethod()))received.set(ChatGptConnectionService.query(new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8)));
            byte[] bytes=body.getBytes(StandardCharsets.UTF_8);exchange.sendResponseHeaders(status,bytes.length);
            try(var out=exchange.getResponseBody()){out.write(bytes);}
        });
    }
    @Test void unusableRefreshCodesAreTerminalButTemporaryOutageIsNot() {
        reply("/api/accounts/oauth/token",400,"{\"error\":\"invalid_grant\",\"error_description\":\"secret credential detail\"}");
        assertThatThrownBy(()->oauth.refresh("oaiapp_test","refresh-secret")).hasMessage("AI_OAUTH_INVALID_GRANT");
        assertThat(received.get()).containsEntry("client_id","oaiapp_test").containsEntry("grant_type","refresh_token")
                .containsEntry("resource",ChatGptOAuthClient.RESOURCE).doesNotContainKey("scope");
        server.removeContext("/api/accounts/oauth/token");reply("/api/accounts/oauth/token",503,"{\"error\":\"temporarily_unavailable\"}");
        assertThatThrownBy(()->oauth.refresh("oaiapp_test","refresh-secret")).hasMessage("AI_UNAVAILABLE");
        for(String code:List.of("invalid_refresh_token","token_expired","refresh_token_expired","refresh_token_invalidated","refresh_token_reused"))
            assertThat(ProviderHttp.oauthErrorCode(400,("{\"error\":\""+code+"\"}").getBytes(StandardCharsets.UTF_8),json)).isEqualTo("AI_OAUTH_INVALID_GRANT");
        assertThat(ProviderHttp.oauthErrorCode(401,"{\"error\":\"invalid_client\"}".getBytes(StandardCharsets.UTF_8),json)).isEqualTo("AI_OAUTH_INVALID_CLIENT");
    }
    @Test void exchangeAndRotatingRefreshValidateRealSignedIdTokenThroughDiscoveryAndJwks() throws Exception {
        var generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);var pair=generator.generateKeyPair();var rsa=(RSAPublicKey)pair.getPublic();
        var jwks=json.createObjectNode();jwks.putArray("keys").addObject().put("kid","fixture").put("kty","RSA").put("alg","RS256")
                .put("n",encode(rsa.getModulus().toByteArray())).put("e",encode(rsa.getPublicExponent().toByteArray()));
        var claims=json.createObjectNode().put("iss","https://auth.openai.com").put("aud","oaiapp_test").put("sub","subject").put("nonce","nonce")
                .put("exp",Instant.now().plusSeconds(300).getEpochSecond());
        String signed=encode("{\"alg\":\"RS256\",\"kid\":\"fixture\"}".getBytes(StandardCharsets.UTF_8))+"."+encode(json.writeValueAsBytes(claims));
        var signature=Signature.getInstance("SHA256withRSA");signature.initSign(pair.getPrivate());signature.update(signed.getBytes(StandardCharsets.US_ASCII));signed+="."+encode(signature.sign());
        var tokens=json.createObjectNode().put("access_token","new-access").put("refresh_token","rotated-refresh").put("id_token",signed).put("token_type","Bearer")
                .put("expires_in",3600).put("scope",ChatGptOAuthClient.SCOPES);
        reply("/api/accounts/oauth/token",200,tokens.toString());reply("/.well-known/openid-configuration",200,
                json.createObjectNode().put("issuer","https://auth.openai.com").put("jwks_uri",base+"/jwks").toString());reply("/jwks",200,jwks.toString());
        var exchange=oauth.exchange("oaiapp_test","code","verifier","http://127.0.0.1:12345/auth/callback");
        assertThat(received.get()).containsEntry("code_verifier","verifier").containsEntry("redirect_uri","http://127.0.0.1:12345/auth/callback");
        assertThat(oauth.validate(exchange,"oaiapp_test","nonce",null).path("sub").asText()).isEqualTo("subject");
        var refreshed=oauth.refresh("oaiapp_test","old-refresh");assertThat(refreshed.path("refresh_token").asText()).isEqualTo("rotated-refresh");
        assertThat(oauth.validate(refreshed,"oaiapp_test",null,"subject").path("sub").asText()).isEqualTo("subject");
    }
    private String encode(byte[] value){return Base64.getUrlEncoder().withoutPadding().encodeToString(value);}
    @Test void refreshAndDiscoveryShareOuterCatalogDeadlineAndValidationTimeoutRequiresReconnect() throws Exception {
        var refreshCalls=new java.util.concurrent.atomic.AtomicInteger();
        var discoveryEntered=new java.util.concurrent.CountDownLatch(1);
        var releaseDiscovery=new java.util.concurrent.CountDownLatch(1);
        var terminalWriteEntered=new java.util.concurrent.CountDownLatch(1);
        var releaseSettlement=new java.util.concurrent.CountDownLatch(1);
        String tokens=json.createObjectNode().put("access_token","replacement").put("refresh_token","rotated").put("id_token","fixture")
                .put("token_type","Bearer").put("expires_in",3600).put("scope",ChatGptOAuthClient.SCOPES).toString();
        server.createContext("/api/accounts/oauth/token",exchange->{
            refreshCalls.incrementAndGet();byte[] bytes=tokens.getBytes(StandardCharsets.UTF_8);
            try {exchange.sendResponseHeaders(200,bytes.length);try(var out=exchange.getResponseBody()){out.write(bytes);}}catch(java.io.IOException ignored){}
        });
        server.createContext("/.well-known/openid-configuration",exchange->{
            discoveryEntered.countDown();
            try {releaseDiscovery.await(5,java.util.concurrent.TimeUnit.SECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();}
            byte[] bytes=json.createObjectNode().put("issuer","https://auth.openai.com").put("jwks_uri",base+"/jwks").toString().getBytes(StandardCharsets.UTF_8);
            try {exchange.sendResponseHeaders(200,bytes.length);try(var out=exchange.getResponseBody()){out.write(bytes);}}catch(java.io.IOException ignored){}
        });
        var vault=org.mockito.Mockito.mock(ChatGptCredentialVault.class);var access=org.mockito.Mockito.mock(LocalAiAccess.class);var client=org.mockito.Mockito.mock(ChatGptPlanClient.class);
        var prior=json.createObjectNode().put("id","conn").put("version",1).put("clientId","oaiapp_test").put("subject","subject")
                .put("accessToken","old").put("refreshToken","old-refresh").put("expiresAt",1).put("scopes",ChatGptOAuthClient.SCOPES)
                .put("verifiedModel","test").put("verifiedAt",Instant.now().toString());
        org.mockito.Mockito.when(vault.read()).thenReturn(prior);
        org.mockito.Mockito.doAnswer(call->{
            JsonNode next=call.getArgument(0);
            if(!next.path("reconnectRequired").asBoolean())return null;
            assertThat(next.has("accessToken")).isFalse();assertThat(next.has("refreshToken")).isFalse();
            terminalWriteEntered.countDown();
            if(!releaseSettlement.await(5,java.util.concurrent.TimeUnit.SECONDS))throw new AssertionError("Test did not release retained settlement");
            return null;
        }).when(vault).write(org.mockito.ArgumentMatchers.any());
        var config=new LocalAiConfiguration(true,"owner","urn:uuid:12345678-1234-1234-1234-123456789012","C:/test-vault","","127.0.0.1",false,"http://127.0.0.1:11434");
        var service=new ChatGptConnectionService(config,access,vault,oauth,client,json);
        long started=System.nanoTime();
        try {
            // The discovery response and local settlement stay blocked until the caller has expired.
            // This selects the timeout outcome without racing a near-deadline completed settlement.
            assertThatThrownBy(()->ProviderHttp.bounded(1,()->service.models("owner","conn"))).hasMessage("AI_UNAVAILABLE");
            assertThat(java.time.Duration.ofNanos(System.nanoTime()-started)).isLessThan(java.time.Duration.ofSeconds(2));
            assertThat(discoveryEntered.await(1,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            assertThat(terminalWriteEntered.await(1,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(()->service.models("owner","conn")).hasMessage("AI_BUSY");
            releaseDiscovery.countDown();releaseSettlement.countDown();
            // Admission stays closed until the retained local write has actually finished.
            long settlementDeadline=System.nanoTime()+java.util.concurrent.TimeUnit.SECONDS.toNanos(1);
            ChatGptConnectionService.Connection connection;
            while(true){
                try{connection=service.connection("owner");break;}
                catch(OpenAiResponsesClient.Failure e){if(!"AI_BUSY".equals(e.code())||System.nanoTime()>=settlementDeadline)throw e;Thread.sleep(5);}
            }
            assertThat(connection.state()).isEqualTo("RECONNECT_REQUIRED");
            assertThatThrownBy(()->service.models("owner","conn")).hasMessage("AI_RECONNECT_REQUIRED");
            assertThat(refreshCalls.get()).isEqualTo(1);org.mockito.Mockito.verifyNoInteractions(client);
        }finally{releaseDiscovery.countDown();releaseSettlement.countDown();service.close();}
    }
}
