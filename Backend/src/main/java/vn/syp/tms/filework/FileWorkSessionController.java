package vn.syp.tms.filework;

import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}")
public class FileWorkSessionController {
    private final FileWorkSessionService service;
    public FileWorkSessionController(FileWorkSessionService service){this.service=service;}
    private String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @GetMapping("/file-work-groups/{groupId}/sessions")
    public Object list(Authentication auth,@PathVariable long projectId,@PathVariable long groupId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.list(projectId,actor(auth),groupId,page,size);}
    @GetMapping("/file-work-groups/{groupId}/eligible-allocations")
    public Object eligible(Authentication auth,@PathVariable long projectId,@PathVariable long groupId){return service.eligible(projectId,actor(auth),groupId);}
    @PostMapping("/file-work-groups/{groupId}/sessions")
    public ResponseEntity<?> start(Authentication auth,@PathVariable long projectId,@PathVariable long groupId,@Valid @RequestBody FileWorkDtos.Start input){var result=service.start(projectId,actor(auth),groupId,input);return ResponseEntity.created(java.util.Objects.requireNonNull(URI.create("/api/v1/projects/"+projectId+"/file-work-sessions/"+result.get("id")))).body(result);}
    @PostMapping("/file-work-sessions/{sessionId}/pause")
    public Object pause(Authentication auth,@PathVariable long projectId,@PathVariable long sessionId,@Valid @RequestBody FileWorkDtos.SessionCommand input){return service.pause(projectId,actor(auth),sessionId,input);}
    @PostMapping("/file-work-sessions/{sessionId}/resume")
    public Object resume(Authentication auth,@PathVariable long projectId,@PathVariable long sessionId,@Valid @RequestBody FileWorkDtos.SessionCommand input){return service.resume(projectId,actor(auth),sessionId,input);}
    @PostMapping("/file-work-sessions/{sessionId}/complete")
    public Object complete(Authentication auth,@PathVariable long projectId,@PathVariable long sessionId,@Valid @RequestBody FileWorkDtos.SessionCommand input){return service.complete(projectId,actor(auth),sessionId,input);}
    @PostMapping("/file-work-sessions/{sessionId}/cancel")
    public Object cancel(Authentication auth,@PathVariable long projectId,@PathVariable long sessionId,@Valid @RequestBody FileWorkDtos.SessionCommand input){return service.cancel(projectId,actor(auth),sessionId,input);}
}
