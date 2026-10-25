package vn.syp.tms.admin;

import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/member-candidates")
public class ProjectMemberCandidateController {
    private final AdminProjectService service;
    public ProjectMemberCandidateController(AdminProjectService service){this.service=service;}
    @GetMapping
    public AdminDtos.Page<Map<String,Object>> list(Authentication auth,
        @PathVariable("projectId") long projectId,
        @RequestParam(value="keyword",defaultValue="") String keyword,
        @RequestParam(value="role",required=false) String role,
        @RequestParam(value="hasProject",required=false) Boolean hasProject,
        @RequestParam(value="page",defaultValue="0") int page,
        @RequestParam(value="size",defaultValue="20") int size) {
        return service.memberCandidates(((SessionPrincipal)auth.getPrincipal()).id(),projectId,keyword,role,hasProject,page,size);
    }
}
