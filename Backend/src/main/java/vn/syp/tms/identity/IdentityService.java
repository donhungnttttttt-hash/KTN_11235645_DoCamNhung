package vn.syp.tms.identity;

import java.time.Instant;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.shared.web.BusinessException;

@Service
public class IdentityService {
    private final IdentityUserRepository users;
    private final PasswordEncoder passwords;
    private final JdbcTemplate jdbc;
    private final IdentityAudit audit;
    private final String dummyHash;
    public IdentityService(IdentityUserRepository users, PasswordEncoder passwords, JdbcTemplate jdbc, IdentityAudit audit) {
        this.users = users; this.passwords = passwords; this.jdbc = jdbc; this.audit = audit;
        dummyHash = passwords.encode(UUID.randomUUID().toString());
    }
    public static String normalize(String username) { return username.strip().toLowerCase(Locale.ROOT); }
    public static List<String> permissions(IdentityUser user) {
        if ("ADMIN".equals(user.getRole())) return List.of("profile:read", "users:read", "users:create", "users:update", "users:delegate");
        if ("PM".equals(user.getRole()) && user.isCanCreateUsers()) return List.of("profile:read", "users:create");
        return List.of("profile:read");
    }
    public IdentityUser authenticate(String username, String password) {
        var user = users.findByUsername(normalize(username)).orElse(null);
        boolean matched = passwords.matches(password, user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !matched || !user.isEnabled()) throw new BusinessException(401, "AUTHENTICATION_FAILED", "Tên đăng nhập hoặc mật khẩu không đúng.");
        return user;
    }
    public IdentityUser current(String id) {
        return users.findById(java.util.Objects.requireNonNull(id)).filter(user -> user.isEnabled())
                .orElseThrow(() -> new BusinessException(401, "UNAUTHENTICATED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."));
    }
    public boolean isAdmin(String userId) {
        return users.findById(java.util.Objects.requireNonNull(userId)).map(u -> "ADMIN".equals(u.getRole())).orElse(false);
    }
    public IdentityDtos.Me me(IdentityUser user, int timeoutSeconds) {
        return new IdentityDtos.Me(user.getId(), user.getUsername(), user.getDisplayName(), List.of(user.getRole()),
                permissions(user), Instant.now().plusSeconds(timeoutSeconds));
    }
    @Transactional(readOnly = true)
    public IdentityDtos.UserPage list(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new BusinessException(422, "VALIDATION_ERROR", "Phân trang không hợp lệ.");
        var result = users.findAll(PageRequest.of(page, size, Sort.by("createdAt", "id")));
        return new IdentityDtos.UserPage(result.map(this::view).getContent(), page, size, result.getTotalElements());
    }
    @Transactional
    public IdentityDtos.User create(String actorId, IdentityDtos.CreateUser input, String requestId) {
        var actor = current(actorId);
        if (!permissions(actor).contains("users:create")) throw forbidden();
        // Delegated PMs may create testers, never another privileged account.
        if (!"ADMIN".equals(actor.getRole()) && !"TESTER".equals(input.role())) throw forbidden();
        String username = normalize(input.username());
        if (users.existsByUsername(username)) throw duplicateUsername();
        var user = new IdentityUser(username, input.displayName().strip(), passwords.encode(input.password()), input.role());
        try { users.saveAndFlush(user); }
        catch (DataIntegrityViolationException duplicate) { throw duplicateUsername(); }
        audit.record(actorId, user.getId(), "USER_CREATED", requestId);
        return view(user);
    }
    @Transactional
    public IdentityDtos.User update(String actorId, String id, IdentityDtos.UpdateUser input, String requestId) {
        if (!"ADMIN".equals(current(actorId).getRole())) throw forbidden();
        var user = users.findById(java.util.Objects.requireNonNull(id)).orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy tài khoản."));
        if (user.getVersion() != input.expectedVersion()) throw new BusinessException(409, "VERSION_CONFLICT", "Tài khoản đã thay đổi. Vui lòng tải lại.");
        if (input.enabled() == null && input.canCreateUsers() == null) throw new BusinessException(422, "VALIDATION_ERROR", "Chưa có thông tin cần cập nhật.");
        if (Boolean.FALSE.equals(input.enabled()) && actorId.equals(id)) throw new BusinessException(409, "SELF_DISABLE", "Bạn không thể vô hiệu hóa tài khoản của chính mình.");
        if (input.canCreateUsers() != null && !"PM".equals(user.getRole())) throw new BusinessException(422, "VALIDATION_ERROR", "Chỉ cấp quyền tạo tài khoản cho PM.");
        boolean changed = false;
        if (input.enabled() != null && user.isEnabled() != input.enabled()) {
            user.setEnabled(input.enabled()); changed = true;
            audit.record(actorId, id, input.enabled() ? "USER_ENABLED" : "USER_DISABLED", requestId);
        }
        if (input.canCreateUsers() != null && user.isCanCreateUsers() != input.canCreateUsers()) {
            user.setCanCreateUsers(input.canCreateUsers()); changed = true;
            audit.record(actorId, id, input.canCreateUsers() ? "CREATE_USERS_GRANTED" : "CREATE_USERS_REVOKED", requestId);
        }
        users.flush();
        if (changed) jdbc.update("DELETE FROM SPRING_SESSION WHERE PRINCIPAL_NAME = ?", id);
        return view(user);
    }
    @Transactional
    public boolean bootstrap(String username, String password, String displayName) {
        jdbc.queryForObject("SELECT id FROM application_info WHERE id = 1 FOR UPDATE", Integer.class);
        if (users.count() != 0) return false;
        var user = users.saveAndFlush(new IdentityUser(normalize(username), displayName.strip(), passwords.encode(password), "ADMIN"));
        audit.record(user.getId(), user.getId(), "ADMIN_BOOTSTRAPPED", null);
        return true;
    }
    public IdentityDtos.User view(IdentityUser user) {
        return new IdentityDtos.User(user.getId(), user.getUsername(), user.getDisplayName(), user.getRole(), user.isEnabled(),
                user.isCanCreateUsers(), user.getVersion(), user.getCreatedAt());
    }
    private BusinessException forbidden() { return new BusinessException(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này."); }
    private BusinessException duplicateUsername() { return new BusinessException(409, "USERNAME_EXISTS", "Tên đăng nhập đã được sử dụng."); }
}
