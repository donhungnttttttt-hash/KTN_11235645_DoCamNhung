package vn.syp.tms.admin;

import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController @RequestMapping("/api/v1/admin/projects/{id}")
public class ProjectLifecycleController {
    private final ProjectLifecycleService service;
    public ProjectLifecycleController(ProjectLifecycleService service){this.service=service;}
    private String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @GetMapping("/archive-readiness") public Map<String,Object> readiness(Authentication auth,@PathVariable long id){return service.readiness(actor(auth),id);}
    @PostMapping("/archive") public Map<String,Object> archive(Authentication auth,@PathVariable long id,@Valid @RequestBody ProjectLifecycleService.Command input){return service.decide(actor(auth),id,input,true);}
    @PostMapping("/reopen") public Map<String,Object> reopen(Authentication auth,@PathVariable long id,@Valid @RequestBody ProjectLifecycleService.Command input){return service.decide(actor(auth),id,input,false);}
    @GetMapping("/lifecycle-decisions") public AdminDtos.Page<Map<String,Object>> history(Authentication auth,@PathVariable long id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.history(actor(auth),id,page,size);}
}
