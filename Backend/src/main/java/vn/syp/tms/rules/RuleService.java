package vn.syp.tms.rules;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.project.MembershipRepository;
import vn.syp.tms.project.ProjectMembership;
import vn.syp.tms.shared.web.BusinessException;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class RuleService {
    private final RulesetRepository rulesetRepo;
    private final RuleVersionRepository versionRepo;
    private final ProjectService projectService;
    private final MembershipRepository membershipRepo;
    private final InternalRulePolicy policy;
    private final vn.syp.tms.project.ProjectAudit audit;

    public RuleService(RulesetRepository rulesetRepo, RuleVersionRepository versionRepo, ProjectService projectService, MembershipRepository membershipRepo, InternalRulePolicy policy, vn.syp.tms.project.ProjectAudit audit) {
        this.policy=policy; this.audit=audit;
        this.rulesetRepo = rulesetRepo;
        this.versionRepo = versionRepo;
        this.projectService = projectService;
        this.membershipRepo = membershipRepo;
    }

    private Long getMembershipId(Long projectId, String userId) {
        ProjectMembership m = membershipRepo.findByProjectIdAndUserId(projectId, userId);
        if (m == null || !m.isActive()) throw new BusinessException(403, "FORBIDDEN", "Không có quyền thực hiện thao tác");
        return m.getId();
    }

    private RuleDtos.RuleVersionDto mapVersion(RuleVersion v) {
        if (v == null) return null;
        return new RuleDtos.RuleVersionDto(v.getId(), v.getVersionNo(), v.getContentJson(), v.getPublishedAt(), v.getPublishedBy(), v.getCreatedAt(), v.getCreatedBy());
    }

    public List<RuleDtos.RulesetDto> listRulesets(Long projectId, String userId) {
        projectService.requireReadAccess(projectId, userId);
        return rulesetRepo.findByProjectId(projectId).stream()
                .map(r -> {
                    RuleVersion activeVersion = r.getActiveVersionId() == null ? null : versionRepo.findById(java.util.Objects.requireNonNull(r.getActiveVersionId())).orElse(null);
                    return new RuleDtos.RulesetDto(r.getId(), r.getCode(), r.getName(), r.isActive(), mapVersion(activeVersion));
                })
                .collect(Collectors.toList());
    }

    public RuleDtos.RulesetDto createRuleset(Long projectId, String userId, RuleDtos.CreateRuleset input) {
        projectService.lockWritableProject(projectId, userId);
        if (!"INTERNAL_DEMO".equals(input.code())) throw new BusinessException(422,"INTERNAL_RULE_ONLY","Chưa có bộ quy tắc khách hàng được xác nhận; dùng mã INTERNAL_DEMO.");
        if (rulesetRepo.existsByProjectIdAndCode(projectId, input.code())) throw new BusinessException(409, "DUPLICATE_CODE", "Mã đã tồn tại");
        Ruleset r = new Ruleset();
        r.setProjectId(projectId);
        r.setCode(input.code());
        r.setName(input.name());
        r.setActive(true);
        rulesetRepo.saveAndFlush(r);
        audit.record(projectId,userId,"RULESET",r.getId(),"CREATE");
        return new RuleDtos.RulesetDto(r.getId(), r.getCode(), r.getName(), r.isActive(), null);
    }

    public RuleDtos.RuleVersionDto createDraftVersion(Long projectId, String userId, Long rulesetId, RuleDtos.CreateRuleVersion input) {
        projectService.lockWritableProject(projectId, userId);
        rulesetRepo.findByProjectIdAndId(projectId, rulesetId).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy"));
        
        policy.parse(input.contentJson());
        Long membershipId = getMembershipId(projectId, userId);
        int nextNo = versionRepo.countByProjectIdAndRulesetId(projectId, rulesetId) + 1;
        
        RuleVersion v = new RuleVersion();
        v.setProjectId(projectId);
        v.setRulesetId(rulesetId);
        v.setVersionNo(nextNo);
        v.setContentJson(input.contentJson());
        v.setCreatedBy(membershipId);
        versionRepo.saveAndFlush(v);
        audit.record(projectId,userId,"RULE_VERSION",v.getId(),"CREATE");
        return mapVersion(v);
    }

    public RuleDtos.RulesetDto publishVersion(Long projectId, String userId, Long rulesetId, Long versionId, RuleDtos.Publish input) {
        projectService.lockWritableProject(projectId, userId);
        Ruleset r = rulesetRepo.findByProjectIdAndId(projectId, rulesetId).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy"));
        RuleVersion v = versionRepo.findByProjectIdAndId(projectId, versionId).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy"));
        
        vn.syp.tms.project.SettingsVersion.require(r.getActiveVersionId()==null?0:r.getActiveVersionId(),input.expectedActiveVersionId());
        policy.parse(v.getContentJson());
        if (!v.getRulesetId().equals(rulesetId)) throw new BusinessException(400, "BAD_REQUEST", "Phiên bản không thuộc bộ quy tắc này");
        if (v.getPublishedAt() != null) throw new BusinessException(400, "BAD_REQUEST", "Phiên bản đã được xuất bản");
        
        Long membershipId = getMembershipId(projectId, userId);
        v.setPublishedAt(Instant.now());
        v.setPublishedBy(membershipId);
        versionRepo.save(v);
        
        r.setActiveVersionId(v.getId());
        rulesetRepo.saveAndFlush(r);
        audit.record(projectId,userId,"RULE_VERSION",v.getId(),"PUBLISH");
        return new RuleDtos.RulesetDto(r.getId(), r.getCode(), r.getName(), r.isActive(), mapVersion(v));
    }

    public List<RuleDtos.RuleVersionDto> versions(Long projectId,String userId,Long rulesetId) {
        projectService.requireReadAccess(projectId,userId);
        rulesetRepo.findByProjectIdAndId(projectId,rulesetId).orElseThrow(()->new BusinessException(404,"NOT_FOUND","Không tìm thấy bộ quy tắc."));
        return versionRepo.findByProjectIdAndRulesetId(projectId,rulesetId).stream().sorted(java.util.Comparator.comparing((RuleVersion version) -> version.getVersionNo()).reversed()).map(this::mapVersion).toList();
    }

    /** Called only after the work-item service locks and authorizes the project. */
    public Long applicableVersion(Long projectId,String title) {
        var rule=rulesetRepo.findByProjectId(projectId).stream().filter(r->r.isActive() && "INTERNAL_DEMO".equals(r.getCode())).findFirst().orElse(null);
        Long id=rule==null?null:rule.getActiveVersionId();
        validateTitle(projectId,id,title);
        return id;
    }

    public String titlePrefix(Long projectId) {
        var rule=rulesetRepo.findByProjectId(projectId).stream().filter(r->r.isActive() && "INTERNAL_DEMO".equals(r.getCode())).findFirst().orElse(null);
        if(rule==null || rule.getActiveVersionId()==null)return "";
        return policy.parse(versionRepo.findByProjectIdAndId(projectId,rule.getActiveVersionId()).orElseThrow().getContentJson()).titlePrefix();
    }

    public void validateTitle(Long projectId,Long versionId,String title) {
        if(versionId==null)return;
        var version=versionRepo.findByProjectIdAndId(projectId,versionId).orElseThrow(()->new BusinessException(409,"RULE_UNAVAILABLE","Không tìm thấy phiên bản quy tắc đã áp dụng."));
        var content=policy.parse(version.getContentJson());
        if(title==null || !title.strip().startsWith(content.titlePrefix().strip()))
            throw new BusinessException(422,"TITLE_PREFIX_REQUIRED","Tiêu đề cần bắt đầu bằng: "+content.titlePrefix());
    }
}
