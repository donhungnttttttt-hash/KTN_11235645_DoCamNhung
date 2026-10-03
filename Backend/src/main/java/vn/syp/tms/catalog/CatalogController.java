package vn.syp.tms.catalog;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import java.util.List;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.shared.web.BusinessException;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/catalogs/{kind}")
public class CatalogController {
    private final CatalogService catalogService;
    private final CatalogInput input;

    public CatalogController(CatalogService catalogService, CatalogInput input) {
        this.catalogService = catalogService;
        this.input = input;
    }

    private String actorId(Authentication auth) {
        return ((SessionPrincipal) auth.getPrincipal()).id();
    }

    @GetMapping
    public List<?> list(Authentication auth, @PathVariable Long projectId, @PathVariable String kind) {
        String userId = actorId(auth);
        return switch (kind) {
            case "environments" -> catalogService.listEnvironments(projectId, userId);
            case "builds" -> catalogService.listBuilds(projectId, userId);
            case "devices" -> catalogService.listDevices(projectId, userId);
            case "categories" -> catalogService.listCategories(projectId, userId);
            case "milestones" -> catalogService.listMilestones(projectId, userId);
            default -> throw new BusinessException(404, "NOT_FOUND", "Loại danh mục không tồn tại");
        };
    }

    @PostMapping
    public Object create(Authentication auth, @PathVariable Long projectId, @PathVariable String kind, @RequestBody java.util.Map<String, Object> body) {
        String userId = actorId(auth);
        return switch (kind) {
            case "environments" -> catalogService.createEnvironment(projectId, userId, input.convert(body, CatalogDtos.CreateEnvironment.class));
            case "builds" -> catalogService.createBuild(projectId, userId, input.convert(body, CatalogDtos.CreateBuild.class));
            case "devices" -> catalogService.createDevice(projectId, userId, input.convert(body, CatalogDtos.CreateDevice.class));
            case "categories" -> catalogService.createCategory(projectId, userId, input.convert(body, CatalogDtos.CreateCategory.class));
            case "milestones" -> catalogService.createMilestone(projectId, userId, input.convert(body, CatalogDtos.CreateMilestone.class));
            default -> throw new BusinessException(404, "NOT_FOUND", "Loại danh mục không tồn tại");
        };
    }

    @PatchMapping("/{id}")
    public Object update(Authentication auth, @PathVariable Long projectId, @PathVariable String kind, @PathVariable Long id, @RequestBody java.util.Map<String, Object> body) {
        String userId = actorId(auth);
        return switch (kind) {
            case "environments" -> catalogService.updateEnvironment(projectId, userId, id, input.convert(body, CatalogDtos.UpdateEnvironment.class));
            case "builds" -> catalogService.updateBuild(projectId, userId, id, input.convert(body, CatalogDtos.UpdateBuild.class));
            case "devices" -> catalogService.updateDevice(projectId, userId, id, input.convert(body, CatalogDtos.UpdateDevice.class));
            case "categories" -> catalogService.updateCategory(projectId, userId, id, input.convert(body, CatalogDtos.UpdateCategory.class));
            case "milestones" -> catalogService.updateMilestone(projectId, userId, id, input.convert(body, CatalogDtos.UpdateMilestone.class));
            default -> throw new BusinessException(404, "NOT_FOUND", "Loại danh mục không tồn tại");
        };
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void archive(Authentication auth, @PathVariable Long projectId, @PathVariable String kind, @PathVariable Long id, @RequestParam Long expectedVersion) {
        String userId = actorId(auth);
        switch (kind) {
            case "environments" -> catalogService.archiveEnvironment(projectId, userId, id, expectedVersion);
            case "builds" -> catalogService.archiveBuild(projectId, userId, id, expectedVersion);
            case "devices" -> catalogService.archiveDevice(projectId, userId, id, expectedVersion);
            case "categories" -> catalogService.archiveCategory(projectId, userId, id, expectedVersion);
            case "milestones" -> catalogService.archiveMilestone(projectId, userId, id, expectedVersion);
            default -> throw new BusinessException(404, "NOT_FOUND", "Loại danh mục không tồn tại");
        }
    }
}
