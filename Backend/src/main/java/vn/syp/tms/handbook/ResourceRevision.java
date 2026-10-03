package vn.syp.tms.handbook;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "resource_revisions")
public class ResourceRevision {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "project_id") private Long projectId;
    @Column(name = "resource_id") private Long resourceId;
    @Column(name = "revision_no") private Integer revisionNo;
    @Column(name = "content_html") private String contentHtml;
    private String visibility = "INTERNAL";
    @Column(name = "edited_by") private Long editedBy;
    @Column(name = "published_at") private Instant publishedAt;
    @Column(name = "created_at") private Instant createdAt;

    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long resourceId) { this.resourceId = resourceId; }
    public Integer getRevisionNo() { return revisionNo; }
    public void setRevisionNo(Integer revisionNo) { this.revisionNo = revisionNo; }
    public String getContentHtml() { return contentHtml; }
    public void setContentHtml(String contentHtml) { this.contentHtml = contentHtml; }
    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }
    public Long getEditedBy() { return editedBy; }
    public void setEditedBy(Long editedBy) { this.editedBy = editedBy; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
    public Instant getCreatedAt() { return createdAt; }

    @PrePersist protected void onCreate() { createdAt = Instant.now(); }
}
