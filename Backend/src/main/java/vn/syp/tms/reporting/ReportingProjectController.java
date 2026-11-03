package vn.syp.tms.reporting;

import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.workitem.WorkItemStore;

@RestController
@RequestMapping("/api/v1/reporting-projects")
public class ReportingProjectController {
    private final IdentityService identity;
    private final WorkItemStore db;
    public ReportingProjectController(IdentityService identity,WorkItemStore db){this.identity=identity;this.db=db;}
    @GetMapping public Map<String,Object> list(Authentication auth,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="100") int size){
        String actor=auth.getName();
        if(!"GUEST".equals(identity.current(actor).getRole()))WorkItemStore.fail(403,"FORBIDDEN","Danh sách này dành cho tài khoản Khách.");
        if(page<0||page>100000||size<1||size>100)WorkItemStore.fail(422,"INVALID_PAGE","Phân trang không hợp lệ.");
        String from=" FROM projects p JOIN project_memberships m ON m.project_id=p.id WHERE m.user_id=? AND m.active=TRUE AND m.project_role='GUEST'";
        long total=db.count("SELECT COUNT(*)"+from,actor);
        var items=db.rows("SELECT p.id,p.code,p.name,m.project_role AS projectRole"+from+" ORDER BY p.id LIMIT ? OFFSET ?",actor,size,(long)page*size);
        return Map.of("items",items,"page",page,"size",size,"totalElements",total);
    }
}
