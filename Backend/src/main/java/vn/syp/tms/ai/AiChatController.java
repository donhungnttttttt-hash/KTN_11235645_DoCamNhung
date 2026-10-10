package vn.syp.tms.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/ai/chats")
public class AiChatController {
    private final AiChatService service;
    private final AiChatStore store;
    public AiChatController(AiChatService service,AiChatStore store){this.service=service;this.store=store;}
    public record Create(@Size(max=20) String provider,@Size(max=100) String model,@Positive Long projectId,
                         @Size(max=64) String purpose,@Positive Long targetId) {}
    public record Send(@NotBlank @Size(max=2000) String text,@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    @PostMapping public ResponseEntity<AiChatStore.ThreadView> create(Authentication auth,@Valid @RequestBody Create body) {
        var thread=service.create(actor(auth),body.projectId(),body.purpose(),body.targetId(),new AiProviderGateway.Selection(body.provider(),body.model()));
        return ResponseEntity.created(URI.create("/api/v1/ai/chats/"+thread.id())).body(thread);
    }
    @GetMapping public AiChatStore.Page list(Authentication auth,@RequestParam(defaultValue="0") long before) {return store.list(actor(auth),before);}
    @GetMapping("/{id}") public AiChatStore.Detail get(Authentication auth,@PathVariable long id,@RequestParam(defaultValue="0") long before) {return store.get(actor(auth),id,before);}
    @PostMapping("/{id}/messages") public ResponseEntity<AiChatStore.Turn> send(Authentication auth,@PathVariable long id,@Valid @RequestBody Send body) {
        var turn=service.send(actor(auth),id,body.text(),body.requestKey());
        return ResponseEntity.status("GENERATING".equals(turn.state())?202:200).body(turn);
    }
    private static String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @ExceptionHandler(OpenAiResponsesClient.Failure.class)
    public ResponseEntity<vn.syp.tms.shared.web.ApiError> failure(OpenAiResponsesClient.Failure failure) {
        return ResponseEntity.unprocessableEntity().body(new vn.syp.tms.shared.web.ApiError(
                AiChatService.safeCode(failure.code()),"AI chat request could not be completed.",java.util.List.of(),null));
    }
}
