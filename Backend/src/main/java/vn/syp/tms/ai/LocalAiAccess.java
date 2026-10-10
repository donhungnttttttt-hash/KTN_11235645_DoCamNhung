package vn.syp.tms.ai;

import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.context.*;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.*;
import vn.syp.tms.identity.*;
import vn.syp.tms.shared.web.BusinessException;

@Component
public class LocalAiAccess {
    private final LocalAiConfiguration config;
    private final IdentityService identity;
    private final org.springframework.session.SessionRepository<? extends org.springframework.session.Session> sessions;
    public LocalAiAccess(LocalAiConfiguration config,IdentityService identity){this(config,identity,null);}
    @org.springframework.beans.factory.annotation.Autowired
    public LocalAiAccess(LocalAiConfiguration config,IdentityService identity,
            org.springframework.session.SessionRepository<? extends org.springframework.session.Session> sessions){this.config=config;this.identity=identity;this.sessions=sessions;}
    public SessionPrincipal current(String actor) {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null||!(auth.getPrincipal() instanceof SessionPrincipal p)||!p.id().equals(actor))throw denied();
        verify(p);return p;
    }
    public void verify(SessionPrincipal principal) {
        var user=identity.current(principal.id());
        if(user.getVersion()!=principal.version())throw denied();
    }
    public HttpSession requireLocal(String actor) {
        current(actor);
        if(!config.chatgptEnabled||!config.owner.equals(actor))throw new BusinessException(403,"AI_LOCAL_ONLY","ChatGPT is available only to the configured local owner.");
        if(!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes))throw denied();
        var request=attributes.getRequest();
        if(!"127.0.0.1".equals(request.getRemoteAddr())||request.getHeader("Forwarded")!=null||request.getHeader("X-Forwarded-For")!=null)throw denied();
        var session=request.getSession(false);if(session==null)throw denied();return session;
    }
    public void verifySession(HttpSession session,SessionPrincipal expected) {
        try {
            // Re-read the shared repository: a captured HttpSession wrapper can retain stale
            // attributes after another request logs out or rotates the session ID.
            var stored=sessions==null?null:sessions.findById(session.getId());
            if(stored==null||stored.isExpired())throw denied();
            Object value=stored.getAttribute("SPRING_SECURITY_CONTEXT");
            if(!(value instanceof SecurityContext context)||context.getAuthentication()==null||!expected.equals(context.getAuthentication().getPrincipal()))throw denied();
            verify(expected);
        }catch(IllegalStateException e){throw denied();}
    }
    private BusinessException denied(){return new BusinessException(401,"UNAUTHENTICATED","The local session is no longer valid.");}
}
