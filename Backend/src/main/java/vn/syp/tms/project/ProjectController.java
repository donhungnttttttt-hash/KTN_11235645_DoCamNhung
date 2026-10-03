package vn.syp.tms.project;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import java.util.List;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {
    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    private String actorId(Authentication auth) {
        return ((SessionPrincipal) auth.getPrincipal()).id();
    }

    @GetMapping
    public List<ProjectDtos.ProjectSummary> list(Authentication auth) {
        return projectService.list(actorId(auth));
    }

    @PostMapping
    public ProjectDtos.ProjectSummary create(Authentication auth, @Valid @RequestBody ProjectDtos.CreateProject input) {
        return projectService.create(actorId(auth), input);
    }

    @GetMapping("/{projectId}")
    public ProjectDtos.ProjectDetail get(Authentication auth, @PathVariable Long projectId) {
        return projectService.get(projectId, actorId(auth));
    }

    @PatchMapping("/{projectId}")
    public ProjectDtos.ProjectSummary update(Authentication auth, @PathVariable Long projectId, @Valid @RequestBody ProjectDtos.UpdateProject input) {
        return projectService.update(projectId, actorId(auth), input);
    }

    @GetMapping("/{projectId}/members")
    public List<ProjectDtos.MemberInfo> listMembers(Authentication auth, @PathVariable Long projectId) {
        return projectService.listMembers(projectId, actorId(auth));
    }

    @GetMapping("/{projectId}/member-candidate")
    public ProjectDtos.MemberCandidate candidate(Authentication auth,@PathVariable Long projectId,@RequestParam String username) {
        return projectService.candidate(projectId,actorId(auth),username);
    }

    @PutMapping("/{projectId}/members/{userId}")
    public ProjectDtos.MemberInfo addOrUpdateMember(Authentication auth, @PathVariable Long projectId, @PathVariable String userId, @Valid @RequestBody ProjectDtos.SetMember input) {
        return projectService.addOrUpdateMember(projectId, actorId(auth), userId, input);
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void removeMember(Authentication auth, @PathVariable Long projectId, @PathVariable String userId, @RequestParam Long expectedVersion) {
        projectService.removeMember(projectId, actorId(auth), userId, expectedVersion);
    }
}
