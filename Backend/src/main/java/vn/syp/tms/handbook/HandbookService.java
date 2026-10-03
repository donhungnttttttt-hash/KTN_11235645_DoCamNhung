package vn.syp.tms.handbook;

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
public class HandbookService {
    private final ResourceRepository resourceRepo;
    private final RevisionRepository revisionRepo;
    private final ProjectService projectService;
    private final MembershipRepository membershipRepo;
    private final vn.syp.tms.project.ProjectAudit audit;

    public HandbookService(ResourceRepository resourceRepo, RevisionRepository revisionRepo, ProjectService projectService, MembershipRepository membershipRepo, vn.syp.tms.project.ProjectAudit audit) {
        this.audit=audit;
        this.resourceRepo = resourceRepo;
        this.revisionRepo = revisionRepo;
        this.projectService = projectService;
        this.membershipRepo = membershipRepo;
    }

    private Long getMembershipId(Long projectId, String userId) {
        ProjectMembership m = membershipRepo.findByProjectIdAndUserId(projectId, userId);
        if (m == null || !m.isActive()) throw new BusinessException(403, "FORBIDDEN", "Không có quyền thực hiện thao tác");
        return m.getId();
    }

    private HandbookDtos.RevisionDto mapRevision(ResourceRevision r) {
        if (r == null) return null;
        return new HandbookDtos.RevisionDto(r.getId(), r.getRevisionNo(), r.getContentHtml(), r.getVisibility(), r.getEditedBy(), r.getPublishedAt(), r.getCreatedAt());
    }

    public List<HandbookDtos.ResourceDto> listResources(Long projectId, String userId) {
        projectService.requireMembership(projectId, userId);
        return resourceRepo.findByProjectId(projectId).stream()
                .map(r -> {
                    ResourceRevision current = r.getCurrentRevisionId() == null ? null : revisionRepo.findById(java.util.Objects.requireNonNull(r.getCurrentRevisionId())).orElse(null);
                    return new HandbookDtos.ResourceDto(r.getId(), r.getCode(), r.getResourceType(), r.getName(), mapRevision(current), r.getArchivedAt() != null);
                })
                .collect(Collectors.toList());
    }

    public HandbookDtos.ResourceDetailDto getResource(Long projectId, String userId, Long resourceId) {
        projectService.requireMembership(projectId, userId);
        ProjectResource r = resourceRepo.findByProjectIdAndId(projectId, resourceId).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy"));
        ResourceRevision current = r.getCurrentRevisionId() == null ? null : revisionRepo.findById(java.util.Objects.requireNonNull(r.getCurrentRevisionId())).orElse(null);
        List<HandbookDtos.RevisionDto> history = revisionRepo.findByProjectIdAndResourceId(projectId, resourceId).stream().sorted(java.util.Comparator.comparing((ResourceRevision revision) -> revision.getRevisionNo()).reversed()).map(this::mapRevision).collect(Collectors.toList());
        return new HandbookDtos.ResourceDetailDto(r.getId(), r.getCode(), r.getResourceType(), r.getName(), mapRevision(current), r.getArchivedAt() != null, history);
    }

    public HandbookDtos.ResourceDto createResource(Long projectId, String userId, HandbookDtos.CreateResource input) {
        projectService.lockWritableProject(projectId, userId);
        if (resourceRepo.existsByProjectIdAndCode(projectId, input.code())) throw new BusinessException(409, "DUPLICATE_CODE", "Mã đã tồn tại");
        
        Long membershipId = getMembershipId(projectId, userId);
        
        ProjectResource r = new ProjectResource();
        r.setProjectId(projectId);
        r.setCode(input.code());
        r.setResourceType(input.resourceType());
        r.setName(input.name());
        resourceRepo.save(r);
        
        ResourceRevision rev = new ResourceRevision();
        rev.setProjectId(projectId);
        rev.setResourceId(r.getId());
        rev.setRevisionNo(1);
        rev.setContentHtml(input.contentHtml());
        rev.setVisibility(input.visibility() == null ? "INTERNAL" : input.visibility());
        rev.setEditedBy(membershipId);
        rev.setPublishedAt(Instant.now());
        revisionRepo.saveAndFlush(rev);
        audit.record(projectId,userId,"RESOURCE_REVISION",rev.getId(),"CREATE");
        
        r.setCurrentRevisionId(rev.getId());
        resourceRepo.save(r);
        
        return new HandbookDtos.ResourceDto(r.getId(), r.getCode(), r.getResourceType(), r.getName(), mapRevision(rev), false);
    }

    public HandbookDtos.ResourceDto addRevision(Long projectId, String userId, Long resourceId, HandbookDtos.CreateRevision input) {
        projectService.lockWritableProject(projectId, userId);
        ProjectResource r = resourceRepo.findByProjectIdAndId(projectId, resourceId).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy"));
        
        vn.syp.tms.project.SettingsVersion.require(r.getCurrentRevisionId(),input.expectedCurrentRevisionId());
        if(r.getArchivedAt()!=null) throw new BusinessException(409,"ARCHIVED","Tài liệu đã lưu trữ.");
        Long membershipId = getMembershipId(projectId, userId);
        int nextNo = revisionRepo.countByProjectIdAndResourceId(projectId, resourceId) + 1;
        
        ResourceRevision rev = new ResourceRevision();
        rev.setProjectId(projectId);
        rev.setResourceId(r.getId());
        rev.setRevisionNo(nextNo);
        rev.setContentHtml(input.contentHtml());
        rev.setVisibility(input.visibility() == null ? "INTERNAL" : input.visibility());
        rev.setEditedBy(membershipId);
        rev.setPublishedAt(Instant.now());
        revisionRepo.saveAndFlush(rev);
        audit.record(projectId,userId,"RESOURCE_REVISION",rev.getId(),"CREATE");
        
        r.setCurrentRevisionId(rev.getId());
        resourceRepo.save(r);
        
        return new HandbookDtos.ResourceDto(r.getId(), r.getCode(), r.getResourceType(), r.getName(), mapRevision(rev), r.getArchivedAt() != null);
    }
}
