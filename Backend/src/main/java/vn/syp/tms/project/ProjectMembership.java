package vn.syp.tms.project;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "project_memberships")
public class ProjectMembership {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "project_id", nullable = false)
    private Long projectId;
    
    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;
    
    @Column(name = "project_role", nullable = false, length = 16)
    private String projectRole;
    
    @Column(nullable = false)
    private boolean active;
    
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    
    @Column(name = "updated_at")
    private Instant updatedAt;

    protected ProjectMembership() {}

    public ProjectMembership(Long projectId, String userId, String projectRole) {
        this.projectId = projectId;
        this.userId = userId;
        this.projectRole = projectRole != null ? projectRole : "MEMBER";
        this.active = true;
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

    @Version @Column(name = "lock_version", nullable = false) private long version;
    public long getVersion() { return version; }
    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public String getUserId() { return userId; }
    public String getProjectRole() { return projectRole; }
    public boolean isActive() { return active; }
    
    public void setProjectRole(String projectRole) { this.projectRole = projectRole; }
    public void setActive(boolean active) { this.active = active; }
}
