package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.session.*;

class CurrentSessionIdentityTest {
 private final MapSessionRepository repository=new MapSessionRepository(new ConcurrentHashMap<>());
 private final CurrentSessionIdentity sessions=new CurrentSessionIdentity(repository);
 private final IdentityUser user=new IdentityUser("fixture","User","unused","USER");
 private final IdentityService identities=mock(IdentityService.class);
 @AfterEach void clear(){SecurityContextHolder.clearContext();}
 private MapSession stored(String id,long version){
  var session=repository.createSession();var context=SecurityContextHolder.createEmptyContext();
  context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal(id,version),null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
  session.setAttribute(SPRING_SECURITY_CONTEXT_KEY,context);repository.save(session);return session;
 }
 private MockHttpServletRequest request(String id){var request=new MockHttpServletRequest();request.setSession(new MockHttpSession(null,id));return request;}
 @Test void recoveryUsesCurrentAuthoritiesRatherThanStoredAuthorities(){
  var session=stored(user.getId(),user.getVersion());var request=request(session.getId());
  when(identities.authorities(user)).thenReturn(List.of(new SimpleGrantedAuthority("ROLE_USER")));
  assertThat(sessions.restore(request,user,identities)).isTrue();
  assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities()).extracting("authority").containsExactly("ROLE_USER");
 }
 @Test void missingExpiredForeignOrOutdatedSessionsCannotBeRenewedImplicitly(){
  assertThat(sessions.restore(request("missing"),user,identities)).isFalse();
  for(var session:List.of(stored("another-user",user.getVersion()),stored(user.getId(),user.getVersion()+1)))
   assertThat(sessions.restore(request(session.getId()),user,identities)).isFalse();
  var expired=stored(user.getId(),user.getVersion());expired.setLastAccessedTime(java.time.Instant.EPOCH);repository.save(expired);
  assertThat(sessions.restore(request(expired.getId()),user,identities)).isFalse();
  verifyNoInteractions(identities);assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
 }
}
