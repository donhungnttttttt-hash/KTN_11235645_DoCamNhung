package vn.syp.tms.project;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "projects")
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 32, unique = true)
    private String code;
    
    @Column(nullable = false, length = 100)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false, length = 50)
    private String timezone;
    
    @Column(name = "archived_at")
    private Instant archivedAt;
    
    @Version
    @Column(name = "lock_version", nullable = false)
    private long lockVersion;
    
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    
    @Column(name = "created_by", length = 36)
    private String createdBy;
    
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    protected Project() {}

    public Project(String code, String name, String description, String timezone, String createdBy) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.timezone = timezone;
        this.createdBy = createdBy;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getTimezone() { return timezone; }
    public Instant getArchivedAt() { return archivedAt; }
    public long getLockVersion() { return lockVersion; }
    public Instant getCreatedAt() { return createdAt; }
    public String getCreatedBy() { return createdBy; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getUpdatedBy() { return updatedBy; }

    public void setName(String name) { this.name = name; }
    public void setDescription(String description) { this.description = description; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
