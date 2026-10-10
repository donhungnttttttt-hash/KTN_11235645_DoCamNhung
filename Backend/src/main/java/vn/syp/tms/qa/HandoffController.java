package vn.syp.tms.qa;

import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.workitem.WorkItemDtos.Page;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/handoff-queue")
public class HandoffController {
    private final HandoffService service;
    public HandoffController(HandoffService service){this.service=service;}
    @GetMapping
    public Page<Map<String,Object>> list(Authentication auth,@PathVariable long projectId,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,
        @RequestParam(required=false) String state,@RequestParam(required=false) String keyword) {
        return service.list(projectId,((SessionPrincipal)auth.getPrincipal()).id(),page,size,state,keyword);
    }
}
