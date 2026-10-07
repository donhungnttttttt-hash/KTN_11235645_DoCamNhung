package vn.syp.tms.filework;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController @RequestMapping("/api/v1/projects/{projectId}/action-inbox")
public class ActionInboxController {
    private final ActionInboxService service;
    public ActionInboxController(ActionInboxService service){this.service=service;}
    @GetMapping public Object list(Authentication auth,@PathVariable long projectId,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="") String kind) {
        return service.list(projectId,((SessionPrincipal)auth.getPrincipal()).id(),page,size,kind);
    }
}
