package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class ProviderHttpTimeoutTest {
    final ObjectMapper json=new ObjectMapper();
    @Test void localStubDeadlineCancelsWithoutRetryOrProviderDetails()throws Exception {
        var calls=new AtomicInteger();var entered=new CountDownLatch(1);var release=new CountDownLatch(1);
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{calls.incrementAndGet();entered.countDown();try{release.await(3,TimeUnit.SECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();}finally{exchange.close();}});server.start();
        try {
            var http=new ProviderHttp(json);var uri=URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/");
            assertThatThrownBy(()->ProviderHttp.bounded(1,()->http.request(uri,"POST","synthetic-secret","application/json",new byte[0],1024))).hasMessage("AI_TIMEOUT").hasNoCause();
            assertThat(entered.await(1,TimeUnit.SECONDS)).isTrue();assertThat(calls).hasValue(1);
        }finally{release.countDown();server.stop(0);}
    }
    @Test void transportTimeoutIsDistinctFromConnectionFailure() {
        var client=mock(HttpClient.class);var http=new ProviderHttp(json,client);var uri=URI.create("http://127.0.0.1/");
        when(client.sendAsync(any(HttpRequest.class),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()))
            .thenReturn(CompletableFuture.failedFuture(new HttpTimeoutException("private-provider-data")))
            .thenReturn(CompletableFuture.failedFuture(new ConnectException("private-provider-data")));
        assertThatThrownBy(()->http.request(uri,"POST",null,null,null,1024)).hasMessage("AI_TIMEOUT").hasNoCause();
        assertThatThrownBy(()->http.request(uri,"POST",null,null,null,1024)).hasMessage("AI_UNAVAILABLE").hasNoCause();
        verify(client,times(2)).sendAsync(any(HttpRequest.class),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
    }
    @Test void httpFailuresDoNotMasqueradeAsLocalTimeout() {
        for(int status:new int[]{408,500,503})assertThat(ProviderHttp.errorCode(status,new byte[0],json)).isEqualTo("AI_UNAVAILABLE");
        assertThat(ProviderHttp.errorCode(401,new byte[0],json)).isEqualTo("AI_AUTH_FAILED");
        assertThat(ProviderHttp.errorCode(403,new byte[0],json)).isEqualTo("AI_PERMISSION_DENIED");
        assertThat(ProviderHttp.errorCode(402,new byte[0],json)).isEqualTo("AI_PAYMENT_REQUIRED");
    }
}
