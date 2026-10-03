package vn.syp.tms.foundation;

import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.foundation.FoundationDtos.Check;
import vn.syp.tms.foundation.FoundationDtos.CheckPage;
import vn.syp.tms.foundation.FoundationDtos.Status;

@Service
public class FoundationService {
    private final FoundationCheckRepository repository;
    private final JdbcTemplate jdbc;
    public FoundationService(FoundationCheckRepository repository, JdbcTemplate jdbc) {
        this.repository = repository;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Status status() {
        var identity = jdbc.queryForMap("SELECT display_name, installed_at FROM application_info WHERE id = 1");
        String version = jdbc.queryForObject("SELECT version FROM flyway_schema_history WHERE success = 1 AND version IS NOT NULL ORDER BY installed_rank DESC LIMIT 1", String.class);
        Integer applied = jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE success = 1 AND version IS NOT NULL", Integer.class);
        String database = jdbc.queryForObject("SELECT VERSION()", String.class);
        // JDBC DATE_TIME mapping can be Timestamp or LocalDateTime depending on driver settings.
        Object installed = identity.get("installed_at");
        Instant installedAt = installed instanceof java.sql.Timestamp stamp ? stamp.toInstant()
                : ((java.time.LocalDateTime) installed).toInstant(ZoneOffset.UTC);
        return new Status("UP", (String) identity.get("display_name"), "MySQL " + database,
                version, applied == null ? 0 : applied, installedAt, Instant.now());
    }

    @Transactional(readOnly = true)
    public CheckPage checks() {
        var result = repository.findAll(PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        return new CheckPage(result.map(this::toDto).getContent(), 0, 20, result.getTotalElements());
    }

    @Transactional
    public Check create(FoundationDtos.CreateCheck request) {
        return toDto(repository.saveAndFlush(new FoundationCheck(request.message().strip())));
    }

    private Check toDto(FoundationCheck entity) {
        return new Check(entity.getId(), entity.getMessage(), entity.getCreatedAt());
    }
}

