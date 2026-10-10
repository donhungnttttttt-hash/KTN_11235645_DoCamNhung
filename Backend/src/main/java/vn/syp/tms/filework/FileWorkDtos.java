package vn.syp.tms.filework;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public interface FileWorkDtos {
    record Scope(@NotNull @Positive Long documentId, @NotNull @Positive Long cycleId,
                 @NotNull @Positive Long configurationId,
                 @NotEmpty @Size(max=500) List<@NotNull @Positive Long> revisionIds,
                 @NotNull @Positive Long assigneeMembershipId,
                 @NotNull @PositiveOrZero Long expectedCycleVersion) {}
    record Create(@NotNull @Positive Long documentId, @NotNull @Positive Long cycleId,
                  @NotNull @Positive Long configurationId,
                  @NotEmpty @Size(max=500) List<@NotNull @Positive Long> revisionIds,
                  @NotNull @Positive Long assigneeMembershipId,
                  @NotNull @PositiveOrZero Long expectedCycleVersion,
                  @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {
        public Scope scope() { return new Scope(documentId,cycleId,configurationId,revisionIds,assigneeMembershipId,expectedCycleVersion); }
    }
    record RunVersion(@NotNull @Positive Long runItemId, @NotNull @PositiveOrZero Long expectedVersion) {}
    record Assignment(@NotNull @Positive Long assigneeMembershipId, @NotBlank @Size(max=500) String reason,
                      @NotNull @PositiveOrZero Long expectedVersion,
                      @NotEmpty @Size(max=500) List<@Valid @NotNull RunVersion> runVersions,
                      @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    record Filter(int page,int size,boolean mine,Long documentId,Long cycleId,Long assigneeMembershipId,
                  Long buildId,String state,String keyword) {}
    record Start(@NotNull @Positive Long allocationId,@NotNull @Positive Long buildId,
                 @NotNull @PositiveOrZero Long expectedVersion,
                 @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    record SessionCommand(@NotNull @PositiveOrZero Long expectedVersion,
                          @NotNull @PositiveOrZero Long expectedGroupVersion,@Size(max=1000) String reason,
                          @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    record Page<T>(List<T> items,long totalItems,int page,int pageSize,int totalPages) {}
}
