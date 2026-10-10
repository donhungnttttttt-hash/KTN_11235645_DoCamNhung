package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.*;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.*;

/** Bounded body and wall clock, redirects disabled, no retries or provider error disclosure. */
class ProviderHttp {
    static final Duration TIMEOUT=Duration.ofSeconds(20);
    private static final ThreadLocal<Long> DEADLINE=new ThreadLocal<>();
    private static final java.util.Set<String> ACTIVE=java.util.concurrent.ConcurrentHashMap.newKeySet();
    private static final java.util.concurrent.Semaphore CAPACITY=new java.util.concurrent.Semaphore(2);
    static <T> T inference(String actor,java.util.function.Supplier<T> work) {
        if(!ACTIVE.add(actor))throw new OpenAiResponsesClient.Failure("AI_BUSY");
        boolean acquired=CAPACITY.tryAcquire();
        try{if(!acquired)throw new OpenAiResponsesClient.Failure("AI_BUSY");return bounded(work);}
        finally{if(acquired)CAPACITY.release();ACTIVE.remove(actor);}
    }
    static <T> T bounded(java.util.function.Supplier<T> work) {
        return bounded(25,work);
    }
    static <T> T bounded(int seconds,java.util.function.Supplier<T> work) {
        Long previous = DEADLINE.get();
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(seconds);
        DEADLINE.set(previous == null ? deadline : Math.min(previous, deadline));
        try {
            requireTimeRemaining();
            return work.get();
        } finally {
            if (previous == null) DEADLINE.remove(); else DEADLINE.set(previous);
        }
    }
    static void requireTimeRemaining() {
        if (DEADLINE.get() != null && System.nanoTime() >= DEADLINE.get())
            throw new OpenAiResponsesClient.Failure("AI_UNAVAILABLE");
    }
    final ObjectMapper json;
    final HttpClient client;
    ProviderHttp(ObjectMapper json) { this(json,HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build()); }
    ProviderHttp(ObjectMapper json,HttpClient client) {this.json=json;this.client=client;}
    byte[] request(URI uri,String method,String token,String contentType,byte[] body,int limit) {
        return request(uri,method,token,contentType,body,limit,false);
    }
    byte[] oauthRequest(URI uri,byte[] body) {
        return request(uri,"POST",null,"application/x-www-form-urlencoded",body,65536,true);
    }
    private byte[] request(URI uri,String method,String token,String contentType,byte[] body,int limit,boolean oauth) {
        long remaining=DEADLINE.get()==null?TIMEOUT.toMillis():Math.min(TIMEOUT.toMillis(),TimeUnit.NANOSECONDS.toMillis(DEADLINE.get()-System.nanoTime()));
        if(remaining<=0)throw new OpenAiResponsesClient.Failure("AI_UNAVAILABLE");
        var builder=HttpRequest.newBuilder(uri).timeout(Duration.ofMillis(remaining)).header("Accept","application/json, text/event-stream");
        if(token!=null)builder.header("Authorization","Bearer "+token);
        if(contentType!=null)builder.header("Content-Type",contentType);
        builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofByteArray(body));
        CompletableFuture<HttpResponse<byte[]>> future=null;
        try {
            future=client.sendAsync(builder.build(),info->new LimitedBody(limit));
            var response=future.get(remaining,TimeUnit.MILLISECONDS);
            if(response.statusCode()!=200)throw new OpenAiResponsesClient.Failure(oauth?
                    oauthErrorCode(response.statusCode(),response.body(),json):errorCode(response.statusCode(),response.body(),json));
            return response.body();
        } catch(OpenAiResponsesClient.Failure e){throw e;}
        catch(InterruptedException e){Thread.currentThread().interrupt();throw new OpenAiResponsesClient.Failure("AI_INTERRUPTED");}
        catch(Exception e){throw new OpenAiResponsesClient.Failure("AI_UNAVAILABLE");}
        finally {if(future!=null&&!future.isDone())future.cancel(true);}
    }
    JsonNode read(byte[] body) {
        try {var value=json.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readTree(body);
            if(value==null||!value.isObject())throw new IllegalArgumentException();return value;
        }catch(Exception e){throw new OpenAiResponsesClient.Failure("AI_INVALID_RESPONSE");}
    }
    byte[] bytes(JsonNode body) {try{return json.writeValueAsBytes(body);}catch(Exception e){throw new OpenAiResponsesClient.Failure("AI_INVALID_INPUT");}}
    static String errorCode(int status,byte[] body,ObjectMapper json) {
        try {
            String mapped = structuredError(json.readTree(body).path("error"));
            if (mapped != null) return mapped;
        } catch (Exception ignored) {
            // Unstructured diagnostic text is never exposed or matched as a machine code.
        }
        if(status==429)return "AI_RATE_LIMITED";
        if(status==401)return "AI_AUTH_FAILED";
        if(status==403)return "AI_PERMISSION_DENIED";
        return status>=500||status==408?"AI_UNAVAILABLE":"AI_REQUEST_REJECTED";
    }
    static String structuredError(JsonNode error) {
        for (String key : List.of("code", "type")) {
            String mapped = switch (error.path(key).asText()) {
                case "insufficient_quota", "credit_balance_exhausted", "usage_limit_reached",
                     "subscription_sharing_usage_limit_exceeded" -> "AI_QUOTA_EXHAUSTED";
                case "subscription_sharing_usage_unavailable", "subscription_sharing_user_unavailable",
                     "server_error", "service_unavailable" -> "AI_UNAVAILABLE";
                case "subscription_sharing_user_not_eligible", "subscription_sharing_route_not_supported",
                     "chatpass_v2_scope_not_authorized", "chatpass_v2_invalid_authorization_context" -> "AI_PERMISSION_DENIED";
                case "subscription_sharing_invalid_user", "invalid_api_key", "authentication_error" -> "AI_AUTH_FAILED";
                case "subscription_sharing_unsupported_capability" -> "AI_REQUEST_REJECTED";
                case "rate_limit_exceeded", "rate_limit_error" -> "AI_RATE_LIMITED";
                default -> null;
            };
            if (mapped != null) return mapped;
        }
        return null;
    }
    static String oauthErrorCode(int status,byte[] body,ObjectMapper json) {
        try {
            JsonNode error = json.readTree(body).path("error");
            String code = error.isTextual() ? error.asText() : error.path("code").asText();
            switch (code) {
                case "invalid_grant", "invalid_refresh_token", "token_expired", "refresh_token_expired",
                     "refresh_token_invalidated", "refresh_token_reused": return "AI_OAUTH_INVALID_GRANT";
                case "invalid_client": return "AI_OAUTH_INVALID_CLIENT";
                case "temporarily_unavailable", "server_error": return "AI_UNAVAILABLE";
                default: break;
            }
        } catch (Exception ignored) { }
        return errorCode(status,body,json);
    }
    static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
        final CompletableFuture<byte[]> result=new CompletableFuture<>();final ByteArrayOutputStream data=new ByteArrayOutputStream();
        final int max;Flow.Subscription subscription;
        LimitedBody(int max){this.max=max;}
        public CompletionStage<byte[]> getBody(){return result;}
        public void onSubscribe(Flow.Subscription s){subscription=s;s.request(1);}
        public void onNext(List<ByteBuffer> buffers){for(var b:buffers){if(data.size()+b.remaining()>max){subscription.cancel();result.completeExceptionally(new IllegalStateException());return;}byte[] part=new byte[b.remaining()];b.get(part);data.writeBytes(part);}subscription.request(1);}
        public void onError(Throwable e){result.completeExceptionally(new IllegalStateException("AI_UNAVAILABLE"));}
        public void onComplete(){result.complete(data.toByteArray());}
    }
}
