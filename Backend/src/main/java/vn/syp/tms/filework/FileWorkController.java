package vn.syp.tms.filework;

import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/file-work-groups")
public class FileWorkController {
    private final FileWorkService service;
    public FileWorkController(FileWorkService service){this.service=service;}
    private String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @GetMapping("/metadata")
    public Object metadata(Authentication auth,@PathVariable long projectId){return service.metadata(projectId,actor(auth));}
    @GetMapping("/preparation")
    public Object preparation(Authentication auth,@PathVariable long projectId){return service.preparation(projectId,actor(auth));}
    @PostMapping("/preview")
    public Object preview(Authentication auth,@PathVariable long projectId,@Valid @RequestBody FileWorkDtos.Scope input){return service.preview(projectId,actor(auth),input);}
    @PostMapping
    public ResponseEntity<?> create(Authentication auth,@PathVariable long projectId,@Valid @RequestBody FileWorkDtos.Create input){var result=service.create(projectId,actor(auth),input);var group=(java.util.Map<?,?>)result.get("group");return ResponseEntity.created(java.util.Objects.requireNonNull(URI.create("/api/v1/projects/"+projectId+"/file-work-groups/"+group.get("id")))).body(result);}
    @GetMapping
    public Object list(Authentication auth,@PathVariable long projectId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="false") boolean mine,@RequestParam(required=false) Long documentId,@RequestParam(required=false) Long cycleId,@RequestParam(required=false) Long assigneeMembershipId,@RequestParam(required=false) Long buildId,@RequestParam(required=false) String state,@RequestParam(required=false) String keyword){return service.list(projectId,actor(auth),new FileWorkDtos.Filter(page,size,mine,documentId,cycleId,assigneeMembershipId,buildId,state,keyword));}
    @GetMapping("/{groupId}")
    public Object detail(Authentication auth,@PathVariable long projectId,@PathVariable long groupId){return service.detail(projectId,actor(auth),groupId);}
    @PutMapping("/{groupId}/assignment")
    public Object assign(Authentication auth,@PathVariable long projectId,@PathVariable long groupId,@Valid @RequestBody FileWorkDtos.Assignment input){return service.assign(projectId,actor(auth),groupId,input);}
    @GetMapping("/{groupId}/history")
    public Object history(Authentication auth,@PathVariable long projectId,@PathVariable long groupId,@RequestParam(defaultValue="0") long before){return service.history(projectId,actor(auth),groupId,before);}
}
