package vn.syp.tms.workitem;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import vn.syp.tms.shared.web.BusinessException;

/** Retire external legacy commands while keeping their read-only history and stored data. */
@Configuration
public class FeatureIssueLegacyWrites implements WebMvcConfigurer,HandlerInterceptor {
    @Override public void addInterceptors(@NonNull InterceptorRegistry registry){registry.addInterceptor(this).addPathPatterns("/api/v1/projects/*/work-items/**","/api/v1/projects/*/qa/**");}
    @Override public boolean preHandle(@NonNull HttpServletRequest request,@NonNull HttpServletResponse response,@NonNull Object handler){
        if(!java.util.Set.of("GET","HEAD","OPTIONS").contains(request.getMethod()))
            throw new BusinessException(410,"USE_FEATURE_ISSUES","Luồng cũ đã ngừng ghi. Mở Issue trong Feature để tiếp tục.");
        return true;
    }
}
