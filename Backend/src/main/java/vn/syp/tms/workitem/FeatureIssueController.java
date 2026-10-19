package vn.syp.tms.workitem;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController @RequestMapping("/api/v1/projects/{projectId}/issues")
public class FeatureIssueController {
    private final FeatureIssueService service;
    public FeatureIssueController(FeatureIssueService service){this.service=service;}
    private String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @GetMapping public Object list(Authentication a,@PathVariable long projectId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,
        @RequestParam(required=false) Long featureId,@RequestParam(required=false) Long documentId,@RequestParam(required=false) Long rowId,@RequestParam(defaultValue="") String type,@RequestParam(defaultValue="") String status,@RequestParam(defaultValue="") String keyword){return service.list(projectId,actor(a),new FeatureIssueDtos.Filter(page,size,featureId,documentId,rowId,type,status,keyword));}
    @GetMapping("/context") public Object context(Authentication a,@PathVariable long projectId,@RequestParam long featureId,@RequestParam long documentId,@RequestParam long rowId){return service.context(projectId,actor(a),featureId,documentId,rowId);}
    @GetMapping("/{id}") public Object get(Authentication a,@PathVariable long projectId,@PathVariable long id){return service.get(projectId,actor(a),id);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Object create(Authentication a,@PathVariable long projectId,@Valid @RequestBody FeatureIssueDtos.Create input){return service.create(projectId,actor(a),input);}
    @PutMapping("/{id}") public Object update(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody FeatureIssueDtos.Update input){return service.update(projectId,actor(a),id,input);}
    @PutMapping("/{id}/status") public Object transition(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody FeatureIssueDtos.Status input){return service.transition(projectId,actor(a),id,input);}
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void remove(Authentication a,@PathVariable long projectId,@PathVariable long id,@RequestParam long expectedVersion){service.remove(projectId,actor(a),id,expectedVersion);}
    @GetMapping("/{id}/history") public Object history(Authentication a,@PathVariable long projectId,@PathVariable long id){return service.history(projectId,actor(a),id);}
    @GetMapping("/{id}/comments") public Object comments(Authentication a,@PathVariable long projectId,@PathVariable long id){return service.comments(projectId,actor(a),id);}
    @PostMapping("/{id}/comments") @ResponseStatus(HttpStatus.CREATED) public Object comment(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody FeatureIssueDtos.Comment input){return service.comment(projectId,actor(a),id,input);}
}
