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
            @RequestParam(defaultValue="") String keyword,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,
            @RequestParam(defaultValue="id") String sort,
            @RequestParam(required=false) @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate createdFrom,
            @RequestParam(required=false) @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate createdTo) {
        return service.projects(actor(auth),projectId,keyword,page,size,sort,createdFrom,createdTo);
    }
    @GetMapping("/projects/{id}") public Map<String,Object> project(Authentication auth,@PathVariable long id) {return service.project(actor(auth),id);}
}
