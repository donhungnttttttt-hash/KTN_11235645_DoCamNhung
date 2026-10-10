package vn.syp.tms.integration;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController @RequestMapping("/api/v1/projects/{projectId}")
public class RedmineController {
    private final RedmineService service;
    public RedmineController(RedmineService service){this.service=service;}
    private String actor(Authentication a){return ((SessionPrincipal)a.getPrincipal()).id();}
    @GetMapping("/integrations/redmine") public Object configuration(Authentication a,@PathVariable long projectId){return service.configuration(projectId,actor(a));}
    @GetMapping("/work-items/{id}/redmine") public Object state(Authentication a,@PathVariable long projectId,@PathVariable long id){return service.state(projectId,actor(a),id);}
    @PostMapping("/work-items/{id}/redmine-deliveries") @ResponseStatus(HttpStatus.ACCEPTED)
    public Object publish(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody RedmineDtos.Publish body){return service.queue(projectId,actor(a),id,body,false);}
    @PostMapping("/work-items/{id}/redmine-reconciliations") @ResponseStatus(HttpStatus.ACCEPTED)
    public Object reconcile(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody RedmineDtos.Publish body){return service.queue(projectId,actor(a),id,body,true);}
    @PostMapping("/redmine-deliveries/{id}/retry") @ResponseStatus(HttpStatus.ACCEPTED)
    public Object retry(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody RedmineDtos.Retry body){return service.retry(projectId,actor(a),id,body);}
}
