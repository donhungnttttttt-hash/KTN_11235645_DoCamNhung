package vn.syp.tms.rules;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "rule_versions")
public class RuleVersion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "project_id") private Long projectId;
    @Column(name = "ruleset_id") private Long rulesetId;
    @Column(name = "version_no") private Integer versionNo;
    @Column(name = "content_json") private String contentJson;
    @Column(name = "published_at") private Instant publishedAt;
    @Column(name = "published_by") private Long publishedBy;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "created_by") private Long createdBy;

    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public Long getRulesetId() { return rulesetId; }
    public void setRulesetId(Long rulesetId) { this.rulesetId = rulesetId; }
    public Integer getVersionNo() { return versionNo; }
    public void setVersionNo(Integer versionNo) { this.versionNo = versionNo; }
    public String getContentJson() { return contentJson; }
    public void setContentJson(String contentJson) { this.contentJson = contentJson; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
    public Long getPublishedBy() { return publishedBy; }
    public void setPublishedBy(Long publishedBy) { this.publishedBy = publishedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    @PrePersist protected void onCreate() { createdAt = Instant.now(); }
}
