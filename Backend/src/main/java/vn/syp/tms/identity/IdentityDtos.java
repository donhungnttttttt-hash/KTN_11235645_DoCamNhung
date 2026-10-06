package vn.syp.tms.identity;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class IdentityDtos {
    private IdentityDtos() {}
    public record Login(@NotBlank @Size(max = 64) String username, @NotBlank @Size(max = 128) String password) {
        @Override public String toString() { return "Login[redacted]"; }
    }
    public record CreateUser(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._-]{2,63}", message = "Tên đăng nhập cần 3–64 ký tự chữ, số, dấu chấm, gạch nối hoặc gạch dưới.") String username,
            @NotBlank @Size(max = 100) String displayName,
            @NotBlank @Size(min = 12, max = 128, message = "Mật khẩu cần 12–128 ký tự.") String password,
            @NotBlank @Pattern(regexp = "ADMIN|PM|TESTER|DEV", message = "Vai trò không hợp lệ.") String role) {
        @Override public String toString() { return "CreateUser[redacted]"; }
    }
    public record UpdateUser(Boolean enabled, Boolean canCreateUsers, @NotNull @PositiveOrZero Long expectedVersion) {}
    public record User(String id, String username, String displayName, String role, boolean enabled,
                       boolean canCreateUsers, long version, Instant createdAt) {}
    public record UserPage(List<User> items, int page, int size, long totalElements) {}
    public record Me(String id, String username, String displayName, List<String> roles,
                     List<String> permissions, Instant sessionExpiresAt) {}
    public record Csrf(String token, String headerName) {
        @Override public String toString() { return "Csrf[redacted]"; }
    }
}
