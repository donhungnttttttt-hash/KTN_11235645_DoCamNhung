package vn.syp.tms.rules;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RulesetRepository extends JpaRepository<Ruleset, Long> {
    List<Ruleset> findByProjectId(Long projectId);
    Optional<Ruleset> findByProjectIdAndId(Long projectId, Long id);
    boolean existsByProjectIdAndCode(Long projectId, String code);
}
