package vn.syp.tms.admin;

import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final AdminOverviewService service;
    public AdminController(AdminOverviewService service) {this.service=service;}
    private String actor(Authentication auth) {return ((SessionPrincipal)auth.getPrincipal()).id();}
    @GetMapping("/overview") public AdminDtos.Overview overview(Authentication auth,@RequestParam(required=false) Long projectId) {return service.overview(actor(auth),projectId);}
    @GetMapping("/projects") public AdminDtos.Page<Map<String,Object>> projects(Authentication auth,@RequestParam(required=false) Long projectId,
            @RequestParam(defaultValue="") String keyword,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return service.projects(actor(auth),projectId,keyword,page,size);
    }
    @GetMapping("/projects/{id}") public Map<String,Object> project(Authentication auth,@PathVariable long id) {return service.project(actor(auth),id);}
}
