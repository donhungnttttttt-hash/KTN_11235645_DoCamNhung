package vn.syp.tms.rules;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import java.util.List;
import vn.syp.tms.identity.SessionPrincipal;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/bug-rule-versions")
public class RuleController {
    private final RuleService ruleService;

    public RuleController(RuleService ruleService) {
        this.ruleService = ruleService;
    }

    private String actorId(Authentication auth) {
        return ((SessionPrincipal) auth.getPrincipal()).id();
    }

    @GetMapping
    public List<RuleDtos.RulesetDto> list(Authentication auth, @PathVariable Long projectId) {
        return ruleService.listRulesets(projectId, actorId(auth));
    }

    @PostMapping
    public RuleDtos.RulesetDto createRuleset(Authentication auth, @PathVariable Long projectId, @Valid @RequestBody RuleDtos.CreateRuleset input) {
        return ruleService.createRuleset(projectId, actorId(auth), input);
    }
    
    @PostMapping("/{rulesetId}/versions")
    public RuleDtos.RuleVersionDto createVersion(Authentication auth, @PathVariable Long projectId, @PathVariable Long rulesetId, @Valid @RequestBody RuleDtos.CreateRuleVersion input) {
        return ruleService.createDraftVersion(projectId, actorId(auth), rulesetId, input);
    }

    @GetMapping("/{rulesetId}/versions")
    public List<RuleDtos.RuleVersionDto> versions(Authentication auth,@PathVariable Long projectId,@PathVariable Long rulesetId) {
        return ruleService.versions(projectId,actorId(auth),rulesetId);
    }
    
    @PostMapping("/{rulesetId}/versions/{versionId}/publish")
    public RuleDtos.RulesetDto publishVersion(Authentication auth, @PathVariable Long projectId, @PathVariable Long rulesetId, @PathVariable Long versionId, @Valid @RequestBody RuleDtos.Publish input) {
        return ruleService.publishVersion(projectId, actorId(auth), rulesetId, versionId, input);
    }
}
