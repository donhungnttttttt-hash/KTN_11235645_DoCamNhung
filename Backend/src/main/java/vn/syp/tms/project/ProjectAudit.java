package vn.syp.tms.project;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ProjectAudit {
    private final JdbcTemplate jdbc;
    public ProjectAudit(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(@org.springframework.lang.Nullable Long projectId, String actor, String entity, Long id, String action) {
        jdbc.update("INSERT INTO project_audit (project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))",
                projectId, actor, entity, id, action);
    }
}
