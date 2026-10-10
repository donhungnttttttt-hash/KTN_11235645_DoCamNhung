package vn.syp.tms.cycle;

import jakarta.validation.constraints.*;

public final class CycleDecisionDtos {
    private CycleDecisionDtos() {}
    public record Scope(@NotNull Boolean excluded, @NotBlank @Size(max=1000) String reason,
                        @NotNull @PositiveOrZero Long expectedVersion) {}
    public record Decision(@NotNull @Pattern(regexp="CLOSE|REOPEN") String action,
                           @NotBlank @Size(max=1000) String reason, @Size(max=2000) String outstandingReason,
                           @NotNull @PositiveOrZero Long expectedVersion) {}
}
