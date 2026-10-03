package vn.syp.tms.catalog;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

public class CatalogEntities {

    @Entity
    @Table(name = "environments")
    public static class Environment {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(name = "project_id") private Long projectId;
        private String code;
        private String name;
        private String description;
        private boolean active = true;
        @Column(name = "created_at") private Instant createdAt;
        @Column(name = "updated_at") private Instant updatedAt;
        
        @Version @Column(name = "lock_version", nullable = false) private long version;
        public long getVersion() { return version; }
        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
        @PrePersist protected void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }
        @PreUpdate protected void onUpdate() { updatedAt = Instant.now(); }
    }

    @Entity
    @Table(name = "builds")
    public static class Build {
        @Column(name = "archived_at") private Instant archivedAt;
        public Instant getArchivedAt() { return archivedAt; }
        public void setArchivedAt(Instant value) { archivedAt = value; }
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(name = "project_id") private Long projectId;
        @Column(name = "version_label") private String versionLabel;
        @Column(name = "build_number") private String buildNumber;
        private String platform;
        private String notes;
        @Column(name = "released_at") private LocalDate releasedAt;
        @Column(name = "created_at") private Instant createdAt;
        @Column(name = "updated_at") private Instant updatedAt;
        
        @Version @Column(name = "lock_version", nullable = false) private long version;
        public long getVersion() { return version; }
        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public String getVersionLabel() { return versionLabel; }
        public void setVersionLabel(String versionLabel) { this.versionLabel = versionLabel; }
        public String getBuildNumber() { return buildNumber; }
        public void setBuildNumber(String buildNumber) { this.buildNumber = buildNumber; }
        public String getPlatform() { return platform; }
        public void setPlatform(String platform) { this.platform = platform; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
        public LocalDate getReleasedAt() { return releasedAt; }
        public void setReleasedAt(LocalDate releasedAt) { this.releasedAt = releasedAt; }
        @PrePersist protected void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }
        @PreUpdate protected void onUpdate() { updatedAt = Instant.now(); }
    }

    @Entity
    @Table(name = "devices")
    public static class Device {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(name = "project_id") private Long projectId;
        private String code;
        private String name;
        private String model;
        @Column(name = "os_name") private String osName;
        @Column(name = "os_version") private String osVersion;
        private boolean active = true;
        @Column(name = "created_at") private Instant createdAt;
        @Column(name = "updated_at") private Instant updatedAt;
        
        @Version @Column(name = "lock_version", nullable = false) private long version;
        public long getVersion() { return version; }
        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public String getOsName() { return osName; }
        public void setOsName(String osName) { this.osName = osName; }
        public String getOsVersion() { return osVersion; }
        public void setOsVersion(String osVersion) { this.osVersion = osVersion; }
        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
        @PrePersist protected void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }
        @PreUpdate protected void onUpdate() { updatedAt = Instant.now(); }
    }

    @Entity
    @Table(name = "categories")
    public static class Category {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(name = "project_id") private Long projectId;
        private String code;
        private String name;
        private boolean active = true;
        @Column(name = "created_at") private Instant createdAt;
        @Column(name = "updated_at") private Instant updatedAt;
        
        @Version @Column(name = "lock_version", nullable = false) private long version;
        public long getVersion() { return version; }
        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
        @PrePersist protected void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }
        @PreUpdate protected void onUpdate() { updatedAt = Instant.now(); }
    }

    @Entity
    @Table(name = "milestones")
    public static class Milestone {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(name = "project_id") private Long projectId;
        private String code;
        private String name;
        @Column(name = "starts_on") private LocalDate startsOn;
        @Column(name = "due_on") private LocalDate dueOn;
        @Column(name = "archived_at") private Instant archivedAt;
        @Column(name = "created_at") private Instant createdAt;
        @Column(name = "updated_at") private Instant updatedAt;
        
        @Version @Column(name = "lock_version", nullable = false) private long version;
        public long getVersion() { return version; }
        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public LocalDate getStartsOn() { return startsOn; }
        public void setStartsOn(LocalDate startsOn) { this.startsOn = startsOn; }
        public LocalDate getDueOn() { return dueOn; }
        public void setDueOn(LocalDate dueOn) { this.dueOn = dueOn; }
        public Instant getArchivedAt() { return archivedAt; }
        public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }
        @PrePersist protected void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }
        @PreUpdate protected void onUpdate() { updatedAt = Instant.now(); }
    }
}
