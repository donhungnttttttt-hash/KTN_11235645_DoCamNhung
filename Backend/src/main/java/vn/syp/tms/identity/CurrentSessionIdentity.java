package vn.syp.tms.identity;

import static org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY;
import java.util.Objects;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.stereotype.Service;
import vn.syp.tms.shared.web.BusinessException;

/** Renews only the caller's persisted session alongside a self-profile rename. */
@Service
public class CurrentSessionIdentity {
 private final SessionRepository<? extends Session> sessions;
 public CurrentSessionIdentity(SessionRepository<? extends Session> sessions){this.sessions=sessions;}

 // Caller owns the account lock and transaction. Session transactions must join it.
 public void renew(String sessionId,SessionPrincipal previous,long nextVersion){renew(sessions,sessionId,previous,nextVersion);}
 private static <S extends Session> void renew(SessionRepository<S> repository,String sessionId,SessionPrincipal previous,long nextVersion){
  S stored=repository.findById(Objects.requireNonNull(sessionId));
  Authentication authentication=matching(stored,previous.id(),previous.version());
  if(stored==null||authentication==null)throw new BusinessException(401,"UNAUTHENTICATED","Phiên đăng nhập đã thay đổi.");
  var context=SecurityContextHolder.createEmptyContext();
  context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal(previous.id(),nextVersion),null,authentication.getAuthorities()));
  stored.setAttribute(SPRING_SECURITY_CONTEXT_KEY,context);repository.save(stored);
 }

 /** A concurrent request may have loaded the old principal before the rename committed. */
 public boolean restore(HttpServletRequest request,IdentityUser current,IdentityService identities){
  var servletSession=request.getSession(false);if(servletSession==null)return false;
  var stored=sessions.findById(servletSession.getId());
  if(matching(stored,current.getId(),current.getVersion())==null)return false;
  var context=SecurityContextHolder.createEmptyContext();
  context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal(current.getId(),current.getVersion()),null,identities.authorities(current)));
  servletSession.setAttribute(SPRING_SECURITY_CONTEXT_KEY,context);SecurityContextHolder.setContext(context);return true;
 }
 private static Authentication matching(Session stored,String id,long version){
  if(stored==null||stored.isExpired())return null;
  Object value=stored.getAttribute(SPRING_SECURITY_CONTEXT_KEY);
  if(!(value instanceof SecurityContext context))return null;
  var authentication=context.getAuthentication();
  return authentication!=null&&authentication.isAuthenticated()&&authentication.getPrincipal() instanceof SessionPrincipal principal&&id.equals(principal.id())&&version==principal.version()?authentication:null;
 }
}
