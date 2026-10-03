package vn.syp.tms.handbook;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "project_resources")
public class ProjectResource {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "project_id") private Long projectId;
    private String code;
    @Column(name = "resource_type") private String resourceType;
    private String name;
    @Column(name = "current_revision_id") private Long currentRevisionId;
    @Column(name = "archived_at") private Instant archivedAt;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;

    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getCurrentRevisionId() { return currentRevisionId; }
    public void setCurrentRevisionId(Long currentRevisionId) { this.currentRevisionId = currentRevisionId; }
    public Instant getArchivedAt() { return archivedAt; }
    public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }

    @PrePersist protected void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate protected void onUpdate() { updatedAt = Instant.now(); }
}
