package vn.syp.tms.foundation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "foundation_checks")
public class FoundationCheck {
    @Id
    @Column(length = 36, nullable = false)
    private String id;
    @Column(length = 160, nullable = false)
    private String message;
    @Column(name = "created_at", nullable = false, columnDefinition = "DATETIME(6)")
    private Instant createdAt;

    protected FoundationCheck() {}
    public FoundationCheck(String message) {
        this.id = UUID.randomUUID().toString();
        this.message = message;
        this.createdAt = Instant.now();
    }
    public String getId() { return id; }
    public String getMessage() { return message; }
    public Instant getCreatedAt() { return createdAt; }
}

