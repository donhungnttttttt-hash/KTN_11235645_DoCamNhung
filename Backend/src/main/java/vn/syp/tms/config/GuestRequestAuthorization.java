package vn.syp.tms.config;

import java.util.function.Supplier;
import java.util.regex.Pattern;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

/** Guests view the dashboard only; saved reports are delivered separately by the project team. */
public final class GuestRequestAuthorization implements AuthorizationManager<RequestAuthorizationContext> {
    private static final Pattern REPORT=Pattern.compile("/api/v1/projects/[1-9][0-9]*/management-reports/dashboard");
    @Override
    public AuthorizationDecision check(Supplier<Authentication> authentication,RequestAuthorizationContext context){
        var auth=authentication.get();var request=context.getRequest();
        String path=request.getRequestURI().substring(request.getContextPath().length());
        boolean allowed=auth!=null&&auth.isAuthenticated()&&"GET".equals(request.getMethod())
            &&("/api/v1/reporting-projects".equals(path)||REPORT.matcher(path).matches());
        return new AuthorizationDecision(allowed);
    }
}
