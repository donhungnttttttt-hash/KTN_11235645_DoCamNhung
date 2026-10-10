package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpServer;
import jakarta.annotation.PreDestroy;
import jakarta.servlet.http.HttpSession;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.shared.web.BusinessException;

/** One explicitly configured local TMS owner; never a shared ChatGPT token broker. */
@Service
public class ChatGptConnectionService {
    public record Connection(String id,long version,String state,boolean planPermission,String accountLabel,
                             String verifiedModel,Instant verifiedAt,String failureCode) {}
    public record Authorization(String attemptId,String authorizationUrl,String state,Instant expiresAt) {}
    public record AttemptView(String attemptId,String state,Instant expiresAt,String failureCode) {}
    public record Probe(String requestKey,String model,String state,String failureCode,Instant completedAt) {}
    public record Disconnect(boolean disconnected,boolean remoteRevoked,String message) {}
    private final LocalAiConfiguration config;private final LocalAiAccess access;private final ChatGptCredentialVault vault;
    private final ChatGptOAuthClient oauth;private final ChatGptPlanClient client;private final ObjectMapper json;
    private ObjectNode saved;private final Map<String,Attempt> attempts=new LinkedHashMap<>();
    private List<AiProviderGateway.Model> catalog=List.of();private long catalogVersion=-1;
    private static final class Attempt {
        String id,owner,state,nonce,verifier,redirect,clientId,subject,status="PENDING",failure;Instant expires;
        HttpServer server;HttpSession session;SessionPrincipal principal;
    }
    public ChatGptConnectionService(LocalAiConfiguration config,LocalAiAccess access,ChatGptCredentialVault vault,
            ChatGptOAuthClient oauth,ChatGptPlanClient client,ObjectMapper json) {
        this.config=config;this.access=access;this.vault=vault;this.oauth=oauth;this.client=client;this.json=json;
        if(config.chatgptEnabled){var prior=vault.read();saved=prior==null?json.createObjectNode():(ObjectNode)prior;
            boolean dirty=false;for(var probe:saved.path("probes"))if("GENERATING".equals(probe.path("state").asText())){((ObjectNode)probe).put("state","FAILED").put("failureCode","AI_INTERRUPTED");dirty=true;}if(dirty)vault.write(saved);
        }else saved=json.createObjectNode();
    }
    public synchronized Connection connection(String actor) {
        access.requireLocal(actor);return view();
    }
    private Connection view() {
        String state=!saved.hasNonNull("accessToken")?"DISCONNECTED":!permission()?"MISSING_PERMISSION":saved.hasNonNull("verifiedAt")?"VERIFIED":"UNVERIFIED";
        return new Connection(saved.path("id").asText(null),saved.path("version").asLong(),state,permission(),saved.path("accountLabel").asText(null),saved.path("verifiedModel").asText(null),instant("verifiedAt"),saved.path("failureCode").asText(null));
    }
    private Instant instant(String field){return saved.hasNonNull(field)?Instant.parse(saved.path(field).asText()):null;}
    public synchronized Authorization start(String actor,boolean newAccount) {
        HttpSession session=access.requireLocal(actor);expire();
        if(attempts.values().stream().anyMatch(a->"PENDING".equals(a.status)))throw conflict("AI_CONNECT_PENDING");
        if(attempts.size()>=5)throw new BusinessException(429,"AI_REQUEST_LIMIT","Too many connection attempts. Try again later.");
        Attempt a=new Attempt();a.id=UUID.randomUUID().toString();a.owner=actor;a.session=session;a.principal=access.current(actor);
        a.state=random();a.nonce=random();a.verifier=random();a.expires=Instant.now().plusSeconds(300);
        a.clientId=!newAccount&&saved.hasNonNull("clientId")?saved.path("clientId").asText():"dynamic_agent_client";
        a.subject="dynamic_agent_client".equals(a.clientId)?null:saved.path("subject").asText(null);
        try {
            a.server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
            a.redirect="http://127.0.0.1:"+a.server.getAddress().getPort()+"/auth/callback";
            a.server.createContext("/auth/callback",exchange->{
                int status=400;String message="Connection could not be verified. Return to TMS.";
                try {
                    if(!"GET".equals(exchange.getRequestMethod())||!"/auth/callback".equals(exchange.getRequestURI().getPath())||!exchange.getRemoteAddress().getAddress().isLoopbackAddress())throw new IllegalArgumentException();
                    completeCallback(a.id,query(exchange.getRequestURI().getRawQuery()));status=200;message="Authorization verified. Return to TMS and run the connection check.";
                }catch(Exception ignored){}
                byte[] body=message.getBytes(StandardCharsets.UTF_8);exchange.getResponseHeaders().set("Content-Type","text/plain; charset=utf-8");
                exchange.getResponseHeaders().set("Cache-Control","no-store");exchange.getResponseHeaders().set("Referrer-Policy","no-referrer");
                exchange.sendResponseHeaders(status,body.length);try(var out=exchange.getResponseBody()){out.write(body);}
            });
            a.server.start();attempts.put(a.id,a);
            var params=new LinkedHashMap<String,String>();params.put("client_id",a.clientId);if("dynamic_agent_client".equals(a.clientId))params.put("agent_name_hint","SY Partners TMS");
            params.put("ext_agent_host_id",config.hostId);params.put("response_type","code");params.put("redirect_uri",a.redirect);params.put("scope",ChatGptOAuthClient.SCOPES);
            params.put("resource",ChatGptOAuthClient.RESOURCE);params.put("state",a.state);params.put("nonce",a.nonce);params.put("code_challenge_method","S256");params.put("code_challenge",challenge(a.verifier));
            // Retained ID token is intentionally not sent through the browser-facing API URL.
            return new Authorization(a.id,"https://auth.openai.com/api/accounts/authorize?"+ChatGptOAuthClient.form(params),a.status,a.expires);
        }catch(Exception e){if(a.server!=null)a.server.stop(0);throw new OpenAiResponsesClient.Failure("AI_UNAVAILABLE");}
    }
    synchronized void completeCallback(String id,Map<String,String> query) {
        Attempt a=attempts.get(id);
        if(a==null||!"PENDING".equals(a.status)||!a.expires.isAfter(Instant.now())||!constant(a.state,query.get("state")))throw new OpenAiResponsesClient.Failure("AI_AUTH_FAILED");
        a.status="PROCESSING";
        try {
            access.verifySession(a.session,a.principal);
            if(query.containsKey("error"))throw new OpenAiResponsesClient.Failure("AI_AUTH_DENIED");
            String issued=query.getOrDefault("client_id",a.clientId);
            if(issued==null||!issued.matches("[A-Za-z0-9_-]{1,200}")||"dynamic_agent_client".equals(issued)||(!"dynamic_agent_client".equals(a.clientId)&&!a.clientId.equals(issued)))throw new OpenAiResponsesClient.Failure("AI_AUTH_FAILED");
            String code=query.get("code");if(code==null||code.isBlank()||code.length()>4096)throw new OpenAiResponsesClient.Failure("AI_AUTH_FAILED");
            ProviderHttp.bounded(()->{
                JsonNode tokens=oauth.exchange(issued,code,a.verifier,a.redirect);JsonNode claims=oauth.validate(tokens,issued,a.nonce,a.subject);
                access.verifySession(a.session,a.principal);
                ObjectNode next=saved.deepCopy();next.put("id",UUID.randomUUID().toString()).put("version",saved.path("version").asLong()+1).put("clientId",issued).put("subject",claims.path("sub").asText());
                String email=claims.path("email").asText("");next.put("accountLabel",email.contains("@")?email.substring(0,1)+"***"+email.substring(email.indexOf('@')):"ChatGPT account");
                updateTokens(next,tokens,false);next.remove(List.of("verifiedModel","verifiedAt","failureCode"));vault.write(next);saved=next;catalog=List.of();catalogVersion=-1;return null;
            });
            a.status="AUTHORIZED";
        }catch(OpenAiResponsesClient.Failure e){a.status="FAILED";a.failure=e.code();throw e;}
        catch(RuntimeException e){a.status="FAILED";a.failure="AI_AUTH_FAILED";throw new OpenAiResponsesClient.Failure("AI_AUTH_FAILED");}
        finally{a.verifier=null;a.nonce=null;}
    }
    public synchronized AttemptView attempt(String actor,String id) {
        access.requireLocal(actor);expire();Attempt a=owned(actor,id);
        try{access.verifySession(a.session,a.principal);}catch(RuntimeException e){stop(a,"CANCELLED");}
        return new AttemptView(id,a.status,a.expires,a.failure);
    }
    public synchronized void cancel(String actor,String id){access.requireLocal(actor);stop(owned(actor,id),"CANCELLED");}
    private Attempt owned(String actor,String id){Attempt a=attempts.get(id);if(a==null||!actor.equals(a.owner))throw new BusinessException(404,"NOT_FOUND","Connection attempt not found.");return a;}
    @Scheduled(fixedDelay=10000) public synchronized void expire() {
        Instant now=Instant.now();for(var a:attempts.values()) {
            if(!a.expires.isAfter(now)&&"PENDING".equals(a.status))stop(a,"EXPIRED");
            else if(!"PENDING".equals(a.status)&&!"PROCESSING".equals(a.status)&&a.server!=null){a.server.stop(0);a.server=null;}
            if("PENDING".equals(a.status))try{access.verifySession(a.session,a.principal);}catch(RuntimeException e){stop(a,"CANCELLED");}
        }
        attempts.values().removeIf(a->a.expires.plusSeconds(300).isBefore(now));
    }
    private void stop(Attempt a,String state){a.status=state;a.verifier=null;a.nonce=null;if(a.server!=null){a.server.stop(0);a.server=null;}}
    public List<AiProviderGateway.Model> models(String actor,String id) {
        String token;long version;
        synchronized(this){access.requireLocal(actor);requireId(id);version=saved.path("version").asLong();token=accessToken();}
        var models=client.models(token);
        synchronized(this){requireId(id);if(version!=saved.path("version").asLong())throw conflict("AI_CONNECTION_CHANGED");catalog=models;catalogVersion=version;return models;}
    }
    synchronized AiProviderGateway.ResolvedSelection resolve(String actor,String model,boolean verified) {
        access.requireLocal(actor);requireConnected();AiProviderGateway.validateModel(model);
        long version=saved.path("version").asLong();
        if(catalogVersion!=version||catalog.stream().noneMatch(m->m.id().equals(model)))throw new OpenAiResponsesClient.Failure("AI_MODEL_UNAVAILABLE");
        if(verified&&(!model.equals(saved.path("verifiedModel").asText())||!saved.hasNonNull("verifiedAt")))throw new OpenAiResponsesClient.Failure("AI_PROBE_REQUIRED");
        return new AiProviderGateway.ResolvedSelection("CHATGPT",model,saved.path("id").asText(),version);
    }
    synchronized String token(String actor,AiProviderGateway.ResolvedSelection selection){assertCurrent(actor,selection);return accessToken();}
    private String accessToken() {
        requireConnected();
        if(saved.path("expiresAt").asLong()>Instant.now().plusSeconds(60).getEpochSecond())return saved.path("accessToken").asText();
        try {
            var tokens=oauth.refresh(saved.path("clientId").asText(),saved.path("refreshToken").asText());
            if(tokens.hasNonNull("id_token"))oauth.validate(tokens,saved.path("clientId").asText(),null,saved.path("subject").asText());
            ObjectNode next=saved.deepCopy();updateTokens(next,tokens,true);vault.write(next);saved=next;requireConnected();return saved.path("accessToken").asText();
        }catch(OpenAiResponsesClient.Failure e){saved.remove(List.of("verifiedAt","verifiedModel"));saved.put("failureCode","AI_AUTH_FAILED");vault.write(saved);throw e;}
    }
    private void updateTokens(ObjectNode target,JsonNode tokens,boolean refreshing) {
        if(!"Bearer".equalsIgnoreCase(tokens.path("token_type").asText())||!secret(tokens.path("access_token").asText())
                ||!tokens.path("expires_in").isIntegralNumber()||tokens.path("expires_in").asLong()<1||tokens.path("expires_in").asLong()>604800
                ||(!refreshing&&!secret(tokens.path("refresh_token").asText())))throw new OpenAiResponsesClient.Failure("AI_AUTH_FAILED");
        target.put("accessToken",tokens.path("access_token").asText()).put("expiresAt",Instant.now().getEpochSecond()+tokens.path("expires_in").asLong());
        if(tokens.hasNonNull("refresh_token")){if(!secret(tokens.path("refresh_token").asText()))throw new OpenAiResponsesClient.Failure("AI_AUTH_FAILED");target.put("refreshToken",tokens.path("refresh_token").asText());}
        if(tokens.hasNonNull("id_token"))target.put("idToken",tokens.path("id_token").asText());
        if(tokens.has("scope"))target.put("scopes",tokens.path("scope").asText());else if(!refreshing)target.put("scopes","");
    }
    private boolean permission(){return Arrays.asList(saved.path("scopes").asText("").split(" ")).containsAll(List.of("chatgpt.tokens.use.direct","resource.invoke"));}
    private void requireConnected(){if(!saved.hasNonNull("accessToken"))throw new OpenAiResponsesClient.Failure("AI_CONNECT_REQUIRED");if(!permission())throw new OpenAiResponsesClient.Failure("AI_PERMISSION_DENIED");}
    private void requireId(String id){if(id==null||!id.equals(saved.path("id").asText()))throw new BusinessException(404,"NOT_FOUND","Connection not found.");}
    public synchronized void assertCurrent(String actor,AiProviderGateway.ResolvedSelection selection) {
        access.requireLocal(actor);requireConnected();
        if(!Objects.equals(selection.connectionId(),saved.path("id").asText())||selection.connectionVersion()!=saved.path("version").asLong())throw new OpenAiResponsesClient.Failure("AI_CONNECTION_CHANGED");
    }
    public synchronized <T> T withCurrent(String actor,AiProviderGateway.ResolvedSelection selection,Supplier<T> save){assertCurrent(actor,selection);return save.get();}
    public Probe probe(String actor,String id,String model,String key) {
        AiProviderGateway.ResolvedSelection selection;
        synchronized(this) {
            access.requireLocal(actor);requireId(id);if(key==null||!key.matches("[A-Za-z0-9_-]{8,64}"))throw new BusinessException(422,"AI_INVALID_INPUT","Invalid request key.");
            var probes=saved.withArray("probes");
            for(var probe:probes)if(key.equals(probe.path("requestKey").asText())){
                if(!model.equals(probe.path("model").asText())||!id.equals(probe.path("connectionId").asText()))throw conflict("AI_REQUEST_CONFLICT");return probeView(probe);
            }
            selection=resolve(actor,model,false);String today=LocalDate.now(ZoneOffset.UTC).toString();
            long count=0;for(var probe:probes)if(today.equals(probe.path("date").asText()))count++;
            if(count>=5)throw new BusinessException(429,"AI_PROBE_LIMIT","Daily connection check limit reached.");
            for(int i=probes.size()-1;i>=0;i--)if(probes.get(i).path("date").asText().compareTo(LocalDate.now(ZoneOffset.UTC).minusDays(7).toString())<0)probes.remove(i);
            probes.addObject().put("requestKey",key).put("model",model).put("connectionId",id).put("version",selection.connectionVersion()).put("date",today).put("state","GENERATING");
            if(model.equals(saved.path("verifiedModel").asText()))saved.remove(List.of("verifiedModel","verifiedAt"));vault.write(saved);
        }
        String failure=null;
        try {
            ProviderHttp.inference(actor,()->{String token=token(actor,selection);var sources=List.of(new AiDraftService.Source("probe:1","Connection check","",1L));
                var output=client.generate(token,model,"Return a short connection-check draft. Use only the supplied synthetic source. Do not invent facts.",json.createObjectNode().put("source","probe:1").put("fact","This is a connection check."),"tms_draft",AiDraftContent.schema(sources,json));
                AiDraftContent.validateAndWrap(output.value(),sources,json);return output;
            });
        }catch(OpenAiResponsesClient.Failure e){failure=e.code();}
        synchronized(this) {
            try{assertCurrent(actor,selection);}catch(RuntimeException e){failure="AI_CONNECTION_CHANGED";}
            for(var node:saved.withArray("probes"))if(key.equals(node.path("requestKey").asText())) {
                var probe=(ObjectNode)node;probe.put("state",failure==null?"READY":"FAILED").put("completedAt",Instant.now().toString());if(failure!=null)probe.put("failureCode",failure);
                if(failure==null)saved.put("verifiedModel",model).put("verifiedAt",Instant.now().toString());
                vault.write(saved);return probeView(probe);
            }
            throw conflict("AI_CONNECTION_CHANGED");
        }
    }
    private Probe probeView(JsonNode node){return new Probe(node.path("requestKey").asText(),node.path("model").asText(),node.path("state").asText(),node.path("failureCode").asText(null),node.hasNonNull("completedAt")?Instant.parse(node.path("completedAt").asText()):null);}
    public Disconnect disconnect(String actor,String id,long version) {
        String refresh,clientId;
        synchronized(this){access.requireLocal(actor);requireId(id);if(version!=saved.path("version").asLong())throw conflict("AI_CONNECTION_CHANGED");
            refresh=saved.path("refreshToken").asText();clientId=saved.path("clientId").asText();
            ObjectNode next=saved.deepCopy();next.remove(List.of("accessToken","refreshToken","idToken","verifiedModel","verifiedAt","failureCode"));next.put("version",version+1);vault.write(next);saved=next;
            for(var a:attempts.values())stop(a,"CANCELLED");catalog=List.of();catalogVersion=-1;
        }
        boolean revoked=!refresh.isBlank()&&ProviderHttp.bounded(()->oauth.revoke(clientId,refresh));
        return new Disconnect(true,revoked,revoked?"Disconnected.":"Disconnected locally. Remote revocation was not confirmed; disconnect the app in ChatGPT Settings.");
    }
    static Map<String,String> query(String query) {
        if(query==null||query.length()>8192)throw new IllegalArgumentException();var values=new HashMap<String,String>();
        for(String pair:query.split("&")){String[] kv=pair.split("=",2);String key=URLDecoder.decode(kv[0],StandardCharsets.UTF_8);String value=kv.length==2?URLDecoder.decode(kv[1],StandardCharsets.UTF_8):"";if(values.putIfAbsent(key,value)!=null)throw new IllegalArgumentException();}return values;
    }
    private static boolean secret(String s){return s!=null&&!s.isBlank()&&s.length()<=16384&&s.chars().noneMatch(Character::isWhitespace);}
    private static String random(){byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);}
    static String challenge(String verifier){try{return Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));}catch(Exception e){throw new IllegalStateException();}}
    private static boolean constant(String left,String right){return left!=null&&right!=null&&MessageDigest.isEqual(left.getBytes(StandardCharsets.UTF_8),right.getBytes(StandardCharsets.UTF_8));}
    private static BusinessException conflict(String code){return new BusinessException(409,code,"AI connection or request has changed.");}
    @PreDestroy public synchronized void close(){for(var a:attempts.values())stop(a,"CANCELLED");}
}
