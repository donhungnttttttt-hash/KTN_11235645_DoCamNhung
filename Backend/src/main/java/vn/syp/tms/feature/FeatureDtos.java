package vn.syp.tms.feature;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public interface FeatureDtos {
    record ExecutionContext(@NotNull @PositiveOrZero Long expectedContextVersion,@NotNull java.util.UUID requestKey,
            @Positive Long environmentId,@Positive Long testVersionId) {}
    record CreateTestVersion(@NotBlank @Size(max=255) String name,@NotNull java.util.UUID requestKey) {}
    record Create(@NotBlank @Size(max=255) String name,@NotNull @Size(max=1000) String environment,
            @NotNull @Size(max=4000) String description,@NotNull java.util.UUID requestKey) {}
    record Update(@NotBlank @Size(max=255) String name,@NotNull @Size(max=1000) String environment,
            @NotNull @Size(max=4000) String description,@NotNull @PositiveOrZero Long expectedVersion) {}
    record Version(@NotNull @PositiveOrZero Long expectedVersion,@NotNull java.util.UUID requestKey) {}
    record Assignments(@NotNull @PositiveOrZero Long expectedVersion,@NotNull java.util.UUID requestKey,
            @NotEmpty @Size(max=500) List<@Valid Scope> changes) {}
    record Scope(@NotNull @Positive Long assigneeMembershipId,@NotNull @Size(max=500) List<@NotNull @Positive Long> rowIds) {}
    record SelfAssignment(@NotNull @PositiveOrZero Long expectedVersion,@NotNull java.util.UUID requestKey,
            @NotNull @Size(max=500) List<@NotNull @Positive Long> rowIds) {}
    record Owners(@NotNull @PositiveOrZero Long expectedVersion,@NotNull java.util.UUID requestKey,
            @NotNull @Size(max=500) List<@NotNull @Positive Long> membershipIds) {}
}
