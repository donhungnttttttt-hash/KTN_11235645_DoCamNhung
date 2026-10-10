package vn.syp.tms.cycle;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}")
public class CycleDecisionController {
    private final CycleDecisionService service;
    public CycleDecisionController(CycleDecisionService service) { this.service=service; }
    private String actor(Authentication auth) { return ((SessionPrincipal)auth.getPrincipal()).id(); }
    @PostMapping("/run-items/{id}/scope-decisions")
    public Object scope(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody CycleDecisionDtos.Scope input) {
        return service.scope(projectId,actor(a),id,input);
    }
    @GetMapping("/run-items/{id}/scope-decisions")
    public Object scopeHistory(Authentication a,@PathVariable long projectId,@PathVariable long id,@RequestParam(defaultValue="0") int page) {
        return service.history(projectId,actor(a),id,page,true);
    }
    @PostMapping("/test-cycles/{id}/decisions")
    public Object decide(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody CycleDecisionDtos.Decision input) {
        return service.decide(projectId,actor(a),id,input);
    }
    @GetMapping("/test-cycles/{id}/decisions")
    public Object history(Authentication a,@PathVariable long projectId,@PathVariable long id,@RequestParam(defaultValue="0") int page) {
        return service.history(projectId,actor(a),id,page,false);
    }
}
