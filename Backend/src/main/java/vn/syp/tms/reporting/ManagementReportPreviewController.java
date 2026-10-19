package vn.syp.tms.reporting;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.ai.AiManagementReportGenerator;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/management-reports")
public class ManagementReportPreviewController {
    private final AiManagementReportGenerator generator;
    public ManagementReportPreviewController(AiManagementReportGenerator generator) {this.generator=generator;}
    @PostMapping("/preview") public Object preview(Authentication auth,@PathVariable long projectId,@Valid @RequestBody ManagementReportDtos.Preview input) {return generator.preview(projectId,((SessionPrincipal)auth.getPrincipal()).id(),input);}
}
