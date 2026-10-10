package vn.syp.tms.ai;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.shared.web.BusinessException;

@RestController
@RequestMapping("/api/v1/ai/providers")
public class AiProviderController {
    private final AiProviderGateway gateway;private final ChatGptConnectionService connections;
    public AiProviderController(AiProviderGateway gateway,ChatGptConnectionService connections){this.gateway=gateway;this.connections=connections;}
    public record Connect(boolean newAccount) {}
    public record ProbeRequest(@NotBlank @Size(max=100) String model,@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    @GetMapping public AiProviderGateway.Metadata metadata(Authentication auth){return gateway.metadata(actor(auth));}
    @GetMapping("/{provider}/models") public List<AiProviderGateway.Model> models(Authentication auth,@PathVariable String provider,@RequestParam(required=false) String connectionId){return gateway.models(actor(auth),provider,connectionId);}
    @PostMapping("/CHATGPT/authorizations") public ChatGptConnectionService.Authorization connect(Authentication auth,@RequestBody(required=false) Connect body){return connections.start(actor(auth),body!=null&&body.newAccount());}
    @GetMapping("/CHATGPT/authorizations/{id}") public ChatGptConnectionService.AttemptView attempt(Authentication auth,@PathVariable String id){return connections.attempt(actor(auth),id);}
    @DeleteMapping("/CHATGPT/authorizations/{id}") public void cancel(Authentication auth,@PathVariable String id){connections.cancel(actor(auth),id);}
    @PostMapping("/CHATGPT/connections/{id}/probes") public ChatGptConnectionService.Probe probe(Authentication auth,@PathVariable String id,@Valid @RequestBody ProbeRequest body){return connections.probe(actor(auth),id,body.model(),body.requestKey());}
    @DeleteMapping("/CHATGPT/connections/{id}") public ChatGptConnectionService.Disconnect disconnect(Authentication auth,@PathVariable String id,@RequestParam long expectedVersion){return connections.disconnect(actor(auth),id,expectedVersion);}
    private String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @ExceptionHandler(OpenAiResponsesClient.Failure.class)
    public org.springframework.http.ResponseEntity<vn.syp.tms.shared.web.ApiError> failure(OpenAiResponsesClient.Failure failure) {
        return org.springframework.http.ResponseEntity.unprocessableEntity().body(new vn.syp.tms.shared.web.ApiError(failure.code(),"AI provider request could not be completed.",List.of(),null));
    }
}
