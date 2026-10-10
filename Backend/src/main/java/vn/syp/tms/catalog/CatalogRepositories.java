package vn.syp.tms.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

public class CatalogRepositories {
    
    @Repository
    public interface EnvironmentRepository extends JpaRepository<CatalogEntities.Environment, Long> {
        List<CatalogEntities.Environment> findByProjectId(Long projectId);
        Optional<CatalogEntities.Environment> findByProjectIdAndId(Long projectId, Long id);
        boolean existsByProjectIdAndCode(Long projectId, String code);
    }
    
    @Repository
    public interface BuildRepository extends JpaRepository<CatalogEntities.Build, Long> {
        List<CatalogEntities.Build> findByProjectId(Long projectId);
        Optional<CatalogEntities.Build> findByProjectIdAndId(Long projectId, Long id);
        boolean existsByProjectIdAndVersionLabelAndPlatform(Long projectId, String versionLabel, String platform);
    }
    
    @Repository
    public interface DeviceRepository extends JpaRepository<CatalogEntities.Device, Long> {
        List<CatalogEntities.Device> findByProjectId(Long projectId);
        Optional<CatalogEntities.Device> findByProjectIdAndId(Long projectId, Long id);
        boolean existsByProjectIdAndCode(Long projectId, String code);
    }
    
    @Repository
    public interface CategoryRepository extends JpaRepository<CatalogEntities.Category, Long> {
        List<CatalogEntities.Category> findByProjectId(Long projectId);
        Optional<CatalogEntities.Category> findByProjectIdAndId(Long projectId, Long id);
        boolean existsByProjectIdAndCode(Long projectId, String code);
    }
    
    @Repository
    public interface MilestoneRepository extends JpaRepository<CatalogEntities.Milestone, Long> {
        List<CatalogEntities.Milestone> findByProjectId(Long projectId);
        Optional<CatalogEntities.Milestone> findByProjectIdAndId(Long projectId, Long id);
        boolean existsByProjectIdAndCode(Long projectId, String code);
    }
}
