package vn.syp.tms.qa;

import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;
import static vn.syp.tms.qa.QaDtos.*;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/qa")
public class QaController {
    private final QaService service;
    public QaController(QaService service){this.service=service;}
    private String actor(Authentication auth){return ((SessionPrincipal)auth.getPrincipal()).id();}
    @PostMapping
    public ResponseEntity<QaDetail> create(Authentication auth,@PathVariable long projectId,@Valid @RequestBody Create input){
        var result=service.create(projectId,actor(auth),input);
        return ResponseEntity.created(java.util.Objects.requireNonNull(URI.create("/api/v1/projects/"+projectId+"/qa/"+result.item().id()))).body(result);
    }
    @GetMapping
    public Page<QaSummary> list(Authentication auth,@PathVariable long projectId,@RequestParam(defaultValue="0") int page,
        @RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="false") boolean mine,
        @RequestParam(required=false) String status,@RequestParam(required=false) String keyword){
        return service.list(projectId,actor(auth),new Filter(page,size,mine,status,keyword));
    }
    @GetMapping("/{id}")
    public QaDetail detail(Authentication auth,@PathVariable long projectId,@PathVariable long id){return service.detail(projectId,actor(auth),id);}
    @PutMapping("/{id}/assignment")
    public QaDetail assign(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody Assign input){return service.assign(projectId,actor(auth),id,input);}
    @PostMapping("/{id}/start")
    public QaDetail start(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody Command input){return service.start(projectId,actor(auth),id,input);}
    @PostMapping("/{id}/request-info")
    public QaDetail requestInfo(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody Command input){return service.requestInfo(projectId,actor(auth),id,input);}
    @PostMapping("/{id}/provide-info")
    public QaDetail provideInfo(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody ProvideInfo input){return service.provideInfo(projectId,actor(auth),id,input);}
    @PostMapping("/{id}/answers")
    public QaDetail answer(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody Answer input){return service.answer(projectId,actor(auth),id,input);}
    @PostMapping("/{id}/confirmations")
    public QaDetail confirm(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody Confirm input){return service.confirm(projectId,actor(auth),id,input);}
    @PostMapping("/{id}/close")
    public QaDetail close(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody Close input){return service.close(projectId,actor(auth),id,input);}
    @PostMapping("/{id}/reopen")
    public QaDetail reopen(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody Command input){return service.reopen(projectId,actor(auth),id,input);}
    @GetMapping("/{id}/answers")
    public Page<QaAnswer> answers(Authentication auth,@PathVariable long projectId,@PathVariable long id,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.answers(projectId,actor(auth),id,page,size);}
    @GetMapping("/{id}/confirmations")
    public Page<QaConfirmation> confirmations(Authentication auth,@PathVariable long projectId,@PathVariable long id,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.confirmations(projectId,actor(auth),id,page,size);}
}
