package vn.syp.tms.filework;

import org.springframework.security.core.context.SecurityContext;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;

/** Persist real Spring Sessions for inference lifecycle regressions. */
final class NativeAiSessions {
    private NativeAiSessions() {}
    static <S extends Session> String create(SessionRepository<S> repository, SecurityContext context) {
        S session=repository.createSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT",context);
        repository.save(session);
        return session.getId();
    }
    static <S extends Session> void rotate(SessionRepository<S> repository,String id) {
        S session=repository.findById(id);
        if(session==null)throw new AssertionError("Missing original session");
        session.changeSessionId();repository.save(session);
    }
}
