package vn.syp.tms.testcase;

import java.nio.charset.StandardCharsets;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;
import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/test-documents")
public class TestDocumentController {
    private final TestDocumentService documents;
    public TestDocumentController(TestDocumentService documents) { this.documents=documents; }
    private String actor(Authentication auth) { return ((SessionPrincipal)auth.getPrincipal()).id(); }
    @GetMapping
    public TestDocumentDtos.Page list(Authentication auth,@PathVariable Long projectId,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="") String keyword) {
        return documents.list(projectId,actor(auth),page,size,keyword);
    }
    @GetMapping("/{id}")
    public TestDocumentDtos.Detail get(Authentication auth,@PathVariable Long projectId,@PathVariable Long id) {
        return documents.get(projectId,actor(auth),id);
    }
    @PutMapping("/{id}/rows/{rowId}/result")
    public TestDocumentDtos.Result updateResult(Authentication auth,@PathVariable Long projectId,@PathVariable Long id,
            @PathVariable Long rowId,@Valid @RequestBody TestDocumentDtos.UpdateResult input) {
        return documents.updateResult(projectId,actor(auth),id,rowId,input);
    }
    @GetMapping("/{id}/rows/{rowId}/result-history")
    public List<TestDocumentDtos.Change> history(Authentication auth,@PathVariable Long projectId,@PathVariable Long id,
            @PathVariable Long rowId,@RequestParam(defaultValue="0") long before) {
        return documents.resultHistory(projectId,actor(auth),id,rowId,before);
    }
    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> export(Authentication auth,@PathVariable Long projectId,@PathVariable Long id,@RequestParam(defaultValue="false") boolean original) {
        var file=documents.export(projectId,actor(auth),id,original);
        String safeName=file.fileName().replaceAll("[\\p{Cntrl}]","");
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .cacheControl(CacheControl.noStore().cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(safeName,StandardCharsets.UTF_8).build().toString())
                .body(file.bytes());
    }
}
