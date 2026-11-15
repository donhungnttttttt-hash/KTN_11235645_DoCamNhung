package vn.syp.tms.reporting;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import vn.syp.tms.identity.SessionPrincipal;
@RestController
public class GuestDashboardController {
 private final GuestDashboardService service;
 public GuestDashboardController(GuestDashboardService service){this.service=service;}
 @GetMapping("/api/v1/projects/{projectId}/management-reports/dashboard")
 public Object get(Authentication auth,@PathVariable long projectId){return service.get(projectId,((SessionPrincipal)auth.getPrincipal()).id());}
}
