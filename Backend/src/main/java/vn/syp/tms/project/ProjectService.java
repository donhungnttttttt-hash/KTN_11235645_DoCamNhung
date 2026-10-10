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
        boolean admin = "ADMIN".equals(identityService.current(userId).getRole());
        var roles = membershipRepository.findByUserIdAndActiveTrue(userId).stream()
                .collect(Collectors.toMap(ProjectMembership::getProjectId, ProjectMembership::getProjectRole));
        var visible = admin ? projectRepository.findAll(org.springframework.data.domain.Sort.by("id"))
                : projectRepository.findAllById(roles.keySet()).stream()
                    .sorted(java.util.Comparator.comparing(Project::getId)).toList();
        return visible.stream().map(p -> new ProjectDtos.ProjectSummary(p.getId(), p.getCode(), p.getName(),
                p.getDescription(), p.getTimezone(), p.getArchivedAt() != null, p.getLockVersion(), roles.get(p.getId())))
                .toList();
    }

    public ProjectDtos.ProjectDetail get(Long projectId, String userId) {
        requireReadAccess(projectId, userId);
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
        requireAdmin(actorId);
        var targetUser = lockMemberAccount(targetUserId);
        lockAdminProject(projectId, actorId);
        if (!List.of("PM", "TESTER", "DEV", "MEMBER").contains(input.projectRole())) {
            throw new BusinessException(422, "INVALID_ROLE", "Vai trò dự án không hợp lệ.");
        }
        
        if("DEV".equals(targetUser.getRole()) && !"DEV".equals(input.projectRole()))
            throw new BusinessException(422,"INVALID_ROLE","Tài khoản Dev chỉ được giao vai trò Dev.");
        if(!"DEV".equals(targetUser.getRole()) && "DEV".equals(input.projectRole()))
            throw new BusinessException(422,"INVALID_ROLE","Vai trò Dev cần tài khoản có quyền Dev để nhận và xử lý bug/QA.");
        
        var current = membershipRepository.lockMember(projectId,targetUserId);
        Long memberId;
        long version;
        if (current == null) {
            if(input.expectedVersion()!=null) throw new BusinessException(409,"VERSION_CONFLICT","Thành viên chưa tồn tại.");
            var member=membershipRepository.saveAndFlush(new ProjectMembership(projectId,targetUserId,input.projectRole()));
            memberId=member.getId();version=member.getVersion();
        } else {
            SettingsVersion.require(current.getVersion(),input.expectedVersion());
            if (!"PM".equals(input.projectRole())) protectLastPm(projectId,current);
            updateMember(current,input.projectRole(),true);
            memberId=current.getId();version=current.getVersion()+1;
        }
        audit.record(projectId,actorId,"MEMBERSHIP",memberId,"SET_ROLE");
        return new ProjectDtos.MemberInfo(memberId,targetUserId,targetUser.getUsername(),targetUser.getDisplayName(),targetUser.getRole(),input.projectRole(),true,version);
    }

    public void removeMember(Long projectId, String actorId, String targetUserId, Long expectedVersion) {
        lockAdminProject(projectId, actorId);
        var member=membershipRepository.lockMember(projectId,targetUserId);
        if (member != null) {
            SettingsVersion.require(member.getVersion(),expectedVersion);
            protectLastPm(projectId,member);
            updateMember(member,member.getProjectRole(),false);
            audit.record(projectId,actorId,"MEMBERSHIP",member.getId(),"REMOVE");
        }
    }

    private void updateMember(MembershipRepository.CurrentMember member,String role,boolean active) {
        if(membershipRepository.updateCurrent(member.getId(),role,active,member.getVersion())!=1)
            throw new BusinessException(409,"VERSION_CONFLICT","Thành viên đã thay đổi.");
    }

    public vn.syp.tms.identity.IdentityUserRepository.CurrentAccount lockMemberAccount(String userId) {
        return users.lockAccount(userId).filter(account -> account.getEnabled())
            .orElseThrow(() -> new BusinessException(422,"INVALID_MEMBER","Tài khoản không tồn tại hoặc đã bị khóa."));
    }

    public List<ProjectDtos.MemberInfo> listMembers(Long projectId, String userId) {
        requireReadAccess(projectId, userId);
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

    /** Global ADMIN can inspect every existing project without acquiring a project role. */
    public void requireReadAccess(Long projectId, String userId) {
        if ("ADMIN".equals(identityService.current(userId).getRole())) {
            if (!projectRepository.existsById(java.util.Objects.requireNonNull(projectId)))
                throw new BusinessException(404, "NOT_FOUND", "Không tìm thấy dự án.");
        } else requireMembership(projectId, userId);
    }

    public void requireMembership(Long projectId, String userId) {
        ProjectMembership m = membershipRepository.findByProjectIdAndUserId(projectId, userId);
        if (m == null || !m.isActive()) {
            throw new BusinessException(404, "NOT_FOUND", "Dự án không tồn tại hoặc bạn không có quyền truy cập");
        }
    }

    public void requirePmOrAdmin(Long projectId, String userId) {
        requirePmOrAdminRole(projectId,userId);
        if (projectRepository.findById(java.util.Objects.requireNonNull(projectId)).orElseThrow().getArchivedAt() != null) {
            throw new BusinessException(409, "ARCHIVED", "Dự án đã được lưu trữ.");
        }
    }

    private void requirePmOrAdminRole(Long projectId,String userId) {
        requireNotDev(projectId,userId);
        requireMembership(projectId, userId);
        ProjectMembership m = membershipRepository.findByProjectIdAndUserId(projectId, userId);
        boolean isPm = m != null && m.isActive() && "PM".equals(m.getProjectRole());
        boolean isAdmin = identityService.isAdmin(userId);
        if (!isPm && !isAdmin) {
            throw new BusinessException(403, "FORBIDDEN", "Cần quyền Quản lý dự án hoặc Quản trị viên");
        }
    }

    public void lockWritableProject(Long projectId, String userId) {
        // Locking an already managed JPA entity may retain stale archive state or raise an
        // unrelated optimistic conflict. Read the current scalar state before checking rights.
        var current=projectRepository.lockAdminState(projectId).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dự án."));
        requirePmOrAdminRole(projectId,userId);
        if(current.getArchived()) throw new BusinessException(409,"ARCHIVED","Dự án đã được lưu trữ.");
    }

    private void protectLastPm(Long projectId,MembershipRepository.CurrentMember member) {
        if(member.getActive() && "PM".equals(member.getProjectRole())) {
            var enabled=membershipRepository.lockEnabledPmUsers(projectId);
            if(enabled.contains(member.getUserId()) && enabled.size()<=1)
                throw new BusinessException(409,"LAST_PM","Dự án cần ít nhất một PM đang hoạt động.");
        }
    }

    public void requireProjectPm(Long projectId, String userId) {
        requireNotDev(projectId,userId);
        requireMembership(projectId, userId);
        if (!"PM".equals(membershipRepository.findByProjectIdAndUserId(projectId, userId).getProjectRole())) {
            throw new BusinessException(403, "PROJECT_PM_REQUIRED", "Chỉ PM của dự án được phê duyệt phiên bản test case.");
        }
    }

    public ProjectDtos.MemberCandidate candidate(Long projectId,String actorId,String username) {
        lockAdminProject(projectId,actorId);
        if(username==null || !username.matches("[A-Za-z0-9._-]{3,64}")) throw new BusinessException(422,"INVALID_USERNAME","Nhập chính xác tên đăng nhập.");
        var user=users.findByUsername(IdentityService.normalize(username)).filter(account -> account.isEnabled())
            .orElseThrow(()->new BusinessException(404,"NOT_FOUND","Không tìm thấy tài khoản đang hoạt động."));
        var member=membershipRepository.findByProjectIdAndUserId(projectId,user.getId());
        return new ProjectDtos.MemberCandidate(user.getId(),user.getUsername(),user.getDisplayName(),member==null?null:member.getVersion());
    }

    public void requireNotDev(Long projectId,String actor) {
        var member=membershipRepository.findByProjectIdAndUserId(projectId,actor);
        if ("DEV".equals(identityService.current(actor).getRole()) || member!=null && "DEV".equals(member.getProjectRole()))
            throw new BusinessException(403,"DEV_READ_ONLY_RESULTS","Dev không được ghi kết quả kiểm thử.");
    }
    public void lockAdminProject(Long projectId,String actor) {
        requireAdmin(actor);
        var project=projectRepository.lockAdminState(projectId).orElseThrow(()->new BusinessException(404,"NOT_FOUND","Không tìm thấy dự án."));
        if(project.getArchived()) throw new BusinessException(409,"ARCHIVED","Dự án đã được lưu trữ.");
    }
    public void requireAdmin(String actor) {
        if (!"ADMIN".equals(identityService.lockCurrent(actor).getRole()))
            throw new BusinessException(403,"ADMIN_REQUIRED","Chỉ ADMIN được quản lý thành viên dự án.");
    }
}
