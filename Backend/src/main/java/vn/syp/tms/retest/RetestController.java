package vn.syp.tms.retest;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController @RequestMapping("/api/v1/projects/{projectId}")
public class RetestController {
    private final RetestService service;
    public RetestController(RetestService service) { this.service=service; }
    private String actor(Authentication a) { return ((SessionPrincipal)a.getPrincipal()).id(); }
    @GetMapping("/work-items/{id}/retest") public Object summary(Authentication a,@PathVariable long projectId,@PathVariable long id) {return service.summary(projectId,actor(a),id);}
    @GetMapping("/retest-candidates") public Object candidates(Authentication a,@PathVariable long projectId,@RequestParam(defaultValue="0") int page,@RequestParam(required=false) String keyword) {return service.candidates(projectId,actor(a),page,keyword);}
    @PostMapping("/work-items/{id}/retest-coverage") @ResponseStatus(HttpStatus.CREATED) public Object coverage(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody RetestDtos.Coverage input) {return service.coverage(projectId,actor(a),id,input);}
    @PostMapping("/work-items/{id}/retest-requests") @ResponseStatus(HttpStatus.CREATED) public Object create(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody RetestDtos.Request input) {return service.createRequest(projectId,actor(a),id,input);}
    @GetMapping("/retest-requests") public Object queue(Authentication a,@PathVariable long projectId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="true") boolean mine,@RequestParam(required=false) String status) {return service.queue(projectId,actor(a),page,mine,status);}
    @GetMapping("/retest-requests/{id}") public Object request(Authentication a,@PathVariable long projectId,@PathVariable long id) {return service.request(projectId,actor(a),id);}
    @PostMapping("/retest-requests/{id}/results") public Object submit(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody RetestDtos.Submit input) {return service.submit(projectId,actor(a),id,input);}
    @PostMapping("/work-items/{id}/closure") public Object close(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody RetestDtos.Closure input) {return service.close(projectId,actor(a),id,input);}
    @PostMapping("/work-items/{id}/reopen") public Object reopen(Authentication a,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody RetestDtos.Reopen input) {return service.reopen(projectId,actor(a),id,input);}
}
