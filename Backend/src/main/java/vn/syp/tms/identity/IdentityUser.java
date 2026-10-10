package vn.syp.tms.identity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "identity_users")
public class IdentityUser {
    @Id @Column(length = 36) private String id;
    @Column(nullable = false, length = 64) private String username;
    @Column(name = "display_name", nullable = false, length = 100) private String displayName;
    @Column(name = "password_hash", nullable = false) private String passwordHash;
    @Column(name = "role_code", nullable = false, length = 16) private String role;
    @Column(nullable = false) private boolean enabled;
    @Column(name = "can_create_users", nullable = false) private boolean canCreateUsers;
    @Version @Column(name = "lock_version", nullable = false) private long version;
    @Column(name = "created_at", nullable = false, columnDefinition = "DATETIME(6)") private Instant createdAt;
    protected IdentityUser() {}
    public IdentityUser(String username, String displayName, String passwordHash, String role) {
        this.id = UUID.randomUUID().toString();
        this.username = username;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.role = role;
        this.enabled = true;
        this.createdAt = Instant.now();
    }
    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
    public String getPasswordHash() { return passwordHash; }
    public String getRole() { return role; }
    public boolean isEnabled() { return enabled; }
    public boolean isCanCreateUsers() { return canCreateUsers; }
    public long getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public void setCanCreateUsers(boolean allowed) { this.canCreateUsers = allowed; }
}
