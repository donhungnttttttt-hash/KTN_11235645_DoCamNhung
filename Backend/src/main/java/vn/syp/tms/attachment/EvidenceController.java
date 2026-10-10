package vn.syp.tms.attachment;

import java.nio.charset.StandardCharsets;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.syp.tms.identity.SessionPrincipal;

@RestController @RequestMapping("/api/v1/projects/{projectId}/work-items/{workId}/attachments")
public class EvidenceController {
    private final EvidenceService service;
    public EvidenceController(EvidenceService service) { this.service=service; }
    private String actor(Authentication a) { return ((SessionPrincipal)a.getPrincipal()).id(); }
    @GetMapping public Object list(Authentication a,@PathVariable long projectId,@PathVariable long workId) { return service.list(projectId,actor(a),workId); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Object upload(Authentication a,@PathVariable long projectId,@PathVariable long workId,@RequestParam MultipartFile file) { return service.upload(projectId,actor(a),workId,file); }
    @GetMapping("/{id}/content") public ResponseEntity<byte[]> download(Authentication a,@PathVariable long projectId,@PathVariable long workId,@PathVariable String id) {
        var file=service.download(projectId,actor(a),workId,id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(java.util.Objects.requireNonNull(file.mediaType())))
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(file.name(),StandardCharsets.UTF_8).build().toString())
            .header("X-Content-Type-Options","nosniff").header("Content-Security-Policy","sandbox; default-src 'none'")
            .cacheControl(CacheControl.noStore()).body(file.bytes());
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(Authentication a,@PathVariable long projectId,@PathVariable long workId,@PathVariable String id) { service.delete(projectId,actor(a),workId,id); }
}
