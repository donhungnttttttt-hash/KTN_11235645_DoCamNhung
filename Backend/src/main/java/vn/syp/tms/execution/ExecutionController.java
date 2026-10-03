package vn.syp.tms.execution;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}")
public class ExecutionController {
    private final ExecutionService service;
    public ExecutionController(ExecutionService service) { this.service=service; }
    private String actor(Authentication auth) { return ((SessionPrincipal)auth.getPrincipal()).id(); }
    @GetMapping("/test-cycles")
    public Object list(Authentication a,@PathVariable long projectId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.cycles(projectId,actor(a),page,size); }
    @PostMapping("/test-cycles")
    public Object create(Authentication a,@PathVariable long projectId,@Valid @RequestBody ExecutionDtos.CreateCycle input) { return service.create(projectId,actor(a),input); }
    @GetMapping("/test-cycles/{id}")
    public Object get(Authentication a,@PathVariable long projectId,@PathVariable long id) { return service.cycle(projectId,actor(a),id); }
    @GetMapping("/test-cycles/{id}/configurations")
    public Object configs(Authentication a,@PathVariable long projectId,@PathVariable long id) { return service.configurations(projectId,actor(a),id); }
    @PostMapping("/test-cycles/{id}/configurations")
    public Object configure(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody ExecutionDtos.Configuration input) { return service.configure(projectId,actor(a),id,input); }
    @PostMapping("/test-cycles/{id}/scope")
    public Object scope(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody ExecutionDtos.AddScope input) { return service.addScope(projectId,actor(a),id,input); }
    @PostMapping("/test-cycles/{id}/activate")
    public Object activate(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody ExecutionDtos.Version input) { return service.activate(projectId,actor(a),id,input); }
    @GetMapping("/test-cycles/{id}/run-items")
    public Object runs(Authentication a,@PathVariable long projectId,@PathVariable long id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="50") int size,@RequestParam(defaultValue="false") boolean mine,@RequestParam(defaultValue="false") boolean pendingBug) { return service.runs(projectId,actor(a),id,page,size,mine,pendingBug); }
    @GetMapping("/run-items/{id}")
    public Object run(Authentication a,@PathVariable long projectId,@PathVariable long id) { return service.run(projectId,actor(a),id); }
    @PutMapping("/run-items/{id}/assignment")
    public Object assign(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody ExecutionDtos.Assignment input) { return service.assign(projectId,actor(a),id,input); }
    @GetMapping("/run-items/{id}/assignments")
    public Object assignments(Authentication a,@PathVariable long projectId,@PathVariable long id) { return service.assignments(projectId,actor(a),id); }
    @GetMapping("/run-items/{id}/attempts")
    public Object attempts(Authentication a,@PathVariable long projectId,@PathVariable long id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.attempts(projectId,actor(a),id,page,size); }
    @PostMapping("/run-items/{id}/attempts")
    public Object record(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody ExecutionDtos.Attempt input) { return service.record(projectId,actor(a),id,input); }
}
