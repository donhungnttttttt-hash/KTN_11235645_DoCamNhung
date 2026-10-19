package vn.syp.tms.workitem;

import jakarta.validation.constraints.*;
import java.util.UUID;

public final class FeatureIssueDtos {
    private FeatureIssueDtos() {}
    public record Create(@NotBlank @Pattern(regexp="BUG|QA") String type,@NotNull @Positive Long featureId,
        @Positive Long documentId,@Positive Long rowId,boolean monkey,@NotBlank @Size(max=300) String title,
        @Size(max=20000) String description,@Size(max=20000) String steps,@Size(max=20000) String expectedResult,
        @Size(max=20000) String actualResult,@NotNull UUID requestKey) {}
    public record Update(@NotBlank @Size(max=300) String title,@Size(max=20000) String description,
        @Size(max=20000) String steps,@Size(max=20000) String expectedResult,@Size(max=20000) String actualResult,
        @Positive Long assigneeMembershipId,@Pattern(regexp="HIGH|MEDIUM|LOW") String priority,@Size(max=1000) String reason,
        @NotNull @PositiveOrZero Long expectedVersion) {}
    public record Status(@NotBlank @Size(max=32) String status,@NotBlank @Size(max=1000) String reason,
        @NotNull @PositiveOrZero Long expectedVersion) {}
    public record Comment(@NotBlank @Size(max=20000) String body,@NotNull @PositiveOrZero Long expectedVersion,@NotNull UUID requestKey) {}
    public record Filter(int page,int size,Long featureId,Long documentId,Long rowId,String type,String status,String keyword) {}
}
