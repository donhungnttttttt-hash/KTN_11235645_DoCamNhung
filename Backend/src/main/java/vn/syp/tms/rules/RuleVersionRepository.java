package vn.syp.tms.rules;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RuleVersionRepository extends JpaRepository<RuleVersion, Long> {
    List<RuleVersion> findByProjectIdAndRulesetId(Long projectId, Long rulesetId);
    Optional<RuleVersion> findByProjectIdAndId(Long projectId, Long id);
    Integer countByProjectIdAndRulesetId(Long projectId, Long rulesetId);
}
