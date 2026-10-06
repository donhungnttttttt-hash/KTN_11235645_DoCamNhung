package vn.syp.tms.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MembershipRepository extends JpaRepository<ProjectMembership, Long> {
    interface CurrentMember {
        Long getId();
        String getUserId();
        String getProjectRole();
        boolean getActive();
        long getVersion();
    }
    @org.springframework.data.jpa.repository.Query(value="SELECT id,user_id AS userId,project_role AS projectRole,active,lock_version AS version FROM project_memberships WHERE project_id=:project AND user_id=:user FOR UPDATE",nativeQuery=true)
    CurrentMember lockMember(@org.springframework.data.repository.query.Param("project") Long project,@org.springframework.data.repository.query.Param("user") String user);
    // The join is a current read, but only memberships are locked: identity locks precede projects.
    @org.springframework.data.jpa.repository.Query(value="SELECT m.user_id FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=:project AND m.active=TRUE AND m.project_role='PM' AND u.enabled=TRUE ORDER BY m.id FOR UPDATE OF m",nativeQuery=true)
    List<String> lockEnabledPmUsers(@org.springframework.data.repository.query.Param("project") Long project);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value="UPDATE project_memberships SET project_role=:role,active=:active,lock_version=lock_version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=:id AND lock_version=:version",nativeQuery=true)
    int updateCurrent(@org.springframework.data.repository.query.Param("id") Long id,@org.springframework.data.repository.query.Param("role") String role,@org.springframework.data.repository.query.Param("active") boolean active,@org.springframework.data.repository.query.Param("version") long version);
    ProjectMembership findByProjectIdAndUserId(Long projectId, String userId);
    List<ProjectMembership> findByProjectIdAndActiveTrue(Long projectId);
    List<ProjectMembership> findByUserIdAndActiveTrue(String userId);
    boolean existsByProjectIdAndUserId(Long projectId, String userId);
}
