package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.*;
import vn.syp.tms.identity.*;

class AiProviderAuthorizationTest {
    @AfterEach void clear(){SecurityContextHolder.clearContext();RequestContextHolder.resetRequestAttributes();}
    @Test void localOwnerAndDirectLoopbackAreRequiredEvenForAdmin() {
        var config=new LocalAiConfiguration(true,"owner","urn:uuid:12345678-1234-1234-1234-123456789012","C:/test-vault","","127.0.0.1",false,"http://127.0.0.1:11434");
        var identity=mock(IdentityService.class);var user=mock(IdentityUser.class);when(identity.current("owner")).thenReturn(user);when(user.getVersion()).thenReturn(1L);
        var access=new LocalAiAccess(config,identity);var request=new MockHttpServletRequest();request.setRemoteAddr("127.0.0.1");request.getSession(true);RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal("owner",1),null,java.util.List.of()));
        assertThat(access.requireLocal("owner")).isNotNull();
        request.setRemoteAddr("10.0.0.1");assertThatThrownBy(()->access.requireLocal("owner")).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        request.setRemoteAddr("127.0.0.1");request.addHeader("X-Forwarded-For","127.0.0.1");assertThatThrownBy(()->access.requireLocal("owner")).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        assertThatThrownBy(()->access.requireLocal("other-admin")).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        when(user.getVersion()).thenReturn(2L);assertThatThrownBy(()->access.current("owner")).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
    }
    @Test void gatewayRejectsUnknownProviderAndUnapprovedModelsBeforeInference() {
        var config=new OpenAiConfiguration(true,"test-key","api-model",20,100,10);var local=new LocalAiConfiguration(false,"","","","","",false,"http://127.0.0.1:11434");
        var api=mock(OpenAiResponsesClient.class);var access=mock(LocalAiAccess.class);var ollama=mock(OllamaClient.class);var chat=mock(ChatGptPlanClient.class);var connection=mock(ChatGptConnectionService.class);
        var gateway=new AiProviderGateway(config,local,access,api,ollama,connection,chat);
        assertThatThrownBy(()->gateway.resolve("owner",new AiProviderGateway.Selection("EVIL","model"))).hasMessage("AI_INVALID_PROVIDER");
        assertThatThrownBy(()->gateway.resolve("owner",new AiProviderGateway.Selection("OPENAI_API","other"))).hasMessage("AI_MODEL_UNAVAILABLE");
        when(ollama.models()).thenReturn(java.util.List.of());assertThatThrownBy(()->gateway.resolve("owner",new AiProviderGateway.Selection("OLLAMA","not-installed"))).hasMessage("AI_MODEL_UNAVAILABLE");
        verifyNoInteractions(api,chat,connection);
    }
    @Test void callbackRechecksRepositoryInsteadOfTrustingCapturedSessionAfterLogout() {
        var config=new LocalAiConfiguration(false,"","","","","",false,"http://127.0.0.1:11434");
        var identity=mock(IdentityService.class);var user=mock(IdentityUser.class);when(identity.current("owner")).thenReturn(user);when(user.getVersion()).thenReturn(1L);
        var repository=new org.springframework.session.MapSessionRepository(new java.util.concurrent.ConcurrentHashMap<>());
        var persisted=repository.createSession();var principal=new SessionPrincipal("owner",1);var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,java.util.List.of()));
        persisted.setAttribute("SPRING_SECURITY_CONTEXT",context);repository.save(persisted);
        var captured=new org.springframework.mock.web.MockHttpSession(null,persisted.getId());captured.setAttribute("SPRING_SECURITY_CONTEXT",context);
        var access=new LocalAiAccess(config,identity,repository);access.verifySession(captured,principal);repository.deleteById(persisted.getId());
        assertThatThrownBy(()->access.verifySession(captured,principal)).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
    }
}
