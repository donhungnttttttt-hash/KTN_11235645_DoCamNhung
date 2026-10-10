package vn.syp.tms.identity;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class IdentityAudit {
    private final JdbcTemplate jdbc;
    public IdentityAudit(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void record(String actorId, String subjectId, String event, String requestId) {
        jdbc.update("INSERT INTO identity_audit (id, actor_id, subject_id, event_code, request_id, occurred_at) VALUES (?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(), actorId, subjectId, event,
                requestId == null ? UUID.randomUUID().toString() : requestId, Timestamp.from(Instant.now()));
    }
}
