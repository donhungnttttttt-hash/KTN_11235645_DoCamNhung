package vn.syp.tms.filework;

import jakarta.validation.Valid;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController @RequestMapping("/api/v1/projects/{projectId}/file-work-groups/{groupId}")
public class FileWorkExecutionController {
    private final FileWorkExecutionService service;
    public FileWorkExecutionController(FileWorkExecutionService service){this.service=service;}
    private String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @GetMapping("/execution")
    public Object view(Authentication auth,@PathVariable long projectId,@PathVariable long groupId,@RequestParam(required=false) Long buildId){return service.view(projectId,actor(auth),groupId,buildId);}
    @PostMapping("/run-items/{runItemId}/attempts")
    public ResponseEntity<?> record(Authentication auth,@PathVariable long projectId,@PathVariable long groupId,@PathVariable long runItemId,@Valid @RequestBody FileWorkExecutionService.FileAttempt input){var result=service.record(projectId,actor(auth),groupId,runItemId,input);return ResponseEntity.created(java.util.Objects.requireNonNull(URI.create("/api/v1/projects/"+projectId+"/run-items/"+runItemId+"/attempts"))).body(result);}
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(Authentication auth,@PathVariable long projectId,@PathVariable long groupId,@RequestParam(required=false) Long buildId){var result=service.export(projectId,actor(auth),groupId,buildId);return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL,"private, no-store").header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(result.fileName(),StandardCharsets.UTF_8).build().toString()).contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).body(result.content());}
}
