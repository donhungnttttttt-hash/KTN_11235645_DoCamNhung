package vn.syp.tms.testcase;

import org.springframework.http.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/import-previews")
public class ImportController {

    private final TestCaseService testCaseService;

    public ImportController(TestCaseService testCaseService) {
        this.testCaseService = testCaseService;
    }

    private String actorId(Authentication auth) {
        return ((SessionPrincipal) auth.getPrincipal()).id();
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> template(Authentication auth, @PathVariable Long projectId) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=test-cases-template.xlsx")
                .body(testCaseService.importTemplate(projectId, actorId(auth)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TestCaseDtos.ImportPreviewDetail createImportPreview(
            Authentication auth,
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file
    ) {
        return testCaseService.createImportPreview(projectId, actorId(auth), file);
    }

    @GetMapping("/{id}")
    public TestCaseDtos.ImportPreviewDetail getImportPreview(
            Authentication auth,
            @PathVariable Long projectId,
            @PathVariable Long id
    ) {
        return testCaseService.getImportPreview(projectId, actorId(auth), id);
    }

    @PostMapping("/{id}/commit")
    public TestCaseDtos.ImportBatchSummary commitImportPreview(
            Authentication auth,
            @PathVariable Long projectId,
            @PathVariable Long id
    ) {
        return testCaseService.commitImportPreview(projectId, actorId(auth), id);
    }
}

