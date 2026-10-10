package vn.syp.tms.rules;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "rulesets")
public class Ruleset {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "project_id") private Long projectId;
    private String code;
    private String name;
    private boolean active = true;
    @Column(name = "active_version_id") private Long activeVersionId;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;
    
    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Long getActiveVersionId() { return activeVersionId; }
    public void setActiveVersionId(Long activeVersionId) { this.activeVersionId = activeVersionId; }
    
    @PrePersist protected void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate protected void onUpdate() { updatedAt = Instant.now(); }
}
