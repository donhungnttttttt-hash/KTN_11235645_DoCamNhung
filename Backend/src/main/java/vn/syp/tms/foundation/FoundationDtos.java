package vn.syp.tms.foundation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class FoundationDtos {
    private FoundationDtos() {}
    public record CreateCheck(
            @NotBlank(message = "Vui lòng nhập nội dung kiểm tra.")
            @Size(max = 160, message = "Nội dung tối đa 160 ký tự.") String message) {}
    public record Check(String id, String message, Instant createdAt) {}
    public record CheckPage(List<Check> items, int page, int size, long totalElements) {}
    public record Status(String status, String application, String database, String migrationVersion,
                         int appliedMigrations, Instant installedAt, Instant checkedAt) {}
    public record Csrf(String token, String headerName) {
        @Override public String toString() { return "Csrf[redacted]"; }
    }
}

