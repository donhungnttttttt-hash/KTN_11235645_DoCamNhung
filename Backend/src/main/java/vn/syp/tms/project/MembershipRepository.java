package vn.syp.tms.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MembershipRepository extends JpaRepository<ProjectMembership, Long> {
    ProjectMembership findByProjectIdAndUserId(Long projectId, String userId);
    List<ProjectMembership> findByProjectIdAndActiveTrue(Long projectId);
    List<ProjectMembership> findByUserIdAndActiveTrue(String userId);
    boolean existsByProjectIdAndUserId(Long projectId, String userId);
}
