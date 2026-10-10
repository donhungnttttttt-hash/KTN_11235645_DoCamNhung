package vn.syp.tms.catalog;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.shared.web.BusinessException;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CatalogService {
    private final CatalogRepositories.EnvironmentRepository environmentRepo;
    private final CatalogRepositories.BuildRepository buildRepo;
    private final CatalogRepositories.DeviceRepository deviceRepo;
    private final CatalogRepositories.CategoryRepository categoryRepo;
    private final CatalogRepositories.MilestoneRepository milestoneRepo;
    private final ProjectService projectService;
    private final vn.syp.tms.project.ProjectAudit audit;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public CatalogService(
            CatalogRepositories.EnvironmentRepository environmentRepo,
            CatalogRepositories.BuildRepository buildRepo,
            CatalogRepositories.DeviceRepository deviceRepo,
            CatalogRepositories.CategoryRepository categoryRepo,
            CatalogRepositories.MilestoneRepository milestoneRepo,
            ProjectService projectService, vn.syp.tms.project.ProjectAudit audit, org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.audit=audit; this.jdbc=jdbc;
        this.environmentRepo = environmentRepo;
        this.buildRepo = buildRepo;
        this.deviceRepo = deviceRepo;
        this.categoryRepo = categoryRepo;
        this.milestoneRepo = milestoneRepo;
        this.projectService = projectService;
    }

    // Environments
    public List<CatalogDtos.EnvironmentDto> listEnvironments(Long projectId, String userId) {
        projectService.requireReadAccess(projectId, userId);
        return environmentRepo.findByProjectId(projectId).stream()
                .map(e -> new CatalogDtos.EnvironmentDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.getDescription(), e.isActive(), e.getVersion()))
                .collect(Collectors.toList());
    }
    public CatalogDtos.EnvironmentDto createEnvironment(Long projectId, String userId, CatalogDtos.CreateEnvironment input) {
        projectService.lockWritableProject(projectId, userId);
        if (environmentRepo.existsByProjectIdAndCode(projectId, input.code())) throw new BusinessException(409, "DUPLICATE_CODE", "Mã đã tồn tại");
        CatalogEntities.Environment e = new CatalogEntities.Environment();
        e.setProjectId(projectId); e.setCode(input.code()); e.setName(input.name()); e.setDescription(input.description()); e.setActive(true);
        environmentRepo.saveAndFlush(e);
        audit.record(projectId,userId,"ENVIRONMENT",e.getId(),"CREATE");
        return new CatalogDtos.EnvironmentDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.getDescription(), e.isActive(), e.getVersion());
    }
    public CatalogDtos.EnvironmentDto updateEnvironment(Long projectId, String userId, Long id, CatalogDtos.UpdateEnvironment input) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Environment e = environmentRepo.findByProjectIdAndId(projectId, id).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dữ liệu"));
        vn.syp.tms.project.SettingsVersion.require(e.getVersion(), input.expectedVersion());
        if (input.name() != null) e.setName(input.name());
        if (input.description() != null) e.setDescription(input.description());
        if (input.active() != null) e.setActive(input.active());
        environmentRepo.saveAndFlush(e);
        audit.record(projectId,userId,"ENVIRONMENT",e.getId(),"UPDATE");
        return new CatalogDtos.EnvironmentDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.getDescription(), e.isActive(), e.getVersion());
    }
    public void archiveEnvironment(Long projectId, String userId, Long id, Long expectedVersion) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Environment e = environmentRepo.findByProjectIdAndId(projectId, id).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dữ liệu"));
        vn.syp.tms.project.SettingsVersion.require(e.getVersion(), expectedVersion);
        e.setActive(false);
        environmentRepo.saveAndFlush(e);
        audit.record(projectId,userId,"ENVIRONMENT",e.getId(),"ARCHIVE");
    }

    // Builds
    public List<CatalogDtos.BuildDto> listBuilds(Long projectId, String userId) {
        projectService.requireReadAccess(projectId, userId);
        return buildRepo.findByProjectId(projectId).stream()
                .filter(e -> e.getArchivedAt() == null)
                .map(e -> new CatalogDtos.BuildDto(e.getId(), e.getProjectId(), e.getVersionLabel(), e.getBuildNumber(), e.getPlatform(), e.getNotes(), e.getReleasedAt(), e.getVersion()))
                .collect(Collectors.toList());
    }
    public CatalogDtos.BuildDto createBuild(Long projectId, String userId, CatalogDtos.CreateBuild input) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Build e = new CatalogEntities.Build();
        e.setProjectId(projectId); e.setVersionLabel(input.versionLabel()); e.setBuildNumber(input.buildNumber()); e.setPlatform(input.platform()); e.setNotes(input.notes()); e.setReleasedAt(input.releasedAt());
        uniqueBuild(projectId,e);
        buildRepo.saveAndFlush(e);
        audit.record(projectId,userId,"BUILD",e.getId(),"CREATE");
        return new CatalogDtos.BuildDto(e.getId(), e.getProjectId(), e.getVersionLabel(), e.getBuildNumber(), e.getPlatform(), e.getNotes(), e.getReleasedAt(), e.getVersion());
    }
    public CatalogDtos.BuildDto updateBuild(Long projectId, String userId, Long id, CatalogDtos.UpdateBuild input) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Build e = buildRepo.findByProjectIdAndId(projectId, id).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dữ liệu"));
        vn.syp.tms.project.SettingsVersion.require(e.getVersion(), input.expectedVersion());
        if (e.getArchivedAt()!=null) throw new BusinessException(409,"ARCHIVED","Bản build đã lưu trữ.");
        if (input.versionLabel() != null) e.setVersionLabel(input.versionLabel());
        if (input.buildNumber() != null) e.setBuildNumber(input.buildNumber());
        if (input.platform() != null) e.setPlatform(input.platform());
        if (input.notes() != null) e.setNotes(input.notes());
        if (input.releasedAt() != null) e.setReleasedAt(input.releasedAt());
        if (input.clearDates()!=null && input.clearDates().contains("releasedAt")) e.setReleasedAt(null);
        uniqueBuild(projectId, e);
        buildRepo.saveAndFlush(e);
        audit.record(projectId,userId,"BUILD",e.getId(),"UPDATE");
        return new CatalogDtos.BuildDto(e.getId(), e.getProjectId(), e.getVersionLabel(), e.getBuildNumber(), e.getPlatform(), e.getNotes(), e.getReleasedAt(), e.getVersion());
    }
    public void archiveBuild(Long projectId, String userId, Long id, Long expectedVersion) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Build build = buildRepo.findByProjectIdAndId(projectId, id)
                .orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy bản dựng trong dự án."));
        vn.syp.tms.project.SettingsVersion.require(build.getVersion(), expectedVersion);
        if (build.getArchivedAt() == null) build.setArchivedAt(Instant.now());
        buildRepo.saveAndFlush(build);
        audit.record(projectId,userId,"BUILD",build.getId(),"ARCHIVE");
    }

    // Devices
    public List<CatalogDtos.DeviceDto> listDevices(Long projectId, String userId) {
        projectService.requireReadAccess(projectId, userId);
        return deviceRepo.findByProjectId(projectId).stream()
                .map(e -> new CatalogDtos.DeviceDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.getModel(), e.getOsName(), e.getOsVersion(), e.isActive(), e.getVersion()))
                .collect(Collectors.toList());
    }
    public CatalogDtos.DeviceDto createDevice(Long projectId, String userId, CatalogDtos.CreateDevice input) {
        projectService.lockWritableProject(projectId, userId);
        if (deviceRepo.existsByProjectIdAndCode(projectId, input.code())) throw new BusinessException(409, "DUPLICATE_CODE", "Mã đã tồn tại");
        CatalogEntities.Device e = new CatalogEntities.Device();
        e.setProjectId(projectId); e.setCode(input.code()); e.setName(input.name()); e.setModel(input.model()); e.setOsName(input.osName()); e.setOsVersion(input.osVersion()); e.setActive(true);
        deviceRepo.saveAndFlush(e);
        audit.record(projectId,userId,"DEVICE",e.getId(),"CREATE");
        return new CatalogDtos.DeviceDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.getModel(), e.getOsName(), e.getOsVersion(), e.isActive(), e.getVersion());
    }
    public CatalogDtos.DeviceDto updateDevice(Long projectId, String userId, Long id, CatalogDtos.UpdateDevice input) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Device e = deviceRepo.findByProjectIdAndId(projectId, id).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dữ liệu"));
        vn.syp.tms.project.SettingsVersion.require(e.getVersion(), input.expectedVersion());
        if (input.name() != null) e.setName(input.name());
        if (input.model() != null) e.setModel(input.model());
        if (input.osName() != null) e.setOsName(input.osName());
        if (input.osVersion() != null) e.setOsVersion(input.osVersion());
        if (input.active() != null) e.setActive(input.active());
        deviceRepo.saveAndFlush(e);
        audit.record(projectId,userId,"DEVICE",e.getId(),"UPDATE");
        return new CatalogDtos.DeviceDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.getModel(), e.getOsName(), e.getOsVersion(), e.isActive(), e.getVersion());
    }
    public void archiveDevice(Long projectId, String userId, Long id, Long expectedVersion) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Device e = deviceRepo.findByProjectIdAndId(projectId, id).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dữ liệu"));
        vn.syp.tms.project.SettingsVersion.require(e.getVersion(), expectedVersion);
        e.setActive(false);
        deviceRepo.saveAndFlush(e);
        audit.record(projectId,userId,"DEVICE",e.getId(),"ARCHIVE");
    }

    // Categories
    public List<CatalogDtos.CategoryDto> listCategories(Long projectId, String userId) {
        projectService.requireReadAccess(projectId, userId);
        return categoryRepo.findByProjectId(projectId).stream()
                .map(e -> new CatalogDtos.CategoryDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.isActive(), e.getVersion()))
                .collect(Collectors.toList());
    }
    public CatalogDtos.CategoryDto createCategory(Long projectId, String userId, CatalogDtos.CreateCategory input) {
        projectService.lockWritableProject(projectId, userId);
        if (categoryRepo.existsByProjectIdAndCode(projectId, input.code())) throw new BusinessException(409, "DUPLICATE_CODE", "Mã đã tồn tại");
        CatalogEntities.Category e = new CatalogEntities.Category();
        e.setProjectId(projectId); e.setCode(input.code()); e.setName(input.name()); e.setActive(true);
        categoryRepo.saveAndFlush(e);
        audit.record(projectId,userId,"CATEGORY",e.getId(),"CREATE");
        return new CatalogDtos.CategoryDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.isActive(), e.getVersion());
    }
    public CatalogDtos.CategoryDto updateCategory(Long projectId, String userId, Long id, CatalogDtos.UpdateCategory input) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Category e = categoryRepo.findByProjectIdAndId(projectId, id).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dữ liệu"));
        vn.syp.tms.project.SettingsVersion.require(e.getVersion(), input.expectedVersion());
        if (input.name() != null) e.setName(input.name());
        if (input.active() != null) e.setActive(input.active());
        categoryRepo.saveAndFlush(e);
        audit.record(projectId,userId,"CATEGORY",e.getId(),"UPDATE");
        return new CatalogDtos.CategoryDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.isActive(), e.getVersion());
    }
    public void archiveCategory(Long projectId, String userId, Long id, Long expectedVersion) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Category e = categoryRepo.findByProjectIdAndId(projectId, id).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dữ liệu"));
        vn.syp.tms.project.SettingsVersion.require(e.getVersion(), expectedVersion);
        e.setActive(false);
        categoryRepo.saveAndFlush(e);
        audit.record(projectId,userId,"CATEGORY",e.getId(),"ARCHIVE");
    }

    // Milestones
    public List<CatalogDtos.MilestoneDto> listMilestones(Long projectId, String userId) {
        projectService.requireReadAccess(projectId, userId);
        return milestoneRepo.findByProjectId(projectId).stream()
                .map(e -> new CatalogDtos.MilestoneDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.getStartsOn(), e.getDueOn(), e.getArchivedAt() != null, e.getVersion()))
                .collect(Collectors.toList());
    }
    public CatalogDtos.MilestoneDto createMilestone(Long projectId, String userId, CatalogDtos.CreateMilestone input) {
        projectService.lockWritableProject(projectId, userId);
        if (milestoneRepo.existsByProjectIdAndCode(projectId, input.code())) throw new BusinessException(409, "DUPLICATE_CODE", "Mã đã tồn tại");
        CatalogEntities.Milestone e = new CatalogEntities.Milestone();
        e.setProjectId(projectId); e.setCode(input.code()); e.setName(input.name()); e.setStartsOn(input.startsOn()); e.setDueOn(input.dueOn());
        validateDates(e.getStartsOn(),e.getDueOn());
        milestoneRepo.saveAndFlush(e);
        audit.record(projectId,userId,"MILESTONE",e.getId(),"CREATE");
        return new CatalogDtos.MilestoneDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.getStartsOn(), e.getDueOn(), e.getArchivedAt() != null, e.getVersion());
    }
    public CatalogDtos.MilestoneDto updateMilestone(Long projectId, String userId, Long id, CatalogDtos.UpdateMilestone input) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Milestone e = milestoneRepo.findByProjectIdAndId(projectId, id).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dữ liệu"));
        vn.syp.tms.project.SettingsVersion.require(e.getVersion(), input.expectedVersion());
        if (input.name() != null) e.setName(input.name());
        if (input.startsOn() != null) e.setStartsOn(input.startsOn());
        if (input.dueOn() != null) e.setDueOn(input.dueOn());
        if (input.clearDates()!=null) {
            if(input.clearDates().contains("startsOn"))e.setStartsOn(null);
            if(input.clearDates().contains("dueOn"))e.setDueOn(null);
        }
        if (input.archived() != null) {
            e.setArchivedAt(input.archived() ? (e.getArchivedAt() == null ? Instant.now() : e.getArchivedAt()) : null);
        }
        validateDates(e.getStartsOn(), e.getDueOn());
        milestoneRepo.saveAndFlush(e);
        audit.record(projectId,userId,"MILESTONE",e.getId(),"UPDATE");
        return new CatalogDtos.MilestoneDto(e.getId(), e.getProjectId(), e.getCode(), e.getName(), e.getStartsOn(), e.getDueOn(), e.getArchivedAt() != null, e.getVersion());
    }
    public void archiveMilestone(Long projectId, String userId, Long id, Long expectedVersion) {
        projectService.lockWritableProject(projectId, userId);
        CatalogEntities.Milestone e = milestoneRepo.findByProjectIdAndId(projectId, id).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy dữ liệu"));
        vn.syp.tms.project.SettingsVersion.require(e.getVersion(), expectedVersion);
        e.setArchivedAt(Instant.now());
        milestoneRepo.saveAndFlush(e);
        audit.record(projectId,userId,"MILESTONE",e.getId(),"ARCHIVE");
    }

    private void validateDates(java.time.LocalDate start,java.time.LocalDate due) {
        if(start!=null && due!=null && due.isBefore(start)) throw new BusinessException(422,"INVALID_DATES","Hạn kết thúc không được trước ngày bắt đầu.");
    }
    private void uniqueBuild(Long projectId,CatalogEntities.Build build) {
        Long count=jdbc.queryForObject("SELECT COUNT(*) FROM builds WHERE project_id=? AND platform=? AND version_label=? AND COALESCE(build_number,'')=? AND (? IS NULL OR id<>?)",Long.class,projectId,build.getPlatform(),build.getVersionLabel(),build.getBuildNumber()==null?"":build.getBuildNumber(),build.getId(),build.getId());
        if(count!=null && count>0) throw new BusinessException(409,"DUPLICATE_BUILD","Bản build đã tồn tại, kể cả bản đã lưu trữ.");
    }
}
