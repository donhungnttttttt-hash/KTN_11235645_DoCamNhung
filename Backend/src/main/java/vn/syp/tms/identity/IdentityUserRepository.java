package vn.syp.tms.identity;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdentityUserRepository extends JpaRepository<IdentityUser, String> {
    Optional<IdentityUser> findByUsername(String username);
    boolean existsByUsername(String username);
}
