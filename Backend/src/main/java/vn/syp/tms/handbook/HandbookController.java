package vn.syp.tms.handbook;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import java.util.List;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/handbook")
public class HandbookController {
    private final HandbookService handbookService;

    public HandbookController(HandbookService handbookService) {
        this.handbookService = handbookService;
    }

    private String actorId(Authentication auth) {
        return ((SessionPrincipal) auth.getPrincipal()).id();
    }

    @GetMapping
    public List<HandbookDtos.ResourceDto> list(Authentication auth, @PathVariable Long projectId) {
        return handbookService.listResources(projectId, actorId(auth));
    }
    
    @GetMapping("/{resourceId}")
    public HandbookDtos.ResourceDetailDto get(Authentication auth, @PathVariable Long projectId, @PathVariable Long resourceId) {
        return handbookService.getResource(projectId, actorId(auth), resourceId);
    }

    @PostMapping
    public HandbookDtos.ResourceDto createResource(Authentication auth, @PathVariable Long projectId, @Valid @RequestBody HandbookDtos.CreateResource input) {
        return handbookService.createResource(projectId, actorId(auth), input);
    }
    
    @PostMapping("/{resourceId}/revisions")
    public HandbookDtos.ResourceDto addRevision(Authentication auth, @PathVariable Long projectId, @PathVariable Long resourceId, @Valid @RequestBody HandbookDtos.CreateRevision input) {
        return handbookService.addRevision(projectId, actorId(auth), resourceId, input);
    }
}
