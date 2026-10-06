package vn.syp.tms.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.DispatcherType;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import vn.syp.tms.shared.web.ApiError;
import vn.syp.tms.shared.web.ApiExceptionHandler;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.identity.SessionAccountFilter;
import org.springframework.security.crypto.password.*;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.session.web.http.DefaultCookieSerializer;
import java.util.Map;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new DelegatingPasswordEncoder("pbkdf2-v5_8", Map.of("pbkdf2-v5_8", Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8()));
    }
    @Bean SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }
    @Bean CsrfTokenRepository csrfTokenRepository() { return new HttpSessionCsrfTokenRepository(); }
    @Bean DefaultCookieSerializer cookieSerializer(Environment environment) {
        var cookie = new DefaultCookieSerializer();
        cookie.setCookieName("TMS_SESSION");
        cookie.setCookiePath("/");
        cookie.setUseHttpOnlyCookie(true);
        cookie.setSameSite("Strict");
        cookie.setUseBase64Encoding(false);
        if (environment.getProperty("TMS_COOKIE_SECURE", Boolean.class, false)) cookie.setUseSecureCookie(true);
        return cookie;
    }
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, Environment environment, ObjectMapper json, IdentityService users,
                                            SecurityContextRepository contexts, CsrfTokenRepository csrfTokens) throws Exception {
        boolean local = environment.acceptsProfiles(Profiles.of("local"));
        http.authorizeHttpRequests(auth -> {
            auth.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll();
            auth.requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll();
            auth.requestMatchers(HttpMethod.GET, "/api/v1/auth/csrf").permitAll();
            auth.requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/logout").permitAll();
            auth.requestMatchers(HttpMethod.GET, "/api/v1/me").authenticated();
            auth.requestMatchers("/api/v1/admin/**").hasRole("ADMIN");
            auth.requestMatchers(HttpMethod.GET, "/api/v1/users").hasRole("ADMIN");
            auth.requestMatchers(HttpMethod.POST, "/api/v1/users").hasAuthority("users:create");
            auth.requestMatchers(HttpMethod.PATCH, "/api/v1/users/*").hasRole("ADMIN");
            if (local) {
                auth.requestMatchers(HttpMethod.GET, "/api/v1/system/status", "/api/v1/system/checks", "/api/v1/system/csrf").permitAll();
                auth.requestMatchers(HttpMethod.POST, "/api/v1/system/checks").permitAll();
            }
            // Sprint 03: Project-scoped endpoints - authorization in service layer
            auth.requestMatchers(HttpMethod.GET, "/api/v1/projects").authenticated();
            auth.requestMatchers(HttpMethod.POST, "/api/v1/projects").authenticated();
            auth.requestMatchers("/api/v1/projects/**").authenticated();
            // Future business APIs require an explicit project policy in their sprint.
            auth.anyRequest().denyAll();
        });
        http.exceptionHandling(errors -> errors
            .authenticationEntryPoint((request, response, exception) -> {
                response.setStatus(401);
                response.setContentType("application/json;charset=UTF-8");
                json.writeValue(response.getOutputStream(), new ApiError("UNAUTHENTICATED",
                        "Bạn cần đăng nhập để thực hiện thao tác này.", List.of(), ApiExceptionHandler.requestId(request)));
            })
            .accessDeniedHandler((request, response, exception) -> {
                response.setStatus(403);
                response.setContentType("application/json;charset=UTF-8");
                boolean csrf = exception instanceof CsrfException;
                json.writeValue(response.getOutputStream(), new ApiError(csrf ? "CSRF_INVALID" : "FORBIDDEN",
                        csrf ? "Mã bảo vệ đã hết hạn. Vui lòng thử lại." : "Bạn không có quyền thực hiện thao tác này.", List.of(), ApiExceptionHandler.requestId(request)));
            }));
        http.csrf(csrf -> csrf.csrfTokenRepository(csrfTokens));
        http.securityContext(context -> context.securityContextRepository(contexts).requireExplicitSave(true));
        http.addFilterBefore(new SessionAccountFilter(users, json), AuthorizationFilter.class);
        http.requestCache(configurer -> configurer.disable());
        http.formLogin(configurer -> configurer.disable()).httpBasic(configurer -> configurer.disable()).logout(configurer -> configurer.disable());
        return http.build();
    }
}

