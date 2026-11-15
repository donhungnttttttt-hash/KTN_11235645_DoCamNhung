package vn.syp.tms.workitem;

import java.util.*;
import java.nio.charset.StandardCharsets;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.syp.tms.identity.SessionPrincipal;

@RestController @RequestMapping("/api/v1/projects/{projectId}/issues/{id}")
public class TicketAttachmentController {
    private final TicketAttachmentService service;
    public TicketAttachmentController(TicketAttachmentService service){this.service=service;}
    @PostMapping(value="/actions-with-files",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public Object submit(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestPart("action") FeatureIssueDtos.Action action,@RequestPart("files") List<MultipartFile> files){return service.submit(projectId,((SessionPrincipal)auth.getPrincipal()).id(),id,action,files);}
    @GetMapping("/attachments/{attachment}")
    public ResponseEntity<byte[]> download(Authentication auth,@PathVariable long projectId,@PathVariable long id,@PathVariable UUID attachment){
        var file=service.download(projectId,((SessionPrincipal)auth.getPrincipal()).id(),id,attachment);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.type())).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(file.name(),StandardCharsets.UTF_8).build().toString()).header("X-Content-Type-Options","nosniff").header("Content-Security-Policy","sandbox; default-src 'none'").cacheControl(CacheControl.noStore()).body(file.bytes());
    }
}
