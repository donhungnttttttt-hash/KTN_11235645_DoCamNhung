package vn.syp.tms.workitem;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class WorkItemDtos {
    private WorkItemDtos() {}
    public record Create(
        @NotBlank @Pattern(regexp="BUG|REQUEST|TASK|IMPROVEMENT|QA") String type,
        @NotBlank @Size(max=300) String title, @Size(max=20000) String description,
        @Pattern(regexp="HIGH|MEDIUM|LOW") String priority,
        @Positive Long categoryId, @Positive Long milestoneId, @Positive Long assigneeMembershipId,
        @Size(max=20000) String steps, @Size(max=20000) String expectedResult, @Size(max=20000) String actualResult,
        @Positive Long buildId, @Positive Long environmentId, @Positive Long deviceId,
        @Positive Long revisionId, @Positive Long attemptId, @Size(max=1000) String standaloneReason,
        @NotBlank @Size(min=8,max=64) String requestKey) {}
    public record Update(
        @NotBlank @Size(max=300) String title, @Size(max=20000) String description,
        @NotBlank @Pattern(regexp="HIGH|MEDIUM|LOW") String priority,
        @Positive Long categoryId, @Positive Long milestoneId, @Positive Long assigneeMembershipId,
        @Size(max=20000) String steps, @Size(max=20000) String expectedResult, @Size(max=20000) String actualResult,
        @NotBlank @Size(max=1000) String reason, @NotNull @PositiveOrZero Long expectedVersion) {}
    public record Transition(@NotBlank @Size(max=32) String status, @NotBlank @Size(max=1000) String reason,
        @Positive Long fixedBuildId, @NotNull @PositiveOrZero Long expectedVersion) {}
    public record BatchEntry(@Positive long id, @NotNull @PositiveOrZero Long expectedVersion) {}
    public record Batch(@NotEmpty @Size(max=100) List<@Valid BatchEntry> items,
        @NotBlank @Size(max=32) String status, @NotBlank @Size(max=1000) String reason, @Positive Long fixedBuildId) {}
    public record Link(@NotNull @Positive Long attemptId, @NotNull @PositiveOrZero Long expectedVersion) {}
    public record Comment(@NotBlank @Size(max=20000) String body,
        @NotBlank @Pattern(regexp="INTERNAL") String visibility, @NotBlank @Size(min=8,max=64) String requestKey) {}
    public record ExternalReference(@NotBlank @Size(max=32) String provider, @NotBlank @Size(max=100) String externalId,
        @NotBlank @Size(max=2048) String url, @NotNull @PositiveOrZero Long expectedVersion) {}
    public record Clarification(@NotBlank @Pattern(regexp="BRSE|SHIFT|CUSTOMER|INTERNAL") String sourceKind,
        @NotBlank @Size(max=1000) String sourceReference, @NotBlank @Size(max=100) String confirmedBy,
        @NotNull @PastOrPresent Instant confirmedAt, @NotBlank @Size(max=20000) String conclusion,
        @NotNull @PositiveOrZero Long expectedVersion) {}
    public record Page<T>(List<T> items,long totalItems,int page,int size,int totalPages) {}
}
