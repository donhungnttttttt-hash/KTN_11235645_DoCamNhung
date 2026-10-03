package vn.syp.tms.identity;

import org.springframework.lang.NonNull;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.syp.tms.shared.web.*;

public class SessionAccountFilter extends OncePerRequestFilter {
    private final IdentityService users;
    private final ObjectMapper json;
    public SessionAccountFilter(IdentityService users, ObjectMapper json) { this.users = users; this.json = json; }
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain chain) throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof SessionPrincipal principal) {
            try {
                var user = users.current(principal.id());
                if (user.getVersion() != principal.version()) throw new BusinessException(401, "UNAUTHENTICATED", "Phiên đăng nhập đã thay đổi.");
            } catch (BusinessException expired) {
                var session = request.getSession(false);
                if (session != null) session.invalidate();
                SecurityContextHolder.clearContext();
                write(response, request, 401, "UNAUTHENTICATED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                return;
            } catch (org.springframework.dao.DataAccessException | org.springframework.transaction.CannotCreateTransactionException unavailable) {
                write(response, request, 503, "DATABASE_UNAVAILABLE", "Chưa xác minh được phiên đăng nhập. Vui lòng thử lại.");
                return;
            }
        }
        chain.doFilter(request, response);
    }
    private void write(HttpServletResponse response, HttpServletRequest request, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        json.writeValue(response.getOutputStream(), new ApiError(code, message, List.of(), ApiExceptionHandler.requestId(request)));
    }
}
