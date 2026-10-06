package vn.syp.tms.admin;

import java.util.Map;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1")
public class ProjectStatusReportController {
 private final ProjectStatusReportService service;
 public ProjectStatusReportController(ProjectStatusReportService service) {this.service=service;}
 private String actor(Authentication auth) {return ((SessionPrincipal)auth.getPrincipal()).id();}
 @PostMapping("/projects/{id}/status-reports") @ResponseStatus(HttpStatus.CREATED)
 public Map<String,Object> create(Authentication auth,@PathVariable long id,@Valid @RequestBody ProjectStatusReportService.Input input) {return service.create(actor(auth),id,input);}
 @GetMapping("/projects/{id}/status-reports")
 public ProjectStatusReportService.History history(Authentication auth,@PathVariable long id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {return service.history(actor(auth),id,false,page,size);}
 @GetMapping("/admin/projects/{id}/status-reports")
 public ProjectStatusReportService.History adminHistory(Authentication auth,@PathVariable long id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {return service.history(actor(auth),id,true,page,size);}
}
