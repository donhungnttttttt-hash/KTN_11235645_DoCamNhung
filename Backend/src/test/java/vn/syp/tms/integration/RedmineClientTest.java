package vn.syp.tms.integration;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;

class RedmineClientTest {
    HttpServer server;RedmineClient client;ObjectMapper json=new ObjectMapper();
    AtomicInteger posts=new AtomicInteger();
    RedmineConfiguration.Mapping mapping=new RedmineConfiguration.Mapping(1,2,3,
        Map.of("open",1L,"progress",2L,"recheck",3L,"clarify",4L,"ready",5L,"planning",6L,"resolved",7L,"unreproducible",8L,"wontfix",9L,"closed",10L),Map.of("HIGH",3L,"MEDIUM",2L,"LOW",1L));
    String marker="f304a74e-877d-4232-92e2-2ece92cfe589";
    RedminePayload payload(){return new RedminePayload(1,2,1,2,"Lỗi đăng nhập","Bước thử\nTiếng Việt",marker,true);}
    Map<String,Object> issue(){return Map.of("id",42,"project",Map.of("id",1),"tracker",Map.of("id",2),"status",Map.of("id",1),"priority",Map.of("id",2),"subject",payload().subject(),"description",payload().description(),"custom_fields",List.of(Map.of("id",3,"value",marker)),"is_private",true);}
    @BeforeEach void setup() throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);server.start();
        var config=mock(RedmineConfiguration.class);when(config.base()).thenReturn(URI.create("http://127.0.0.1:"+server.getAddress().getPort()));when(config.apiKey()).thenReturn("test-secret-only");
        client=new RedmineClient(config,json);
    }
    @AfterEach void stop(){server.stop(0);}
    void respond(int status,String body,String retry) {
        server.createContext("/",exchange->{
            if(exchange.getRequestMethod().equals("POST"))posts.incrementAndGet();
            assertThat(exchange.getRequestHeaders().getFirst("X-Redmine-API-Key")).isEqualTo("test-secret-only");
            if(retry!=null)exchange.getResponseHeaders().set("Retry-After",retry);
            byte[] bytes=body.getBytes(StandardCharsets.UTF_8);exchange.sendResponseHeaders(status,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
        });
    }
    @Test void parsesBoundIssueAndSearchesExactMarkerAcrossAllStatuses() throws Exception {
        server.createContext("/issues/42.json",e->{byte[] b=json.writeValueAsBytes(Map.of("issue",issue()));e.sendResponseHeaders(200,b.length);e.getResponseBody().write(b);e.close();});
        server.createContext("/issues.json",e->{assertThat(e.getRequestURI().getQuery()).contains("project_id=1","status_id=*","cf_3="+marker,"limit=2");byte[] b=json.writeValueAsBytes(Map.of("issues",List.of(issue()),"total_count",1));e.sendResponseHeaders(200,b.length);e.getResponseBody().write(b);e.close();});
        assertThat(client.read(42,mapping,marker).payload()).isEqualTo(payload());
        assertThat(client.find(mapping,marker)).hasSize(1);
    }
    @Test void rejectsCrossProjectIssueInsteadOfBindingIt() throws Exception {
        var remote=new LinkedHashMap<>(issue());remote.put("project",Map.of("id",99));respond(200,json.writeValueAsString(Map.of("issue",remote)),null);
        assertThatThrownBy(()->client.read(42,mapping,marker)).isInstanceOf(RedmineClient.Failure.class).hasMessage("REMOTE_IDENTITY_MISMATCH");
    }
    @Test void detectsDuplicateSearchResults() throws Exception {
        respond(200,json.writeValueAsString(Map.of("issues",List.of(issue(),issue()),"total_count",2)),null);
        assertThat(client.find(mapping,marker)).hasSize(2);
    }
    @Test void createsExactlyOnceWithoutAutomaticHttpRetries() throws Exception {
        respond(201,json.writeValueAsString(Map.of("issue",issue())),null);
        assertThat(client.create(payload(),mapping)).isEqualTo(42);assertThat(posts).hasValue(1);
    }
    @Test void treatsFailedCreateAsUncertainWithoutLeakingResponse() {
        respond(502,"sensitive remote body test-secret-only",null);
        try {client.create(payload(),mapping);fail("expected failure");}catch(RedmineClient.Failure e){assertThat(e.uncertain()).isTrue();assertThat(e.getMessage()).isEqualTo("REMOTE_UNAVAILABLE");}
        assertThat(posts).hasValue(1);
    }
    @Test void unauthorizedAndValidationAreDefinitiveFailures() {
        respond(401,"secret",null);
        try{client.create(payload(),mapping);fail("expected failure");}catch(RedmineClient.Failure e){assertThat(e.uncertain()).isFalse();assertThat(e.httpStatus()).isEqualTo(401);assertThat(e.retryable()).isFalse();}
    }
    @Test void rateLimitHasBoundedDelayAndDoesNotCreateUnknownOutcome() {
        respond(429,"secret","9999999999");
        try{client.create(payload(),mapping);fail("expected failure");}catch(RedmineClient.Failure e){assertThat(e.uncertain()).isFalse();assertThat(e.retryable()).isTrue();assertThat(e.retryAfterSeconds()).isEqualTo(3600);}
    }
    @Test void malformedSuccessRequiresReconciliation() {
        respond(201,"not-json",null);
        assertThatThrownBy(()->client.create(payload(),mapping)).isInstanceOfSatisfying(RedmineClient.Failure.class,e->assertThat(e.uncertain()).isTrue());
    }
    @Test void refusesOversizeBodies() {
        respond(200,"x".repeat(1048577),null);
        assertThatThrownBy(()->client.read(42,mapping,marker)).isInstanceOf(RedmineClient.Failure.class);
    }
    @org.junit.jupiter.params.ParameterizedTest @org.junit.jupiter.params.provider.ValueSource(ints={403,404,422,408,503,301,307})
    void classifiesHttpErrorsAndNeverFollowsRedirects(int status) {
        respond(status,"private upstream message",null);
        try {client.create(payload(),mapping);fail("expected failure");}catch(RedmineClient.Failure e){
            assertThat(e.httpStatus()).isEqualTo(status);assertThat(e.uncertain()).isEqualTo(status==408 || status>=500 || status<400);
            assertThat(e.getMessage()).doesNotContain("private");
        }
        assertThat(posts).hasValue(1);
    }
    @Test void updateAcceptsEmptySuccessAndUsesPut() {
        server.createContext("/",e->{assertThat(e.getRequestMethod()).isEqualTo("PUT");e.sendResponseHeaders(204,-1);e.close();});
        client.update(42,payload(),mapping);
    }
    @Test void doesNotAcceptAnotherIssueIdFromDetailEndpoint() throws Exception {
        respond(200,json.writeValueAsString(Map.of("issue",issue())),null);
        assertThatThrownBy(()->client.read(43,mapping,marker)).hasMessage("REMOTE_IDENTITY_MISMATCH");
    }
    @org.junit.jupiter.params.ParameterizedTest @org.junit.jupiter.params.provider.ValueSource(strings={"{}","null","[]","{\"issues\":[],\"total_count\":8}"})
    void malformedSearchCannotAuthorizeCreate(String body) {
        respond(200,body,null);assertThatThrownBy(()->client.find(mapping,marker)).isInstanceOf(RedmineClient.Failure.class);
    }
    @Test void missingPrivacyAndMarkerAreNotSilentlyAccepted() throws Exception {
        var bad=new LinkedHashMap<>(issue());bad.remove("is_private");respond(200,json.writeValueAsString(Map.of("issue",bad)),null);
        assertThatThrownBy(()->client.read(42,mapping,marker)).hasMessage("REMOTE_INVALID_RESPONSE");
    }
    @Test void parsesRetryAfterDatesAndClampsInvalidValues() {
        assertThat(RedmineClient.retryAfter("-1")).isEqualTo(1);assertThat(RedmineClient.retryAfter("invalid")).isEqualTo(30);
        assertThat(RedmineClient.retryAfter("Wed, 01 Jan 2020 00:00:00 GMT")).isEqualTo(1);
    }
    @Test void connectionLostAfterPostBodyIsNotAutomaticallyReplayed() {
        server.createContext("/",e->{e.getRequestBody().readAllBytes();posts.incrementAndGet();e.close();});
        assertThatThrownBy(()->client.create(payload(),mapping)).isInstanceOfSatisfying(RedmineClient.Failure.class,e->assertThat(e.uncertain()).isTrue());
        assertThat(posts).hasValue(1);
    }
}
