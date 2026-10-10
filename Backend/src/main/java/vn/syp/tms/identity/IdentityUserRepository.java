package vn.syp.tms.identity;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdentityUserRepository extends JpaRepository<IdentityUser, String> {
    interface CurrentAccount {
        String getId();
        String getUsername();
        String getDisplayName();
        String getRole();
        boolean getEnabled();
    }
    // Scalar projection deliberately bypasses managed IdentityUser instances and RR snapshots.
    @org.springframework.data.jpa.repository.Query(value="SELECT id,username,display_name AS displayName,role_code AS role,enabled FROM identity_users WHERE id=:id FOR SHARE",nativeQuery=true)
    Optional<CurrentAccount> lockAccount(@org.springframework.data.repository.query.Param("id") String id);
    Optional<IdentityUser> findByUsername(String username);
    boolean existsByUsername(String username);
}
