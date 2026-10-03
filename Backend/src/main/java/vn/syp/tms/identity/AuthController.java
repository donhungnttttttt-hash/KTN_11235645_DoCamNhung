package vn.syp.tms.identity;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.util.ArrayList;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.shared.web.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    private final IdentityService users;
    private final LoginThrottle throttle;
    private final IdentityAudit audit;
    private final SecurityContextRepository contexts;
    private final CsrfTokenRepository csrfTokens;
    public AuthController(IdentityService users, LoginThrottle throttle, IdentityAudit audit,
                          SecurityContextRepository contexts, CsrfTokenRepository csrfTokens) {
        this.users = users; this.throttle = throttle; this.audit = audit; this.contexts = contexts; this.csrfTokens = csrfTokens;
    }
    @GetMapping("/auth/csrf")
    public IdentityDtos.Csrf csrf(CsrfToken token) { return new IdentityDtos.Csrf(token.getToken(), token.getHeaderName()); }

    @PostMapping("/auth/login")
    public IdentityDtos.Me login(@Valid @RequestBody IdentityDtos.Login input, HttpServletRequest request, HttpServletResponse response) {
        if (!throttle.allow(IdentityService.normalize(input.username()), request.getRemoteAddr())) {
            response.setHeader("Retry-After", "60");
            throw new BusinessException(429, "LOGIN_THROTTLED", "Bạn đã thử đăng nhập nhiều lần. Vui lòng đợi một phút rồi thử lại.");
        }
        IdentityUser user;
        try { user = users.authenticate(input.username(), input.password()); }
        catch (BusinessException invalid) {
            audit.record(null, null, "LOGIN_FAILED", ApiExceptionHandler.requestId(request));
            throw invalid;
        }
        audit.record(user.getId(), user.getId(), "LOGIN_SUCCEEDED", ApiExceptionHandler.requestId(request));
        var authorities = new ArrayList<SimpleGrantedAuthority>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole()));
        IdentityService.permissions(user).forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
        var authentication = UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal(user.getId(), user.getVersion()), null, authorities);
        request.getSession(true);
        new ChangeSessionIdAuthenticationStrategy().onAuthentication(authentication, request, response);
        new CsrfAuthenticationStrategy(csrfTokens).onAuthentication(authentication, request, response);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        return users.me(user, request.getSession().getMaxInactiveInterval());
    }
    @GetMapping("/me")
    public IdentityDtos.Me me(Authentication authentication, HttpServletRequest request) {
        return users.me(users.current(authentication.getName()), request.getSession().getMaxInactiveInterval());
    }
    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        if (authentication != null && authentication.getPrincipal() instanceof SessionPrincipal principal) {
            audit.record(principal.id(), principal.id(), "LOGOUT", ApiExceptionHandler.requestId(request));
        }
        var handler = new SecurityContextLogoutHandler();
        handler.setSecurityContextRepository(contexts);
        handler.logout(request, response, authentication);
        new CsrfLogoutHandler(csrfTokens).logout(request, response, authentication);
    }
}
