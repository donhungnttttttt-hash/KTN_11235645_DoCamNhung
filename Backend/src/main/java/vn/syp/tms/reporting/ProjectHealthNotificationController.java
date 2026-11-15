package vn.syp.tms.reporting;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import vn.syp.tms.identity.SessionPrincipal;
@RestController
public class ProjectHealthNotificationController {
 private final ProjectHealthNotifications service;
 public ProjectHealthNotificationController(ProjectHealthNotifications service){this.service=service;}
 @GetMapping("/api/v1/me/project-health-notifications") public Object list(Authentication a){return service.list(((SessionPrincipal)a.getPrincipal()).id());}
 @PutMapping("/api/v1/me/project-health-notifications/{id}/read") public Object read(Authentication a,@PathVariable long id){return service.read(((SessionPrincipal)a.getPrincipal()).id(),id);}
}
