package vn.syp.tms.reporting;

import jakarta.validation.constraints.*;
public final class ManagementReportDtos {
    private ManagementReportDtos() {}
    public record Create(@Positive Long featureId,@NotBlank @Size(max=255) String title,@NotBlank @Size(max=100000) String markdown) {}
    public record Update(@NotBlank @Size(max=255) String title,@NotBlank @Size(max=100000) String markdown,@NotNull @PositiveOrZero Long expectedVersion) {}
    public record Preview(@Positive Long featureId,@Size(max=20) String provider,@Size(max=100) String model,@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
}
