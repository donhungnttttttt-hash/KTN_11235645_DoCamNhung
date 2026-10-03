package vn.syp.tms.testcase;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;


@RestController
@RequestMapping("/api/v1/projects/{projectId}/test-cases")
public class TestCaseController {

    private final TestCaseService testCaseService;

    public TestCaseController(TestCaseService testCaseService) {
        this.testCaseService = testCaseService;
    }

    private String actorId(Authentication auth) {
        return ((SessionPrincipal) auth.getPrincipal()).id();
    }

    @GetMapping
    public TestCaseDtos.CasePage listCases(
            Authentication auth,
            @PathVariable Long projectId,
            @RequestParam(required = false) Long suiteId,
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return testCaseService.searchCases(projectId, actorId(auth), suiteId, keyword, page, size);
    }

    @GetMapping("/{id}")
    public TestCaseDtos.CaseDetail getCaseDetail(
            Authentication auth,
            @PathVariable Long projectId,
            @PathVariable Long id
    ) {
        return testCaseService.getCaseDetail(projectId, actorId(auth), id);
    }

    @PostMapping
    public TestCaseDtos.CaseDetail createCase(
            Authentication auth,
            @PathVariable Long projectId,
            @Valid @RequestBody TestCaseDtos.CreateCase input
    ) {
        return testCaseService.createCase(projectId, actorId(auth), input);
    }

    @PostMapping("/{id}/revisions")
    public TestCaseDtos.RevisionDetail addRevision(
            Authentication auth,
            @PathVariable Long projectId,
            @PathVariable Long id,
            @Valid @RequestBody TestCaseDtos.CreateRevision input
    ) {
        return testCaseService.addRevision(projectId, actorId(auth), id, input);
    }

    @GetMapping("/{id}/revisions/{revisionId}")
    public TestCaseDtos.RevisionDetail getRevision(Authentication auth, @PathVariable Long projectId,
            @PathVariable Long id, @PathVariable Long revisionId) {
        return testCaseService.getRevision(projectId, actorId(auth), id, revisionId);
    }

    @PostMapping("/{id}/revisions/{revisionId}/approve")
    public TestCaseDtos.RevisionDetail approveRevision(
            Authentication auth,
            @PathVariable Long projectId,
            @PathVariable Long id,
            @PathVariable Long revisionId
    ) {
        return testCaseService.approveRevision(projectId, actorId(auth), id, revisionId);
    }

    @PostMapping("/{id}/archive")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void archiveCase(
            Authentication auth,
            @PathVariable Long projectId,
            @PathVariable Long id
    ) {
        testCaseService.archiveCase(projectId, actorId(auth), id);
    }
}

