package vn.syp.tms.handbook;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RevisionRepository extends JpaRepository<ResourceRevision, Long> {
    List<ResourceRevision> findByProjectIdAndResourceId(Long projectId, Long resourceId);
    Optional<ResourceRevision> findByProjectIdAndId(Long projectId, Long id);
    Integer countByProjectIdAndResourceId(Long projectId, Long resourceId);
}
