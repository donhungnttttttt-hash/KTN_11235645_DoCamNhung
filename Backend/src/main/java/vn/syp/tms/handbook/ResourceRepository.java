package vn.syp.tms.handbook;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ResourceRepository extends JpaRepository<ProjectResource, Long> {
    List<ProjectResource> findByProjectId(Long projectId);
    Optional<ProjectResource> findByProjectIdAndId(Long projectId, Long id);
    boolean existsByProjectIdAndCode(Long projectId, String code);
}
