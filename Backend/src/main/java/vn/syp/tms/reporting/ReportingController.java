package vn.syp.tms.reporting;

import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/reports")
public class ReportingController {
    private final ReportingService service;
    public ReportingController(ReportingService service) { this.service=service; }
    private String actor(Authentication a) { return ((SessionPrincipal)a.getPrincipal()).id(); }
    @GetMapping("/summary")
    public Object summary(Authentication a,@PathVariable long projectId,@RequestParam(required=false) Long cycleId,@RequestParam(required=false) Long buildId,@RequestParam(defaultValue="0") int page) {
        return service.summary(projectId,actor(a),cycleId,buildId,page);
    }
    @GetMapping("/export.xlsx")
    public ResponseEntity<byte[]> export(Authentication a,@PathVariable long projectId,@RequestParam(required=false) Long cycleId,@RequestParam(required=false) Long buildId) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"tms-report-"+projectId+".xlsx\"")
            .header(HttpHeaders.CACHE_CONTROL,"no-store").body(service.export(projectId,actor(a),cycleId,buildId));
    }
}
