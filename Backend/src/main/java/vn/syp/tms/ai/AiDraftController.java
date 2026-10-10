package vn.syp.tms.ai;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

/** Only server-defined tasks; there is no arbitrary prompt endpoint. */
@RestController
@RequestMapping("/api/v1/projects/{projectId}/ai-drafts")
public class AiDraftController {
    private final AiDraftStore drafts;
    private final AiContextService contexts;
    private final AiAssistanceService assistance;
    public AiDraftController(AiDraftStore drafts,AiContextService contexts,AiAssistanceService assistance) {
        this.drafts=drafts;this.contexts=contexts;this.assistance=assistance;
    }
    public record Generate(@NotBlank @Size(max=64) String purpose,Long targetId,
                           @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    public record Edit(@NotNull @Size(max=12000) String text,@NotNull @PositiveOrZero Long expectedVersion) {}

    @GetMapping("/metadata")
    public AiContextService.Metadata metadata(Authentication auth,@PathVariable long projectId) {
        return contexts.metadata(projectId,((SessionPrincipal)auth.getPrincipal()).id());
    }
    @GetMapping("/targets")
    public AiContextService.Targets targets(Authentication auth,@PathVariable long projectId,@RequestParam String purpose,@RequestParam(defaultValue="") String q) {
        return contexts.targets(projectId,((SessionPrincipal)auth.getPrincipal()).id(),AiPurpose.parse(purpose),q);
    }
    @PostMapping
    public AiDraftStore.Draft generate(Authentication auth,@PathVariable long projectId,@Valid @RequestBody Generate body) {
        return assistance.generate(projectId,((SessionPrincipal)auth.getPrincipal()).id(),body.purpose(),body.targetId(),body.requestKey());
    }
    @PutMapping("/{draftId}/text")
    public AiDraftStore.Draft edit(Authentication auth,@PathVariable long projectId,@PathVariable long draftId,@Valid @RequestBody Edit body) {
        return drafts.edit(projectId,((SessionPrincipal)auth.getPrincipal()).id(),draftId,body.text(),body.expectedVersion());
    }

    @GetMapping
    public List<AiDraftStore.Draft> list(Authentication auth, @PathVariable long projectId,
                                        @RequestParam(defaultValue="0") long before) {
        return drafts.list(projectId, ((SessionPrincipal) auth.getPrincipal()).id(), before);
    }

    @GetMapping("/{draftId}")
    public AiDraftStore.Draft get(Authentication auth, @PathVariable long projectId, @PathVariable long draftId) {
        return drafts.get(projectId, ((SessionPrincipal) auth.getPrincipal()).id(), draftId);
    }
}
