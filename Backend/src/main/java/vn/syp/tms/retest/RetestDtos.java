package vn.syp.tms.retest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public final class RetestDtos {
    private RetestDtos() {}
    public record Coverage(@NotEmpty @Size(max=100) List<@NotNull @Positive Long> runItemIds,
        @NotBlank @Size(max=1000) String reason,@NotNull @PositiveOrZero Long expectedVersion) {}
    public record Request(@NotNull @Positive Long coverageRevisionId,
        @NotEmpty @Size(max=100) List<@NotNull @Positive Long> coverageItemIds,
        @NotNull @Pattern(regexp="BUG_ONLY|FULL_CASE") String verificationScope,
        @NotNull @Positive Long assigneeMembershipId,@NotBlank @Size(max=1000) String reason,
        @NotNull @PositiveOrZero Long expectedVersion,@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{1,64}") String requestKey) {}
    public record Result(@NotNull @Positive Long coverageItemId,@NotNull @Pattern(regexp="PASS|FAIL") String verdict,
        @NotBlank @Size(max=8000) String actualResult,@Size(max=36) String evidenceAttachmentId,
        @NotNull @PositiveOrZero Long expectedRunVersion) {}
    public record Submit(@NotEmpty @Size(max=100) List<@NotNull @Valid Result> results,
        @NotNull @PositiveOrZero Long expectedVersion,@NotNull @PositiveOrZero Long expectedBugVersion,
        @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{1,64}") String requestKey,boolean closeBug,
        @Size(max=1000) String closureReason) {}
    public record Closure(@NotNull @Pattern(regexp="FIXED|UNREPRODUCIBLE|WONTFIX") String kind,
        @NotBlank @Size(max=1000) String reason,@Size(max=36) String evidenceAttachmentId,
        @Size(max=1000) String sourceReference,@NotNull @PositiveOrZero Long expectedVersion) {}
    public record Reopen(@NotBlank @Size(max=1000) String reason,@NotNull @PositiveOrZero Long expectedVersion) {}
}
