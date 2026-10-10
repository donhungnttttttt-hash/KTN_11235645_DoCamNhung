package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.dao.DataAccessResourceFailureException;
import vn.syp.tms.shared.web.*;

class SessionAccountFilterTest {
    @AfterEach void clear() {SecurityContextHolder.clearContext();}
    @Test void connectionPoolExhaustionReturnsSafe503WithoutLoggingUserOut() throws Exception {
        for(var failure:List.of(new CannotCreateTransactionException("private database detail"),new DataAccessResourceFailureException("private database detail"))) {
            var users=mock(IdentityService.class);var request=new MockHttpServletRequest();var response=new MockHttpServletResponse();
            java.util.Objects.requireNonNull(request.getSession()).setAttribute("draft","keep");request.setAttribute(RequestIdFilter.ATTRIBUTE,"request-fixture");
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal("user",0),null,List.of()));
            when(users.current("user")).thenThrow(failure);var calls=new AtomicInteger();
            new SessionAccountFilter(users,new ObjectMapper()).doFilter(request,response,(a,b)->calls.incrementAndGet());
            assertThat(response.getStatus()).isEqualTo(503);assertThat(response.getContentAsString()).contains("DATABASE_UNAVAILABLE","request-fixture").doesNotContain("private");
            assertThat(java.util.Objects.requireNonNull(request.getSession(false)).getAttribute("draft")).isEqualTo("keep");assertThat(calls.get()).isZero();
        }
    }
    @Test void changedOrDisabledAccountRevokesSessionButHealthyAndAnonymousRequestsContinue() throws Exception {
        var users=mock(IdentityService.class);var filter=new SessionAccountFilter(users,new ObjectMapper());var calls=new AtomicInteger();
        filter.doFilter(new MockHttpServletRequest(),new MockHttpServletResponse(),(a,b)->calls.incrementAndGet());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("anonymousUser",null,List.of()));
        filter.doFilter(new MockHttpServletRequest(),new MockHttpServletResponse(),(a,b)->calls.incrementAndGet());verifyNoInteractions(users);
        var user=new IdentityUser("fixture","Fixture","not-used","TESTER");when(users.current(user.getId())).thenReturn(user);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),0),null,List.of()));
        filter.doFilter(new MockHttpServletRequest(),new MockHttpServletResponse(),(a,b)->calls.incrementAndGet());assertThat(calls.get()).isEqualTo(3);
        for(boolean disabled:List.of(false,true)) {
            var request=new MockHttpServletRequest();request.getSession();var response=new MockHttpServletResponse();
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),1),null,List.of()));
            if(disabled)when(users.current(user.getId())).thenThrow(new BusinessException(401,"UNAUTHENTICATED","Disabled"));
            filter.doFilter(request,response,(a,b)->calls.incrementAndGet());
            assertThat(response.getStatus()).isEqualTo(401);assertThat(request.getSession(false)).isNull();assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        }
        assertThat(calls.get()).isEqualTo(3);
    }
}
