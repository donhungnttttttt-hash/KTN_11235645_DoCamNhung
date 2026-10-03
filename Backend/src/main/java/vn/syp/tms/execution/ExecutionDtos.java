package vn.syp.tms.execution;

import jakarta.validation.constraints.*;
import java.util.List;

public interface ExecutionDtos {
    record CreateCycle(@NotBlank @Pattern(regexp="[A-Za-z0-9][A-Za-z0-9_-]{0,31}") String code,
                       @NotBlank @Size(max=100) String name, Long milestoneId) {}
    record Version(@NotNull @PositiveOrZero Long expectedVersion) {}
    record Configuration(@NotNull @Positive Long environmentId, @NotNull @Positive Long deviceId,
                         @NotNull @Positive Long buildId, @NotNull @PositiveOrZero Long expectedVersion) {}
    record AddScope(@NotNull @Positive Long configurationId, @NotEmpty @Size(max=100) List<@NotNull @Positive Long> revisionIds,
                    @NotNull @Positive Long assigneeMembershipId, @NotNull @PositiveOrZero Long expectedVersion) {}
    record Assignment(@NotNull @Positive Long assigneeMembershipId, @NotBlank @Size(max=500) String reason,
                      @NotNull @PositiveOrZero Long expectedVersion) {}
    record Attempt(@NotBlank @Pattern(regexp="OK|NG|P") String resultCode,
                   @NotNull @Positive Long buildId, @Size(max=8000) String actualResult,
                   @Size(max=1000) String reason, @Size(max=1000) String evidenceReference,
                   @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey,
                   @NotNull @PositiveOrZero Long expectedVersion) {}
    record Page<T>(List<T> items, long totalItems, int page, int pageSize, int totalPages) {}
}
