package vn.syp.tms.workitem;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController @RequestMapping("/api/v1/projects/{projectId}/work-items")
public class WorkItemController {
    private final WorkItemService service;
    public WorkItemController(WorkItemService service) { this.service=service; }
    private String actor(Authentication a) { return ((SessionPrincipal)a.getPrincipal()).id(); }
    @GetMapping public Object list(Authentication a,@PathVariable long projectId,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="50") int size,
        @RequestParam(required=false) String type,@RequestParam(required=false) String status,@RequestParam(required=false) String keyword,
        @RequestParam(required=false) Long assignee,@RequestParam(required=false) Long category,@RequestParam(required=false) Long milestone) {
        return service.list(projectId,actor(a),page,size,type,status,keyword,assignee,category,milestone);
    }
    @GetMapping("/metadata") public Object metadata(Authentication a,@PathVariable long projectId) { return service.metadata(projectId,actor(a)); }
    @GetMapping("/overview") public Object overview(Authentication a,@PathVariable long projectId) { return service.overview(projectId,actor(a)); }
    @GetMapping("/sources/{attemptId}") public Object source(Authentication a,@PathVariable long projectId,@PathVariable long attemptId) { return service.source(projectId,actor(a),attemptId); }
    @GetMapping("/{id}") public Object get(Authentication a,@PathVariable long projectId,@PathVariable long id) { return service.get(projectId,actor(a),id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Object create(Authentication a,@PathVariable long projectId,@Valid @RequestBody WorkItemDtos.Create input) { return service.create(projectId,actor(a),input); }
    @PutMapping("/{id}") public Object update(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody WorkItemDtos.Update input) { return service.update(projectId,actor(a),id,input); }
    @PostMapping("/{id}/transitions") public Object transition(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody WorkItemDtos.Transition input) { return service.transition(projectId,actor(a),id,input); }
    @PostMapping("/batch-transitions") public Object batch(Authentication a,@PathVariable long projectId,@Valid @RequestBody WorkItemDtos.Batch input) { return service.batch(projectId,actor(a),input); }
    @PostMapping("/{id}/execution-links") public Object link(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody WorkItemDtos.Link input) { return service.link(projectId,actor(a),id,input); }
    @GetMapping("/{id}/history") public Object history(Authentication a,@PathVariable long projectId,@PathVariable long id,@RequestParam(defaultValue="0") int before) { return service.history(projectId,actor(a),id,before); }
    @GetMapping("/{id}/comments") public Object comments(Authentication a,@PathVariable long projectId,@PathVariable long id,@RequestParam(defaultValue="0") int before) { return service.comments(projectId,actor(a),id,before); }
    @PostMapping("/{id}/comments") @ResponseStatus(HttpStatus.CREATED) public Object comment(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody WorkItemDtos.Comment input) { return service.comment(projectId,actor(a),id,input); }
    @PutMapping("/{id}/external-reference") public Object external(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody WorkItemDtos.ExternalReference input) { return service.external(projectId,actor(a),id,input); }
    @PostMapping("/{id}/clarifications") public Object clarify(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody WorkItemDtos.Clarification input) { return service.clarify(projectId,actor(a),id,input); }
}
