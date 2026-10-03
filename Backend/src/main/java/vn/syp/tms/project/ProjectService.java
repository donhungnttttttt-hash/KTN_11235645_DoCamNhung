package vn.syp.tms.project;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.identity.IdentityUser;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final MembershipRepository membershipRepository;
    private final IdentityService identityService;
    private final ProjectAudit audit;
    private final vn.syp.tms.identity.IdentityUserRepository users;

    public ProjectService(ProjectRepository projectRepository, MembershipRepository membershipRepository, IdentityService identityService, ProjectAudit audit, vn.syp.tms.identity.IdentityUserRepository users) {
        this.audit=audit; this.users=users;
        this.projectRepository = projectRepository;
        this.membershipRepository = membershipRepository;
        this.identityService = identityService;
    }

    public List<ProjectDtos.ProjectSummary> list(String userId) {
        List<ProjectMembership> memberships = membershipRepository.findByUserIdAndActiveTrue(userId);
        return memberships.stream()
                .map(m -> projectRepository.findById(java.util.Objects.requireNonNull(m.getProjectId())).orElse(null))
                .filter(p -> p != null)
                .map(p -> new ProjectDtos.ProjectSummary(p.getId(), p.getCode(), p.getName(), p.getDescription(), p.getTimezone(), p.getArchivedAt() != null, p.getLockVersion(), membershipRepository.findByProjectIdAndUserId(p.getId(), userId).getProjectRole()))
                .collect(Collectors.toList());
    }

    public ProjectDtos.ProjectDetail get(Long projectId, String userId) {
        requireMembership(projectId, userId);
        Project p = projectRepository.findById(java.util.Objects.requireNonNull(projectId)).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dự án."));
        long count = membershipRepository.findByProjectIdAndActiveTrue(projectId).size();
        return new ProjectDtos.ProjectDetail(p.getId(), p.getCode(), p.getName(), p.getDescription(), p.getTimezone(), p.getArchivedAt() != null, p.getLockVersion(), count, p.getCreatedAt(), p.getCreatedBy(), p.getUpdatedAt(), p.getUpdatedBy());
    }

    public ProjectDtos.ProjectSummary create(String actorId, ProjectDtos.CreateProject input) {
        if (!identityService.isAdmin(actorId)) {
            throw new BusinessException(403, "FORBIDDEN", "Cần quyền Quản lý dự án hoặc Quản trị viên");
        }
        ProjectTimezone.validate(input.timezone());
        if (projectRepository.existsByCode(input.code())) {
            throw new BusinessException(400, "DUPLICATE_CODE", "Mã dự án đã tồn tại");
        }
        Project project = new Project(input.code(), input.name(), input.description(), input.timezone(), actorId);
        project.setUpdatedBy(actorId);
        projectRepository.saveAndFlush(project);
        
        ProjectMembership pm = new ProjectMembership(project.getId(), actorId, "PM");
        membershipRepository.saveAndFlush(pm);
        audit.record(project.getId(),actorId,"PROJECT",project.getId(),"CREATE");
        
        return new ProjectDtos.ProjectSummary(project.getId(), project.getCode(), project.getName(), project.getDescription(), project.getTimezone(), false, project.getLockVersion(), "PM");
    }

    public ProjectDtos.ProjectSummary update(Long projectId, String actorId, ProjectDtos.UpdateProject input) {
        lockWritableProject(projectId, actorId);
        Project p = projectRepository.findById(java.util.Objects.requireNonNull(projectId)).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dự án."));
        if (p.getLockVersion() != input.expectedVersion()) {
            throw new BusinessException(409, "CONFLICT", "Dữ liệu đã bị thay đổi bởi người khác");
        }
        if (input.name() != null) p.setName(input.name());
        if (input.description() != null) p.setDescription(input.description());
        if (input.timezone() != null) {
            ProjectTimezone.validate(input.timezone());
            p.setTimezone(input.timezone());
        }
        p.setUpdatedBy(actorId);
        projectRepository.saveAndFlush(p);
        audit.record(projectId,actorId,"PROJECT",projectId,"UPDATE");
        return new ProjectDtos.ProjectSummary(p.getId(), p.getCode(), p.getName(), p.getDescription(), p.getTimezone(), p.getArchivedAt() != null, p.getLockVersion(), membershipRepository.findByProjectIdAndUserId(projectId, actorId).getProjectRole());
    }

    public ProjectDtos.MemberInfo addOrUpdateMember(Long projectId, String actorId, String targetUserId, ProjectDtos.SetMember input) {
        lockWritableProject(projectId, actorId);
        if (!List.of("PM", "TESTER", "MEMBER").contains(input.projectRole())) {
            throw new BusinessException(422, "INVALID_ROLE", "Vai trò dự án không hợp lệ.");
        }
        
        IdentityUser targetUser = users.findById(java.util.Objects.requireNonNull(targetUserId)).filter(account -> account.isEnabled()).orElseThrow(() -> new BusinessException(422,"INVALID_MEMBER","Tài khoản không tồn tại hoặc đã bị khóa."));
        
        ProjectMembership m = membershipRepository.findByProjectIdAndUserId(projectId, targetUserId);
        if (m == null) {
            if(input.expectedVersion()!=null) throw new BusinessException(409,"VERSION_CONFLICT","Thành viên chưa tồn tại.");
            m = new ProjectMembership(projectId, targetUserId, input.projectRole());
        } else {
            SettingsVersion.require(m.getVersion(),input.expectedVersion());
            if (!"PM".equals(input.projectRole())) protectLastPm(projectId, m);
            m.setProjectRole(input.projectRole());
            m.setActive(true);
        }
        membershipRepository.saveAndFlush(m);
        audit.record(projectId,actorId,"MEMBERSHIP",m.getId(),"SET_ROLE");
        return new ProjectDtos.MemberInfo(m.getId(), m.getUserId(), targetUser.getUsername(), targetUser.getDisplayName(), targetUser.getRole(), m.getProjectRole(), true, m.getVersion());
    }

    public void removeMember(Long projectId, String actorId, String targetUserId, Long expectedVersion) {
        lockWritableProject(projectId, actorId);
        ProjectMembership m = membershipRepository.findByProjectIdAndUserId(projectId, targetUserId);
        if (m != null) {
            SettingsVersion.require(m.getVersion(),expectedVersion);
            protectLastPm(projectId, m);
            m.setActive(false);
            membershipRepository.saveAndFlush(m);
            audit.record(projectId,actorId,"MEMBERSHIP",m.getId(),"REMOVE");
        }
    }

    public List<ProjectDtos.MemberInfo> listMembers(Long projectId, String userId) {
        requireMembership(projectId, userId);
        return membershipRepository.findByProjectIdAndActiveTrue(projectId).stream()
            .map(m -> {
                try {
                    IdentityUser u = users.findById(java.util.Objects.requireNonNull(m.getUserId())).orElseThrow();
                    return new ProjectDtos.MemberInfo(m.getId(), m.getUserId(), u.getUsername(), u.getDisplayName(), u.getRole(), m.getProjectRole(), m.isActive(), m.getVersion());
                } catch (java.util.NoSuchElementException e) {
                    return new ProjectDtos.MemberInfo(m.getId(), m.getUserId(), "unavailable", "Tài khoản không còn khả dụng", "UNKNOWN", m.getProjectRole(), m.isActive(), m.getVersion());
                }
            })
            .collect(Collectors.toList());
    }

    public void requireMembership(Long projectId, String userId) {
        ProjectMembership m = membershipRepository.findByProjectIdAndUserId(projectId, userId);
        if (m == null || !m.isActive()) {
            throw new BusinessException(404, "NOT_FOUND", "Dự án không tồn tại hoặc bạn không có quyền truy cập");
        }
    }

    public void requirePmOrAdmin(Long projectId, String userId) {
        requireMembership(projectId, userId);
        ProjectMembership m = membershipRepository.findByProjectIdAndUserId(projectId, userId);
        boolean isPm = m != null && m.isActive() && "PM".equals(m.getProjectRole());
        boolean isAdmin = identityService.isAdmin(userId);
        if (!isPm && !isAdmin) {
            throw new BusinessException(403, "FORBIDDEN", "Cần quyền Quản lý dự án hoặc Quản trị viên");
        }
        if (projectRepository.findById(java.util.Objects.requireNonNull(projectId)).orElseThrow().getArchivedAt() != null) {
            throw new BusinessException(409, "ARCHIVED", "Dự án đã được lưu trữ.");
        }
    }

    public void lockWritableProject(Long projectId, String userId) {
        projectRepository.lockById(projectId).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dự án."));
        requirePmOrAdmin(projectId, userId);
    }

    private void protectLastPm(Long projectId, ProjectMembership member) {
        if (member.isActive() && "PM".equals(member.getProjectRole()) &&
                membershipRepository.findByProjectIdAndActiveTrue(projectId).stream().filter(m -> "PM".equals(m.getProjectRole())).count() <= 1) {
            throw new BusinessException(409, "LAST_PM", "Dự án cần ít nhất một PM đang hoạt động.");
        }
    }

    public void requireProjectPm(Long projectId, String userId) {
        requireMembership(projectId, userId);
        if (!"PM".equals(membershipRepository.findByProjectIdAndUserId(projectId, userId).getProjectRole())) {
            throw new BusinessException(403, "PROJECT_PM_REQUIRED", "Chỉ PM của dự án được phê duyệt phiên bản test case.");
        }
    }

    public ProjectDtos.MemberCandidate candidate(Long projectId,String actorId,String username) {
        requirePmOrAdmin(projectId,actorId);
        if(username==null || !username.matches("[A-Za-z0-9._-]{3,64}")) throw new BusinessException(422,"INVALID_USERNAME","Nhập chính xác tên đăng nhập.");
        var user=users.findByUsername(IdentityService.normalize(username)).filter(account -> account.isEnabled())
            .orElseThrow(()->new BusinessException(404,"NOT_FOUND","Không tìm thấy tài khoản đang hoạt động."));
        var member=membershipRepository.findByProjectIdAndUserId(projectId,user.getId());
        return new ProjectDtos.MemberCandidate(user.getId(),user.getUsername(),user.getDisplayName(),member==null?null:member.getVersion());
    }
}
