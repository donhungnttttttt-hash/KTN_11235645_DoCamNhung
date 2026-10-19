package vn.syp.tms.feature;

import jakarta.servlet.http.*;
import java.util.Set;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.shared.web.BusinessException;

/** Public old-graph writes are retired. Internal migration/fixture services and authorized reads remain. */
@Configuration
public class LegacyTestingWrites implements WebMvcConfigurer,HandlerInterceptor {
    private final ProjectService projects;private final JdbcTemplate db;
    public LegacyTestingWrites(ProjectService projects,JdbcTemplate db){this.projects=projects;this.db=db;}
    @Override public void addInterceptors(InterceptorRegistry registry){registry.addInterceptor(this).addPathPatterns("/api/v1/projects/**");}
    @Override public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler){
        if(Set.of("GET","HEAD","OPTIONS").contains(request.getMethod())||!(handler instanceof HandlerMethod method))return true;
        var match=java.util.regex.Pattern.compile("^/api/v1/projects/([1-9][0-9]*)/(.*)$").matcher(request.getRequestURI());
        if(!match.matches())return true;
        long project=Long.parseLong(match.group(1));String tail=match.group(2),type=method.getBeanType().getSimpleName();
        boolean retired=Set.of("ImportController","ExecutionController","CycleDecisionController","FileWorkController","FileWorkSessionController","FileWorkExecutionController","RetestController","TestSuiteController").contains(type);
        if(type.equals("TestCaseController")){
            retired=!method.getMethod().getName().equals("addRevision");
            if(!retired){long id=pathId(tail,"test-cases/");var cases=db.queryForList("SELECT owning_document_id FROM test_cases WHERE project_id=? AND id=?",project,id);retired=!cases.isEmpty()&&cases.getFirst().get("owning_document_id")==null;}
        }
        if(type.equals("TestDocumentEditingController")||type.equals("TestDocumentController")){
            retired=tail.endsWith("/approvals")||tail.endsWith("/second-test");
            if(!retired){long id=pathId(tail,"test-documents/");var docs=db.queryForList("SELECT feature_id FROM import_batches WHERE project_id=? AND id=?",project,id);retired=!docs.isEmpty()&&docs.getFirst().get("feature_id")==null;}
        }
        if(!retired)return true;
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication==null||!(authentication.getPrincipal() instanceof SessionPrincipal principal))throw new BusinessException(401,"UNAUTHENTICATED","Cần đăng nhập.");
        projects.requireReadAccess(project,principal.id());
        throw new BusinessException(410,type.equals("ImportController")?"FEATURE_REQUIRED":"LEGACY_WORKFLOW_RETIRED","Luồng kiểm thử cũ chỉ giữ lịch sử. Dùng Feature và file độc lập tại /board/testing.");
    }
    private static long pathId(String tail,String prefix){String value=tail.substring(prefix.length()).split("/",2)[0];try{return Long.parseLong(value);}catch(NumberFormatException invalid){return 0;}}
}
