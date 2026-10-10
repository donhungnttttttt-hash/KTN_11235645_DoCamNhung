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
        Long previous=DEADLINE.get();if(previous==null)DEADLINE.set(System.nanoTime()+TimeUnit.SECONDS.toNanos(seconds));
        try{return work.get();}finally{if(previous==null)DEADLINE.remove();}
    }
    final ObjectMapper json;
    final HttpClient client;
    ProviderHttp(ObjectMapper json) { this(json,HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build()); }
    ProviderHttp(ObjectMapper json,HttpClient client) {this.json=json;this.client=client;}
    byte[] request(URI uri,String method,String token,String contentType,byte[] body,int limit) {
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
            if(response.statusCode()!=200)throw new OpenAiResponsesClient.Failure(errorCode(response.statusCode(),response.body(),json));
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
        if(status==429) {
            try {var error=json.readTree(body).path("error");
                for(String key:List.of("code","type"))if(List.of("insufficient_quota","credit_balance_exhausted","usage_limit_reached").contains(error.path(key).asText()))return "AI_QUOTA_EXHAUSTED";
            }catch(Exception ignored){}
            return "AI_RATE_LIMITED";
        }
        if(status==401)return "AI_AUTH_FAILED";
        if(status==403)return "AI_PERMISSION_DENIED";
        return status>=500||status==408?"AI_UNAVAILABLE":"AI_REQUEST_REJECTED";
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
