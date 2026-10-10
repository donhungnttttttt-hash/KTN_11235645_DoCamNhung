package vn.syp.tms.integration;

import jakarta.validation.constraints.*;

public final class RedmineDtos {
    private RedmineDtos() {}
    public record Publish(@NotNull @PositiveOrZero Long expectedVersion,
                          @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,100}") String requestKey,
                          @NotBlank @Size(max=1000) String reason,
                          @Pattern(regexp="[a-f0-9]{64}") String observedFingerprint) {}
    public record Retry(@NotNull @PositiveOrZero Long expectedVersion,
                        @NotBlank @Size(max=1000) String reason) {}
}
