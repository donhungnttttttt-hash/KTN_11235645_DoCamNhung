package vn.syp.tms.testcase;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.syp.tms.identity.SessionPrincipal;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/test-suites")
public class TestSuiteController {

    private final TestCaseService testCaseService;

    public TestSuiteController(TestCaseService testCaseService) {
        this.testCaseService = testCaseService;
    }

    private String actorId(Authentication auth) {
        return ((SessionPrincipal) auth.getPrincipal()).id();
    }

    @GetMapping
    public List<TestCaseDtos.SuiteSummary> listSuites(Authentication auth, @PathVariable Long projectId) {
        return testCaseService.listSuites(projectId, actorId(auth));
    }

    @PostMapping
    public TestCaseDtos.SuiteSummary createSuite(
            Authentication auth,
            @PathVariable Long projectId,
            @Valid @RequestBody TestCaseDtos.CreateSuite input
    ) {
        return testCaseService.createSuite(projectId, actorId(auth), input);
    }

    @PatchMapping("/{id}")
    public TestCaseDtos.SuiteSummary updateSuite(
            Authentication auth,
            @PathVariable Long projectId,
            @PathVariable Long id,
            @Valid @RequestBody TestCaseDtos.UpdateSuite input
    ) {
        return testCaseService.updateSuite(projectId, actorId(auth), id, input);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void archiveSuite(Authentication auth, @PathVariable Long projectId, @PathVariable Long id) {
        testCaseService.archiveSuite(projectId, actorId(auth), id);
    }
}

