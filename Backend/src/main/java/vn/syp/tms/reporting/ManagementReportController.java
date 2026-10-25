package vn.syp.tms.reporting;

import java.util.Map;
import java.util.Objects;
import java.nio.charset.StandardCharsets;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/management-reports")
public class ManagementReportController {
    private final ManagementReportService reports;
    public ManagementReportController(ManagementReportService reports) {this.reports=reports;}
    @GetMapping("/summary") public Object summary(Authentication auth,@PathVariable long projectId,@RequestParam(required=false) Long featureId) {return reports.summary(projectId,actor(auth),featureId);}
    @GetMapping public Object list(Authentication auth,@PathVariable long projectId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {return reports.list(projectId,actor(auth),page,size);}
    @GetMapping("/{id}") public Object get(Authentication auth,@PathVariable long projectId,@PathVariable long id) {return reports.get(projectId,actor(auth),id);}
    @PostMapping public ResponseEntity<Map<String,Object>> create(Authentication auth,@PathVariable long projectId,@Valid @RequestBody ManagementReportDtos.Create input) {return ResponseEntity.status(201).body(reports.create(projectId,actor(auth),input));}
    @PutMapping("/{id}") public Object update(Authentication auth,@PathVariable long projectId,@PathVariable long id,@Valid @RequestBody ManagementReportDtos.Update input) {return reports.update(projectId,actor(auth),id,input);}
    @GetMapping("/{id}/download") public ResponseEntity<byte[]> download(Authentication auth,@PathVariable long projectId,@PathVariable long id) {
        var report=reports.get(projectId,actor(auth),id);
        return ResponseEntity.ok().contentType(new MediaType("text","markdown",Objects.requireNonNull(StandardCharsets.UTF_8))).cacheControl(CacheControl.noStore().cachePrivate()).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"bao-cao-"+id+".md\"").body(report.get("markdown").toString().getBytes(StandardCharsets.UTF_8));
    }
    private String actor(Authentication auth) {return ((SessionPrincipal)auth.getPrincipal()).id();}
}
