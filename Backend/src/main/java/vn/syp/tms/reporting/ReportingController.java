package vn.syp.tms.reporting;

import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.shared.web.BusinessException;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/reports")
public class ReportingController {
    private final ManagementReportService reports;
    public ReportingController(ManagementReportService reports) { this.reports=reports; }
    private String actor(Authentication a) { return ((SessionPrincipal)a.getPrincipal()).id(); }
    private void retired(long projectId,String actor) {
        // Old URLs must neither expose management data to workers nor keep the run model active.
        reports.requireReadManagement(projectId,actor);
        throw new BusinessException(410,"USE_FEATURE_REPORTS","Báo cáo theo lượt chạy cũ đã ngừng sử dụng. Mở Tổng hợp & Phân tích để xem dữ liệu Feature và báo cáo đã lưu.");
    }
    @GetMapping("/summary")
    public Object summary(Authentication a,@PathVariable long projectId,@RequestParam(required=false) Long cycleId,@RequestParam(required=false) Long buildId,@RequestParam(defaultValue="0") int page) {
        retired(projectId,actor(a));return null;
    }
    @GetMapping("/export.xlsx")
    public ResponseEntity<byte[]> export(Authentication a,@PathVariable long projectId,@RequestParam(required=false) Long cycleId,@RequestParam(required=false) Long buildId) {
        retired(projectId,actor(a));return ResponseEntity.noContent().build();
    }
}
